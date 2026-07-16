/* Template de la section Aide au codage : contrairement au layout, il est
   re-monté à chaque navigation entre le hub et les pages guides — l'animation
   de fondu entrant (.cc-page-fade) rejoue donc à chaque changement de page. */

export default function AideCodageTemplate({ children }: { children: React.ReactNode }) {
  return <div className="cc-page-fade">{children}</div>;
}
