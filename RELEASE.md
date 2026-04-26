# Releases & deploiement

Ce projet utilise les **tags git** comme unique levier pour publier l'extension et redeployer le serveur. Aucune action manuelle apres `git push --tags`.

## Workflow

Quand un tag `vX.Y.Z` est pousse, GitHub Actions execute `.github/workflows/release.yml` qui :

1. **Build l'extension cross-browser** via WXT : sync `version` dans `packages/extension/package.json` avec le tag (`v1.2.3` → `1.2.3`), puis `wxt zip` (Chrome MV3) et `wxt zip -b firefox` (Firefox MV3) — produit deux zips dans `packages/extension/.output/`.
2. **Cree la release GitHub** avec changelog auto (`generate_release_notes`) et les deux zips attaches (`faceit-coach-vX.Y.Z-chrome.zip`, `faceit-coach-vX.Y.Z-firefox.zip`).
3. **Deploie sur le serveur prod** via SSH : `git fetch --tags`, checkout du tag, `docker compose up -d --build` (rebuild bot + api).

Une seule source de verite : le tag.

## Publier une nouvelle version

```bash
git tag -a v1.0.1 -m "fix: ..."
git push --tags
```

GitHub Actions s'occupe du reste. Suivre le run avec `gh run watch`.

**Bumping semver :**
- `vX.Y.Z+1` → patch (fix, doc)
- `vX.Y+1.0` → minor (feature backwards-compatible)
- `vX+1.0.0` → major (breaking)

## Installer l'extension (cote friend)

Aller sur la page [Releases](https://github.com/<owner>/<repo>/releases) du projet, puis suivre la procedure correspondant au navigateur.

### Chrome / Edge / Brave / Opera / Vivaldi (Chromium)

1. Telecharger `faceit-coach-vX.Y.Z-chrome.zip` et extraire.
2. Ouvrir `chrome://extensions`, activer **Developer mode** (toggle haut-droit).
3. Cliquer **Load unpacked** et selectionner le dossier extrait.
4. Clic droit sur l'icone → **Options** → renseigner les champs (cf. ci-dessous).

L'extension a un **Extension ID stable** (`khpfppjaichdmbcoihjihfahooklnblc`) grace au champ `key` du manifest. Identique chez tous les friends — un seul origin a whitelister cote `API_CORS_ORIGINS`.

### Firefox

1. Telecharger `faceit-coach-vX.Y.Z-firefox.zip`.
2. Ouvrir `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on...** → selectionner le `.zip` (l'extension est valide jusqu'au prochain redemarrage de Firefox).
3. Pour une installation persistante, deux options :
   - **Firefox Developer Edition / Nightly / ESR** : passer `xpinstall.signatures.required = false` dans `about:config`, puis installer via `about:addons` → roue → **Install Add-on From File**.
   - **Firefox stable** : signer le `.xpi` via [AMO self-distribution](https://addons.mozilla.org/developers/) (gratuit, requis pour distribution permanente sur Firefox stable).
4. Clic droit sur l'icone → **Manage Extension** → **Options** → renseigner les champs (cf. ci-dessous).

L'**Add-on ID** Firefox est `faceit-coach@quentin.maignan` (champ `browser_specific_settings.gecko.id`), stable d'une release a l'autre.

### Champs Options (Chrome et Firefox)

- `API Base URL` : URL fournie par l'admin (ex: `https://api.faceit-coach.example`).
- `Cle API` : cle X-API-Key fournie par l'admin.
- `Default pseudo` (optionnel) : ton pseudo FACEIT pour l'auto-selection d'equipe.

**Update :** quand une nouvelle release sort, re-telecharger le zip et **Reload** dans la page extensions du navigateur.

## Configurer le serveur (cote admin)

### Premiere installation

Sur le serveur prod, cloner le repo et lancer :

```bash
git clone git@github.com:<owner>/<repo>.git /opt/faceit-coach
cd /opt/faceit-coach
cp .env.example .env
# editer .env : tokens Discord/FACEIT, API_KEY, NODE_ENV=production, API_CORS_ORIGINS
docker compose up -d --build
```

Variables critiques :

```dotenv
NODE_ENV=production
API_KEY=<cle_forte_openssl_rand_hex_32>
# Whitelister chrome (key stable) ET firefox (gecko id stable, prefixe moz-extension://<UUID-instance>)
# Firefox genere un UUID par instance install : alternative simple, autoriser tout moz-extension://*
API_CORS_ORIGINS=chrome-extension://khpfppjaichdmbcoihjihfahooklnblc,moz-extension://*
```

Cote Chrome, l'`Extension ID` est stable (`key` du manifest) — un seul origin a whitelister. Cote Firefox, chaque install genere un UUID local pour l'origin `moz-extension://...`, d'ou le wildcard `moz-extension://*` (l'`Add-on ID` `faceit-coach@quentin.maignan` n'apparait pas dans les requetes HTTP, seul l'UUID local le fait).

### Secrets GitHub a configurer pour le deploy auto

Dans **Settings → Secrets and variables → Actions** du repo :

| Secret | Valeur | Exemple |
|--------|--------|---------|
| `DEPLOY_HOST` | hostname du serveur | `prod.faceit-coach.example` |
| `DEPLOY_USER` | utilisateur SSH | `deploy` |
| `DEPLOY_SSH_KEY` | cle privee SSH au format OpenSSH | contenu de `~/.ssh/deploy_ed25519` |
| `DEPLOY_PATH` | chemin du clone sur le serveur | `/opt/faceit-coach` |
| `DEPLOY_PORT` | optionnel, port SSH si != 22 | `2222` |

Pour generer une paire dediee au deploy :

```bash
ssh-keygen -t ed25519 -f deploy_ed25519 -C "github-actions-deploy" -N ""
# Sur le serveur, ajouter la pub a authorized_keys
cat deploy_ed25519.pub | ssh user@server "cat >> ~/.ssh/authorized_keys"
# Sur GitHub, copier le contenu de deploy_ed25519 (privee) dans DEPLOY_SSH_KEY
```

### Verifier le deploy

```bash
# Sur le serveur apres release
docker compose ps              # bot + api en healthy
curl -fsSL https://api.<domain>/health
docker compose logs -f api | head -50
```

Si la sante n'est pas OK, GitHub Actions affichera l'echec du job `deploy-server`.

## Cle privee de l'extension

La cle publique est dans `packages/extension/wxt.config.ts` (constante `CHROME_PUBLIC_KEY`, ajoutee au manifest Chrome via le hook `build:manifestGenerated`). La **cle privee** correspondante n'est PAS dans le repo — elle est utile uniquement si on veut un jour signer un CRX ou publier sur le Web Store en gardant le meme Extension ID.

Stocker en lieu sur (1Password, gestionnaire de secrets) :

```bash
# La cle privee a ete generee une fois avec :
openssl genrsa -out faceit-coach-extension.key 2048
```

Ne jamais committer ce fichier. Le `.gitignore` exclut `*.pem` et `*-extension.key` par precaution.
