import type { FileState } from "@/types/cad"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/cad/StatusBadge"
import { CadCanvas } from "@/components/cad/CadCanvas"

interface PreviewCellProps {
  file: FileState
  onClick: () => void
}

export function PreviewCell({ file, onClick }: PreviewCellProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-t-xl">
          <CadCanvas fileId={file.id} interactive={false} height={250} />
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{file.contours.length} contours</span>
              <span>&middot;</span>
              <span>{file.dogbones.length} dogbones</span>
              <span>&middot;</span>
              <span>{file.gaps.length} gaps</span>
            </div>
          </div>
          <StatusBadge status={file.status} />
        </div>
      </CardContent>
    </Card>
  )
}