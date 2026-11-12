/* ==========================================================================
   Tag-liatelle · prove dei modelli di edizione
   ========================================================================== */
(function () {
  "use strict";
  const M = Modelli;
  const mattarello = {
    editore: "Edizioni del Mattarello", copyright: "2026 Edizioni del Mattarello",
    licenza: "CC BY-NC-SA 4.0", sitoLicenza: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    sitoEtichetta: "https://esempio.it/mattarello",
  };

  prova("modelli: si crea con un nome e i campi compilati; quelli vuoti e quelli per brano non entrano", () => {
    const r = M.crea("  Edizioni del Mattarello ", { ...mattarello, bpm: "", titolo: "No", isrc: "ITA1B2600001", inventato: "x" });
    uguale(r.errori, [], "errori");
    uguale(r.modello, { nome: "Edizioni del Mattarello", campi: mattarello }, "modello");
  });

  prova("modelli: senza nome, vuoti o con valori sbagliati non si salvano", () => {
    vero(M.crea("", mattarello).errori.length, "senza nome");
    vero(M.crea("Vuoto", { editore: "  " }).errori.length, "vuoto");
    vero(M.crea("Sbagliato", { sitoEtichetta: "esempio.it" }).errori[0].includes("Sito dell'etichetta"), "indirizzo sbagliato");
    vero(M.crea("Sbagliato", { licenza: "https://creativecommons.org/licenses/by/4.0/" }).errori.length, "indirizzo nella licenza");
    uguale(M.crea("Lingua", { lingua: "Italiano" }).avvisi.length, 1, "lingua non in codice: solo un avviso");
  });

  prova("modelli: applicare aggiunge i campi del modello e non tocca gli altri", () => {
    const modello = M.crea("Mattarello", mattarello).modello;
    const r = M.applica(modello, { album: "Al dente", editore: "Altra etichetta" });
    uguale(r.modifiche, { album: "Al dente", ...mattarello }, "modifiche");
    uguale(r.cambiati, 5, "campi cambiati");
  });

  prova("modelli: un campo che ha già il valore del modello non diventa una modifica", () => {
    const modello = M.crea("Mattarello", mattarello).modello;
    const attuali = { editore: "Edizioni del Mattarello", copyright: "vecchio" };
    const r = M.applica(modello, { editore: "Cambiato a mano" }, attuali);
    vero(!("editore" in r.modifiche), "l'editore era già quello: nessuna modifica");
    uguale(r.modifiche.copyright, mattarello.copyright, "il copyright cambia");
  });

  prova("modelli: esportazione e importazione, anche con nomi già usati", () => {
    const a = M.crea("Mattarello", mattarello).modello;
    const b = M.crea("Sfoglia Records", { editore: "Sfoglia Records", licenza: "CC BY 4.0" }).modello;
    const testo = M.esporta([a, b]);
    vero(testo.includes('"app": "Tag-liatelle"'), "riconoscibile");
    const r = M.importa(testo, [a]);
    uguale(r.modelli.map((m) => m.nome), ["Mattarello (2)", "Sfoglia Records"], "nomi");
    uguale(r.modelli[0].campi, a.campi, "campi");
    vero(r.rapporto[0].includes("importato come «Mattarello (2)»"), "rapporto");
  });

  prova("modelli: file sbagliati o con dati estranei", () => {
    vero(M.importa("non è json", []).errore, "testo qualsiasi");
    vero(M.importa('{"app":"altro","modelli":[]}', []).errore, "file di un'altra app");
    vero(M.importa('{"app":"Tag-liatelle","versione":99,"modelli":[]}', []).errore, "versione futura");
    const r = M.importa(JSON.stringify({ app: "Tag-liatelle", versione: 1, modelli: [
      { nome: "Buono", campi: { editore: "Ok", strano: "x", bpm: 120 } },
      { nome: "Rotto", campi: { sitoArtista: "senza-https" } },
      null,
    ] }), []);
    uguale(r.modelli, [{ nome: "Buono", campi: { editore: "Ok" } }], "solo il modello buono, solo i campi noti e di testo");
    vero(r.rapporto.some((x) => x.includes("«Rotto» non importato")), "il rotto è segnalato");
    vero(r.rapporto.some((x) => x.includes("strano") && x.includes("bpm")), "i campi lasciati fuori sono segnalati");
  });

  prova("modelli: un modello applicato a MP3 e FLAC scrive gli stessi valori", async () => {
    const modello = M.crea("Mattarello", { ...mattarello, copyrightRegistrazione: "2026 Mattarello", compilation: "1" }).modello;
    for (const e of [ESEMPI.find((x) => x.nome.startsWith("02")), ESEMPI_FLAC.find((x) => x.nome.startsWith("11"))]) {
      const formato = e.nome.endsWith(".flac") ? "FLAC" : "MP3";
      const byte = byteDa64(e.base64);
      const F = Formati.per(formato);
      const l = await F.leggi(async (a, b) => byte.subarray(a, b), byte.length);
      const { modifiche } = M.applica(modello, {}, l.campi);
      const prep = F.prepara(l, modifiche);
      const file = new Uint8Array(await new Blob(prep.parti(new Blob([byte]))).arrayBuffer());
      const dopo = await F.leggi(async (a, b) => file.subarray(a, b), file.length);
      for (const [k, v] of Object.entries(modello.campi)) uguale(dopo.campi[k], v, `${e.nome}: ${k}`);
    }
  });
})();
