<script setup lang="ts">
import { NAV_ICON_PATHS } from '~/utils/nav-icons'

const { navItems: allItems } = useNavItems()
const mobilePaths = ['/', '/planner', '/recipes', '/ingredients', '/posters']
const navItems = computed(() => mobilePaths.map(path => allItems.value.find(item => item.path === path)).filter(Boolean) as Array<{ path: string; icon: string; label: string }>)
const mobileLabel = (item: { path: string; label: string }) => item.path === '/posters' ? '打卡' : item.label
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] shadow-[var(--shadow-nav)] backdrop-blur-xl lg:hidden" aria-label="底部导航">
    <div class="grid h-[4.25rem] grid-cols-5 px-1 safe-bottom">
      <NuxtLink v-for="item in navItems" :key="item.path" :to="item.path" :prefetch="true" class="group flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[var(--color-text-muted)] transition-colors" active-class="!text-[var(--color-accent)]" :aria-label="mobileLabel(item)">
        <span class="flex h-7 w-10 items-center justify-center rounded-full transition-colors group-[.router-link-active]:bg-[var(--color-accent-soft)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true"><path :d="NAV_ICON_PATHS[item.icon] || NAV_ICON_PATHS.home" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span class="truncate text-[11px] font-medium">{{ mobileLabel(item) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
