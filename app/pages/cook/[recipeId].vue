<script setup lang="ts">
import type { Recipe } from '~/types'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { createCookLog } = useApi()

const recipe = ref<Recipe | null>(null)
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const currentStep = ref(0)
const timerSeconds = ref(0)
const timerEndsAt = ref<number | null>(null)
const timerHandle = ref<number | null>(null)
const notes = ref('')
const saving = ref(false)
const speechEnabled = ref(false)
const restored = ref(false)
const stepTips = ref<string[]>([])
const tipsLoading = ref(false)
const tipsUnavailable = ref(false)
const showIngredients = ref(true)

const recipeId = computed(() => String(route.params.recipeId || ''))
const progressStorageKey = computed(() => `zhuzhu-kitchen:cook-progress:${recipeId.value}`)
const normalizedSteps = computed(() => (recipe.value?.steps || []).map(step => typeof step === 'string' ? { text: step, minutes: undefined as number | undefined } : step as { text: string; minutes?: number }))
const ingredients = computed(() => recipe.value?.ingredients || [])
const timerLabel = computed(() => `${String(Math.floor(timerSeconds.value / 60)).padStart(2, '0')}:${String(timerSeconds.value % 60).padStart(2, '0')}`)

const speak = (text: string) => {
  if (!speechEnabled.value || !import.meta.client || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}
const setActiveStep = (index: number) => { currentStep.value = index; speak(normalizedSteps.value[index]?.text || '') }
const saveProgress = () => {
  if (!import.meta.client || !recipeId.value || !restored.value) return
  localStorage.setItem(progressStorageKey.value, JSON.stringify({ currentStep: currentStep.value, notes: notes.value, timerEndsAt: timerEndsAt.value, updatedAt: new Date().toISOString() }))
}
const clearTimerHandle = () => { if (timerHandle.value) { window.clearInterval(timerHandle.value); timerHandle.value = null } }
const tickTimer = () => {
  if (!timerEndsAt.value) return
  timerSeconds.value = Math.max(0, Math.ceil((timerEndsAt.value - Date.now()) / 1000))
  if (timerSeconds.value <= 0) { clearTimerHandle(); timerEndsAt.value = null; saveProgress(); speak('时间到了') }
}
const startTimerLoop = () => { clearTimerHandle(); tickTimer(); if (timerSeconds.value > 0) timerHandle.value = window.setInterval(tickTimer, 1000) }
const toggleTimer = (minutes = 5) => {
  if (timerEndsAt.value) { clearTimerHandle(); timerEndsAt.value = null; timerSeconds.value = 0 }
  else { timerEndsAt.value = Date.now() + Math.max(minutes, 1) * 60_000; startTimerLoop() }
  saveProgress()
}
const restoreProgress = () => {
  if (!import.meta.client || !recipeId.value) return
  try {
    const raw = localStorage.getItem(progressStorageKey.value)
    if (!raw) return
    const saved = JSON.parse(raw) as { currentStep?: number; notes?: string; timerEndsAt?: number | null }
    if (typeof saved.currentStep === 'number') currentStep.value = Math.min(Math.max(saved.currentStep, 0), Math.max(normalizedSteps.value.length - 1, 0))
    if (typeof saved.notes === 'string') notes.value = saved.notes
    if (typeof saved.timerEndsAt === 'number' && saved.timerEndsAt > Date.now()) { timerEndsAt.value = saved.timerEndsAt; startTimerLoop() }
  } catch { localStorage.removeItem(progressStorageKey.value) }
}
const clearProgress = () => { if (import.meta.client && recipeId.value) localStorage.removeItem(progressStorageKey.value) }
const finishCooking = async () => {
  if (!recipe.value || saving.value) return
  saving.value = true; actionError.value = ''
  try {
    const log = await createCookLog({ recipeId: recipe.value.id, notes: notes.value || undefined })
    clearProgress(); clearTimerHandle()
    await router.push(`/cook-logs?editLog=${log.id}`)
  } catch (error: unknown) { actionError.value = getApiErrorMessage(error, '基础记录没有保存成功，请保留页面并再试一次。') }
  finally { saving.value = false }
}

onMounted(async () => {
  try {
    recipe.value = await $fetch<Recipe>(`/api/recipes/${recipeId.value}`)
    restoreProgress(); restored.value = true; speak(recipe.value.name)
    if (recipe.value.steps.length) {
      tipsLoading.value = true
      $fetch<string[]>('/api/ai/step-tips', { method: 'POST', body: { recipeName: recipe.value.name, steps: recipe.value.steps } })
        .then(tips => { stepTips.value = tips })
        .catch(() => { tipsUnavailable.value = true })
        .finally(() => { tipsLoading.value = false })
    }
  } catch (error: unknown) { loadError.value = getApiErrorMessage(error, '这道菜暂时打不开。') }
  finally { loading.value = false }
})
watch([currentStep, notes], saveProgress)
onUnmounted(() => { clearTimerHandle(); if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel() })
</script>

<template>
  <main class="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
    <div v-if="loading" class="flex min-h-[100dvh] items-center justify-center p-6 text-[var(--color-text-muted)]">正在打开这道菜…</div>
    <div v-else-if="loadError" class="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center p-6 text-center"><h1 class="font-serif text-2xl font-semibold">没有打开成功</h1><p class="mt-2 text-[var(--color-text-muted)]">{{ loadError }}</p><button class="touch-target mt-5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 font-semibold text-white" @click="router.back()">返回</button></div>
    <div v-else-if="recipe" class="flex min-h-[100dvh] flex-col">
      <header class="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] px-3 py-2 backdrop-blur sm:px-5">
        <button class="touch-target shrink-0 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="返回上一页" @click="router.back()">返回</button>
        <h1 class="min-w-0 flex-1 truncate px-1 text-center font-serif text-lg font-semibold">{{ recipe.name }}</h1>
        <div class="flex shrink-0 items-center gap-1">
          <button class="touch-target min-w-16 rounded-[var(--radius-md)] border px-2 font-mono text-xs font-semibold tabular-nums" :class="timerSeconds ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'" :aria-label="timerSeconds ? '停止计时器，剩余 ' + timerLabel : '为当前步骤开始计时'" @click="toggleTimer(normalizedSteps[currentStep]?.minutes || 5)">{{ timerSeconds ? timerLabel : '计时' }}</button>
          <label for="cook-speech" class="touch-target flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"><input id="cook-speech" v-model="speechEnabled" type="checkbox" class="h-5 w-5 accent-[var(--color-accent)]" />语音</label>
        </div>
      </header>

      <div class="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5 sm:px-6">
        <section v-if="ingredients.length" class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4">
          <button class="touch-target flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 text-left" :aria-expanded="showIngredients" @click="showIngredients = !showIngredients"><h2 class="font-serif text-lg font-semibold">食材</h2><span class="text-sm text-[var(--color-text-muted)]">{{ showIngredients ? '收起' : ingredients.length + ' 样' }}</span></button>
          <div v-if="showIngredients" class="mt-2 flex flex-wrap gap-2 px-2 pb-1"><span v-for="ingredient in ingredients" :key="ingredient.name" class="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-muted)]">{{ ingredient.name }} {{ ingredient.amount }}{{ ingredient.unit }}</span></div>
        </section>

        <section><div class="mb-3 flex items-end justify-between"><div><h2 class="font-serif text-xl font-semibold">步骤</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">点一下切到当前步骤，进度会自动保留。</p></div><span v-if="normalizedSteps.length" class="font-mono text-sm tabular-nums text-[var(--color-text-muted)]">{{ currentStep + 1 }}/{{ normalizedSteps.length }}</span></div>
          <div class="space-y-3">
            <button v-for="(step, index) in normalizedSteps" :key="index" type="button" class="w-full rounded-[var(--radius-lg)] border p-4 text-left transition sm:p-5" :class="Number(index) === currentStep ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-sm)]' : Number(index) < currentStep ? 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-65' : 'border-[var(--color-border)] bg-[var(--color-surface)]'" :aria-current="Number(index) === currentStep ? 'step' : undefined" :data-testid="`cook-step-${index}`" @click="setActiveStep(Number(index))"><span class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono font-bold" :class="Number(index) === currentStep ? 'bg-[var(--color-accent)] text-white' : Number(index) < currentStep ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'">{{ Number(index) + 1 }}</span><span class="min-w-0 flex-1"><span class="block font-serif text-xl leading-8" :class="Number(index) === currentStep ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'">{{ step.text }}</span><span v-if="stepTips[Number(index)]" class="mt-2 block text-sm leading-6 text-[var(--color-text-muted)]">提示：{{ stepTips[Number(index)] }}</span></span></span></button>
          </div>
          <p v-if="tipsLoading" class="mt-3 text-sm text-[var(--color-text-muted)]">正在准备步骤小贴士…</p><p v-else-if="tipsUnavailable" class="mt-3 text-xs text-[var(--color-text-faint)]">智能提示暂时不可用，不影响按原步骤做饭。</p><p v-if="!normalizedSteps.length" class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] p-8 text-center text-[var(--color-text-muted)]">这道菜还没有写步骤，做完后仍可直接记录。</p>
        </section>

        <section><label for="cook-notes" class="field-label">做饭随手记</label><textarea id="cook-notes" v-model="notes" class="field-control min-h-28 w-full resize-y" placeholder="火候、替换的食材，或者下次想改的地方…" /></section>
        <AppNotice v-if="actionError" tone="danger" role="alert" :message="actionError" />
      </div>

      <footer class="safe-bottom sticky bottom-0 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] px-4 py-3 backdrop-blur"><div class="mx-auto max-w-3xl"><button class="min-h-12 w-full rounded-[var(--radius-md)] bg-[var(--color-success)] px-5 text-base font-semibold text-white transition hover:brightness-95 disabled:opacity-55" :disabled="saving" data-testid="cook-finish" @click="finishCooking">{{ saving ? '正在保存基础记录…' : '做好了，保存并去补照片' }}</button></div></footer>
    </div>
  </main>
</template>
