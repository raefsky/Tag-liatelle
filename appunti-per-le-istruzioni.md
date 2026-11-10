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
