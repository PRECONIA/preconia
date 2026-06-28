import { WalkerProvider } from "@/lib/walker/WalkerProvider";
import { WalkerShell } from "@/components/preconia/WalkerShell";

export default function PreconiaPage() {
  return (
    <WalkerProvider>
      <WalkerShell />
    </WalkerProvider>
  );
}
