/**
 * 标记点相关类型定义
 */

/** 标记点类型 */
export type MarkerType = 'point' | 'building' | 'facility' | 'warning'

/** 标记点 */
export interface Marker {
  id: string
  name: string
  latitude: number
  longitude: number
  type: MarkerType
  description?: string
  createdAt: Date
  updatedAt: Date
}

/** 创建标记点 DTO */
export interface CreateMarkerDTO {
  name: string
  latitude: number
  longitude: number
  type: MarkerType
  description?: string
}

/** 更新标记点 DTO */
export interface UpdateMarkerDTO {
  name?: string
  latitude?: number
  longitude?: number
  type?: MarkerType
  description?: string
}

/** 标记点过滤条件 */
export interface MarkerFilter {
  type?: MarkerType
  minLatitude?: number
  maxLatitude?: number
  minLongitude?: number
  maxLongitude?: number
}

/** 统一响应格式 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}
