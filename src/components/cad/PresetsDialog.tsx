import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FloppyDisk, Trash, Plus, Gear } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { uid } from "@/utils/id"

export function PresetsDialog() {
  const presets = useCADStore((s) => s.presets)
  const addPreset = useCADStore((s) => s.addPreset)
  const removePreset = useCADStore((s) => s.removePreset)
  const applyPreset = useCADStore((s) => s.applyPreset)
  const toolParams = useCADStore((s) => s.toolParams)

  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    if (!name.trim()) return
    addPreset({
      id: uid(),
      name: name.trim(),
      params: { ...toolParams },
    })
    setName("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FloppyDisk size={16} className="mr-1" />
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gear size={18} />
            Tool Presets
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Preset name (e.g. Plywood 12mm)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            <Plus size={14} className="mr-1" />
            Save
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-48">
          {presets.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No saved presets yet. Save your current parameters above.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Tool: {p.params.toolDiameter}mm &middot;
                      {p.params.reliefType} &middot; Angle &lt;
                      {p.params.minAngle}&deg;
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      applyPreset(p.id)
                      setOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removePreset(p.id)}
                  >
                    <Trash size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}