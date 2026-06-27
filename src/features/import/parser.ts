import DxfParser from "dxf-parser"

export function parseDxfFromBuffer(buffer: ArrayBuffer | string): ReturnType<DxfParser["parseSync"]> {
  const parser = new DxfParser()
  const data = typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer)
  return parser.parseSync(data)
}

export async function parseDxf(file: File): Promise<ReturnType<DxfParser["parseSync"]>> {
  const text = await file.text()
  return parseDxfFromBuffer(text)
}