<script setup lang="ts">
const props = defineProps<{
  name: string
  amount?: string
  unit?: string
  lineArtUrl?: string | null
  crayonColor?: string
  size?: 'sm' | 'md'
}>()

// lineArtUrl may be a single URL or JSON array
const displayUrl = computed(() => {
  const raw = props.lineArtUrl
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] || null
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p[0] : raw } catch { return raw }
})

const imageFailed = ref(false)
const sizeClass = computed(() => props.size === 'sm' ? 'w-14 h-14' : 'w-20 h-20')
watch(displayUrl, () => { imageFailed.value = false })
</script>

<template>
  <div class="flex flex-col items-center gap-1 flex-shrink-0">
    <div :class="[sizeClass, 'rounded-full overflow-hidden border-2 border-[var(--color-border)] bg-[var(--color-bg-soft)] flex items-center justify-center']">
      <img v-if="displayUrl && !imageFailed" :src="displayUrl" :alt="`${name}食材图`" width="160" height="160" class="h-full w-full object-cover" loading="lazy" @error="imageFailed = true" />
      <HandDrawnPlaceholder v-else :tags="[name]" :alt="`${name}的手绘占位图`" class="h-full w-full" />
    </div>
    <span class="text-xs font-medium text-[var(--color-text)] text-center leading-tight max-w-[72px] truncate">{{ name }}</span>
    <span v-if="amount" class="font-mono text-[10px] text-[var(--color-text-muted)]">{{ amount }}{{ unit }}</span>
  </div>
</template>
