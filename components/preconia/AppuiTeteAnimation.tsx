"use client";

/* Animation « appui-tête réglable » — mécanisme vu de profil qui démontre en boucle les
   réglages hauteur / profondeur / inclinaison. Portée du projet Claude Design
   (Appui-tete-reglable.dc.html) : SVG + pose animée impérative, sans habillage texte.
   Rendu uniquement au survol de l'adjonction (monté à ce moment → RAF actif seulement alors). */

import { useEffect, useRef } from "react";

export function AppuiTeteAnimation() {
  const height = useRef<SVGGElement>(null);
  const depth = useRef<SVGGElement>(null);
  const tilt = useRef<SVGGElement>(null);
  const leverA = useRef<SVGLineElement>(null);
  const leverB = useRef<SVGLineElement>(null);
  const annH = useRef<SVGGElement>(null);
  const annD = useRef<SVGGElement>(null);
  const annT = useRef<SVGGElement>(null);
  const contact = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const cl = (x: number) => Math.max(0, Math.min(1, x));
    const seg = (t: number, a: number, b: number) => cl((t - a) / (b - a));
    const es = (x: number) => x * x * (3 - 2 * x);
    const bump = (t: number, a: number, b: number) => Math.sin(Math.PI * seg(t, a, b));

    const setPose = (t: number) => {
      if (!height.current) return;
      const h = -13 * es(seg(t, 0.12, 0.44));
      const d = -15 * es(seg(t, 0.4, 0.68));
      const r = 7 * es(seg(t, 0.62, 0.92));
      const lb = 40 * bump(t, 0.05, 0.5);
      const la = 42 * bump(t, 0.46, 0.94);
      const oC = 0.22 * es(seg(t, 0.62, 0.92));
      height.current.setAttribute("transform", `translate(0 ${h.toFixed(2)})`);
      depth.current!.setAttribute("transform", `translate(${d.toFixed(2)} 0)`);
      tilt.current!.setAttribute("transform", `rotate(${r.toFixed(2)} 236 122)`);
      leverB.current!.setAttribute("transform", `rotate(${lb.toFixed(1)} 300 178)`);
      leverA.current!.setAttribute("transform", `rotate(${la.toFixed(1)} 276 116)`);
      annH.current!.style.opacity = bump(t, 0.1, 0.46).toFixed(2);
      annD.current!.style.opacity = bump(t, 0.38, 0.7).toFixed(2);
      annT.current!.style.opacity = bump(t, 0.6, 0.94).toFixed(2);
      contact.current!.style.opacity = oC.toFixed(2);
    };

    // accessibilité : pas d'animation si l'utilisateur réduit les mouvements → pose « réglée ».
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPose(1);
      return;
    }

    // boucle : 0 → 1 (démonstration, ~2,6 s), maintien, 1 → 0 (retour, ~1,1 s), maintien, etc.
    let raf = 0;
    let last: number | null = null;
    let t = 0;
    let target = 1;
    let holdUntil = 0;
    const frame = (now: number) => {
      if (last == null) last = now;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      if (now >= holdUntil) {
        const rate = target > t ? 1 / 2.6 : 1 / 1.1;
        t = target > t ? Math.min(target, t + dt * rate) : Math.max(target, t - dt * rate);
        if (t === target) {
          holdUntil = now + (target === 1 ? 900 : 600);
          target = target === 1 ? 0 : 1;
        }
      }
      setPose(t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const teal = "#0C6B66";
  return (
    <div className="rounded-2xl border border-line bg-card p-3 shadow-xl">
      <svg viewBox="0 0 440 340" className="block h-auto w-full" aria-hidden>
        {/* contact occiput / appui-tête */}
        <ellipse ref={contact} cx="203" cy="104" rx="10" ry="15" style={{ fill: teal, opacity: 0 }} />
        {/* assemblage mobile (réglage hauteur) */}
        <g ref={height}>
          <line x1="276" y1="116" x2="216" y2="121" style={{ fill: "none", stroke: teal, strokeWidth: 3.2, strokeLinecap: "round" }} />
          <path d="M276,116 Q303,140 300,178" style={{ fill: "none", stroke: teal, strokeWidth: 3.4, strokeLinecap: "round", strokeLinejoin: "round" }} />
          <line x1="300" y1="178" x2="300" y2="318" style={{ fill: "none", stroke: teal, strokeWidth: 3.6, strokeLinecap: "round" }} />
          <circle cx="276" cy="116" r="5.4" style={{ fill: teal }} />
          <circle cx="300" cy="178" r="5.4" style={{ fill: teal }} />
          <line ref={leverA} x1="276" y1="116" x2="261" y2="141" style={{ fill: "none", stroke: "#23433F", strokeWidth: 6, strokeLinecap: "round" }} />
          <line ref={leverB} x1="300" y1="178" x2="317" y2="200" style={{ fill: "none", stroke: "#23433F", strokeWidth: 6, strokeLinecap: "round" }} />
          {/* réglage profondeur */}
          <g ref={depth}>
            <circle cx="236" cy="122" r="6" style={{ fill: teal }} />
            {/* réglage inclinaison + panneau d'appui-tête */}
            <g ref={tilt}>
              <rect x="210" y="74" width="28" height="96" rx="13" style={{ fill: "#CFE6E3", stroke: teal, strokeWidth: 2.6, strokeLinejoin: "round" }} />
              <line x1="224" y1="86" x2="224" y2="158" style={{ fill: "none", stroke: teal, strokeWidth: 1.4, strokeLinecap: "round", opacity: 0.35 }} />
            </g>
          </g>
        </g>
        {/* collier de fixation de la tige sur le dossier */}
        <rect x="288" y="240" width="30" height="24" rx="6" style={{ fill: "#EAF2F1", stroke: teal, strokeWidth: 2 }} />
        {/* annotations de réglage (flèches) */}
        <g ref={annH} style={{ opacity: 0 }}>
          <line x1="330" y1="152" x2="330" y2="246" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round" }} />
          <path d="M324,160 L330,152 L336,160" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
          <path d="M324,238 L330,246 L336,238" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
        </g>
        <g ref={annD} style={{ opacity: 0 }}>
          <line x1="208" y1="58" x2="278" y2="58" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round" }} />
          <path d="M216,52 L208,58 L216,64" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
          <path d="M270,52 L278,58 L270,64" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
        </g>
        <g ref={annT} style={{ opacity: 0 }}>
          <path d="M256,92 A34 34 0 0 0 210,88" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round" }} />
          <path d="M214,80 L209,88 L218,91" style={{ fill: "none", stroke: teal, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} />
        </g>
      </svg>
    </div>
  );
}
