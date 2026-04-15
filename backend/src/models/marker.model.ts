/**
 * 标记点数据模型
 */

export interface Marker {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  type: MarkerType;
  properties?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type MarkerType = 
  | 'point'           // 普通点
  | 'building'        // 建筑物
  | 'facility'        // 设施
  | 'warning'         // 警告点
  | 'custom';         // 自定义

export interface CreateMarkerDTO {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  type?: MarkerType;
  properties?: Record<string, any>;
}

export interface UpdateMarkerDTO {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  type?: MarkerType;
  properties?: Record<string, any>;
}

export interface MarkerFilter {
  type?: MarkerType;
  keyword?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}
