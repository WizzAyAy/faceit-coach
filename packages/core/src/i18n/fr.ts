import type { en } from './en.js'

type DeepStringify<T> = T extends string
  ? string
  : { [K in keyof T]: DeepStringify<T[K]> }

export const fr: DeepStringify<typeof en> = {
  common: {
    confidence: {
      high: 'Confiance élevée',
      medium: 'Confiance moyenne',
      low: 'Confiance faible',
    },
    decision: {
      pick: 'PICK',
      ban: 'BAN',
      neutral: 'NEUTRE',
    },
    error: {
      roomNotFound: 'Room introuvable, vérifie l\'ID.',
      playerNotFound: 'Joueur "{pseudo}" non trouvé sur FACEIT.',
      noCs2Stats: '{pseudo} n\'a pas de stats CS2.',
      noRecentMatch: '{pseudo} n\'a aucun match récent.',
      unexpected: 'Une erreur inattendue est survenue.',
      timeout: 'Temps écoulé, relance la commande.',
    },
    matchesShort: '{n}m',
  },

  bot: {
    commands: {
      analyze: {
        description: 'Analyse un lobby FACEIT et recommande les picks/bans',
        optRoomId: 'ID de la room FACEIT',
        optMonths: 'Période d\'historique (mois, défaut : 6)',
        optTeam: 'Ton équipe (1 ou 2)',
      },
      player: {
        description: 'Affiche le profil d\'un joueur FACEIT',
        optPseudo: 'Pseudo FACEIT',
      },
      live: {
        description: 'Vérifie si un joueur est en match et analyse le lobby',
        optPseudo: 'Pseudo FACEIT',
      },
      strats: {
        description: 'Affiche les stratégies compétitives CS2 pour une map',
        optMap: 'Map CS2',
      },
    },
    embeds: {
      pickBanTitle: '📊 Analyse Pick & Ban',
      pickBanFooter: '📊 Fiable | 📉 Moyen | ⚠️ Peu de données',
      elo: 'ELO',
      level: 'Niveau',
      winrate: 'Winrate',
      kd: 'K/D',
      hs: 'HS%',
      topMaps: '🟢 Meilleures maps',
      bottomMaps: '🔴 Pires maps',
      pistolRounds: '🔫 Pistol Rounds — {map}',
      gunRounds: '🎯 Gun Rounds — {map}',
      ctPistol: '🛡️ CT Pistol',
      tPistol: '💣 T Pistol',
      ctStrats: '🛡️ CT Strats',
      tExecutes: '💣 T Executes',
      antiEco: '💰 Anti-éco',
      forceBuy: '🔄 Force buy',
      errorTitle: '❌ Erreur',
      pickBanLine: '{decision}  **{map}** {advantage} {conf}\n> Toi : {us} | Eux : {them} | Data : {usMatches}+{themMatches} matchs',
    },
    messages: {
      inMatchLoading: '🔴 **{pseudo}** est en match ! Analyse en cours…',
      inMatch: '🔴 **{pseudo}** est en match !',
      notInMatchTitle: '💤 {pseudo} n\'est pas en match',
      lastMatchLabel: 'Dernier match : {timeAgo}',
      timeAgoMin: 'il y a {n} min',
      timeAgoH: 'il y a {n}h',
      timeAgoD: 'il y a {n}j',
      whichSide: '**Team 1 :** {t1}\n**Team 2 :** {t2}\n\nDe quel côté es-tu ?',
      mapNotFound: 'Map introuvable.',
    },
  },

  extension: {
    tagline: 'CS2 pick/ban & stats',
    tabs: {
      player: 'Joueur',
      analyze: 'Analyser',
      roomDetectedTitle: 'Room détectée',
    },
    player: {
      placeholder: 'Pseudo FACEIT',
      goBtn: 'Go',
      loading: '…',
      winrate: 'Winrate',
      kd: 'K/D',
      hs: 'HS%',
      maps: 'Maps',
    },
    analyze: {
      roomDetected: 'Room détectée : {id}…',
      noRoom: 'Aucune room détectée sur cet onglet',
      roomPlaceholder: 'Colle le room_id ici',
      myTeam: 'Mon équipe',
      autoBadge: 'auto',
      autoTip: 'Détectée via ton pseudo par défaut',
      team: 'Team {n}',
      startBtn: 'Lancer l\'analyse',
      loading: 'Analyse en cours…',
      periodNote: 'Historique des 6 derniers mois',
      noRoomError: 'Aucune room détectée — colle un room_id ci-dessous.',
      us: 'toi',
      them: 'eux',
      hoverHint: '💡 Survole une map pour voir le détail (winrate, K/D, ELO)',
      unknownError: 'Erreur inconnue',
      tooltip: {
        usLine: 'Toi — WR {wr} · K/D {kd} · ELO moyen {elo}',
        themLine: 'Eux — WR {wr} · K/D {kd} · ELO moyen {elo}',
        scoreLine: 'Score : {us} vs {them}  (avantage {adv})',
        confidenceLine: '{conf} — {usMatches}/{themMatches} matchs analysés',
        formulaLine: 'Score = 50% winrate + 30% K/D + 20% poids ELO, ajusté pour l\'incertitude sur les faibles samples',
      },
    },
    options: {
      title: 'Paramètres',
      apiUrl: 'URL de l\'API',
      apiUrlPlaceholder: 'http://localhost:8787',
      defaultPseudo: 'Pseudo par défaut',
      defaultPseudoPlaceholder: 'TonPseudoFaceit',
      apiKey: 'Clé API (optionnel — requise si le serveur l\'impose)',
      apiKeyPlaceholder: 'X-API-Key',
      save: 'Enregistrer',
      saved: 'Enregistré ✓',
    },
  },
}
