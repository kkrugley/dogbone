import { assessMachining } from "@/geometry/toolFit"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import type { Contour, ToolParams, Vertex } from "@/types/cad"
import { classifyContours } from "@/geometry/topology"
import { findInternalCorners } from "@/geometry/corner"
import { generateAllDogbones } from "@/geometry/dogbone"
import { applyDogboneCutouts, applyDogboneCutoutsForExport } from "@/geometry/cutout"
import { polygonArea } from "@/utils/math"
import { parseDxfFromBuffer } from "@/features/import/parser"
import { convertDxfToFileState, getDxfLayers } from "@/features/import/converter"
import { exportToDxf } from "@/features/export/writer"

const params: ToolParams = { toolDiameter: 2, tolerance: .01, minAngle: 120,
  ignoredLayers: ["mark", "text"], filterLargeContours: true, contourMaxThickness: 30 }
const ring = (points: number[][], id = "part"): Contour => ({ id, closed: true, layer: "cut", segments: [],
  vertices: points.map(([x, y]) => ({ x, y })) })
const slot = () => ring([[10, 10], [30, 10], [30, 13], [10, 13]], "slot")
const outer = () => ring([[0, 0], [100, 0], [100, 100], [0, 100]])
const notched = () => ring([[0, 0], [100, 0], [100, 100], [52, 100], [52, 90], [48, 90], [48, 100], [0, 100]])
const convert = (entities: unknown[]) => convertDxfToFileState({ entities } as any, "test.dxf", [], params)

it("classifies holes and nested islands independently of winding", () => {
  const a = outer(), b = slot(), c = ring([[12, 11], [13, 11], [13, 12], [12, 12]], "island")
  for (const reverse of [false, true]) {
    if (reverse) for (const r of [a,b,c]) r.vertices.reverse()
    classifyContours([a,b,c])
    expect([a.isHole,b.isHole,c.isHole]).toEqual([false,true,false])
    expect(findInternalCorners(a)).toHaveLength(0)
    expect(findInternalCorners(b)).toHaveLength(4)
    expect(findInternalCorners(c)).toHaveLength(0)
  }
})

it("cuts the two roots of an open slot on a large part, with either winding", () => {
  for (const reverse of [false, true]) {
    const c = notched(); if (reverse) c.vertices.reverse()
    classifyContours([c])
    const ds = generateAllDogbones(c, params)
    expect(ds).toHaveLength(2)
    expect(ds.map((d) => d.vertex.y)).toEqual([90,90])
    const area = Math.abs(polygonArea(applyDogboneCutouts(c, ds)))
    expect(area).toBeLessThan(Math.abs(polygonArea(c.vertices)))
    expect(applyDogboneCutoutsForExport(c, ds)).toHaveLength(c.vertices.length + 2)
  }
})

it("enlarges holes instead of rounding them inward", () => {
  const a = outer(), b = slot(); classifyContours([a,b])
  const ds = generateAllDogbones(b, params)
  expect(ds).toHaveLength(4)
  expect(Math.abs(polygonArea(applyDogboneCutouts(b,ds)))).toBeGreaterThan(Math.abs(polygonArea(b.vertices)))
})

it("does not create reliefs on open paths or on arc junctions", () => {
  const c = slot(); c.isHole = true; c.closed = false
  expect(findInternalCorners(c)).toHaveLength(0)
  c.closed = true; c.edgeTypes = ["arc", "line", "line", "line"]
  expect(findInternalCorners(c).map((p) => p.vertexIndex)).toEqual([2,3])
})

it("uses a T-bone for a shallow notch and exports it", () => {
  const c = notched(); c.vertices[4].y = 99; c.vertices[5].y = 99
  c.vertices[3].x = 54; c.vertices[4].x = 54; c.vertices[5].x = 46; c.vertices[6].x = 46
  const ds = generateAllDogbones(c, params)
  expect(ds).toHaveLength(2)
  expect(ds.every((d) => d.type === "tbone")).toBe(true)
  expect(applyDogboneCutoutsForExport(c,ds)).toHaveLength(c.vertices.length+2)
})

it("reports a cutter wider than the slot despite valid local reliefs", () => {
  const c = slot(); c.isHole = true
  const large = { ...params, toolDiameter: 4 }
  expect(assessMachining([c], generateAllDogbones(c, large), large).complete).toBe(false)
  expect(generateAllDogbones(c, {...params,toolDiameter:NaN})).toHaveLength(0)
})

it("respects closed polylines, bulges, missing layers, and original arc radius", () => {
  const f = convert([{ type:"LWPOLYLINE",shape:true, vertices:[{x:0,y:0},{x:10,y:0,bulge:1},{x:10,y:10},{x:0,y:10}] }])
  expect(f.contours).toHaveLength(1)
  expect(f.contours[0].closed).toBe(true)
  expect(f.contours[0].bulges).toEqual([0,1,0,0])
  const parsed = parseDxfFromBuffer(exportToDxf(f,params))!
  expect(parsed.entities[0].layer).toBe("0")
  expect((parsed.entities[0] as any).shape).toBe(true)
  expect((parsed.entities[0] as any).vertices[1].bulge).toBe(1)
  expect(getDxfLayers(parsed as any)).toEqual(["0"])
})

it("recomputes chain endpoints and never joins different layers", () => {
  const line = (a: number[], b: number[], layer="cut") => ({type:"LINE",layer,vertices:[{x:a[0],y:a[1]},{x:b[0],y:b[1]}]})
  const f = convert([line([0,0],[10,0]),line([10,10],[0,10]),line([10,0],[10,10]),line([0,10],[0,0]),line([0,0],[10,0],"Mark")])
  expect(f.contours.filter((c) => c.layer === "cut" && c.closed)).toHaveLength(1)
  expect(f.contours.filter((c) => c.layer === "Mark")).toHaveLength(1)
})

function radius(a: Vertex, b: Vertex, bulge: number) {
  return Math.hypot(b.x-a.x,b.y-a.y)*(1+bulge*bulge)/(4*Math.abs(bulge))
}

describe("SafePaws source DXF round trips", () => {
  for (const [name, count, closedCut, arcs] of [
    ["cozy-3mm-sheet-1",320,63,124], ["cozy-6mm-sheet-1",272,57,78], ["family-6mm-sheet-1",118,30,86],
  ] as const) it(name, () => {
    const d = parseDxfFromBuffer(readFileSync(`tests/fixtures/safepaws/${name}.dxf`,"utf8"))!
    const f = convert(d.entities)
    expect(f.dogbones).toHaveLength(count)
    expect(f.dogbones.every((db) => f.contours.find((c)=>c.id===db.contourId)!.layer.toLowerCase()==="cut")).toBe(true)
    expect(f.contours.filter((c)=>c.layer.toLowerCase()==="cut"&&c.closed)).toHaveLength(closedCut)
    let newArcs = 0
    for (const c of f.contours) {
      const ds = f.dogbones.filter((db)=>db.contourId===c.id)
      for (const db of ds) {
        const single = applyDogboneCutoutsForExport(c,[db])
        const i = db.vertexIndex
        expect(radius(single[i].point,single[i+1].point,single[i].bulge!)).toBeCloseTo(1,5)
      }
      const pts = applyDogboneCutoutsForExport(c,ds)
      expect(pts.length-c.vertices.length).toBe(ds.length)
      for (let i=0; i<pts.length; i++) if(pts[i].bulge && !c.bulges?.some((b)=>Math.abs(b-pts[i].bulge!)<1e-8)) {
        expect(radius(pts[i].point,pts[(i+1)%pts.length].point,pts[i].bulge!)).toBeCloseTo(1,5)
        newArcs++
      }
    }
    expect(newArcs).toBeGreaterThan(0)
    const exported = parseDxfFromBuffer(exportToDxf(f,params))!
    expect([...new Set(exported.entities.map((e)=>e.layer))].sort()).toEqual([...new Set(d.entities.map((e)=>e.layer))].sort())
    expect(exported.entities.filter((e)=>e.type === "CIRCLE").length)
      .toBe(d.entities.filter((e)=>e.type === "CIRCLE").length)
    expect(exported.header?.$INSUNITS).toBe(4)
    const totalArcs = exported.entities.reduce((sum,e)=>sum+(e.type==="ARC"?1:0)+((e as any).vertices?.filter((v:any)=>v.bulge).length??0),0)
    expect(totalArcs).toBe(arcs+count)
    const again = convert(exported.entities)
    expect(again.contours.filter((c)=>c.layer.toLowerCase()==="cut"&&c.closed)).toHaveLength(closedCut)
    expect(again.dogbones).toHaveLength(0) // Reliefs must not be added twice.
  })
})
