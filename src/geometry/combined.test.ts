import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { generateAllDogbones } from "@/geometry/dogbone"
import { findInternalCorners } from "@/geometry/corner"
import { assessMachining } from "@/geometry/toolFit"
import { applyDogboneCutoutsForExport } from "@/geometry/cutout"
import { convertDxfToFileState } from "@/features/import/converter"
import { parseDxfFromBuffer } from "@/features/import/parser"
import { exportToDxf } from "@/features/export/writer"
import type { Contour, ToolParams } from "@/types/cad"

const params: ToolParams = { toolDiameter: 3.175, tolerance: .01, minAngle:120,
  ignoredLayers:["mark","text"], filterLargeContours:true, contourMaxThickness:30 }
const ring = (points: number[][], isHole=false): Contour => ({ id:"part", closed:true, layer:"cut",segments:[],isHole,
  vertices:points.map(([x,y])=>({x,y})) })

it("combines both relief types on the same part and with either winding", () => {
  for (const reverse of [false,true]) {
    const part=ring([[0,0],[100,0],[100,100],[83.2,100],[83.2,90],[80,90],[80,100],[60,100],[60,90],[40,90],[40,100],[0,100]])
    if(reverse) part.vertices.reverse()
    const ds=generateAllDogbones(part,params)
    expect(ds).toHaveLength(4)
    expect(new Set(ds.map(d=>d.type))).toEqual(new Set(["dogbone","tbone"]))
    expect(assessMachining([part],ds,params).complete).toBe(true)
  }
})

it("uses a compatible mixture of dogbones and T-bones for a narrow rectangular slot", () => {
  const part=ring([[0,0],[30,0],[30,3.2],[0,3.2]],true)
  const ds=generateAllDogbones(part,params)
  expect(ds).toHaveLength(4)
  expect(ds.filter(d=>d.type==="tbone")).toHaveLength(2)
  expect(assessMachining([part],ds,params).complete).toBe(true)
})

it("merges reliefs exactly when short notch walls prevent local splicing", () => {
  const part=ring([[0,0],[100,0],[100,100],[80,100],[80,94.9],[72.8,94.9],[72.8,100],
    [65.6,100],[65.6,94.9],[58.4,94.9],[58.4,100],[0,100]])
  const p={...params,toolDiameter:6}
  const ds=generateAllDogbones(part,p)
  expect(ds).toHaveLength(4)
  expect(ds.some(d=>d.requiresBoolean)).toBe(true)
  expect(applyDogboneCutoutsForExport(part,ds).some(v=>v.bulge)).toBe(true)
  expect(assessMachining([part],ds,p).complete).toBe(true)
})

it("handles a 135-degree concave angle, respecting the angle setting", () => {
  const part=ring([[0,0],[20,0],[20,20],[10,20],[10,10],[5,5],[0,5]])
  expect(findInternalCorners(part).some(c=>Math.abs(c.angle-Math.PI*.75)<1e-8)).toBe(true)
  expect(findInternalCorners(part,120).some(c=>Math.abs(c.angle-Math.PI*.75)<1e-8)).toBe(false)
  expect(assessMachining([part],generateAllDogbones(part,params),params).complete).toBe(true)
})

it("relieves narrow features inside a large opening", () => {
  const part=ring([[0,0],[120,0],[120,100],[80,100],[80,94],[74,94],[74,100],[0,100]],true)
  expect(generateAllDogbones(part,params).length).toBeGreaterThan(0)
})

it("enlarges an existing undersized inner fillet using an exact circular operation", () => {
  const part=ring([[0,0],[100,0],[100,100],[52,100],[52,91],[51,90],[48,90],[48,100],[0,100]])
  part.bulges=part.vertices.map((_,i)=>i===4?-Math.tan(Math.PI/8):0)
  part.edgeTypes=part.bulges.map(b=>b?"arc":"line")
  const ds=generateAllDogbones(part,params)
  expect(ds.some(d=>d.type==="arc-relief")).toBe(true)
  const result=applyDogboneCutoutsForExport(part,ds)
  expect(result.some(v=>v.bulge)).toBe(true)
  expect(assessMachining([part],ds,params).complete).toBe(true)
})

it("blocks an oversized cutter at export, while permitting explicit diagnostic export", () => {
  const data={entities:[{type:"LWPOLYLINE",layer:"cut",shape:true,vertices:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},
    {type:"LWPOLYLINE",layer:"cut",shape:true,vertices:[{x:10,y:10},{x:40,y:10},{x:40,y:13.2},{x:10,y:13.2}]}]}
  const p={...params,toolDiameter:4}
  const f=convertDxfToFileState(data as any,"oversize.dxf",[],p)
  expect(f.status).toBe("review")
  expect(()=>exportToDxf(f,p)).toThrow(/incomplete/)
  expect(parseDxfFromBuffer(exportToDxf(f,p,{allowIncomplete:true}))!.entities.length).toBeGreaterThan(0)
})

it("detects missing reliefs even if the contours remain valid", () => {
  const part=ring([[0,0],[30,0],[30,6.4],[0,6.4]],true)
  expect(assessMachining([part],[],{...params,toolDiameter:6}).complete).toBe(false)
})

describe("larger cutters on original SafePaws drawings", () => {
  for(const [name,diameter] of [["cozy-3mm-sheet-1",3.175],["cozy-6mm-sheet-1",6],["family-6mm-sheet-1",6]] as const) {
    it(`${name} / Ø${diameter}`, () => {
      const p={...params,toolDiameter:diameter}
      const parsed=parseDxfFromBuffer(readFileSync(`tests/fixtures/safepaws/${name}.dxf`,"utf8"))!
      const f=convertDxfToFileState(parsed as any,name,[],p)
      expect(f.machining?.issues).toEqual([])
      expect(f.status).toBe("ready")
      expect(f.dogbones.some(d=>d.type==="tbone")).toBe(true)
      const again=convertDxfToFileState(parseDxfFromBuffer(exportToDxf(f,p)) as any,"again",[],p)
      expect(again.dogbones).toHaveLength(0)
      expect(again.machining?.complete).toBe(true)
    },20000)
  }
})
