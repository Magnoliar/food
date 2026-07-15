<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; icon?: string }>(), { description: '', icon: '碗' })
</script>

<template>
  <div class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-soft)] px-5 py-10 text-center">
    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] font-serif text-lg text-[var(--color-accent)]" aria-hidden="true">{{ icon }}</div>
    <h2 class="font-serif text-lg font-semibold text-[var(--color-text)]">{{ title }}</h2>
    <p v-if="description" class="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
