import type { Contour, FileState, Segment, ToolParams, Vertex } from "@/types/cad"
import { distance } from "@/utils/math"
import { uid } from "@/utils/id"
import { findGaps, splitIntoSeparateContours } from "@/geometry/contour"
import { assessMachining } from "@/geometry/toolFit"
import { findInternalCorners } from "@/geometry/corner"
import { classifyContours } from "@/geometry/topology"
import { generateAllDogbones } from "@/geometry/dogbone"

interface DxfParsedEntity {
  type: string
  layer?: string
  handle?: number
  vertices?: Array<{ x: number; y: number; z?: number; bulge?: number }>
  center?: { x: number; y: number; z?: number }
  radius?: number
  startAngle?: number
  endAngle?: number
  shape?: boolean
}

type DxfParsedData = {
  entities: Record<string, DxfParsedEntity>
  tables?: { layers?: Record<string, unknown> }
  blocks?: Record<string, unknown>
}

function pointToVertex(p: { x: number; y: number }): Vertex {
  return { x: p.x, y: p.y }
}

function entityToSegment(entity: DxfParsedEntity): Segment | null {
  const layer = entity.layer ?? "0"

  switch (entity.type) {
    case "LINE": {
      const verts = entity.vertices
      if (!verts || verts.length < 2) return null
      return {
        id: uid(),
        type: "line",
        start: pointToVertex(verts[0]),
        end: pointToVertex(verts[verts.length - 1]),
        layer,
      }
    }

    case "ARC": {
      if (
        !entity.center ||
        entity.radius === undefined ||
        entity.startAngle === undefined ||
        entity.endAngle === undefined
      )
        return null

      return {
        id: uid(),
        type: "arc",
        start: {
          x: entity.center.x + entity.radius * Math.cos(entity.startAngle),
          y: entity.center.y + entity.radius * Math.sin(entity.startAngle),
        },
        end: {
          x: entity.center.x + entity.radius * Math.cos(entity.endAngle),
          y: entity.center.y + entity.radius * Math.sin(entity.endAngle),
        },
        bulge: Math.tan((((entity.endAngle - entity.startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / 4),
        center: pointToVertex(entity.center),
        radius: entity.radius,
        startAngle: (entity.startAngle * 180) / Math.PI,
        endAngle: (entity.endAngle * 180) / Math.PI,
        layer,
      }
    }

    case "CIRCLE": {
      if (!entity.center || entity.radius === undefined) return null
      return {
        id: uid(),
        type: "circle",
        start: pointToVertex(entity.center),
        end: pointToVertex(entity.center),
        center: pointToVertex(entity.center),
        radius: entity.radius,
        layer,
      }
    }

    case "LWPOLYLINE":
    case "POLYLINE": {
      const verts = entity.vertices
      if (!verts || verts.length < 2) return null
      const polyVerts = verts.map((v) => ({ x: v.x, y: v.y }))
      return {
        id: uid(),
        type: "polyline",
        start: { x: verts[0].x, y: verts[0].y },
        end: { x: verts[verts.length - 1].x, y: verts[verts.length - 1].y },
        vertices: polyVerts,
        layer,
      }
    }

    default:
      return null
  }
}

export function getDxfLayers(dxfData: DxfParsedData): string[] {
  const layers = new Set<string>()

  for (const ent of Object.values(dxfData.entities)) {
    layers.add(ent.layer ?? "0")
  }

  return Array.from(layers).sort()
}

export function convertDxfToFileState(
  dxfData: DxfParsedData,
  fileName: string,
  selectedLayers: string[],
  params: ToolParams,
): FileState {
  const allLayers = getDxfLayers(dxfData)
  const segments: Segment[] = []

  for (const ent of Object.values(dxfData.entities)) {
    if (selectedLayers.length > 0 && !selectedLayers.includes(ent.layer ?? "0")) continue

    const seg = entityToSegment(ent)
    if (seg?.type === "polyline" && ent.vertices) {
      const v = ent.vertices
      const count = ent.shape ? v.length : v.length - 1
      for (let i = 0; i < count; i++) {
        const a = v[i], b = v[(i + 1) % v.length]
        const bulge = a.bulge ?? 0
        if (!bulge) segments.push({ id: uid(), type: "line", start: pointToVertex(a), end: pointToVertex(b), layer: seg.layer })
        else {
          const dx = b.x - a.x, dy = b.y - a.y
          const center = { x: (a.x + b.x) / 2 - dy * (1 - bulge * bulge) / (4 * bulge),
            y: (a.y + b.y) / 2 + dx * (1 - bulge * bulge) / (4 * bulge) }
          const start = Math.atan2(a.y - center.y, a.x - center.x) * 180 / Math.PI
          const end = Math.atan2(b.y - center.y, b.x - center.x) * 180 / Math.PI
          segments.push({ id: uid(), type: "arc", start: pointToVertex(a), end: pointToVertex(b), layer: seg.layer,
            bulge, center, radius: Math.hypot(a.x - center.x, a.y - center.y),
            startAngle: bulge > 0 ? start : end, endAngle: bulge > 0 ? end : start })
        }
      }
    } else if (seg) segments.push(seg)
  }

  const ignoredSet = new Set(params.ignoredLayers.map((name) => name.toLowerCase()))

  const warnings: string[] = []
  const contours: Contour[] = []
  const allDogbones: ReturnType<typeof generateAllDogbones> = []
  const allGaps: ReturnType<typeof findGaps> = []

  const parts = splitIntoSeparateContours(segments, "default", params.tolerance)
  classifyContours(parts.filter((c) => !ignoredSet.has(c.layer.toLowerCase())))

  for (const contour of parts) {
    contours.push(contour)
    const hasIgnored = contour.segments.some((s) => ignoredSet.has(s.layer.toLowerCase()))
    if (!hasIgnored) {
      const dogbones = generateAllDogbones(contour, params)
      allDogbones.push(...dogbones)
      if (contour.isHole && params.filterLargeContours) {
        const excluded = findInternalCorners(contour, params.maxCornerAngle ?? 170).filter((corner) => {
          const i = corner.vertexIndex, n = contour.vertices.length
          return Math.min(distance(contour.vertices[(i - 1 + n) % n], corner.vertex),
            distance(corner.vertex, contour.vertices[(i + 1) % n])) > params.contourMaxThickness
        }).length
        if (excluded) warnings.push(`${excluded} large corner features were excluded by the size filter.`)
      }
      allGaps.push(...findGaps(contour, params.tolerance))
    }
  }

  const machining = assessMachining(contours, allDogbones, params)
  return {
    id: uid(),
    name: fileName.replace(/\.dxf$/i, ""),
    originalName: fileName,
    layers: allLayers,
    selectedLayers: selectedLayers.length > 0 ? selectedLayers : allLayers,
    contours,
    dogbones: allDogbones,
    gaps: allGaps,
    status: machining.complete ? "ready" : "review",
    machining,
    warnings,
  }
}
