import { describe, it, expect, beforeEach } from "vitest";
import { rememberCurrentPath, consumeRedirectPath } from "../postLoginRedirect";

function setLocation(pathname: string, search = "") {
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname, search },
    writable: true,
  });
}

describe("postLoginRedirect", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setLocation("/", "");
  });

  it("consumeRedirectPath retourne le fallback quand rien n'a été mémorisé", () => {
    expect(consumeRedirectPath("/inscription")).toBe("/inscription");
  });

  it("rememberCurrentPath mémorise le chemin courant (pathname + search)", () => {
    setLocation("/challenge/equipe/42", "?onglet=classement");

    rememberCurrentPath();

    expect(consumeRedirectPath("/inscription")).toBe(
      "/challenge/equipe/42?onglet=classement",
    );
  });

  it("consumeRedirectPath supprime la clé après lecture (usage unique)", () => {
    setLocation("/profil", "");
    rememberCurrentPath();

    consumeRedirectPath("/inscription");
    const second = consumeRedirectPath("/inscription");

    expect(second).toBe("/inscription");
  });
});
