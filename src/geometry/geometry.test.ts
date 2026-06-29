import { describe, it, expect, beforeEach } from "vitest"
import { findGaps, buildContour, extractVerticesFlat } from "@/geometry/contour"
import { findInternalCorners, calculateBisectorAngle } from "@/geometry/corner"
import { generateDogbone, generateAllDogbones, calculateDogboneCircles } from "@/geometry/dogbone"
import { applyDogboneCutouts } from "@/geometry/cutout"
import { subtractDogbones, clearCache } from "@/geometry/boolean"
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
      ignoredLayers: [],
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
      ignoredLayers: [],
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

describe("boolean", () => {
  beforeEach(() => {
    clearCache()
  })

  it("returns original vertices when no dogbones provided", () => {
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }
    const rings = subtractDogbones(contour, [])
    expect(rings.length).toBe(1)
    expect(rings[0].length).toBe(4)
  })

  it("ignores disabled dogbones", () => {
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }
    const db = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, -Math.PI / 4, "dogbone",
    )
    db.enabled = false
    const rings = subtractDogbones(contour, [db])
    expect(rings.length).toBe(1)
    expect(rings[0].length).toBe(4)
  })

  it("subtracting a dogbone increases vertex count", () => {
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }
    const db = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, -Math.PI / 4, "dogbone",
    )
    const rings = subtractDogbones(contour, [db])
    expect(rings.length).toBe(1)
    expect(rings[0].length).toBeGreaterThan(4)
  })

  it("subtracting dogbone produces valid rings", () => {
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    }
    const db = generateDogbone(
      { x: 100, y: 0 }, 1, "c1", 20, Math.PI / 2, (3 * Math.PI) / 4, "dogbone",
    )
    const rings = subtractDogbones(contour, [db])
    expect(rings.length).toBeGreaterThan(0)
    for (const ring of rings) {
      expect(ring.length).toBeGreaterThan(2)
      const hasDistinct =
        ring.some((p) => p[0] !== ring[0][0] || p[1] !== ring[0][1])
      expect(hasDistinct).toBe(true)
    }
  })

  it("caches results for repeated calls", () => {
    const contour: Contour = {
      id: "c1",
      closed: true,
      layer: "0",
      segments: [],
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }
    const db = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, -Math.PI / 4, "dogbone",
    )
    const first = subtractDogbones(contour, [db])
    const second = subtractDogbones(contour, [db])
    expect(second).toBe(first)
  })
})

describe("cutout", () => {
  it("returns original vertices when no dogbones", () => {
    const contour: Contour = {
      id: "c1", closed: true, layer: "0", segments: [],
      vertices: [
        { x: 0, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
      ],
    }
    const pts = applyDogboneCutouts(contour, [])
    expect(pts.length).toBe(4)
    expect(pts[0]).toEqual({ x: 0, y: 0 })
  })

  it("ignores disabled dogbones", () => {
    const contour: Contour = {
      id: "c1", closed: true, layer: "0", segments: [],
      vertices: [
        { x: 0, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
      ],
    }
    const db = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, (3 * Math.PI) / 4, "dogbone",
    )
    db.enabled = false
    const pts = applyDogboneCutouts(contour, [db])
    expect(pts.length).toBe(4)
  })

  it("adds arc points at the dogbone corner", () => {
    const contour: Contour = {
      id: "c1", closed: true, layer: "0", segments: [],
      vertices: [
        { x: 0, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
      ],
    }
    const db = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, (3 * Math.PI) / 4, "dogbone",
    )
    const pts = applyDogboneCutouts(contour, [db])
    expect(pts.length).toBeGreaterThan(4)
    expect(pts[0].x).toBeLessThan(10)
    expect(pts[pts.length - 1].y).toBeGreaterThan(0)
  })

  it("handles multiple dogbones on different corners", () => {
    const contour: Contour = {
      id: "c1", closed: true, layer: "0", segments: [],
      vertices: [
        { x: 0, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
      ],
    }
    const db1 = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, (3 * Math.PI) / 4, "dogbone",
    )
    const db2 = generateDogbone(
      { x: 0, y: 10 }, 3, "c1", 1.5, Math.PI / 2, (5 * Math.PI) / 4, "dogbone",
    )
    const pts = applyDogboneCutouts(contour, [db1, db2])
    expect(pts.length).toBeGreaterThan(6)
  })

  it("handles dogbones on adjacent vertices", () => {
    const contour: Contour = {
      id: "c1", closed: true, layer: "0", segments: [],
      vertices: [
        { x: 0, y: 0 }, { x: 10, y: 0 },
        { x: 10, y: 10 }, { x: 0, y: 10 },
      ],
    }
    const db0 = generateDogbone(
      { x: 0, y: 0 }, 0, "c1", 1.5, Math.PI / 2, Math.PI / 4, "dogbone",
    )
    const db1 = generateDogbone(
      { x: 10, y: 0 }, 1, "c1", 1.5, Math.PI / 2, (3 * Math.PI) / 4, "dogbone",
    )
    const pts = applyDogboneCutouts(contour, [db0, db1])
    expect(pts.length).toBeGreaterThan(6)
    const allFinite = pts.every((p) => isFinite(p.x) && isFinite(p.y))
    expect(allFinite).toBe(true)
  })
})