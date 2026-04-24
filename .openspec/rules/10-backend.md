# 后端开发规范（Node.js + TypeScript + Express）

> 参考阿里巴巴 Java 开发规约 + Google TypeScript Style Guide

## 必须遵守（放开头）

### 技术栈
- Node.js 20.x
- TypeScript 5.x（strict 模式）
- Express 4.x
- TypeORM（数据库 ORM）
- PostgreSQL + PostGIS

### 目录结构
```
src/
├── index.ts              # 入口文件（仅启动和中间件挂载）
├── config/               # 配置（环境变量、LOD 配置等）
├── routes/               # 路由定义（只做路由映射）
├── controllers/          # 控制器（参数校验 + 响应格式 + 错误处理）
├── services/             # 服务层（业务逻辑，不含 HTTP 相关代码）
├── models/               # 数据模型 + DTO 定义
├── middleware/           # 中间件（认证、限流、日志等）
├── utils/                # 纯工具函数（无副作用）
└── __tests__/            # 测试文件（与源码同级）
```

### 分层规范（强制）
```
Route → Controller → Service → Model/Repository
```
- **Route**：只做路径映射和中间件挂载，不包含业务逻辑
- **Controller**：只做参数校验、调用 Service、返回统一响应格式
- **Service**：核心业务逻辑，不依赖 Express Request/Response
- **Model**：数据定义和数据库操作

**禁止跨层调用**（Controller 不能跳过 Service 直接操作 Model）

## 响应格式（统一）

所有 API 必须返回以下格式：
```typescript
interface ApiResponse<T = any> {
  code: number;       // 业务状态码：200 成功，其他为业务错误码
  message: string;    // 响应消息
  data?: T;           // 响应数据
  error?: string;     // 错误详情（仅开发环境）
}
```

HTTP 状态码与业务 code 对应关系：
| HTTP 状态码 | 业务 code | 说明 |
|-------------|-----------|------|
| 200 | 200 | 成功 |
| 201 | 200 | 创建成功（业务 code 仍为 200） |
| 400 | 400 | 参数错误 |
| 401 | 401 | 未认证 |
| 403 | 403 | 无权限 |
| 404 | 404 | 资源不存在 |
| 422 | 422 | 校验失败 |
| 429 | 429 | 请求过于频繁 |
| 500 | 500 | 服务器内部错误 |

## 控制器规范

### 参数校验
- 使用 zod/joi 等校验库，禁止手动 if-else 校验
- 校验失败返回 400 + 具体错误信息
- 所有必填参数必须校验

```typescript
// ✅ 推荐：使用 zod 校验
const createMarkerSchema = z.object({
  name: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: z.enum(['point', 'building', 'facility', 'warning']).default('point'),
  description: z.string().max(500).optional(),
});

// ❌ 禁止：手动校验
if (!dto.name) { res.status(400)... }
if (dto.latitude < -90 || dto.latitude > 90) { res.status(400)... }
```

### 错误处理
- 每个 controller 方法必须用 try-catch 包裹
- catch 中必须记录日志：`logger.error('操作描述:', error)`
- 生产环境不暴露错误堆栈

## 服务层规范

### 业务逻辑
- Service 方法必须是纯业务逻辑，不依赖 HTTP 相关对象
- 复杂业务必须拆分为多个私有方法
- 禁止在 Service 中使用 `console.log`（使用 logger）

### 事务管理
- 涉及多表写入的操作必须使用数据库事务
- 事务必须在 finally 中释放连接

### 数据访问
- 使用 TypeORM Repository/QueryBuilder，禁止拼接 SQL
- 查询必须指定返回字段，禁止 `SELECT *`
- 分页查询必须限制最大页大小（默认 50）

## 路由规范

- 路由文件只做映射，禁止包含业务逻辑
- 路由路径使用 kebab-case：`/api/markers`, `/api/cad/upload`
- 路由分组使用 `app.use('/api/v1', router)`（预留版本控制）
- 路由参数使用 `:id` 格式，禁止自定义参数名

## 中间件规范

- 每个中间件独立文件，放在 `middleware/` 目录
- 必须处理 next(error) 传递错误
- 日志中间件记录请求方法、路径、耗时、状态码
- 错误中间件必须是最后一个 `app.use((err, req, res, next) => {...})`

## 日志规范

- 使用 winston 记录日志
- 日志级别：error（错误）/ warn（警告）/ info（关键操作）/ debug（调试）
- 生产环境禁止 DEBUG 级别
- 关键操作必须记录：用户操作、数据变更、文件上传
- 日志文件按天滚动，保留 30 天

## 配置管理

- 所有配置通过环境变量读取
- 使用 dotenv 加载 `.env` 文件
- 启动时校验必需的环境变量，缺失则报错退出
- 禁止在代码中硬编码配置值

## 文件上传

- 使用 multer 处理文件上传
- 必须限制文件大小（默认 50MB）
- 必须校验文件类型（白名单）
- 文件名必须重命名（避免路径穿越攻击）
- 上传目录必须配置在环境变量中

## 安全要求

- CORS 必须配置允许的域名，禁止 `*`（生产环境）
- 使用 helmet 设置安全 HTTP 头
- 使用 rate-limit 限制请求频率
- 文件上传必须校验 MIME 类型（不只校验扩展名）
- 敏感接口（删除、批量操作）必须增加额外验证

## 性能要求

- 大文件处理使用 Stream，禁止一次性读入内存
- 列表接口必须支持分页
- 数据库查询必须使用索引
- 频繁查询的数据考虑缓存（Redis）
- API 响应时间目标：< 200ms（简单查询）/ < 2s（复杂操作）

---

## 重要提醒（放结尾）

- **Controller 不写业务逻辑**，Service 不碰 HTTP 对象
- **统一响应格式**，所有接口必须遵守
- **参数校验前置**，不信任任何用户输入
- **日志记录关键操作**，便于排查问题
- **禁止 `any` 类型**，所有变量必须有明确类型
