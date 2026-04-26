# Hello Maxime — guide deploiement & publication

Bienvenue sur **FACEIT Coach**. Le projet a deux parties :

- **Backend** : un bot Discord + une API HTTP (Node.js, Hono, Discord.js) — c'est ce que tu vas heberger sur ton Raspberry.
- **Extension navigateur** : Chrome + Firefox, en distribution privee/unlisted sur les stores. Quentin a deja le compte Google Web Store ; pour Firefox AMO c'est gratuit, ça peut etre nous deux.

Tout est dans un monorepo TypeScript (pnpm + Turborepo). Le repo : `https://github.com/WizzAyAy/faceit-coach`.

## TL;DR — ce que tu dois faire

1. Preparer ton Raspberry Pi (Docker + Docker Compose).
2. Cloner le repo, remplir le `.env` (tokens Discord/FACEIT, API key, CORS).
3. Mettre une URL publique sur ton port 8787 (Cloudflare Tunnel **ou** domaine + Caddy).
4. `docker compose up -d --build` → bot + API up.
5. Configurer les secrets GitHub pour l'auto-deploy sur tag.
6. Aider Quentin a publier sur Chrome Web Store + Firefox AMO (sections en bas).

---

## 1. Pre-requis Raspberry Pi

- **Hardware** : Pi 4 ou 5, **4 Go RAM minimum** (idealement 8 Go). Le bot consomme 256 Mo, l'API 512 Mo, plus le buffer Docker.
- **OS** : Raspberry Pi OS 64-bit (Bookworm ou plus recent). 32-bit est exclu, certaines deps Node ne compilent pas en `armv7`.
- **Stockage** : carte SD A2 32 Go minimum, ou SSD USB pour la durabilite (tres recommande, l'API logge pas mal).
- **Reseau** : connexion ethernet stable, IP fixe ou DHCP reservation cote routeur.

### Installer Docker

```bash
# 1. Update
sudo apt update && sudo apt upgrade -y

# 2. Docker via le script officiel (contient docker-compose-plugin)
curl -fsSL https://get.docker.com | sh

# 3. Permettre a ton user de lancer docker sans sudo
sudo usermod -aG docker $USER
# Re-log (ferme/ouvre le shell) pour que le group prenne effet

# 4. Verifier
docker compose version  # doit afficher v2.x
```

### Installer Node + pnpm (utiles pour debug, pas obligatoire si tout passe par Docker)

```bash
# Via fnm (le plus simple sur ARM)
curl -fsSL https://fnm.vercel.app/install | bash
exec $SHELL
fnm install 22
corepack enable
```

## 2. Cloner et configurer le projet

```bash
# Choisis un emplacement stable. Pour systemd/auto-deploy je conseille /opt
sudo mkdir -p /opt/faceit-coach
sudo chown $USER:$USER /opt/faceit-coach
cd /opt/faceit-coach

# Cloner
git clone https://github.com/WizzAyAy/faceit-coach.git .

# Creer le .env a partir du template
cp .env.example .env
```

Edite `.env`. Variables critiques :

```dotenv
# Discord (Quentin te file les valeurs ou cree un nouveau bot)
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...

# FACEIT Open Data API key (gratuit, https://developers.faceit.com/)
FACEIT_API_KEY=...

# === PROD ===
NODE_ENV=production

# Cle pour proteger l'API (X-API-Key header). Genere-la une fois :
#   openssl rand -hex 32
API_KEY=<32-byte-hex>

# Whitelist des origins autorises a appeler l'API.
# - Chrome : ID stable (extension Quentin/toi quand sideloaded ou via CWS si on garde le `key`)
# - Firefox : chaque install Firefox a un UUID local aleatoire → wildcard obligatoire
API_CORS_ORIGINS=chrome-extension://khpfppjaichdmbcoihjihfahooklnblc,moz-extension://*

# Optionnels avec defaults raisonnables
API_PORT=8787
API_RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=info
```

> **Important** : `NODE_ENV=production` rend `API_KEY` obligatoire au boot. Si tu oublies, l'API refuse de demarrer (c'est voulu).

## 3. Exposer l'API sur internet

L'API ecoute en HTTP sur `localhost:8787` du Pi. Il faut une URL publique HTTPS. Deux options selon ton confort.

### Option A — Cloudflare Tunnel (le plus simple, recommande)

Pas de port-forward, pas de gestion de certif TLS. Cloudflare s'occupe de tout.

```bash
# Installer cloudflared sur le Pi
sudo mkdir -p /usr/local/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/local/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/local/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# Login (ouvre une URL a coller dans un browser pour autoriser)
cloudflared tunnel login

# Creer le tunnel
cloudflared tunnel create faceit-coach

# Router une URL publique (ex: api-faceit.tondomaine.com) vers le port local
cloudflared tunnel route dns faceit-coach api-faceit.tondomaine.com

# Config minimale
cat > ~/.cloudflared/config.yml <<EOF
tunnel: faceit-coach
credentials-file: ~/.cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: api-faceit.tondomaine.com
    service: http://localhost:8787
  - service: http_status:404
EOF

# Lancer en service systemd
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Tu auras besoin d'un domaine sur Cloudflare (10€/an environ, ou un sous-domaine d'un domaine deja chez Cloudflare). Pas de port a ouvrir cote routeur.

### Option B — Domaine + Caddy (port forwarding 80/443)

Si tu as deja un domaine et tu veux gerer toi-meme :

```bash
# Installer Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Caddyfile
sudo tee /etc/caddy/Caddyfile <<EOF
api-faceit.tondomaine.com {
    reverse_proxy localhost:8787
}
EOF

sudo systemctl restart caddy
```

Ouvre les ports **80 et 443** vers l'IP du Pi sur ton routeur. Caddy provisionne automatiquement le cert Let's Encrypt.

### Option C — DuckDNS gratos (si tu veux 0€)

`<sousnom>.duckdns.org` gratuit + Caddy fait le job. Setup similaire a Option B mais sans payer le domaine.

## 4. Lancer le bot + API

```bash
cd /opt/faceit-coach
docker compose up -d --build
docker compose ps      # bot + api en healthy
docker compose logs -f api | head -30
```

Tester depuis ton laptop :

```bash
# Health check (sans auth)
curl https://api-faceit.tondomaine.com/health
# → {"status":"ok"}

# Endpoint protege (avec X-API-Key)
curl -H "X-API-Key: <ta-api-key>" https://api-faceit.tondomaine.com/strats
```

Si tout repond, le bot Discord est aussi up — verifie sur ton Discord serveur que les slash commands `/analyze`, `/player`, `/live`, `/strats` apparaissent.

## 5. Auto-deploy via GitHub Actions

A chaque tag `vX.Y.Z`, GitHub Actions push une nouvelle version du backend sur ton Pi via SSH.

### Setup SSH dedie

```bash
# Sur ton laptop ou sur le Pi
ssh-keygen -t ed25519 -f ~/.ssh/faceit-coach-deploy -C "github-actions-deploy" -N ""

# Sur le Pi, ajouter la cle PUBLIQUE a authorized_keys
cat ~/.ssh/faceit-coach-deploy.pub | ssh maxime@pi "cat >> ~/.ssh/authorized_keys"
```

### Secrets GitHub a remplir

Sur le repo : **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valeur |
|--------|--------|
| `DEPLOY_HOST` | Ton hostname public (ex: `pi.maxime.com` ou IP statique) |
| `DEPLOY_USER` | Le user SSH (ex: `maxime`) |
| `DEPLOY_SSH_KEY` | Le **contenu** de `~/.ssh/faceit-coach-deploy` (la cle privee, pas le `.pub`) |
| `DEPLOY_PATH` | `/opt/faceit-coach` |
| `DEPLOY_PORT` | (optionnel) le port SSH si different de 22 |

A partir de la, des que Quentin push un tag `vX.Y.Z` (sans `-`), le workflow `.github/workflows/release.yml` :

1. Build l'extension (zip Chrome + Firefox attaches a la GitHub release).
2. SSH sur ton Pi, `git checkout <tag>`, `docker compose up -d --build`.
3. Bot + API redemarrent avec la nouvelle version.

Les tags pre-release type `v1.1.0-beta.1` (avec un `-`) **skip** le deploy, ils servent a tester juste le build extension.

## 6. Verification & monitoring

```bash
# Sur le Pi
docker compose ps                              # statuts
docker compose logs -f --tail=50 api           # logs API en live
docker compose logs -f --tail=50 bot           # logs bot en live

# Restart en cas de pepin
docker compose restart api
docker compose down && docker compose up -d --build  # rebuild propre
```

Pour aller plus loin (optionnel) : Uptime Kuma sur le Pi pour pinger `/health` et alerter sur Discord webhook si l'API tombe.

---

## 7. Publier l'extension sur Chrome Web Store

C'est Quentin qui a le compte Google Web Store ($5 one-time deja paye), donc l'upload se fera depuis chez lui. Tu peux l'aider sur les assets (screenshots, description).

### Pre-flight

- Le `key` du manifest (cle publique RSA dans `wxt.config.ts`) doit etre **garde** au premier upload : ça permet a l'extension publiee d'avoir le **meme Extension ID** que la version sideload actuelle (`khpfppjaichdmbcoihjihfahooklnblc`). Pas de changement de CORS necessaire pour les friends qui passent du sideload au CWS.

### Etapes

1. Build le zip Chrome :
   ```bash
   pnpm --filter @faceit-coach/extension zip
   # → packages/extension/.output/faceit-coach-X.Y.Z-chrome.zip
   ```
   (Ou recupere directement le zip depuis la GitHub release du tag courant.)

2. Sur https://chrome.google.com/webstore/devconsole/ : **Add new item** → upload le zip.

3. **Store listing** :
   - Title : `FACEIT Coach`
   - Summary (132 char) : `Pick/ban analysis & live match detection for FACEIT CS2 — requires self-hosted backend`
   - Description : etre **explicite** que l'extension necessite un backend self-hosted (`apiBaseUrl` configurable dans Options). Sinon les reviewers vont penser que c'est casse.
   - Category : Productivity
   - Language : English (Worldwide)
   - **Screenshots** (obligatoire, min 1) : 1280x800 ou 640x400. A faire : popup ouvert avec une analyse en cours + page Options. Quentin peut prendre les caps.
   - Icon : 128x128 (deja dans le zip).

4. **Privacy practices** (zone qui se fait souvent reject si baclee) :
   - Single purpose : `Display FACEIT match analysis in the browser popup`
   - Permissions justifications :
     - `storage` → Persist user settings (API URL, FACEIT pseudo)
     - `activeTab` → Detect FACEIT room ID from current tab URL
     - `host_permissions` → Communicate with self-hosted FACEIT Coach API
   - Data usage : declarer "Personally identifiable information (FACEIT pseudo)" et "Authentication information (API key)" — both **stored locally only, not transmitted to any third party**.
   - Remote code : **No** (tout est bundle).

5. **Distribution** :
   - Visibility : **Unlisted** (pas dans la recherche, accessible via lien direct)
   - Geographic distribution : All regions
   - Pricing : Free

6. **Submit for review** → 1 a 3 jours typiquement.

7. Apres publication : recuperer le lien public + l'Extension ID. Si tu as garde le `key`, l'ID matche `khpfppjaichdmbcoihjihfahooklnblc` — sinon mettre a jour `API_CORS_ORIGINS` cote Pi.

### Updates suivants

Pour chaque release :

1. Quentin push un tag `vX.Y.Z` → CI build le zip Chrome (dispo sur la GitHub release).
2. Sur le dashboard CWS : **Package → Upload new package** → upload le zip → Submit for review.

Pas d'auto-publish gratuit (Google demande OAuth + l'API privee, faisable avec [`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli) si on veut s'embeter).

---

## 8. Publier l'extension sur Firefox AMO

L'AMO est gratuit (pas de fee). Compte sur https://addons.mozilla.org/developers/.

### Self-distribution (recommande pour rester prive)

C'est l'option qu'on veut : Mozilla **signe** un XPI mais ne le liste pas publiquement. On distribue le `.xpi` signe directement (lien GitHub release).

1. Build le zip Firefox **avec sources** :
   ```bash
   pnpm --filter @faceit-coach/extension zip:firefox
   # produit:
   # - faceit-coach-X.Y.Z-firefox.zip      (le bundle)
   # - faceit-coach-X.Y.Z-sources.zip      (sources requises par AMO pour reviewer)
   ```

2. Sur https://addons.mozilla.org/developers/addon/submit/ :
   - Choisir **On your own** (self-distribution).
   - Upload le `firefox.zip`.
   - Repondre "Yes" a "Does your add-on use code from external sources?" si bundles avec deps (Vue, etc.) → AMO va demander les sources.
   - Upload le `sources.zip` (genere par WXT au step precedent).
   - Indiquer comment build : `pnpm install && pnpm --filter @faceit-coach/core build && pnpm --filter @faceit-coach/extension build:firefox`

3. **Listing info** :
   - Name : `FACEIT Coach`
   - Summary : meme contenu que CWS
   - Categories : Productivity
   - License : a choisir (MIT/ISC OK, ou "All Rights Reserved" si on veut)

4. **Soumettre** → review automatique + manuelle. Souvent **plus rapide que CWS** (heures a 1-2 jours).

5. Apres acceptance : Mozilla genere un `.xpi` signe, dispo dans l'admin du listing. **Telecharger ce XPI** et l'ajouter a la GitHub release du tag concerne (a la place du zip non-signe — sinon les friends peuvent pas l'installer en prod sur Firefox stable).

### Add-on ID stable

Le manifest contient `browser_specific_settings.gecko.id = "faceit-coach@quentin.maignan"` (dans `wxt.config.ts`). Cet ID restera fige au premier upload AMO — ne le change jamais.

> **A noter** : Firefox utilise un **UUID local aleatoire** par installation pour `moz-extension://<UUID>` (different de l'add-on ID). C'est pour ça que `API_CORS_ORIGINS` doit inclure `moz-extension://*` (wildcard) — l'API ne peut pas connaitre a l'avance les UUID des installs des friends.

### Updates suivants

Pour chaque release :

1. Build le zip Firefox + sources via le tag.
2. Sur le listing AMO : **New version** → upload `firefox.zip` + `sources.zip` → submit.
3. Recuperer le XPI signe et l'attacher a la GitHub release.

---

## 9. Recap : architecture finale

```
                     ┌──────────────────────┐
                     │   Discord (users)    │
                     └──────────┬───────────┘
                                │ Slash commands
                                ▼
   ┌───────────────────────────────────────────────────┐
   │            Raspberry Pi (chez toi)                │
   │  ┌─────────────────┐    ┌─────────────────────┐   │
   │  │   bot (Discord) │    │   api (Hono HTTP)   │   │
   │  │   docker-bot-1  │    │  docker-api-1 :8787 │   │
   │  └────────┬────────┘    └──────────┬──────────┘   │
   │           │                        │              │
   │           └────────► core ◄────────┘              │
   │              (FACEIT Open Data calls, cached)     │
   └───────────────────────────────┬───────────────────┘
                                   │ HTTPS via Cloudflare Tunnel / Caddy
                                   ▼
                ┌──────────────────────────────┐
                │  api-faceit.tondomaine.com   │
                └──────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ┌────────────────────┐                 ┌────────────────────┐
   │  Chrome extension  │                 │  Firefox extension │
   │  via Web Store     │                 │  via AMO (signed)  │
   └────────────────────┘                 └────────────────────┘
```

## 10. Si t'as un souci

- Logs API : `docker compose logs -f api`
- Logs bot : `docker compose logs -f bot`
- Tests locaux avant de bouger en prod : `pnpm test && pnpm typecheck && pnpm lint`
- Documentation source de verite : [`CLAUDE.md`](./CLAUDE.md) (architecture detaillee, types, endpoints)
- Documentation release : [`RELEASE.md`](./RELEASE.md) (le deploy automatique sur tag, les configs prod)

Bon deploiement 🚀
