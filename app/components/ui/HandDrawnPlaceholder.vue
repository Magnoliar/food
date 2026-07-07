<script setup lang="ts">
import { tagToLineArt } from '~/constants/recipe'

const props = defineProps<{
  tags?: string[]
  size?: 'sm' | 'md' | 'lg'
  aspectRatio?: string
}>()

const lineArts = ['tomato', 'pepper', 'eggplant', 'pumpkin', 'garlic', 'chili', 'onion', 'fish', 'meat']

const selectedSvg = computed(() => {
  if (props.tags?.length) {
    for (const tag of props.tags) {
      if (tagToLineArt[tag]) return tagToLineArt[tag]
    }
  }
  // Deterministic fallback based on first tag or default
  const seed = props.tags?.[0]?.charCodeAt(0) || 0
  return lineArts[seed % lineArts.length] || 'tomato'
})

const crayonColors = ['#E8927C', '#7FB5B5', '#D4A76A', '#A8C686', '#C7A0D2', '#7BA7C2']
const bgColor = computed(() => {
  const svgName = selectedSvg.value || 'tomato'
  const idx = (svgName.charCodeAt(0) + (svgName.charCodeAt(1) || 0)) % crayonColors.length
  return crayonColors[idx]
})

const sizeClasses: Record<string, string> = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
}
</script>

<template>
  <div
    class="flex items-center justify-center rounded-lg overflow-hidden"
    :class="aspectRatio ? '' : (sizeClasses[size || 'md'] || sizeClasses.md)"
    :style="{
      backgroundColor: bgColor + '15',
      aspectRatio: aspectRatio || undefined,
    }"
  >
    <img
      :src="`/line-arts/${selectedSvg}.svg`"
      :alt="selectedSvg"
      class="w-3/5 h-3/5 opacity-40"
      :style="{ color: bgColor }"
      loading="lazy"
      decoding="async"
    />
  </div>
</template>
