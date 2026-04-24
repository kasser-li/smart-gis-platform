/**
 * CAD 实体查询路由
 * 支持 LOD 和视口动态查询
 */

import { Router } from 'express';
import { cadService } from '../services/cad.service';
import { cadFilterService } from '../services/cad-filter.service';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

export const router = Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads/cad');

/**
 * 动态查询实体
 * POST /api/cad/entities/query
 */
router.post('/query', async (req, res) => {
  try {
    const { filename, zoom, bounds } = req.body;
    
    logger.info(`查询实体：filename=${filename}, zoom=${zoom}`);
    
    // 构建文件路径
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        code: 404,
        message: '文件不存在'
      });
      return;
    }
    
    // 解析 CAD 文件
    const cadFile = await cadService.parseDXF(filePath, filename);
    
    if (!cadFile.metadata) {
      res.status(500).json({ code: 500, message: 'CAD 文件元数据解析失败' });
      return;
    }
    
    // 创建转换上下文
    const extents = cadFile.metadata.extents;
    const context = {
      mapCenter: bounds ? {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2
      } : { lat: 39.9042, lng: 116.4074 },
      cadCenterX: (extents.minX + extents.maxX) / 2,
      cadCenterY: (extents.minY + extents.maxY) / 2,
      scale: 0.00001
    };
    
    // 应用 LOD 过滤和视口裁剪
    const filterResult = cadFilterService.applyFilters(
      cadFile.layers,
      zoom,
      bounds,
      context
    );
    
    logger.info(`查询完成：返回${filterResult.returned}/${filterResult.total} 实体`);
    
    res.json({
      code: 200,
      message: '查询成功',
      data: {
        layers: filterResult.layers.map((l: any) => ({
          name: l.name,
          color: l.color,
          visible: l.visible,
          entityCount: l.entities.length,
          entities: l.entities
        })),
        metadata: {
          totalEntities: filterResult.total,
          returnedEntities: filterResult.returned,
          simplified: filterResult.simplified,
          zoomLevel: zoom
        },
        count: filterResult.returned
      }
    });
  } catch (error: any) {
    logger.error('查询实体失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
});

/**
 * 获取 LOD 配置
 * GET /api/cad/lod-config
 */
router.get('/lod-config', (req, res) => {
  const { LOD_CONFIG } = require('../config/lod.config');
  res.json({
    code: 200,
    data: {
      lodLevels: LOD_CONFIG
    }
  });
});
