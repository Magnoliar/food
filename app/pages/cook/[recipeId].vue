<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { createCookLog } = useApi()

const recipe = ref<any | null>(null)
const loading = ref(true)
const currentStep = ref(0)
const timerSeconds = ref(0)
const timerHandle = ref<number | null>(null)
const notes = ref('')
const saving = ref(false)
const speechEnabled = ref(false)
const restored = ref(false)
const stepTips = ref<string[]>([])
const tipsLoading = ref(false)
const showIngredients = ref(true)

const recipeId = computed(() => String(route.params.recipeId || ''))
const progressStorageKey = computed(() => `zhuzhu-kitchen:cook-progress:${recipeId.value}`)

const normalizedSteps = computed(() => {
  const steps = recipe.value?.steps || []
  return steps.map((step: any) => typeof step === 'string' ? { text: step, minutes: undefined } : step)
})

const ingredients = computed(() => recipe.value?.ingredients || [])

const speak = (text: string) => {
  if (!speechEnabled.value || !import.meta.client || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

const setActiveStep = (idx: number) => {
  currentStep.value = idx
  speak(normalizedSteps.value[idx]?.text || '')
}

const saveProgress = () => {
  if (!import.meta.client || !recipeId.value || !restored.value) return
  localStorage.setItem(progressStorageKey.value, JSON.stringify({
    currentStep: currentStep.value,
    notes: notes.value,
    updatedAt: new Date().toISOString(),
  }))
}

const restoreProgress = () => {
  if (!import.meta.client || !recipeId.value) return
  try {
    const raw = localStorage.getItem(progressStorageKey.value)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (typeof saved.currentStep === 'number') {
      currentStep.value = Math.min(Math.max(saved.currentStep, 0), Math.max(normalizedSteps.value.length - 1, 0))
    }
    if (typeof saved.notes === 'string') notes.value = saved.notes
  } catch {
    localStorage.removeItem(progressStorageKey.value)
  }
}

const clearProgress = () => {
  if (!import.meta.client || !recipeId.value) return
  localStorage.removeItem(progressStorageKey.value)
}

const toggleTimer = (minutes = 5) => {
  if (timerHandle.value) {
    window.clearInterval(timerHandle.value)
    timerHandle.value = null
    timerSeconds.value = 0
    return
  }
  timerSeconds.value = minutes * 60
  timerHandle.value = window.setInterval(() => {
    timerSeconds.value -= 1
    if (timerSeconds.value <= 0 && timerHandle.value) {
      window.clearInterval(timerHandle.value)
      timerHandle.value = null
      speak('时间到了')
    }
  }, 1000)
}

const timerLabel = computed(() => {
  const minutes = Math.floor(timerSeconds.value / 60)
  const seconds = timerSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const finishCooking = async () => {
  if (!recipe.value || saving.value) return
  saving.value = true
  try {
    const log = await createCookLog({
      recipeId: recipe.value.id,
      notes: notes.value || undefined,
    }) as any
    clearProgress()
    router.push(log?.id ? `/cook-logs?editLog=${log.id}` : `/cook-logs?create=1&recipeId=${recipe.value.id}`)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    recipe.value = await $fetch(`/api/recipes/${recipeId.value}`)
    restoreProgress()
    restored.value = true
    speak(recipe.value?.name || '')

    // 后台加载 AI 步骤提示
    if (recipe.value?.steps?.length) {
      tipsLoading.value = true
      $fetch<string[]>('/api/ai/step-tips', {
        method: 'POST',
        body: { recipeName: recipe.value.name, steps: recipe.value.steps },
      }).then((tips) => {
        stepTips.value = tips
      }).catch(() => {}).finally(() => { tipsLoading.value = false })
    }
  } finally {
    loading.value = false
  }
})

watch([currentStep, notes], saveProgress)

onUnmounted(() => {
  if (timerHandle.value) window.clearInterval(timerHandle.value)
})
</script>

<template>
  <main class="min-h-screen bg-[#FAF7F0] text-[#1a1714]">
    <div v-if="loading" class="min-h-screen flex items-center justify-center text-[#8B7D6B]">正在打开这道菜...</div>
    <div v-else-if="recipe" class="min-h-screen flex flex-col">
      <!-- 顶部标题栏 -->
      <header class="sticky top-0 z-20 bg-[#FAF7F0]/95 backdrop-blur-sm border-b border-black/10 px-5 py-3 flex items-center justify-between">
        <button class="text-sm text-[#8B7D6B] px-2 py-1" @click="router.back()">返回</button>
        <h1 class="font-serif text-lg font-bold truncate flex-1 text-center px-2">{{ recipe.name }}</h1>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors"
            :class="timerSeconds ? 'border-[#C06030] text-[#C06030] bg-[#C06030]/5' : 'border-gray-300 text-[#8B7D6B]'"
            @click="toggleTimer(normalizedSteps[currentStep]?.minutes || 5)"
          >
            {{ timerSeconds ? timerLabel : '计时' }}
          </button>
          <label class="flex items-center gap-1 text-xs text-[#8B7D6B]">
            <input v-model="speechEnabled" type="checkbox" class="w-4 h-4" />
            语音
          </label>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <!-- 食材速览 -->
        <section v-if="ingredients.length">
          <button class="flex items-center gap-2 mb-2 w-full text-left" @click="showIngredients = !showIngredients">
            <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest">食材</h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 text-[#A69080] transition-transform" :class="showIngredients ? 'rotate-180' : ''">
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="showIngredients" class="flex flex-wrap gap-2">
            <span v-for="ing in ingredients" :key="ing.name || ing.ingredient?.name"
              class="px-3 py-1.5 bg-white rounded-full border border-gray-200 text-sm text-[#6B5D4D]">
              {{ ing.name || ing.ingredient?.name }} {{ ing.amount }}{{ ing.unit }}
            </span>
          </div>
        </section>

        <!-- 步骤列表 -->
        <section>
          <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">步骤</h2>
          <div class="space-y-3">
            <div
              v-for="(step, idx) in normalizedSteps"
              :key="idx"
              class="rounded-xl border p-4 transition-all cursor-pointer"
              :class="Number(idx) === currentStep
                ? 'border-[#C06030] bg-[#C06030]/5 shadow-sm'
                : Number(idx) < currentStep
                  ? 'border-gray-200 bg-white/60 opacity-60'
                  : 'border-gray-200 bg-white'"
              :data-testid="`cook-step-${idx}`"
              @click="setActiveStep(Number(idx))"
            >
              <div class="flex items-start gap-3">
                <span
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-mono font-bold"
                  :class="Number(idx) === currentStep ? 'bg-[#C06030] text-white' : Number(idx) < currentStep ? 'bg-[#6D8B74] text-white' : 'bg-gray-100 text-[#8B7D6B]'"
                >{{ Number(idx) + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xl font-serif leading-relaxed" :class="Number(idx) === currentStep ? 'text-[#1a1714] font-bold' : 'text-[#6B5D4D]'">
                    {{ step.text }}
                  </p>
                  <p v-if="stepTips[Number(idx)]" class="mt-2 text-sm text-[#8B7D6B] italic">💡 {{ stepTips[Number(idx)] }}</p>
                </div>
              </div>
            </div>
          </div>
          <p v-if="tipsLoading" class="mt-2 text-xs text-[#A69080]">AI 小贴士加载中...</p>
          <p v-if="!normalizedSteps.length" class="text-sm text-[#A69080] py-8 text-center">这道菜还没有写步骤，做完后可以直接记录。</p>
        </section>

        <!-- 备注区 -->
        <section>
          <textarea
            v-model="notes"
            class="w-full min-h-20 rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[#C06030]"
            placeholder="哪里要改、火候怎么样，先随手记在这里..."
          />
        </section>
      </div>

      <!-- 底部按钮 -->
      <footer class="sticky bottom-0 bg-[#FAF7F0]/95 backdrop-blur-sm border-t border-black/10 px-5 py-3">
        <button
          class="w-full py-3.5 rounded-xl bg-[#6D8B74] text-white text-base font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
          :disabled="saving"
          data-testid="cook-finish"
          @click="finishCooking"
        >
          {{ saving ? '保存中...' : '做好了，去补照片和评分' }}
        </button>
      </footer>
    </div>
  </main>
</template>
