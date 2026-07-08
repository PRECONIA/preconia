import { adjonctions, deviceByCode } from "../data";
import { filterAdjonctions, needsBesoins, toggleAdjonction } from "../rules";
import type { Action, Answers, WalkerState } from "./types";

export const initialAnswers: Answers = {
  cumul: null,
  age: null,
  duree: null,
  lcdDuree: null,
  acquisition: null,
  mad: null,
  mob: null,
  device: null,
  classe: null,
  aptitude: null,
  vehicleBrand: null,
  vehicleModel: null,
};

export const initialState: WalkerState = {
  stage: "home",
  history: [],
  answers: initialAnswers,
  pap: {},
  adj: {},
};

/* Machine à états pure. Toute la navigation (avant/arrière) et les invariants de
   sélection passent par ce reducer → entièrement testable hors React. */
export function walkerReducer(state: WalkerState, action: Action): WalkerState {
  switch (action.type) {
    case "GO":
      return { ...state, history: [...state.history, state.stage], stage: action.stage };

    case "BACK": {
      if (state.history.length === 0) return state;
      const history = [...state.history];
      const prev = history.pop()!;
      return { ...state, history, stage: prev };
    }

    case "RESET":
      return initialState;

    case "SET_ANSWER": {
      const answers: Answers = { ...state.answers, [action.field]: action.value };
      // changer de marque invalide le modèle précédemment choisi.
      if (action.field === "vehicleBrand") answers.vehicleModel = null;
      // changer de temporalité invalide les choix de la branche quittée (durée LCD / acquisition).
      if (action.field === "duree") {
        answers.lcdDuree = null;
        answers.acquisition = null;
      }
      return { ...state, answers };
    }

    case "CHOOSE_DEVICE": {
      const device = deviceByCode[action.code];
      if (!device) return state;
      const answers: Answers = {
        ...state.answers,
        device: action.code,
        // changer de dispositif remet la classe à zéro (elle ne vaut que pour FRE/FREP/SCO,
        // et évite qu'une classe choisie pour un FRE ne reste collée à un FREV).
        classe: null,
        vehicleBrand: null,
        vehicleModel: null,
        ...(action.mob ? { mob: action.mob } : {}),
      };
      const next = needsBesoins(device) ? "besoins" : "adj";
      // changer de dispositif réinitialise adjonctions et PAP (compat différente).
      return {
        ...state,
        answers,
        adj: {},
        pap: {},
        history: [...state.history, state.stage],
        stage: next,
      };
    }

    case "TOGGLE_ADJ": {
      const code = state.answers.device;
      const device = code ? deviceByCode[code] : null;
      if (!device) return state;
      const compatAdj = filterAdjonctions(device, adjonctions);
      return { ...state, adj: toggleAdjonction(state.adj, action.item, compatAdj) };
    }

    case "TOGGLE_PAP":
      return { ...state, pap: { ...state.pap, [action.name]: !state.pap[action.name] } };

    default:
      return state;
  }
}
