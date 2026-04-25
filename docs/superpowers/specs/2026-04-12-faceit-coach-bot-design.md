# FACEIT Coach Bot — Design Spec

> **[ARCHIVED 2026-04-25]** Spec d'origine, livree. Conservee pour l'historique. Voir `CLAUDE.md` pour l'architecture actuelle.

## Overview

Bot Discord servant de coach pour CS2 sur FACEIT. Il analyse les lobbies FACEIT pour recommander les meilleurs picks/bans de maps, fournit des profils joueurs, des prédictions de victoire et des recommandations stratégiques.

**Localisation :** `pilot4it/faceit-coach/`

## Stack technique

- **Runtime :** Node.js >= 22 (derniere LTS)
- **Langage :** TypeScript 5.8+
- **Package manager :** pnpm (derniere version)
- **Bot framework :** discord.js v14
- **HTTP client :** undici (natif Node.js)
- **Cache :** node-cache (in-memory, TTL)
- **Tests :** vitest
- **Linting :** @antfu/eslint-config
- **Env :** `--env-file=.env` natif Node 22 (pas de dotenv)

## Structure du projet

```
pilot4it/faceit-coach/
├── src/
│   ├── commands/
│   │   ├── analyze.ts
│   │   ├── player.ts
│   │   ├── compare.ts
│   │   ├── history.ts
│   │   ├── team.ts
│   │   ├── live.ts
│   │   ├── predict.ts
│   │   └── strats.ts
│   ├── services/
│   │   ├── faceit-api.ts
│   │   ├── analyzer.ts
│   │   ├── predictor.ts
│   │   └── cache.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── embeds.ts
│   │   └── constants.ts
│   ├── config.ts
│   └── index.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Variables d'environnement

```
DISCORD_TOKEN=        # Token du bot Discord
DISCORD_CLIENT_ID=    # Client ID pour enregistrer les slash commands
FACEIT_API_KEY=       # Cle API FACEIT v4
```

## API FACEIT v4 — Endpoints

| Endpoint | Usage | Commandes |
|----------|-------|-----------|
| `GET /matches/{match_id}` | Details d'un match/room (joueurs, equipes, map) | `/analyze`, `/history`, `/predict` |
| `GET /players?nickname={name}` | Trouver un joueur par pseudo | `/player`, `/compare`, `/live`, `/team` |
| `GET /players/{player_id}` | Profil joueur (ELO, level) | toutes |
| `GET /players/{player_id}/stats/cs2` | Stats globales CS2 | `/player`, `/compare` |
| `GET /players/{player_id}/history?game=cs2&limit=N` | Historique des N derniers matchs | `/analyze`, `/team`, `/strats` |
| `GET /players/{player_id}/games/cs2/stats?limit=N` | Stats detaillees par match (map, score, K/D) | `/analyze`, `/predict` |

### Cache strategy

| Donnee | TTL |
|--------|-----|
| Stats joueur | 10 min |
| Details match/room | 2 min |
| Historique matchs | 5 min |

## Map pool CS2

Defini dans `constants.ts` comme un simple tableau, modifiable en une ligne quand Valve change la rotation :

```ts
export const CS2_MAP_POOL = [
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_anubis',
  'de_ancient',
  'de_dust2',
  'de_train',
] as const
```

## Algorithme d'analyse Pick & Ban

### Collecte des donnees

Pour chaque joueur du lobby, recuperer les N derniers matchs (defaut 50, configurable via option de commande).

Calculer par map : winrate, nombre de matchs joues, K/D moyen.

### Ponderation par joueur

```
poids_joueur = ELO / ELO_moyen_du_lobby
```

Normalise le poids : un joueur a 2500 dans un lobby moyen a 2000 a un poids de 1.25.

### Score par map pour une equipe

```
score_map = Somme(winrate_map * poids_joueur) / nb_joueurs
```

### Malus d'incertitude

Si un joueur a moins de 5 matchs sur une map, son winrate est ramene vers 50% proportionnellement au manque de donnees :

```
winrate_ajuste = winrate_reel * (nb_matchs / 5) + 0.5 * (1 - nb_matchs / 5)
```

### Resultat

Pour chaque map du pool CS2 :
- Calculer le score des 2 equipes
- Classer par ecart `score_notre_equipe - score_adversaire`
- **Maps a pick** = ecart le plus positif
- **Maps a ban** = ecart le plus negatif

### Affichage (Discord Embed)

```
PICK   Mirage   — Vous: 62% | Eux: 48% | Avantage: +14%
PICK   Inferno  — Vous: 58% | Eux: 51% | Avantage: +7%
NEUTRE Anubis   — Vous: 53% | Eux: 52% | Avantage: +1%
BAN    Nuke     — Vous: 44% | Eux: 61% | Avantage: -17%
BAN    Vertigo  — Vous: 41% | Eux: 67% | Avantage: -26%
```

## Commandes

### `/analyze <room_id> [matches:50] [team:1|2]`

Commande principale. Recupere le lobby FACEIT, analyse tous les joueurs, et recommande les picks/bans.

- `room_id` (requis) : ID de la room FACEIT
- `matches` (optionnel, defaut 50) : nombre de matchs recents pour le calcul du winrate
- `team` (optionnel) : de quel cote l'utilisateur joue (1 ou 2). Si non fourni, le bot demande via des boutons Discord.

### `/player <pseudo>`

Profil detaille d'un joueur :
- ELO, niveau FACEIT, winrate global
- Top 3 et bottom 3 maps (par winrate)
- Stats recentes : K/D, HS%, winrate sur les 20 derniers matchs

### `/compare <joueur1> <joueur2>`

Comparaison tete a tete :
- Tableau cote a cote : ELO, winrate global, K/D
- Comparaison map par map : winrate de chacun sur chaque map du pool
- Highlight des maps ou chacun domine

### `/history <room_id>`

Historique des matchs d'un lobby/room :
- Liste des matchs passes
- Resultats, maps jouees, scores

### `/team <j1> <j2> <j3> <j4> <j5>`

Analyse d'une equipe sans adversaire :
- Maps fortes et faibles de l'equipe
- Detection des "trous" (maps ou personne n'est bon)
- Pondere par ELO de chaque joueur

### `/live <pseudo>`

Detection de match en cours :
- Si en match : lance automatiquement une analyse du lobby (comme `/analyze`)
- Si non : indique son dernier match et quand

### `/predict <room_id>`

Prediction de victoire :
- Si la map est deja decidee : probabilite de victoire sur cette map
- Si le lobby est encore en phase de vote : probabilite de victoire par map du pool
- Basee sur ELO moyen + winrate par map
- Joueurs cles (plus haute contribution au score)

### `/strats <map> [j1] [j2] [j3] [j4] [j5]`

Recommandations strategiques :
- Analyse des stats CT/T de chaque joueur sur la map donnee
- Recommande quel cote choisir en premier (CT ou T)
- Si pas de joueurs fournis, utilise le dernier lobby analyse dans le channel

## Gestion des erreurs

Toutes les erreurs affichees via un embed Discord rouge avec message lisible.

| Cas | Message |
|-----|---------|
| Room ID invalide / introuvable | "Room introuvable, verifie l'ID" |
| Joueur FACEIT introuvable | "Joueur `xxx` non trouve sur FACEIT" |
| API FACEIT rate limit (429) | Retry automatique avec backoff, message d'attente |
| API FACEIT down | "L'API FACEIT est temporairement indisponible" |
| Joueur sans stats CS2 | Exclu de l'analyse avec mention "pas assez de donnees" |
| Pas assez de matchs | Warning affiche mais resultat donne quand meme |
