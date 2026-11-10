#!/usr/bin/env python3
"""
Tag-liatelle · genera i file di prova in esempi/
File MP3 piccolissimi (circa un secondo di silenzio) con tag di ogni tipo:
nessun tag, ID3v2.2, v2.3, v2.4, ID3v1, testi accentati in tutte le codifiche,
copertine diverse, campi sconosciuti, "unsynchronisation", un tag rovinato.

I byte dei tag sono scritti a mano qui sotto, seguendo le specifiche ID3,
così sono indipendenti sia dal codice dell'app sia da mutagen
(mutagen serve poi a verificare che i file siano davvero validi).

Uso:  python3 strumenti/genera_esempi.py
Crea: esempi/*.mp3, esempi/atteso.json, test/esempi-dati.js
"""
import base64
import json
import struct
import subprocess
import zlib
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
ESEMPI = RADICE / "esempi"
IMMAGINI = ESEMPI / "immagini"


# ---------------------------------------------------------------------------
# Audio: fotogrammi MPEG-1 Layer III, 128 kbps, 44,1 kHz, mono, di silenzio
# ---------------------------------------------------------------------------
def audio_silenzio(fotogrammi):
    intestazione = bytes([0xFF, 0xFB, 0x90, 0xC0])
    lunghezza = 144 * 128000 // 44100          # 417 byte per fotogramma
    uno = intestazione + bytes(lunghezza - 4)  # informazioni laterali e dati a zero = silenzio
    return uno * fotogrammi


# ---------------------------------------------------------------------------
# Immagini di prova (16×16 pixel), create senza librerie esterne
# ---------------------------------------------------------------------------
def png(larghezza, altezza, pixel):
    def blocco(tipo, dati):
        return struct.pack(">I", len(dati)) + tipo + dati + struct.pack(">I", zlib.crc32(tipo + dati) & 0xFFFFFFFF)
    righe = b"".join(b"\x00" + bytes(c for p in riga for c in p) for riga in pixel)
    return (b"\x89PNG\r\n\x1a\n" + blocco(b"IHDR", struct.pack(">IIBBBBB", larghezza, altezza, 8, 2, 0, 0, 0))
            + blocco(b"IDAT", zlib.compress(righe, 9)) + blocco(b"IEND", b""))


def immagini():
    IMMAGINI.mkdir(parents=True, exist_ok=True)
    uovo, bruno, crema, rosso = (229, 168, 35), (43, 31, 23), (242, 232, 213), (179, 54, 43)
    strisce = [[uovo if (y // 3) % 2 == 0 else bruno for x in range(16)] for y in range(16)]
    scacchi = [[rosso if (x // 4 + y // 4) % 2 == 0 else crema for x in range(16)] for y in range(16)]
    (IMMAGINI / "strisce.png").write_bytes(png(16, 16, strisce))
    (IMMAGINI / "scacchi.png").write_bytes(png(16, 16, scacchi))
    # le versioni JPEG le crea "sips", lo strumento di immagini già presente su macOS;
    # restano salvate nella cartella, così non serve rifarle
    for nome in ("strisce", "scacchi"):
        jpg = IMMAGINI / f"{nome}.jpg"
        if not jpg.exists():
            subprocess.run(["sips", "-s", "format", "jpeg", str(IMMAGINI / f"{nome}.png"), "--out", str(jpg)],
                           check=True, capture_output=True)
    return {n: (IMMAGINI / n).read_bytes() for n in ("strisce.png", "scacchi.png", "strisce.jpg", "scacchi.jpg")}


# ---------------------------------------------------------------------------
# Mattoni ID3v2
# ---------------------------------------------------------------------------
def syncsafe(n):
    return bytes([(n >> 21) & 0x7F, (n >> 14) & 0x7F, (n >> 7) & 0x7F, n & 0x7F])


def codifica(testo, enc):
    if enc == 0: return testo.encode("latin-1")
    if enc == 1: return testo.encode("utf-16")          # con BOM (FF FE), little endian
    if enc == 2: return testo.encode("utf-16-be")       # senza BOM (solo v2.4)
    return testo.encode("utf-8")                       # 3 (solo v2.4)


def fine(enc):
    return b"\x00\x00" if enc in (1, 2) else b"\x00"


def frame(ident, dati, ver, flags=b"\x00\x00"):
    if ver == 2:
        return ident.encode() + struct.pack(">I", len(dati))[1:] + dati
    misura = syncsafe(len(dati)) if ver == 4 else struct.pack(">I", len(dati))
    return ident.encode() + misura + flags + dati


def testo(ident, valore, ver, enc=1):
    # in v2.4 più valori si separano con il carattere nullo
    if isinstance(valore, list):
        corpo = fine(enc).join(codifica(v, enc) for v in valore)
    else:
        corpo = codifica(valore, enc)
    return frame(ident, bytes([enc]) + corpo, ver)


def txxx(descrizione, valore, ver, enc=1):
    return frame("TXX" if ver == 2 else "TXXX", bytes([enc]) + codifica(descrizione, enc) + fine(enc) + codifica(valore, enc), ver)


def commento(ident, lingua, descrizione, valore, ver, enc=1):
    return frame(ident, bytes([enc]) + lingua.encode() + codifica(descrizione, enc) + fine(enc) + codifica(valore, enc), ver)


def url(ident, indirizzo, ver):
    return frame(ident, indirizzo.encode("latin-1"), ver)


def apic(dati_img, mime, tipo, descrizione, ver, enc=0):
    if ver == 2:
        formato = b"JPG" if "jpeg" in mime else b"PNG"
        return frame("PIC", bytes([enc]) + formato + bytes([tipo]) + codifica(descrizione, enc) + fine(enc) + dati_img, 2)
    return frame("APIC", bytes([enc]) + mime.encode() + b"\x00" + bytes([tipo]) + codifica(descrizione, enc) + fine(enc) + dati_img, ver)


def desincronizza(dati):
    """Applica la "unsynchronisation": dopo ogni FF seguito da 00 o da un byte ≥ E0 si inserisce 00."""
    uscita = bytearray()
    for i, b in enumerate(dati):
        uscita.append(b)
        if b == 0xFF and (i + 1 == len(dati) or dati[i + 1] == 0x00 or dati[i + 1] >= 0xE0):
            uscita.append(0x00)
    return bytes(uscita)


def tag(ver, frames, riempimento=0, unsync=False):
    corpo = b"".join(frames) + bytes(riempimento)
    flags = 0
    if unsync:
        corpo = desincronizza(corpo)
        flags |= 0x80
    return b"ID3" + bytes([ver, 0, flags]) + syncsafe(len(corpo)) + corpo


def id3v1(titolo="", artista="", album="", anno="", commento_="", traccia=0, genere=255):
    def campo(s, n):
        return s.encode("latin-1")[:n].ljust(n, b"\x00")
    return (b"TAG" + campo(titolo, 30) + campo(artista, 30) + campo(album, 30) + campo(anno, 4)
            + campo(commento_, 28) + b"\x00" + bytes([traccia, genere]))


# ---------------------------------------------------------------------------
# I file di prova e ciò che ci aspettiamo di leggere
# ---------------------------------------------------------------------------
def esempi(img):
    file = []

    def aggiungi(nome, descrizione, prima, fotogrammi, dopo=b"", atteso=None):
        audio = audio_silenzio(fotogrammi)
        dati = prima + audio + dopo
        a = {"versione": None, "campi": {}, "immagini": [], "personalizzati": [], "altri": [], "id3v1": None}
        a.update(atteso or {})
        a["audio"] = {"inizio": len(prima), "fine": len(prima) + len(audio)}
        file.append({"nome": nome, "descrizione": descrizione, "dati": dati, "atteso": a})

    # 1. nessun tag
    aggiungi("01-senza-tag.mp3", "Solo audio, nessun tag.", b"", 20)

    # 2. ID3v2.3 con testo UTF-16: il caso più comune (e quello che scriveremo noi)
    v = 3
    aggiungi("02-id3v23-base.mp3", "ID3v2.3, testo UTF-16, campi Base con accenti.", tag(v, [
        testo("TIT2", "Perché la città è più bella di sera", v),
        testo("TPE1", "Niccolò & la Società Corale", v),
        testo("TALB", "Canzoni d'autunno — vol. 2", v),
        testo("TYER", "2025", v),
        testo("TCON", "(80)", v),                       # 80 = Folk nell'elenco storico dei generi
        testo("TRCK", "2/10", v),
        testo("TPOS", "1/2", v),
    ], riempimento=256), 21, atteso={
        "versione": "2.3",
        "campi": {"titolo": "Perché la città è più bella di sera", "artista": "Niccolò & la Società Corale",
                  "album": "Canzoni d'autunno — vol. 2", "anno": "2025", "genere": "Folk",
                  "traccia": ["2", "10"], "disco": ["1", "2"]},
    })

    # 3. ID3v2.4 con UTF-8, data completa, più artisti, copertina JPEG frontale
    v = 4
    aggiungi("03-id3v24-utf8-copertina.mp3", "ID3v2.4, UTF-8, due artisti, copertina JPEG.", tag(v, [
        testo("TIT2", "Ninna nanna ♪ (versione acustica)", v, enc=3),
        testo("TPE1", ["Ève Müller", "Øystein Ångström"], v, enc=3),
        testo("TALB", "Ünterwegs", v, enc=3),
        testo("TDRC", "2024-05-17", v, enc=3),
        testo("TCON", "Jazz", v, enc=3),
        testo("TRCK", "7", v, enc=3),
        testo("TCOM", "Ève Müller", v, enc=3),
        testo("TPRO", "2024 Etichetta Fantasia", v, enc=3),
        apic(img["strisce.jpg"], "image/jpeg", 3, "", v, enc=3),
    ], riempimento=512), 22, atteso={
        "versione": "2.4",
        "campi": {"titolo": "Ninna nanna ♪ (versione acustica)", "artista": "Ève Müller; Øystein Ångström",
                  "album": "Ünterwegs", "anno": "2024", "genere": "Jazz", "traccia": ["7", ""],
                  "compositore": "Ève Müller", "copyrightRegistrazione": "2024 Etichetta Fantasia"},
        "immagini": [{"tipo": 3, "mime": "image/jpeg", "byte": len(img["strisce.jpg"])}],
    })

    # 4. tante cose insieme: due copertine, campi personalizzati e sconosciuti, ID3v1 in coda
    v = 3
    aggiungi("04-copertine-e-sconosciuti.mp3",
             "ID3v2.3 con copertina davanti (PNG) e dietro (JPEG), crediti, diritti, campi sconosciuti e ID3v1.",
             tag(v, [
                 testo("TIT2", "Tagliatelle al ragù", v),
                 testo("TPE1", "Le Sfogline", v),
                 testo("TALB", "Al dente", v),
                 testo("TPE2", "Artisti vari", v),
                 testo("TYER", "2026", v),
                 testo("TRCK", "03/12", v),
                 testo("TCON", "Cantautorato", v),
                 testo("TEXT", "Zia Pina", v),
                 testo("TCOP", "2026 Le Sfogline", v),
                 testo("TPUB", "Edizioni del Mattarello", v),
                 testo("TSRC", "ITA012600003", v),
                 testo("TBPM", "96", v),
                 testo("TKEY", "Am", v),
                 testo("TCMP", "1", v),
                 testo("TENC", "Tag-liatelle prove", v),
                 txxx("CATALOGNUMBER", "MAT-003", v),
                 txxx("BARCODE", "8012345678905", v),
                 txxx("FORNO", "statico, 180 °C", v),        # campo personalizzato
                 commento("COMM", "ita", "", "Da servire caldo.", v),
                 commento("COMM", "eng", "iTunNORM", " 000001 000002", v),   # commento tecnico, non da mostrare
                 commento("USLT", "ita", "", "Prima riga del testo\nSeconda riga", v),
                 url("WOAR", "https://esempio.it/sfogline", v),
                 url("WCOP", "https://creativecommons.org/licenses/by-nc-sa/4.0/", v),
                 apic(img["scacchi.png"], "image/png", 3, "Davanti", v, enc=1),
                 apic(img["strisce.jpg"], "image/jpeg", 4, "Dietro", v),
                 frame("PRIV", b"tag-liatelle.prova\x00\x01\x02\x03\xff", v),
                 frame("XYZW", b"frame inventato che nessuno conosce", v),
             ], riempimento=128), 23,
             dopo=id3v1("Tagliatelle al ragu", "Le Sfogline", "Al dente", "2026", "vecchio tag v1", 3, 12),
             atteso={
                 "versione": "2.3",
                 "campi": {"titolo": "Tagliatelle al ragù", "artista": "Le Sfogline", "album": "Al dente",
                           "artistaAlbum": "Artisti vari", "anno": "2026", "traccia": ["03", "12"],
                           "genere": "Cantautorato", "paroliere": "Zia Pina", "copyright": "2026 Le Sfogline",
                           "editore": "Edizioni del Mattarello", "isrc": "ITA012600003", "bpm": "96",
                           "tonalita": "Am", "compilation": "1", "codificatoDa": "Tag-liatelle prove",
                           "catalogo": "MAT-003", "codiceBarre": "8012345678905",
                           "commenti": "Da servire caldo.", "testo": "Prima riga del testo\nSeconda riga",
                           "sitoArtista": "https://esempio.it/sfogline",
                           "sitoLicenza": "https://creativecommons.org/licenses/by-nc-sa/4.0/"},
                 "immagini": [{"tipo": 3, "mime": "image/png", "byte": len(img["scacchi.png"])},
                              {"tipo": 4, "mime": "image/jpeg", "byte": len(img["strisce.jpg"])}],
                 "personalizzati": [{"nome": "FORNO", "valore": "statico, 180 °C"}],
                 "altri": ["COMM", "PRIV", "XYZW"],
                 "id3v1": {"titolo": "Tagliatelle al ragu", "artista": "Le Sfogline", "album": "Al dente",
                           "anno": "2026", "commento": "vecchio tag v1", "traccia": 3, "genere": "Other"},
             })

    # 5. solo il vecchio ID3v1
    aggiungi("05-solo-id3v1.mp3", "Solo ID3v1.1 alla fine del file.", b"", 20,
             dopo=id3v1("Vecchia canzone", "Gruppo storico", "Primo disco", "1987", "", 5, 17),
             atteso={"id3v1": {"titolo": "Vecchia canzone", "artista": "Gruppo storico", "album": "Primo disco",
                               "anno": "1987", "commento": "", "traccia": 5, "genere": "Rock"},
                     "campi": {"titolo": "Vecchia canzone", "artista": "Gruppo storico", "album": "Primo disco",
                               "anno": "1987", "genere": "Rock", "traccia": ["5", ""]}})

    # 6. ID3v2.2: nomi dei frame di tre lettere, copertina PIC
    v = 2
    aggiungi("06-id3v22.mp3", "ID3v2.2 (formato antico), testo Latin-1, copertina PIC.", tag(v, [
        testo("TT2", "Caffè lungo", v, enc=0),
        testo("TP1", "Trio Ottocento", v, enc=0),
        testo("TAL", "Pausa", v, enc=0),
        testo("TYE", "1999", v, enc=0),
        testo("TRK", "1/3", v, enc=0),
        apic(img["scacchi.jpg"], "image/jpeg", 3, "", v),
    ], riempimento=64), 20, atteso={
        "versione": "2.2",
        "campi": {"titolo": "Caffè lungo", "artista": "Trio Ottocento", "album": "Pausa", "anno": "1999",
                  "traccia": ["1", "3"]},
        "immagini": [{"tipo": 3, "mime": "image/jpeg", "byte": len(img["scacchi.jpg"])}],
    })

    # 7. ID3v2.3 con "unsynchronisation" su tutto il tag (la copertina contiene byte FF)
    v = 3
    aggiungi("07-id3v23-unsync.mp3", "ID3v2.3 con unsynchronisation e copertina JPEG.", tag(v, [
        testo("TIT2", "Sincronia perduta", v),
        testo("TPE1", "Ÿ e i suoi fratelli", v),
        apic(img["strisce.jpg"], "image/jpeg", 3, "", v),
    ], riempimento=32, unsync=True), 21, atteso={
        "versione": "2.3",
        "campi": {"titolo": "Sincronia perduta", "artista": "Ÿ e i suoi fratelli"},
        "immagini": [{"tipo": 3, "mime": "image/jpeg", "byte": len(img["strisce.jpg"])}],
    })

    # 8. Latin-1 e UTF-16 big endian (v2.4)
    v = 4
    aggiungi("08-codifiche-miste.mp3", "ID3v2.4 con Latin-1 e UTF-16 senza BOM.", tag(v, [
        testo("TIT2", "Già là, più giù", v, enc=0),
        testo("TPE1", "Coro «Le Voci»", v, enc=2),
        testo("TALB", "Prove di codifica", v, enc=1),
        testo("TCON", "RX", v, enc=0),
    ], riempimento=0), 20, atteso={
        "versione": "2.4",
        "campi": {"titolo": "Già là, più giù", "artista": "Coro «Le Voci»", "album": "Prove di codifica",
                  "genere": "Remix"},
    })

    # 9. tag rovinato: la dimensione dichiarata va oltre la fine dei frame veri
    v = 3
    buono = tag(v, [testo("TIT2", "Si legge solo il titolo", v)], riempimento=0)
    rotto = bytearray(buono)
    rotto += b"TPE1\x7f\xff\xff\xff\x00\x00"                # un frame con una dimensione impossibile
    rotto[6:10] = syncsafe(len(rotto) - 10)
    aggiungi("09-tag-rovinato.mp3", "ID3v2.3 con un frame dalla dimensione impossibile.", bytes(rotto), 20, atteso={
        "versione": "2.3", "campi": {"titolo": "Si legge solo il titolo"}, "avvisi": True})

    return file


def main():
    img = immagini()
    elenco = esempi(img)
    ESEMPI.mkdir(exist_ok=True)
    atteso = {}
    for f in elenco:
        (ESEMPI / f["nome"]).write_bytes(f["dati"])
        atteso[f["nome"]] = {"descrizione": f["descrizione"], **f["atteso"]}
        print(f"esempi/{f['nome']:<36} {len(f['dati']):>6} byte  · {f['descrizione']}")
    (ESEMPI / "atteso.json").write_text(json.dumps(atteso, ensure_ascii=False, indent=2), encoding="utf-8")

    # gli stessi file, incorporati in uno script: così i test funzionano anche con un doppio clic
    righe = ["/* creato da strumenti/genera_esempi.py: non modificare a mano */",
             "window.ESEMPI = ["]
    for f in elenco:
        righe.append(f'  {{ nome: {json.dumps(f["nome"])}, base64: "{base64.b64encode(f["dati"]).decode()}" }},')
    righe.append("];")
    righe.append("window.ATTESO = " + json.dumps(atteso, ensure_ascii=False) + ";")
    (RADICE / "test").mkdir(exist_ok=True)
    (RADICE / "test" / "esempi-dati.js").write_text("\n".join(righe) + "\n", encoding="utf-8")
    print("test/esempi-dati.js e esempi/atteso.json aggiornati")


if __name__ == "__main__":
    main()
