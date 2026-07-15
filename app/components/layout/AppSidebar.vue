<script setup lang="ts">
import { NAV_ICON_PATHS } from '~/utils/nav-icons'

const { collapsed, toggle } = useSidebar()
const { user, logout } = useAuth()
const { navItems } = useNavItems()
const router = useRouter()

const handleLogout = async () => {
  await logout()
  await router.push('/login')
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-[width] duration-200 lg:flex"
    :class="collapsed ? 'w-20' : 'w-64'"
  >
    <div class="flex min-h-24 items-center justify-between gap-2 px-4 py-5">
      <NuxtLink v-if="!collapsed" to="/" class="min-w-0 rounded-md" aria-label="猪猪家的厨房首页">
        <div class="truncate font-serif text-xl font-semibold tracking-tight text-[var(--color-text)]">猪猪家的厨房</div>
        <p class="mt-1 truncate text-xs text-[var(--color-text-faint)]">一起好好吃饭</p>
      </NuxtLink>
      <button class="touch-target mx-auto flex shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" :title="collapsed ? '展开侧栏' : '收起侧栏'" @click="toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5 transition-transform" :class="collapsed ? 'rotate-180' : ''" aria-hidden="true"><path d="M15.75 19.5 8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="主导航">
      <NuxtLink v-for="item in navItems" :key="item.path" :to="item.path" :prefetch="item.path !== '/graph'" class="group flex min-h-12 items-center gap-3 rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" :class="collapsed ? 'justify-center px-0' : 'px-3.5'" active-class="!bg-[var(--color-text)] !text-white font-medium shadow-sm" :title="collapsed ? item.label : undefined">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5 shrink-0" aria-hidden="true"><path :d="NAV_ICON_PATHS[item.icon] || NAV_ICON_PATHS.home" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span v-if="!collapsed" class="truncate text-sm">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="border-t border-[var(--color-border)] px-3 py-3 safe-bottom">
      <div class="flex items-center gap-3" :class="collapsed ? 'justify-center' : ''">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-serif font-semibold text-[var(--color-accent)]" aria-hidden="true">{{ user?.name?.[0] || '?' }}</div>
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">{{ user?.name || '未登录' }}</span>
        <button v-if="!collapsed" class="touch-target flex shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" aria-label="退出登录" title="退出登录" @click="handleLogout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5" aria-hidden="true"><path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>
  </aside>
</template>
