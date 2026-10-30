import GeoJSONReader from "jsts/org/locationtech/jts/io/GeoJSONReader.js"
import BufferOp from "jsts/org/locationtech/jts/operation/buffer/BufferOp.js"
import OverlayOp from "jsts/org/locationtech/jts/operation/overlay/OverlayOp.js"
import IsValidOp from "jsts/org/locationtech/jts/operation/valid/IsValidOp.js"
import type { Contour, Dogbone, ToolParams } from "@/types/cad"
import { applyDogboneCutouts } from "@/geometry/cutout"

const CHORD_ERROR = 0.001
const FIT_TOLERANCE = 0.01
const MIN_MISSED_AREA = 0.01
const reader = new GeoJSONReader()
const offset = (geometry: JtsGeometry, amount: number) => BufferOp.bufferOp(geometry, amount, 64)

export interface MachiningIssue {
  contourId: string
  code: "unreachable" | "open" | "invalid" | "tool-size"
  message: string
  missedArea?: number
}

const cache = new WeakMap<Contour, { key: string; issues: MachiningIssue[] }>()

export interface MachiningCheck {
  complete: boolean
  toolDiameter: number
  issues: MachiningIssue[]
}

/** Planar cutter-sweep check, independent of corner generation and DXF counts. */
export function assessMachining(contours: Contour[], dogbones: Dogbone[], params: ToolParams): MachiningCheck {
  const issues: MachiningIssue[] = []
  const ignored = new Set(params.ignoredLayers.map((name) => name.toLowerCase()))
  const nominalRadius = params.toolDiameter / 2
  // Inscribed arc chords and round offset joins must not reject an exact-radius
  // cutter disk. The 2 µm allowance is below the declared 0.01 mm fit tolerance.
  const radius = Math.max(nominalRadius / 2, nominalRadius - 2 * CHORD_ERROR)
  if (!(nominalRadius > 0) || !Number.isFinite(nominalRadius)) return { complete: false, toolDiameter: params.toolDiameter,
    issues: [{ contourId: "", code: "tool-size", message: "Enter a positive cutter diameter." }] }
  const byContour = new Map<string, Dogbone[]>()
  for (const d of dogbones) {
    const list = byContour.get(d.contourId) ?? []
    list.push(d); byContour.set(d.contourId, list)
  }
  for (const contour of contours) {
    if (ignored.has(contour.layer.toLowerCase())) continue
    if (!contour.closed) {
      issues.push({ contourId: contour.id, code: "open", message: `Layer ${contour.layer}: close the cutting contour before machining.` })
      continue
    }
    if (contour.segments.length === 1 && contour.segments[0].type === "circle") {
      if ((contour.segments[0].radius ?? 0) < radius - 1e-5) issues.push({ contourId: contour.id, code: "tool-size", message: "The cutter is wider than a circular opening." })
      continue
    }
    const selected = byContour.get(contour.id) ?? []
    const key = `${radius}/${contour.isHole}/${contour.vertices.map((v, i) => `${v.x},${v.y},${contour.bulges?.[i]}`).join(";")}/${selected.filter((d) => d.enabled).map((d) => `${d.id},${d.radius},${d.direction.x},${d.direction.y},${d.center?.x},${d.center?.y}`).join(";")}`
    const cached = cache.get(contour)
    if (cached?.key === key) { issues.push(...cached.issues); continue }
    const before = issues.length
    try {
      const polygon = (reliefs: Dogbone[]) => {
        const points = applyDogboneCutouts(contour, reliefs, CHORD_ERROR).map((v) => [v.x, v.y])
        if (points.length < 3 || points.some((p) => p.some((v) => !Number.isFinite(v)))) throw new Error("Invalid contour coordinates.")
        points.push(points[0])
        return reader.read({ type: "Polygon", coordinates: [points] })
      }
      const original = polygon([])
      const modified = polygon(selected)
      if (!IsValidOp.isValid(original) || !IsValidOp.isValid(modified)) throw new Error("The cutting contour intersects itself or is invalid.")
      const swept = contour.isHole ? offset(offset(modified, -radius), radius) : offset(offset(modified, radius), -radius)
      const missing = contour.isHole
        ? OverlayOp.difference(offset(original, -FIT_TOLERANCE), swept)
        : OverlayOp.difference(swept, offset(original, FIT_TOLERANCE))
      const areas: number[] = []
      for (let i = 0; i < missing.getNumGeometries(); i++) {
        const area = missing.getGeometryN(i).getArea()
        if (area > MIN_MISSED_AREA) areas.push(area)
      }
      if (areas.length) issues.push({ contourId: contour.id, code: "unreachable", missedArea: areas.reduce((a, b) => a + b, 0),
        message: `A Ø${params.toolDiameter} mm cutter cannot clear this contour. Use a smaller cutter or adjust the slot; corner reliefs alone are insufficient.` })
    } catch (error) {
      issues.push({ contourId: contour.id, code: "invalid", message: error instanceof Error ? error.message : "The contour could not be verified." })
    } finally {
      cache.set(contour, { key, issues: issues.slice(before) })
    }
  }
  return { complete: issues.length === 0, toolDiameter: params.toolDiameter, issues }
}
