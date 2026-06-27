import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Download, Play, File } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { exportToDxf } from "@/features/export/writer"
import { createZipArchive, downloadZip } from "@/features/export/zipper"

export function BatchPanel() {
  const files = useCADStore((s) => s.files)
  const toolParams = useCADStore((s) => s.toolParams)
  const batchProgress = useCADStore((s) => s.batchProgress)
  const setBatchProgress = useCADStore((s) => s.setBatchProgress)

  const canProcess = files.length > 1

  const handleProcessAll = useCallback(async () => {
    setBatchProgress({ total: files.length, completed: 0, currentFile: "" })

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setBatchProgress({
        total: files.length,
        completed: i,
        currentFile: f.name,
      })
      await new Promise((r) => setTimeout(r, 100))
    }

    setBatchProgress({
      total: files.length,
      completed: files.length,
      currentFile: "",
    })
  }, [files, setBatchProgress])

  const handleDownloadAll = useCallback(async () => {
    const exports = files.map((f) => ({
      name: `${f.name}.dxf`,
      data: exportToDxf(f, toolParams),
    }))

    const zipData = await createZipArchive(exports)
    downloadZip(zipData, "dogbone-exports.zip")
  }, [files, toolParams])

  if (!canProcess) return null

  const isProcessing =
    batchProgress !== null &&
    batchProgress.completed < batchProgress.total
  const isComplete =
    batchProgress !== null &&
    batchProgress.completed === batchProgress.total

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <File className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {files.length} files loaded
          </span>
        </div>
      </div>

      {isProcessing && batchProgress && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Processing {batchProgress.currentFile}
            </span>
            <span>
              {batchProgress.completed}/{batchProgress.total}
            </span>
          </div>
          <Progress
            value={
              (batchProgress.completed / batchProgress.total) * 100
            }
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleProcessAll}
          disabled={isProcessing}
        >
          <Play className="size-4" />
          Process All Files
        </Button>
        {isComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadAll}
          >
            <Download className="size-4" />
            Download All (ZIP)
          </Button>
        )}
      </div>
    </div>
  )
}