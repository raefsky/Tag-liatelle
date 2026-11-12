/* ==========================================================================
   Tag-liatelle · scrittura dei tag FLAC
   Costruisce SOLO la nuova zona dei metadati (i blocchi fra "fLaC" e
   l'audio): l'audio non passa mai da qui.
   Regole:
   - i blocchi e i commenti che non cambiano vengono riscritti byte per byte;
   - si sostituisce solo il blocco dei commenti (se cambia un campo) e
     l'immagine di copertina frontale (se cambia la copertina);
   - SPAZIO LIBERO ("padding"): se la nuova zona sta nello spazio della
     vecchia, il resto si riempie di spazio libero e l'audio non si sposta
     di un byte ("sul posto"). Altrimenti il file va riscritto, e si lasciano
     8 KB di spazio libero per le prossime volte;
   - con dati rovinati non si scrive.
   Funziona sia nel browser (window.FlacScrittura) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabbrica(require("./campi.js"), require("./flac.js"), require("./immagini.js"));
  } else {
    radice.FlacScrittura = fabbrica(radice.Campi, radice.Flac, radice.Immagini);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Campi, Flac, Immagini) {
  "use strict";

  const T = Flac.T;
  const RIEMPIMENTO = 8192;             // spazio libero quando il file va riscritto
  const RIEMPIMENTO_MASSIMO = 1 << 20;  // oltre 1 MB di spazio libero è uno spreco: si riscrive
  const BLOCCO_MASSIMO = 0xFFFFFF;      // un blocco FLAC non può superare i 16 MB
  const FORNITORE = "Tag-liatelle";     // per i file che non avevano commenti

  // campi che possono avere più valori: "A; B" diventa due commenti distinti
  const PIU_VALORI = new Set(["artista", "artistaAlbum", "compositore", "paroliere", "direttore", "remixer", "genere"]);
  const NOME_TOTALE = { traccia: "TRACKTOTAL", disco: "DISCTOTAL" };
  const CAMPO = {};
  for (const c of Campi.TUTTI) if (c.vorbis) CAMPO[c.id] = c.vorbis[0];

  const utf8 = (testo) => new TextEncoder().encode(testo);
  function unisci(pezzi) {
    const out = new Uint8Array(pezzi.reduce((s, p) => s + p.length, 0));
    let i = 0;
    for (const p of pezzi) { out.set(p, i); i += p.length; }
    return out;
  }
  const u32 = (n) => Uint8Array.of((n >>> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
  const u32le = (n) => Uint8Array.of(n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >>> 24) & 0xFF);

  // ------------------------------------------------------------------
  // Controlli prima di scrivere
  // ------------------------------------------------------------------
  function controlla(lettura) {
    if (!lettura) return { ok: false, motivo: "Il file non è stato letto." };
    if (lettura.avvisi && lettura.avvisi.length) {
      return { ok: false, motivo: "I dati di questo file FLAC sono in parte rovinati: per non perdere niente, Tag-liatelle non ci scrive. Il file resta com'è." };
    }
    const note = [lettura.commenti
      ? "I tag restano commenti Vorbis, come prima."
      : "Il file non aveva tag: verrà aggiunto un blocco di commenti Vorbis."];
    return { ok: true, note };
  }

  // ------------------------------------------------------------------
  // Commenti
  // ------------------------------------------------------------------
  /** I nuovi commenti di un campo: elenco di [NOME, valore] (vuoto = togliere il campo). */
  function nuoveVoci(campo, valore, vecchie) {
    const nomeGia = (totale) => { const v = vecchie.find((x) => Flac.eTotale(x.nome) === totale); return v && v.nome; };
    if (campo === "traccia" || campo === "disco") {
      const [n, tot] = (Array.isArray(valore) ? valore : [valore, ""]).map((x) => String(x || "").trim());
      if (!n) return [];
      const voci = [[nomeGia(false) || CAMPO[campo], n]];
      if (tot) voci.push([nomeGia(true) || NOME_TOTALE[campo], tot]);
      return voci;
    }
    const v = String(valore == null ? "" : valore).trim();
    if (!v) return [];
    const nome = (vecchie[0] && vecchie[0].nome) || CAMPO[campo];
    if (campo === "compilation") return [[nome, /^(1|s[iì]|yes|true)$/i.test(v) ? "1" : "0"]];
    if (PIU_VALORI.has(campo)) return v.split("; ").map((x) => x.trim()).filter(Boolean).map((x) => [nome, x]);
    return [[nome, v]];
  }

  /** Il blocco dei commenti con le modifiche applicate. */
  function bloccoCommenti(commenti, modifiche) {
    // ogni voce: { campo, grezzo }; quelle non toccate tengono i loro byte originali
    let voci = ((commenti && commenti.voci) || []).map((v) => ({ campo: v.nome ? Flac.campoDi(v.nome, v.valore) : null, nome: v.nome, grezzo: v.grezzo }));
    for (const [campo, valore] of Object.entries(modifiche)) {
      const vecchie = voci.filter((v) => v.campo === campo);
      const nuove = nuoveVoci(campo, valore, vecchie).map(([nome, val]) => ({ campo, nome, grezzo: utf8(`${nome}=${val}`) }));
      const posto = voci.findIndex((v) => v.campo === campo);
      voci = voci.filter((v) => v.campo !== campo);
      voci.splice(posto < 0 ? voci.length : posto, 0, ...nuove);
    }
    const fornitore = commenti ? commenti.fornitoreGrezzo : utf8(FORNITORE);
    const pezzi = [u32le(fornitore.length), fornitore, u32le(voci.length)];
    for (const v of voci) pezzi.push(u32le(v.grezzo.length), v.grezzo);
    return unisci(pezzi);
  }

  // ------------------------------------------------------------------
  // Copertina (blocco PICTURE di tipo 3)
  // ------------------------------------------------------------------
  function bloccoCopertina(c) {
    const m = Immagini.misure(c.dati) || {};
    const mime = utf8(c.mime);
    return unisci([u32(3), u32(mime.length), mime, u32(0),
      u32(m.larghezza || 0), u32(m.altezza || 0), u32(m.profondita || 0), u32(0),
      u32(c.dati.length), c.dati]);
  }
  /** Le immagini da sostituire o togliere: tutte le frontali; per togliere, se non ce ne sono, la prima. */
  function immaginiDaToccare(lettura, copertina) {
    const frontali = lettura.immagini.filter((i) => i.tipo === 3);
    if (frontali.length) return new Set(frontali.map((i) => i.blocco));
    if (copertina.azione === "rimuovi" && lettura.immagini.length) return new Set([lettura.immagini[0].blocco]);
    return new Set();
  }

  // ------------------------------------------------------------------
  // Costruzione della nuova zona dei metadati
  // ------------------------------------------------------------------
  /**
   * @param {object} lettura     il risultato di Flac.leggiFlac
   * @param {object} modifiche   { campo: valore, copertina: {...} }
   * @returns {{metadati: Uint8Array, sulPosto: boolean, riempimento: number, note: string[]}}
   */
  function costruisci(lettura, modifiche) {
    const c = controlla(lettura);
    if (!c.ok) throw new Error(c.motivo);
    const copertina = modifiche.copertina || null;
    const campi = { ...modifiche };
    delete campi.copertina;
    const cambianoCampi = Object.keys(campi).length > 0;
    const bersagli = copertina ? immaginiDaToccare(lettura, copertina) : new Set();

    // l'elenco dei nuovi blocchi, senza lo spazio libero
    const blocchi = [];
    let copertinaScritta = false;
    for (const b of lettura.blocchi) {
      if (b.tipo === T.PADDING) continue;
      if (b.tipo === T.VORBIS_COMMENT && cambianoCampi) {
        blocchi.push({ tipo: T.VORBIS_COMMENT, dati: bloccoCommenti(lettura.commenti, campi) });
      } else if (bersagli.has(b)) {
        if (copertina.azione === "sostituisci" && !copertinaScritta) { blocchi.push({ tipo: T.PICTURE, dati: bloccoCopertina(copertina) }); copertinaScritta = true; }
      } else {
        blocchi.push({ tipo: b.tipo, dati: b.grezzo });
      }
    }
    if (cambianoCampi && !lettura.commenti) {
      // i commenti nuovi vanno subito dopo STREAMINFO e l'eventuale tabella di ricerca
      let dopo = 0;
      blocchi.forEach((b, i) => { if (b.tipo === T.STREAMINFO || b.tipo === T.SEEKTABLE) dopo = i + 1; });
      blocchi.splice(dopo, 0, { tipo: T.VORBIS_COMMENT, dati: bloccoCommenti(null, campi) });
    }
    if (copertina && copertina.azione === "sostituisci" && !copertinaScritta) blocchi.push({ tipo: T.PICTURE, dati: bloccoCopertina(copertina) });

    for (const b of blocchi) {
      if (b.dati.length > BLOCCO_MASSIMO) {
        throw new Error(b.tipo === T.PICTURE
          ? "Questa copertina è troppo grande per un file FLAC (più di 16 MB): scegli una misura più piccola."
          : "I tag sono troppo grandi per un file FLAC (più di 16 MB in un solo blocco).");
      }
    }

    // spazio libero: basta quello che c'era?
    const occupato = blocchi.reduce((s, b) => s + 4 + b.dati.length, 0);
    const disponibile = lettura.audio.inizio - lettura.inizioMeta;
    let riempimento, sulPosto;
    if (occupato === disponibile) {
      riempimento = -1; sulPosto = true;                     // entra giusto giusto: nessun blocco di spazio libero
    } else if (occupato + 4 <= disponibile && disponibile - occupato - 4 <= RIEMPIMENTO_MASSIMO) {
      riempimento = disponibile - occupato - 4; sulPosto = true;
    } else {
      riempimento = RIEMPIMENTO; sulPosto = false;
    }
    if (riempimento >= 0) blocchi.push({ tipo: T.PADDING, dati: new Uint8Array(riempimento) });

    const pezzi = [];
    blocchi.forEach((b, i) => {
      const n = b.dati.length;
      pezzi.push(Uint8Array.of((i === blocchi.length - 1 ? 0x80 : 0) | b.tipo, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF), b.dati);
    });
    const note = [...c.note, sulPosto
      ? "Nel file c'è abbastanza spazio libero: l'audio resta esattamente dov'è."
      : "Nel file non c'è abbastanza spazio libero: verrà riscritto per intero, con l'audio identico."];
    return { metadati: unisci(pezzi), sulPosto, riempimento: Math.max(riempimento, 0), note };
  }

  return { controlla, costruisci, RIEMPIMENTO, FORNITORE };
});
