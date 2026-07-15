<script setup lang="ts">
import type { ShoppingItem } from '~/types'

const props = defineProps<{ items: Record<string, ShoppingItem[]> | ShoppingItem[] }>()
const emit = defineEmits<{ refresh: [] }>()
const { updateShoppingItem, addShoppingItem } = useApi()
const toast = useToast()
const newItemName = ref('')
const copied = ref(false)
const savingId = ref('')
const adding = ref(false)
const collapsedCategories = ref<string[]>([])
const groupedItems = computed<Record<string, ShoppingItem[]>>(() => Array.isArray(props.items) ? props.items.reduce<Record<string, ShoppingItem[]>>((groups, item) => { (groups[item.category || '其他'] ||= []).push(item); return groups }, {}) : props.items || {})
const rank = (item: ShoppingItem) => !item.checked && !item.inStock ? 0 : item.inStock && !item.checked ? 1 : 2
const groupedEntries = computed(() => Object.entries(groupedItems.value).map(([category, items]) => { const pending = items.filter(item => rank(item) === 0).length; return { category, items: [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'zh-CN')), pending, handled: items.length - pending, total: items.length, collapsed: collapsedCategories.value.includes(category) } }).sort((a, b) => b.pending - a.pending || a.category.localeCompare(b.category, 'zh-CN')))
const flatItems = computed(() => Object.values(groupedItems.value).flat())
const totalCount = computed(() => flatItems.value.length)
const handledCount = computed(() => flatItems.value.filter(item => item.checked || item.inStock).length)
const remainingCount = computed(() => totalCount.value - handledCount.value)
const progress = computed(() => totalCount.value ? Math.round(handledCount.value / totalCount.value * 100) : 0)
const categoryIcons: Record<string, string> = { 海鲜水产: '◇', 肉禽蛋品: '●', 蔬菜菌菇: '◆', 调味干货: '◎', 主食厨房: '□', 乳品: '○', 临时: '+', 其他: '·' }

const toggleItem = async (item: ShoppingItem) => {
  if (!item.id || savingId.value) return
  const next = !item.checked; savingId.value = item.id
  try { await updateShoppingItem(item.id, { checked: next }); item.checked = next }
  catch (error: unknown) { toast.error(getApiErrorMessage(error, '没有更新成功，请再试一次。')) }
  finally { savingId.value = '' }
}
const toggleStock = async (item: ShoppingItem) => {
  if (!item.id || savingId.value) return
  const next = !item.inStock; savingId.value = item.id
  try { await updateShoppingItem(item.id, { inStock: next }); item.inStock = next }
  catch (error: unknown) { toast.error(getApiErrorMessage(error, '没有更新库存状态，请再试一次。')) }
  finally { savingId.value = '' }
}
const toggleCategory = (category: string) => { collapsedCategories.value = collapsedCategories.value.includes(category) ? collapsedCategories.value.filter(item => item !== category) : [...collapsedCategories.value, category] }
const addItem = async () => {
  const name = newItemName.value.trim(); if (!name || adding.value) return
  adding.value = true
  try { await addShoppingItem({ name, category: '临时' }); newItemName.value = ''; emit('refresh'); toast.success('已加到购物清单。') }
  catch (error: unknown) { toast.error(getApiErrorMessage(error, '没有添加成功，请再试一次。')) }
  finally { adding.value = false }
}
const copyList = async () => {
  const lines = Object.entries(groupedItems.value).flatMap(([category, items]) => { const pending = items.filter(item => !item.checked && !item.inStock); return pending.length ? [`【${category}】`, ...pending.map(item => `- ${item.name} ${item.amount || ''}`.trim())] : [] })
  try { await navigator.clipboard.writeText(lines.join('\n') || '已全部采购完成'); copied.value = true; window.setTimeout(() => { copied.value = false }, 2000) }
  catch { toast.error('复制失败，可以手动选择清单内容。') }
}
</script>

<template>
  <div class="flex h-full flex-col" data-testid="shopping-list">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div><div class="flex items-center gap-2"><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">购物清单</h2><span v-if="remainingCount" class="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">还差 {{ remainingCount }}</span></div><p class="mt-1 text-xs text-[var(--color-text-faint)]">勾上已买；“家里有”也算处理完成。</p></div>
      <button class="touch-target shrink-0 rounded-lg px-3 text-sm font-medium transition hover:bg-[var(--color-surface-muted)]" :class="copied ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'" @click="copyList">{{ copied ? '已复制' : '复制' }}</button>
    </div>
    <div class="mb-5 flex items-center gap-3" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`购物清单已处理 ${progress}%`"><div class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"><div class="h-full rounded-full bg-[var(--color-success)] transition-[width] duration-500" :style="{ width: progress + '%' }" /></div><span class="tabular-nums text-xs text-[var(--color-text-muted)]">{{ handledCount }}/{{ totalCount }}</span></div>

    <EmptyState v-if="!totalCount" title="清单还是空的" description="排好菜谱后，点“保存并同步清单”生成；也可以先加一项。" icon="篮" />
    <div v-else class="flex-1 space-y-3 pb-4">
      <section v-for="group in groupedEntries" :key="group.category" class="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button type="button" class="flex min-h-12 w-full items-center gap-2 px-3 text-left transition hover:bg-[var(--color-bg-soft)]" :aria-expanded="!group.collapsed" :data-testid="`shopping-category-${group.category}`" @click="toggleCategory(group.category)"><span aria-hidden="true">{{ categoryIcons[group.category] || '·' }}</span><h3 class="flex-1 text-sm font-semibold">{{ group.category }}</h3><span class="text-xs" :class="group.pending ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]'">{{ group.pending ? `还差 ${group.pending}` : '都好了' }}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4 text-[var(--color-text-faint)] transition-transform" :class="group.collapsed ? '' : 'rotate-180'" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
        <div v-if="!group.collapsed" class="border-t border-[var(--color-border)] p-1.5">
          <div v-for="item in group.items" :key="item.id || item.name" class="flex min-h-14 items-center gap-2 rounded-lg px-1.5 py-1.5" :class="item.checked || item.inStock ? 'bg-[var(--color-bg-soft)]' : ''">
            <button class="touch-target flex shrink-0 items-center justify-center rounded-lg border transition active:scale-[.98]" :class="item.checked ? 'border-[var(--color-success)] bg-[var(--color-success)]' : 'border-[var(--color-border-strong)] bg-white'" :disabled="savingId === item.id" :aria-label="item.checked ? `将${item.name}标为未购买` : `将${item.name}标为已购买`" :aria-pressed="item.checked" :data-shopping-checked="item.checked ? 'true' : 'false'" :data-shopping-pending="!item.checked && !item.inStock ? 'true' : 'false'" :data-testid="`shopping-toggle-${item.id || item.name}`" @click="toggleItem(item)"><svg v-if="item.checked" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="h-5 w-5" aria-hidden="true"><path d="m5 13 4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
            <div class="min-w-0 flex-1"><p class="text-sm" :class="item.checked || item.inStock ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.name }}</p><p v-if="item.source && !item.checked" class="mt-0.5 truncate text-[11px] text-[var(--color-text-faint)]">用于 {{ item.source }}</p></div>
            <span class="max-w-20 text-right text-xs text-[var(--color-text-muted)]">{{ item.amount }}</span>
            <button class="touch-target shrink-0 rounded-lg border px-2 text-xs font-medium transition" :class="item.inStock ? 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'" :disabled="savingId === item.id" :aria-pressed="item.inStock" :aria-label="item.inStock ? `取消${item.name}家里有` : `标记${item.name}家里有`" @click="toggleStock(item)">家里有</button>
          </div>
        </div>
      </section>
    </div>

    <form class="mt-2 flex gap-2 border-t border-[var(--color-border)] pt-3" @submit.prevent="addItem"><div class="min-w-0 flex-1"><label class="sr-only" for="shopping-new-item">添加临时购物项</label><input id="shopping-new-item" v-model="newItemName" class="field-control" placeholder="例如：厨房纸" data-testid="shopping-new-item" /></div><AppButton type="submit" variant="secondary" :loading="adding" data-testid="shopping-add-item">添加</AppButton></form>
  </div>
</template>
