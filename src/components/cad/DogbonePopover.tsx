import { useCallback } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Trash } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"

interface DogbonePopoverProps {
  fileId: string
  dogboneId: string
  onClose: () => void
  open: boolean
  screenX: number
  screenY: number
}

export function DogbonePopover({
  fileId,
  dogboneId,
  open,
  screenX,
  screenY,
  onClose,
}: DogbonePopoverProps) {
  const removeDogbone = useCADStore((s) => s.removeDogbone)

  const handleRemove = useCallback(() => {
    removeDogbone(fileId, dogboneId)
    onClose()
  }, [fileId, dogboneId, removeDogbone, onClose])

  if (!open) return null

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            left: screenX,
            top: screenY,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1"
        align="center"
        side="top"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash className="size-3.5 mr-1" />
            Remove dogbone
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
