import type { Contour, FileState, Segment, ToolParams, Vertex } from "@/types/cad"
import { uid } from "@/utils/id"
import { buildContour, findGaps, splitIntoSeparateContours } from "@/geometry/contour"
import { generateAllDogbones } from "@/geometry/dogbone"

interface DxfParsedEntity {
  type: string
  layer?: string
  handle?: number
  vertices?: Array<{ x: number; y: number; z?: number }>
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

  if (dxfData.tables?.layers) {
    for (const name of Object.keys(dxfData.tables.layers)) {
      if (name && name !== "0") layers.add(name)
    }
  }

  for (const ent of Object.values(dxfData.entities)) {
    if (ent.layer) layers.add(ent.layer)
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
    if (!ent.layer) continue
    if (selectedLayers.length > 0 && !selectedLayers.includes(ent.layer)) continue

    const seg = entityToSegment(ent)
    if (seg) segments.push(seg)
  }

  const ignoredSet = new Set(params.ignoredLayers)

  const contours: Contour[] = []
  const allDogbones: ReturnType<typeof generateAllDogbones> = []
  const allGaps: ReturnType<typeof findGaps> = []

  const parts = splitIntoSeparateContours(segments, "default", 0.5)

  for (const contour of parts) {
    contours.push(contour)
    const hasIgnored = contour.segments.some((s) => ignoredSet.has(s.layer))
    if (!hasIgnored) {
      allDogbones.push(...generateAllDogbones(contour, params))
      allGaps.push(...findGaps(contour, params.tolerance))
    }
  }

  return {
    id: uid(),
    name: fileName.replace(/\.dxf$/i, ""),
    originalName: fileName,
    layers: allLayers,
    selectedLayers: selectedLayers.length > 0 ? selectedLayers : allLayers,
    contours,
    dogbones: allDogbones,
    gaps: allGaps,
    status: "ready",
  }
}