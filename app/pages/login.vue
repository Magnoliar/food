<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const remember = ref(true)
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await login(username.value, password.value, remember.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
    router.push(redirect)
  } catch (e: any) {
    error.value = e?.data?.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="font-serif text-3xl font-bold text-[#1a1714]">猪猪家的厨房</h1>
        <p class="text-sm text-[#A69080] mt-1">Zhuzhu's Home Kitchen</p>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 class="text-lg font-serif font-bold text-[#1a1714] mb-6">登录</h2>

        <div v-if="error" class="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {{ error }}
        </div>

        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">用户名</span>
            <input
              v-model="username"
              data-testid="login-username"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]"
              autocomplete="username"
              autofocus
              @keyup.enter="handleLogin"
            />
          </label>
          <label class="block">
            <span class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">密码</span>
            <input
              v-model="password"
              data-testid="login-password"
              type="password"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </label>
          <label class="flex items-center gap-2 text-sm text-[#6B5D4D]">
            <input v-model="remember" type="checkbox" class="w-4 h-4 accent-[#C06030]" />
            在这台设备保持登录
          </label>
        </div>

        <button
          class="w-full mt-6 px-4 py-2.5 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors disabled:opacity-50"
          :disabled="loading"
          data-testid="login-submit"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
