import type { Metadata, Viewport } from "next";
import { CodageEngineCard } from "@/components/preconia/CodageEngineCard";
import {
  CarteNavy,
  CodageBreadcrumb,
  CodageGuideFooter,
  CodageTopBar,
  RelatedNavy,
  codageJsonLd,
} from "@/components/preconia/CodageSeoChrome";

const URL = "https://preconia.fr/aide-codage/cim-10";
const TITLE = "Code CIM-10 : trouver un diagnostic (CIM-10-FR 2026) — recherche instantanée";
const DESCRIPTION =
  "Recherchez un code CIM-10 par libellé, code ou terme courant (« crise cardiaque » → infarctus). Base CIM-10-FR 2026 à usage PMSI (ATIH), 11 105 codes indexés : catégories, sous-catégories et chapitres.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage/cim-10" },
  keywords: [
    "code CIM-10",
    "CIM-10 recherche",
    "CIM-10-FR 2026",
    "codage diagnostic PMSI",
    "classification internationale des maladies",
    "code diagnostic hospitalier",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};
export const viewport: Viewport = { themeColor: "#16324f" };

const FAQ = [
  {
    q: "Qu'est-ce que la CIM-10 ?",
    a: "La CIM-10 est la 10e révision de la Classification internationale des maladies, publiée par l'Organisation mondiale de la santé. Elle attribue un code alphanumérique à chaque maladie, symptôme ou motif de recours aux soins, et sert de langage commun au codage des diagnostics.",
  },
  {
    q: "Quelle différence entre CIM-10 et CIM-10-FR ?",
    a: "La CIM-10-FR est l'adaptation française de la CIM-10, maintenue par l'ATIH pour le PMSI : elle ajoute des extensions et des précisions propres au recueil hospitalier français. C'est la version de référence pour coder les séjours en France.",
  },
  {
    q: "Comment est structuré un code CIM-10 ?",
    a: "Un code commence par une lettre suivie de deux chiffres : c'est la catégorie à 3 caractères (ex. I10, E11). Des sous-catégories à 4 ou 5 caractères précisent la localisation, la forme clinique ou la complication. Les codes sont regroupés en 22 chapitres, de « Certaines maladies infectieuses » aux « Codes d'utilisation particulière ».",
  },
  {
    q: "La CIM-11 remplace-t-elle la CIM-10 en France ?",
    a: "La CIM-11 est entrée en vigueur à l'OMS en 2022, mais elle n'est pas utilisée pour le PMSI français : la CIM-10-FR reste la classification de référence pour le codage des diagnostics en France.",
  },
];

export default function CodeCim10Page() {
  return (
    <div className="cc-page">
      <CodageTopBar />
      <main className="mx-auto max-w-[880px] px-5 pb-16 pt-6">
        <CodageBreadcrumb current="Code CIM-10" />
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-[#0c2740] sm:text-[34px]">
          Trouver un code CIM-10 : diagnostics (CIM-10-FR 2026)
        </h1>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          Le moteur ci-dessous indexe les <b className="text-ink">11 105 codes</b>{" "}de la{" "}
          <b className="text-ink">CIM-10-FR 2026 à usage PMSI</b>{" "}(ATIH). Tapez un code (ex.{" "}
          <span className="font-mono">N18</span>), un mot du libellé officiel ou un terme courant —
          « crise cardiaque » trouve l&apos;infarctus du myocarde, « genoux » trouve la gonarthrose.
        </p>

        <CodageEngineCard
          className="mt-6"
          initial="cim10"
          title="Rechercher un diagnostic CIM-10"
          sub="11 105 codes CIM-10-FR 2026 (ATIH) — recherche par code, libellé ou terme courant, avec chapitre et catégorie parente."
        />

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            La CIM-10, langage commun du diagnostic
          </h2>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            La Classification internationale des maladies (CIM-10, OMS) attribue un code à chaque
            maladie, symptôme ou motif de recours aux soins. En France, sa déclinaison{" "}
            <b className="text-ink">CIM-10-FR</b>, maintenue par l&apos;ATIH, est la référence du{" "}
            <b className="text-ink">PMSI</b>{" "}: chaque séjour hospitalier est codé en diagnostic
            principal, relié et associés, en médecine-chirurgie-obstétrique comme en SMR, en HAD ou
            en psychiatrie. Le codage conditionne directement la valorisation du séjour et la
            qualité des données médico-économiques.
          </p>
          <h3 className="mt-5 text-[15px] font-semibold text-[#0c2740]">Lire un code CIM-10</h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Une lettre et deux chiffres forment la <b className="text-ink">catégorie</b>{" "}à trois
            caractères ; un quatrième, voire un cinquième caractère précisent la forme clinique, la
            localisation ou le stade. Quelques exemples issus de la base :
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            {[
              ["I10", "Hypertension essentielle (primitive)"],
              ["E11", "Diabète sucré de type 2"],
              ["M17", "Gonarthrose [arthrose du genou]"],
              ["G81", "Hémiplégie"],
              ["N18", "Maladie rénale chronique"],
              ["F32", "Épisodes dépressifs"],
            ].map(([c, l]) => (
              <li key={c} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex shrink-0 rounded bg-[#e0f2fe] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0c4a6e]">
                  {c}
                </span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-[15px] font-semibold text-[#0c2740]">
            Une recherche qui comprend les termes courants
          </h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Les libellés officiels emploient un vocabulaire précis (« infarctus aigu du
            myocarde », « accident vasculaire cérébral ») que la pratique abrège volontiers. Le
            moteur intègre un thésaurus d&apos;équivalences validées — abréviations (IDM, AVC,
            BPCO), langage courant (« crise cardiaque », « mal de gorge »), pluriels — et classe
            toujours les correspondances directes avant les correspondances par synonyme.
          </p>
        </CarteNavy>

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            Questions fréquentes — CIM-10
          </h2>
          <div className="mt-2 divide-y divide-line-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-2.5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink transition-colors hover:text-[#0c2740]">
                  <span className="mr-1.5 inline-block text-[#0ea5e9] transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {f.q}
                </summary>
                <p className="mt-1.5 pl-4 text-justify text-[13.5px] leading-relaxed text-ink-soft" lang="fr">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </CarteNavy>

        <h2 className="mt-8 text-lg font-semibold tracking-tight text-[#0c2740]">
          Continuer avec les autres nomenclatures
        </h2>
        <RelatedNavy
          links={[
            {
              href: "/aide-codage/ccam",
              title: "Code CCAM",
              desc: "Les actes techniques médicaux : structure du code, tarifs secteur 1 et accord préalable.",
            },
            {
              href: "/aide-codage/ngap",
              title: "NGAP",
              desc: "Les actes cliniques et les lettres clés : recherche en texte intégral des 150 articles.",
            },
            {
              href: "/aide-codage/lpp",
              title: "Code LPP",
              desc: "Les dispositifs médicaux remboursables, du pansement au fauteuil roulant (Titre IV).",
            },
            {
              href: "/aide-codage",
              title: "Aide au codage — le moteur complet",
              desc: "Les quatre nomenclatures réunies dans une seule recherche instantanée.",
            },
          ]}
        />
        <CodageGuideFooter source="ATIH, CIM-10-FR 2026 à usage PMSI" />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            codageJsonLd({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: "Code CIM-10", faq: FAQ }),
          ),
        }}
      />
    </div>
  );
}
