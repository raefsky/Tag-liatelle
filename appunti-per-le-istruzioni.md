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
