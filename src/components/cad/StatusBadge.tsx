import type { FileState } from "@/types/cad"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: FileState["status"]
}

const statusConfig: Record<
  FileState["status"],
  { label: string; className: string }
> = {
  idle: {
    label: "Pending",
    className: "bg-muted text-muted-foreground hover:bg-muted/80",
  },
  processing: {
    label: "Processing...",
    className:
      "border-transparent bg-yellow-500/15 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
  },
  ready: {
    label: "Ready",
    className:
      "border-transparent bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  },
  error: {
    label: "Error",
    className:
      "border-transparent bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return <Badge className={cn(config.className)}>{config.label}</Badge>
}