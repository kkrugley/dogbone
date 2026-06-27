import { useState, useCallback } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Plus, Trash } from "@phosphor-icons/react"
import { useCADStore } from "@/store/cadStore"
import { generateDogbone } from "@/geometry/dogbone"
import type { Vertex } from "@/types/cad"

interface CornerPopoverProps {
  fileId: string
  vertex: Vertex
  vertexIndex: number
  contourId: string
  onClose: () => void
  open: boolean
  screenX: number
  screenY: number
}

export function CornerPopover({
  fileId,
  vertex,
  vertexIndex,
  contourId,
  open,
  screenX,
  screenY,
  onClose,
}: CornerPopoverProps) {
  const files = useCADStore((s) => s.files)
  const toolParams = useCADStore((s) => s.toolParams)
  const addDogbone = useCADStore((s) => s.addDogbone)
  const removeDogbone = useCADStore((s) => s.removeDogbone)
  const [showPopover, setShowPopover] = useState(false)

  const file = files.find((f) => f.id === fileId)
  const existingDogbone = file?.dogbones.find(
    (d) => d.vertexIndex === vertexIndex && d.contourId === contourId,
  )

  const handleAdd = useCallback(() => {
    const db = generateDogbone(
      vertex,
      vertexIndex,
      contourId,
      toolParams.toolDiameter / 2,
      Math.PI / 2,
      Math.PI / 4,
      toolParams.reliefType,
    )
    addDogbone(fileId, db)
    onClose()
  }, [vertex, vertexIndex, contourId, toolParams, fileId, addDogbone, onClose])

  const handleRemove = useCallback(() => {
    if (existingDogbone) {
      removeDogbone(fileId, existingDogbone.id)
    }
    onClose()
  }, [existingDogbone, fileId, removeDogbone, onClose])

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
          {existingDogbone ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash className="size-3.5 mr-1" />
              Remove dogbone
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
            >
              <Plus className="size-3.5 mr-1" />
              Add dogbone
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}