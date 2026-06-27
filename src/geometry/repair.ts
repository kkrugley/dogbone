import type { Contour, Gap } from "@/types/cad"
import { distance } from "@/utils/math"
import { isContourClosed } from "@/geometry/contour"

export function repairContour(
  contour: Contour,
  gaps: Gap[],
  tolerance: number,
): Contour {
  const fixable = gaps.filter((g) => g.canAutoFix && g.distance < tolerance)

  if (fixable.length === 0) {
    return { ...contour, closed: isContourClosed(contour.vertices, tolerance) }
  }

  const updated = { ...contour, vertices: [...contour.vertices] }

  for (const gap of fixable) {
    updated.vertices.push({ x: gap.endVertex.x, y: gap.endVertex.y })
  }

  updated.closed = contour.closed || isContourClosed(updated.vertices, tolerance)

  return updated
}

export function validateContour(
  contour: Contour,
  tolerance: number,
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!contour.segments || contour.segments.length === 0) {
    issues.push("Contour has no segments")
  }

  if (!contour.vertices || contour.vertices.length < 2) {
    issues.push("Contour has fewer than 2 vertices")
  }

  if (contour.vertices.length >= 2) {
    for (let i = 0; i < contour.vertices.length - 1; i++) {
      const dx = contour.vertices[i + 1].x - contour.vertices[i].x
      const dy = contour.vertices[i + 1].y - contour.vertices[i].y
      if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) {
        issues.push(`Duplicate vertex at index ${i} and ${i + 1}`)
      }
    }
  }

  if (
    contour.vertices.length >= 3 &&
    !contour.closed &&
    !isContourClosed(contour.vertices, tolerance)
  ) {
    const first = contour.vertices[0]
    const last = contour.vertices[contour.vertices.length - 1]
    const gapDist = distance(first, last)
    issues.push(
      `Open contour: gap of ${gapDist.toFixed(4)} units between end points`,
    )
  }

  if (
    contour.vertices.length >= 3 &&
    contour.vertices.every(
      (v) =>
        v.x === contour.vertices[0].x && v.y === contour.vertices[0].y,
    )
  ) {
    issues.push("All vertices are identical")
  }

  return { isValid: issues.length === 0, issues }
}