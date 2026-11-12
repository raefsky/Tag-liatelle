/* ==========================================================================
   Tag-liatelle · salvataggio sicuro
   L'ordine è sempre questo:
     1. permesso di scrittura (sulla cartella del file);
     2. il file è ancora quello che abbiamo letto? altrimenti ci si ferma;
     3. COPIA DI SICUREZZA in "Tag-liatelle copie" (e verifica della copia);
     4. scrittura dei nuovi tag (MP3 o FLAC: vedi formati.js), con l'audio
        originale. Il browser scrive in un file temporaneo e lo sostituisce
        all'originale solo alla fine: se qualcosa va storto a metà,
        l'originale resta intatto;
     5. VERIFICA: si rilegge il file; i campi devono essere quelli voluti e
        l'audio identico, byte per byte (impronta SHA-256). Se no, si
        rimette automaticamente la copia di sicurezza.
   Copie: al massimo due per file, "(originale)" e "(ultima)".
   ========================================================================== */
(function (radice) {
  "use strict";

  const COPIE = "Tag-liatelle copie";

  /** Errore da mostrare così com'è: il testo è già scritto per l'utente. */
  class ErroreChiaro extends Error {}

  // ------------------------------------------------------------------
  // Piccoli attrezzi
  // ------------------------------------------------------------------
  const esadecimale = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  async function impronta(blob) {
    return esadecimale(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  }
  function nomiCopie(nome) {
    const punto = nome.lastIndexOf(".");
    const base = punto > 0 ? nome.slice(0, punto) : nome;
    const est = punto > 0 ? nome.slice(punto) : "";
    return { originale: `${base} (originale)${est}`, ultima: `${base} (ultima)${est}` };
  }
  async function esiste(cartella, nome) {
    try { return await cartella.getFileHandle(nome); } catch (e) { return null; }
  }
  async function scriviFile(maniglia, contenuto) {
    const w = await maniglia.createWritable();
    try {
      await w.write(contenuto);
      await w.close();
    } catch (e) {
      try { await w.abort(); } catch (e2) { /* già chiuso */ }
      throw e;
    }
  }
  /** Scrive solo un pezzo dentro il file, lasciando com'è tutto il resto. */
  async function scriviPezzo(maniglia, posizione, dati) {
    const w = await maniglia.createWritable({ keepExistingData: true });
    try {
      await w.write({ type: "write", position: posizione, data: dati });
      await w.close();
    } catch (e) {
      try { await w.abort(); } catch (e2) { /* già chiuso */ }
      throw e;
    }
  }
  async function permesso(maniglia) {
    const opz = { mode: "readwrite" };
    if ((await maniglia.queryPermission(opz)) === "granted") return true;
    return (await maniglia.requestPermission(opz)) === "granted";
  }

  // ------------------------------------------------------------------
  // 1. Accesso in scrittura alla cartella del file
  // ------------------------------------------------------------------
  const cartelleConcesse = []; // cartelle scelte per i file aperti uno per uno

  /**
   * Restituisce { cartella, maniglia } con permesso di scrittura.
   * Va chiamata SUBITO dopo il clic dell'utente: il browser chiede il permesso solo allora.
   */
  async function accesso(traccia) {
    if (traccia.accesso) {
      if (await permesso(traccia.accesso.cartella)) return traccia.accesso;
    }
    if (traccia.radice) {
      // aperta con "Apri cartella" o trascinando una cartella: un solo permesso per tutta la cartella
      if (!(await permesso(traccia.radice))) throw new ErroreChiaro("Senza il permesso di modifica non posso salvare. Il file non è stato toccato.");
      let cartella = traccia.radice;
      for (const nome of traccia.dentro || []) cartella = await cartella.getDirectoryHandle(nome);
      traccia.accesso = { cartella, maniglia: await cartella.getFileHandle(traccia.nome) };
      return traccia.accesso;
    }
    if (!traccia.maniglia) throw new ErroreChiaro("Questo browser non può salvare nei file: puoi scaricare una copia modificata.");
    // aperta come file singolo: serve la cartella che lo contiene
    for (const c of cartelleConcesse) {
      const trovato = await dentroCartella(c, traccia.maniglia);
      if (trovato && (await permesso(c))) return (traccia.accesso = trovato);
    }
    let scelta;
    try {
      scelta = await radice.showDirectoryPicker({ startIn: traccia.maniglia, mode: "readwrite" });
    } catch (e) {
      if (e && e.name === "AbortError") throw new ErroreChiaro("Salvataggio annullato: serve la cartella del file per mettere al sicuro la copia. Il file non è stato toccato.");
      if (e && e.name === "TypeMismatchError") throw new ErroreChiaro("Hai scelto un file: qui serve la cartella che contiene il brano. Il file non è stato toccato.");
      throw e;
    }
    const trovato = await dentroCartella(scelta, traccia.maniglia);
    if (!trovato) throw new ErroreChiaro(`La cartella «${scelta.name}» non contiene il file «${traccia.nome}». Scegli la cartella in cui si trova il brano.`);
    cartelleConcesse.push(scelta);
    return (traccia.accesso = trovato);
  }

  /** Se il file sta dentro la cartella, restituisce la sua cartella e la sua maniglia. */
  async function dentroCartella(cartella, maniglia) {
    const percorso = await cartella.resolve(maniglia);
    if (!percorso) return null;
    let c = cartella;
    for (const nome of percorso.slice(0, -1)) c = await c.getDirectoryHandle(nome);
    return { cartella: c, maniglia: await c.getFileHandle(percorso[percorso.length - 1]) };
  }

  // ------------------------------------------------------------------
  // 2-5. Salvataggio
  // ------------------------------------------------------------------
  /**
   * @param traccia     la traccia (con nome, file letto all'apertura, accesso…)
   * @param modifiche   { campo: valore }
   * @param passo       funzione chiamata a ogni passo, per mostrare l'avanzamento
   */
  async function salva(traccia, modifiche, passo = () => {}, opzioni = {}) {
    const { cartella, maniglia } = await accesso(traccia);

    // 2. il file è ancora quello letto all'apertura?
    passo("controllo");
    const prima = await maniglia.getFile();
    if (traccia.file && (prima.size !== traccia.file.size || prima.lastModified !== traccia.file.lastModified)) {
      throw new ErroreChiaro("Il file è stato cambiato da un altro programma dopo l'apertura. Per sicurezza non salvo: riaprilo e riprova.");
    }
    const formato = Formati.per(traccia.formato);
    const lettura = await formato.leggi(Apertura.lettorePezzi(prima), prima.size);
    // anche se data e dimensione sono uguali, i tag devono essere quelli letti all'apertura:
    // se un altro programma li ha cambiati, scrivendo cancelleremmo il suo lavoro
    if (traccia.lettura && impronteTag(lettura) !== impronteTag(traccia.lettura)) {
      throw new ErroreChiaro("I tag del file sono stati cambiati da un altro programma dopo l'apertura. Per sicurezza non salvo: riaprilo e riprova.");
    }
    const c = formato.controlla(lettura, opzioni);
    if (!c.ok) throw new ErroreChiaro(c.motivo);
    let nuovo;
    try { nuovo = formato.prepara(lettura, modifiche, opzioni); }
    catch (e) { throw new ErroreChiaro(e.message + " Il file non è stato toccato."); }
    const improntaAudio = await impronta(prima.slice(lettura.audio.inizio, lettura.audio.fine));
    const improntaFile = await impronta(prima);

    // 3. copia di sicurezza
    passo("copia");
    const copie = await cartella.getDirectoryHandle(COPIE, { create: true });
    const nomi = nomiCopie(traccia.nome);
    const giaOriginale = await esiste(copie, nomi.originale);
    const nomeCopia = giaOriginale ? nomi.ultima : nomi.originale;
    const copia = await copie.getFileHandle(nomeCopia, { create: true });
    await scriviFile(copia, prima);
    const copiaScritta = await copia.getFile();
    if (copiaScritta.size !== prima.size || (await impronta(copiaScritta)) !== improntaFile) {
      throw new ErroreChiaro("La copia di sicurezza non è venuta identica all'originale: per prudenza non salvo. Il file non è stato toccato.");
    }

    // 4. scrittura
    //    "sul posto": i nuovi tag occupano lo stesso spazio dei vecchi, quindi si scrive
    //    solo quel pezzo e l'audio non si sposta. Altrimenti si scrive il file intero.
    //    In tutti e due i casi il browser lavora su un file temporaneo e lo sostituisce
    //    all'originale solo alla fine.
    passo("scrittura");
    const nuovoFile = new Blob(nuovo.parti(prima));
    if (nuovo.sulPosto && nuovoFile.size === prima.size) await scriviPezzo(maniglia, nuovo.sulPosto.posizione, nuovo.sulPosto.dati);
    else await scriviFile(maniglia, nuovoFile);

    // 5. verifica
    passo("verifica");
    const dopo = await maniglia.getFile();
    const riletto = await formato.leggi(Apertura.lettorePezzi(dopo), dopo.size);
    const problemi = [];
    if (riletto.avvisi.length) problemi.push("i tag scritti non si rileggono bene");
    if (dopo.size !== nuovoFile.size) problemi.push("la dimensione del file non è quella prevista");
    if (JSON.stringify(ordina(riletto.campi)) !== JSON.stringify(ordina(nuovo.attesi))) problemi.push("i campi riletti non sono quelli voluti");
    if ((await impronta(dopo.slice(riletto.audio.inizio, riletto.audio.fine))) !== improntaAudio) problemi.push("l'audio non è identico a prima");
    // i tag sul disco devono essere esattamente quelli preparati (campi, copertina, tutto)
    for (const k of nuovo.controlli) {
      const da = k.posizione < 0 ? dopo.size + k.posizione : k.posizione;
      const letti = new Uint8Array(await dopo.slice(da, da + k.dati.length).arrayBuffer());
      if (letti.length !== k.dati.length || letti.some((x, i) => x !== k.dati[i])) { problemi.push("i tag sul disco non sono quelli preparati"); break; }
    }
    if (problemi.length) {
      // qualcosa non torna: si rimette subito la copia
      await scriviFile(maniglia, copiaScritta);
      const ripristinato = await maniglia.getFile();
      const ok = (await impronta(ripristinato)) === improntaFile;
      throw new ErroreChiaro(`Dopo il salvataggio ho trovato un problema (${problemi.join("; ")}). ` +
        (ok ? "Ho rimesso il file com'era prima, usando la copia di sicurezza." : `ATTENZIONE: non sono riuscito a rimettere il file com'era. La copia di sicurezza è in «${COPIE}/${nomeCopia}».`));
    }
    return { file: dopo, lettura: riletto, copia: nomeCopia, note: nuovo.note, sulPosto: !!nuovo.sulPosto };
  }

  /** Un riassunto dei tag letti: campi, personalizzati, immagini, posizione dell'audio. */
  const impronteTag = (l) => JSON.stringify([ordina(l.campi), l.personalizzati, (l.immagini || []).map((i) => [i.tipo, i.mime, i.byte]), l.audio, l.altri]);

  function ordina(o) {
    const out = {};
    for (const k of Object.keys(o).sort()) out[k] = o[k];
    return out;
  }

  // ------------------------------------------------------------------
  // Copie: elenco, ripristino, eliminazione, finestra per vederle
  // ------------------------------------------------------------------
  /** Le copie esistenti di un file. Non chiede permessi: se non può leggere, risponde null. */
  async function copieDi(traccia) {
    try {
      let cartella = traccia.accesso && traccia.accesso.cartella;
      if (!cartella && traccia.radice && (await traccia.radice.queryPermission({ mode: "read" })) === "granted") {
        cartella = traccia.radice;
        for (const nome of traccia.dentro || []) cartella = await cartella.getDirectoryHandle(nome);
      }
      if (!cartella) return null;
      let copie;
      try { copie = await cartella.getDirectoryHandle(COPIE); } catch (e) { return { cartella: null, elenco: [] }; }
      const nomi = nomiCopie(traccia.nome);
      const elenco = [];
      for (const quale of ["originale", "ultima"]) {
        const m = await esiste(copie, nomi[quale]);
        if (m) { const f = await m.getFile(); elenco.push({ quale, nome: nomi[quale], byte: f.size, data: new Date(f.lastModified) }); }
      }
      return { cartella: copie, elenco };
    } catch (e) {
      return null;
    }
  }

  /**
   * Rimette il file com'era in una copia. Lo stato attuale diventa la nuova "ultima",
   * così anche il ripristino si può annullare.
   */
  async function ripristina(traccia, quale, passo = () => {}) {
    const { cartella, maniglia } = await accesso(traccia);
    const copie = await cartella.getDirectoryHandle(COPIE);
    const nomi = nomiCopie(traccia.nome);
    const mCopia = await esiste(copie, nomi[quale]);
    if (!mCopia) throw new ErroreChiaro("Non trovo più la copia di sicurezza: forse è stata cancellata.");
    passo("copia");
    // la copia va prima letta in memoria: se è l'"ultima", la stiamo per sostituire
    const contenuto = new Uint8Array(await (await mCopia.getFile()).arrayBuffer());
    const improntaCopia = await impronta(new Blob([contenuto]));
    const attuale = await maniglia.getFile();
    const mUltima = await copie.getFileHandle(nomi.ultima, { create: true });
    await scriviFile(mUltima, attuale);
    passo("scrittura");
    await scriviFile(maniglia, new Blob([contenuto]));
    passo("verifica");
    const dopo = await maniglia.getFile();
    if ((await impronta(dopo)) !== improntaCopia) throw new ErroreChiaro(`Il ripristino non è riuscito. La copia è ancora in «${COPIE}».`);
    return { file: dopo, lettura: await Formati.per(traccia.formato).leggi(Apertura.lettorePezzi(dopo), dopo.size) };
  }

  /** Cancella le copie di un file (definitivamente) e la cartella delle copie, se resta vuota. */
  async function eliminaCopie(traccia) {
    const { cartella } = await accesso(traccia);
    let copie;
    try { copie = await cartella.getDirectoryHandle(COPIE); } catch (e) { return 0; }
    const nomi = nomiCopie(traccia.nome);
    let tolte = 0;
    for (const nome of [nomi.originale, nomi.ultima]) {
      if (await esiste(copie, nome)) { await copie.removeEntry(nome); tolte++; }
    }
    let vuota = true;
    for await (const _ of copie.keys()) { vuota = false; break; }
    if (vuota) await cartella.removeEntry(COPIE);
    return tolte;
  }

  /** Apre la finestra del sistema già dentro la cartella delle copie. */
  async function mostraCopie(cartellaCopie) {
    try { await radice.showDirectoryPicker({ startIn: cartellaCopie, mode: "read" }); }
    catch (e) { /* chiusa con Annulla: è il modo normale di chiuderla */ }
  }

  // ------------------------------------------------------------------
  // Rinomina
  // Il contenuto del file non cambia: cambia solo il nome. Se il browser sa
  // rinominare (move), si usa quello; altrimenti si crea il file con il nome
  // nuovo, si controlla che sia identico byte per byte e solo allora si
  // toglie quello vecchio. Anche le copie di sicurezza seguono il nuovo nome.
  // ------------------------------------------------------------------
  /** I nomi dei file nella cartella della traccia, se si possono leggere senza chiedere permessi (altrimenti null). */
  async function nomiInCartella(traccia) {
    try {
      let cartella = traccia.accesso && traccia.accesso.cartella;
      if (!cartella && traccia.radice && (await traccia.radice.queryPermission({ mode: "read" })) === "granted") {
        cartella = traccia.radice;
        for (const nome of traccia.dentro || []) cartella = await cartella.getDirectoryHandle(nome);
      }
      if (!cartella) return null;
      const nomi = [];
      for await (const [nome, voce] of cartella.entries()) if (voce.kind === "file") nomi.push(nome);
      return nomi;
    } catch (e) { return null; }
  }

  async function sposta(cartella, maniglia, vecchio, nuovo) {
    const soloMaiuscole = vecchio.toLowerCase() === nuovo.toLowerCase();
    if (!soloMaiuscole && (await esiste(cartella, nuovo))) {
      throw new ErroreChiaro(`Nella cartella c'è già un file che si chiama «${nuovo}»: non lo sovrascrivo.`);
    }
    if (typeof maniglia.move === "function") {
      try {
        if (soloMaiuscole) {
          // il Mac non distingue "a.mp3" da "A.mp3": si passa da un nome provvisorio
          const provvisorio = `.tagliatelle-${Date.now()}-${nuovo}`;
          await maniglia.move(provvisorio);
          await maniglia.move(nuovo);
        } else {
          await maniglia.move(nuovo);
        }
        return await cartella.getFileHandle(nuovo);
      } catch (e) {
        if (!(e && (e.name === "NotSupportedError" || e.name === "TypeError"))) throw e;
        // il browser dichiara "move" ma non lo sa fare qui: si prosegue con la copia
      }
    }
    if (soloMaiuscole) throw new ErroreChiaro("Questo browser non sa cambiare solo le maiuscole del nome di un file.");
    const prima = await maniglia.getFile();
    const improntaPrima = await impronta(prima);
    const nuova = await cartella.getFileHandle(nuovo, { create: true });
    try {
      await scriviFile(nuova, prima);
      const dopo = await nuova.getFile();
      if (dopo.size !== prima.size || (await impronta(dopo)) !== improntaPrima) throw new ErroreChiaro("La copia con il nome nuovo non è venuta identica.");
    } catch (e) {
      try { await cartella.removeEntry(nuovo); } catch (e2) { /* niente da togliere */ }
      throw e instanceof ErroreChiaro ? e : new ErroreChiaro("Non sono riuscito a creare il file con il nome nuovo. Il file è rimasto com'era.");
    }
    await cartella.removeEntry(vecchio);
    return nuova;
  }

  /**
   * Rinomina il file di una traccia (e le sue copie di sicurezza).
   * Aggiorna nome, percorso, maniglia e file della traccia.
   */
  async function rinomina(traccia, nuovo) {
    const { cartella, maniglia } = await accesso(traccia);
    const vecchio = traccia.nome;
    if (vecchio === nuovo) return traccia;
    const prima = await maniglia.getFile();
    if (traccia.file && (prima.size !== traccia.file.size || prima.lastModified !== traccia.file.lastModified)) {
      throw new ErroreChiaro(`Il file «${vecchio}» è stato cambiato da un altro programma dopo l'apertura: riaprilo prima di rinominarlo.`);
    }
    const nuovaManiglia = await sposta(cartella, maniglia, vecchio, nuovo);
    // le copie di sicurezza seguono il file (se un nome è già preso, quella copia resta col vecchio nome)
    try {
      const copie = await cartella.getDirectoryHandle(COPIE);
      const nv = nomiCopie(vecchio), nn = nomiCopie(nuovo);
      for (const quale of ["originale", "ultima"]) {
        const m = await esiste(copie, nv[quale]);
        if (m && !(await esiste(copie, nn[quale]))) await sposta(copie, m, nv[quale], nn[quale]);
      }
    } catch (e) { /* nessuna copia: va bene così */ }
    const file = await nuovaManiglia.getFile();
    if (file.size !== prima.size) throw new ErroreChiaro(`Dopo la rinomina «${nuovo}» non ha la dimensione giusta: controllalo.`);
    traccia.nome = nuovo;
    traccia.percorso = traccia.percorso.replace(/[^/]*$/, nuovo);
    traccia.maniglia = nuovaManiglia;
    traccia.accesso = { cartella, maniglia: nuovaManiglia };
    traccia.file = file;
    return traccia;
  }

  // ------------------------------------------------------------------
  // Senza File System Access API: una copia modificata da scaricare
  // ------------------------------------------------------------------
  async function copiaDaScaricare(traccia, modifiche, opzioni = {}) {
    const f = traccia.file;
    const formato = Formati.per(traccia.formato);
    const lettura = await formato.leggi(Apertura.lettorePezzi(f), f.size);
    let nuovo;
    try { nuovo = formato.prepara(lettura, modifiche, opzioni); }
    catch (e) { throw new ErroreChiaro(e.message); }
    const blob = new Blob(nuovo.parti(f), { type: f.type || formato.mime });
    // verifica prima di consegnarla
    const riletto = await formato.leggi(Apertura.lettorePezzi(blob), blob.size);
    const prima = await impronta(f.slice(lettura.audio.inizio, lettura.audio.fine));
    const dopo = await impronta(blob.slice(riletto.audio.inizio, riletto.audio.fine));
    if (prima !== dopo || riletto.avvisi.length) throw new ErroreChiaro("La copia modificata non ha superato la verifica: non la scarico.");
    return { blob, lettura: riletto };
  }

  radice.Salvataggio = { salva, accesso, copieDi, ripristina, eliminaCopie, mostraCopie, copiaDaScaricare, rinomina, nomiInCartella, ErroreChiaro, COPIE, nomiCopie };
})(typeof globalThis !== "undefined" ? globalThis : this);
