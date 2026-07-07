<script setup lang="ts">
interface MealSlot {
  recipeId: string | null
  name: string
  label: string
  status?: string | null
  skipReason?: string | null
}

const props = defineProps<{
  meals: Array<{
    date: string
    dayLabel: string
    meal1: MealSlot | null
    meal2: MealSlot | null
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
  周二: 'bg-[#E8927C]/8',
  周三: 'bg-[#7FB5B5]/8',
  周四: 'bg-[#D4A76A]/8',
  周五: 'bg-[#A8C686]/8',
  周六: 'bg-[#C7A0D2]/8',
  周日: 'bg-[#7BA7C2]/8',
  周一: 'bg-[#E8A0BF]/8',
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
        class="group grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3"
        :class="(activeInput === meal.date + '-m1' || activeInput === meal.date + '-m2') ? 'relative z-30' : 'relative'"
        @click="emit('selectDay', meal.date)"
      >
        <div
          class="flex min-h-[68px] flex-col items-center justify-center rounded-lg px-1 py-2 font-serif text-base text-[#6B5D4D] sm:min-h-[72px] sm:text-lg"
          :class="dayColors[meal.dayLabel] || 'bg-gray-50'"
        >
          <span>{{ meal.dayLabel }}</span>
          <span class="mt-0.5 font-mono text-[10px] text-[#9A806B]">{{ meal.date.slice(5).replace('-', '/') }}</span>
        </div>

        <template v-if="meal.meal1?.status === 'skipped'">
          <div class="col-span-2 flex items-center justify-center rounded-lg border border-dashed border-[#D8C9B8] bg-[#F5F0EB]/60 p-3 sm:min-h-[72px] sm:p-4">
            <div class="text-center">
              <span class="text-sm text-[#A69080]">{{ meal.meal1.skipReason || '不安排' }}</span>
              <button @click.stop="cancelSkip(meal.date)" class="mt-1 block text-xs text-[#C06030] hover:text-[#A85028] transition-colors">取消跳过</button>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="meal.meal1" class="relative">
            <div
              class="flex min-h-[68px] items-center gap-2 rounded-lg border bg-white p-3 transition-all sm:min-h-[72px] sm:p-4"
              :class="isActive(meal.date) ? 'border-[#3D3530] shadow-sm' : 'border-gray-200 hover:border-[#C4B5A5]'"
            >
              <div class="hidden h-8 w-1 flex-shrink-0 rounded-full sm:block" :class="dayColors[meal.dayLabel]?.replace('/8', '/30') || 'bg-gray-200'"></div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1">{{ meal.meal1.label }}</div>
                <input
                  :value="meal.meal1.name"
                  :placeholder="meal.meal1.label"
                  class="block w-full min-w-0 bg-transparent border-none outline-none font-serif text-base text-[#1a1714] placeholder:text-[#A69080]/30"
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
                class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 overflow-hidden"
                @mousedown="preventBlur"
              >
                <button
                  v-for="name in autocompleteResults"
                  :key="name"
                  class="w-full text-left px-4 py-2.5 text-sm text-[#1a1714] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  @mousedown.prevent="selectAutocomplete(meal.date, 1, name)"
                >
                  {{ name }}
                </button>
              </div>
            </Transition>
          </div>

          <div class="relative">
            <div
              v-if="meal.meal2"
              class="flex min-h-[68px] items-center gap-2 rounded-lg border bg-white p-3 transition-all sm:min-h-[72px] sm:p-4"
              :class="isActive(meal.date) ? 'border-[#3D3530] shadow-sm' : 'border-gray-200 hover:border-[#C4B5A5]'"
            >
              <div class="hidden h-8 w-1 flex-shrink-0 rounded-full sm:block" :class="dayColors[meal.dayLabel]?.replace('/8', '/20') || 'bg-gray-100'"></div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1">{{ meal.meal2.label }}</div>
                <input
                  :value="meal.meal2.name"
                  :placeholder="meal.meal2.label"
                  class="block w-full min-w-0 bg-transparent border-none outline-none font-serif text-base text-[#1a1714] placeholder:text-[#A69080]/30"
                  :data-testid="`week-meal2-${meal.date}`"
                  @input="handleInput(meal.date, 2, $event)"
                  @pointerdown="focusInput($event)"
                  @focus="showAutocomplete(meal.date + '-m2', meal.meal2.name)"
                  @blur="hideAutocomplete()"
                  @click.stop
                />
              </div>
            </div>
            <div v-else class="flex min-h-[68px] items-center justify-center rounded-lg border border-dashed border-[#D8C9B8] bg-white/45 p-3 sm:min-h-[72px] sm:p-4">
              <span class="text-lg text-[#B3A391] font-serif" aria-label="无安排">
                —
              </span>
            </div>
            <Transition name="dropdown">
              <div
                v-if="meal.meal2 && activeInput === meal.date + '-m2' && autocompleteResults.length"
                class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 overflow-hidden"
                @mousedown="preventBlur"
              >
                <button
                  v-for="name in autocompleteResults"
                  :key="name"
                  class="w-full text-left px-4 py-2.5 text-sm text-[#1a1714] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  @mousedown.prevent="selectAutocomplete(meal.date, 2, name)"
                >
                  {{ name }}
                </button>
              </div>
            </Transition>
          </div>
        </template>

        <div class="relative flex items-start pt-2">
          <button
            class="flex h-7 w-7 items-center justify-center rounded-md text-[#A69080] opacity-0 transition-opacity hover:bg-[#F5F0EB] hover:text-[#6B5D4D] group-hover:opacity-100 sm:opacity-0"
            :class="skipMenuDate === meal.date ? 'opacity-100 !bg-[#F5F0EB]' : ''"
            @click.stop="toggleSkipMenu(meal.date)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
          </button>
          <Transition name="dropdown">
            <div
              v-if="skipMenuDate === meal.date && meal.meal1?.status !== 'skipped'"
              class="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20"
              @click.stop
              @mousedown.stop
            >
              <button
                v-for="reason in skipReasons"
                :key="reason"
                class="w-full px-3 py-2 text-left text-sm text-[#1a1714] hover:bg-gray-50 transition-colors"
                @click="selectSkipReason(meal.date, reason)"
              >
                {{ reason }}
              </button>
              <template v-if="customSkipMode === meal.date">
                <div class="border-t border-gray-100 px-3 py-2">
                  <input
                    v-model="customSkipInput"
                    placeholder="输入原因"
                    class="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#C06030]"
                    @keydown.enter="confirmCustomSkip(meal.date)"
                  />
                  <div class="mt-1 flex justify-end gap-1">
                    <button class="text-xs text-[#A69080] px-1" @click="customSkipMode = null">取消</button>
                    <button class="text-xs text-[#C06030] px-1" @click="confirmCustomSkip(meal.date)">确定</button>
                  </div>
                </div>
              </template>
              <template v-else>
                <button
                  class="w-full border-t border-gray-100 px-3 py-2 text-left text-sm text-[#C06030] hover:bg-gray-50 transition-colors"
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
