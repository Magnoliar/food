import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { prisma } from './prisma'

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const MAX_PUBLIC_DIMENSION = 1200
const PUBLIC_IMAGE_MIME = 'image/jpeg'
const PUBLIC_IMAGE_EXTENSION = 'jpg'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function todayParts() {
  const now = new Date()
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ]
}

export async function saveUploadedImage(file: any, kind: string, userId?: string | null) {
  if (!file || !file.data) throw createError({ statusCode: 400, message: '缺少上传文件' })
  if (file.data.length === 0) throw createError({ statusCode: 400, message: '文件是空的' })
  if (!ALLOWED_TYPES.has(file.type)) throw createError({ statusCode: 400, message: '只支持 jpg、png、webp 图片' })
  if (file.data.length > MAX_UPLOAD_SIZE) throw createError({ statusCode: 400, message: '图片不能超过 5MB' })

  const parts = todayParts()
  const id = randomUUID()
  const filename = `${id}.${PUBLIC_IMAGE_EXTENSION}`
  const originalFilename = `${id}.original`
  const publicDir = path.resolve(process.cwd(), 'public', 'uploads', ...parts)
  const backupDir = path.resolve(process.cwd(), 'uploads_backup', ...parts)
  await fs.mkdir(publicDir, { recursive: true })
  await fs.mkdir(backupDir, { recursive: true })

  const publicPath = path.join(publicDir, filename)
  const backupPath = path.join(backupDir, originalFilename)
  await fs.writeFile(backupPath, file.data)

  let processed: { data: Buffer; info: sharp.OutputInfo }
  try {
    processed = await sharp(file.data)
      .rotate()
      .resize({
        width: MAX_PUBLIC_DIMENSION,
        height: MAX_PUBLIC_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
  } catch {
    // sharp 处理失败时清理备份文件
    await fs.unlink(backupPath).catch(() => {})
    throw createError({ statusCode: 400, message: '图片处理失败，文件可能已损坏' })
  }

  await fs.writeFile(publicPath, processed.data)

  const url = `/uploads/${parts.join('/')}/${filename}`
  const originalUrl = `/uploads_backup/${parts.join('/')}/${originalFilename}`
  return prisma.mediaAsset.create({
    data: {
      kind,
      url,
      originalUrl,
      mimeType: PUBLIC_IMAGE_MIME,
      size: processed.data.length,
      width: processed.info.width,
      height: processed.info.height,
      createdBy: userId || null,
    },
  })
}

export async function deleteMediaAsset(id: string, userId?: string | null, isAdmin = false) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!asset) throw createError({ statusCode: 404, message: '媒体文件不存在' })
  if (!isAdmin && asset.createdBy && asset.createdBy !== userId) {
    throw createError({ statusCode: 403, message: '不能删除其他人的媒体文件' })
  }

  const publicRoot = path.resolve(process.cwd(), 'public')
  const backupRoot = path.resolve(process.cwd(), 'uploads_backup')
  for (const candidate of [asset.url, asset.originalUrl]) {
    if (!candidate) continue
    const isBackup = candidate.startsWith('/uploads_backup')
    const root = isBackup ? backupRoot : publicRoot
    const relative = isBackup
      ? candidate.replace(/^\/uploads_backup\/?/, '')
      : candidate.replace(/^\//, '')
    const target = path.resolve(root, relative)
    if (target.startsWith(root)) {
      await fs.unlink(target).catch(() => {})
    }
  }

  await prisma.mediaAsset.delete({ where: { id } })
  return { ok: true }
}
