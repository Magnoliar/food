<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[min(24rem,calc(100vw-2.5rem))]" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="pointer-events-auto w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-lg)]">
          <div class="flex items-start gap-3"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="{ 'bg-[var(--color-success)]': toast.tone === 'success', 'bg-[var(--color-warning)]': toast.tone === 'warning', 'bg-[var(--color-danger)]': toast.tone === 'danger', 'bg-[var(--color-accent)]': toast.tone === 'info' }" aria-hidden="true" /><div class="min-w-0 flex-1"><p v-if="toast.title" class="font-semibold text-[var(--color-text)]">{{ toast.title }}</p><p class="text-sm leading-5 text-[var(--color-text-muted)]">{{ toast.message }}</p></div><button class="touch-target -m-2 flex shrink-0 items-center justify-center rounded-lg text-[var(--color-text-faint)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" aria-label="关闭通知" @click="dismiss(toast.id)">×</button></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>.toast-enter-active,.toast-leave-active{transition:all var(--motion-base) ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-.5rem)}</style>
