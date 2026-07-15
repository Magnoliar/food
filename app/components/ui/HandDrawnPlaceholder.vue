<script setup lang="ts">
import { tagToLineArt } from '~/constants/recipe'

const props = withDefaults(defineProps<{
  tags?: string[]
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  aspectRatio?: string
}>(), { tags: () => [], alt: '', size: 'md', aspectRatio: '' })

const lineArts = ['tomato', 'pepper', 'eggplant', 'pumpkin', 'garlic', 'chili', 'onion', 'fish', 'meat']
const toneClasses = [
  'bg-[var(--color-accent-soft)]',
  'bg-[var(--color-success-soft)]',
  'bg-[var(--color-warning-soft)]',
  'bg-[var(--color-surface-muted)]',
]

const selectedSvg = computed(() => {
  for (const tag of props.tags) {
    if (tagToLineArt[tag]) return tagToLineArt[tag]
  }
  const seed = props.tags[0]?.charCodeAt(0) || 0
  return lineArts[seed % lineArts.length] || 'tomato'
})

const toneClass = computed(() => {
  const svgName = selectedSvg.value || 'tomato'
  const index = (svgName.charCodeAt(0) + (svgName.charCodeAt(1) || 0)) % toneClasses.length
  return toneClasses[index]
})

const imageAlt = computed(() => props.alt || (props.tags[0] ? `${props.tags[0]}的手绘占位图` : '菜谱手绘占位图'))
const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
}
</script>

<template>
  <div
    class="flex items-center justify-center overflow-hidden rounded-[var(--radius-md)]"
    :class="[toneClass, aspectRatio ? '' : sizeClasses[size]]"
    :style="aspectRatio ? { aspectRatio } : undefined"
  >
    <img
      :src="`/line-arts/${selectedSvg}.svg`"
      :alt="imageAlt"
      width="160"
      height="160"
      class="h-3/5 w-3/5 opacity-40"
      loading="lazy"
      decoding="async"
    />
  </div>
</template>
