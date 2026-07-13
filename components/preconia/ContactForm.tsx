"use client";

/* Formulaire de contact — site statique sans backend : à la soumission, on compose un
   e-mail (mailto:) pré-rempli vers l'adresse de contact et on l'ouvre dans le logiciel
   de messagerie du visiteur. Aucune donnée n'est transmise à un serveur tiers. */

import { useState } from "react";

const CONTACT_EMAIL = "preconia@outlook.fr";
const input =
  "w-full rounded-xl border border-orange-300/90 bg-white/75 px-3.5 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(7,63,60,0.05)] outline-none backdrop-blur transition-all focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(234,88,12,0.15)]";

export function ContactForm() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const ready = nom.trim() && email.trim() && sujet.trim() && message.trim();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const body = `Nom : ${nom}\nE-mail : ${email}\n\n${message}`;
    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="mt-1" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-nom" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
            Nom
          </label>
          <input id="c-nom" value={nom} onChange={(e) => setNom(e.target.value)} className={input} required />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
            Votre e-mail
          </label>
          <input
            id="c-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="c-sujet" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
          Sujet
        </label>
        <input id="c-sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} className={input} required />
      </div>

      <div className="mt-4">
        <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
          Message
        </label>
        <textarea
          id="c-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          className={`${input} resize-y`}
          required
        />
      </div>

      <button
        type="submit"
        disabled={!ready}
        className="pc-btn-accent mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Envoyer le message
      </button>

      {sent && (
        <p className="mt-3 rounded-lg border border-green-500 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Votre logiciel de messagerie s&apos;est ouvert avec le message pré-rempli — il ne reste
          qu&apos;à l&apos;envoyer. Si rien ne s&apos;est passé, écrivez-nous directement à{" "}
          <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        Ce formulaire ouvre votre logiciel de messagerie avec un e-mail pré-rempli à destination de{" "}
        <a className="font-semibold text-petrol underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        — aucune donnée n&apos;est transmise à un serveur. Merci de ne mentionner aucune donnée
        de santé identifiante.
      </p>
    </form>
  );
}
