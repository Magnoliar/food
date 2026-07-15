<script setup lang="ts">
const { collapsed } = useSidebar()
const { user, authChecked } = useAuth()
const route = useRoute()

const showShell = computed(() => route.path !== '/login' && authChecked.value && !!user.value)
</script>

<template>
  <div class="min-h-[100dvh] relative">
    <a class="skip-link" href="#main-content">跳到正文</a>
    <template v-if="showShell">
      <AppSidebar />
      <AppBottomNav />
    </template>

    <main
      id="main-content"
      class="min-h-[100dvh] pb-[calc(5.25rem+env(safe-area-inset-bottom))] transition-[margin] duration-200 lg:pb-0"
      :class="showShell ? (collapsed ? 'lg:ml-20' : 'lg:ml-64') : ''"
      tabindex="-1"
    >
      <div v-if="!authChecked" class="min-h-[100dvh] grid place-items-center px-5" role="status" aria-live="polite">
        <div class="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
          正在进厨房…
        </div>
      </div>
      <div v-else class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
        <slot />
      </div>
    </main>
    <ToastHost />
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed; left: 1rem; top: 1rem; z-index: 100; transform: translateY(-160%);
  border-radius: var(--radius-md); background: var(--color-text); color: white; padding: .7rem 1rem;
  transition: transform var(--motion-fast) ease;
}
.skip-link:focus { transform: translateY(0); }
</style>
