import type { MachiningCheck } from "@/geometry/toolFit"

export interface Vertex {
  x: number
  y: number
}

export interface Segment {
  id: string
  type: "line" | "arc" | "circle" | "polyline"
  start: Vertex
  end: Vertex
  bulge?: number
  center?: Vertex
  radius?: number
  startAngle?: number
  endAngle?: number
  layer: string
  vertices?: Vertex[]
}

export interface Contour {
  id: string
  closed: boolean
  layer: string
  segments: Segment[]
  vertices: Vertex[]
  /** Outgoing edge metadata, indexed by its start vertex. */
  bulges?: number[]
  isHole?: boolean
  edgeTypes?: Array<"line" | "arc">
}

export interface Gap {
  id: string
  contourId: string
  startVertex: Vertex
  endVertex: Vertex
  distance: number
  tolerance: number
  canAutoFix: boolean
}

export interface Dogbone {
  id: string
  contourId: string
  vertexIndex: number
  vertex: Vertex
  radius: number
  angle: number
  bisectorAngle: number
  direction: Vertex
  type: "dogbone" | "tbone" | "bone-offset" | "arc-relief"
  enabled: boolean
  requiresBoolean?: boolean
  center?: Vertex
}

export interface ToolParams {
  toolDiameter: number
  tolerance: number
  /** Legacy preset field, retained for compatibility. */
  minAngle: number
  maxCornerAngle?: number
  ignoredLayers: string[]
  filterLargeContours: boolean
  contourMaxThickness: number
}

export interface Preset {
  id: string
  name: string
  params: ToolParams
}

export interface FileState {
  id: string
  name: string
  originalName: string
  layers: string[]
  selectedLayers: string[]
  contours: Contour[]
  dogbones: Dogbone[]
  gaps: Gap[]
  status: "idle" | "processing" | "ready" | "review" | "error"
  machining?: MachiningCheck
  warnings?: string[]
  errorMessage?: string
  rawDxfData?: string
  rawDxfText?: string
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface ValidationReport {
  totalContours: number
  closedContours: number
  openContours: number
  gaps: number
  fixedGaps: number
  dogbonesAdded: number
  warnings: string[]
}

export interface BatchProgress {
  total: number
  completed: number
  currentFile: string
}

export type Tool = "select" | "add-dogbone" | "remove-dogbone" | "zoom" | "pan"