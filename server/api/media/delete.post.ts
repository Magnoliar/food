import { parseMediaDelete } from '../../schemas/media'
import { deleteMediaAsset } from '../../utils/media'

export default defineEventHandler(async (event) => {
  const body = parseMediaDelete(await readBody(event))
  return deleteMediaAsset(body.id, event.context.authUser?.id, event.context.authUser?.role === 'admin')
})
