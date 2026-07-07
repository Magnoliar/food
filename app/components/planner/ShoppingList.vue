<script setup lang="ts">
interface ShoppingItem {
  id?: string
  name: string
  amount?: string | null
  category?: string
  checked: boolean
  inStock?: boolean
  source?: string | null
}

const props = defineProps<{
  items: Record<string, ShoppingItem[]> | ShoppingItem[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { updateShoppingItem, addShoppingItem } = useApi()
const newItemName = ref('')
const copied = ref(false)
const savingId = ref('')
const collapsedCategories = ref<string[]>([])

const groupedItems = computed<Record<string, ShoppingItem[]>>(() => {
  if (Array.isArray(props.items)) {
    return props.items.reduce((acc, item) => {
      const category = item.category || '其他'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<string, ShoppingItem[]>)
  }
  return props.items || {}
})

const sortedItems = (items: ShoppingItem[]) => {
  return [...items].sort((a, b) => {
    const rank = (item: ShoppingItem) => {
      if (!item.checked && !item.inStock) return 0
      if (item.inStock && !item.checked) return 1
      return 2
    }
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'zh-CN')
  })
}

const groupedEntries = computed(() => {
  return Object.entries(groupedItems.value).map(([category, items]) => {
    const pending = items.filter(item => !item.checked && !item.inStock).length
    const handled = items.length - pending
    return {
      category,
      items: sortedItems(items),
      pending,
      handled,
      total: items.length,
      collapsed: collapsedCategories.value.includes(category),
    }
  }).sort((a, b) => {
    if (a.pending !== b.pending) return b.pending - a.pending
    return a.category.localeCompare(b.category, 'zh-CN')
  })
})

const flatItems = computed(() => Object.values(groupedItems.value).flat())
const totalCount = computed(() => flatItems.value.length)
const handledCount = computed(() => flatItems.value.filter(i => i.checked || i.inStock).length)
const remainingCount = computed(() => flatItems.value.filter(i => !i.checked && !i.inStock).length)
const progress = computed(() => totalCount.value === 0 ? 0 : Math.round((handledCount.value / totalCount.value) * 100))

const categoryIcons: Record<string, string> = {
  '海鲜水产': '◇',
  '肉禽蛋品': '●',
  '蔬菜菌菇': '◆',
  '调味干货': '◎',
  '主食厨房': '□',
  '乳品': '○',
  '临时': '+',
  '其他': '·',
}

const toggleItem = async (item: ShoppingItem) => {
  if (!item.id) {
    item.checked = !item.checked
    return
  }
  savingId.value = item.id
  try {
    await updateShoppingItem(item.id, { checked: !item.checked })
    item.checked = !item.checked
  } finally {
    savingId.value = ''
  }
}

const toggleStock = async (item: ShoppingItem) => {
  if (!item.id) return
  savingId.value = item.id
  try {
    await updateShoppingItem(item.id, { inStock: !item.inStock })
    item.inStock = !item.inStock
  } finally {
    savingId.value = ''
  }
}

const toggleCategory = (category: string) => {
  collapsedCategories.value = collapsedCategories.value.includes(category)
    ? collapsedCategories.value.filter(item => item !== category)
    : [...collapsedCategories.value, category]
}

const addItem = async () => {
  const name = newItemName.value.trim()
  if (!name) return
  await addShoppingItem({ name, category: '临时' })
  newItemName.value = ''
  emit('refresh')
}

const copyList = () => {
  const lines = Object.entries(groupedItems.value).flatMap(([cat, items]) => {
    const unchecked = items.filter(i => !i.checked && !i.inStock)
    if (!unchecked.length) return []
    return [`【${cat}】`, ...unchecked.map(i => `- ${i.name} ${i.amount || ''}`.trim())]
  })
  navigator.clipboard.writeText(lines.join('\n') || '已全部采购完成')
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="flex flex-col h-full" data-testid="shopping-list">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="font-serif text-lg font-bold text-[#1a1714]">购物清单</h3>
        <span v-if="remainingCount > 0" class="bg-[#A69080] text-white text-xs px-2 py-0.5 rounded-full font-mono">
          {{ remainingCount }}
        </span>
      </div>
      <button class="text-xs transition-colors flex items-center gap-1" :class="copied ? 'text-[#6D8B74]' : 'text-[#8B7D6B] hover:text-[#1a1714]'" @click="copyList">
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>

    <div class="flex items-center gap-3 mb-5">
      <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-[#6D8B74] rounded-full transition-all duration-500" :style="{ width: progress + '%' }" />
      </div>
      <span class="font-mono text-xs text-[#8B7D6B]">{{ handledCount }}/{{ totalCount }}</span>
    </div>

    <div class="flex-1 overflow-y-auto space-y-4 pb-4">
      <div v-for="group in groupedEntries" :key="group.category" class="rounded-lg border border-gray-100 bg-white/65">
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
          :aria-expanded="!group.collapsed"
          :data-testid="`shopping-category-${group.category}`"
          @click="toggleCategory(group.category)"
        >
          <span class="text-sm font-mono">{{ categoryIcons[group.category] || '·' }}</span>
          <h4 class="flex-1 text-sm font-bold text-[#1a1714]">{{ group.category }}</h4>
          <span v-if="group.pending" class="rounded-full bg-[#F4ECE2] px-2 py-0.5 text-[11px] text-[#8B5A3C]">
            还差 {{ group.pending }}
          </span>
          <span v-else class="rounded-full bg-[#6D8B74]/10 px-2 py-0.5 text-[11px] text-[#5C755F]">
            都好了
          </span>
          <span class="font-mono text-xs text-[#A69080]">{{ group.handled }}/{{ group.total }}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4 text-[#A69080] transition-transform" :class="group.collapsed ? '' : 'rotate-180'">
            <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div v-if="!group.collapsed" class="space-y-1 border-t border-gray-100 p-2">
          <div
            v-for="item in group.items"
            :key="item.id || item.name"
            class="flex min-h-[52px] items-center gap-3 rounded-md px-2 py-2 transition-all"
            :class="item.checked || item.inStock ? 'bg-gray-50' : 'hover:bg-gray-50'"
          >
            <button
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border transition-all active:scale-95"
              :class="item.checked ? 'border-[#6D8B74] bg-[#6D8B74]' : 'border-gray-300'"
              :disabled="savingId === item.id"
              :aria-pressed="item.checked"
              :data-shopping-checked="item.checked ? 'true' : 'false'"
              :data-shopping-pending="!item.checked && !item.inStock ? 'true' : 'false'"
              :data-testid="`shopping-toggle-${item.id || item.name}`"
              @click="toggleItem(item)"
            >
              <svg v-if="item.checked" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="h-4 w-4">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <span
              class="flex-1 text-sm transition-all"
              :class="item.checked || item.inStock ? 'text-[#A69080] line-through' : 'text-[#1a1714]'"
            >
              {{ item.name }}
              <span v-if="item.source && !item.checked" class="block text-[11px] text-[#A69080]/70 font-normal mt-0.5">{{ item.source }}</span>
            </span>
            <span class="max-w-[6rem] text-right font-mono text-xs text-[#8B7D6B]">{{ item.amount }}</span>
            <button
              class="rounded-md border px-3 py-2 text-xs transition-colors active:scale-95"
              :class="item.inStock ? 'border-[#6D8B74] text-[#6D8B74] bg-[#6D8B74]/5' : 'border-gray-200 text-[#A69080]'"
              :disabled="savingId === item.id"
              @click="toggleStock(item)"
            >
              家里有
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-3 border-t border-gray-100 space-y-2">
      <div class="flex gap-2">
        <input
          v-model="newItemName"
          placeholder="添加临时项..."
          class="flex-1 text-sm bg-transparent border border-dashed border-gray-300 rounded-md px-3 py-2 text-[#1a1714] placeholder:text-[#A69080]/40 focus:outline-none focus:border-[#A69080]"
          data-testid="shopping-new-item"
          @keyup.enter="addItem"
        />
        <button
          class="px-3 py-2 bg-[#8B7D6B] text-white text-xs rounded-md hover:bg-[#6B5D4D] transition-colors"
          data-testid="shopping-add-item"
          @click="addItem"
        >添加</button>
      </div>
    </div>
  </div>
</template>
