"use client";

/* PRECONIA — Arrière-plan animé « fauteuil roulant » (projet Claude Design
   « Animation fauteuil roulant Preconia », export officiel, converti en TSX).
   Couche décorative fixe, en filigrane (teal ~6 % d'opacité) : un fauteuil
   roulant en trait fin dont les roues tournent au rythme du scroll (parallaxe),
   avec un sol pointillé qui défile et un écho de roue discret en haut à droite.
   - Aucune dépendance, aucun CSS externe (styles inline).
   - pointer-events: none + aria-hidden : n'interfère jamais avec la page.
   - prefers-reduced-motion: reduce → l'animation est figée (filigrane statique).
   - Scroll passif + requestAnimationFrame : pas de re-render React. */

import { useEffect, useRef } from "react";

export function WheelchairBackground({
  color = "#0C6B66",
  opacity = 0.06,
  speed = 1,
  echo = true,
  zIndex = 0,
}: {
  color?: string;
  opacity?: number;
  speed?: number;
  echo?: boolean;
  zIndex?: number;
}) {
  const driftRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<SVGGElement | null>(null);
  const casterRef = useRef<SVGGElement | null>(null);
  const groundRef = useRef<SVGPathElement | null>(null);
  const echoRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const deg = y * 0.12 * speed;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${deg}deg)`;
      if (casterRef.current) casterRef.current.style.transform = `rotate(${deg * 4.9}deg)`;
      if (echoRef.current) echoRef.current.style.transform = `rotate(${-deg * 0.3}deg)`;
      if (driftRef.current) driftRef.current.style.transform = `translateY(${-y * 0.04}px)`;
      if (groundRef.current) groundRef.current.style.strokeDashoffset = `${y * 0.226 * speed}px`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex,
        color,
      }}
    >
      <div ref={driftRef} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <svg
          viewBox="0 0 440 420"
          style={{
            position: "absolute",
            left: -70,
            bottom: -40,
            height: "82vh",
            minHeight: 540,
            opacity,
          }}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* grande roue arrière */}
          <circle cx="165" cy="265" r="108" strokeWidth="7" />
          <g ref={wheelRef} style={{ transformOrigin: "165px 265px", willChange: "transform" }}>
            <circle cx="165" cy="265" r="90" strokeWidth="4" />
            <circle cx="165" cy="265" r="12" strokeWidth="5" />
            <path
              strokeWidth="4"
              d="M183 265 L266 265 M178 278 L236 336 M165 283 L165 366 M152 278 L94 336 M147 265 L64 265 M152 252 L94 194 M165 247 L165 164 M178 252 L236 194"
            />
          </g>
          {/* châssis : poignée, dossier, assise, cadre avant */}
          <path strokeWidth="7" d="M128 64 L152 70 L168 182 L260 188" />
          <path strokeWidth="7" d="M260 188 L280 320" />
          {/* fourche + repose-pied */}
          <path strokeWidth="5" d="M280 320 L290 344" />
          <path strokeWidth="6" d="M280 320 L314 354 M306 360 L350 352" />
          {/* roulette avant */}
          <g ref={casterRef} style={{ transformOrigin: "292px 351px", willChange: "transform" }}>
            <circle cx="292" cy="351" r="22" strokeWidth="6" />
            <path strokeWidth="3" d="M292 335 L292 367 M276 351 L308 351" />
          </g>
          {/* sol pointillé (défile au scroll) */}
          <path
            ref={groundRef}
            strokeWidth="4"
            strokeDasharray="2 16"
            opacity="0.7"
            d="M20 381 L436 381"
          />
        </svg>
      </div>
      {/* écho discret en haut à droite */}
      {echo && (
        <svg
          viewBox="0 0 320 320"
          style={{
            position: "absolute",
            right: -100,
            top: -100,
            width: 360,
            opacity: opacity * 0.75,
          }}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        >
          <g ref={echoRef} style={{ transformOrigin: "160px 160px", willChange: "transform" }}>
            <circle cx="160" cy="160" r="132" strokeWidth="3" strokeDasharray="1 18" />
            <circle cx="160" cy="160" r="96" strokeWidth="2" strokeDasharray="1 14" />
          </g>
        </svg>
      )}
    </div>
  );
}
