import type { Contour, Dogbone, ToolParams, Vertex } from "@/types/cad"
import { uid } from "@/utils/id"
import { findInternalCorners } from "@/geometry/corner"
import { getContourThickness } from "@/utils/math"

export function generateDogbone(
  vertex: Vertex,
  vertexIndex: number,
  contourId: string,
  toolRadius: number,
  angle: number,
  bisectorAngle: number,
): Dogbone {
  const direction: Vertex = {
    x: Math.cos(bisectorAngle),
    y: Math.sin(bisectorAngle),
  }

  return {
    id: uid(),
    contourId,
    vertexIndex,
    vertex: { x: vertex.x, y: vertex.y },
    radius: toolRadius,
    angle,
    bisectorAngle,
    direction,
    type: "dogbone",
    enabled: true,
  }
}

export function generateAllDogbones(
  contour: Contour,
  params: ToolParams,
): Dogbone[] {
  if (
    params.filterLargeContours &&
    getContourThickness(contour) > params.contourMaxThickness
  ) {
    return []
  }

  const toolRadius = params.toolDiameter / 2
  const corners = findInternalCorners(contour, params.minAngle)

  return corners.map((c) =>
    generateDogbone(
      c.vertex,
      c.vertexIndex,
      contour.id,
      toolRadius,
      c.angle,
      c.bisectorAngle,
    ),
  )
}

export function calculateDogboneCircles(
  dogbone: Dogbone,
): Array<{ center: Vertex; radius: number }> {
  const center: Vertex = {
    x: dogbone.vertex.x + dogbone.direction.x * dogbone.radius,
    y: dogbone.vertex.y + dogbone.direction.y * dogbone.radius,
  }

  return [{ center, radius: dogbone.radius }]
}