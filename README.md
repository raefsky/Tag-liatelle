<p align="center"><img src="logo/tag-liatelle-logo.svg" alt="Tag-liatelle" width="420"></p>

<p align="center"><em>Metadati e copertine per i tuoi file audio, cotti al dente.</em></p>

**Tag-liatelle** legge e scrive i metadati (i "tag") e la copertina dei file audio **MP3** e **FLAC**: titolo, artista e album, ma anche crediti, copyright, etichetta, licenza e codici. Serve a preparare uscite musicali complete.

Funziona nel browser, sul tuo computer, senza installare niente.

---

## Indice

1. [Tutto avviene sul tuo computer](#tutto-avviene-sul-tuo-computer)
2. [Come si apre](#come-si-apre)
3. [Browser compatibili](#browser-compatibili)
4. [Il primo uso, in cinque passi](#il-primo-uso-in-cinque-passi)
5. [Aprire i file](#aprire-i-file)
6. [Modificare e salvare](#modificare-e-salvare)
7. [Copie di sicurezza e ripristino](#copie-di-sicurezza-e-ripristino)
8. [I campi](#i-campi)
9. [La copertina](#la-copertina)
10. [I file FLAC](#i-file-flac)
11. [Più tracce insieme](#più-tracce-insieme)
12. [Modelli di edizione](#modelli-di-edizione)
13. [Strumenti](#strumenti)
14. [Scorciatoie da tastiera](#scorciatoie-da-tastiera)
15. [Se qualcosa non va](#se-qualcosa-non-va)
16. [Per chi sviluppa](#per-chi-sviluppa)
17. [Licenza e crediti](#licenza-e-crediti)

---

## Tutto avviene sul tuo computer

- I file vengono letti e modificati nel tuo browser: **non vengono mai caricati su internet**.
- Non servono account né iscrizioni, e non c'è nessuna statistica sul tuo uso.
- Caratteri e programmi sono già dentro la pagina: **funziona anche senza connessione**.
- Nel browser restano soltanto due cose: l'ultima cartella da cui hai aperto i file (per ripartire da lì) e i tuoi modelli di edizione.

**L'audio non viene mai toccato.** Tag-liatelle riscrive solo la parte dei tag e delle immagini. Dopo ogni salvataggio controlla che l'audio sia identico a prima, byte per byte.

## Come si apre

Fai **doppio clic** sul file `index.html` della versione che usi (per esempio `rilasci/1.0.0/index.html`). È un file unico, che contiene tutto: puoi copiarlo dove vuoi, anche su una chiavetta.

## Browser compatibili

| Browser | Cosa puoi fare |
|---|---|
| **Chrome** 86 o successivo | Tutto: apri intere cartelle e salvi direttamente nei file. Su Windows, Mac, Linux e Chromebook. |
| **Edge** 86 o successivo | Tutto, come Chrome. Su Windows, Mac e Linux. |
| **Safari** e **Firefox** | Un file alla volta: lo apri, lo modifichi e scarichi una copia modificata. L'originale non viene toccato. |
| Telefoni e tablet | L'app è pensata per il computer: sullo schermo piccolo si legge, ma si salva solo scaricando una copia. |

Opera e Vivaldi, basati su Chrome, di solito funzionano, ma non sono stati provati. Brave tiene spenta la funzione che serve per salvare nei file.

## Il primo uso, in cinque passi

1. Fai una **copia** di una cartella di brani (le prime volte è meglio non lavorare sugli originali).
2. Apri `index.html` in Chrome o in Edge e premi **Apri cartella**.
3. Clicca una traccia nella pila a sinistra: a destra compare la sua **scheda**.
4. Cambia un campo, per esempio l'album, e premi **Salva…**. Leggi l'anteprima "prima e dopo" e premi **Scrivi nel file**.
5. Guarda il **timbro "Salvato"** e la cartella `Tag-liatelle copie` comparsa accanto ai brani.

## Aprire i file

- **Apri cartella**: apre una cartella con tutte le sue sottocartelle e sostituisce le schede già aperte. Nella finestra del Mac clicca **una volta** sulla cartella e poi su "Apri", senza entrare nella cartella e senza selezionare i file. Se per sbaglio scegli un file, Tag-liatelle te lo dice.
- **Apri file**: aggiunge uno o più file alle schede già aperte.
- **Trascinare**: puoi trascinare file o cartelle sulla pagina.
- Le cartelle nascoste, la cartella `Tag-liatelle copie` e i file invisibili `._…` del Mac vengono saltati.
- Tag-liatelle ricorda l'ultima cartella usata, così la finestra si apre lì.
- La prima volta il browser chiede il permesso di **vedere** i file; quando salvi, chiede il permesso di **modificarli**.

La pila delle tracce è ordinata per cartella, numero di disco, numero di traccia e nome del file.

## Modificare e salvare

### I campi modificati

- Un campo modificato si sottolinea in giallo e porta la scritta "modificato". Nella pila, la traccia ha un pallino giallo.
- "Annulla le modifiche" riporta la scheda com'è nel file.
- Se chiudi la pagina con modifiche non salvate, il browser ti avvisa.

### I controlli

Sotto un campo può comparire un messaggio:

- **✗ in rosso**: il valore non va bene, e **il file non si salva** finché non lo correggi. Premendo "Salva…" il cursore va direttamente sul campo.
- **⚠ in grigio**: il valore è sospetto ma si può salvare, per esempio un codice a barre con l'ultima cifra sbagliata. L'avviso compare anche nell'anteprima.

### L'anteprima

**Salva…** (oppure ⌘ Cmd + S sul Mac, Ctrl + S su Windows e Linux) apre l'anteprima. Per ogni campo mostra il valore **prima** e **dopo**, e spiega cosa succederà. Si scrive solo dopo aver premuto **Scrivi nel file**.

### Il salvataggio

Il salvataggio fa quattro passi, che vedi spuntare uno alla volta:

1. **Controllo**: il file non deve essere stato cambiato da un altro programma dopo l'apertura. Se i suoi tag sono cambiati, Tag-liatelle si ferma e non sovrascrive il lavoro dell'altro programma.
2. **Copia di sicurezza** del file, controllata byte per byte.
3. **Scrittura** dei nuovi tag. Il browser scrive in un file temporaneo e lo sostituisce all'originale solo alla fine: se qualcosa si interrompe, l'originale resta intatto.
4. **Verifica**: si rileggono i tag, e l'audio deve essere identico. Se la verifica non passa, il file viene rimesso com'era in automatico.

### Cosa resta com'era

- **Tutti i dati che non modifichi**, anche quelli che Tag-liatelle non conosce: la scheda dice quali sono ("verranno conservati").
- **La versione dei tag**: negli MP3 un file ID3v2.3 resta ID3v2.3 e un ID3v2.4 resta ID3v2.4. I file senza tag, con ID3v2.2 o con il solo ID3v1 ricevono un tag ID3v2.3, con testo UTF-16, il più compatibile con Windows e con i lettori meno recenti.
- Se l'MP3 ha anche il vecchio tag **ID3v1**, viene aggiornato insieme. ID3v1 conosce pochi caratteri: quelli che non conosce diventano "?", e "—" diventa "-".

I file con i **dati rovinati** non si possono salvare: per non perdere niente, Tag-liatelle non ci scrive, e la scheda spiega perché.

### Safari e Firefox

Al posto di "Salva" c'è **Scarica la copia modificata**. La copia viene controllata prima di consegnarla, e l'originale non viene toccato.

## Copie di sicurezza e ripristino

- Prima di scrivere in un file, Tag-liatelle ne fa una copia nella cartella **`Tag-liatelle copie`**, accanto al file.
- Per ogni file si tengono **al massimo due copie**:
  - l'**originale**: il file com'era la prima volta che Tag-liatelle ci ha scritto. Non viene mai sostituita;
  - l'**ultima**: il file com'era prima dell'ultimo salvataggio. Viene sostituita a ogni nuovo salvataggio.
- Per i file aperti uno per uno, la prima volta il browser chiede di confermare la cartella che li contiene: serve per mettere lì le copie.
- Le copie **non si cancellano da sole**. Nella scheda compare il promemoria "Ricordati: hai una copia di sicurezza di questo file… se è tutto a posto, puoi cancellarla", con questi pulsanti:
  - **Mostra le copie**: apre la finestra del Mac dentro la cartella delle copie (il browser non può aprire direttamente il Finder: chiudila con "Annulla");
  - **Torna all'originale** e **Torna a prima dell'ultimo salvataggio**: anche il ripristino si può annullare, perché la versione di adesso diventa la nuova copia "ultima";
  - **Elimina le copie di sicurezza**: chiede conferma e le cancella **subito e definitivamente**, senza passare dal Cestino.
- In alternativa, quando è tutto a posto, trascina la cartella `Tag-liatelle copie` nel Cestino dal Finder.
- Ogni copia pesa come il file originale.

## I campi

La scheda ha quattro gruppi. **Base** è sempre aperto; gli altri si aprono con un clic, e si aprono da soli se contengono modifiche non salvate.

| Campo | MP3 (ID3) | FLAC (Vorbis) | Nei FLAC si legge anche |
|---|---|---|---|
| **Base** | | | |
| Titolo | TIT2 | TITLE | |
| Artista | TPE1 | ARTIST | |
| Album | TALB | ALBUM | |
| Anno | TYER (v2.3), TDRC (v2.4) | DATE | YEAR |
| Genere | TCON | GENRE | |
| Traccia (numero di totale) | TRCK | TRACKNUMBER e TRACKTOTAL | TOTALTRACKS, "3/12" |
| Disco (numero di totale) | TPOS | DISCNUMBER e DISCTOTAL | TOTALDISCS, "1/2" |
| **Crediti** | | | |
| Artista dell'album | TPE2 | ALBUMARTIST | ALBUM ARTIST |
| Compositore | TCOM | COMPOSER | |
| Paroliere | TEXT | LYRICIST | |
| Direttore | TPE3 | CONDUCTOR | |
| Remixer | TPE4 | REMIXER | |
| Sottotitolo | TIT3 | SUBTITLE | |
| Raggruppamento | TIT1 | GROUPING | |
| Lingua | TLAN | LANGUAGE | |
| Testo del brano | USLT | LYRICS | UNSYNCEDLYRICS |
| **Edizione e diritti** | | | |
| Copyright © | TCOP | COPYRIGHT | |
| Copyright della registrazione ℗ | TPRO (v2.4), TXXX:PRODUCTION_COPYRIGHT (v2.3) | PRODUCTION_COPYRIGHT | |
| Editore o etichetta | TPUB | ORGANIZATION | LABEL, PUBLISHER |
| Numero di catalogo | TXXX:CATALOGNUMBER | CATALOGNUMBER | |
| Codice a barre (UPC/EAN) | TXXX:BARCODE | BARCODE | UPC, EAN |
| Codice ISRC | TSRC | ISRC | |
| Licenza (il nome) | TXXX:LICENSE | LICENSE | |
| Pagina della licenza | WCOP | LICENSE | |
| Sito dell'artista | WOAR | WEBSITE | URL, WWWARTIST |
| Sito dell'etichetta | WPUB | WWWPUBLISHER | |
| **Extra** | | | |
| BPM | TBPM | BPM | |
| Tonalità | TKEY | INITIALKEY | KEY |
| Compilation | TCMP | COMPILATION | |
| Codificato da | TENC | ENCODEDBY | ENCODED-BY |
| Commenti | COMM | COMMENT | DESCRIPTION |
| Copertina | APIC (tipo 3) | PICTURE (tipo 3) | |
| Campi personalizzati | TXXX | nome libero | |

### Dove il formato non ha un campo ufficiale

- **Copyright della registrazione (℗)**:
  - negli MP3 ID3v2.4 c'è il campo ufficiale TPRO;
  - ID3v2.3 non ne ha uno, quindi si usa un campo personalizzato `PRODUCTION_COPYRIGHT`;
  - nei FLAC si usa lo stesso nome, `PRODUCTION_COPYRIGHT`, preso dal formato Matroska.
- **Sito dell'artista** nei FLAC: `WEBSITE`, come il programma MusicBrainz Picard.
- **Sito dell'etichetta** nei FLAC: `WWWPUBLISHER`, come il programma Mp3tag.
- **Licenza** nei FLAC: il nome e l'indirizzo della licenza stanno tutti e due in `LICENSE`, come due valori distinti. Si distinguono perché l'indirizzo inizia con http.

### Regole utili

- **Più valori** (più artisti, compositori, generi…): separali con punto e virgola e spazio, "Uno; Due". Negli MP3 ID3v2.4 e nei FLAC diventano valori distinti, come vogliono i formati.
- **Codice ISRC**: 12 caratteri, cioè 2 lettere del paese, 3 lettere o cifre, 2 cifre dell'anno e 5 cifre. Si può scrivere con o senza trattini (IT-A1B-26-00001); nel file viene scritto senza trattini e in maiuscolo, come vuole lo standard. Tag-liatelle controlla solo la forma: il codice va chiesto all'ente che lo assegna.
- **Indirizzi web**: devono iniziare con https:// o http://. Accanto al campo c'è "apri la pagina ↗" per controllarli.
- **Licenza**: sotto il campo c'è la **scelta rapida** fra le sette licenze Creative Commons, che compila insieme il nome e la pagina della licenza. Nel campo "Licenza" va il nome, non l'indirizzo.
- **Lingua**: negli MP3 si scrive con il codice di 3 lettere (ita, eng, fra, deu, spa…), e il campo ne suggerisce alcuni. Nei FLAC è testo libero.
- **Compilation**: si sceglie fra "sì", "no" e "—" (campo vuoto).
- **Campi personalizzati**, in fondo al gruppo Extra: si aggiungono con "+ Aggiungi un campo" e si tolgono con la ×. Il nome non può essere quello di un campo che esiste già, e nei FLAC si scrive senza accenti e senza "=". I campi che non tocchi restano identici nel file.

## La copertina

- Sotto la foto della scheda:
  - **Cambia…** (o **Aggiungi…**): sceglie un'immagine JPEG, PNG, WebP o GIF;
  - **Ritaglia…**: rifà il ritaglio della copertina attuale;
  - **Esporta**: scarica la copertina com'è nel file;
  - **Rimuovi**: toglie la copertina.
- Puoi anche **trascinare un'immagine** sulla pagina: diventa la copertina della scheda aperta (o di tutte le tracce scelte).
- Nella finestra di ritaglio:
  - sposti l'immagine trascinandola o con le frecce;
  - la ingrandisci con la rotellina, con il cursore dello zoom o con i tasti + e −;
  - scegli la misura (500, 1000, 1400 o 3000 pixel) e il formato, JPEG con qualità regolabile oppure PNG.
- I JPEG prodotti sono di tipo **base** (non progressivo), a colori RGB: il formato che tutti i lettori capiscono.
- **Avvisi**: se la parte ritagliata è più piccola della misura scelta (verrà sfocata), se la copertina è sotto i 500 pixel, se pesa più di 1 MB.
- La copertina cambia solo quando salvi, come i campi. Le **altre immagini** del file (retro, libretto…) restano.

## I file FLAC

- Si aprono, si modificano e si salvano come gli MP3, con le stesse garanzie.
- I loro tag si chiamano "commenti Vorbis". Quelli che Tag-liatelle non conosce compaiono fra i campi personalizzati e restano identici.
- **Spazio libero**: molti FLAC contengono un po' di spazio vuoto per i tag.
  - Se le modifiche ci stanno, l'audio non si sposta di un byte ("sul posto").
  - Se non ci stanno, il file viene riscritto per intero, con l'audio identico, e Tag-liatelle lascia 8 KB di spazio libero per le volte successive.

  L'anteprima dice quale dei due casi si verifica.
- Se un FLAC ha davanti un tag ID3, messo per errore da un altro programma, Tag-liatelle lo lascia dov'è e lavora sui commenti Vorbis.

## Più tracce insieme

- **Scegliere le tracce**, nella pila:
  - spunta le caselle;
  - oppure ⌘ Cmd + clic sul Mac (Ctrl + clic su Windows e Linux) per aggiungerne una alla volta;
  - oppure Maiuscole + clic per scegliere tutte quelle in mezzo;
  - oppure "scegli tutte".
- Con due o più tracce scelte compare la **scheda di gruppo**:
  - i campi uguali in tutte mostrano il loro valore;
  - dove c'è scritto **"valori diversi"**, ogni traccia tiene il suo, a meno che tu non scriva qualcosa: allora quel valore va in tutte;
  - "svuota in tutte" toglie quel campo da tutte le tracce scelte.
- **Titolo, codice ISRC e testo del brano** sono diversi per ogni brano: nella scheda di gruppo si possono solo leggere. Anche i campi personalizzati si modificano una traccia alla volta.
- **Numerazione automatica**: spunta "Numera in ordine, partendo da 1". Le tracce vengono numerate nell'ordine della pila; "usa N" mette come totale il numero delle tracce scelte.
- **Stessa copertina per tutte**: dal pulsante sotto la foto, oppure trascinando un'immagine. Si possono anche togliere le copertine da tutte.
- **Salva nelle tracce…** apre un'anteprima con un riquadro per ogni file e solo i campi che per quel file cambiano davvero. I file che hanno già quei valori non vengono toccati.
- Si scrive **un file alla volta**, ognuno con la sua copia di sicurezza e la sua verifica. Se un file dà un problema, Tag-liatelle **si ferma**: quelli già salvati restano salvati, gli altri come sono. Riprovando, i file già a posto vengono saltati.
- Le tracce con dati rovinati, o con modifiche loro non ancora salvate, restano fuori dal gruppo: la scheda lo dice.
- Un clic semplice su una traccia torna alla scheda singola. Se ci sono modifiche di gruppo non salvate, prima chiede conferma.
- In Safari e Firefox la modifica a gruppi non c'è.

## Modelli di edizione

Un **modello** è un insieme di campi con un nome, per esempio "Edizioni del Mattarello" con etichetta, copyright, licenza e siti web. Si riapplica con un clic.

- **Creare un modello**:
  - dalla scheda (singola o di gruppo) con **Salva come modello…**: prende i valori già scritti e propone spuntati i campi tipici di un'etichetta;
  - oppure dal pulsante **Modelli** in alto, con "+ Nuovo modello".
- **Nell'editor** spunti i campi che fanno parte del modello. C'è anche la scelta rapida delle licenze. Titolo, ISRC, testo, traccia e disco non possono stare in un modello, perché sono propri di ogni brano.
- **Applicare un modello**: nella riga "Modello di edizione" in cima alla scheda scegli il modello e premi **Applica**. Vale per la traccia aperta o per tutte quelle scelte. Cambiano solo i campi del modello, e i file non vengono toccati finché non salvi.
- **Dove stanno**: i modelli restano **in questo browser, su questo computer**. Se cancelli i dati del browser li perdi, per questo conviene esportarli.
- **Esporta in un file** crea `tag-liatelle-modelli.json` tra i download: un file di testo da tenere come copia o da portare su un altro computer.
- **Importa da un file** aggiunge i modelli del file a quelli che hai. Un nome già usato prende "(2)" e non sostituisce niente. I modelli con valori sbagliati vengono saltati e segnalati.
- Eliminare un modello non cambia nessun file audio.

## Strumenti

Il pulsante **Strumenti** lavora sulla traccia aperta, oppure su tutte le tracce scelte. La finestra dice sempre su quali.

- **Spazi**: toglie gli spazi all'inizio e alla fine dei campi e riduce a uno quelli ripetuti. Nel testo del brano e nei commenti tiene gli a capo.
- **Maiuscole**, in due modi:
  - "Iniziali maiuscole": *La Città di Notte*. Articoli, preposizioni e congiunzioni restano minuscoli, in italiano e in inglese (il, di, dell', d', the, of…);
  - "Solo la prima lettera": *La città di notte*. Il resto del titolo non cambia.

  Le sigle (DJ, RAI), i nomi come iPhone e i numeri romani restano come sono.
- **Cerca e sostituisci**: in tutti i campi di testo o in uno solo, con le opzioni "distingui maiuscole e minuscole" e "solo parole intere". Il testo si cerca così com'è, senza simboli speciali.
- Questi tre strumenti mostrano l'anteprima "prima e dopo", file per file, e poi salvano come sempre.
- **Rinomina i file**:
  - scegli uno schema pronto o ne scrivi uno con i segnaposto {traccia}, {titolo}, {artista}, {album}, {anno}, {disco}, {artistaAlbum}, {genere}, per esempio `{traccia} - {titolo}`;
  - il numero di traccia prende lo zero davanti (01, 02…), e tre cifre se le tracce sono più di 99;
  - i caratteri che i computer non accettano nei nomi (/ \ : * ? " < > |) diventano un trattino. L'estensione resta quella del file;
  - l'anteprima mostra "nome di adesso → nome nuovo". I file a cui manca un dato, quelli che avrebbero lo stesso nome di un altro e quelli il cui nome nuovo è già usato nella cartella restano come sono, con il motivo;
  - i nomi si costruiscono dai tag **già salvati** nei file;
  - cambia solo il nome: il contenuto resta identico. Anche le copie di sicurezza prendono il nome nuovo;
  - subito dopo, **Torna ai nomi di prima…** rimette i nomi vecchi, finché la pagina resta aperta.

## Scorciatoie da tastiera

| Cosa fa | Mac | Windows e Linux |
|---|---|---|
| Salvare (apre l'anteprima) | ⌘ Cmd + S | Ctrl + S |
| Traccia successiva | ⌥ Option + ↓ | Alt + ↓ |
| Traccia precedente | ⌥ Option + ↑ | Alt + ↑ |
| Scegliere più tracce | ⌘ Cmd + clic, Maiuscole + clic | Ctrl + clic, Maiuscole + clic |
| Vedere le scorciatoie | ? | ? |
| Chiudere una finestrella | Esc | Esc |

Tutto si raggiunge anche con il tasto Tab. Le animazioni (come il timbro) si spengono dalla finestrella delle scorciatoie, e restano spente se il computer chiede di "ridurre il movimento".

## Se qualcosa non va

- **"Hai scelto un file, ma qui serve una cartella"**: nella finestra di "Apri cartella" clicca una volta sulla cartella (non sui file dentro) e poi "Apri".
- **Il browser non chiede il permesso, o lo nega**: chiudi la pagina e riaprila; quando il browser chiede di vedere o modificare i file, rispondi di sì.
- **"Il file è stato cambiato da un altro programma"**: un altro programma ha modificato il file dopo che l'hai aperto. Riapri la cartella e rifai la modifica.
- **"I dati di questo file sono in parte rovinati"**: Tag-liatelle non ci scrive, per non perdere niente. Puoi provare a sistemare il file con un altro programma e poi riaprirlo.
- **Ho perso i modelli**: si perdono se cancelli i dati del browser. Reimportali dal file `tag-liatelle-modelli.json`, se li avevi esportati.
- **Lo spazio su disco cala**: ogni copia di sicurezza pesa come il file. Quando sei sicuro che va tutto bene, cancella la cartella `Tag-liatelle copie`.

---

## Per chi sviluppa

### Struttura del progetto

```
index.html            la pagina (versione di sviluppo: carica css/ e js/)
css/stile.css         aspetto, temi chiaro e scuro
js/                   il programma, senza librerie esterne
  binario.js            lettura di numeri e testi dai byte
  campi.js              i campi, i nomi ID3 e Vorbis, i controlli dei valori
  id3.js, id3-scrittura.js        MP3: lettura e scrittura (ID3v2.2-2.4, ID3v1)
  flac.js, flac-scrittura.js      FLAC: commenti Vorbis, PICTURE, spazio libero
  formati.js            MP3 e FLAC dietro la stessa porta
  immagini.js, ritaglio.js        copertina: misure, ritaglio, JPEG base / PNG
  apertura.js, salvataggio.js     file e cartelle, copie, scrittura sicura, rinomina
  gruppo.js, modelli.js, strumenti.js
  supporto.js, app.js   controllo del browser, interfaccia
font/                 Courier Prime e Fraunces (licenza OFL)
logo/                 logo, bozzetti, icone
esempi/               file MP3 e FLAC di prova piccolissimi (mezzo secondo di silenzio)
test/                 prove automatiche (si aprono anche con un doppio clic su test/index.html)
strumenti/            script: prove, file di prova, file unico, logo
rilasci/<versione>/   il file unico di ogni versione rilasciata
```

### Le prove

- **Nel browser**: apri `test/index.html` con un doppio clic e leggi l'elenco.
- **Dal Terminale**: lo script lancia le prove in Microsoft Edge (o Chrome) senza finestra. Poi controlla con la libreria indipendente **mutagen** sia le letture sia i file scritti da Tag-liatelle, e verifica in Python che l'audio sia identico.

La prima volta prepara l'ambiente con mutagen, dentro il progetto:

```bash
python3 -m venv .venv && .venv/bin/pip install mutagen
```

Poi, ogni volta:

```bash
.venv/bin/python strumenti/prova.py
```

Il file di prova `15-flac-rovinato.flac` è rovinato apposta: mutagen si rifiuta di leggerlo, Tag-liatelle lo segnala.

### I file di prova

Sono costruiti a mano, byte per byte, da `strumenti/genera_esempi.py` (MP3) e `strumenti/genera_flac.py` (FLAC). Non contengono musica vera.

```bash
python3 strumenti/genera_esempi.py
```

### Il file unico

`strumenti/assembla.py` unisce pagina, stile, programma, caratteri e icone in un solo `index.html`, senza nessun collegamento esterno:

```bash
python3 strumenti/assembla.py 1.0.0
```

### Il logo

I file in `logo/` si rigenerano con `strumenti/logo.py`, che richiede `fonttools` per trasformare la scritta in tracciati. I tre bozzetti iniziali sono in `logo/bozzetti.html`.

### Pubblicare su GitHub Pages (quando lo deciderai)

1. Crea un repository su GitHub e collega questa cartella:

   ```bash
   git remote add origin https://github.com/<il-tuo-nome>/tag-liatelle.git
   ```

2. Invia la versione principale:

   ```bash
   git push -u origin main --tags
   ```

3. Su GitHub: **Settings → Pages → Deploy from a branch → main / (root)**.
4. Dopo un paio di minuti l'app sarà all'indirizzo `https://<il-tuo-nome>.github.io/tag-liatelle/`.

Il file `.nojekyll` dice a GitHub di pubblicare i file così come sono. La cartella `.venv` e i file audio veri non finiscono nel repository (vedi `.gitignore`).

---

## Licenza e crediti

**Tag-liatelle** © Roberto Lanza, rilasciato con licenza [Creative Commons Attribuzione - Non commerciale - Condividi allo stesso modo 4.0 Internazionale (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it). Il testo completo è nel file [LICENSE](LICENSE).

- Caratteri: **Courier Prime** (© The Courier Prime Project Authors) e **Fraunces** (© The Fraunces Project Authors), con licenza SIL Open Font License 1.1: vedi `font/OFL-courier-prime.txt` e `font/OFL-fraunces.txt`.
- Nessuna libreria esterna: la lettura e la scrittura dei formati sono scritte da zero e verificate con la libreria indipendente mutagen, usata solo nelle prove.
- MP3, ID3, FLAC, Vorbis, Chrome, Edge, Safari, Firefox e Mac sono nomi e marchi dei rispettivi proprietari.
