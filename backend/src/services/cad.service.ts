/**
 * CAD 图纸解析服务
 * 支持 DXF 文件解析
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import DxfParser from 'dxf-parser';

export interface CADLayer {
  name: string;
  color: number;
  visible: boolean;
  entities: CADEntity[];
}

export interface CADEntity {
  type: string;
  layer: string;
  properties: Record<string, any>;
  geometry: any;
}

export interface CADFile {
  filename: string;
  layers: CADLayer[];
  metadata: {
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

export class CADService {
  private parser = new DxfParser();

  /**
   * 解析 DXF 文件
   */
  async parseDXF(filePath: string, filename: string): Promise<CADFile> {
    try {
      logger.info(`开始解析 DXF 文件：${filename}`);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 使用专业的 dxf-parser 解析
      const dxfData = this.parser.parseSync(content);
      
      logger.info(`DXF 解析成功：${dxfData.entities?.length || 0} 个实体`);
      
      // 转换图层和实体
      const layers = this.convertLayers(dxfData);
      const extents = this.calculateExtentsFromDXF(dxfData);

      const cadFile: CADFile = {
        filename,
        layers,
        metadata: {
          version: dxfData.header?.ACADVER || 'Unknown',
          units: this.getUnits(dxfData.header?.MEASUREMENT),
          extents
        },
        uploadTime: new Date()
      };

      logger.info(`DXF 解析完成：${layers.length} 个图层，${layers.reduce((sum, l) => sum + l.entities.length, 0)} 个实体`);
      
      return cadFile;
    } catch (error: any) {
      logger.error('DXF 解析失败:', error);
      throw new Error(`DXF 解析失败：${error.message}`);
    }
  }

  /**
   * 转换图层数据
   */
  private convertLayers(dxfData: any): CADLayer[] {
    const layersMap = new Map<string, CADLayer>();
    
    // 初始化所有图层
    if (dxfData.tables?.layers) {
      for (const [name, layer] of Object.entries(dxfData.tables.layers)) {
        const layerObj: any = layer as any;
        layersMap.set(name, {
          name,
          color: layerObj?.color || 7,
          visible: true,
          entities: []
        });
      }
    }
    
    // 确保至少有一个默认图层
    if (layersMap.size === 0) {
      layersMap.set('0', {
        name: '0',
        color: 7,
        visible: true,
        entities: []
      });
    }
    
    // 将实体分配到对应图层
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any) => {
        const layerName = entity.layer || '0';
        let layer = layersMap.get(layerName);
        
        // 如果图层不存在，创建它
        if (!layer) {
          layer = {
            name: layerName,
            color: 7,
            visible: true,
            entities: []
          };
          layersMap.set(layerName, layer);
        }
        
        // 转换实体格式
        const convertedEntity = this.convertEntity(entity);
        if (convertedEntity) {
          layer.entities.push(convertedEntity);
        }
      });
    }
    
    return Array.from(layersMap.values());
  }

  /**
   * 转换单个实体
   */
  private convertEntity(entity: any): CADEntity | null {
    if (!entity.type) return null;
    
    const converted: CADEntity = {
      type: entity.type,
      layer: entity.layer || '0',
      properties: entity,
      geometry: {}
    };
    
    // 根据类型提取几何信息
    switch (entity.type) {
      case 'LINE':
        converted.geometry = {
          start: { x: entity.vertices?.[0]?.x || 0, y: entity.vertices?.[0]?.y || 0 },
          end: { x: entity.vertices?.[1]?.x || 0, y: entity.vertices?.[1]?.y || 0 }
        };
        break;
        
      case 'POINT':
        converted.geometry = {
          x: entity.vertices?.[0]?.x || 0,
          y: entity.vertices?.[0]?.y || 0
        };
        break;
        
      case 'LWPOLYLINE':
      case 'POLYLINE':
        converted.geometry = {
          vertices: entity.vertices?.map((v: any) => ({ x: v.x, y: v.y })) || []
        };
        break;
        
      case 'CIRCLE':
        converted.geometry = {
          center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
          radius: entity.radius || 0
        };
        break;
        
      case 'ARC':
        converted.geometry = {
          center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
          radius: entity.radius || 0,
          startAngle: entity.startAngle || 0,
          endAngle: entity.endAngle || 0
        };
        break;
        
      case 'TEXT':
        converted.geometry = {
          position: { x: entity.position?.x || 0, y: entity.position?.y || 0 },
          text: entity.text || ''
        };
        break;
        
      default:
        converted.geometry = entity;
    }
    
    return converted;
  }

  /**
   * 从 DXF 数据计算边界
   */
  private calculateExtentsFromDXF(dxfData: any): { minX: number; minY: number; maxX: number; maxY: number } {
    const extents = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any) => {
        this.updateExtents(entity, extents);
      });
    }
    
    // 如果没有实体，返回默认值
    if (extents.minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    return extents;
  }

  /**
   * 更新边界
   */
  private updateExtents(entity: any, extents: any) {
    // 处理顶点
    if (entity.vertices) {
      entity.vertices.forEach((v: any) => {
        if (v.x !== undefined) extents.minX = Math.min(extents.minX, v.x);
        if (v.y !== undefined) extents.minY = Math.min(extents.minY, v.y);
        if (v.x !== undefined) extents.maxX = Math.max(extents.maxX, v.x);
        if (v.y !== undefined) extents.maxY = Math.max(extents.maxY, v.y);
      });
    }
    
    // 处理圆心（圆和弧）
    if (entity.center) {
      const r = entity.radius || 0;
      extents.minX = Math.min(extents.minX, entity.center.x - r);
      extents.minY = Math.min(extents.minY, entity.center.y - r);
      extents.maxX = Math.max(extents.maxX, entity.center.x + r);
      extents.maxY = Math.max(extents.maxY, entity.center.y + r);
    }
  }

  /**
   * 获取单位
   */
  private getUnits(measurement: number): string {
    const unitsMap: Record<number, string> = {
      0: '英寸',
      1: '英尺',
      2: '英里',
      3: '毫米',
      4: '厘米',
      5: '米',
      6: '千米'
    };
    return unitsMap[measurement] || '毫米';
  }
}
