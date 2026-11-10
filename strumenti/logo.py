#!/usr/bin/env python3
"""
Tag-liatelle · genera i file del logo (bozzetto B, "l'etichetta a strisce")
Tutti i file in logo/ nascono da qui, così restano coerenti fra loro.

    venv/bin/python strumenti/logo.py      (serve fontTools: vedi scritta.py)
"""
from pathlib import Path

from scritta import tracciati

RADICE = Path(__file__).resolve().parent.parent
USCITA = RADICE / "logo"

COLORI = {
    "chiaro": {"pasta": "#E5A823", "inchiostro": "#2B1F17"},   # su fondo chiaro
    "scuro":  {"pasta": "#EDBA45", "inchiostro": "#EFE4CF"},   # su fondo scuro
}

# ---------------------------------------------------------------------------
# Simbolo grande (da 48 pixel in su): cinque strisce, occhiello e laccetto.
# Il foro è un vero buco (regola evenodd): si vede lo sfondo, qualunque sia.
# ---------------------------------------------------------------------------
ETICHETTA = "M32 24H82Q88 24 88 30V72Q88 78 82 78H32L10 51Z"
FORO = "M22 51a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0Z"
STRISCE = [f"M4 {y}Q20 {y-4} 36 {y}T68 {y}T100 {y}" for y in (30, 41, 52, 63, 74)]
LACCETTO = "M26.6 46.2C19 36 15 23 22.4 13.6C28 6.8 38 9.6 34.4 17.6"


def simbolo(c, id_="t", mono=False):
    pasta = c["inchiostro"] if mono else c["pasta"]
    fondo = "" if mono else f'<path d="{ETICHETTA}{FORO}" fill="{c["inchiostro"]}" fill-rule="evenodd"/>'
    strisce = "".join(f'<path d="{d}"/>' for d in STRISCE)
    larghezza = 5.2 if mono else 7
    return f'''<defs><clipPath id="{id_}"><path d="{ETICHETTA}{FORO}" clip-rule="evenodd"/></clipPath></defs>
<g transform="rotate(-8 50 50)">
{fondo}
<g clip-path="url(#{id_})" fill="none" stroke="{pasta}" stroke-width="{larghezza}" stroke-linecap="round">{strisce}</g>
<path d="{ETICHETTA}" fill="none" stroke="{c["inchiostro"]}" stroke-width="2.8" stroke-linejoin="round"/>
<path d="{FORO}" fill="none" stroke="{c["inchiostro"]}" stroke-width="2.6"/>
</g>
<path d="{LACCETTO}" fill="none" stroke="{c["inchiostro"]}" stroke-width="2.6" stroke-linecap="round"/>'''


# ---------------------------------------------------------------------------
# Simbolo piccolo (16-32 pixel): tre strisce più grosse, niente laccetto.
# ---------------------------------------------------------------------------
P_ETICHETTA = "M10.8 7H26.6Q28.8 7 28.8 9.2V22.8Q28.8 25 26.6 25H10.8L3.4 16Z"
P_FORO = "M7 16a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0Z"
P_STRISCE = [f"M0 {y}Q6 {y-1.6} 12 {y}T24 {y}T36 {y}" for y in (10.2, 16, 21.8)]


def simbolo_piccolo(c, id_="p"):
    strisce = "".join(f'<path d="{d}"/>' for d in P_STRISCE)
    return f'''<defs><clipPath id="{id_}"><path d="{P_ETICHETTA}{P_FORO}" clip-rule="evenodd"/></clipPath></defs>
<g transform="rotate(-8 16 16)">
<!-- alone chiaro: il simbolo resta visibile anche nelle schede scure del browser -->
<path d="{P_ETICHETTA}" fill="none" stroke="#F2E8D5" stroke-width="3.6" stroke-linejoin="round"/>
<path d="{P_ETICHETTA}{P_FORO}" fill="{c["inchiostro"]}" fill-rule="evenodd"/>
<g clip-path="url(#{id_})" fill="none" stroke="{c["pasta"]}" stroke-width="3.6" stroke-linecap="round">{strisce}</g>
<path d="{P_ETICHETTA}" fill="none" stroke="{c["inchiostro"]}" stroke-width="1.8" stroke-linejoin="round"/>
</g>'''


def scritta(c, x, linea_base, scala, mono=False):
    s = tracciati(["Tag", "-", "liatelle"])
    tag, trattino, resto = s["tracciati"]
    colore_trattino = c["inchiostro"] if mono else c["pasta"]
    g = f'<g transform="translate({x} {linea_base}) scale({scala})">'
    g += f'<path d="{tag}" fill="{c["inchiostro"]}"/>'
    g += f'<path d="{trattino}" fill="{colore_trattino}"/>'
    g += f'<path d="{resto}" fill="{c["inchiostro"]}"/></g>'
    return g, s["larghezza"] * scala


def svg(viewbox, corpo, titolo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-label="{titolo}">\n'
            f'<title>{titolo}</title>\n<!-- Tag-liatelle · © Roberto Lanza · CC BY-NC-SA 4.0 -->\n{corpo}\n</svg>\n')


def logo_completo(c, mono=False):
    scala = 0.0225
    testo, larghezza = scritta(c, 112, 66, scala, mono)
    return svg(f"0 0 {112 + larghezza + 6:.0f} 100", simbolo(c, mono=mono) + "\n" + testo, "Tag-liatelle")


def scrivi(nome, contenuto):
    (USCITA / nome).write_text(contenuto, encoding="utf-8")
    print("scritto logo/" + nome)


if __name__ == "__main__":
    ch, sc = COLORI["chiaro"], COLORI["scuro"]
    scrivi("tag-liatelle-logo.svg", logo_completo(ch))
    scrivi("tag-liatelle-logo-scuro.svg", logo_completo(sc))
    scrivi("tag-liatelle-logo-un-colore.svg", logo_completo(ch, mono=True))
    scrivi("tag-liatelle-simbolo.svg", svg("0 0 100 100", simbolo(ch), "Tag-liatelle"))
    scrivi("tag-liatelle-simbolo-scuro.svg", svg("0 0 100 100", simbolo(sc), "Tag-liatelle"))
    scrivi("tag-liatelle-simbolo-un-colore.svg", svg("0 0 100 100", simbolo(ch, mono=True), "Tag-liatelle"))
    scrivi("favicon.svg", svg("0 0 32 32", simbolo_piccolo(ch), "Tag-liatelle"))
    # icona per le schermate dei dispositivi: simbolo su carta, con margine
    sfondo = '<rect width="100" height="100" fill="#F2E8D5"/>'
    scrivi("icona-dispositivi.svg",
           svg("0 0 100 100", sfondo + '<g transform="translate(9 9) scale(.82)">' + simbolo(ch) + "</g>", "Tag-liatelle"))
