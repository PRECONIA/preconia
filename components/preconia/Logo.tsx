/* Logo PRECONIA — roue de fauteuil stylisée dans une tuile pétrole, avec le rayon
   « préconisé » mis en avant en orange (la recommandation). Même dessin que le favicon
   (app/icon.svg). */

const SPOKES = [0, 90, 135, 180, 225, 270, 315];

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="PRECONIA"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pc-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0C6B66" />
          <stop offset="1" stopColor="#073F3C" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#pc-logo-grad)" />
      <g stroke="#EAF3F1" fill="none" strokeLinecap="round">
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
      {/* rayon préconisé (accent orange) */}
      <g transform="rotate(45 32 32)">
        <line x1="32" y1="32" x2="32" y2="13" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="32" cy="11.5" r="3.4" fill="#F59E0B" />
      </g>
      <circle cx="32" cy="32" r="3.4" fill="#EAF3F1" />
    </svg>
  );
}
