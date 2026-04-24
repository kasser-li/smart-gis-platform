/**
 * Zod 参数校验中间件
 */

import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

/**
 * 创建校验中间件
 * @param schema Zod 校验规则
 * @param source 校验来源：body / query / params
 */
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
        errors: result.error.issues.map(e => ({
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
