/**
 * Aide de l'écran de gestion des équipes
 * (docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md §8).
 * Version longue : docs/guides/gestion-equipes-referentiel.md.
 */
export default function AideGestionEquipes() {
  return (
    <details className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300">
      <summary className="cursor-pointer font-semibold text-slate-100">
        Comment fonctionne cet écran ?
      </summary>
      <dl className="mt-3 flex flex-col gap-3">
        <div>
          <dt className="font-semibold text-slate-100">Nom court</dt>
          <dd>
            Le nom d'usage de l'équipe, en un ou deux mots (« Courbevoie »). Il identifie
            l'équipe, apparaît sur le planning et les scores, et sert à retrouver son logo.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-100">Nom complet</dt>
          <dd>
            Le nom officiel du club (« Les Coqs de Courbevoie »), facultatif. Il est affiché
            sous le nom court dans le parcours d'inscription et dans tes listes, et pris en
            compte par la recherche. Tu peux le modifier ou le vider à tout moment.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-100">Pourquoi un nom court est verrouillé</dt>
          <dd>
            Dès qu'une candidature fait référence à l'équipe — cette année ou une année
            précédente, même refusée — son nom court ne peut plus être modifié ici : il a
            été recopié dans la candidature et sert au planning. Le nom complet reste
            modifiable. Pour corriger malgré tout un nom court verrouillé, il faut passer
            par le script de corrections (voir le guide).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-100">Désactiver une équipe</dt>
          <dd>
            Une équipe désactivée n'est plus proposée aux responsables dans le parcours
            d'inscription. Elle reste visible ici et peut être réactivée. Les candidatures
            déjà déposées ne sont pas modifiées.
          </dd>
        </div>
      </dl>
    </details>
  );
}
