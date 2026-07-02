import type { Metadata } from "next";
import { WalkerProvider } from "@/lib/walker/WalkerProvider";
import { WalkerShell } from "@/components/preconia/WalkerShell";
import { WheelBackdrop } from "@/components/preconia/WheelBackdrop";
import { SeoContent } from "@/components/preconia/SeoContent";

export const metadata: Metadata = {
  alternates: { canonical: "/preconia" },
};

export default function PreconiaPage() {
  return (
    <>
      <WalkerProvider>
        <WheelBackdrop />
        <WalkerShell />
      </WalkerProvider>
      {/* Contenu éditorial indexable (présentation + FAQ + JSON-LD) — rendu serveur. */}
      <SeoContent />
    </>
  );
}
