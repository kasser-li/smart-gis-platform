/**
 * CAD 图纸路由
 */

import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/cad.controller';

export const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cad/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.dxf', '.dwg'];
    const ext = file.originalname.slice((file.originalname.lastIndexOf(".") - 1 >>> 0) + 2);
    if (allowedTypes.includes('.' + ext.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 DXF/DWG 格式'));
    }
  }
});

// 上传并解析 CAD 文件
router.post('/upload', upload.single('file'), controller.upload);

// 获取支持的格式
router.get('/supported-formats', controller.getSupportedFormats);

// 获取 CAD 文件详情
router.get('/:filename', controller.getDetails);

// 切换图层可见性
router.post('/:filename/layers/:layerName/visibility', controller.toggleLayerVisibility);
