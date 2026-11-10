/* ==========================================================================
   Tag-liatelle · apertura di cartelle e file
   Raccoglie i file MP3 e FLAC scelti dall'utente (con i pulsanti o
   trascinandoli) e li legge a pezzi, senza mai caricarli interi in memoria.
   Ogni elemento restituito è: { nome, percorso, file, maniglia }
   dove "maniglia" (FileSystemFileHandle) servirà per salvare nel blocco 3;
   nei browser senza File System Access API vale null.
   ========================================================================== */
(function (radice) {
  "use strict";

  const ESTENSIONI = /\.(mp3|flac)$/i;
  const CARTELLA_COPIE = "Tag-liatelle copie";
  const formatoDi = (nome) => (/\.flac$/i.test(nome) ? "FLAC" : "MP3");
  const saltaCartella = (nome) => nome === CARTELLA_COPIE || nome.startsWith(".");

  /** Scende nelle sottocartelle e raccoglie i file audio. */
  async function esplora(cartella, percorso, raccolti, avanzamento) {
    for await (const voce of cartella.values()) {
      if (voce.kind === "directory") {
        if (!saltaCartella(voce.name)) await esplora(voce, percorso + voce.name + "/", raccolti, avanzamento);
      } else if (ESTENSIONI.test(voce.name) && !voce.name.startsWith("._")) {
        // i file "._qualcosa" sono metadati invisibili del Mac, non audio
        raccolti.push({ nome: voce.name, percorso: percorso + voce.name, file: await voce.getFile(), maniglia: voce, formato: formatoDi(voce.name) });
        if (avanzamento) avanzamento(raccolti.length);
      }
    }
    return raccolti;
  }

  // ------------------------------------------------------------------
  // Memoria dell'ultima posizione
  // Il browser dovrebbe ricordarla da solo (grazie all'"id" della finestra),
  // ma con la pagina aperta da un file (file://) Edge e Chrome non lo fanno.
  // Quindi ricordiamo noi l'ultimo file e l'ultima cartella scelti e li
  // passiamo come punto di partenza ("startIn"). Il ricordo resta solo
  // in questo browser, su questo computer (IndexedDB), e non contiene i file.
  // ------------------------------------------------------------------
  const memoria = { file: null, cartella: null };
  const DB = "tagliatelle", NEGOZIO = "posizioni";

  function apriDb() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(NEGOZIO);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  async function ricordaPosizione(tipo, maniglia) {
    if (!maniglia) return;
    memoria[tipo] = maniglia;
    try {
      const db = await apriDb();
      db.transaction(NEGOZIO, "readwrite").objectStore(NEGOZIO).put(maniglia, tipo);
    } catch (e) { /* senza memoria si va avanti lo stesso */ }
  }
  // i ricordi si caricano subito all'apertura della pagina: al clic sul pulsante
  // non c'è tempo per aspettare (il browser vuole aprire la finestra all'istante)
  (async () => {
    try {
      const db = await apriDb();
      for (const tipo of ["file", "cartella"]) {
        const r = db.transaction(NEGOZIO, "readonly").objectStore(NEGOZIO).get(tipo);
        r.onsuccess = () => { if (r.result && !memoria[tipo]) memoria[tipo] = r.result; };
      }
    } catch (e) { /* nessun ricordo: pazienza */ }
  })();
  const posizione = (tipo) => memoria[tipo];

  /**
   * Apre una finestra di scelta partendo dall'ultima posizione ricordata.
   * Se quella posizione non esiste più (file spostato o cancellato),
   * riprova partendo dalla posizione predefinita.
   */
  async function conPosizione(apri, tipo, id) {
    const partenza = posizione(tipo) || posizione(tipo === "cartella" ? "file" : "cartella");
    if (partenza) {
      try {
        return await apri({ startIn: partenza });
      } catch (e) {
        if (e && (e.name === "AbortError" || e.name === "TypeMismatchError")) throw e;
        // ricordo non più valido: si riparte senza
      }
    }
    return apri({ id });
  }

  const puoScegliereCartelle = () => typeof radice.showDirectoryPicker === "function";
  const puoScegliereFile = () => typeof radice.showOpenFilePicker === "function";

  /** Finestra "scegli cartella". Restituisce [] se l'utente annulla. */
  async function scegliCartella(avanzamento) {
    let cartella;
    try {
      cartella = await conPosizione((opzioni) => radice.showDirectoryPicker({ ...opzioni, mode: "read" }), "cartella", "tagliatelle-cartelle");
    } catch (e) {
      if (e && e.name === "AbortError") return { nome: null, file: [] };
      throw e;
    }
    ricordaPosizione("cartella", cartella);
    const file = await esplora(cartella, "", [], avanzamento);
    return { nome: cartella.name, file };
  }

  /** Finestra "scegli file" (o, nei browser che non la hanno, il classico campo file). */
  async function scegliFile() {
    if (puoScegliereFile()) {
      let maniglie;
      try {
        maniglie = await conPosizione((opzioni) => radice.showOpenFilePicker({
          ...opzioni, multiple: true,
          types: [{ description: "File audio MP3 e FLAC", accept: { "audio/mpeg": [".mp3"], "audio/flac": [".flac"] } }],
        }), "file", "tagliatelle-file");
      } catch (e) {
        if (e && e.name === "AbortError") return [];
        throw e;
      }
      ricordaPosizione("file", maniglie[0]);
      const out = [];
      for (const m of maniglie) out.push({ nome: m.name, percorso: m.name, file: await m.getFile(), maniglia: m, formato: formatoDi(m.name) });
      return out;
    }
    return campoFile();
  }

  function campoFile() {
    return new Promise((risolvi) => {
      const campo = document.createElement("input");
      campo.type = "file";
      campo.multiple = true;
      campo.accept = ".mp3,.flac,audio/mpeg,audio/flac";
      campo.addEventListener("change", () => risolvi(daFile(campo.files)));
      campo.addEventListener("cancel", () => risolvi([]));
      campo.click();
    });
  }

  /** Da un elenco di File (senza maniglia: si potrà solo scaricare una copia). */
  function daFile(lista) {
    return Array.from(lista || [])
      .filter((f) => ESTENSIONI.test(f.name))
      .map((f) => ({ nome: f.name, percorso: f.webkitRelativePath || f.name, file: f, maniglia: null, formato: formatoDi(f.name) }));
  }

  /** File e cartelle trascinati sulla pagina. */
  async function daTrascinamento(dataTransfer, avanzamento) {
    const voci = Array.from(dataTransfer.items || []).filter((i) => i.kind === "file");
    // le maniglie vanno chieste SUBITO, prima di qualunque attesa: dopo non sono più disponibili
    const promesse = voci.map((i) => (typeof i.getAsFileSystemHandle === "function" ? i.getAsFileSystemHandle() : null));
    const fileSemplici = voci.map((i) => i.getAsFile());
    const raccolti = [];
    for (let k = 0; k < voci.length; k++) {
      const maniglia = promesse[k] ? await promesse[k].catch(() => null) : null;
      if (maniglia && maniglia.kind === "directory") {
        await esplora(maniglia, maniglia.name + "/", raccolti, avanzamento);
      } else if (maniglia && ESTENSIONI.test(maniglia.name)) {
        ricordaPosizione("file", maniglia);
        raccolti.push({ nome: maniglia.name, percorso: maniglia.name, file: await maniglia.getFile(), maniglia, formato: formatoDi(maniglia.name) });
      } else if (fileSemplici[k]) {
        raccolti.push(...daFile([fileSemplici[k]]));
      }
    }
    return raccolti;
  }

  /** Legge un pezzo di file come Uint8Array. */
  const lettorePezzi = (file) => async (inizio, fine) => new Uint8Array(await file.slice(inizio, fine).arrayBuffer());

  radice.Apertura = { scegliCartella, scegliFile, daFile, daTrascinamento, lettorePezzi, puoScegliereCartelle, puoScegliereFile, CARTELLA_COPIE };
})(typeof globalThis !== "undefined" ? globalThis : this);
