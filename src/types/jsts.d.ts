interface JtsGeometry {
  isEmpty(): boolean
  getArea(): number
  getNumGeometries(): number
  getGeometryN(index: number): JtsGeometry
}
declare module "jsts/org/locationtech/jts/io/GeoJSONReader.js" {
  export default class GeoJSONReader {
    read(geometry: { type: "Polygon"; coordinates: number[][][] }): JtsGeometry
  }
}
declare module "jsts/org/locationtech/jts/operation/buffer/BufferOp.js" {
  export default class BufferOp {
    static bufferOp(geometry: JtsGeometry, distance: number, quadrantSegments: number): JtsGeometry
  }
}
declare module "jsts/org/locationtech/jts/operation/overlay/OverlayOp.js" {
  export default class OverlayOp {
    static difference(subject: JtsGeometry, clipping: JtsGeometry): JtsGeometry
  }
}
declare module "jsts/org/locationtech/jts/operation/valid/IsValidOp.js" {
  export default class IsValidOp {
    static isValid(geometry: JtsGeometry): boolean
  }
}
