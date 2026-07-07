import { parseShoppingItemPatch } from '../../../schemas/shopping-list'
import { updateShoppingItem } from '../../../services/shopping-list'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少购物项 ID' })

  try {
    return await updateShoppingItem(id, parseShoppingItemPatch(await readBody(event)))
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '购物项不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})
