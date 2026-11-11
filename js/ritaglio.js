/* ==========================================================================
   Tag-liatelle · finestra di ritaglio della copertina
   Ritaglio.apri(immagine) apre la finestra e restituisce
   { dati: Uint8Array, mime, lato, byte } oppure null se si annulla.
   Si sposta trascinando (o con le frecce), si ingrandisce con la rotellina,
   con il cursore dello zoom o con i tasti + e −.
   ========================================================================== */
(function (radice) {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const V = 360; // lato della vista, in pixel dello schermo

  let sorgente = null;   // ImageBitmap dell'immagine scelta
  let stato = null;      // posizione e zoom (vedi Immagini.limita)
  let risolvi = null;
  let ultimo = null;     // l'ultima immagine prodotta, pronta da usare
  let timer = null;

  function scelte() {
    return {
      lato: +document.querySelector('input[name="lato"]:checked').value,
      formato: document.querySelector('input[name="formato"]:checked').value,
      qualita: +$("#qualita").value,
    };
  }

  function disegna() {
    const tela = $("#vista");
    const dpr = window.devicePixelRatio || 1;
    if (tela.width !== V * dpr) { tela.width = tela.height = V * dpr; }
    const ctx = tela.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, V, V);
    const s = Immagini.scalaBase(V, stato.w, stato.h) * stato.zoom;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sorgente, stato.x, stato.y, stato.w * s, stato.h * s);
    // righe dei terzi, per aiutare a centrare
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of [1, 2]) { ctx.moveTo((V * k) / 3, 0); ctx.lineTo((V * k) / 3, V); ctx.moveTo(0, (V * k) / 3); ctx.lineTo(V, (V * k) / 3); }
    ctx.stroke();
    $("#zoom").value = stato.zoom;
    programmaRisultato();
  }

  const misuraTesto = (byte) => (byte < 1024 * 1024 ? Math.round(byte / 1024) + " KB" : (byte / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " MB");

  function programmaRisultato() {
    ultimo = null;
    $("#ritaglio-usa").disabled = true;
    $("#risultato").textContent = "Preparo l'anteprima…";
    clearTimeout(timer);
    timer = setTimeout(calcolaRisultato, 250);
  }

  async function calcolaRisultato() {
    const { lato, formato, qualita } = scelte();
    const a = Immagini.area(stato);
    const dati = await Immagini.produci(sorgente, a, lato, formato, qualita);
    const nome = formato === "image/png" ? "PNG" : "JPEG";
    ultimo = { dati, mime: formato, lato, byte: dati.length };
    $("#risultato").textContent = `Risultato: ${lato} × ${lato} pixel · ${nome} · ${misuraTesto(dati.length)}`;
    const lista = $("#avvisi-copertina");
    lista.replaceChildren(...Immagini.avvisi({ latoPartenza: Math.round(a.lato), lato, byte: dati.length }).map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    }));
    $("#ritaglio-usa").disabled = false;
  }

  // ---------- spostamento e zoom ----------
  let trascino = null;
  function preparaComandi() {
    const tela = $("#vista");
    tela.addEventListener("pointerdown", (e) => { trascino = { x: e.clientX, y: e.clientY }; tela.setPointerCapture(e.pointerId); });
    tela.addEventListener("pointermove", (e) => {
      if (!trascino) return;
      // sugli schermi piccoli la vista è disegnata più stretta: si riporta il movimento alla sua scala
      const k = V / tela.getBoundingClientRect().width;
      stato = Immagini.limita({ ...stato, x: stato.x + (e.clientX - trascino.x) * k, y: stato.y + (e.clientY - trascino.y) * k });
      trascino = { x: e.clientX, y: e.clientY };
      disegna();
    });
    const fine = () => { trascino = null; };
    tela.addEventListener("pointerup", fine);
    tela.addEventListener("pointercancel", fine);
    tela.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = tela.getBoundingClientRect();
      const k = V / r.width;
      stato = Immagini.zooma(stato, stato.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), (e.clientX - r.left) * k, (e.clientY - r.top) * k);
      disegna();
    }, { passive: false });
    tela.addEventListener("keydown", (e) => {
      const passo = e.shiftKey ? 40 : 10;
      const mosse = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
      if (mosse[e.key]) { e.preventDefault(); stato = Immagini.limita({ ...stato, x: stato.x + mosse[e.key][0], y: stato.y + mosse[e.key][1] }); disegna(); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); stato = Immagini.zooma(stato, stato.zoom * 1.1); disegna(); }
      else if (e.key === "-") { e.preventDefault(); stato = Immagini.zooma(stato, stato.zoom / 1.1); disegna(); }
    });
    $("#zoom").addEventListener("input", (e) => { stato = Immagini.zooma(stato, +e.target.value); disegna(); });
    $("#ritaglio-centra").addEventListener("click", () => { stato = Immagini.centra(V, stato.w, stato.h, 1); disegna(); });
    document.querySelectorAll('#ritaglio input[name="lato"], #ritaglio input[name="formato"]').forEach((r) => r.addEventListener("change", () => {
      $("#riga-qualita").hidden = scelte().formato === "image/png";
      programmaRisultato();
    }));
    $("#qualita").addEventListener("input", (e) => { $("#qualita-valore").textContent = e.target.value; programmaRisultato(); });
    $("#ritaglio-usa").addEventListener("click", () => chiudi(ultimo));
    $("#ritaglio-annulla").addEventListener("click", () => chiudi(null));
    $("#ritaglio").addEventListener("close", () => chiudi(null));
  }

  function chiudi(esito) {
    if (!risolvi) return;
    const r = risolvi;
    risolvi = null;
    if ($("#ritaglio").open) $("#ritaglio").close();
    if (sorgente && sorgente.close) sorgente.close();
    sorgente = null;
    r(esito);
  }

  /**
   * @param {Blob} immagine   il file scelto o trascinato, oppure la copertina attuale
   */
  async function apri(immagine) {
    if (risolvi) chiudi(null); // una finestra di ritaglio rimasta aperta si chiude come "annullata"
    let bitmap;
    try {
      bitmap = await createImageBitmap(immagine);
    } catch (e) {
      throw new Error("Non riesco ad aprire questa immagine. Usa un file JPEG, PNG o WebP.");
    }
    if (!bitmap.width || !bitmap.height) throw new Error("L'immagine è vuota.");
    sorgente = bitmap;
    stato = Immagini.centra(V, bitmap.width, bitmap.height, 1);
    $("#ritaglio-partenza").textContent = `Immagine di partenza: ${bitmap.width} × ${bitmap.height} pixel.`;
    $("#riga-qualita").hidden = scelte().formato === "image/png";
    $("#qualita-valore").textContent = $("#qualita").value;
    $("#ritaglio").showModal();
    disegna();
    $("#vista").focus();
    return new Promise((ok) => { risolvi = ok; });
  }

  document.addEventListener("DOMContentLoaded", preparaComandi);
  if (document.readyState !== "loading") preparaComandi();

  radice.Ritaglio = { apri };
})(typeof globalThis !== "undefined" ? globalThis : this);
