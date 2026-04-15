/**
 * 标记点路由
 */

import { Router } from 'express';
import * as controller from '../controllers/marker.controller';

export const router = Router();

// 创建标记点
router.post('/', controller.create);

// 获取所有标记点
router.get('/', controller.findAll);

// 导出所有标记点
router.get('/export', controller.exportAll);

// 批量导入标记点
router.post('/batch', controller.batchImport);

// 根据 ID 获取标记点
router.get('/:id', controller.findById);

// 更新标记点
router.put('/:id', controller.update);

// 删除标记点
router.delete('/:id', controller.remove);
