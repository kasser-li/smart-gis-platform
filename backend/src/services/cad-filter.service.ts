/**
 * CAD 实体过滤服务
 * 实现 LOD 分层、优先级排序、视口裁剪
 */

import { CADEntity, CADLayer } from '../models/cad.model';
import { getLODConfig } from '../config/lod.config';

export interface Viewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TransformContext {
  mapCenter: { lat: number; lng: number };
  cadCenterX: number;
  cadCenterY: number;
  scale: number;
}

export class CADFilterService {
  /**
   * 根据 LOD 级别过滤实体
   * @param layers CAD 图层
   * @param zoom 地图缩放级别
   * @returns 过滤后的图层
   */
  filterByLOD(layers: CADLayer[], zoom: number): CADLayer[] {
    const config = getLODConfig(zoom);
    
    console.log(`LOD 过滤：zoom=${zoom}, ratio=${config.ratio}, priority=${config.priority}`);
    
    return layers.map(layer => ({
      ...layer,
      entities: this.filterEntitiesByPriority(layer.entities, config.ratio, config.priority)
    }));
  }
  
  /**
   * 按优先级过滤实体
   * @param entities 实体列表
   * @param ratio 返回比例
   * @param priority 优先级策略
   * @returns 过滤后的实体
   */
  private filterEntitiesByPriority(
    entities: CADEntity[],
    ratio: number,
    priority: string
  ): CADEntity[] {
    if (ratio >= 1.0 || priority === 'all') {
      return entities;
    }
    
    // 按优先级排序
    const sorted = this.sortByPriority(entities, priority);
    
    // 计算返回数量
    const count = Math.floor(entities.length * ratio);
    
    console.log(`过滤：原始=${entities.length}, 返回=${count}, 比例=${ratio}`);
    
    return sorted.slice(0, count);
  }
  
  /**
   * 按优先级排序实体
   * @param entities 实体列表
   * @param priority 优先级策略
   * @returns 排序后的实体
   */
  private sortByPriority(entities: CADEntity[], priority: string): CADEntity[] {
    // 定义实体类型优先级
    const typePriority: Record<string, number> = {
      'LWPOLYLINE': 3,  // 轻量多段线 - 高优先级（轮廓）
      'POLYLINE': 3,    // 多段线 - 高优先级
      'LINE': 2,        // 线段 - 中优先级
      'CIRCLE': 2,      // 圆 - 中优先级
      'ARC': 2,         // 弧 - 中优先级
      'INSERT': 1,      // 块插入 - 低优先级
      'POINT': 1,       // 点 - 低优先级
      'TEXT': 0,        // 文字 - 最低优先级
      'MTEXT': 0        // 多行文字 - 最低优先级
    };
    
    switch (priority) {
      case 'major':
        // 只返回高优先级（轮廓线）
        return entities
          .filter(e => typePriority[e.type] >= 3)
          .sort((a, b) => this.compareByLength(b, a));
      
      case 'medium':
        // 返回高 + 中优先级
        return entities
          .filter(e => typePriority[e.type] >= 2)
          .sort((a, b) => this.compareByLength(b, a));
      
      case 'minor':
        // 返回所有，按长度排序
        return entities.sort((a, b) => this.compareByLength(b, a));
      
      default:
        return entities;
    }
  }
  
  /**
   * 比较实体长度（长的在前）
   */
  private compareByLength(a: CADEntity, b: CADEntity): number {
    const lenA = this.calculateEntityLength(a);
    const lenB = this.calculateEntityLength(b);
    return lenB - lenA;
  }
  
  /**
   * 计算实体长度
   */
  private calculateEntityLength(entity: CADEntity): number {
    if (!entity.geometry) return 0;
    
    switch (entity.type) {
      case 'LINE':
        if (entity.geometry.start && entity.geometry.end) {
          const dx = entity.geometry.end.x - entity.geometry.start.x;
          const dy = entity.geometry.end.y - entity.geometry.start.y;
          return Math.sqrt(dx * dx + dy * dy);
        }
        return 0;
      
      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (entity.geometry.vertices && entity.geometry.vertices.length > 1) {
          let length = 0;
          for (let i = 1; i < entity.geometry.vertices.length; i++) {
            const v1 = entity.geometry.vertices[i - 1];
            const v2 = entity.geometry.vertices[i];
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            length += Math.sqrt(dx * dx + dy * dy);
          }
          return length;
        }
        return 0;
      
      default:
        return 0;
    }
  }
  
  /**
   * 裁剪到视口
   * @param layers CAD 图层
   * @param viewport 视口范围
   * @param context 转换上下文
   * @returns 裁剪后的图层
   */
  clipToViewport(layers: CADLayer[], viewport: Viewport, context: TransformContext): CADLayer[] {
    console.log(`视口裁剪：[${viewport.south}, ${viewport.north}] x [${viewport.west}, ${viewport.east}]`);
    
    return layers.map(layer => ({
      ...layer,
      entities: layer.entities.filter(entity => {
        const latLng = this.entityToLatLng(entity, context);
        if (!latLng) return false;
        
        return latLng.lat >= viewport.south &&
               latLng.lat <= viewport.north &&
               latLng.lng >= viewport.west &&
               latLng.lng <= viewport.east;
      })
    }));
  }
  
  /**
   * 实体坐标转地理坐标
   */
  private entityToLatLng(entity: CADEntity, context: TransformContext): { lat: number; lng: number } | null {
    if (!entity.geometry) return null;
    
    let x: number, y: number;
    
    switch (entity.type) {
      case 'LINE':
        // 使用起点
        x = entity.geometry.start?.x || 0;
        y = entity.geometry.start?.y || 0;
        break;
      
      case 'LWPOLYLINE':
      case 'POLYLINE':
        // 使用第一个顶点
        x = entity.geometry.vertices?.[0]?.x || 0;
        y = entity.geometry.vertices?.[0]?.y || 0;
        break;
      
      case 'POINT':
      case 'INSERT':
        x = entity.geometry.x || 0;
        y = entity.geometry.y || 0;
        break;
      
      case 'CIRCLE':
        x = entity.geometry.center?.x || 0;
        y = entity.geometry.center?.y || 0;
        break;
      
      default:
        return null;
    }
    
    // CAD 坐标转地理坐标
    const lat = context.mapCenter.lat + (y - context.cadCenterY) * context.scale;
    const lng = context.mapCenter.lng + (x - context.cadCenterX) * context.scale;
    
    return { lat, lng };
  }
  
  /**
   * 应用 LOD 过滤和视口裁剪
   * @param layers CAD 图层
   * @param zoom 缩放级别
   * @param viewport 视口范围
   * @param context 转换上下文
   * @returns 过滤后的图层
   */
  applyFilters(
    layers: CADLayer[],
    zoom: number,
    viewport: Viewport | null,
    context: TransformContext
  ): { layers: CADLayer[]; total: number; returned: number } {
    const originalCount = layers.reduce((sum, l) => sum + l.entities.length, 0);
    
    // 1. LOD 过滤
    let filtered = this.filterByLOD(layers, zoom);
    
    // 2. 视口裁剪（如果提供了视口）
    if (viewport) {
      filtered = this.clipToViewport(filtered, viewport, context);
    }
    
    const returnedCount = filtered.reduce((sum, l) => sum + l.entities.length, 0);
    
    console.log(`过滤完成：原始=${originalCount}, 返回=${returnedCount}, 过滤率=${(1 - returnedCount/originalCount)*100}%`);
    
    return {
      layers: filtered,
      total: originalCount,
      returned: returnedCount
    };
  }
}

// 导出单例
export const cadFilterService = new CADFilterService();
