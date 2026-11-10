#!/usr/bin/env python3
"""
Tag-liatelle · lancia tutte le prove
1. apre test/index.html in Microsoft Edge "senza finestra" e legge il risultato;
2. confronta ciò che ha letto Tag-liatelle con ciò che legge mutagen,
   una libreria Python indipendente dal nostro codice.

Uso (dalla cartella del progetto):
    .venv/bin/python strumenti/prova.py
La prima volta serve l'ambiente con mutagen:
    python3 -m venv .venv && .venv/bin/pip install mutagen
"""
import base64
import html
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
EDGE = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# campo dell'interfaccia → chiave mutagen (mutagen traduce tutto in ID3v2.4: TYER diventa TDRC)
CAMPI_MUTAGEN = {
    "titolo": "TIT2", "artista": "TPE1", "album": "TALB", "artistaAlbum": "TPE2", "anno": "TDRC",
    "genere": "TCON", "traccia": "TRCK", "disco": "TPOS", "compositore": "TCOM", "paroliere": "TEXT",
    "direttore": "TPE3", "remixer": "TPE4", "sottotitolo": "TIT3", "raggruppamento": "TIT1", "lingua": "TLAN",
    "copyright": "TCOP", "copyrightRegistrazione": "TPRO", "editore": "TPUB", "isrc": "TSRC", "bpm": "TBPM",
    "tonalita": "TKEY", "compilation": "TCMP", "codificatoDa": "TENC",
    "sitoArtista": "WOAR", "sitoLicenza": "WCOP", "sitoEtichetta": "WPUB",
}
TXXX_MUTAGEN = {"catalogo": "CATALOGNUMBER", "codiceBarre": "BARCODE", "licenza": "LICENSE"}


def browser():
    for p in (EDGE, CHROME):
        if Path(p).exists():
            return p
    sys.exit("Non trovo né Microsoft Edge né Google Chrome nella cartella Applicazioni.")


def esegui_nel_browser():
    with tempfile.TemporaryDirectory() as profilo:
        r = subprocess.run([browser(), "--headless=new", "--disable-gpu", f"--user-data-dir={profilo}",
                            "--allow-file-access-from-files", "--virtual-time-budget=20000", "--dump-dom",
                            (RADICE / "test" / "index.html").as_uri()],
                           capture_output=True, text=True, timeout=120)
    dom = r.stdout

    def blocco(id_):
        m = re.search(rf'<pre id="{id_}">(.*?)</pre>', dom, re.S)
        return json.loads(html.unescape(m.group(1))) if m and m.group(1).strip() else None
    return blocco("esito"), blocco("letture"), blocco("scritti")


def lettura_mutagen(percorso):
    from mutagen.id3 import ID3, ID3NoHeaderError
    try:
        tags = ID3(percorso, load_v1=False)
    except ID3NoHeaderError:
        try:
            tags = ID3(percorso)         # solo ID3v1
        except ID3NoHeaderError:
            return {"campi": {}, "immagini": []}
    campi = {}
    for campo, chiave in CAMPI_MUTAGEN.items():
        if chiave.startswith("W"):
            # mutagen chiama alcuni frame W con l'indirizzo nel nome (es. "WOAR:https://...")
            trovati = tags.getall(chiave)
            if trovati:
                campi[campo] = trovati[0].url
            continue
        if chiave not in tags:
            continue
        f = tags[chiave]
        if chiave == "TCON":
            campi[campo] = "; ".join(f.genres)
        elif chiave in ("TRCK", "TPOS"):
            n, _, tot = str(f.text[0]).partition("/")
            campi[campo] = [n.strip(), tot.strip()]
        elif chiave == "TDRC":
            campi[campo] = str(f.text[0])[:4]
        else:
            campi[campo] = "; ".join(str(t) for t in f.text if str(t))
    for f in tags.getall("TXXX"):
        for campo, desc in TXXX_MUTAGEN.items():
            if f.desc.upper() == desc:
                campi[campo] = "; ".join(f.text)
    comm = [f for f in tags.getall("COMM") if f.desc == ""]
    if comm:
        campi["commenti"] = "; ".join(comm[0].text)
    uslt = tags.getall("USLT")
    if uslt:
        campi["testo"] = uslt[0].text
    immagini = [{"tipo": int(f.type), "mime": f.mime, "byte": len(f.data)} for f in tags.getall("APIC")]
    return {"campi": campi, "immagini": immagini}


def main():
    print("1) Prove nel browser (test/index.html)")
    esito, letture, scritti = esegui_nel_browser()
    if not esito:
        sys.exit("   Non sono riuscito a leggere il risultato delle prove.")
    for f in esito["fallite"]:
        print(f"   ✗ {f['nome']}\n     {f['errore']}")
    print(f"   {esito['superate']} superate su {esito['totale']}")

    print("2) Confronto indipendente con mutagen")
    differenze = 0
    for nome, nostra in sorted((letture or {}).items()):
        loro = lettura_mutagen(str(RADICE / "esempi" / nome))
        problemi = []
        if nostra["campi"] != loro["campi"]:
            for k in sorted(set(nostra["campi"]) | set(loro["campi"])):
                if nostra["campi"].get(k) != loro["campi"].get(k):
                    problemi.append(f"{k}: noi {nostra['campi'].get(k)!r}, mutagen {loro['campi'].get(k)!r}")
        if nostra["immagini"] != loro["immagini"]:
            problemi.append(f"immagini: noi {nostra['immagini']}, mutagen {loro['immagini']}")
        if problemi:
            differenze += 1
            print(f"   ✗ {nome}")
            for p in problemi:
                print("     " + p)
        else:
            print(f"   ✓ {nome}")
    if not letture:
        differenze += 1
        print("   nessuna lettura ricevuta dal browser")

    print("3) File SCRITTI da Tag-liatelle, controllati da mutagen e byte per byte")
    with tempfile.TemporaryDirectory() as cartella:
        for nome, s in sorted((scritti or {}).items()):
            dati = base64.b64decode(s["base64"])
            percorso = Path(cartella) / nome.replace("#", "-")
            percorso.write_bytes(dati)
            problemi = []
            loro = lettura_mutagen(str(percorso))
            if loro["campi"] != s["campi"]:
                for k in sorted(set(s["campi"]) | set(loro["campi"])):
                    if s["campi"].get(k) != loro["campi"].get(k):
                        problemi.append(f"{k}: atteso {s['campi'].get(k)!r}, mutagen {loro['campi'].get(k)!r}")
            if "immagini" in s and loro["immagini"] != s["immagini"]:
                problemi.append(f"immagini: attese {s['immagini']}, mutagen {loro['immagini']}")
            from mutagen.id3 import ID3
            versione = "2.%d" % ID3(str(percorso), load_v1=False).version[1]
            if versione != s["versione"]:
                problemi.append(f"versione: attesa {s['versione']}, mutagen {versione}")
            # audio: calcolato qui in Python, senza usare il codice di Tag-liatelle
            inizio = 0
            if dati[:3] == b"ID3":
                b = dati[6:10]
                inizio = 10 + ((b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3])
            fine = len(dati) - 128 if dati[-128:-125] == b"TAG" else len(dati)
            originale = (RADICE / "esempi" / nome.split("#")[0]).read_bytes()[s["audio"]["inizio"]:s["audio"]["fine"]]
            if dati[inizio:fine] != originale:
                problemi.append("l'audio NON è identico all'originale")
            if problemi:
                differenze += 1
                print(f"   ✗ {nome}")
                for p in problemi:
                    print("     " + p)
            else:
                print(f"   ✓ {nome}  (v{versione}, audio identico)")
    if not scritti:
        differenze += 1
        print("   nessun file scritto ricevuto dal browser")

    ok = not esito["fallite"] and not differenze
    print("\nTUTTO A POSTO" if ok else "\nCI SONO PROBLEMI")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
