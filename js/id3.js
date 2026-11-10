/* ==========================================================================
   Tag-liatelle · lettura dei tag MP3 (ID3v2.2, v2.3, v2.4 e ID3v1)
   Legge SOLO il blocco dei tag: l'audio non viene mai letto né toccato.
   Ogni frame viene conservato com'è, anche quelli che non conosciamo,
   così al salvataggio (blocco 3) potremo riscriverli identici.
   Funziona sia nel browser (window.Id3) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabbrica(require("./binario.js"), require("./campi.js"));
  } else {
    radice.Id3 = fabbrica(radice.Binario, radice.Campi);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (B, Campi) {
  "use strict";

  // ------------------------------------------------------------------
  // Elenco storico dei generi (ID3v1 e "(n)" in ID3v2), 0-191
  // ------------------------------------------------------------------
  const GENERI = ("Blues|Classic Rock|Country|Dance|Disco|Funk|Grunge|Hip-Hop|Jazz|Metal|New Age|Oldies|Other|Pop|R&B|Rap|Reggae|Rock|Techno|Industrial|" +
    "Alternative|Ska|Death Metal|Pranks|Soundtrack|Euro-Techno|Ambient|Trip-Hop|Vocal|Jazz+Funk|Fusion|Trance|Classical|Instrumental|Acid|House|Game|Sound Clip|Gospel|Noise|" +
    "Alternative Rock|Bass|Soul|Punk|Space|Meditative|Instrumental Pop|Instrumental Rock|Ethnic|Gothic|Darkwave|Techno-Industrial|Electronic|Pop-Folk|Eurodance|Dream|Southern Rock|Comedy|Cult|Gangsta|" +
    "Top 40|Christian Rap|Pop/Funk|Jungle|Native American|Cabaret|New Wave|Psychedelic|Rave|Showtunes|Trailer|Lo-Fi|Tribal|Acid Punk|Acid Jazz|Polka|Retro|Musical|Rock & Roll|Hard Rock|" +
    "Folk|Folk-Rock|National Folk|Swing|Fast Fusion|Bebop|Latin|Revival|Celtic|Bluegrass|Avantgarde|Gothic Rock|Progressive Rock|Psychedelic Rock|Symphonic Rock|Slow Rock|Big Band|Chorus|Easy Listening|Acoustic|" +
    "Humour|Speech|Chanson|Opera|Chamber Music|Sonata|Symphony|Booty Bass|Primus|Porn Groove|Satire|Slow Jam|Club|Tango|Samba|Folklore|Ballad|Power Ballad|Rhythmic Soul|Freestyle|" +
    "Duet|Punk Rock|Drum Solo|A Cappella|Euro-House|Dance Hall|Goa|Drum & Bass|Club-House|Hardcore Techno|Terror|Indie|BritPop|Afro-Punk|Polsk Punk|Beat|Christian Gangsta Rap|Heavy Metal|Black Metal|Crossover|" +
    "Contemporary Christian|Christian Rock|Merengue|Salsa|Thrash Metal|Anime|J-Pop|Synthpop|Abstract|Art Rock|Baroque|Bhangra|Big Beat|Breakbeat|Chillout|Downtempo|Dub|EBM|Eclectic|Electro|" +
    "Electroclash|Emo|Experimental|Garage|Global|IDM|Illbient|Industro-Goth|Jam Band|Krautrock|Leftfield|Lounge|Math Rock|New Romantic|Nu-Breakz|Post-Punk|Post-Rock|Psytrance|Shoegaze|Space Rock|" +
    "Trop Rock|World Music|Neoclassical|Audiobook|Audio Theatre|Neue Deutsche Welle|Podcast|Indie Rock|G-Funk|Dubstep|Garage Rock|Psybient").split("|");

  /** "(17)", "17", "(17)Rock", "RX", "CR" → nomi leggibili */
  function nomeGenere(valore) {
    const v = valore.trim();
    if (/^\d+$/.test(v)) return GENERI[+v] || v;
    if (v === "RX") return "Remix";
    if (v === "CR") return "Cover";
    const nomi = [];
    let resto = v;
    let m;
    while ((m = /^\((\d+|RX|CR)\)/.exec(resto))) {
      nomi.push(m[1] === "RX" ? "Remix" : m[1] === "CR" ? "Cover" : GENERI[+m[1]] || m[1]);
      resto = resto.slice(m[0].length);
    }
    if (resto.startsWith("((")) resto = resto.slice(1); // "((" vuol dire una vera parentesi
    if (resto) {
      // "(17)Rock": il testo ripete il numero, non va aggiunto due volte
      if (!(nomi.length === 1 && nomi[0].toLowerCase() === resto.toLowerCase())) nomi.push(resto);
    }
    return nomi.join("; ");
  }

  // ------------------------------------------------------------------
  // ID3v2.2 usa nomi di tre lettere: li traduciamo in quelli moderni
  // ------------------------------------------------------------------
  const DA_V22 = {
    TT1: "TIT1", TT2: "TIT2", TT3: "TIT3", TP1: "TPE1", TP2: "TPE2", TP3: "TPE3", TP4: "TPE4", TAL: "TALB",
    TYE: "TYER", TCO: "TCON", TRK: "TRCK", TPA: "TPOS", TCM: "TCOM", TXT: "TEXT", TLA: "TLAN", TCR: "TCOP",
    TPB: "TPUB", TRC: "TSRC", TBP: "TBPM", TKE: "TKEY", TEN: "TENC", TXX: "TXXX", COM: "COMM", ULT: "USLT",
    PIC: "APIC", WAR: "WOAR", WCP: "WCOP", WPB: "WPUB", WXX: "WXXX", TCP: "TCMP", TDA: "TDAT", TIM: "TIME",
    TOR: "TORY", TSS: "TSSE", TMT: "TMED", TFT: "TFLT", TOA: "TOPE", TOL: "TOLY", TOT: "TOAL", UFI: "UFID",
  };

  // Frame che corrispondono ai campi dell'interfaccia (da campi.js)
  const PER_FRAME = {};   // "TIT2" → "titolo"
  const PER_TXXX = {};    // "CATALOGNUMBER" → "catalogo"
  for (const c of Campi.TUTTI) {
    if (!c.id3) continue;
    if (c.id3.startsWith("TXXX:")) PER_TXXX[c.id3.slice(5)] = c.id;
    else PER_FRAME[c.id3] = c.id;
  }
  PER_FRAME.TDRC = "anno"; // ID3v2.4 tiene l'anno in TDRC

  const ID_VALIDO = /^[A-Z0-9]{3,4}$/;

  // ------------------------------------------------------------------
  // Lettura dell'intestazione e dei frame
  // ------------------------------------------------------------------

  /** Dimensione totale del tag che inizia a "b" (intestazione compresa), o 0 se non c'è. */
  function misuraTag(b) {
    if (b.length < 10 || B.ascii(b, 0, 3) !== "ID3") return 0;
    const major = b[3];
    if (major < 2 || major > 4 || b[4] === 0xFF || !B.eSyncsafe(b, 6)) return 0;
    const footer = major === 4 && b[5] & 0x10 ? 10 : 0;
    return 10 + B.syncsafe(b, 6) + footer;
  }

  /**
   * Legge un tag ID3v2 dai suoi byte.
   * @param {Uint8Array} b  i byte del tag, a partire da "ID3"
   * @returns {null | {versione, major, revisione, flags, dimensione, frames, avvisi}}
   */
  function leggiTag(b) {
    const dimensione = misuraTag(b);
    if (!dimensione) return null;
    const major = b[3], revisione = b[4], flags = b[5];
    const avvisi = [];
    const fine = Math.min(10 + B.syncsafe(b, 6), b.length);
    if (fine < 10 + B.syncsafe(b, 6)) avvisi.push("Il file finisce prima della fine dei tag.");

    let corpo = b.subarray(10, fine);
    // v2.2 e v2.3: la "unsynchronisation" vale per tutto il tag
    if (flags & 0x80 && major < 4) corpo = B.risincronizza(corpo);

    let pos = 0;
    // intestazione estesa (la saltiamo, ma ne teniamo conto)
    if (flags & 0x40 && major >= 3 && corpo.length >= 4) {
      const est = major === 4 ? B.syncsafe(corpo, 0) : B.u32(corpo, 0) + 4;
      if (est >= 6 && est <= corpo.length) pos = est;
      else avvisi.push("L'intestazione estesa del tag non è valida.");
    }

    const frames = [];
    const lungTesta = major === 2 ? 6 : 10;
    const lungId = major === 2 ? 3 : 4;
    while (pos + lungTesta <= corpo.length) {
      if (corpo[pos] === 0) break; // inizio del riempimento (padding)
      const id = B.ascii(corpo, pos, lungId);
      if (!ID_VALIDO.test(id)) {
        avvisi.push(`Dopo i tag ci sono ${corpo.length - pos} byte che non riconosco: li lascio dove sono.`);
        break;
      }
      let misura;
      if (major === 2) misura = B.u24(corpo, pos + 3);
      else if (major === 3) misura = B.u32(corpo, pos + 4);
      else misura = misura24(corpo, pos);
      const fFlags = major === 2 ? 0 : B.u16(corpo, pos + 8);
      const inizioDati = pos + lungTesta;
      if (misura > corpo.length - inizioDati) {
        avvisi.push(`Il campo ${id} dichiara una dimensione impossibile: mi fermo qui e conservo il resto com'è.`);
        break;
      }
      frames.push(preparaFrame(id, major, fFlags, corpo.subarray(inizioDati, inizioDati + misura), flags, avvisi));
      pos = inizioDati + misura;
    }

    return {
      versione: "2." + major, major, revisione, flags, dimensione, frames, avvisi,
      riempimento: Math.max(0, corpo.length - pos),
    };
  }

  /**
   * Dimensione di un frame v2.4. Dovrebbe essere "syncsafe", ma alcuni
   * programmi (vecchie versioni di iTunes) scrivono un numero normale:
   * scegliamo la lettura che porta a un frame successivo sensato.
   */
  function misura24(c, pos) {
    const sicura = B.syncsafe(c, pos + 4);
    const normale = B.u32(c, pos + 4);
    if (!B.eSyncsafe(c, pos + 4)) return normale;
    if (sicura === normale) return sicura;
    const sensato = (m) => {
      const dopo = pos + 10 + m;
      return dopo === c.length || (dopo < c.length && (c[dopo] === 0 || (dopo + 4 <= c.length && ID_VALIDO.test(B.ascii(c, dopo, 4)))));
    };
    if (sensato(sicura)) return sicura;
    if (sensato(normale)) return normale;
    return sicura;
  }

  /** Toglie i byte aggiuntivi indicati dalle flag e interpreta il contenuto. */
  function preparaFrame(id, major, fFlags, grezzo, flagsTag, avvisi) {
    const frame = { id, nome: major === 2 ? DA_V22[id] || id : id, flags: fFlags, grezzo, leggibile: true };
    let dati = grezzo;
    let compresso = false, cifrato = false;
    if (major === 3) {
      compresso = !!(fFlags & 0x0080);
      cifrato = !!(fFlags & 0x0040);
      let salta = 0;
      if (compresso) salta += 4;
      if (cifrato) salta += 1;
      if (fFlags & 0x0020) salta += 1;
      dati = dati.subarray(Math.min(salta, dati.length));
    } else if (major === 4) {
      compresso = !!(fFlags & 0x0008);
      cifrato = !!(fFlags & 0x0004);
      let salta = 0;
      if (fFlags & 0x0040) salta += 1;
      if (cifrato) salta += 1;
      if (fFlags & 0x0001) salta += 4;
      dati = dati.subarray(Math.min(salta, dati.length));
      if (fFlags & 0x0002 || flagsTag & 0x80) dati = B.risincronizza(dati);
    }
    if (compresso || cifrato) {
      frame.leggibile = false; // lo conserviamo così com'è
      return frame;
    }
    frame.dati = dati;
    try {
      Object.assign(frame, interpretaFrame(frame.nome, dati, major));
    } catch (e) {
      frame.leggibile = false;
      avvisi.push(`Non riesco a leggere il campo ${id}: lo conservo com'è.`);
    }
    return frame;
  }

  /** Legge il contenuto di un frame secondo il suo tipo. */
  function interpretaFrame(nome, d, major) {
    if (!d.length) return { testi: [""] };
    const enc = d[0];
    if (nome === "TXXX") {
      const f = B.cercaZero(d, 1, enc);
      return { descrizione: B.testo(d.subarray(1, f), enc), testi: B.testi(d.subarray(f + B.larghezzaZero(enc)), enc) };
    }
    if (nome[0] === "T") return { testi: B.testi(d.subarray(1), enc) };
    if (nome === "WXXX") {
      const f = B.cercaZero(d, 1, enc);
      const u = d.subarray(f + B.larghezzaZero(enc));
      return { descrizione: B.testo(d.subarray(1, f), enc), url: B.latin1(u.subarray(0, B.cercaZero(u, 0, 0))) };
    }
    if (nome[0] === "W") return { url: B.latin1(d.subarray(0, B.cercaZero(d, 0, 0))) };
    if (nome === "COMM" || nome === "USLT") {
      const lingua = B.ascii(d, 1, 3);
      const f = B.cercaZero(d, 4, enc);
      const testo = B.testo(d.subarray(f + B.larghezzaZero(enc)), enc).replace(/\u0000+$/, "");
      return { lingua, descrizione: B.testo(d.subarray(4, f), enc), testo };
    }
    if (nome === "APIC") {
      let pos, mime;
      if (major === 2) {
        const formato = B.ascii(d, 1, 3).toUpperCase();
        mime = formato === "PNG" ? "image/png" : formato === "JPG" ? "image/jpeg" : "image/" + formato.toLowerCase();
        pos = 4;
      } else {
        const f = B.cercaZero(d, 1, 0);
        mime = B.latin1(d.subarray(1, f)).toLowerCase() || "image/";
        if (mime === "jpg" || mime === "image/jpg") mime = "image/jpeg";
        if (mime === "png") mime = "image/png";
        pos = f + 1;
      }
      const tipo = d[pos];
      const f2 = B.cercaZero(d, pos + 1, enc);
      return { mime, tipoImmagine: tipo, descrizione: B.testo(d.subarray(pos + 1, f2), enc), immagine: d.subarray(f2 + B.larghezzaZero(enc)) };
    }
    return {};
  }

  // ------------------------------------------------------------------
  // ID3v1 (gli ultimi 128 byte del file)
  // ------------------------------------------------------------------
  function leggiV1(b) {
    if (b.length !== 128 || B.ascii(b, 0, 3) !== "TAG") return null;
    const campo = (i, n) => B.latin1(b.subarray(i, i + n)).replace(/\u0000[\s\S]*$/, "").trimEnd();
    const v11 = b[125] === 0 && b[126] !== 0;
    return {
      titolo: campo(3, 30), artista: campo(33, 30), album: campo(63, 30), anno: campo(93, 4),
      commento: campo(97, v11 ? 28 : 30), traccia: v11 ? b[126] : 0,
      genere: b[127] === 255 ? "" : GENERI[b[127]] || "",
    };
  }

  // ------------------------------------------------------------------
  // Dai frame ai campi dell'interfaccia
  // ------------------------------------------------------------------
  const unisci = (testi) => testi.filter((t) => t !== "").join("; ");
  const numeroDi = (t) => { const [n = "", tot = ""] = t.split("/"); return [n.trim(), tot.trim()]; };

  /**
   * @returns {{campi: object, immagini: Array, personalizzati: Array, altri: string[]}}
   *  - campi: i valori mostrati nell'interfaccia
   *  - immagini: tutte le immagini, con tipo (3 = copertina frontale)
   *  - personalizzati: TXXX che non corrispondono a un campo noto
   *  - altri: frame conservati ma non mostrati
   */
  function interpreta(tag, v1) {
    const campi = {}, immagini = [], personalizzati = [], altri = [];
    if (!tag && v1) {
      // solo ID3v1: lo usiamo per riempire i campi base
      for (const k of ["titolo", "artista", "album", "anno", "genere"]) if (v1[k]) campi[k] = v1[k];
      if (v1.traccia) campi.traccia = [String(v1.traccia), ""];
      if (v1.commento) campi.commenti = v1.commento;
    }
    for (const f of (tag && tag.frames) || []) {
      if (!f.leggibile) { altri.push(f.nome); continue; }
      const n = f.nome;
      if (n === "APIC") {
        immagini.push({ tipo: f.tipoImmagine, mime: f.mime, descrizione: f.descrizione, dati: f.immagine, byte: f.immagine.length });
      } else if (n === "TXXX") {
        const campo = PER_TXXX[f.descrizione.toUpperCase()];
        if (campo && !(campo in campi)) campi[campo] = unisci(f.testi);
        else personalizzati.push({ nome: f.descrizione, valore: unisci(f.testi) });
      } else if (n === "COMM") {
        if (!("commenti" in campi) && f.descrizione === "") campi.commenti = f.testo;
        else altri.push(n);
      } else if (n === "USLT") {
        if (!("testo" in campi)) campi.testo = f.testo;
        else altri.push(n);
      } else if (PER_FRAME[n] && !(PER_FRAME[n] in campi)) {
        const campo = PER_FRAME[n];
        if (f.url !== undefined) campi[campo] = f.url;
        else if (campo === "traccia" || campo === "disco") campi[campo] = numeroDi(f.testi[0] || "");
        else if (campo === "anno") campi.anno = (f.testi[0] || "").slice(0, 4);
        else if (campo === "genere") campi.genere = f.testi.map(nomeGenere).filter(Boolean).join("; ");
        else campi[campo] = unisci(f.testi);
      } else {
        altri.push(n);
      }
    }
    return { campi, immagini, personalizzati, altri };
  }

  // ------------------------------------------------------------------
  // Lettura di un file MP3, leggendo solo i pezzi che servono
  // ------------------------------------------------------------------
  /**
   * @param {(inizio:number, fine:number) => Promise<Uint8Array>} leggiPezzo
   * @param {number} dimensione  dimensione del file in byte
   */
  async function leggiMp3(leggiPezzo, dimensione) {
    const testa = await leggiPezzo(0, Math.min(10, dimensione));
    const misura = misuraTag(testa);
    const tag = misura ? leggiTag(await leggiPezzo(0, Math.min(misura, dimensione))) : null;
    const coda = dimensione >= 128 + misura ? await leggiPezzo(dimensione - 128, dimensione) : new Uint8Array(0);
    const v1 = leggiV1(coda);
    const avvisi = tag ? tag.avvisi.slice() : [];
    if (testa.length >= 3 && B.ascii(testa, 0, 3) === "ID3" && !misura) avvisi.push("Il file ha un tag ID3 di una versione che non conosco: lo lascio com'è.");
    return {
      formato: "MP3",
      versione: tag ? tag.versione : v1 ? "ID3v1" : null,
      tag, v1, avvisi,
      audio: { inizio: misura, fine: v1 ? dimensione - 128 : dimensione },
      ...interpreta(tag, v1),
    };
  }

  /** Comodità per i test: legge un MP3 da byte già in memoria. */
  const leggiMp3DaByte = (b) => leggiMp3(async (i, f) => b.subarray(i, f), b.length);

  return { GENERI, nomeGenere, misuraTag, leggiTag, leggiV1, interpreta, leggiMp3, leggiMp3DaByte };
});
