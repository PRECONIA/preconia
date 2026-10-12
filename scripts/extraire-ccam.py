#!/usr/bin/env python3
"""Extrait public/ccam.json du fichier tableur officiel de la CCAM (CNAM, ameli.fr).

    python3 scripts/extraire-ccam.py CCAM_V84_VF.xls > public/ccam.json

Le tableur liste, par chapitre, une ligne par acte (code à 7 caractères) suivie de lignes
de notes sans code. On retient pour chaque acte : code, libellé, tarif secteur 1, tarif
hors secteur 1, accord préalable, regroupement, chapitre (index dans `chapters`), et un
drapeau « non pris en charge ». Les colonnes sont repérées par l'en-tête « Code » : leur
position varie d'une version à l'autre (4 colonnes vides en tête depuis la V84).
"""
import json
import re
import sys

import xlrd

feuille = xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)


def texte(v):
    return re.sub(r"\s+", " ", str(v)).strip()


def verbatim(v):
    """Texte officiel tel quel (espaces et retours internes conservés), seulement rogné."""
    return str(v).strip()


def tarif(v):
    """Montant en euros ; certains tarifs sont saisis en texte dans le tableur (« 248, 15 »)."""
    if isinstance(v, str) and re.fullmatch(r"\s*\d+(?:\s*[.,]\s*\d+)?\s*", v):
        v = float(re.sub(r"\s", "", v).replace(",", "."))
    return round(v, 2) if isinstance(v, float) else None


# ligne d'en-tête et position des colonnes
for ligne_entete in range(10):
    entete = [texte(feuille.cell_value(ligne_entete, c)) for c in range(feuille.ncols)]
    if "Code" in entete:
        break
else:
    sys.exit("en-tête « Code » introuvable")
col = {nom: entete.index(nom) for nom in ("Code", "Texte", "Accord Préalable", "Regroupement")}
col["t1"] = next(i for i, h in enumerate(entete) if h.startswith("Tarif Secteur 1"))
col["t2"] = next(i for i, h in enumerate(entete) if h.startswith("Tarif Hors secteur 1"))

titre = re.search(r"version (\d+)", texte(feuille.cell_value(0, col["Code"])) + " " +
                  " ".join(texte(feuille.cell_value(0, c)) for c in range(feuille.ncols)))
chapitres, actes = [], []
for r in range(ligne_entete + 1, feuille.nrows):
    brut = feuille.cell_value(r, col["Code"])
    if isinstance(brut, float):  # « 1.0 », « 2.0 »… : chapitre de premier niveau
        chapitres.append(verbatim(feuille.cell_value(r, col["Texte"])))
        continue
    code = texte(brut)
    if not re.fullmatch(r"[A-Z]{4}\d{3}", code):
        continue
    t1, t2 = feuille.cell_value(r, col["t1"]), feuille.cell_value(r, col["t2"])
    npc = int(texte(t1) == "Non pris en charge")
    actes.append([
        code,
        verbatim(feuille.cell_value(r, col["Texte"])),
        tarif(t1),
        tarif(t2),
        int(bool(texte(feuille.cell_value(r, col["Accord Préalable"])))),
        texte(feuille.cell_value(r, col["Regroupement"])),
        len(chapitres) - 1,
        npc,
    ])

version = f"CCAM version {titre[1]}" if titre else "CCAM"
json.dump(
    {"version": version, "chapters": chapitres,
     "cols": ["code", "label", "t1", "t2", "ap", "regr", "chap", "npc"], "acts": actes},
    sys.stdout, ensure_ascii=False, separators=(",", ":"),
)
