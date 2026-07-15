<script setup lang="ts">
import type { Recipe } from '~/types'
import { createRecipeForm, normalizeRecipeForm, validateRecipeForm } from '~/utils/recipe-form'
import { getApiErrorMessage } from '~/utils/api-error'

const route = useRoute()
const { aiGenerateRecipe, uploadMedia } = useApi()
const toast = useToast()

const recipeName = ref('')
const form = ref(createRecipeForm())
const tagsInput = ref('')
const generating = ref(false)
const saving = ref(false)
const uploadingCover = ref(false)
const showForm = ref(false)
const skipped = ref(false)
const notice = ref<{ tone: 'info' | 'warning' | 'danger'; message: string } | null>(null)
const validationErrors = ref<string[]>([])
const coverInput = ref<HTMLInputElement | null>(null)
const coverImageFailed = ref(false)

const quickNames = ['红烧肉', '酸菜鱼', '宫保鸡丁', '麻婆豆腐', '可乐鸡翅', '蒜蓉虾']

onMounted(() => {
  const presetName = route.query.name
  if (typeof presetName === 'string' && presetName.trim()) {
    recipeName.value = presetName.trim()
    void generateRecipe()
  }
})

function ensureEditableRows() {
  if (!form.value.ingredients.length) form.value.ingredients.push({ name: '', amount: '', unit: '' })
  if (!form.value.steps.length) form.value.steps.push('')
}

async function generateRecipe() {
  const name = recipeName.value.trim()
  if (!name) {
    notice.value = { tone: 'warning', message: '先写下菜名，再让厨房助手帮你补全。' }
    return
  }
  generating.value = true
  skipped.value = false
  notice.value = { tone: 'info', message: '正在整理食材和步骤，你也可以随时改成手填。' }
  validationErrors.value = []
  try {
    const result = await aiGenerateRecipe(name)
    if (skipped.value) return
    form.value = createRecipeForm(result)
    tagsInput.value = form.value.tags.join('、')
    ensureEditableRows()
    showForm.value = true
    notice.value = { tone: 'info', message: '已生成一份草稿。保存前请检查食材、用量和步骤。' }
  } catch (error: unknown) {
    if (skipped.value) return
    showForm.value = true
    ensureEditableRows()
    notice.value = { tone: 'warning', message: getApiErrorMessage(error, '厨房助手暂时不可用，下面的手填流程仍然可以正常完成。') }
  } finally {
    generating.value = false
  }
}

function skipAI() {
  skipped.value = true
  showForm.value = true
  form.value = createRecipeForm()
  tagsInput.value = ''
  ensureEditableRows()
  notice.value = { tone: 'info', message: '已切换为手动填写，食材和步骤都可以按自己的习惯记录。' }
}

function addIngredient() {
  if (form.value.ingredients.length >= 30) {
    toast.warning('最多可以添加 30 种食材。')
    return
  }
  form.value.ingredients.push({ name: '', amount: '', unit: '' })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
  ensureEditableRows()
}

function addStep() {
  if (form.value.steps.length >= 20) {
    toast.warning('最多可以添加 20 个步骤。')
    return
  }
  form.value.steps.push('')
}

function removeStep(index: number) {
  form.value.steps.splice(index, 1)
  ensureEditableRows()
}

async function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    notice.value = { tone: 'danger', message: '请选择图片文件。' }
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    notice.value = { tone: 'danger', message: '封面图片不能超过 5MB。' }
    input.value = ''
    return
  }
  uploadingCover.value = true
  try {
    const asset = await uploadMedia(file, 'recipe-cover')
    form.value.coverPhotoUrl = asset.url
    coverImageFailed.value = false
    toast.success('封面已上传，保存菜谱后会一起保留。')
  } catch (error: unknown) {
    notice.value = { tone: 'danger', message: getApiErrorMessage(error, '封面上传失败，请稍后再试。') }
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}

async function saveRecipe() {
  form.value.tags = tagsInput.value.split(/[、,，]/).map(tag => tag.trim()).filter(Boolean)
  const result = validateRecipeForm(recipeName.value, form.value)
  validationErrors.value = result.errors
  if (!result.valid) {
    notice.value = { tone: 'danger', message: '还有几处需要补充，请检查下方提示。' }
    return
  }

  saving.value = true
  notice.value = null
  try {
    const normalized = normalizeRecipeForm(form.value)
    const saved = await $fetch<Recipe>('/api/recipes', {
      method: 'POST',
      body: { name: recipeName.value.trim(), ...normalized },
    })
    toast.success('菜谱已经收进厨房本里。')
    await navigateTo(`/recipes/${saved.id}`)
  } catch (error: unknown) {
    notice.value = { tone: 'danger', message: getApiErrorMessage(error, '保存失败了，内容还在页面上，可以稍后再试。') }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in pb-24 lg:pb-8">
    <NuxtLink to="/recipes" class="touch-target mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
      <span aria-hidden="true">←</span> 返回菜谱库
    </NuxtLink>

    <PageHeader title="新建菜谱" description="先写下菜名。厨房助手可以起草一版，也可以完全按自己的做法手动记录。" />

    <section class="surface-card max-w-3xl p-4 sm:p-6" aria-labelledby="recipe-name-label">
      <label id="recipe-name-label" for="recipe-name" class="field-label">菜名</label>
      <div class="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="recipe-name"
          v-model="recipeName"
          class="field-control min-h-12 flex-1"
          autocomplete="off"
          placeholder="例如：红烧肉、酸菜鱼"
          @keyup.enter="generateRecipe"
        >
        <AppButton :loading="generating" :disabled="!recipeName.trim()" @click="generateRecipe">
          {{ generating ? '正在生成草稿' : '厨房助手起草' }}
        </AppButton>
      </div>

      <div v-if="!showForm" class="mt-4 flex flex-wrap items-center gap-2">
        <AppButton variant="ghost" size="sm" @click="skipAI">跳过，直接手填</AppButton>
        <button
          v-for="name in quickNames"
          :key="name"
          type="button"
          class="touch-target rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
          @click="recipeName = name; generateRecipe()"
        >
          {{ name }}
        </button>
      </div>
    </section>

    <AppNotice
      v-if="notice"
      class="mt-4 max-w-3xl"
      :tone="notice.tone"
      :role="notice.tone === 'danger' ? 'alert' : 'status'"
      :message="notice.message"
    />

    <form v-if="showForm" class="mt-6 max-w-3xl space-y-6" @submit.prevent="saveRecipe">
      <AppNotice v-if="validationErrors.length" tone="danger" role="alert" title="请补充这些内容">
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li v-for="message in validationErrors" :key="message">{{ message }}</li>
        </ul>
      </AppNotice>

      <section class="surface-card p-4 sm:p-6" aria-labelledby="cover-heading">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="cover-heading" class="heading-serif text-xl">成品封面</h2>
            <p class="mt-1 text-sm text-[var(--color-text-muted)]">可选。没有照片时会使用稳定的暖色占位图。</p>
          </div>
          <AppButton variant="secondary" size="sm" :loading="uploadingCover" @click="coverInput?.click()">
            {{ form.coverPhotoUrl ? '更换封面' : '上传封面' }}
          </AppButton>
        </div>
        <input ref="coverInput" class="sr-only" type="file" accept="image/*" aria-label="选择菜谱封面图片" @change="handleCoverUpload">
        <div v-if="form.coverPhotoUrl && !coverImageFailed" class="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] aspect-[16/9]">
          <img :src="form.coverPhotoUrl" :alt="`${recipeName || '新菜谱'}的成品封面`" width="960" height="540" class="h-full w-full object-cover" @error="coverImageFailed = true">
        </div>
        <AppNotice v-else-if="form.coverPhotoUrl" class="mt-4" tone="warning" message="这张封面暂时无法显示，可以重新上传；不影响继续填写菜谱。" />
      </section>

      <section class="surface-card space-y-5 p-4 sm:p-6" aria-labelledby="basic-heading">
        <h2 id="basic-heading" class="heading-serif text-xl">基本信息</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="recipe-description" class="field-label">一句话描述</label>
            <input id="recipe-description" v-model="form.description" class="field-control mt-1.5" placeholder="例如：酸甜开胃的家常做法">
          </div>
          <div>
            <label for="recipe-category" class="field-label">分类</label>
            <input id="recipe-category" v-model="form.category" class="field-control mt-1.5" placeholder="例如：川菜、家常菜">
          </div>
          <fieldset>
            <legend class="field-label">难度</legend>
            <div class="mt-1.5 flex flex-wrap gap-2">
              <button
                v-for="number in 5"
                :key="number"
                type="button"
                class="touch-target min-w-11 rounded-lg border text-sm font-semibold"
                :class="form.difficulty === number ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'"
                :aria-pressed="form.difficulty === number"
                :aria-label="`难度 ${number}`"
                @click="form.difficulty = number"
              >{{ number }}</button>
            </div>
          </fieldset>
          <div>
            <label for="recipe-time" class="field-label">预估时间（分钟）</label>
            <input id="recipe-time" v-model.number="form.estimatedTime" type="number" min="1" max="1440" inputmode="numeric" class="field-control mt-1.5 font-mono">
          </div>
        </div>
      </section>

      <section class="surface-card p-4 sm:p-6" aria-labelledby="ingredients-heading">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 id="ingredients-heading" class="heading-serif text-xl">食材</h2>
            <p class="mt-1 text-sm text-[var(--color-text-muted)]">至少填写一种，单位可以留空。</p>
          </div>
          <AppButton variant="secondary" size="sm" @click="addIngredient">添加食材</AppButton>
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="(ingredient, index) in form.ingredients" :key="index" class="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_2.75rem] gap-2 max-sm:grid-cols-[minmax(0,1fr)_4.75rem_2.75rem]">
            <label class="sr-only" :for="`ingredient-name-${index}`">第 {{ index + 1 }} 种食材名称</label>
            <input :id="`ingredient-name-${index}`" v-model="ingredient.name" class="field-control min-w-0" placeholder="食材名称">
            <label class="sr-only" :for="`ingredient-amount-${index}`">第 {{ index + 1 }} 种食材用量</label>
            <input :id="`ingredient-amount-${index}`" v-model="ingredient.amount" class="field-control min-w-0 font-mono" placeholder="用量">
            <label class="sr-only" :for="`ingredient-unit-${index}`">第 {{ index + 1 }} 种食材单位</label>
            <input :id="`ingredient-unit-${index}`" v-model="ingredient.unit" class="field-control min-w-0 max-sm:col-start-2" placeholder="单位">
            <button type="button" class="touch-target rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="`移除第 ${index + 1} 种食材`" @click="removeIngredient(index)">×</button>
          </div>
        </div>
      </section>

      <section class="surface-card p-4 sm:p-6" aria-labelledby="steps-heading">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 id="steps-heading" class="heading-serif text-xl">做法步骤</h2>
            <p class="mt-1 text-sm text-[var(--color-text-muted)]">每一步只写一个动作，做饭时会更好读。</p>
          </div>
          <AppButton variant="secondary" size="sm" @click="addStep">添加步骤</AppButton>
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="(_, index) in form.steps" :key="index" class="flex items-start gap-2">
            <span class="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-soft)] font-mono text-xs text-[var(--color-text-muted)]">{{ index + 1 }}</span>
            <label class="sr-only" :for="`recipe-step-${index}`">第 {{ index + 1 }} 个做法步骤</label>
            <textarea :id="`recipe-step-${index}`" v-model="form.steps[index]" rows="2" class="field-control min-w-0 flex-1 resize-y" placeholder="写下这一步怎么做" />
            <button type="button" class="touch-target shrink-0 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="`移除第 ${index + 1} 个步骤`" @click="removeStep(index)">×</button>
          </div>
        </div>
      </section>

      <section class="surface-card grid gap-5 p-4 sm:p-6" aria-labelledby="finishing-heading">
        <h2 id="finishing-heading" class="heading-serif text-xl">补充信息</h2>
        <div>
          <label for="recipe-tags" class="field-label">标签</label>
          <input id="recipe-tags" v-model="tagsInput" class="field-control mt-1.5" placeholder="家常、快手、下饭">
          <p class="mt-1 text-xs text-[var(--color-text-subtle)]">使用顿号或逗号分隔。</p>
        </div>
        <div>
          <label for="recipe-tip" class="field-label">烹饪贴士</label>
          <textarea id="recipe-tip" v-model="form.tip" rows="3" class="field-control mt-1.5 resize-y" placeholder="记录火候、替换建议或容易出错的地方" />
        </div>
      </section>

      <div class="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[color:var(--color-surface)/0.96] p-3 shadow-[var(--shadow-lg)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <AppButton type="submit" size="lg" block :loading="saving" :disabled="!recipeName.trim()">
          {{ saving ? '正在保存菜谱' : '保存菜谱' }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
