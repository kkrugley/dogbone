import { assessMachining } from "@/geometry/toolFit"
import { DxfWriter, LWPolylineFlags, Units } from "@tarikjabiri/dxf"
import type { Dogbone, FileState, ToolParams, Vertex } from "@/types/cad"
import { applyDogboneCutoutsForExport } from "@/geometry/cutout"

const z3 = (v: Vertex) => ({ x: v.x, y: v.y, z: 0 })
const z2 = (v: Vertex) => ({ x: v.x, y: v.y })

export function exportToDxf(fileState: FileState, params: ToolParams, options: { allowIncomplete?: boolean } = {}): string {
  if (!options.allowIncomplete) {
    if (fileState.machining?.complete === false) throw new Error("Processing is incomplete. Re-process or review the tool clearance warnings before exporting.")
    const machining = assessMachining(fileState.contours, fileState.dogbones, params)
    if (!machining.complete) throw new Error(machining.issues[0]?.message ?? "Cutter clearance could not be verified.")
  }
  const dxf = new DxfWriter()
  dxf.setUnits(Units.Millimeters)

  for (const layer of fileState.layers) {
    dxf.addLayer(layer, 7, "CONTINUOUS")
  }

  const dogbonesByContour = new Map<string, Dogbone[]>()
  for (const db of fileState.dogbones) {
    if (!db.enabled) continue
    let arr = dogbonesByContour.get(db.contourId)
    if (!arr) {
      arr = []
      dogbonesByContour.set(db.contourId, arr)
    }
    arr.push(db)
  }

  for (const contour of fileState.contours) {
    const contourDogbones = dogbonesByContour.get(contour.id)

    if (contour.closed && contour.vertices.length >= 2) {
      const exportPts = applyDogboneCutoutsForExport(contour, contourDogbones ?? [])
      dxf.setCurrentLayerName(contour.layer)
      dxf.addLWPolyline(exportPts, { flags: LWPolylineFlags.Closed })
    } else {
      for (const segment of contour.segments) {
        dxf.setCurrentLayerName(segment.layer)

        switch (segment.type) {
          case "line":
            dxf.addLine(z3(segment.start), z3(segment.end))
            break

          case "arc":
            if (
              segment.center &&
              segment.radius !== undefined &&
              segment.startAngle !== undefined &&
              segment.endAngle !== undefined
            ) {
              dxf.addArc(
                z3(segment.center),
                segment.radius,
                segment.startAngle,
                segment.endAngle,
              )
            }
            break

          case "circle":
            if (segment.center && segment.radius !== undefined) {
              dxf.addCircle(z3(segment.center), segment.radius)
            }
            break

          case "polyline":
            if (segment.vertices && segment.vertices.length >= 2) {
              dxf.addLWPolyline(
                segment.vertices.map((v) => ({ point: z2(v) })),
              )
            }
            break
        }
      }
    }
  }

  return dxf.stringify()
}

export function exportToDxfFile(fileState: FileState, params: ToolParams): Blob {
  const content = exportToDxf(fileState, params)
  return new Blob([content], { type: "application/dxf" })
}