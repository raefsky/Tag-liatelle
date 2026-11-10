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

  // larghezza: "largo" (riga intera), "medio" (mezza riga), "stretto" (un terzo), "quarto" (un quarto)
  // tipo: "testo" | "numero-di" (es. 3 di 12) | "lungo" (più righe) | "si-no" | "copertina"
  const GRUPPI = [
    {
      id: "base", nome: "Base", sempreAperto: true,
      campi: [
        { id: "titolo",  etichetta: "Titolo",  larghezza: "largo" },
        { id: "artista", etichetta: "Artista", larghezza: "medio" },
        { id: "album",   etichetta: "Album",   larghezza: "medio" },
        { id: "anno",    etichetta: "Anno",    larghezza: "quarto" },
        { id: "genere",  etichetta: "Genere",  larghezza: "quarto" },
        { id: "traccia", etichetta: "Traccia", larghezza: "quarto", tipo: "numero-di" },
        { id: "disco",   etichetta: "Disco",   larghezza: "quarto", tipo: "numero-di" },
      ],
    },
    {
      id: "crediti", nome: "Crediti", nota: "chi ha fatto cosa",
      campi: [
        { id: "artistaAlbum",   etichetta: "Artista dell'album", larghezza: "medio" },
        { id: "compositore",    etichetta: "Compositore",        larghezza: "medio" },
        { id: "paroliere",      etichetta: "Paroliere",          larghezza: "medio" },
        { id: "direttore",      etichetta: "Direttore",          larghezza: "medio" },
        { id: "remixer",        etichetta: "Remixer",            larghezza: "medio" },
        { id: "sottotitolo",    etichetta: "Sottotitolo",        larghezza: "medio" },
        { id: "raggruppamento", etichetta: "Raggruppamento",     larghezza: "medio" },
        { id: "lingua",         etichetta: "Lingua",             larghezza: "stretto" },
        { id: "testo",          etichetta: "Testo del brano",    larghezza: "largo", tipo: "lungo" },
      ],
    },
    {
      id: "diritti", nome: "Edizione e diritti", nota: "copyright, etichetta, licenza",
      campi: [
        { id: "copyright",       etichetta: "Copyright ©",               larghezza: "medio" },
        { id: "copyrightRegistrazione", etichetta: "Copyright registrazione ℗", larghezza: "medio" },
        { id: "editore",         etichetta: "Editore o etichetta",       larghezza: "medio" },
        { id: "catalogo",        etichetta: "Numero di catalogo",        larghezza: "stretto" },
        { id: "codiceBarre",     etichetta: "Codice a barre (UPC/EAN)",  larghezza: "stretto" },
        { id: "isrc",            etichetta: "Codice ISRC",               larghezza: "stretto" },
        { id: "licenza",         etichetta: "Licenza",                   larghezza: "largo" },
        { id: "sitoArtista",     etichetta: "Sito dell'artista",         larghezza: "medio" },
        { id: "sitoLicenza",     etichetta: "Pagina della licenza",      larghezza: "medio" },
        { id: "sitoEtichetta",   etichetta: "Sito dell'etichetta",       larghezza: "medio" },
      ],
    },
    {
      id: "extra", nome: "Extra", nota: "BPM, tonalità, note e campi tuoi",
      campi: [
        { id: "bpm",          etichetta: "BPM",           larghezza: "stretto" },
        { id: "tonalita",     etichetta: "Tonalità",      larghezza: "stretto" },
        { id: "compilation",  etichetta: "Compilation",   larghezza: "stretto", tipo: "si-no" },
        { id: "codificatoDa", etichetta: "Codificato da", larghezza: "medio" },
        { id: "commenti",     etichetta: "Commenti",      larghezza: "largo", tipo: "lungo" },
      ],
    },
  ];

  return { GRUPPI };
});
