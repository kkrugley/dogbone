import type { Contour, Dogbone, Vertex } from "@/types/cad"
import { mergeCutouts } from "@/geometry/mergedCutout"
import { distance } from "@/utils/math"
import { calculateDogboneCircles } from "@/geometry/dogbone"

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
  if (a < 1e-20 || discriminant < -1e-10 * Math.max(1, b * b, Math.abs(4 * a * c))) return []
  discriminant = Math.max(0, discriminant)

  discriminant = Math.sqrt(discriminant)
  const t1 = (-b - discriminant) / (2 * a)
  const t2 = (-b + discriminant) / (2 * a)

  const result: Vertex[] = []
  if (t1 >= -1e-8 && t1 <= 1 + 1e-8) result.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy })
  if (t2 >= -1e-8 && t2 <= 1 + 1e-8) result.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy })
  return result
}

export function applyDogboneCutouts(contour: Contour, dogbones: Dogbone[], chordError: number = 0.001): Vertex[] {
  const pts = applyDogboneCutoutsForExport(contour, dogbones)
  const result: Vertex[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i].point, b = pts[(i + 1) % pts.length].point
    result.push(a)
    const bulge = pts[i].bulge ?? 0
    if (!bulge || (!contour.closed && i === pts.length - 1)) continue
    const dx = b.x - a.x, dy = b.y - a.y
    const center = { x: (a.x + b.x) / 2 - dy * (1 - bulge * bulge) / (4 * bulge),
      y: (a.y + b.y) / 2 + dx * (1 - bulge * bulge) / (4 * bulge) }
    const radius = distance(a, center)
    const start = Math.atan2(a.y - center.y, a.x - center.x)
    const sweep = 4 * Math.atan(bulge)
    const maxAngle = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - Math.max(1e-6, chordError) / radius)))
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / Math.min(Math.PI / 24, maxAngle)))
    for (let j = 1; j < steps; j++) {
      const angle = start + sweep * j / steps
      result.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) })
    }
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
    return contour.vertices.map((v, i) => ({ point: v, bulge: contour.bulges?.[i] }))

  if (enabled.some((d) => d.requiresBoolean)) return mergeCutouts(contour, enabled)

  const sorted = [...enabled].sort((a, b) => b.vertexIndex - a.vertexIndex)

  const originalVertices = contour.vertices
  let result: ExportVertex[] = originalVertices.map((v, i) => ({ point: v, bulge: contour.bulges?.[i] }))

  for (const db of sorted) {
    const vi = db.vertexIndex
    const n = originalVertices.length

    const prev = originalVertices[(vi - 1 + n) % n]
    const curr = originalVertices[vi]
    const next = originalVertices[(vi + 1) % n]

    const circles = calculateDogboneCircles(db)
    const { center, radius } = circles[0]

    const tangentAtCorner = (p: Vertex) => db.type === "tbone" &&
      Math.abs((center.x - curr.x) * (p.x - curr.x) + (center.y - curr.y) * (p.y - curr.y)) < 1e-9 * radius * distance(p, curr)
    const edge1Hits = tangentAtCorner(prev) ? [curr] : lineCircleIntersections(prev, curr, center, radius)
    const edge2Hits = tangentAtCorner(next) ? [curr] : lineCircleIntersections(curr, next, center, radius)

    const p1 = edge1Hits.sort((a, b) => distance(b, curr) - distance(a, curr))
      .find((p) => db.type === "tbone" || distance(p, curr) > 0.001)
    const p2 = edge2Hits.sort((a, b) => distance(b, curr) - distance(a, curr))
      .find((p) => db.type === "tbone" || distance(p, curr) > 0.001)

    if (!p1 || !p2) continue

    const bulge = computeBulge(p1, p2, center, db.bisectorAngle)

    const before = result.slice(0, vi)
    const after = result.slice(vi + 1)
    result = [...before, { point: p1, bulge }, { point: p2 }, ...after]
  }

  return result
}