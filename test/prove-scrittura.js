/* ==========================================================================
   Tag-liatelle · prove della scrittura MP3 (ID3)
   Per ogni file di esempio: si costruisce il nuovo tag, si ricompone il file
   (tag nuovo + audio originale + ID3v1) e lo si rilegge.
   I file scritti restano nella pagina, così strumenti/prova.py li fa
   controllare anche da mutagen.
   ========================================================================== */
(function () {
  "use strict";

  const MODIFICHE = {
    titolo: "Titolo nuovo è ✓ — «prova»",
    artista: "",                        // vuoto = togliere il campo
    album: "Album ☆ nuovo",
    anno: "2030",
    genere: "Polka",
    traccia: ["4", "9"],
    disco: ["", ""],
  };

  function unisci(...pezzi) {
    const out = new Uint8Array(pezzi.reduce((s, p) => s + p.length, 0));
    let i = 0;
    for (const p of pezzi) { out.set(p, i); i += p.length; }
    return out;
  }
  /** Il file come lo scriverà il salvataggio: tag nuovo + audio originale + ID3v1. */
  function ricomponi(byte, lettura, scritto) {
    const audio = byte.subarray(lettura.audio.inizio, lettura.audio.fine);
    const coda = scritto.v1 || new Uint8Array(0);
    return { file: unisci(scritto.tag, audio, coda), audio };
  }
  const uguali = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const sommario = (r) => ({
    immagini: r.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte })),
    personalizzati: r.personalizzati, altri: r.altri,
  });

  const scritti = {};

  for (const es of ESEMPI) {
    const byte = byteDa64(es.base64);
    const atteso = ATTESO[es.nome];

    if (atteso.avvisi) {
      prova(`${es.nome}: con il tag rovinato non si scrive`, async () => {
        const l = await Id3.leggiMp3DaByte(byte);
        uguale(Id3Scrittura.controlla(l).ok, false, "permesso di scrivere");
        let errore = null;
        try { Id3Scrittura.costruisci(l, MODIFICHE); } catch (e) { errore = e; }
        vero(errore, "costruisci deve rifiutarsi");
      });
      continue;
    }

    prova(`${es.nome}: salvare senza cambiare niente non cambia niente`, async () => {
      const prima = await Id3.leggiMp3DaByte(byte);
      const scritto = Id3Scrittura.costruisci(prima, {});
      const { file, audio } = ricomponi(byte, prima, scritto);
      const dopo = await Id3.leggiMp3DaByte(file);
      uguale(dopo.campi, prima.campi, "campi");
      uguale(sommario(dopo), sommario(prima), "immagini, personalizzati, altri");
      uguale(dopo.v1, prima.v1, "ID3v1");
      vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), audio), "audio identico");
      if (prima.tag && prima.tag.major >= 3) {
        // ogni frame riscritto byte per byte
        uguale(dopo.tag.frames.length, prima.tag.frames.length, "numero di frame");
        dopo.tag.frames.forEach((f, i) => {
          const g = prima.tag.frames[i];
          vero(f.id === g.id && f.flags === g.flags && uguali(f.grezzo, g.grezzo), `frame ${g.id} identico`);
        });
        uguale(dopo.audio.inizio, prima.audio.inizio, "l'audio resta nella stessa posizione");
        uguale(file.length, byte.length, "stessa dimensione del file");
      }
    });

    prova(`${es.nome}: modifica dei campi Base`, async () => {
      const prima = await Id3.leggiMp3DaByte(byte);
      const scritto = Id3Scrittura.costruisci(prima, MODIFICHE);
      const { file, audio } = ricomponi(byte, prima, scritto);
      const dopo = await Id3.leggiMp3DaByte(file);
      const finali = Id3Scrittura.valoriFinali(prima, MODIFICHE);
      uguale(dopo.campi, finali, "campi dopo la modifica");
      uguale(dopo.avvisi, [], "nessun avviso");
      uguale(sommario(dopo), sommario(prima), "immagini, personalizzati e altri dati conservati");
      vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), audio), "audio identico");
      const atteseVersione = prima.tag && prima.tag.major >= 3 ? prima.tag.versione : "2.3";
      uguale(dopo.tag.versione, atteseVersione, "versione del tag");
      if (prima.v1) {
        uguale(dopo.v1.titolo, "Titolo nuovo è ? - «prova»".slice(0, 30), "titolo nel vecchio ID3v1");
        uguale(dopo.v1.artista, "", "artista tolto anche da ID3v1");
        uguale(dopo.v1.traccia, 4, "traccia in ID3v1");
        uguale(dopo.v1.genere, "Polka", "genere in ID3v1");
        uguale(dopo.v1.commento, prima.v1.commento, "commento di ID3v1 invariato");
      }
      scritti[es.nome] = { base64: b64(file), campi: finali, versione: dopo.tag.versione, audio: ATTESO[es.nome].audio };
    });
  }

  prova("un nuovo tag lascia spazio libero per i salvataggi futuri", async () => {
    const byte = byteDa64(ESEMPI.find((e) => e.nome.startsWith("01")).base64);
    const l = await Id3.leggiMp3DaByte(byte);
    const s = Id3Scrittura.costruisci(l, { titolo: "Ciao" });
    const t = Id3.leggiTag(s.tag);
    uguale(t.riempimento, Id3Scrittura.RIEMPIMENTO, "spazio libero");
  });

  prova("un titolo lunghissimo sposta l'audio, ma l'audio resta identico", async () => {
    const byte = byteDa64(ESEMPI.find((e) => e.nome.startsWith("02")).base64);
    const prima = await Id3.leggiMp3DaByte(byte);
    const lungo = "tagliatella ".repeat(400);
    const s = Id3Scrittura.costruisci(prima, { titolo: lungo });
    const { file, audio } = ricomponi(byte, prima, s);
    const dopo = await Id3.leggiMp3DaByte(file);
    uguale(dopo.campi.titolo, lungo.trim(), "titolo");
    vero(dopo.audio.inizio > prima.audio.inizio, "l'audio è più avanti");
    vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), audio), "audio identico");
  });

  prova("v2.4: più valori separati da «; » diventano valori distinti", async () => {
    const byte = byteDa64(ESEMPI.find((e) => e.nome.startsWith("03")).base64);
    const prima = await Id3.leggiMp3DaByte(byte);
    const s = Id3Scrittura.costruisci(prima, { artista: "Uno; Due; Tre" });
    const t = Id3.leggiTag(s.tag);
    uguale(t.frames.find((f) => f.nome === "TPE1").testi, ["Uno", "Due", "Tre"], "valori");
  });

  prova("(scrive i file per il confronto con mutagen)", () => {
    document.getElementById("scritti").textContent = JSON.stringify(scritti);
  });
})();
