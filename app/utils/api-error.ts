import type { ApiErrorInfo } from '~/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getApiError(error: unknown, fallback = '操作失败，请稍后再试。'): ApiErrorInfo {
  if (typeof error === 'string') return { message: error }
  if (!isRecord(error)) return { message: fallback }
  const data = isRecord(error.data) ? error.data : undefined
  const message = (typeof data?.message === 'string' && data.message)
    || (typeof error.statusMessage === 'string' && error.statusMessage)
    || (typeof error.message === 'string' && error.message)
    || fallback
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : typeof data?.statusCode === 'number' ? data.statusCode : undefined
  return { statusCode, message, data }
}

export function getApiErrorMessage(error: unknown, fallback?: string) {
  return getApiError(error, fallback).message
}
