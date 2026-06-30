import { useCADStore } from "@/store/cadStore"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PreviewGrid } from "@/components/cad/PreviewGrid"
import { SingleView } from "@/components/cad/SingleView"
import { FileUpload } from "@/components/cad/FileUpload"
import { PresetsDialog } from "@/components/cad/PresetsDialog"
import { ReportDialog } from "@/components/cad/ReportDialog"
import { ParamsPanel } from "@/components/cad/ParamsPanel"
import { useHotkeys } from "@/hooks/useHotkeys"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Cube,
  Download,
  Upload,
} from "@phosphor-icons/react"
import { exportToDxfFile } from "@/features/export/writer"
import { createZipArchive, downloadZip } from "@/features/export/zipper"
import { parseDxf } from "@/features/import/parser"
import { convertDxfToFileState, getDxfLayers } from "@/features/import/converter"
import type { FileState } from "@/types/cad"
import { useCallback, useState, useRef } from "react"

function App() {
  useHotkeys()

  const files = useCADStore((s) => s.files)
  const activeFileId = useCADStore((s) => s.activeFileId)
  const viewMode = useCADStore((s) => s.viewMode)
  const setViewMode = useCADStore((s) => s.setViewMode)
  const setActiveFile = useCADStore((s) => s.setActiveFile)
  const toolParams = useCADStore((s) => s.toolParams)

  const activeFile = files.find((f) => f.id === activeFileId)

  const handleExportCurrent = async () => {
    if (!activeFile) return
    const blob = await exportToDxfFile(activeFile, toolParams)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeFile.originalName.replace(".dxf", "")}_processed.dxf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = async () => {
    const zipFiles: Array<{ name: string; data: string }> = []
    for (const file of files) {
      if (file.status === "ready") {
        const blob = await exportToDxfFile(file, toolParams)
        zipFiles.push({
          name: `${file.originalName.replace(".dxf", "")}_processed.dxf`,
          data: await blob.text(),
        })
      }
    }
    const zipData = await createZipArchive(zipFiles)
    downloadZip(zipData, "processed_files.zip")
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {files.length > 0 && (
          <header className="flex h-12 items-center gap-3 border-b px-4 shrink-0">
            <Cube size={24} weight="bold" className="text-primary" />
            <span className="font-semibold text-sm">DogBone</span>

          {files.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />

              <div className="flex items-center gap-2">
                <PresetsDialog />
                <ReportDialog />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCurrent}
                  disabled={!activeFile || activeFile.status !== "ready"}
                >
                  <Download size={16} className="mr-1" />
                  Export
                </Button>

                {files.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportAll}
                  >
                    <Download size={16} className="mr-1" />
                    Export All (ZIP)
                  </Button>
                )}

                <Badge variant="secondary" className="text-xs">
                  {files.length} file{files.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </>
          )}
        </header>
          )}

        <main className="flex-1 overflow-hidden">
          {files.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex h-full">
              <div className="flex-1 overflow-auto">
                {viewMode === "single" && activeFile ? (
                  <SingleView />
                ) : (
                  <PreviewGrid />
                )}
              </div>
              {files.length > 0 && (
                <ParamsPanel />
              )}
            </div>
          )}
        </main>

        {files.length > 0 && activeFile && (
          <footer className="flex h-8 items-center gap-3 border-t px-4 text-xs text-muted-foreground shrink-0">
            <span>{activeFile.originalName}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              {activeFile.contours.length} contour
              {activeFile.contours.length !== 1 ? "s" : ""}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              {activeFile.dogbones.filter((d) => d.enabled).length} dogbones
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              {activeFile.gaps.length} gap
              {activeFile.gaps.length !== 1 ? "s" : ""}
            </span>
          </footer>
        )}
      </div>
    </TooltipProvider>
  )
}

function EmptyState() {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const addFile = useCADStore((s) => s.addFile)
  const setFileStatus = useCADStore((s) => s.setFileStatus)
  const updateFile = useCADStore((s) => s.updateFile)
  const toolParams = useCADStore((s) => s.toolParams)

  const handleFiles = useCallback(async (fileList: FileList) => {
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
  }, [addFile, setFileStatus, updateFile, toolParams])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="mb-8 flex items-center gap-2">
        <Cube size={28} weight="bold" className="text-primary" />
        <span className="text-lg font-semibold">DogBone</span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          flex cursor-pointer flex-col items-center justify-center gap-4
          rounded-2xl border-2 border-dashed p-16 max-w-lg
          transition-colors duration-150
          ${isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
          }
        `}
      >
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

        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Upload size={28} className="text-muted-foreground" />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold">Import DXF File</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag & drop your DXF files here, or click to browse
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
          <Upload size={16} className="mr-1" />
          Browse Files
        </Button>
      </div>
    </div>
  )
}

export default App