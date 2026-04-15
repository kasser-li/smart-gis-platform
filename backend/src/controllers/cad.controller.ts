/**
 * CAD 图纸控制器
 */

import { Request, Response } from 'express';
import { cadService } from '../services/cad.service';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '../../uploads/cad');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * 上传并解析 CAD 文件
 * POST /api/cad/upload
 */
export const upload = async (req: Request, res: Response) => {
  try {
    // 检查文件
    if (!req.file) {
      res.status(400).json({
        code: 400,
        message: '请上传 DXF 文件'
      });
      return;
    }

    // 检查文件类型
    const allowedTypes = ['.dxf', '.dwg'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        code: 400,
        message: '仅支持 DXF/DWG 格式文件'
      });
      return;
    }

    // 解析文件
    const cadFile = await cadService.parseDXF(req.file.path, req.file.originalname);

    // 返回解析结果
    res.json({
      code: 200,
      message: '解析成功',
      data: {
        filename: cadFile.filename,
        layers: cadFile.layers.map(l => ({
          name: l.name,
          color: l.color,
          visible: l.visible,
          entityCount: l.entities.length
        })),
        metadata: cadFile.metadata,
        uploadTime: cadFile.uploadTime
      }
    });
  } catch (error: any) {
    logger.error('CAD 文件上传失败:', error);
    
    // 清理上传的文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 获取 CAD 文件详情
 * GET /api/cad/:filename
 */
export const getDetails = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        code: 404,
        message: '文件不存在'
      });
      return;
    }

    const cadFile = await cadService.parseDXF(filePath, filename);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: cadFile
    });
  } catch (error: any) {
    logger.error('获取 CAD 文件详情失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 切换图层可见性
 * POST /api/cad/:filename/layers/:layerName/visibility
 */
export const toggleLayerVisibility = async (req: Request, res: Response) => {
  try {
    const { filename, layerName } = req.params;
    const { visible } = req.body;
    
    // 这里应该更新数据库中的图层状态
    // 简化实现，直接返回成功
    
    res.json({
      code: 200,
      message: `图层 ${layerName} 可见性已${visible ? '开启' : '关闭'}`
    });
  } catch (error: any) {
    logger.error('切换图层可见性失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
};

/**
 * 获取支持的格式
 * GET /api/cad/supported-formats
 */
export const getSupportedFormats = async (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: '获取成功',
    data: {
      formats: [
        { ext: '.dxf', name: 'DXF', description: 'AutoCAD DXF 格式' },
        { ext: '.dwg', name: 'DWG', description: 'AutoCAD DWG 格式（需要额外库支持）' }
      ],
      maxFileSize: '50MB'
    }
  });
};
