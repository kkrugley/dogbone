import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { X, Plus } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { parseDxfFromBuffer } from "@/features/import/parser"
import { convertDxfToFileState, getDxfLayers } from "@/features/import/converter"

export function ParamsPanel() {
  const toolParams = useCADStore((s) => s.toolParams)
  const setToolParams = useCADStore((s) => s.setToolParams)
  const files = useCADStore((s) => s.files)
  const updateFile = useCADStore((s) => s.updateFile)

  const handleReprocess = useCallback(() => {
    for (const file of files) {
      if (!file.rawDxfText) continue
      try {
        const dxfData = parseDxfFromBuffer(file.rawDxfText)
        const layerNames = getDxfLayers(dxfData as Parameters<typeof getDxfLayers>[0])
        const result = convertDxfToFileState(
          dxfData as Parameters<typeof convertDxfToFileState>[0],
          file.originalName,
          layerNames,
          toolParams,
        )
        updateFile(file.id, {
          contours: result.contours,
          dogbones: result.dogbones,
          gaps: result.gaps,
        })
      } catch (e) {
        console.error("Reprocess failed for", file.name, e)
      }
    }
  }, [files, toolParams, updateFile])

  return (
    <div className="flex w-72 shrink-0 flex-col border-l bg-card">
      <div className="flex-1 overflow-auto px-3 py-3">
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm">Tool Parameters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tool Diameter</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[toolParams.toolDiameter]}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onValueChange={([v]) =>
                    v != null && setToolParams({ toolDiameter: v })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={toolParams.toolDiameter}
                  onChange={(e) =>
                    setToolParams({ toolDiameter: Number(e.target.value) })
                  }
                  className="h-7 w-16 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Relief Type</Label>
              <Select
                value={toolParams.reliefType}
                onValueChange={(v) =>
                  setToolParams({
                    reliefType: v as typeof toolParams.reliefType,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dogbone">Dogbone</SelectItem>
                  <SelectItem value="tbone">T-bone</SelectItem>
                  <SelectItem value="bone-offset">Bone Offset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tolerance</Label>
              <Input
                type="number"
                min={0.001}
                max={1}
                step={0.001}
                value={toolParams.tolerance}
                onChange={(e) =>
                  setToolParams({ tolerance: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Min Angle (&deg;)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[toolParams.minAngle]}
                  min={30}
                  max={180}
                  step={1}
                  onValueChange={([v]) =>
                    v != null && setToolParams({ minAngle: v })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={30}
                  max={180}
                  step={1}
                  value={toolParams.minAngle}
                  onChange={(e) =>
                    setToolParams({ minAngle: Number(e.target.value) })
                  }
                  className="h-7 w-14 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Overcut</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={toolParams.overcut}
                onChange={(e) =>
                  setToolParams({ overcut: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Ignore Layers</Label>
              <div className="flex flex-wrap gap-1">
                {["text", "mark", "logo", "engraving"].map((name) => {
                  const isIgnored = toolParams.ignoredLayers.includes(name)
                  return (
                    <Button
                      key={name}
                      variant={isIgnored ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        const next = isIgnored
                          ? toolParams.ignoredLayers.filter((l) => l !== name)
                          : [...toolParams.ignoredLayers, name]
                        setToolParams({ ignoredLayers: next })
                      }}
                    >
                      {name}
                    </Button>
                  )
                })}
              </div>
              {toolParams.ignoredLayers.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {toolParams.ignoredLayers.map((layer) => (
                    <div key={layer} className="flex items-center gap-1">
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {layer}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => {
                          setToolParams({
                            ignoredLayers: toolParams.ignoredLayers.filter(
                              (l) => l !== layer,
                            ),
                          })
                        }}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1 mt-1">
                <Input
                  placeholder="Layer name..."
                  className="h-7 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = (e.target as HTMLInputElement).value.trim()
                      if (value && !toolParams.ignoredLayers.includes(value)) {
                        setToolParams({
                          ignoredLayers: [...toolParams.ignoredLayers, value],
                        })
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={(e) => {
                    const input = (e.currentTarget as HTMLButtonElement)
                      .previousElementSibling as HTMLInputElement
                    const value = input.value.trim()
                    if (value && !toolParams.ignoredLayers.includes(value)) {
                      setToolParams({
                        ignoredLayers: [...toolParams.ignoredLayers, value],
                      })
                      input.value = ""
                    }
                  }}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            <Separator />

            <Button size="sm" className="w-full text-xs" onClick={handleReprocess}>
              Apply &amp; Re-process
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}