import { DxfWriter, LWPolylineFlags } from "@tarikjabiri/dxf"
import type { Dogbone, FileState, ToolParams, Vertex } from "@/types/cad"
import { applyDogboneCutoutsForExport } from "@/geometry/cutout"

const z3 = (v: Vertex) => ({ x: v.x, y: v.y, z: 0 })
const z2 = (v: Vertex) => ({ x: v.x, y: v.y })

export function exportToDxf(fileState: FileState, _params: ToolParams): string {
  const dxf = new DxfWriter()

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

    if (contour.closed && contourDogbones && contourDogbones.length > 0) {
      const exportPts = applyDogboneCutoutsForExport(contour, contourDogbones)
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