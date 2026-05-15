# Changelog

Toutes les modifications notables du projet sont documentees ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versioning suit [SemVer](https://semver.org/lang/fr/).

Une entree par version publiee (tag git `vX.Y.Z`). La section `[Unreleased]` regroupe les changements mergés sur `main` mais pas encore tagues.

## [Unreleased]

## [2.1.0] - 2026-05-15

### Added
- **Extension** : panneau flottant draggable. Le header sert de poignee (souris + tactile), la position est persistee dans `browser.storage.local` (cle `panelPosition`, specifique a l'appareil).
- **Extension** : reflow automatique du panneau via `ResizeObserver` quand la hauteur change (collapse/expand, chargement du resultat d'analyse) et listener `resize` window — le panneau reste toujours entierement dans le viewport.

### Changed
- **Extension** : clamp strict de la position (entiere) au lieu de l'ancien check loose `MIN_VISIBLE_PX`. Une position sauvegardee hors viewport est repositionnee plutot que reset au defaut.

## [2.0.1] - 2026

### Added
- **Release** : zip `chrome-dev` supplementaire avec le champ `key` du manifest (extension ID stable pour les friends qui installent en unpacked).

## [2.0.0] - 2026

### Added
- **Extension** : mode FACEIT direct via `createHybridClient` — l'extension peut interroger l'API FACEIT Open Data directement (cle `faceitApiKey` cote client) si `apiBaseUrl` est vide. Permet d'utiliser l'extension sans backend self-hosted.
- **Extension** : host permission `open.faceit.com` pour le mode direct.
- **Core** : sous-export `./browser` — client FACEIT browser-safe (`fetch` + Bearer token) et cache TTL en `Map` (zero dependance Node).
- **Core** : `analyzer-pure.ts` extrait les fonctions pures de l'analyzer pour reutilisation cross-runtime (Node + browser).
- **Core** : `mappers.ts` partage les adaptateurs `FaceitMatch → MatchResponse` et `FaceitPlayer+Stats → PlayerResponse` entre `api` et `extension`.
- **Core** : cles i18n pour les options "mode direct" dans l'extension.

### Fixed
- **Extension** : `apiBaseUrl` defaut vide au lieu de `http://localhost:8787` — declenche le mode FACEIT direct par defaut.

## [1.0.0] - 2026

Premier release stable. Monorepo `bot` + `api` + `core` + `extension`, support cross-browser (Chrome + Firefox), i18n EN/FR, deploiement par tag git.

[Unreleased]: https://github.com/QuentinMaignan/faceit-coach/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/QuentinMaignan/faceit-coach/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/QuentinMaignan/faceit-coach/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/QuentinMaignan/faceit-coach/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/QuentinMaignan/faceit-coach/releases/tag/v1.0.0
