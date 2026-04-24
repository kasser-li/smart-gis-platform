/**
 * 标记点 API
 */

import { request } from './http'
import type { Marker, CreateMarkerDTO, UpdateMarkerDTO, ApiResponse } from '@/types/marker'

/** 标记点 API */
export const markerApi = {
  /**
   * 获取所有标记点
   */
  list() {
    return request.get<ApiResponse<Marker[]>>('/api/markers')
  },

  /**
   * 根据 ID 获取标记点
   */
  getById(id: string) {
    return request.get<ApiResponse<Marker>>(`/api/markers/${id}`)
  },

  /**
   * 创建标记点
   */
  create(data: CreateMarkerDTO) {
    return request.post<ApiResponse<Marker>>('/api/markers', data)
  },

  /**
   * 更新标记点
   */
  update(id: string, data: UpdateMarkerDTO) {
    return request.put<ApiResponse<Marker>>(`/api/markers/${id}`, data)
  },

  /**
   * 删除标记点
   */
  delete(id: string) {
    return request.delete<ApiResponse>(`/api/markers/${id}`)
  },

  /**
   * 导出所有标记点
   */
  export() {
    return request.get<ApiResponse<{ count: number; data: Marker[] }>>('/api/markers/export')
  },

  /**
   * 批量导入标记点
   */
  batchImport(markers: CreateMarkerDTO[]) {
    return request.post<ApiResponse>('/api/markers/batch', markers)
  }
}
