import type { Metadata } from "next";
import { WalkerProvider } from "@/lib/walker/WalkerProvider";
import { WalkerShell } from "@/components/preconia/WalkerShell";
import { WheelchairBackground } from "@/components/preconia/WheelchairBackground";
import { SeoContent } from "@/components/preconia/SeoContent";

export const metadata: Metadata = {
  alternates: { canonical: "/preconia" },
};

export default function PreconiaPage() {
  return (
    <>
      <WalkerProvider>
        <WheelchairBackground />
        <WalkerShell />
      </WalkerProvider>
      {/* Contenu éditorial indexable (présentation + FAQ + JSON-LD) — rendu serveur. */}
      <SeoContent />
    </>
  );
}
