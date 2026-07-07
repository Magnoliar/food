<script setup lang="ts">
import { NAV_ICON_PATHS } from '~/utils/nav-icons'

const { collapsed, toggle } = useSidebar()
const { user, logout } = useAuth()
const { navItems } = useNavItems()
const { isDark, toggle: toggleDark } = useDarkMode()
const router = useRouter()

const handleLogout = async () => {
  await logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="bg-glass-sidebar fixed left-0 top-0 bottom-0 z-40 flex-col hidden lg:flex transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-64'"
    role="navigation"
    aria-label="主导航"
  >
    <div class="px-4 pt-6 pb-4 flex items-center justify-between">
      <div v-if="!collapsed" class="min-w-0">
        <h1 class="font-serif text-xl text-[#1a1714] font-bold tracking-tight truncate">猪猪家的厨房</h1>
        <p class="font-mono text-[#A69080] text-[10px] mt-0.5 uppercase tracking-widest">Zhuzhu's Home Kitchen</p>
      </div>
      <button
        class="w-8 h-8 rounded-md flex items-center justify-center text-[#8B7D6B] hover:bg-gray-100 transition-colors flex-shrink-0"
        :class="collapsed ? 'mx-auto' : ''"
        :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="toggle"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="w-4 h-4 transition-transform" :class="collapsed ? 'rotate-180' : ''" aria-hidden="true">
          <path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 px-2 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :prefetch="true"
        class="flex items-center gap-3 rounded-lg text-[#8B7D6B] hover:bg-[#3D3530] hover:text-white transition-all duration-150"
        :class="collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-2.5'"
        active-class="!bg-[#3D3530] !text-white !shadow-sm font-medium"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="w-5 h-5 flex-shrink-0" aria-hidden="true">
          <path :d="NAV_ICON_PATHS[item.icon] || NAV_ICON_PATHS.home" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!collapsed" class="text-sm truncate">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="px-3 py-4">
      <div class="flex items-center gap-3" :class="collapsed ? 'justify-center' : ''">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center font-hand text-lg flex-shrink-0"
          :class="user?.id === 'user-momo' ? 'bg-[#D05050]/15 text-[#D05050]' : 'bg-[#6D8B74]/15 text-[#6D8B74]'"
        >
          {{ user?.name?.[0] || '?' }}
        </div>
        <span v-if="!collapsed" class="text-sm text-[#8B7D6B] truncate flex-1">{{ user?.name || '未登录' }}</span>
        <button v-if="!collapsed" class="w-6 h-6 rounded flex items-center justify-center text-[#A69080] hover:text-[#D05050] hover:bg-red-50 transition-colors flex-shrink-0" title="登出" @click="handleLogout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="w-4 h-4" aria-hidden="true">
            <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button v-if="!collapsed" class="w-6 h-6 rounded flex items-center justify-center text-[#A69080] hover:text-[#8B7D6B] transition-colors flex-shrink-0" :title="isDark ? '浅色模式' : '深色模式'" @click="toggleDark">
          <span class="text-xs">{{ isDark ? 'L' : 'D' }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
