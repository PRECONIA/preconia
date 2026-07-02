/* Contenu éditorial indexable (SSR, composant serveur — présent dans le HTML initial).
   Objectif SEO : couvrir les requêtes « prescription fauteuil roulant », « aide prescription
   VPH », « nomenclature VPH »… avec un contenu factuel adossé à notre base (nomenclature
   LPPR 2025 vérifiée contre la base CNAM). La FAQ visible est doublée en JSON-LD (FAQPage)
   pour les extraits enrichis Google — les deux doivent rester synchronisés. */

import { cumulMeta, meta, prestationsMeta } from "@/lib/data";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Qui peut prescrire un fauteuil roulant (VPH) ?",
    a: "Le prescripteur dépend de la catégorie de VPH. Trois paliers existent : tout médecin ou ergothérapeute (n'exerçant ni comme fournisseur, ni pour son compte) pour les catégories simples ; un prescripteur compétent (médecin MPR, titulaire d'un DU d'appareillage, ou médecin spécialiste hors médecine générale en établissement ou service) pour les catégories intermédiaires ; et une équipe pluridisciplinaire constituée au minimum d'un médecin MPR pour les catégories complexes (fauteuils électriques multi-positions, verticalisateurs…).",
  },
  {
    q: "Qu'est-ce que la nomenclature VPH 2025 ?",
    a: "Issue de la réforme de la prise en charge des fauteuils roulants (arrêté du 6 février 2025), la nomenclature VPH 2025 réorganise les véhicules pour personnes handicapées en catégories identifiées par des acronymes (FRM, FRMA, FRMC, FRE, FREP, FREV, poussettes, scooters…), chacune portant un code LPP et un tarif de responsabilité. Elle définit aussi les prescripteurs habilités, les fiches d'évaluation et de préconisation, les adjonctions facturables, les forfaits de positionnement (PAP), de mise à disposition (MAD), de livraison, de réparation (SAV) et les règles de cumul.",
  },
  {
    q: "Quelles sont les catégories de fauteuils roulants remboursées ?",
    a: "La nomenclature distingue notamment : les fauteuils manuels non modulaires (FMP, FMPR), les fauteuils manuels modulaires (FRM, FRMC pour le confort multi-positions, FRMA pour les actifs, FRMS sport, FRMP multi-position à pousser, FRMV verticalisateur), les fauteuils électriques (FRE classes A/B/C, FREP multi-position classes A/B/C, FREV verticalisateur), ainsi que les poussettes (POU_S, POU_MRE), bases roulantes, cycles modulaires et scooters (classes A+, B, C).",
  },
  {
    q: "Fauteuil roulant : achat ou location ?",
    a: "Trois modes de prise en charge existent selon la situation : l'achat en cas d'incapacité permanente ou de longue durée (plus de 6 mois) ; la location courte durée (LCD) pour un handicap temporaire estimé à moins de 3 mois (facturation limitée à 6 mois sur 12 mois glissants) ; et la location longue durée (LLD), réservée à certaines catégories de positionnement et de verticalisation, avec des forfaits trimestriels.",
  },
  {
    q: "À quoi servent la fiche d'évaluation et la fiche de préconisation ?",
    a: "La fiche d'évaluation des besoins décrit la situation fonctionnelle du patient ; la fiche de préconisation formalise le choix de la catégorie de VPH retenue avec le patient, ses adjonctions et son positionnement. Selon la catégorie, ces fiches sont requises pour la prise en charge, et certaines catégories exigent en plus une demande d'accord préalable (DAP).",
  },
  {
    q: "Peut-on cumuler deux fauteuils roulants (cumul de VPH) ?",
    a: "Pas toujours : la nomenclature définit des incompatibilités de cumul entre catégories (par exemple entre deux fauteuils manuels modulaires, ou entre fauteuils électriques, scooters et aides à la propulsion). PRECONIA intègre un module d'évaluation du cumul : on indique la catégorie déjà possédée et celle souhaitée, et l'outil indique si le cumul est autorisé ou interdit.",
  },
  {
    q: "Quels forfaits accompagnent la prescription d'un fauteuil roulant ?",
    a: "Outre le tarif du fauteuil et de ses adjonctions, la nomenclature prévoit : les forfaits de positionnement PAP (A et B), les forfaits de mise à disposition MAD1 (première mise à disposition ou changement de catégorie) et MAD2 (renouvellement à l'identique) dont le niveau dépend de la catégorie, le forfait de livraison sur prescription lorsque la mise à disposition dans les locaux du distributeur est impossible, et des plafonds annuels de réparation (SAV) incluant le remplacement de batterie.",
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
          "Aide à la prescription et à la préconisation des fauteuils roulants et VPH : catégorie LPPR, classe, prescripteur, codes LPP, adjonctions, positionnement, forfaits MAD et livraison, cumul — d'après la nomenclature VPH 2025.",
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
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            PRECONIA est un outil gratuit d&apos;aide à la <b>prescription</b> et à la{" "}
            <b>préconisation des véhicules pour personnes handicapées (VPH)</b> — fauteuils
            roulants manuels et électriques, poussettes, scooters, bases roulantes et cycles —
            dans le cadre de la <b>nomenclature VPH 2025</b> (réforme de la prise en charge des
            fauteuils roulants). Un parcours guidé mène du profil fonctionnel du patient à la{" "}
            <b>catégorie LPPR</b> adaptée, sa classe, son circuit de prescription, ses{" "}
            <b>codes LPP et tarifs</b>, ses adjonctions facturables, son positionnement (PAP) et
            ses forfaits associés (mise à disposition, livraison). L&apos;outil intègre un moteur
            de recherche dans la nomenclature (achat, location LLD/LCD, réparations SAV, MAD) et
            un module d&apos;évaluation du <b>cumul de VPH</b>.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft/80">
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
