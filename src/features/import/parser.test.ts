import { afterEach, expect, it, vi } from "vitest"
import DxfParser from "dxf-parser"
import { MAX_DXF_BYTES, MAX_DXF_ENTITIES, parseDxf, parseDxfFromBuffer } from "@/features/import/parser"

afterEach(()=>vi.restoreAllMocks())
it("rejects oversized files before reading their contents",async()=>{
  const text=vi.fn()
  await expect(parseDxf({size:MAX_DXF_BYTES+1,text} as unknown as File)).rejects.toThrow(/10 MB/)
  expect(text).not.toHaveBeenCalled()
})
it("rejects drawings that exceed the entity processing budget",()=>{
  vi.spyOn(DxfParser.prototype,"parseSync").mockReturnValue({entities:Array(MAX_DXF_ENTITIES+1).fill({type:"LINE"})} as any)
  expect(()=>parseDxfFromBuffer("input")).toThrow(/50,000/)
})
it("rejects non-finite drawing coordinates before geometry processing",()=>{
  vi.spyOn(DxfParser.prototype,"parseSync").mockReturnValue({entities:[{type:"LINE",vertices:[{x:NaN,y:0},{x:10,y:0}]}]} as any)
  expect(()=>parseDxfFromBuffer("input")).toThrow(/invalid/)
})
it("rejects empty drawing files",()=>{
  vi.spyOn(DxfParser.prototype,"parseSync").mockReturnValue({entities:[]} as any)
  expect(()=>parseDxfFromBuffer("input")).toThrow(/no readable/)
})
