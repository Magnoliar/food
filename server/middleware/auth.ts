const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/health',
  '/api/ai/health',
])

const LOGIN_REQUIRED_PREFIXES = [
  '/api/ingredients',
  '/api/recipes',
  '/api/tags',
  '/api/tips',
  '/api/collections',
  '/api/week-plans',
  '/api/cook-logs',
  '/api/fridge',
  '/api/shopping-lists',
  '/api/recommendations',
  '/api/achievements',
  '/api/media',
  '/api/ai',
  '/api/xyq',
]

export default defineEventHandler((event) => {
  assertProductionAuthConfig()

  const path = getRequestURL(event).pathname
  const method = getMethod(event)

  if (!path.startsWith('/api/')) return
  if (PUBLIC_PATHS.has(path)) return

  const user = verifyAuthToken(getCookie(event, 'auth_token'))
  if (user) event.context.authUser = user

  if (path.startsWith('/api/admin')) {
    requireAdmin(event)
    return
  }

  if (path === '/api/xyq/generate-and-save' || path === '/api/tips/generate') {
    requireAdmin(event)
    return
  }

  // 标签写操作仅限 admin
  if (path.startsWith('/api/tags') && method !== 'GET') {
    requireAdmin(event)
    return
  }

  if (LOGIN_REQUIRED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    requireAuth(event)
    return
  }

  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return
  }

  requireAuth(event)
})
