/* ==========================================================================
   Tag-liatelle · attrezzi per le immagini di copertina
   - misure: larghezza, altezza e formato letti dall'intestazione del file,
     senza decodificare l'immagine (JPEG, PNG, GIF, WebP);
   - ritaglio: i calcoli del riquadro quadrato (zoom e spostamento);
   - produci: disegna il ritaglio alla misura scelta e lo salva in JPEG base
     (non progressivo, RGB) oppure PNG.
   Le prime due parti funzionano anche in Node; "produci" serve il browser.
   ========================================================================== */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === "object" && module.exports) module.exports = modulo;
  else radice.Immagini = modulo;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LATI = [500, 1000, 1400, 3000];
  const PREDEFINITI = { lato: 1000, formato: "image/jpeg", qualita: 90 };
  const SOGLIE = { troppoPiccola: 500, pesante: 1024 * 1024 };

  // ------------------------------------------------------------------
  // Misure dall'intestazione
  // ------------------------------------------------------------------
  /**
   * @param {Uint8Array} b
   * @returns {{formato: string, larghezza: number, altezza: number, progressivo?: boolean} | null}
   */
  function misure(b) {
    if (!b || b.length < 12) return null;
    // PNG: firma e blocco IHDR
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b.length >= 24) {
      // profondità di colore: bit per canale × numero di canali (dal tipo di colore del PNG)
      const canali = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[b[25]] || 3;
      return { formato: "PNG", larghezza: u32(b, 16), altezza: u32(b, 20), profondita: b[24] * canali };
    }
    // GIF
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
      return { formato: "GIF", larghezza: b[6] | (b[7] << 8), altezza: b[8] | (b[9] << 8) };
    }
    // WebP
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b.length >= 30) {
      const tipo = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (tipo === "VP8X") return { formato: "WebP", larghezza: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), altezza: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
      if (tipo === "VP8 ") return { formato: "WebP", larghezza: (b[26] | (b[27] << 8)) & 0x3FFF, altezza: (b[28] | (b[29] << 8)) & 0x3FFF };
      if (tipo === "VP8L") {
        const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return { formato: "WebP", larghezza: (v & 0x3FFF) + 1, altezza: ((v >> 14) & 0x3FFF) + 1 };
      }
      return { formato: "WebP", larghezza: 0, altezza: 0 };
    }
    // JPEG: si scorrono i segmenti fino al primo SOF
    if (b[0] === 0xFF && b[1] === 0xD8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xFF) { i++; continue; }
        const m = b[i + 1];
        if (m === 0xFF) { i++; continue; }
        if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
        const lung = (b[i + 2] << 8) | b[i + 3];
        const eSof = m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC;
        if (eSof) {
          return {
            formato: "JPEG", altezza: (b[i + 5] << 8) | b[i + 6], larghezza: (b[i + 7] << 8) | b[i + 8],
            progressivo: m === 0xC2 || m === 0xC6 || m === 0xCA || m === 0xCE, componenti: b[i + 9],
            profondita: b[i + 4] * b[i + 9],
          };
        }
        if (m === 0xDA) break; // inizio dei dati senza SOF: file strano
        i += 2 + lung;
      }
      return { formato: "JPEG", larghezza: 0, altezza: 0 };
    }
    return null;
  }
  const u32 = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);

  // ------------------------------------------------------------------
  // Ritaglio quadrato
  // Vista: un quadrato di lato V (pixel sullo schermo). L'immagine (w × h)
  // è disegnata con scala s = base · zoom, dove "base" la fa riempire tutta
  // la vista. (x, y) è la posizione del suo angolo in alto a sinistra.
  // ------------------------------------------------------------------
  const scalaBase = (V, w, h) => V / Math.min(w, h);

  /** Tiene l'immagine dentro la vista: niente bordi vuoti. */
  function limita(stato) {
    const { V, w, h } = stato;
    const zoom = Math.min(Math.max(stato.zoom, 1), 8);
    const s = scalaBase(V, w, h) * zoom;
    const x = Math.min(0, Math.max(V - w * s, stato.x));
    const y = Math.min(0, Math.max(V - h * s, stato.y));
    return { ...stato, zoom, x, y };
  }

  /** Centra l'immagine con lo zoom indicato. */
  function centra(V, w, h, zoom = 1) {
    const s = scalaBase(V, w, h) * zoom;
    return limita({ V, w, h, zoom, x: (V - w * s) / 2, y: (V - h * s) / 2 });
  }

  /** Cambia lo zoom tenendo fermo il punto (px, py) della vista. */
  function zooma(stato, nuovoZoom, px = stato.V / 2, py = stato.V / 2) {
    const s1 = scalaBase(stato.V, stato.w, stato.h) * stato.zoom;
    const z = Math.min(Math.max(nuovoZoom, 1), 8);
    const s2 = scalaBase(stato.V, stato.w, stato.h) * z;
    const x = px - ((px - stato.x) / s1) * s2;
    const y = py - ((py - stato.y) / s1) * s2;
    return limita({ ...stato, zoom: z, x, y });
  }

  /** Il quadrato dell'immagine originale che finisce nella copertina. */
  function area(stato) {
    const s = scalaBase(stato.V, stato.w, stato.h) * stato.zoom;
    const lato = stato.V / s;
    return { sx: -stato.x / s, sy: -stato.y / s, lato };
  }

  // ------------------------------------------------------------------
  // Produzione dell'immagine finale (solo browser)
  // ------------------------------------------------------------------
  /**
   * @param {CanvasImageSource} sorgente  l'immagine (ImageBitmap o <img>)
   * @param {{sx, sy, lato}} a            il quadrato da prendere
   * @param {number} lato                 misura finale in pixel
   * @param {"image/jpeg"|"image/png"} formato
   * @param {number} qualita              60-100 (solo JPEG)
   * @returns {Promise<Uint8Array>}
   */
  async function produci(sorgente, a, lato, formato, qualita) {
    const tela = document.createElement("canvas");
    tela.width = tela.height = lato;
    const ctx = tela.getContext("2d", { alpha: formato === "image/png" });
    if (formato !== "image/png") { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, lato, lato); } // JPEG: niente trasparenza
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // riduzioni forti a metà per volta: il risultato è più nitido
    let fonte = sorgente, fx = a.sx, fy = a.sy, flato = a.lato;
    while (flato / 2 > lato) {
      const meta = Math.round(flato / 2);
      const t = document.createElement("canvas");
      t.width = t.height = meta;
      const c = t.getContext("2d");
      c.imageSmoothingQuality = "high";
      c.drawImage(fonte, fx, fy, flato, flato, 0, 0, meta, meta);
      fonte = t; fx = 0; fy = 0; flato = meta;
    }
    ctx.drawImage(fonte, fx, fy, flato, flato, 0, 0, lato, lato);
    const blob = await new Promise((ok, ko) => tela.toBlob((b) => (b ? ok(b) : ko(new Error("Il browser non è riuscito a creare l'immagine."))), formato, qualita / 100));
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** Avvisi sul risultato. "latoPartenza" è il lato, in pixel originali, del quadrato ritagliato. */
  function avvisi({ latoPartenza, lato, byte }) {
    const out = [];
    if (latoPartenza && latoPartenza < lato) {
      out.push(`La parte scelta dell'immagine misura ${latoPartenza} pixel per lato: ingrandita a ${lato} pixel sarà un po' sfocata. Riduci lo zoom o scegli una misura più piccola.`);
    }
    if (lato < SOGLIE.troppoPiccola || (latoPartenza && latoPartenza < SOGLIE.troppoPiccola)) {
      out.push(`Sotto i ${SOGLIE.troppoPiccola} pixel la copertina sembra sgranata in molti lettori e negozi online.`);
    }
    if (byte > SOGLIE.pesante) {
      out.push("La copertina pesa più di 1 MB: alcuni lettori e autoradio potrebbero non mostrarla. Prova una qualità più bassa o una misura più piccola.");
    }
    return out;
  }

  return { LATI, PREDEFINITI, SOGLIE, misure, scalaBase, limita, centra, zooma, area, produci, avvisi };
});
