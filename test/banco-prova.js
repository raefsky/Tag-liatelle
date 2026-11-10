/* ==========================================================================
   Tag-liatelle · un banco di prova piccolissimo, senza librerie esterne
   prova("nome", async () => { uguale(a, b); vero(x); });
   ========================================================================== */
(function () {
  "use strict";
  const elenco = [];

  window.prova = (nome, fn) => elenco.push({ nome, fn });

  // confronto "profondo": stesso contenuto, chiavi in qualunque ordine
  function ordina(x) {
    if (Array.isArray(x)) return x.map(ordina);
    if (x && typeof x === "object" && !(x instanceof Uint8Array)) {
      const o = {};
      for (const k of Object.keys(x).sort()) o[k] = ordina(x[k]);
      return o;
    }
    return x;
  }
  const testo = (x) => JSON.stringify(ordina(x));

  window.uguale = (ottenuto, atteso, cosa = "valore") => {
    if (testo(ottenuto) !== testo(atteso)) {
      throw new Error(`${cosa}: atteso ${testo(atteso)}, ottenuto ${testo(ottenuto)}`);
    }
  };
  window.vero = (condizione, cosa = "condizione") => {
    if (!condizione) throw new Error(`${cosa}: non è vero`);
  };
  window.byteDa64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  window.eseguiProve = async function () {
    const lista = document.getElementById("elenco");
    const fallite = [];
    let superate = 0;
    for (const p of elenco) {
      const riga = document.createElement("li");
      try {
        await p.fn();
        superate++;
        riga.className = "ok";
        riga.textContent = "✓ " + p.nome;
      } catch (e) {
        fallite.push({ nome: p.nome, errore: String(e && e.message || e) });
        riga.className = "ko";
        riga.textContent = "✗ " + p.nome + " — " + (e && e.message || e);
      }
      lista.append(riga);
    }
    const riepilogo = document.getElementById("riepilogo");
    riepilogo.textContent = fallite.length
      ? `${fallite.length} prove fallite su ${elenco.length}.`
      : `Tutte le ${elenco.length} prove superate.`;
    riepilogo.className = fallite.length ? "ko" : "ok";
    document.getElementById("esito").textContent = JSON.stringify({ totale: elenco.length, superate, fallite });
    document.title = (fallite.length ? "✗ " : "✓ ") + "Prove Tag-liatelle";
  };
})();
