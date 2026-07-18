/* Template racine : re-monté à chaque navigation (contrairement au layout), il
   rejoue le fondu entrant entre toutes les pages du site — VPH, guides SEO,
   aide au codage, contact. Opacité pure (pas de transform) pour ne perturber
   ni les barres sticky ni les panneaux fixed. */

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <div className="pg-page-fade">{children}</div>;
}
