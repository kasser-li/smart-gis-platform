/**
 * 标记点控制器
 */

import { Request, Response } from 'express'
import { markerService } from '../services/marker.service'
import type { Marker } from '../models/marker.model'
import { z } from 'zod'
import { success, error } from '../utils/response'
import { logger } from '../utils/logger'

// Zod 校验规则
export const createMarkerSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
  latitude: z.number().min(-90, '纬度范围-90到90').max(90, '纬度范围-90到90'),
  longitude: z.number().min(-180, '经度范围-180到180').max(180, '经度范围-180到180'),
  type: z.enum(['point', 'building', 'facility', 'warning']).default('point'),
  description: z.string().max(500, '描述不能超过500个字符').optional()
})

export const updateMarkerSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符').optional(),
  latitude: z.number().min(-90, '纬度范围-90到90').max(90, '纬度范围-90到90').optional(),
  longitude: z.number().min(-180, '经度范围-180到180').max(180, '经度范围-180到180').optional(),
  type: z.enum(['point', 'building', 'facility', 'warning']).optional(),
  description: z.string().max(500, '描述不能超过500个字符').optional()
})

/**
 * 创建标记点
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const dto = req.body as z.infer<typeof createMarkerSchema>
    const marker = await markerService.create(dto)
    res.status(201).json(success(marker, '创建成功'))
  } catch (err) {
    logger.error('创建标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 获取所有标记点
 */
export async function findAll(req: Request, res: Response): Promise<void> {
  try {
    const markers = await markerService.findAll()
    res.json(success(markers))
  } catch (err) {
    logger.error('获取标记点列表失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 根据ID获取标记点
 */
export async function findById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const marker = await markerService.findById(id)
    if (!marker) {
      res.status(404).json(error(404, '标记点不存在'))
      return
    }
    res.json(success(marker))
  } catch (err) {
    logger.error('获取标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 更新标记点
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const dto = req.body as z.infer<typeof updateMarkerSchema>
    const marker = await markerService.update(id, dto)
    if (!marker) {
      res.status(404).json(error(404, '标记点不存在'))
      return
    }
    res.json(success(marker, '更新成功'))
  } catch (err) {
    logger.error('更新标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 删除标记点
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const deleted = await markerService.delete(id)
    if (!deleted) {
      res.status(404).json(error(404, '标记点不存在'))
      return
    }
    res.json(success(null, '删除成功'))
  } catch (err) {
    logger.error('删除标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 导出所有标记点
 */
export async function exportAll(req: Request, res: Response): Promise<void> {
  try {
    const markers = await markerService.findAll()
    res.json(success({ count: markers.length, data: markers }, '导出成功'))
  } catch (err) {
    logger.error('导出标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}

/**
 * 批量导入标记点
 */
export async function batchImport(req: Request, res: Response): Promise<void> {
  try {
    const markers = req.body as Partial<Marker>[]
    const results: { success: number; failed: number } = { success: 0, failed: 0 }
    
    for (const marker of markers) {
      try {
        await markerService.create(marker as z.infer<typeof createMarkerSchema>)
        results.success++
      } catch {
        results.failed++
      }
    }
    
    res.json(success(results, '批量导入完成'))
  } catch (err) {
    logger.error('批量导入标记点失败:', err)
    res.status(500).json(error(500, '服务器内部错误'))
  }
}
