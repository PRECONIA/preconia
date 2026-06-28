/** Montant en euros, format français : « 1 234,56 € ». */
export function eur(n: number): string {
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  );
}
