import { Graphics } from "pixi.js"
import type { Container } from "pixi.js"
import type { Dogbone, Viewport } from "@/types/cad"

const FILL_COLOR = 0x3b82f6
const FILL_ALPHA = 0.15
const STROKE_COLOR = 0x3b82f6
const STROKE_WIDTH = 1

export function renderDogbones(
  container: Container,
  dogbones: Dogbone[],
  viewport: Viewport,
  _selectedId: string | null,
): void {
  container.removeChildren()

  const g = new Graphics()
  const { x: vx, y: vy, scale } = viewport

  for (const db of dogbones) {
    if (!db.enabled) continue
    const cx = db.vertex.x * scale + vx
    const cy = db.vertex.y * scale + vy
    const r = db.radius * scale

    g.fill({ color: FILL_COLOR, alpha: FILL_ALPHA })
    g.circle(cx, cy, r)
    g.fill()

    g.setStrokeStyle({ color: STROKE_COLOR, width: STROKE_WIDTH })
    g.circle(cx, cy, r)
    g.stroke()
  }

  container.addChild(g)
}