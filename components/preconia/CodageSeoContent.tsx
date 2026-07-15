/* Contenu éditorial indexable du hub /aide-codage (rendu serveur, sous le moteur) :
   présentation des quatre nomenclatures avec liens vers les pages guides, FAQ, et
   JSON-LD (WebApplication + FAQPage synchronisée — garder FAQ et balisage alignés). */

import Link from "next/link";

const GUIDES = [
  {
    href: "/aide-codage/cim-10",
    title: "Code CIM-10 — diagnostics",
    desc: "11 105 codes CIM-10-FR 2026 (ATIH) : catégories, chapitres, et recherche en langage courant (« crise cardiaque » → infarctus).",
  },
  {
    href: "/aide-codage/ccam",
    title: "Code CCAM — actes techniques",
    desc: "8 257 actes tarifables : structure du code, tarif secteur 1, accord préalable (« infiltration genou » → injection intraarticulaire).",
  },
  {
    href: "/aide-codage/ngap",
    title: "NGAP — actes cliniques",
    desc: "150 articles en texte intégral : consultations, lettres clés et coefficients, actes des auxiliaires médicaux.",
  },
  {
    href: "/aide-codage/lpp",
    title: "Code LPP — dispositifs médicaux",
    desc: "5 606 lignes de la Liste des produits et prestations, du pansement au fauteuil roulant (Titre IV).",
  },
];

const FAQ = [
  {
    q: "Que couvre l'aide au codage PRECONIA ?",
    a: "Quatre nomenclatures officielles réunies dans un seul moteur : les diagnostics CIM-10 (CIM-10-FR 2026 à usage PMSI), les actes techniques CCAM avec leurs tarifs, le texte intégral de la NGAP pour les actes cliniques, et les désignations de la LPP pour les dispositifs médicaux remboursables.",
  },
  {
    q: "Quelle nomenclature utiliser pour quel usage ?",
    a: "CIM-10 pour coder un diagnostic (PMSI, certificats) ; CCAM pour un acte technique médical (chirurgie, imagerie, geste interventionnel) ; NGAP pour les actes cliniques et les actes des auxiliaires médicaux (consultations, soins infirmiers, kinésithérapie) ; LPP pour les dispositifs médicaux et aides techniques remboursables.",
  },
  {
    q: "Peut-on chercher avec des termes courants ?",
    a: "Oui : un thésaurus d'équivalences validées traduit le langage courant vers le vocabulaire officiel — « infiltration genou » trouve l'injection thérapeutique intraarticulaire, « crise cardiaque » l'infarctus du myocarde, « botox » la toxine botulique. Les correspondances directes restent toujours classées en premier.",
  },
  {
    q: "Les résultats sont-ils opposables ?",
    a: "Non : l'outil est une aide à la recherche destinée aux professionnels de santé, indicative et non opposable. Seuls les référentiels officiels de l'Assurance maladie et de l'ATIH font foi, notamment pour les tarifs.",
  },
];

export function CodageSeoContent() {
  return (
    <section aria-label="À propos de l'aide au codage" className="w-full">
      {/* Guides par nomenclature (maillage interne + ancres de mots-clés). */}
      <h2 className="mt-12 text-lg font-semibold tracking-tight text-[#0c2740]">
        Guides par nomenclature
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group rounded-xl border border-[#1d4e7c]/20 bg-white/70 p-4 transition-colors hover:border-[#0ea5e9]"
          >
            <div className="text-sm font-semibold text-ink group-hover:text-[#0c2740]">
              {g.title} <span className="text-[#0ea5e9]">→</span>
            </div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{g.desc}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight text-[#0c2740]">
        Questions fréquentes — aide au codage
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                name: "PRECONIA Aide au codage",
                url: "https://preconia.fr/aide-codage",
                applicationCategory: "MedicalApplication",
                operatingSystem: "Web",
                inLanguage: "fr",
                description:
                  "Moteur de recherche des nomenclatures médicales françaises : diagnostics CIM-10, actes CCAM, NGAP et dispositifs LPP, avec thésaurus de termes courants.",
                offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
                audience: { "@type": "MedicalAudience", audienceType: "Professionnels de santé" },
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
          }),
        }}
      />
    </section>
  );
}
