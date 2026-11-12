/* ==========================================================================
   Tag-liatelle · prove dei controlli sui valori e di tutti i gruppi di campi
   (Crediti, Edizione e diritti, Extra, campi personalizzati), MP3 e FLAC.
   ========================================================================== */
(function () {
  "use strict";
  const uguali = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  function unisci(...pezzi) {
    const out = new Uint8Array(pezzi.reduce((s, p) => s + p.length, 0));
    let i = 0;
    for (const p of pezzi) { out.set(p, i); i += p.length; }
    return out;
  }
  const C = Campi;

  // ---------------- controlli ----------------
  prova("ISRC: si accetta con o senza trattini, si scrive senza trattini e in maiuscolo", () => {
    for (const v of ["IT-A1B-26-00001", "ita1b2600001", "IT A1B 26 00001", "ISRC: IT-A1B-26-00001"]) {
      uguale(C.controllaValore("isrc", v, "MP3"), {}, v);
      uguale(C.normalizza("isrc", v), "ITA1B2600001", v);
    }
    for (const v of ["IT-A1B-26-0001", "1T-A1B-26-00001", "IT-A1B-2X-00001", "codice"]) vero(C.controllaValore("isrc", v, "MP3").errore, v + " deve essere rifiutato");
  });
  prova("indirizzi web: servono http:// o https://", () => {
    uguale(C.controllaValore("sitoArtista", "https://esempio.it/sfogline", "MP3"), {}, "giusto");
    vero(C.controllaValore("sitoArtista", "esempio.it", "MP3").errore, "senza https");
    vero(C.controllaValore("sitoLicenza", "creativecommons.org/licenses/by/4.0/", "FLAC").errore, "senza https");
    vero(C.controllaValore("licenza", "https://creativecommons.org/licenses/by/4.0/", "FLAC").errore, "un indirizzo nel nome della licenza");
  });
  prova("codice a barre, BPM, anno, lingua: solo avvisi, non blocchi", () => {
    uguale(C.controllaValore("codiceBarre", "4006381333931", "MP3"), {}, "EAN-13 giusto");
    uguale(C.controllaValore("codiceBarre", "036000291452", "MP3"), {}, "UPC-A giusto");
    vero(C.controllaValore("codiceBarre", "8012345678905", "MP3").avviso, "cifra di controllo sbagliata");
    vero(C.controllaValore("bpm", "veloce", "MP3").avviso, "BPM");
    vero(C.controllaValore("anno", "26", "MP3").avviso, "anno");
    vero(C.controllaValore("lingua", "Italiano", "MP3").avviso, "lingua MP3");
    uguale(C.controllaValore("lingua", "Italiano", "FLAC"), {}, "lingua FLAC: testo libero");
  });
  prova("traccia e disco: solo numeri", () => {
    uguale(C.controllaValore("traccia", ["3", "12"], "MP3"), {}, "giusto");
    vero(C.controllaValore("traccia", ["tre", ""], "MP3").errore, "lettere");
    vero(C.controllaValore("traccia", ["", "12"], "MP3").errore, "manca il numero");
    vero(C.controllaValore("disco", ["3", "2"], "MP3").avviso, "numero più grande del totale");
  });
  prova("licenze Creative Commons: dal nome e dall'indirizzo", () => {
    uguale(C.licenzaDa("cc by-nc-sa 4.0").url, "https://creativecommons.org/licenses/by-nc-sa/4.0/", "dal nome");
    uguale(C.licenzaDa("http://creativecommons.org/licenses/by/4.0").nome, "CC BY 4.0", "dall'indirizzo");
    uguale(C.licenzaDa("Tutti i diritti riservati"), null, "non CC");
  });
  prova("campi personalizzati: nomi vuoti, doppi, riservati, caratteri non permessi", () => {
    uguale(C.controllaPersonalizzati([{ nome: "FORNO", valore: "180 °C" }, { nome: "", valore: "" }], "FLAC"), {}, "giusti");
    vero(C.controllaPersonalizzati([{ nome: "", valore: "x" }], "MP3").errore, "senza nome");
    vero(C.controllaPersonalizzati([{ nome: "TITLE", valore: "x" }], "FLAC").errore, "TITLE è già il titolo");
    vero(C.controllaPersonalizzati([{ nome: "catalognumber", valore: "x" }], "MP3").errore, "CATALOGNUMBER è già un campo");
    vero(C.controllaPersonalizzati([{ nome: "FORNÒ", valore: "x" }], "FLAC").errore, "accento nel nome FLAC");
    uguale(C.controllaPersonalizzati([{ nome: "FORNÒ", valore: "x" }], "MP3"), {}, "negli MP3 il nome può avere accenti");
    vero(C.controllaPersonalizzati([{ nome: "A", valore: "1" }, { nome: "a", valore: "2" }], "MP3").errore, "doppio negli MP3");
    uguale(C.controllaPersonalizzati([{ nome: "A", valore: "1" }, { nome: "A", valore: "2" }], "FLAC"), {}, "nei FLAC un nome può avere più valori");
  });

  // ---------------- tutti i gruppi, nei file ----------------
  const TUTTI = {
    artistaAlbum: "Orchestra «La Sfoglia»", compositore: "Ève Müller; Zia Pina", paroliere: "Zia Pina", direttore: "Mº Rossi",
    remixer: "DJ Mattarello", sottotitolo: "versione al ragù", raggruppamento: "Primi piatti", lingua: "ita",
    testo: "Prima riga è\nSeconda riga ù", copyright: "2026 Le Sfogline", copyrightRegistrazione: "2026 Etichetta Fantasia",
    editore: "Edizioni del Mattarello", catalogo: "MAT-004", codiceBarre: "4006381333931", isrc: "ITA1B2600001",
    licenza: "CC BY-NC-SA 4.0", sitoArtista: "https://esempio.it/artista", sitoLicenza: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    sitoEtichetta: "https://esempio.it/etichetta", bpm: "120", tonalita: "F#m", compilation: "1", codificatoDa: "Tag-liatelle",
    commenti: "Un commento con gli accenti: è, ò, à.",
  };
  const scritti = {};

  async function prova_tutti(nome, byte, formato) {
    const F = Formati.per(formato);
    const prima = await F.leggi(async (i, f) => byte.subarray(i, f), byte.length);
    const personalizzati = [
      ...prima.personalizzati.filter((p) => p.nome.toUpperCase() !== "FORNO").map((p) => ({ nome: p.nome, valore: p.valore, sorgente: p.sorgente })),
      { nome: "MIO_CAMPO", valore: "valore con è" },
    ];
    const modifiche = { ...TUTTI, personalizzati };
    const prep = F.prepara(prima, modifiche);
    const file = new Uint8Array(await new Blob(prep.parti(new Blob([byte]))).arrayBuffer());
    const dopo = await F.leggi(async (i, f) => file.subarray(i, f), file.length);
    const attesi = personalizzati.map((p) => ({ nome: p.nome, valore: p.valore }));
    uguale(dopo.avvisi, [], "nessun avviso");
    uguale(dopo.campi, prep.attesi, "campi");
    uguale(dopo.personalizzati, attesi, "campi personalizzati");
    vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), byte.subarray(prima.audio.inizio, prima.audio.fine)), "audio identico");
    uguale(dopo.immagini.map((i) => i.byte), prima.immagini.map((i) => i.byte), "immagini");
    // i personalizzati rimasti uguali conservano i loro byte
    for (const p of dopo.personalizzati) {
      const vecchio = prima.personalizzati.find((x) => x.nome === p.nome && x.valore === p.valore);
      if (vecchio && formato === "FLAC") vero(uguali(p.sorgente.grezzo, vecchio.sorgente.grezzo), `${p.nome} identico`);
      if (vecchio && formato === "MP3" && prima.tag && prima.tag.major >= 3) vero(uguali(p.sorgente.grezzo, vecchio.sorgente.grezzo), `${p.nome} identico`);
    }
    scritti[nome + "#tutti-i-campi"] = {
      base64: b64(file), campi: prep.attesi, versione: formato === "MP3" ? dopo.tag.versione : "FLAC", audio: ATTESO[nome].audio,
      immagini: dopo.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte })), personalizzati: attesi,
    };
    return { prima, dopo };
  }

  for (const es of [...ESEMPI.map((e) => [e, "MP3"]), ...ESEMPI_FLAC.map((e) => [e, "FLAC"])]) {
    const [e, formato] = es;
    if (ATTESO[e.nome].avvisi) continue;
    prova(`${e.nome}: tutti i gruppi di campi e i campi personalizzati`, async () => {
      const { dopo } = await prova_tutti(e.nome, byteDa64(e.base64), formato);
      if (formato === "MP3") {
        // ℗: frame TPRO in ID3v2.4, campo personalizzato PRODUCTION_COPYRIGHT in ID3v2.3
        const nomi = dopo.tag.frames.map((f) => f.nome + (f.nome === "TXXX" ? ":" + f.descrizione : ""));
        if (dopo.tag.major === 4) vero(nomi.includes("TPRO") && !nomi.includes("TXXX:PRODUCTION_COPYRIGHT"), "TPRO in v2.4");
        else vero(nomi.includes("TXXX:PRODUCTION_COPYRIGHT") && !nomi.includes("TPRO"), "TXXX in v2.3");
      } else {
        const nomi = dopo.commenti.voci.map((v) => v.nome);
        uguale(nomi.filter((n) => n === "LICENSE").length, 2, "nome e indirizzo della licenza in LICENSE");
        uguale(nomi.filter((n) => n === "COMPOSER").length, 2, "due compositori, due commenti");
      }
    });
  }

  prova("togliere un campo personalizzato lascia gli altri identici (FLAC 12: via FORNO, resta REPLAYGAIN)", async () => {
    const e = ESEMPI_FLAC.find((x) => x.nome.startsWith("12"));
    const byte = byteDa64(e.base64);
    const prima = await Flac.leggiFlacDaByte(byte);
    const tenuti = prima.personalizzati.filter((p) => p.nome !== "FORNO").map((p) => ({ nome: p.nome, valore: p.valore, sorgente: p.sorgente }));
    const prep = Formati.FLAC.prepara(prima, { personalizzati: tenuti });
    const file = new Uint8Array(await new Blob(prep.parti(new Blob([byte]))).arrayBuffer());
    const dopo = await Flac.leggiFlacDaByte(file);
    uguale(dopo.personalizzati, [{ nome: "REPLAYGAIN_TRACK_GAIN", valore: "-6.50 dB" }], "personalizzati");
    uguale(dopo.campi, prima.campi, "gli altri campi non cambiano");
    uguale(dopo.altri, prima.altri, "i dati nascosti restano");
  });

  prova("MP3 04: cambiare il valore di un campo personalizzato", async () => {
    const e = ESEMPI.find((x) => x.nome.startsWith("04"));
    const byte = byteDa64(e.base64);
    const prima = await Id3.leggiMp3DaByte(byte);
    const p = prima.personalizzati[0];
    const prep = Formati.MP3.prepara(prima, { personalizzati: [{ nome: p.nome, valore: "ventilato, 200 °C", sorgente: p.sorgente }] });
    const file = new Uint8Array(await new Blob(prep.parti(new Blob([byte]))).arrayBuffer());
    const dopo = await Id3.leggiMp3DaByte(file);
    uguale(dopo.personalizzati, [{ nome: "FORNO", valore: "ventilato, 200 °C" }], "valore nuovo");
    uguale(dopo.altri, prima.altri, "gli altri dati restano");
  });

  prova("(aggiunge i file con tutti i campi al confronto con mutagen)", () => {
    const pre = document.getElementById("scritti");
    const gia = pre.textContent ? JSON.parse(pre.textContent) : {};
    pre.textContent = JSON.stringify({ ...gia, ...scritti });
  });
})();
