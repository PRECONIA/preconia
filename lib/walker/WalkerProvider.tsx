"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { initialState, walkerReducer } from "./reducer";
import type { Action, WalkerState } from "./types";

/* État du walker via useReducer + Context. Aucun localStorage : l'état vit uniquement
   en mémoire React (stateless → argument RGPD du CLAUDE.md). */

interface WalkerContextValue {
  state: WalkerState;
  dispatch: Dispatch<Action>;
}

const WalkerContext = createContext<WalkerContextValue | null>(null);

export function WalkerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(walkerReducer, initialState);
  return <WalkerContext.Provider value={{ state, dispatch }}>{children}</WalkerContext.Provider>;
}

export function useWalker(): WalkerContextValue {
  const ctx = useContext(WalkerContext);
  if (!ctx) throw new Error("useWalker doit être utilisé dans un <WalkerProvider>");
  return ctx;
}
