# 安全规范

> 参考阿里巴巴 Java 开发手册安全规约 + OWASP Top 10

## 必须遵守（放开头）

### 输入安全

#### 参数校验（强制）
- 所有用户输入必须校验，不信任任何外部输入
- 使用 zod/joi 等校验库，禁止手动 if-else
- 校验范围：类型、长度、格式、范围
- 文件上传必须校验：扩展名 + MIME 类型 + 文件大小

```typescript
// ✅ 推荐
const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

// ❌ 禁止
if (!req.body.name) { ... }
```

#### SQL 注入防护
- 使用 ORM（TypeORM）或参数化查询
- 禁止拼接 SQL 字符串
- 禁止将用户输入直接拼入 SQL

#### XSS 防护
- 前端输出用户内容使用 `{{ }}`（自动转义）
- 禁止使用 `v-html` 渲染不可信内容
- API 返回的 HTML 内容必须经过 sanitize

#### 路径穿越防护
- 文件操作必须校验路径，禁止 `../` 等相对路径
- 上传文件名必须重命名，禁止使用原始文件名
- 文件读取必须限制在指定目录内

### 认证与授权

#### Token 管理
- Token 存储在 HttpOnly Cookie，禁止存储在 localStorage
- Token 必须设置过期时间（Access Token ≤ 2h，Refresh Token ≤ 7d）
- Token 失效后必须拒绝请求，返回 401

#### 权限控制
- 接口必须验证用户权限
- 敏感操作（删除、批量操作）必须二次验证
- 数据访问必须校验数据归属

### 数据安全

#### 敏感信息
- 密码必须加密存储（bcrypt，禁止明文/MD5）
- 日志中禁止记录密码、token、身份证号
- API 响应中禁止返回密码等敏感字段
- 环境变量中的密钥禁止提交到 Git

#### 数据传输
- 生产环境必须使用 HTTPS
- 跨域请求必须配置 CORS 白名单
- 禁止在 URL 中传递敏感参数（使用 POST Body）

### 接口安全

#### Rate Limiting
- 所有公开接口必须限流
- 登录接口：5 次/分钟，失败锁定 30 分钟
- 文件上传：10 次/分钟
- 普通接口：60 次/分钟

#### CORS 配置
```typescript
// ✅ 推荐：指定允许的域名
app.use(cors({
  origin: ['https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// ❌ 禁止：生产环境使用 *
app.use(cors())
```

#### Security Headers
使用 helmet 设置安全响应头：
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security（HTTPS）
- Content-Security-Policy

### 文件安全

#### 上传安全
- 限制文件大小（默认 50MB）
- 白名单校验文件类型
- 文件名重命名（UUID + 原始扩展名）
- 上传目录不可执行（禁止 PHP/JS 执行）
- 图片文件验证真实格式（不只校验扩展名）

#### 下载安全
- 禁止直接暴露文件路径
- 下载链接必须带 token 验证
- 大文件使用流式下载，禁止一次性加载

### 日志安全

- 记录所有认证/授权失败事件
- 记录所有数据变更操作（谁、何时、改了什么）
- 日志保留 ≥ 6 个月（涉及敏感操作）
- 日志文件权限：仅应用用户可读写
- 日志中脱敏处理：手机号、身份证号

### 依赖安全

- 定期运行 `npm audit` 检查漏洞
- 禁止使用未经验证的第三方包
- 锁定依赖版本（package-lock.json 必须提交）
- 及时更新有安全漏洞的依赖

---

## 重要提醒（放结尾）

- **不信任任何输入**，所有用户数据必须校验
- **最小权限原则**，接口只开放必要的功能
- **纵深防御**，多层防护，不依赖单一安全措施
- **日志记录安全事件**，便于追溯和审计
- **定期安全审查**，及时发现和修复漏洞
