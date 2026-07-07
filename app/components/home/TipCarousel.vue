<script setup lang="ts">
interface Tip {
  id: string
  title: string
  content: string
  category: string
  relatedIngredients?: string[]
}

const props = defineProps<{
  tips: Tip[]
}>()

const currentIndex = ref(0)
const isPaused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const currentTip = computed(() => {
  if (!props.tips?.length) return null
  return props.tips[currentIndex.value]
})

const next = () => {
  if (!props.tips?.length) return
  currentIndex.value = (currentIndex.value + 1) % props.tips.length
  startAutoPlay() // reset timer on manual action
}

const prev = () => {
  if (!props.tips?.length) return
  currentIndex.value = (currentIndex.value - 1 + props.tips.length) % props.tips.length
  startAutoPlay() // reset timer on manual action
}

const startAutoPlay = () => {
  stopAutoPlay()
  timer = setInterval(() => {
    if (!isPaused.value) next()
  }, 5000)
}

const stopAutoPlay = () => {
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(() => startAutoPlay())
onUnmounted(() => stopAutoPlay())

const categoryIcons: Record<string, string> = {
  '秘方': '🔮',
  '食材特性': '🌿',
  '工具技巧': '🔧',
}

const categoryColors: Record<string, string> = {
  '秘方': 'text-[#C7A0D2]',
  '食材特性': 'text-[#6D8B74]',
  '工具技巧': 'text-[#7BA7C2]',
}
</script>

<template>
  <div class="relative z-10" @mouseenter="isPaused = true" @mouseleave="isPaused = false">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-hand text-xl text-[#8B7D6B]">厨艺小贴士</h3>
      <div class="flex items-center gap-1">
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] hover:bg-gray-100 transition-all"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] hover:bg-gray-100 transition-all"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>

    <GlassCard v-if="currentTip" class="p-4 cursor-pointer hover:bg-white/70 transition-colors">
      <div class="flex items-start gap-3">
        <span class="text-xl mt-0.5">{{ categoryIcons[currentTip.category] || '📝' }}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h4 class="font-serif text-base font-medium text-[#1a1714]">{{ currentTip.title }}</h4>
            <span class="font-hand text-xs" :class="categoryColors[currentTip.category]">{{ currentTip.category }}</span>
          </div>
          <p class="font-serif text-base text-[#4A3D2E] leading-relaxed line-clamp-2">{{ currentTip.content }}</p>
          <div v-if="currentTip.relatedIngredients?.length" class="flex gap-1.5 mt-2">
            <span v-for="ing in currentTip.relatedIngredients" :key="ing" class="font-hand text-sm text-[#6B5D4D] bg-gray-100 px-2 py-0.5 rounded">{{ ing }}</span>
          </div>
        </div>
      </div>

      <!-- Numeric indicator instead of 200+ dots -->
      <div class="flex justify-center mt-3">
        <span class="font-mono text-xs text-[#A69080]">{{ currentIndex + 1 }} / {{ tips.length }}</span>
      </div>
    </GlassCard>
  </div>
</template>
