import { useEffect, useRef, useCallback, useState } from "react"
import type { Application } from "pixi.js"
import { createPixiApp, initPixiApp, destroyApp, resizeApp } from "@/render/pixi/PixiApp"
import { createLayers } from "@/render/pixi/layers"
import type { CanvasLayers } from "@/render/pixi/layers"
import { getContoursBounds, fitViewport, renderContours } from "@/render/pixi/ContourRenderer"
import { renderDogbones } from "@/render/pixi/DogboneRenderer"
import { renderGaps } from "@/render/pixi/GapRenderer"
import { setupZoomPan, setupHitDetection } from "@/render/pixi/Interaction"
import { useCADStore } from "@/store/cadStore"
import { CornerPopover } from "@/components/cad/CornerPopover"
import type { Vertex } from "@/types/cad"

interface CadCanvasProps {
  fileId: string
  interactive?: boolean
  height?: number
}

interface VertexInfo {
  vertexIndex: number
  contourId: string
  vertex: Vertex
  screenX: number
  screenY: number
}

export function CadCanvas({
  fileId,
  interactive = false,
  height = 500,
}: CadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const layersRef = useRef<CanvasLayers | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const readyRef = useRef(false)
  const [cornerPopover, setCornerPopover] = useState<VertexInfo | null>(null)

  const renderAll = useCallback(() => {
    const layers = layersRef.current
    if (!layers) return
    const state = useCADStore.getState()
    const file = state.files.find((f) => f.id === fileId)
    if (!file) return

    let vp = state.viewport

    if (!interactive) {
      const bounds = getContoursBounds(file.contours)
      if (bounds) {
        const container = containerRef.current
        const w = container?.getBoundingClientRect().width ?? 600
        vp = fitViewport(bounds, w, height, 10)
      }
    }

    renderContours(layers.originalLayer, file.contours, vp)
    renderDogbones(
      layers.dogboneLayer,
      file.dogbones,
      vp,
      state.selectedDogboneId,
    )
    renderGaps(layers.gapLayer, file.gaps, vp)
  }, [fileId, interactive, height])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const w = Math.max(rect.width, 1)
    const h = interactive ? Math.max(rect.height, 1) : height

    const app = createPixiApp()
    appRef.current = app
    readyRef.current = false

    initPixiApp(app, canvas, w, h).then(() => {
      const layers = createLayers(app)
      layersRef.current = layers
      readyRef.current = true

      const currentRect = container.getBoundingClientRect()
      resizeApp(app, Math.max(currentRect.width, 1), interactive ? Math.max(currentRect.height, 1) : height)

      renderAll()

      if (interactive) {
        const zoomCleanup = setupZoomPan(app, {
          getViewport: () => useCADStore.getState().viewport,
          setViewport: (v) => useCADStore.getState().setViewport(v),
        })
        cleanupRef.current.push(zoomCleanup)

        const hitCleanup = setupHitDetection(app, {
          getDogbones: () => {
            const f = useCADStore.getState().files.find((x) => x.id === fileId)
            return f?.dogbones ?? []
          },
          getContours: () => {
            const f = useCADStore.getState().files.find((x) => x.id === fileId)
            return f?.contours ?? []
          },
          getViewport: () => useCADStore.getState().viewport,
          onHover: (vertexIndex) => {
            useCADStore.getState().setHoveredVertex(vertexIndex)
          },
          onClick: () => {},
          onVertexClick: (info) => {
            if (info) {
              setCornerPopover(info)
            } else {
              setCornerPopover(null)
            }
          },
        })
        cleanupRef.current.push(hitCleanup)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      if (appRef.current && readyRef.current && containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        resizeApp(appRef.current, Math.max(r.width, 1), interactive ? Math.max(r.height, 1) : height)
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      for (const cleanup of cleanupRef.current) {
        cleanup()
      }
      cleanupRef.current = []
      if (appRef.current) {
        destroyApp(appRef.current)
        appRef.current = null
      }
      layersRef.current = null
      readyRef.current = false
    }
  }, [fileId, interactive, height, renderAll])

  useEffect(() => {
    const unsub = useCADStore.subscribe(() => {
      if (readyRef.current) {
        renderAll()
      }
    })

    return () => {
      unsub()
    }
  }, [renderAll])

  return (
    <div
      ref={containerRef}
      className="relative size-full overflow-hidden"
      style={{ height: interactive ? undefined : height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {cornerPopover && (
        <CornerPopover
          fileId={fileId}
          vertex={cornerPopover.vertex}
          vertexIndex={cornerPopover.vertexIndex}
          contourId={cornerPopover.contourId}
          open={true}
          screenX={cornerPopover.screenX}
          screenY={cornerPopover.screenY}
          onClose={() => setCornerPopover(null)}
        />
      )}
      {interactive && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
          Scroll to zoom &middot; Drag to pan
        </div>
      )}
    </div>
  )
}