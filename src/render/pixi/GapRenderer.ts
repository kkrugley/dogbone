import { Graphics } from "pixi.js"
import type { Container } from "pixi.js"
import type { Gap, Viewport } from "@/types/cad"

const GAP_LINE_COLOR = 0xef4444
const GAP_LINE_WIDTH = 2
const GAP_DOT_RADIUS = 3
const GAP_DOT_COLOR = 0xef4444

export function renderGaps(
  container: Container,
  gaps: Gap[],
  viewport: Viewport,
): void {
  container.removeChildren()

  const g = new Graphics()
  const { x: vx, y: vy, scale } = viewport

  for (const gap of gaps) {
    const x1 = gap.startVertex.x * scale + vx
    const y1 = gap.startVertex.y * scale + vy
    const x2 = gap.endVertex.x * scale + vx
    const y2 = gap.endVertex.y * scale + vy

    g.setStrokeStyle({
      color: GAP_LINE_COLOR,
      width: GAP_LINE_WIDTH,
    })
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke()

    g.fill({ color: GAP_DOT_COLOR })
    g.circle(x1, y1, GAP_DOT_RADIUS)
    g.fill()
    g.circle(x2, y2, GAP_DOT_RADIUS)
    g.fill()
  }

  container.addChild(g)
}