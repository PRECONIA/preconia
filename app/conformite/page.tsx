import type { Metadata } from "next";
import { cumulMeta, meta, prestationsMeta } from "@/lib/data";

/* Page de conformité & traçabilité — le dossier d'audit public de PRECONIA.
   Destinataires : auditeurs, développeurs tiers, institutions (UNPDM…). Elle expose :
   la démarche, la vérification reproductible contre la base officielle LPPTOT, la
   traçabilité de chaque fichier de données vers sa source, et la matrice règle → texte
   réglementaire → implémentation → test. Rendu statique, indexable. */

export const metadata: Metadata = {
  title: "Conformité & traçabilité — PRECONIA",
  description:
    "Comment PRECONIA prouve la fidélité de sa base aux données officielles (LPPTOT/CNAMTS, CERAH) et la conformité de son algorithme à l'arrêté du 6 février 2025 : vérification reproductible, tests unitaires, traçabilité règle par règle.",
  alternates: { canonical: "/conformite" },
};

/* Dernière exécution de référence du vérificateur (mise à jour à chaque campagne). */
const VERIF = {
  date: "9 juillet 2026",
  base: "LPPTOT892",
  sha256: "b99c78f05d4a217c7dd930cc63561f9ab30f4aa996487b5b642c004fb31e4662",
  codes: 1092,
  distincts: 420,
  tarifs: 74,
  libelles: 413,
  ecarts: 0,
  /* couverture inverse : codes « VPH » recensés dans la base officielle */
  couvertureTotal: 427,
  couvertureHorsPerimetre: 7,
  couvertureNouveautes: 0,
};

const DEPOT = "https://github.com/PRECONIA/preconia";

/* ---------------- matrice données → sources ---------------- */
const DONNEES: { fichier: string; contenu: string; source: string; verification: string }[] = [
  {
    fichier: "device-lpp.json",
    contenu: "22 codes mères d'achat neuf par type/classe, avec tarifs",
    source: "Base LPP (LPPTOT, CNAMTS)",
    verification: "Vérificateur : existence, vigueur et tarif de chaque code",
  },
  {
    fichier: "device-models.json",
    contenu: "Catalogue des modèles inscrits (396 codes marque/modèle)",
    source: "Liste CERAH des VPH inscrits + base LPP",
    verification: "Vérificateur : existence et vigueur ; marque retrouvée dans la désignation",
  },
  {
    fichier: "lppr.json / lppr-adjonctions.json",
    contenu: "380 lignes du moteur de recherche (achat neuf, adjonctions, PAP)",
    source: "Base LPP (LPPTOT, CNAMTS)",
    verification: "Vérificateur : existence, vigueur et libellé de chaque code",
  },
  {
    fichier: "lppr-prestations.json",
    contenu: "32 forfaits LLD, LCD, SAV, MAD et livraison, avec tarifs",
    source: "Base LPP (LPPTOT, CNAMTS)",
    verification: "Vérificateur : existence, vigueur, tarif et libellé",
  },
  {
    fichier: "location-forfaits.json",
    contenu: "Correspondance catégorie → forfaits de location (LCD ≤ 13 / 14–26 sem, option d'achat, MAD LCD, LLD par classe)",
    source: "Arrêté du 06/02/2025 (Titre I ch. 9, Titre IV 3.3) + base LPP",
    verification: "Vérificateur + contrôles de cohérence au build (lib/data.ts)",
  },
  {
    fichier: "mad-forfaits.json",
    contenu: "Niveaux MAD1/MAD2 par catégorie de VPH",
    source: "Arrêté du 06/02/2025 (Titre IV 5.1 et 5.2) + base LPP",
    verification: "Vérificateur + tests unitaires (madForfaitFor)",
  },
  {
    fichier: "adjonctions.json / pap.json / adjonction-brands.json",
    contenu: "Adjonctions facturables du parcours, forfaits PAP A/B, variantes de marque",
    source: "Arrêté du 06/02/2025 (Titre IV §7) + base LPP",
    verification: "Vérificateur (codes, tarifs, sentinelle « sur devis ») + tests de compatibilité",
  },
  {
    fichier: "devices.json",
    contenu: "Catégories, modes de prise en charge, paliers de prescripteur, DAP",
    source: "Arrêté du 06/02/2025 (Titre I et IV)",
    verification: "Tests unitaires (éligibilités, prescriberFor) + revue contre le texte",
  },
  {
    fichier: "cumul.json",
    contenu: "Matrice des non-cumuls entre catégories",
    source: "Arrêté du 06/02/2025 (Titre IV 4.1–4.2)",
    verification: "Tests unitaires ligne à ligne (isCumulAllowed, cumulVerdict)",
  },
  {
    fichier: "device-indications.json",
    contenu: "Indications officielles de prise en charge par catégorie et mode",
    source: "Arrêté du 06/02/2025 (sections « indications »)",
    verification: "Revue contre le texte (citations quasi littérales)",
  },
  {
    fichier: "classes.json / besoins.json",
    contenu: "Classes d'usage A/B/C (code de la route) ; fiche d'évaluation des besoins",
    source: "Arrêté du 06/02/2025 (Titre IV §2) ; fiche d'évaluation 2026",
    verification: "Tests unitaires (classeRoute) + revue",
  },
];

/* ---------------- matrice règles → texte → implémentation → tests ---------------- */
const REGLES: { regle: string; ref: string; impl: string; controle: string }[] = [
  {
    regle: "Catégories de VPH et acronymes (FMP … SCO)",
    ref: "Titre IV, §1",
    impl: "data/devices.json",
    controle: "Schémas zod au build",
  },
  {
    regle: "Éligibilité à la LCD : FMP, FMPR, FRM, FRE uniquement",
    ref: "Titre I ch. 9, 9.1",
    impl: "devices.json (modes) + deviceAllowedForDuree()",
    controle: "tests/rules.test.ts (temporalité) + E2E",
  },
  {
    regle: "Éligibilité à la LLD : FRMP, FRMV, FREP (A/B/C), FREV, POU_MRE",
    ref: "Titre IV, 3.3.1",
    impl: "devices.json (modes) + deviceAllowedForDuree()",
    controle: "tests/rules.test.ts + E2E",
  },
  {
    regle: "Forfait hebdomadaire LCD selon la durée (≤ 13 sem / 14–26 sem)",
    ref: "Titre I, 9.3",
    impl: "lcdForfaitFor() + location-forfaits.json",
    controle: "tests « forfaits de location » + vérificateur LPPTOT",
  },
  {
    regle: "Option d'achat LCD par catégorie, au terme des 26 semaines ; garantie 2 ans",
    ref: "Titre I, 9.3 ; 6.1.1",
    impl: "lcdOptionAchatFor() + note détaillée sur la fiche",
    controle: "Tests unitaires + E2E",
  },
  {
    regle: "Forfait trimestriel LLD par catégorie, FREP décliné par classe A/B/C",
    ref: "Titre IV, 3.3.2",
    impl: "lldForfaitFor()",
    controle: "Tests unitaires + vérificateur",
  },
  {
    regle: "MAD1 / MAD2 réservés à l'achat et à la LLD, 3 niveaux selon la catégorie",
    ref: "Titre IV, 5.1 et 5.2",
    impl: "madForfaitFor() + mad-forfaits.json",
    controle: "Tests unitaires + vérificateur",
  },
  {
    regle: "MAD LCD dédiée, réservée FRM et FRE, une fois par épisode de location",
    ref: "Titre I, 9.8",
    impl: "madLcdFor()",
    controle: "Tests unitaires + E2E",
  },
  {
    regle: "Livraison sur prescription : 1 par VPH / 5 ans (3 ans avant 16 ans)",
    ref: "Titre I, 9.9",
    impl: "meta.json (livraison) + libellé sur la fiche",
    controle: "Vérificateur (code, tarif) + revue",
  },
  {
    regle: "Prescripteur à l'achat (qui signe l'ordonnance) : médecin/ergo (FMP, FMPR, FRM, BASE, POU_S) ; MPR/DU/formation ou ergo seul (FRMC, FRMA, FRMP) ; MPR/DU ou ergo en équipe pluridisciplinaire (FRMS, FRMV, FRE, FREP, FREV, POU_MRE, CYC, SCO)",
    ref: "Titre IV, 3.1.4.1 et 3.1.4.2.4",
    impl: "devices.json (presc) + prescriberFor()",
    controle: "Tests dédiés (prescriberFor)",
  },
  {
    regle: "Évaluation des besoins et fiche de préconisation — professionnel distinct du prescripteur : équipe pluridisciplinaire (catégories complexes) ; prescripteur compétent (FRM, FRMC, FRMA, FRMP) ; non requise (FMP, FMPR, BASE, POU_S)",
    ref: "Titre IV, 3.1.4.2.1",
    impl: "devices.json (eval) + carte evaluators",
    controle: "Schéma zod + cohérence eval/fiche au build",
  },
  {
    regle: "LCD manuelle prescriptible par médecin, ergothérapeute ou kinésithérapeute",
    ref: "Titre I, 9.5.a",
    impl: "prescriberFor(pec = lcd)",
    controle: "Test dédié + E2E",
  },
  {
    regle: "LCD d'un FRE : palier restreint, DAP, essai préalable et certificat de conduite",
    ref: "Titre I, 9.5.b",
    impl: "prescriberFor() + devices.json (dap) + essaisNotes()",
    controle: "Test dédié + E2E",
  },
  {
    regle: "Renouvellement à l'identique par médecin généraliste ou ergothérapeute",
    ref: "Titre IV, 3.1.6",
    impl: "prescriberFor(mad = renouv_id)",
    controle: "Test dédié + E2E",
  },
  {
    regle: "LCD : 26 forfaits hebdomadaires consécutifs maximum par année glissante",
    ref: "Titre I, 9.6",
    impl: "Encarts du parcours + fiche PDF",
    controle: "E2E (présence des encarts)",
  },
  {
    regle: "Délai de carence d'un an après le dernier forfait de location (dérogation : indication différente)",
    ref: "Titre I, 9.6 ; Titre IV, 3.3.2 et 3.1",
    impl: "Encarts CARENCE_LCD / CARENCE_LLD + fiche PDF",
    controle: "E2E",
  },
  {
    regle: "Renouvellement à 5 ans (3 ans avant 16 ans) ; seuil réglementaire de 16 ans",
    ref: "Titre IV, 3.1.6 et 3.3.5 ; Titre I, 9.9",
    impl: "Étape âge du parcours + libellés",
    controle: "E2E",
  },
  {
    regle: "Renouvellement anticipé dérogatoire (VPH irréparable, évolution rapide)",
    ref: "Art. R. 165-24 CSS ; Titre IV, 3.1.6 et 3.3.5",
    impl: "Encart de l'étape mise à disposition",
    controle: "E2E",
  },
  {
    regle: "En LCD, adjonctions et PAP inclus au forfait hebdomadaire — aucune facturation séparée",
    ref: "Titre IV, §7 ; Titre I, 9.3",
    impl: "WalkerShell (billAdj) : codes/tarifs retirés, rubrique « à fournir » sur la fiche",
    controle: "E2E (parcours LCD complet)",
  },
  {
    regle: "Supplément appui-tête non cumulable avec le forfait PAP A",
    ref: "Titre IV, §7",
    impl: "Exclusion automatique dans l'étape adjonctions",
    controle: "E2E",
  },
  {
    regle: "Forfait PAP A = membre supérieur et dossier ; PAP B = membre inférieur, hanches et siège",
    ref: "Titre IV, §7",
    impl: "pap.json (régions → forfaits)",
    controle: "Vérificateur (codes/tarifs) + revue contre le texte",
  },
  {
    regle: "Compatibilité des adjonctions par catégorie de VPH",
    ref: "Titre IV, §7.1",
    impl: "adjonctions.json (compat) + filterAdjonctions()",
    controle: "Tests unitaires (invariant 3)",
  },
  {
    regle: "Adjonctions sur devis : DAP, mention manuscrite, essai réel, confirmation écrite du patient",
    ref: "Titre IV, §7",
    impl: "Notes dédiées (étape adjonctions + fiche PDF)",
    controle: "Revue + E2E",
  },
  {
    regle: "Non-cumuls : deux non-modulaires ; deux manuels modulaires (exception sport FRMS) ; deux électriques modulaires ; cycle + manuel modulaire ; scooter + électrique ; AAP + électrique ou scooter ; sièges coquille. Le cumul manuel modulaire + électrique modulaire est autorisé.",
    ref: "Tableau ministériel « Cumul 2025 » (handicap.gouv.fr) + Titre IV 4.2",
    impl: "cumul.json + isCumulAllowed()",
    controle: "Tests unitaires ligne à ligne",
  },
  {
    regle: "LCD exclusive de tout autre VPH loué ou vendu ; dérogation LCD d'un FRE (manuel possédé sans AAP, impossibilité transitoire)",
    ref: "Titre IV, 4.1",
    impl: "cumulVerdict() + verdict « dérogation » du module cumul",
    controle: "Tests dédiés + E2E",
  },
  {
    regle: "Essais achat/LLD : 4 modèles sur catalogue, comparatif d'au moins 2, essai réel 7 j (48 h min) — aucune facturation avant la fin",
    ref: "Titre IV, 3.1.4.2.3",
    impl: "essaisNotes() (résultat + fiche PDF)",
    controle: "E2E",
  },
  {
    regle: "Essai préalable en équipe pluridisciplinaire + certificat (FRE, scooters, AAP)",
    ref: "Titre IV, 3.1.4.2.3 ; Titre I, 9.5.b ; §7.1.1.1",
    impl: "essaisNotes() + question aptitude à la conduite",
    controle: "E2E",
  },
  {
    regle: "Pièces conditionnant le remboursement : évaluation, préconisation, certificat d'essais, devis, prescription définitive",
    ref: "Titre IV, 3.3.6",
    impl: "Checklist de la fiche PDF (achat modulaire / LLD)",
    controle: "E2E",
  },
  {
    regle: "Classes d'usage A/B/C (FRE, FREP) et A+/B/C (scooters) ; classes B et C soumises au code de la route",
    ref: "Titre IV, §2",
    impl: "classes.json + classeRoute()",
    controle: "Tests unitaires (invariant 4)",
  },
  {
    regle: "Poussettes réservées aux enfants de moins de 16 ans",
    ref: "Titre IV, 3.1.3.8, 3.1.3.9 et 3.3.3.5",
    impl: "Filtre d'âge du parcours",
    controle: "E2E",
  },
  {
    regle: "Scooters (SCO) : achat uniquement, classes d'usage A+/B/C, aptitude à la conduite condition de l'indication (pas d'exception accompagnant), PAP non applicables, éclairage code de la route selon la classe, mention pathologie évolutive",
    ref: "Titre IV, 2.4.2.4, 3.1.3.5, 3.1.5 et 4.2",
    impl: "classes-sco.json + parcours besoins/adjonctions dédié",
    controle: "Tests dédiés (SCO) + E2E",
  },
  {
    regle: "Dispositions transitoires : anciens VPH délivrables jusqu'au 01/12/2026 ; anciens codes de location ≥ 52 sem facturables jusqu'au 30/11/2027",
    ref: "Arrêté du 06/02/2025, art. 2 et 3",
    impl: "Encart « période transitoire » de l'accueil",
    controle: "Revue",
  },
];

const th = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-petrol-deep";
const td = "px-3 py-2.5 align-top text-[13px] leading-relaxed";

function Carte({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-hidden pc-panel">
      <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

export default function ConformitePage() {
  return (
    <main className="relative z-10 mx-auto max-w-[880px] px-5 pb-16 pt-10">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">
          PRECONIA · Dossier d&apos;audit public
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Conformité &amp; traçabilité</h1>
        <p className="mt-3 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          Cette page documente, à destination des auditeurs, développeurs et institutions,{" "}
          <b>comment PRECONIA prouve</b> (1) la fidélité de sa base de données aux données
          officielles de l&apos;Assurance maladie et du CERAH, et (2) la conformité de son
          algorithme et de son évaluateur de cumul à l&apos;arrêté du 6 février 2025. Le principe
          directeur : <b>ne jamais demander de nous croire sur parole</b> — chaque affirmation est
          soit vérifiable automatiquement par un script reproductible, soit tracée vers la section
          exacte du texte réglementaire et le test qui la verrouille. L&apos;intégralité du code,
          des données et de leur historique est publique :{" "}
          <a className="font-semibold text-petrol underline-offset-2 hover:underline" href={DEPOT}>
            {DEPOT.replace("https://", "")}
          </a>
          .
        </p>
      </header>

      <Carte>
        <h2 className="text-lg font-semibold tracking-tight">
          1. Vérification reproductible de la base de données
        </h2>
        <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          La base tarifaire officielle <b>LPPTOT</b> est publiée par la CNAMTS et téléchargeable
          par quiconque sur le site du codage de l&apos;Assurance maladie. Le script{" "}
          <code className="rounded bg-petrol-tint px-1.5 py-0.5 font-mono text-[12px] text-petrol-deep">
            scripts/verifier-lpptot.mjs
          </code>{" "}
          du dépôt la télécharge, la parse et confronte <b>chaque code LPP, tarif et libellé</b>{" "}
          des fichiers <code className="font-mono text-[12px]">data/*.json</code> de PRECONIA à
          l&apos;enregistrement officiel correspondant. Il s&apos;exécute sans aucune dépendance,
          en une commande :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 font-mono text-[12.5px] leading-relaxed text-petrol-tint">
          {`git clone ${DEPOT}.git && cd preconia\nnode scripts/verifier-lpptot.mjs`}
        </pre>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Résultat de la dernière campagne ({VERIF.date}, base {VERIF.base}) :
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: "Contrôles de codes LPP", v: String(VERIF.codes) },
            { k: "Tarifs confrontés", v: String(VERIF.tarifs) },
            { k: "Libellés confrontés", v: String(VERIF.libelles) },
            { k: "Écarts", v: String(VERIF.ecarts) },
          ].map((c) => (
            <div key={c.k} className="rounded-xl border border-line bg-paper/40 px-3 py-2.5 text-center">
              <div className="font-mono text-xl font-semibold text-petrol-deep">{c.v}</div>
              <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                {c.k}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-justify text-xs leading-relaxed text-ink-soft/80 hyphens-auto" lang="fr">
          Les {VERIF.codes} contrôles portent sur <b>{VERIF.distincts} codes LPP distincts</b> : un
          même code officiel est re-vérifié dans chacun des fichiers qui le référence (code mère,
          catalogue de recherche, fiche de modèle de marque…), ce qui garantit sa cohérence d'un
          fichier à l'autre en plus de sa conformité à la base.
        </p>
        <p className="mt-3 text-justify text-xs leading-relaxed text-ink-soft/80 hyphens-auto" lang="fr">
          Empreinte SHA-256 de la base officielle vérifiée :{" "}
          <span className="break-all font-mono">{VERIF.sha256}</span>. Quiconque télécharge la même
          version de la LPPTOT peut recalculer cette empreinte et ré-exécuter la vérification —
          c&apos;est l&apos;équivalent informatique d&apos;une contre-expertise. Le script sort en
          erreur au moindre écart (code absent, radié ou tarif divergent) ; les libellés que nous
          reformulons pour la lisibilité (abréviations développées) sont signalés à part, en
          avertissements.
        </p>
        <p className="mt-2 text-justify text-xs leading-relaxed text-ink-soft/80 hyphens-auto" lang="fr">
          Le contrôle est <b>bidirectionnel</b> : outre la vérification de chaque code porté par
          PRECONIA, le script énumère l&apos;intégralité des codes « VPH » de la base officielle
          ({VERIF.couvertureTotal} recensés) et signale toute ligne en vigueur absente du
          catalogue — c&apos;est la détection des nouveautés (nouvelle inscription, lignes RBEU à
          venir…). À la dernière campagne : {VERIF.couvertureNouveautes} nouveauté non couverte ;{" "}
          {VERIF.couvertureHorsPerimetre} codes documentés hors périmètre (monte-escaliers
          transportables, anciens codes en nom de marque transitoires — liste justifiée dans le
          script).
        </p>
      </Carte>

      <Carte>
        <h2 className="text-lg font-semibold tracking-tight">2. Contrôle continu (intégration continue)</h2>
        <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          À chaque modification du code ou des données, et chaque semaine à date fixe, GitHub
          Actions — un tiers neutre — exécute publiquement : la vérification de typage, les{" "}
          <b>tests unitaires des règles</b>, la construction complète du site (qui échoue si une
          donnée viole un schéma ou une contrainte de cohérence), et le{" "}
          <b>vérificateur LPPTOT</b> ci-dessus contre la base courante de la CNAMTS. Personne ne
          peut donc publier une version dont les données divergent de la base officielle sans que
          le contrôle passe au rouge — y compris si c&apos;est la CNAMTS qui publie une nouvelle
          version modifiant un tarif : l&apos;exécution hebdomadaire le détecte. L&apos;historique
          de toutes les exécutions est consultable sur{" "}
          <a
            className="font-semibold text-petrol underline-offset-2 hover:underline"
            href={`${DEPOT}/actions`}
          >
            {DEPOT.replace("https://", "")}/actions
          </a>
          .
        </p>
      </Carte>

      <Carte>
        <h2 className="text-lg font-semibold tracking-tight">3. Traçabilité des données</h2>
        <p className="mt-2 mb-3 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          Toute la connaissance métier de PRECONIA vit dans des fichiers de données séparés du
          code (<code className="font-mono text-[12px]">data/*.json</code>), chacun portant sa
          source et sa date de mise à jour. Aucun coefficient, code ou tarif n&apos;est écrit
          « en dur » dans l&apos;interface.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line-soft">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-petrol-tint/60">
              <tr>
                <th className={th}>Fichier</th>
                <th className={th}>Contenu</th>
                <th className={th}>Source officielle</th>
                <th className={th}>Vérification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {DONNEES.map((d) => (
                <tr key={d.fichier}>
                  <td className={`${td} whitespace-nowrap font-mono text-[11.5px] text-petrol-deep`}>
                    {d.fichier}
                  </td>
                  <td className={td}>{d.contenu}</td>
                  <td className={td}>{d.source}</td>
                  <td className={`${td} text-ink-soft`}>{d.verification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft/80">
          Prestations et forfaits à jour du {prestationsMeta.lastUpdated} ; règles de cumul à jour
          du {cumulMeta.lastUpdated}. Source générale : {meta.source}.
        </p>
      </Carte>

      <Carte>
        <h2 className="text-lg font-semibold tracking-tight">
          4. Traçabilité des règles de l&apos;algorithme et du cumul
        </h2>
        <p className="mt-2 mb-3 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          Toute la logique réglementaire est isolée dans des <b>fonctions pures</b> (
          <code className="font-mono text-[12px]">lib/rules.ts</code>), sans état ni dépendance à
          l&apos;interface, couvertes par des tests unitaires (
          <code className="font-mono text-[12px]">tests/rules.test.ts</code>) dont les assertions
          citent les sections de l&apos;arrêté. La table ci-dessous fait correspondre chaque règle
          implémentée à sa référence dans l&apos;arrêté du 6 février 2025, à son implémentation et
          à son contrôle. Un auditeur peut la parcourir ligne à ligne, texte en main.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line-soft">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-petrol-tint/60">
              <tr>
                <th className={th}>Règle implémentée</th>
                <th className={th}>Référence (arrêté du 06/02/2025)</th>
                <th className={th}>Implémentation</th>
                <th className={th}>Contrôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {REGLES.map((r) => (
                <tr key={r.regle}>
                  <td className={td}>{r.regle}</td>
                  <td className={`${td} whitespace-nowrap font-semibold text-petrol-deep`}>{r.ref}</td>
                  <td className={`${td} font-mono text-[11.5px]`}>{r.impl}</td>
                  <td className={`${td} text-ink-soft`}>{r.controle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-justify text-xs leading-relaxed text-ink-soft/80 hyphens-auto" lang="fr">
          « E2E » : scénarios de bout en bout rejoués dans un navigateur contre la version de
          production avant chaque mise en ligne (parcours complets LCD, LLD, achat, cumuls). Les
          contrôles de cohérence au build (lib/data.ts) refusent par construction toute donnée
          incohérente : catégorie sans forfait, code de forfait absent des prestations, niveau MAD
          orphelin, etc.
        </p>
      </Carte>

      <Carte>
        <h2 className="text-lg font-semibold tracking-tight">5. Limites et statut</h2>
        <p className="mt-2 text-justify text-sm leading-relaxed text-ink-soft hyphens-auto" lang="fr">
          Ces preuves établissent la <b>fidélité aux sources officielles à une date donnée</b> et
          la traçabilité des règles vers le texte — elles ne confèrent aucune valeur réglementaire
          à l&apos;outil. PRECONIA est une aide à la décision <b>non opposable</b> : seuls font
          foi l&apos;arrêté du 6 février 2025, la base LPP de la CNAMTS et la liste CERAH des VPH
          inscrits, accessibles depuis l&apos;encart « Liens officiels » de l&apos;accueil.{" "}
          {meta.disclaimer}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Contact : Dr Thomas BREDEL — Médecine Physique et de Réadaptation, Rouen.{" "}
          <a className="font-semibold text-petrol underline-offset-2 hover:underline" href="/preconia">
            ← Retour à PRECONIA
          </a>
        </p>
      </Carte>
    </main>
  );
}
