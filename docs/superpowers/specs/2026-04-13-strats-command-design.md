# /strats Command — Design Spec

## Summary

Add a `/strats <map>` slash command that displays CS2 competitive strategies for a given map, sourced from pro team playstyles. Output is 2 Discord embeds: one for pistol rounds, one for gun rounds.

## Command

- Name: `/strats`
- Option: `map` (required, string choice) — 7 maps from `CS2_MAP_POOL`, displayed without `de_` prefix
- No `deferReply` — static data, instant response
- Reply with 2 embeds (no files, no components)

## Output Format

### Embed 1 — Pistol Rounds

- Title: `Pistol Rounds — {MapDisplayName}`
- Color: `0xFFA500` (orange)
- Fields (inline):
  - **CT Pistol** — default setup, USP positioning, utility (smoke+flash). 2-3 condensed strats.
  - **T Pistol** — 2 rush/default strats with pro team references (e.g. "Rush A ramp (FaZe)")

### Embed 2 — Gun Rounds

- Title: `Gun Rounds — {MapDisplayName}`
- Color: `0x00AE86` (teal)
- Fields:
  - **CT Strats** — 2-3 named strats with setups (e.g. "Default 2-1-2", "Aggressive mid (Vitality)")
  - **T Executes** — 2-3 named executes with key utility (e.g. "Full A — smokes CT+jungle+stairs (Vitality/G2)")
  - **Anti-eco** — CT + T anti-eco tips, 1-2 lines each
  - **Force buy** — CT + T force buy tips, 1-2 lines each

## Data Layer

### File: `src/data/strats.ts`

Export a type and a data record:

```ts
interface MapStrats {
  pistol: {
    ct: string // Discord markdown for embed field value
    t: string
  }
  gun: {
    ct: string
    t: string
    antiEco: string
    forceBuy: string
  }
}

export const MAP_STRATS: Record<string, MapStrats> = {
  de_mirage: { ... },
  de_inferno: { ... },
  de_nuke: { ... },
  de_anubis: { ... },
  de_ancient: { ... },
  de_dust2: { ... },
  de_overpass: { ... },
}
```

String values are pre-formatted with Discord markdown (bold, line breaks). Each field value must stay under 1024 characters (Discord embed field limit).

Strategy content is sourced from pro team analysis (Vitality, NAVI, FaZe, Spirit, G2, etc.) and includes team references.

## Embed Builder

### File: `src/utils/embeds.ts`

Add a function:

```ts
export function stratsEmbeds(map: string, strats: MapStrats): EmbedBuilder[]
```

Returns an array of 2 EmbedBuilder instances (pistol + gun rounds).

## Command Handler

### File: `src/commands/strats.ts`

- Import `MAP_STRATS` from `src/data/strats.ts`
- Import `stratsEmbeds` from `src/utils/embeds.ts`
- Look up strats by map key, build embeds, reply
- No async API calls needed — purely static data

## Registration

Add `'strats'` to the command list in `src/index.ts`.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/data/strats.ts` | Create — strategy data + MapStrats type |
| `src/commands/strats.ts` | Create — command handler |
| `src/utils/embeds.ts` | Modify — add `stratsEmbeds()` |
| `src/types/index.ts` | Modify — export `MapStrats` type |
| `src/index.ts` | Modify — register `strats` command |
| `CLAUDE.md` | Modify — add /strats to architecture docs |
