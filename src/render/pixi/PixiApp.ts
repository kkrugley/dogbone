import { Application } from "pixi.js"

export function createPixiApp(): Application {
  return new Application()
}

export async function initPixiApp(
  app: Application,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<void> {
  await app.init({
    canvas,
    width,
    height,
    antialias: true,
    resolution: window.devicePixelRatio ?? 1,
    backgroundAlpha: 0,
    autoDensity: true,
    resizeTo: undefined,
  })
}

export function resizeApp(
  app: Application,
  width: number,
  height: number,
): void {
  if (!app.renderer) return
  app.renderer.resize(width, height)
}

export function destroyApp(app: Application): void {
  try {
    if (app.renderer) {
      app.destroy(true, { children: true })
    }
  } catch {
    // app already destroyed
  }
}