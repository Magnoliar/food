export default defineEventHandler(async (event) => {
  if (getMethod(event) === 'GET') {
    const settings = loadSettings()
    // Mask API keys for display
    const masked = JSON.parse(JSON.stringify(settings))
    for (const key of ['apiKey1', 'apiKey2', 'apiKey3'] as const) {
      if (masked.ai[key]) {
        masked.ai[key] = masked.ai[key].slice(0, 8) + '***'
      }
    }
    if (masked.xyq.accessKey) {
      masked.xyq.accessKey = masked.xyq.accessKey.slice(0, 8) + '***'
    }
    return masked
  }

  // POST - save settings
  const body = await readBody(event)
  const current = loadSettings()

  // Merge: only update fields that are provided and not masked
  if (body.ai) {
    for (const key of ['baseUrl1', 'apiKey1', 'model1', 'modelLight1',
                       'baseUrl2', 'apiKey2', 'model2', 'modelLight2',
                       'baseUrl3', 'apiKey3', 'model3', 'modelLight3'] as const) {
      if (body.ai[key] !== undefined && !body.ai[key].includes('***')) {
        current.ai[key] = body.ai[key]
      }
    }
  }
  if (body.xyq) {
    if (body.xyq.accessKey !== undefined && !body.xyq.accessKey.includes('***')) {
      current.xyq.accessKey = body.xyq.accessKey
    }
    if (body.xyq.baseUrl !== undefined) {
      current.xyq.baseUrl = body.xyq.baseUrl
    }
  }

  saveSettings(current)
  return { ok: true }
})
