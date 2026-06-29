import type { Contour, Dogbone, Vertex } from "@/types/cad"
import { distance } from "@/utils/math"
import { calculateDogboneCircles } from "@/geometry/dogbone"

const ARC_SEGMENTS = 16

export interface ExportVertex {
  point: { x: number; y: number }
  bulge?: number
}

function lineCircleIntersections(
  p1: Vertex,
  p2: Vertex,
  center: Vertex,
  radius: number,
): Vertex[] {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const fx = p1.x - center.x
  const fy = p1.y - center.y

  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius

  let discriminant = b * b - 4 * a * c
  if (discriminant < 0) return []

  discriminant = Math.sqrt(discriminant)
  const t1 = (-b - discriminant) / (2 * a)
  const t2 = (-b + discriminant) / (2 * a)

  const result: Vertex[] = []
  if (t1 >= 0 && t1 <= 1) result.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy })
  if (t2 >= 0 && t2 <= 1) result.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy })
  return result
}

function generateArcPoints(
  p1: Vertex,
  p2: Vertex,
  center: Vertex,
  bisectorAngle: number,
  segments: number,
): Vertex[] {
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x)
  const a2 = Math.atan2(p2.y - center.y, p2.x - center.x)

  const diff = a2 - a1
  const sweep = ((diff % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)

  const sweep1 = sweep
  const sweep2 = sweep - Math.PI * 2

  const mid1 = a1 + sweep1 / 2
  const mid2 = a1 + sweep2 / 2
  // arc midpoint must point from circle center TOWARD corner = bisectorAngle + π
  const cornerAngle = bisectorAngle + Math.PI
  const ba = ((cornerAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)

  // minimum angular distance, capped at π
  let d1 = ((mid1 - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (d1 > Math.PI) d1 = Math.PI * 2 - d1
  let d2 = ((mid2 - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (d2 > Math.PI) d2 = Math.PI * 2 - d2

  const useSweep = d1 <= d2 ? sweep1 : sweep2

  const r = distance(center, p1)
  const points: Vertex[] = []
  for (let i = 1; i < segments; i++) {
    const frac = i / segments
    const angle = a1 + useSweep * frac
    points.push({
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    })
  }
  return points
}

function dogboneCutoutVertices(
  originalVertices: Vertex[],
  db: Dogbone,
): Vertex[] | null {
  const vi = db.vertexIndex
  const n = originalVertices.length

  const prev = originalVertices[(vi - 1 + n) % n]
  const curr = originalVertices[vi]
  const next = originalVertices[(vi + 1) % n]

  const circles = calculateDogboneCircles(db)
  const { center, radius } = circles[0]

  const edge1Hits = lineCircleIntersections(prev, curr, center, radius)
  const edge2Hits = lineCircleIntersections(curr, next, center, radius)

  const p1 = edge1Hits.find((p) => distance(p, curr) > 0.001)
  const p2 = edge2Hits.find((p) => distance(p, curr) > 0.001)

  if (!p1 || !p2) return null

  const arcPoints = generateArcPoints(p1, p2, center, db.bisectorAngle, ARC_SEGMENTS)

  const result: Vertex[] = []
  result.push(p1)
  result.push(...arcPoints)
  result.push(p2)
  return result
}

export function applyDogboneCutouts(contour: Contour, dogbones: Dogbone[]): Vertex[] {
  const enabled = dogbones.filter((d) => d.enabled)
  if (enabled.length === 0) return [...contour.vertices]

  const sorted = [...enabled].sort((a, b) => b.vertexIndex - a.vertexIndex)

  const originalVertices = contour.vertices
  let result = [...originalVertices]
  for (const db of sorted) {
    const cutout = dogboneCutoutVertices(originalVertices, db)
    if (!cutout) continue

    const before = result.slice(0, db.vertexIndex)
    const after = result.slice(db.vertexIndex + 1)
    result = [...before, ...cutout, ...after]
  }

  return result
}

function computeBulge(
  p1: Vertex,
  p2: Vertex,
  center: Vertex,
  bisectorAngle: number,
): number {
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x)
  const a2 = Math.atan2(p2.y - center.y, p2.x - center.x)

  const diff = a2 - a1
  const sweep = ((diff % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)

  const sweep1 = sweep
  const sweep2 = sweep - Math.PI * 2

  const mid1 = a1 + sweep1 / 2
  const mid2 = a1 + sweep2 / 2
  const cornerAngle = bisectorAngle + Math.PI
  const ba = ((cornerAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)

  let d1 = ((mid1 - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (d1 > Math.PI) d1 = Math.PI * 2 - d1
  let d2 = ((mid2 - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (d2 > Math.PI) d2 = Math.PI * 2 - d2

  const useSweep = d1 <= d2 ? sweep1 : sweep2

  return Math.tan(useSweep / 4)
}

export function applyDogboneCutoutsForExport(
  contour: Contour,
  dogbones: Dogbone[],
): ExportVertex[] {
  const enabled = dogbones.filter((d) => d.enabled)
  if (enabled.length === 0)
    return contour.vertices.map((v) => ({ point: v }))

  const sorted = [...enabled].sort((a, b) => b.vertexIndex - a.vertexIndex)

  const originalVertices = contour.vertices
  let result: ExportVertex[] = originalVertices.map((v) => ({ point: v }))

  for (const db of sorted) {
    const vi = db.vertexIndex
    const n = originalVertices.length

    const prev = originalVertices[(vi - 1 + n) % n]
    const curr = originalVertices[vi]
    const next = originalVertices[(vi + 1) % n]

    const circles = calculateDogboneCircles(db)
    const { center, radius } = circles[0]

    const edge1Hits = lineCircleIntersections(prev, curr, center, radius)
    const edge2Hits = lineCircleIntersections(curr, next, center, radius)

    const p1 = edge1Hits.find((p) => distance(p, curr) > 0.001)
    const p2 = edge2Hits.find((p) => distance(p, curr) > 0.001)

    if (!p1 || !p2) continue

    const bulge = computeBulge(p1, p2, center, db.bisectorAngle)

    const before = result.slice(0, vi)
    const after = result.slice(vi + 1)
    result = [...before, { point: p1, bulge }, { point: p2 }, ...after]
  }

  return result
}