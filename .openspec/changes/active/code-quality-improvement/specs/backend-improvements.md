# 后端改进 Spec

## 1. 创建 cad.model.ts

从 `cad.service.ts` 中提取 `CADEntity`、`CADLayer`、`CADFile` 接口到独立文件。

**文件**: `backend/src/models/cad.model.ts`

```typescript
export interface CADEntity {
  type: string;
  layer: string;
  color?: number;
  geometry?: Record<string, any>;
}

export interface CADLayer {
  name: string;
  visible: boolean;
  entities: CADEntity[];
}

export interface CADFile {
  filename: string;
  originalName: string;
  uploadTime: Date;
  layers: CADLayer[];
}
```

## 2. 安装依赖

```bash
cd backend && npm install zod helmet express-rate-limit cors
```

## 3. 创建校验中间件

**文件**: `backend/src/middleware/validate.ts`

```typescript
import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(
  schema: z.ZodType,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      return res.status(422).json({
        code: 422,
        message: '参数校验失败',
        errors: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      })
    }
    // 将校验后的数据写回 req
    req[source] = result.data
    next()
  }
}
```

## 4. 创建统一响应工具

**文件**: `backend/src/utils/response.ts`

```typescript
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

export function success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
  return { code: 200, message, data }
}

export function error(code: number, message: string, errors?: Array<{ field: string; message: string }>): ApiResponse {
  return { code, message, errors }
}
```

## 5. 改造 index.ts 添加安全中间件

在 `app.use(express.json())` 之前添加：
- `helmet()` - 安全头
- `cors()` - 配置允许的域名
- `rateLimit()` - 全局限流

## 6. 改造 Controller

- marker.controller.ts: 使用 zod 校验 + 统一响应
- cad.controller.ts: 使用 zod 校验 + 统一响应

---

## 验收标准

- [ ] `npm run build` 编译通过
- [ ] 所有 Controller 使用 zod 校验
- [ ] 所有 API 返回 `{ code, message, data }` 格式
- [ ] helmet + rate-limit 生效
