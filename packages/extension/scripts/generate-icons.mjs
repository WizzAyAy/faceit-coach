#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'src', 'assets')

const svg = await readFile(join(assets, 'logo.svg'))

const sizes = [16, 32, 48, 128]

for (const size of sizes) {
  const out = join(assets, `icon-${size}.png`)
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  console.log(`✓ ${out}`)
}
