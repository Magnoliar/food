<script setup lang="ts">
const { collapsed } = useSidebar()
const { user, authChecked } = useAuth()
const route = useRoute()

const primaryRoutes = ['/', '/planner', '/recipes', '/ingredients', '/posters', '/cook-logs', '/graph', '/journey', '/achievements']
const showShell = computed(() => route.path !== '/login' && authChecked.value && !!user.value)

onMounted(() => {
  const runPreload = () => {
    for (const path of primaryRoutes) {
      preloadRouteComponents(path).catch(() => {})
    }
  }
  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  }
  if (browserWindow.requestIdleCallback) {
    browserWindow.requestIdleCallback(runPreload, { timeout: 1500 })
  } else {
    globalThis.setTimeout(runPreload, 300)
  }
})
</script>

<template>
  <div class="min-h-screen relative">
    <template v-if="showShell">
      <AppSidebar />
      <AppBottomNav />
    </template>

    <main
      class="pb-20 lg:pb-0 min-h-screen"
      style="transition: margin-left 0.2s ease;"
      :class="showShell ? (collapsed ? 'lg:ml-16' : 'lg:ml-64') : ''"
      role="main"
    >
      <div v-if="!authChecked" class="min-h-screen grid place-items-center px-5">
        <div class="text-sm text-[#8B7D6B]">正在进厨房...</div>
      </div>
      <div v-else class="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-6 lg:py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
