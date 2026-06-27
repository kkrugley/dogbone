import type { Vertex } from "@/types/cad"

export function distance(a: Vertex, b: Vertex): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function angleBetween(a: Vertex, b: Vertex, c: Vertex): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const cross = ab.x * cb.y - ab.y * cb.x
  return Math.atan2(Math.abs(cross), dot)
}

export function midpoint(a: Vertex, b: Vertex): Vertex {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

export function normalize(v: Vertex): Vertex {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function subtract(a: Vertex, b: Vertex): Vertex {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function add(a: Vertex, b: Vertex): Vertex {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function scale(v: Vertex, s: number): Vertex {
  return { x: v.x * s, y: v.y * s }
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

export function cross2d(a: Vertex, b: Vertex): number {
  return a.x * b.y - a.y * b.x
}

export function polygonArea(vertices: Vertex[]): number {
  let area = 0
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length
    area += vertices[i].x * vertices[j].y
    area -= vertices[j].x * vertices[i].y
  }
  return area / 2
}