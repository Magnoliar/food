import { createHmac, timingSafeEqual } from 'node:crypto'

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'member'
}

const DEFAULT_SECRET = 'dev-auth-secret-change-me'
const ADMIN_ID = 'user-momo'
const MEMBER_ID = 'user-partner'
const ADMIN_NAME = '猪猪'
const MEMBER_NAME = '猪宝'

function getSecret() {
  const config = useRuntimeConfig()
  return String(process.env.AUTH_SECRET || config.authSecret || DEFAULT_SECRET)
}

function sign(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function normalizeAuthUser(user: AuthUser): AuthUser {
  if (user.id === ADMIN_ID || user.name === 'momo') {
    return { id: ADMIN_ID, name: ADMIN_NAME, role: 'admin' }
  }
  if (user.id === MEMBER_ID || user.name === 'partner' || user.name === '恋人') {
    return { id: MEMBER_ID, name: MEMBER_NAME, role: 'member' }
  }
  return user
}

export function createAuthToken(user: AuthUser) {
  const normalized = normalizeAuthUser(user)
  const payload = Buffer.from(JSON.stringify({
    id: normalized.id,
    name: normalized.name,
    role: normalized.role,
    iat: Date.now(),
  }), 'utf8').toString('base64url')

  return `${payload}.${sign(payload)}`
}

export function verifyAuthToken(token?: string | null): AuthUser | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed.id || !parsed.name || !['admin', 'member'].includes(parsed.role)) return null
    // 30 天过期
    if (parsed.iat && Date.now() - parsed.iat > 30 * 24 * 60 * 60 * 1000) return null
    return normalizeAuthUser({ id: parsed.id, name: parsed.name, role: parsed.role })
  } catch {
    return null
  }
}

export function getConfiguredUsers(): Record<string, AuthUser & { password: string }> {
  const config = useRuntimeConfig()
  const adminUser = String(process.env.ADMIN_USER || config.adminUser || 'zhuzhu')
  const adminPassword = String(process.env.ADMIN_PASSWORD || config.adminPassword || 'zhuzhu')
  const memberUser = String(process.env.PARTNER_USER || config.partnerUser || 'zhubao')
  const memberPassword = String(process.env.PARTNER_PASSWORD || config.partnerPassword || 'zhubao')

  const users: Record<string, AuthUser & { password: string }> = {
    [adminUser]: {
      password: adminPassword,
      name: ADMIN_NAME,
      id: ADMIN_ID,
      role: 'admin',
    },
    [memberUser]: {
      password: memberPassword,
      name: MEMBER_NAME,
      id: MEMBER_ID,
      role: 'member',
    },
  }

  if (process.env.NODE_ENV !== 'production') {
    users.momo = { password: 'momo', name: ADMIN_NAME, id: ADMIN_ID, role: 'admin' }
    users.partner = { password: 'partner', name: MEMBER_NAME, id: MEMBER_ID, role: 'member' }
  }

  return users
}

export function assertProductionAuthConfig() {
  if (process.env.NODE_ENV !== 'production') return

  const config = useRuntimeConfig()
  const secret = String(process.env.AUTH_SECRET || config.authSecret || '')
  if (!secret || secret === DEFAULT_SECRET || secret.length < 32) {
    throw createError({ statusCode: 500, message: '生产环境必须配置至少 32 位 AUTH_SECRET' })
  }

  const weakPasswords = new Set(['momo', 'partner', 'zhuzhu', 'zhubao'])
  const adminPassword = String(process.env.ADMIN_PASSWORD || config.adminPassword || '')
  const partnerPassword = String(process.env.PARTNER_PASSWORD || config.partnerPassword || '')
  if (weakPasswords.has(adminPassword) || weakPasswords.has(partnerPassword)) {
    throw createError({ statusCode: 500, message: '生产环境不能使用默认登录密码' })
  }
}

export function requireAuth(event: any): AuthUser {
  const user = event.context.authUser as AuthUser | undefined
  if (!user) throw createError({ statusCode: 401, message: '请先登录' })
  return user
}

export function requireAdmin(event: any): AuthUser {
  const user = requireAuth(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: '需要管理员权限' })
  return user
}
