import { permanentRedirect } from "next/navigation";

/* Redirection PERMANENTE (308) vers la page canonique de l'outil : consolide le
   signal SEO sur /preconia (une 307 temporaire diluait le référencement). */
export default function Home() {
  permanentRedirect("/preconia");
}
