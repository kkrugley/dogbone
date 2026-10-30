import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { parseDxfFromBuffer } from '../src/features/import/parser'
import { convertDxfToFileState } from '../src/features/import/converter'
import { applyDogboneCutouts, applyDogboneCutoutsForExport } from '../src/geometry/cutout'
import { findInternalCorners } from '../src/geometry/corner'
import { distance } from '../src/utils/math'
import { exportToDxf } from '../src/features/export/writer'
const params = { toolDiameter: 2, tolerance: .01, minAngle: 120, ignoredLayers: ['mark','text'], filterLargeContours: true, contourMaxThickness: 30 }
const rows: any[] = []
const auditDir = process.env.AUDIT_DIR ?? 'reports/combined-cutouts'
mkdirSync(auditDir,{recursive:true})
const sourceRoot = process.env.SAFEPAWS_DIR ?? '/workspace/scratch/safepaws'
const datasets = process.env.EXTENDED ? [
 ...readdirSync(sourceRoot+'/cozy3/Parts-Ready-to-cut/DXF').filter(n=>n.endsWith('.dxf')).sort().map(n=>({file:'cozy-3mm-'+n.replace('.dxf',''),path:sourceRoot+'/cozy3/Parts-Ready-to-cut/DXF/'+n,diameters:[3,3.175]})),
 ...readdirSync(sourceRoot+'/cozy6/1500x750').filter(n=>n.endsWith('.dxf')).sort().map(n=>({file:'cozy-6mm-'+n.replace('.dxf',''),path:sourceRoot+'/cozy6/1500x750/'+n,diameters:[3.175,4,6]})),
 ...readdirSync(sourceRoot+'/family6/1500x750').filter(n=>n.endsWith('.dxf')).sort().map(n=>({file:'family-6mm-'+n.replace('.dxf',''),path:sourceRoot+'/family6/1500x750/'+n,diameters:[3.175,4,6]})),
] : [
 {file:'cozy-3mm-sheet-1',path:'tests/fixtures/safepaws/cozy-3mm-sheet-1.dxf',diameters:[2,2.5,3,3.175,4]},
 {file:'cozy-6mm-sheet-1',path:'tests/fixtures/safepaws/cozy-6mm-sheet-1.dxf',diameters:[2,3,3.175,4,6]},
 {file:'family-6mm-sheet-1',path:'tests/fixtures/safepaws/family-6mm-sheet-1.dxf',diameters:[2,3,3.175,4,6]},
]
for (const {file,path,diameters} of datasets) {
 const source = parseDxfFromBuffer(readFileSync(path,'utf8'))!
 for (const diameter of diameters) {
  const p={...params,toolDiameter:diameter}
  const f=convertDxfToFileState(source as any,file+'.dxf',[],p)
  const cut=f.contours.filter(c=>c.layer.toLowerCase()==='cut')
  const candidates=cut.reduce((sum,c)=>sum+findInternalCorners(c).filter(corner=>{ const i=corner.vertexIndex,n=c.vertices.length; return !(c.isHole && p.filterLargeContours && Math.min(distance(c.vertices[(i-1+n)%n],corner.vertex),distance(corner.vertex,c.vertices[(i+1)%n]))>p.contourMaxThickness) }).length,0)
  let applied=0,maxRadiusError=0
  const polygons:any[]=[]
  for(const c of cut) {
   const ds=f.dogbones.filter(d=>d.contourId===c.id)
   applyDogboneCutoutsForExport(c,ds)
   applied += ds.length // Each circle is included in the combined contour operation; checked independently below.
   for(const d of ds){
    if(d.requiresBoolean) continue
    const pts=applyDogboneCutoutsForExport(c,[d]);const a=pts[d.vertexIndex],b=pts[d.vertexIndex+1];
    if(pts.length===c.vertices.length) throw new Error('A generated relief was not exported')
    const bulge=a.bulge!;const radius=Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y)*(1+bulge*bulge)/(4*Math.abs(bulge))
    maxRadiusError=Math.max(maxRadiusError,Math.abs(radius-diameter/2))
   }
   if(c.closed&&c.vertices.length>=3)polygons.push({id:c.id,hole:c.isHole,source:applyDogboneCutouts(c,[],.0001).map(v=>[v.x,v.y]),points:applyDogboneCutouts(c,ds,.0001).map(v=>[v.x,v.y]),reliefs:ds.length,sourceBulges:c.bulges,reliefVertices:ds.map(d=>d.vertex),circles:ds.map(d=>({x:d.center?.x??d.vertex.x+d.direction.x*d.radius,y:d.center?.y??d.vertex.y+d.direction.y*d.radius,radius:d.radius})),rectangular:c.vertices.length===4&&c.bulges?.every(b=>!b)&&findInternalCorners({...c,isHole:true}).length===4})
  }
  const output=exportToDxf(f,p,{allowIncomplete:true})
  const again=convertDxfToFileState(parseDxfFromBuffer(output) as any,'again.dxf',[],p)
  const key=`${file}-D${diameter}`
  writeFileSync(`${auditDir}/${key}${f.machining?.complete ? "-verified" : "-DIAGNOSTIC"}.dxf`,output)
  const row={key,file,source_path:path,diameter,candidates,generated:f.dogbones.length,applied,skipped:Math.max(0,candidates-f.dogbones.filter(d=>d.type!=="arc-relief").length),arcReliefs:f.dogbones.filter(d=>d.type==="arc-relief").length,booleanReliefs:f.dogbones.filter(d=>d.requiresBoolean).length,machining:f.machining,tbones:f.dogbones.filter(d=>d.type==='tbone').length,warnings:f.warnings,maxRadiusError,closedCut:cut.filter(c=>c.closed).length,reimportDogbones:again.dogbones.length,polygons}
  rows.push(row)
  console.log(JSON.stringify({...row,polygons:undefined,warnings:row.warnings?.length,machining:{complete:f.machining?.complete,issues:f.machining?.issues.length}}))
 }
}
writeFileSync(auditDir+'/'+(process.env.EXTENDED?'extended-raw.json':'audit-raw.json'),JSON.stringify(rows))
