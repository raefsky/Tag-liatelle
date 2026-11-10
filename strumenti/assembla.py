#!/usr/bin/env python3
"""
Tag-liatelle · assembla
Unisce index.html, il foglio di stile, gli script e i caratteri in UN SOLO
file HTML portatile, che si apre con un doppio clic e funziona senza internet.

Uso (dalla cartella del progetto):
    python3 strumenti/assembla.py 0.1.0
Risultato:
    rilasci/0.1.0/index.html

Non cambia niente nei file di partenza: legge e basta.
"""
import base64
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent


def incorpora_font(css: str, cartella_css: Path) -> str:
    """Sostituisce url("../font/x.woff2") con il contenuto del file, in base64."""
    def sostituisci(m):
        percorso = (cartella_css / m.group(1)).resolve()
        dati = base64.b64encode(percorso.read_bytes()).decode("ascii")
        return f'url("data:font/woff2;base64,{dati}")'
    return re.sub(r'url\("([^"]+\.woff2)"\)', sostituisci, css)


def assembla(versione: str) -> Path:
    html = (RADICE / "index.html").read_text(encoding="utf-8")

    # foglio di stile
    def stile(m):
        file_css = RADICE / m.group(1)
        css = incorpora_font(file_css.read_text(encoding="utf-8"), file_css.parent)
        return "<style>\n" + css + "\n</style>"
    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', stile, html)

    # script
    def script(m):
        js = (RADICE / m.group(1)).read_text(encoding="utf-8")
        js = js.replace("</script", "<\\/script")  # non deve chiudere il tag per sbaglio
        return f"<script>\n/* --- {m.group(1)} --- */\n" + js + "\n</script>"
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', script, html)

    # icone della pagina (favicon e icona per i dispositivi)
    tipi = {".svg": "image/svg+xml", ".png": "image/png"}
    def icona(m):
        file_icona = RADICE / m.group(2)
        dati = base64.b64encode(file_icona.read_bytes()).decode("ascii")
        return f'{m.group(1)}href="data:{tipi[file_icona.suffix]};base64,{dati}">'
    html = re.sub(r'(<link rel="(?:icon|apple-touch-icon)"[^>]*?)href="([^"]+)">', icona, html)

    # versione nel piede della pagina
    html = re.sub(r'<span id="versione">[^<]*</span>', f'<span id="versione">{versione}</span>', html)

    # controllo: niente deve restare collegato a file esterni o a internet
    residui = re.findall(r'(?:src|href)="(?!#|data:|https://creativecommons\.org)[^"]+"', html)
    if residui:
        raise SystemExit(f"Attenzione, collegamenti esterni rimasti: {residui}")

    uscita = RADICE / "rilasci" / versione / "index.html"
    uscita.parent.mkdir(parents=True, exist_ok=True)
    uscita.write_text(html, encoding="utf-8")
    kb = uscita.stat().st_size / 1024
    print(f"Fatto: {uscita.relative_to(RADICE)} ({kb:.0f} KB, {n_css} foglio di stile, {n_js} script)")
    return uscita


if __name__ == "__main__":
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        raise SystemExit("Scrivi la versione, per esempio: python3 strumenti/assembla.py 0.1.0")
    assembla(sys.argv[1])
