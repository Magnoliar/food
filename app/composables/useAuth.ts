export function useAuth() {
  const user = useState<{ id: string; name: string; role: 'admin' | 'member' } | null>('auth-user', () => null)
  const authChecked = useState('auth-checked', () => false)
  const authChecking = useState('auth-checking', () => false)

  const login = async (username: string, password: string, remember = true) => {
    const result = await $fetch<{ id: string; name: string; role: 'admin' | 'member' }>('/api/auth/login', {
      method: 'POST',
      body: { username, password, remember },
    })
    user.value = result
    authChecked.value = true
    return result
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    authChecked.value = true
  }

  const checkAuth = async () => {
    if (authChecking.value) return user.value
    authChecking.value = true
    try {
      const result = await $fetch<{ id: string; name: string; role: 'admin' | 'member' } | null>('/api/auth/me', {
        headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
      })
      user.value = result
    } catch {
      user.value = null
    } finally {
      authChecked.value = true
      authChecking.value = false
    }
    return user.value
  }

  return {
    user: readonly(user),
    authChecked: readonly(authChecked),
    authChecking: readonly(authChecking),
    login,
    logout,
    checkAuth,
    isLoggedIn: computed(() => !!user.value),
    isAdmin: computed(() => user.value?.role === 'admin'),
  }
}
