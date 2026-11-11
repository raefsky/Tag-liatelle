/* ==========================================================================
   Tag-liatelle · lettura dei tag FLAC (commenti Vorbis e immagini PICTURE)
   Un file FLAC è fatto così:
       "fLaC" + blocchi di metadati + audio
   Si leggono SOLO i blocchi di metadati, uno alla volta: dell'audio si
   guardano al massimo i primi 2 byte (per controllare che inizi dove deve)
   e gli ultimi 128 (per riconoscere un eventuale vecchio tag ID3v1).
   Ogni blocco viene conservato com'è, anche quelli che non conosciamo.
   Funziona sia nel browser (window.Flac) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabbrica(require("./binario.js"), require("./campi.js"), require("./id3.js"));
  } else {
    radice.Flac = fabbrica(radice.Binario, radice.Campi, radice.Id3);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (B, Campi, Id3) {
  "use strict";

  const TIPI = ["STREAMINFO", "PADDING", "APPLICATION", "SEEKTABLE", "VORBIS_COMMENT", "CUESHEET", "PICTURE"];
  const T = { STREAMINFO: 0, PADDING: 1, APPLICATION: 2, SEEKTABLE: 3, VORBIS_COMMENT: 4, CUESHEET: 5, PICTURE: 6 };
  const MAX_BLOCCHI = 1024;

  // commenti che contengono immagini in un vecchio formato: si conservano, ma non si mostrano
  const NASCOSTI = new Set(["METADATA_BLOCK_PICTURE", "COVERART", "COVERARTMIME"]);
  // blocchi che fanno parte della struttura del file e non sono "dati in più"
  const STRUTTURA = new Set([T.STREAMINFO, T.PADDING, T.SEEKTABLE, T.VORBIS_COMMENT, T.PICTURE]);

  // ------------------------------------------------------------------
  // Dal nome di un commento al campo dell'interfaccia
  // ------------------------------------------------------------------
  const PER_NOME = {};
  for (const c of Campi.TUTTI) for (const n of c.vorbis || []) if (!(n in PER_NOME)) PER_NOME[n] = c.id;
  const TOTALI = { TRACKTOTAL: "traccia", TOTALTRACKS: "traccia", DISCTOTAL: "disco", TOTALDISCS: "disco" };
  const eIndirizzo = (v) => /^https?:\/\//i.test(String(v).trim());

  /** A quale campo appartiene un commento (null = campo personalizzato). */
  function campoDi(nome, valore) {
    const N = nome.toUpperCase();
    if (N === "LICENSE") return eIndirizzo(valore) ? "sitoLicenza" : "licenza";
    return TOTALI[N] || PER_NOME[N] || null;
  }
  const eTotale = (nome) => nome.toUpperCase() in TOTALI;

  // ------------------------------------------------------------------
  // Il blocco dei commenti Vorbis
  //   lunghezza + nome del programma che ha creato il file ("fornitore")
  //   numero dei commenti, poi per ciascuno: lunghezza + "NOME=valore" in UTF-8
  //   (i numeri qui sono "little endian", al contrario del resto del FLAC)
  // ------------------------------------------------------------------
  const utf8 = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

  function leggiCommenti(d) {
    const avvisi = [];
    const voci = [];
    const rovinati = () => { avvisi.push("I commenti di questo file sono in parte rovinati: leggo quelli che riesco e conservo il resto com'è."); };
    if (d.length < 8) { rovinati(); return { fornitore: "", fornitoreGrezzo: new Uint8Array(0), voci, avvisi }; }
    const lf = B.u32le(d, 0);
    if (4 + lf + 4 > d.length) { rovinati(); return { fornitore: "", fornitoreGrezzo: new Uint8Array(0), voci, avvisi }; }
    const fornitoreGrezzo = d.subarray(4, 4 + lf);
    const quanti = B.u32le(d, 4 + lf);
    let pos = 8 + lf;
    for (let i = 0; i < quanti; i++) {
      if (pos + 4 > d.length) { rovinati(); break; }
      const l = B.u32le(d, pos);
      if (pos + 4 + l > d.length) { rovinati(); break; }
      const grezzo = d.subarray(pos + 4, pos + 4 + l);
      const testo = utf8.decode(grezzo);
      const uguale = testo.indexOf("=");
      if (uguale < 1) {
        avvisi.push("Un commento di questo file non ha la forma NOME=valore: lo conservo com'è.");
        voci.push({ nome: "", valore: testo, grezzo });
      } else {
        voci.push({ nome: testo.slice(0, uguale), valore: testo.slice(uguale + 1), grezzo });
      }
      pos += 4 + l;
    }
    if (!avvisi.length && pos !== d.length) avvisi.push("Dopo i commenti ci sono dei byte che non riconosco: li lascio dove sono.");
    return { fornitore: utf8.decode(fornitoreGrezzo), fornitoreGrezzo, voci, avvisi };
  }

  // ------------------------------------------------------------------
  // Un blocco PICTURE
  // ------------------------------------------------------------------
  function leggiImmagine(d) {
    let pos = 0;
    const u32 = () => { if (pos + 4 > d.length) throw new Error("immagine troncata"); const v = B.u32(d, pos); pos += 4; return v; };
    const pezzo = (n) => { if (pos + n > d.length) throw new Error("immagine troncata"); const p = d.subarray(pos, pos + n); pos += n; return p; };
    const tipo = u32();
    let mime = B.latin1(pezzo(u32())).toLowerCase();
    if (mime === "image/jpg") mime = "image/jpeg";
    const descrizione = utf8.decode(pezzo(u32()));
    const larghezza = u32(), altezza = u32();
    u32(); u32(); // profondità di colore e numero di colori: non ci servono
    const dati = pezzo(u32());
    return { tipo, mime, descrizione, larghezza, altezza, dati, byte: dati.length };
  }

  // ------------------------------------------------------------------
  // Dai commenti ai campi dell'interfaccia
  // ------------------------------------------------------------------
  function interpreta(commenti) {
    const campi = {}, personalizzati = [], nascosti = [];
    const valori = {};      // campo → [{ nome, valore }]
    const numeri = {};      // "traccia" | "disco" → { n, tot }
    for (const v of (commenti && commenti.voci) || []) {
      if (!v.nome) continue;
      const N = v.nome.toUpperCase();
      if (NASCOSTI.has(N)) { nascosti.push(N); continue; }
      const campo = campoDi(v.nome, v.valore);
      if (!campo) { personalizzati.push({ nome: v.nome, valore: v.valore }); continue; }
      if (campo === "traccia" || campo === "disco") {
        const x = numeri[campo] || (numeri[campo] = {});
        if (eTotale(v.nome)) { if (x.tot === undefined) x.tot = v.valore.trim(); }
        else if (x.n === undefined) {
          const [n = "", tot = ""] = v.valore.split("/");   // anche la forma "3/12"
          x.n = n.trim();
          if (tot.trim()) x.totInsieme = tot.trim();
        }
        continue;
      }
      (valori[campo] || (valori[campo] = [])).push({ nome: N, valore: v.valore });
    }
    for (const [campo, lista] of Object.entries(valori)) {
      if (campo === "anno") { campi.anno = lista[0].valore.trim().slice(0, 4); continue; }
      // lo stesso valore scritto sotto due nomi diversi (es. ORGANIZATION e LABEL) conta una volta sola
      const tenuti = lista.filter((x, i) => !lista.slice(0, i).some((y) => y.valore === x.valore && y.nome !== x.nome));
      campi[campo] = tenuti.map((x) => x.valore).filter((x) => x !== "").join("; ");
    }
    for (const [campo, x] of Object.entries(numeri)) campi[campo] = [x.n || "", x.tot !== undefined ? x.tot : x.totInsieme || ""];
    return { campi, personalizzati, nascosti };
  }

  // ------------------------------------------------------------------
  // Lettura di un file FLAC
  // ------------------------------------------------------------------
  /**
   * @param {(inizio:number, fine:number) => Promise<Uint8Array>} leggiPezzo
   * @param {number} dimensione  dimensione del file in byte
   */
  async function leggiFlac(leggiPezzo, dimensione) {
    const avvisi = [];
    const altri = [];
    const testa = await leggiPezzo(0, Math.min(10, dimensione));
    // alcuni programmi mettono (sbagliando) un tag ID3v2 davanti al FLAC: lo saltiamo e lo conserviamo
    const base = Id3.misuraTag(testa);
    if (base) altri.push("ID3v2");
    const sigla = base ? await leggiPezzo(Math.min(base, dimensione), Math.min(base + 4, dimensione)) : testa;
    if (sigla.length < 4 || B.ascii(sigla, 0, 4) !== "fLaC") throw new Error("Non sembra un file FLAC: manca la sigla iniziale «fLaC».");

    const blocchi = [];
    let pos = base + 4;
    let completo = false;
    while (blocchi.length < MAX_BLOCCHI) {
      if (pos + 4 > dimensione) { avvisi.push("Il file finisce prima dell'audio: è incompleto."); break; }
      const h = await leggiPezzo(pos, pos + 4);
      const ultimo = !!(h[0] & 0x80);
      const tipo = h[0] & 0x7F;
      const lunghezza = B.u24(h, 1);
      const nome = TIPI[tipo] || "BLOCCO_" + tipo;
      if (tipo === 127 || pos + 4 + lunghezza > dimensione) {
        avvisi.push(`Il blocco ${nome} dichiara una dimensione impossibile: mi fermo qui e conservo il resto com'è.`);
        break;
      }
      const b = { tipo, nome, inizio: pos, lunghezza };
      if (tipo !== T.PADDING) b.grezzo = await leggiPezzo(pos + 4, pos + 4 + lunghezza);
      blocchi.push(b);
      pos += 4 + lunghezza;
      if (ultimo) { completo = true; break; }
    }
    if (!completo && !avvisi.length) avvisi.push("Il file ha troppi blocchi di dati: non sembra un FLAC in buono stato.");

    if (!blocchi.length || blocchi[0].tipo !== T.STREAMINFO || blocchi[0].lunghezza !== 34) {
      avvisi.push("Il file non inizia con le informazioni sull'audio (STREAMINFO), come dovrebbe ogni FLAC.");
    }
    // l'audio deve cominciare con il suo segnale di sincronismo
    if (completo && pos + 2 <= dimensione) {
      const s = await leggiPezzo(pos, pos + 2);
      if (!(s[0] === 0xFF && (s[1] & 0xFE) === 0xF8)) avvisi.push("Dopo i tag non trovo l'audio dove dovrebbe cominciare: il file potrebbe essere rovinato.");
    }
    // un vecchio tag ID3v1 in coda (raro nei FLAC): si conserva
    let fine = dimensione;
    if (completo && dimensione - pos >= 128) {
      const coda = await leggiPezzo(dimensione - 128, dimensione);
      if (B.ascii(coda, 0, 3) === "TAG") { fine = dimensione - 128; altri.push("ID3v1"); }
    }

    // commenti
    const blocchiCommenti = blocchi.filter((b) => b.tipo === T.VORBIS_COMMENT);
    let commenti = null;
    if (blocchiCommenti.length) {
      commenti = leggiCommenti(blocchiCommenti[0].grezzo);
      commenti.blocco = blocchiCommenti[0];
      avvisi.push(...commenti.avvisi);
      if (blocchiCommenti.length > 1) avvisi.push("Il file ha più di un blocco di commenti: un FLAC ne dovrebbe avere uno solo.");
    }
    // immagini
    const immagini = [];
    for (const b of blocchi) {
      if (b.tipo !== T.PICTURE) continue;
      try { immagini.push({ ...leggiImmagine(b.grezzo), blocco: b }); }
      catch (e) { avvisi.push("Un'immagine del file è rovinata: la conservo com'è."); }
    }
    const letto = interpreta(commenti);
    const sconosciuti = blocchi.filter((b) => !STRUTTURA.has(b.tipo)).map((b) => b.nome);
    const v1 = altri.includes("ID3v1");
    const elencoAltri = [...altri.filter((x) => x === "ID3v2"), ...sconosciuti, ...letto.nascosti, ...(v1 ? ["ID3v1"] : [])];

    return {
      formato: "FLAC",
      versione: "Vorbis",
      fornitore: commenti ? commenti.fornitore : null,
      commenti, blocchi, avvisi,
      inizioMeta: base + 4,
      audio: { inizio: pos, fine },
      campi: letto.campi, immagini, personalizzati: letto.personalizzati, altri: elencoAltri,
    };
  }

  /** Comodità per i test: legge un FLAC da byte già in memoria. */
  const leggiFlacDaByte = (b) => leggiFlac(async (i, f) => b.subarray(i, f), b.length);

  return { T, TIPI, campoDi, eTotale, eIndirizzo, leggiCommenti, leggiImmagine, interpreta, leggiFlac, leggiFlacDaByte };
});
