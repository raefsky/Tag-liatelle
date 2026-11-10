/* ==========================================================================
   Tag-liatelle · scrittura dei tag MP3 (ID3v2.3 e v2.4, aggiornamento ID3v1)
   Costruisce SOLO il nuovo blocco dei tag: l'audio non passa mai da qui.
   Regole:
   - i frame che non cambiano vengono riscritti byte per byte com'erano;
   - si mantiene la versione del file (v2.3 resta v2.3, v2.4 resta v2.4);
     senza tag, con v2.2 o con il solo ID3v1 si usa la versione predefinita;
   - con un tag rovinato non si scrive.
   Funziona sia nel browser (window.Id3Scrittura) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabbrica(require("./campi.js"), require("./id3.js"));
  } else {
    radice.Id3Scrittura = fabbrica(radice.Campi, radice.Id3);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Campi, Id3) {
  "use strict";

  const RIEMPIMENTO = 2048; // spazio libero lasciato nel tag, per i salvataggi futuri

  // ------------------------------------------------------------------
  // Codifica dei byte
  // ------------------------------------------------------------------
  function utf16(testo) {                     // con BOM, little endian
    const out = new Uint8Array(2 + testo.length * 2);
    out[0] = 0xFF; out[1] = 0xFE;
    for (let i = 0; i < testo.length; i++) {
      const c = testo.charCodeAt(i);
      out[2 + i * 2] = c & 0xFF; out[3 + i * 2] = c >> 8;
    }
    return out;
  }
  const utf8 = (testo) => new TextEncoder().encode(testo);
  // segni tipografici che Latin-1 non ha, con il loro equivalente semplice
  const SEMPLICI = { "\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u2026": "...", "\u20AC": "EUR" };
  function latin1(testo, sostituto = "?") {
    const out = [];
    for (const car of testo.replace(/[\u2014\u2013\u2018\u2019\u201C\u201D\u2026\u20AC]/g, (x) => SEMPLICI[x])) {
      let c = car.codePointAt(0);
      if (c > 255) {
        const base = car.normalize("NFD")[0];      // "ő" → "o"
        c = base.codePointAt(0) <= 255 ? base.codePointAt(0) : sostituto.charCodeAt(0);
      }
      out.push(c);
    }
    return Uint8Array.from(out);
  }
  function unisci(...pezzi) {
    const lung = pezzi.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(lung);
    let i = 0;
    for (const p of pezzi) { out.set(p, i); i += p.length; }
    return out;
  }
  const syncsafe = (n) => Uint8Array.of((n >> 21) & 0x7F, (n >> 14) & 0x7F, (n >> 7) & 0x7F, n & 0x7F);
  const u32 = (n) => Uint8Array.of((n >>> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);

  // codifica dei testi: UTF-16 per v2.3 (la più compatibile), UTF-8 per v2.4
  const ENC = { 3: 1, 4: 3 };
  const codifica = (testo, major) => (major === 4 ? utf8(testo) : utf16(testo));
  const zero = (major) => (major === 4 ? Uint8Array.of(0) : Uint8Array.of(0, 0));

  function frame(id, dati, major, flags = 0) {
    const misura = major === 4 ? syncsafe(dati.length) : u32(dati.length);
    return unisci(latin1(id), misura, Uint8Array.of(flags >> 8, flags & 0xFF), dati);
  }

  /** Frame di testo. In v2.4 "A; B" diventa due valori separati, come lo standard prevede. */
  function frameTesto(id, valore, major) {
    const valori = major === 4 ? valore.split("; ") : [valore];
    const pezzi = [Uint8Array.of(ENC[major])];
    valori.forEach((v, i) => { if (i) pezzi.push(zero(major)); pezzi.push(codifica(v, major)); });
    return frame(id, unisci(...pezzi), major);
  }
  const frameTxxx = (descrizione, valore, major) =>
    frame("TXXX", unisci(Uint8Array.of(ENC[major]), codifica(descrizione, major), zero(major), codifica(valore, major)), major);
  const frameCommento = (id, lingua, valore, major) =>
    frame(id, unisci(Uint8Array.of(ENC[major]), latin1((lingua || "ita").slice(0, 3).padEnd(3, " ")), zero(major), codifica(valore, major)), major);
  const frameUrl = (id, url, major) => frame(id, latin1(encodeURI(decodeURISafe(url))), major);
  function decodeURISafe(u) { try { return decodeURI(u); } catch (e) { return u; } }

  // ------------------------------------------------------------------
  // Quali frame contengono ciascun campo
  // ------------------------------------------------------------------
  const CAMPO = {};
  for (const c of Campi.TUTTI) if (c.id3) CAMPO[c.id] = c.id3;

  /** true se il frame "f" contiene il valore del campo "campo". */
  function appartiene(f, campo) {
    const id3 = CAMPO[campo];
    if (!id3) return false;
    if (id3.startsWith("TXXX:")) return f.nome === "TXXX" && f.leggibile && (f.descrizione || "").toUpperCase() === id3.slice(5);
    if (campo === "anno") return f.nome === "TYER" || f.nome === "TDRC";
    if (campo === "commenti") return f.nome === "COMM" && f.leggibile && f.descrizione === "";
    return f.nome === id3;
  }

  /** Il nuovo frame per un campo, oppure null se il valore è vuoto (= togliere il campo). */
  function nuovoFrame(campo, valore, major, vecchio) {
    if (Array.isArray(valore)) {
      const [n, tot] = valore.map((x) => String(x || "").trim());
      if (!n) return null;
      return frameTesto(CAMPO[campo], tot ? `${n}/${tot}` : n, major);
    }
    const v = String(valore == null ? "" : valore).trim();
    if (!v) return null;
    const id3 = CAMPO[campo];
    if (id3.startsWith("TXXX:")) return frameTxxx(id3.slice(5), v, major);
    if (campo === "anno") return frameTesto(major === 4 ? "TDRC" : "TYER", v, major);
    if (campo === "commenti") return frameCommento("COMM", vecchio && vecchio.lingua, v, major);
    if (campo === "testo") return frameCommento("USLT", vecchio && vecchio.lingua, v, major);
    if (id3[0] === "W") return frameUrl(id3, v, major);
    if (campo === "compilation") return frameTesto(id3, /^(1|s[iì]|yes|true)$/i.test(v) ? "1" : "0", major);
    return frameTesto(id3, v, major);
  }

  // ------------------------------------------------------------------
  // I frame esistenti, così come sono
  // ------------------------------------------------------------------
  /** Riscrive un frame letto da un file v2.3 o v2.4 senza cambiarne il contenuto. */
  function frameCom_era(f, tagLetto) {
    let flags = f.flags;
    // v2.4 con "unsynchronisation" dichiarata su tutto il tag: ora la dichiariamo frame per frame
    if (tagLetto.major === 4 && tagLetto.flags & 0x80) flags |= 0x0002;
    return frame(f.id, f.grezzo, tagLetto.major, flags);
  }

  /** Converte un frame v2.2 nel corrispondente v2.3, oppure null se non si può. */
  function daV22(f) {
    if (f.nome.length !== 4 || !f.leggibile) return null;
    if (f.nome === "APIC") {
      // PIC: codifica, formato di 3 lettere, tipo, descrizione, dati
      // APIC: codifica, tipo MIME terminato da zero, tipo, descrizione, dati
      return frame("APIC", unisci(f.grezzo.subarray(0, 1), latin1(f.mime), Uint8Array.of(0), f.grezzo.subarray(4)), 3);
    }
    return frame(f.nome, f.grezzo, 3);
  }

  // ------------------------------------------------------------------
  // Controlli prima di scrivere
  // ------------------------------------------------------------------
  /**
   * Si può scrivere su questo file?
   * @returns {{ok: true, major: number, note: string[]} | {ok: false, motivo: string}}
   */
  function controlla(lettura, { versionePredefinita = 3 } = {}) {
    if (!lettura) return { ok: false, motivo: "Il file non è stato letto." };
    if (lettura.avvisi && lettura.avvisi.length) {
      return { ok: false, motivo: "Il tag di questo file è in parte rovinato: per non perdere niente, Tag-liatelle non ci scrive. Il file resta com'è." };
    }
    const t = lettura.tag;
    const note = [];
    let major;
    if (!t) {
      major = versionePredefinita;
      note.push(lettura.v1
        ? `Il file aveva solo il vecchio tag ID3v1: verrà aggiunto un tag ID3v2.${major}.`
        : `Il file non aveva tag: verrà creato un tag ID3v2.${major}.`);
    } else if (t.major === 2) {
      const inconvertibili = t.frames.filter((f) => !daV22(f)).map((f) => f.id);
      if (inconvertibili.length) {
        return { ok: false, motivo: `Il file usa il vecchio formato ID3v2.2 con dei campi che non so convertire (${[...new Set(inconvertibili)].join(", ")}): per non perderli, Tag-liatelle non ci scrive.` };
      }
      major = versionePredefinita;
      note.push(`Il tag era nel vecchio formato ID3v2.2: verrà convertito in ID3v2.${major}, con tutti i suoi campi.`);
    } else {
      major = t.major;
      note.push(`Versione dei tag: ID3v2.${major}, come prima.`);
    }
    if (lettura.v1) note.push("Anche il vecchio tag ID3v1, alla fine del file, verrà aggiornato.");
    return { ok: true, major, note };
  }

  /** I valori dei campi dopo le modifiche (per l'anteprima e per la verifica). */
  function valoriFinali(lettura, modifiche) {
    const finali = { ...((lettura && lettura.campi) || {}) };
    for (const [k, v] of Object.entries(modifiche)) {
      const vuoto = v == null || (Array.isArray(v) ? !String(v[0] || "").trim() : !String(v).trim());
      if (vuoto) delete finali[k];
      else if (Array.isArray(v)) finali[k] = [String(v[0]).trim(), String(v[1] || "").trim()];
      else finali[k] = String(v).trim();
    }
    return finali;
  }

  // ------------------------------------------------------------------
  // Costruzione del nuovo tag
  // ------------------------------------------------------------------
  /**
   * @param {object} lettura     il risultato di Id3.leggiMp3
   * @param {object} modifiche   { campo: nuovoValore } (stringa, oppure [numero, totale])
   * @returns {{tag: Uint8Array, v1: Uint8Array|null, major: number, note: string[]}}
   */
  function costruisci(lettura, modifiche, opzioni = {}) {
    const c = controlla(lettura, opzioni);
    if (!c.ok) throw new Error(c.motivo);
    const { major } = c;
    const t = lettura.tag;
    // con il solo ID3v1, il nuovo tag parte dai valori del vecchio
    if (!t && lettura.v1) modifiche = { ...lettura.campi, ...modifiche };
    const campiCambiati = Object.keys(modifiche);
    const pezzi = [];
    const giaScritti = new Set();

    for (const f of (t && t.frames) || []) {
      const campo = campiCambiati.find((k) => appartiene(f, k));
      if (campo) {
        // al posto del primo frame del campo va il nuovo valore; gli altri doppioni si tolgono
        if (!giaScritti.has(campo)) {
          const nuovo = nuovoFrame(campo, modifiche[campo], major, f);
          if (nuovo) pezzi.push(nuovo);
          giaScritti.add(campo);
        }
        continue;
      }
      pezzi.push(t.major === 2 ? daV22(f) : frameCom_era(f, t));
    }
    // i campi che prima non c'erano vanno in fondo
    for (const campo of campiCambiati) {
      if (giaScritti.has(campo)) continue;
      const nuovo = nuovoFrame(campo, modifiche[campo], major, null);
      if (nuovo) pezzi.push(nuovo);
    }

    const corpo = unisci(...pezzi);
    // se il nuovo tag sta nello spazio del vecchio, l'audio resta esattamente dove era
    const spazioVecchio = lettura.audio ? lettura.audio.inizio : 0;
    const riempimento = spazioVecchio >= 10 + corpo.length && t && t.major !== 2
      ? spazioVecchio - 10 - corpo.length
      : RIEMPIMENTO;
    const dimensione = corpo.length + riempimento;
    const tag = new Uint8Array(10 + dimensione);
    tag.set([0x49, 0x44, 0x33, major, 0, 0], 0);
    tag.set(syncsafe(dimensione), 6);
    tag.set(corpo, 10);

    return { tag, v1: lettura.v1 ? nuovoV1(lettura, modifiche) : null, major, note: c.note };
  }

  // ------------------------------------------------------------------
  // ID3v1: si aggiornano solo i campi cambiati, il resto resta com'era
  // ------------------------------------------------------------------
  function nuovoV1(lettura, modifiche) {
    const b = new Uint8Array(128);
    const vecchio = lettura.v1;
    const scrivi = (testo, inizio, lung) => {
      b.fill(0, inizio, inizio + lung);
      b.set(latin1(testo || "").subarray(0, lung), inizio);
    };
    b.set(latin1("TAG"), 0);
    const finali = valoriFinali(lettura, modifiche);
    const val = (campo, prima) => (campo in modifiche ? finali[campo] || "" : prima);
    scrivi(val("titolo", vecchio.titolo), 3, 30);
    scrivi(val("artista", vecchio.artista), 33, 30);
    scrivi(val("album", vecchio.album), 63, 30);
    scrivi(val("anno", vecchio.anno).slice(0, 4), 93, 4);
    const traccia = "traccia" in modifiche ? parseInt((finali.traccia || [])[0], 10) || 0 : vecchio.traccia;
    if (traccia > 0 && traccia < 256) {
      scrivi(vecchio.commento, 97, 28);         // ID3v1.1: 28 caratteri di commento, poi la traccia
      b[125] = 0; b[126] = traccia;
    } else {
      scrivi(vecchio.commento, 97, 30);
    }
    let genere = Id3.GENERI.indexOf(vecchio.genere);
    if ("genere" in modifiche) {
      const nuovo = (finali.genere || "").toLowerCase();
      genere = Id3.GENERI.findIndex((g) => g.toLowerCase() === nuovo);
    }
    b[127] = genere >= 0 ? genere : 255;
    return b;
  }

  return { controlla, costruisci, valoriFinali, RIEMPIMENTO };
});
