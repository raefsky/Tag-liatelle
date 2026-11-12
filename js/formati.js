/* ==========================================================================
   Tag-liatelle · i formati (MP3 e FLAC) dietro un'unica porta
   Il salvataggio e l'interfaccia non devono sapere com'è fatto un MP3 o un
   FLAC: chiedono a Formati.per(formato) e ricevono sempre le stesse cose.

     leggi(leggiPezzo, dimensione)   → lettura (campi, immagini, avvisi, audio…)
     controlla(lettura)              → { ok, note } oppure { ok: false, motivo }
     etichetta(lettura)              → testo breve per la scheda ("ID3v2.3", "commenti Vorbis"…)
     senzaTag(lettura)               → true se il file non ha nessun tag
     prepara(lettura, modifiche)     → cosa scrivere:
         attesi     i campi che ci aspettiamo di rileggere
         note       frasi per l'anteprima
         parti(f)   i pezzi del nuovo file, nell'ordine (per riscriverlo tutto)
         sulPosto   null, oppure { posizione, dati }: basta scrivere quel pezzo
                    dentro il file, che non cambia dimensione
         controlli  [{ posizione, dati }]: byte che dopo il salvataggio devono
                    trovarsi nel file (posizione negativa = dalla fine)
   ========================================================================== */
(function (radice) {
  "use strict";

  const MP3 = {
    nome: "MP3",
    mime: "audio/mpeg",
    leggi: (leggiPezzo, dimensione) => Id3.leggiMp3(leggiPezzo, dimensione),
    controlla: (lettura, opzioni) => Id3Scrittura.controlla(lettura, opzioni),
    etichetta: (l) => (l.tag ? "ID3v" + l.tag.versione + (l.v1 ? " + ID3v1" : "") : l.v1 ? "solo ID3v1" : "nessun tag"),
    senzaTag: (l) => !l.tag && !l.v1,
    prepara(l, modifiche, opzioni) {
      const nuovo = Id3Scrittura.costruisci(l, modifiche, opzioni);
      // con il solo ID3v1, il nuovo tag parte dai valori del vecchio
      const attesi = Id3Scrittura.valoriFinali(l, !l.tag && l.v1 ? { ...l.campi, ...modifiche } : modifiche);
      return {
        attesi, note: nuovo.note, sulPosto: null,
        parti: (file) => [nuovo.tag, file.slice(l.audio.inizio, l.audio.fine), nuovo.v1 || new Uint8Array(0)],
        controlli: [{ posizione: 0, dati: nuovo.tag }, ...(nuovo.v1 ? [{ posizione: -128, dati: nuovo.v1 }] : [])],
      };
    },
  };

  const FLAC = {
    nome: "FLAC",
    mime: "audio/flac",
    leggi: (leggiPezzo, dimensione) => Flac.leggiFlac(leggiPezzo, dimensione),
    controlla: (lettura) => FlacScrittura.controlla(lettura),
    etichetta: (l) => (l.commenti ? "commenti Vorbis" : "nessun tag"),
    senzaTag: (l) => !l.commenti && !l.immagini.length,
    prepara(l, modifiche) {
      const nuovo = FlacScrittura.costruisci(l, modifiche);
      return {
        attesi: Campi.valoriFinali(l.campi, modifiche), note: nuovo.note,
        sulPosto: nuovo.sulPosto ? { posizione: l.inizioMeta, dati: nuovo.metadati } : null,
        parti: (file) => [file.slice(0, l.inizioMeta), nuovo.metadati, file.slice(l.audio.inizio)],
        controlli: [{ posizione: l.inizioMeta, dati: nuovo.metadati }],
      };
    },
  };

  const per = (formato) => (formato === "FLAC" ? FLAC : MP3);

  radice.Formati = { per, MP3, FLAC };
})(typeof globalThis !== "undefined" ? globalThis : this);
