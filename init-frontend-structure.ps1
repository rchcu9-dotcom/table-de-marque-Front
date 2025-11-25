# Création des dossiers
$dirs = @(
  "src\api",
  "src\components\ds",
  "src\components\collections",
  "src\components\layout",
  "src\hooks",
  "src\pages",
  "src\router",
  "src\styles"
)

foreach ($d in $dirs) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
}

# Création des fichiers vides si absents
$files = @(
  "src\api\match.ts",
  "src\components\ds\Button.tsx",
  "src\components\ds\Card.tsx",
  "src\components\ds\Input.tsx",
  "src\components\ds\Badge.tsx",
  "src\components\ds\Spinner.tsx",
  "src\components\collections\List.tsx",
  "src\components\collections\Grid.tsx",
  "src\components\collections\DataTable.tsx",
  "src\components\collections\ResponsiveCard.tsx",
  "src\components\layout\LayoutRoot.tsx",
  "src\components\layout\Page.tsx",
  "src\components\layout\TopBar.tsx",
  "src\hooks\useMatches.ts",
  "src\pages\MatchListPage.tsx",
  "src\pages\MatchDetailPage.tsx",
  "src\pages\NotFoundPage.tsx",
  "src\router\index.tsx",
  "src\styles\global.css"
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { New-Item -ItemType File -Path $f | Out-Null }
}
