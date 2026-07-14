import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  Carte,
  RelatedLinks,
  SeoTopBar,
  seoPageJsonLd,
} from "@/components/preconia/SeoPageChrome";

const URL = "https://preconia.fr/prescription-fauteuil-roulant";
const TITLE =
  "Prescription d'un fauteuil roulant : qui prescrit, comment, quel remboursement (2025)";
const DESCRIPTION =
  "Prescrire un fauteuil roulant selon la nomenclature VPH 2025 : qui peut prescrire (médecin, MPR, ergothérapeute), le parcours d'évaluation et d'essais, achat ou location, la fiche de préconisation, la demande d'accord préalable et les pièces à transmettre à l'Assurance maladie.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/prescription-fauteuil-roulant" },
  keywords: [
    "prescription fauteuil roulant",
    "prescrire un fauteuil roulant",
    "qui peut prescrire un fauteuil roulant",
    "prescription VPH",
    "ordonnance fauteuil roulant",
    "fiche de préconisation VPH",
    "remboursement fauteuil roulant",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "article", locale: "fr_FR" },
};

const H2 = "text-lg font-semibold tracking-tight";
const P = "mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto";
const lien = "font-semibold text-petrol underline-offset-2 hover:underline";

export default function PrescriptionFauteuilRoulant() {
  const jsonLd = seoPageJsonLd({
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    breadcrumb: "Prescription d'un fauteuil roulant",
  });

  return (
    <>
      <SeoTopBar />
      <main className="relative z-10 mx-auto max-w-[880px] px-5 pb-16 pt-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Breadcrumb current="Prescription d'un fauteuil roulant" />

        <header>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
            ▸ Nomenclature VPH 2025
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight">
            Prescription d&apos;un fauteuil roulant : qui, comment, quel remboursement
          </h1>
          <p className={P} lang="fr">
            Depuis la <Link href="/nomenclature-vph-2025" className={lien}>nomenclature VPH 2025</Link>{" "}
            (arrêté du 6 février 2025), la <b>prescription d&apos;un fauteuil roulant</b> obéit à des
            règles précises qui varient selon la catégorie du dispositif et le mode de prise en
            charge. Cette page explique qui peut prescrire, quel est le parcours à suivre et quelles
            pièces conditionnent le remboursement. Pour un cas concret, le{" "}
            <Link href="/preconia" className={lien}>parcours guidé de PRECONIA</Link> déroule chaque
            étape automatiquement.
          </p>
        </header>

        <Carte>
          <h2 className={H2}>Qui peut prescrire un fauteuil roulant ?</h2>
          <p className={P} lang="fr">
            Le palier de prescription dépend de la catégorie et du mode de prise en charge. À
            l&apos;achat :
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            <li>
              <b>Tout médecin ou ergothérapeute</b> pour les fauteuils manuels non modulaires (FMP,
              FMPR), le fauteuil manuel modulaire (FRM), les bases roulantes et les poussettes
              standards.
            </li>
            <li>
              <b>Un prescripteur compétent</b> — médecin MPR, titulaire d&apos;un DU d&apos;appareillage
              ou d&apos;une formation à la compensation du handicap, ou ergothérapeute — pour les FRMC,
              FRMA et FRMP.
            </li>
            <li>
              <b>Une équipe pluridisciplinaire</b> (au minimum un médecin MPR ou titulaire d&apos;un DU
              d&apos;appareillage, et un ergothérapeute ou un kinésithérapeute, indépendants des
              fabricants) pour les FRMS, FRMV, FRE, FREP, FREV, poussettes évolutives, cycles et
              scooters.
            </li>
          </ul>
          <p className={P} lang="fr">
            En location courte durée, un fauteuil manuel peut aussi être prescrit par un
            kinésithérapeute ; la LCD d&apos;un fauteuil électrique relève d&apos;un palier restreint
            avec certificat d&apos;aptitude à la conduite. Le <b>renouvellement à l&apos;identique</b>{" "}
            peut, lui, être établi par un médecin généraliste ou un ergothérapeute.
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Le parcours de prescription, étape par étape</h2>
          <p className={P} lang="fr">
            Pour les catégories modulaires, électriques, poussettes évolutives, cycles et scooters :
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>
              <b>Évaluation des besoins</b> selon quatre critères (facteurs personnels, pathologie,
              usage et activités, environnement), avec <b>prise de mesures</b> obligatoire du patient.
            </li>
            <li>
              <b>Fiche de préconisation</b> : catégorie retenue, caractéristiques, options et mesures,
              sur le modèle opposable publié par le ministère de la santé.
            </li>
            <li>
              <b>Essais</b> : proposition de 4 modèles, essai comparatif d&apos;au moins 2, puis, pour
              les modulaires, essai de 7 jours en conditions réelles (48 h minimum) ; pour un
              électrique ou un scooter, essai d&apos;aptitude à la conduite attesté par certificat.
            </li>
            <li>
              <b>Prescription définitive</b>, établie après la phase d&apos;essai lors d&apos;une
              consultation post-évaluation.
            </li>
          </ol>
        </Carte>

        <Carte>
          <h2 className={H2}>Achat ou location : choisir le mode de prise en charge</h2>
          <p className={P} lang="fr">
            Le mode est décidé selon la durée prévisible du besoin : <b>achat</b> (besoin durable,
            renouvelable tous les 5 ans), <b>location longue durée</b> (FRMP, FRMV, FREP, FREV,
            POU_MRE — forfait trimestriel sous DAP) ou <b>location courte durée</b> (besoin de moins
            de trois mois — forfait hebdomadaire, 26 semaines maximum, avec option d&apos;achat).
            Après le dernier forfait de location, un <b>délai de carence</b> d&apos;un an s&apos;applique
            avant toute nouvelle prise en charge, sauf indication différente objectivée. Le détail des
            modes figure dans le guide de la{" "}
            <Link href="/nomenclature-vph-2025" className={lien}>nomenclature VPH 2025</Link>.
          </p>
        </Carte>

        <Carte>
          <h2 className={H2}>Pièces à transmettre et accord préalable</h2>
          <p className={P} lang="fr">
            Le remboursement d&apos;un fauteuil modulaire ou électrique est conditionné à la
            transmission de <b>cinq pièces</b> : fiche d&apos;évaluation des besoins, fiche de
            préconisation, certificat de validation des essais, bon de commande ou devis du
            distributeur, et prescription définitive. Certaines catégories exigent en plus une{" "}
            <b>demande d&apos;accord préalable</b> (DAP) auprès du service médical de l&apos;Assurance
            maladie. Une adjonction absente de la nomenclature peut être prise en charge sur devis,
            sous conditions strictes (DAP, mention manuscrite, essai et confirmation écrite du
            patient).
          </p>
          <div className="mt-4 rounded-xl border border-petrol/30 bg-petrol-tint/40 p-4">
            <div className="text-sm font-semibold text-petrol-deep">
              Générer la fiche récapitulative d&apos;une prescription
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              PRECONIA guide la prescription du patient au dispositif et produit une fiche
              récapitulative exportable en PDF (profil, caractéristiques techniques, codes LPP,
              adjonctions et forfaits).
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
              href: "/nomenclature-vph-2025",
              title: "Nomenclature VPH 2025",
              desc: "La réforme du remboursement des fauteuils roulants : catégories, modes, forfaits et dispositions transitoires.",
            },
            {
              href: "/preconia",
              title: "Ouvrir l'outil PRECONIA",
              desc: "Parcours guidé, recherche dans la nomenclature LPPR, évaluation de cumul et fiche récapitulative.",
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
