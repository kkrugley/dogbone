import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardText, Warning, File } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import type { ValidationReport } from "@/types/cad"

function computeReport(): ValidationReport | null {
  const files = useCADStore.getState().files
  const activeFileId = useCADStore.getState().activeFileId
  const file = files.find((f) => f.id === activeFileId)
  if (!file) return null

  const totalContours = file.contours.length
  const closedContours = file.contours.filter((c) => c.closed).length
  const openContours = totalContours - closedContours
  const gaps = file.gaps.length
  const fixableGaps = file.gaps.filter((g) => g.canAutoFix).length
  const dogbonesAdded = file.dogbones.length
  const warnings: string[] = []

  if (openContours > 0) {
    warnings.push(
      `${openContours} contour${openContours > 1 ? "s" : ""} not closed`,
    )
  }

  file.contours.forEach((c) => {
    if (c.vertices.length < 3) {
      warnings.push(`Contour ${c.id} has fewer than 3 vertices`)
    }
  })

  return {
    totalContours,
    closedContours,
    openContours,
    gaps,
    fixedGaps: fixableGaps,
    dogbonesAdded,
    warnings,
  }
}

export function ReportDialog() {
  const [open, setOpen] = useState(false)
  const activeFileId = useCADStore((s) => s.activeFileId)
  const files = useCADStore((s) => s.files)
  const file = files.find((f) => f.id === activeFileId)
  const report = file ? computeReport() : null

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <ClipboardText size={16} className="mr-1" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File size={18} />
            Processing Report
          </DialogTitle>
        </DialogHeader>

        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Total Contours
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {report.totalContours}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Closed / Open
                </div>
                <div className="mt-1 text-lg font-semibold">
                  <span className="text-green-600">{report.closedContours}</span>
                  {" / "}
                  <span className="text-red-500">{report.openContours}</span>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Dogbones Added
                </div>
                <div className="mt-1 text-lg font-semibold text-blue-600">
                  {report.dogbonesAdded}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Gaps / Fixable
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {report.gaps}
                  <span className="text-green-600 text-sm">
                    {" "}
                    ({report.fixedGaps} fixable)
                  </span>
                </div>
              </div>
            </div>

            {report.warnings.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Warning size={14} className="text-yellow-500" />
                    Warnings
                  </div>
                  <ScrollArea className="h-24">
                    <div className="flex flex-col gap-1">
                      {report.warnings.map((w, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="justify-start text-xs"
                        >
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}