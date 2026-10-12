#!/usr/bin/env python3
"""Liste ce qui change réellement entre deux versions PDF de la NGAP (ameli.fr).

    python3 scripts/comparer-ngap.py NGAP-ancienne.pdf NGAP-nouvelle.pdf

public/ngap.json est mis à jour article par article à partir de ce rapport (pas de
ré-extraction complète : la segmentation des 150 articles est conservée). Le PDF déplace
souvent des blocs d'une page à l'autre et réordonne le texte des tableaux ; la comparaison
porte donc sur les lignes, sans tenir compte de leur ordre ni des espaces, après retrait
des en-têtes de partie, des mentions « Version en vigueur du … » et des numéros de page.
Une ligne n'apparaît dans le rapport que si son contenu a changé.

Dépendance : PyMuPDF (pip install pymupdf).
"""
import collections
import re
import sys

import fitz

ENTETE = re.compile(
    r"^(Première|Deuxième|Troisième|Quatrième|Cinquième|Sixième) partie\s*:|^Version en vigueur du|^\d{1,3}$"
)


def lignes(pdf):
    for page in fitz.open(pdf):
        for ligne in page.get_text().split("\n"):
            s = ligne.strip()
            if s and not ENTETE.match(s):
                yield re.sub(r"\s+", "", s)


avant = collections.Counter(lignes(sys.argv[1]))
apres = collections.Counter(lignes(sys.argv[2]))
for titre, diff in (("Retiré", avant - apres), ("Ajouté", apres - avant)):
    print(f"{titre} ({sum(diff.values())} ligne(s), espaces retirés) :")
    for ligne, n in diff.items():
        print(f"  {ligne}" + (f"  ×{n}" if n > 1 else ""))
