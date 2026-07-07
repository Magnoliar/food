import { recommendRecipes } from '../../services/recommendation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  return recommendRecipes(body || {}, event.context.authUser?.id)
})
