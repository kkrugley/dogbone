import { Graphics } from "pixi.js"
import type { Container } from "pixi.js"
import type { Contour, Viewport, Vertex } from "@/types/cad"

const CLOSED_COLOR = 0x1a1a2e
const OPEN_COLOR = 0xef4444
const STROKE_WIDTH = 2

export function getContoursBounds(contours: Contour[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const contour of contours) {
    for (const v of contour.vertices) {
      if (v.x < minX) minX = v.x
      if (v.y < minY) minY = v.y
      if (v.x > maxX) maxX = v.x
      if (v.y > maxY) maxY = v.y
    }
  }

  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

export function fitViewport(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20,
): Viewport {
  const dataWidth = bounds.maxX - bounds.minX || 1
  const dataHeight = bounds.maxY - bounds.minY || 1

  const scaleX = (canvasWidth - padding * 2) / dataWidth
  const scaleY = (canvasHeight - padding * 2) / dataHeight
  const scale = Math.min(scaleX, scaleY, 100)

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return {
    x: canvasWidth / 2 - centerX * scale,
    y: canvasHeight / 2 - centerY * scale,
    scale,
  }
}

export function renderContours(
  container: Container,
  contours: Contour[],
  viewport: Viewport,
): void {
  container.removeChildren()

  const g = new Graphics()
  const { x: vx, y: vy, scale } = viewport

  for (const contour of contours) {
    const { vertices, closed } = contour
    if (vertices.length < 2) continue

    const color = closed ? CLOSED_COLOR : OPEN_COLOR
    g.setStrokeStyle({ color, width: STROKE_WIDTH })

    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i]
      const b = vertices[i + 1]
      g.moveTo(a.x * scale + vx, a.y * scale + vy)
      g.lineTo(b.x * scale + vx, b.y * scale + vy)
      g.stroke()
    }

    if (closed && vertices.length >= 2) {
      const first = vertices[0]
      const last = vertices[vertices.length - 1]
      g.moveTo(last.x * scale + vx, last.y * scale + vy)
      g.lineTo(first.x * scale + vx, first.y * scale + vy)
      g.stroke()
    }
  }

  container.addChild(g)
}