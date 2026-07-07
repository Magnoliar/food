export default defineEventHandler(async () => {
  const effective = getEffectiveAIConfig()
  const results = []

  const endpoints = [
    { label: 'Endpoint 1', url: effective.baseUrl1, key: effective.apiKey1, model: effective.model1 },
    { label: 'Endpoint 2', url: effective.baseUrl2, key: effective.apiKey2, model: effective.model2 },
    { label: 'Endpoint 3', url: effective.baseUrl3, key: effective.apiKey3, model: effective.model3 },
  ]

  for (const ep of endpoints) {
    if (!ep.url || !ep.key || !ep.model) {
      results.push({ label: ep.label, status: 'not_configured', latency: null })
      continue
    }

    try {
      const start = Date.now()
      const baseUrl = ep.url.replace(/\/+$/, '')
      await $fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${ep.key}` },
        signal: AbortSignal.timeout(5000),
      })
      results.push({ label: ep.label, status: 'ok', latency: Date.now() - start })
    } catch (err: any) {
      results.push({ label: ep.label, status: 'error', latency: null, error: err.message?.slice(0, 100) })
    }
  }

  return results
})
