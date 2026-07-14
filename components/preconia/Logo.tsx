/* Logo PRECONIA — roue de fauteuil stylisée dans une tuile, avec le rayon
   « préconisé » mis en avant (la recommandation). Même dessin que le favicon
   (app/icon.svg). Deux variantes de couleur :
   - "petrol" (défaut) : tuile pétrole, accent orange — identité du site principal ;
   - "navy" : tuile bleu marine, accent bleu ciel — section « Aide au codage CCAM ». */

const SPOKES = [0, 90, 135, 180, 225, 270, 315];

const PALETTES = {
  petrol: { g0: "#0C6B66", g1: "#073F3C", wheel: "#EAF3F1", accent: "#F59E0B" },
  navy: { g0: "#1D4E7C", g1: "#0C2740", wheel: "#EAF2FB", accent: "#38BDF8" },
} as const;

export function Logo({
  className,
  variant = "petrol",
}: {
  className?: string;
  variant?: "petrol" | "navy";
}) {
  const c = PALETTES[variant];
  const gid = `pc-logo-grad-${variant}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="PRECONIA"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.g0} />
          <stop offset="1" stopColor={c.g1} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${gid})`} />
      <g stroke={c.wheel} fill="none" strokeLinecap="round">
        <circle cx="32" cy="32" r="20" strokeWidth="3.4" />
        <circle cx="32" cy="32" r="13.5" strokeWidth="1.6" opacity="0.45" />
        {SPOKES.map((d) => (
          <line
            key={d}
            x1="32"
            y1="32"
            x2="32"
            y2="14"
            strokeWidth="2.1"
            transform={`rotate(${d} 32 32)`}
          />
        ))}
      </g>
      {/* rayon préconisé (accent) */}
      <g transform="rotate(45 32 32)">
        <line x1="32" y1="32" x2="32" y2="13" stroke={c.accent} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="32" cy="11.5" r="3.4" fill={c.accent} />
      </g>
      <circle cx="32" cy="32" r="3.4" fill={c.wheel} />
    </svg>
  );
}
