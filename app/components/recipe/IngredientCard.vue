<script setup lang="ts">
import type { FridgeItem, Ingredient } from '~/types'
import { colorClasses } from '~/constants/recipe'

type StorageZone = 'frozen' | 'refrigerated' | 'room_temp'

const props = defineProps<{
  ingredient: Ingredient
  inStorage?: boolean
  storageZone?: StorageZone
  storageItem?: FridgeItem
}>()

const emit = defineEmits<{
  select: []
  store: [zone: StorageZone]
}>()

const imageFailed = ref(false)
const displayImageUrl = computed(() => {
  if (imageFailed.value) return null
  const raw = props.ingredient.lineArtUrl
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : raw
  } catch {
    return raw
  }
})

watch(() => props.ingredient.lineArtUrl, () => { imageFailed.value = false })

const zoneMeta: Record<StorageZone, { label: string; icon: string; tone: string }> = {
  refrigerated: { label: '冷藏', icon: '🧊', tone: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  frozen: { label: '冷冻', icon: '❄️', tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  room_temp: { label: '常温', icon: '🌡️', tone: 'border-amber-200 bg-amber-50 text-amber-900' },
}

const currentZone = computed(() => props.storageZone ? zoneMeta[props.storageZone] : null)
const addedDateText = computed(() => {
  const value = props.storageItem?.addedDate
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
})

const openCard = () => emit('select')
</script>

<template>
  <article
    class="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)] focus-within:border-[var(--color-accent)]"
  >
    <div
      class="cursor-pointer outline-none"
      role="button"
      tabindex="0"
      :aria-label="ingredient.name + '，' + (inStorage ? (currentZone?.label || '已入库') : '家里暂时没有') + '，查看详情'"
      @click="openCard"
      @keydown.enter.prevent="openCard"
      @keydown.space.prevent="openCard"
    >
      <div class="relative aspect-[4/3] overflow-hidden" :class="colorClasses[ingredient.crayonColor || ''] || 'bg-[var(--color-bg-soft)]'">
        <img
          v-if="displayImageUrl"
          :src="displayImageUrl"
          :alt="ingredient.name + '的线稿图'"
          width="480"
          height="360"
          loading="lazy"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          @error="imageFailed = true"
        />
        <HandDrawnPlaceholder v-else :tags="[ingredient.name]" :alt="`${ingredient.name}的手绘占位图`" aspect-ratio="4/3" class="h-full w-full transition duration-500 group-hover:scale-[1.03]" />
        <span v-if="inStorage && currentZone" class="absolute left-2 top-2 rounded-full border px-2 py-1 text-xs font-semibold shadow-sm" :class="currentZone.tone">
          {{ currentZone.icon }} {{ currentZone.label }}
        </span>
        <span v-else class="absolute left-2 top-2 rounded-full border border-white/80 bg-white/90 px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] shadow-sm">家里没有</span>
      </div>

      <div class="p-4 pb-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate font-serif text-lg font-semibold text-[var(--color-text)]">{{ ingredient.name }}</h2>
            <p class="mt-1 text-xs text-[var(--color-text-muted)]">{{ ingredient.category || '其他' }} · 用于 {{ ingredient.recipeCount }} 道菜</p>
          </div>
          <span v-if="displayImageUrl" class="rounded-full bg-[var(--color-success-soft)] px-2 py-1 text-[11px] text-[var(--color-success)]">有配图</span>
        </div>
        <div v-if="inStorage && currentZone" class="mt-3 rounded-[var(--radius-md)] border px-3 py-2 text-xs" :class="currentZone.tone">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold">家里有</span>
            <span v-if="storageItem?.amount" class="font-mono tabular-nums">{{ storageItem.amount }}</span>
          </div>
          <p v-if="addedDateText" class="mt-1 opacity-75">{{ addedDateText }} 放入</p>
        </div>
        <div v-else class="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-xs text-[var(--color-text-muted)]">还没放进家里</div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-3 py-2">
      <span class="pl-1 text-xs text-[var(--color-text-faint)]">快速调整库存</span>
      <div class="flex gap-1">
        <button
          v-for="(meta, zone) in zoneMeta"
          :key="zone"
          class="touch-target flex items-center justify-center rounded-[var(--radius-md)] border text-base transition"
          :class="storageZone === zone ? meta.tone : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]'"
          :aria-label="storageZone === zone ? ingredient.name + '已在' + meta.label + '，点击移出库存' : '将' + ingredient.name + '放入' + meta.label"
          :aria-pressed="storageZone === zone"
          @click="emit('store', zone)"
        >
          {{ meta.icon }}
        </button>
      </div>
    </div>
  </article>
</template>
