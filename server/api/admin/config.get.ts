export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  const maskUrl = (url: string) => {
    if (!url) return ''
    try { return new URL(url).hostname } catch { return 'configured' }
  }

  return {
    ai: [
      { label: 'Endpoint 1', host: maskUrl(config.aiBaseUrl1), model: config.aiModel1 || '', configured: !!(config.aiBaseUrl1 && config.aiApiKey1) },
      { label: 'Endpoint 2', host: maskUrl(config.aiBaseUrl2), model: config.aiModel2 || '', configured: !!(config.aiBaseUrl2 && config.aiApiKey2) },
      { label: 'Endpoint 3', host: maskUrl(config.aiBaseUrl3), model: config.aiModel3 || '', configured: !!(config.aiBaseUrl3 && config.aiApiKey3) },
    ],
    xyq: {
      host: maskUrl(config.xyqBaseUrl),
      configured: !!config.xyqAccessKey,
    },
  }
})
