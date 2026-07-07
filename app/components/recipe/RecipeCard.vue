<script setup lang="ts">
import { colorClasses, statusLabels } from '~/constants/recipe'

const { updateRecipe } = useApi()

const props = defineProps<{
  recipe: {
    id: string
    name: string
    score: number
    cookCount: number
    tags: string[]
    coverColor: string
    estimatedTime: number
    difficulty: number
    status: string
  }
}>()

const emit = defineEmits<{
  update: [data: { score: number; status: string }]
}>()

const showQuickEdit = ref(false)
const quickScore = ref(props.recipe.score)
const quickStatus = ref(props.recipe.status)
const statusLabel = computed(() => statusLabels[props.recipe.status] || null)

watch(() => [props.recipe.score, props.recipe.status], ([s, st]) => {
  quickScore.value = s as number
  quickStatus.value = st as string
})

const statusOptions = [
  { key: 'want_to_make', label: '想做' },
  { key: 'can_make', label: '会做' },
  { key: 'made', label: '做过' },
]

let lastClick = 0

const handleClick = (e: MouseEvent) => {
  const now = Date.now()
  if (now - lastClick < 300) {
    // Double click - open quick edit
    e.preventDefault()
    e.stopPropagation()
    showQuickEdit.value = true
    lastClick = 0
    return
  }
  lastClick = now
  // Single click - navigate (handled by NuxtLink)
  if (showQuickEdit.value) {
    e.preventDefault()
    showQuickEdit.value = false
  }
}

const closeQuickEdit = async () => {
  const scoreChanged = quickScore.value !== props.recipe.score
  const statusChanged = quickStatus.value !== props.recipe.status
  if (scoreChanged || statusChanged) {
    try {
      await updateRecipe(props.recipe.id, { score: quickScore.value, status: quickStatus.value })
      emit('update', { score: quickScore.value, status: quickStatus.value })
    } catch (e) {
      console.warn('Quick edit save failed:', e)
    }
  }
  showQuickEdit.value = false
}
</script>

<template>
  <div class="relative group">
    <NuxtLink
      :to="`/recipes/${recipe.id}`"
      class="block"
      @click="handleClick"
    >
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer">
        <!-- Image area - SVG line art placeholder with colored background -->
        <div class="aspect-[4/3] overflow-hidden relative" :class="colorClasses[recipe.coverColor] || 'bg-gray-50'">
          <HandDrawnPlaceholder
            :tags="recipe.tags"
            aspect-ratio="4/3"
            class="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
          <div class="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-[#D86830] flex items-center gap-1">
            <span>⭐</span>{{ recipe.score }}
          </div>
          <div
            v-if="statusLabel"
            class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-xs font-medium"
            :class="statusLabel.class"
          >
            {{ statusLabel.text }}
          </div>
        </div>

        <div class="p-4">
          <h3 class="text-base font-bold text-[#1a1714] mb-2 truncate">{{ recipe.name }}</h3>
          <div class="flex flex-wrap gap-1 mb-3">
            <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="text-xs text-[#8B7D6B] bg-gray-100 px-2 py-0.5 rounded-md">
              {{ tag }}
            </span>
            <span v-if="recipe.tags.length > 3" class="text-xs text-[#A69080]">+{{ recipe.tags.length - 3 }}</span>
          </div>
          <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span class="font-mono text-xs text-[#8B7D6B]">{{ recipe.estimatedTime }}min</span>
            <span class="font-mono text-xs text-[#8B7D6B]">做过 {{ recipe.cookCount }} 次</span>
          </div>
        </div>
      </div>
    </NuxtLink>

    <!-- Quick edit overlay backdrop -->
    <div v-if="showQuickEdit" class="fixed inset-0 z-20" @click="closeQuickEdit"></div>
    <!-- Quick edit overlay (on double click) -->
    <div
      v-if="showQuickEdit"
      class="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-lg border-2 border-[#A69080] z-30 p-5 flex flex-col justify-center shadow-lg"
      @click.stop
    >
      <h4 class="text-base font-bold text-[#1a1714] mb-4">{{ recipe.name }}</h4>

      <div class="mb-4">
        <div class="text-[10px] font-bold text-[#8B7D6B] uppercase tracking-widest mb-2">评分</div>
        <div class="flex gap-1">
          <button
            v-for="n in 10" :key="n"
            class="w-6 h-6 rounded text-xs font-mono transition-all"
            :class="n <= quickScore ? 'bg-[#D86830] text-white' : 'bg-gray-100 text-[#A69080] hover:bg-gray-200'"
            @click="quickScore = n"
          >{{ n }}</button>
        </div>
      </div>

      <div class="mb-4">
        <div class="text-[10px] font-bold text-[#8B7D6B] uppercase tracking-widest mb-2">状态</div>
        <div class="flex gap-1.5">
          <button
            v-for="opt in statusOptions" :key="opt.key"
            class="px-3 py-1.5 rounded-full text-xs transition-all"
            :class="quickStatus === opt.key ? 'bg-[#A69080] text-white' : 'bg-gray-100 text-[#8B7D6B] hover:bg-gray-200'"
            @click="quickStatus = opt.key"
          >{{ opt.label }}</button>
        </div>
      </div>

      <button class="text-xs text-[#A69080] hover:text-[#1a1714] transition-colors mt-1" @click="closeQuickEdit">
        关闭
      </button>
    </div>
  </div>
</template>
