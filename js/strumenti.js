/* ==========================================================================
   Tag-liatelle · strumenti
   - pulizia degli spazi nei campi;
   - maiuscole nei titoli (iniziali maiuscole oppure solo la prima lettera);
   - cerca e sostituisci nei campi;
   - nomi dei file costruiti dai tag, con uno schema a scelta.
   Qui c'è solo la logica, senza interfaccia: ogni funzione riceve dei
   valori e restituisce i valori nuovi. Funziona anche in Node.
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) module.exports = fabbrica(require("./campi.js"));
  else radice.Strumenti = fabbrica(radice.Campi);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Campi) {
  "use strict";

  /** I campi di testo libero (niente numeri di traccia/disco e niente sì/no). */
  const CAMPI_TESTO = Campi.TUTTI.filter((c) => c.tipo !== "numero-di" && c.tipo !== "si-no");
  const URL_CAMPI = new Set(["sitoArtista", "sitoLicenza", "sitoEtichetta"]);

  // ------------------------------------------------------------------
  // Spazi
  // ------------------------------------------------------------------
  /** Toglie gli spazi all'inizio e alla fine e riduce a uno quelli ripetuti. Nel testo del brano tiene gli a capo. */
  function pulisciSpazi(valore, campo) {
    const v = String(valore == null ? "" : valore);
    if (campo === "testo" || campo === "commenti") {
      return v.replace(/\r\n?/g, "\n").split("\n").map((r) => r.replace(/[ \t ]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    return v.replace(/[\s ]+/g, " ").trim();
  }

  // ------------------------------------------------------------------
  // Maiuscole
  // ------------------------------------------------------------------
  // parole che in un titolo restano minuscole (tranne la prima): italiano e inglese
  const MINORI = new Set((
    "il lo la i gli le l un uno una di d a da in con su per tra fra e ed o od ma né ne che " +
    "del dello della dei degli delle dell al allo alla ai agli alle all dal dallo dalla dai dagli dalle dall " +
    "nel nello nella nei negli nelle nell sul sullo sulla sui sugli sulle sull col coi " +
    "a an the and or nor but of in on at to for by with from as vs via"
  ).split(" "));

  const primaMaiuscola = (p) => p.charAt(0).toLocaleUpperCase("it") + p.slice(1);
  /** Parole da non toccare: sigle (DJ, RAI), nomi con maiuscole dentro (iPhone, McCartney), numeri romani. */
  const daLasciare = (p) => /[A-ZÀ-Þ]/.test(p.slice(1)) || /^[IVXLCDM]+$/.test(p) || /\d/.test(p);

  /**
   * @param {string} valore
   * @param {"iniziali"|"prima"} modo
   *   iniziali: "la città di notte" → "La Città di Notte"
   *   prima:    "la città di notte" → "La città di notte" (cambia solo la prima lettera)
   */
  function maiuscole(valore, modo) {
    const v = String(valore == null ? "" : valore);
    if (modo === "prima") {
      return v.replace(/^([^\p{L}]*)(\p{L})/u, (_, prima, lettera) => prima + lettera.toLocaleUpperCase("it"));
    }
    let inizio = true;
    // si lavora parola per parola; dopo ":" "-" "(" o un punto si ricomincia (la parola dopo va maiuscola)
    return v.replace(/(\p{L}[\p{L}\p{M}'’]*)|([.:!?(\[–—-])/gu, (_, parola, segno) => {
      if (segno) { if (segno !== "-") inizio = true; return segno; } // il trattino unisce le parole (Hip-Hop)
      // "dell'amore": la parte prima dell'apostrofo è una preposizione, quella dopo una parola
      const pezzi = parola.split(/(['’])/);
      const out = pezzi.map((p, i) => {
        if (p === "'" || p === "’" || !p) return p;
        const primo = inizio && i === 0;
        const minore = MINORI.has(p.toLocaleLowerCase("it"));
        if (daLasciare(p)) return p;
        if (minore && !primo) return p.toLocaleLowerCase("it");
        return primaMaiuscola(p.toLocaleLowerCase("it"));
      }).join("");
      inizio = false;
      return out;
    });
  }

  // ------------------------------------------------------------------
  // Cerca e sostituisci (testo semplice, niente simboli speciali)
  // ------------------------------------------------------------------
  const protetto = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /**
   * @param {object} o  { maiuscoleDistinte: boolean, paroleIntere: boolean }
   */
  function sostituisci(valore, cerca, con, o = {}) {
    const v = String(valore == null ? "" : valore);
    if (!cerca) return v;
    let modello = protetto(cerca);
    if (o.paroleIntere) modello = `(?<![\\p{L}\\p{N}])${modello}(?![\\p{L}\\p{N}])`;
    const re = new RegExp(modello, "gu" + (o.maiuscoleDistinte ? "" : "i"));
    return v.replace(re, () => con);
  }

  // ------------------------------------------------------------------
  // Dalle opzioni di uno strumento alle modifiche di una traccia
  // ------------------------------------------------------------------
  /**
   * @param {object} campi      i valori attuali della traccia
   * @param {"spazi"|"maiuscole"|"sostituisci"} strumento
   * @param {object} opzioni    { campi: [id…], modo, cerca, con, maiuscoleDistinte, paroleIntere }
   * @returns {object} solo i campi che cambiano davvero
   */
  function modifiche(campi, strumento, opzioni) {
    const scelti = opzioni.campi && opzioni.campi.length ? opzioni.campi : CAMPI_TESTO.map((c) => c.id);
    const out = {};
    for (const id of scelti) {
      if (!CAMPI_TESTO.some((c) => c.id === id)) continue;
      const prima = campi[id];
      if (prima == null || prima === "") continue;
      let dopo = prima;
      if (strumento === "spazi") dopo = pulisciSpazi(prima, id);
      else if (strumento === "maiuscole") dopo = URL_CAMPI.has(id) ? prima : maiuscole(prima, opzioni.modo);
      else if (strumento === "sostituisci") dopo = sostituisci(prima, opzioni.cerca, opzioni.con, opzioni);
      if (dopo !== prima) out[id] = dopo;
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Nomi dei file dai tag
  // ------------------------------------------------------------------
  const SEGNAPOSTO = {
    traccia: "numero di traccia (01, 02…)", titolo: "titolo", artista: "artista", album: "album",
    anno: "anno", disco: "numero di disco", artistaAlbum: "artista dell'album", genere: "genere",
  };
  const SCHEMI = ["{traccia} - {titolo}", "{traccia} {titolo}", "{traccia} - {artista} - {titolo}", "{artista} - {titolo}", "{disco}-{traccia} {titolo}"];

  /** Toglie dal nome i caratteri che Mac, Windows e Linux non accettano. */
  function nomeSicuro(s) {
    return String(s)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/^[\s.]+|[\s.]+$/g, "")
      .slice(0, 180)
      .trim();
  }

  /**
   * @returns {{nome: string, mancano: string[], segnapostoSconosciuti: string[]}}
   */
  function nomeDaSchema(schema, campi, estensione) {
    const mancano = [], sconosciuti = [];
    const tracciaTot = campi.traccia && campi.traccia[1] ? campi.traccia[1].length : 2;
    const testo = String(schema).replace(/\{([^}]*)\}/g, (_, chiave) => {
      const k = chiave.trim();
      if (!(k in SEGNAPOSTO)) { sconosciuti.push(k); return ""; }
      let v;
      if (k === "traccia" || k === "disco") {
        const n = campi[k] && String(campi[k][0] || "").trim();
        v = n && /^\d+$/.test(n) ? String(parseInt(n, 10)).padStart(k === "traccia" ? Math.max(2, tracciaTot) : 1, "0") : n;
      } else {
        v = campi[k] == null ? "" : String(campi[k]).split("; ")[0];
      }
      if (!String(v || "").trim()) mancano.push(SEGNAPOSTO[k]);
      return nomeSicuro(v || "");
    });
    const base = nomeSicuro(testo.replace(/^[\s\-–_.]+|[\s\-–_]+$/g, ""));
    return { nome: base ? base + estensione : "", mancano, segnapostoSconosciuti: sconosciuti };
  }

  const estensioneDi = (nome) => { const m = /\.[^.]+$/.exec(nome); return m ? m[0].toLowerCase() : ""; };

  /**
   * Il piano della rinomina: per ogni file il nome nuovo, oppure perché resta com'è.
   * @param {{nome, campi, cartella}[]} file   "cartella" distingue i file con lo stesso nome in cartelle diverse
   * @param {string[]} altriNomi  per ogni file, i nomi degli altri file della sua cartella (non coinvolti)
   * @returns {{vecchio, nuovo, stato: "cambia"|"uguale"|"manca"|"doppio"|"occupato", nota}[]}
   */
  function pianoRinomina(file, schema, altriNomi = []) {
    const piano = file.map((f) => {
      const { nome, mancano } = nomeDaSchema(schema, f.campi, estensioneDi(f.nome));
      if (!nome || mancano.length) return { vecchio: f.nome, nuovo: f.nome, stato: "manca", nota: "manca: " + (mancano.join(", ") || "tutto") };
      if (nome === f.nome) return { vecchio: f.nome, nuovo: nome, stato: "uguale", nota: "ha già questo nome" };
      return { vecchio: f.nome, nuovo: nome, stato: "cambia", nota: "" };
    });
    // doppioni: due file della stessa cartella che prenderebbero lo stesso nome (il Mac non distingue maiuscole e minuscole)
    const chiave = (i, nome) => file[i].cartella + "\u0000" + nome.toLocaleLowerCase("it");
    const conteggio = new Map();
    piano.forEach((p, i) => { const k = chiave(i, p.nuovo); conteggio.set(k, (conteggio.get(k) || 0) + 1); });
    piano.forEach((p, i) => {
      if (p.stato === "cambia" && conteggio.get(chiave(i, p.nuovo)) > 1) { p.stato = "doppio"; p.nota = "due file avrebbero lo stesso nome"; }
    });
    // nomi già usati da altri file della cartella
    piano.forEach((p, i) => {
      const occupati = new Set((altriNomi[i] || []).map((n) => n.toLocaleLowerCase("it")));
      if (p.stato === "cambia" && occupati.has(p.nuovo.toLocaleLowerCase("it"))) { p.stato = "occupato"; p.nota = "nella cartella c'è già un file con questo nome"; }
    });
    return piano;
  }

  return { CAMPI_TESTO, pulisciSpazi, maiuscole, sostituisci, modifiche, SEGNAPOSTO, SCHEMI, nomeSicuro, nomeDaSchema, estensioneDi, pianoRinomina };
});
