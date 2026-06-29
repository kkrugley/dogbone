import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"

export function DogboneList() {
  const files = useCADStore((s) => s.files)
  const activeFileId = useCADStore((s) => s.activeFileId)
  const toggleDogbone = useCADStore((s) => s.toggleDogbone)
  const removeDogbone = useCADStore((s) => s.removeDogbone)

  const file = files.find((f) => f.id === activeFileId)
  const dogbones = file?.dogbones ?? []

  if (!file) return null

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-medium">
          Dogbones ({dogbones.length})
        </h3>
      </div>

      {dogbones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground shrink-0">
          <div className="text-sm">No dogbones generated</div>
          <div className="text-xs">
            Use the tool to add dogbones to internal corners
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {dogbones.map((db) => (
            <div
              key={db.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
            >
              <Checkbox
                checked={db.enabled}
                onCheckedChange={() => toggleDogbone(file.id, db.id)}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs font-mono"
                  >
                    {db.type}
                  </Badge>
                  <span className="truncate text-xs text-muted-foreground">
                    V{db.vertexIndex}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground/60">
                  R:{db.radius.toFixed(2)} &theta;:{((db.angle * 180) / Math.PI).toFixed(1)}&deg;
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeDogbone(file.id, db.id)}
              >
                <Trash className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}