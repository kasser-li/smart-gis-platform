/**
 * Smart GIS Platform - 后端服务入口
 * 
 * 技术栈: Node.js + Express + TypeScript
 * 架构: RESTful API + MVC 分层
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import * as path from 'path'
import { router as markerRoutes } from './routes/marker.routes'
import { router as cadRoutes } from './routes/cad.routes'
import { logger } from './utils/logger'

const app = express()
const PORT = process.env.PORT || 3000

// ==================== 安全中间件 ====================

// Helmet - 设置安全 HTTP 头
app.use(helmet())

// CORS - 配置允许的域名（生产环境需指定具体域名）
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 Postman）
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// Rate Limiting - 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每 IP 最多 100 次请求
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
})
app.use('/api/', limiter)

// ==================== 基础中间件 ====================

// 解析 JSON
app.use(express.json({ limit: '10mb' }))

// 解析 URL 编码
app.use(express.urlencoded({ extended: true }))

// 请求日志中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`)
  })
  next()
})

// ==================== 静态文件 ====================

// CAD 上传目录
app.use('/uploads/cad', express.static(path.join(__dirname, '../uploads/cad')))

// ==================== API 路由 ====================

// 标记点 API
app.use('/api/markers', markerRoutes)

// CAD 图纸 API
app.use('/api/cad', cadRoutes)

// ==================== 健康检查 ====================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    code: 200, 
    message: 'ok',
    data: { 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  })
})

// ==================== 404 处理 ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({ code: 404, message: '接口不存在' })
})

// ==================== 全局错误处理 ====================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`${req.method} ${req.path} 错误:`, err)
  
  // CORS 错误
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ code: 403, message: '跨域请求被拒绝' })
  }
  
  // 默认 500
  res.status(500).json({ 
    code: 500, 
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message 
  })
})

// ==================== 启动服务 ====================

app.listen(PORT, () => {
  logger.info(`🚀 Smart GIS Platform 后端服务已启动`)
  logger.info(`📍 端口: ${PORT}`)
  logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`)
})

export default app
