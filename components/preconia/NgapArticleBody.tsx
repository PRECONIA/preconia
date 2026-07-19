/* Mise en page typographique d'un article NGAP : le texte officiel (extrait
   verbatim du PDF, avec ses retours à la ligne de composition) est regroupé en
   blocs pour la lecture — paragraphes reconstitués (une ligne coupée en pleine
   phrase rejoint la suivante ; une fin de phrase clôt le paragraphe), mentions
   de modification « (Modifié par …) » en retrait discret, intertitres numérotés
   (1., A., bis…) et intertitres en capitales mis en évidence, énumérations à
   tiret indentées. AUCUN caractère du texte n'est modifié ni réordonné : seule
   la présentation change — le texte officiel fait foi. */

type Bloc =
  | { type: "p" | "h-num" | "h-letter" | "h-caps" | "modif"; text: string }
  | { type: "item"; text: string };

const RE_MODIF = /^\((Modifié|Créé|Complété|Abrogé|Ajouté|Remplacé|Inséré)/i;
const RE_H_NUM = /^\d+(\s?(bis|ter|quater))?\s?[.°)]\s/;
const RE_H_LETTER = /^[A-Z][.)]\s/;
const RE_ITEM = /^[-–•]\s/;
const FIN_PHRASE = /[.;:!?»]\s*$/;

const estCapitales = (t: string) =>
  t.length > 3 && t === t.toUpperCase() && /[A-ZÀ-Ü]/.test(t) && !/[a-zà-ü]/.test(t);

/** Solde de parenthèses d'une ligne (pour refermer les mentions multi-lignes). */
const soldeParentheses = (t: string) =>
  (t.match(/\(/g) ?? []).length - (t.match(/\)/g) ?? []).length;

export function parseNgapText(text: string): Bloc[] {
  const lignes = text.split("\n").map((l) => l.trim());
  const blocs: Bloc[] = [];
  let courant: Bloc | null = null;
  let parenthesesOuvertes = 0;

  const clore = () => {
    if (courant) blocs.push(courant);
    courant = null;
  };

  for (const ligne of lignes) {
    if (!ligne) {
      clore();
      continue;
    }

    // mention de modification en cours : les lignes s'y ajoutent jusqu'à l'équilibre
    if (courant?.type === "modif" && parenthesesOuvertes > 0) {
      courant.text += " " + ligne;
      parenthesesOuvertes += soldeParentheses(ligne);
      if (parenthesesOuvertes <= 0) clore();
      continue;
    }

    if (RE_MODIF.test(ligne)) {
      clore();
      courant = { type: "modif", text: ligne };
      parenthesesOuvertes = soldeParentheses(ligne);
      if (parenthesesOuvertes <= 0) clore();
      continue;
    }

    if (estCapitales(ligne)) {
      // les intertitres en capitales peuvent se poursuivre sur la ligne suivante
      if (courant?.type === "h-caps") courant.text += " " + ligne;
      else {
        clore();
        courant = { type: "h-caps", text: ligne };
      }
      continue;
    }

    if (RE_H_NUM.test(ligne) && ligne.length < 130) {
      clore();
      blocs.push({ type: "h-num", text: ligne });
      continue;
    }
    if (RE_H_LETTER.test(ligne) && ligne.length < 130) {
      clore();
      blocs.push({ type: "h-letter", text: ligne });
      continue;
    }

    if (RE_ITEM.test(ligne)) {
      clore();
      courant = { type: "item", text: ligne.replace(RE_ITEM, "") };
      if (FIN_PHRASE.test(ligne)) clore();
      continue;
    }

    // ligne « normale » : rejoint le paragraphe (ou l'item) en cours — les retours
    // à la ligne du PDF coupent en pleine phrase ; une fin de phrase clôt le bloc.
    if (courant && (courant.type === "p" || courant.type === "item")) {
      courant.text += " " + ligne;
    } else {
      clore();
      courant = { type: "p", text: ligne };
    }
    if (FIN_PHRASE.test(ligne)) clore();
  }
  clore();
  return blocs;
}

export function NgapArticleBody({ text }: { text: string }) {
  const blocs = parseNgapText(text);
  return (
    <div lang="fr">
      {blocs.map((b, i) => {
        switch (b.type) {
          case "modif":
            return (
              <p
                key={i}
                className="my-2.5 border-l-2 border-[#38bdf8]/50 pl-3 text-[11.5px] italic leading-relaxed text-ink-soft/80"
              >
                {b.text}
              </p>
            );
          case "h-caps":
            return (
              <p key={i} className="mb-1.5 mt-5 text-[13px] font-bold tracking-wide text-[#0c2740]">
                {b.text}
              </p>
            );
          case "h-num":
          case "h-letter":
            return (
              <p key={i} className="mb-1 mt-4 text-[14px] font-semibold text-[#0c2740]">
                {b.text}
              </p>
            );
          case "item":
            return (
              <p key={i} className="my-1 flex gap-2 pl-4 text-[14px] leading-relaxed text-ink">
                <span aria-hidden className="shrink-0 font-semibold text-[#0ea5e9]">
                  –
                </span>
                <span className="text-justify hyphens-auto">{b.text}</span>
              </p>
            );
          default:
            return (
              <p key={i} className="my-2 text-justify text-[14px] leading-relaxed text-ink hyphens-auto">
                {b.text}
              </p>
            );
        }
      })}
    </div>
  );
}
