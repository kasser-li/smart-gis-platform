/**
 * 标记点服务层
 * 负责标记点的业务逻辑处理
 */

import { v4 as uuidv4 } from 'uuid';
import { Marker, CreateMarkerDTO, UpdateMarkerDTO, MarkerFilter, MarkerType } from '../models/marker.model';
import { logger } from '../utils/logger';

// 内存存储（后续可替换为数据库）
const markers: Map<string, Marker> = new Map();

export class MarkerService {
  /**
   * 创建标记点
   */
  async create(dto: CreateMarkerDTO): Promise<Marker> {
    const marker: Marker = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude,
      type: dto.type || 'point',
      properties: dto.properties || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    markers.set(marker.id, marker);
    logger.info(`创建标记点：${marker.id} - ${marker.name}`);
    
    return marker;
  }

  /**
   * 获取所有标记点
   */
  async findAll(filter?: MarkerFilter): Promise<Marker[]> {
    let result = Array.from(markers.values());

    // 类型过滤
    if (filter?.type) {
      result = result.filter(m => m.type === filter.type);
    }

    // 关键词过滤
    if (filter?.keyword) {
      const keyword = filter.keyword.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(keyword) ||
        m.description?.toLowerCase().includes(keyword)
      );
    }

    // 边界过滤
    if (filter?.bounds) {
      const { north, south, east, west } = filter.bounds;
      result = result.filter(m =>
        m.latitude >= south && m.latitude <= north &&
        m.longitude >= west && m.longitude <= east
      );
    }

    return result;
  }

  /**
   * 根据 ID 获取标记点
   */
  async findById(id: string): Promise<Marker | null> {
    return markers.get(id) || null;
  }

  /**
   * 更新标记点
   */
  async update(id: string, dto: UpdateMarkerDTO): Promise<Marker | null> {
    const marker = markers.get(id);
    if (!marker) {
      return null;
    }

    const updated: Marker = {
      ...marker,
      ...dto,
      updatedAt: new Date()
    };

    markers.set(id, updated);
    logger.info(`更新标记点：${id}`);
    
    return updated;
  }

  /**
   * 删除标记点
   */
  async delete(id: string): Promise<boolean> {
    const deleted = markers.delete(id);
    if (deleted) {
      logger.info(`删除标记点：${id}`);
    }
    return deleted;
  }

  /**
   * 批量导入标记点
   */
  async batchImport(markersData: CreateMarkerDTO[]): Promise<Marker[]> {
    const results: Marker[] = [];
    for (const data of markersData) {
      const marker = await this.create(data);
      results.push(marker);
    }
    return results;
  }

  /**
   * 导出所有标记点
   */
  async export(): Promise<Marker[]> {
    return Array.from(markers.values());
  }
}

// 导出单例
export const markerService = new MarkerService();
