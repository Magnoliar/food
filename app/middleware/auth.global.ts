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

  // 管理页面仅限 admin
  if (to.path.startsWith('/admin') && user.value.role !== 'admin') {
    return navigateTo('/')
  }
})
