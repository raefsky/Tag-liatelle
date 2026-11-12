/* ==========================================================================
   Tag-liatelle · prove della copertina
   misure delle immagini, calcoli del ritaglio, JPEG base, sostituzione e
   rimozione della copertina nei file di esempio (con controllo di mutagen).
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
  const scritti = {};

  /** Un'immagine di prova disegnata al momento (strisce e un cerchio, per vedere il ritaglio). */
  function tela(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    for (let i = 0; i < w; i += 40) { x.fillStyle = (i / 40) % 2 ? "#2B1F17" : "#E5A823"; x.fillRect(i, 0, 40, h); }
    x.fillStyle = "#B3362B"; x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) / 3, 0, 7); x.fill();
    return c;
  }

  prova("misure: JPEG e PNG dei file di esempio", async () => {
    const l = await Id3.leggiMp3DaByte(byteDa64(ESEMPI.find((e) => e.nome.startsWith("04")).base64));
    const png = l.immagini.find((i) => i.mime === "image/png");
    const jpg = l.immagini.find((i) => i.mime === "image/jpeg");
    uguale(Immagini.misure(png.dati), { formato: "PNG", larghezza: 16, altezza: 16, profondita: 24 }, "PNG");
    const m = Immagini.misure(jpg.dati);
    uguale([m.formato, m.larghezza, m.altezza, m.progressivo], ["JPEG", 16, 16, false], "JPEG");
    uguale(Immagini.misure(new Uint8Array([1, 2, 3])), null, "non immagine");
  });

  prova("ritaglio: centrato, zoom e niente bordi vuoti", () => {
    const c = Immagini.centra(400, 2000, 1000);
    uguale(Immagini.area(c), { sx: 500, sy: 0, lato: 1000 }, "centrato");
    const z = Immagini.zooma(c, 2);
    uguale(Immagini.area(z), { sx: 750, sy: 250, lato: 500 }, "zoom 2 al centro");
    const fuori = Immagini.limita({ ...c, x: 300, y: -999 });
    uguale([fuori.x, fuori.y], [0, 0], "non si esce a sinistra né in alto");
    const lontano = Immagini.limita({ ...c, x: -99999 });
    uguale(lontano.x, 400 - 2000 * 0.4, "non si esce a destra");
  });

  prova("produci: JPEG base (non progressivo), RGB, alla misura scelta", async () => {
    const sorgente = tela(1600, 1200);
    const a = Immagini.area(Immagini.centra(400, 1600, 1200));
    const jpg = await Immagini.produci(sorgente, a, 1000, "image/jpeg", 90);
    const m = Immagini.misure(jpg);
    uguale([m.formato, m.larghezza, m.altezza, m.progressivo, m.componenti], ["JPEG", 1000, 1000, false, 3], "JPEG");
    // il marcatore SOF2 (progressivo) non deve esserci
    let progressivo = false;
    for (let i = 0; i + 1 < jpg.length; i++) if (jpg[i] === 0xFF && jpg[i + 1] === 0xC2) { progressivo = true; break; }
    vero(!progressivo, "niente SOF2");
    const png = await Immagini.produci(sorgente, a, 500, "image/png", 90);
    const mp = Immagini.misure(png);
    uguale([mp.formato, mp.larghezza, mp.altezza], ["PNG", 500, 500], "PNG");
  });

  prova("avvisi: immagine piccola e copertina pesante", () => {
    vero(Immagini.avvisi({ latoPartenza: 300, lato: 1000, byte: 1000 }).length >= 2, "piccola");
    vero(Immagini.avvisi({ latoPartenza: 3000, lato: 1400, byte: 2e6 }).some((t) => t.includes("1 MB")), "pesante");
    uguale(Immagini.avvisi({ latoPartenza: 3000, lato: 1000, byte: 300000 }), [], "tutto bene");
  });

  // ----- nei file MP3 -----
  let nuova = null;
  const nuovaCopertina = async () => nuova || (nuova = await Immagini.produci(tela(800, 800), { sx: 0, sy: 0, lato: 800 }, 500, "image/jpeg", 85));

  for (const es of ESEMPI) {
    if (ATTESO[es.nome].avvisi) continue;
    const byte = byteDa64(es.base64);

    prova(`${es.nome}: nuova copertina frontale, le altre immagini restano`, async () => {
      const dati = await nuovaCopertina();
      const prima = await Id3.leggiMp3DaByte(byte);
      const s = Id3Scrittura.costruisci(prima, { copertina: { azione: "sostituisci", dati, mime: "image/jpeg" }, titolo: "Con copertina" });
      const audio = byte.subarray(prima.audio.inizio, prima.audio.fine);
      const file = unisci(s.tag, audio, s.v1 || new Uint8Array(0));
      const dopo = await Id3.leggiMp3DaByte(file);
      const frontali = dopo.immagini.filter((i) => i.tipo === 3);
      uguale(frontali.length, 1, "una sola copertina frontale");
      vero(uguali(frontali[0].dati, dati), "è proprio la nuova");
      const altre = (l) => l.immagini.filter((i) => i.tipo !== 3).map((i) => [i.tipo, i.mime, i.byte]);
      uguale(altre(dopo), altre(prima), "le altre immagini");
      vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), audio), "audio identico");
      uguale(dopo.campi.titolo, "Con copertina", "titolo");
      scritti[es.nome + "#copertina"] = {
        base64: b64(file), campi: Id3Scrittura.valoriFinali(prima, { titolo: "Con copertina" }), versione: dopo.tag.versione,
        audio: ATTESO[es.nome].audio, immagini: dopo.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte })),
      };
    });

    if (!ATTESO[es.nome].immagini.length) continue;
    prova(`${es.nome}: togliere la copertina`, async () => {
      const prima = await Id3.leggiMp3DaByte(byte);
      const s = Id3Scrittura.costruisci(prima, { copertina: { azione: "rimuovi" } });
      const audio = byte.subarray(prima.audio.inizio, prima.audio.fine);
      const file = unisci(s.tag, audio, s.v1 || new Uint8Array(0));
      const dopo = await Id3.leggiMp3DaByte(file);
      uguale(dopo.immagini.filter((i) => i.tipo === 3).length, 0, "nessuna copertina frontale");
      uguale(dopo.immagini.length, prima.immagini.length - prima.immagini.filter((i) => i.tipo === 3).length, "le altre restano");
      uguale(dopo.campi, prima.campi, "i campi non cambiano");
      vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), audio), "audio identico");
      scritti[es.nome + "#senza-copertina"] = {
        base64: b64(file), campi: prima.campi, versione: dopo.tag.versione, audio: ATTESO[es.nome].audio,
        immagini: dopo.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte })),
      };
    });
  }

  prova("(aggiunge i file con le copertine al confronto con mutagen)", () => {
    const pre = document.getElementById("scritti");
    const gia = pre.textContent ? JSON.parse(pre.textContent) : {};
    pre.textContent = JSON.stringify({ ...gia, ...scritti });
  });
})();
