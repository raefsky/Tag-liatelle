/* ==========================================================================
   Tag-liatelle · interfaccia
   Apre cartelle e file (con i pulsanti o trascinandoli), legge i tag MP3 e
   mostra la pila di schede e la scheda grande. Per ora legge soltanto:
   la modifica e il salvataggio arrivano nel blocco 3.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const piattaforma = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  const sistema = /Mac|iPhone|iPad/i.test(piattaforma) ? "mac" : /Win/i.test(piattaforma) ? "windows" : /Linux|CrOS|X11/i.test(piattaforma) ? "linux" : "altro";

  // Le scorciatoie, scritte per esteso per i due tipi di tastiera
  const SCORCIATOIE = [
    { cosa: "Salvare le modifiche (dopo l'anteprima)", mac: ["⌘ Cmd", "S"],        pc: ["Ctrl", "S"] },
    { cosa: "Passare alla traccia successiva",          mac: ["⌥ Option", "↓"],    pc: ["Alt", "↓"] },
    { cosa: "Tornare alla traccia precedente",          mac: ["⌥ Option", "↑"],    pc: ["Alt", "↑"] },
    { cosa: "Vedere le scorciatoie",                    mac: ["?"],                pc: ["?"] },
    { cosa: "Chiudere una finestrella",                 mac: ["Esc"],              pc: ["Esc"] },
  ];
  const tasti = (lista) => lista.flatMap((t, i) => (i ? [" + ", el("kbd", { testo: t })] : [el("kbd", { testo: t })]));

  /** Crea un elemento. Il testo passa sempre da textContent: niente HTML iniettato dai tag. */
  function el(nome, attributi, ...figli) {
    const nodo = document.createElement(nome);
    for (const [k, v] of Object.entries(attributi || {})) {
      if (v === false || v == null) continue;
      if (k === "classe") nodo.className = v;
      else if (k === "testo") nodo.textContent = v;
      else if (k.startsWith("su")) nodo.addEventListener(k.slice(2), v);
      else nodo.setAttribute(k, v === true ? "" : v);
    }
    for (const f of figli.flat()) if (f != null) nodo.append(f);
    return nodo;
  }
  function icona(nome) {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("class", "icona"); s.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(ns, "use");
    u.setAttribute("href", "#i-" + nome);
    s.append(u);
    return s;
  }

  // ---------- Messaggio breve in basso ----------
  let timerMessaggio;
  function avvisa(testo, durata = 3800) {
    const m = $("#messaggio");
    m.textContent = testo; m.hidden = false;
    clearTimeout(timerMessaggio);
    timerMessaggio = setTimeout(() => (m.hidden = true), durata);
  }

  // ---------- Preferenze (salvate solo in questo browser) ----------
  function leggiPref(chiave) { try { return localStorage.getItem("tagliatelle." + chiave); } catch (e) { return null; } }
  function scriviPref(chiave, valore) {
    try { if (valore == null) localStorage.removeItem("tagliatelle." + chiave); else localStorage.setItem("tagliatelle." + chiave, valore); } catch (e) { /* va bene lo stesso */ }
  }

  // ---------- Tema ----------
  function impostaTema(tema) {
    if (tema === "chiaro" || tema === "scuro") document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
    scriviPref("tema", tema === "auto" ? null : tema);
    document.querySelectorAll(".tema button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === tema)));
  }
  document.querySelectorAll(".tema button").forEach((b) => b.addEventListener("click", () => impostaTema(b.dataset.tema)));
  impostaTema(leggiPref("tema") || "auto");

  // ---------- Animazioni ----------
  const sistemaRiduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const casella = $("#animazioni");
  casella.checked = !sistemaRiduce && leggiPref("movimento") !== "no";
  casella.disabled = sistemaRiduce;
  $("#nota-animazioni").textContent = sistemaRiduce
    ? "Il tuo computer chiede di ridurre il movimento: le animazioni restano spente."
    : "Il timbro e i piccoli movimenti dei pulsanti.";
  casella.addEventListener("change", () => {
    if (casella.checked) { delete document.documentElement.dataset.movimento; scriviPref("movimento", null); }
    else { document.documentElement.dataset.movimento = "no"; scriviPref("movimento", "no"); }
  });
  const animazioniAttive = () => !sistemaRiduce && document.documentElement.dataset.movimento !== "no";

  // ---------- Controllo del browser ----------
  const stato = Supporto.controlla(window);
  const msg = Supporto.messaggio(stato);
  if (msg) {
    $("#avviso-testo").append(el("p", {}, el("strong", { testo: msg.titolo })), el("p", { testo: msg.testo }));
    $("#avviso-browser").hidden = false;
    $("#apri-cartella").disabled = !stato.cartelle;
    if (!stato.cartelle) $("#apri-cartella").title = "Serve Chrome o Edge";
  }

  // ---------- Formati di numeri e misure ----------
  const numeri = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
  function misura(byte) {
    if (byte < 1024) return byte + " byte";
    if (byte < 1024 * 1024) return numeri.format(byte / 1024) + " KB";
    return numeri.format(byte / 1024 / 1024) + " MB";
  }
  const TIPI_IMMAGINE = ["Altra immagine", "Icona del file", "Altra icona", "Copertina davanti", "Copertina dietro", "Libretto",
    "Disco (supporto)", "Solista", "Artista", "Direttore", "Gruppo", "Compositore", "Paroliere", "Luogo di registrazione",
    "Durante la registrazione", "Durante il concerto", "Fotogramma video", "Pesce colorato", "Illustrazione", "Logo dell'artista", "Logo dell'editore"];
  const nomeTipo = (n) => TIPI_IMMAGINE[n] || "Immagine di tipo " + n;
  const nomeFormatoImmagine = (mime) => ({ "image/jpeg": "JPEG", "image/png": "PNG", "image/gif": "GIF", "image/webp": "WebP", "image/bmp": "BMP" }[mime] || mime);

  // ---------- Le tracce aperte ----------
  // ogni traccia: { nome, percorso, file, maniglia, formato, stato: "lettura"|"letto"|"errore"|"attesa", lettura }
  let tracce = [];
  let corrente = -1;
  let inLettura = 0;

  const chiaveTraccia = (t) => t.percorso + "|" + t.file.size + "|" + t.file.lastModified;
  const confronto = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
  const numero = (x) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : Infinity; };
  const confrontaNumeri = (a, b) => (a === b ? 0 : a === Infinity ? 1 : b === Infinity ? -1 : a - b);

  function ordina() {
    const scelta = tracce[corrente];
    tracce.sort((a, b) => {
      const ca = (a.lettura && a.lettura.campi) || {}, cb = (b.lettura && b.lettura.campi) || {};
      const cartella = confronto.compare(a.percorso.replace(/[^/]*$/, ""), b.percorso.replace(/[^/]*$/, ""));
      if (cartella) return cartella;
      // prima per disco, poi per numero di traccia; chi non ha il numero va in fondo
      // senza numero di disco si considera il disco 1
      const disco = confrontaNumeri(numero((ca.disco || [])[0] || 1), numero((cb.disco || [])[0] || 1));
      if (disco) return disco;
      const traccia = confrontaNumeri(numero((ca.traccia || [])[0]), numero((cb.traccia || [])[0]));
      if (traccia) return traccia;
      return confronto.compare(a.nome, b.nome);
    });
    corrente = scelta ? tracce.indexOf(scelta) : tracce.length ? 0 : -1;
  }

  /** Aggiunge (o sostituisce) le tracce e le legge una alla volta. */
  async function aggiungi(nuove, { sostituisci = false } = {}) {
    if (sostituisci) { tracce = []; corrente = -1; }
    const gia = new Set(tracce.map(chiaveTraccia));
    const daLeggere = nuove.filter((t) => !gia.has(chiaveTraccia(t))).map((t) => ({ ...t, stato: "lettura", lettura: null }));
    const scartati = nuove.length - daLeggere.length;
    tracce.push(...daLeggere);
    if (corrente < 0 && tracce.length) corrente = 0;
    inLettura += daLeggere.length;
    disegnaPila();
    let fatti = 0;
    for (const t of daLeggere) {
      if (t.formato === "FLAC") {
        t.stato = "attesa"; // la lettura dei FLAC arriva nel blocco 5
      } else {
        try {
          t.lettura = await Id3.leggiMp3(Apertura.lettorePezzi(t.file), t.file.size);
          t.stato = "letto";
        } catch (e) {
          t.stato = "errore";
          t.errore = String((e && e.message) || e);
        }
      }
      fatti++;
      inLettura--;
      if (fatti % 25 === 0) mostraAvanzamento(fatti, daLeggere.length);
    }
    ordina();
    disegnaPila();
    disegnaScheda();
    if (!nuove.length) avvisa("Non ho trovato file MP3 o FLAC.");
    else if (daLeggere.length) avvisa(daLeggere.length === 1 ? "Ho letto 1 file." : `Ho letto ${daLeggere.length} file.`);
    else if (scartati) avvisa("Questi file erano già aperti.");
  }

  function mostraAvanzamento(fatti, totale) {
    $("#conteggio").textContent = `lettura: ${fatti} di ${totale}…`;
  }

  // ---------- Apertura ----------
  async function conErrori(azione) {
    try { await azione(); }
    catch (e) {
      console.error(e);
      const tecnico = ((e && e.name) || "Errore") + ": " + ((e && e.message) || String(e));
      if (e && e.name === "TypeMismatchError") {
        // nella finestra "scegli cartella" è stato scelto un file (il Mac lo permette)
        avvisa("Hai scelto un file, ma qui serve una cartella. Seleziona la cartella e premi «Apri». Per aprire file singoli usa «Apri file».", 9000);
        return;
      }
      const testo = e && e.name === "NotAllowedError"
        ? "Il browser non ha dato il permesso di leggere i file."
        : "Qualcosa è andato storto durante l'apertura. I tuoi file non sono stati toccati.";
      avvisa(testo + " (Dettagli tecnici: " + tecnico + ")", 15000);
    }
  }
  $("#apri-cartella").addEventListener("click", () => conErrori(async () => {
    const scelta = await Apertura.scegliCartella((n) => ($("#conteggio").textContent = `cerco i file: ${n}…`));
    if (scelta.nome === null) return; // annullato
    await aggiungi(scelta.file, { sostituisci: true });
  }));
  $("#apri-file").addEventListener("click", () => conErrori(async () => {
    const scelti = await Apertura.scegliFile();
    if (scelti.length) await aggiungi(scelti);
  }));

  // trascinare file o cartelle sulla pagina
  let profondita = 0;
  const conFile = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
  document.addEventListener("dragenter", (e) => { if (!conFile(e)) return; profondita++; document.body.classList.add("trascino"); });
  document.addEventListener("dragleave", () => { if (--profondita <= 0) { profondita = 0; document.body.classList.remove("trascino"); } });
  document.addEventListener("dragover", (e) => { if (conFile(e)) e.preventDefault(); });
  document.addEventListener("drop", (e) => {
    if (!conFile(e)) return;
    e.preventDefault();
    profondita = 0;
    document.body.classList.remove("trascino");
    const dt = e.dataTransfer;
    conErrori(async () => aggiungi(await Apertura.daTrascinamento(dt)));
  });

  function chiudiTutto() {
    tracce = []; corrente = -1;
    disegnaPila(); disegnaScheda();
    avvisa("Ho tolto le schede. I file sono rimasti come erano.");
  }

  // ---------- La pila ----------
  function disegnaPila() {
    const contenitore = $("#pila-contenuto");
    contenitore.replaceChildren();
    $("#conteggio").textContent = !tracce.length ? "" : inLettura ? "lettura in corso…" : tracce.length + (tracce.length === 1 ? " scheda" : " schede");

    if (!tracce.length) {
      contenitore.append(
        el("div", { classe: "vuoto" },
          piattoVuoto(),
          el("p", { classe: "grande", testo: "Il piatto è vuoto." }),
          el("p", { testo: "Tante tagliatelle, nessuna etichetta. Apri una cartella o qualche file per cominciare, oppure trascinali qui." })
        )
      );
      return;
    }
    const lista = el("ol", { classe: "elenco", "aria-label": "Tracce aperte" });
    tracce.forEach((t, i) => {
      const c = (t.lettura && t.lettura.campi) || {};
      const sotto = t.stato === "attesa" ? "FLAC: lettura in arrivo"
        : t.stato === "errore" ? "non riesco a leggerlo"
        : t.stato === "lettura" ? "lettura…"
        : c.artista || "artista sconosciuto";
      lista.append(el("li", {},
        el("button", { classe: "voce" + (t.stato === "errore" ? " problema" : ""), type: "button", "aria-current": i === corrente ? "true" : false, suclick: () => apri(i) },
          el("span", { classe: "numero", testo: (c.traccia && c.traccia[0]) || "–" }),
          el("span", { classe: "titolo", testo: c.titolo || t.nome }),
          el("span", { classe: "formato", testo: t.formato }),
          el("span", { classe: "artista", testo: sotto })
        )
      ));
    });
    contenitore.append(lista,
      el("p", {}, el("button", { classe: "bottone leggero", type: "button", suclick: chiudiTutto }, icona("chiudi"), "Togli tutte le schede")));
  }

  // ---------- La scheda grande ----------
  let indirizziImmagini = [];
  function liberaImmagini() { indirizziImmagini.forEach((u) => URL.revokeObjectURL(u)); indirizziImmagini = []; }

  function disegnaScheda() {
    liberaImmagini();
    const c = $("#scheda-contenuto");
    c.replaceChildren();
    const t = tracce[corrente];
    if (!t) {
      c.append(
        el("p", { classe: "inventario", testo: "Scheda n. —" }),
        el("h2", { testo: "Nessuna traccia aperta" }),
        el("p", { testo: "Quando apri dei file, qui compare la scheda della traccia scelta: titolo, artista, copertina e tutti gli altri dati. Funziona con file MP3 e FLAC." }),
        contenutoInfo()
      );
      return;
    }

    const l = t.lettura;
    const campi = (l && l.campi) || {};
    const numeroScheda = String(corrente + 1).padStart(3, "0");
    const versione = !l ? "" : l.tag ? "ID3v" + l.tag.versione + (l.v1 ? " + ID3v1" : "") : l.v1 ? "solo ID3v1" : "nessun tag";
    const inventario = [`Scheda n. ${numeroScheda}`, t.formato, versione, misura(t.file.size)].filter(Boolean).join(" · ");

    c.append(
      el("div", { classe: "scheda-testa" },
        el("div", { classe: "chi" },
          el("p", { classe: "inventario", testo: inventario }),
          el("h2", { testo: campi.titolo || t.nome }),
          el("p", { testo: campi.artista || "" }),
          el("p", { classe: "nome-file", testo: t.percorso })
        ),
        fotoCopertina(l)
      )
    );

    if (t.stato === "attesa") {
      c.append(el("p", { classe: "nota-esempio", testo: "Questo è un file FLAC: Tag-liatelle imparerà a leggerlo nella prossima versione. Per ora il file resta com'è." }));
      return;
    }
    if (t.stato === "errore") {
      c.append(riquadroAvvisi(["Non riesco a leggere questo file. Potrebbe essere rovinato, oppure non è davvero un MP3. Il file non è stato toccato.", t.errore]));
      return;
    }
    if (l && l.avvisi.length) c.append(riquadroAvvisi(l.avvisi));
    if (l && !l.tag && !l.v1) c.append(el("p", { classe: "nota-esempio", testo: "Questo file non ha ancora nessun tag: è una tagliatella senza etichetta." }));

    for (const g of Campi.GRUPPI) {
      const pieni = g.campi.filter((campo) => vuoto(campi[campo.id]) === false).length;
      const griglia = el("div", { classe: "campi" }, g.campi.map((campo) => disegnaCampo(campo, campi[campo.id])));
      if (g.id === "extra" && l && l.personalizzati.length) griglia.append(personalizzati(l.personalizzati));
      if (g.sempreAperto) {
        c.append(el("div", { classe: "gruppo" }, el("h3", { testo: g.nome }), griglia));
      } else {
        const conta = pieni + (g.id === "extra" && l ? l.personalizzati.length : 0);
        c.append(el("details", { classe: "gruppo" },
          el("summary", {}, g.nome, " ", el("small", { testo: "· " + g.nota + (conta ? ` · ${conta} compilat${conta === 1 ? "o" : "i"}` : "") })), griglia));
      }
    }

    if (l) c.append(riquadroConservati(l));
    c.append(el("p", { classe: "nota-piccola", testo: "Per ora Tag-liatelle legge soltanto: la modifica e il salvataggio arrivano nella prossima versione." }));
  }

  const vuoto = (v) => v == null || v === "" || (Array.isArray(v) && v.every((x) => !x));

  function fotoCopertina(l) {
    const imm = (l && l.immagini) || [];
    const fronte = imm.find((i) => i.tipo === 3) || imm[0];
    if (!fronte) return el("div", { classe: "foto", role: "img", "aria-label": "Nessuna copertina" }, el("span", { testo: "nessuna copertina" }));
    const url = URL.createObjectURL(new Blob([fronte.dati], { type: fronte.mime }));
    indirizziImmagini.push(url);
    const didascalia = el("figcaption", { testo: `${nomeTipo(fronte.tipo)} · ${nomeFormatoImmagine(fronte.mime)} · ${misura(fronte.byte)}` });
    const img = el("img", { src: url, alt: nomeTipo(fronte.tipo) });
    img.addEventListener("load", () => {
      didascalia.textContent = `${nomeTipo(fronte.tipo)} · ${img.naturalWidth} × ${img.naturalHeight} px · ${nomeFormatoImmagine(fronte.mime)} · ${misura(fronte.byte)}`;
    });
    img.addEventListener("error", () => { img.replaceWith(el("span", { testo: "immagine illeggibile" })); });
    const altre = imm.length - 1;
    return el("figure", { classe: "copertina" },
      el("div", { classe: "foto" }, img),
      didascalia,
      altre > 0 ? el("figcaption", { testo: `più ${altre} altr${altre === 1 ? "a immagine" : "e immagini"}: ${imm.filter((i) => i !== fronte).map((i) => nomeTipo(i.tipo).toLowerCase()).join(", ")}` }) : null
    );
  }

  function riquadroAvvisi(righe) {
    return el("div", { classe: "avviso avviso-scheda", role: "note" }, icona("avviso"),
      el("div", {}, ...righe.map((r) => el("p", { testo: r }))));
  }

  function riquadroConservati(l) {
    const altri = l.altri;
    if (!altri.length) return null;
    const nomi = [...new Set(altri)].join(", ");
    return el("p", { classe: "conservati" },
      icona("timbro"),
      `Nel file ci sono anche ${altri.length} ${altri.length === 1 ? "dato" : "dati"} che Tag-liatelle non mostra (${nomi}). Verranno conservati così come sono.`);
  }

  function personalizzati(lista) {
    return el("div", { classe: "campo largo personalizzati" },
      el("span", { classe: "etichetta", testo: "Campi personalizzati" }),
      el("dl", {}, ...lista.flatMap((p) => [el("dt", { testo: p.nome }), el("dd", { testo: p.valore })])));
  }

  function disegnaCampo(campo, valore) {
    const id = "campo-" + campo.id;
    const classi = "campo" + ({ largo: " largo", stretto: " stretto", quarto: " quarto" }[campo.larghezza] || "");
    if (campo.tipo === "numero-di") {
      const [n, tot] = valore || ["", ""];
      return el("div", { classe: classi, role: "group", "aria-labelledby": id + "-et" },
        el("span", { classe: "etichetta", id: id + "-et", testo: campo.etichetta }),
        el("span", { classe: "coppia" },
          el("input", { id, value: n, readonly: true, inputmode: "numeric", "aria-label": campo.etichetta + ", numero" }),
          el("span", { testo: "di" }),
          el("input", { value: tot, readonly: true, inputmode: "numeric", "aria-label": campo.etichetta + ", totale" })
        )
      );
    }
    if (campo.tipo === "lungo") {
      const area = el("textarea", { id, readonly: true, rows: 3 });
      area.value = valore || "";
      return el("div", { classe: classi }, el("label", { for: id, testo: campo.etichetta }), area);
    }
    if (campo.tipo === "si-no") {
      return el("div", { classe: classi }, el("label", { for: id, testo: campo.etichetta }),
        el("input", { id, value: vuoto(valore) ? "" : /^(1|s[iì]|yes|true)$/i.test(String(valore).trim()) ? "sì" : "no", readonly: true }));
    }
    return el("div", { classe: classi }, el("label", { for: id, testo: campo.etichetta }), el("input", { id, value: valore || "", readonly: true }));
  }

  function apri(i) {
    if (i < 0 || i >= tracce.length) return;
    corrente = i;
    disegnaPila(); disegnaScheda();
    const voce = document.querySelector('.voce[aria-current="true"]');
    if (voce) voce.scrollIntoView({ block: "nearest" });
  }
  // ---------- "Come funziona": privacy, browser, tastiera ----------
  function contenutoInfo() {
    const nomeSistema = { mac: "Mac", windows: "Windows", linux: "Linux" }[sistema];
    const giudizio = stato.modo === "completo"
      ? `Stai usando ${stato.nomeBrowser}${nomeSistema ? " su " + nomeSistema : ""}: puoi usare tutte le funzioni.`
      : `Stai usando ${stato.nomeBrowser}: puoi lavorare un file alla volta e scaricare la copia modificata.`;
    return el("div", { classe: "info" },
      el("section", { classe: "info-blocco" },
        el("h3", {}, icona("casa"), "Tutto avviene sul tuo computer"),
        el("ul", {},
          el("li", { testo: "I file vengono letti e modificati qui, nel tuo browser: non vengono mai caricati su internet." }),
          el("li", { testo: "Non servono account né iscrizioni, e non c'è nessuna statistica sul tuo uso." }),
          el("li", { testo: "Caratteri e programmi sono già dentro la pagina: funziona anche senza connessione." }),
          el("li", { testo: "Prima di scrivere in un file, Tag-liatelle ne fa una copia di sicurezza accanto all'originale." })
        )
      ),
      el("section", { classe: "info-blocco" },
        el("h3", {}, icona("file"), "Browser compatibili"),
        el("table", { classe: "compatibili" },
          el("thead", {}, el("tr", {}, el("th", { scope: "col", testo: "Browser" }), el("th", { scope: "col", testo: "Cosa puoi fare" }))),
          el("tbody", {},
            el("tr", {}, el("th", { scope: "row", testo: "Chrome 86 o successivo" }), el("td", { testo: "Tutto: apri intere cartelle e salvi direttamente nei file. Su Windows, Mac, Linux e Chromebook." })),
            el("tr", {}, el("th", { scope: "row", testo: "Edge 86 o successivo" }), el("td", { testo: "Tutto, come Chrome. Su Windows, Mac e Linux." })),
            el("tr", {}, el("th", { scope: "row", testo: "Safari e Firefox" }), el("td", { testo: "Un file alla volta: lo apri, lo modifichi e scarichi una copia. L'originale non viene toccato." })),
            el("tr", {}, el("th", { scope: "row", testo: "Telefoni e tablet" }), el("td", { testo: "Pensato per il computer: sullo schermo piccolo si legge, ma si salva solo scaricando una copia." }))
          )
        ),
        el("p", { classe: "nota-piccola", testo: "Altri browser basati su Chrome (Opera, Vivaldi) di solito funzionano, ma non sono provati. Brave tiene spenta la funzione che serve per salvare nei file." }),
        el("p", { classe: "giudizio" + (stato.modo === "completo" ? "" : " attenzione"), testo: giudizio })
      ),
      el("section", { classe: "info-blocco" },
        el("h3", {}, icona("tastiera"), "Scorciatoie da tastiera"),
        el("p", {}, "Le trovi sempre con il tasto ", el("kbd", { testo: "?" }), " oppure con il pulsante della tastiera in alto. ",
          el("button", { classe: "bottone leggero", type: "button", suclick: () => $("#scorciatoie").showModal() }, "Vedi le scorciatoie"))
      )
    );
  }

  // ---------- Il piatto vuoto (disegno) ----------
  function piattoVuoto() {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 200 120");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = `
      <ellipse cx="100" cy="84" rx="92" ry="26" fill="var(--cartellino)" stroke="var(--inchiostro)" stroke-width="2"/>
      <ellipse cx="100" cy="80" rx="62" ry="15" fill="none" stroke="var(--riga)" stroke-width="1.5"/>
      <g fill="none" stroke-linecap="round">
        <g stroke="var(--inchiostro)" stroke-width="7.5">
          <path d="M58 76c8-22 26-30 44-26s30 18 26 28"/><path d="M66 80c4-16 20-24 36-20s24 14 20 22"/>
          <path d="M74 78c6-12 18-14 28-10s14 10 10 14"/><path d="M62 70c14-14 38-18 56-6"/>
        </g>
        <g stroke="var(--uovo)" stroke-width="5">
          <path d="M58 76c8-22 26-30 44-26s30 18 26 28"/><path d="M66 80c4-16 20-24 36-20s24 14 20 22"/>
          <path d="M74 78c6-12 18-14 28-10s14 10 10 14"/><path d="M62 70c14-14 38-18 56-6"/>
        </g>
      </g>
      <!-- etichette bianche, senza scritte, appoggiate accanto al piatto -->
      <g stroke="var(--inchiostro)" stroke-width="1.6" stroke-linejoin="round">
        <path d="M150 34h24a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-24l-8-9z" fill="var(--cartellino)" transform="rotate(14 160 43)"/>
        <path d="M22 26h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H22l-7-8z" fill="var(--cartellino)" transform="rotate(-10 30 34)"/>
      </g>
      <g fill="var(--carta)" stroke="var(--inchiostro)" stroke-width="1.4">
        <circle cx="150" cy="40" r="2.2"/><circle cx="21" cy="36" r="2"/>
      </g>
      <g fill="none" stroke="var(--inchiostro-tenue)" stroke-width="1.3" stroke-linecap="round">
        <path d="M150 40c-6-8-4-20 4-24"/><path d="M21 36c-4-6-12-6-14 0"/>
      </g>`;
    return s;
  }

  // ---------- Scorciatoie ----------
  const finestra = $("#scorciatoie");
  $("#righe-tasti").append(...SCORCIATOIE.map((r) => el("tr", {},
    el("th", { scope: "row", testo: r.cosa }),
    el("td", { classe: sistema === "mac" ? "tuo" : "" }, tasti(r.mac)),
    el("td", { classe: sistema === "windows" || sistema === "linux" ? "tuo" : "" }, tasti(r.pc))
  )));
  if (sistema === "mac") $("#col-mac").append(el("small", { testo: " (il tuo)" }));
  if (sistema === "windows" || sistema === "linux") $("#col-pc").append(el("small", { testo: " (il tuo)" }));
  $("#apri-scorciatoie").addEventListener("click", () => finestra.showModal());

  const finestraInfo = $("#info");
  $("#apri-info").addEventListener("click", () => { $("#info-contenuto").replaceChildren(contenutoInfo()); finestraInfo.showModal(); });

  document.addEventListener("keydown", (e) => {
    const inCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.readOnly;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      avvisa("Il salvataggio arriva nella prossima versione: per ora Tag-liatelle legge soltanto.");
      return;
    }
    if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (!tracce.length) return;
      e.preventDefault();
      apri(corrente + (e.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (e.key === "?" && !inCampo && !finestra.open && !finestraInfo.open) { e.preventDefault(); finestra.showModal(); }
  });

  // ---------- Partenza ----------
  disegnaPila();
  disegnaScheda();

  // per le prove automatiche: permette di aprire file senza le finestre di scelta
  window.TagLiatelle = { aggiungi, tracce: () => tracce };
})();
