<script setup lang="ts">
import { colorClasses } from '~/constants/recipe'

const props = defineProps<{
  ingredient: {
    id: string
    name: string
    category: string | null
    family: string | null
    lineArtUrl: string | null
    crayonColor: string | null
    recipeCount: number
    tags: string[]
  }
  inStorage?: boolean
  storageZone?: string
  storageItem?: {
    amount?: string | null
    addedDate?: string | Date | null
  }
}>()

const emit = defineEmits<{
  select: []
  store: [zone: string]
}>()

// lineArtUrl may be a single URL string or a JSON array of URLs
const displayImageUrl = computed(() => {
  const raw = props.ingredient.lineArtUrl
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] || null
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed[0] : raw } catch { return raw }
})

const storageLabel = computed(() => {
  if (props.storageZone === 'frozen') return '❄️ 冷冻'
  if (props.storageZone === 'room_temp') return '🌡️ 常温'
  return '🧊 冷藏'
})

const storageTone = computed(() => {
  if (props.storageZone === 'frozen') return 'bg-blue-50 text-blue-600 border-blue-100'
  if (props.storageZone === 'room_temp') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-cyan-50 text-cyan-700 border-cyan-100'
})

const addedDateText = computed(() => {
  const value = props.storageItem?.addedDate
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
})
</script>

<template>
  <div
    class="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-md"
    @click="emit('select')"
  >
    <!-- Image area -->
    <div class="relative aspect-[4/3] overflow-hidden" :class="colorClasses[ingredient.crayonColor || ''] || 'bg-gray-50'">
      <img v-if="displayImageUrl" :src="displayImageUrl" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <HandDrawnPlaceholder
        v-else
        :tags="[ingredient.name]"
        aspect-ratio="4/3"
        class="w-full h-full group-hover:scale-105 transition-transform duration-500"
      />
      <!-- Storage badge -->
      <div
        v-if="inStorage"
        class="absolute left-2 top-2 rounded-md border px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
        :class="storageTone">
        {{ storageLabel }}
      </div>
      <div
        v-else
        class="absolute left-2 top-2 rounded-md border border-white/70 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-[#8B7D6B] shadow-sm"
      >
        未入库
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="text-base font-bold text-[#1a1714] mb-1 truncate">{{ ingredient.name }}</h3>
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-[#A69080] bg-gray-100 px-2 py-0.5 rounded-md">{{ ingredient.category || '其他' }}</span>
        <span v-if="displayImageUrl" class="text-[10px] text-[#6D8B74]">线稿</span>
      </div>
      <div v-if="inStorage" class="mt-3 rounded-md border px-2 py-1.5 text-[11px]"
        :class="storageTone">
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">{{ storageLabel }}</span>
          <span v-if="storageItem?.amount" class="font-mono">{{ storageItem.amount }}</span>
        </div>
        <p v-if="addedDateText" class="mt-0.5 text-[10px] opacity-80">{{ addedDateText }} 放入</p>
      </div>
      <div v-else class="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] text-[#8B7D6B]">
        还没放进家里
      </div>
      <div class="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between">
        <span class="font-mono text-xs text-[#8B7D6B]">用于 {{ ingredient.recipeCount }} 道菜</span>
        <!-- Quick store buttons -->
        <div class="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" @click.stop>
          <button class="w-6 h-6 rounded flex items-center justify-center text-[10px] bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors" title="冷藏" @click="emit('store', 'refrigerated')">🧊</button>
          <button class="w-6 h-6 rounded flex items-center justify-center text-[10px] bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" title="冷冻" @click="emit('store', 'frozen')">❄️</button>
          <button class="w-6 h-6 rounded flex items-center justify-center text-[10px] bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="常温" @click="emit('store', 'room_temp')">🌡️</button>
        </div>
      </div>
    </div>
  </div>
</template>
