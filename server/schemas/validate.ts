import { z, ZodError, type ZodType } from 'zod'

export type Rule<T> = (value: unknown, field: string) => T

export type Schema<T> = Record<keyof T, Rule<any>>

export function validationError(message: string): never {
  throw createError({ statusCode: 400, message })
}

function parseWith<T>(schema: ZodType<T>, value: unknown, field: string): T {
  try {
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0]
      validationError(issue?.message || `${field} 格式不正确`)
    }
    throw error
  }
}

export function objectBody(body: unknown) {
  return parseWith(z.record(z.string(), z.unknown()), body, 'body')
}

export function optional<T>(rule: Rule<T>): Rule<T | undefined> {
  return (value, field) => value === undefined ? undefined : rule(value, field)
}

export function stringRule(options: { min?: number; max?: number } = {}): Rule<string> {
  return (value, field) => {
    let schema = z.string({ error: `${field} 必须是文本` }).trim()
    if (options.min !== undefined) schema = schema.min(options.min, `${field} 不能为空`)
    if (options.max !== undefined) schema = schema.max(options.max, `${field} 不能超过 ${options.max} 个字符`)
    return parseWith(schema, value, field)
  }
}

export function nullableString(options: { max?: number } = {}): Rule<string | null> {
  return (value, field) => {
    if (value === null || value === '') return null
    return stringRule({ max: options.max })(value, field)
  }
}

export function numberRule(options: { min?: number; max?: number; int?: boolean } = {}): Rule<number> {
  return (value, field) => {
    let schema = z.coerce.number({ error: `${field} 必须是数字` })
    if (options.int) schema = schema.int(`${field} 必须是整数`)
    if (options.min !== undefined) schema = schema.min(options.min, `${field} 不能小于 ${options.min}`)
    if (options.max !== undefined) schema = schema.max(options.max, `${field} 不能大于 ${options.max}`)
    return parseWith(schema, value, field)
  }
}

export function booleanRule(): Rule<boolean> {
  return (value, field) => {
    return parseWith(z.boolean({ error: `${field} 必须是布尔值` }), value, field)
  }
}

export function stringArray(options: { max?: number } = {}): Rule<string[]> {
  return (value, field) => {
    let schema = z.array(z.string().trim().min(1).max(120), { error: `${field} 必须是数组` })
    if (options.max !== undefined) schema = schema.max(options.max, `${field} 不能超过 ${options.max} 项`)
    return parseWith(schema, value, field)
  }
}

export function dateRule(): Rule<Date> {
  return (value, field) => {
    return parseWith(z.coerce.date({ error: `${field} 必须是有效日期` }), value, field)
  }
}

export function pickSchema<T extends Record<string, unknown>>(body: unknown, schema: Schema<T>) {
  const source = objectBody(body)
  const result: Record<string, unknown> = {}
  for (const [key, rule] of Object.entries(schema)) {
    const parsed = (rule as Rule<unknown>)(source[key], key)
    if (parsed !== undefined) result[key] = parsed
  }
  return result as Partial<T>
}
