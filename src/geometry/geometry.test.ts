import { describe, it, expect } from "vitest"
import { isContourClosed, findGaps, buildContour, extractVerticesFlat } from "@/geometry/contour"
import { isInternalCorner, findInternalCorners, calculateBisectorAngle } from "@/geometry/corner"
import { generateDogbone, generateAllDogbones, calculateDogboneCircles } from "@/geometry/dogbone"
import { validateContour, repairContour } from "@/geometry/repair"
import { uid } from "@/utils/id"
import type { Contour, Segment, ToolParams } from "@/types/cad"

function makeLine(x1: number, y1: number, x2: number, y2: number, layer = "0"): Segment {
  return { id: uid(), type: "line", start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, layer }
}

describe("contour", () => {
  it("detects closed contour", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
      makeLine(10, 10, 0, 10),
      makeLine(0, 10, 0, 0),
    ]
    const contour = buildContour(segs, "c1", "0")
    expect(contour.closed).toBe(true)
  })

  it("detects open contour", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
      makeLine(10, 10, 0, 10),
    ]
    const contour = buildContour(segs, "c1", "0")
    expect(contour.closed).toBe(false)
  })

  it("finds gaps in open contour", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
      makeLine(10, 10, 0, 10),
    ]
    const contour = buildContour(segs, "c1", "0")
    const gaps = findGaps(contour, 0.1)
    expect(gaps.length).toBeGreaterThan(0)
  })

  it("extracts ordered vertices", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
    ]
    const verts = extractVerticesFlat(segs)
    expect(verts.length).toBe(3)
    expect(verts[0]).toEqual({ x: 0, y: 0 })
    expect(verts[1]).toEqual({ x: 10, y: 0 })
    expect(verts[2]).toEqual({ x: 10, y: 10 })
  })
})

describe("corner", () => {
  it("calculates bisector angle for 90-degree corner", () => {
    const a = { x: 1, y: 0 }
    const b = { x: 0, y: 0 }
    const c = { x: 0, y: 1 }
    const angle = calculateBisectorAngle(a, b, c)
    expect(angle).toBeCloseTo(Math.PI / 4, 4)
  })

  it("finds internal corners in clockwise square", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices,
    }
    const corners = findInternalCorners(contour, 120)
    expect(corners.length).toBe(4)
  })
})

describe("dogbone", () => {
  it("generates dogbone with correct radius", () => {
    const vertex = { x: 10, y: 0 }
    const db = generateDogbone(
      vertex, 1, "c1", 1.5, Math.PI / 2, Math.PI / 4, "dogbone",
    )
    expect(db.radius).toBe(1.5)
    expect(db.vertexIndex).toBe(1)
    expect(db.contourId).toBe("c1")
    expect(db.type).toBe("dogbone")
    expect(db.enabled).toBe(true)
  })

  it("calculates dogbone circles", () => {
    const db = generateDogbone(
      { x: 0, y: 0 }, 0, "c1", 2, Math.PI / 2, Math.PI / 4, "dogbone",
    )
    const circles = calculateDogboneCircles(db)
    expect(circles.length).toBe(1)
    expect(circles[0].radius).toBe(2)
  })

  it("generates dogbones for all internal corners", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices,
    }
    const params: ToolParams = {
      toolDiameter: 3,
      reliefType: "dogbone",
      tolerance: 0.01,
      minAngle: 120,
      overcut: 0.1,
    }
    const dbs = generateAllDogbones(contour, params)
    expect(dbs.length).toBe(4)
    expect(dbs[0].radius).toBe(1.5)
  })

  it("filters corners above minAngle", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices,
    }
    const params: ToolParams = {
      toolDiameter: 3,
      reliefType: "dogbone",
      tolerance: 0.01,
      minAngle: 30,
      overcut: 0.1,
    }
    const dbs = generateAllDogbones(contour, params)
    expect(dbs.length).toBe(4)
  })
})

describe("repair", () => {
  it("validates a closed contour", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
      makeLine(10, 10, 0, 10),
      makeLine(0, 10, 0, 0),
    ]
    const contour = buildContour(segs, "c1", "0")
    const result = validateContour(contour, 0.01)
    expect(result.isValid).toBe(true)
  })

  it("validates an open contour", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
    ]
    const contour = buildContour(segs, "c1", "0")
    const result = validateContour(contour, 0.01)
    expect(result.isValid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it("repairs a gap within tolerance", () => {
    const segs = [
      makeLine(0, 0, 10, 0),
      makeLine(10, 0, 10, 10),
    ]
    const contour = buildContour(segs, "c1", "0")
    const gaps = findGaps(contour, 100)
    const repaired = repairContour(contour, gaps, 100)
    expect(repaired.closed).toBe(true)
  })
})