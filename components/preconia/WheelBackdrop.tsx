/* Fauteuil roulant (profil) en arrière-plan dans l'angle inférieur gauche.
   Le châssis est fixe ; seule la grande roue arrière tourne lentement.
   Contours blancs uniquement (formes évidées), peu opaque, discret, non interactif. */

const SPOKES = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

// centre de la roue arrière (pivot de rotation via transform-box: fill-box)
const RX = 74;
const RY = 120;

export function WheelBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-[-9vh] left-[-7vh] z-0 h-[97.75vh] w-[97.75vh] text-white opacity-20"
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* --- châssis fixe --- */}
        {/* dossier (allongé) */}
        <path d="M62 92 L47 20" strokeWidth="4" />
        {/* poignée de poussée */}
        <path d="M47 20 L33 25" strokeWidth="3" />
        {/* assise */}
        <path d="M60 92 L138 92" strokeWidth="4" />
        {/* accoudoir */}
        <path d="M80 70 L126 70" strokeWidth="3" />
        <path d="M126 70 L132 92" strokeWidth="3" />
        {/* strut roue arrière → assise */}
        <path d="M74 120 L62 92" strokeWidth="3" />
        {/* tube avant assise → roue avant */}
        <path d="M138 92 L150 150" strokeWidth="4" />
        {/* fourche roue avant */}
        <path d="M150 150 L150 162" strokeWidth="3" />
        {/* roue avant (pivot, fixe) */}
        <circle cx="150" cy="166" r="12" strokeWidth="3" />
        <circle cx="150" cy="166" r="3.5" strokeWidth="2" />

        {/* --- roue arrière (tourne) --- */}
        <g className="pc-wheel-spin">
          {/* pneu */}
          <circle cx={RX} cy={RY} r="62" strokeWidth="4" />
          {/* main courante */}
          <circle cx={RX} cy={RY} r="50" strokeWidth="2.5" />
          {/* moyeu */}
          <circle cx={RX} cy={RY} r="8" strokeWidth="3" />
          {/* rayons */}
          {SPOKES.map((deg) => (
            <line
              key={deg}
              x1={RX}
              y1={RY}
              x2={RX}
              y2={RY - 62}
              strokeWidth="2"
              transform={`rotate(${deg} ${RX} ${RY})`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
