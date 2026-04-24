/**
 * CAD 数据模型
 */

export interface CADLayerStyle {
  color?: number;           // 颜色
  colorIndex?: number;      // AutoCAD 索引色
  lineType?: string;        // 线型
  lineWeight?: number;      // 线宽
  transparency?: number;    // 透明度
}

export interface CADEntityStyle {
  color?: number;           // 颜色 (RGB 或索引色)
  colorIndex?: number;      // AutoCAD 索引色 (0-256)
  lineType?: string;        // 线型 (CONTINUOUS, DASHED, DOT 等)
  lineTypeScale?: number;   // 线型比例
  lineWeight?: number;      // 线宽 (单位：0.01mm, -2=ByLayer, -1=ByBlock)
  visible?: boolean;        // 可见性
  thickness?: number;       // 厚度
  transparency?: number;    // 透明度 (0-100)
}

export interface CADLayer {
  name: string;
  style?: CADLayerStyle;
  color: number;
  visible: boolean;
  entities: CADEntity[];
}

export interface CADEntity {
  type: string;
  layer: string;
  geometry: any;
  style?: CADEntityStyle;
  properties?: Record<string, any>;
}

export interface CADFile {
  filename: string;
  originalName?: string;
  layers: CADLayer[];
  metadata?: {
    version: string;
    units: string;
    extents: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
  uploadTime: Date;
}
