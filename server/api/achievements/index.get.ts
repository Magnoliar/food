import { listAchievements } from '../../services/achievement'

export default defineEventHandler(async (event) => {
  return listAchievements(event.context.authUser?.id)
})
