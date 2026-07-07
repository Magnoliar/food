<script setup lang="ts">
import type { CookLog, Recipe, RecipeIngredient } from '~/types'

type PosterTemplate = 'checkin' | 'ingredients' | 'reflection'
type PosterRatio = '4:5' | '3:4'

interface PosterIngredient extends RecipeIngredient {
  imageUrl?: string | null
}

interface PosterRecipeViewModel {
  recipeId: string
  recipeName: string
  description: string
  steps: string[]
  ingredients: PosterIngredient[]
  dishPhotoUrl: string | null
  latestCookLog: CookLog | null
  rating: number
  note: string
  date: string
}

const { getRecipes, getCookLogs } = useApi()

const recipes = ref<Recipe[]>([])
const cookLogs = ref<CookLog[]>([])
const selectedRecipeId = ref('')
const selectedCookLogId = ref('')
const selectedTemplate = ref<PosterTemplate>('checkin')
const selectedRatio = ref<PosterRatio>('4:5')
const posterRef = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const isExporting = ref(false)
const loadError = ref('')
const imageLoadErrors = ref<Record<string, boolean>>({})
const recipeSearch = ref('')
const recipeDropdownOpen = ref(false)

const filteredRecipes = computed(() => {
  const q = recipeSearch.value.trim().toLowerCase()
  if (!q) return recipes.value
  return recipes.value.filter(r => r.name.toLowerCase().includes(q))
})

const selectedRecipeName = computed(() => {
  return recipes.value.find(r => r.id === selectedRecipeId.value)?.name || ''
})

const selectRecipe = (id: string) => {
  selectedRecipeId.value = id
  recipeSearch.value = ''
  recipeDropdownOpen.value = false
}

const onRecipeSearchFocus = () => {
  recipeDropdownOpen.value = true
  recipeSearch.value = selectedRecipeName.value
}

const onRecipeSearchBlur = () => {
  setTimeout(() => { recipeDropdownOpen.value = false }, 150)
}
const viewportWidth = ref(1024)
const pointerStartX = ref(0)
const pointerStartY = ref(0)
const isPointerDown = ref(false)

const templates = [
  { key: 'checkin' as const, label: '今日打卡', desc: '成品实拍 + 食材小圆卡' },
  { key: 'ingredients' as const, label: '食材准备', desc: '食材速览 + 做法步骤' },
  { key: 'reflection' as const, label: '饭后复盘', desc: '饭后照片和一点复盘' },
]

const templateKeys = computed(() => templates.map(template => template.key))
const selectedTemplateIndex = computed(() => Math.max(0, templateKeys.value.indexOf(selectedTemplate.value)))
const currentTemplate = computed(() => templates[selectedTemplateIndex.value] || templates[0])
const ratioSize = computed(() => selectedRatio.value === '4:5' ? { w: 640, h: 800 } : { w: 600, h: 800 })
const previewScale = computed(() => Math.min(1, Math.max(0.48, (viewportWidth.value - 48) / ratioSize.value.w)))

const formatDate = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('zh-CN')
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const firstUrl = (value: unknown): string | null => {
  if (!value) return null
  if (Array.isArray(value)) return typeof value[0] === 'string' && value[0].trim() ? value[0] : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
    } catch {
      return null
    }
  }
  return trimmed
}

const normalizeStep = (step: unknown) => {
  if (typeof step === 'string') return step
  if (step && typeof step === 'object') {
    const maybeStep = step as { text?: string; content?: string; description?: string }
    return maybeStep.text || maybeStep.content || maybeStep.description || ''
  }
  return ''
}

const averageScore = (log: CookLog | null, recipe: Recipe | undefined) => {
  const scores = [log?.selfScore, log?.partnerScore].filter((score): score is number => typeof score === 'number')
  if (scores.length) return scores.reduce((sum, score) => sum + score, 0) / scores.length
  return recipe?.score || 0
}

const selectedRecipe = computed(() => recipes.value.find(recipe => recipe.id === selectedRecipeId.value) || recipes.value[0])

const recipeCookLogs = computed(() => {
  const recipeId = selectedRecipe.value?.id
  if (!recipeId) return []
  return cookLogs.value
    .filter(log => log.recipeId === recipeId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const selectedCookLog = computed(() => {
  return recipeCookLogs.value.find(log => log.id === selectedCookLogId.value) || recipeCookLogs.value[0] || null
})

const viewModel = computed<PosterRecipeViewModel | null>(() => {
  const recipe = selectedRecipe.value
  if (!recipe) return null

  const log = selectedCookLog.value
  const rating = averageScore(log, recipe)
  const note = log?.notes || log?.selfComment || log?.partnerComment || ''
  const ingredients = (recipe.ingredients || []).map(ingredient => ({
    ...ingredient,
    imageUrl: firstUrl((ingredient as RecipeIngredient & { lineArtUrl?: string }).lineArtUrl),
  }))

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    description: recipe.description || '',
    steps: (recipe.steps || []).map(normalizeStep).filter(Boolean),
    ingredients,
    dishPhotoUrl: firstUrl(log?.photos) || firstUrl(recipe.coverPhotoUrl),
    latestCookLog: log,
    rating,
    note,
    date: formatDate(log?.date),
  }
})

const checkinIngredients = computed(() => viewModel.value?.ingredients.slice(0, 6) || [])
const hiddenCheckinIngredientCount = computed(() => Math.max(0, (viewModel.value?.ingredients.length || 0) - checkinIngredients.value.length))
const visibleIngredients = computed(() => viewModel.value?.ingredients.slice(0, 8) || [])
const hiddenIngredientCount = computed(() => Math.max(0, (viewModel.value?.ingredients.length || 0) - visibleIngredients.value.length))
const visibleSteps = computed(() => viewModel.value?.steps.slice(0, 6) || [])
const logPhotos = computed(() => selectedCookLog.value?.photos?.slice(0, 4) || [])
const selectedStars = computed(() => Math.max(0, Math.min(5, Math.round((viewModel.value?.rating || 0) / 2))))
const ratingText = computed(() => viewModel.value?.rating ? `${viewModel.value.rating.toFixed(1)} / 10` : '还没评分')

const recipeEditUrl = computed(() => viewModel.value ? `/recipes/${viewModel.value.recipeId}` : '/recipes')
const cookLogCreateUrl = computed(() => viewModel.value ? `/cook-logs?create=1&recipeId=${viewModel.value.recipeId}` : '/cook-logs')
const cookLogEditUrl = computed(() => viewModel.value?.latestCookLog
  ? `/cook-logs?editLog=${viewModel.value.latestCookLog.id}`
  : cookLogCreateUrl.value
)

const completionActions = computed(() => {
  if (!viewModel.value) return []
  const actions: Array<{ key: string; label: string; to: string; needed: boolean }> = [
    { key: 'cover', label: '补成品照', to: `${recipeEditUrl.value}?edit=cover`, needed: !viewModel.value.dishPhotoUrl },
    { key: 'ingredients', label: '补食材', to: `${recipeEditUrl.value}?edit=ingredients`, needed: viewModel.value.ingredients.length === 0 },
    { key: 'steps', label: '补步骤', to: `${recipeEditUrl.value}?edit=steps`, needed: viewModel.value.steps.length === 0 },
    { key: 'log', label: '补做饭记录', to: cookLogCreateUrl.value, needed: !viewModel.value.latestCookLog },
    { key: 'photos', label: '补照片', to: cookLogEditUrl.value, needed: Boolean(viewModel.value.latestCookLog) && logPhotos.value.length === 0 },
    { key: 'rating', label: '补评分', to: cookLogEditUrl.value, needed: !viewModel.value.rating },
    { key: 'note', label: '补复盘', to: cookLogEditUrl.value, needed: Boolean(viewModel.value.latestCookLog) && !viewModel.value.note },
  ]

  return [
    ...actions.filter(action => action.needed),
    { key: 'recipe', label: '编辑菜谱', to: recipeEditUrl.value, needed: false },
    { key: 'record', label: viewModel.value.latestCookLog ? '编辑记录' : '记一顿', to: cookLogEditUrl.value, needed: false },
  ].slice(0, 6)
})

const imageFailed = (key: string) => Boolean(imageLoadErrors.value[key])
const markImageFailed = (key: string) => { imageLoadErrors.value[key] = true }

const switchTemplate = (direction: 1 | -1) => {
  const keys = templateKeys.value
  if (!keys.length) return
  const nextIndex = (selectedTemplateIndex.value + direction + keys.length) % keys.length
  selectedTemplate.value = keys[nextIndex] || 'checkin'
}

const resolveSwipe = (deltaX: number, deltaY: number) => {
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return
  switchTemplate(deltaX < 0 ? 1 : -1)
}

const handlePointerDown = (event: PointerEvent) => {
  pointerStartX.value = event.clientX
  pointerStartY.value = event.clientY
  isPointerDown.value = true
}

const handlePointerEnd = (event: PointerEvent) => {
  if (!isPointerDown.value) return
  isPointerDown.value = false
  resolveSwipe(event.clientX - pointerStartX.value, event.clientY - pointerStartY.value)
}

const handlePointerCancel = () => {
  isPointerDown.value = false
}

watch(selectedRecipeId, () => {
  selectedCookLogId.value = ''
  imageLoadErrors.value = {}
})

watch(selectedTemplate, () => {
  imageLoadErrors.value = {}
})

const loadPosterData = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const [recipeData, logData] = await Promise.all([
      getRecipes() as Promise<Recipe[]>,
      getCookLogs() as Promise<CookLog[]>,
    ])
    recipes.value = recipeData
    cookLogs.value = logData
    selectedRecipeId.value = selectedRecipeId.value || recipeData[0]?.id || ''
  } catch {
    loadError.value = '打卡数据暂时没有加载成功，稍后再试一次。'
  } finally {
    isLoading.value = false
  }
}

const updateViewport = () => {
  if (import.meta.client) viewportWidth.value = window.innerWidth
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  loadPosterData()
})

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('resize', updateViewport)
})

const safeFileName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-')

const exportPoster = async () => {
  if (!posterRef.value || !viewModel.value) return
  isExporting.value = true
  try {
    const { default: html2canvas } = await import('html2canvas-pro')
    const canvas = await html2canvas(posterRef.value, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
    })
    const link = document.createElement('a')
    link.download = `zhuzhu-home-kitchen-${safeFileName(viewModel.value.recipeName)}-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch {
    loadError.value = '导出没有成功，请确认图片已经加载完成后再试。'
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in pb-20 lg:pb-0" data-testid="poster-page">
    <div class="mb-6 lg:mb-8">
      <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Check-in</p>
      <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">打卡生成</h1>
      <p class="mt-2 text-sm text-[#8B7D6B]">做过的菜，选一张好看的卡片。</p>
    </div>

    <div v-if="isLoading" class="rounded-lg border border-dashed border-[#D8C9B8] bg-white/60 px-6 py-10 text-center text-sm text-[#8B7D6B]">
      正在准备打卡卡片...
    </div>

    <div v-else-if="loadError" class="rounded-lg border border-[#E5B5A8] bg-[#FFF4F0] px-6 py-5 text-sm text-[#8B4E3F]">
      {{ loadError }}
    </div>

    <div v-else-if="!viewModel" class="rounded-lg border border-dashed border-[#D8C9B8] bg-white/60 px-6 py-10 text-center">
      <p class="font-serif text-xl text-[#2C2825]">还没有可以生成打卡的菜谱</p>
      <p class="mt-2 text-sm text-[#8B7D6B]">做一道菜之后就可以生成打卡卡片啦。</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
      <section class="flex flex-col items-center lg:items-start">
        <div class="relative">
          <button
            type="button"
            class="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E3D6C8] bg-white/95 text-[#3D3530] shadow-sm transition-all hover:-translate-x-[55%] hover:bg-[#3D3530] hover:text-white md:flex"
            aria-label="上一张卡片"
            data-testid="poster-prev-template"
            @click="switchTemplate(-1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <button
            type="button"
            class="absolute right-0 top-1/2 z-20 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E3D6C8] bg-white/95 text-[#3D3530] shadow-sm transition-all hover:translate-x-[55%] hover:bg-[#3D3530] hover:text-white md:flex"
            aria-label="下一张卡片"
            data-testid="poster-next-template"
            @click="switchTemplate(1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <div
            class="poster-preview-shell"
            :style="{ width: `${ratioSize.w * previewScale}px`, height: `${ratioSize.h * previewScale}px` }"
            @pointerdown.passive="handlePointerDown"
            @pointerup.passive="handlePointerEnd"
            @pointercancel.passive="handlePointerCancel"
          >
            <div
              ref="posterRef"
              class="poster-card relative overflow-hidden bg-[#FAF6F0] text-[#2C2825]"
              :style="{
                width: `${ratioSize.w}px`,
                height: `${ratioSize.h}px`,
                transform: `scale(${previewScale})`,
              }"
            >
            <div class="absolute inset-0 opacity-25 pointer-events-none paper-texture"></div>

            <div v-if="selectedTemplate === 'checkin'" class="relative z-10 h-full flex flex-col p-8">
              <div class="flex items-start justify-between text-xs text-[#8B7D6B]">
                <span class="font-mono uppercase tracking-[0.18em]">Today</span>
                <span>{{ viewModel.date }}</span>
              </div>

              <div class="mt-6 aspect-[4/3] overflow-hidden rounded-lg bg-[#E9DFD4] shadow-sm">
                <img
                  v-if="viewModel.dishPhotoUrl && !imageFailed('dish-cover')"
                  :src="viewModel.dishPhotoUrl"
                  :alt="viewModel.recipeName"
                  class="h-full w-full object-cover"
                  crossorigin="anonymous"
                  @error="markImageFailed('dish-cover')"
                >
                <div v-else class="h-full w-full flex flex-col items-center justify-center bg-[#EFE6DA] text-[#9A806B]">
                  <span class="font-serif text-7xl">{{ viewModel.recipeName.slice(0, 1) }}</span>
                  <span class="mt-3 text-sm">还没有成品照呢</span>
                </div>
              </div>

              <div class="flex-1 flex flex-col justify-center text-center">
                <h2 class="font-serif text-5xl leading-tight font-bold text-[#1a1714] break-words">{{ viewModel.recipeName }}</h2>

                <div class="mt-6 flex items-center justify-center gap-1" :aria-label="ratingText">
                  <span v-for="n in 5" :key="n" class="text-2xl" :class="n <= selectedStars ? 'text-[#D6A13D]' : 'text-[#D9CEC0]'">&#9733;</span>
                  <span class="ml-3 font-mono text-sm text-[#8B7D6B]">{{ ratingText }}</span>
                </div>

                <div v-if="checkinIngredients.length" class="mt-7 flex flex-wrap items-start justify-center gap-3">
                  <div v-for="ing in checkinIngredients" :key="ing.ingredientId || ing.name" class="w-16 text-center">
                    <div class="mx-auto h-12 w-12 rounded-full border border-white bg-white/85 shadow-sm overflow-hidden flex items-center justify-center">
                      <img
                        v-if="ing.imageUrl && !imageFailed(`checkin-ingredient-${ing.name}`)"
                        :src="ing.imageUrl"
                        :alt="ing.name"
                        class="h-full w-full object-cover"
                        crossorigin="anonymous"
                        @error="markImageFailed(`checkin-ingredient-${ing.name}`)"
                      >
                      <span v-else class="font-serif text-lg text-[#8B7D6B]">{{ ing.name.slice(0, 1) }}</span>
                    </div>
                    <p class="mt-1 text-[11px] font-medium text-[#5F5145] truncate">{{ ing.name }}</p>
                  </div>
                  <div v-if="hiddenCheckinIngredientCount" class="w-16 text-center">
                    <div class="mx-auto h-12 w-12 rounded-full bg-[#3D3530] text-white flex items-center justify-center font-mono text-sm shadow-sm">
                      +{{ hiddenCheckinIngredientCount }}
                    </div>
                    <p class="mt-1 text-[11px] text-[#8B7D6B]">还有</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-[#E3D6C8] pt-4">
                <p class="font-serif text-sm text-[#5B4A3D]">猪猪家的厨房</p>
                <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A69080]">Zhuzhu's Home Kitchen</p>
              </div>
            </div>

            <div v-else-if="selectedTemplate === 'ingredients'" class="relative z-10 h-full flex flex-col p-8">
              <div class="flex items-center gap-4">
                <div class="h-28 w-28 overflow-hidden rounded-lg bg-[#E9DFD4] flex-shrink-0">
                  <img
                    v-if="viewModel.dishPhotoUrl && !imageFailed('ingredient-cover')"
                    :src="viewModel.dishPhotoUrl"
                    :alt="viewModel.recipeName"
                    class="h-full w-full object-cover"
                    crossorigin="anonymous"
                    @error="markImageFailed('ingredient-cover')"
                  >
                  <div v-else class="h-full w-full flex items-center justify-center font-serif text-4xl text-[#9A806B]">
                    {{ viewModel.recipeName.slice(0, 1) }}
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-[#A69080] uppercase tracking-[0.22em]">Ingredients</p>
                  <h2 class="mt-2 font-serif text-4xl leading-tight font-bold text-[#1a1714] break-words">{{ viewModel.recipeName }}</h2>
                  <p class="mt-2 text-sm leading-relaxed text-[#8B7D6B] line-clamp-1">{{ viewModel.description || '食材备好。' }}</p>
                </div>
              </div>

              <div class="mt-6 rounded-lg bg-white/65 border border-white px-4 py-3">
                <div class="flex flex-wrap gap-3">
                  <div v-for="ing in visibleIngredients" :key="ing.ingredientId || ing.name" class="flex w-[120px] min-w-0 items-center gap-2">
                    <div class="h-10 w-10 rounded-full border border-white bg-white/85 shadow-sm overflow-hidden flex flex-shrink-0 items-center justify-center">
                    <img
                      v-if="ing.imageUrl && !imageFailed(`ingredient-${ing.name}`)"
                      :src="ing.imageUrl"
                      :alt="ing.name"
                      class="h-full w-full object-cover"
                      crossorigin="anonymous"
                      @error="markImageFailed(`ingredient-${ing.name}`)"
                    >
                      <span v-else class="font-serif text-base text-[#8B7D6B]">{{ ing.name.slice(0, 1) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-[#2C2825] truncate">{{ ing.name }}</p>
                      <p class="text-[10px] text-[#A69080] truncate">{{ [ing.amount, ing.unit].filter(Boolean).join('') || '适量' }}</p>
                    </div>
                  </div>
                  <div v-if="hiddenIngredientCount" class="flex w-[120px] min-w-0 items-center gap-2">
                    <div class="h-10 w-10 rounded-full bg-[#3D3530] text-white flex flex-shrink-0 items-center justify-center font-mono text-sm shadow-sm">
                    +{{ hiddenIngredientCount }}
                  </div>
                    <p class="text-xs text-[#8B7D6B]">还有一些</p>
                  </div>
                </div>
              </div>

              <div class="mt-5 flex-1 min-h-0 overflow-hidden rounded-lg bg-white/70 p-5 border border-white">
                <p class="text-xs font-bold text-[#A69080] uppercase tracking-[0.22em] mb-3">做法步骤</p>
                <div v-if="visibleSteps.length" class="space-y-2.5">
                  <div v-for="(step, index) in visibleSteps" :key="index" class="flex gap-3">
                    <span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#EFE6DA] font-mono text-[11px] text-[#8B7D6B]">{{ index + 1 }}</span>
                    <p class="text-sm leading-snug text-[#5F5145] line-clamp-3">{{ step }}</p>
                  </div>
                </div>
                <p v-else class="text-sm text-[#8B7D6B]">做法还没写呢。</p>
              </div>

              <div class="mt-auto flex items-center justify-between border-t border-[#E3D6C8] pt-4">
                <p class="font-serif text-sm text-[#5B4A3D]">猪猪家的厨房</p>
                <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A69080]">Zhuzhu's Home Kitchen</p>
              </div>
            </div>

            <div v-else class="relative z-10 h-full flex flex-col p-8">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-[#A69080] uppercase tracking-[0.22em]">After Dinner</p>
                  <h2 class="mt-2 font-serif text-4xl font-bold text-[#1a1714]">{{ viewModel.recipeName }}</h2>
                </div>
                <p class="text-sm text-[#8B7D6B]">{{ viewModel.date }}</p>
              </div>

              <div class="mt-8 grid grid-cols-[1fr_160px] gap-5">
                <div class="rounded-lg bg-white/75 border border-white p-6 min-h-[260px]">
                  <p class="text-xs font-bold text-[#A69080] uppercase tracking-[0.22em]">这一顿</p>
                  <p class="mt-5 text-2xl leading-loose font-serif text-[#4B4038] break-words">{{ viewModel.note || '复盘还没写呢，吃完再补也行。' }}</p>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="(photo, index) in logPhotos"
                    :key="photo"
                    class="aspect-square overflow-hidden rounded-lg bg-[#E9DFD4]"
                  >
                    <img
                      v-if="!imageFailed(`log-photo-${index}`)"
                      :src="photo"
                      :alt="`${viewModel.recipeName} ${index + 1}`"
                      class="h-full w-full object-cover"
                      crossorigin="anonymous"
                      @error="markImageFailed(`log-photo-${index}`)"
                    >
                    <div v-else class="h-full w-full flex items-center justify-center font-serif text-3xl text-[#9A806B]">
                      {{ viewModel.recipeName.slice(0, 1) }}
                    </div>
                  </div>
                  <div v-if="!logPhotos.length" class="aspect-square rounded-lg bg-[#EFE6DA] flex items-center justify-center text-center text-sm text-[#9A806B] px-4">
                    做饭的时候还没拍照片
                  </div>
                </div>
              </div>

              <div class="mt-8 rounded-lg bg-[#3D3530] text-white p-6">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-white/70">这次评分</span>
                  <span class="font-mono text-xl">{{ ratingText }}</span>
                </div>
                <div class="mt-4 flex gap-1">
                  <span v-for="n in 5" :key="n" class="text-2xl" :class="n <= selectedStars ? 'text-[#F3C46A]' : 'text-white/25'">&#9733;</span>
                </div>
              </div>

              <div class="mt-auto flex items-center justify-between border-t border-[#E3D6C8] pt-4">
                <p class="font-serif text-sm text-[#5B4A3D]">猪猪家的厨房</p>
                <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A69080]">Zhuzhu's Home Kitchen</p>
              </div>
            </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-center gap-2" data-testid="poster-template-dots">
          <button
            v-for="template in templates"
            :key="template.key"
            type="button"
            class="h-2 rounded-full transition-all"
            :class="selectedTemplate === template.key ? 'w-7 bg-[#3D3530]' : 'w-2 bg-[#D8C9B8]'"
            :aria-label="`切换到${template.label}`"
            @click="selectedTemplate = template.key"
          />
        </div>

        <p class="mt-2 text-xs text-[#8B7D6B] md:hidden">{{ currentTemplate?.label }} · 左右滑动切换</p>

        <div v-if="completionActions.length" class="mt-4 w-full max-w-[640px] rounded-lg border border-[#E3D6C8] bg-white/75 p-3" data-testid="poster-edit-actions">
          <p class="mb-2 text-xs font-bold uppercase tracking-widest text-[#A69080]">补齐这张卡</p>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="action in completionActions"
              :key="action.key"
              :to="action.to"
              :data-testid="`poster-edit-${action.key}`"
              class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              :class="action.needed ? 'border-[#C06030]/30 bg-[#C06030]/10 text-[#A85028] hover:bg-[#C06030]/15' : 'border-gray-200 bg-white text-[#6B5D4D] hover:border-[#A69080]'"
            >
              {{ action.label }}
            </NuxtLink>
          </div>
        </div>

        <button
          class="mt-4 w-full max-w-[420px] py-3 bg-[#2C2825] text-white rounded-lg text-sm font-medium hover:bg-[#4A3D2E] transition-colors shadow-sm flex items-center justify-center gap-2 lg:hidden disabled:opacity-60"
          :disabled="isExporting"
          data-testid="poster-export-mobile"
          @click="exportPoster"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {{ isExporting ? '正在导出...' : '导出 PNG' }}
        </button>
      </section>

      <aside class="space-y-5 rounded-lg border border-[#E3D6C8] bg-white/70 p-5 h-fit">
        <div class="relative">
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">菜谱</p>
          <input
            v-model="recipeSearch"
            :placeholder="selectedRecipeName || '搜索菜谱...'"
            class="w-full px-3 py-2.5 bg-white border border-[#E3D6C8] rounded-lg text-sm text-[#1a1714] placeholder:text-[#A69080]/50 focus:outline-none focus:border-[#C06030]"
            @focus="onRecipeSearchFocus"
            @blur="onRecipeSearchBlur"
          />
          <Transition name="dropdown">
            <div
              v-if="recipeDropdownOpen && filteredRecipes.length"
              class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-30 max-h-48 overflow-y-auto"
              @mousedown.prevent
            >
              <button
                v-for="recipe in filteredRecipes.slice(0, 20)"
                :key="recipe.id"
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                :class="recipe.id === selectedRecipeId ? 'text-[#C06030] font-medium' : 'text-[#1a1714]'"
                @mousedown.prevent="selectRecipe(recipe.id)"
              >
                {{ recipe.name }}
              </button>
            </div>
          </Transition>
        </div>

        <div>
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">做饭记录</p>
          <select v-model="selectedCookLogId" class="w-full px-3 py-2.5 bg-white border border-[#E3D6C8] rounded-lg text-sm text-[#1a1714]">
            <option value="">最近一次记录</option>
            <option v-for="log in recipeCookLogs" :key="log.id" :value="log.id">
              {{ formatDate(log.date) }}{{ log.photos?.length ? ' · 有照片' : '' }}
            </option>
          </select>
        </div>

        <div>
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">比例</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="py-2 rounded-lg border text-sm transition-colors"
              :class="selectedRatio === '4:5' ? 'border-[#3D3530] bg-[#3D3530] text-white' : 'border-[#E3D6C8] bg-white text-[#8B7D6B]'"
              @click="selectedRatio = '4:5'"
            >
              4:5
            </button>
            <button
              class="py-2 rounded-lg border text-sm transition-colors"
              :class="selectedRatio === '3:4' ? 'border-[#3D3530] bg-[#3D3530] text-white' : 'border-[#E3D6C8] bg-white text-[#8B7D6B]'"
              @click="selectedRatio = '3:4'"
            >
              3:4
            </button>
          </div>
        </div>

        <button
          class="hidden lg:flex w-full py-3 bg-[#2C2825] text-white rounded-lg text-sm font-medium hover:bg-[#4A3D2E] transition-colors shadow-sm items-center justify-center gap-2 disabled:opacity-60"
          :disabled="isExporting"
          data-testid="poster-export"
          @click="exportPoster"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {{ isExporting ? '正在导出...' : '导出 PNG' }}
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.poster-preview-shell {
  max-width: 100%;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
}

.poster-card {
  border-radius: 8px;
  box-shadow: 0 22px 60px rgb(44 40 37 / 18%);
  transform-origin: top left;
}

.paper-texture {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}

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
