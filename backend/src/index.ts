/**
 * GIS 地图标点 + CAD 图纸解析系统 - 后端服务
 * @author 李明坤
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { router as markerRouter } from './routes/marker.routes';
import { router as cadRouter } from './routes/cad.routes';
import { router as mapRouter } from './routes/map.routes';
import { router as cadQueryRouter } from './routes/cad-query.routes';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api/markers', markerRouter);
app.use('/api/cad', cadRouter);
app.use('/api/maps', mapRouter);
app.use('/api/cad/entities', cadQueryRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  });
});

// 启动服务
app.listen(PORT, () => {
  logger.info(`🚀 后端服务已启动：http://localhost:${PORT}`);
  logger.info(`📍 环境：${process.env.NODE_ENV || 'development'}`);
});

export default app;
