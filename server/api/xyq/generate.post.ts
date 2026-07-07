import { xyqSubmitRun, lineArtPrompt } from '../../utils/xyq-client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ingredientName } = body

  if (!ingredientName) {
    throw createError({ statusCode: 400, message: 'ingredientName is required' })
  }

  try {
    const result = await xyqSubmitRun(lineArtPrompt(ingredientName))

    return {
      threadId: result.run?.thread_id,
      runId: result.run?.run_id,
      webLink: result.web_thread_link,
      status: 'submitted',
    }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Image generation failed: ${err.message}`,
    })
  }
})
