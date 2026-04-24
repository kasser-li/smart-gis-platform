/**
 * 统一响应工具
 */

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

/**
 * 成功响应
 */
export function success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
  return { code: 200, message, data }
}

/**
 * 错误响应
 */
export function error(
  code: number,
  message: string,
  errors?: Array<{ field: string; message: string }>
): ApiResponse {
  return { code, message, errors }
}
