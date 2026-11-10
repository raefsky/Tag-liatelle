#!/usr/bin/env python3
"""
Tag-liatelle · scritta del logo in tracciati
Trasforma la parola "Tag-liatelle" (carattere Fraunces) in tracciati SVG,
così il logo si vede uguale ovunque, anche dove il carattere non c'è.

Serve solo a chi disegna il logo, non all'app. Richiede fontTools e brotli:
    python3 -m venv venv && venv/bin/pip install fonttools brotli
    venv/bin/python strumenti/scritta.py
Stampa tre tracciati (Tag, trattino, liatelle) e la larghezza totale.
"""
import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RADICE = Path(__file__).resolve().parent.parent
PESO, OTTICA = 720, 72  # come i titoli dell'app


def tracciati(parti, spaziatura=-8):
    font = TTFont(RADICE / "font" / "fraunces-variabile.woff2")
    font = instancer.instantiateVariableFont(font, {"wght": PESO, "opsz": OTTICA})
    cmap, glifi, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    upm = font["head"].unitsPerEm
    x, risultato = 0, []
    for testo in parti:
        penna = SVGPathPen(glifi)
        for car in testo:
            nome = cmap[ord(car)]
            # y verso il basso come in SVG; linea di base a y = 0
            glifi[nome].draw(TransformPen(penna, (1, 0, 0, -1, x, 0)))
            x += hmtx[nome][0] + spaziatura
        risultato.append(penna.getCommands())
    return {"upm": upm, "larghezza": x - spaziatura, "tracciati": risultato,
            "ascendente": font["OS/2"].sCapHeight}


if __name__ == "__main__":
    print(json.dumps(tracciati(["Tag", "-", "liatelle"])))
