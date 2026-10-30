import { applyDogboneCutouts } from "@/geometry/cutout"
import type { Contour, Vertex } from "@/types/cad"

function contains(vertices: Vertex[], p: Vertex): boolean {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j]
    if ((a.y > p.y) !== (b.y > p.y) &&
      p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Nesting parity describes material independently of DXF winding. */
export function classifyContours(contours: Contour[]): void {
  const polygons = new Map(contours.map((c) => [c, applyDogboneCutouts(c, [])]))
  for (const c of contours) {
    if (!c.closed || c.vertices.length < 3) continue
    c.isHole = contours.filter((other) => other !== c && other.closed &&
      other.vertices.length >= 3 && c.vertices.every((v) => contains(polygons.get(other)!, v))).length % 2 === 1
  }
}
