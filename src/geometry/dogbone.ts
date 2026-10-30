import type { Contour, Dogbone, ToolParams, Vertex } from "@/types/cad"
import { uid } from "@/utils/id"
import { findInternalCorners } from "@/geometry/corner"
import { distance, polygonArea } from "@/utils/math"

export function generateDogbone(
  vertex: Vertex,
  vertexIndex: number,
  contourId: string,
  toolRadius: number,
  angle: number,
  bisectorAngle: number,
): Dogbone {
  const direction: Vertex = {
    x: Math.cos(bisectorAngle),
    y: Math.sin(bisectorAngle),
  }

  return {
    id: uid(),
    contourId,
    vertexIndex,
    vertex: { x: vertex.x, y: vertex.y },
    radius: toolRadius,
    angle,
    bisectorAngle,
    direction,
    type: "dogbone",
    enabled: true,
  }
}

interface ReliefOption {
  dogbone?: Dogbone
  incoming: number
  outgoing: number
  cost: number
}

/** Solve the closed chain jointly; choosing each corner in isolation can clash. */
function chooseReliefs(options: ReliefOption[][], lengths: number[]): Dogbone[] {
  let bestCost = Infinity
  let best: ReliefOption[] = []
  for (let first = 0; first < options[0].length; first++) {
    let states = options[0].map((_, i) => i === first
      ? { cost: options[0][i].cost, path: [i] } : { cost: Infinity, path: [] as number[] })
    for (let i = 1; i < options.length; i++) {
      states = options[i].map((option, optionIndex) => {
        let cost = Infinity
        let path: number[] = []
        for (let j = 0; j < states.length; j++) {
          if (!Number.isFinite(states[j].cost)) continue
          if (options[i - 1][j].outgoing + option.incoming >= lengths[i - 1] - 1e-7) continue
          const nextCost = states[j].cost + option.cost
          if (nextCost < cost) { cost = nextCost; path = [...states[j].path, optionIndex] }
        }
        return { cost, path }
      })
    }
    for (let last = 0; last < states.length; last++) {
      if (options[options.length - 1][last].outgoing + options[0][first].incoming >= lengths[lengths.length - 1] - 1e-7) continue
      if (states[last].cost < bestCost) {
        bestCost = states[last].cost
        best = states[last].path.map((index, i) => options[i][index])
      }
    }
  }
  return best.flatMap((option) => option.dogbone ? [option.dogbone] : [])
}

export function generateAllDogbones(contour: Contour, params: ToolParams): Dogbone[] {
  const radius = params.toolDiameter / 2
  if (!contour.closed || contour.vertices.length < 3 || !Number.isFinite(radius) || radius <= 0) return []
  const vertices = contour.vertices
  const n = vertices.length
  const lengths = vertices.map((v, i) => distance(v, vertices[(i + 1) % n]))
  const options: ReliefOption[][] = vertices.map(() => [{ incoming: 0, outgoing: 0, cost: 0 }])
  const corners = findInternalCorners(contour, params.maxCornerAngle ?? 170)
  for (const corner of corners) {
    const i = corner.vertexIndex
    const prev = vertices[(i - 1 + n) % n], next = vertices[(i + 1) % n]
    const before = lengths[(i - 1 + n) % n], after = lengths[i]
    // A large opening can still contain narrow slots. Filter the local walls.
    if (contour.isHole && params.filterLargeContours && Math.min(before, after) > params.contourMaxThickness) continue
    if (Math.min(before, after) < 1e-7) continue
    const incoming = { x: (prev.x - corner.vertex.x) / before, y: (prev.y - corner.vertex.y) / before }
    const outgoing = { x: (next.x - corner.vertex.x) / after, y: (next.y - corner.vertex.y) / after }
    const db = generateDogbone(corner.vertex, i, contour.id, radius, corner.angle, corner.bisectorAngle)
    const candidates: ReliefOption[] = []
    const add = (dogbone: Dogbone, cost: number) => {
      const dotBefore = dogbone.direction.x * incoming.x + dogbone.direction.y * incoming.y
      const dotAfter = dogbone.direction.x * outgoing.x + dogbone.direction.y * outgoing.y
      const trimBefore = Math.max(0, 2 * radius * dotBefore)
      const trimAfter = Math.max(0, 2 * radius * dotAfter)
      if (dotBefore < -1e-8 || dotAfter < -1e-8 || trimBefore >= before - 1e-7 || trimAfter >= after - 1e-7) return
      candidates.push({ dogbone, incoming: trimBefore, outgoing: trimAfter, cost })
    }
    add(db, 0)
    for (const [wall, other, length] of [[incoming, outgoing, after], [outgoing, incoming, before]] as const) {
      const normal = { x: -wall.y, y: wall.x }
      const sign = normal.x * other.x + normal.y * other.y >= 0 ? 1 : -1
      add({ ...db, id: uid(), type: "tbone", direction: { x: sign * normal.x, y: sign * normal.y } }, 1 + radius / length)
    }
    // Skipping is always more expensive than choosing a different valid type.
    candidates.push({ incoming: 0, outgoing: 0, cost: 1e6 })
    options[i] = candidates
  }
  const selected = chooseReliefs(options, lengths)
  for (const corner of corners) {
    const i = corner.vertexIndex
    if (selected.some((d) => d.vertexIndex === i)) continue
    if (contour.isHole && params.filterLargeContours && Math.min(lengths[(i - 1 + n) % n], lengths[i]) > params.contourMaxThickness) continue
    // The circle may cross a neighbouring convex vertex or overlap another
    // relief. The exact boolean fallback trims against the whole boundary.
    const db = generateDogbone(corner.vertex, i, contour.id, radius, corner.angle, corner.bisectorAngle)
    selected.push({ ...db, requiresBoolean: true })
  }
  // Small existing concave fillets also need clearance for a larger tool.
  const winding = Math.sign(polygonArea(vertices))
  for (let i = 0; i < n; i++) {
    const bulge = contour.bulges?.[i] ?? 0
    if (!bulge || Math.sign(bulge) * winding !== (contour.isHole ? 1 : -1)) continue
    const a = vertices[i], b = vertices[(i + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const arcRadius = Math.hypot(dx, dy) * (1 + bulge * bulge) / (4 * Math.abs(bulge))
    if (arcRadius >= radius - 1e-5) continue
    const center = { x: (a.x + b.x) / 2 - dy * (1 - bulge * bulge) / (4 * bulge),
      y: (a.y + b.y) / 2 + dx * (1 - bulge * bulge) / (4 * bulge) }
    const angle = Math.atan2(center.y - a.y, center.x - a.x)
    selected.push({ ...generateDogbone(a, i, contour.id, radius, Math.PI - Math.abs(4 * Math.atan(bulge)), angle),
      type: "arc-relief", center, requiresBoolean: true })
  }
  return selected
}

export function calculateDogboneCircles(
  dogbone: Dogbone,
): Array<{ center: Vertex; radius: number }> {
  const center: Vertex = dogbone.center ?? {
    x: dogbone.vertex.x + dogbone.direction.x * dogbone.radius,
    y: dogbone.vertex.y + dogbone.direction.y * dogbone.radius,
  }

  return [{ center, radius: dogbone.radius }]
}