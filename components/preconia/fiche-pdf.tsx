/* Document PDF de la fiche récapitulative (export vectoriel, rendu fidèle à la charte).
   Structure calquée sur la fiche de préconisation officielle (nomenclature-fauteuil-roulant.fr),
   sans identité patient : profil du VPH en vignettes, caractéristiques techniques officielles
   (arrêté du 06/02/2025), tableau PAP, tableau adjonctions (code générique + code constructeur),
   synthèse de facturation. Importé dynamiquement (au clic) depuis WalkerShell :
   @react-pdf/renderer ne pèse donc pas sur le chargement de la page. Reçoit un objet
   `FicheData` purement sérialisable — aucune logique métier ici, seulement la mise en page. */

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

/* --- polices de la charte (TTF same-origin, cachées par le service worker → hors-ligne OK) --- */
Font.register({
  family: "Hanken Grotesk",
  fonts: [
    { src: "/fonts/HankenGrotesk_400Regular.ttf", fontWeight: 400 },
    { src: "/fonts/HankenGrotesk_600SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/HankenGrotesk_700Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: "/fonts/JetBrainsMono_400Regular.ttf", fontWeight: 400 },
    { src: "/fonts/JetBrainsMono_600SemiBold.ttf", fontWeight: 600 },
  ],
});
// pas de césure automatique (évite les coupures hasardeuses des libellés/codes)
Font.registerHyphenationCallback((w) => [w]);

/* --- couleurs (miroir de app/globals.css + oranges/bleus Tailwind utilisés dans l'UI) --- */
const C = {
  ink: "#16212b",
  inkSoft: "#4c5c68",
  line: "#d3dbdd",
  lineSoft: "#e3e9ea",
  petrol: "#0c6b66",
  petrolDeep: "#073f3c",
  petrolTint: "#e0efed",
  petrolWash: "#f2f8f7",
  zebra: "#f7fafa",
  amber: "#9c4a06",
  amberTint: "#f6eadc",
  orange400: "#fb923c",
  orange50: "#fff7ed",
  orange100: "#ffedd5",
  orange700: "#c2410c",
  orange800: "#9a3412",
  blue400: "#60a5fa",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue800: "#1e40af",
  /* location : LCD = cyan, LLD = violet (miroir des encarts de l'UI) */
  cyan100: "#cffafe",
  cyan800: "#155e75",
  violet100: "#ede9fe",
  violet800: "#5b21b6",
  white: "#ffffff",
};

/* --- types de données (sérialisables, construits dans WalkerShell) --- */
export interface FicheData {
  generatedAt: string;
  /** mode de prise en charge : colore la ligne du fauteuil (achat = orange, LCD = cyan, LLD = violet). */
  pec: "achat" | "lcd" | "lld";
  device: {
    code: string;
    name: string;
    family: string;
    modes: string;
    /** qui signe l'ordonnance (§3.1.4.2.4 / 3.1.4.1). */
    presc: string;
    /** qui réalise l'évaluation des besoins + fiche de préconisation (§3.1.4.2.1). */
    evaluation: string;
    fiche: boolean;
    dap: boolean;
  };
  profile: { k: string; v: string }[];
  flags: string[];
  vph: {
    code: string;
    tarif: number | null;
    /** périodicité du forfait de location (« / semaine », « / trimestre ») ; null = tarif unique. */
    tarifUnit: string | null;
    name: string;
    indications: { mode: string; text: string }[];
  } | null;
  /** marque du fauteuil choisie (colonne « code constructeur » des tableaux). */
  marque: string | null;
  /** caractéristiques techniques officielles du VPH retenu (arrêté du 06/02/2025) :
      lignes rubrique → texte du tableau des spécifications minimales. */
  technique: { k: string; v: string }[];
  forfaits: {
    /** code facturé (variante constructeur si elle existe, sinon générique). */
    code: string;
    codeGenerique: string;
    codeMarque: string | null;
    label: string;
    price: number;
    definition: string[];
    technique: string[];
  }[];
  adjonctions: {
    /** code facturé (variante constructeur si elle existe, sinon générique). */
    code: string;
    codeGenerique: string;
    codeMarque: string | null;
    name: string;
    price: string;
    open: boolean;
  }[];
  pap: { name: string; forfait: "A" | "B"; code: string; info: string }[];
  /** LCD : adjonctions et PAP documentés mais inclus au forfait hebdomadaire (§7) — noms seuls. */
  incluses: string[];
  /** Parcours d'essais requis avant prise en charge (arrêté du 06/02/2025). */
  essais: string[];
  /** Pièces conditionnant le remboursement (achat modulaire / LLD — Titre IV, 3.3.6). */
  documents: string[];
  /** option d'achat LCD de la catégorie si elle est cochée (location courte durée). */
  optionAchat: { code: string; label: string; price: number } | null;
  livraison: { code: string; label: string; price: number } | null;
  /** forfait MAD s'il est coché (MAD1/MAD2 à l'achat et en LLD ; MAD LCD en courte durée). */
  mad: { code: string; label: string; price: number } | null;
  /** `horsLocation` : en LCD/LLD le total n'inclut pas le forfait de location (périodique). */
  totals: { subtotal: number; hasOpen: boolean; total: number | null; horsLocation: boolean };
  disclaimer: string;
  source: string;
  lastUpdated: string;
}

function eur(n: number): string {
  // séparateur de milliers : espace normale — l'espace fine insécable (U+202F) produite par
  // toLocaleString n'a pas de glyphe dans JetBrains Mono (carré barré dans le PDF).
  return (
    n
      .toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/[\u202f\u00a0]/g, " ") + " €"
  );
}

const s = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 76,
    paddingHorizontal: 40,
    fontFamily: "Hanken Grotesk",
    fontSize: 9.5,
    color: C.ink,
    lineHeight: 1.45,
  },
  /* en-tête */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: C.petrol,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 11 },
  logo: { width: 44, height: 44, borderRadius: 10 },
  wordmark: { fontSize: 22, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1, color: C.ink },
  wordmarkAccent: { color: C.petrol },
  eyebrow: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: C.petrol,
    marginTop: 5,
  },
  headerRight: { textAlign: "right" },
  headerTitle: { fontSize: 10, fontWeight: 600, color: C.petrolDeep },
  headerMeta: { fontSize: 8, color: C.inkSoft, marginTop: 2 },
  /* sections */
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.petrol,
    borderBottomWidth: 1,
    borderBottomColor: C.lineSoft,
    paddingBottom: 3,
    marginBottom: 7,
  },
  /* bandeau dispositif */
  deviceBar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  deviceCode: {
    fontFamily: "JetBrains Mono",
    fontWeight: 600,
    fontSize: 13,
    lineHeight: 1,
    textAlign: "center",
    color: C.petrolTint,
    backgroundColor: C.petrolDeep,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  pill: {
    fontSize: 8,
    fontWeight: 600,
    lineHeight: 1,
    textAlign: "center",
    color: C.orange800,
    backgroundColor: C.orange100,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  deviceName: { fontSize: 13, fontWeight: 600, marginBottom: 8 },
  /* grille méta du dispositif */
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "50%", paddingVertical: 3, paddingRight: 10 },
  gridLabel: { fontSize: 7, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.inkSoft },
  gridValue: { fontSize: 9.5, marginTop: 1 },
  /* profil du VPH : vignettes */
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tile: {
    backgroundColor: C.petrolWash,
    borderWidth: 1,
    borderColor: C.lineSoft,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    minWidth: "23%",
    flexGrow: 1,
  },
  tileLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.petrol,
  },
  tileValue: { fontSize: 9.5, fontWeight: 600, marginTop: 1.5, color: C.ink, lineHeight: 1.3 },
  /* drapeaux (DAP, code de la route…) */
  flag: {
    backgroundColor: C.amberTint,
    borderWidth: 1,
    borderColor: "#e3c9a0",
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 6,
    fontSize: 9,
    color: "#5c3208",
  },
  /* indications officielles */
  indicBox: {
    backgroundColor: C.orange50,
    borderWidth: 1.2,
    borderColor: C.orange400,
    borderRadius: 7,
    padding: 9,
  },
  // flex-start : le badge ne s'étire pas verticalement quand le texte d'à côté tient sur
  // plusieurs lignes (sinon ACHAT/LLD apparaissaient disproportionnés).
  indicLine: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  indicMode: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    fontWeight: 600,
    lineHeight: 1,
    width: 46, // largeur fixe → badges de mode uniformes et alignés en colonne
    textAlign: "center",
    color: C.white,
    backgroundColor: C.orange700,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 6,
  },
  indicText: { flex: 1, fontSize: 9, lineHeight: 1.35, color: C.orange800 },
  /* tableaux (caractéristiques techniques, PAP, adjonctions) */
  table: { borderWidth: 1, borderColor: C.lineSoft, borderRadius: 4 },
  thRow: { flexDirection: "row", backgroundColor: C.petrolDeep },
  th: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.petrolTint,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.lineSoft },
  tRowAlt: { backgroundColor: C.zebra },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6, lineHeight: 1.35 },
  tdMono: { fontFamily: "JetBrains Mono", fontSize: 8 },
  /* colonne rubrique du tableau des caractéristiques techniques */
  specKey: {
    width: 92,
    fontSize: 8,
    fontWeight: 700,
    color: C.petrolDeep,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: C.lineSoft,
  },
  specVal: { flex: 1, fontSize: 8, paddingVertical: 5, paddingHorizontal: 6, lineHeight: 1.4, color: C.inkSoft },
  /* ligne forfait PAP (sous le tableau PAP) */
  forfaitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.petrolTint,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 5,
  },
  /* synthèse codes LPP */
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.lineSoft,
    paddingVertical: 4,
  },
  codeBadge: {
    fontFamily: "JetBrains Mono",
    fontSize: 8.5,
    fontWeight: 600,
    lineHeight: 1,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 3,
    marginRight: 7,
  },
  rowLabel: { flex: 1, fontSize: 9.5, paddingRight: 8 },
  rowValue: { fontFamily: "JetBrains Mono", fontSize: 9.5, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eef1f1",
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.petrolTint,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  indicative: { fontSize: 7.5, color: C.inkSoft, marginBottom: 5 },
  papInfo: { fontSize: 8.5, color: C.inkSoft },
  /* pied de page */
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
    fontSize: 7,
    color: C.inkSoft,
  },
});

function Section({
  title,
  children,
  wrap = false,
}: {
  title: string;
  children: React.ReactNode;
  /** true pour les sections longues (tableaux) : elles peuvent s'étendre sur la page suivante
      au lieu d'être renvoyées en bloc, ce qui évite une page à moitié vide. */
  wrap?: boolean;
}) {
  return (
    <View style={s.section} wrap={wrap}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Ligne de la synthèse « codes LPP & tarifs » (badge couleur paramétrable). */
function CodeRow({
  code,
  label,
  value,
  badgeBg,
  badgeColor,
  valueColor,
}: {
  code: string;
  label: string;
  value: string;
  badgeBg: string;
  badgeColor: string;
  valueColor: string;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.codeBadge, { backgroundColor: badgeBg, color: badgeColor }]}>{code}</Text>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function FicheDocument({ d }: { d: FicheData }) {
  const hasSynthese =
    d.vph || d.forfaits.length > 0 || d.adjonctions.length > 0 || d.optionAchat || d.livraison || d.mad;
  return (
    <Document
      title={`Récapitulatif ${d.device.code}`}
      author="PRECONIA"
      subject="Fiche récapitulative VPH"
    >
      <Page size="A4" style={s.page}>
        {/* en-tête */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/icon-512.png" style={s.logo} />
            <View>
              <Text style={s.wordmark}>
                PRECON<Text style={s.wordmarkAccent}>IA</Text>
              </Text>
              <Text style={s.eyebrow}>Aide à la préconisation VPH · Médecine physique &amp; réadaptation</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Fiche récapitulative</Text>
            <Text style={s.headerMeta}>Établie le {d.generatedAt}</Text>
          </View>
        </View>

        {/* dispositif retenu */}
        <View style={s.section}>
          <View style={s.deviceBar}>
            <Text style={s.deviceCode}>{d.device.code}</Text>
            <Text style={s.pill}>{d.device.family}</Text>
          </View>
          <Text style={s.deviceName}>{d.device.name}</Text>
          <View style={s.grid}>
            <View style={s.gridCell}>
              <Text style={s.gridLabel}>Mode de prise en charge</Text>
              <Text style={s.gridValue}>{d.device.modes}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.gridLabel}>Prescripteur (qui signe l&apos;ordonnance)</Text>
              <Text style={s.gridValue}>{d.device.presc}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.gridLabel}>Accord préalable</Text>
              <Text style={[s.gridValue, d.device.dap ? { color: C.amber, fontWeight: 600 } : {}]}>
                {d.device.dap ? "DAP requise" : "Non requise"}
              </Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.gridLabel}>Évaluation des besoins &amp; préconisation</Text>
              <Text style={s.gridValue}>{d.device.evaluation}</Text>
            </View>
          </View>
          {d.flags.map((f, i) => (
            <Text key={i} style={s.flag}>
              {f}
            </Text>
          ))}
        </View>

        {/* profil du VPH — vignettes */}
        <Section title="Profil du VPH">
          <View style={s.tiles}>
            {d.profile.map((p) => (
              <View key={p.k} style={s.tile}>
                <Text style={s.tileLabel}>{p.k}</Text>
                <Text style={s.tileValue}>{p.v}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* indications officielles du VPH */}
        {d.vph && d.vph.indications.length > 0 && (
          <Section title="Indication officielle de prise en charge — VPH">
            <View style={s.indicBox}>
              {d.vph.indications.map((ind) => (
                <View key={ind.mode} style={s.indicLine}>
                  <Text style={s.indicMode}>{ind.mode}</Text>
                  <Text style={s.indicText}>{ind.text}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* caractéristiques techniques officielles du VPH retenu */}
        {d.technique.length > 0 && (
          <Section
            title={`Caractéristiques techniques du VPH (${d.device.code}) — spécifications minimales, arrêté du 6 février 2025`}
            wrap
          >
            <View style={s.table}>
              {d.technique.map((r, i) => (
                <View key={r.k} style={[s.tRow, ...(i % 2 ? [s.tRowAlt] : []), ...(i === 0 ? [{ borderTopWidth: 0 }] : [])]} wrap={false}>
                  <Text style={s.specKey}>{r.k}</Text>
                  <Text style={s.specVal}>{r.v}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* produits d'assistance à la posture — tableau façon fiche officielle */}
        {(d.pap.length > 0 || d.forfaits.length > 0) && (
          <Section title="Produits d'assistance à la posture (PAP) sélectionnés" wrap>
            {d.pap.length > 0 && (
              <View style={s.table}>
                <View style={s.thRow}>
                  <Text style={[s.th, { flex: 1 }]}>Produit d&apos;assistance à la posture</Text>
                  <Text style={[s.th, { width: 44, textAlign: "center" }]}>Forfait</Text>
                  <Text style={[s.th, { width: 64, textAlign: "center" }]}>Code LPP</Text>
                </View>
                {d.pap.map((p, i) => (
                  <View key={p.name} style={[s.tRow, ...(i % 2 ? [s.tRowAlt] : [])]} wrap={false}>
                    <View style={{ flex: 1, paddingVertical: 5, paddingHorizontal: 6 }}>
                      <Text style={{ fontSize: 8.5, fontWeight: 600 }}>{p.name}</Text>
                      {p.info ? (
                        <Text style={{ fontSize: 7.5, color: C.inkSoft, marginTop: 1, lineHeight: 1.35 }}>
                          {p.info}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[s.td, s.tdMono, { width: 44, textAlign: "center" }]}>{p.forfait}</Text>
                    <Text style={[s.td, s.tdMono, { width: 64, textAlign: "center" }]}>{p.code}</Text>
                  </View>
                ))}
              </View>
            )}
            {d.forfaits.map((f) => (
              <View key={f.code} style={s.forfaitRow} wrap={false}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.petrolDeep }}>{f.label}</Text>
                  <Text style={{ fontFamily: "JetBrains Mono", fontSize: 7.5, color: C.petrolDeep, marginTop: 1.5 }}>
                    Code générique {f.codeGenerique}
                    {f.codeMarque ? `  ·  code constructeur${d.marque ? ` (${d.marque})` : ""} ${f.codeMarque}` : ""}
                  </Text>
                </View>
                <Text style={{ fontFamily: "JetBrains Mono", fontSize: 9.5, fontWeight: 600, color: C.petrolDeep }}>
                  {eur(f.price)}
                </Text>
              </View>
            ))}
            {d.forfaits.map((f) =>
              f.definition.length > 0 || f.technique.length > 0 ? (
                <View key={`info-${f.code}`} style={{ marginTop: 8 }} wrap={false}>
                  <Text style={{ fontSize: 9, fontWeight: 600, color: C.petrolDeep, marginBottom: 2 }}>
                    {f.label}
                  </Text>
                  {f.definition.map((line, i) => (
                    <Text key={`d${i}`} style={s.papInfo}>
                      • {line}
                    </Text>
                  ))}
                  {f.technique.map((line, i) => (
                    <Text key={`t${i}`} style={s.papInfo}>
                      • {line}
                    </Text>
                  ))}
                </View>
              ) : null,
            )}
          </Section>
        )}

        {/* adjonctions — code générique ET code constructeur */}
        {d.adjonctions.length > 0 && (
          <Section title="Adjonctions sélectionnées" wrap>
            <View style={s.table}>
              <View style={s.thRow}>
                <Text style={[s.th, { flex: 1 }]}>Adjonction</Text>
                <Text style={[s.th, { width: 66, textAlign: "center" }]}>Code générique</Text>
                <Text style={[s.th, { width: 78, textAlign: "center" }]}>
                  Code constructeur{d.marque ? ` — ${d.marque}` : ""}
                </Text>
                <Text style={[s.th, { width: 58, textAlign: "right" }]}>Tarif</Text>
              </View>
              {d.adjonctions.map((a, i) => (
                <View key={a.codeGenerique} style={[s.tRow, ...(i % 2 ? [s.tRowAlt] : [])]} wrap={false}>
                  <Text style={[s.td, { flex: 1, fontWeight: 600 }]}>{a.name}</Text>
                  <Text style={[s.td, s.tdMono, { width: 66, textAlign: "center" }]}>{a.codeGenerique}</Text>
                  <Text style={[s.td, s.tdMono, { width: 78, textAlign: "center", color: a.codeMarque ? C.ink : C.inkSoft }]}>
                    {a.codeMarque ?? "—"}
                  </Text>
                  <Text style={[s.td, s.tdMono, { width: 58, textAlign: "right", color: a.open ? C.amber : C.ink }]}>
                    {a.price}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 7, color: C.inkSoft, marginTop: 3 }}>
              Le code facturé est le code constructeur lorsqu&apos;il existe pour la marque retenue,
              sinon le code de la ligne générique.
            </Text>
            {d.adjonctions.some((a) => a.open) && (
              <Text style={{ fontSize: 7.5, color: C.amber, marginTop: 4 }}>
                Adjonction « sur devis » : demande d&apos;accord préalable au service médical,
                mention manuscrite obligatoire du prescripteur sur l&apos;ordonnance, essai en
                conditions réelles (7 jours, 48 h minimum) et confirmation écrite du patient
                (arrêté du 06/02/2025, §7).
              </Text>
            )}
          </Section>
        )}

        {/* synthèse de facturation */}
        {hasSynthese && (
          <Section title="Synthèse — codes LPP &amp; tarifs" wrap>
            <Text style={s.indicative}>Tarifs de responsabilité LPPR, affichés à titre indicatif.</Text>
            {d.vph && (
              <CodeRow
                code={d.vph.code}
                label={d.vph.name}
                value={
                  d.vph.tarif != null ? `${eur(d.vph.tarif)}${d.vph.tarifUnit ?? ""}` : "n.c."
                }
                badgeBg={d.pec === "lcd" ? C.cyan100 : d.pec === "lld" ? C.violet100 : C.orange100}
                badgeColor={d.pec === "lcd" ? C.cyan800 : d.pec === "lld" ? C.violet800 : C.orange800}
                valueColor={d.pec === "lcd" ? C.cyan800 : d.pec === "lld" ? C.violet800 : C.orange800}
              />
            )}
            {d.forfaits.map((f) => (
              <CodeRow
                key={f.code}
                code={f.code}
                label={f.label}
                value={eur(f.price)}
                badgeBg={C.petrolTint}
                badgeColor={C.petrolDeep}
                valueColor={C.petrolDeep}
              />
            ))}
            {d.adjonctions.map((a) => (
              <CodeRow
                key={a.code}
                code={a.code}
                label={a.name}
                value={a.price}
                badgeBg={C.petrolTint}
                badgeColor={C.petrolDeep}
                valueColor={a.open ? C.amber : C.petrolDeep}
              />
            ))}
            {d.optionAchat && (
              <CodeRow
                code={d.optionAchat.code}
                label={d.optionAchat.label}
                value={eur(d.optionAchat.price)}
                badgeBg={C.cyan100}
                badgeColor={C.cyan800}
                valueColor={C.cyan800}
              />
            )}
            {d.livraison && (
              <CodeRow
                code={d.livraison.code}
                label={d.livraison.label}
                value={eur(d.livraison.price)}
                badgeBg={C.blue100}
                badgeColor={C.blue800}
                valueColor={C.blue800}
              />
            )}
            {d.mad && (
              <CodeRow
                code={d.mad.code}
                label={d.mad.label}
                value={eur(d.mad.price)}
                badgeBg={C.blue100}
                badgeColor={C.blue800}
                valueColor={C.blue800}
              />
            )}
            {(d.adjonctions.length > 0 || d.forfaits.length > 0) && (
              <View style={s.subtotalRow}>
                <Text style={{ fontWeight: 600, color: C.petrolDeep }}>
                  Sous-total adjonctions &amp; PAP{d.totals.hasOpen ? " (hors devis / à préciser)" : ""}
                </Text>
                <Text style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: C.petrolDeep }}>
                  {eur(d.totals.subtotal)}
                </Text>
              </View>
            )}
            {d.totals.total != null && (
              <View style={s.totalRow}>
                <Text style={{ fontWeight: 700 }}>
                  Total indicatif
                  {d.totals.horsLocation ? " hors forfait de location" : ""}
                  {d.totals.hasOpen ? " (hors devis / à préciser)" : ""}
                </Text>
                <Text style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 700 }}>
                  {eur(d.totals.total)}
                </Text>
              </View>
            )}
          </Section>
        )}

        {/* LCD : sélections incluses au forfait hebdomadaire — à fournir par le prestataire */}
        {d.incluses.length > 0 && (
          <Section title="À fournir par le prestataire — inclus au forfait de location">
            <Text style={{ fontSize: 8, color: C.cyan800, marginBottom: 4 }}>
              En location courte durée, adjonctions et PAP sont couverts par le forfait
              hebdomadaire et ne peuvent pas être facturés séparément (arrêté du 06/02/2025, §7).
            </Text>
            {d.incluses.map((n, i) => (
              <Text key={i} style={{ fontSize: 9.5, marginBottom: 2 }}>
                • {n}
              </Text>
            ))}
          </Section>
        )}

        {/* parcours d'essais requis */}
        {d.essais.length > 0 && (
          <Section title="Essais requis avant prise en charge" wrap>
            {d.essais.map((n, i) => (
              <Text key={i} style={{ fontSize: 9, color: C.inkSoft, marginBottom: 3 }}>
                • {n}
              </Text>
            ))}
          </Section>
        )}

        {/* pièces conditionnant le remboursement (achat modulaire / LLD) */}
        {d.documents.length > 0 && (
          <Section title="Pièces à transmettre à la CPAM (remboursement)" wrap>
            {d.documents.map((n, i) => (
              <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>
                [ ] {n}
              </Text>
            ))}
          </Section>
        )}

        {/* pied de page */}
        <View style={s.footer} fixed>
          <Text>
            {d.disclaimer} Source : {d.source}. Dernière mise à jour : {d.lastUpdated}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Construit le PDF et renvoie une URL blob (à ouvrir pour prévisualisation, en navigateur).
 *  L'appelant ouvre l'onglet et révoque l'URL ensuite. */
export async function renderFichePdfUrl(data: FicheData): Promise<string> {
  const blob = await pdf(<FicheDocument d={data} />).toBlob();
  return URL.createObjectURL(blob);
}
