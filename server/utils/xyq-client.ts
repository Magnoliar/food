export function lineArtPrompt(ingredientName: string): string {
  return `彩铅手绘风格的${ingredientName}，彩色素描，没有填色只有彩色线条，大面积留白，写实且清爽的笔触，纯白色背景。模型：Seedream 5.0 Lite，尺寸：2K，比例：1:1`
}

export async function xyqSubmitRun(message: string, assetIds?: string[]) {
  const effective = getEffectiveAIConfig()
  const baseUrl = effective.xyqBaseUrl || 'https://xyq.jianying.com'
  const apiKey = effective.xyqAccessKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'XYQ_ACCESS_KEY not configured' })
  }

  const body: any = { message }
  if (assetIds?.length) body.asset_ids = assetIds

  const resp = await $fetch<any>(`${baseUrl}/api/biz/v1/skill/submit_run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  })

  if (resp.ret !== '0') {
    throw createError({ statusCode: 502, message: `XYQ error: ${resp.errmsg}` })
  }

  return resp.data
}

export async function xyqGetThread(threadId: string, runId: string, afterSeq = 0) {
  const effective = getEffectiveAIConfig()
  const baseUrl = effective.xyqBaseUrl || 'https://xyq.jianying.com'
  const apiKey = effective.xyqAccessKey

  const resp = await $fetch<any>(`${baseUrl}/api/biz/v1/skill/get_thread`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: { thread_id: threadId, run_id: runId, after_seq: afterSeq },
  })

  if (resp.ret !== '0') {
    throw createError({ statusCode: 502, message: `XYQ error: ${resp.errmsg}` })
  }

  return resp.data
}

export async function xyqPollResult(threadId: string, runId: string, maxWaitMs = 120000) {
  const startTime = Date.now()
  let afterSeq = 0

  while (Date.now() - startTime < maxWaitMs) {
    const data = await xyqGetThread(threadId, runId, afterSeq)
    const thread = data.thread || {}
    const runList = thread.run_list || []

    if (runList.length) {
      const run = runList[0]
      const state = run.state

      if (state === 3) {
        // Success - extract result URLs
        const entries = run.entry_list || []
        const urls: string[] = []
        for (const entry of entries) {
          const artifact = entry.artifact
          if (artifact?.content) {
            for (const c of artifact.content) {
              // c.data may be a JSON string or an object
              let data = c.data
              if (typeof data === 'string') {
                try { data = JSON.parse(data) } catch { /* not JSON */ }
              }
              if (!data) continue
              // Direct URL
              if (data.url) urls.push(data.url)
              if (data.image_url) urls.push(data.image_url)
              // Nested image object (XYQ format)
              if (data.image?.url) urls.push(data.image.url)
              // Slots array
              if (data.slots) {
                for (const slot of data.slots) {
                  if (slot?.url) urls.push(slot.url)
                  if (slot?.image?.url) urls.push(slot.image.url)
                }
              }
            }
          }
        }
        return { success: true, urls }
      }

      if (state === 4 || state === 5) {
        return { success: false, error: run.fail_reason || 'Task failed' }
      }
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000))
    afterSeq = runList.length
  }

  return { success: false, error: 'Timeout' }
}
