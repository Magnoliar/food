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

const sizeClass = computed(() => props.size === 'sm' ? 'w-14 h-14' : 'w-20 h-20')
</script>

<template>
  <div class="flex flex-col items-center gap-1 flex-shrink-0">
    <div :class="[sizeClass, 'rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center']">
      <img v-if="displayUrl" :src="displayUrl" class="w-full h-full object-cover" />
      <HandDrawnPlaceholder v-else :tags="[name]" class="w-full h-full" />
    </div>
    <span class="text-xs font-medium text-[#1a1714] text-center leading-tight max-w-[72px] truncate">{{ name }}</span>
    <span v-if="amount" class="font-mono text-[10px] text-[#8B7D6B]">{{ amount }}{{ unit }}</span>
  </div>
</template>
