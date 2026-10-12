#!/usr/bin/env python3
"""Extrait public/lpp.json (aide au codage) de la base officielle LPPTOT de la CNAM.

    python3 scripts/extraire-lpp.py LPPTOT905.zip 08/10/2026 > public/lpp.json

Source : http://www.codage.ext.cnamts.fr (LPP > Téléchargement), la même base que celle du
vérificateur. On retient chaque code dont une ligne tarifaire est en vigueur (date de fin
00000000), avec sa désignation officielle telle que publiée (majuscules sans accents) et
son titre, lu dans l'arborescence : enregistrement « 10201 », premier groupe de 6 chiffres
après les deux lettres de nature (000001 = Titre I … 000005 = Titre V).
"""
import io
import json
import re
import sys
import zipfile

TITRES = [
    "Titre I — Dispositifs médicaux pour traitements et matériels d'aide à la vie, aliments diététiques et articles pour pansements",
    "Titre II — Orthèses et Prothèses externes",
    "Titre III — Dispositifs médicaux implantables, implants issus de dérivés d'origine humaine ou en comportant et greffons tissulaires d'origine humaine",
    "Titre IV — Véhicules pour handicapés physiques",
    "Titre V — Dispositifs médicaux invasifs non éligibles au titre III",
]

chemin, date = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None
brut = open(chemin, "rb").read()
if brut[:2] == b"PK":
    with zipfile.ZipFile(io.BytesIO(brut)) as z:
        nom = next(n for n in z.namelist() if n.upper().startswith("LPPTOT"))
        brut = z.read(nom)
else:
    nom = chemin.rsplit("/", 1)[-1]
D = brut.decode("latin-1")
version = re.search(r"LPPTOT(\d+)", nom, re.I)

TARIF = re.compile(r"1100101\d{8}(\d{8})[A-Z]{4}")
ARBO = re.compile(r"10201\d{11}[A-Z]{2}(\d{6})")
debuts = [(m.start(), m[1]) for m in re.finditer(r"1010101(\d{7})", D)]
actes = {}
for k, (i, code) in enumerate(debuts):
    fin = debuts[k + 1][0] if k + 1 < len(debuts) else len(D)
    zone = D[i:fin]
    if not any(m[1] == "00000000" for m in TARIF.finditer(zone)):
        continue  # radié ou hors vigueur
    designation = D[i + 14 : i + 144].split("101020")[0].strip()
    arbo = ARBO.search(zone)
    titre = int(arbo[1]) - 1 if arbo and 1 <= int(arbo[1]) <= len(TITRES) else -1
    actes[code] = [code, designation, titre]

libelle = f"LPP — base LPPTOT{version[1]}" if version else "LPP — base LPPTOT"
if date:
    libelle += f" du {date}"
json.dump(
    {"version": libelle, "titres": TITRES, "cols": ["code", "label", "titre"],
     "acts": [actes[c] for c in sorted(actes)]},
    sys.stdout, ensure_ascii=False, separators=(",", ":"),
)
