import { Graphics } from "pixi.js"
import type { Container } from "pixi.js"
import type { Contour, Dogbone, Viewport } from "@/types/cad"
import { applyDogboneCutouts } from "@/geometry/cutout"

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
  dogbones: Dogbone[],
): void {
  container.removeChildren()

  const g = new Graphics()
  const { x: vx, y: vy, scale } = viewport

  const dogbonesByContour = new Map<string, Dogbone[]>()
  for (const db of dogbones) {
    let arr = dogbonesByContour.get(db.contourId)
    if (!arr) {
      arr = []
      dogbonesByContour.set(db.contourId, arr)
    }
    arr.push(db)
  }

  for (const contour of contours) {
    const { vertices, closed } = contour
    if (vertices.length < 2) continue

    const color = closed ? CLOSED_COLOR : OPEN_COLOR
    g.setStrokeStyle({ color, width: STROKE_WIDTH })

    const contourDogbones = dogbonesByContour.get(contour.id)
    const hasEnabledDogbones = contourDogbones?.some((d) => d.enabled) ?? false

    if (closed && hasEnabledDogbones && contourDogbones) {
      const pts = applyDogboneCutouts(contour, contourDogbones)
      if (pts.length >= 2) {
        g.moveTo(pts[0].x * scale + vx, pts[0].y * scale + vy)
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i].x * scale + vx, pts[i].y * scale + vy)
        }
        g.lineTo(pts[0].x * scale + vx, pts[0].y * scale + vy)
        g.stroke()
      }
    } else {
      g.moveTo(vertices[0].x * scale + vx, vertices[0].y * scale + vy)
      for (let i = 1; i < vertices.length; i++) {
        g.lineTo(vertices[i].x * scale + vx, vertices[i].y * scale + vy)
      }
      if (closed) {
        g.lineTo(vertices[0].x * scale + vx, vertices[0].y * scale + vy)
      }
      g.stroke()
    }
  }

  container.addChild(g)
}