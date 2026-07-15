export default defineNuxtRouteMiddleware(async (to) => {
  const { user, authChecked, checkAuth } = useAuth()

  if (!authChecked.value) {
    await checkAuth()
  }

  if (to.path === '/login') {
    if (user.value) return navigateTo('/')
    return
  }

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // 管理页本身会显示明确的无权限状态；敏感 API 仍由服务端强制校验管理员角色。
})
