# 代码质量提升提案

**创建时间**: 2026-04-24  
**状态**: 待实施  
**优先级**: P0

---

## 1. 问题描述

### 1.1 现状
项目已升级 OpenSpec rules（通用/后端/前端/数据库/测试/安全 6 份规范），但实际代码与新规范存在多处不一致：

| # | 问题 | 严重程度 | 涉及规范 |
|---|------|---------|---------|
| 1 | `cad-filter.service.ts` import `../models/cad.model` 但该文件不存在 | 🔴 编译错误 | 10-backend |
| 2 | 参数校验全用 if-else，无 zod/joi 校验库 | 🟡 规范不符 | 10-backend |
| 3 | Controller 混用 HTTP 状态码和业务 code（`res.status(201).json({code:200})`） | 🟡 规范不符 | 10-backend |
| 4 | 无 API 抽象层，前端组件直接调用 axios | 🟡 规范不符 | 20-frontend |
| 5 | MapView.vue 800+ 行，违反单一职责（≤300行） | 🟡 规范不符 | 20-frontend |
| 6 | 无 TypeScript 类型定义文件（types/） | 🟡 规范不符 | 20-frontend |
| 7 | 无 helmet/rate-limit 安全中间件 | 🟡 规范不符 | 50-security |
| 8 | CORS 配置过于宽松（`cors()` 默认 *） | 🟡 规范不符 | 50-security |
| 9 | 无测试文件 | 🔴 规范不符 | 40-testing |
| 10 | 内存存储与 README 写的 PostgreSQL 不一致 | 🟠 文档不符 | 30-database |

### 1.2 目标
- 修复编译错误（#1）
- 补齐规范缺失（#2-#8）
- 建立测试基础（#9）
- 文档与实现对齐（#10）

---

## 2. 解决方案

### 2.1 后端改进

#### 修复 cad.model.ts
从 `cad.service.ts` 中导出 `CADEntity`、`CADLayer`、`CADFile` 接口到独立文件 `models/cad.model.ts`

#### 引入 zod 校验
```typescript
// middleware/validate.ts
import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: z.ZodType, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      return res.status(422).json({
        code: 422,
        message: '参数校验失败',
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      })
    }
    next()
  }
}
```

#### 统一响应工具
```typescript
// utils/response.ts
export function success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
  return { code: 200, message, data }
}
export function error(code: number, message: string): ApiResponse {
  return { code, message }
}
```

#### 安全中间件
- 添加 `helmet` 安全头
- 添加 `express-rate-limit` 限流
- 修正 CORS 配置

### 2.2 前端改进

#### API 封装层
```
src/api/
├── index.ts          # Axios 实例 + 拦截器
├── marker.api.ts     # 标记点 API
└── cad.api.ts        # CAD API
```

#### TypeScript 类型
```
src/types/
├── marker.ts         # Marker 相关类型
└── cad.ts            # CAD 相关类型
```

#### 组件拆分
从 MapView.vue 拆出：
- `components/MarkerForm.vue` — 标记点表单
- `components/CadUpload.vue` — CAD 上传对话框
- `components/MarkerList.vue` — 标记点列表
- `components/LayerPanel.vue` — 图层面板

### 2.3 测试基础
- 配置 Vitest
- 补 marker.service 单元测试
- 补 marker.controller 集成测试

---

## 3. 实施计划

### 阶段 1: 后端修复（P0）
- [ ] 创建 `models/cad.model.ts`
- [ ] 安装 zod + helmet + rate-limit
- [ ] 创建校验中间件和响应工具
- [ ] 改造 Controller 使用 zod + 统一响应
- [ ] 添加安全中间件

### 阶段 2: 前端重构（P1）
- [ ] 创建 `types/` 目录
- [ ] 创建 `api/` 封装层
- [ ] 改造 MapView.vue 使用 api 层
- [ ] 拆分大组件

### 阶段 3: 测试（P2）
- [ ] 配置 Vitest
- [ ] 补 marker.service 测试
- [ ] 补 API 集成测试

---

## 4. 验收标准

- [ ] 后端编译无错误
- [ ] 所有 Controller 使用 zod 校验
- [ ] 所有 API 返回统一格式
- [ ] 前端无直接 axios 调用
- [ ] 单个组件 ≤ 300 行
- [ ] 核心 Service 有单元测试
- [ ] 安全中间件生效（helmet + rate-limit）

---

## 5. 变更记录

| 日期 | 变更内容 | 变更人 | 状态 |
|------|----------|--------|------|
| 2026-04-24 | 初始提案 | OpenClaw | ⏳ 待审批 |
