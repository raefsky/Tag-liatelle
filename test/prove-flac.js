/* ==========================================================================
   Tag-liatelle · prove dei file FLAC (lettura e scrittura)
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
  const esempio = (inizio) => byteDa64(ESEMPI_FLAC.find((e) => e.nome.startsWith(inizio)).base64);
  const immaginiDi = (r) => r.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte }));
  /** Il file come lo scriverà il salvataggio: inizio invariato + nuovi metadati + audio originale. */
  const ricomponi = (byte, l, s) => unisci(byte.subarray(0, l.inizioMeta), s.metadati, byte.subarray(l.audio.inizio));

  const MODIFICHE = {
    titolo: "Titolo nuovo è ✓ — «prova»",
    artista: "",
    album: "Album ☆ nuovo",
    anno: "2030",
    genere: "Polka",
    traccia: ["4", "9"],
    disco: ["", ""],
  };
  const letture = {}, scritti = {};
  const daConfrontare = (nome, variante, file, campi, l) => {
    scritti[nome + "#" + variante] = { base64: b64(file), campi, audio: ATTESO[nome].audio, immagini: immaginiDi(l) };
  };

  // ---------------- lettura ----------------
  for (const es of ESEMPI_FLAC) {
    const atteso = ATTESO[es.nome];
    const byte = byteDa64(es.base64);
    prova(`${es.nome}: ${atteso.descrizione}`, async () => {
      const r = await Flac.leggiFlacDaByte(byte);
      letture[es.nome] = { campi: r.campi, immagini: immaginiDi(r) };
      uguale(r.campi, atteso.campi, "campi");
      uguale(immaginiDi(r), atteso.immagini, "immagini");
      uguale(r.personalizzati, atteso.personalizzati, "campi personalizzati");
      uguale(r.altri, atteso.altri, "altri dati conservati");
      uguale(r.audio, atteso.audio, "posizione dell'audio");
      uguale(r.fornitore, atteso.fornitore, "programma che ha creato il file");
      if (atteso.avvisi) vero(r.avvisi.length > 0, "c'è un avviso");
      else uguale(r.avvisi, [], "avvisi");
      for (const i of r.immagini) {
        const m = Immagini.misure(i.dati);
        uguale([m.larghezza, m.altezza], [i.larghezza, i.altezza], "misure dell'immagine");
      }
    });
  }

  prova("FLAC: legge solo i metadati; dell'audio al massimo 2 byte all'inizio e 128 alla fine", async () => {
    for (const es of ESEMPI_FLAC) {
      const byte = byteDa64(es.base64);
      const a = ATTESO[es.nome].audio;
      await Flac.leggiFlac(async (i, f) => {
        const occhiata = (i === a.inizio && f === a.inizio + 2) || (i === byte.length - 128 && f === byte.length) || (i === 0 && f <= 10);
        vero(occhiata || f <= a.inizio, `${es.nome}: lettura ${i}-${f} dentro l'audio (che inizia a ${a.inizio})`);
        return byte.subarray(i, f);
      }, byte.length);
    }
  });

  prova("FLAC troncati o rovinati: nessun blocco dell'app, al massimo un avviso o un rifiuto chiaro", async () => {
    const leggi = async (b) => {
      try { return await Flac.leggiFlacDaByte(b); }
      catch (e) { vero(/FLAC/.test(e.message), "errore non previsto: " + e.message); return null; }
    };
    for (const es of ESEMPI_FLAC) {
      const byte = byteDa64(es.base64);
      for (const taglio of [0, 3, 4, 7, 8, 41, 42, 60, 200, 700]) {
        const r = await leggi(byte.slice(0, Math.min(taglio, byte.length)));
        if (r && taglio < ATTESO[es.nome].audio.inizio) vero(r.avvisi.length > 0, `${es.nome} tagliato a ${taglio}: serve un avviso`);
      }
      let seme = 11;
      const caso = () => (seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let k = 0; k < 60; k++) {
        const copia = byte.slice();
        const zona = Math.min(ATTESO[es.nome].audio.inizio, copia.length);
        for (let j = 0; j < 6; j++) copia[Math.floor(caso() * zona)] = Math.floor(caso() * 256);
        const r = await leggi(copia);
        if (r && !r.avvisi.length) FlacScrittura.costruisci(r, { titolo: "x" }); // se si legge senza avvisi, deve anche potersi riscrivere
      }
    }
  });

  // ---------------- scrittura ----------------
  for (const es of ESEMPI_FLAC) {
    const atteso = ATTESO[es.nome];
    const byte = byteDa64(es.base64);

    if (atteso.avvisi) {
      prova(`${es.nome}: con i dati rovinati non si scrive`, async () => {
        const l = await Flac.leggiFlacDaByte(byte);
        uguale(FlacScrittura.controlla(l).ok, false, "permesso di scrivere");
        let errore = null;
        try { FlacScrittura.costruisci(l, MODIFICHE); } catch (e) { errore = e; }
        vero(errore, "costruisci deve rifiutarsi");
      });
      continue;
    }

    prova(`${es.nome}: salvare senza cambiare niente lascia il file identico`, async () => {
      const prima = await Flac.leggiFlacDaByte(byte);
      const s = FlacScrittura.costruisci(prima, {});
      vero(s.sulPosto, "sul posto");
      vero(uguali(ricomponi(byte, prima, s), byte), "file identico byte per byte");
    });

    prova(`${es.nome}: modifica dei campi Base`, async () => {
      const prima = await Flac.leggiFlacDaByte(byte);
      const s = FlacScrittura.costruisci(prima, MODIFICHE);
      const file = ricomponi(byte, prima, s);
      const dopo = await Flac.leggiFlacDaByte(file);
      const finali = Campi.valoriFinali(prima.campi, MODIFICHE);
      uguale(dopo.campi, finali, "campi dopo la modifica");
      uguale(dopo.avvisi, [], "nessun avviso");
      uguale([immaginiDi(dopo), dopo.personalizzati, dopo.altri], [immaginiDi(prima), prima.personalizzati, prima.altri], "immagini, personalizzati e altri dati conservati");
      vero(uguali(file.subarray(dopo.audio.inizio), byte.subarray(prima.audio.inizio)), "audio identico");
      vero(uguali(file.subarray(0, dopo.inizioMeta), byte.subarray(0, prima.inizioMeta)), "inizio del file identico");
      if (s.sulPosto) uguale([file.length, dopo.audio.inizio], [byte.length, prima.audio.inizio], "sul posto: stessa dimensione, audio fermo");
      else uguale(dopo.blocchi[dopo.blocchi.length - 1].lunghezza, FlacScrittura.RIEMPIMENTO, "spazio libero nuovo");
      // i blocchi non toccati sono identici
      const grezzi = (l) => l.blocchi.filter((b) => b.tipo !== Flac.T.PADDING && b.tipo !== Flac.T.VORBIS_COMMENT).map((b) => b64(b.grezzo));
      uguale(grezzi(dopo), grezzi(prima), "gli altri blocchi");
      uguale(dopo.fornitore, prima.commenti ? prima.fornitore : FlacScrittura.FORNITORE, "programma che ha creato il file");
      daConfrontare(es.nome, "campi", file, finali, dopo);
    });

    prova(`${es.nome}: nuova copertina frontale, le altre immagini restano`, async () => {
      const c = document.createElement("canvas"); c.width = c.height = 600;
      const x = c.getContext("2d"); x.fillStyle = "#E5A823"; x.fillRect(0, 0, 600, 600); x.fillStyle = "#B3362B"; x.fillRect(150, 150, 300, 300);
      const dati = await Immagini.produci(c, { sx: 0, sy: 0, lato: 600 }, 500, "image/jpeg", 85);
      const prima = await Flac.leggiFlacDaByte(byte);
      const s = FlacScrittura.costruisci(prima, { copertina: { azione: "sostituisci", dati, mime: "image/jpeg" } });
      const file = ricomponi(byte, prima, s);
      const dopo = await Flac.leggiFlacDaByte(file);
      const frontali = dopo.immagini.filter((i) => i.tipo === 3);
      uguale(frontali.length, 1, "una sola copertina frontale");
      vero(uguali(frontali[0].dati, dati), "è proprio la nuova");
      uguale([frontali[0].larghezza, frontali[0].altezza, frontali[0].mime], [500, 500, "image/jpeg"], "misure scritte nel blocco");
      const altre = (l) => l.immagini.filter((i) => i.tipo !== 3).map((i) => [i.tipo, i.mime, i.byte]);
      uguale(altre(dopo), altre(prima), "le altre immagini");
      uguale(dopo.campi, prima.campi, "i campi non cambiano");
      if (prima.commenti) vero(uguali(dopo.commenti.blocco.grezzo, prima.commenti.blocco.grezzo), "commenti identici byte per byte");
      vero(uguali(file.subarray(dopo.audio.inizio), byte.subarray(prima.audio.inizio)), "audio identico");
      daConfrontare(es.nome, "copertina", file, prima.campi, dopo);
    });

    if (!atteso.immagini.length) continue;
    prova(`${es.nome}: togliere la copertina lascia spazio libero, senza spostare l'audio`, async () => {
      const prima = await Flac.leggiFlacDaByte(byte);
      const s = FlacScrittura.costruisci(prima, { copertina: { azione: "rimuovi" } });
      vero(s.sulPosto, "sul posto");
      const file = ricomponi(byte, prima, s);
      const dopo = await Flac.leggiFlacDaByte(file);
      uguale(dopo.immagini.filter((i) => i.tipo === 3).length, 0, "nessuna copertina frontale");
      uguale(dopo.immagini.length, prima.immagini.length - 1, "le altre restano");
      uguale([file.length, dopo.audio.inizio], [byte.length, prima.audio.inizio], "stessa dimensione, audio fermo");
      daConfrontare(es.nome, "senza-copertina", file, prima.campi, dopo);
    });
  }

  // ---------------- casi particolari ----------------
  prova("FLAC: i commenti non toccati restano identici e nello stesso ordine, anche con i nomi minuscoli", async () => {
    const byte = esempio("12");
    const prima = await Flac.leggiFlacDaByte(byte);
    const s = FlacScrittura.costruisci(prima, { titolo: "Nuovo" });
    const dopo = await Flac.leggiFlacDaByte(ricomponi(byte, prima, s));
    uguale(dopo.commenti.voci.length, prima.commenti.voci.length, "numero dei commenti");
    dopo.commenti.voci.forEach((v, i) => {
      if (i === 0) uguale([v.nome, v.valore], ["title", "Nuovo"], "il titolo tiene il suo nome minuscolo");
      else vero(uguali(v.grezzo, prima.commenti.voci[i].grezzo), `commento ${prima.commenti.voci[i].nome} identico`);
    });
  });

  prova("FLAC: più artisti diventano più commenti; il totale tiene il nome che aveva (TOTALTRACKS)", async () => {
    const byte = esempio("14");
    const prima = await Flac.leggiFlacDaByte(byte);
    const s = FlacScrittura.costruisci(prima, { artista: "Uno; Due", traccia: ["6", "9"], anno: "2001" });
    const dopo = await Flac.leggiFlacDaByte(ricomponi(byte, prima, s));
    uguale(dopo.commenti.voci.map((v) => `${v.nome}=${v.valore}`),
      ["TITLE=Stretti stretti", "ARTIST=Uno", "ARTIST=Due", "YEAR=2001", "TRACKNUMBER=6", "TOTALTRACKS=9"], "commenti");
  });

  prova("FLAC: nome e indirizzo della licenza stanno tutti e due in LICENSE", async () => {
    const byte = esempio("11");
    const prima = await Flac.leggiFlacDaByte(byte);
    const s = FlacScrittura.costruisci(prima, { licenza: "CC BY-NC-SA 4.0", sitoLicenza: "https://creativecommons.org/licenses/by-nc-sa/4.0/" });
    const dopo = await Flac.leggiFlacDaByte(ricomponi(byte, prima, s));
    uguale([dopo.campi.licenza, dopo.campi.sitoLicenza], ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"], "licenza");
    uguale(dopo.commenti.voci.filter((v) => v.nome === "LICENSE").length, 2, "due commenti LICENSE");
  });

  prova("FLAC: se lo spazio libero non basta il file si riscrive, e l'audio resta identico", async () => {
    const byte = esempio("14");
    const prima = await Flac.leggiFlacDaByte(byte);
    for (const titolo of ["tagliatella ".repeat(300), "Stretti stret"]) {   // molto più lungo; più corto di 2 byte (non ci sta un blocco di spazio)
      const s = FlacScrittura.costruisci(prima, { titolo });
      uguale(s.sulPosto, false, "riscrittura");
      const file = ricomponi(byte, prima, s);
      const dopo = await Flac.leggiFlacDaByte(file);
      uguale(dopo.campi.titolo, titolo.trim(), "titolo");
      const ultimo = dopo.blocchi[dopo.blocchi.length - 1];
      uguale([ultimo.tipo, ultimo.lunghezza], [Flac.T.PADDING, FlacScrittura.RIEMPIMENTO], "spazio libero nuovo");
      vero(uguali(file.subarray(dopo.audio.inizio), byte.subarray(prima.audio.inizio)), "audio identico");
    }
    // e dopo la riscrittura c'è spazio: il salvataggio seguente avviene sul posto
    const s1 = FlacScrittura.costruisci(prima, { titolo: "Stretti stret" });
    const file1 = ricomponi(byte, prima, s1);
    const l1 = await Flac.leggiFlacDaByte(file1);
    vero(FlacScrittura.costruisci(l1, { album: "Un album nuovo" }).sulPosto, "il secondo salvataggio è sul posto");
  });

  prova("FLAC senza tag: i nuovi commenti vanno subito dopo STREAMINFO", async () => {
    const byte = esempio("10");
    const prima = await Flac.leggiFlacDaByte(byte);
    const s = FlacScrittura.costruisci(prima, { titolo: "Primo tag" });
    const dopo = await Flac.leggiFlacDaByte(ricomponi(byte, prima, s));
    uguale(dopo.blocchi.map((b) => b.nome), ["STREAMINFO", "VORBIS_COMMENT", "PADDING"], "ordine dei blocchi");
    uguale(dopo.campi, { titolo: "Primo tag" }, "campi");
  });

  prova("FLAC con un vecchio ID3v1 in coda: si riconosce e si conserva", async () => {
    const coda = new Uint8Array(128); coda.set([0x54, 0x41, 0x47], 0); coda.set([0x43, 0x69, 0x61, 0x6F], 3);
    const byte = unisci(esempio("11"), coda);
    const prima = await Flac.leggiFlacDaByte(byte);
    uguale(prima.altri, ["ID3v1"], "altri dati");
    uguale(prima.audio.fine, byte.length - 128, "fine dell'audio");
    const s = FlacScrittura.costruisci(prima, { titolo: "tagliatella ".repeat(200) });
    const file = ricomponi(byte, prima, s);
    vero(uguali(file.subarray(file.length - 128), coda), "la coda è rimasta");
  });

  prova("FLAC: il browser riesce a decodificare l'audio dei file scritti", async () => {
    const Contesto = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    vero(Contesto, "questo browser sa decodificare l'audio");
    const ctx = new Contesto(1, 44100, 44100);
    const decodifica = async (b) => (await ctx.decodeAudioData(b.slice().buffer)).length;
    const originale = await decodifica(esempio("11"));
    uguale(originale, 6 * 4096, "campioni dell'originale");
    for (const [nome, s] of Object.entries(scritti)) uguale(await decodifica(byteDa64(s.base64)), originale, "campioni di " + nome);
  });

  prova("(aggiunge i FLAC al confronto con mutagen)", () => {
    for (const [id, nuovi] of [["letture", letture], ["scritti", scritti]]) {
      const pre = document.getElementById(id);
      const gia = pre.textContent ? JSON.parse(pre.textContent) : {};
      pre.textContent = JSON.stringify({ ...gia, ...nuovi });
    }
  });
})();
