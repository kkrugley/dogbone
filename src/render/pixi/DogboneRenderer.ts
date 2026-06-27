import { Graphics } from "pixi.js"
import type { Container } from "pixi.js"
import type { Dogbone, Viewport } from "@/types/cad"

const FILL_COLOR = 0x3b82f6
const FILL_ALPHA = 0.3
const DIRECTION_COLOR = 0x3b82f6
const DIRECTION_WIDTH = 2

const SELECTED_FILL_COLOR = 0x2563eb
const SELECTED_FILL_ALPHA = 0.5
const SELECTED_DIRECTION_COLOR = 0x2563eb
const SELECTED_DIRECTION_WIDTH = 3

const DISABLED_FILL_COLOR = 0x9ca3af
const DISABLED_FILL_ALPHA = 0.2
const DISABLED_DIRECTION_COLOR = 0x9ca3af
const DISABLED_DIRECTION_WIDTH = 1

export function renderDogbones(
  container: Container,
  dogbones: Dogbone[],
  viewport: Viewport,
  selectedId: string | null,
): void {
  container.removeChildren()

  const g = new Graphics()
  const { x: vx, y: vy, scale } = viewport

  for (const db of dogbones) {
    const isSelected = db.id === selectedId
    const cx = db.vertex.x * scale + vx
    const cy = db.vertex.y * scale + vy
    const r = db.radius * scale

    if (!db.enabled) {
      g.fill({
        color: DISABLED_FILL_COLOR,
        alpha: DISABLED_FILL_ALPHA,
      })
      g.circle(cx, cy, r)
      g.fill()

      if (r > 0) {
        g.setStrokeStyle({
          color: DISABLED_DIRECTION_COLOR,
          width: DISABLED_DIRECTION_WIDTH,
        })
        const ex = cx + db.direction.x * r
        const ey = cy + db.direction.y * r
        g.moveTo(cx, cy)
        g.lineTo(ex, ey)
        g.stroke()
      }
    } else if (isSelected) {
      g.fill({
        color: SELECTED_FILL_COLOR,
        alpha: SELECTED_FILL_ALPHA,
      })
      g.circle(cx, cy, r)
      g.fill()

      if (r > 0) {
        g.setStrokeStyle({
          color: SELECTED_DIRECTION_COLOR,
          width: SELECTED_DIRECTION_WIDTH,
        })
        const ex = cx + db.direction.x * r
        const ey = cy + db.direction.y * r
        g.moveTo(cx, cy)
        g.lineTo(ex, ey)
        g.stroke()
      }
    } else {
      g.fill({
        color: FILL_COLOR,
        alpha: FILL_ALPHA,
      })
      g.circle(cx, cy, r)
      g.fill()

      if (r > 0) {
        g.setStrokeStyle({
          color: DIRECTION_COLOR,
          width: DIRECTION_WIDTH,
        })
        const ex = cx + db.direction.x * r
        const ey = cy + db.direction.y * r
        g.moveTo(cx, cy)
        g.lineTo(ex, ey)
        g.stroke()
      }
    }
  }

  container.addChild(g)
}