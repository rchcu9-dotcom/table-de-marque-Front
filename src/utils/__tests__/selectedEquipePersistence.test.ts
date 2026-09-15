import { describe, it, expect, beforeEach } from "vitest";
import {
  storageKey,
  lireEquipeIdPersistee,
  ecrireEquipeIdPersistee,
  effacerEquipeIdPersistee,
} from "../selectedEquipePersistence";

beforeEach(() => {
  localStorage.clear();
});

describe("storageKey", () => {
  it("namespace la clé par uid", () => {
    expect(storageKey("abc")).toBe("inscription-selected-equipe:abc");
    expect(storageKey("xyz")).toBe("inscription-selected-equipe:xyz");
  });

  it("ne collisionne jamais avec la clé « selected-team » utilisée par SelectedTeamProvider (CA6)", () => {
    expect(storageKey("selected-team")).not.toBe("selected-team");
    expect(storageKey("any-uid")).not.toBe("selected-team");
  });
});

describe("ecrireEquipeIdPersistee / lireEquipeIdPersistee", () => {
  it("persiste et relit un id pour un uid donné", () => {
    ecrireEquipeIdPersistee("uid-1", 42);
    expect(lireEquipeIdPersistee("uid-1")).toBe(42);
  });

  it("retourne null quand rien n'est persisté pour cet uid", () => {
    expect(lireEquipeIdPersistee("uid-inconnu")).toBeNull();
  });

  it("isole la persistance par uid, sans fuite d'un compte à l'autre (CA4)", () => {
    ecrireEquipeIdPersistee("uid-A", 1);
    ecrireEquipeIdPersistee("uid-B", 2);
    expect(lireEquipeIdPersistee("uid-A")).toBe(1);
    expect(lireEquipeIdPersistee("uid-B")).toBe(2);
  });

  it("le dernier choix écrit prime sur le précédent pour le même uid (CA2)", () => {
    ecrireEquipeIdPersistee("uid-1", 1);
    ecrireEquipeIdPersistee("uid-1", 2);
    expect(lireEquipeIdPersistee("uid-1")).toBe(2);
  });

  it("retourne null si la valeur stockée est corrompue/non numérique", () => {
    localStorage.setItem(storageKey("uid-1"), "not-a-number");
    expect(lireEquipeIdPersistee("uid-1")).toBeNull();
  });
});

describe("effacerEquipeIdPersistee", () => {
  it("efface la valeur persistée (CA3)", () => {
    ecrireEquipeIdPersistee("uid-1", 42);
    effacerEquipeIdPersistee("uid-1");
    expect(lireEquipeIdPersistee("uid-1")).toBeNull();
  });

  it("n'affecte pas la valeur persistée d'un autre uid", () => {
    ecrireEquipeIdPersistee("uid-1", 42);
    ecrireEquipeIdPersistee("uid-2", 7);
    effacerEquipeIdPersistee("uid-1");
    expect(lireEquipeIdPersistee("uid-2")).toBe(7);
  });

  it("ne lève pas d'erreur quand rien n'était persisté", () => {
    expect(() => effacerEquipeIdPersistee("uid-jamais-vu")).not.toThrow();
  });
});

describe("dégradation silencieuse quand localStorage est indisponible", () => {
  it("lireEquipeIdPersistee retourne null si localStorage.getItem lève une exception", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("quota exceeded");
    };
    try {
      expect(lireEquipeIdPersistee("uid-1")).toBeNull();
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it("ecrireEquipeIdPersistee n'explose pas si localStorage.setItem lève une exception", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota exceeded");
    };
    try {
      expect(() => ecrireEquipeIdPersistee("uid-1", 42)).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it("effacerEquipeIdPersistee n'explose pas si localStorage.removeItem lève une exception", () => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => {
      throw new Error("quota exceeded");
    };
    try {
      expect(() => effacerEquipeIdPersistee("uid-1")).not.toThrow();
    } finally {
      Storage.prototype.removeItem = original;
    }
  });
});
