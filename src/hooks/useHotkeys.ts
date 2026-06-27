import { useEffect } from "react"
import { useStore } from "zustand"
import { useCADStore } from "@/store/cadStore"

export function useHotkeys() {
  const tool = useCADStore((s) => s.tool)
  const setTool = useCADStore((s) => s.setTool)
  const selectedDogboneId = useCADStore((s) => s.selectedDogboneId)
  const removeDogbone = useCADStore((s) => s.removeDogbone)
  const activeFileId = useCADStore((s) => s.activeFileId)
  const files = useCADStore((s) => s.files)
  const undo = useStore(useCADStore.temporal, (s) => s.undo)
  const redo = useStore(useCADStore.temporal, (s) => s.redo)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      switch (e.key) {
        case "v":
          setTool("select")
          break
        case "a":
          setTool("add-dogbone")
          break
        case "d":
          setTool("remove-dogbone")
          break
        case "h":
          setTool("pan")
          break
        case "Delete":
        case "Backspace":
          if (selectedDogboneId && activeFileId) {
            removeDogbone(activeFileId, selectedDogboneId)
          }
          break
        case "Escape":
          useCADStore.getState().setSelectedDogbone(null)
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [
    tool,
    setTool,
    selectedDogboneId,
    removeDogbone,
    activeFileId,
    files,
    undo,
    redo,
  ])
}