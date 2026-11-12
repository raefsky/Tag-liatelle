/* ==========================================================================
   Tag-liatelle · elenco dei campi
   Qui si decide QUALI campi esistono, in quale gruppo stanno e come si
   chiamano nell'interfaccia. Nei blocchi successivi ogni campo riceverà
   anche il nome del frame ID3 (MP3) e del commento Vorbis (FLAC).
   Il file funziona sia nel browser (window.Campi) sia in Node (require).
   ========================================================================== */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === "object" && module.exports) module.exports = modulo;
  else radice.Campi = modulo;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // id3: il frame ID3 dove si legge e si scrive il campo nei file MP3.
  //   "TXXX:NOME" = frame di testo personalizzato con quella descrizione.
  //   Anno: si legge da TYER (v2.3) o TDRC (v2.4).
  //   Copyright della registrazione (℗): TPRO, il frame ufficiale di ID3v2.4.
  // vorbis: i nomi dei commenti Vorbis dove si legge il campo nei file FLAC.
  //   Il primo è quello che si scrive; gli altri sono nomi usati da altri programmi, che si leggono soltanto.
  //   Traccia e disco: il totale sta in TRACKTOTAL e DISCTOTAL (si leggono anche TOTALTRACKS e TOTALDISCS, e la forma "3/12").
  //   LICENSE contiene sia il nome della licenza sia il suo indirizzo: se inizia con http è l'indirizzo.
  //   Copyright della registrazione (℗): PRODUCTION_COPYRIGHT, il nome usato dal formato Matroska (Vorbis non ne ha uno ufficiale).
  //   Sito dell'artista: WEBSITE, come MusicBrainz Picard. Sito dell'etichetta: WWWPUBLISHER, come Mp3tag.
  // larghezza: "largo" (riga intera), "medio" (mezza riga), "stretto" (un terzo), "quarto" (un quarto)
  // tipo: "testo" | "numero-di" (es. 3 di 12) | "lungo" (più righe) | "si-no" | "copertina"
  const GRUPPI = [
    {
      id: "base", nome: "Base", sempreAperto: true,
      campi: [
        { id: "titolo",  etichetta: "Titolo",  larghezza: "largo", id3: "TIT2", vorbis: ["TITLE"] },
        { id: "artista", etichetta: "Artista", larghezza: "medio", id3: "TPE1", vorbis: ["ARTIST"] },
        { id: "album",   etichetta: "Album",   larghezza: "medio", id3: "TALB", vorbis: ["ALBUM"] },
        { id: "anno",    etichetta: "Anno",    larghezza: "quarto", id3: "TYER", vorbis: ["DATE", "YEAR"] },
        { id: "genere",  etichetta: "Genere",  larghezza: "quarto", id3: "TCON", vorbis: ["GENRE"] },
        { id: "traccia", etichetta: "Traccia", larghezza: "quarto", tipo: "numero-di", id3: "TRCK", vorbis: ["TRACKNUMBER"] },
        { id: "disco",   etichetta: "Disco",   larghezza: "quarto", tipo: "numero-di", id3: "TPOS", vorbis: ["DISCNUMBER"] },
      ],
    },
    {
      id: "crediti", nome: "Crediti", nota: "chi ha fatto cosa",
      campi: [
        { id: "artistaAlbum",   etichetta: "Artista dell'album", larghezza: "medio", id3: "TPE2", vorbis: ["ALBUMARTIST", "ALBUM ARTIST"] },
        { id: "compositore",    etichetta: "Compositore",        larghezza: "medio", id3: "TCOM", vorbis: ["COMPOSER"] },
        { id: "paroliere",      etichetta: "Paroliere",          larghezza: "medio", id3: "TEXT", vorbis: ["LYRICIST"] },
        { id: "direttore",      etichetta: "Direttore",          larghezza: "medio", id3: "TPE3", vorbis: ["CONDUCTOR"] },
        { id: "remixer",        etichetta: "Remixer",            larghezza: "medio", id3: "TPE4", vorbis: ["REMIXER"] },
        { id: "sottotitolo",    etichetta: "Sottotitolo",        larghezza: "medio", id3: "TIT3", vorbis: ["SUBTITLE"] },
        { id: "raggruppamento", etichetta: "Raggruppamento",     larghezza: "medio", id3: "TIT1", vorbis: ["GROUPING"] },
        { id: "lingua",         etichetta: "Lingua",             larghezza: "stretto", id3: "TLAN", vorbis: ["LANGUAGE"] },
        { id: "testo",          etichetta: "Testo del brano",    larghezza: "largo", tipo: "lungo", id3: "USLT", vorbis: ["LYRICS", "UNSYNCEDLYRICS"] },
      ],
    },
    {
      id: "diritti", nome: "Edizione e diritti", nota: "copyright, etichetta, licenza",
      campi: [
        { id: "copyright",       etichetta: "Copyright ©",               larghezza: "medio", id3: "TCOP", vorbis: ["COPYRIGHT"] },
        { id: "copyrightRegistrazione", etichetta: "Copyright registrazione ℗", larghezza: "medio", id3: "TPRO", vorbis: ["PRODUCTION_COPYRIGHT"] },
        { id: "editore",         etichetta: "Editore o etichetta",       larghezza: "medio", id3: "TPUB", vorbis: ["ORGANIZATION", "LABEL", "PUBLISHER"] },
        { id: "catalogo",        etichetta: "Numero di catalogo",        larghezza: "stretto", id3: "TXXX:CATALOGNUMBER", vorbis: ["CATALOGNUMBER"] },
        { id: "codiceBarre",     etichetta: "Codice a barre (UPC/EAN)",  larghezza: "stretto", id3: "TXXX:BARCODE", vorbis: ["BARCODE", "UPC", "EAN"] },
        { id: "isrc",            etichetta: "Codice ISRC",               larghezza: "stretto", id3: "TSRC", vorbis: ["ISRC"] },
        { id: "licenza",         etichetta: "Licenza",                   larghezza: "largo", id3: "TXXX:LICENSE", vorbis: ["LICENSE"] },
        { id: "sitoArtista",     etichetta: "Sito dell'artista",         larghezza: "medio", id3: "WOAR", vorbis: ["WEBSITE", "URL", "WWWARTIST"] },
        { id: "sitoLicenza",     etichetta: "Pagina della licenza",      larghezza: "medio", id3: "WCOP", vorbis: ["LICENSE"] },
        { id: "sitoEtichetta",   etichetta: "Sito dell'etichetta",       larghezza: "medio", id3: "WPUB", vorbis: ["WWWPUBLISHER"] },
      ],
    },
    {
      id: "extra", nome: "Extra", nota: "BPM, tonalità, note e campi tuoi",
      campi: [
        { id: "bpm",          etichetta: "BPM",           larghezza: "stretto", id3: "TBPM", vorbis: ["BPM"] },
        { id: "tonalita",     etichetta: "Tonalità",      larghezza: "stretto", id3: "TKEY", vorbis: ["INITIALKEY", "KEY"] },
        { id: "compilation",  etichetta: "Compilation",   larghezza: "stretto", tipo: "si-no", id3: "TCMP", vorbis: ["COMPILATION"] },
        { id: "codificatoDa", etichetta: "Codificato da", larghezza: "medio", id3: "TENC", vorbis: ["ENCODEDBY", "ENCODED-BY"] },
        { id: "commenti",     etichetta: "Commenti",      larghezza: "largo", tipo: "lungo", id3: "COMM", vorbis: ["COMMENT", "DESCRIPTION"] },
      ],
    },
  ];

  /** Tutti i campi in un elenco solo. */
  const TUTTI = GRUPPI.flatMap((g) => g.campi);

  /**
   * I valori dei campi dopo le modifiche: servono per l'anteprima e per la
   * verifica dopo il salvataggio. Un valore vuoto vuol dire "togliere il campo".
   * La copertina e i campi personalizzati qui non contano.
   */
  function valoriFinali(campi, modifiche) {
    const finali = { ...(campi || {}) };
    for (const [k, v] of Object.entries(modifiche)) {
      if (k === "copertina" || k === "personalizzati") continue; // non sono campi di testo
      const vuoto = v == null || (Array.isArray(v) ? !String(v[0] || "").trim() : !String(v).trim());
      if (vuoto) delete finali[k];
      else if (Array.isArray(v)) finali[k] = [String(v[0]).trim(), String(v[1] || "").trim()];
      else finali[k] = String(v).trim();
    }
    return finali;
  }

  // ------------------------------------------------------------------
  // Licenze Creative Commons per la scelta rapida
  // ------------------------------------------------------------------
  const LICENZE = [
    { nome: "CC BY 4.0",       url: "https://creativecommons.org/licenses/by/4.0/",       spiega: "chiunque può usarla, anche per guadagnare, citando l'autore" },
    { nome: "CC BY-SA 4.0",    url: "https://creativecommons.org/licenses/by-sa/4.0/",    spiega: "come BY, e chi la modifica deve condividerla allo stesso modo" },
    { nome: "CC BY-NC 4.0",    url: "https://creativecommons.org/licenses/by-nc/4.0/",    spiega: "citando l'autore, ma non per guadagnare" },
    { nome: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/", spiega: "non per guadagnare, e le modifiche si condividono allo stesso modo" },
    { nome: "CC BY-ND 4.0",    url: "https://creativecommons.org/licenses/by-nd/4.0/",    spiega: "si può diffondere, anche per guadagnare, ma senza modificarla" },
    { nome: "CC BY-NC-ND 4.0", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/", spiega: "solo da diffondere così com'è, senza guadagnare" },
    { nome: "CC0 1.0",         url: "https://creativecommons.org/publicdomain/zero/1.0/", spiega: "pubblico dominio: nessuna condizione" },
  ];
  /** La licenza CC che corrisponde a un nome o a un indirizzo (o null). */
  function licenzaDa(valore) {
    const v = String(valore || "").trim().toLowerCase().replace(/^http:/, "https:").replace(/\/?$/, "/");
    return LICENZE.find((l) => l.nome.toLowerCase() === String(valore || "").trim().toLowerCase() || l.url === v) || null;
  }

  // ------------------------------------------------------------------
  // Controllo dei valori prima di salvare
  // Ogni controllo risponde con { errore } (non si salva), { avviso } (si salva,
  // ma conviene guardare) oppure {} (tutto bene). I valori vuoti vanno sempre bene.
  // ------------------------------------------------------------------
  const URL_CAMPI = new Set(["sitoArtista", "sitoLicenza", "sitoEtichetta"]);
  const eIndirizzo = (v) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(v);

  /** ISRC: 2 lettere (paese), 3 lettere o cifre (chi registra), 2 cifre (anno), 5 cifre (numero). */
  function normalizzaIsrc(v) { return String(v || "").toUpperCase().replace(/^ISRC[\s:]*/, "").replace(/[\s\-–.]/g, ""); }
  const isrcValido = (v) => /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalizzaIsrc(v));

  /** Codice a barre EAN-13, UPC-A (12 cifre) o EAN-8: l'ultima cifra è di controllo. */
  function codiceBarreValido(v) {
    const c = String(v || "").replace(/\s/g, "");
    if (!/^(\d{8}|\d{12}|\d{13})$/.test(c)) return false;
    const cifre = c.split("").map(Number);
    const controllo = cifre.pop();
    let somma = 0;
    cifre.reverse().forEach((d, i) => { somma += d * (i % 2 === 0 ? 3 : 1); });
    return (10 - (somma % 10)) % 10 === controllo;
  }

  /**
   * @param {string} campo
   * @param {*} valore
   * @param {"MP3"|"FLAC"} formato
   */
  function controllaValore(campo, valore, formato) {
    if (Array.isArray(valore)) {
      const [n, tot] = valore.map((x) => String(x || "").trim());
      if (n && !/^\d+$/.test(n)) return { errore: "Scrivi solo il numero, per esempio 3." };
      if (tot && !/^\d+$/.test(tot)) return { errore: "Il totale deve essere un numero, per esempio 12." };
      if (tot && !n) return { errore: "Manca il numero: c'è solo il totale." };
      if (n && tot && +n > +tot) return { avviso: `Il numero (${n}) è più grande del totale (${tot}).` };
      return {};
    }
    const v = String(valore == null ? "" : valore).trim();
    if (!v) return {};
    if (URL_CAMPI.has(campo) && !eIndirizzo(v)) return { errore: "Serve un indirizzo web completo, che inizi con https:// (oppure http://)." };
    switch (campo) {
      case "isrc":
        if (!isrcValido(v)) return { errore: "Il codice ISRC ha 12 caratteri: 2 lettere del paese, 3 lettere o cifre, 2 cifre dell'anno e 5 cifre. Per esempio IT-A1B-26-00001." };
        return {};
      case "licenza":
        if (/^https?:\/\//i.test(v)) return { errore: "Qui va il nome della licenza (per esempio CC BY-NC-SA 4.0). L'indirizzo va in «Pagina della licenza»." };
        return {};
      case "codiceBarre":
        if (!codiceBarreValido(v)) return { avviso: "Questo non sembra un codice a barre EAN o UPC valido (8, 12 o 13 cifre, con l'ultima di controllo). Controlla di averlo copiato bene." };
        return {};
      case "bpm":
        if (!/^\d{2,3}([.,]\d+)?$/.test(v)) return { avviso: "Di solito i BPM sono un numero, per esempio 96." };
        return {};
      case "anno":
        if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(v)) return { avviso: "Di solito l'anno si scrive con 4 cifre, per esempio 2026." };
        return {};
      case "lingua":
        if (formato === "MP3" && !/^[a-z]{3}$/.test(v)) return { avviso: "Negli MP3 la lingua si scrive con un codice di 3 lettere minuscole: ita, eng, fra, deu, spa…" };
        return {};
      default:
        return {};
    }
  }

  /** Il valore come verrà scritto (ISRC senza trattini e in maiuscolo, ecc.). */
  function normalizza(campo, valore) {
    if (Array.isArray(valore)) return valore.map((x) => String(x || "").trim());
    const v = String(valore == null ? "" : valore).trim();
    if (campo === "isrc" && isrcValido(v)) return normalizzaIsrc(v);
    if (campo === "codiceBarre") return v.replace(/\s/g, "");
    return v;
  }

  /** I nomi già usati dai campi noti: un campo personalizzato non può chiamarsi così. */
  function nomeRiservato(nome, formato) {
    const N = String(nome || "").trim().toUpperCase();
    if (formato === "FLAC") {
      if (["METADATA_BLOCK_PICTURE", "COVERART", "COVERARTMIME", "TRACKTOTAL", "TOTALTRACKS", "DISCTOTAL", "TOTALDISCS"].includes(N)) return "un dato di Tag-liatelle";
      const c = TUTTI.find((x) => (x.vorbis || []).includes(N));
      return c ? c.etichetta : null;
    }
    const c = TUTTI.find((x) => x.id3 === "TXXX:" + N);
    if (c) return c.etichetta;
    if (N === "PRODUCTION_COPYRIGHT") return "Copyright registrazione ℗";
    return null;
  }

  /** Controlla l'elenco dei campi personalizzati: { errore } se qualcosa non va. */
  function controllaPersonalizzati(lista, formato) {
    const visti = new Set();
    for (const p of lista) {
      const nome = String(p.nome || "").trim();
      const valore = String(p.valore || "").trim();
      if (!nome && !valore) continue; // riga vuota: si ignora
      if (!nome) return { errore: `Il campo personalizzato con il valore «${valore}» non ha un nome.` };
      if (formato === "FLAC" && !/^[\x20-\x3C\x3E-\x7D]+$/.test(nome)) {
        return { errore: `Nei FLAC il nome di un campo può avere solo lettere senza accenti, cifre, spazi e segni semplici, e niente «=»: «${nome}» non va bene.` };
      }
      const riservato = nomeRiservato(nome, formato);
      if (riservato) return { errore: `«${nome}» è già il campo «${riservato}»: scrivilo lì.` };
      const chiave = formato === "FLAC" ? nome.toUpperCase() + "=" + valore : nome.toUpperCase();
      if (visti.has(chiave)) return { errore: `Il campo personalizzato «${nome}» compare due volte.` };
      visti.add(chiave);
    }
    return {};
  }

  return { GRUPPI, TUTTI, valoriFinali, LICENZE, licenzaDa, controllaValore, normalizza, isrcValido, codiceBarreValido, controllaPersonalizzati, nomeRiservato };
});
