import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { Resvg } from "@resvg/resvg-js"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <g transform="translate(100, 100)">
    <rect width="80" height="80" rx="12" fill="#3b82f6" />
    <text x="40" y="56" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="#ffffff" text-anchor="middle">D</text>
  </g>
  <text x="204" y="148" font-family="system-ui, sans-serif" font-size="64" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">DogBone CNC</text>
  <text x="204" y="210" font-family="system-ui, sans-serif" font-size="32" fill="#94a3b8">DXF Dogbone Corner Fillet Tool</text>
  <text x="204" y="260" font-family="system-ui, sans-serif" font-size="24" fill="#64748b">Import DXF · Apply corner relief · Export</text>
  <rect x="204" y="300" width="180" height="44" rx="22" fill="#3b82f6" />
  <text x="294" y="328" font-family="system-ui, sans-serif" font-size="20" font-weight="600" fill="#ffffff" text-anchor="middle">Try it free</text>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: "#0f172a",
})

const png = resvg.render().asPng()
const outDir = join(import.meta.dirname, "..", "public")
const outPath = join(outDir, "og-image.png")

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, png)

console.log(`OG image generated: ${outPath} (${png.length} bytes)`)
