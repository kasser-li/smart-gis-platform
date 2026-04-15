/**
 * CAD 图纸解析服务
 * 支持 DXF 文件解析
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';

// DXF Parser (需要安装 dxf-parser 包)
// 由于环境限制，这里使用简化的解析逻辑
// 实际项目中请安装：npm install dxf-parser

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
  /**
   * 解析 DXF 文件
   */
  async parseDXF(filePath: string, filename: string): Promise<CADFile> {
    try {
      logger.info(`开始解析 DXF 文件：${filename}`);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 简化的 DXF 解析逻辑
      // 实际项目中请使用 dxf-parser 库
      const layers: CADLayer[] = this.parseLayers(content);
      const entities = this.parseEntities(content);
      const extents = this.calculateExtents(entities);

      const cadFile: CADFile = {
        filename,
        layers: this.groupEntitiesByLayer(entities, layers),
        metadata: {
          version: this.extractVersion(content),
          units: this.extractUnits(content),
          extents
        },
        uploadTime: new Date()
      };

      logger.info(`DXF 解析完成：${layers.length} 个图层，${entities.length} 个实体`);
      
      return cadFile;
    } catch (error: any) {
      logger.error('DXF 解析失败:', error);
      throw new Error(`DXF 解析失败：${error.message}`);
    }
  }

  /**
   * 解析图层信息
   */
  private parseLayers(content: string): CADLayer[] {
    // 简化实现，实际应解析 DXF 的 LAYER 段
    const layers: CADLayer[] = [];
    const layerRegex = /8\n(\w+)/g;
    let match;
    
    const layerNames = new Set<string>();
    while ((match = layerRegex.exec(content)) !== null) {
      layerNames.add(match[1]);
    }

    layerNames.forEach(name => {
      layers.push({
        name,
        color: 7, // 默认白色
        visible: true,
        entities: []
      });
    });

    return layers;
  }

  /**
   * 解析实体
   */
  private parseEntities(content: string): CADEntity[] {
    const entities: CADEntity[] = [];
    
    // 简化实现，实际应解析 DXF 的 ENTITIES 段
    // 这里只解析基本的 LINE 和 POINT
    
    const lineRegex = /LINE[\s\S]*?10\n([\d.-]+)[\s\S]*?20\n([\d.-]+)[\s\S]*?11\n([\d.-]+)[\s\S]*?21\n([\d.-]+)/g;
    let lineMatch;
    
    while ((lineMatch = lineRegex.exec(content)) !== null) {
      entities.push({
        type: 'LINE',
        layer: '0',
        properties: {},
        geometry: {
          start: {
            x: parseFloat(lineMatch[1]),
            y: parseFloat(lineMatch[2])
          },
          end: {
            x: parseFloat(lineMatch[3]),
            y: parseFloat(lineMatch[4])
          }
        }
      });
    }

    return entities;
  }

  /**
   * 按图层分组实体
   */
  private groupEntitiesByLayer(entities: CADEntity[], layers: CADLayer[]): CADLayer[] {
    entities.forEach(entity => {
      const layer = layers.find(l => l.name === entity.layer);
      if (layer) {
        layer.entities.push(entity);
      } else if (layers.length > 0) {
        layers[0].entities.push(entity);
      }
    });
    return layers;
  }

  /**
   * 计算边界
   */
  private calculateExtents(entities: CADEntity[]): { minX: number; minY: number; maxX: number; maxY: number } {
    const extents = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    entities.forEach(entity => {
      if (entity.geometry) {
        if (entity.geometry.start) {
          extents.minX = Math.min(extents.minX, entity.geometry.start.x);
          extents.minY = Math.min(extents.minY, entity.geometry.start.y);
          extents.maxX = Math.max(extents.maxX, entity.geometry.start.x);
          extents.maxY = Math.max(extents.maxY, entity.geometry.start.y);
        }
        if (entity.geometry.end) {
          extents.minX = Math.min(extents.minX, entity.geometry.end.x);
          extents.minY = Math.min(extents.minY, entity.geometry.end.y);
          extents.maxX = Math.max(extents.maxX, entity.geometry.end.x);
          extents.maxY = Math.max(extents.maxY, entity.geometry.end.y);
        }
      }
    });

    if (extents.minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return extents;
  }

  /**
   * 提取版本信息
   */
  private extractVersion(content: string): string {
    const versionMatch = content.match(/\$ACADVER[\s\S]*?\n(\w+)/);
    return versionMatch ? versionMatch[1] : 'Unknown';
  }

  /**
   * 提取单位信息
   */
  private extractUnits(content: string): string {
    const unitsMatch = content.match(/\$LUNITS[\s\S]*?\n(\d+)/);
    const unitsMap: Record<string, string> = {
      '1': '科学',
      '2': '小数',
      '3': '工程',
      '4': '建筑',
      '5': '分数'
    };
    return unitsMap[unitsMatch?.[1] || '2'] || '小数';
  }

  /**
   * 将 CAD 坐标转换为地理坐标
   */
  convertToGeoCoordinates(x: number, y: number, origin: { lat: number; lng: number; scale: number }): { lat: number; lng: number } {
    // 简化的坐标转换，实际项目需要使用正确的投影转换
    const scale = origin.scale || 0.00001;
    return {
      lat: origin.lat + y * scale,
      lng: origin.lng + x * scale
    };
  }
}

// 导出单例
export const cadService = new CADService();
