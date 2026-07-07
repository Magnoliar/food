import { parseShoppingItemCreate } from '../../../schemas/shopping-list'
import { addManualShoppingItem } from '../../../services/shopping-list'

export default defineEventHandler(async (event) => {
  const body = parseShoppingItemCreate(await readBody(event))
  return addManualShoppingItem(body)
})
