import { PreviewCell } from "@/components/cad/PreviewCell"
import { useCADStore } from "@/store/cadStore"

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
    </div>
  )
}