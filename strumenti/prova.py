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
TXXX_MUTAGEN = {"catalogo": "CATALOGNUMBER", "codiceBarre": "BARCODE", "licenza": "LICENSE",
                "copyrightRegistrazione": "PRODUCTION_COPYRIGHT"}


def browser():
    for p in (EDGE, CHROME):
        if Path(p).exists():
            return p
    sys.exit("Non trovo né Microsoft Edge né Google Chrome nella cartella Applicazioni.")


def esegui_nel_browser():
    """
    Apre test/index.html nel browser senza finestra e aspetta il risultato.
    La pagina viene servita da un piccolo server che vive solo dentro questo
    script e risponde solo a questo computer (127.0.0.1): quando le prove
    finiscono, la pagina gli consegna il risultato. Niente esce dal computer.
    """
    import functools
    import http.server
    import threading

    ricevuto = {}
    arrivato = threading.Event()

    class Servitore(http.server.SimpleHTTPRequestHandler):
        def do_POST(self):
            corpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            ricevuto.update(json.loads(corpo.decode("utf-8")))
            self.send_response(204)
            self.end_headers()
            arrivato.set()

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Servitore, directory=str(RADICE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    indirizzo = f"http://127.0.0.1:{server.server_address[1]}/test/index.html?consegna=1"
    with tempfile.TemporaryDirectory() as profilo:
        processo = subprocess.Popen([browser(), "--headless=new", "--disable-gpu", f"--user-data-dir={profilo}",
                                     "--no-first-run", indirizzo],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            arrivato.wait(timeout=120)
        finally:
            processo.terminate()
            try:
                processo.wait(timeout=10)
            except subprocess.TimeoutExpired:
                processo.kill()
            server.shutdown()
    return ricevuto.get("esito"), ricevuto.get("letture"), ricevuto.get("scritti")


# ---------------------------------------------------------------------------
# FLAC: tabella scritta qui, indipendente da quella dell'app (js/campi.js)
# ---------------------------------------------------------------------------
VORBIS = {
    "TITLE": "titolo", "ARTIST": "artista", "ALBUM": "album", "DATE": "anno", "YEAR": "anno", "GENRE": "genere",
    "TRACKNUMBER": "traccia", "DISCNUMBER": "disco",
    "ALBUMARTIST": "artistaAlbum", "ALBUM ARTIST": "artistaAlbum", "COMPOSER": "compositore", "LYRICIST": "paroliere",
    "CONDUCTOR": "direttore", "REMIXER": "remixer", "SUBTITLE": "sottotitolo", "GROUPING": "raggruppamento",
    "LANGUAGE": "lingua", "LYRICS": "testo", "UNSYNCEDLYRICS": "testo",
    "COPYRIGHT": "copyright", "PRODUCTION_COPYRIGHT": "copyrightRegistrazione",
    "ORGANIZATION": "editore", "LABEL": "editore", "PUBLISHER": "editore",
    "CATALOGNUMBER": "catalogo", "BARCODE": "codiceBarre", "UPC": "codiceBarre", "EAN": "codiceBarre", "ISRC": "isrc",
    "WEBSITE": "sitoArtista", "URL": "sitoArtista", "WWWARTIST": "sitoArtista", "WWWPUBLISHER": "sitoEtichetta",
    "BPM": "bpm", "INITIALKEY": "tonalita", "KEY": "tonalita", "COMPILATION": "compilation",
    "ENCODEDBY": "codificatoDa", "ENCODED-BY": "codificatoDa", "COMMENT": "commenti", "DESCRIPTION": "commenti",
}
TOTALI = {"TRACKTOTAL": "traccia", "TOTALTRACKS": "traccia", "DISCTOTAL": "disco", "TOTALDISCS": "disco"}


def lettura_mutagen_flac(percorso):
    from mutagen.flac import FLAC
    f = FLAC(percorso)
    valori, numeri, personalizzati = {}, {}, []
    for nome, valore in (f.tags or []):          # in mutagen i commenti sono coppie (nome, valore), in ordine
        n = nome.upper()
        if n not in VORBIS and n not in TOTALI and n not in ("LICENSE", "METADATA_BLOCK_PICTURE", "COVERART", "COVERARTMIME"):
            personalizzati.append({"nome": nome, "valore": valore})
        if n == "LICENSE":
            campo = "sitoLicenza" if valore.strip().lower().startswith(("http://", "https://")) else "licenza"
        else:
            campo = TOTALI.get(n) or VORBIS.get(n)
        if not campo:
            continue
        if campo in ("traccia", "disco"):
            x = numeri.setdefault(campo, {})
            if n in TOTALI:
                x.setdefault("tot", valore.strip())
            elif "n" not in x:
                a, _, b = valore.partition("/")
                x["n"] = a.strip()
                if b.strip():
                    x["insieme"] = b.strip()
            continue
        valori.setdefault(campo, []).append((n, valore))
    campi = {}
    for campo, lista in valori.items():
        if campo == "anno":
            campi[campo] = lista[0][1].strip()[:4]
            continue
        tenuti = [v for i, (n, v) in enumerate(lista) if not any(v2 == v and n2 != n for n2, v2 in lista[:i])]
        campi[campo] = "; ".join(v for v in tenuti if v != "")
    for campo, x in numeri.items():
        campi[campo] = [x.get("n", ""), x["tot"] if "tot" in x else x.get("insieme", "")]
    immagini = [{"tipo": int(p.type), "mime": p.mime, "byte": len(p.data)} for p in f.pictures]
    return {"campi": campi, "immagini": immagini, "durata": f.info.length, "personalizzati": personalizzati}


def audio_flac(dati):
    """Dove comincia e dove finisce l'audio di un FLAC: calcolato qui, senza il codice dell'app."""
    pos = 0
    if dati[:3] == b"ID3":
        b = dati[6:10]
        pos = 10 + ((b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3])
    assert dati[pos:pos + 4] == b"fLaC", "manca la sigla fLaC"
    pos += 4
    while True:
        ultimo = dati[pos] & 0x80
        pos += 4 + int.from_bytes(dati[pos + 1:pos + 4], "big")
        if ultimo:
            break
    fine = len(dati) - 128 if dati[-128:-125] == b"TAG" else len(dati)
    return pos, fine


def lettura_mutagen(percorso):
    if percorso.lower().endswith(".flac"):
        return lettura_mutagen_flac(percorso)
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
    noti = set(TXXX_MUTAGEN.values())
    personalizzati = [{"nome": f.desc, "valore": "; ".join(f.text)} for f in tags.getall("TXXX") if f.desc.upper() not in noti]
    return {"campi": campi, "immagini": immagini, "personalizzati": personalizzati}


def main():
    print("1) Prove nel browser (test/index.html)")
    esito, letture, scritti = esegui_nel_browser()
    if not esito:
        # a volte Edge impiega troppo ad avviarsi: si riprova una volta
        print("   Il browser non ha risposto: riprovo una volta…")
        esito, letture, scritti = esegui_nel_browser()
    if not esito:
        sys.exit("   Non sono riuscito a leggere il risultato delle prove (il browser non ha risposto due volte).")
    for f in esito["fallite"]:
        print(f"   ✗ {f['nome']}\n     {f['errore']}")
    print(f"   {esito['superate']} superate su {esito['totale']}")

    print("2) Confronto indipendente con mutagen")
    differenze = 0
    atteso = json.loads((RADICE / "esempi" / "atteso.json").read_text(encoding="utf-8"))
    for nome, nostra in sorted((letture or {}).items()):
        try:
            loro = lettura_mutagen(str(RADICE / "esempi" / nome))
        except Exception as e:
            if atteso.get(nome, {}).get("avvisi"):
                print(f"   – {nome}  (rovinato apposta: mutagen si rifiuta di leggerlo, noi avvisiamo)")
            else:
                differenze += 1
                print(f"   ✗ {nome}\n     mutagen non riesce a leggerlo: {e}")
            continue
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
            flac = nome.split("#")[0].lower().endswith(".flac")
            base, _, variante = nome.partition("#")
            percorso = Path(cartella) / (Path(base).stem + ("-" + variante if variante else "") + Path(base).suffix)
            percorso.write_bytes(dati)
            problemi = []
            loro = lettura_mutagen(str(percorso))
            if loro["campi"] != s["campi"]:
                for k in sorted(set(s["campi"]) | set(loro["campi"])):
                    if s["campi"].get(k) != loro["campi"].get(k):
                        problemi.append(f"{k}: atteso {s['campi'].get(k)!r}, mutagen {loro['campi'].get(k)!r}")
            ordina = lambda l: sorted(l, key=lambda p: (p["nome"], p["valore"]))
            if "personalizzati" in s and ordina(loro["personalizzati"]) != ordina(s["personalizzati"]):
                problemi.append(f"campi personalizzati: attesi {s['personalizzati']}, mutagen {loro['personalizzati']}")
            if "immagini" in s and loro["immagini"] != s["immagini"]:
                problemi.append(f"immagini: attese {s['immagini']}, mutagen {loro['immagini']}")
            if flac:
                versione = "FLAC"
                if abs(loro["durata"] - 6 * 4096 / 44100) > 0.001:
                    problemi.append(f"durata: {loro['durata']:.3f} s, diversa dall'originale")
                inizio, fine = audio_flac(dati)
            else:
                from mutagen.id3 import ID3
                versione = "v2.%d" % ID3(str(percorso), load_v1=False).version[1]
                if versione != "v" + s["versione"]:
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
                print(f"   ✓ {nome}  ({versione}, audio identico)")
    if not scritti:
        differenze += 1
        print("   nessun file scritto ricevuto dal browser")

    ok = not esito["fallite"] and not differenze
    print("\nTUTTO A POSTO" if ok else "\nCI SONO PROBLEMI")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
