<script setup lang="ts">
import type { FridgeItem, Ingredient, Recipe } from '~/types'

type StorageZone = 'frozen' | 'refrigerated' | 'room_temp'
type ExpiryInfo = { label: string; tone: string; urgent: boolean } | null

const { getFridge, addFridgeItem, removeFridgeItem, generateAndSaveLineArt, checkLineArtJob, getLineArtJobs, updateIngredient, getRecipes } = useApi()
const toast = useToast()

const ingredientsList = ref<Ingredient[]>([])
const recipes = ref<Recipe[]>([])
const fridgeFrozen = ref<FridgeItem[]>([])
const fridgeRefrigerated = ref<FridgeItem[]>([])
const fridgeRoomTemp = ref<FridgeItem[]>([])
const loading = ref(true)
const loadError = ref('')
const fridgeError = ref('')

const searchQuery = ref('')
const activeCategory = ref('')
const sortBy = ref<'name' | 'count' | 'category'>('count')
const lineArtFilter = ref<'all' | 'missing' | 'has'>('all')
const activeMobileStorageZone = ref<StorageZone>('refrigerated')
const newFridgeItem = ref<{ name: string; amount: string; zone: StorageZone; expiryDate: string }>({ name: '', amount: '', zone: 'refrigerated', expiryDate: '' })
const addingFridge = ref(false)
const fridgeFormError = ref('')
const fridgeBusyNames = ref(new Set<string>())
const pendingRemoveItem = ref<FridgeItem | null>(null)
const removingFridge = ref(false)

const selectedIng = ref<Ingredient | null>(null)
const drawerOpen = ref(false)
const editForm = ref({ name: '', category: '', family: '' })
const saving = ref(false)
const saveError = ref('')
const drawerImageFailed = ref(false)
const lineArtImageErrors = ref<Record<string, boolean>>({})

const generating = ref<Record<string, string>>({})
const batchGenerating = ref(false)
const batchProgress = ref({ current: 0, total: 0 })
const activeJobs = ref(new Map<string, { ingredientName: string; ingredientId: string }>())
const lineArtErrors = ref<Record<string, string>>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

const storageZoneMeta: Record<StorageZone, { label: string; icon: string; tone: string; empty: string }> = {
  refrigerated: { label: '冷藏', icon: '🧊', tone: 'border-cyan-200 bg-cyan-50 text-cyan-800', empty: '冷藏区空空的，该去采购了' },
  frozen: { label: '冷冻', icon: '❄️', tone: 'border-blue-200 bg-blue-50 text-blue-800', empty: '冷冻区暂时是空的' },
  room_temp: { label: '常温', icon: '🌡️', tone: 'border-amber-200 bg-amber-50 text-amber-900', empty: '常温区还没有东西' },
}

const zoneList = (zone: StorageZone) => zone === 'frozen' ? fridgeFrozen : zone === 'room_temp' ? fridgeRoomTemp : fridgeRefrigerated
const storageGroups = computed<Record<StorageZone, FridgeItem[]>>(() => ({ frozen: fridgeFrozen.value, refrigerated: fridgeRefrigerated.value, room_temp: fridgeRoomTemp.value }))
const storageItems = computed(() => [...fridgeRefrigerated.value, ...fridgeFrozen.value, ...fridgeRoomTemp.value])
const storageTotal = computed(() => storageItems.value.length)
const storageMap = computed(() => new Map(storageItems.value.map(item => [item.name, item.zone as StorageZone])))
const storageItemMap = computed(() => new Map(storageItems.value.map(item => [item.name, item])))
const activeMobileStorageItems = computed(() => storageGroups.value[activeMobileStorageZone.value])

const formatAddedDate = (value?: string | Date | null) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const expiryStatus = (value?: string | Date | null): ExpiryInfo => {
  if (!value) return null
  const expiry = new Date(value)
  if (Number.isNaN(expiry.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: '已过期', tone: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]', urgent: true }
  if (diff === 0) return { label: '今天到期', tone: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]', urgent: true }
  if (diff <= 3) return { label: diff + ' 天后到期', tone: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]', urgent: true }
  return null
}
const expiringCount = computed(() => storageItems.value.filter(item => expiryStatus(item.expiryDate)?.urgent).length)

const categories = computed(() => {
  const counts = new Map<string, number>()
  for (const ingredient of ingredientsList.value) {
    const category = ingredient.category || '其他'
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
})

const filteredIngredients = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return ingredientsList.value
    .filter(ingredient => !query || ingredient.name.toLowerCase().includes(query) || (ingredient.category || '').toLowerCase().includes(query))
    .filter(ingredient => !activeCategory.value || (ingredient.category || '其他') === activeCategory.value)
    .filter(ingredient => lineArtFilter.value === 'all' || (lineArtFilter.value === 'has' ? Boolean(ingredient.lineArtUrl) : !ingredient.lineArtUrl))
    .slice()
    .sort((a, b) => sortBy.value === 'count' ? b.recipeCount - a.recipeCount : sortBy.value === 'category' ? (a.category || '').localeCompare(b.category || '', 'zh-CN') : a.name.localeCompare(b.name, 'zh-CN'))
})
const missingLineArtCount = computed(() => ingredientsList.value.filter(ingredient => !ingredient.lineArtUrl).length)
const relatedRecipes = computed(() => {
  if (!selectedIng.value) return []
  return recipes.value.filter(recipe => recipe.ingredients?.some(item => item.name === selectedIng.value?.name)).slice(0, 12)
})

const setInventory = (inventory: Awaited<ReturnType<typeof getFridge>>) => {
  fridgeFrozen.value = inventory.frozen || []
  fridgeRefrigerated.value = inventory.refrigerated || []
  fridgeRoomTemp.value = inventory.room_temp || []
}

const loadPage = async () => {
  loading.value = true
  loadError.value = ''
  fridgeError.value = ''
  const [ingredientResult, fridgeResult, recipeResult] = await Promise.allSettled([
    $fetch<Ingredient[]>('/api/ingredients'),
    getFridge(),
    getRecipes(),
  ])
  if (ingredientResult.status === 'fulfilled') ingredientsList.value = ingredientResult.value
  else loadError.value = getApiErrorMessage(ingredientResult.reason, '食材库没有加载出来。')
  if (fridgeResult.status === 'fulfilled') setInventory(fridgeResult.value)
  else fridgeError.value = getApiErrorMessage(fridgeResult.reason, '家中库存没有加载出来。')
  if (recipeResult.status === 'fulfilled') recipes.value = recipeResult.value
  if (ingredientResult.status === 'fulfilled') await restoreLineArtJobs()
  loading.value = false
}

watch(activeMobileStorageZone, zone => { newFridgeItem.value.zone = zone })

const clearFilters = () => {
  searchQuery.value = ''
  activeCategory.value = ''
  lineArtFilter.value = 'all'
  sortBy.value = 'count'
}

const openDrawer = (ingredient: Ingredient) => {
  selectedIng.value = ingredient
  editForm.value = { name: ingredient.name, category: ingredient.category || '', family: ingredient.family || '' }
  saveError.value = ''
  drawerImageFailed.value = false
  lineArtImageErrors.value = {}
  drawerOpen.value = true
}
const closeDrawer = () => { drawerOpen.value = false; selectedIng.value = null; saveError.value = '' }

const saveIngredient = async () => {
  if (!selectedIng.value || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateIngredient(selectedIng.value.id, editForm.value)
    const index = ingredientsList.value.findIndex(item => item.id === updated.id)
    if (index >= 0) ingredientsList.value[index] = { ...ingredientsList.value[index], ...updated }
    selectedIng.value = { ...selectedIng.value, ...updated }
    toast.success('食材信息已保存。')
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, '食材信息没有保存成功。')
  } finally {
    saving.value = false
  }
}

const getLineArtUrls = (ingredient?: Ingredient | null): string[] => {
  const raw = ingredient?.lineArtUrl
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [raw]
  } catch {
    return [raw]
  }
}
const primaryLineArt = computed(() => drawerImageFailed.value ? '' : (getLineArtUrls(selectedIng.value)[0] || ''))

const selectLineArt = async (ingredient: Ingredient, url: string) => {
  const allUrls = getLineArtUrls(ingredient)
  const reordered = [url, ...allUrls.filter(item => item !== url)]
  const lineArtUrl = reordered.length > 1 ? JSON.stringify(reordered) : url
  try {
    const updated = await updateIngredient(ingredient.id, { lineArtUrl })
    const index = ingredientsList.value.findIndex(item => item.id === ingredient.id)
    if (index >= 0) ingredientsList.value[index] = { ...ingredientsList.value[index], ...updated, lineArtUrl }
    if (selectedIng.value?.id === ingredient.id) selectedIng.value = { ...selectedIng.value, ...updated, lineArtUrl }
    drawerImageFailed.value = false
    toast.success('主配图已更新。')
  } catch (error: unknown) {
    toast.error(getApiErrorMessage(error, '主配图没有保存成功。'))
  }
}

const updateIngredientLineArt = (ingredientId: string, imageUrls: string[]) => {
  const lineArtUrl = JSON.stringify(imageUrls)
  const index = ingredientsList.value.findIndex(item => item.id === ingredientId)
  const current = ingredientsList.value[index]
  if (current) ingredientsList.value[index] = { ...current, lineArtUrl }
  if (selectedIng.value?.id === ingredientId) selectedIng.value = { ...selectedIng.value, lineArtUrl }
}

const stopPolling = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
const startPolling = () => {
  if (pollTimer || !activeJobs.value.size) return
  pollTimer = setInterval(async () => {
    if (!activeJobs.value.size) { stopPolling(); return }
    for (const [jobId, info] of [...activeJobs.value.entries()]) {
      try {
        const result = await checkLineArtJob(jobId)
        if (result.status === 'done' && result.imageUrls?.length) {
          generating.value[info.ingredientName] = 'done'
          updateIngredientLineArt(info.ingredientId, result.imageUrls)
          delete lineArtErrors.value[info.ingredientName]
          activeJobs.value.delete(jobId)
          toast.success(info.ingredientName + '的配图生成完成。')
        } else if (result.status === 'failed') {
          generating.value[info.ingredientName] = 'failed'
          lineArtErrors.value[info.ingredientName] = result.error || '线稿生成失败，可以重试。'
          activeJobs.value.delete(jobId)
        }
      } catch (error: unknown) {
        generating.value[info.ingredientName] = 'failed'
        lineArtErrors.value[info.ingredientName] = getApiErrorMessage(error, '线稿任务状态获取失败，可以重试。')
        activeJobs.value.delete(jobId)
      }
    }
  }, 3000)
}

const restoreLineArtJobs = async () => {
  const ids = ingredientsList.value.map(item => item.id)
  if (!ids.length) return
  try {
    const jobs = await getLineArtJobs(ids)
    for (const job of jobs) {
      if (!job.ingredientId) continue
      const ingredient = ingredientsList.value.find(item => item.id === job.ingredientId)
      if (!ingredient) continue
      if ((job.status === 'pending' || job.status === 'polling') && !ingredient.lineArtUrl) {
        activeJobs.value.set(job.id, { ingredientName: ingredient.name, ingredientId: ingredient.id })
        generating.value[ingredient.name] = 'polling'
      } else if (job.status === 'done' && job.imageUrls?.length && !ingredient.lineArtUrl) {
        generating.value[ingredient.name] = 'done'
        updateIngredientLineArt(ingredient.id, job.imageUrls)
      } else if (job.status === 'failed' && !ingredient.lineArtUrl) {
        generating.value[ingredient.name] = 'failed'
        lineArtErrors.value[ingredient.name] = job.error || '线稿生成失败，可以重试。'
      }
    }
    startPolling()
  } catch {
    // 线稿任务恢复是可降级能力，不影响库存与食材浏览。
  }
}

const generateSingle = async (ingredient: Ingredient) => {
  if (['submitting', 'polling'].includes(generating.value[ingredient.name] || '')) return
  generating.value[ingredient.name] = 'submitting'
  delete lineArtErrors.value[ingredient.name]
  try {
    const result = await generateAndSaveLineArt(ingredient.name, ingredient.id)
    if (result.status === 'already_exists' && result.imageUrls?.length) {
      generating.value[ingredient.name] = 'done'
      updateIngredientLineArt(ingredient.id, result.imageUrls)
      toast.success('已有配图已恢复。')
    } else if (result.jobId) {
      activeJobs.value.set(result.jobId, { ingredientName: ingredient.name, ingredientId: ingredient.id })
      generating.value[ingredient.name] = 'polling'
      startPolling()
      toast.show('配图已开始生成，可以先做别的。')
    } else if (result.status === 'already_running') {
      generating.value[ingredient.name] = 'polling'
      toast.show('这张配图已经在生成中。')
    } else {
      generating.value[ingredient.name] = 'failed'
      lineArtErrors.value[ingredient.name] = '线稿生成失败，可以重试。'
    }
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, '线稿生成失败，可以重试。')
    generating.value[ingredient.name] = message.includes('配额') || message.includes('429') ? 'quota' : 'failed'
    lineArtErrors.value[ingredient.name] = message
  }
}

const batchGenerateMissing = async () => {
  const missing = ingredientsList.value.filter(item => !item.lineArtUrl)
  if (!missing.length || batchGenerating.value) return
  batchGenerating.value = true
  batchProgress.value = { current: 0, total: missing.length }
  await Promise.all(missing.map(async ingredient => {
    try {
      const result = await generateAndSaveLineArt(ingredient.name, ingredient.id)
      if (result.status === 'already_exists' && result.imageUrls?.length) updateIngredientLineArt(ingredient.id, result.imageUrls)
      else if (result.jobId) {
        activeJobs.value.set(result.jobId, { ingredientName: ingredient.name, ingredientId: ingredient.id })
        generating.value[ingredient.name] = 'polling'
      } else generating.value[ingredient.name] = result.status === 'already_running' ? 'polling' : 'failed'
    } catch (error: unknown) {
      generating.value[ingredient.name] = 'failed'
      lineArtErrors.value[ingredient.name] = getApiErrorMessage(error, '线稿生成失败，可以重试。')
    } finally {
      batchProgress.value.current++
    }
  }))
  batchGenerating.value = false
  startPolling()
  toast.show(activeJobs.value.size ? '批量任务已提交，可以离开页面。' : '批量处理已完成。')
}

const addLocalFridgeItem = (item: FridgeItem) => zoneList(item.zone as StorageZone).value.unshift(item)
const removeLocalFridgeItem = (item: FridgeItem) => {
  const list = zoneList(item.zone as StorageZone)
  list.value = list.value.filter(existing => existing.id !== item.id)
}
const setNameBusy = (name: string, busy: boolean) => {
  const next = new Set(fridgeBusyNames.value)
  if (busy) next.add(name); else next.delete(name)
  fridgeBusyNames.value = next
}

const quickStore = async (ingredient: Ingredient, zone: StorageZone) => {
  if (fridgeBusyNames.value.has(ingredient.name)) return
  setNameBusy(ingredient.name, true)
  const existing = storageItemMap.value.get(ingredient.name)
  try {
    if (existing?.zone === zone) {
      await removeFridgeItem(existing.id)
      removeLocalFridgeItem(existing)
      toast.success(ingredient.name + '已移出' + storageZoneMeta[zone].label + '。')
      return
    }
    if (existing) {
      await removeFridgeItem(existing.id)
      removeLocalFridgeItem(existing)
    }
    try {
      const added = await addFridgeItem({ name: ingredient.name, amount: existing?.amount || '', zone, expiryDate: existing?.expiryDate || undefined })
      addLocalFridgeItem(added)
      toast.success(ingredient.name + '已放入' + storageZoneMeta[zone].label + '。')
    } catch (error: unknown) {
      if (existing) {
        try { addLocalFridgeItem(await addFridgeItem({ name: existing.name, amount: existing.amount || '', zone: existing.zone, expiryDate: existing.expiryDate || undefined })) } catch { /* 回滚失败会在刷新后恢复真实状态 */ }
      }
      throw error
    }
  } catch (error: unknown) {
    toast.error(getApiErrorMessage(error, '库存没有更新成功。'))
  } finally {
    setNameBusy(ingredient.name, false)
  }
}

const handleAddFridge = async () => {
  const name = newFridgeItem.value.name.trim()
  if (!name || addingFridge.value) { fridgeFormError.value = name ? '' : '请先填写食材名称。'; return }
  addingFridge.value = true
  fridgeFormError.value = ''
  try {
    const item = await addFridgeItem({ name, amount: newFridgeItem.value.amount.trim(), zone: newFridgeItem.value.zone, expiryDate: newFridgeItem.value.expiryDate || undefined })
    addLocalFridgeItem(item)
    activeMobileStorageZone.value = newFridgeItem.value.zone
    newFridgeItem.value = { name: '', amount: '', zone: newFridgeItem.value.zone, expiryDate: '' }
    toast.success(name + '已加入库存。')
  } catch (error: unknown) {
    fridgeFormError.value = getApiErrorMessage(error, '食材没有加入库存。')
  } finally {
    addingFridge.value = false
  }
}

const requestRemoveFridge = (item: FridgeItem) => { pendingRemoveItem.value = item }
const confirmRemoveFridge = async () => {
  const item = pendingRemoveItem.value
  if (!item || removingFridge.value) return
  removingFridge.value = true
  try {
    await removeFridgeItem(item.id)
    removeLocalFridgeItem(item)
    pendingRemoveItem.value = null
    toast.success(item.name + '已移出库存。')
  } catch (error: unknown) {
    toast.error(getApiErrorMessage(error, '食材没有移出库存。'))
  } finally {
    removingFridge.value = false
  }
}

onMounted(() => { void loadPage() })
onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="食材与库存" eyebrow="家里有什么" description="先看冷藏、冷冻、常温和临期，再浏览食材资料。">
      <template #actions>
        <div v-if="activeJobs.size" class="flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-warning-soft)] px-4 text-xs font-semibold text-[var(--color-warning)]" role="status">
          <span class="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true"></span>{{ activeJobs.size }} 个配图生成中
        </div>
      </template>
    </PageHeader>

    <AppNotice v-if="fridgeError" class="mb-5" tone="warning" title="库存暂时不可用" :message="fridgeError"><AppButton class="mt-3" variant="secondary" @click="loadPage">重新加载</AppButton></AppNotice>

    <section data-testid="mobile-storage-summary" class="mb-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] lg:hidden">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">家里现有</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ storageTotal }} 件库存<span v-if="expiringCount">，{{ expiringCount }} 件临期</span></p></div>
        <span v-if="expiringCount" class="rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-warning)]">先用临期</span>
      </div>

      <div class="mb-4 grid grid-cols-3 gap-2" role="tablist" aria-label="库存位置">
        <button v-for="zone in (['refrigerated', 'frozen', 'room_temp'] as const)" :key="zone" class="min-h-14 rounded-[var(--radius-md)] border px-2 py-2 text-left transition" :class="activeMobileStorageZone === zone ? storageZoneMeta[zone].tone : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]'" role="tab" :aria-selected="activeMobileStorageZone === zone" @click="activeMobileStorageZone = zone">
          <span class="block text-sm font-semibold">{{ storageZoneMeta[zone].icon }} {{ storageZoneMeta[zone].label }}</span><span class="mt-1 block font-mono text-xs tabular-nums">{{ storageGroups[zone].length }} 件</span>
        </button>
      </div>

      <form class="mb-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)] p-3" @submit.prevent="handleAddFridge">
        <h3 class="mb-3 text-sm font-semibold text-[var(--color-text)]">快速加入库存</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2"><label for="mobile-fridge-name" class="field-label">食材名称</label><input id="mobile-fridge-name" v-model="newFridgeItem.name" class="field-control" autocomplete="off" placeholder="例如：番茄" /></div>
          <div><label for="mobile-fridge-amount" class="field-label">数量</label><input id="mobile-fridge-amount" v-model="newFridgeItem.amount" class="field-control" placeholder="例如：3 个" /></div>
          <div><label for="mobile-fridge-zone" class="field-label">存放位置</label><select id="mobile-fridge-zone" v-model="newFridgeItem.zone" class="field-control"><option value="refrigerated">冷藏</option><option value="frozen">冷冻</option><option value="room_temp">常温</option></select></div>
          <div class="col-span-2"><label for="mobile-fridge-expiry" class="field-label">到期日期（可选）</label><input id="mobile-fridge-expiry" v-model="newFridgeItem.expiryDate" type="date" class="field-control" /></div>
        </div>
        <AppNotice v-if="fridgeFormError" class="mt-3" tone="danger" :message="fridgeFormError" />
        <AppButton class="mt-3" type="submit" block :loading="addingFridge">加入{{ storageZoneMeta[newFridgeItem.zone].label }}</AppButton>
      </form>

      <div v-if="activeMobileStorageItems.length" class="max-h-72 space-y-2 overflow-y-auto pr-1">
        <article v-for="item in activeMobileStorageItems" :key="item.id" class="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2">
          <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="font-semibold text-[var(--color-text)]">{{ item.name }}</span><span v-if="item.amount" class="font-mono text-xs text-[var(--color-text-muted)]">{{ item.amount }}</span><span v-if="expiryStatus(item.expiryDate)" class="rounded-full px-2 py-1 text-[11px] font-semibold" :class="expiryStatus(item.expiryDate)?.tone">{{ expiryStatus(item.expiryDate)?.label }}</span></div><p v-if="formatAddedDate(item.addedDate)" class="mt-1 text-xs text-[var(--color-text-faint)]">{{ formatAddedDate(item.addedDate) }} 放入</p></div>
          <button class="touch-target flex shrink-0 items-center justify-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="'将' + item.name + '移出库存'" @click="requestRemoveFridge(item)"><span aria-hidden="true">×</span></button>
        </article>
      </div>
      <p v-else class="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] py-7 text-center text-sm text-[var(--color-text-muted)]">{{ storageZoneMeta[activeMobileStorageZone].empty }}</p>
    </section>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="正在加载食材"><div v-for="index in 6" :key="index" class="h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)]"></div></div>
    <AppNotice v-else-if="loadError" tone="danger" role="alert" title="食材库没有加载出来" :message="loadError"><AppButton class="mt-3" variant="secondary" @click="loadPage">重新加载</AppButton></AppNotice>

    <div v-else class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <main class="min-w-0">
        <section class="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div><label for="ingredient-search" class="field-label">搜索食材或分类</label><input id="ingredient-search" v-model="searchQuery" type="search" class="field-control" placeholder="搜索名称、分类，同时看家里有没有" /></div>
            <div><label for="ingredient-sort" class="field-label">排序</label><select id="ingredient-sort" v-model="sortBy" class="field-control min-w-32"><option value="count">常用优先</option><option value="name">按名称</option><option value="category">按分类</option></select></div>
            <div><label for="ingredient-art-filter" class="field-label">配图</label><select id="ingredient-art-filter" v-model="lineArtFilter" class="field-control min-w-32"><option value="all">全部</option><option value="has">已有配图</option><option value="missing">缺少配图</option></select></div>
          </div>
          <div class="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="食材分类筛选"><button class="min-h-11 shrink-0 rounded-full border px-4 text-sm" :class="!activeCategory ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'" @click="activeCategory = ''">全部 {{ ingredientsList.length }}</button><button v-for="category in categories" :key="category.name" class="min-h-11 shrink-0 rounded-full border border-[var(--color-border)] px-4 text-sm text-[var(--color-text-muted)]" :class="activeCategory === category.name && 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'" @click="activeCategory = category.name">{{ category.name }} {{ category.count }}</button></div>
        </section>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-2"><p class="text-sm text-[var(--color-text-muted)]">找到 <strong class="font-mono text-[var(--color-text)]">{{ filteredIngredients.length }}</strong> 种食材；卡片会直接告诉你家里有没有。</p><button v-if="searchQuery || activeCategory || lineArtFilter !== 'all' || sortBy !== 'count'" class="min-h-11 px-2 text-sm font-semibold text-[var(--color-accent)]" @click="clearFilters">清除条件</button></div>

        <div v-if="filteredIngredients.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <IngredientCard v-for="ingredient in filteredIngredients" :key="ingredient.id" :ingredient="ingredient" :in-storage="storageMap.has(ingredient.name)" :storage-zone="storageMap.get(ingredient.name)" :storage-item="storageItemMap.get(ingredient.name)" @select="openDrawer(ingredient)" @store="zone => quickStore(ingredient, zone)" />
        </div>
        <EmptyState v-else title="没有找到符合条件的食材" description="换个关键词，或清除分类和配图筛选。"><AppButton class="mt-4" variant="secondary" @click="clearFilters">清除筛选</AppButton></EmptyState>
      </main>

      <aside class="hidden space-y-4 lg:block">
        <section class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
          <div class="mb-3 flex items-center justify-between"><div><h2 class="font-serif text-lg font-semibold text-[var(--color-text)]">家里现有</h2><p class="text-xs text-[var(--color-text-muted)]">{{ storageTotal }} 件 · {{ expiringCount }} 件临期</p></div><span class="font-mono text-2xl font-semibold text-[var(--color-accent)]">{{ storageTotal }}</span></div>
          <div v-for="zone in (['refrigerated', 'frozen', 'room_temp'] as const)" :key="zone" class="border-t border-[var(--color-border)] py-3 first:border-0 first:pt-0">
            <h3 class="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">{{ storageZoneMeta[zone].icon }} {{ storageZoneMeta[zone].label }}（{{ storageGroups[zone].length }}）</h3>
            <div v-if="storageGroups[zone].length" class="space-y-1"><div v-for="item in storageGroups[zone]" :key="item.id" class="flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 hover:bg-[var(--color-bg-soft)]"><div class="min-w-0"><p class="truncate text-sm font-medium text-[var(--color-text)]">{{ item.name }} <span v-if="item.amount" class="font-mono text-xs text-[var(--color-text-muted)]">{{ item.amount }}</span></p><span v-if="expiryStatus(item.expiryDate)" class="text-[11px] font-semibold" :class="expiryStatus(item.expiryDate)?.tone.split(' ').at(-1)">{{ expiryStatus(item.expiryDate)?.label }}</span></div><button class="touch-target flex shrink-0 items-center justify-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="'将' + item.name + '移出库存'" @click="requestRemoveFridge(item)">×</button></div></div>
            <p v-else class="py-2 text-xs text-[var(--color-text-faint)]">{{ storageZoneMeta[zone].empty }}</p>
          </div>
        </section>

        <details class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <summary class="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-[var(--color-text)]">配图管理<span class="font-mono text-xs text-[var(--color-text-muted)]">缺 {{ missingLineArtCount }}</span></summary>
          <p class="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">低频管理能力。生成会在后台继续，不影响库存操作。</p>
          <AppButton class="mt-3" block variant="secondary" :loading="batchGenerating" :disabled="!missingLineArtCount" @click="batchGenerateMissing">{{ batchGenerating ? batchProgress.current + ' / ' + batchProgress.total : '补齐缺失配图' }}</AppButton>
        </details>
      </aside>
    </div>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="drawerOpen && selectedIng" class="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" :aria-label="selectedIng.name + '详情'">
          <button class="absolute inset-0 bg-black/30" aria-label="关闭食材详情" @click="closeDrawer"></button>
          <section class="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-2xl sm:max-h-none sm:max-w-lg sm:rounded-none">
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur"><div><p class="text-xs text-[var(--color-text-muted)]">食材详情</p><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">{{ selectedIng.name }}</h2></div><button class="touch-target flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]" aria-label="关闭食材详情" @click="closeDrawer">×</button></div>
            <div class="space-y-6 p-5 safe-bottom">
              <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <div class="aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)]"><img v-if="primaryLineArt" :src="primaryLineArt" :alt="selectedIng.name + '的主配图'" width="320" height="320" class="h-full w-full object-cover" @error="drawerImageFailed = true" /><HandDrawnPlaceholder v-else :tags="[selectedIng.name]" :alt="`${selectedIng.name}的手绘占位图`" class="h-full w-full" /></div>
                <div class="space-y-3"><div><label for="ingredient-edit-name" class="field-label">名称</label><input id="ingredient-edit-name" v-model="editForm.name" class="field-control" /></div><div><label for="ingredient-edit-category" class="field-label">分类</label><input id="ingredient-edit-category" v-model="editForm.category" class="field-control" /></div><div><label for="ingredient-edit-family" class="field-label">科属（可选）</label><input id="ingredient-edit-family" v-model="editForm.family" class="field-control" /></div></div>
              </div>
              <AppNotice v-if="saveError" tone="danger" :message="saveError" />
              <AppButton block :loading="saving" @click="saveIngredient">保存食材信息</AppButton>

              <details class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                <summary class="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-[var(--color-text)]">配图与线稿<span class="text-xs font-normal text-[var(--color-text-muted)]">{{ getLineArtUrls(selectedIng).length ? getLineArtUrls(selectedIng).length + ' 张' : '未生成' }}</span></summary>
                <div v-if="getLineArtUrls(selectedIng).length > 1" class="mt-3 grid grid-cols-4 gap-2"><button v-for="(url, index) in getLineArtUrls(selectedIng)" :key="url" class="aspect-square min-h-11 overflow-hidden rounded-[var(--radius-md)] border-2 bg-white" :class="index === 0 ? 'border-[var(--color-accent)]' : 'border-transparent hover:border-[var(--color-border-strong)]'" :aria-label="index === 0 ? '当前主配图' : '设为主配图'" @click="selectLineArt(selectedIng, url)"><img v-if="!lineArtImageErrors[url]" :src="url" :alt="selectedIng.name + '的候选配图 ' + (index + 1)" width="120" height="120" class="h-full w-full object-cover" @error="lineArtImageErrors[url] = true" /><span v-else class="text-xs text-[var(--color-text-faint)]">图片失效</span></button></div>
                <AppButton class="mt-3" block variant="secondary" :loading="['submitting', 'polling'].includes(generating[selectedIng.name] || '')" :disabled="generating[selectedIng.name] === 'quota'" @click="generateSingle(selectedIng)">{{ generating[selectedIng.name] === 'polling' ? '生成中，可离开页面' : generating[selectedIng.name] === 'quota' ? '今日配额已用完' : getLineArtUrls(selectedIng).length ? '重新生成候选图' : '生成配图' }}</AppButton>
                <AppNotice v-if="lineArtErrors[selectedIng.name]" class="mt-3" tone="warning" :message="lineArtErrors[selectedIng.name]" />
              </details>

              <section><h3 class="font-serif text-lg font-semibold text-[var(--color-text)]">用到它的菜谱</h3><div v-if="relatedRecipes.length" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><NuxtLink v-for="recipe in relatedRecipes" :key="recipe.id" :to="'/recipes/' + recipe.id" class="min-h-16 rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-3 hover:bg-[var(--color-accent-soft)]"><p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ recipe.name }}</p><p class="mt-1 font-mono text-xs text-[var(--color-text-muted)]">{{ recipe.score ? '⭐ ' + recipe.score : '还未评分' }}</p></NuxtLink></div><p v-else class="mt-2 text-sm text-[var(--color-text-muted)]">这个食材还没出现在任何菜谱里。</p></section>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog :open="Boolean(pendingRemoveItem)" :title="pendingRemoveItem ? '将' + pendingRemoveItem.name + '移出库存？' : '移出库存？'" description="这只会移除库存记录，不会删除食材或菜谱。" confirm-label="移出库存" danger :busy="removingFridge" @confirm="confirmRemoveFridge" @cancel="pendingRemoveItem = null" />
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active { transition: opacity var(--duration-normal) var(--ease-standard); }
.drawer-enter-active section,
.drawer-leave-active section { transition: transform var(--duration-normal) var(--ease-standard); }
.drawer-enter-from,
.drawer-leave-to { opacity: 0; }
.drawer-enter-from section,
.drawer-leave-to section { transform: translateY(100%); }
@media (min-width: 640px) {
  .drawer-enter-from section,
  .drawer-leave-to section { transform: translateX(100%); }
}
</style>
