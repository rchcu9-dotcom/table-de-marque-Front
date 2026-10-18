import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { normaliserRecherche, useListControls } from "../useListControls";
import {
  RECHERCHE_CANDIDATURES,
  TRIS_CANDIDATURES,
  URL_LISTE_CANDIDATURES,
  statutCandidature,
  type TriCandidatures,
} from "../../pages/inscription/candidaturesListe";
import type {
  CandidatureOrganisateur,
  StatutInscription,
} from "../../api/types/inscription.types";

function candidature(
  id: number,
  equipeNom: string,
  statut: StatutInscription,
  extra: Partial<CandidatureOrganisateur> = {},
): CandidatureOrganisateur {
  return {
    id,
    equipeNom,
    statut,
    equipeLogoUrl: null,
    utilisateurEmail: `ref${id}@club.fr`,
    utilisateurDisplayName: null,
    createdAt: `2026-03-0${id}T10:00:00.000Z`,
    commentaireOrganisateur: null,
    ...extra,
  } as CandidatureOrganisateur;
}

const CANDIDATURES: CandidatureOrganisateur[] = [
  candidature(1, "Rouen", "REFUSEE"),
  candidature(2, "Cormeilles-en-Parisis", "DOSSIER_COMPLET", {
    utilisateurDisplayName: "Hélène Côté",
  }),
  candidature(3, "Amiens", "CANDIDATE"),
  candidature(4, "Évry", "VALIDEE"),
  candidature(5, "Caen", "PAIEMENT_ATTENDU"),
  candidature(6, "Angers", "LISTE_ATTENTE"),
  candidature(7, "Brest", "DOSSIER_EN_COURS"),
  candidature(8, "Anglet", "VALIDEE", { utilisateurEmail: "contact@anglet-hockey.fr" }),
];

const sonde = { url: "" };
function SondeUrl() {
  const location = useLocation();
  useEffect(() => {
    sonde.url = location.pathname + location.search;
  });
  return null;
}

function wrapper(initialUrl = "/inscription") {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>
      <SondeUrl />
      {children}
    </MemoryRouter>
  );
}

function rendreListe(
  items: CandidatureOrganisateur[] = CANDIDATURES,
  initialUrl?: string,
) {
  return renderHook(
    () =>
      useListControls<CandidatureOrganisateur, TriCandidatures>({
        items,
        searchKeys: RECHERCHE_CANDIDATURES,
        sorters: TRIS_CANDIDATURES,
        defaultSort: "statut",
        filterValue: statutCandidature,
        url: URL_LISTE_CANDIDATURES,
      }),
    { wrapper: wrapper(initialUrl) },
  );
}

const noms = (r: CandidatureOrganisateur[]) => r.map((c) => c.equipeNom);

describe("normaliserRecherche", () => {
  it("ignore la casse et les accents", () => {
    expect(normaliserRecherche("  ÉVRY Côté ")).toBe("evry cote");
  });
});

describe("useListControls — recherche", () => {
  it("« cormeil » trouve « Cormeilles-en-Parisis »", () => {
    const { result } = rendreListe();

    act(() => result.current.setQuery("cormeil"));

    expect(noms(result.current.results)).toEqual(["Cormeilles-en-Parisis"]);
  });

  it("ignore les accents dans les deux sens (« evry » trouve « Évry », « hélène » trouve le référent)", () => {
    const { result } = rendreListe();

    act(() => result.current.setQuery("evry"));
    expect(noms(result.current.results)).toEqual(["Évry"]);

    act(() => result.current.setQuery("HELENE"));
    expect(noms(result.current.results)).toEqual(["Cormeilles-en-Parisis"]);
  });

  it("cherche aussi dans l'e-mail du référent", () => {
    const { result } = rendreListe();

    act(() => result.current.setQuery("anglet-hockey"));

    expect(noms(result.current.results)).toEqual(["Anglet"]);
  });
});

describe("useListControls — tri", () => {
  it("par défaut, trie par statut dans l'ordre du parcours (pas alphabétique)", () => {
    const { result } = rendreListe();

    expect(result.current.results.map((c) => c.statut)).toEqual([
      "CANDIDATE",
      "PAIEMENT_ATTENDU",
      "VALIDEE",
      "VALIDEE",
      "DOSSIER_EN_COURS",
      "DOSSIER_COMPLET",
      "LISTE_ATTENTE",
      "REFUSEE",
    ]);
  });

  it("départage les statuts égaux par nom (Anglet avant Évry, tous deux VALIDEE)", () => {
    const { result } = rendreListe();

    const validees = result.current.results.filter((c) => c.statut === "VALIDEE");
    expect(noms(validees)).toEqual(["Anglet", "Évry"]);
  });

  it("trie par nom A→Z et Z→A avec le collator français (É rangé avec E)", () => {
    const { result } = rendreListe();

    act(() => result.current.setSort("nom"));
    expect(noms(result.current.results)).toEqual([
      "Amiens",
      "Angers",
      "Anglet",
      "Brest",
      "Caen",
      "Cormeilles-en-Parisis",
      "Évry",
      "Rouen",
    ]);

    act(() => result.current.setSort("nom-desc"));
    expect(noms(result.current.results)[0]).toBe("Rouen");
    expect(noms(result.current.results)[1]).toBe("Évry");
  });

  it("trie par date de soumission, la plus récente d'abord", () => {
    const { result } = rendreListe();

    act(() => result.current.setSort("date"));

    expect(result.current.results.map((c) => c.id)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });
});

describe("useListControls — filtre par statut", () => {
  it("compte chaque statut sur la liste complète, même filtrée", () => {
    const { result } = rendreListe();

    act(() => result.current.toggleFilter("VALIDEE"));
    act(() => result.current.setQuery("zzz"));

    expect(result.current.results).toHaveLength(0);
    expect(result.current.counts.VALIDEE).toBe(2);
    expect(result.current.counts.REFUSEE).toBe(1);
    expect(result.current.total).toBe(8);
  });

  it("accepte plusieurs statuts, et « Tous » (clearFilter) les retire", () => {
    const { result } = rendreListe();

    act(() => result.current.toggleFilter("VALIDEE"));
    act(() => result.current.toggleFilter("REFUSEE"));
    expect(noms(result.current.results)).toEqual(["Anglet", "Évry", "Rouen"]);

    act(() => result.current.toggleFilter("VALIDEE"));
    expect(noms(result.current.results)).toEqual(["Rouen"]);

    act(() => result.current.clearFilter());
    expect(result.current.results).toHaveLength(8);
    expect(result.current.isFiltered).toBe(false);
  });
});

describe("useListControls — état dans l'URL", () => {
  it("lit q, statut et tri depuis l'URL (F5, lien partagé)", () => {
    const { result } = rendreListe(
      CANDIDATURES,
      "/inscription?q=an&statut=VALIDEE,LISTE_ATTENTE&tri=nom-desc",
    );

    expect(result.current.query).toBe("an");
    expect(result.current.selected).toEqual(["VALIDEE", "LISTE_ATTENTE"]);
    expect(result.current.sort).toBe("nom-desc");
    expect(noms(result.current.results)).toEqual(["Anglet", "Angers"]);
  });

  it("écrit q, statut et tri dans l'URL sans toucher aux autres paramètres", () => {
    const { result } = rendreListe(CANDIDATURES, "/inscription?dossier=4");

    act(() => result.current.setQuery("caen"));
    act(() => result.current.toggleFilter("PAIEMENT_ATTENDU"));
    act(() => result.current.setSort("date"));

    const params = new URLSearchParams(sonde.url.split("?")[1]);
    expect(params.get("q")).toBe("caen");
    expect(params.get("statut")).toBe("PAIEMENT_ATTENDU");
    expect(params.get("tri")).toBe("date");
    expect(params.get("dossier")).toBe("4");
  });

  it("réinitialiser retire la recherche et le filtre de l'URL, et garde le tri", () => {
    const { result } = rendreListe(CANDIDATURES, "/inscription?q=x&statut=VALIDEE&tri=nom");

    act(() => result.current.reset());

    expect(sonde.url).toBe("/inscription?tri=nom");
    expect(result.current.results).toHaveLength(8);
  });

  it("n'écrit pas le tri par défaut dans l'URL, et ignore un tri inconnu", () => {
    const { result } = rendreListe(CANDIDATURES, "/inscription?tri=nimporte");

    expect(result.current.sort).toBe("statut");
    act(() => result.current.setSort("statut"));
    expect(sonde.url).toBe("/inscription");
  });
});

describe("useListControls — liste vide", () => {
  it("renvoie une liste vide, sans compteur ni erreur, même avec recherche et filtre", () => {
    const { result } = rendreListe([], "/inscription?q=abc&statut=VALIDEE");

    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.counts).toEqual({});
    expect(result.current.isFiltered).toBe(true);
  });
});

describe("useListControls — état local (sans paramètres d'URL)", () => {
  it("garde la recherche et le tri en mémoire sans modifier l'URL", () => {
    const { result } = renderHook(
      () =>
        useListControls({
          items: [{ n: "b" }, { n: "a" }],
          searchKeys: ["n"] as const,
          sorters: { asc: (x: { n: string }, y: { n: string }) => x.n.localeCompare(y.n) },
          defaultSort: "asc",
        }),
      { wrapper: wrapper("/x") },
    );

    expect(result.current.results.map((i) => i.n)).toEqual(["a", "b"]);
    act(() => result.current.setQuery("B"));
    expect(result.current.results.map((i) => i.n)).toEqual(["b"]);
    expect(sonde.url).toBe("/x");
  });
});
