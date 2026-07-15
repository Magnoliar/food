<script setup lang="ts">
import type { Ingredient, LineArtJob } from '~/types'
import { getApiErrorMessage } from '~/utils/api-error'

type GenerationState = 'idle' | 'submitting' | 'polling' | 'done' | 'failed' | 'quota'
type IngredientDetail = Omit<Ingredient, 'usedIn' | 'lineArtUrl'> & {
  lineArtUrl?: string | string[] | null
  usedIn: Array<{ id: string; name: string; score?: number }>
  substitutes?: string[]
}
interface IngredientInsights { pairs: string[]; tip: string; season: string }

const route = useRoute()
const { isAdmin } = useAuth()
const { updateIngredient, generateAndSaveLineArt, checkLineArtJob, getLineArtJobs } = useApi()
const toast = useToast()

const ingredient = ref<IngredientDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const editForm = ref({ name: '', category: '', family: '' })
const generating = ref<GenerationState>('idle')
const lineArtError = ref('')
const selectedArtIndex = ref(0)
const failedArtUrls = ref(new Set<string>())
const insights = ref<IngredientInsights | null>(null)
const insightsLoading = ref(false)
const insightsError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const lineArtUrls = computed(() => parseLineArtUrls(ingredient.value?.lineArtUrl).filter(url => !failedArtUrls.value.has(url)))
const displayUrl = computed(() => lineArtUrls.value[selectedArtIndex.value] || lineArtUrls.value[0] || null)

function parseLineArtUrls(value: IngredientDetail['lineArtUrl']): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [value]
  } catch {
    return [value]
  }
}

function markArtFailed(url: string) {
  failedArtUrls.value = new Set([...failedArtUrls.value, url])
  selectedArtIndex.value = 0
}

async function loadIngredient() {
  loading.value = true
  loadError.value = ''
  stopPolling()
  try {
    const data = await $fetch<IngredientDetail>(`/api/ingredients/${String(route.params.id)}`)
    ingredient.value = data
    editForm.value = { name: data.name || '', category: data.category || '', family: data.family || '' }
    failedArtUrls.value = new Set()
    selectedArtIndex.value = 0
    await restoreLineArtJob()
  } catch (error: unknown) {
    ingredient.value = null
    loadError.value = getApiErrorMessage(error, '这份食材档案暂时没有加载成功。')
  } finally {
    loading.value = false
  }
}

async function loadInsights() {
  if (!ingredient.value || insightsLoading.value) return
  insightsLoading.value = true
  insightsError.value = ''
  try {
    const result = await $fetch<IngredientInsights>('/api/ai/ingredient-insights', {
      method: 'POST',
      body: { ingredientName: ingredient.value.name, relatedRecipes: ingredient.value.usedIn.map(recipe => recipe.name) },
    })
    if (result?.pairs?.length || result?.tip || result?.season) insights.value = result
    else insightsError.value = '暂时没有额外建议，现有食材信息不受影响。'
  } catch (error: unknown) {
    insightsError.value = getApiErrorMessage(error, '厨房助手暂时无法分析，仍可继续查看和编辑食材。')
  } finally {
    insightsLoading.value = false
  }
}

async function saveChanges() {
  if (!ingredient.value) return
  if (!editForm.value.name.trim()) {
    saveError.value = '名称不能为空。'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateIngredient(ingredient.value.id, {
      name: editForm.value.name.trim(),
      category: editForm.value.category.trim(),
      family: editForm.value.family.trim() || null,
    })
    ingredient.value = { ...ingredient.value, ...updated, usedIn: ingredient.value.usedIn, substitutes: ingredient.value.substitutes }
    toast.success('食材信息已保存。')
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, '保存失败，页面内容还在，可以稍后再试。')
  } finally {
    saving.value = false
  }
}

function applyLineArtJob(job: LineArtJob) {
  if (!ingredient.value) return
  if (job.status === 'done' && job.imageUrls?.length) {
    generating.value = 'done'
    ingredient.value.lineArtUrl = job.imageUrls
    failedArtUrls.value = new Set()
    selectedArtIndex.value = 0
    lineArtError.value = ''
    stopPolling()
    toast.success('食材配图已经生成。')
  } else if (job.status === 'failed') {
    generating.value = 'failed'
    lineArtError.value = job.error || '配图生成失败，可以稍后重试。'
    stopPolling()
  }
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

function pollLineArtJob(id: string) {
  stopPolling()
  generating.value = 'polling'
  pollTimer = setInterval(async () => {
    try {
      applyLineArtJob(await checkLineArtJob(id))
    } catch (error: unknown) {
      generating.value = 'failed'
      lineArtError.value = getApiErrorMessage(error, '配图任务状态获取失败，可以重试。')
      stopPolling()
    }
  }, 3000)
}

async function restoreLineArtJob() {
  if (!ingredient.value?.id || ingredient.value.lineArtUrl || !isAdmin.value) return
  try {
    const [job] = await getLineArtJobs([ingredient.value.id])
    if (!job) return
    if (job.status === 'pending' || job.status === 'polling') pollLineArtJob(job.id)
    else applyLineArtJob(job)
  } catch (error: unknown) {
    lineArtError.value = getApiErrorMessage(error, '之前的配图任务暂时无法恢复，不影响食材信息。')
  }
}

async function generateArt() {
  if (!ingredient.value || !isAdmin.value) return
  generating.value = 'submitting'
  lineArtError.value = ''
  try {
    const result = await generateAndSaveLineArt(ingredient.value.name, ingredient.value.id)
    if (result.status === 'already_exists' && result.imageUrls?.length) {
      applyLineArtJob({ id: '', status: 'done', imageUrls: result.imageUrls, selectedUrl: result.selectedUrl || null })
    } else if (result.jobId) {
      pollLineArtJob(result.jobId)
    } else if (result.status === 'already_running') {
      generating.value = 'polling'
      await restoreLineArtJob()
    } else {
      generating.value = 'failed'
      lineArtError.value = '任务没有成功提交，请稍后再试。'
    }
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, '配图生成失败，可以重试。')
    generating.value = message.includes('配额') ? 'quota' : 'failed'
    lineArtError.value = message
  }
}

watch(() => route.params.id, () => { void loadIngredient() }, { immediate: true })
onUnmounted(stopPolling)
</script>

<template>
  <div class="animate-fade-in pb-20">
    <NuxtLink to="/ingredients" class="touch-target mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
      <span aria-hidden="true">←</span> 返回食材库
    </NuxtLink>

    <div v-if="loading" class="space-y-4" aria-busy="true" aria-label="正在加载食材档案">
      <div class="h-10 w-48 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
      <div class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div class="aspect-square animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-muted)]" />
        <div class="h-72 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-muted)]" />
      </div>
    </div>

    <div v-else-if="loadError" class="max-w-xl py-10">
      <AppNotice tone="danger" role="alert" title="食材档案没有打开" :message="loadError" />
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton @click="loadIngredient">重新加载</AppButton>
        <AppButton to="/ingredients" variant="secondary">返回食材库</AppButton>
      </div>
    </div>

    <template v-else-if="ingredient">
      <PageHeader :title="ingredient.name" :description="`用于 ${ingredient.recipeCount} 道菜谱 · ${ingredient.category || '未分类'}`" />

      <div class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <section class="surface-card p-4 sm:p-5" aria-labelledby="ingredient-art-heading">
          <div class="flex items-center justify-between gap-3">
            <h2 id="ingredient-art-heading" class="heading-serif text-xl">食材配图</h2>
            <span v-if="lineArtUrls.length > 1" class="text-xs text-[var(--color-text-subtle)]">{{ selectedArtIndex + 1 }}/{{ lineArtUrls.length }}</span>
          </div>
          <div class="mt-4 aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
            <img
              v-if="displayUrl"
              :src="displayUrl"
              :alt="`${ingredient.name}的食材配图`"
              width="640"
              height="640"
              class="h-full w-full object-cover"
              @error="markArtFailed(displayUrl)"
            >
            <div v-else class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[var(--color-text-subtle)]">
              <span class="text-4xl" aria-hidden="true">🥕</span>
              <p class="text-sm">暂时没有配图，食材信息仍可正常使用。</p>
            </div>
          </div>

          <div v-if="lineArtUrls.length > 1" class="mt-3 grid grid-cols-4 gap-2" aria-label="选择食材配图">
            <button
              v-for="(url, index) in lineArtUrls"
              :key="url"
              type="button"
              class="touch-target aspect-square overflow-hidden rounded-lg border-2 p-0"
              :class="selectedArtIndex === index ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'"
              :aria-pressed="selectedArtIndex === index"
              :aria-label="`查看第 ${index + 1} 张配图`"
              @click="selectedArtIndex = index"
            >
              <img :src="url" alt="" width="120" height="120" class="h-full w-full object-cover" @error="markArtFailed(url)">
            </button>
          </div>

          <div v-if="isAdmin" class="mt-4">
            <AppButton
              variant="secondary"
              block
              :loading="generating === 'submitting' || generating === 'polling'"
              :disabled="generating === 'quota'"
              @click="generateArt"
            >
              {{ generating === 'polling' ? '正在生成配图' : generating === 'done' ? '重新生成配图' : generating === 'quota' ? '今日配额已用完' : generating === 'failed' ? '重试生成配图' : '生成食材配图' }}
            </AppButton>
            <AppNotice v-if="lineArtError" class="mt-3" :tone="generating === 'quota' ? 'warning' : 'danger'" :message="lineArtError" />
          </div>
        </section>

        <div class="space-y-6">
          <section class="surface-card space-y-4 p-4 sm:p-6" aria-labelledby="ingredient-info-heading">
            <div>
              <h2 id="ingredient-info-heading" class="heading-serif text-xl">基本信息</h2>
              <p class="mt-1 text-sm text-[var(--color-text-muted)]">修改后会同步到食材浏览和库存入口。</p>
            </div>
            <AppNotice v-if="saveError" tone="danger" role="alert" :message="saveError" />
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="ingredient-name" class="field-label">名称</label>
                <input id="ingredient-name" v-model="editForm.name" class="field-control mt-1.5 text-lg font-semibold">
              </div>
              <div>
                <label for="ingredient-category" class="field-label">分类</label>
                <input id="ingredient-category" v-model="editForm.category" class="field-control mt-1.5" placeholder="例如：蔬菜、肉类">
              </div>
              <div>
                <label for="ingredient-family" class="field-label">科属或家族</label>
                <input id="ingredient-family" v-model="editForm.family" class="field-control mt-1.5" placeholder="可选">
              </div>
            </div>
            <div class="flex justify-end">
              <AppButton :loading="saving" @click="saveChanges">保存食材信息</AppButton>
            </div>
          </section>

          <section v-if="ingredient.substitutes?.length" class="surface-card p-4 sm:p-6" aria-labelledby="substitutes-heading">
            <h2 id="substitutes-heading" class="heading-serif text-xl">可以替换为</h2>
            <div class="mt-3 flex flex-wrap gap-2">
              <span v-for="substitute in ingredient.substitutes" :key="substitute" class="rounded-full bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-muted)]">{{ substitute }}</span>
            </div>
          </section>

          <section class="surface-card p-4 sm:p-6" aria-labelledby="insights-heading">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="insights-heading" class="heading-serif text-xl">搭配小建议</h2>
                <p class="mt-1 text-sm text-[var(--color-text-muted)]">这是可选的辅助信息，失败不会影响食材主流程。</p>
              </div>
              <AppButton v-if="!insights" variant="secondary" size="sm" :loading="insightsLoading" @click="loadInsights">厨房助手解读</AppButton>
            </div>
            <AppNotice v-if="insightsError" class="mt-4" tone="warning" :message="insightsError" />
            <div v-if="insights" class="mt-4 space-y-4">
              <div v-if="insights.pairs.length">
                <p class="field-label">常见搭配</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="pair in insights.pairs" :key="pair" class="rounded-full bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-text)]">{{ pair }}</span>
                </div>
              </div>
              <p v-if="insights.tip" class="text-sm leading-6 text-[var(--color-text-muted)]">{{ insights.tip }}</p>
              <p v-if="insights.season" class="text-sm text-[var(--color-text-subtle)]">时令参考：{{ insights.season }}</p>
            </div>
          </section>
        </div>
      </div>

      <section class="mt-6" aria-labelledby="related-recipes-heading">
        <div class="mb-4">
          <h2 id="related-recipes-heading" class="heading-serif text-xl">用到 {{ ingredient.name }} 的菜谱</h2>
          <p class="mt-1 text-sm text-[var(--color-text-muted)]">从食材继续回到真正要做的菜。</p>
        </div>
        <div v-if="ingredient.usedIn.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink v-for="recipe in ingredient.usedIn" :key="recipe.id" :to="`/recipes/${recipe.id}`" class="surface-card touch-target block p-4 hover:border-[var(--color-accent)]">
            <h3 class="font-semibold text-[var(--color-text)]">{{ recipe.name }}</h3>
            <p class="mt-2 text-sm text-[var(--color-text-muted)]">{{ recipe.score ? `评分 ${recipe.score}/10` : '还没有评分' }}</p>
          </NuxtLink>
        </div>
        <EmptyState v-else title="还没有关联菜谱" description="以后在菜谱里加入这项食材，它会自动出现在这里。" />
      </section>
    </template>
  </div>
</template>
