/* ==========================================================================
   Tag-liatelle · prove degli strumenti
   ========================================================================== */
(function () {
  "use strict";
  const S = Strumenti;

  prova("spazi: doppi, all'inizio e alla fine; nel testo del brano restano gli a capo", () => {
    uguale(S.pulisciSpazi("  Tagliatelle   al\tragù  ", "titolo"), "Tagliatelle al ragù", "titolo");
    uguale(S.pulisciSpazi("Prima  riga  \n\n\n\n  seconda riga ", "testo"), "Prima riga\n\nseconda riga", "testo");
    uguale(S.pulisciSpazi("a  b", "album"), "a b", "spazio non separabile");
  });

  prova("maiuscole, iniziali: articoli e preposizioni restano minuscoli (italiano e inglese)", () => {
    uguale(S.maiuscole("la città di notte e il mare", "iniziali"), "La Città di Notte e il Mare", "italiano");
    uguale(S.maiuscole("dell'amore e dell'odio", "iniziali"), "Dell'Amore e dell'Odio", "apostrofi");
    uguale(S.maiuscole("the sound of the city", "iniziali"), "The Sound of the City", "inglese");
    uguale(S.maiuscole("TUTTO IN MAIUSCOLO? no: tutto minuscolo", "iniziali"), "TUTTO IN MAIUSCOLO? No: Tutto Minuscolo", "le sigle restano, dopo i due punti si ricomincia");
    uguale(S.maiuscole("live alla RAI con DJ mattarello e iPhone", "iniziali"), "Live alla RAI con DJ Mattarello e iPhone", "sigle e nomi con maiuscole interne");
    uguale(S.maiuscole("hip-hop di periferia (versione II)", "iniziali"), "Hip-Hop di Periferia (Versione II)", "trattini, parentesi e numeri romani");
  });

  prova("maiuscole, solo la prima lettera: il resto non si tocca", () => {
    uguale(S.maiuscole("perché la Città è più bella", "prima"), "Perché la Città è più bella", "prima lettera");
    uguale(S.maiuscole("«ninna nanna»", "prima"), "«Ninna nanna»", "dopo le virgolette");
    uguale(S.maiuscole("’o sole mio", "prima"), "’O sole mio", "apostrofo iniziale");
  });

  prova("cerca e sostituisci: maiuscole, parole intere, simboli", () => {
    uguale(S.sostituisci("Le Sfogline e le sfogline", "sfogline", "Sfoglie"), "Le Sfoglie e le Sfoglie", "senza distinguere le maiuscole");
    uguale(S.sostituisci("Le Sfogline e le sfogline", "sfogline", "Sfoglie", { maiuscoleDistinte: true }), "Le Sfogline e le Sfoglie", "distinguendo le maiuscole");
    uguale(S.sostituisci("arte e artigiano", "arte", "ARTE", { paroleIntere: true }), "ARTE e artigiano", "parole intere");
    uguale(S.sostituisci("costa 1.000 (circa)", "1.000 (circa)", "mille", {}), "costa mille", "i simboli contano come lettere normali");
    uguale(S.sostituisci("Città", "città", "Paese", { paroleIntere: true }), "Paese", "parole con accenti");
    uguale(S.sostituisci("abc", "", "x"), "abc", "niente da cercare");
  });

  prova("strumenti: si cambiano solo i campi che cambiano davvero, e gli indirizzi web non prendono maiuscole", () => {
    const campi = { titolo: "  la  città ", artista: "Le Sfogline", traccia: ["1", "2"], sitoArtista: "https://esempio.it/sfogline", compilation: "1" };
    uguale(S.modifiche(campi, "spazi", {}), { titolo: "la città" }, "spazi");
    uguale(S.modifiche({ titolo: "la città", sitoArtista: "https://esempio.it/a" }, "maiuscole", { modo: "iniziali" }), { titolo: "La Città" }, "maiuscole");
    uguale(S.modifiche(campi, "sostituisci", { cerca: "Sfogline", con: "Sfoglie", campi: ["artista", "sitoArtista"] }),
      { artista: "Le Sfoglie", sitoArtista: "https://esempio.it/Sfoglie" }, "sostituisci nei campi scelti (si scrive proprio il testo indicato)");
  });

  prova("nomi dei file: schema, numeri con lo zero, caratteri vietati", () => {
    const campi = { traccia: ["3", "12"], titolo: "Perché? Sì: «forse» / no", artista: "Le Sfogline; Nonna Ìrma", disco: ["1", "2"] };
    uguale(S.nomeDaSchema("{traccia} - {titolo}", campi, ".mp3").nome, "03 - Perché- Sì- «forse» - no.mp3", "traccia e titolo");
    uguale(S.nomeDaSchema("{traccia} - {artista} - {titolo}", campi, ".flac").nome, "03 - Le Sfogline - Perché- Sì- «forse» - no.flac", "solo il primo artista");
    uguale(S.nomeDaSchema("{disco}-{traccia} {titolo}", { ...campi, traccia: ["7", "120"] }, ".mp3").nome, "1-007 Perché- Sì- «forse» - no.mp3", "tre cifre se le tracce sono più di 99");
    uguale(S.nomeDaSchema("{traccia} - {titolo}", { titolo: "Solo titolo" }, ".mp3").mancano, ["numero di traccia (01, 02…)"], "manca la traccia");
    uguale(S.nomeDaSchema("{titulo}", campi, ".mp3").segnapostoSconosciuti, ["titulo"], "segnaposto sbagliato");
    uguale(S.nomeSicuro("  ..nome. "), "nome", "punti e spazi ai bordi");
  });

  prova("piano della rinomina: uguali, mancanti, doppioni, nomi già occupati", () => {
    const file = [
      { nome: "a.mp3", cartella: "x", campi: { traccia: ["1"], titolo: "Uno" } },
      { nome: "01 - Due.mp3", cartella: "x", campi: { traccia: ["1"], titolo: "Due" } },
      { nome: "c.mp3", cartella: "x", campi: { traccia: ["2"], titolo: "Stesso" } },
      { nome: "d.flac", cartella: "x", campi: { traccia: ["2"], titolo: "stesso" } },     // stesso nome a parte le maiuscole, ma estensione diversa
      { nome: "e.mp3", cartella: "y", campi: { traccia: ["2"], titolo: "Stesso" } },      // altra cartella: nessun conflitto
      { nome: "f.mp3", cartella: "x", campi: { titolo: "Senza numero" } },
      { nome: "g.mp3", cartella: "x", campi: { traccia: ["9"], titolo: "Occupato" } },
      { nome: "h.mp3", cartella: "x", campi: { traccia: ["3"], titolo: "Doppio" } },
      { nome: "i.mp3", cartella: "x", campi: { traccia: ["3"], titolo: "doppio" } },
    ];
    const altri = file.map(() => ["09 - Occupato.mp3", "copertina.jpg"]);
    const p = S.pianoRinomina(file, "{traccia} - {titolo}", altri);
    uguale(p.map((x) => x.stato), ["cambia", "uguale", "cambia", "cambia", "cambia", "manca", "occupato", "doppio", "doppio"], "stati");
    uguale(p[0].nuovo, "01 - Uno.mp3", "nuovo nome");
  });
})();
