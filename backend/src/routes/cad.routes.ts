/**
 * CAD 图纸路由
 */

import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/cad.controller';
import * as fs from 'fs';
import * as path from 'path';

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

// 分片上传配置
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 使用 query 参数而不是 body，因为 multer 处理时 body 还没解析
    const chunkId = req.query.chunkId as string || req.body.chunkId || 'default';
    const chunkDir = path.join(__dirname, '../../uploads/cad/chunks', chunkId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.query.chunkIndex as string || req.body.chunkIndex || '0';
    cb(null, `chunk-${chunkIndex}-${Date.now()}`);
  }
});

const uploadChunk = multer({ storage: chunkStorage });

// 普通上传（小文件）
router.post('/upload', upload.single('file'), controller.upload);

// 分片上传 - 上传分片
router.post('/upload-chunk', uploadChunk.single('file'), controller.uploadChunk);

// 分片上传 - 合并分片
router.post('/merge-chunks', controller.mergeChunks);

// 获取支持的格式
router.get('/supported-formats', controller.getSupportedFormats);

// 获取 CAD 文件详情
router.get('/:filename', controller.getDetails);

// 切换图层可见性
router.post('/:filename/layers/:layerName/visibility', controller.toggleLayerVisibility);
