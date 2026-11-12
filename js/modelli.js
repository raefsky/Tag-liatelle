/* ==========================================================================
   Tag-liatelle · modelli di edizione
   Un modello è un insieme di campi con un nome (per esempio "Edizioni del
   Mattarello": etichetta, copyright, licenza, siti…) da riapplicare con un
   clic a una traccia o a più tracce insieme.
   Qui c'è la logica pura (funziona anche in Node) più il salvataggio nel
   browser (localStorage: i modelli restano solo in questo browser, per
   questo si possono esportare in un file e importare).
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) module.exports = fabbrica(require("./campi.js"));
  else radice.Modelli = fabbrica(radice.Campi);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Campi) {
  "use strict";

  // campi propri di ogni brano: non hanno senso in un modello
  const ESCLUSI = new Set(["titolo", "isrc", "testo", "traccia", "disco"]);
  /** I campi che un modello può contenere, nell'ordine della scheda. */
  const CAMPI = Campi.TUTTI.filter((c) => !ESCLUSI.has(c.id));
  const ID_CAMPI = new Set(CAMPI.map((c) => c.id));
  /** I campi proposti già spuntati quando si crea un modello. */
  const PREDEFINITI = new Set(["artistaAlbum", "copyright", "copyrightRegistrazione", "editore", "licenza", "sitoArtista", "sitoLicenza", "sitoEtichetta"]);

  const FORMATO = { app: "Tag-liatelle", tipo: "modelli di edizione", versione: 1 };
  const CHIAVE = "tagliatelle.modelli";

  const pulito = (v) => String(v == null ? "" : v).trim();

  /**
   * Prepara un modello controllando nome e valori.
   * @returns {{modello?: {nome, campi}, errori: string[], avvisi: string[]}}
   */
  function crea(nome, campi) {
    const errori = [], avvisi = [];
    const n = pulito(nome);
    if (!n) errori.push("Dai un nome al modello, per esempio il nome dell'etichetta.");
    if (n.length > 80) errori.push("Il nome del modello è troppo lungo (al massimo 80 caratteri).");
    const tenuti = {};
    for (const [id, valore] of Object.entries(campi || {})) {
      if (!ID_CAMPI.has(id)) continue;
      const v = pulito(valore);
      if (!v) continue;
      const etichetta = CAMPI.find((c) => c.id === id).etichetta;
      // un modello vale per MP3 e FLAC: si controlla con le regole di tutti e due
      for (const formato of ["MP3", "FLAC"]) {
        const esito = Campi.controllaValore(id, v, formato);
        if (esito.errore) { errori.push(`${etichetta}: ${esito.errore}`); break; }
        if (esito.avviso && formato === "MP3") avvisi.push(`${etichetta}: ${esito.avviso}`);
      }
      tenuti[id] = Campi.normalizza(id, v);
    }
    if (!Object.keys(tenuti).length) errori.push("Il modello è vuoto: scegli almeno un campo e scrivi il suo valore.");
    return errori.length ? { errori, avvisi } : { modello: { nome: n, campi: tenuti }, errori, avvisi };
  }

  /**
   * Applica un modello a delle modifiche già in corso: aggiunge i campi del
   * modello e lascia stare tutto il resto. I campi vuoti del modello non contano.
   * @param {object} modello
   * @param {object} modifiche    le modifiche attuali (non vengono toccate: se ne crea una copia)
   * @param {object|null} attuali i valori del file: se un campo ha già il valore del modello non diventa una modifica
   */
  function applica(modello, modifiche, attuali = null) {
    const nuove = { ...modifiche };
    let cambiati = 0;
    for (const [id, valore] of Object.entries(modello.campi)) {
      if (!ID_CAMPI.has(id) || !pulito(valore)) continue;
      if (attuali && pulito(attuali[id]) === pulito(valore)) { delete nuove[id]; continue; }
      if (pulito(nuove[id]) !== pulito(valore)) cambiati++;
      nuove[id] = valore;
    }
    return { modifiche: nuove, cambiati };
  }

  /** Un nome libero: se c'è già, aggiunge (2), (3)… */
  function nomeLibero(nome, esistenti) {
    const usati = new Set(esistenti.map((m) => m.nome.toLowerCase()));
    if (!usati.has(nome.toLowerCase())) return nome;
    for (let i = 2; ; i++) if (!usati.has(`${nome} (${i})`.toLowerCase())) return `${nome} (${i})`;
  }

  /** Il testo del file di esportazione (JSON leggibile anche a occhio). */
  function esporta(modelli) {
    return JSON.stringify({ ...FORMATO, esportato: new Date().toISOString(), modelli: modelli.map((m) => ({ nome: m.nome, campi: m.campi })) }, null, 2) + "\n";
  }

  /**
   * Legge un file di modelli esportato.
   * @returns {{modelli: object[], rapporto: string[], errore?: string}}
   *   I modelli con un nome già usato vengono rinominati, non sostituiti.
   */
  function importa(testo, esistenti) {
    let dati;
    try { dati = JSON.parse(testo); } catch (e) { return { modelli: [], rapporto: [], errore: "Questo file non è un file di modelli di Tag-liatelle (non si riesce a leggere)." }; }
    if (!dati || dati.app !== FORMATO.app || !Array.isArray(dati.modelli)) {
      return { modelli: [], rapporto: [], errore: "Questo file non è un file di modelli di Tag-liatelle." };
    }
    if (dati.versione > FORMATO.versione) {
      return { modelli: [], rapporto: [], errore: "Questo file è stato creato da una versione più nuova di Tag-liatelle: aggiorna l'app per importarlo." };
    }
    const modelli = [], rapporto = [];
    const tutti = [...esistenti];
    for (const m of dati.modelli) {
      if (!m || typeof m !== "object") continue;
      const campiNoti = {};
      const ignorati = [];
      for (const [id, v] of Object.entries(m.campi || {})) {
        if (ID_CAMPI.has(id) && typeof v === "string") campiNoti[id] = v;
        else ignorati.push(id);
      }
      const esito = crea(m.nome, campiNoti);
      if (!esito.modello) { rapporto.push(`«${pulito(m.nome) || "senza nome"}» non importato: ${esito.errori[0]}`); continue; }
      const nome = nomeLibero(esito.modello.nome, tutti);
      const modello = { nome, campi: esito.modello.campi };
      modelli.push(modello);
      tutti.push(modello);
      rapporto.push(nome !== esito.modello.nome
        ? `«${esito.modello.nome}» c'era già: importato come «${nome}».`
        : `«${nome}» importato.`);
      if (ignorati.length) rapporto.push(`  (in «${nome}» ho lasciato fuori dei campi che non conosco: ${ignorati.join(", ")})`);
    }
    if (!modelli.length && !rapporto.length) rapporto.push("Il file non contiene modelli.");
    return { modelli, rapporto };
  }

  // ------------------------------------------------------------------
  // Conservazione nel browser
  // ------------------------------------------------------------------
  let inMemoria = null; // se il browser non permette di conservare, i modelli restano finché la pagina è aperta

  function leggi() {
    try {
      const t = localStorage.getItem(CHIAVE);
      const dati = t ? JSON.parse(t) : [];
      return Array.isArray(dati) ? dati.filter((m) => m && m.nome && m.campi) : [];
    } catch (e) {
      return inMemoria || [];
    }
  }
  /** @returns {boolean} true se i modelli sono stati conservati nel browser */
  function scrivi(modelli) {
    inMemoria = modelli;
    try { localStorage.setItem(CHIAVE, JSON.stringify(modelli)); return true; }
    catch (e) { return false; }
  }

  return { CAMPI, ESCLUSI, PREDEFINITI, crea, applica, nomeLibero, esporta, importa, leggi, scrivi };
});
