import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { repairContour } from "@/geometry/repair"
import type { Contour, Gap } from "@/types/cad"

export function GapPanel() {
  const files = useCADStore((s) => s.files)
  const activeFileId = useCADStore((s) => s.activeFileId)
  const updateFile = useCADStore((s) => s.updateFile)

  const file = files.find((f) => f.id === activeFileId)

  if (!file) return null

  const gaps = file.gaps
  const allClosed = gaps.length === 0

  function handleCloseGap(gap: Gap) {
    const contour = file!.contours.find((c) => c.id === gap.contourId)
    if (!contour) return

    const repaired = repairContour(contour, [gap], gap.tolerance)
    const updatedContours = file!.contours.map((c) =>
      c.id === contour.id ? repaired : c,
    )
    const updatedGaps = file!.gaps.filter((g) => g.id !== gap.id)

    updateFile(file!.id, {
      contours: updatedContours,
      gaps: updatedGaps,
    })
  }

  function handleCloseAllGaps() {
    const updatedContours: Contour[] = [...file!.contours]
    const remainingGaps: Gap[] = []

    for (const gap of file!.gaps) {
      if (!gap.canAutoFix) {
        remainingGaps.push(gap)
        continue
      }

      const contour = updatedContours.find((c) => c.id === gap.contourId)
      if (!contour) {
        remainingGaps.push(gap)
        continue
      }

      const idx = updatedContours.indexOf(contour)
      const repaired = repairContour(contour, [gap], gap.tolerance)
      updatedContours[idx] = repaired
    }

    updateFile(file!.id, {
      contours: updatedContours,
      gaps: remainingGaps,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Gaps ({gaps.length})
        </h3>
      </div>

      {allClosed ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-green-600 dark:text-green-400">
          <Check className="size-8" weight="bold" />
          <div className="text-sm font-medium">All contours are closed</div>
        </div>
      ) : (
        <>
          {gaps.some((g) => g.canAutoFix) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCloseAllGaps}
            >
              <Check className="size-4" />
              Close All Gaps
            </Button>
          )}

          <ScrollArea className="h-48">
            <div className="flex flex-col gap-1 pr-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {gap.distance.toFixed(4)}u
                      </span>
                      <Badge
                        variant={gap.canAutoFix ? "outline" : "destructive"}
                        className="shrink-0 text-xs"
                      >
                        {gap.canAutoFix ? "Auto-fixable" : "Manual"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground/60">
                      Tol: {gap.tolerance.toFixed(4)}
                    </div>
                  </div>
                  {gap.canAutoFix && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-green-600"
                      onClick={() => handleCloseGap(gap)}
                    >
                      <Check className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}