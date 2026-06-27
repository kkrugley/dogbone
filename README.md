# DogBone

Browser-based DXF pre-processor for CNC routing. Converts laser-cut layouts into router-ready files by adding dog-bone relief cuts at internal 90° corners.

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, shadcn/ui, Tailwind CSS v4, Phosphor Icons |
| State | Zustand + zundo (undo/redo) |
| Rendering | PixiJS v8 (hardware-accelerated WebGL) |
| Geometry | @flatten-js/core, martinez-polygon-clipping |
| DXF I/O | dxf-parser (import), @tarikjabiri/dxf (export), fflate (ZIP) |
| Build | Vite, TypeScript |
| Tests | Vitest, Playwright |

## Features

- **Multi-file batch** — load several DXF sheets, see them in a grid preview, expand any for detailed work
- **Auto dog-bone** — detects internal 90° corners on straight edges and generates relief cuts
- **Interactive canvas** — click any corner vertex to add/remove dog-bones via popover
- **Contour validation** — finds gaps, auto-closes fixable ones
- **Layer ignore** — exclude text, marks, logos, engraving layers from processing
- **Parameter presets** — save/load tool settings ("Plywood 12mm, 3mm endmill", etc.)
- **Export** — single DXF or ZIP archive of all processed sheets
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z

## Quick start

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build → dist/
npm test         # vitest unit tests
npx playwright test  # E2E tests (add .dxf to test-files/)
```
