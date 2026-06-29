"use client";

/* Porte d'entrée par mot de passe (work-in-progress).
   Le site reste visible, FLOUTÉ, derrière l'encart (l'animation continue de tourner).
   ⚠️ Verrou côté client : dissuasif, non sécurisé (le mot de passe est dans le bundle). */

import { useState } from "react";
import { Logo } from "@/components/preconia/Logo";

const PASSWORD = "SHALIMAR";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toUpperCase() === PASSWORD) setUnlocked(true);
    else setError(true);
  };

  return (
    <>
      {/* le site (inert tant que verrouillé pour ne pas être interactif derrière le flou) */}
      <div inert={!unlocked}>{children}</div>

      {!unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/40 p-4 backdrop-blur-md">
          <form
            onSubmit={submit}
            className="pc-fade w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card shadow-xl"
          >
            <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
            <div className="px-7 py-8 text-center">
              <Logo className="mx-auto h-16 w-16 drop-shadow-sm" />
              <div className="mt-3 text-2xl font-bold tracking-tight">
                PRECON<span className="text-petrol">IA</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                PRECONIA est un outil d&apos;aide à la prescription de VPH, s&apos;inscrivant dans le
                cadre de la réforme 2025.
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                PRECONIA est en cours de développement.
              </p>

              <div className="mt-6 text-left">
                <label htmlFor="pc-pass" className="mb-1.5 block text-sm font-semibold">
                  Mot de passe
                </label>
                <input
                  id="pc-pass"
                  type="password"
                  autoFocus
                  autoComplete="off"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(false);
                  }}
                  placeholder="Saisissez le mot de passe"
                  aria-invalid={error}
                  className={`w-full rounded-lg border bg-card px-3 py-2.5 text-sm outline-none focus:border-petrol ${
                    error ? "border-red-400" : "border-line"
                  }`}
                />
                {error && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">Mot de passe incorrect.</p>
                )}
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-lg bg-petrol px-5 py-3 font-semibold text-white transition-colors hover:bg-petrol-deep"
              >
                Entrer
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
