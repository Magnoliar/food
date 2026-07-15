<script setup lang="ts">
import type { KitchenMealSlot } from '~/types'

const props = defineProps<{
  meals: Array<{
    date: string
    dayLabel: string
    meal1: KitchenMealSlot | null
    meal2: KitchenMealSlot | null
  }>
  activeDay?: string
  recipeNames?: string[]
  isPast?: boolean
}>()

const emit = defineEmits<{
  selectDay: [date: string]
  updateMeal1: [date: string, name: string]
  updateMeal2: [date: string, name: string]
  toggleSkip: [date: string, reason: string | null]
}>()

const skipReasons = ['外出就餐', '旅游', '放假'] as const
const skipMenuDate = ref<string | null>(null)
const customSkipMode = ref<string | null>(null)
const customSkipInput = ref('')

const dayColors: Record<string, string> = {
  周一: 'bg-[var(--color-accent-soft)]',
  周二: 'bg-[var(--color-danger-soft)]',
  周三: 'bg-[var(--color-success-soft)]',
  周四: 'bg-[var(--color-warning-soft)]',
  周五: 'bg-[var(--color-success-soft)]',
  周六: 'bg-[var(--color-accent-soft)]',
  周日: 'bg-[var(--color-warning-soft)]',
}
const dayAccentColors: Record<string, string> = {
  周一: 'bg-[var(--color-accent)]',
  周二: 'bg-[var(--color-danger)]',
  周三: 'bg-[var(--color-success)]',
  周四: 'bg-[var(--color-warning)]',
  周五: 'bg-[var(--color-success)]',
  周六: 'bg-[var(--color-accent)]',
  周日: 'bg-[var(--color-warning)]',
}

const isActive = (date: string) => props.activeDay === date

const activeInput = ref<string | null>(null)
const autocompleteQuery = ref('')

const autocompleteResults = computed(() => {
  const q = autocompleteQuery.value?.trim().toLowerCase()
  if (!q || !props.recipeNames?.length) return []
  return props.recipeNames.filter(name => name.toLowerCase().includes(q)).slice(0, 10)
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

const showAutocomplete = (key: string, value: string) => {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  activeInput.value = key
  autocompleteQuery.value = value
}

const selectAutocomplete = (date: string, slot: 1 | 2, name: string) => {
  if (slot === 1) emit('updateMeal1', date, name)
  else emit('updateMeal2', date, name)
  activeInput.value = null
  autocompleteQuery.value = ''
}

const handleInput = (date: string, slot: 1 | 2, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (slot === 1) emit('updateMeal1', date, value)
  else emit('updateMeal2', date, value)
  autocompleteQuery.value = value
  activeInput.value = value.trim() ? (date + (slot === 1 ? '-m1' : '-m2')) : null
}

const hideAutocomplete = () => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { activeInput.value = null }, 150)
}

// 阻止下拉区域内的 mousedown 触发 input blur
const preventBlur = (e: Event) => {
  e.preventDefault()
}

const focusInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  target?.focus()
}

const toggleSkipMenu = (date: string) => {
  skipMenuDate.value = skipMenuDate.value === date ? null : date
  customSkipMode.value = null
  customSkipInput.value = ''
}

const selectSkipReason = (date: string, reason: string) => {
  emit('toggleSkip', date, reason)
  skipMenuDate.value = null
  customSkipMode.value = null
  customSkipInput.value = ''
}

const startCustomSkip = (date: string) => {
  customSkipMode.value = date
  customSkipInput.value = ''
}

const confirmCustomSkip = (date: string) => {
  const reason = customSkipInput.value.trim()
  if (!reason) return
  emit('toggleSkip', date, reason)
  skipMenuDate.value = null
  customSkipMode.value = null
  customSkipInput.value = ''
}

const cancelSkip = (date: string) => {
  emit('toggleSkip', date, null)
  skipMenuDate.value = null
}

const closeSkipMenu = () => {
  skipMenuDate.value = null
  customSkipMode.value = null
  customSkipInput.value = ''
}

onMounted(() => {
  document.addEventListener('click', closeSkipMenu)
})

onBeforeUnmount(() => {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  document.removeEventListener('click', closeSkipMenu)
})
</script>

<template>
  <div class="space-y-2 pb-1">
    <div class="w-full space-y-2">
      <div
        v-for="meal in meals"
        :key="meal.date"
        class="group grid grid-cols-[56px_minmax(0,1fr)_44px] gap-2 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_44px] sm:gap-3"
        :class="(activeInput === meal.date + '-m1' || activeInput === meal.date + '-m2') ? 'relative z-30' : 'relative'"
        @click="emit('selectDay', meal.date)"
      >
        <div
          class="row-span-2 flex min-h-[68px] flex-col items-center sm:row-span-1 justify-center rounded-lg px-1 py-2 font-serif text-base text-[var(--color-text-muted)] sm:min-h-[72px] sm:text-lg"
          :class="dayColors[meal.dayLabel] || 'bg-[var(--color-bg-soft)]'"
        >
          <span>{{ meal.dayLabel }}</span>
          <span class="mt-0.5 font-mono text-[10px] text-[var(--color-text-faint)]">{{ meal.date.slice(5).replace('-', '/') }}</span>
        </div>

        <template v-if="meal.meal1?.status === 'skipped'">
          <div class="col-span-2 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-soft)] p-3 sm:min-h-[72px] sm:p-4">
            <div class="text-center">
              <span class="text-sm text-[var(--color-text-faint)]">{{ meal.meal1.skipReason || '不安排' }}</span>
              <button class="touch-target mt-1 inline-flex items-center justify-center rounded-lg px-2 text-xs text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-soft)]" @click.stop="cancelSkip(meal.date)">取消跳过</button>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="meal.meal1" class="relative col-start-2 min-w-0 sm:col-start-auto">
            <div
              class="flex min-h-[68px] items-center gap-2 rounded-lg border bg-[var(--color-surface)] p-3 transition-all sm:min-h-[72px] sm:p-4"
              :class="isActive(meal.date) ? 'border-[var(--color-accent)] shadow-[var(--shadow-sm)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'"
            >
              <div class="hidden h-8 w-1 flex-shrink-0 rounded-full sm:block" :class="dayAccentColors[meal.dayLabel] || 'bg-[var(--color-border-strong)]'"></div>
              <div class="flex-1 min-w-0">
                <label class="mb-1 block text-xs font-medium text-[var(--color-text-muted)]" :for="`meal1-${meal.date}`">{{ meal.dayLabel }}{{ meal.meal1.label }}</label>
                <input
                  :id="`meal1-${meal.date}`"
                  :value="meal.meal1.name"
                  :aria-label="`${meal.dayLabel}${meal.meal1.label}`"
                  :placeholder="meal.meal1.label"
                  class="block min-h-11 w-full min-w-0 bg-transparent border-none outline-none font-serif text-base text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]/30"
                  :data-testid="`week-meal1-${meal.date}`"
                  @input="handleInput(meal.date, 1, $event)"
                  @pointerdown="focusInput($event)"
                  @focus="showAutocomplete(meal.date + '-m1', meal.meal1.name)"
                  @blur="hideAutocomplete()"
                  @click.stop
                />
              </div>
            </div>
            <Transition name="dropdown">
              <div
                v-if="activeInput === meal.date + '-m1' && autocompleteResults.length"
                class="absolute left-0 right-0 top-full mt-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg z-20 overflow-hidden"
                @mousedown="preventBlur"
              >
                <button
                  v-for="name in autocompleteResults"
                  :key="name"
                  class="min-h-11 w-full border-b border-[var(--color-border)] px-4 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors last:border-0 hover:bg-[var(--color-bg-soft)]"
                  @mousedown.prevent="selectAutocomplete(meal.date, 1, name)"
                >
                  {{ name }}
                </button>
              </div>
            </Transition>
          </div>

          <div class="relative col-start-2 min-w-0 sm:col-start-auto">
            <div
              v-if="meal.meal2"
              class="flex min-h-[68px] items-center gap-2 rounded-lg border bg-[var(--color-surface)] p-3 transition-all sm:min-h-[72px] sm:p-4"
              :class="isActive(meal.date) ? 'border-[var(--color-accent)] shadow-[var(--shadow-sm)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'"
            >
              <div class="hidden h-8 w-1 flex-shrink-0 rounded-full sm:block" :class="dayAccentColors[meal.dayLabel] || 'bg-[var(--color-border)]'"></div>
              <div class="flex-1 min-w-0">
                <label class="mb-1 block text-xs font-medium text-[var(--color-text-muted)]" :for="`meal2-${meal.date}`">{{ meal.dayLabel }}{{ meal.meal2.label }}</label>
                <input
                  :id="`meal2-${meal.date}`"
                  :value="meal.meal2.name"
                  :aria-label="`${meal.dayLabel}${meal.meal2.label}`"
                  :placeholder="meal.meal2.label"
                  class="block min-h-11 w-full min-w-0 bg-transparent border-none outline-none font-serif text-base text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]/30"
                  :data-testid="`week-meal2-${meal.date}`"
                  @input="handleInput(meal.date, 2, $event)"
                  @pointerdown="focusInput($event)"
                  @focus="showAutocomplete(meal.date + '-m2', meal.meal2.name)"
                  @blur="hideAutocomplete()"
                  @click.stop
                />
              </div>
            </div>
            <div v-else class="flex min-h-[68px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/45 p-3 sm:min-h-[72px] sm:p-4">
              <span class="text-lg text-[var(--color-text-faint)] font-serif" aria-label="无安排">
                —
              </span>
            </div>
            <Transition name="dropdown">
              <div
                v-if="meal.meal2 && activeInput === meal.date + '-m2' && autocompleteResults.length"
                class="absolute left-0 right-0 top-full mt-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg z-20 overflow-hidden"
                @mousedown="preventBlur"
              >
                <button
                  v-for="name in autocompleteResults"
                  :key="name"
                  class="min-h-11 w-full border-b border-[var(--color-border)] px-4 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors last:border-0 hover:bg-[var(--color-bg-soft)]"
                  @mousedown.prevent="selectAutocomplete(meal.date, 2, name)"
                >
                  {{ name }}
                </button>
              </div>
            </Transition>
          </div>
        </template>

        <div class="relative col-start-3 row-span-2 row-start-1 flex items-start justify-end pt-0 sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:pt-2">
          <button
            class="touch-target flex items-center justify-center rounded-lg text-[var(--color-text-faint)] opacity-100 transition-opacity hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)] sm:opacity-0 sm:group-hover:opacity-100"
            :class="skipMenuDate === meal.date ? 'opacity-100 !bg-[var(--color-bg-soft)]' : ''"
            @click.stop="toggleSkipMenu(meal.date)"
          >
            <span class="sr-only">设置这天不安排</span><svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
          </button>
          <Transition name="dropdown">
            <div
              v-if="skipMenuDate === meal.date && meal.meal1?.status !== 'skipped'"
              class="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg z-20"
              @click.stop
              @mousedown.stop
            >
              <button
                v-for="reason in skipReasons"
                :key="reason"
                class="min-h-11 w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-soft)] transition-colors"
                @click="selectSkipReason(meal.date, reason)"
              >
                {{ reason }}
              </button>
              <template v-if="customSkipMode === meal.date">
                <div class="border-t border-[var(--color-border)] px-3 py-2">
                  <input
                    v-model="customSkipInput"
                    aria-label="不安排的原因"
                    placeholder="输入原因"
                    class="field-control w-full border border-[var(--color-border)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                    @keydown.enter="confirmCustomSkip(meal.date)"
                  />
                  <div class="mt-1 flex justify-end gap-1">
                    <button class="touch-target rounded-lg px-2 text-xs text-[var(--color-text-muted)]" @click="customSkipMode = null">取消</button>
                    <button class="touch-target rounded-lg px-2 text-xs text-[var(--color-accent)]" @click="confirmCustomSkip(meal.date)">确定</button>
                  </div>
                </div>
              </template>
              <template v-else>
                <button
                  class="min-h-11 w-full border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-bg-soft)] transition-colors"
                  @click="startCustomSkip(meal.date)"
                >
                  自定义...
                </button>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
