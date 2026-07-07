import { getCurrentShoppingList } from '../../services/shopping-list'

export default defineEventHandler(async () => {
  return getCurrentShoppingList()
})
