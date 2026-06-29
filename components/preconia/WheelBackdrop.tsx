/* Roue de fauteuil roulant tournant lentement dans l'angle inférieur gauche, en arrière-plan.
   Vert pétrole (couleur du bouton « Commencer ») peu opaque, discrète, non interactive. */

const SPOKES = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

export function WheelBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-[-7vh] left-[-7vh] z-0 h-[46vh] w-[46vh] text-petrol opacity-10"
    >
      <svg
        viewBox="0 0 200 200"
        className="pc-wheel-spin h-full w-full"
        fill="none"
        stroke="currentColor"
      >
        {/* pneu */}
        <circle cx="100" cy="100" r="94" strokeWidth="4" />
        {/* main courante */}
        <circle cx="100" cy="100" r="80" strokeWidth="2.5" />
        {/* moyeu */}
        <circle cx="100" cy="100" r="11" fill="currentColor" stroke="none" />
        {/* rayons */}
        {SPOKES.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="100"
            x2="100"
            y2="9"
            strokeWidth="2"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </svg>
    </div>
  );
}
