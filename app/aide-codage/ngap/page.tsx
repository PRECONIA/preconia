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

const URL = "https://preconia.fr/aide-codage/ngap";
const TITLE = "NGAP : la nomenclature des actes cliniques — recherche en texte intégral";
const DESCRIPTION =
  "Recherchez dans la NGAP (nomenclature générale des actes professionnels) en texte intégral : 150 articles indexés — actes cliniques médicaux, lettres clés et coefficients, actes des auxiliaires médicaux.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage/ngap" },
  keywords: [
    "NGAP",
    "nomenclature générale des actes professionnels",
    "lettres clés NGAP",
    "cotation NGAP",
    "actes infirmiers NGAP",
    "actes kinésithérapie NGAP",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};
export const viewport: Viewport = { themeColor: "#16324f" };

const FAQ = [
  {
    q: "Qu'est-ce que la NGAP ?",
    a: "La Nomenclature générale des actes professionnels régit la cotation des actes cliniques : consultations, visites et majorations des médecins, ainsi que les actes des auxiliaires médicaux (infirmiers, masseurs-kinésithérapeutes, orthophonistes, orthoptistes, pédicures-podologues) et une partie de ceux des sages-femmes et des chirurgiens-dentistes.",
  },
  {
    q: "Comment fonctionne la cotation NGAP ?",
    a: "Chaque acte est désigné par une lettre clé (par exemple C, V, AMI, AMK) associée à un coefficient qui traduit son importance relative. Le montant facturé résulte de la valeur de la lettre clé multipliée par le coefficient, complétée le cas échéant par des majorations.",
  },
  {
    q: "La NGAP est-elle remplacée par la CCAM ?",
    a: "Partiellement : les actes techniques médicaux ont été transférés dans la CCAM, mais la NGAP reste en vigueur pour les actes cliniques et pour les actes des auxiliaires médicaux. Les deux nomenclatures coexistent.",
  },
  {
    q: "Pourquoi une recherche en texte intégral plutôt que par code ?",
    a: "La NGAP est un texte réglementaire organisé en articles, non une liste de codes tarifés : la recherche parcourt donc l'intégralité du texte en vigueur et renvoie les articles pertinents, avec leur contenu complet dépliable.",
  },
];

export default function NgapPage() {
  return (
    <div className="cc-page">
      <CodageTopBar current="ngap" />
      <main className="pg-cascade mx-auto max-w-[880px] px-5 pb-16 pt-6">
        <CodageBreadcrumb current="NGAP" />
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-[#0c2740] sm:text-[34px]">
          NGAP : les actes cliniques en recherche plein texte
        </h1>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          Le moteur ci-dessous indexe les <b className="text-ink">150 articles</b>{" "}du texte de la{" "}
          <b className="text-ink">NGAP en vigueur</b>, en intégralité. Tapez un mot ou une
          expression (« majoration nuit », « pansement lourd », « AMK ») : les articles pertinents
          s&apos;affichent avec leur texte complet.
        </p>

        <CodageEngineCard
          className="mt-6"
          initial="ngap"
          title="Rechercher dans la NGAP"
          sub="150 articles en texte intégral (NGAP en vigueur au 21/06/2026) — actes cliniques, lettres clés, majorations et actes des auxiliaires médicaux."
        />

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            La NGAP, nomenclature des actes cliniques
          </h2>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            La <b className="text-ink">Nomenclature générale des actes professionnels</b>{" "}est le
            texte réglementaire qui régit la cotation des actes cliniques : consultations, visites
            et majorations des médecins, et l&apos;ensemble des actes des{" "}
            <b className="text-ink">auxiliaires médicaux</b>{" "}— soins infirmiers,
            masso-kinésithérapie, orthophonie, orthoptie, pédicurie-podologie — ainsi qu&apos;une
            partie des actes des sages-femmes et des chirurgiens-dentistes. Depuis la création de
            la CCAM pour les actes techniques médicaux, la NGAP demeure en vigueur pour tout ce qui
            n&apos;y a pas été intégré.
          </p>
          <h3 className="mt-5 text-[15px] font-semibold text-[#0c2740]">
            Lettres clés et coefficients
          </h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            La cotation NGAP repose sur des <b className="text-ink">lettres clés</b>{" "}(C, V, AMI,
            AMK…) affectées d&apos;un <b className="text-ink">coefficient</b>{" "}: l&apos;article 2 de
            la nomenclature en fixe la liste et les règles d&apos;emploi. Le moteur restitue le
            texte réglementaire tel quel — articles, dispositions générales et dispositions
            propres à chaque profession — sans tarification : les valeurs des lettres clés
            relèvent des conventions et avenants publiés par l&apos;Assurance maladie.
          </p>
        </CarteNavy>

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            Questions fréquentes — NGAP
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
              href: "/aide-codage/cim-10",
              title: "Code CIM-10",
              desc: "Les diagnostics du PMSI : catégories, chapitres et recherche en langage courant.",
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
        <CodageGuideFooter source="NGAP, Assurance maladie" />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            codageJsonLd({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: "NGAP", faq: FAQ }),
          ),
        }}
      />
    </div>
  );
}
