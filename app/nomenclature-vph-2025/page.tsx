import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  Carte,
  RelatedLinks,
  SeoTopBar,
  seoPageJsonLd,
} from "@/components/preconia/SeoPageChrome";

const URL = "https://preconia.fr/nomenclature-vph-2025";
const TITLE =
  "Nomenclature VPH 2025 : réforme du remboursement des fauteuils roulants (arrêté du 6 février 2025)";
const DESCRIPTION =
  "La nomenclature VPH 2025 (arrêté du 6 février 2025, applicable depuis le 1er décembre 2025) réforme le remboursement des fauteuils roulants : lignes génériques, catégories (FRM, FRE, FREP…), achat, location courte et longue durée, forfaits, cumul et dispositions transitoires. Guide clair pour les prescripteurs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nomenclature-vph-2025" },
  keywords: [
    "nomenclature VPH",
    "nomenclature VPH 2025",
    "nomenclature fauteuil roulant",
    "réforme fauteuil roulant 2025",
    "arrêté 6 février 2025",
    "remboursement fauteuil roulant",
    "LPPR fauteuil roulant",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};

const H2 = "text-lg font-semibold tracking-tight";
const P = "mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto";
const lien = "font-semibold text-petrol underline-offset-2 hover:underline";

export default function NomenclatureVph2025() {
  const jsonLd = seoPageJsonLd({
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    breadcrumb: "Nomenclature VPH 2025",
  });

  return (
    <>
      <SeoTopBar />
      <main className="relative z-10 mx-auto max-w-[880px] px-5 pb-16 pt-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Breadcrumb current="Nomenclature VPH 2025" />

        <header>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
            ▸ Arrêté du 6 février 2025
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight">
            Nomenclature VPH 2025 : la réforme du remboursement des fauteuils roulants
          </h1>
          <p className={P} lang="fr">
            La <b>nomenclature VPH 2025</b>{" "}— issue de l&apos;<b>arrêté du 6 février 2025</b>{" "}(Journal
            officiel du 7 février 2025) et applicable depuis le <b>1er décembre 2025</b>{" "}— refond
            entièrement l&apos;inscription et le remboursement des <b>véhicules pour personnes
            handicapées</b>{" "}(VPH), c&apos;est-à-dire les fauteuils roulants manuels et électriques,
            les poussettes, les scooters, les bases roulantes et les cycles. Cette page en résume
            les principes ; pour appliquer la réforme cas par cas, PRECONIA propose un{" "}
            <Link href="/preconia" className={lien}>
              parcours guidé de prescription
            </Link>{" "}
            adossé à la base officielle de l&apos;Assurance maladie.
          </p>
        </header>

        <Carte>
          <h2 className={H2}>Ce que change la nomenclature VPH 2025</h2>
          <p className={P} lang="fr">
            Le changement structurant est le passage à des <b>lignes génériques</b>{" "}: les fauteuils
            ne sont plus inscrits sous un nom de marque mais sous des lignes définies par des
            spécifications techniques minimales, regroupées en <b>catégories désignées par des
            acronymes</b>. En contrepartie de ces exigences, la prise en charge devient{" "}
            <b>intégrale</b>{" "}par l&apos;Assurance maladie pour les dispositifs conformes — sans reste
            à charge sur le tarif de responsabilité. La réforme définit également, pour chaque
            catégorie : les prescripteurs habilités, le parcours d&apos;évaluation et d&apos;essais,
            les adjonctions facturables, les forfaits associés et les règles de cumul.
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Les catégories de VPH remboursées</h2>
          <p className={P} lang="fr">
            La nomenclature distingue notamment :
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            <li>
              <b>Fauteuils manuels non modulaires</b>{" "}— pliant (FMP), pliant à cadre rigide (FMPR).
            </li>
            <li>
              <b>Fauteuils manuels modulaires</b>{" "}— modulaire (FRM), multi-configurable (FRMC), actif
              (FRMA), de sport (FRMS), multi-position (FRMP), verticalisateur (FRMV).
            </li>
            <li>
              <b>Fauteuils électriques</b>{" "}— standard (FRE, classes A/B/C), multi-position (FREP,
              classes A/B/C), verticalisateur (FREV).
            </li>
            <li>
              <b>Poussettes</b>{" "}(POU_S standard, POU_MRE modulaire/évolutive — réservées aux enfants
              de moins de 16 ans), <b>bases roulantes</b>, <b>cycles</b>{" "}à roues multiples et{" "}
              <b>scooters</b>{" "}(classes A+, B, C).
            </li>
          </ul>
        </Carte>

        <Carte>
          <h2 className={H2}>Trois modes de prise en charge : achat, LCD, LLD</h2>
          <p className={P} lang="fr">
            La nomenclature organise le remboursement selon la durée prévisible du besoin.{" "}
            L&apos;<b>achat</b>{" "}et la <b>location longue durée</b>{" "}(LLD) répondent aux incapacités de
            plus de six mois : l&apos;achat est renouvelable tous les 5 ans (3 ans avant 16 ans) ; la
            LLD — réservée aux FRMP, FRMV, FREP, FREV et POU_MRE — est un forfait trimestriel couvrant
            pendant 5 ans le fauteuil, sa maintenance et ses réparations, sous demande d&apos;accord
            préalable. La <b>location courte durée</b>{" "}(LCD, réservée aux FMP, FMPR, FRM et FRE) couvre
            les incapacités temporaires estimées à moins de trois mois : forfait hebdomadaire, réduit
            à partir de la 14e semaine, limité à 26 semaines consécutives par année glissante, avec
            une option d&apos;achat au terme de la location.
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Le parcours de prescription</h2>
          <p className={P} lang="fr">
            Pour les catégories complexes (modulaires, électriques, poussettes évolutives, cycles,
            scooters), la prise en charge suit un parcours en trois temps : l&apos;<b>évaluation des
            besoins</b>{" "}selon quatre critères (facteurs personnels, pathologie, usage et activités,
            facteurs environnementaux) avec prise de mesures obligatoire ; la <b>fiche de
            préconisation</b>{" "}(modèle opposable publié par le ministère de la santé) ; puis la{" "}
            <b>prescription définitive</b>{" "}après la phase d&apos;essai. Le remboursement est
            conditionné à cinq pièces (évaluation, préconisation, certificat de validation des essais,
            bon de commande ou devis, prescription définitive) et, pour certaines catégories, à une{" "}
            <b>demande d&apos;accord préalable</b>{" "}(DAP). Le détail par catégorie est disponible dans
            le guide sur la{" "}
            <Link href="/prescription-fauteuil-roulant" className={lien}>
              prescription d&apos;un fauteuil roulant
            </Link>
            .
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Forfaits, adjonctions et cumul</h2>
          <p className={P} lang="fr">
            Outre le tarif du fauteuil, la nomenclature prévoit les forfaits de positionnement{" "}
            <b>PAP A et PAP B</b>, les forfaits de mise à disposition <b>MAD1 et MAD2</b>, le forfait
            de <b>livraison</b>{" "}et les forfaits annuels de réparation <b>SAV1 à SAV5</b>. Les{" "}
            <b>adjonctions</b>{" "}se facturent via des lignes génériques dédiées (sauf en LCD, où elles
            sont incluses dans le forfait hebdomadaire). Enfin, des <b>règles de cumul</b>{" "}encadrent
            la possession simultanée de deux VPH : le module d&apos;évaluation de PRECONIA en rend le
            verdict.
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Dispositions transitoires</h2>
          <p className={P} lang="fr">
            Les VPH conformes à l&apos;ancienne nomenclature et prescrits avant le 1er décembre 2025
            restent délivrables jusqu&apos;au <b>1er décembre 2026</b>{" "}; les anciens codes de location
            de 52 semaines et plus restent facturables jusqu&apos;au <b>30 novembre 2027</b>. La prise
            en charge des fauteuils remis en bon état d&apos;usage (RBEU) est annoncée mais son arrêté
            d&apos;application n&apos;est pas encore publié.
          </p>
          <div className="mt-4 rounded-xl border border-petrol/30 bg-petrol-tint/40 p-4">
            <div className="text-sm font-semibold text-petrol-deep">
              Appliquer la nomenclature VPH 2025 à un cas précis
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              PRECONIA détermine la catégorie et la classe, le prescripteur habilité, les codes LPP
              et tarifs, les adjonctions et forfaits, jusqu&apos;à la fiche récapitulative en PDF.
            </p>
            <Link
              href="/preconia"
              className="pc-btn-primary mt-3 inline-flex items-center rounded-xl px-4 py-2 text-[13px] font-semibold text-white"
            >
              Ouvrir le parcours guidé ↗
            </Link>
          </div>
        </Carte>

        <RelatedLinks
          links={[
            {
              href: "/prescription-fauteuil-roulant",
              title: "Prescription d'un fauteuil roulant",
              desc: "Qui peut prescrire, le parcours étape par étape, les pièces à transmettre et le remboursement.",
            },
            {
              href: "/conformite",
              title: "Conformité & traçabilité",
              desc: "Comment la base de PRECONIA est vérifiée contre les données officielles de l'Assurance maladie.",
            },
          ]}
        />

        <p className="mt-6 text-[11px] leading-relaxed text-ink-soft/70" lang="fr">
          Contenu informatif à destination des professionnels de santé, adossé à l&apos;arrêté du
          6 février 2025 ; aide à la décision non opposable — seuls les textes officiels font foi.
        </p>
      </main>
    </>
  );
}
