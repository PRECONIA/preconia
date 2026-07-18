import type { Metadata, Viewport } from "next";
import { CodageEngineCard } from "@/components/preconia/CodageEngineCard";
import {
  CarteNavy,
  CodageBreadcrumb,
  CodageGuideFooter,
  CodageHeader,
  RelatedNavy,
  codageJsonLd,
} from "@/components/preconia/CodageSeoChrome";

const URL = "https://preconia.fr/aide-codage/lpp";
const TITLE = "Code LPP : trouver un dispositif médical remboursable — recherche instantanée";
const DESCRIPTION =
  "Recherchez un code LPP par désignation, marque ou code : 5 606 lignes de la Liste des produits et prestations indexées, du pansement au fauteuil roulant (Titre IV — véhicules pour handicapés physiques).";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage/lpp" },
  keywords: [
    "code LPP",
    "recherche code LPP",
    "liste des produits et prestations",
    "LPPR",
    "dispositif médical remboursable",
    "code LPP fauteuil roulant",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};
export const viewport: Viewport = { themeColor: "#16324f" };

const FAQ = [
  {
    q: "Qu'est-ce que la LPP ?",
    a: "La Liste des produits et prestations (article L. 165-1 du code de la sécurité sociale) recense les dispositifs médicaux, aides techniques et prestations associées pris en charge par l'Assurance maladie : pansements, orthèses et prothèses, dispositifs implantables, véhicules pour handicapés physiques, etc.",
  },
  {
    q: "Comment est organisée la LPP ?",
    a: "En cinq titres : le Titre I couvre les dispositifs médicaux pour traitements à domicile, aliments diététiques et pansements ; le Titre II les orthèses et prothèses externes ; le Titre III les dispositifs médicaux implantables ; le Titre IV les véhicules pour handicapés physiques (fauteuils roulants) ; le Titre V d'autres dispositifs invasifs.",
  },
  {
    q: "Où trouver le tarif d'un code LPP ?",
    a: "Les tarifs de responsabilité et prix limites de vente sont publiés dans la base tarifaire officielle de l'Assurance maladie (fichier LPP téléchargeable), qui seule fait foi. Le moteur restitue les désignations officielles et renvoie aux référentiels pour la tarification.",
  },
  {
    q: "Quel lien entre LPP et prescription de fauteuil roulant ?",
    a: "Les fauteuils roulants relèvent du Titre IV de la LPP. Depuis l'arrêté du 6 février 2025, leur prise en charge obéit à une nomenclature rénovée : catégories de VPH, prescripteurs habilités, adjonctions et forfaits — c'est précisément ce que couvre l'outil PRECONIA de préconisation VPH.",
  },
];

export default function CodeLppPage() {
  return (
    <div className="cc-page">
      <CodageHeader current="lpp" />
      <main className="pg-cascade mx-auto max-w-[880px] px-5 pb-16 pt-6">
        <CodageBreadcrumb current="Code LPP" />
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-[#0c2740] sm:text-[34px]">
          Trouver un code LPP : dispositifs médicaux remboursables
        </h1>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          Le moteur ci-dessous indexe <b className="text-ink">5 606 lignes</b>{" "}de la{" "}
          <b className="text-ink">Liste des produits et prestations</b>{" "}: tapez un code à 7
          chiffres, une désignation ou une marque — du pansement à l&apos;oxygénothérapie,
          jusqu&apos;aux fauteuils roulants du Titre IV.
        </p>

        <CodageEngineCard
          className="mt-6"
          initial="lpp"
          title="Rechercher un code LPP"
          sub="5 606 lignes de la LPP (mise à jour du 09-07-2026) — désignations officielles par titre, recherche par code, produit ou marque."
        />

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            La LPP, liste des dispositifs remboursables
          </h2>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Instituée par l&apos;article L. 165-1 du code de la sécurité sociale, la{" "}
            <b className="text-ink">Liste des produits et prestations</b>{" "}conditionne la prise en
            charge des dispositifs médicaux par l&apos;Assurance maladie : un produit n&apos;est
            remboursable que s&apos;il est inscrit sur la liste, sous un{" "}
            <b className="text-ink">code à 7 chiffres</b>{" "}assorti d&apos;une désignation, de
            conditions de prescription et d&apos;un tarif de responsabilité. Elle s&apos;organise
            en cinq titres, des dispositifs pour traitements à domicile (Titre I) aux orthèses et
            prothèses externes (Titre II), dispositifs implantables (Titre III), véhicules pour
            handicapés physiques (Titre IV) et autres dispositifs invasifs (Titre V).
          </p>
          <h3 className="mt-5 text-[15px] font-semibold text-[#0c2740]">
            Le Titre IV : fauteuils roulants et VPH
          </h3>
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Le Titre IV regroupe les <b className="text-ink">véhicules pour handicapés
            physiques</b>{" "}: fauteuils roulants manuels, électriques et verticalisateurs, poussettes,
            adjonctions et suppléments — par exemple le code{" "}
            <span className="font-mono text-[13px]">4113920</span>, fauteuil roulant électrique
            monte-marches. Depuis l&apos;arrêté du 6 février 2025, la prise en charge des VPH obéit
            à une nomenclature entièrement rénovée : catégories et classes, prescripteurs
            habilités, évaluation, adjonctions et forfaits de prestations. Pour construire une
            prescription complète, l&apos;outil <b className="text-ink">PRECONIA</b>{" "}guide le
            prescripteur pas à pas jusqu&apos;à la fiche récapitulative.
          </p>
          <p className="mt-3 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            Les tarifs ne sont volontairement pas affichés ici : la base tarifaire officielle de
            l&apos;Assurance maladie fait seule foi, et le moteur s&apos;en tient aux désignations
            officielles pour éviter toute donnée périmée.
          </p>
        </CarteNavy>

        <CarteNavy>
          <h2 className="text-lg font-semibold tracking-tight text-[#0c2740]">
            Questions fréquentes — LPP
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
          Aller plus loin
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
              href: "/aide-codage/ngap",
              title: "NGAP",
              desc: "Les actes cliniques et les lettres clés : recherche en texte intégral des 150 articles.",
            },
            {
              href: "/aide-codage",
              title: "Aide au codage — le moteur complet",
              desc: "Les quatre nomenclatures réunies dans une seule recherche instantanée.",
            },
          ]}
        />
        <CodageGuideFooter source="LPP, Assurance maladie ; base tarifaire officielle seule opposable" />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            codageJsonLd({ url: URL, name: TITLE, description: DESCRIPTION, breadcrumb: "Code LPP", faq: FAQ }),
          ),
        }}
      />
    </div>
  );
}
