import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { parseDxf } from "@/features/import/parser"
import { convertDxfToFileState, getDxfLayers } from "@/features/import/converter"
import type { FileState } from "@/types/cad"

interface FileUploadProps {
  children?: React.ReactNode
}

export function FileUpload({ children }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addFile = useCADStore((s) => s.addFile)
  const setFileStatus = useCADStore((s) => s.setFileStatus)
  const updateFile = useCADStore((s) => s.updateFile)
  const toolParams = useCADStore((s) => s.toolParams)

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".dxf"))
    if (files.length === 0) return

    for (const file of files) {
      const fileId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const placeholder: FileState = {
        id: fileId,
        name: file.name.replace(".dxf", ""),
        originalName: file.name,
        layers: [],
        selectedLayers: [],
        contours: [],
        dogbones: [],
        gaps: [],
        status: "processing",
      }
      addFile(placeholder)

      try {
        const rawText = await file.text()
        const dxfData = await parseDxf(file)
        if (!dxfData) { setFileStatus(fileId, "error"); continue }
        const layerNames = getDxfLayers(dxfData as any)
        const fileState = convertDxfToFileState(
          dxfData as any,
          file.name,
          layerNames,
          toolParams,
        )
        updateFile(fileId, {
          ...fileState,
          id: fileId,
          name: file.name.replace(".dxf", ""),
          originalName: file.name,
          status: "ready",
          rawDxfData: JSON.stringify(dxfData),
          rawDxfText: rawText,
        })
      } catch (err) {
        console.error("Failed to parse DXF:", err)
        setFileStatus(fileId, "error")
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".dxf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files)
            e.target.value = ""
          }
        }}
      />
      {children ? (
        <div onClick={() => inputRef.current?.click()}>{children}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} className="mr-1" />
          Import DXF
        </Button>
      )}
    </>
  )
}