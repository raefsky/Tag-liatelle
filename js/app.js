/* ==========================================================================
   Tag-liatelle · interfaccia
   Apre cartelle e file (con i pulsanti o trascinandoli), legge i tag MP3,
   mostra la pila di schede e la scheda grande; modifica il gruppo Base e
   salva in modo sicuro (anteprima, copia di sicurezza, verifica, ripristino).
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
    // un'immagine trascinata diventa la copertina della scheda aperta
    const files = Array.from(dt.files || []);
    const imm = files.find((f) => /^image\//.test(f.type));
    if (imm && !files.some((f) => /\.(mp3|flac)$/i.test(f.name))) {
      const t = tracce[corrente];
      if (t && document.querySelector('[data-trascina-immagine="si"]')) ritaglia(t, imm);
      else avvisa("Per cambiare la copertina, apri prima una scheda che si può modificare.");
      return;
    }
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
        el("button", { classe: "voce" + (t.stato === "errore" ? " problema" : "") + (quanteModifiche(t) ? " modificata" : ""), type: "button", "aria-current": i === corrente ? "true" : false, suclick: () => apri(i) },
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
    if (!t.modifiche) t.modifiche = {};
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
        fotoCopertina(l, t)
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

    const controllo = l ? Id3Scrittura.controlla(l) : { ok: false, motivo: "" };
    const modificabile = t.formato === "MP3" && t.stato === "letto" && controllo.ok;
    if (l && !controllo.ok && controllo.motivo) c.append(riquadroAvvisi([controllo.motivo]));
    if (!t.modifiche) t.modifiche = {};

    for (const g of Campi.GRUPPI) {
      const pieni = g.campi.filter((campo) => vuoto(campi[campo.id]) === false).length;
      const siModifica = modificabile && g.id === "base";
      const griglia = el("div", { classe: "campi" }, g.campi.map((campo) => disegnaCampo(campo, campi[campo.id], siModifica ? t : null)));
      if (g.id === "extra" && l && l.personalizzati.length) griglia.append(personalizzati(l.personalizzati));
      if (g.sempreAperto) {
        c.append(el("div", { classe: "gruppo" }, el("h3", { testo: g.nome }), griglia));
      } else {
        const conta = pieni + (g.id === "extra" && l ? l.personalizzati.length : 0);
        c.append(el("details", { classe: "gruppo" },
          el("summary", {}, g.nome, " ", el("small", { testo: "· " + g.nota + (conta ? ` · ${conta} compilat${conta === 1 ? "o" : "i"}` : "") })),
          el("p", { classe: "nota-piccola", testo: "Per ora questi campi si possono solo leggere: la modifica arriva in una prossima versione." }),
          griglia));
      }
    }

    if (modificabile) c.append(barraSalva(t));
    if (l) c.append(riquadroConservati(l));
    const posto = el("div", { classe: "posto-copie" });
    c.append(posto);
    disegnaCopie(t, posto);
    c.append(el("div", { classe: "timbro", id: "timbro", hidden: true, "aria-hidden": "true" }, "Salvato", el("small", { id: "timbro-data" })));
  }

  const vuoto = (v) => v == null || v === "" || (Array.isArray(v) && v.every((x) => !x));

  /** La fotografia incollata sulla scheda, con i comandi della copertina se il file si può modificare. */
  function fotoCopertina(l, t) {
    const imm = (l && l.immagini) || [];
    const fronte = imm.find((i) => i.tipo === 3) || imm[0];
    const modifica = t && t.modifiche && t.modifiche.copertina;
    const modificabile = t && t.formato === "MP3" && t.stato === "letto" && l && Id3Scrittura.controlla(l).ok;
    const altre = imm.filter((i) => i !== fronte);
    const restano = modifica ? imm.filter((i) => i.tipo !== 3 && !(modifica.azione === "rimuovi" && i === fronte)) : altre;

    let foto, didascalia;
    if (modifica && modifica.azione === "sostituisci") {
      foto = el("div", { classe: "foto" }, immagine(modifica.dati, modifica.mime, "Nuova copertina"));
      didascalia = el("figcaption", { testo: `Nuova copertina · ${modifica.lato} × ${modifica.lato} px · ${nomeFormatoImmagine(modifica.mime)} · ${misura(modifica.byte)} · da salvare` });
    } else if (modifica && modifica.azione === "rimuovi") {
      foto = el("div", { classe: "foto tolta", role: "img", "aria-label": "Copertina da togliere" }, el("span", { testo: "verrà tolta" }));
      didascalia = el("figcaption", { testo: "La copertina verrà tolta al salvataggio." });
    } else if (fronte) {
      const img = immagine(fronte.dati, fronte.mime, nomeTipo(fronte.tipo));
      foto = el("div", { classe: "foto" }, img);
      didascalia = el("figcaption", { testo: `${nomeTipo(fronte.tipo)} · ${nomeFormatoImmagine(fronte.mime)} · ${misura(fronte.byte)}` });
      img.addEventListener("load", () => {
        didascalia.textContent = `${nomeTipo(fronte.tipo)} · ${img.naturalWidth} × ${img.naturalHeight} px · ${nomeFormatoImmagine(fronte.mime)} · ${misura(fronte.byte)}`;
      });
    } else {
      foto = el("div", { classe: "foto", role: "img", "aria-label": "Nessuna copertina" }, el("span", { testo: "nessuna copertina" }));
      didascalia = null;
    }

    const comandi = modificabile ? el("div", { classe: "comandi-foto" },
      el("button", { classe: "bottone leggero", type: "button", suclick: () => scegliImmagine(t) }, fronte || modifica ? "Cambia…" : "Aggiungi…"),
      fronte && !modifica ? el("button", { classe: "bottone leggero", type: "button", suclick: () => ritaglia(t, new Blob([fronte.dati], { type: fronte.mime })), title: "Ritaglia o ridimensiona la copertina attuale" }, "Ritaglia…") : null,
      fronte && !modifica ? el("button", { classe: "bottone leggero", type: "button", suclick: () => esportaCopertina(t, fronte) }, "Esporta") : null,
      fronte && !modifica ? el("button", { classe: "bottone leggero pericolo", type: "button", suclick: () => impostaCopertina(t, { azione: "rimuovi" }) }, "Rimuovi") : null,
      modifica ? el("button", { classe: "bottone leggero", type: "button", suclick: () => impostaCopertina(t, null) }, "Tieni quella di prima") : null
    ) : fronte ? el("div", { classe: "comandi-foto" }, el("button", { classe: "bottone leggero", type: "button", suclick: () => esportaCopertina(t, fronte) }, "Esporta")) : null;

    return el("figure", { classe: "copertina" + (modifica ? " cambiata" : ""), "data-trascina-immagine": modificabile ? "si" : null },
      foto, didascalia,
      restano.length ? el("figcaption", { testo: `${modifica ? (restano.length === 1 ? "Resta" : "Restano") : "Più"} ${restano.length} altr${restano.length === 1 ? "a immagine" : "e immagini"}: ${restano.map((i) => nomeTipo(i.tipo).toLowerCase()).join(", ")}` }) : null,
      comandi);
  }

  function immagine(dati, mime, alt) {
    const url = URL.createObjectURL(new Blob([dati], { type: mime }));
    indirizziImmagini.push(url);
    const img = el("img", { src: url, alt });
    img.addEventListener("error", () => { img.replaceWith(el("span", { testo: "immagine illeggibile" })); });
    return img;
  }

  // ---------- Copertina: scegliere, ritagliare, esportare, togliere ----------
  function impostaCopertina(t, valore) {
    if (valore) t.modifiche.copertina = valore;
    else delete t.modifiche.copertina;
    disegnaPila();
    disegnaScheda();
  }

  function scegliImmagine(t) {
    const campo = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif" });
    campo.addEventListener("change", () => { if (campo.files[0]) ritaglia(t, campo.files[0]); });
    campo.click();
  }

  async function ritaglia(t, blob) {
    try {
      const esito = await Ritaglio.apri(blob);
      if (esito) {
        impostaCopertina(t, { azione: "sostituisci", ...esito });
        avvisa("Nuova copertina pronta: salva per scriverla nel file.");
      }
    } catch (e) {
      avvisa((e && e.message) || "Non riesco ad aprire questa immagine.", 7000);
    }
  }

  function esportaCopertina(t, fronte) {
    const est = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" }[fronte.mime] || "img";
    const base = t.nome.replace(/\.[^.]+$/, "");
    const a = el("a", { href: URL.createObjectURL(new Blob([fronte.dati], { type: fronte.mime })), download: `${base} - copertina.${est}` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    avvisa("Ho esportato la copertina: la trovi tra i download.");
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

  /**
   * Un campo della scheda. Se "traccia" è data, il campo si può modificare:
   * il valore mostrato è quello modificato, e ogni cambiamento finisce in traccia.modifiche.
   */
  function disegnaCampo(campo, originale, traccia) {
    const id = "campo-" + campo.id;
    const classi = "campo" + ({ largo: " largo", stretto: " stretto", quarto: " quarto" }[campo.larghezza] || "");
    const modificato = traccia && campo.id in traccia.modifiche;
    const valore = modificato ? traccia.modifiche[campo.id] : originale;
    const sola = !traccia;
    const segna = (nodo) => { nodo.classList.toggle("cambiato", !!(traccia && campo.id in traccia.modifiche)); };

    if (campo.tipo === "numero-di") {
      const [n, tot] = valore || ["", ""];
      const box = el("div", { classe: classi, role: "group", "aria-labelledby": id + "-et" });
      const a = el("input", { id, value: n, readonly: sola, inputmode: "numeric", "aria-label": campo.etichetta + ", numero" });
      const b = el("input", { value: tot, readonly: sola, inputmode: "numeric", "aria-label": campo.etichetta + ", totale" });
      if (traccia) for (const x of [a, b]) x.addEventListener("input", () => { cambia(traccia, campo.id, [a.value, b.value], originale); segna(box); });
      box.append(el("span", { classe: "etichetta", id: id + "-et", testo: campo.etichetta }),
        el("span", { classe: "coppia" }, a, el("span", { testo: "di" }), b));
      segna(box);
      return box;
    }
    let campoInput;
    if (campo.tipo === "lungo") {
      campoInput = el("textarea", { id, readonly: sola, rows: 3 });
      campoInput.value = valore || "";
    } else if (campo.tipo === "si-no") {
      campoInput = el("input", { id, value: vuoto(valore) ? "" : /^(1|s[iì]|yes|true)$/i.test(String(valore).trim()) ? "sì" : "no", readonly: true });
    } else {
      campoInput = el("input", { id, value: valore || "", readonly: sola, autocomplete: "off", spellcheck: campo.id === "titolo" || campo.id === "album" ? "true" : "false" });
    }
    const box = el("div", { classe: classi }, el("label", { for: id, testo: campo.etichetta }), campoInput);
    if (traccia && campo.tipo !== "si-no") campoInput.addEventListener("input", () => { cambia(traccia, campo.id, campoInput.value, originale); segna(box); });
    segna(box);
    return box;
  }

  // ---------- Modifiche non ancora salvate ----------
  const normale = (v) => (Array.isArray(v) ? [String(v[0] || "").trim(), String(v[1] || "").trim()] : String(v == null ? "" : v).trim());
  const stessoValore = (a, b) => JSON.stringify(normale(a)) === JSON.stringify(normale(Array.isArray(a) || Array.isArray(b) ? (b || ["", ""]) : b));

  function cambia(traccia, campo, valore, originale) {
    const prima = Array.isArray(valore) ? originale || ["", ""] : originale || "";
    if (stessoValore(valore, prima)) delete traccia.modifiche[campo];
    else traccia.modifiche[campo] = valore;
    aggiornaBarra(traccia);
    aggiornaVoce(traccia);
  }
  const quanteModifiche = (t) => Object.keys(t.modifiche || {}).length;

  function aggiornaVoce(traccia) {
    const i = tracce.indexOf(traccia);
    const voce = document.querySelectorAll(".voce")[i];
    if (voce) voce.classList.toggle("modificata", quanteModifiche(traccia) > 0);
  }

  function barraSalva(t) {
    const testo = el("span", { classe: "barra-testo" });
    const salvaB = el("button", { classe: "bottone principale", type: "button", id: "bottone-salva", suclick: () => apriAnteprima(t) },
      icona("timbro"), t.maniglia ? "Salva…" : "Scarica la copia modificata…");
    const annulla = el("button", { classe: "bottone leggero", type: "button", id: "bottone-annulla", suclick: () => { t.modifiche = {}; disegnaPila(); disegnaScheda(); avvisa("Modifiche annullate: la scheda è tornata come il file."); } }, "Annulla le modifiche");
    const barra = el("div", { classe: "barra-salva", id: "barra-salva" }, testo, el("span", { classe: "barra-bottoni" }, annulla, salvaB));
    setTimeout(() => aggiornaBarra(t));
    return barra;
  }
  function aggiornaBarra(t) {
    const n = quanteModifiche(t);
    const testo = document.querySelector(".barra-testo");
    if (!testo) return;
    testo.textContent = n ? `${n} ${n === 1 ? "modifica" : "modifiche"} non ancora ${n === 1 ? "salvata" : "salvate"}` : "Nessuna modifica";
    $("#bottone-salva").disabled = !n;
    $("#bottone-annulla").disabled = !n;
    $("#barra-salva").classList.toggle("attiva", n > 0);
  }

  // ---------- Anteprima e salvataggio ----------
  const mostraValore = (v) => (vuoto(v) ? "" : Array.isArray(v) ? (v[1] ? `${v[0]} di ${v[1]}` : v[0]) : String(v));
  const finestraAnteprima = $("#anteprima");
  let salvataggioInCorso = false;

  function apriAnteprima(t) {
    if (!quanteModifiche(t) || salvataggioInCorso) return;
    const l = t.lettura;
    const controllo = Id3Scrittura.controlla(l);
    if (!controllo.ok) { avvisa(controllo.motivo, 9000); return; }
    const corpo = $("#anteprima-corpo");
    corpo.replaceChildren();
    const righe = Object.keys(t.modifiche).filter((k) => k !== "copertina").map((k) => {
      const campo = Campi.TUTTI.find((c) => c.id === k);
      const prima = mostraValore(l.campi[k]);
      const dopo = mostraValore(normale(t.modifiche[k]));
      return el("tr", {},
        el("th", { scope: "row", testo: campo ? campo.etichetta : k }),
        el("td", { classe: prima ? "" : "vuoto-cella", testo: prima || "(vuoto)" }),
        el("td", { classe: dopo ? "dopo" : "dopo vuoto-cella", testo: dopo || "(tolto)" }));
    });
    const cop = t.modifiche.copertina;
    if (cop) {
      const fronte = l.immagini.find((i) => i.tipo === 3) || (cop.azione === "rimuovi" ? l.immagini[0] : null);
      const m = fronte && Immagini.misure(fronte.dati);
      const prima = fronte ? `${nomeFormatoImmagine(fronte.mime)}${m && m.larghezza ? ` ${m.larghezza} × ${m.altezza} px` : ""}, ${misura(fronte.byte)}` : "";
      const dopo = cop.azione === "rimuovi" ? "" : `${nomeFormatoImmagine(cop.mime)} ${cop.lato} × ${cop.lato} px, ${misura(cop.byte)}`;
      righe.push(el("tr", {},
        el("th", { scope: "row", testo: "Copertina" }),
        el("td", { classe: prima ? "" : "vuoto-cella", testo: prima || "(nessuna)" }),
        el("td", { classe: dopo ? "dopo" : "dopo vuoto-cella", testo: dopo || "(tolta)" })));
    }
    // la nota su ID3v1 serve solo se cambia un campo che ID3v1 contiene
    const campiV1 = ["titolo", "artista", "album", "anno", "traccia", "genere"];
    const note = controllo.note.filter((n) => !n.includes("ID3v1, alla fine") || campiV1.some((k) => k in t.modifiche));
    if (cop) note.push("Le altre immagini del file (retro, libretto…) restano come sono.");
    if (t.maniglia) {
      note.unshift(`Prima di scrivere faccio una copia di sicurezza del file nella cartella «${Salvataggio.COPIE}», accanto al file.`);
      if (!t.radice && !t.accesso) note.unshift("Se il browser non conosce ancora la cartella di questo file, ti chiederò di sceglierla: serve per mettere lì la copia di sicurezza.");
      note.push("L'audio non viene toccato: dopo il salvataggio controllo che sia identico, byte per byte.");
    } else {
      note.unshift("Questo browser non può scrivere nei file: preparo una copia modificata da scaricare. L'originale resta com'è.");
    }
    corpo.append(
      el("p", { classe: "nome-file", testo: t.percorso }),
      el("table", { classe: "confronto" },
        el("thead", {}, el("tr", {}, el("th", { scope: "col", testo: "Campo" }), el("th", { scope: "col", testo: "Prima" }), el("th", { scope: "col", testo: "Dopo" }))),
        el("tbody", {}, righe)),
      el("ul", { classe: "note-salvataggio" }, note.map((n) => el("li", { testo: n }))),
      el("ol", { classe: "passi", id: "passi", hidden: true })
    );
    $("#anteprima-conferma").textContent = t.maniglia ? "Scrivi nel file" : "Prepara e scarica";
    $("#anteprima-conferma").disabled = false;
    $("#anteprima-annulla").disabled = false;
    $("#anteprima-annulla").textContent = "Annulla";
    $("#anteprima-conferma").onclick = () => (t.maniglia ? eseguiSalvataggio(t) : eseguiScaricamento(t));
    finestraAnteprima.showModal();
  }

  const NOMI_PASSI = { controllo: "Controllo che il file non sia cambiato", copia: "Copia di sicurezza", scrittura: "Scrittura del nuovo tag", verifica: "Verifica: tag riletto e audio identico" };

  async function eseguiSalvataggio(t) {
    salvataggioInCorso = true;
    $("#anteprima-conferma").disabled = true;
    $("#anteprima-annulla").disabled = true;
    const passi = $("#passi");
    passi.hidden = false;
    passi.replaceChildren();
    let attuale = null;
    const passo = (nome) => {
      if (attuale) attuale.classList.add("fatto");
      attuale = el("li", { testo: NOMI_PASSI[nome] || nome });
      passi.append(attuale);
    };
    try {
      const esito = await Salvataggio.salva(t, t.modifiche, passo);
      if (attuale) attuale.classList.add("fatto");
      t.file = esito.file;
      t.lettura = esito.lettura;
      t.modifiche = {};
      t.ultimoSalvataggio = new Date();
      finestraAnteprima.close();
      ordina();
      disegnaPila();
      disegnaScheda();
      imprimiTimbro();
      avvisa(`Salvato. La copia di sicurezza è «${esito.copia}».`, 6000);
    } catch (e) {
      console.error(e);
      if (attuale) attuale.classList.add("fallito");
      const testo = e instanceof Salvataggio.ErroreChiaro ? e.message
        : e && e.name === "NotAllowedError" ? "Il browser non ha dato il permesso di modificare il file. Il file non è stato toccato."
        : `Il salvataggio non è riuscito (${(e && e.name) || "errore"}: ${(e && e.message) || e}). Se il problema è avvenuto durante la scrittura, il browser lascia intatto l'originale.`;
      passi.append(el("li", { classe: "errore-passo", testo }));
      $("#anteprima-annulla").disabled = false;
      $("#anteprima-annulla").textContent = "Chiudi";
    } finally {
      salvataggioInCorso = false;
    }
  }

  async function eseguiScaricamento(t) {
    try {
      const { blob } = await Salvataggio.copiaDaScaricare(t, t.modifiche);
      const a = el("a", { href: URL.createObjectURL(blob), download: t.nome });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      finestraAnteprima.close();
      avvisa("Ho preparato la copia modificata: la trovi tra i download. L'originale non è stato toccato.", 7000);
    } catch (e) {
      avvisa(e instanceof Salvataggio.ErroreChiaro ? e.message : "Non sono riuscito a preparare la copia: " + ((e && e.message) || e), 9000);
    }
  }

  function imprimiTimbro() {
    const t = $("#timbro");
    if (!t) return;
    $("#timbro-data").textContent = new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
    t.hidden = false;
    t.classList.remove("impresso");
    if (animazioniAttive()) { void t.offsetWidth; t.classList.add("impresso"); }
  }

  // ---------- Copie di sicurezza: promemoria, ripristino, eliminazione ----------
  const dataOra = (d) => d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

  async function disegnaCopie(t, posto) {
    if (!t.maniglia && !t.radice) return;
    const info = await Salvataggio.copieDi(t);
    if (!info || !info.elenco.length || !posto.isConnected) return;
    const originale = info.elenco.find((x) => x.quale === "originale");
    const ultima = info.elenco.find((x) => x.quale === "ultima");
    const totale = info.elenco.reduce((s, x) => s + x.byte, 0);
    posto.replaceChildren(el("section", { classe: "copie" },
      el("h3", {}, icona("timbro"), "Copie di sicurezza"),
      el("p", { classe: "promemoria", testo: info.elenco.length === 1
        ? `Ricordati: hai una copia di sicurezza di questo file nella cartella «${Salvataggio.COPIE}» (${misura(totale)}). Se è tutto a posto, puoi cancellarla.`
        : `Ricordati: hai due copie di sicurezza di questo file nella cartella «${Salvataggio.COPIE}» (${misura(totale)}). Se è tutto a posto, puoi cancellarle.` }),
      el("ul", {}, info.elenco.map((x) => el("li", {},
        el("b", { testo: x.quale === "originale" ? "Originale" : "Prima dell'ultimo salvataggio" }),
        ` · ${dataOra(x.data)} · ${misura(x.byte)}`))),
      el("p", { classe: "bottoni-copie" },
        el("button", { classe: "bottone leggero", type: "button", suclick: () => Salvataggio.mostraCopie(info.cartella), title: "Si apre la finestra del Mac dentro la cartella delle copie: chiudila con Annulla" }, icona("cartella"), "Mostra le copie"),
        originale ? el("button", { classe: "bottone leggero", type: "button", suclick: () => chiediRipristino(t, originale) }, "Torna all'originale…") : null,
        ultima ? el("button", { classe: "bottone leggero", type: "button", suclick: () => chiediRipristino(t, ultima) }, "Torna a prima dell'ultimo salvataggio…") : null,
        el("button", { classe: "bottone leggero pericolo", type: "button", suclick: () => chiediEliminazione(t, info) }, icona("chiudi"), "Elimina le copie di sicurezza…")
      )
    ));
  }

  async function chiediRipristino(t, copia) {
    if (quanteModifiche(t)) { avvisa("Prima salva o annulla le modifiche in corso.", 6000); return; }
    const quando = copia.quale === "originale" ? "com'era all'inizio, prima di Tag-liatelle" : "com'era prima dell'ultimo salvataggio";
    const si = await chiedi({
      titolo: "Ripristinare la copia?",
      testo: `Il file «${t.nome}» tornerà ${quando} (copia del ${dataOra(copia.data)}). La versione di adesso diventa la copia «prima dell'ultimo salvataggio», così puoi ancora tornare indietro.`,
      si: "Ripristina", no: "Annulla",
    });
    if (!si) return;
    try {
      const esito = await Salvataggio.ripristina(t, copia.quale);
      t.file = esito.file; t.lettura = esito.lettura; t.modifiche = {};
      ordina(); disegnaPila(); disegnaScheda();
      avvisa("Fatto: il file è tornato com'era nella copia.", 6000);
    } catch (e) {
      avvisa(e instanceof Salvataggio.ErroreChiaro ? e.message : "Il ripristino non è riuscito: " + ((e && e.message) || e), 9000);
    }
  }

  async function chiediEliminazione(t, info) {
    const totale = info.elenco.reduce((s, x) => s + x.byte, 0);
    const n = info.elenco.length;
    const si = await chiedi({
      titolo: "Eliminare le copie di sicurezza?",
      testo: `Elimino ${n === 1 ? "la copia" : "le " + n + " copie"} di sicurezza di «${t.nome}» (${misura(totale)}). Le copie eliminate da qui NON finiscono nel Cestino e non si possono recuperare. Il brano invece resta com'è.`,
      si: "Elimina definitivamente", no: "Annulla", pericolo: true,
    });
    if (!si) return;
    try {
      const tolte = await Salvataggio.eliminaCopie(t);
      disegnaScheda();
      avvisa(tolte === 1 ? "Ho eliminato 1 copia di sicurezza." : `Ho eliminato ${tolte} copie di sicurezza.`);
    } catch (e) {
      avvisa(e instanceof Salvataggio.ErroreChiaro ? e.message : "Non sono riuscito a eliminare le copie: " + ((e && e.message) || e), 9000);
    }
  }

  /** Finestrella di conferma: risponde true solo se si preme il pulsante di conferma. */
  function chiedi({ titolo, testo, si, no, pericolo = false }) {
    const d = $("#conferma");
    $("#conferma-titolo").textContent = titolo;
    $("#conferma-testo").textContent = testo;
    const bSi = $("#conferma-si"), bNo = $("#conferma-no");
    bSi.textContent = si; bNo.textContent = no;
    bSi.classList.toggle("pericolo", pericolo);
    bSi.classList.toggle("principale", !pericolo);
    return new Promise((risolvi) => {
      const fine = (r) => { bSi.onclick = bNo.onclick = null; d.onclose = null; if (d.open) d.close(); risolvi(r); };
      bSi.onclick = () => fine(true);
      bNo.onclick = () => fine(false);
      d.onclose = () => fine(false);
      d.showModal();
      bNo.focus(); // la scelta prudente è quella già selezionata
    });
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
          el("li", { testo: "Ricorda soltanto l'ultima cartella da cui hai aperto i file, per ripartire da lì: il ricordo resta in questo browser." }),
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
      const t = tracce[corrente];
      if (!t || !quanteModifiche(t)) avvisa("Non ci sono modifiche da salvare.");
      else if (!finestraAnteprima.open) apriAnteprima(t);
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

  window.addEventListener("beforeunload", (e) => {
    if (tracce.some((t) => quanteModifiche(t)) || salvataggioInCorso) { e.preventDefault(); e.returnValue = ""; }
  });

  // per le prove automatiche: permette di aprire file senza le finestre di scelta
  window.TagLiatelle = { aggiungi, tracce: () => tracce };
})();
