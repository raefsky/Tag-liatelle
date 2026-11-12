/* ==========================================================================
   Tag-liatelle · modifica a gruppi (più tracce insieme)
   Qui c'è solo la logica, senza interfaccia:
   - riassumi: per ogni campo, il valore comune a tutte le tracce oppure
     "valori diversi";
   - perTraccia: dalle modifiche fatte sulla scheda di gruppo, le modifiche
     di ogni singola traccia (solo i campi che per quella traccia cambiano
     davvero), con la numerazione automatica delle tracce.
   Funziona sia nel browser (window.Gruppo) sia in Node (require).

   Le modifiche di gruppo hanno questa forma:
     { campo: valore, ...                    ← uguale per tutte le tracce
       traccia: { numera: { partenza: 1 } | null, totale: "12" | null },
       disco:   [numero, totale]             ← come un campo normale
       copertina: { azione, … }              ← uguale per tutte }
   ========================================================================== */
(function (radice, fabbrica) {
  if (typeof module === "object" && module.exports) module.exports = fabbrica(require("./campi.js"));
  else radice.Gruppo = fabbrica(radice.Campi);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Campi) {
  "use strict";

  /** Campi che di solito sono diversi per ogni brano: nella scheda di gruppo si possono solo leggere. */
  const SOLO_SINGOLI = new Set(["titolo", "isrc", "testo"]);

  const normale = (v) => (Array.isArray(v) ? [String(v[0] || "").trim(), String(v[1] || "").trim()] : String(v == null ? "" : v).trim());
  const chiave = (v) => JSON.stringify(normale(v));
  const vuoto = (v) => (Array.isArray(v) ? !normale(v)[0] && !normale(v)[1] : !normale(v));

  /** Un'impronta semplice dei byte di un'immagine, per capire se due copertine sono uguali. */
  function impronta(dati) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < dati.length; i++) { h ^= dati[i]; h = Math.imul(h, 16777619) >>> 0; }
    return dati.length + ":" + h.toString(16);
  }
  const fronteDi = (l) => (l.immagini || []).find((i) => i.tipo === 3) || (l.immagini || [])[0] || null;

  /**
   * @param {object[]} letture   le letture delle tracce scelte
   * @returns {{campi: object, copertina: {uguale: boolean, immagine: object|null}}}
   *   campi[campo] = { uguale: true, valore } oppure { uguale: false, valori: n }
   *   (traccia: il numero è sempre "diverso"; si riassume solo il totale)
   */
  function riassumi(letture) {
    const campi = {};
    for (const c of Campi.TUTTI) {
      let valori = letture.map((l) => l.campi[c.id]);
      if (c.id === "traccia") valori = valori.map((v) => (v ? v[1] || "" : ""));
      const diversi = new Set(valori.map(chiave));
      campi[c.id] = diversi.size === 1 ? { uguale: true, valore: valori[0] } : { uguale: false, valori: diversi.size };
    }
    const fronti = letture.map(fronteDi);
    const impronte = new Set(fronti.map((f) => (f ? impronta(f.dati) : "nessuna")));
    return { campi, copertina: { uguale: impronte.size === 1, immagine: impronte.size === 1 ? fronti[0] : null, quante: fronti.filter(Boolean).length } };
  }

  /**
   * Le modifiche di ogni traccia.
   * @param {object} gruppo     le modifiche fatte sulla scheda di gruppo
   * @param {object[]} letture  le letture delle tracce, nell'ordine in cui vanno numerate
   * @returns {object[]}        per ogni traccia, un oggetto di modifiche (può essere vuoto)
   */
  function perTraccia(gruppo, letture) {
    return letture.map((l, i) => {
      const m = {};
      for (const [campo, valore] of Object.entries(gruppo)) {
        if (campo === "copertina") { m.copertina = valore; continue; }
        if (campo === "traccia") {
          const prima = l.campi.traccia || ["", ""];
          const numero = valore.numera ? String(valore.numera.partenza + i) : prima[0];
          const totale = valore.totale !== null && valore.totale !== undefined ? String(valore.totale).trim() : prima[1];
          // senza un numero il totale da solo non si può scrivere
          const nuovo = [numero, numero ? totale : ""];
          if (chiave(nuovo) !== chiave(prima)) m.traccia = nuovo;
          continue;
        }
        const prima = l.campi[campo];
        if (vuoto(valore) && vuoto(prima)) continue;
        if (chiave(valore) !== chiave(prima === undefined ? (Array.isArray(valore) ? ["", ""] : "") : prima)) m[campo] = valore;
      }
      return m;
    });
  }

  /** Quanti campi cambiano in tutto (per la barra di salvataggio). */
  const quanteModifiche = (gruppo) => Object.keys(gruppo).length;

  /** Il totale delle tracce per la numerazione: quante sono quelle scelte. */
  const totaleNumerazione = (letture) => String(letture.length);

  return { SOLO_SINGOLI, riassumi, perTraccia, quanteModifiche, totaleNumerazione, impronta };
});
