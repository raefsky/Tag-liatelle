/* ==========================================================================
   Tag-liatelle · elenco dei campi
   Qui si decide QUALI campi esistono, in quale gruppo stanno e come si
   chiamano nell'interfaccia. Nei blocchi successivi ogni campo riceverà
   anche il nome del frame ID3 (MP3) e del commento Vorbis (FLAC).
   Il file funziona sia nel browser (window.Campi) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === "object" && module.exports) module.exports = modulo;
  else radice.Campi = modulo;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // id3: il frame ID3 dove si legge e si scrive il campo nei file MP3.
  //   "TXXX:NOME" = frame di testo personalizzato con quella descrizione.
  //   Anno: si legge da TYER (v2.3) o TDRC (v2.4).
  //   Copyright della registrazione (℗): TPRO, il frame ufficiale di ID3v2.4.
  // vorbis: i nomi dei commenti Vorbis dove si legge il campo nei file FLAC.
  //   Il primo è quello che si scrive; gli altri sono nomi usati da altri programmi, che si leggono soltanto.
  //   Traccia e disco: il totale sta in TRACKTOTAL e DISCTOTAL (si leggono anche TOTALTRACKS e TOTALDISCS, e la forma "3/12").
  //   LICENSE contiene sia il nome della licenza sia il suo indirizzo: se inizia con http è l'indirizzo.
  //   Copyright della registrazione (℗): PRODUCTION_COPYRIGHT, il nome usato dal formato Matroska (Vorbis non ne ha uno ufficiale).
  //   Sito dell'artista: WEBSITE, come MusicBrainz Picard. Sito dell'etichetta: WWWPUBLISHER, come Mp3tag.
  // larghezza: "largo" (riga intera), "medio" (mezza riga), "stretto" (un terzo), "quarto" (un quarto)
  // tipo: "testo" | "numero-di" (es. 3 di 12) | "lungo" (più righe) | "si-no" | "copertina"
  const GRUPPI = [
    {
      id: "base", nome: "Base", sempreAperto: true,
      campi: [
        { id: "titolo",  etichetta: "Titolo",  larghezza: "largo", id3: "TIT2", vorbis: ["TITLE"] },
        { id: "artista", etichetta: "Artista", larghezza: "medio", id3: "TPE1", vorbis: ["ARTIST"] },
        { id: "album",   etichetta: "Album",   larghezza: "medio", id3: "TALB", vorbis: ["ALBUM"] },
        { id: "anno",    etichetta: "Anno",    larghezza: "quarto", id3: "TYER", vorbis: ["DATE", "YEAR"] },
        { id: "genere",  etichetta: "Genere",  larghezza: "quarto", id3: "TCON", vorbis: ["GENRE"] },
        { id: "traccia", etichetta: "Traccia", larghezza: "quarto", tipo: "numero-di", id3: "TRCK", vorbis: ["TRACKNUMBER"] },
        { id: "disco",   etichetta: "Disco",   larghezza: "quarto", tipo: "numero-di", id3: "TPOS", vorbis: ["DISCNUMBER"] },
      ],
    },
    {
      id: "crediti", nome: "Crediti", nota: "chi ha fatto cosa",
      campi: [
        { id: "artistaAlbum",   etichetta: "Artista dell'album", larghezza: "medio", id3: "TPE2", vorbis: ["ALBUMARTIST", "ALBUM ARTIST"] },
        { id: "compositore",    etichetta: "Compositore",        larghezza: "medio", id3: "TCOM", vorbis: ["COMPOSER"] },
        { id: "paroliere",      etichetta: "Paroliere",          larghezza: "medio", id3: "TEXT", vorbis: ["LYRICIST"] },
        { id: "direttore",      etichetta: "Direttore",          larghezza: "medio", id3: "TPE3", vorbis: ["CONDUCTOR"] },
        { id: "remixer",        etichetta: "Remixer",            larghezza: "medio", id3: "TPE4", vorbis: ["REMIXER"] },
        { id: "sottotitolo",    etichetta: "Sottotitolo",        larghezza: "medio", id3: "TIT3", vorbis: ["SUBTITLE"] },
        { id: "raggruppamento", etichetta: "Raggruppamento",     larghezza: "medio", id3: "TIT1", vorbis: ["GROUPING"] },
        { id: "lingua",         etichetta: "Lingua",             larghezza: "stretto", id3: "TLAN", vorbis: ["LANGUAGE"] },
        { id: "testo",          etichetta: "Testo del brano",    larghezza: "largo", tipo: "lungo", id3: "USLT", vorbis: ["LYRICS", "UNSYNCEDLYRICS"] },
      ],
    },
    {
      id: "diritti", nome: "Edizione e diritti", nota: "copyright, etichetta, licenza",
      campi: [
        { id: "copyright",       etichetta: "Copyright ©",               larghezza: "medio", id3: "TCOP", vorbis: ["COPYRIGHT"] },
        { id: "copyrightRegistrazione", etichetta: "Copyright registrazione ℗", larghezza: "medio", id3: "TPRO", vorbis: ["PRODUCTION_COPYRIGHT"] },
        { id: "editore",         etichetta: "Editore o etichetta",       larghezza: "medio", id3: "TPUB", vorbis: ["ORGANIZATION", "LABEL", "PUBLISHER"] },
        { id: "catalogo",        etichetta: "Numero di catalogo",        larghezza: "stretto", id3: "TXXX:CATALOGNUMBER", vorbis: ["CATALOGNUMBER"] },
        { id: "codiceBarre",     etichetta: "Codice a barre (UPC/EAN)",  larghezza: "stretto", id3: "TXXX:BARCODE", vorbis: ["BARCODE", "UPC", "EAN"] },
        { id: "isrc",            etichetta: "Codice ISRC",               larghezza: "stretto", id3: "TSRC", vorbis: ["ISRC"] },
        { id: "licenza",         etichetta: "Licenza",                   larghezza: "largo", id3: "TXXX:LICENSE", vorbis: ["LICENSE"] },
        { id: "sitoArtista",     etichetta: "Sito dell'artista",         larghezza: "medio", id3: "WOAR", vorbis: ["WEBSITE", "URL", "WWWARTIST"] },
        { id: "sitoLicenza",     etichetta: "Pagina della licenza",      larghezza: "medio", id3: "WCOP", vorbis: ["LICENSE"] },
        { id: "sitoEtichetta",   etichetta: "Sito dell'etichetta",       larghezza: "medio", id3: "WPUB", vorbis: ["WWWPUBLISHER"] },
      ],
    },
    {
      id: "extra", nome: "Extra", nota: "BPM, tonalità, note e campi tuoi",
      campi: [
        { id: "bpm",          etichetta: "BPM",           larghezza: "stretto", id3: "TBPM", vorbis: ["BPM"] },
        { id: "tonalita",     etichetta: "Tonalità",      larghezza: "stretto", id3: "TKEY", vorbis: ["INITIALKEY", "KEY"] },
        { id: "compilation",  etichetta: "Compilation",   larghezza: "stretto", tipo: "si-no", id3: "TCMP", vorbis: ["COMPILATION"] },
        { id: "codificatoDa", etichetta: "Codificato da", larghezza: "medio", id3: "TENC", vorbis: ["ENCODEDBY", "ENCODED-BY"] },
        { id: "commenti",     etichetta: "Commenti",      larghezza: "largo", tipo: "lungo", id3: "COMM", vorbis: ["COMMENT", "DESCRIPTION"] },
      ],
    },
  ];

  /** Tutti i campi in un elenco solo. */
  const TUTTI = GRUPPI.flatMap((g) => g.campi);

  /**
   * I valori dei campi dopo le modifiche: servono per l'anteprima e per la
   * verifica dopo il salvataggio. Un valore vuoto vuol dire "togliere il campo".
   * La copertina non è un campo di testo e qui non conta.
   */
  function valoriFinali(campi, modifiche) {
    const finali = { ...(campi || {}) };
    for (const [k, v] of Object.entries(modifiche)) {
      if (k === "copertina") continue;
      const vuoto = v == null || (Array.isArray(v) ? !String(v[0] || "").trim() : !String(v).trim());
      if (vuoto) delete finali[k];
      else if (Array.isArray(v)) finali[k] = [String(v[0]).trim(), String(v[1] || "").trim()];
      else finali[k] = String(v).trim();
    }
    return finali;
  }

  return { GRUPPI, TUTTI, valoriFinali };
});
