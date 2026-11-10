/* ==========================================================================
   Tag-liatelle · prove della lettura MP3 (ID3)
   ========================================================================== */
(function () {
  "use strict";
  const B = Binario;
  const enc = (s) => new TextEncoder().encode(s);

  // ---------------- attrezzi per i byte ----------------
  prova("syncsafe: 4 byte da 7 bit", () => {
    uguale(B.syncsafe(new Uint8Array([0, 0, 2, 1]), 0), 257);
    uguale(B.syncsafe(new Uint8Array([0x7F, 0x7F, 0x7F, 0x7F]), 0), 268435455);
  });
  prova("Latin-1 vero (non Windows-1252)", () => {
    uguale(B.testo(new Uint8Array([0x63, 0x61, 0x66, 0x66, 0xE8, 0x80]), 0), "caffè\u0080");
  });
  prova("UTF-16 con BOM in entrambi gli ordini", () => {
    uguale(B.testo(new Uint8Array([0xFF, 0xFE, 0xE0, 0x00]), 1), "à");
    uguale(B.testo(new Uint8Array([0xFE, 0xFF, 0x00, 0xE0]), 1), "à");
    uguale(B.testo(new Uint8Array([0x00, 0xE0]), 2), "à");
  });
  prova("UTF-8 e più valori separati da zero", () => {
    uguale(B.testi(new Uint8Array([...enc("Ève"), 0, ...enc("Øy"), 0]), 3), ["Ève", "Øy"]);
  });
  prova("UTF-16: lo zero di separazione sta su posizioni pari", () => {
    // "Ā" in UTF-16LE è 00 01: il suo 00 non deve essere preso per una fine
    uguale(B.testi(new Uint8Array([0xFF, 0xFE, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xFE, 0x61, 0x00]), 1), ["Ā", "a"]);
  });
  prova("risincronizza: FF 00 torna FF", () => {
    uguale(Array.from(B.risincronizza(new Uint8Array([1, 0xFF, 0x00, 0xE0, 0xFF, 0x00, 0x00, 2]))), [1, 0xFF, 0xE0, 0xFF, 0x00, 2]);
  });

  // ---------------- generi ----------------
  prova("generi: numeri, parentesi, Remix e Cover", () => {
    uguale(Id3.nomeGenere("(80)"), "Folk");
    uguale(Id3.nomeGenere("17"), "Rock");
    uguale(Id3.nomeGenere("(17)Rock"), "Rock");
    uguale(Id3.nomeGenere("(4)(17)"), "Disco; Rock");
    uguale(Id3.nomeGenere("RX"), "Remix");
    uguale(Id3.nomeGenere("((da camera)"), "(da camera)");
    uguale(Id3.nomeGenere("Cantautorato"), "Cantautorato");
  });

  // ---------------- i file di esempio ----------------
  const letture = {};
  for (const es of ESEMPI) {
    const atteso = ATTESO[es.nome];
    const byte = byteDa64(es.base64);

    prova(`${es.nome}: ${atteso.descrizione}`, async () => {
      const r = await Id3.leggiMp3DaByte(byte);
      const immagini = r.immagini.map((i) => ({ tipo: i.tipo, mime: i.mime, byte: i.byte }));
      letture[es.nome] = {
        versione: r.tag ? r.tag.versione : null, campi: r.campi, immagini,
        personalizzati: r.personalizzati, altri: r.altri, id3v1: r.v1, audio: r.audio,
      };
      uguale(r.tag ? r.tag.versione : null, atteso.versione, "versione");
      uguale(r.campi, atteso.campi, "campi");
      uguale(immagini, atteso.immagini, "immagini");
      uguale(r.personalizzati, atteso.personalizzati, "campi personalizzati");
      uguale(r.altri, atteso.altri, "altri dati conservati");
      uguale(r.v1, atteso.id3v1, "ID3v1");
      uguale(r.audio, atteso.audio, "posizione dell'audio");
      if (atteso.avvisi) vero(r.avvisi.length > 0, "c'è un avviso");
      else uguale(r.avvisi, [], "avvisi");
      for (const i of r.immagini) {
        const firma = i.mime === "image/png" ? [0x89, 0x50, 0x4E, 0x47] : [0xFF, 0xD8, 0xFF];
        uguale(Array.from(i.dati.subarray(0, firma.length)), firma, "inizio dell'immagine " + i.mime);
      }
    });
  }

  prova("legge solo i tag: dell'audio al massimo un'occhiata ai primi 10 e agli ultimi 128 byte", async () => {
    for (const es of ESEMPI) {
      const byte = byteDa64(es.base64);
      const atteso = ATTESO[es.nome].audio;
      const chiesti = [];
      await Id3.leggiMp3(async (i, f) => { chiesti.push([i, f]); return byte.subarray(i, f); }, byte.length);
      for (const [i, f] of chiesti) {
        const occhiata = (i === 0 && f <= 10) || (i === byte.length - 128 && f === byte.length);
        const toccaAudio = f > atteso.inizio && i < atteso.fine;
        vero(occhiata || !toccaAudio, `${es.nome}: lettura ${i}-${f} dentro l'audio (${atteso.inizio}-${atteso.fine})`);
      }
      vero(chiesti.length <= 3, `${es.nome}: troppe letture (${chiesti.length})`);
    }
  });

  prova("file troncati o rovinati: nessun errore, al massimo un avviso", async () => {
    for (const es of ESEMPI) {
      const byte = byteDa64(es.base64);
      for (const taglio of [0, 3, 9, 10, 11, 25, 60, 200, 700]) {
        await Id3.leggiMp3DaByte(byte.slice(0, Math.min(taglio, byte.length)));
      }
      // byte rovinati a caso dentro il tag (sempre gli stessi, per poter ripetere la prova)
      let seme = 7;
      const caso = () => (seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let k = 0; k < 40; k++) {
        const copia = byte.slice();
        for (let j = 0; j < 8; j++) copia[10 + Math.floor(caso() * 300)] = Math.floor(caso() * 256);
        await Id3.leggiMp3DaByte(copia);
      }
    }
  });

  // al termine, i dati letti restano nella pagina per il confronto con mutagen
  prova("(scrive le letture per il confronto con mutagen)", () => {
    document.getElementById("letture").textContent = JSON.stringify(letture);
  });
})();
