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
  const raw = extractVertices(segments)
  let vertices = raw.vertices
  let edgeTypes = raw.edgeTypes

  const wasClosed =
    vertices.length > 2 &&
    distance(vertices[0], vertices[vertices.length - 1]) < 0.01

  if (wasClosed && vertices.length > 2) {
    vertices = vertices.slice(0, -1)
    edgeTypes = edgeTypes.slice(0, -1)
  }

  return {
    id,
    closed: wasClosed,
    layer,
    segments,
    vertices,
    edgeTypes,
  }
}

export function splitIntoSeparateContours(
  segments: Segment[],
  layer: string,
  tolerance: number = 0.5,
): Contour[] {
  if (segments.length === 0) return []

  const remaining = [...segments]
  const contours: Contour[] = []

  while (remaining.length > 0) {
    const chain: Segment[] = [remaining.shift()!]

    let grown: boolean
    do {
      grown = false
      const chainEnd = chain[chain.length - 1].end
      const chainStart = chain[0].start

      for (let i = remaining.length - 1; i >= 0; i--) {
        const seg = remaining[i]

        if (distance(chainEnd, seg.start) < tolerance) {
          chain.push(seg)
          remaining.splice(i, 1)
          grown = true
        } else if (distance(chainEnd, seg.end) < tolerance) {
          chain.push({
            ...seg,
            start: { ...seg.end },
            end: { ...seg.start },
          })
          remaining.splice(i, 1)
          grown = true
        } else if (distance(chainStart, seg.end) < tolerance) {
          chain.unshift(seg)
          remaining.splice(i, 1)
          grown = true
        } else if (distance(chainStart, seg.start) < tolerance) {
          chain.unshift({
            ...seg,
            start: { ...seg.end },
            end: { ...seg.start },
          })
          remaining.splice(i, 1)
          grown = true
        }
      }
    } while (grown)

    const contour = buildContour(chain, uid(), layer)
    contours.push(contour)
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