import { assertProductionAuthConfig, createAuthToken, getConfiguredUsers } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertProductionAuthConfig()

  const body = await readBody(event)
  const { username, password, remember = true } = body || {}

  const users = getConfiguredUsers()
  const user = users[String(username || '')]
  if (!user || user.password !== password) {
    throw createError({ statusCode: 401, message: '用户名或密码错误' })
  }

  await prisma.user.upsert({
    where: { id: user.id },
    update: { name: user.name, role: user.role },
    create: { id: user.id, name: user.name, role: user.role },
  })

  const cookieOptions: Parameters<typeof setCookie>[3] = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
  if (remember !== false) cookieOptions.maxAge = 60 * 60 * 24 * 30

  setCookie(event, 'auth_token', createAuthToken(user), cookieOptions)

  return { id: user.id, name: user.name, role: user.role }
})
