/* Contenu éditorial indexable (SSR, composant serveur — présent dans le HTML initial).
   Objectif SEO : couvrir les requêtes « prescription fauteuil roulant », « aide prescription
   VPH », « nomenclature VPH »… avec un contenu factuel adossé à notre base (nomenclature
   LPPR 2025 vérifiée contre la base CNAM). La FAQ visible est doublée en JSON-LD (FAQPage)
   pour les extraits enrichis Google — les deux doivent rester synchronisés. */

import { cumulMeta, meta, prestationsMeta } from "@/lib/data";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Qui peut prescrire un fauteuil roulant (VPH) ?",
    a: "Le palier de prescription dépend de la catégorie de VPH et du mode de prise en charge (arrêté du 6 février 2025). À l'achat : tout médecin ou ergothérapeute pour les FMP, FMPR, FRM, bases roulantes et poussettes standards ; un prescripteur compétent (médecin MPR, titulaire d'un DU d'appareillage ou d'une formation à la compensation du handicap, ou ergothérapeute) pour les FRMC, FRMA et FRMP ; une équipe pluridisciplinaire — au minimum un médecin MPR ou titulaire d'un DU d'appareillage, et un ergothérapeute ou un kinésithérapeute ayant une pratique des VPH, indépendants des fabricants et distributeurs — pour les FRMS, FRMV, FRE, FREP, FREV, POU_MRE, cycles et scooters. En location courte durée, un fauteuil manuel (FMP, FMPR, FRM) peut aussi être prescrit par un kinésithérapeute ; la LCD d'un fauteuil électrique relève d'un palier restreint, avec demande d'accord préalable et certificat d'aptitude à la conduite. Enfin, le renouvellement à l'identique peut être effectué par un médecin généraliste ou un ergothérapeute, même si la primo-prescription exigeait une équipe pluridisciplinaire.",
  },
  {
    q: "Qu'est-ce que la nomenclature VPH 2025 et depuis quand s'applique-t-elle ?",
    a: "Issue de l'arrêté du 6 février 2025 (JO du 7 février 2025), la nomenclature VPH 2025 s'applique depuis le 1er décembre 2025. Les fauteuils roulants y sont inscrits en lignes génériques — et non plus sous nom de marque — réparties en catégories identifiées par des acronymes (FMP, FMPR, FRM, FRMC, FRMA, FRMS, FRMP, FRMV, FRE, FREP, FREV, poussettes, bases roulantes, cycles, scooters), avec une prise en charge intégrale par l'Assurance maladie. Elle définit trois modes d'acquisition (achat, location courte durée, location longue durée), les prescripteurs habilités, le parcours d'évaluation et d'essais, les adjonctions, les forfaits (PAP, MAD, livraison, SAV) et les règles de cumul. Dispositions transitoires : les VPH conformes à l'ancienne nomenclature et prescrits avant le 1er décembre 2025 restent délivrables jusqu'au 1er décembre 2026, et les anciens codes de location de 52 semaines et plus restent facturables jusqu'au 30 novembre 2027. La prise en charge des fauteuils remis en bon état d'usage (RBEU) est annoncée mais son arrêté d'application n'est pas encore publié.",
  },
  {
    q: "Quelles sont les catégories de fauteuils roulants remboursées ?",
    a: "La nomenclature distingue notamment : les fauteuils manuels non modulaires (FMP, FMPR), les fauteuils manuels modulaires (FRM, FRMC configurable, FRMA actif, FRMS sport, FRMP multi-position, FRMV verticalisateur), les fauteuils électriques (FRE classes A/B/C, FREP multi-position classes A/B/C, FREV verticalisateur), ainsi que les poussettes (POU_S, POU_MRE — réservées aux enfants de moins de 16 ans), bases roulantes, cycles modulaires et scooters (classes A+, B, C).",
  },
  {
    q: "Fauteuil roulant : achat ou location ?",
    a: "Le mode d'acquisition est décidé par le prescripteur selon la durée prévisible du besoin. L'achat et la location longue durée s'adressent aux incapacités de plus de 6 mois : l'achat est renouvelable tous les 5 ans (3 ans avant 16 ans) ; la LLD, réservée aux FRMP, FRMV, FREP, FREV et POU_MRE, est un forfait trimestriel qui couvre pendant 5 ans le fauteuil, sa maintenance, ses réparations et son changement éventuel au sein de la catégorie, avec demande d'accord préalable. La location courte durée (FMP, FMPR, FRM et FRE) couvre les incapacités temporaires estimées à moins de 3 mois : forfait hebdomadaire — d'un montant réduit à partir de la 14e semaine — limité à 26 semaines consécutives par année glissante ; au terme des 26 semaines, le patient peut acquérir le fauteuil déjà loué via l'option d'achat, sur décision du prescripteur. Après le dernier forfait de location facturé, un délai de carence d'un an s'applique avant toute nouvelle prise en charge (achat, LLD ou nouvelle LCD), sauf épisode de soin dans une indication différente objectivé par une nouvelle prescription.",
  },
  {
    q: "À quoi servent la fiche d'évaluation et la fiche de préconisation ?",
    a: "Pour les fauteuils modulaires, électriques, poussettes évolutives, cycles et scooters, la prise en charge suit un parcours en trois étapes : l'évaluation des besoins selon quatre critères (facteurs personnels, pathologie, usage et activités, facteurs environnementaux), accompagnée obligatoirement de la prise de mesures du patient ; les préconisations, formalisées dans une fiche de préconisation dont le modèle opposable est publié par le ministère de la santé (catégorie retenue, caractéristiques, options, mesures) ; puis la prescription définitive, établie après la phase d'essai lors d'une consultation post-évaluation. Le remboursement est conditionné à la transmission de cinq pièces : fiche d'évaluation des besoins, fiche de préconisation, certificat de validation des essais, bon de commande ou devis du distributeur, et prescription définitive. Certaines catégories exigent en plus une demande d'accord préalable (DAP).",
  },
  {
    q: "Quels essais sont obligatoires avant la délivrance ?",
    a: "À l'achat comme en location longue durée : proposition de 4 modèles sur catalogue conformes à la prescription, essai pratique comparatif d'au moins 2 modèles réglés par le distributeur, puis, pour les catégories modulaires, essai en conditions réelles d'utilisation de 7 jours (réductible à 48 heures minimum à la demande expresse du patient) — aucune facturation du fauteuil ne peut intervenir avant la fin de cet essai. Pour un fauteuil électrique ou un scooter, un essai préalable en présence d'une équipe pluridisciplinaire vérifie d'abord l'aptitude du patient à maîtriser la conduite, attestée par un certificat. En location courte durée, le parcours d'essai est allégé (2 étapes), avec une dérogation d'urgence possible pour les fauteuils non modulaires sur mention explicite de l'ordonnance.",
  },
  {
    q: "Peut-on cumuler deux fauteuils roulants (cumul de VPH) ?",
    a: "Pas toujours : la nomenclature interdit notamment le cumul de deux VPH non modulaires, de deux VPH modulaires (manuels ou électriques), d'un cycle avec un fauteuil manuel modulaire et d'un scooter avec un fauteuil électrique — l'exception principale étant le fauteuil manuel sport (FRMS), cumulable avec un autre VPH modulaire. Une prise en charge en location courte durée n'est cumulable avec aucun autre VPH loué ou vendu ; une dérogation encadrée permet toutefois la LCD d'un fauteuil électrique lorsque le patient possède un fauteuil manuel sans assistance électrique et se trouve transitoirement dans l'impossibilité de le propulser. Le module d'évaluation de PRECONIA rend le verdict (autorisé, interdit ou dérogation possible) selon la catégorie possédée, la catégorie souhaitée et le mode de chacune (achat, LLD, LCD).",
  },
  {
    q: "Quels forfaits accompagnent la prescription d'un fauteuil roulant ?",
    a: "Outre le tarif du fauteuil et de ses adjonctions, la nomenclature prévoit : les forfaits de positionnement PAP A (membre supérieur et dossier) et PAP B (membre inférieur, hanches et siège) ; les forfaits de mise à disposition MAD1 (première mise à disposition ou changement de catégorie) et MAD2 (renouvellement à l'identique), réservés à l'achat et à la LLD, leur niveau dépendant de la catégorie — en location courte durée, un forfait MAD dédié s'applique aux FRM et FRE, une fois par épisode de location ; le forfait de livraison sur prescription, lorsque la mise à disposition dans les locaux du distributeur est impossible, limité à une prise en charge par VPH et par période de 5 ans (3 ans avant 16 ans) ; et les forfaits annuels de réparation SAV1 à SAV5 (fauteuils manuels, électriques, poussettes, batteries, cycles). À noter : en LCD, les adjonctions ne se facturent pas séparément — elles sont incluses dans le forfait hebdomadaire de location.",
  },
  {
    q: "Peut-on prendre en charge une adjonction absente de la nomenclature ?",
    a: "Oui, sur devis, pour les fauteuils roulants modulaires et sportifs, en l'absence d'équivalence inscrite à la LPPR : la prise en charge exige une demande d'accord préalable au service médical de l'Assurance maladie, une mention manuscrite spécifique du prescripteur sur l'ordonnance, un essai en conditions réelles (7 jours, 48 heures minimum) et la confirmation écrite du patient. À noter : les coussins anti-escarres adaptables sur VPH relèvent d'un autre chapitre de la LPPR (Titre I, chapitre 2) et non de la nomenclature VPH.",
  },
];

export function SeoContent() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "PRECONIA",
        url: "https://preconia.vercel.app/preconia",
        applicationCategory: "MedicalApplication",
        operatingSystem: "Web",
        inLanguage: "fr",
        description:
          "Aide à la prescription et à la préconisation des fauteuils roulants et VPH : catégorie LPPR, classe, mode de prise en charge (achat, LCD, LLD), prescripteur, codes LPP, adjonctions, positionnement, forfaits MAD et livraison, essais, délai de carence, cumul — d'après la réforme de la nomenclature VPH 2025 (arrêté du 6 février 2025).",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        audience: { "@type": "MedicalAudience", audienceType: "Professionnels de santé" },
        author: {
          "@type": "Person",
          honorificPrefix: "Dr",
          name: "Thomas Bredel",
          jobTitle: "Médecin spécialiste en Médecine Physique et de Réadaptation",
          address: { "@type": "PostalAddress", addressLocality: "Rouen", addressCountry: "FR" },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <section
      aria-label="À propos de la prescription des fauteuils roulants (VPH)"
      className="relative z-10 mx-auto max-w-[790px] px-5 pb-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
        <div className="px-6 py-6">
          <h2 className="text-lg font-semibold tracking-tight">
            PRECONIA, l&apos;aide à la prescription des fauteuils roulants (VPH)
          </h2>
          {/* text-justify + hyphens-auto : bloc de texte régulier (« rectangle »), sans
              lignes en drapeau. */}
          <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
            PRECONIA est un outil gratuit d&apos;aide à la <b>prescription</b> et à la{" "}
            <b>préconisation des véhicules pour personnes handicapées (VPH)</b> — fauteuils
            roulants manuels et électriques, poussettes, scooters, bases roulantes et cycles —
            dans le cadre de la <b>nomenclature VPH 2025</b> (arrêté du 6 février 2025, applicable
            depuis le 1er décembre 2025). Un parcours guidé mène du patient au dispositif :{" "}
            <b>catégorie LPPR</b> et classe, mode de prise en charge (achat, location courte ou
            longue durée), palier de prescripteur, <b>codes LPP et tarifs</b>, adjonctions
            facturables, positionnement (PAP), forfaits de mise à disposition et de livraison,
            jusqu&apos;à la fiche de préconisation exportable en PDF. L&apos;outil rappelle au fil
            du parcours les règles introduites par la réforme — parcours d&apos;essais, pièces à
            transmettre à l&apos;Assurance maladie, délai de carence après une location, option
            d&apos;achat, renouvellements — et intègre un moteur de recherche dans la nomenclature
            (achat, LLD, LCD, SAV, MAD), un catalogue des modèles inscrits et un module
            d&apos;évaluation du <b>cumul de VPH</b>.
          </p>
          <p className="mt-2 text-justify text-xs leading-relaxed text-ink-soft/80 hyphens-auto" lang="fr">
            Base adossée aux données officielles ({meta.source}), prestations et forfaits à jour du{" "}
            {prestationsMeta.lastUpdated}, règles de cumul à jour du {cumulMeta.lastUpdated}.{" "}
            {meta.disclaimer}
          </p>

          <h2 className="mb-3 mt-6 text-lg font-semibold tracking-tight">
            Questions fréquentes — prescription des VPH
          </h2>
          <div className="divide-y divide-line-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-2.5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink transition-colors hover:text-petrol-deep">
                  <span className="mr-1.5 inline-block text-petrol transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-4 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Encart signature — à l'origine du projet. */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
        <div className="px-6 py-5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">
            Développement
          </div>
          <div className="mt-1.5 text-base font-bold tracking-tight">Dr Thomas BREDEL</div>
          <div className="mt-0.5 text-sm text-ink-soft">
            Médecine Physique et de Réadaptation — Rouen
          </div>
          <p className="mx-auto mt-2 max-w-[52ch] text-xs leading-relaxed text-ink-soft/80">
            PRECONIA est conçu et développé dans le but d&apos;accompagner les prescripteurs et
            les prestataires dans l&apos;application de la réforme de la nomenclature 2025.
          </p>
        </div>
      </div>
    </section>
  );
}
