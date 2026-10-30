import type { Contour, Gap, Segment, Vertex } from "@/types/cad"
import { distance } from "@/utils/math"
import { uid } from "@/utils/id"

export function extractVertices(segments: Segment[]): { vertices: Vertex[]; edgeTypes: Array<"line" | "arc"> } {
  const resultVertices: Vertex[] = []
  const resultEdgeTypes: Array<"line" | "arc"> = []

  for (const seg of segments) {
    const isLine = seg.type === "line" || seg.type === "polyline"
    const edgeType: "line" | "arc" = isLine ? "line" : "arc"

    const segVerts: Vertex[] = []
    if (seg.type === "polyline" && seg.vertices) {
      for (const v of seg.vertices) {
        segVerts.push({ x: v.x, y: v.y })
      }
    } else {
      segVerts.push({ x: seg.start.x, y: seg.start.y })
      if (seg.type !== "circle") {
        segVerts.push({ x: seg.end.x, y: seg.end.y })
      }
    }

    for (const v of segVerts) {
      if (
        resultVertices.length === 0 ||
        distance(resultVertices[resultVertices.length - 1], v) > 1e-10
      ) {
        resultVertices.push(v)
        resultEdgeTypes.push(edgeType)
      }
    }
  }

  return { vertices: resultVertices, edgeTypes: resultEdgeTypes }
}

export function extractVerticesFlat(segments: Segment[]): Vertex[] {
  return extractVertices(segments).vertices
}

export function isContourClosed(
  vertices: Vertex[],
  tolerance: number,
): boolean {
  if (vertices.length < 2) return false
  return distance(vertices[0], vertices[vertices.length - 1]) < tolerance
}

export function findGaps(contour: Contour, tolerance: number): Gap[] {
  const { segments } = contour
  const gaps: Gap[] = []

  for (let i = 0; i < segments.length; i++) {
    const current = segments[i]
    const next = segments[(i + 1) % segments.length]

    const gapDist = distance(current.end, next.start)

    if (gapDist >= tolerance) {
      gaps.push({
        id: uid(),
        contourId: contour.id,
        startVertex: { x: current.end.x, y: current.end.y },
        endVertex: { x: next.start.x, y: next.start.y },
        distance: gapDist,
        tolerance,
        canAutoFix: true,
      })
    }
  }

  return gaps
}

export function buildContour(
  segments: Segment[],
  id: string,
  layer: string,
): Contour {
  const vertices = segments.map((s) => ({ ...s.start }))
  const bulges = segments.map((s) => s.bulge ?? 0)
  const closed = segments.length > 0 &&
    distance(segments[0].start, segments[segments.length - 1].end) < 0.01
  if (!closed && segments.length) {
    vertices.push({ ...segments[segments.length - 1].end })
    bulges.push(0)
  }
  return { id, closed, layer: segments[0]?.layer ?? layer, segments, vertices,
    bulges, edgeTypes: bulges.map((b) => b ? "arc" : "line") }

}

export function splitIntoSeparateContours(
  segments: Segment[],
  layer: string,
  tolerance: number = 0.5,
): Contour[] {
  if (segments.length === 0) return []

  const remaining = [...segments]
  const contours: Contour[] = []
  const reverse = (s: Segment): Segment => ({ ...s, start: s.end, end: s.start,
    bulge: -(s.bulge ?? 0), vertices: s.vertices?.slice().reverse() })
  while (remaining.length) {
    const chain = [remaining.shift()!]
    if (chain[0].type !== "circle") {
      while (distance(chain[0].start, chain[chain.length - 1].end) >= 0.01) {
        const end = chain[chain.length - 1].end
        const start = chain[0].start
        let found = false
        for (let i = 0; i < remaining.length; i++) {
          const s = remaining[i]
          if (s.layer !== chain[0].layer || s.type === "circle") continue
          if (distance(end, s.start) < tolerance) chain.push(s)
          else if (distance(end, s.end) < tolerance) chain.push(reverse(s))
          else if (distance(start, s.end) < tolerance) chain.unshift(s)
          else if (distance(start, s.start) < tolerance) chain.unshift(reverse(s))
          else continue
          remaining.splice(i, 1)
          found = true
          break // Recompute both endpoints after every addition.
        }
        if (!found) break
      }
    }
    contours.push(buildContour(chain, uid(), layer))
  }

  return contours
}

export function closeContour(contour: Contour, gaps: Gap[]): Contour {
  const fixableGaps = gaps.filter((g) => g.canAutoFix)

  if (fixableGaps.length === 0) {
    return { ...contour, closed: isContourClosed(contour.vertices, 0.01) }
  }

  for (const gap of fixableGaps) {
    contour.vertices.push({ x: gap.endVertex.x, y: gap.endVertex.y })
  }

  return {
    ...contour,
    vertices: contour.vertices,
    closed: isContourClosed(contour.vertices, 0.01),
  }
}