/**
 * CAD 相关类型定义
 */

/** 2D 点 */
export interface Point2D {
  x: number
  y: number
}

/** CAD 实体样式 */
export interface CADEntityStyle {
  color?: number
  colorIndex?: number
  lineType?: string
  lineTypeScale?: number
  lineWeight?: number
  visible?: boolean
  thickness?: number
  transparency?: number
}

/** CAD 实体 */
export interface CADEntity {
  type: string
  layer: string
  geometry: {
    start?: Point2D
    end?: Point2D
    center?: Point2D
    radius?: number
    vertices?: Point2D[]
    x?: number
    y?: number
    [key: string]: any
  }
  style?: CADEntityStyle
  properties?: Record<string, any>
}

/** CAD 图层 */
export interface CADLayer {
  name: string
  visible: boolean
  entities: CADEntity[]
}

/** CAD 文件 */
export interface CADFile {
  filename: string
  originalName?: string
  layers: CADLayer[]
  metadata?: {
    version: string
    units: string
    extents: {
      minX: number
      minY: number
      maxX: number
      maxY: number
    }
  }
  uploadTime: Date
}

/** 上传进度 */
export interface UploadProgress {
  progress: number
  message: string
}

/** 支持的格式 */
export interface SupportedFormat {
  extensions: string[]
  description: string
}
