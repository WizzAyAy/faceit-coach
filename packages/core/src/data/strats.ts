import type { MapStrats } from '@/types.js'

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

  de_cache: {
    pistol: {
      ct: [
        '**Setup 2-1-2** — USP Squeaky/Forklift A (angle long imbattable), 1 mid (Sun Room/Highway), 2 B (Site/Checkers/Headshot).',
        '**Utility :** smoke mid (coupe T spawn → A long), flash A main si push, molotov Vent B au call',
        '**Cle :** A long est tres long → USP devastateur, ne jamais avancer Squeaky',
      ].join('\n'),
      t: [
        '**Rush B (le + fiable)** — 4 B main, 1 mid/lurk. Pop-flash par-dessus le mur B, smoke Checkers depuis T spawn. Distances courtes, Glocks dominent.',
        '**A long fast** — 4 A long, 1 mid. Smoke mid CT cross + flash Squeaky. Sprint long, contest Forklift. Risque : duels longs au pistol.',
      ].join('\n'),
    },
    gun: {
      ct: [
        '**Default + AWP A long** — AWP Forklift/Squeaky (angle dominant), 1 mid Sun, 1 Highway, 2 B (Site/Headshot). Molotov Vent + smoke mid.',
        '**Aggressive mid (Astralis era)** — 2 push mid avec smoke Z + flash. Cut le split T mid→B, info A long. Repli vers sites au contact.',
        '**Stack B** — 3 B (Site/Checkers/Headshot), 2 A (AWP long + Squeaky). Vent ferme par molotov, retake A par Heaven/Z.',
      ].join('\n'),
      t: [
        '**Full B (NIP/G2)** — Smokes Headshot + Checkers + CT cross, molotov Toxic, 2 pop-flashs Vent. Entry Vent + B main simultane. 1 lurk garage.',
        '**A execute long** — 3 long, 2 Z/Sun Room. Smokes Squeaky + Forklift + CT cross, molotov default. Flash long + Z. Entry long + Z split.',
        '**Mid to B split (NaVi)** — 3 mid (prennent Z et Sun), 2 B main. Smoke Headshot + flash garage. Split B main + Z-to-B simultane.',
      ].join('\n'),
      antiEco: [
        '**CT :** AWP Forklift tient long seul. MAG-7 mid/Vent. Push Highway pour pick depuis Sun.',
        '**T :** Rush B avec MAC-10 + 2 flashs Vent. Site compact, Glock-friendly.',
      ].join('\n'),
      forceBuy: [
        '**CT :** Famas + Scout long A (angle long le rend letal). Vent ferme par molotov.',
        '**T :** Galils + smoke CT cross + flash Vent. Execute B minimaliste, distances favorisent Galils.',
      ].join('\n'),
    },
  },
}
