import { parseIngredientCreate } from '../../schemas/ingredient'
import { serializeIngredient } from '../../serializers/ingredient'
import { createJob, startPolling } from '../../utils/line-art-jobs'
import { prisma } from '../../utils/prisma'
import { xyqSubmitRun, lineArtPrompt } from '../../utils/xyq-client'

export default defineEventHandler(async (event) => {
  const body = parseIngredientCreate(await readBody(event))

  const ingredient = await prisma.ingredient.upsert({
    where: { name: body.name! },
    create: {
      name: body.name!,
      category: body.category || null,
      family: body.family || null,
      crayonColor: body.crayonColor || null,
      lineArtUrl: body.lineArtUrl || null,
    },
    update: {
      category: body.category || undefined,
      family: body.family || undefined,
      crayonColor: body.crayonColor || undefined,
    },
  })

  try {
    const submitResult = await xyqSubmitRun(lineArtPrompt(body.name!))
    if (submitResult.run?.thread_id && submitResult.run?.run_id) {
      const job = await createJob(body.name!, ingredient.id)
      startPolling(job.id, submitResult.run.thread_id, submitResult.run.run_id).catch((error) => {
        console.warn('Line art polling failed:', error)
      })
    }
  } catch {
    // Line art generation is best-effort.
  }

  return serializeIngredient(ingredient)
})
