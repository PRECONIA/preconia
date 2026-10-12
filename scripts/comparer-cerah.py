#!/usr/bin/env python3
"""Compare la liste CERAH des VPH conformes (lppr_nn.pdf) au catalogue data/device-models.json.

    python3 scripts/comparer-cerah.py lppr_nn.pdf [plan.json]

Source : https://mobile.cerahtec.fr/doc/lppr_nn.pdf (republiée à chaque mise à jour).
Sortie : les modèles à renommer et les produits absents du catalogue, avec la marque CNAM
retenue et son code ; le plan JSON optionnel sert à l'application, qui reste revue à la main.

Lecture du PDF : tableaux PyMuPDF, texte de chaque cellule relu dans sa zone (l'extraction
du tableau entremêle les lignes qui se chevauchent), en-têtes de colonne, pieds de page et
débordements de la ligne précédente retirés ; lignes coupées par un saut de page recollées.

Règles du plan :
- un produit muni d'un code individuel est rangé dans le type LPP de ce code (le CERAH liste
  parfois un produit codé A dans la section B) ; sans code, dans la section du PDF ;
- aucun retrait n'est proposé : chaque « disparition » observée était une ligne perdue à la
  lecture, toujours présente dans le PDF ;
- marque d'un nouveau produit : celle de son code (lppr.json), sinon la marque CNAM du type
  dont le nom figure parmi les acteurs du produit (fabricant, marquage CE, distributeur),
  sinon celle du distributeur observée sur les produits déjà rapprochés. Une marque sans
  code CNAM pour le type n'est pas ajoutable au catalogue (le schéma exige ce code).

Dépendance : PyMuPDF (pip install pymupdf).
"""
import collections
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

DATA = Path(__file__).resolve().parent.parent / "data"

LPP = json.load(open(DATA / "device-lpp.json"))["byType"]
TOKEN_DE_CODE = {e["code"]: tok for tok, e in LPP.items()}
CLASSE = re.compile(r"classe\s+(A\+?|B|C)\b", re.I)


PARASITE = re.compile(r"^(Liste établie par|Institution nationale|Centre d.Études|1, Bellevue|Tél\. :|Code individuel$|Nom du produit$|--$)")


def cellule(c):
    """Lignes utiles d'une cellule : sans pied de page ni en-tête de colonne débordants."""
    out = []
    for l in (c or "").split("\n"):
        l = l.strip()
        if not l:
            continue
        if PARASITE.match(l):
            if l.startswith("Liste établie par"):
                break  # tout ce qui suit est le pied de page
            continue
        out.append(l)
    return out


def parse(pdf):
    produits = []
    generiques = []  # tokens de la section courante
    token = None
    for pno, page in enumerate(fitz.open(pdf)):
        tables = page.find_tables().tables
        if not tables:
            texte = page.get_text()
            if "Largeur(s) de siège" in texte and token:  # ligne entière reportée sur cette page
                L = [l.strip() for l in texte.split("\n") if l.strip()]
                code = next((l for l in L if re.fullmatch(r"\d{7}", l)), None)
                produits.append(dict(token=token, name=L[0], code=code, distrib=L[3] if len(L) > 3 else "", page=pno + 1, note="page sans tableau"))
            continue
        for t in tables:
            rows = t.extract()
            if not rows:
                continue
            h0 = " ".join(l.strip() for l in (rows[0][0] or "").split("\n") if l.strip())  # texte brut
            if len(rows[0]) == 4 and h0.startswith("Code"):  # codes génériques de la section
                generiques = [TOKEN_DE_CODE.get((r[0] or "").strip()) for r in rows[1:]]
                generiques = [g for g in generiques if g]
                token = generiques[0] if len(generiques) == 1 else None
                continue
            corps = rows
            if "Nom du produit" in h0 or "Code individuel" in h0:
                m = CLASSE.search(h0)
                if m and generiques:
                    cl = m[1].upper()
                    token = next((g for g in generiques if g.endswith("-" + cl[0]) or (cl == "A+" and g == "SCO-A")), None)
                corps = rows[1:]
            if token is None:
                print(f"! page {pno+1} : tableau sans type VPH (attendu pour les adjonctions AAP en fin de liste)", file=sys.stderr)
                continue
            lignes_t = t.rows[len(rows) - len(corps):]
            precedent = set(cellule(rows[0][0])) if corps is not rows else set()
            for r, ligne_t in zip(corps, lignes_t):
                # texte relu dans la zone de la cellule : l'extraction du tableau entremêle les
                # lignes qui se chevauchent (« MA 013) » + « 9571365 » → « M9A57 0131635) »)
                rect = ligne_t.cells[0]
                c0 = cellule(page.get_textbox(fitz.Rect(rect))) if rect else cellule(r[0])
                # la zone de la cellule mord sur la dernière ligne de la cellule précédente
                while c0 and c0[0] in precedent:
                    c0 = c0[1:]
                precedent = set(cellule(page.get_textbox(fitz.Rect(rect)))) if rect else set()
                code = c0[-1] if c0 and re.fullmatch(r"\d{7}", c0[-1]) else None
                nom = " ".join(c0[:-1] if code else c0)
                c1 = cellule(r[1])
                if not nom:  # suite d'une ligne coupée par le saut de page
                    if code and produits and produits[-1]["code"] is None:
                        produits[-1]["code"] = code
                    continue
                produits.append(dict(token=token, name=nom, code=code, distrib=c1[-1] if c1 else "",
                                     fabricant=c1[0] if c1 else "", acteurs=c1, page=pno + 1))
    return produits



DM = json.load(open(DATA / "device-models.json"))["byToken"]
P = parse(sys.argv[1])
LPPR = {p["code"]: p["label"] for p in json.load(open(DATA / "lppr.json"))["products"]}
TOKENS = list(json.load(open(DATA / "device-lpp.json"))["byType"])


def norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9+]+", " ", s).strip()


def token_du_code(code):
    lab = LPPR.get(code)
    if not lab:
        return None
    seg = lab.split(",")[2].strip()
    seg = re.sub(r"\s.*", "", seg)  # « FRM MODULAIRE… » → « FRM »
    return seg if seg in TOKENS else None


def marque_du_code(code):
    lab = LPPR.get(code)
    m = lab and re.search(r",([^,]+)$", lab)
    return m[1].strip() if m else None


# rapprochement : nom PRECONIA (éventuellement préfixé par une ville/marque en juillet) ↔ CERAH
def apparie(a, b):
    a, b = norm(a), norm(b)
    return a == b or (len(b) >= 4 and (a.endswith(" " + b) or a.startswith(b + " ") or f" {b} " in f" {a} "))


for p in P:
    t = token_du_code(p["code"]) if p["code"] else None
    p["section"] = p["token"]
    if t:
        p["token"] = t

renommer, nouveaux, distrib_marque = [], [], collections.defaultdict(collections.Counter)
for tok in TOKENS:
    cer = [p for p in P if p["token"] == tok]
    nous = [(marque, m) for marque, e in DM.get(tok, {}).items() for m in e["models"]]
    pris = set()
    for marque, m in nous:
        cand = [i for i, p in enumerate(cer) if i not in pris and norm(p["name"]) == norm(m["name"])]
        cand = cand or [i for i, p in enumerate(cer) if i not in pris and apparie(m["name"], p["name"])]
        if not cand:
            continue
        p = cer[cand[0]]
        pris.add(cand[0])
        distrib_marque[p["distrib"]][marque] += 1
        if p["name"] != m["name"]:
            renommer.append(dict(token=tok, brand=marque, old=m["name"], new=p["name"]))
    for i, p in enumerate(cer):
        if i not in pris:
            nouveaux.append(p)

# marques CNAM par type, avec leur code de marque (seules marques admissibles au catalogue)
CNAM = collections.defaultdict(dict)
for code, lab in LPPR.items():
    seg = lab.split(",")
    if len(seg) > 3 and token_du_code(code):
        CNAM[token_du_code(code)][seg[-1].strip()] = code
ALIAS = {"LIFE MOBILITY": ["LIFE AND MOBILITY"], "SUNRISE MED": ["SUNRISE MEDICAL"], "INNOV S.A.": ["INNOV' SA", "INNOV SA"],
         "DIETZ POWER BV": ["DIETZ POWER"], "INVACARE": ["DHCARE", "INVACARE"], "PROT VIRGINIE": ["ELOFLEX"],
         "IDENTITES 49": ["IDENTITES"], "SKS ROLTEC": ["ROLTEC"]}
compact = lambda s: norm(s).replace(" ", "")


def marque_cnam(p):
    """Marque CNAM du type dont le nom (ou un alias) figure parmi les acteurs du produit."""
    texte = compact(" ".join(p.get("acteurs", [])))
    trouvees = [b for b in CNAM.get(p["token"], {}) if any(compact(x) in texte for x in [b] + ALIAS.get(b, []))]
    return trouvees[0] if len(trouvees) == 1 else None


# dédoublonnage : un même produit listé dans deux sections de classe du PDF
vus, uniques = set(), []
for p in nouveaux:
    k = (p["token"], norm(p["name"]))
    if k not in vus:
        vus.add(k)
        uniques.append(p)
deja_au_catalogue = {(t, norm(m["name"])) for t, bs in DM.items() for e in bs.values() for m in e["models"]}
nouveaux = [p for p in uniques if (p["token"], norm(p["name"])) not in deja_au_catalogue]

plan = []
for p in nouveaux:
    marque = marque_du_code(p["code"]) if p["code"] else None
    marque = marque or marque_cnam(p)
    if not marque and p["distrib"] not in ("N/C", "") and distrib_marque.get(p["distrib"]):
        marque = distrib_marque[p["distrib"]].most_common(1)[0][0]
    p["code_marque"] = CNAM.get(p["token"], {}).get(marque) if marque else None
    deja = marque in DM.get(p["token"], {})
    plan.append(dict(token=p["token"], section=p["section"], name=p["name"], code=p["code"],
                     distrib=p["distrib"], acteurs=p.get("acteurs", []), brand=marque, brand_exists=deja,
                     code_marque=p["code_marque"]))

if len(sys.argv) > 2:
    json.dump(dict(renommer=renommer, nouveaux=plan), open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(f"{len(renommer)} renommages, {len(plan)} nouveaux produits")
print("\n== renommer")
for r in renommer:
    print(f"   {r['token']:8} {r['brand']:16} {r['old']}  →  {r['new']}")
print("\n== nouveaux")
for x in plan:
    flag = "" if x["brand_exists"] else (f"  [nouvelle entrée marque, code CNAM {x['code_marque']}]" if x["code_marque"] else "  [PAS DE CODE DE MARQUE CNAM → non ajoutable]")
    sec = f" (section PDF {x['section']})" if x["section"] != x["token"] else ""
    print(f"   {x['token']:8} {str(x['brand']):16} {x['name']:32} {str(x['code']):8} acteurs={' / '.join(x['acteurs'])[:70]}{sec}{flag}")
