/* ==========================================================================
   Tag-liatelle · prove della modifica a gruppi
   ========================================================================== */
(function () {
  "use strict";
  const uguali = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const tutti = [...ESEMPI.map((e) => ({ ...e, formato: "MP3" })), ...ESEMPI_FLAC.map((e) => ({ ...e, formato: "FLAC" }))];
  const trova = (inizio) => tutti.find((e) => e.nome.startsWith(inizio));
  async function leggi(e) {
    const byte = byteDa64(e.base64);
    return { e, byte, l: await Formati.per(e.formato).leggi(async (i, f) => byte.subarray(i, f), byte.length) };
  }
  const scritti = {};

  prova("gruppo: riassunto dei campi uguali e diversi (MP3 02 e FLAC 11, stesso album)", async () => {
    const a = await leggi(trova("02")), b = await leggi(trova("11"));
    const r = Gruppo.riassumi([a.l, b.l]);
    uguale(r.campi.album, { uguale: true, valore: "Canzoni d'autunno — vol. 2" }, "album");
    uguale(r.campi.disco, { uguale: true, valore: ["1", "2"] }, "disco");
    uguale(r.campi.traccia, { uguale: true, valore: "10" }, "il totale delle tracce (il numero non si riassume)");
    uguale(r.campi.anno, { uguale: true, valore: "2025" }, "anno");
    uguale(r.campi.editore, { uguale: true, valore: undefined }, "un campo vuoto in tutte");
    const c = await leggi(trova("04"));
    const r2 = Gruppo.riassumi([a.l, c.l]);
    uguale(r2.campi.album, { uguale: false, valori: 2 }, "album diversi");
    uguale(r2.campi.editore, { uguale: false, valori: 2 }, "editore in una sola");
    uguale(r2.copertina.uguale, false, "copertine diverse (una sì, una no)");
  });

  prova("gruppo: si cambia solo ciò che serve, traccia per traccia", async () => {
    const a = await leggi(trova("02")), b = await leggi(trova("11")), c = await leggi(trova("04"));
    const m = Gruppo.perTraccia({ album: "Nuovo album", genere: "Folk", traccia: { numera: { partenza: 1 }, totale: "3" }, editore: "" }, [a.l, b.l, c.l]);
    uguale(m[0], { album: "Nuovo album", traccia: ["1", "3"] }, "MP3 02: il genere era già Folk, l'editore non c'era");
    uguale(m[1], { album: "Nuovo album", traccia: ["2", "3"] }, "FLAC 11");
    uguale(m[2], { album: "Nuovo album", genere: "Folk", traccia: ["3", "3"], editore: "" }, "MP3 04: cambia il genere, l'editore si toglie");
  });

  prova("gruppo: solo il totale delle tracce, senza numerare", async () => {
    const a = await leggi(trova("02")), z = await leggi(trova("01"));
    const m = Gruppo.perTraccia({ traccia: { numera: null, totale: "12" } }, [a.l, z.l]);
    uguale(m[0], { traccia: ["2", "12"] }, "il numero resta, cambia il totale");
    uguale(m[1], {}, "senza numero il totale da solo non si scrive");
  });

  prova("gruppo: numerazione da un numero di partenza diverso da 1", async () => {
    const ls = await Promise.all(["02", "11", "14"].map((n) => leggi(trova(n))));
    const m = Gruppo.perTraccia({ traccia: { numera: { partenza: 7 }, totale: null } }, ls.map((x) => x.l));
    uguale(m.map((x) => x.traccia), [["7", "10"], ["8", "10"], ["9", "8"]], "numeri 7, 8, 9 con i totali di prima");
  });

  prova("gruppo: tutti i file di esempio insieme, MP3 e FLAC, con la stessa copertina", async () => {
    const scelti = [];
    for (const e of tutti) if (!ATTESO[e.nome].avvisi) scelti.push(await leggi(e));
    const c = document.createElement("canvas"); c.width = c.height = 400;
    const x = c.getContext("2d"); x.fillStyle = "#2B1F17"; x.fillRect(0, 0, 400, 400); x.fillStyle = "#E5A823"; x.fillRect(100, 100, 200, 200);
    const dati = await Immagini.produci(c, { sx: 0, sy: 0, lato: 400 }, 500, "image/jpeg", 85);
    const gruppo = {
      album: "Raccolta di prova", artistaAlbum: "Artisti vari", anno: "2027", editore: "Edizioni del Mattarello",
      licenza: "CC BY-NC-SA 4.0", sitoLicenza: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      traccia: { numera: { partenza: 1 }, totale: String(scelti.length) }, disco: ["1", "1"],
      copertina: { azione: "sostituisci", dati, mime: "image/jpeg" },
    };
    const mods = Gruppo.perTraccia(gruppo, scelti.map((s) => s.l));
    for (let i = 0; i < scelti.length; i++) {
      const { e, byte, l } = scelti[i];
      const F = Formati.per(e.formato);
      const prep = F.prepara(l, mods[i]);
      const file = new Uint8Array(await new Blob(prep.parti(new Blob([byte]))).arrayBuffer());
      const dopo = await F.leggi(async (a, b) => file.subarray(a, b), file.length);
      uguale(dopo.avvisi, [], e.nome + ": nessun avviso");
      uguale(dopo.campi, prep.attesi, e.nome + ": campi");
      uguale(dopo.campi.traccia, [String(i + 1), String(scelti.length)], e.nome + ": numero di traccia");
      uguale(dopo.campi.album, "Raccolta di prova", e.nome + ": album");
      const fronte = dopo.immagini.find((im) => im.tipo === 3);
      vero(fronte && uguali(fronte.dati, dati), e.nome + ": la stessa copertina");
      vero(uguali(file.subarray(dopo.audio.inizio, dopo.audio.fine), byte.subarray(l.audio.inizio, l.audio.fine)), e.nome + ": audio identico");
      scritti[e.nome + "#gruppo"] = {
        base64: b64(file), campi: prep.attesi, versione: e.formato === "MP3" ? dopo.tag.versione : "FLAC", audio: ATTESO[e.nome].audio,
        immagini: dopo.immagini.map((im) => ({ tipo: im.tipo, mime: im.mime, byte: im.byte })),
      };
    }
  });

  prova("(aggiunge i file del gruppo al confronto con mutagen)", () => {
    const pre = document.getElementById("scritti");
    const gia = pre.textContent ? JSON.parse(pre.textContent) : {};
    pre.textContent = JSON.stringify({ ...gia, ...scritti });
  });
})();
