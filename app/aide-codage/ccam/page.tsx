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

const URL = "https://preconia.fr/aide-codage/ccam";
const TITLE = "Code CCAM : trouver un acte technique et son tarif — recherche instantanée";
const DESCRIPTION =
  "Recherchez un code CCAM par libellé, code ou terme courant (« infiltration genou » → injection intraarticulaire). 8 257 actes tarifables indexés avec tarif secteur 1, accord préalable et chapitre.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage/ccam" },
  keywords: [
    "code CCAM",
    "recherche acte CCAM",
    "tarif CCAM",
    "classification commune des actes médicaux",
    "cotation acte technique",
    "accord préalable CCAM",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};
export const viewport: Viewport = { themeColor: "#16324f" };

const FAQ = [
  {
    q: "Qu'est-ce que la CCAM ?",
    a: "La Classification commune des actes médicaux recense et tarife les actes techniques réalisés par les médecins : actes chirurgicaux, d'imagerie, interventionnels ou d'explorations. Chaque acte y porte un code unique, un libellé précis et, s'il est pris en charge, un tarif.",
  },
  {
    q: "Comment lire un code CCAM ?",
    a: "Un code CCAM compte 4 lettres et 3 chiffres (ex. NZLB001). Les deux premières lettres désignent la topographie (l'appareil et la localisation), la troisième l'action réalisée, la quatrième la voie d'abord ou la technique ; les trois chiffres sont un compteur.",
  },
  {
    q: "CCAM ou NGAP : quelle nomenclature pour quel acte ?",
    a: "La CCAM couvre les actes techniques médicaux. Les actes cliniques (consultations, visites, majorations) et les actes des auxiliaires médicaux relèvent de la NGAP, qui reste en vigueur pour tout ce qui n'a pas été intégré à la CCAM.",
  },
  {
    q: "Que signifie « accord préalable » sur un acte ?",
    a: "Certains actes ne sont pris en charge qu'après accord préalable du service médical de l'Assurance maladie : la demande doit être faite avant leur réalisation. Le moteur signale ces actes par un badge dédié.",
  },
];

export default function CodeCcamPage() {
  return (
    <div className="cc-page">
      <CodageTopBar />
      <main className="mx-auto max-w-[880px] px-5 pb-16 pt-6">
        <CodageBreadcrumb current="Code CCAM" />
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-[#0c2740] sm:text-[34px]">
          Trouver un code CCAM : actes techniques et tarifs
        </h1>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          Le moteur ci-dessous indexe <b className="text-ink">8 257 actes tarifables</b>{" "}de la{" "}
          <b className="text-ink">CCAM</b>{" "}avec leur tarif secteur 1. Tapez un code, un mot du
          libellé ou un terme courant — « infiltration genou » trouve l&apos;injection
          thérapeutique intraarticulaire du membre inférieur.
        </p>

        <CodageEngineCard
          className="mt-6"
          initial="ccam"
          title="Rechercher un acte CCAM"
          sub="8 257 actes tarifables (CCAM v83) — code, libellé ou terme courant, avec tarif secteur 1, accord préalable et chapitre."
        />

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            La CCAM, nomenclature des actes techniques médicaux
          </h2>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            La <b className="text-ink">Classification commune des actes médicaux</b>{" "}décrit et
            tarife les actes techniques réalisés par les médecins : chirurgie, imagerie, actes
            interventionnels, explorations fonctionnelles. Chaque libellé est rédigé pour désigner
            sans ambiguïté un acte précis — c&apos;est sa force, mais aussi ce qui rend la recherche
            difficile quand on ne connaît pas le vocabulaire exact : une « infiltration du
            genou » s&apos;y appelle « injection thérapeutique d&apos;agent pharmacologique dans
            une articulation ou une bourse séreuse du membre inférieur ».
          </p>
          <h3 className="mt-5 text-[15px] font-semibold text-[#0c2740]">Lire un code CCAM</h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Le code combine 4 lettres et 3 chiffres : topographie (deux premières lettres), action
            (troisième), voie d&apos;abord ou technique (quatrième), puis un compteur. Deux exemples
            issus de la base :
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            {[
              [
                "NZLB001",
                "Injection thérapeutique d'agent pharmacologique dans une articulation ou une bourse séreuse du membre inférieur, par voie transcutanée sans guidage — 32,20 €",
              ],
              [
                "NEQK010",
                "Radiographie de l'articulation coxofémorale selon 1 ou 2 incidences — 19,95 €",
              ],
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
            Tarifs, accord préalable et regroupements
          </h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Pour chaque acte pris en charge, le moteur affiche le{" "}
            <b className="text-ink">tarif secteur 1</b>{" "}(et le tarif hors secteur lorsqu&apos;il
            diffère), le <b className="text-ink">regroupement</b>{" "}(ADC, ATM…), le chapitre
            anatomique et le signalement d&apos;<b className="text-ink">accord préalable</b>. Les
            tarifs sont indicatifs : la facturation obéit aux règles d&apos;association, aux
            modificateurs et aux conditions générales de la CCAM — le référentiel de
            l&apos;Assurance maladie fait foi.
          </p>
        </CarteNavy>

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            Questions fréquentes — CCAM
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
              href: "/aide-codage/cim-10",
              title: "Code CIM-10",
              desc: "Les diagnostics du PMSI : catégories, chapitres et recherche en langage courant.",
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
        <CodageGuideFooter source="CCAM, Assurance maladie" />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            codageJsonLd({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: "Code CCAM", faq: FAQ }),
          ),
        }}
      />
    </div>
  );
}
