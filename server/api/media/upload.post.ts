import { saveUploadedImage } from '../../utils/media'
import { recordAchievementEvent } from '../../services/achievement'

export default defineEventHandler(async (event) => {
  let form: Awaited<ReturnType<typeof readMultipartFormData>>
  try {
    form = await readMultipartFormData(event)
  } catch {
    throw createError({ statusCode: 400, message: '上传格式不正确' })
  }
  const file = form?.find((part: any) => part.name === 'file')
  const kind = form?.find((part: any) => part.name === 'kind')?.data?.toString('utf8') || 'general'
  const asset = await saveUploadedImage(file, kind, event.context.authUser?.id)
  await recordAchievementEvent('photo_uploaded', event.context.authUser?.id, asset.id)
  return asset
})
