/* ==========================================================================
   Tag-liatelle · attrezzi per i byte
   Lettura di numeri e testi dentro un Uint8Array, nelle codifiche usate
   dai tag: Latin-1, UTF-16 (con o senza BOM), UTF-8.
   Funziona sia nel browser (window.Binario) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === "object" && module.exports) module.exports = modulo;
  else radice.Binario = modulo;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const u16 = (b, i) => (b[i] << 8) | b[i + 1];
  const u24 = (b, i) => (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
  const u32 = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
  const u32le = (b, i) => ((b[i + 3] << 24) >>> 0) + ((b[i + 2] << 16) | (b[i + 1] << 8) | b[i]);
  /** Numero "syncsafe" di ID3: 4 byte da 7 bit ciascuno. */
  const syncsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];
  const eSyncsafe = (b, i) => ((b[i] | b[i + 1] | b[i + 2] | b[i + 3]) & 0x80) === 0;

  /** Quattro caratteri ASCII (per esempio "TIT2"). */
  function ascii(b, inizio, lunghezza) {
    let s = "";
    for (let i = inizio; i < inizio + lunghezza && i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
  }

  // Latin-1 vero (ISO-8859-1): ogni byte è il carattere con lo stesso numero.
  // Non si usa TextDecoder("latin1") perché nei browser significa Windows-1252.
  function latin1(b) {
    let s = "";
    for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode.apply(null, b.subarray(i, i + 4096));
    return s;
  }

  const decUtf8 = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
  const decLe = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : null;
  const decBe = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16be") : null;

  /** UTF-16: guarda il BOM (FF FE o FE FF); senza BOM usa l'ordine indicato. */
  function utf16(b, ordinePredefinito) {
    let le = ordinePredefinito !== "be";
    let inizio = 0;
    if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) { le = true; inizio = 2; }
    else if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) { le = false; inizio = 2; }
    const corpo = b.subarray(inizio, inizio + ((b.length - inizio) & ~1));
    return (le ? decLe : decBe).decode(corpo);
  }

  /**
   * Decodifica un testo ID3.
   * @param {Uint8Array} b
   * @param {number} enc  0 Latin-1, 1 UTF-16 con BOM, 2 UTF-16 BE, 3 UTF-8
   */
  function testo(b, enc) {
    if (enc === 0) return latin1(b);
    if (enc === 1) return utf16(b, "le");
    if (enc === 2) return utf16(b, "be");
    if (enc === 3) return decUtf8.decode(b);
    return latin1(b); // codifica sconosciuta: meglio qualcosa che niente
  }

  /** Lunghezza del terminatore: 2 byte per UTF-16, 1 per gli altri. */
  const larghezzaZero = (enc) => (enc === 1 || enc === 2 ? 2 : 1);

  /**
   * Cerca la fine di una stringa terminata da zero.
   * @returns {number} posizione del terminatore, oppure la fine se manca
   */
  function cercaZero(b, inizio, enc) {
    if (larghezzaZero(enc) === 2) {
      for (let i = inizio; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i;
      return b.length;
    }
    for (let i = inizio; i < b.length; i++) if (b[i] === 0) return i;
    return b.length;
  }

  /** Divide un testo in più valori separati da zero (ID3v2.4), togliendo gli zeri finali. */
  function testi(b, enc) {
    const valori = [];
    const z = larghezzaZero(enc);
    let i = 0;
    while (i < b.length) {
      const f = cercaZero(b, i, enc);
      valori.push(testo(b.subarray(i, f), enc));
      i = f + z;
    }
    // via i valori vuoti in coda (terminatori finali)
    while (valori.length > 1 && valori[valori.length - 1] === "") valori.pop();
    return valori.length ? valori : [""];
  }

  /** Toglie la "unsynchronisation": ogni FF 00 torna FF. */
  function risincronizza(b) {
    let conta = 0;
    for (let i = 0; i + 1 < b.length; i++) if (b[i] === 0xFF && b[i + 1] === 0x00) conta++;
    if (!conta) return b;
    const out = new Uint8Array(b.length - conta);
    let j = 0;
    for (let i = 0; i < b.length; i++) {
      out[j++] = b[i];
      if (b[i] === 0xFF && b[i + 1] === 0x00) i++;
    }
    return out;
  }

  /** Byte in esadecimale, utile per i messaggi e i test. */
  const esa = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(" ");

  return { u16, u24, u32, u32le, syncsafe, eSyncsafe, ascii, latin1, utf16, testo, testi, cercaZero, larghezzaZero, risincronizza, esa };
});
