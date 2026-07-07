interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
  modelLight: string
}

// 简易 LRU 缓存：相同输入 10 分钟内直接返回
const CACHE_TTL = 10 * 60 * 1000
const CACHE_MAX = 200
const aiCache = new Map<string, { result: string; ts: number }>()

function cacheKey(messages: any[], options: any): string {
  const raw = JSON.stringify({ m: messages, s: options.system, t: options.temperature, l: options.light })
  // 截取前 200 字符 + 总长度作为 key
  return `${raw.slice(0, 200)}|${raw.length}`
}

function cacheGet(key: string): string | null {
  const entry = aiCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { aiCache.delete(key); return null }
  // LRU: 刷新位置
  aiCache.delete(key)
  aiCache.set(key, entry)
  return entry.result
}

function cacheSet(key: string, result: string) {
  if (aiCache.size >= CACHE_MAX) {
    const oldest = aiCache.keys().next().value
    if (oldest) aiCache.delete(oldest)
  }
  aiCache.set(key, { result, ts: Date.now() })
}

export async function aiChat(
  messages: Array<{ role: string; content: string }>,
  options: { light?: boolean; system?: string; temperature?: number; maxTokens?: number; timeoutMs?: number; cache?: boolean } = {}
): Promise<string> {
  // 缓存查询（默认启用）
  if (options.cache !== false) {
    const key = cacheKey(messages, options)
    const cached = cacheGet(key)
    if (cached) return cached
  }

  const effective = getEffectiveAIConfig()

  // Build list of available endpoints
  const endpoints: AIConfig[] = []

  if (effective.baseUrl1 && effective.apiKey1) {
    endpoints.push({
      baseUrl: effective.baseUrl1,
      apiKey: effective.apiKey1,
      model: effective.model1,
      modelLight: effective.modelLight1,
    })
  }
  if (effective.baseUrl2 && effective.apiKey2) {
    endpoints.push({
      baseUrl: effective.baseUrl2,
      apiKey: effective.apiKey2,
      model: effective.model2,
      modelLight: effective.modelLight2,
    })
  }
  if (effective.baseUrl3 && effective.apiKey3) {
    endpoints.push({
      baseUrl: effective.baseUrl3,
      apiKey: effective.apiKey3,
      model: effective.model3 || '',
      modelLight: effective.modelLight3 || '',
    })
  }

  if (!endpoints.length) {
    throw createError({ statusCode: 500, message: 'No AI API configured' })
  }

  // Try each endpoint in order
  let lastError: Error | null = null
  for (const ep of endpoints) {
    try {
      const model = options.light ? ep.modelLight : ep.model
      if (!model) continue

      const fullMessages = []
      if (options.system) {
        fullMessages.push({ role: 'system', content: options.system })
      }
      fullMessages.push(...messages)

      const baseUrl = ep.baseUrl.replace(/\/+$/, '')
      const response = await $fetch<any>(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
        headers: {
          'Authorization': `Bearer ${ep.apiKey}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          model,
          messages: fullMessages,
          temperature: options.temperature ?? 0.7,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        },
      })

      const content = response.choices?.[0]?.message?.content || ''
      if (options.cache !== false) cacheSet(cacheKey(messages, options), content)
      return content
    } catch (err: any) {
      lastError = err
      console.warn(`AI endpoint ${ep.baseUrl} failed:`, err.message)
      continue
    }
  }

  throw createError({
    statusCode: 502,
    message: `All AI endpoints failed. Last error: ${lastError?.message}`,
  })
}
