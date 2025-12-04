# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## API calls used by the UI

- `GET /matches` : liste complète pour le Planning.
- `GET /matches/momentum` : sous-ensemble (3 matchs autour du live) affiché en priorité.
{
    "Prompt avec contexte IA (env local/prod)": {
    "prefix": "ia",
    "body": [
      "# CONTEXTE :",
      "# Tu es une IA qui doit répondre dans un cadre prédéfini.",
      "# Règles :",
      "# - Le code doit être STRICTEMENT identique entre env local et env prod.",
      "# - Toute nouvelle fonctionnalité doit prendre en compte l'intégralité du projet :",
      "#   * Impact backend (API, logique métier, persistance)",
      "#   * Impact frontend (UI, intégration, cohérence UX) GlideApp like avec utilsation/création de composants",
      "#   * Tests unitaires et end-to-end (e2e) obligatoires",
      "#   * Fourniture et documentation des variables d'environnement (local et prod)",
      "# - Les réponses doivent proposer un plan complet et cohérent, sans oublier les dépendances croisées.",
      "",
      "$0"
    ],
    "description": "Insère un cadre prédéfini pour Codex avec contraintes env local/prod et couverture projet complète"
  },
  "Contexte Basique": {
    "prefix": "iabase",
    "body": [
      "# CONTEXTE : Basique",
      "# Règles :",
      "# - Le code doit être STRICTEMENT identique entre env local et env prod.",
      "$0"
    ],
    "description": "Cadre simple pour prompts rapides"
  },
  "Contexte Checklist": {
    "prefix": "iacheck",
    "body": [
      "# CONTEXTE : Checklist technique",
      "# Règles :",
      "# - Le code doit être STRICTEMENT identique entre env local et env prod.",
      "# - Toute nouvelle fonctionnalité doit prendre en compte l'intégralité du projet.",
      "# - Les réponses doivent toujours inclure une CHECKLIST technique :",
      "- [ ] Backend",
      "- [ ] Frontend",
      "- [ ] Tests unitaires",
      "- [ ] Tests e2e",
      "- [ ] Variables d'environnement (local/prod)",
      "- [ ] Dépendances croisées",
      "$0"
    ],
    "description": "Cadre avec checklist technique"
  },
  "Contexte Roadmap": {
    "prefix": "iaroadmap",
    "body": [
      "# CONTEXTE : Checklist + Roadmap",
      "# Règles :",
      "# - Le code doit être STRICTEMENT identique entre env local et env prod.",
      "# - Toute nouvelle fonctionnalité doit prendre en compte l'intégralité du projet.",
      "# - Les réponses doivent toujours inclure une CHECKLIST et un PLAN DE LIVRAISON.",
      "",
      "Checklist technique attendue :",
      "- [ ] Backend",
      "- [ ] Frontend",
      "- [ ] Tests unitaires",
      "- [ ] Tests e2e",
      "- [ ] Variables d'environnement (local/prod)",
      "- [ ] Dépendances croisées",
      "",
      "Roadmap de livraison attendue :",
      "Étape 1 : Analyse d'impact global",
      "Étape 2 : Implémentation backend",
      "Étape 3 : Implémentation frontend",
      "Étape 4 : Configuration des variables d'environnement",
      "Étape 5 : Tests unitaires",
      "Étape 6 : Tests e2e",
      "Étape 7 : Documentation et validation finale",
      "$0"
    ],
    "description": "Cadre avec checklist + roadmap"
  },
  "Contexte Diagramme": {
    "prefix": "iaarchi",
    "body": [
      "# CONTEXTE : Checklist + Roadmap + Diagramme",
      "# Règles :",
      "# - Le code doit être STRICTEMENT identique entre env local et env prod.",
      "# - Toute nouvelle fonctionnalité doit prendre en compte l'intégralité du projet.",
      "# - Les réponses doivent inclure une CHECKLIST, une ROADMAP et un DIAGRAMME d’architecture.",
      "",
      "Checklist technique attendue :",
      "- [ ] Backend",
      "- [ ] Frontend",
      "- [ ] Tests unitaires",
      "- [ ] Tests e2e",
      "- [ ] Variables d'environnement (local/prod)",
      "- [ ] Dépendances croisées",
      "",
      "Roadmap de livraison attendue :",
      "Étape 1 : Analyse d'impact global",
      "Étape 2 : Implémentation backend",
      "Étape 3 : Implémentation frontend",
      "Étape 4 : Configuration des variables d'environnement",
      "Étape 5 : Tests unitaires",
      "Étape 6 : Tests e2e",
      "Étape 7 : Documentation et validation finale",
      "",
      "Diagramme d’architecture attendu (mermaid) :",
      "```mermaid",
      "flowchart TD",
      "    subgraph Backend",
      "        API --> Persistence",
      "    end",
      "    subgraph Frontend",
      "        UI --> Integration",
      "    end",
      "    subgraph Environments",
      "        Local --> Prod",
      "    end",
      "    API --> UI",
      "    Persistence --> Environments",
      "    TestsUnit --> API",
      "    TestsE2E --> UI",
      "```",
      "$0"
    ],
    "description": "Cadre avec checklist + roadmap + diagramme d’architecture"
  }
}
