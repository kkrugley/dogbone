import { DxfWriter } from "@tarikjabiri/dxf"
import type { FileState, ToolParams, Vertex } from "@/types/cad"

const z3 = (v: Vertex) => ({ x: v.x, y: v.y, z: 0 })
const z2 = (v: Vertex) => ({ x: v.x, y: v.y })

export function exportToDxf(fileState: FileState, _params: ToolParams): string {
  const dxf = new DxfWriter()

  for (const layer of fileState.layers) {
    dxf.addLayer(layer, 7, "CONTINUOUS")
  }

  for (const contour of fileState.contours) {
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

  const enabledDogbones = fileState.dogbones.filter((d) => d.enabled)
  if (enabledDogbones.length > 0) {
    dxf.addLayer("DOGBONES", 1, "CONTINUOUS")
    dxf.setCurrentLayerName("DOGBONES")

    for (const db of enabledDogbones) {
      dxf.addCircle(z3(db.vertex), db.radius)
    }
  }

  return dxf.stringify()
}

export function exportToDxfFile(fileState: FileState, params: ToolParams): Blob {
  const content = exportToDxf(fileState, params)
  return new Blob([content], { type: "application/dxf" })
}