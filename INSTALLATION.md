# Installation

Ce guide couvre l'installation de FACEIT Coach en dev local et en production (Docker + extension Chrome).

## Prerequis

- **Node.js 22** (LTS). Verifier avec `node -v`.
- **pnpm 10.33.0** minimum. Installation : `corepack enable && corepack prepare pnpm@10.33.0 --activate`.
- **Docker + Docker Compose** (uniquement pour le deploiement prod).
- **Chrome / Chromium** (uniquement pour l'extension).

## 1. Recuperer les credentials

Avant d'installer, avoir en main :

### FACEIT Open Data API

1. Aller sur [developers.faceit.com](https://developers.faceit.com).
2. Se connecter avec son compte FACEIT et creer une application.
3. Generer une cle **server-side** — elle apparaitra une seule fois, la noter.

### Discord (uniquement si le bot est utilise)

1. Aller sur [discord.com/developers/applications](https://discord.com/developers/applications).
2. **New Application** → nommer l'app.
3. Onglet **Bot** → **Reset Token** → copier le `DISCORD_TOKEN`.
4. Onglet **General Information** → copier l'**Application ID** (= `DISCORD_CLIENT_ID`).
5. Onglet **OAuth2 → URL Generator** → scopes `bot` + `applications.commands`, permissions minimales (`Send Messages`, `Embed Links`, `Use Slash Commands`). Utiliser l'URL genere pour inviter le bot sur le serveur.

### API key interne (prod uniquement)

Generer une cle secrete pour proteger l'API :

```bash
openssl rand -hex 32
```

## 2. Cloner et installer

```bash
git clone <repo-url> faceit-coach
cd faceit-coach
pnpm install
```

L'install genere `node_modules` a la racine (hoisting pnpm) et dans les packages liees en workspace.

## 3. Configurer `.env`

```bash
cp .env.example .env
```

Editer `.env` :

```dotenv
# Bot Discord (optionnel si on n'utilise que l'API)
DISCORD_TOKEN=<token_bot>
DISCORD_CLIENT_ID=<application_id>

# FACEIT (requis par bot et api)
FACEIT_API_KEY=<cle_faceit>

# API
API_PORT=8787
API_KEY=<cle_generee_openssl>           # obligatoire en prod, facultatif en dev
API_CORS_ORIGINS=                       # voir section "Extension Chrome" ci-dessous
API_RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=info
```

Notes :

- En dev, `API_KEY` peut rester vide — l'API tournera ouverte avec un warning dans les logs.
- En prod, `API_KEY` **doit** etre rempli sinon l'API refuse de demarrer (quand `NODE_ENV=production`).
- `API_CORS_ORIGINS=*` est deconseille en prod. Utiliser la liste blanche exacte des origins clients.

## 4. Lancer en dev

### Bot Discord

```bash
pnpm dev:bot
```

Au demarrage, le bot enregistre les slash commands globalement, puis se log :

```
Registered 4 slash commands
Bot ready as <nom-bot>#XXXX
```

Les commandes `/analyze`, `/player`, `/live`, `/strats` sont alors disponibles sur les serveurs ou le bot est invite (propagation Discord : 1-5 min).

### API HTTP

```bash
pnpm dev:api
```

Par defaut sur `http://localhost:8787`. Test :

```bash
curl http://localhost:8787/health
# {"status":"ok"}
```

Si `API_KEY` est defini, ajouter `-H 'X-API-Key: <cle>'` sur les autres routes.

### Extension Chrome (build de dev)

```bash
pnpm dev:extension
```

Vite builde en mode watch dans `packages/extension/dist/`. Pour charger l'extension :

1. Ouvrir `chrome://extensions`.
2. Activer **Developer mode** (coin haut droit).
3. **Load unpacked** → selectionner `packages/extension/dist/`.
4. Noter l'**Extension ID** (hash de 32 caracteres sous le nom de l'extension) — necessaire pour `API_CORS_ORIGINS` en prod.
5. Ouvrir les options de l'extension (clic droit sur l'icone → Options) et renseigner :
   - `API Base URL` : `http://localhost:8787` (ou ton URL prod).
   - `Default pseudo` (optionnel) : ton pseudo FACEIT.
   - `Cle API` : remplir si l'API tourne avec `API_KEY`.

L'extension rechargera automatiquement quand Vite detecte un changement — mais Chrome peut garder le service worker en cache ; clic sur le bouton **reload** de la card d'extension si besoin.

## 5. Lancer les tests et le lint

```bash
pnpm test          # vitest sur tous les packages
pnpm typecheck     # vue-tsc + tsc
pnpm lint          # eslint
pnpm lint:fix      # auto-fix
pnpm build         # build tous les packages
```

Turbo cache les resultats : les commandes suivantes ignorent les packages non modifies.

## 6. Deployer en production (Docker)

Le repo contient un `docker-compose.yml` qui lance `bot` + `api` en containers Alpine non-root avec healthcheck et limites de ressources.

### Build et run

Depuis la racine du repo (sur le serveur) :

```bash
docker compose build
docker compose up -d
```

Verifier :

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f bot
```

L'API est exposee sur le port 8787 de l'hote. Le bot se connecte en sortie vers Discord (pas de port expose).

### Variables prod

Sur le serveur, `.env` doit contenir :

```dotenv
NODE_ENV=production        # active HSTS et l'enforcement API_KEY
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
FACEIT_API_KEY=...
API_PORT=8787
API_KEY=<cle_forte>        # OBLIGATOIRE
API_CORS_ORIGINS=chrome-extension://<extension_id_prod>
API_RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=info
```

### Reverse proxy HTTPS (recommande)

L'API ne gere pas TLS. Mettre un reverse proxy devant (Caddy, Traefik, Nginx) qui termine HTTPS et forward vers `localhost:8787`. Exemple minimal avec Caddy :

```caddyfile
api.ton-domaine.com {
  reverse_proxy localhost:8787
}
```

Ajouter le domaine au `API_CORS_ORIGINS` si l'extension sera packagee pour utiliser cette URL.

### Sante du service

```bash
docker compose ps       # doit afficher "healthy" sur api
curl https://api.ton-domaine.com/health   # {"status":"ok"}
```

Le healthcheck container tourne toutes les 30s via `node -e` sur `/health`.

## 7. Distribuer l'extension Chrome

Pour un deploiement via Chrome Web Store :

1. `pnpm build` puis zipper `packages/extension/dist/`.
2. Publier sur [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) (frais dev unique de 5 USD).
3. Une fois publiee, l'Extension ID devient stable — mettre a jour `API_CORS_ORIGINS` cote serveur.

En attendant la publication, l'extension peut etre distribuee en **unpacked** (comme en dev) aux utilisateurs internes.

## Depannage

**L'API refuse de demarrer avec "API_KEY is required in production"**
→ `NODE_ENV=production` mais `API_KEY` est vide. Soit remplir la cle, soit passer `NODE_ENV=development` (deconseille en prod).

**Le bot ne repond pas aux slash commands**
→ Les commandes globales mettent jusqu'a 1 heure a se propager la premiere fois. Pour tester immediatement : invite le bot sur un serveur de test et utilise des commandes `guild`-scopees (modification code temporaire).

**L'extension retourne "unauthorized" partout**
→ `API_KEY` est defini cote serveur mais pas dans les options de l'extension. Remplir le champ "Cle API".

**CORS errors dans la console Chrome**
→ `API_CORS_ORIGINS` ne contient pas l'`chrome-extension://<id>` de l'extension. L'ajouter (csv).

**429 Too Many Requests**
→ Rate limit hit. Augmenter `API_RATE_LIMIT_PER_MINUTE` ou verifier que tu n'es pas derriere un NAT qui fait tout passer par une seule IP.

**"Player not found" alors que le pseudo existe**
→ FACEIT est case-sensitive sur les pseudos. Verifier la casse exacte.

## Mise a jour

```bash
git pull
pnpm install           # sync des deps
pnpm build             # re-build apres changements
docker compose up -d --build   # en prod
```

Le lockfile `pnpm-lock.yaml` est commit — utilise `--frozen-lockfile` en CI/prod pour une install reproductible.
