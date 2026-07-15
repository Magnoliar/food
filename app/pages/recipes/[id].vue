<script setup lang="ts">
import type { RecipeIngredient, RecipeUpdateInput } from '~/types'
import { difficultyLabel } from '~/constants/recipe'
import { createRecipeForm, normalizeRecipeForm } from '~/utils/recipe-form'
import { getApiErrorMessage } from '~/utils/api-error'

type EditorSection = 'identity' | 'tags' | 'ingredients' | 'steps' | 'tip' | 'notes'
interface SubstituteResult { substitute: string; note: string }

const route = useRoute()
const router = useRouter()
const { recipes, ingredients, tips, apiLoaded, kitchenRefreshing, kitchenErrors, loadFromApi } = useKitchenData()
const { updateRecipe, uploadMedia } = useApi()
const toast = useToast()

const recipe = computed(() => recipes.value.find(item => item.id === String(route.params.id)))
const activeEditor = ref<EditorSection | null>(null)
const savingSection = ref<EditorSection | 'status' | 'score' | 'cover' | null>(null)
const operationError = ref('')
const uploadError = ref('')
const coverImageFailed = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const coverDropzone = ref<HTMLElement | null>(null)
const ingredientsSection = ref<HTMLElement | null>(null)
const stepsSection = ref<HTMLElement | null>(null)
const queryEditHandled = ref('')

const localName = ref('')
const localDescription = ref('')
const localStatus = ref('')
const localScore = ref(0)
const localTags = ref<string[]>([])
const localIngredients = ref<RecipeIngredient[]>([])
const localSteps = ref<string[]>([])
const localTip = ref('')
const localNotes = ref('')
const addTagValue = ref('')
const editingIngredientIndex = ref<number | null>(null)
const ingredientSearchQuery = ref('')
const substituteFor = ref('')
const substituteResults = ref<SubstituteResult[]>([])
const substituteLoading = ref(false)
const substituteError = ref('')
const tipIndex = ref(0)

const loading = computed(() => !recipe.value && (!apiLoaded.value || kitchenRefreshing.value))
const pageError = computed(() => !recipe.value ? kitchenErrors.value.recipes : '')
const ingredientSuggestions = computed(() => {
  const query = ingredientSearchQuery.value.trim().toLocaleLowerCase()
  if (!query) return []
  return ingredients.value
    .map(item => item.name)
    .filter(name => name.toLocaleLowerCase().includes(query))
    .slice(0, 8)
})
const relatedTips = computed(() => {
  if (!recipe.value) return []
  const names = recipe.value.ingredients.map(item => item.name)
  return tips.value.filter(tip => tip.relatedIngredients?.some(name => names.some(recipeName => recipeName.includes(name)))).slice(0, 3)
})
const statusOptions = [
  { key: 'want_to_make', label: '想做' },
  { key: 'can_make', label: '会做' },
  { key: 'made', label: '做过' },
]

function syncLocalState() {
  const source = recipe.value
  if (!source) return
  localName.value = source.name
  localDescription.value = source.description || ''
  localStatus.value = source.status
  localScore.value = source.score
  localTags.value = [...source.tags]
  localIngredients.value = source.ingredients.map(item => ({ ...item }))
  localSteps.value = [...source.steps]
  localTip.value = source.tip || ''
  localNotes.value = source.notes || ''
  coverImageFailed.value = false
}

watch(recipe, syncLocalState, { immediate: true })
watch(() => route.params.id, () => {
  activeEditor.value = null
  operationError.value = ''
  queryEditHandled.value = ''
  void loadFromApi()
})

watch([recipe, () => route.query.edit], async () => {
  if (!recipe.value) return
  const target = typeof route.query.edit === 'string' ? route.query.edit : ''
  if (!target || queryEditHandled.value === target) return
  queryEditHandled.value = target
  await nextTick()
  if (target === 'cover') {
    coverDropzone.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    photoInput.value?.click()
  } else if (target === 'ingredients') {
    startEditing('ingredients')
    ingredientsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else if (target === 'steps') {
    startEditing('steps')
    stepsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  await router.replace({ path: route.path, query: {} })
}, { immediate: true })

async function savePatch(section: typeof savingSection.value, patch: RecipeUpdateInput, successMessage: string) {
  if (!recipe.value || savingSection.value) return false
  savingSection.value = section
  operationError.value = ''
  try {
    const updated = await updateRecipe(recipe.value.id, patch)
    const index = recipes.value.findIndex(item => item.id === updated.id)
    if (index >= 0) recipes.value[index] = updated
    toast.success(successMessage)
    return true
  } catch (error: unknown) {
    operationError.value = getApiErrorMessage(error, '这次修改没有保存成功，内容仍留在页面上。')
    return false
  } finally {
    savingSection.value = null
  }
}

function startEditing(section: EditorSection) {
  syncLocalState()
  activeEditor.value = section
  operationError.value = ''
  if (section === 'ingredients' && !localIngredients.value.length) addIngredient()
  if (section === 'steps' && !localSteps.value.length) addStep()
}

function cancelEditing() {
  syncLocalState()
  activeEditor.value = null
  addTagValue.value = ''
  editingIngredientIndex.value = null
}

async function saveIdentity() {
  if (!localName.value.trim()) {
    operationError.value = '菜名不能为空。'
    return
  }
  const ok = await savePatch('identity', { name: localName.value.trim(), description: localDescription.value.trim() }, '菜名和描述已保存。')
  if (ok) activeEditor.value = null
}

async function setStatus(status: string) {
  const previous = localStatus.value
  localStatus.value = status
  if (!await savePatch('status', { status }, '菜谱状态已更新。')) localStatus.value = previous
}

async function setScore(score: number) {
  const previous = localScore.value
  localScore.value = score
  if (!await savePatch('score', { score }, '评分已保存。')) localScore.value = previous
}

function addTag() {
  const value = addTagValue.value.trim()
  if (!value || localTags.value.includes(value)) return
  localTags.value.push(value)
  addTagValue.value = ''
}

function removeTag(index: number) {
  localTags.value.splice(index, 1)
}

async function saveTags() {
  addTag()
  const tags = [...new Set(localTags.value.map(tag => tag.trim()).filter(Boolean))]
  const ok = await savePatch('tags', { tags }, '标签已保存。')
  if (ok) activeEditor.value = null
}

function addIngredient() {
  localIngredients.value.push({ name: '', amount: '', unit: '' })
}

function removeIngredient(index: number) {
  localIngredients.value.splice(index, 1)
}

function onIngredientInput(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const item = localIngredients.value[index]
  if (!item) return
  item.name = value
  ingredientSearchQuery.value = value
  editingIngredientIndex.value = value.trim() ? index : null
}

function selectIngredientSuggestion(index: number, name: string) {
  const item = localIngredients.value[index]
  if (!item) return
  item.name = name
  editingIngredientIndex.value = null
  ingredientSearchQuery.value = ''
}

function closeIngredientSuggestions(index: number) {
  window.setTimeout(() => {
    if (editingIngredientIndex.value === index) editingIngredientIndex.value = null
  }, 180)
}

async function saveIngredients() {
  if (!recipe.value) return
  const normalized = normalizeRecipeForm({ ...createRecipeForm(recipe.value), ingredients: localIngredients.value }).ingredients
  if (!normalized.length) {
    operationError.value = '至少保留一种食材。'
    return
  }
  const ok = await savePatch('ingredients', { ingredients: normalized }, '食材清单已保存。')
  if (ok) activeEditor.value = null
}

function addStep() {
  localSteps.value.push('')
}

function removeStep(index: number) {
  localSteps.value.splice(index, 1)
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= localSteps.value.length) return
  const steps = [...localSteps.value]
  const [item] = steps.splice(index, 1)
  if (item === undefined) return
  steps.splice(target, 0, item)
  localSteps.value = steps
}

async function saveSteps() {
  if (!recipe.value) return
  const steps = normalizeRecipeForm({ ...createRecipeForm(recipe.value), steps: localSteps.value }).steps
  if (!steps.length) {
    operationError.value = '至少保留一个做法步骤。'
    return
  }
  const ok = await savePatch('steps', { steps }, '做法步骤已保存。')
  if (ok) activeEditor.value = null
}

async function saveTip() {
  const ok = await savePatch('tip', { tip: localTip.value.trim() }, '烹饪贴士已保存。')
  if (ok) activeEditor.value = null
}

async function saveNotes() {
  const ok = await savePatch('notes', { notes: localNotes.value.trim() }, '点评笔记已保存。')
  if (ok) activeEditor.value = null
}

async function askSubstitute(ingredientName: string) {
  if (substituteFor.value === ingredientName) {
    substituteFor.value = ''
    return
  }
  substituteFor.value = ingredientName
  substituteResults.value = []
  substituteError.value = ''
  substituteLoading.value = true
  try {
    substituteResults.value = await $fetch<SubstituteResult[]>('/api/ai/substitute', {
      method: 'POST',
      body: { ingredientName, recipeName: recipe.value?.name },
    })
    if (!substituteResults.value.length) substituteError.value = '暂时没有找到合适的替代，原食材清单不受影响。'
  } catch (error: unknown) {
    substituteError.value = getApiErrorMessage(error, '替代建议暂时不可用，仍可继续查看菜谱。')
  } finally {
    substituteLoading.value = false
  }
}

async function handlePhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadError.value = ''
  if (!file.type.startsWith('image/')) uploadError.value = '请选择图片文件。'
  else if (file.size > 5 * 1024 * 1024) uploadError.value = '封面图片不能超过 5MB。'
  if (uploadError.value) {
    input.value = ''
    return
  }
  savingSection.value = 'cover'
  try {
    const asset = await uploadMedia(file, 'recipe-cover')
    const ok = await savePatchAfterUpload(asset.url)
    if (ok) coverImageFailed.value = false
  } catch (error: unknown) {
    uploadError.value = getApiErrorMessage(error, '封面上传失败，原封面没有改变。')
  } finally {
    savingSection.value = null
    input.value = ''
  }
}

async function savePatchAfterUpload(url: string) {
  if (!recipe.value) return false
  try {
    const updated = await updateRecipe(recipe.value.id, { coverPhotoUrl: url })
    const index = recipes.value.findIndex(item => item.id === updated.id)
    if (index >= 0) recipes.value[index] = updated
    toast.success('菜谱封面已更新。')
    return true
  } catch (error: unknown) {
    uploadError.value = getApiErrorMessage(error, '图片已上传，但没有成功设为封面，请重试。')
    return false
  }
}

async function handlePaste(event: ClipboardEvent) {
  if (!recipe.value) return
  const file = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))?.getAsFile()
  if (!file) return
  event.preventDefault()
  savingSection.value = 'cover'
  uploadError.value = ''
  try {
    const asset = await uploadMedia(file, 'recipe-cover')
    if (await savePatchAfterUpload(asset.url)) coverImageFailed.value = false
  } catch (error: unknown) {
    uploadError.value = getApiErrorMessage(error, '粘贴的图片没有上传成功。')
  } finally {
    savingSection.value = null
  }
}

onMounted(() => document.addEventListener('paste', handlePaste))
onUnmounted(() => document.removeEventListener('paste', handlePaste))
</script>

<template>
  <div class="animate-fade-in pb-24 lg:pb-8">
    <NuxtLink to="/recipes" class="touch-target mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
      <span aria-hidden="true">←</span> 返回菜谱库
    </NuxtLink>

    <div v-if="loading" class="space-y-5" aria-busy="true" aria-label="正在加载菜谱">
      <div class="aspect-[16/7] animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-muted)]" />
      <div class="h-10 w-64 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" />
      <div class="h-44 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-muted)]" />
    </div>

    <div v-else-if="pageError" class="max-w-xl py-10">
      <AppNotice tone="danger" role="alert" title="菜谱没有加载成功" :message="pageError" />
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton @click="loadFromApi({ force: true })">重新加载</AppButton>
        <AppButton to="/recipes" variant="secondary">返回菜谱库</AppButton>
      </div>
    </div>

    <template v-else-if="recipe">
      <section
        ref="coverDropzone"
        data-testid="recipe-cover-dropzone"
        class="group relative mb-6 aspect-[16/7] min-h-52 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] sm:mb-8"
        aria-labelledby="cover-heading"
      >
        <h2 id="cover-heading" class="sr-only">菜谱封面</h2>
        <img
          v-if="recipe.coverPhotoUrl && !coverImageFailed"
          data-testid="recipe-cover-image"
          :src="recipe.coverPhotoUrl"
          :alt="`${recipe.name}的成品照片`"
          width="1120"
          height="490"
          class="h-full w-full object-cover"
          @error="coverImageFailed = true"
        >
        <div v-else class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[var(--color-text-subtle)]">
          <span class="text-5xl" aria-hidden="true">🍲</span>
          <p class="text-sm">{{ recipe.coverPhotoUrl ? '封面暂时无法显示，可以重新上传。' : '还没有成品照片。' }}</p>
        </div>
        <div class="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/45 to-transparent p-4 pt-12">
          <AppButton variant="secondary" size="sm" :loading="savingSection === 'cover'" @click="photoInput?.click()">
            {{ recipe.coverPhotoUrl ? '更换封面' : '上传封面' }}
          </AppButton>
        </div>
        <input ref="photoInput" data-testid="recipe-cover-input" type="file" accept="image/*" class="sr-only" aria-label="选择菜谱封面图片" @change="handlePhotoUpload">
      </section>
      <AppNotice v-if="uploadError" class="mb-6" tone="danger" role="alert" :message="uploadError" />
      <AppNotice v-if="operationError" class="mb-6" tone="danger" role="alert" :message="operationError" />

      <header class="mb-7 border-b border-[var(--color-border)] pb-6">
        <div v-if="activeEditor !== 'identity'" class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 data-testid="recipe-title" class="heading-serif text-3xl text-[var(--color-text)] sm:text-4xl">{{ recipe.name }}</h1>
            <p class="mt-2 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">{{ recipe.description || '还没有描述，可以补一句这道菜最值得记住的地方。' }}</p>
          </div>
          <AppButton data-testid="recipe-title-edit" variant="secondary" size="sm" @click="startEditing('identity')">编辑名称</AppButton>
        </div>
        <div v-else class="surface-card space-y-4 p-4 sm:p-5">
          <div>
            <label for="recipe-title-input" class="field-label">菜名</label>
            <input id="recipe-title-input" v-model="localName" data-testid="recipe-title-input" class="field-control mt-1.5 text-xl font-semibold" autofocus @keyup.enter="saveIdentity">
          </div>
          <div>
            <label for="recipe-description-input" class="field-label">描述</label>
            <textarea id="recipe-description-input" v-model="localDescription" rows="3" class="field-control mt-1.5 resize-y" />
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
            <AppButton :loading="savingSection === 'identity'" @click="saveIdentity">保存名称与描述</AppButton>
          </div>
        </div>

        <div class="mt-6 grid gap-5 lg:grid-cols-[auto_auto_1fr] lg:items-end">
          <fieldset>
            <legend class="field-label">菜谱状态</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="option in statusOptions"
                :key="option.key"
                type="button"
                class="touch-target rounded-full border px-4 text-sm font-medium"
                :class="localStatus === option.key ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'"
                :aria-pressed="localStatus === option.key"
                :disabled="Boolean(savingSection)"
                @click="setStatus(option.key)"
              >{{ option.label }}</button>
            </div>
          </fieldset>

          <fieldset>
            <legend class="field-label">评分</legend>
            <div class="mt-2 flex flex-wrap gap-1">
              <button
                v-for="number in 10"
                :key="number"
                type="button"
                class="touch-target min-w-11 rounded-lg text-sm font-semibold"
                :class="number <= localScore ? 'bg-[var(--color-warning)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'"
                :aria-label="`评分 ${number} 分`"
                :aria-pressed="localScore === number"
                :disabled="Boolean(savingSection)"
                @click="setScore(number)"
              >{{ number }}</button>
            </div>
          </fieldset>

          <dl class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-text-muted)] lg:justify-end">
            <div><dt class="sr-only">预估时间</dt><dd class="font-mono">{{ recipe.estimatedTime }} 分钟</dd></div>
            <div><dt class="sr-only">难度</dt><dd>{{ difficultyLabel(recipe.difficulty) }}</dd></div>
            <div><dt class="sr-only">做过次数</dt><dd>做过 {{ recipe.cookCount }} 次</dd></div>
          </dl>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <AppButton :to="`/cook/${recipe.id}`">开始做饭</AppButton>
          <AppButton to="/planner" variant="secondary">放进计划</AppButton>
        </div>
      </header>

      <section class="mb-7" aria-labelledby="tags-heading">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="tags-heading" class="heading-serif text-xl">标签</h2>
          <AppButton v-if="activeEditor !== 'tags'" variant="ghost" size="sm" @click="startEditing('tags')">编辑标签</AppButton>
        </div>
        <div v-if="activeEditor !== 'tags'" class="flex flex-wrap gap-2">
          <span v-for="tag in recipe.tags" :key="tag" class="rounded-full bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-muted)]">{{ tag }}</span>
          <span v-if="!recipe.tags.length" class="text-sm text-[var(--color-text-subtle)]">还没有标签。</span>
        </div>
        <div v-else class="surface-card p-4">
          <div class="flex flex-wrap gap-2">
            <span v-for="(tag, index) in localTags" :key="tag" class="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--color-bg-soft)] pl-3 text-sm">
              {{ tag }}
              <button type="button" class="touch-target rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)]" :aria-label="`移除标签 ${tag}`" @click="removeTag(index)">×</button>
            </span>
          </div>
          <div class="mt-3 flex flex-col gap-2 sm:flex-row">
            <label for="new-recipe-tag" class="sr-only">新标签</label>
            <input id="new-recipe-tag" v-model="addTagValue" class="field-control flex-1" placeholder="输入标签后按回车" @keyup.enter="addTag">
            <AppButton variant="secondary" @click="addTag">添加标签</AppButton>
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
            <AppButton :loading="savingSection === 'tags'" @click="saveTags">保存标签</AppButton>
          </div>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section ref="ingredientsSection" class="surface-card p-4 sm:p-6" aria-labelledby="ingredients-heading">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 id="ingredients-heading" class="heading-serif text-xl">食材清单</h2>
              <p class="mt-1 text-sm text-[var(--color-text-muted)]">做饭前先确认家里有什么。</p>
            </div>
            <AppButton v-if="activeEditor !== 'ingredients'" variant="ghost" size="sm" @click="startEditing('ingredients')">编辑食材</AppButton>
          </div>

          <div v-if="activeEditor !== 'ingredients'" class="mt-4 space-y-2">
            <div v-for="ingredient in recipe.ingredients" :key="ingredient.name" class="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-[var(--color-bg-soft)]">
              <span class="min-w-0 flex-1 text-sm font-medium text-[var(--color-text)]">{{ ingredient.name }}</span>
              <span class="font-mono text-sm text-[var(--color-text-muted)]">{{ ingredient.amount }}{{ ingredient.unit }}</span>
              <button type="button" class="touch-target rounded-lg px-2 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]" :aria-label="`询问 ${ingredient.name} 的替代方案`" @click="askSubstitute(ingredient.name)">找替代</button>
            </div>
            <EmptyState v-if="!recipe.ingredients.length" title="还没有食材" description="补上食材后，计划和购物清单会更好用。" />
            <AppNotice v-if="substituteFor" class="mt-3" :tone="substituteError ? 'warning' : 'info'" :title="`${substituteFor} 的替代方案`">
              <p v-if="substituteLoading" class="text-sm">正在寻找不影响主流程的替代建议…</p>
              <p v-else-if="substituteError" class="text-sm">{{ substituteError }}</p>
              <ul v-else class="space-y-2 text-sm">
                <li v-for="result in substituteResults" :key="result.substitute"><strong>{{ result.substitute }}</strong><span v-if="result.note">：{{ result.note }}</span></li>
              </ul>
            </AppNotice>
          </div>

          <div v-else class="mt-4 space-y-3">
            <div v-for="(ingredient, index) in localIngredients" :key="index" class="relative grid grid-cols-[minmax(0,1fr)_5rem_4rem_2.75rem] gap-2 max-sm:grid-cols-[minmax(0,1fr)_4.5rem_2.75rem]">
              <label class="sr-only" :for="`detail-ingredient-name-${index}`">第 {{ index + 1 }} 种食材名称</label>
              <input :id="`detail-ingredient-name-${index}`" :value="ingredient.name" class="field-control min-w-0" placeholder="食材名称" autocomplete="off" @input="onIngredientInput(index, $event)" @blur="closeIngredientSuggestions(index)">
              <label class="sr-only" :for="`detail-ingredient-amount-${index}`">第 {{ index + 1 }} 种食材用量</label>
              <input :id="`detail-ingredient-amount-${index}`" v-model="ingredient.amount" class="field-control min-w-0 font-mono" placeholder="用量">
              <label class="sr-only" :for="`detail-ingredient-unit-${index}`">第 {{ index + 1 }} 种食材单位</label>
              <input :id="`detail-ingredient-unit-${index}`" v-model="ingredient.unit" class="field-control min-w-0 max-sm:col-start-2" placeholder="单位">
              <button type="button" class="touch-target rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="`移除第 ${index + 1} 种食材`" @click="removeIngredient(index)">×</button>
              <div v-if="editingIngredientIndex === index && ingredientSuggestions.length" class="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-lg)]">
                <button v-for="name in ingredientSuggestions" :key="name" type="button" class="touch-target w-full rounded-md px-3 text-left text-sm hover:bg-[var(--color-bg-soft)]" @mousedown.prevent="selectIngredientSuggestion(index, name)">{{ name }}</button>
              </div>
            </div>
            <AppButton variant="secondary" size="sm" @click="addIngredient">添加食材</AppButton>
            <div class="flex justify-end gap-2">
              <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
              <AppButton :loading="savingSection === 'ingredients'" @click="saveIngredients">保存食材</AppButton>
            </div>
          </div>
        </section>

        <section ref="stepsSection" class="surface-card p-4 sm:p-6" aria-labelledby="steps-heading">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 id="steps-heading" class="heading-serif text-xl">做法步骤</h2>
              <p class="mt-1 text-sm text-[var(--color-text-muted)]">按真正下厨时的顺序记录。</p>
            </div>
            <AppButton v-if="activeEditor !== 'steps'" variant="ghost" size="sm" @click="startEditing('steps')">编辑步骤</AppButton>
          </div>

          <ol v-if="activeEditor !== 'steps'" class="mt-4 space-y-4">
            <li v-for="(step, index) in recipe.steps" :key="index" class="flex gap-3">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-mono text-sm text-[var(--color-accent)]">{{ index + 1 }}</span>
              <p class="pt-1 text-sm leading-7 text-[var(--color-text)]">{{ step }}</p>
            </li>
          </ol>

          <div v-else class="mt-4 space-y-3">
            <div v-for="(_, index) in localSteps" :key="index" class="flex items-start gap-2">
              <span class="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-soft)] font-mono text-xs">{{ index + 1 }}</span>
              <label class="sr-only" :for="`detail-step-${index}`">第 {{ index + 1 }} 个步骤</label>
              <textarea :id="`detail-step-${index}`" v-model="localSteps[index]" rows="2" class="field-control min-w-0 flex-1 resize-y" />
              <div class="flex shrink-0 flex-col">
                <button type="button" class="touch-target rounded-lg text-[var(--color-text-muted)] disabled:opacity-30" :disabled="index === 0" :aria-label="`上移第 ${index + 1} 个步骤`" @click="moveStep(index, -1)">↑</button>
                <button type="button" class="touch-target rounded-lg text-[var(--color-text-muted)] disabled:opacity-30" :disabled="index === localSteps.length - 1" :aria-label="`下移第 ${index + 1} 个步骤`" @click="moveStep(index, 1)">↓</button>
                <button type="button" class="touch-target rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)]" :aria-label="`移除第 ${index + 1} 个步骤`" @click="removeStep(index)">×</button>
              </div>
            </div>
            <AppButton variant="secondary" size="sm" @click="addStep">添加步骤</AppButton>
            <div class="flex justify-end gap-2">
              <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
              <AppButton :loading="savingSection === 'steps'" @click="saveSteps">保存步骤</AppButton>
            </div>
          </div>
        </section>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section class="surface-card p-4 sm:p-6" aria-labelledby="tip-heading">
          <div class="flex items-center justify-between gap-3">
            <h2 id="tip-heading" class="heading-serif text-xl">烹饪贴士</h2>
            <AppButton v-if="activeEditor !== 'tip'" variant="ghost" size="sm" @click="startEditing('tip')">编辑贴士</AppButton>
          </div>
          <p v-if="activeEditor !== 'tip'" class="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{{ recipe.tip || '还没有贴士。' }}</p>
          <div v-else class="mt-3">
            <label for="recipe-tip-editor" class="sr-only">烹饪贴士</label>
            <textarea id="recipe-tip-editor" v-model="localTip" rows="4" class="field-control resize-y" />
            <div class="mt-3 flex justify-end gap-2">
              <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
              <AppButton :loading="savingSection === 'tip'" @click="saveTip">保存贴士</AppButton>
            </div>
          </div>
        </section>

        <section class="surface-card p-4 sm:p-6" aria-labelledby="notes-heading">
          <div class="flex items-center justify-between gap-3">
            <h2 id="notes-heading" class="heading-serif text-xl">点评笔记</h2>
            <AppButton v-if="activeEditor !== 'notes'" variant="ghost" size="sm" @click="startEditing('notes')">编辑笔记</AppButton>
          </div>
          <p v-if="activeEditor !== 'notes'" class="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{{ recipe.notes || '做过以后，可以把火候、口味和下次调整记在这里。' }}</p>
          <div v-else class="mt-3">
            <label for="recipe-notes-editor" class="sr-only">点评笔记</label>
            <textarea id="recipe-notes-editor" v-model="localNotes" rows="4" class="field-control resize-y" />
            <div class="mt-3 flex justify-end gap-2">
              <AppButton variant="ghost" @click="cancelEditing">取消</AppButton>
              <AppButton :loading="savingSection === 'notes'" @click="saveNotes">保存笔记</AppButton>
            </div>
          </div>
        </section>
      </div>

      <section v-if="relatedTips.length" class="mt-6" aria-labelledby="related-tips-heading">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 id="related-tips-heading" class="heading-serif text-xl">相关贴士</h2>
          <div class="flex gap-1">
            <button type="button" class="touch-target rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]" aria-label="上一条贴士" @click="tipIndex = (tipIndex - 1 + relatedTips.length) % relatedTips.length">←</button>
            <button type="button" class="touch-target rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]" aria-label="下一条贴士" @click="tipIndex = (tipIndex + 1) % relatedTips.length">→</button>
          </div>
        </div>
        <article class="surface-card p-5">
          <h3 class="font-semibold text-[var(--color-text)]">{{ relatedTips[tipIndex]?.title }}</h3>
          <p class="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{{ relatedTips[tipIndex]?.content }}</p>
        </article>
        <div class="mt-2 flex justify-center gap-1" aria-label="选择相关贴士">
          <button
            v-for="(_, index) in relatedTips"
            :key="index"
            type="button"
            class="touch-target rounded-full"
            :aria-label="`查看第 ${index + 1} 条贴士`"
            :aria-pressed="tipIndex === index"
            @click="tipIndex = index"
          ><span class="block h-2 rounded-full transition-all" :class="tipIndex === index ? 'w-5 bg-[var(--color-accent)]' : 'w-2 bg-[var(--color-border-strong)]'" /></button>
        </div>
      </section>
    </template>

    <div v-else class="max-w-xl py-10">
      <EmptyState title="没有找到这道菜谱" description="它可能被移除了，或者菜谱列表还没有同步。">
        <AppButton to="/recipes">返回菜谱库</AppButton>
      </EmptyState>
    </div>
  </div>
</template>
