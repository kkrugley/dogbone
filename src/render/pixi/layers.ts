import { Container } from "pixi.js"
import type { Application } from "pixi.js"

export interface CanvasLayers {
  originalLayer: Container
  dogboneLayer: Container
  gapLayer: Container
  hoverLayer: Container
  selectionLayer: Container
  measurementLayer: Container
}

export function createLayers(app: Application): CanvasLayers {
  const originalLayer = new Container()
  const dogboneLayer = new Container()
  const gapLayer = new Container()
  const hoverLayer = new Container()
  const selectionLayer = new Container()
  const measurementLayer = new Container()

  app.stage.addChild(originalLayer)
  app.stage.addChild(dogboneLayer)
  app.stage.addChild(gapLayer)
  app.stage.addChild(hoverLayer)
  app.stage.addChild(selectionLayer)
  app.stage.addChild(measurementLayer)

  return {
    originalLayer,
    dogboneLayer,
    gapLayer,
    hoverLayer,
    selectionLayer,
    measurementLayer,
  }
}