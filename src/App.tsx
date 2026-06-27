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
  Stack,
} from "@phosphor-icons/react"
import { exportToDxfFile } from "@/features/export/writer"
import { createZipArchive, downloadZip } from "@/features/export/zipper"

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
        <header className="flex h-12 items-center gap-3 border-b px-4 shrink-0">
          <Cube size={24} weight="bold" className="text-primary" />
          <span className="font-semibold text-sm">DogBone</span>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <FileUpload />

          {files.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveFile(null)
                  setViewMode("grid")
                }}
              >
                <Stack size={16} className="mr-1" />
                Grid
              </Button>

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

              <div className="ml-auto flex items-center gap-2">
                <PresetsDialog />
                <ReportDialog />
                <Badge variant="secondary" className="text-xs">
                  {files.length} file{files.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </>
          )}
        </header>

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
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Upload size={32} className="text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Import DXF File</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a DXF file to start processing. The app will detect inner
            corners and generate dog-bone relief cuts for CNC routing.
          </p>
        </div>
        <FileUpload />
        <p className="text-xs text-muted-foreground/60 mt-4">
          Hotkeys: V=Select A=Add D=Remove Z=Zoom H=Pan Delete=Remove dogbone
        </p>
      </div>
    </div>
  )
}

export default App