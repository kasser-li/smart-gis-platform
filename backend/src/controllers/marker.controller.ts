/**
 * 标记点控制器
 */

import { Request, Response } from 'express';
import { markerService } from '../services/marker.service';
import { CreateMarkerDTO, UpdateMarkerDTO, MarkerFilter } from '../models/marker.model';
import { logger } from '../utils/logger';

/**
 * 创建标记点
 * POST /api/markers
 */
export const create = async (req: Request, res: Response) => {
  try {
    const dto: CreateMarkerDTO = req.body;
    
    // 验证必填字段
    if (!dto.name || !dto.latitude || !dto.longitude) {
      res.status(400).json({
        code: 400,
        message: '缺少必填字段：name, latitude, longitude'
      });
      return;
    }

    // 验证坐标范围
    if (dto.latitude < -90 || dto.latitude > 90) {
      res.status(400).json({
        code: 400,
        message: '纬度超出范围 (-90 ~ 90)'
      });
      return;
    }
    if (dto.longitude < -180 || dto.longitude > 180) {
      res.status(400).json({
        code: 400,
        message: '经度超出范围 (-180 ~ 180)'
      });
      return;
    }

    const marker = await markerService.create(dto);
    res.status(201).json({
      code: 200,
      message: '创建成功',
      data: marker
    });
  } catch (error: any) {
    logger.error('创建标记点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 获取所有标记点
 * GET /api/markers
 */
export const findAll = async (req: Request, res: Response) => {
  try {
    const filter: MarkerFilter = {};
    
    if (req.query.type) {
      filter.type = req.query.type as any;
    }
    if (req.query.keyword) {
      filter.keyword = req.query.keyword as string;
    }
    if (req.query.bounds) {
      try {
        filter.bounds = JSON.parse(req.query.bounds as string);
      } catch (e) {
        logger.warn('解析 bounds 参数失败');
      }
    }

    const markers = await markerService.findAll(filter);
    res.json({
      code: 200,
      message: '获取成功',
      data: markers,
      total: markers.length
    });
  } catch (error: any) {
    logger.error('获取标记点列表失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 根据 ID 获取标记点
 * GET /api/markers/:id
 */
export const findById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const marker = await markerService.findById(id);
    
    if (!marker) {
      res.status(404).json({
        code: 404,
        message: '标记点不存在'
      });
      return;
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: marker
    });
  } catch (error: any) {
    logger.error('获取标记点详情失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 更新标记点
 * PUT /api/markers/:id
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto: UpdateMarkerDTO = req.body;

    const marker = await markerService.update(id, dto);
    
    if (!marker) {
      res.status(404).json({
        code: 404,
        message: '标记点不存在'
      });
      return;
    }

    res.json({
      code: 200,
      message: '更新成功',
      data: marker
    });
  } catch (error: any) {
    logger.error('更新标记点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 删除标记点
 * DELETE /api/markers/:id
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await markerService.delete(id);
    
    if (!success) {
      res.status(404).json({
        code: 404,
        message: '标记点不存在'
      });
      return;
    }

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除标记点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 批量导入标记点
 * POST /api/markers/batch
 */
export const batchImport = async (req: Request, res: Response) => {
  try {
    const dtos: CreateMarkerDTO[] = req.body;
    
    if (!Array.isArray(dtos)) {
      res.status(400).json({
        code: 400,
        message: '请求体必须是数组'
      });
      return;
    }

    const markers = await markerService.batchImport(dtos);
    res.status(201).json({
      code: 200,
      message: `批量导入成功，共 ${markers.length} 个标记点`,
      data: markers
    });
  } catch (error: any) {
    logger.error('批量导入失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 导出所有标记点
 * GET /api/markers/export
 */
export const exportAll = async (req: Request, res: Response) => {
  try {
    const markers = await markerService.export();
    res.json({
      code: 200,
      message: '导出成功',
      data: markers
    });
  } catch (error: any) {
    logger.error('导出标记点失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};
