import type { Contour, Vertex } from "@/types/cad"
import { angleBetween, cross2d, normalize, polygonArea, subtract } from "@/utils/math"

export function isInternalCorner(a: Vertex, b: Vertex, c: Vertex): boolean {
  const ba = subtract(b, a)
  const cb = subtract(c, b)
  return cross2d(ba, cb) < 0
}

export function calculateBisectorAngle(
  a: Vertex,
  b: Vertex,
  c: Vertex,
): number {
  const v1 = normalize(subtract(a, b))
  const v2 = normalize(subtract(c, b))

  const bisector = {
    x: v1.x + v2.x,
    y: v1.y + v2.y,
  }

  return Math.atan2(bisector.y, bisector.x)
}

export function findInternalCorners(
  contour: Contour,
  maxAngle: number = 170,
): Array<{
  vertexIndex: number
  vertex: Vertex
  angle: number
  bisectorAngle: number
}> {
  const { vertices, edgeTypes } = contour
  const n = vertices.length

  if (!contour.closed || n < 3) return []

  const area = polygonArea(vertices)
  const isCW = area < 0

  const results: Array<{
    vertexIndex: number
    vertex: Vertex
    angle: number
    bisectorAngle: number
  }> = []

  for (let i = 0; i < n; i++) {
    if (edgeTypes) {
      const prevEdge = edgeTypes[(i - 1 + n) % n]
      const nextEdge = edgeTypes[i]
      if (prevEdge !== "line" || nextEdge !== "line") continue
    }

    const a = vertices[(i - 1 + n) % n]
    const b = vertices[i]
    const c = vertices[(i + 1) % n]

    const ba = subtract(b, a)
    const cb = subtract(c, b)
    const cross = cross2d(ba, cb)

    const isRightTurn = cross < 0
    const convex = isCW ? isRightTurn : !isRightTurn
    const isInternal = contour.isHole === true ? convex : !convex

    if (!isInternal) continue

    const angle = angleBetween(a, b, c)

    if (angle < Math.PI / 180 * 5 || angle > Math.PI / 180 * Math.min(175, maxAngle)) continue

    const bisectorAngle = calculateBisectorAngle(a, b, c)

    results.push({ vertexIndex: i, vertex: { x: b.x, y: b.y }, angle, bisectorAngle })
  }

  return results
}