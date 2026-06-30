import { useCADStore } from "@/store/cadStore"
import { Button } from "@/components/ui/button"
import {
  Hand,
  SelectionPlus,
  PlusCircle,
  MinusCircle,
} from "@phosphor-icons/react"

const tools = [
  { id: "pan" as const, label: "Pan", icon: Hand },
  { id: "select" as const, label: "Select", icon: SelectionPlus },
  { id: "add-dogbone" as const, label: "Add", icon: PlusCircle },
  { id: "remove-dogbone" as const, label: "Remove", icon: MinusCircle },
]

export function Toolbar() {
  const tool = useCADStore((s) => s.tool)
  const setTool = useCADStore((s) => s.setTool)

  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-lg border bg-card p-1.5 shadow-sm">
      {tools.map((t) => {
        const active = tool === t.id
        return (
          <Button
            key={t.id}
            variant={active ? "default" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setTool(t.id)}
            title={t.label}
          >
            <t.icon className="size-4" />
          </Button>
        )
      })}
    </div>
  )
}
