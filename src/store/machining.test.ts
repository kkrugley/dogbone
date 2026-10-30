import { beforeEach, expect, it } from "vitest"
import { useCADStore } from "@/store/cadStore"
import { convertDxfToFileState } from "@/features/import/converter"
import { exportToDxf } from "@/features/export/writer"
const params={toolDiameter:3.175,tolerance:.01,minAngle:120,ignoredLayers:["mark","text"],filterLargeContours:true,contourMaxThickness:30}
const data={entities:[{type:"LWPOLYLINE",layer:"cut",shape:true,vertices:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},
  {type:"LWPOLYLINE",layer:"cut",shape:true,vertices:[{x:10,y:10},{x:40,y:10},{x:40,y:13.2},{x:10,y:13.2}]}]}
beforeEach(()=>useCADStore.setState({files:[],toolParams:params}))
it("invalidates verification immediately when parameters change",()=>{
  const f=convertDxfToFileState(data as any,"slot.dxf",[],params)
  useCADStore.getState().addFile(f)
  useCADStore.getState().setToolParams({toolDiameter:4})
  const current=useCADStore.getState().files[0]
  expect(current.status).toBe("review")
  expect(()=>exportToDxf(current,{...params,toolDiameter:4})).toThrow(/incomplete/)
})
it("rechecks the actual geometry when a relief is disabled and restored",()=>{
  const f=convertDxfToFileState(data as any,"slot.dxf",[],params)
  useCADStore.getState().addFile(f)
  useCADStore.getState().toggleDogbone(f.id,f.dogbones[0].id)
  expect(useCADStore.getState().files[0].status).toBe("review")
  useCADStore.getState().toggleDogbone(f.id,f.dogbones[0].id)
  expect(useCADStore.getState().files[0].status).toBe("ready")
})
it("never trusts a stale verification after a geometry update",()=>{
  const f=convertDxfToFileState(data as any,"slot.dxf",[],params)
  useCADStore.getState().addFile(f)
  useCADStore.getState().updateFile(f.id,{dogbones:[]})
  expect(useCADStore.getState().files[0].machining?.complete).toBe(false)
})
it("keeps viewport interactions out of the undo history and bounds retained edits",()=>{
  useCADStore.temporal.getState().clear()
  for(let i=0;i<50;i++)useCADStore.getState().setViewport({x:i})
  expect(useCADStore.temporal.getState().pastStates).toHaveLength(0)
  for(let i=0;i<30;i++)useCADStore.getState().addFile({id:String(i),name:"test",originalName:"test.dxf",layers:[],selectedLayers:[],contours:[],dogbones:[],gaps:[],status:"idle"})
  expect(useCADStore.temporal.getState().pastStates).toHaveLength(20)
})
