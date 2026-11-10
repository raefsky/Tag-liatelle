/* ==========================================================================
   Tag-liatelle · controllo del supporto del browser
   Tag-liatelle scrive direttamente nei file grazie alla "File System Access
   API", che esiste solo in Chrome ed Edge (computer). Negli altri browser si
   può lavorare un file alla volta e scaricare una copia modificata.
   ========================================================================== */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === "object" && module.exports) module.exports = modulo;
  else radice.Supporto = modulo;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * Guarda cosa sa fare questo browser.
   * @param {object} w  la finestra (in Node si può passare un oggetto finto per i test)
   * @returns {{modo: "completo"|"copie"|"nessuno", cartelle: boolean, sicuro: boolean, nomeBrowser: string}}
   */
  function controlla(w) {
    const cartelle = typeof w.showDirectoryPicker === "function" && typeof w.showOpenFilePicker === "function";
    const sicuro = w.isSecureContext !== false;
    const leggeFile = typeof w.FileReader === "function" || (w.Blob && typeof w.Blob.prototype.arrayBuffer === "function");
    const ua = (w.navigator && w.navigator.userAgent) || "";
    const nomeBrowser =
      /Edg\//.test(ua) ? "Edge" :
      /Firefox\//.test(ua) ? "Firefox" :
      /Chrome\//.test(ua) ? "Chrome" :
      /Safari\//.test(ua) ? "Safari" : "questo browser";

    let modo = "nessuno";
    if (cartelle && sicuro) modo = "completo";
    else if (leggeFile) modo = "copie";
    return { modo, cartelle, sicuro, nomeBrowser };
  }

  /** Il testo da mostrare all'utente (null se va tutto bene). */
  function messaggio(stato) {
    if (stato.modo === "completo") return null;
    if (stato.modo === "copie") {
      if (stato.cartelle && !stato.sicuro) {
        return {
          titolo: "La pagina è aperta in un modo che non permette di salvare nei file.",
          testo: "Aprila con un doppio clic sul file index.html, oppure da un indirizzo che inizia con https://. Intanto puoi aprire un file alla volta e scaricarne una copia modificata.",
        };
      }
      return {
        titolo: stato.nomeBrowser + " non può salvare direttamente nei tuoi file.",
        testo: "Per aprire intere cartelle e salvare sul posto usa Chrome o Edge su un computer. Qui puoi comunque aprire un file alla volta e scaricarne una copia modificata: l'originale non viene toccato.",
      };
    }
    return {
      titolo: "Questo browser è troppo vecchio per Tag-liatelle.",
      testo: "Usa una versione recente di Chrome o di Edge.",
    };
  }

  return { controlla, messaggio };
});
