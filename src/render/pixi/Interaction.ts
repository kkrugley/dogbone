import type { Application } from "pixi.js"
import type { Contour, Dogbone, Viewport } from "@/types/cad"

const MIN_SCALE = 0.05
const MAX_SCALE = 50

interface ZoomPanCallbacks {
  getViewport: () => Viewport
  setViewport: (vp: Partial<Viewport>) => void
}

export function setupZoomPan(
  app: Application,
  callbacks: ZoomPanCallbacks,
): () => void {
  const canvas = app.canvas

  let isPanning = false
  let panStartX = 0
  let panStartY = 0
  let panViewportX = 0
  let panViewportY = 0

  function toCanvas(
    clientX: number,
    clientY: number,
  ): { cx: number; cy: number } {
    const rect = canvas.getBoundingClientRect()
    return {
      cx: clientX - rect.left,
      cy: clientY - rect.top,
    }
  }

  function onPointerDown(e: PointerEvent): void {
    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    const vp = callbacks.getViewport()
    panViewportX = vp.x
    panViewportY = vp.y
    canvas.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isPanning) return

    const dx = e.clientX - panStartX
    const dy = e.clientY - panStartY
    callbacks.setViewport({
      x: panViewportX + dx,
      y: panViewportY + dy,
    })
  }

  function onPointerUp(): void {
    isPanning = false
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()

    const { cx, cy } = toCanvas(e.clientX, e.clientY)
    const vp = callbacks.getViewport()

    const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, vp.scale * zoomFactor),
    )

    const worldX = (cx - vp.x) / vp.scale
    const worldY = (cy - vp.y) / vp.scale

    callbacks.setViewport({
      scale: newScale,
      x: cx - worldX * newScale,
      y: cy - worldY * newScale,
    })
  }

  canvas.addEventListener("pointerdown", onPointerDown)
  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("pointerleave", onPointerUp)
  canvas.addEventListener("wheel", onWheel, { passive: false })

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown)
    canvas.removeEventListener("pointermove", onPointerMove)
    canvas.removeEventListener("pointerup", onPointerUp)
    canvas.removeEventListener("pointerleave", onPointerUp)
    canvas.removeEventListener("wheel", onWheel)
  }
}

interface HitDetectionCallbacks {
  getDogbones: () => Dogbone[]
  getContours: () => Contour[]
  getViewport: () => Viewport
  onHover: (vertexIndex: number | null) => void
  onClick: (vertexIndex: number | null) => void
  onVertexClick?: (info: { vertexIndex: number; contourId: string; vertex: Vertex; screenX: number; screenY: number } | null) => void
}

export function setupHitDetection(
  app: Application,
  callbacks: HitDetectionCallbacks,
): () => void {
  const canvas = app.canvas

  function findDogboneAt(
    clientX: number,
    clientY: number,
  ): number | null {
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const vp = callbacks.getViewport()
    const worldX = (mx - vp.x) / vp.scale
    const worldY = (my - vp.y) / vp.scale

    const dogbones = callbacks.getDogbones()
    for (const db of dogbones) {
      const dx = worldX - db.vertex.x
      const dy = worldY - db.vertex.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= db.radius + 4 / vp.scale) {
        return db.vertexIndex
      }
    }
    return null
  }

  function findVertexAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const vp = callbacks.getViewport()
    const worldX = (mx - vp.x) / vp.scale
    const worldY = (my - vp.y) / vp.scale

    const hitRadius = 8 / vp.scale

    const contours = callbacks.getContours()
    for (const contour of contours) {
      for (let i = 0; i < contour.vertices.length; i++) {
        const v = contour.vertices[i]
        const dx = worldX - v.x
        const dy = worldY - v.y
        if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
          return {
            vertexIndex: i,
            contourId: contour.id,
            vertex: { x: v.x, y: v.y },
            screenX: clientX,
            screenY: clientY,
          }
        }
      }
    }
    return null
  }

  function onPointerMove(e: PointerEvent): void {
    const dogIdx = findDogboneAt(e.clientX, e.clientY)
    callbacks.onHover(dogIdx)
  }

  function onPointerDown(e: PointerEvent): void {
    const dbIdx = findDogboneAt(e.clientX, e.clientY)
    if (dbIdx !== null) {
      callbacks.onClick(dbIdx)
    } else if (callbacks.onVertexClick) {
      const vertInfo = findVertexAt(e.clientX, e.clientY)
      callbacks.onVertexClick(vertInfo)
    } else {
      callbacks.onClick(null)
    }
  }

  function onPointerLeave(): void {
    callbacks.onHover(null)
  }

  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerdown", onPointerDown)
  canvas.addEventListener("pointerleave", onPointerLeave)

  return () => {
    canvas.removeEventListener("pointermove", onPointerMove)
    canvas.removeEventListener("pointerdown", onPointerDown)
    canvas.removeEventListener("pointerleave", onPointerLeave)
  }
}