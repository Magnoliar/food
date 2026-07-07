<script setup lang="ts">
import { NAV_ICON_PATHS } from '~/utils/nav-icons'

const { navItems: allItems } = useNavItems()
const mobilePaths = ['/', '/planner', '/recipes', '/ingredients', '/posters']
const navItems = computed(() => mobilePaths
  .map(path => allItems.value.find(item => item.path === path))
  .filter(Boolean) as Array<{ path: string; icon: string; label: string }>)

const mobileLabel = (item: { path: string; label: string }) => item.path === '/posters' ? '打卡' : item.label
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md border-t border-gray-200" aria-label="底部导航">
    <div class="flex items-center justify-around h-16 px-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :prefetch="true"
        class="flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-colors text-[#7A6B5A]"
        active-class="!text-[#1a1714]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="w-5 h-5" aria-hidden="true">
          <path :d="NAV_ICON_PATHS[item.icon] || NAV_ICON_PATHS.home" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="text-xs font-serif">{{ mobileLabel(item) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
