/**
 * CAD 图纸控制器
 */

import { Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { cadService } from '../services/cad.service'
import { logger } from '../utils/logger'
import { success, error } from '../utils/response'

/**
 * 上传 CAD 文件
 */
export async function upload(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(error(400, '请选择文件'))
      return
    }
    
    const result = await cadService.uploadFile(req.file)
    res.status(201).json(success(result, '上传成功'))
  } catch (err) {
    logger.error('上传CAD文件失败:', err)
    res.status(500).json(error(500, '上传失败'))
  }
}

/**
 * 上传分片
 */
export async function uploadChunk(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(error(400, '请选择文件分片'))
      return
    }
    res.json(success(null, '分片上传成功'))
  } catch (err) {
    logger.error('上传分片失败:', err)
    res.status(500).json(error(500, '分片上传失败'))
  }
}

/**
 * 合并分片
 */
export async function mergeChunks(req: Request, res: Response): Promise<void> {
  try {
    const { chunkId, originalName, totalChunks } = req.body as {
      chunkId: string
      originalName: string
      totalChunks: number
    }
    
    const result = await cadService.mergeChunks(chunkId, originalName, totalChunks)
    res.status(201).json(success(result, '合并成功'))
  } catch (err) {
    logger.error('合并分片失败:', err)
    res.status(500).json(error(500, '合并失败'))
  }
}

/**
 * 获取支持的格式
 */
export async function getSupportedFormats(req: Request, res: Response): Promise<void> {
  try {
    const formats = cadService.getSupportedFormats()
    res.json(success(formats))
  } catch (err) {
    logger.error('获取支持格式失败:', err)
    res.status(500).json(error(500, '获取失败'))
  }
}

/**
 * 获取 CAD 文件详情
 */
export async function getDetails(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params
    const details = await cadService.getDetails(filename)
    if (!details) {
      res.status(404).json(error(404, '文件不存在'))
      return
    }
    res.json(success(details))
  } catch (err) {
    logger.error('获取CAD文件详情失败:', err)
    res.status(500).json(error(500, '获取失败'))
  }
}

/**
 * 切换图层可见性
 */
export async function toggleLayerVisibility(req: Request, res: Response): Promise<void> {
  try {
    const { filename, layerName } = req.params
    const { visible } = req.body as { visible: boolean }
    
    const updated = await cadService.toggleLayerVisibility(filename, layerName, visible)
    if (!updated) {
      res.status(404).json(error(404, '文件或图层不存在'))
      return
    }
    res.json(success(null, '图层可见性已更新'))
  } catch (err) {
    logger.error('切换图层可见性失败:', err)
    res.status(500).json(error(500, '操作失败'))
  }
}
