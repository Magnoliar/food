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
const ready = ref(false)

onMounted(() => {
  ready.value = true
})

const handleLogin = async () => {
  if (!username.value.trim() || !password.value) { error.value = '请填写用户名和密码。'; return }
  loading.value = true; error.value = ''
  try {
    await login(username.value.trim(), password.value, remember.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (loginError: unknown) {
    error.value = getApiErrorMessage(loginError, '没能登录，请检查用户名和密码。')
  } finally { loading.value = false }
}
</script>

<template>
  <main class="grid min-h-[100dvh] place-items-center px-4 py-8 sm:px-6">
    <div class="w-full max-w-md">
      <div class="mb-7 text-center">
        <div class="font-serif text-2xl font-semibold text-[var(--color-text)]">猪猪家的厨房</div>
        <p class="mt-2 text-sm text-[var(--color-text-muted)]">回来啦，看看今天吃什么。</p>
      </div>

      <section class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-7" aria-labelledby="login-title">
        <h1 id="login-title" class="heading-serif text-2xl">登录</h1>
        <p class="mt-1.5 text-sm leading-6 text-[var(--color-text-muted)]">这是家里的私人厨房本，登录后继续记录。</p>
        <AppNotice v-if="error" class="mt-5" tone="danger" role="alert" :message="error" />

        <form class="mt-6 space-y-5" novalidate @submit.prevent="handleLogin">
          <div>
            <label class="field-label" for="login-username">用户名</label>
            <input id="login-username" v-model="username" data-testid="login-username" class="field-control" autocomplete="username" autocapitalize="none" spellcheck="false" autofocus :aria-invalid="!!error" :disabled="!ready || loading" />
          </div>
          <div>
            <label class="field-label" for="login-password">密码</label>
            <input id="login-password" v-model="password" data-testid="login-password" type="password" class="field-control" autocomplete="current-password" :aria-invalid="!!error" :disabled="!ready || loading" />
          </div>
          <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm text-[var(--color-text-muted)]" for="login-remember">
            <input id="login-remember" v-model="remember" type="checkbox" class="h-5 w-5 accent-[var(--color-accent)]" />
            在这台设备保持登录
          </label>
          <AppButton type="submit" block size="lg" :disabled="!ready || loading" :loading="loading" data-testid="login-submit">{{ loading ? '正在登录' : '进厨房' }}</AppButton>
        </form>
      </section>
      <p class="mt-5 text-center text-xs leading-5 text-[var(--color-text-faint)]">只在你们自己的设备上使用“保持登录”。</p>
    </div>
  </main>
</template>
