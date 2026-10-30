import { Arc, Segment, Point, Polygon, Circle, BooleanOperations, ORIENTATION } from "@flatten-js/core"
import type { Contour, Dogbone } from "@/types/cad"
import type { ExportVertex } from "@/geometry/cutout"

const cache = new WeakMap<Contour, { key: string; vertices: ExportVertex[] }>()

/** Exact circular-arc fallback for reliefs crossing more than two original edges. */
export function mergeCutouts(contour: Contour, dogbones: Dogbone[]): ExportVertex[] {
  const sourceKey = contour.vertices.map((v, i) => `${v.x},${v.y},${contour.bulges?.[i]}`).join(";")
  const key = sourceKey + dogbones.map((d) => `${d.id}:${d.radius}:${d.direction.x}:${d.direction.y}:${d.vertex.x}:${d.vertex.y}:${d.center?.x}:${d.center?.y}`).join("|")
  const cached = cache.get(contour)
  if (cached?.key === key) return cached.vertices
  const edges = contour.vertices.map((a, i) => {
    const b = contour.vertices[(i + 1) % contour.vertices.length]
    const bulge = contour.bulges?.[i] ?? 0
    if (!bulge) return new Segment(new Point(a.x, a.y), new Point(b.x, b.y))
    const dx = b.x - a.x, dy = b.y - a.y
    const center = new Point((a.x + b.x) / 2 - dy * (1 - bulge * bulge) / (4 * bulge),
      (a.y + b.y) / 2 + dx * (1 - bulge * bulge) / (4 * bulge))
    return new Arc(center, Math.hypot(a.x - center.x, a.y - center.y),
      Math.atan2(a.y - center.y, a.x - center.x), Math.atan2(b.y - center.y, b.x - center.x), bulge > 0)
  })
  let subject = new Polygon(edges)
  for (const face of subject.faces) if (face.orientation() !== ORIENTATION.CCW) face.reverse()
  for (const d of dogbones) {
    const center = new Point(d.center?.x ?? d.vertex.x + d.radius * d.direction.x, d.center?.y ?? d.vertex.y + d.radius * d.direction.y)
    const circle = new Polygon(new Circle(center, d.radius))
    for (const face of circle.faces) if (face.orientation() !== ORIENTATION.CCW) face.reverse()
    subject = contour.isHole ? BooleanOperations.unify(subject, circle) : BooleanOperations.subtract(subject, circle)
  }
  if (subject.faces.size !== 1) throw new Error("Reliefs split the part or create separate loops; use a smaller cutter.")
  const face = [...subject.faces][0]
  const vertices = face.shapes.flatMap((shape: Segment | Arc) => {
    if (shape instanceof Segment) return [{ point: { x: shape.start.x, y: shape.start.y }, bulge: 0 }]
    // DXF bulge cannot encode an entire circle as a single vertex.
    if (shape.sweep > Math.PI * 1.99) {
      const mid = shape.middle()
      const b = Math.tan(shape.sweep / 8) * (shape.counterClockwise ? 1 : -1)
      return [{ point: { x: shape.start.x, y: shape.start.y }, bulge: b }, { point: { x: mid.x, y: mid.y }, bulge: b }]
    }
    return [{ point: { x: shape.start.x, y: shape.start.y }, bulge: Math.tan(shape.sweep / 4) * (shape.counterClockwise ? 1 : -1) }]
  })
  cache.set(contour, { key, vertices })
  return vertices
}
