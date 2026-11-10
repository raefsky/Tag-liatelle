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
  // larghezza: "largo" (riga intera), "medio" (mezza riga), "stretto" (un terzo), "quarto" (un quarto)
  // tipo: "testo" | "numero-di" (es. 3 di 12) | "lungo" (più righe) | "si-no" | "copertina"
  const GRUPPI = [
    {
      id: "base", nome: "Base", sempreAperto: true,
      campi: [
        { id: "titolo",  etichetta: "Titolo",  larghezza: "largo", id3: "TIT2" },
        { id: "artista", etichetta: "Artista", larghezza: "medio", id3: "TPE1" },
        { id: "album",   etichetta: "Album",   larghezza: "medio", id3: "TALB" },
        { id: "anno",    etichetta: "Anno",    larghezza: "quarto", id3: "TYER" },
        { id: "genere",  etichetta: "Genere",  larghezza: "quarto", id3: "TCON" },
        { id: "traccia", etichetta: "Traccia", larghezza: "quarto", tipo: "numero-di", id3: "TRCK" },
        { id: "disco",   etichetta: "Disco",   larghezza: "quarto", tipo: "numero-di", id3: "TPOS" },
      ],
    },
    {
      id: "crediti", nome: "Crediti", nota: "chi ha fatto cosa",
      campi: [
        { id: "artistaAlbum",   etichetta: "Artista dell'album", larghezza: "medio", id3: "TPE2" },
        { id: "compositore",    etichetta: "Compositore",        larghezza: "medio", id3: "TCOM" },
        { id: "paroliere",      etichetta: "Paroliere",          larghezza: "medio", id3: "TEXT" },
        { id: "direttore",      etichetta: "Direttore",          larghezza: "medio", id3: "TPE3" },
        { id: "remixer",        etichetta: "Remixer",            larghezza: "medio", id3: "TPE4" },
        { id: "sottotitolo",    etichetta: "Sottotitolo",        larghezza: "medio", id3: "TIT3" },
        { id: "raggruppamento", etichetta: "Raggruppamento",     larghezza: "medio", id3: "TIT1" },
        { id: "lingua",         etichetta: "Lingua",             larghezza: "stretto", id3: "TLAN" },
        { id: "testo",          etichetta: "Testo del brano",    larghezza: "largo", tipo: "lungo", id3: "USLT" },
      ],
    },
    {
      id: "diritti", nome: "Edizione e diritti", nota: "copyright, etichetta, licenza",
      campi: [
        { id: "copyright",       etichetta: "Copyright ©",               larghezza: "medio", id3: "TCOP" },
        { id: "copyrightRegistrazione", etichetta: "Copyright registrazione ℗", larghezza: "medio", id3: "TPRO" },
        { id: "editore",         etichetta: "Editore o etichetta",       larghezza: "medio", id3: "TPUB" },
        { id: "catalogo",        etichetta: "Numero di catalogo",        larghezza: "stretto", id3: "TXXX:CATALOGNUMBER" },
        { id: "codiceBarre",     etichetta: "Codice a barre (UPC/EAN)",  larghezza: "stretto", id3: "TXXX:BARCODE" },
        { id: "isrc",            etichetta: "Codice ISRC",               larghezza: "stretto", id3: "TSRC" },
        { id: "licenza",         etichetta: "Licenza",                   larghezza: "largo", id3: "TXXX:LICENSE" },
        { id: "sitoArtista",     etichetta: "Sito dell'artista",         larghezza: "medio", id3: "WOAR" },
        { id: "sitoLicenza",     etichetta: "Pagina della licenza",      larghezza: "medio", id3: "WCOP" },
        { id: "sitoEtichetta",   etichetta: "Sito dell'etichetta",       larghezza: "medio", id3: "WPUB" },
      ],
    },
    {
      id: "extra", nome: "Extra", nota: "BPM, tonalità, note e campi tuoi",
      campi: [
        { id: "bpm",          etichetta: "BPM",           larghezza: "stretto", id3: "TBPM" },
        { id: "tonalita",     etichetta: "Tonalità",      larghezza: "stretto", id3: "TKEY" },
        { id: "compilation",  etichetta: "Compilation",   larghezza: "stretto", tipo: "si-no", id3: "TCMP" },
        { id: "codificatoDa", etichetta: "Codificato da", larghezza: "medio", id3: "TENC" },
        { id: "commenti",     etichetta: "Commenti",      larghezza: "largo", tipo: "lungo", id3: "COMM" },
      ],
    },
  ];

  /** Tutti i campi in un elenco solo. */
  const TUTTI = GRUPPI.flatMap((g) => g.campi);

  return { GRUPPI, TUTTI };
});
