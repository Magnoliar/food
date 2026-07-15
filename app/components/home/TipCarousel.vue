<script setup lang="ts">
interface Tip {
  id: string
  title: string
  content: string
  category: string
  relatedIngredients?: string[]
}

const props = defineProps<{ tips: Tip[] }>()
const currentIndex = ref(0)
const isPaused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const currentTip = computed(() => props.tips[currentIndex.value] || null)
const categoryIcons: Record<string, string> = { '秘方': '🔮', '食材特性': '🌿', '工具技巧': '🔧' }
const categoryColors: Record<string, string> = {
  '秘方': 'text-[var(--color-accent)]',
  '食材特性': 'text-[var(--color-success)]',
  '工具技巧': 'text-[var(--color-warning)]',
}

const stopAutoPlay = () => {
  if (timer) clearInterval(timer)
  timer = null
}

const prefersReducedMotion = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const startAutoPlay = () => {
  stopAutoPlay()
  if (props.tips.length <= 1 || prefersReducedMotion()) return
  timer = setInterval(() => {
    if (!isPaused.value && props.tips.length > 1) currentIndex.value = (currentIndex.value + 1) % props.tips.length
  }, 5000)
}

const next = () => {
  if (props.tips.length <= 1) return
  currentIndex.value = (currentIndex.value + 1) % props.tips.length
  startAutoPlay()
}

const prev = () => {
  if (props.tips.length <= 1) return
  currentIndex.value = (currentIndex.value - 1 + props.tips.length) % props.tips.length
  startAutoPlay()
}

watch(() => props.tips.length, (length) => {
  if (!length) currentIndex.value = 0
  else if (currentIndex.value >= length) currentIndex.value = length - 1
  startAutoPlay()
})
onMounted(startAutoPlay)
onUnmounted(stopAutoPlay)
</script>

<template>
  <section
    class="relative z-10"
    aria-labelledby="tip-carousel-title"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
    @focusin="isPaused = true"
    @focusout="isPaused = false"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 id="tip-carousel-title" class="font-hand text-xl text-[var(--color-text-muted)]">厨艺小贴士</h3>
      <div v-if="tips.length > 1" class="flex items-center gap-1">
        <button class="touch-target flex items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" type="button" aria-label="上一条厨艺小贴士" @click="prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button class="touch-target flex items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" type="button" aria-label="下一条厨艺小贴士" @click="next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>

    <GlassCard v-if="currentTip" class="p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)]" aria-live="polite">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 text-xl" aria-hidden="true">{{ categoryIcons[currentTip.category] || '📝' }}</span>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h4 class="font-serif text-base font-medium text-[var(--color-text)]">{{ currentTip.title }}</h4>
            <span class="font-hand text-xs" :class="categoryColors[currentTip.category] || 'text-[var(--color-text-muted)]'">{{ currentTip.category }}</span>
          </div>
          <p class="line-clamp-2 font-serif text-base leading-relaxed text-[var(--color-text-muted)]">{{ currentTip.content }}</p>
          <div v-if="currentTip.relatedIngredients?.length" class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="ingredient in currentTip.relatedIngredients" :key="ingredient" class="rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] px-2 py-1 font-hand text-sm text-[var(--color-text-muted)]">{{ ingredient }}</span>
          </div>
        </div>
      </div>
      <div v-if="tips.length > 1" class="mt-3 flex justify-center">
        <span class="font-mono text-xs tabular-nums text-[var(--color-text-faint)]">{{ currentIndex + 1 }} / {{ tips.length }}</span>
      </div>
    </GlassCard>
  </section>
</template>
