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
  type: "dogbone" | "tbone" | "bone-offset"
  enabled: boolean
}

export interface ToolParams {
  toolDiameter: number
  reliefType: "dogbone" | "tbone" | "bone-offset"
  tolerance: number
  minAngle: number
  overcut: number
  ignoredLayers: string[]
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
  status: "idle" | "processing" | "ready" | "error"
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