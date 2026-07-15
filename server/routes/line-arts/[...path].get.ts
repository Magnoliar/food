import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { getRuntimePaths, isPathInside } from '../../utils/runtime-paths'

const CONTENT_TYPES: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  const encodedPath = getRouterParam(event, 'path') || ''
  let relativePath: string
  try {
    relativePath = decodeURIComponent(encodedPath).replace(/\\/g, '/')
  } catch {
    throw createError({ statusCode: 400, message: '线稿地址无效' })
  }

  const segments = relativePath.split('/')
  if (!relativePath || segments.some(segment => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))) {
    throw createError({ statusCode: 404, message: '线稿不存在' })
  }

  const runtimeRoot = getRuntimePaths().lineArtsDir
  const bundledRoot = path.resolve(process.cwd(), 'public/line-arts')
  const candidates = [runtimeRoot, bundledRoot]

  for (const root of candidates) {
    const filePath = path.resolve(root, ...segments)
    if (!isPathInside(root, filePath)) continue
    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) continue
      const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()]
      if (!contentType) continue
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
    } catch {
      // Runtime-generated files take priority; bundled assets are the safe fallback.
    }
  }

  throw createError({ statusCode: 404, message: '线稿不存在' })
})
