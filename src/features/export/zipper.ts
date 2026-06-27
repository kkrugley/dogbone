import * as fflate from "fflate"

export function createZipArchive(
  files: Array<{ name: string; data: string }>,
): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = {}

  for (const file of files) {
    entries[file.name] = new TextEncoder().encode(file.data)
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    fflate.zip(entries, { level: 6 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

export function downloadZip(zipData: Uint8Array, archiveName: string): void {
  const blob = new Blob([zipData as BlobPart], { type: "application/zip" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = archiveName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}