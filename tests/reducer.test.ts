import { describe, expect, it } from "vitest";
import { adjonctions } from "@/lib/data";
import { initialState, walkerReducer } from "@/lib/walker/reducer";

describe("walkerReducer — navigation", () => {
  it("GO empile l'historique et change d'étape", () => {
    const s = walkerReducer(initialState, { type: "GO", stage: "age" });
    expect(s.stage).toBe("age");
    expect(s.history).toEqual(["home"]);
  });

  it("BACK dépile l'historique", () => {
    let s = walkerReducer(initialState, { type: "GO", stage: "age" });
    s = walkerReducer(s, { type: "GO", stage: "duree" });
    s = walkerReducer(s, { type: "BACK" });
    expect(s.stage).toBe("age");
    expect(s.history).toEqual(["home"]);
  });

  it("BACK sans historique ne fait rien", () => {
    const s = walkerReducer(initialState, { type: "BACK" });
    expect(s).toBe(initialState);
  });
});

describe("walkerReducer — CHOOSE_DEVICE (gating besoins = électrique)", () => {
  it("FRE (électrique) route vers besoins", () => {
    const s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "FRE" });
    expect(s.answers.device).toBe("FRE");
    expect(s.stage).toBe("besoins");
  });

  it("FRM (manuel) route directement vers adj", () => {
    const s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "FRM" });
    expect(s.stage).toBe("adj");
  });

  it("FMP (manuel non modulaire) route vers adj", () => {
    const s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "FMP" });
    expect(s.stage).toBe("adj");
  });

  it("code inconnu : aucun changement", () => {
    const s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "XXX" });
    expect(s).toBe(initialState);
  });

  it("changer de dispositif réinitialise adj et pap", () => {
    let s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "FRM" });
    s = { ...s, adj: { "4938766": true }, pap: { x: true } };
    s = walkerReducer(s, { type: "CHOOSE_DEVICE", code: "FMP" });
    expect(s.adj).toEqual({});
    expect(s.pap).toEqual({});
  });
});

describe("walkerReducer — SET_ANSWER", () => {
  it("enregistre l'aptitude à la conduite", () => {
    const s = walkerReducer(initialState, { type: "SET_ANSWER", field: "aptitude", value: "non" });
    expect(s.answers.aptitude).toBe("non");
  });
  it("enregistre la classe électrique", () => {
    const s = walkerReducer(initialState, { type: "SET_ANSWER", field: "classe", value: "C" });
    expect(s.answers.classe).toBe("C");
  });
});

describe("walkerReducer — TOGGLE_ADJ / TOGGLE_PAP / RESET", () => {
  it("TOGGLE_ADJ applique l'exclusivité AAP via le device courant", () => {
    let s = walkerReducer(initialState, { type: "CHOOSE_DEVICE", code: "FRM" });
    const aapAcc = adjonctions.find((a) => a.code === "4925054")!;
    const aapUti = adjonctions.find((a) => a.code === "4929796")!;
    s = walkerReducer(s, { type: "TOGGLE_ADJ", item: aapAcc });
    s = walkerReducer(s, { type: "TOGGLE_ADJ", item: aapUti });
    expect(s.adj["4929796"]).toBe(true);
    expect(s.adj["4925054"]).toBeUndefined();
  });

  it("TOGGLE_PAP bascule un item", () => {
    const s = walkerReducer(initialState, { type: "TOGGLE_PAP", name: "Biseau pelvien" });
    expect(s.pap["Biseau pelvien"]).toBe(true);
  });

  it("RESET repart de l'état initial", () => {
    let s = walkerReducer(initialState, { type: "GO", stage: "age" });
    s = walkerReducer(s, { type: "RESET" });
    expect(s).toBe(initialState);
  });
});
