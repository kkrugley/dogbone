import { create } from "zustand"
import { temporal } from "zundo"
import type {
  BatchProgress,
  Contour,
  Dogbone,
  FileState,
  Gap,
  Preset,
  Tool,
  ToolParams,
  Viewport,
} from "@/types/cad"

const PRESETS_KEY = "dogbone-presets"

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    return raw ? (JSON.parse(raw) as Preset[]) : []
  } catch {
    return []
  }
}

function savePresets(presets: Preset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch {
    // storage unavailable
  }
}

const DEFAULT_TOOL_PARAMS: ToolParams = {
  toolDiameter: 3,
  reliefType: "dogbone",
  tolerance: 0.01,
  minAngle: 120,
  overcut: 0.1,
  ignoredLayers: [],
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  scale: 1,
}

export interface CADStore {
  files: FileState[]
  activeFileId: string | null
  addFile: (file: FileState) => void
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  updateFile: (id: string, updates: Partial<FileState>) => void

  tool: Tool
  setTool: (tool: Tool) => void
  selectedDogboneId: string | null
  setSelectedDogbone: (id: string | null) => void
  hoveredVertexIndex: number | null
  setHoveredVertex: (index: number | null) => void

  viewport: Viewport
  setViewport: (viewport: Partial<Viewport>) => void
  resetViewport: () => void

  toolParams: ToolParams
  setToolParams: (params: Partial<ToolParams>) => void

  presets: Preset[]
  addPreset: (preset: Preset) => void
  removePreset: (id: string) => void
  applyPreset: (id: string) => void

  addDogbone: (fileId: string, dogbone: Dogbone) => void
  removeDogbone: (fileId: string, dogboneId: string) => void
  toggleDogbone: (fileId: string, dogboneId: string) => void
  setContours: (fileId: string, contours: Contour[]) => void
  setDogbones: (fileId: string, dogbones: Dogbone[]) => void
  setGaps: (fileId: string, gaps: Gap[]) => void
  setFileStatus: (fileId: string, status: FileState["status"]) => void

  viewMode: "grid" | "single"
  setViewMode: (mode: "grid" | "single") => void

  batchProgress: BatchProgress | null
  setBatchProgress: (progress: BatchProgress | null) => void
}

export const useCADStore = create<CADStore>()(
  temporal(
    (set, _get) => ({
      files: [],
      activeFileId: null,

      addFile: (file) =>
        set((s) => ({
          files: [...s.files, file],
          activeFileId: s.activeFileId ?? file.id,
        })),

      removeFile: (id) =>
        set((s) => ({
          files: s.files.filter((f) => f.id !== id),
          activeFileId: s.activeFileId === id ? null : s.activeFileId,
        })),

      setActiveFile: (id) => set({ activeFileId: id }),

      updateFile: (id, updates) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      tool: "select",
      setTool: (tool) => set({ tool }),

      selectedDogboneId: null,
      setSelectedDogbone: (id) => set({ selectedDogboneId: id }),

      hoveredVertexIndex: null,
      setHoveredVertex: (index) => set({ hoveredVertexIndex: index }),

      viewport: DEFAULT_VIEWPORT,
      setViewport: (vp) =>
        set((s) => ({ viewport: { ...s.viewport, ...vp } })),
      resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

      toolParams: DEFAULT_TOOL_PARAMS,
      setToolParams: (params) =>
        set((s) => ({ toolParams: { ...s.toolParams, ...params } })),

      presets: loadPresets(),
      addPreset: (preset) =>
        set((s) => {
          const next = [...s.presets, preset]
          savePresets(next)
          return { presets: next }
        }),

      removePreset: (id) =>
        set((s) => {
          const next = s.presets.filter((p) => p.id !== id)
          savePresets(next)
          return { presets: next }
        }),

      applyPreset: (id) =>
        set((s) => {
          const preset = s.presets.find((p) => p.id === id)
          if (!preset) return {}
          return { toolParams: { ...preset.params } }
        }),

      addDogbone: (fileId, dogbone) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId
              ? { ...f, dogbones: [...f.dogbones, dogbone] }
              : f,
          ),
        })),

      removeDogbone: (fileId, dogboneId) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  dogbones: f.dogbones.filter((d) => d.id !== dogboneId),
                }
              : f,
          ),
          selectedDogboneId:
            s.selectedDogboneId === dogboneId
              ? null
              : s.selectedDogboneId,
        })),

      toggleDogbone: (fileId, dogboneId) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  dogbones: f.dogbones.map((d) =>
                    d.id === dogboneId ? { ...d, enabled: !d.enabled } : d,
                  ),
                }
              : f,
          ),
        })),

      setContours: (fileId, contours) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId ? { ...f, contours } : f,
          ),
        })),

      setDogbones: (fileId, dogbones) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId ? { ...f, dogbones } : f,
          ),
        })),

      setGaps: (fileId, gaps) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId ? { ...f, gaps } : f,
          ),
        })),

      setFileStatus: (fileId, status) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId ? { ...f, status } : f,
          ),
        })),

      viewMode: "grid",
      setViewMode: (mode) => set({ viewMode: mode }),

      batchProgress: null,
      setBatchProgress: (progress) => set({ batchProgress: progress }),
    }),
    {
      partialize: (state) => {
        const { files, ...rest } = state as CADStore & Record<string, unknown>
        void rest
        return { files }
      },
    },
  ),
)

export default useCADStore