/**
 * CAD 图纸 API
 */

import { request } from './http'
import type { CADFile, SupportedFormat, ApiResponse } from '@/types/cad'

/** CAD API */
export const cadApi = {
  /**
   * 上传 CAD 文件
   */
  upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<ApiResponse<CADFile>>('/api/cad/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 上传分片
   */
  uploadChunk(file: File, chunkId: string, chunkIndex: number) {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<ApiResponse>('/api/cad/upload-chunk', formData, {
      params: { chunkId, chunkIndex },
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 合并分片
   */
  mergeChunks(chunkId: string, originalName: string, totalChunks: number) {
    return request.post<ApiResponse<CADFile>>('/api/cad/merge-chunks', {
      chunkId,
      originalName,
      totalChunks
    })
  },

  /**
   * 获取支持的格式
   */
  getSupportedFormats() {
    return request.get<ApiResponse<SupportedFormat>>('/api/cad/supported-formats')
  },

  /**
   * 获取 CAD 文件详情
   */
  getDetails(filename: string) {
    return request.get<ApiResponse<CADFile>>(`/api/cad/${filename}`)
  },

  /**
   * 切换图层可见性
   */
  toggleLayerVisibility(filename: string, layerName: string, visible: boolean) {
    return request.post<ApiResponse>(`/api/cad/${filename}/layers/${layerName}/visibility`, {
      visible
    })
  }
}
