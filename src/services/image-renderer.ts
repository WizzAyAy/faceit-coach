import type { MapScore, PickBanResult } from '../types/index.js'
import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { BAN_THRESHOLD, MAP_CT_BIAS, MAP_DISPLAY_NAMES, PICK_THRESHOLD } from '../utils/constants.js'

// --- Font registration ---
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fontsDir = join(__dirname, '..', 'assets', 'fonts')

try {
  GlobalFonts.registerFromPath(join(fontsDir, 'Inter-Bold.ttf'), 'Inter Bold')
  GlobalFonts.registerFromPath(join(fontsDir, 'Inter-Regular.ttf'), 'Inter')
}
catch {
  // Fonts may not be found when running from dist/ — graceful fallback
}

// --- Color constants ---
const BG_COLOR = '#1F1F22'
const CARD_BG = '#2A2A2E'
const ORANGE = '#FF5500'
const GREY_TEXT = '#8A8A8E'
const MUTED_GREY = '#6B6B6F'
const WHITE = '#FFFFFF'
const GREEN = '#57F287'
const RED = '#ED4245'
const YELLOW = '#FEE75C'
const BAR_TRACK = '#3A3A3E'

// --- Layout constants ---
const WIDTH = 800
const HEADER_HEIGHT = 56
const CARD_HEIGHT = 130
const CARD_GAP = 10
const FOOTER_HEIGHT = 36
const PADDING = 20
const BAR_WIDTH = 280
const BAR_HEIGHT = 14
const LEFT_BORDER_WIDTH = 4

function getVerdictColor(advantage: number): string {
  if (advantage >= PICK_THRESHOLD)
    return GREEN
  if (advantage <= BAN_THRESHOLD)
    return RED
  return YELLOW
}

function getVerdictText(advantage: number): string {
  if (advantage >= PICK_THRESHOLD)
    return 'PICK'
  if (advantage <= BAN_THRESHOLD)
    return 'BAN'
  return 'NEUTRE'
}

function getRecommendedSide(map: string): string {
  const ctBias = MAP_CT_BIAS[map] ?? 0.5
  return ctBias >= 0.5 ? 'CT' : 'T'
}

function roundedRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5)
  ctx.arc(x + w - radius, y + radius, radius, Math.PI * 1.5, 0)
  ctx.arc(x + w - radius, y + h - radius, radius, 0, Math.PI * 0.5)
  ctx.arc(x + radius, y + h - radius, radius, Math.PI * 0.5, Math.PI)
  ctx.closePath()
  ctx.fill()
}

function drawProgressBar(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  x: number,
  y: number,
  value: number,
  fillColor: string,
): void {
  const radius = BAR_HEIGHT / 2

  // Track
  ctx.fillStyle = BAR_TRACK
  roundedRect(ctx, x, y, BAR_WIDTH, BAR_HEIGHT, radius)

  // Fill
  const fillWidth = Math.max(BAR_HEIGHT, BAR_WIDTH * Math.min(1, Math.max(0, value)))
  ctx.fillStyle = fillColor
  roundedRect(ctx, x, y, fillWidth, BAR_HEIGHT, radius)
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatSignedPercent(value: number): string {
  const pct = Math.round(value * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

function getConfidenceText(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'Confiance haute'
    case 'medium': return 'Confiance moyenne'
    case 'low': return 'Confiance basse'
  }
}

function drawMapCard(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  mapScore: MapScore,
  y: number,
): void {
  const cardX = PADDING
  const cardW = WIDTH - PADDING * 2

  // Card background
  ctx.fillStyle = CARD_BG
  roundedRect(ctx, cardX, y, cardW, CARD_HEIGHT, 8)

  // Left border (verdict color)
  const verdictColor = getVerdictColor(mapScore.advantage)
  ctx.fillStyle = verdictColor
  roundedRect(ctx, cardX, y, LEFT_BORDER_WIDTH + 8, CARD_HEIGHT, 8)
  // Cover the right rounded part of the border strip
  ctx.fillStyle = CARD_BG
  roundedRect(ctx, cardX + LEFT_BORDER_WIDTH, y, 12, CARD_HEIGHT, 0)

  const contentX = cardX + LEFT_BORDER_WIDTH + 16
  const mapName = (MAP_DISPLAY_NAMES[mapScore.map] ?? mapScore.map).toUpperCase()
  const verdict = getVerdictText(mapScore.advantage)
  const side = getRecommendedSide(mapScore.map)

  // Row 1: Map name + verdict + side
  const row1Y = y + 20
  ctx.fillStyle = WHITE
  ctx.font = '16px "Inter Bold", sans-serif'
  ctx.fillText(mapName, contentX, row1Y)
  const mapNameWidth = ctx.measureText(mapName).width

  ctx.fillStyle = verdictColor
  ctx.font = '14px "Inter Bold", sans-serif'
  ctx.fillText(`  ${verdict}`, contentX + mapNameWidth, row1Y)
  const verdictWidth = ctx.measureText(`  ${verdict}`).width

  ctx.fillStyle = GREY_TEXT
  ctx.font = '12px "Inter", sans-serif'
  ctx.fillText(`  Side recommandé: ${side}`, contentX + mapNameWidth + verdictWidth, row1Y)

  // Bars section
  const barsX = contentX
  const labelWidth = 40
  const barStartX = barsX + labelWidth
  const percentX = barStartX + BAR_WIDTH + 8

  // Row 2: "Vous" bar
  const row2Y = y + 40
  ctx.fillStyle = GREY_TEXT
  ctx.font = '12px "Inter", sans-serif'
  ctx.fillText('Vous', barsX, row2Y + 10)
  drawProgressBar(ctx, barStartX, row2Y, mapScore.ourScore, ORANGE)
  ctx.fillStyle = WHITE
  ctx.font = '12px "Inter Bold", sans-serif'
  ctx.fillText(formatPercent(mapScore.ourScore), percentX, row2Y + 10)

  // Row 3: "Eux" bar
  const row3Y = y + 60
  ctx.fillStyle = GREY_TEXT
  ctx.font = '12px "Inter", sans-serif'
  ctx.fillText('Eux', barsX, row3Y + 10)
  drawProgressBar(ctx, barStartX, row3Y, mapScore.theirScore, MUTED_GREY)
  ctx.fillStyle = WHITE
  ctx.font = '12px "Inter Bold", sans-serif'
  ctx.fillText(formatPercent(mapScore.theirScore), percentX, row3Y + 10)

  // Row 4: Advantage + confidence + matches
  const row4Y = y + 92
  ctx.fillStyle = verdictColor
  ctx.font = '14px "Inter Bold", sans-serif'
  const advantageText = formatSignedPercent(mapScore.advantage)
  ctx.fillText(advantageText, contentX, row4Y)
  const advWidth = ctx.measureText(advantageText).width

  ctx.fillStyle = GREY_TEXT
  ctx.font = '12px "Inter", sans-serif'
  const confidenceStr = `  ${getConfidenceText(mapScore.confidence)}  |  Vous: ${mapScore.ourTotalMatches} matchs  —  Eux: ${mapScore.theirTotalMatches} matchs`
  ctx.fillText(confidenceStr, contentX + advWidth, row4Y)

  // Row 5: Breakdown
  const row5Y = y + 112
  ctx.fillStyle = MUTED_GREY
  ctx.font = '11px "Inter", sans-serif'
  const ourBk = mapScore.ourBreakdown
  const theirBk = mapScore.theirBreakdown
  const breakdownText = `Vous: WR ${formatPercent(ourBk.winrate)} | K/D ${formatPercent(ourBk.kd)} | ELO ${formatPercent(ourBk.elo)}    Eux: WR ${formatPercent(theirBk.winrate)} | K/D ${formatPercent(theirBk.kd)} | ELO ${formatPercent(theirBk.elo)}`
  ctx.fillText(breakdownText, contentX, row5Y)
}

export async function renderAnalyzeImage(result: PickBanResult): Promise<Buffer> {
  const mapCount = result.allMaps.length
  const height = HEADER_HEIGHT + mapCount * (CARD_HEIGHT + CARD_GAP) + FOOTER_HEIGHT + PADDING

  const canvas = createCanvas(WIDTH, height)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, WIDTH, height)

  // Header
  ctx.font = '20px "Inter Bold", sans-serif'
  ctx.fillStyle = ORANGE
  const headerLabel = 'FACEIT COACH'
  ctx.fillText(headerLabel, PADDING, 36)
  const headerLabelWidth = ctx.measureText(headerLabel).width

  ctx.fillStyle = GREY_TEXT
  ctx.font = '20px "Inter", sans-serif'
  ctx.fillText(' ANALYSE PICK & BAN', PADDING + headerLabelWidth, 36)

  // Separator line
  ctx.strokeStyle = '#3A3A3E'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, HEADER_HEIGHT - 4)
  ctx.lineTo(WIDTH - PADDING, HEADER_HEIGHT - 4)
  ctx.stroke()

  // Map cards
  for (let i = 0; i < result.allMaps.length; i++) {
    const cardY = HEADER_HEIGHT + i * (CARD_HEIGHT + CARD_GAP)
    drawMapCard(ctx, result.allMaps[i], cardY)
  }

  // Footer legend
  const footerY = HEADER_HEIGHT + mapCount * (CARD_HEIGHT + CARD_GAP) + 16
  ctx.fillStyle = MUTED_GREY
  ctx.font = '11px "Inter", sans-serif'
  ctx.fillText(
    `■ PICK (avantage ≥ ${Math.round(PICK_THRESHOLD * 100)}%)   ■ BAN (avantage ≤ ${Math.round(BAN_THRESHOLD * 100)}%)   ■ NEUTRE`,
    PADDING,
    footerY,
  )

  // Color the legend squares
  const legendY = footerY - 8
  ctx.fillStyle = GREEN
  ctx.fillRect(PADDING, legendY, 8, 8)
  const pickLegend = `■ PICK (avantage ≥ ${Math.round(PICK_THRESHOLD * 100)}%)   `
  const pickWidth = ctx.measureText(pickLegend).width
  ctx.fillStyle = RED
  ctx.fillRect(PADDING + pickWidth, legendY, 8, 8)
  const banLegend = `■ BAN (avantage ≤ ${Math.round(BAN_THRESHOLD * 100)}%)   `
  const banWidth = ctx.measureText(banLegend).width
  ctx.fillStyle = YELLOW
  ctx.fillRect(PADDING + pickWidth + banWidth, legendY, 8, 8)

  return Buffer.from(await canvas.encode('png'))
}
