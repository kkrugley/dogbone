import { PreviewCell } from "@/components/cad/PreviewCell"
import { FileUpload } from "@/components/cad/FileUpload"
import { useCADStore } from "@/store/cadStore"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "@phosphor-icons/react"

export function PreviewGrid() {
  const files = useCADStore((s) => s.files)
  const viewMode = useCADStore((s) => s.viewMode)
  const setViewMode = useCADStore((s) => s.setViewMode)
  const setActiveFile = useCADStore((s) => s.setActiveFile)

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="text-lg font-medium">No files loaded</div>
        <div className="mt-1 text-sm">
          Import a DXF file to get started
        </div>
      </div>
    )
  }

  if (viewMode !== "grid") return null

  function handleCellClick(fileId: string) {
    setActiveFile(fileId)
    setViewMode("single")
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <PreviewCell
          key={file.id}
          file={file}
          onClick={() => handleCellClick(file.id)}
        />
      ))}
      <FileUpload>
        <Card className="flex min-h-[310px] cursor-pointer items-center justify-center transition-colors hover:border-primary/50 hover:bg-muted/30">
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Plus size={24} className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Add File</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Click to import another DXF
              </div>
            </div>
          </CardContent>
        </Card>
      </FileUpload>
    </div>
  )
}