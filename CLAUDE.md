# Tag-liatelle

*Metadati e copertine per i tuoi file audio, cotti al dente.*

## Obiettivo

Costruire **Tag-liatelle**, un'app che legge e scrive i metadati (i "tag") e la copertina dei file audio **MP3 e FLAC**. Funziona nel browser, in locale, senza installare nulla: i file non vengono mai caricati su nessun server. Serve a preparare le uscite musicali complete, quindi oltre ai campi di base deve gestire crediti, copyright, editore e licenza.

Uso personale e didattico, ma da condividere in futuro con altri. Sono un insegnante di scienze, non uno sviluppatore: spiegami le scelte in italiano, con parole semplici, e dimmi sempre come provare quello che hai fatto.

## Il nome e il tono

Il nome è un gioco di parole fra "tag" e "tagliatelle". Il tono dell'app è **simpatico ma mai a scapito della chiarezza**: i testi dell'interfaccia (messaggi, pulsanti, stati vuoti, conferme) possono avere un sorriso, ma le azioni delicate (scrivere nei file, ripristinare) devono essere sempre scritte in modo semplice e inequivocabile. Niente battute su ciò che potrebbe far perdere dati.

## Regole che valgono sempre

1. **Non toccare mai la parte audio del file.** Si riscrive solo il blocco dei tag e delle immagini. Dopo ogni salvataggio, verificare che i dati audio siano identici a prima.
2. **Copia di sicurezza prima di scrivere**, in una cartella dedicata (per esempio `Tag-liatelle copie`) accanto ai file, con possibilità di ripristino con un clic.
3. **Anteprima delle modifiche** prima del salvataggio: per ogni file, cosa cambia (valore prima e dopo). Si scrive solo dopo la mia conferma.
4. **Non perdere i campi che non conosci.** Quando salvi, conserva tutto ciò che c'è già nel file e che non ho modificato (campi e immagini sconosciuti compresi).
5. **Scrittura sicura**: se qualcosa fallisce a metà, il file originale deve restare integro.
6. Nessun dato inviato a server, nessuna statistica, nessuna libreria caricata da internet al momento dell'uso (librerie e font stanno dentro il progetto).
7. Interfaccia in italiano. Firma: **© Roberto Lanza**, licenza **CC BY-NC-SA**, come le mie altre app.

## Tecnologie

- Pagina web con HTML, CSS e JavaScript, senza compilazione. Preferibilmente **un solo file `index.html`** portatile (come le mie altre app), oppure pochi file se serve davvero. Peso complessivo ragionevole, e font incorporati.
- **File System Access API** per aprire cartelle e file e scrivere direttamente. Funziona in **Chrome ed Edge**, non in Safari né Firefox: in quel caso mostra un messaggio chiaro e offri come alternativa il download di una copia modificata, un file alla volta.
- Lettura e scrittura dei tag: usa una libreria piccola e affidabile se esiste, altrimenti scrivi tu l'analisi dei formati. Il risultato deve essere verificato con file di prova.
- **MP3**: tag ID3v2. Scrivere ID3v2.3 con testo UTF-16 come impostazione predefinita (massima compatibilità con Windows e i lettori meno recenti), con la scelta di ID3v2.4 nelle impostazioni. Conservare i frame esistenti non toccati.
- **FLAC**: commenti Vorbis e blocchi PICTURE. Gestire il padding per riscrivere senza dover riscrivere tutto il file quando possibile.
- **M4A, OGG e Opus: non nella versione 1.**

## I campi, in quattro gruppi

L'interfaccia mostra sempre il gruppo Base e apre gli altri su richiesta, così resta leggera.

**1. Base**: titolo, artista, album, anno, genere, traccia (numero di totale), disco (numero di totale), copertina.

**2. Crediti**: artista dell'album, compositore, paroliere, direttore, remixer, sottotitolo, raggruppamento, lingua, testo del brano.

**3. Edizione e diritti**: copyright (©) e copyright della registrazione (℗), editore o etichetta, numero di catalogo, codice a barre (UPC/EAN), codice ISRC (con controllo del formato, senza assegnarlo), licenza (con scelta rapida fra le Creative Commons e collegamento alla pagina della licenza), indirizzi web (artista, licenza, etichetta).

**4. Extra**: BPM, tonalità, compilation sì o no, codificato da, commenti, e **campi personalizzati** liberi.

Tabella di corrispondenza di partenza (da completare e verificare con i file di prova):

| Campo | MP3 (ID3) | FLAC (Vorbis) |
|---|---|---|
| Titolo | TIT2 | TITLE |
| Artista | TPE1 | ARTIST |
| Album | TALB | ALBUM |
| Artista album | TPE2 | ALBUMARTIST |
| Anno | TYER o TDRC | DATE |
| Traccia | TRCK | TRACKNUMBER e TRACKTOTAL |
| Disco | TPOS | DISCNUMBER e DISCTOTAL |
| Genere | TCON | GENRE |
| Compositore | TCOM | COMPOSER |
| Paroliere | TEXT | LYRICIST |
| Direttore | TPE3 | CONDUCTOR |
| Remixer | TPE4 | REMIXER |
| Sottotitolo | TIT3 | SUBTITLE |
| Raggruppamento | TIT1 | GROUPING |
| Lingua | TLAN | LANGUAGE |
| Testo | USLT | LYRICS |
| Copyright | TCOP | COPYRIGHT |
| Editore o etichetta | TPUB | ORGANIZATION |
| Numero di catalogo | TXXX:CATALOGNUMBER | CATALOGNUMBER |
| Codice a barre | TXXX:BARCODE | BARCODE |
| ISRC | TSRC | ISRC |
| Licenza (indirizzo) | WCOP | LICENSE |
| Sito artista | WOAR | URL |
| BPM | TBPM | BPM |
| Tonalità | TKEY | INITIALKEY |
| Compilation | TCMP | COMPILATION |
| Codificato da | TENC | ENCODEDBY |
| Commenti | COMM | COMMENT |
| Copertina | APIC (tipo 3) | PICTURE (tipo 3) |
| Personalizzati | TXXX | nome libero |

Dove non esiste un campo standard (per esempio il copyright della registrazione ℗), proponi la soluzione più diffusa e dimmi quale hai scelto e perché.

## Copertina

- Trascino un'immagine nella scheda, oppure la scelgo da un file. Posso anche esportare o rimuovere quella già presente.
- Ritaglio quadrato con cornice regolabile e zoom, anteprima, e ridimensionamento a scelta (per esempio 500, 1000, 1400 pixel).
- Salvare in **JPEG base** (non progressivo) in RGB con qualità regolabile, oppure PNG. Avvisare se la copertina è molto pesante o troppo piccola.
- Immagine frontale (tipo 3). Se nel file ci sono altre immagini, conservarle.
- Applicabile a più tracce insieme.

## Aspetto e carattere dell'app

**Deve sembrare fatta da una persona, non da un'AI.** Evita le cose che tradiscono l'aspetto "fatto con l'AI": sfumature viola e blu, vetro trasparente e sfocature, griglie di schede tutte uguali con grandi angoli arrotondati, icone a emoji, font anonimi, ombre morbide dappertutto.

**Direzione scelta: il cartellino di collezione** (un po' museo di scienze naturali, un po' bottega artigiana), con un tocco ironico che richiama la pasta fresca.

- **Idea guida**: ogni brano è una **scheda di collezione**, con campi come su un cartellino compilato a macchina. L'elenco delle tracce è una pila di schede. La modifica avviene su una scheda grande al centro, e la copertina sta incollata in un angolo come una fotografia.
- **Colori, pochissimi**: carta crema calda, inchiostro bruno scuro, **un solo colore di accento** (un giallo "pasta all'uovo"), più un **rosso timbro** usato soltanto per il timbro di conferma e per gli avvisi. Nessun altro colore.
- **Caratteri**: un carattere da macchina da scrivere per i dati (per esempio Courier Prime) e un serif espressivo per i titoli (per esempio Fraunces). Entrambi con licenza libera, incorporati nel file (solo i caratteri che servono).
- **Dettagli di carattere**: texture di carta molto leggera, foro con laccetto sul cartellino, angoli non tutti arrotondati, un **timbro** che si imprime quando un file è salvato, uno stato vuoto simpatico (un piatto di tagliatelle senza etichette). Le animazioni sono poche, brevi e sempre disattivabili (rispetta la preferenza di sistema "riduci movimento").
- **Icone**: disegnate da te in SVG, con uno stesso stile di tratto per tutte, non prese da un set generico.
- **Temi**: chiaro e scuro (scuro come "carta da inventario" scura, non un nero freddo).
- **Facilità**: deve essere comprensibile senza istruzioni. Frasi brevi, pulsanti con un verbo chiaro, ordine dei campi logico, tutto raggiungibile da tastiera, contrasti buoni, scorciatoie semplici (salva, avanti e indietro fra le tracce).
- Pensato per **computer** (Chrome o Edge), ma leggibile e usabile anche su schermi più piccoli.

## Logo

Disegna il logo in **SVG**. Idea di partenza: **un'etichetta (tag) con foro e laccetto, la cui forma nasce da un nido di tagliatelle arrotolate**. Deve restare riconoscibile anche piccolo.

- Prima di rifinire, proponi **tre bozzetti** in una pagina `logo/bozzetti.html` e **aspetta la mia scelta**.
- Poi produci: logo completo con scritta "Tag-liatelle" (con il trattino, che fa parte del nome), versione solo simbolo (quadrata, per l'icona della pagina), versione a un solo colore, e icone nelle dimensioni utili (favicon e icona per le schermate dei dispositivi).
- Mantieni la coerenza con colori e caratteri dell'app.

## Piano a blocchi

Procedi **un blocco alla volta**. Alla fine di ognuno spiegami in poche righe cosa è stato fatto e come provarlo, poi **fermati e aspetta il mio via libera**.

1. **Identità e scheletro**: bozzetti del logo (da scegliere), tavolozza, caratteri, struttura della pagina, tema chiaro e scuro, controllo del supporto del browser con messaggi chiari.
2. **Apertura e lettura MP3**: scelta di cartella o file, pila di schede con l'elenco delle tracce, lettura dei tag e della copertina.
3. **Modifica e salvataggio sicuro**: gruppo Base su una traccia, anteprima delle modifiche, copia di sicurezza, scrittura, verifica dell'audio, ripristino.
4. **Copertina**: caricamento, ritaglio quadrato, ridimensionamento, esportazione e rimozione.
5. **FLAC**: lettura e scrittura di tag e copertina, con le stesse garanzie dell'MP3.
6. **Gruppi Crediti, Edizione e diritti, Extra**, con campi personalizzati e verifica del formato dell'ISRC.
7. **Modifica a gruppi**: selezione di più tracce, campi con "valori diversi", applicazione solo dei campi che cambio, numerazione automatica delle tracce, stessa copertina per tutte.
8. **Modelli di edizione**: salvare e riapplicare un insieme di campi (etichetta, copyright, licenza, sito, ecc.), uno per ciascuna delle mie etichette, con esportazione e importazione.
9. **Strumenti**: rinomina dei file dai tag con schema a scelta (anteprima prima di eseguire), pulizia degli spazi, maiuscole nei titoli, ricerca e sostituzione sui campi.
10. **Rifinitura**: prove su file veri, accessibilità, `README.md` con istruzioni d'uso, licenza, pubblicazione su GitHub Pages.

## Come lavorare

- Prima del blocco 1, proponi la struttura del progetto e aspetta il mio ok.
- Crea nella cartella `esempi/` alcuni **file di prova piccolissimi** (MP3 e FLAC validi, anche con tag già esistenti, caratteri accentati, copertine diverse, campi sconosciuti). Non usare mai i miei file veri e non inserirli nel repository.
- **Test automatici con Node** sulla logica pura (lettura e scrittura dei tag, conservazione dei campi sconosciuti, audio invariato dopo il salvataggio, controllo ISRC, rinomina). In più, nei test (non nell'app), verifica i file scritti con uno **strumento indipendente** (per esempio la libreria Python `mutagen`, se disponibile nell'ambiente), così sappiamo che non li leggiamo solo con il nostro codice. Spiegami come lanciare i test.
- **Non puoi provare l'app con i miei file nel cloud**: dopo ogni blocco dammi l'indirizzo di GitHub Pages (o un modo semplice) per provarla io, e dimmi cosa guardare.
- Un ramo e una pull request per blocco, con messaggi di commit chiari in italiano. Una copia di ogni versione rilasciata in `rilasci/<versione>/`.
- Se una scelta è ambigua, chiedimelo invece di decidere da solo.

## Fuori programma per ora

M4A, OGG e Opus; riconoscimento automatico dei brani e ricerca dei dati online (richiederebbe di inviare informazioni a servizi esterni); conversione fra formati; qualsiasi funzione che richieda un server.
