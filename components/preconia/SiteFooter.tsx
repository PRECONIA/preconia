/* Pied de page institutionnel — rendu serveur, en toute fin de page (après le contenu
   éditorial) : identité + avertissement, sources officielles, fiabilité, ligne légale. */

import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";
import { meta } from "@/lib/data";

export function SiteFooter() {
  return (
    <div className="relative z-10 mx-auto max-w-[790px] px-5 pb-14">
      {/* Pied de page institutionnel : identité + avertissement, sources officielles,
      fiabilité — puis ligne légale (source, dernière mise à jour). */}
  <footer className="pc-panel mt-8 overflow-hidden">
    <div className="h-[3px] bg-gradient-to-r from-petrol-deep via-petrol to-orange-500" />
    <div className="grid gap-7 px-6 py-7 sm:grid-cols-3">
      <div>
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="text-[17px] font-bold tracking-tight">
            PRECON<span className="text-petrol">IA</span>
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
          Aide à la préconisation des véhicules pour personnes handicapées — médecine
          physique &amp; réadaptation.
        </p>
        <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-ink-soft">
          {meta.disclaimer}
        </p>
      </div>
      <div>
        <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-petrol">
          ▸ Sources officielles
        </div>
        <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
          {[
            {
              href: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051141909",
              label: "Arrêté du 6 février 2025 (Légifrance)",
            },
            {
              href: "https://nomenclature-fauteuil-roulant.fr",
              label: "Site officiel FEDEPSAD / UNPDM",
            },
            {
              href: "https://nomenclature-fauteuil-roulant.fr/Fiche-evaluation-des-besoins-VPH.pdf",
              label: "Fiche d'évaluation des besoins",
            },
            {
              href: "https://nomenclature-fauteuil-roulant.fr/Fiche-de-preconisation-VPH.pdf",
              label: "Fiche de préconisation",
            },
            {
              href: "https://mobile.cerahtec.fr/doc/lppr_nn.pdf",
              label: "Liste CERAH des VPH inscrits",
            },
            {
              href: "http://www.codage.ext.cnamts.fr/codif/tips//chapitre/index_chap.php?p_ref_menu_code=1&p_site=AMELI",
              label: "Base LPP — CNAMTS",
            },
          ].map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft underline-offset-2 transition-colors hover:text-petrol-deep hover:underline"
              >
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-petrol">
          ▸ Fiabilité
        </div>
        <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
          <li>
            <Link
              href="/conformite"
              className="inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-2 hover:text-petrol-deep hover:underline"
            >
              <span className="pc-dot h-1.5 w-1.5 rounded-full bg-green-600" />
              Conformité &amp; traçabilité
            </Link>
          </li>
          <li className="text-ink-soft">
            Base vérifiée contre la base officielle LPPTOT (CNAMTS), contrôle continu
            hebdomadaire.
          </li>
          <li>
            <a
              href="https://github.com/PRECONIA/preconia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft underline-offset-2 transition-colors hover:text-petrol-deep hover:underline"
            >
              Code source public (GitHub) ↗
            </a>
          </li>
          <li>
            <Link
              href="/contact"
              className="text-ink-soft underline-offset-2 transition-colors hover:text-petrol-deep hover:underline"
            >
              Nous écrire — question, suggestion, remarque
            </Link>
          </li>
        </ul>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-6 py-3 text-[11px] text-ink-soft">
      <span>Source : {meta.source}.</span>
      <span className="font-mono">Dernière mise à jour : {meta.lastUpdated}</span>
    </div>
  </footer>
    </div>
  );
}
