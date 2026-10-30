import DxfParser from "dxf-parser"

export const MAX_DXF_BYTES = 10 * 1024 * 1024
export const MAX_DXF_ENTITIES = 50000
export const MAX_DXF_VERTICES = 100000

export function parseDxfFromBuffer(buffer: ArrayBuffer | string): ReturnType<DxfParser["parseSync"]> {
  const size = typeof buffer === "string" ? buffer.length : buffer.byteLength
  if (size > MAX_DXF_BYTES) throw new Error("DXF files must be 10 MB or smaller. Split this drawing into separate sheets.")
  const parser = new DxfParser()
  const data = typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer)
  const parsed = parser.parseSync(data)
  if (!parsed?.entities?.length) throw new Error("The file contains no readable DXF entities.")
  if (parsed.entities.length > MAX_DXF_ENTITIES) throw new Error("This drawing exceeds 50,000 entities. Split it into separate sheets.")
  let vertices = 0
  for (const entity of parsed.entities) {
    const record = entity as { vertices?: Array<{ x: number; y: number; bulge?: number }>; center?: { x: number; y: number }; radius?: number; startAngle?: number; endAngle?: number }
    vertices += record.vertices?.length ?? 0
    if (vertices > MAX_DXF_VERTICES) throw new Error("This drawing exceeds 100,000 vertices. Split it into separate sheets.")
    const points = [...(record.vertices ?? []), ...(record.center ? [record.center] : [])]
    if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e7 || Math.abs(p.y) > 1e7) ||
      record.vertices?.some((v) => v.bulge !== undefined && (!Number.isFinite(v.bulge) || Math.abs(v.bulge) > 1e6)) ||
      (record.radius !== undefined && (!Number.isFinite(record.radius) || record.radius <= 0 || record.radius > 1e7)) ||
      (record.startAngle !== undefined && !Number.isFinite(record.startAngle)) ||
      (record.endAngle !== undefined && !Number.isFinite(record.endAngle))) {
      throw new Error("The drawing contains invalid or out-of-range coordinates.")
    }
  }
  return parsed
}

export async function readDxfText(file: File): Promise<string> {
  if (file.size > MAX_DXF_BYTES) throw new Error("DXF files must be 10 MB or smaller. Split this drawing into separate sheets.")
  return file.text()
}

export async function parseDxf(file: File): Promise<ReturnType<DxfParser["parseSync"]>> {
  return parseDxfFromBuffer(await readDxfText(file))
}
