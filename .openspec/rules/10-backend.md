# 后端开发规范（Node.js + TypeScript）

## 技术栈
- Node.js 20.x
- TypeScript 5.x
- Express 4.x
- TypeORM

## 目录结构
```
src/
├── index.ts          # 入口文件
├── routes/           # 路由
├── controllers/      # 控制器
├── services/         # 服务层
├── models/           # 数据模型
├── middleware/       # 中间件
└── utils/            # 工具函数
```

## 响应格式
所有 API 返回统一格式：
```typescript
{
  code: number,      // 200 成功，其他为失败
  message: string,   // 响应消息
  data: any          // 响应数据
}
```

## 错误处理
- 使用 try-catch 包裹异步操作
- 错误必须记录日志
- 返回友好的错误消息

## 日志规范
- 使用 winston 记录日志
- 关键操作必须记录
- 生产环境禁止输出 DEBUG 日志
