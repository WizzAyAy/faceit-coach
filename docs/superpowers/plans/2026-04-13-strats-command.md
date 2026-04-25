# /strats Command Implementation Plan

> **[ARCHIVED 2026-04-25]** Plan implemente. Conserve pour l'historique. Voir `CLAUDE.md` pour l'etat actuel.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/strats <map>` slash command that displays CS2 pro strategies (pistol + gun rounds) for a given map.

**Architecture:** Static strategy data in a dedicated data file, embed builder function in embeds.ts, thin command handler. No API calls — purely static content served as 2 Discord embeds.

**Tech Stack:** TypeScript, discord.js 14, existing project patterns.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `MapStrats` interface |
| `src/data/strats.ts` | Create | Strategy data for all 7 maps |
| `src/utils/embeds.ts` | Modify | Add `stratsEmbeds()` function |
| `src/commands/strats.ts` | Create | Command handler |
| `src/index.ts` | Modify | Register `strats` command |
| `CLAUDE.md` | Modify | Document /strats command |

---

### Task 1: Add MapStrats type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add MapStrats interface at the end of the file**

```ts
export interface MapStrats {
  pistol: {
    ct: string
    t: string
  }
  gun: {
    ct: string
    t: string
    antiEco: string
    forceBuy: string
  }
}
```

Append after the `PickBanResult` interface (line 209).

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MapStrats type for /strats command"
```

---

### Task 2: Create strategy data file

**Files:**
- Create: `src/data/strats.ts`

- [ ] **Step 1: Create `src/data/strats.ts` with all 7 maps**

Each field value must stay under 1024 characters (Discord embed field limit). Use Discord markdown (bold, `>` quotes, line breaks).

```ts
import type { MapStrats } from '../types/index.js'

export const MAP_STRATS: Record<string, MapStrats> = {
  de_mirage: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Window domine mid (hauteur), smoke Connector, 2 joueurs A (Ticket/Jungle), 2 B (Van/Bench)',
        '**Utility :** smoke A Connector + smoke short B',
        '**Style :** tenir les angles longs, ne jamais avancer — USP devastateur a distance',
      ].join('\n'),
      t: [
        '**Rush A Ramp (FaZe)** — 4 joueurs ramp, 1 lurk mid. 2 flashs par-dessus le mur + smoke Window depuis T spawn. Entree simultanee par ramp.',
        '**Default Split B (NAVI)** — 2 joueurs mid, 2 apps B, 1 palace. A 1:30, mid roter short B + apps push simultane. Smoke CT B + flash.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default passif 2-1-2** — AWP Ticket/Stairs, rifleur Jungle, 1 Window, 2 B. Molotov ramp, smoke Palace au call. Rotation par Connector.',
        '**Aggressive mid (Vitality)** — Smoke Window, push top mid avec AWP. Coupe les splits T. Risque si rush B.',
        '**Stack A retake B (Spirit)** — 3 A (Jungle/Stairs/Palace), 2 B retrait. B joue delay avec smokes, retake 3 joueurs par CT.',
      ].join('\n'),
      t: [
        '**Full A (Vitality/G2)** — Smokes CT+Jungle+Stairs, 2 flashs par-dessus le toit, molotov default. Entry ramp + palace + lurk connector.',
        '**Split B (NAVI)** — 2 short + 2 apps, 1 lurk mid. Smokes CT B + Market door, flash par-dessus le toit B.',
        '**Mid-to-A (FaZe)** — 3 mid vers connector, 2 ramp/palace. Smokes Window + Jungle, flash connector avant entree.',
      ].join('\n'),
      antiEco: [
        '**CT :** MAG-7 en B short et Palace, stack un site, molotov chokepoints',
        '**T :** MAC-10, rush B apps avec flashs — les CTs anti-eco jouent avance',
      ].join('\n'),
      forceBuy: [
        '**CT :** 5 Famas + utility, defense agressive pour compenser l\'absence d\'AWP',
        '**T :** 5 Galil + smokes standard, executer un site avec timing retarde',
      ].join('\n'),
    },
  },

  de_inferno: {
    pistol: {
      ct: [
        '**Aggressive Banana (NAVI)** — 3 joueurs poussent banana, smoke bottom banana (obligatoire), 2 USP tiennent le haut. Repli derriere smoke si contact.',
        '**Passif 2-1-2** — 1 Pit (USP angle long), 1 Arch, 1 Boiler, 2 B (Car/Coffins)',
        '**Utility :** smoke bottom banana + flash par-dessus le toit banana',
      ].join('\n'),
      t: [
        '**Rush Banana B** — 4 joueurs banana, 1 lurk mid. 2 flashs par-dessus le mur. Si smoke CT : attendre 5s la dissipation puis rush.',
        '**Slow Apps A (Spirit)** — 3 apps, 2 banana (fake flashs). Monte apps silencieux, flash balcony, entree apps + boiler.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Banana control (Astralis)** — Molotov bottom banana + smoke T ramp. 3 B (Dark/Construction/New Box), 2 A (Pit AWP + Arch).',
        '**Stack A passif (G2)** — 3 A (Pit/Site/Library), 2 B en retrait (CT + Coffins). Ne conteste pas banana, retake B structure.',
        '**Aggressive Apps (Vitality)** — Push apps depuis short avec flash boiler. Info + kill, repli. Risque mais high reward.',
      ].join('\n'),
      t: [
        '**Full B (NAVI/FaZe)** — Pre-requis : banana control. Smokes CT+Coffins+Construction, molly Dark, 2 pop-flashs. Entry large construction + oranges.',
        '**Slow A split (Vitality)** — 2 banana (fake), 3 apps. Smokes Arch + CT A, molotov Pit. Entry apps + balcony, banana roter arch.',
        '**Fake B into A** — Full utility banana (smokes/mollys/flashs), 1 reste banana, 4 rotent apps. Timing : rotations CT doivent commencer.',
      ].join('\n'),
      antiEco: [
        '**CT :** MAG-7 banana (tient seul), positions avancees apps et banana',
        '**T :** MAC-10 rush banana, pre-aim les angles agressifs, eviter apps (coins + shotguns)',
      ].join('\n'),
      forceBuy: [
        '**CT :** 5 Famas, banana control avec burst fire. Ou 4 Famas + Scout Pit.',
        '**T :** Galils + smoke CT B + flash. Execute B rapide, timing > utility.',
      ].join('\n'),
    },
  },

  de_nuke: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Heaven = meilleur angle pistol du jeu (plongeant sur Hut/Squeaky). 1 Rafters, 1 Garage/Secret, 2 B (Dark/Vents).',
        '**Utility :** smoke Outside main, flash Heaven pour re-peek',
        '**Cle :** le joueur Heaven est MVP — angle plongeant imbattable a l\'USP',
      ].join('\n'),
      t: [
        '**Full Ramp (le + fiable)** — 5 joueurs ramp. Flash au-dessus du coin de ramp + 2e flash en sortant B site. Distances courtes, Glocks viables.',
        '**Outside vers A (Spirit)** — 4 outside, 1 ramp. Smoke garage, flash par-dessus le toit. Rush A main. Risque : distances longues pour Glocks.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default + AWP Heaven** — AWP Heaven (domine A), 1 Rafters, 1 Garage, 2 B (Dark/Vents). Smoke Outside, molotov Squeaky au call.',
        '**Aggressive Outside (FaZe/Ropz)** — 2 joueurs poussent outside avec smoke + flash. Prennent info/kills, repli Silo/Secret.',
        '**Stack B/Ramp** — 3 B (Ramp/Dark/Vents), 2 A (Heaven/Mini). Molotov top ramp + flash au contact. Embuscade ramp.',
      ].join('\n'),
      t: [
        '**Outside to A (NAVI)** — 3 outside, 2 ramp. Smokes Heaven + Mini (critiques). Flash par-dessus le toit. Entry Hut + A main simultane.',
        '**Ramp Execute (Spirit)** — 4 ramp, 1 lurk outside. Smokes CT B + Dark, molotov Toxic, pop-flash vers site. Lurker empeche rotation Secret.',
        '**Vent Drop** — 1-2 cassent vents, drop en B avec flash pre-drop. Combine avec faux ramp execute. Gamble play efficace.',
      ].join('\n'),
      antiEco: [
        '**CT :** AWP Heaven tient seul le site A. Push outside agressif. MAG-7 ramp.',
        '**T :** Rush ramp avec MAC-10, timing rapide surprend les CTs en retrait',
      ].join('\n'),
      forceBuy: [
        '**CT :** Scout Heaven (1000$ et l\'angle le rend viable) + 4 Famas',
        '**T :** Galils + smoke Heaven. Outside-to-A avec Galils suffit pour les duels.',
      ].join('\n'),
    },
  },

  de_anubis: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — Joueur mid Bridge crucial (info canal). 2 A (Pillar/Heaven), 2 B (Main/Back site).',
        '**Utility :** smoke mid canal + flash A main si contact',
        '**Cle :** mid control = nerf de la map, le joueur Bridge dicte les rotations',
      ].join('\n'),
      t: [
        '**Rush B** — 4 B main, 1 mid/lurk. Pop-flash au coin de B main. Site compact, Glocks dominent. Smoke Heaven B si possible.',
        '**Default Mid vers A** — 2 mid (canal), 2 A connector, 1 B info. Flash mid, rotation lente vers A. Entry connector + A main.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Mid Control Default** — AWP Bridge (angle long mid), 2 A (Heaven/Pillar), 2 B (Pillar/Heaven B). Molotov canal entree T.',
        '**Aggressive B (G2)** — Push B main avec pop-flash depuis site. Kill + repli avec smoke cover. Info massive.',
        '**Heavy A + mid anchor** — 3 A (AWP Heaven/Site/Connector), 1 Bridge, 1 B solo. B joue delay + retake.',
      ].join('\n'),
      t: [
        '**Full A (NAVI/Vitality)** — Smokes Heaven A + CT, molotov Pillar, 2 flashs par-dessus le mur A. Entry A main + connector.',
        '**Fast B** — 4 B main, 1 lurk mid. Smokes Heaven B + CT B, molotov back site, pop-flash B main. Explosive et rapide.',
        '**Mid to B split (Spirit)** — 3 mid prennent canal, smoke bridge, flash vers B. 2 B main poussent en meme temps.',
      ].join('\n'),
      antiEco: [
        '**CT :** positions avancees A/B main, shotguns chokepoints, push canal agressif',
        '**T :** Rush B avec MAC-10 + 2 flashs, site trop compact pour les CTs',
      ].join('\n'),
      forceBuy: [
        '**CT :** Famas + smoke/flash, focus mid control pour l\'info',
        '**T :** Galils + smoke Heaven B (critique). Execute B minimaliste.',
      ].join('\n'),
    },
  },

  de_ancient: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Heaven A dominant (angle plongeant sur Main A). 1 Donut, 1 Mid, 2 B (Ramp/Site).',
        '**Utility :** smoke mid door, flash A main si push',
        '**Cle :** Heaven A = meme avantage que Heaven Nuke au pistol',
      ].join('\n'),
      t: [
        '**Rush B Main** — 4 B main, 1 mid/lurk. Pop-flash dans le couloir B. Distances courtes = Glocks efficaces. Sprint sur site, plant default.',
        '**Mid vers A (Vitality)** — 3 mid, 2 A main. Smoke Cave/CT mid. Flash mid, push A depuis mid + A main split.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default + AWP Heaven** — AWP Heaven A (position la + forte), 1 Temple, 1 Mid, 2 B (Ramp/Pillar). Molotov A main entry.',
        '**Aggressive B info (Spirit)** — Push B main pour info avec flash. Si T reperes : call B. Sinon : repli, l\'equipe sait que c\'est A/mid.',
        '**Double AWP (Vitality)** — AWP Heaven A + AWP Mid. Couvre les 2 approches T. 3 rifleurs support/retake.',
      ].join('\n'),
      t: [
        '**A split mid (NAVI)** — 2 mid, 3 A main. Smokes Heaven + Donut, molotov Temple. 2 flashs hautes A main. Pinch A main + mid/cave.',
        '**Full B** — 4 B main, 1 mid/lurk. Smokes CT B + Pillar, molotov Ramp B. Pop-flash couloir B. Lurker coupe cave.',
        '**Cave Play** — 3 mid poussent cave, 2 B main. Smoke mid CT, flash cave vers B. Split B depuis cave + B main.',
      ].join('\n'),
      antiEco: [
        '**CT :** push B main avec shotgun, Heaven A tient seul, push mid pour picks',
        '**T :** Rush A main avec MAC-10, les CTs heaven sont previsibles a 5',
      ].join('\n'),
      forceBuy: [
        '**CT :** Famas + Scout Heaven A (900$, angle le rend letal). Jouer passif.',
        '**T :** Galils + smoke Heaven. Execute B, distances favorisent Galils.',
      ].join('\n'),
    },
  },

  de_dust2: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Long A/Pit = devastateur a distance. 1 Short, 1 Mid Doors (flash les T, pas d\'exposition longue), 2 B (Plat/Big Box).',
        '**Utility :** smoke mid doors (cross safe CT), flash Long pour re-peek, smoke Tunnels B',
        '**Cle :** le joueur Pit est MVP, USP a distance Long est imbattable',
      ].join('\n'),
      t: [
        '**Long A Push (FaZe)** — 4 Long, 1 lurk B tunnels. 2 flashs long doors consecutives. Sprint long, smoke CT cross. Glocks en groupe submergent 1-2 CTs.',
        '**Rush B Tunnels** — 5 upper tunnels, 2 flashs pop-flash. Smoke mid doors depuis T spawn. Round joue en 15 secondes. Le plus rapide du jeu.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default 2-1-2** — AWP Long (Pit ou coin Long doors), 1 Short, 1 Mid doors, 2 B (Plat/Tunnels). Smoke Long cross, molotov Long.',
        '**Aggressive Long (NAVI)** — 2 joueurs push Long, AWP peek wide avec flash. Si kill : tiennent Long. Si vide : info A ou B.',
        '**B Stack** — 3 B (Big Box/Plat/Tunnels), 2 A (AWP Long + Short). Molotov upper tunnels + smoke lower. Impenetrable.',
      ].join('\n'),
      t: [
        '**Long A Execute** — 3 Long, 2 Cat. Smokes CT cross + Cat, molotov default + Car. 2 flashs hautes depuis Long. Entry Long + Cat simultane.',
        '**B Execute (NAVI/Vitality)** — 4 upper tunnels, 1 lurk mid. Smokes Window + Big Box, molotov Car B. 2 pop-flashs tunnels.',
        '**Cat Split A (FaZe)** — 3 Cat (mid d\'abord), 2 Long. Smoke Long doors CT + CT cross. Flash short vers A. Entry short + Long.',
      ].join('\n'),
      antiEco: [
        '**CT :** AWP Long suffit seul. Push B tunnels pour picks. Positions avancees mid.',
        '**T :** Rush B MAC-10, 3 flashs, site tombe en 5 secondes. CTs ne retake pas B.',
      ].join('\n'),
      forceBuy: [
        '**CT :** Scout Long A + 4 Famas. Scout presque aussi efficace que l\'AWP a Long.',
        '**T :** Galils + smoke CT cross (minimum vital). Execute A Long viable.',
      ].join('\n'),
    },
  },

  de_overpass: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Heaven B angle plongeant sur Monster. 2 A (Toilets/Truck), 1 Fountain, 2 B (Heaven/Water).',
        '**Utility :** smoke Monster (empeche rush B), flash Short A si contact',
        '**Cle :** Heaven B avec USP est tres fort — angle plongeant sur Monster exit',
      ].join('\n'),
      t: [
        '**Monster Rush B** — 4 Monster, 1 cover Playground. 2 pop-flashs Monster exit. Glocks devastateurs dans les tunnels + site compact. Smoke Heaven B.',
        '**Speed A (Heroic)** — 3 Long A, 2 Short A. Flash Long, rush site. Plus risque car distances plus longues.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default + deny Monster** — AWP Long A (Truck), 1 Toilets, 1 Fountain, 2 B (Heaven/Water). Molotov + smoke Monster.',
        '**Aggressive Toilets (Vitality)** — Push toilets avec pop-flash. Pick + info, repli smoke cover.',
        '**Double B Stack** — 3 B (Heaven/Pillar/Water), 2 A retrait (Truck/Short). Molotov + smoke + flash Monster = impenetrable.',
      ].join('\n'),
      t: [
        '**Full B (NAVI/Spirit)** — 4 Monster, 1 lurk connector. Smokes Heaven B + CT B, molotov Pillar, 2 pop-flashs Monster. Entry wide Monster.',
        '**Long A (G2)** — 3 Long, 2 Short. Smokes Bank + Truck, molotov site, 2 flashs hautes. Entry Long + Short simultane.',
        '**Mid to B split (Heroic)** — 3 connector vers water, 2 Monster. Smoke Heaven B, flash depuis water. Split Monster + water.',
      ].join('\n'),
      antiEco: [
        '**CT :** MAG-7 Monster (1 joueur suffit). Push toilets + Long A. AWP Heaven tient B seul.',
        '**T :** Rush B Monster MAC-10 + flashs, les CTs ne stack pas assez B',
      ].join('\n'),
      forceBuy: [
        '**CT :** Famas + Scout Heaven B (angle plongeant, headshot = kill).',
        '**T :** Galils + smoke Heaven B + flash Monster. Execute B minimaliste.',
      ].join('\n'),
    },
  },
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/data/strats.ts
git commit -m "feat: add CS2 strategy data for all 7 maps"
```

---

### Task 3: Add stratsEmbeds function to embeds.ts

**Files:**
- Modify: `src/utils/embeds.ts`

- [ ] **Step 1: Add import for MapStrats and MAP_DISPLAY_NAMES (already imported)**

Add `MapStrats` to the type import at the top of `src/utils/embeds.ts`:

```ts
import type { MapScore, MapStrats, PickBanResult } from '../types/index.js'
```

- [ ] **Step 2: Add stratsEmbeds function before errorEmbed**

```ts
export function stratsEmbeds(map: string, strats: MapStrats): EmbedBuilder[] {
  const name = MAP_DISPLAY_NAMES[map] ?? map

  const pistolEmbed = new EmbedBuilder()
    .setTitle(`🔫 Pistol Rounds — ${name}`)
    .addFields(
      { name: '🛡️ CT Pistol', value: strats.pistol.ct, inline: true },
      { name: '💣 T Pistol', value: strats.pistol.t, inline: true },
    )
    .setColor(0xFFA500)
    .setTimestamp()

  const gunEmbed = new EmbedBuilder()
    .setTitle(`🎯 Gun Rounds — ${name}`)
    .addFields(
      { name: '🛡️ CT Strats', value: strats.gun.ct },
      { name: '💣 T Executes', value: strats.gun.t },
      { name: '💰 Anti-eco', value: strats.gun.antiEco },
      { name: '🔄 Force buy', value: strats.gun.forceBuy },
    )
    .setColor(0x00AE86)
    .setTimestamp()

  return [pistolEmbed, gunEmbed]
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/utils/embeds.ts
git commit -m "feat: add stratsEmbeds builder for /strats command"
```

---

### Task 4: Create /strats command handler

**Files:**
- Create: `src/commands/strats.ts`

- [ ] **Step 1: Create `src/commands/strats.ts`**

```ts
import type { ChatInputCommandInteraction } from 'discord.js'
import type { BotCommand } from '../types/index.js'
import { SlashCommandBuilder } from 'discord.js'
import { MAP_STRATS } from '../data/strats.js'
import { CS2_MAP_POOL } from '../utils/constants.js'
import { errorEmbed, stratsEmbeds } from '../utils/embeds.js'

export default {
  data: new SlashCommandBuilder()
    .setName('strats')
    .setDescription('Affiche les stratégies compétitives CS2 pour une map')
    .addStringOption(opt =>
      opt.setName('map').setDescription('Map CS2').setRequired(true).addChoices(
        ...CS2_MAP_POOL.map(m => ({ name: m.replace('de_', ''), value: m })),
      ),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const map = interaction.options.getString('map', true)
    const strats = MAP_STRATS[map]

    if (!strats) {
      await interaction.reply({ embeds: [errorEmbed('Map introuvable.')] })
      return
    }

    await interaction.reply({ embeds: stratsEmbeds(map, strats) })
  },
} satisfies BotCommand
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/strats.ts
git commit -m "feat: add /strats command handler"
```

---

### Task 5: Register the command

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add `'strats'` to the command list in `src/index.ts`**

Change the `commandFiles` array (line 9-13) from:

```ts
  const commandFiles = [
    'analyze',
    'player',
    'live',
  ]
```

to:

```ts
  const commandFiles = [
    'analyze',
    'player',
    'live',
    'strats',
  ]
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: register /strats slash command"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add /strats to the commands section**

After the `/live` command section, add:

```markdown
### /strats
Affiche les strategies competitives CS2 pour une map (pistol rounds + gun rounds).

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| map | string choice | oui | Map CS2 (7 maps du pool) |

**Flow:** lookup `MAP_STRATS[map]` → 2 embeds `stratsEmbeds()` (pistol + gun rounds). Donnees statiques, pas d'appel API.
```

- [ ] **Step 2: Add `src/data/` directory to the architecture tree**

Update the architecture tree to include:

```
├── data/
│   └── strats.ts          # Donnees statiques de strategies par map
```

- [ ] **Step 3: Update the "Code mort" section**

Remove `stratsEmbed()` from the dead code list since we now have `stratsEmbeds()` (different function).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with /strats command"
```
