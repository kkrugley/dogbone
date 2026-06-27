import type { Contour, Dogbone, Vertex } from "@/types/cad"
import type { MultiPolygon, Polygon } from "martinez-polygon-clipping"
import { diff } from "martinez-polygon-clipping"
import { calculateDogboneCircles } from "@/geometry/dogbone"

const CIRCLE_SEGMENTS = 48

type Ring = [number, number][]

function circleToPolygon(center: Vertex, r: number): Polygon {
  const ring: Ring = []
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2
    ring.push([center.x + Math.cos(a) * r, center.y + Math.sin(a) * r])
  }
  return [ring]
}

function contourToPolygon(contour: Contour): Polygon {
  return [contour.vertices.map((v) => [v.x, v.y] as [number, number])]
}

function isMultiPolygon(g: Polygon | MultiPolygon): g is MultiPolygon {
  if (g.length === 0) return false
  const first = g[0]
  if (!Array.isArray(first) || first.length === 0) return false
  return Array.isArray(first[0])
}

function flattenRings(result: Polygon | MultiPolygon): Ring[] {
  if (isMultiPolygon(result)) {
    return result.flat() as Ring[]
  }
  return result as Ring[]
}

export function subtractDogbones(
  contour: Contour,
  dogbones: Dogbone[],
): Ring[] {
  const enabled = dogbones.filter((d) => d.enabled)

  if (enabled.length === 0) {
    return [contour.vertices.map((v) => [v.x, v.y] as [number, number])]
  }

  let subject: Polygon | MultiPolygon | null = contourToPolygon(contour)

  for (const db of enabled) {
    if (subject === null) break
    const circles = calculateDogboneCircles(db)
    for (const circle of circles) {
      const clipping = circleToPolygon(circle.center, circle.radius)
      subject = diff(subject, clipping)
      if (subject === null) break
    }
  }

  if (subject === null) return []

  return flattenRings(subject)
}

export function polygonToVertices(poly: Ring): Vertex[] {
  return poly.map(([x, y]) => ({ x, y }))
}