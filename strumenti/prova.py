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
    return blocco("esito"), blocco("letture")


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
    esito, letture = esegui_nel_browser()
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

    ok = not esito["fallite"] and not differenze
    print("\nTUTTO A POSTO" if ok else "\nCI SONO PROBLEMI")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
