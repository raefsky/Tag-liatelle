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
