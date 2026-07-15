<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; eyebrow?: string; compact?: boolean }>(), { description: '', eyebrow: '', compact: false })
</script>

<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" :class="compact ? 'mb-5' : 'mb-7 lg:mb-9'">
    <div class="min-w-0">
      <p v-if="eyebrow" class="mb-1.5 text-sm font-medium text-[var(--color-accent)]">{{ eyebrow }}</p>
      <h1 class="heading-serif text-2xl text-[var(--color-text)] sm:text-3xl lg:text-[2rem]">{{ title }}</h1>
      <p v-if="description" class="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
