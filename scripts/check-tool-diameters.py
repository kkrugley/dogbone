"""Independent polygon checks. Requires shapely; run after audit-tool-diameters.ts."""
import json, math, os
from pathlib import Path
from shapely.geometry import Polygon, box, Point
from shapely.validation import explain_validity
root=Path(os.environ.get('AUDIT_DIR','reports/combined-cutouts'))
extended=bool(os.environ.get('EXTENDED'))
rows=json.loads((root/('extended-raw.json' if extended else 'audit-raw.json')).read_text())
summary=[]
for row in rows:
 bad=[];widths=[];narrow=[];inaccessible=[];external=[];unapplied=[];crossings=[];shapes=[]
 for item in row['polygons']:
  poly=Polygon(item['points'])
  shapes.append((item,poly))
  for circle in item.get('circles',[]):
   disk=Point(circle['x'],circle['y']).buffer(circle['radius'],quad_segs=256)
   remainder=disk.difference(poly).area if item['hole'] else disk.intersection(poly).area
   if remainder>.01:unapplied.append({'id':item['id'],'area_mm2':remainder})
  if not poly.is_valid:bad.append({'id':item['id'],'reason':explain_validity(poly)})
  if item['hole'] and item['rectangular']:
   original=Polygon(item['source']); coords=list(original.minimum_rotated_rectangle.exterior.coords)
   width=min(math.dist(coords[i],coords[i+1]) for i in range(4));widths.append(width)
   if width<row['diameter']-.01:narrow.append({'id':item['id'],'width':width})
  if item['hole'] and poly.is_valid:
   # Opening approximates the region a circular cutter can sweep inside this hole.
   reachable=poly.buffer(-row['diameter']/2,quad_segs=256).buffer(row['diameter']/2,quad_segs=256)
   lost=Polygon(item['source']).difference(reachable).area
   if lost>.01:inaccessible.append({'id':item['id'],'lost_area_mm2':lost,'reliefs':item['reliefs']})
  if not item['hole'] and poly.is_valid:
   r=row['diameter']/2
   x,y,xx,yy=poly.bounds
   boundary=box(x-10*r,y-10*r,xx+10*r,yy+10*r)
   reachable=boundary.difference(poly).buffer(-r,quad_segs=256).buffer(r,quad_segs=256)
   needed=box(x-2*r,y-2*r,xx+2*r,yy+2*r).difference(Polygon(item['source']))
   missed=needed.difference(reachable)
   components=list(missed.geoms) if hasattr(missed,'geoms') else [missed]
   significant=[component for component in components if component.area>.01]
   if significant:
    external.append({'id':item['id'],'lost_area_mm2':sum(component.area for component in significant),'largest_component_mm2':max(component.area for component in significant)})
 for i,(item,a) in enumerate(shapes):
  for other,b in shapes[i+1:]:
   if a.boundary.crosses(b.boundary) and not Polygon(item['source']).boundary.crosses(Polygon(other['source']).boundary):
    crossings.append([item['id'],other['id']])
 info={k:v for k,v in row.items() if k not in ('polygons','warnings')}
 info.update(invalid_polygons=bad,rectangular_hole_widths_mm=sorted(set(round(x,4) for x in widths)),rectangular_holes=len(widths),holes_narrower_than_tool=narrow,holes_with_unreachable_area=inaccessible,external_contours_with_unreachable_area=external,unapplied_relief_circles=unapplied,new_contour_crossings=crossings)
 summary.append(info)
 print(row['key'], 'invalid',len(bad),'hole widths',info['rectangular_hole_widths_mm'],'narrow',len(narrow),'unreachable',len(inaccessible),'max lost',round(max([x['lost_area_mm2'] for x in inaccessible],default=0),3))
(root/('extended-summary.json' if extended else 'summary.json')).write_text(json.dumps(summary,indent=2)+'\n')
