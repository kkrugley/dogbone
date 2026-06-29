import {
  ArrowLeft,
  Crosshair,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CadCanvas } from "@/components/cad/CadCanvas"
import { DogboneList } from "@/components/cad/DogboneList"
import { GapPanel } from "@/components/cad/GapPanel"
import { StatusBadge } from "@/components/cad/StatusBadge"
import { useCADStore } from "@/store/cadStore"

export function SingleView() {
  const activeFileId = useCADStore((s) => s.activeFileId)
  const files = useCADStore((s) => s.files)
  const viewMode = useCADStore((s) => s.viewMode)
  const setViewMode = useCADStore((s) => s.setViewMode)
  const resetViewport = useCADStore((s) => s.resetViewport)

  if (viewMode !== "single") return null

  const file = files.find((f) => f.id === activeFileId)
  if (!file) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        {files.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <ArrowLeft className="size-4" />
            Back to grid
          </Button>
        )}
        <Separator orientation="vertical" className="h-5" />
        <span className="truncate text-sm font-medium">{file.name}</span>
        <StatusBadge status={file.status} />
        <div className="ml-auto" />
        <Button
          variant="ghost"
          size="sm"
          onClick={resetViewport}
        >
          <Crosshair className="size-4" />
          Reset view
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 bg-muted/10">
          <CadCanvas
            fileId={file.id}
            interactive
          />
        </div>

        <div className="flex w-72 shrink-0 flex-col overflow-hidden border-l bg-card">
          <Tabs defaultValue="dogbones" className="relative flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-3 mt-3 shrink-0">
              <TabsTrigger value="dogbones" className="flex-1">
                Dogbones
              </TabsTrigger>
              <TabsTrigger value="gaps" className="flex-1">
                Gaps
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="dogbones"
              className="relative flex-1 px-3 pb-3 pt-0"
            >
              <Card className="absolute inset-0">
                <CardContent className="h-full overflow-y-auto p-3">
                  <DogboneList />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="gaps"
              className="relative flex-1 px-3 pb-3 pt-0"
            >
              <Card className="absolute inset-0">
                <CardContent className="h-full overflow-y-auto p-3">
                  <GapPanel />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t px-4 py-1.5 text-xs text-muted-foreground">
        <span>
          {file.contours.length} contours
        </span>
        <span>&middot;</span>
        <span>
          {file.dogbones.length} dogbones (
          {file.dogbones.filter((d) => d.enabled).length} enabled)
        </span>
        <span>&middot;</span>
        <span>
          {file.gaps.length} gaps
        </span>
      </div>
    </div>
  )
}