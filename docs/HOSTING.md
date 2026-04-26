# Self-hosting (Raspberry Pi ou tout serveur Linux)

Ce guide couvre l'hebergement du backend (`bot` Discord + `api` HTTP) sur ton propre materiel : Raspberry Pi, VPS, NAS Linux, peu importe tant que c'est x86_64 ou ARM64 avec Docker.

L'extension navigateur, elle, n'a rien a heberger — elle est distribuee via les stores (cf. [`PUBLISHING.md`](./PUBLISHING.md)) ou en sideload (cf. [`RELEASE.md`](./RELEASE.md)).

## Aperçu

```
                     ┌──────────────────────┐
                     │   Discord (users)    │
                     └──────────┬───────────┘
                                │ Slash commands
                                ▼
   ┌───────────────────────────────────────────────────┐
   │            Serveur self-host                      │
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

## TL;DR

1. Preparer le serveur (Docker + Docker Compose).
2. Cloner le repo, remplir le `.env` (tokens Discord/FACEIT, API key, CORS).
3. Mettre une URL publique HTTPS sur ton port 8787 (Cloudflare Tunnel **ou** domaine + Caddy).
4. `docker compose up -d --build` → bot + API up.
5. Configurer les secrets GitHub pour l'auto-deploy sur tag (cf. [`RELEASE.md`](./RELEASE.md)).

## 1. Pre-requis

### Materiel & OS

- **Raspberry Pi 4 ou 5** : 4 Go RAM minimum (idealement 8 Go). Le bot consomme ~256 Mo, l'API ~512 Mo, plus le buffer Docker.
- **Tout autre Linux** : VPS (DigitalOcean, Hetzner...), un vieux Intel NUC, etc. Memes pre-requis.
- **OS** : 64-bit obligatoire. Sur Pi : Raspberry Pi OS 64-bit (Bookworm ou plus recent). 32-bit (`armv7`) est exclu, certaines deps Node ne compilent pas.
- **Stockage** : carte SD A2 32 Go minimum sur Pi. SSD USB tres recommande pour la durabilite (l'API logge pas mal).
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

### Installer Node + pnpm (optionnel — utile pour debug local)

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
# Discord
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
# - Chrome : ID stable (extension sideloaded ou via CWS si on garde le `key`)
# - Firefox : chaque install Firefox a un UUID local aleatoire → wildcard obligatoire
API_CORS_ORIGINS=chrome-extension://khpfppjaichdmbcoihjihfahooklnblc,moz-extension://*

# Optionnels avec defaults raisonnables
API_PORT=8787
API_RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=info
```

> **Important** : `NODE_ENV=production` rend `API_KEY` obligatoire au boot. Si tu oublies, l'API refuse de demarrer (c'est voulu, pas un bug).

## 3. Exposer l'API sur internet

L'API ecoute en HTTP sur `localhost:8787`. Il faut une URL publique HTTPS pour que l'extension puisse l'appeler. Trois options selon ton confort.

### Option A — Cloudflare Tunnel (recommande)

Pas de port-forward sur le routeur, pas de gestion de certif TLS. Cloudflare s'occupe de tout. Necessite d'avoir un domaine sur Cloudflare (10€/an ou un sous-domaine d'un domaine deja chez Cloudflare).

```bash
# Installer cloudflared sur le serveur
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

# Router une URL publique vers le port local
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

### Option B — Domaine + Caddy

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

Ouvre les ports **80 et 443** vers l'IP du serveur sur ton routeur. Caddy provisionne automatiquement le cert Let's Encrypt.

### Option C — DuckDNS (gratuit)

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

## 5. Verification & monitoring

```bash
# Statuts
docker compose ps

# Logs en live
docker compose logs -f --tail=50 api
docker compose logs -f --tail=50 bot

# Restart en cas de pepin
docker compose restart api
docker compose down && docker compose up -d --build  # rebuild propre
```

Pour aller plus loin (optionnel) : Uptime Kuma sur le meme serveur pour pinger `/health` et alerter sur Discord webhook si l'API tombe.

## 6. Auto-deploy sur tag git

Pour que chaque tag git declenche un redeploy automatique du backend, voir [`RELEASE.md`](./RELEASE.md) (section "Auto-deploy via GitHub Actions" — secrets SSH a configurer).

## Depannage

**L'API refuse de demarrer avec "API_KEY is required in production"**
→ `NODE_ENV=production` mais `API_KEY` est vide. Soit remplir la cle, soit passer `NODE_ENV=development` (deconseille en prod).

**Le bot ne repond pas aux slash commands**
→ Les commandes globales mettent jusqu'a 1 heure a se propager la premiere fois. Relog dans Discord (Ctrl+R) en attendant.

**L'extension retourne "unauthorized" partout**
→ `API_KEY` est defini cote serveur mais pas dans les options de l'extension. Remplir le champ "Cle API" (clic droit sur l'icone → Options).

**CORS errors dans la console**
→ `API_CORS_ORIGINS` ne contient pas l'origin de l'extension. Ajouter `chrome-extension://<id>` (Chrome) ou `moz-extension://*` (Firefox, wildcard obligatoire).

**429 Too Many Requests**
→ Rate limit hit. Augmenter `API_RATE_LIMIT_PER_MINUTE` ou verifier que tu n'es pas derriere un NAT qui fait tout passer par une seule IP.

**"Player not found" alors que le pseudo existe**
→ FACEIT est case-sensitive sur les pseudos. Verifier la casse exacte.
