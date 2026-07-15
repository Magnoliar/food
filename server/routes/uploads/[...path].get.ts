import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { getRuntimePaths, isPathInside } from '../../utils/runtime-paths'

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  const encodedPath = getRouterParam(event, 'path') || ''
  let relativePath: string
  try {
    relativePath = decodeURIComponent(encodedPath).replace(/\\/g, '/')
  } catch {
    throw createError({ statusCode: 400, message: '图片地址无效' })
  }

  const segments = relativePath.split('/')
  if (!relativePath || segments.some(segment => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))) {
    throw createError({ statusCode: 404, message: '图片不存在' })
  }

  const uploadsRoot = getRuntimePaths().publicUploadsDir
  const filePath = path.resolve(uploadsRoot, ...segments)
  if (!isPathInside(uploadsRoot, filePath)) {
    throw createError({ statusCode: 404, message: '图片不存在' })
  }

  let fileStat
  try {
    fileStat = await stat(filePath)
  } catch {
    throw createError({ statusCode: 404, message: '图片不存在' })
  }
  if (!fileStat.isFile()) throw createError({ statusCode: 404, message: '图片不存在' })

  const extension = path.extname(filePath).toLowerCase()
  const contentType = CONTENT_TYPES[extension]
  if (!contentType) throw createError({ statusCode: 415, message: '不支持的图片格式' })

  const etag = `"${fileStat.size.toString(16)}-${Math.trunc(fileStat.mtimeMs).toString(16)}"`
  setHeaders(event, {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Length': String(fileStat.size),
    'Content-Type': contentType,
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  })
  if (getHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304)
    return null
  }

  return sendStream(event, createReadStream(filePath))
})
