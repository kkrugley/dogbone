import type { Vertex } from "@/types/cad"

export function subtract(a: Vertex, b: Vertex): Vertex {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function normalize(v: Vertex): Vertex {
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

export function cross2d(a: Vertex, b: Vertex): number {
  return a.x * b.y - a.y * b.x
}

export function dot2d(a: Vertex, b: Vertex): number {
  return a.x * b.x + a.y * b.y
}

export function distance(a: Vertex, b: Vertex): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function angleBetween(a: Vertex, b: Vertex, c: Vertex): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const cross = ab.x * cb.y - ab.y * cb.x
  return Math.atan2(Math.abs(cross), dot)
}

export function polygonArea(vertices: Vertex[]): number {
  let area = 0
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += vertices[i].x * vertices[j].y
    area -= vertices[j].x * vertices[i].y
  }
  return area / 2
}

export function add(a: Vertex, b: Vertex): Vertex {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function scale(v: Vertex, s: number): Vertex {
  return { x: v.x * s, y: v.y * s }
}

export function midpoint(a: Vertex, b: Vertex): Vertex {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

export function perpClockwise(v: Vertex): Vertex {
  return { x: v.y, y: -v.x }
}

export function perpCounterClockwise(v: Vertex): Vertex {
  return { x: -v.y, y: v.x }
}

export function dot(a: Vertex, b: Vertex): number {
  return a.x * b.x + a.y * b.y
}

export function getContourThickness(contour: { vertices: Vertex[] }): number {
  if (contour.vertices.length < 2) return 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const v of contour.vertices) {
    if (v.x < minX) minX = v.x
    if (v.y < minY) minY = v.y
    if (v.x > maxX) maxX = v.x
    if (v.y > maxY) maxY = v.y
  }
  const w = maxX - minX
  const h = maxY - minY
  return Math.min(w, h)
}