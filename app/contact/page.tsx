import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";
import { ContactForm } from "@/components/preconia/ContactForm";

export const metadata: Metadata = {
  title: "Contact — PRECONIA",
  description:
    "Contactez l'équipe de PRECONIA, l'aide à la prescription des fauteuils roulants (VPH) : question, suggestion, signalement d'une donnée à corriger.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="relative z-10 mx-auto max-w-[720px] px-5 pb-16 pt-10">
      <header className="mb-6 flex items-center gap-3.5">
        <Logo className="h-12 w-12 shrink-0 drop-shadow-sm" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">
            Aide à la préconisation VPH · Médecine physique &amp; réadaptation
          </div>
          <div className="text-[26px] font-bold leading-none tracking-tight">
            PRECON<span className="text-petrol">IA</span>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="bg-petrol px-6 py-4">
          <h1 className="text-lg font-semibold text-white">Nous contacter</h1>
          <p className="mt-1 text-sm leading-relaxed text-petrol-tint">
            Une question, une suggestion, une donnée à corriger dans la nomenclature ? Écrivez-nous.
          </p>
        </div>
        <div className="px-6 py-6">
          <ContactForm />
        </div>
      </div>

      <p className="mt-5 text-center text-sm">
        <Link href="/preconia" className="font-semibold text-petrol underline-offset-2 hover:underline">
          ← Retour à PRECONIA
        </Link>
      </p>
    </main>
  );
}
