# Appunti per le istruzioni (README, blocco 10)

Cose da spiegare nelle istruzioni d'uso, raccolte durante il lavoro.

## Copie di sicurezza
- Prima di scrivere in un file, Tag-liatelle ne fa una copia nella cartella **`Tag-liatelle copie`**, accanto al file.
- Per ogni file si tengono **al massimo due copie**:
  - l'**originale**, cioè il file com'era la prima volta che Tag-liatelle ci ha scritto. Non viene mai sostituita;
  - l'**ultima**, cioè il file com'era prima dell'ultimo salvataggio. Viene sostituita a ogni nuovo salvataggio.
- Le copie **non si cancellano da sole**. Dopo un salvataggio compare un promemoria: "Ricordati che hai una copia di sicurezza: se è tutto a posto, puoi cancellarla".
- Per cancellarle:
  1. dal Finder: trascinare la cartella `Tag-liatelle copie` nel Cestino;
  2. dall'app: il pulsante "Elimina le copie di sicurezza" le cancella subito e **definitivamente**, senza passare dal Cestino.
- Il pulsante per vedere le copie apre la finestra di scelta del Mac già posizionata sulla cartella delle copie. Il browser non può aprire direttamente una finestra del Finder.

## Apertura dei file
- "Apri cartella": nella finestra del Mac si clicca **una volta** sulla cartella, poi "Apri". Non bisogna entrare nella cartella né selezionare i file.
- "Apri file" aggiunge file alle schede aperte. "Apri cartella" sostituisce le schede aperte.
- Si possono anche trascinare file o cartelle sulla pagina.
- Tag-liatelle ricorda l'ultima cartella usata, solo in quel browser.

## Prove automatiche
- `test/index.html` si apre con un doppio clic.
- Dal Terminale: `.venv/bin/python strumenti/prova.py`, che usa Edge e mutagen.

## Modificare e salvare (dalla versione 0.3.0)
- Per ora si modificano i campi del gruppo **Base**. Gli altri gruppi si possono solo leggere.
- I campi modificati sono sottolineati in giallo e portano la scritta "modificato". Nella pila, la scheda ha un pallino giallo.
- **Salva…** (oppure ⌘ Cmd + S sul Mac, Ctrl + S su Windows e Linux) apre l'**anteprima**: per ogni campo mostra il valore prima e dopo. Si scrive solo dopo aver premuto "Scrivi nel file".
- Durante il salvataggio i passi sono quattro: controllo che il file non sia cambiato, copia di sicurezza, scrittura, verifica dei campi e dell'audio, che deve restare identico byte per byte. Se la verifica non passa, il file viene rimesso com'era in automatico.
- Il browser chiede il permesso di modifica la prima volta. Per i file aperti uno per uno chiede anche di scegliere la cartella che li contiene: serve per la copia di sicurezza.
- I file con il **tag rovinato** non si possono salvare, e la scheda spiega perché.
- Se il file aveva il vecchio tag ID3v1, viene aggiornato anch'esso. I caratteri che ID3v1 non conosce diventano "?", e "—" diventa "-".
- La versione dei tag resta quella del file. I file senza tag, con ID3v2.2 o con il solo ID3v1 ricevono un tag ID3v2.3.
- **Ripristino**: nella scheda, sotto "Copie di sicurezza", ci sono i pulsanti "Torna all'originale" e "Torna a prima dell'ultimo salvataggio". Anche il ripristino si può annullare, perché la versione attuale diventa la nuova copia "ultima".
- **Safari e Firefox**: al posto di "Salva" c'è "Scarica la copia modificata". L'originale non viene toccato.

## Copertina (dalla versione 0.4.0)
- Sotto la foto della scheda ci sono quattro pulsanti:
  - **Cambia…** (o **Aggiungi…** se la copertina non c'è): sceglie un'immagine JPEG, PNG, WebP o GIF;
  - **Ritaglia…**: rifà il ritaglio della copertina attuale;
  - **Esporta**: scarica la copertina com'è nel file;
  - **Rimuovi**: toglie la copertina.
- Si può anche **trascinare un'immagine** sulla pagina: diventa la copertina della scheda aperta.
- Nella finestra di ritaglio:
  - si sposta l'immagine trascinandola o con le frecce;
  - si ingrandisce con la rotellina, con il cursore dello zoom o con i tasti + e −;
  - si sceglie la misura (500, 1000, 1400 o 3000 pixel) e il formato: JPEG, con qualità regolabile, oppure PNG.
- I JPEG sono di tipo "base" (non progressivo), a colori RGB: è il formato che tutti i lettori capiscono.
- Avvisi: se la parte ritagliata è più piccola della misura scelta (verrà sfocata), se la copertina è sotto i 500 pixel, se pesa più di 1 MB.
- La copertina cambia solo quando si salva, con la stessa anteprima e la stessa copia di sicurezza dei campi. Le altre immagini del file (retro, libretto…) restano.
- La stessa copertina su più tracce insieme arriverà con la modifica a gruppi (blocco 7).

## File FLAC (dalla versione 0.5.0)
- I FLAC si aprono, si modificano e si salvano come gli MP3: stessa anteprima, stessa copia di sicurezza, stessa verifica dell'audio, stesso ripristino. Anche la copertina funziona allo stesso modo.
- I tag dei FLAC si chiamano "commenti Vorbis". Tag-liatelle conserva identici tutti i commenti che non modifichi, anche quelli che non conosce: compaiono fra i "campi personalizzati".
- **Spazio libero**: molti FLAC contengono un po' di spazio vuoto per i tag. Se le modifiche ci stanno, l'audio non viene spostato ("sul posto"). Se non ci stanno, il file viene riscritto per intero, con l'audio identico, e Tag-liatelle lascia 8 KB di spazio libero per le volte successive. L'anteprima dice quale dei due casi si verifica.
- Più artisti (o compositori, generi…) si scrivono separati da punto e virgola e spazio, "Uno; Due": nel FLAC diventano due valori distinti, come vuole il formato.
- Se un FLAC ha davanti un tag ID3 (messo per errore da un altro programma), Tag-liatelle lo lascia dov'è e legge i commenti Vorbis.
- I FLAC con i dati rovinati non si possono salvare, e la scheda spiega perché.
- Nomi scelti dove il formato non ne ha uno ufficiale:
  - copyright della registrazione (℗): `PRODUCTION_COPYRIGHT`, il nome usato dal formato Matroska;
  - sito dell'artista: `WEBSITE`, come il programma MusicBrainz Picard (si legge anche `URL`);
  - sito dell'etichetta: `WWWPUBLISHER`, come il programma Mp3tag;
  - licenza: `LICENSE` contiene sia il nome della licenza sia il suo indirizzo web, come due valori.

## Tutti i gruppi di campi (dalla versione 0.6.0)
- Si possono modificare tutti e quattro i gruppi: Base, Crediti, Edizione e diritti, Extra. I gruppi chiusi si aprono da soli se contengono modifiche non salvate.
- Sotto un campo può comparire un messaggio:
  - **✗ in rosso**: il valore non va bene e il file non si salva finché non lo correggi. Premendo "Salva…" il cursore va direttamente sul campo;
  - **⚠ in grigio**: il valore è sospetto ma si può salvare, per esempio un codice a barre con l'ultima cifra sbagliata. L'avviso compare anche nell'anteprima.
- **Codice ISRC**: 12 caratteri, cioè 2 lettere del paese, 3 lettere o cifre, 2 cifre dell'anno e 5 cifre. Si può scrivere con o senza trattini (IT-A1B-26-00001); nel file viene scritto senza trattini e in maiuscolo, come vuole lo standard. Tag-liatelle controlla solo la forma: il codice va chiesto all'ente che lo assegna.
- **Indirizzi web** (sito dell'artista, pagina della licenza, sito dell'etichetta): devono iniziare con https:// o http://. Accanto c'è "apri la pagina" per controllarli.
- **Licenza**: sotto il campo c'è la scelta rapida fra le licenze Creative Commons, che compila insieme il nome e la pagina della licenza. Nel campo "Licenza" va il nome, non l'indirizzo: nei FLAC i due valori stanno entrambi in `LICENSE` e si distinguono proprio così.
- **Lingua**: negli MP3 si scrive con il codice di 3 lettere (ita, eng, fra…), e il campo ne suggerisce alcuni. Nei FLAC è testo libero.
- **Compilation**: si sceglie fra "sì", "no" e "—" (campo vuoto).
- **Più valori**: compositori, parolieri, artisti, generi… si separano con punto e virgola e spazio, "Uno; Due".
- **Copyright della registrazione (℗)**: negli MP3 ID3v2.4 va nel campo ufficiale TPRO. Negli MP3 ID3v2.3, che non ha un campo apposito, va in un campo personalizzato `PRODUCTION_COPYRIGHT`, con lo stesso nome usato nei FLAC.
- **Campi personalizzati**, in fondo al gruppo Extra: si aggiungono con "+ Aggiungi un campo" e si tolgono con la ×. Il nome non può essere quello di un campo che esiste già (per esempio TITLE), e nei FLAC si scrive senza accenti e senza "=". I campi che non tocchi restano identici nel file.

## Modifica a gruppi (dalla versione 0.7.0)
- Nella pila ogni traccia ha una casella. Per scegliere più tracce:
  - spunta le caselle;
  - oppure ⌘ Cmd + clic sul Mac (Ctrl + clic su Windows e Linux) per aggiungerne una alla volta;
  - oppure Maiuscole + clic per scegliere tutte quelle in mezzo;
  - oppure "scegli tutte" in cima alla pila.
- Con due o più tracce scelte compare la **scheda di gruppo**:
  - i campi uguali in tutte mostrano il loro valore;
  - dove c'è scritto **"valori diversi"**, ogni traccia tiene il suo valore, a meno che tu non scriva qualcosa: allora quel valore va in tutte;
  - "svuota in tutte" toglie quel campo da tutte le tracce scelte.
- **Titolo, codice ISRC e testo del brano** sono diversi per ogni brano: nella scheda di gruppo si possono solo leggere. Anche i campi personalizzati si modificano una traccia alla volta.
- **Numerazione automatica**: spunta "Numera in ordine, partendo da 1". Le tracce vengono numerate nell'ordine della pila (cartella, disco, numero di traccia, nome del file). Il pulsante "usa N" mette come totale il numero delle tracce scelte.
- **Stessa copertina per tutte**: dal pulsante sotto la foto, oppure trascinando un'immagine sulla pagina. Si possono anche togliere le copertine da tutte.
- **Salva nelle tracce…** apre un'anteprima con un riquadro per ogni file e solo i campi che cambiano davvero. I file che hanno già quei valori non vengono toccati.
- Si scrive **un file alla volta**, ognuno con la sua copia di sicurezza e la sua verifica dell'audio. Se un file dà un problema, Tag-liatelle si ferma: quelli già salvati restano salvati, gli altri restano com'erano. Le modifiche di gruppo rimangono nella scheda, e riprovando i file già a posto vengono saltati.
- Le tracce con i dati rovinati, o con modifiche loro non ancora salvate, restano fuori dal gruppo: la scheda lo dice.
- Un clic semplice su una traccia esce dal gruppo. Se ci sono modifiche di gruppo non salvate, prima chiede conferma.
- Prima di scrivere, Tag-liatelle controlla che i tag del file siano ancora quelli letti all'apertura: se un altro programma li ha cambiati nel frattempo, si ferma e non sovrascrive il suo lavoro.
- In Safari e Firefox la modifica a gruppi non c'è: lì si lavora una traccia alla volta e si scaricano le copie.

## Modelli di edizione (dalla versione 0.8.0)
- Un **modello** è un insieme di campi con un nome, per esempio "Edizioni del Mattarello" con etichetta, copyright, licenza e siti web. Si riapplica con un clic.
- **Crearne uno**:
  - dalla scheda di una traccia (o dalla scheda di gruppo), con "Salva come modello…": prende i valori già scritti e propone spuntati i campi tipici di un'etichetta;
  - oppure dal pulsante **Modelli** in alto → "+ Nuovo modello".
- Nell'editor spunti i campi che fanno parte del modello. C'è anche la scelta rapida delle licenze Creative Commons. Titolo, ISRC, testo, numero di traccia e disco non possono stare in un modello, perché sono propri di ogni brano.
- **Applicarlo**: nella riga "Modello di edizione" in cima alla scheda scegli il modello e premi "Applica". Funziona su una traccia sola o su tutte le tracce scelte. Cambiano solo i campi del modello, e i file non vengono toccati finché non salvi, con la solita anteprima.
- **Dove stanno**: i modelli restano in questo browser, su questo computer. Se cancelli i dati del browser li perdi: per questo conviene esportarli.
- **Esporta in un file**: crea `tag-liatelle-modelli.json` tra i download. È un file di testo, si può tenere come copia o portare su un altro computer.
- **Importa da un file**: aggiunge i modelli del file a quelli che hai. Un modello con un nome già usato viene importato con "(2)" nel nome, non sostituisce quello che c'è. I modelli con valori sbagliati vengono saltati e segnalati.
- Eliminare un modello non cambia nessun file audio.
