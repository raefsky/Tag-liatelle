/* ==========================================================================
   Tag-liatelle · interfaccia
   Blocco 1: scheletro della pagina. Non legge né scrive ancora nessun file:
   mostra lo stato vuoto, una scheda di esempio (dati inventati) per giudicare
   l'aspetto, il tema chiaro/scuro, le scorciatoie e il controllo del browser.
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
  function avvisa(testo) {
    const m = $("#messaggio");
    m.textContent = testo; m.hidden = false;
    clearTimeout(timerMessaggio);
    timerMessaggio = setTimeout(() => (m.hidden = true), 3800);
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

  // ---------- Apertura (arriva nel blocco 2) ----------
  const nonAncora = () => avvisa("L'apertura dei file arriva nella prossima versione. Per ora puoi guardare la scheda di esempio.");
  $("#apri-cartella").addEventListener("click", nonAncora);
  $("#apri-file").addEventListener("click", nonAncora);

  // ---------- Dati di esempio (inventati, non sono file veri) ----------
  const ESEMPIO = [
    { file: "01 Matassa d'oro.mp3", formato: "MP3", versione: "ID3v2.3", valori: { titolo: "Matassa d'oro", artista: "Le Sfogline", album: "Al dente", anno: "2026", genere: "Folk", traccia: ["1", "3"], disco: ["1", "1"], copyright: "© 2026 Le Sfogline", editore: "Edizioni del Mattarello", licenza: "CC BY-NC-SA 4.0", bpm: "92" } },
    { file: "02 Sfoglia sottile.mp3", formato: "MP3", versione: "ID3v2.3", valori: { titolo: "Sfoglia sottile", artista: "Le Sfogline", album: "Al dente", anno: "2026", genere: "Folk", traccia: ["2", "3"], disco: ["1", "1"] } },
    { file: "03 Ragù della domenica (versione lunga).flac", formato: "FLAC", versione: "Vorbis", valori: { titolo: "Ragù della domenica (versione lunga)", artista: "Le Sfogline feat. Nonna Ìrma", album: "Al dente", anno: "2026", genere: "Folk", traccia: ["3", "3"], disco: ["1", "1"] } },
  ];

  let tracce = [];     // quelle mostrate nella pila
  let corrente = -1;   // indice della traccia aperta

  // ---------- La pila ----------
  function disegnaPila() {
    const contenitore = $("#pila-contenuto");
    contenitore.replaceChildren();
    $("#conteggio").textContent = tracce.length ? tracce.length + (tracce.length === 1 ? " scheda" : " schede") : "";

    if (!tracce.length) {
      contenitore.append(
        el("div", { classe: "vuoto" },
          piattoVuoto(),
          el("p", { classe: "grande", testo: "Il piatto è vuoto." }),
          el("p", { testo: "Tante tagliatelle, nessuna etichetta. Apri una cartella o qualche file per cominciare." }),
          el("button", { classe: "bottone leggero", type: "button", suclick: mostraEsempio }, icona("occhio-esempio"), "Guarda una scheda di esempio")
        )
      );
      return;
    }
    const lista = el("ol", { classe: "elenco", "aria-label": "Tracce aperte" });
    tracce.forEach((t, i) => {
      lista.append(el("li", {},
        el("button", { classe: "voce", type: "button", "aria-current": i === corrente ? "true" : false, suclick: () => apri(i) },
          el("span", { classe: "numero", testo: (t.valori.traccia && t.valori.traccia[0]) || "–" }),
          el("span", { classe: "titolo", testo: t.valori.titolo || t.file }),
          el("span", { classe: "formato", testo: t.formato }),
          el("span", { classe: "artista", testo: t.valori.artista || "artista sconosciuto" })
        )
      ));
    });
    contenitore.append(lista,
      el("p", {}, el("button", { classe: "bottone leggero", type: "button", suclick: togliEsempio }, icona("chiudi"), "Togli l'esempio")));
  }

  // ---------- La scheda grande ----------
  function disegnaScheda() {
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

    const numero = String(corrente + 1).padStart(3, "0");
    c.append(
      el("div", { classe: "scheda-testa" },
        el("div", { classe: "chi" },
          el("p", { classe: "inventario", testo: `Scheda n. ${numero} · ${t.formato} · ${t.versione}` }),
          el("h2", { testo: t.valori.titolo || "Senza titolo" }),
          el("p", { testo: t.valori.artista || "" }),
          el("p", { classe: "nome-file", testo: t.file })
        ),
        el("div", { classe: "foto", role: "img", "aria-label": "Nessuna copertina" }, el("span", { testo: "nessuna copertina" }))
      )
    );

    for (const g of Campi.GRUPPI) {
      const griglia = el("div", { classe: "campi" }, g.campi.map((campo) => disegnaCampo(campo, t.valori[campo.id])));
      if (g.sempreAperto) {
        c.append(el("div", { classe: "gruppo" }, el("h3", { testo: g.nome }), griglia));
      } else {
        c.append(el("details", { classe: "gruppo" }, el("summary", {}, g.nome, " ", el("small", { testo: "· " + g.nota })), griglia));
      }
    }

    c.append(
      el("div", { classe: "nota-esempio" },
        el("p", { testo: "Questa è una scheda di esempio con dati inventati: non corrisponde a nessun file e non si può modificare." }),
        el("button", { classe: "bottone", type: "button", suclick: provaTimbro }, icona("timbro"), "Prova il timbro")
      ),
      el("div", { classe: "timbro", id: "timbro", hidden: true, "aria-hidden": "true" }, "Salvato", el("small", { id: "timbro-data" }))
    );
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
        el("input", { id, value: valore ? "sì" : "no", readonly: true }));
    }
    return el("div", { classe: classi }, el("label", { for: id, testo: campo.etichetta }), el("input", { id, value: valore || "", readonly: true }));
  }

  function apri(i) {
    if (i < 0 || i >= tracce.length) return;
    corrente = i;
    disegnaPila(); disegnaScheda();
  }
  function mostraEsempio() { tracce = ESEMPIO; corrente = 0; disegnaPila(); disegnaScheda(); $("#scheda").focus(); }
  function togliEsempio() { tracce = []; corrente = -1; disegnaPila(); disegnaScheda(); }

  function provaTimbro() {
    const t = $("#timbro");
    $("#timbro-data").textContent = new Date().toLocaleDateString("it-IT");
    t.hidden = false;
    t.classList.remove("impresso");
    if (animazioniAttive()) { void t.offsetWidth; t.classList.add("impresso"); }
    avvisa("Così appare il timbro quando un file è stato salvato davvero.");
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
      avvisa("Non c'è ancora niente da salvare.");
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
  // indirizzo che finisce con #esempio: apre subito la scheda di esempio (comodo per le prove)
  if (location.hash === "#esempio") mostraEsempio();
})();
