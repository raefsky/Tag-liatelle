#!/usr/bin/env python3
"""
Tag-liatelle · file FLAC di prova
Costruisce a mano, byte per byte, dei file FLAC piccolissimi (mezzo secondo
di silenzio) seguendo le specifiche del formato: non serve nessun programma
esterno. Li usa strumenti/genera_esempi.py.

Un file FLAC è fatto così:
    "fLaC" + blocchi di metadati (STREAMINFO, commenti, immagini…) + audio
L'audio è una serie di fotogrammi, ognuno con i suoi codici di controllo.
"""
import base64
import hashlib
import struct

# tipi dei blocchi di metadati
STREAMINFO, PADDING, APPLICATION, SEEKTABLE, VORBIS_COMMENT, CUESHEET, PICTURE = range(7)

CAMPIONI_PER_FOTOGRAMMA = 4096


# ---------------------------------------------------------------------------
# Audio: fotogrammi di silenzio, 44,1 kHz, mono, 16 bit
# ---------------------------------------------------------------------------
def crc8(dati):
    c = 0
    for b in dati:
        c ^= b
        for _ in range(8):
            c = ((c << 1) ^ 0x07) & 0xFF if c & 0x80 else (c << 1) & 0xFF
    return c


def crc16(dati):
    c = 0
    for b in dati:
        c ^= b << 8
        for _ in range(8):
            c = ((c << 1) ^ 0x8005) & 0xFFFF if c & 0x8000 else (c << 1) & 0xFFFF
    return c


def fotogramma(numero):
    assert numero < 128
    # sincronismo, blocchi fissi | 4096 campioni, 44,1 kHz | mono, 16 bit | numero del fotogramma
    testa = bytes([0xFF, 0xF8, 0xC9, 0x08, numero])
    testa += bytes([crc8(testa)])
    corpo = bytes([0x00]) + bytes(2)   # sotto-fotogramma "costante" di valore 0 = silenzio
    f = testa + corpo
    return f + struct.pack(">H", crc16(f))


def audio(fotogrammi):
    return b"".join(fotogramma(i) for i in range(fotogrammi))


# ---------------------------------------------------------------------------
# Blocchi di metadati
# ---------------------------------------------------------------------------
def blocco(tipo, dati, ultimo=False):
    return bytes([(0x80 if ultimo else 0) | tipo]) + struct.pack(">I", len(dati))[1:] + dati


def streaminfo(fotogrammi):
    campioni = fotogrammi * CAMPIONI_PER_FOTOGRAMMA
    lung = len(fotogramma(0))
    d = struct.pack(">HH", CAMPIONI_PER_FOTOGRAMMA, CAMPIONI_PER_FOTOGRAMMA)
    d += struct.pack(">I", lung)[1:] * 2
    # 20 bit frequenza, 3 bit canali-1, 5 bit (bit per campione)-1, 36 bit campioni totali
    d += struct.pack(">Q", (44100 << 44) | (0 << 41) | (15 << 36) | campioni)
    d += hashlib.md5(bytes(campioni * 2)).digest()      # impronta dell'audio non compresso
    return d


def commenti(fornitore, voci):
    """voci: elenco di ("NOME", "valore") oppure di byte già pronti."""
    v = fornitore.encode("utf-8")
    d = struct.pack("<I", len(v)) + v + struct.pack("<I", len(voci))
    for voce in voci:
        b = voce if isinstance(voce, bytes) else f"{voce[0]}={voce[1]}".encode("utf-8")
        d += struct.pack("<I", len(b)) + b
    return d


def immagine(dati, mime, tipo, descrizione="", lato=16, profondita=24):
    m, t = mime.encode(), descrizione.encode("utf-8")
    return (struct.pack(">II", tipo, len(m)) + m + struct.pack(">I", len(t)) + t
            + struct.pack(">IIII", lato, lato, profondita, 0) + struct.pack(">I", len(dati)) + dati)


def tabella_ricerca():
    return struct.pack(">QQH", 0, 0, CAMPIONI_PER_FOTOGRAMMA)


def componi(blocchi, fotogrammi, prima=b""):
    """blocchi: elenco di (tipo, dati). Mette il segno "ultimo" sull'ultimo."""
    meta = b"".join(blocco(t, d, i == len(blocchi) - 1) for i, (t, d) in enumerate(blocchi))
    testa = prima + b"fLaC" + meta
    a = audio(fotogrammi)
    return testa + a, {"inizio": len(testa), "fine": len(testa) + len(a)}


# ---------------------------------------------------------------------------
# I file di prova e ciò che ci aspettiamo di leggere
# ---------------------------------------------------------------------------
def esempi(img, tag_id3):
    """tag_id3: funzione che crea un piccolo tag ID3v2 (per il file che ne ha uno davanti)."""
    file = []
    libflac = "reference libFLAC 1.4.3 20230623"

    def aggiungi(nome, descrizione, blocchi, fotogrammi=6, prima=b"", **atteso):
        dati, pos = componi(blocchi, fotogrammi, prima)
        a = {"formato": "FLAC", "campi": {}, "immagini": [], "personalizzati": [], "altri": [], "fornitore": None}
        a.update(atteso)
        a["audio"] = pos
        file.append({"nome": nome, "descrizione": descrizione, "dati": dati, "atteso": a})

    # 10. nessun tag: solo le informazioni sull'audio
    aggiungi("10-flac-senza-tag.flac", "FLAC con il solo blocco STREAMINFO, senza tag.",
             [(STREAMINFO, streaminfo(6))])

    # 11. il caso più comune: commenti e spazio libero (padding)
    aggiungi("11-flac-base.flac", "FLAC con i campi Base, accenti e spazio libero.",
             [(STREAMINFO, streaminfo(6)),
              (VORBIS_COMMENT, commenti(libflac, [
                  ("TITLE", "Perché la città è più bella di sera"),
                  ("ARTIST", "Niccolò & la Società Corale"),
                  ("ALBUM", "Canzoni d'autunno — vol. 2"),
                  ("DATE", "2025-03-01"),
                  ("GENRE", "Folk"),
                  ("TRACKNUMBER", "2"), ("TRACKTOTAL", "10"),
                  ("DISCNUMBER", "1"), ("DISCTOTAL", "2"),
              ])),
              (PADDING, bytes(1024))],
             fornitore=libflac,
             campi={"titolo": "Perché la città è più bella di sera", "artista": "Niccolò & la Società Corale",
                    "album": "Canzoni d'autunno — vol. 2", "anno": "2025", "genere": "Folk",
                    "traccia": ["2", "10"], "disco": ["1", "2"]})

    # 12. tante cose insieme
    vecchia_immagine = base64.b64encode(immagine(img["scacchi.jpg"], "image/jpeg", 3)).decode()
    aggiungi("12-flac-copertine-e-sconosciuti.flac",
             "FLAC con due copertine, tutti i gruppi, nomi minuscoli, due artisti, campi e blocchi sconosciuti.",
             [(STREAMINFO, streaminfo(6)),
              (SEEKTABLE, tabella_ricerca()),
              (APPLICATION, b"tgLT" + b"dati di un altro programma \x00\x01\x02\xff"),
              (VORBIS_COMMENT, commenti(libflac, [
                  ("title", "Tagliatelle al ragù"),
                  ("Artist", "Le Sfogline"), ("Artist", "Nonna Ìrma"),
                  ("ALBUM", "Al dente"),
                  ("ALBUMARTIST", "Artisti vari"),
                  ("DATE", "2026"),
                  ("TRACKNUMBER", "03/12"),
                  ("GENRE", "Cantautorato"),
                  ("LYRICIST", "Zia Pina"),
                  ("COPYRIGHT", "2026 Le Sfogline"),
                  ("PRODUCTION_COPYRIGHT", "2026 Etichetta Fantasia"),
                  ("ORGANIZATION", "Edizioni del Mattarello"),
                  ("ISRC", "ITA012600003"),
                  ("BPM", "96"), ("INITIALKEY", "Am"), ("COMPILATION", "1"),
                  ("ENCODEDBY", "Tag-liatelle prove"),
                  ("CATALOGNUMBER", "MAT-003"), ("BARCODE", "8012345678905"),
                  ("FORNO", "statico, 180 °C"),
                  ("COMMENT", "Da servire caldo."),
                  ("LYRICS", "Prima riga del testo\nSeconda riga"),
                  ("WEBSITE", "https://esempio.it/sfogline"),
                  ("LICENSE", "CC BY-NC-SA 4.0"),
                  ("LICENSE", "https://creativecommons.org/licenses/by-nc-sa/4.0/"),
                  ("REPLAYGAIN_TRACK_GAIN", "-6.50 dB"),
                  ("METADATA_BLOCK_PICTURE", vecchia_immagine),
              ])),
              (PICTURE, immagine(img["scacchi.png"], "image/png", 3, "Davanti")),
              (PICTURE, immagine(img["strisce.jpg"], "image/jpeg", 4, "Dietro")),
              (PADDING, bytes(512))],
             fornitore=libflac,
             campi={"titolo": "Tagliatelle al ragù", "artista": "Le Sfogline; Nonna Ìrma", "album": "Al dente",
                    "artistaAlbum": "Artisti vari", "anno": "2026", "traccia": ["03", "12"],
                    "genere": "Cantautorato", "paroliere": "Zia Pina", "copyright": "2026 Le Sfogline",
                    "copyrightRegistrazione": "2026 Etichetta Fantasia",
                    "editore": "Edizioni del Mattarello", "isrc": "ITA012600003", "bpm": "96",
                    "tonalita": "Am", "compilation": "1", "codificatoDa": "Tag-liatelle prove",
                    "catalogo": "MAT-003", "codiceBarre": "8012345678905",
                    "commenti": "Da servire caldo.", "testo": "Prima riga del testo\nSeconda riga",
                    "sitoArtista": "https://esempio.it/sfogline", "licenza": "CC BY-NC-SA 4.0",
                    "sitoLicenza": "https://creativecommons.org/licenses/by-nc-sa/4.0/"},
             immagini=[{"tipo": 3, "mime": "image/png", "byte": len(img["scacchi.png"])},
                       {"tipo": 4, "mime": "image/jpeg", "byte": len(img["strisce.jpg"])}],
             personalizzati=[{"nome": "FORNO", "valore": "statico, 180 °C"},
                             {"nome": "REPLAYGAIN_TRACK_GAIN", "valore": "-6.50 dB"}],
             altri=["APPLICATION", "METADATA_BLOCK_PICTURE"])

    # 13. un tag ID3 davanti al FLAC (non dovrebbe esserci, ma capita)
    aggiungi("13-flac-con-id3-davanti.flac", "FLAC con un tag ID3v2 messo davanti da un altro programma.",
             [(STREAMINFO, streaminfo(6)),
              (VORBIS_COMMENT, commenti("Lavf60.3.100", [("TITLE", "Il titolo vero"), ("ARTIST", "Duo Farina")])),
              (PADDING, bytes(64))],
             prima=tag_id3(),
             fornitore="Lavf60.3.100",
             campi={"titolo": "Il titolo vero", "artista": "Duo Farina"},
             altri=["ID3v2"])

    # 14. senza spazio libero, con il totale delle tracce scritto in un altro modo
    aggiungi("14-flac-senza-padding.flac", "FLAC senza spazio libero, con TOTALTRACKS e una copertina.",
             [(STREAMINFO, streaminfo(6)),
              (VORBIS_COMMENT, commenti(libflac, [
                  ("TITLE", "Stretti stretti"), ("ARTIST", "I Compatti"), ("YEAR", "1999"),
                  ("TRACKNUMBER", "5"), ("TOTALTRACKS", "8"),
              ])),
              (PICTURE, immagine(img["strisce.jpg"], "image/jpeg", 3))],
             fornitore=libflac,
             campi={"titolo": "Stretti stretti", "artista": "I Compatti", "anno": "1999", "traccia": ["5", "8"]},
             immagini=[{"tipo": 3, "mime": "image/jpeg", "byte": len(img["strisce.jpg"])}])

    # 15. commenti rovinati: il secondo commento dichiara una lunghezza impossibile
    rotti = commenti(libflac, [("TITLE", "Si legge solo il titolo")])
    rotti = rotti[:len(libflac) + 4] + struct.pack("<I", 3) + rotti[len(libflac) + 8:]   # dice 3 commenti…
    rotti += struct.pack("<I", 0x7FFFFFFF) + b"ARTIST=perduto"                            # …ma il secondo è assurdo
    aggiungi("15-flac-rovinato.flac", "FLAC con i commenti in parte rovinati.",
             [(STREAMINFO, streaminfo(6)), (VORBIS_COMMENT, rotti), (PADDING, bytes(128))],
             fornitore=libflac, campi={"titolo": "Si legge solo il titolo"}, avvisi=True)

    return file
