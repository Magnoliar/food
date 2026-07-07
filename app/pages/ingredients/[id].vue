<script setup lang="ts">
const route = useRoute()
const { updateIngredient, generateAndSaveLineArt, checkLineArtJob, getLineArtJobs } = useApi()

const ingredient = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const saveError = ref('')
const editForm = ref({ name: '', category: '', family: '' })
const generating = ref('')
const lineArtError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
const jobId = ref<string | null>(null)
const insights = ref<{ pairs: string[]; tip: string; season: string } | null>(null)
const insightsLoading = ref(false)

const loadInsights = async () => {
  if (insights.value || insightsLoading.value) return
  insightsLoading.value = true
  try {
    const relatedRecipes = (ingredient.value?.usedIn || []).map((r: any) => r.name)
    const result = await $fetch<{ pairs: string[]; tip: string; season: string }>('/api/ai/ingredient-insights', {
      method: 'POST',
      body: { ingredientName: ingredient.value?.name, relatedRecipes },
    })
    if (result?.pairs?.length || result?.tip) insights.value = result
  } catch {} finally {
    insightsLoading.value = false
  }
}

onMounted(async () => {
  try {
    ingredient.value = await $fetch(`/api/ingredients/${route.params.id}`)
    editForm.value = {
      name: ingredient.value.name || '',
      category: ingredient.value.category || '',
      family: ingredient.value.family || '',
    }
    await restoreLineArtJob()
  } catch (e) {
    console.warn('Failed to load ingredient:', e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const getLineArtUrls = (ing: any): string[] => {
  if (!ing?.lineArtUrl) return []
  if (Array.isArray(ing.lineArtUrl)) return ing.lineArtUrl
  try { const p = JSON.parse(ing.lineArtUrl); return Array.isArray(p) ? p : [ing.lineArtUrl] } catch { return [ing.lineArtUrl] }
}

const selectedArtIndex = ref(0)
const displayUrl = computed(() => {
  const urls = getLineArtUrls(ingredient.value)
  return urls[selectedArtIndex.value] || urls[0] || null
})

const saveChanges = async () => {
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateIngredient(ingredient.value.id, editForm.value)
    ingredient.value = { ...ingredient.value, ...updated }
  } catch (e: any) {
    saveError.value = e?.data?.message || '保存失败了，再试一次'
  } finally {
    saving.value = false
  }
}

const applyLineArtUrls = (imageUrls: string[]) => {
  ingredient.value.lineArtUrl = JSON.stringify(imageUrls)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const pollLineArtJob = (id: string) => {
  stopPolling()
  jobId.value = id
  generating.value = 'polling'
  pollTimer = setInterval(async () => {
    try {
      const status = await checkLineArtJob(id)
      if (status.status === 'done' && status.imageUrls?.length) {
        generating.value = 'done'
        applyLineArtUrls(status.imageUrls)
        lineArtError.value = ''
        stopPolling()
      } else if (status.status === 'failed') {
        generating.value = 'failed'
        lineArtError.value = status.error || '线稿生成失败，可以重试'
        stopPolling()
      }
    } catch {
      generating.value = 'failed'
      lineArtError.value = '线稿任务状态获取失败，可以重试'
      stopPolling()
    }
  }, 3000)
}

const restoreLineArtJob = async () => {
  if (!ingredient.value?.id || ingredient.value.lineArtUrl) return
  try {
    const jobs = await getLineArtJobs([ingredient.value.id])
    const job = jobs[0]
    if (!job) return
    if (job.status === 'pending' || job.status === 'polling') {
      pollLineArtJob(job.id)
    } else if (job.status === 'done' && job.imageUrls?.length) {
      generating.value = 'done'
      applyLineArtUrls(job.imageUrls)
    } else if (job.status === 'failed') {
      generating.value = 'failed'
      lineArtError.value = job.error || '线稿生成失败，可以重试'
    }
  } catch (e) {
    console.warn('Restore line art job failed:', e)
  }
}

const generateArt = async () => {
  generating.value = 'submitting'
  lineArtError.value = ''
  try {
    const result = await generateAndSaveLineArt(ingredient.value.name, ingredient.value.id)
    if (result?.status === 'already_exists' && result?.imageUrls) {
      generating.value = 'done'
      ingredient.value.lineArtUrl = JSON.stringify(result.imageUrls)
    } else if (result?.jobId) {
      pollLineArtJob(result.jobId)
    } else if (result?.status === 'already_running') {
      generating.value = 'polling'
    }
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || ''
    generating.value = msg.includes('配额') ? 'quota' : 'failed'
    lineArtError.value = msg || '线稿生成失败，可以重试'
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-20">
    <p class="text-[#A69080]">正在翻食材档案...</p>
  </div>

  <div v-else-if="ingredient" class="animate-fade-in">
    <NuxtLink to="/ingredients" class="inline-flex items-center gap-1.5 text-sm text-[#8B7D6B] hover:text-[#1a1714] mb-8 transition-colors">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
      返回食材库
    </NuxtLink>

    <!-- Hero: image + editable info -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 items-start">
      <!-- Image area -->
      <div class="flex flex-col items-center gap-4">
        <div class="w-full max-w-64 h-64 rounded-2xl overflow-hidden flex items-center justify-center bg-gray-50 border border-gray-100">
          <img v-if="displayUrl" :src="displayUrl" class="w-full h-full object-cover" />
          <HandDrawnPlaceholder v-else :tags="[ingredient.name]" class="w-40 h-40" />
        </div>
        <!-- Image selector (if multiple) -->
        <div v-if="getLineArtUrls(ingredient).length > 1" class="flex gap-2">
          <div v-for="(url, idx) in getLineArtUrls(ingredient)" :key="idx"
            class="w-14 h-14 rounded-md overflow-hidden cursor-pointer border-2 transition-all"
            :class="selectedArtIndex === idx ? 'border-[#C06030]' : 'border-transparent hover:border-gray-300'"
            @click="selectedArtIndex = idx">
            <img :src="url" class="w-full h-full object-cover" />
          </div>
        </div>
        <!-- Generate button -->
        <button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full max-w-64"
          :class="generating === 'done' ? 'bg-[#6D8B74] text-white' : generating === 'polling' ? 'bg-[#D86830]/20 text-[#D86830]' : generating === 'quota' ? 'bg-gray-200 text-gray-400' : 'bg-[#C06030] text-white hover:bg-[#A85028]'"
          :disabled="generating === 'submitting' || generating === 'polling' || generating === 'quota'"
          @click="generateArt">
          {{ generating === 'submitting' ? '提交中...' : generating === 'polling' ? '生成中...' : generating === 'done' ? '✓ 生成完成' : generating === 'quota' ? '今日配额已用完' : generating === 'failed' ? '重试生成' : '生成配图' }}
        </button>
        <p v-if="lineArtError" class="w-full max-w-64 text-xs text-[#B4472A]">
          {{ lineArtError }}
        </p>
      </div>

      <!-- Editable info -->
      <div class="space-y-4">
        <div>
          <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">名称</label>
          <input v-model="editForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-lg font-serif font-bold text-[#1a1714] focus:outline-none focus:border-[#C06030]" />
        </div>
        <div>
          <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">分类</label>
          <input v-model="editForm.category" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#1a1714] focus:outline-none focus:border-[#C06030]" />
        </div>
        <div>
          <label class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-1 block">科</label>
          <input v-model="editForm.family" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#1a1714] focus:outline-none focus:border-[#C06030]" />
        </div>
        <button class="px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors disabled:opacity-50"
          :disabled="saving" @click="saveChanges">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
        <p v-if="saveError" class="text-xs text-[#D05050]">{{ saveError }}</p>
        <p class="text-sm text-[#8B7D6B]">
          用于 <span class="font-mono font-bold text-[#D86830]">{{ ingredient.recipeCount }}</span> 道菜谱
        </p>
      </div>
    </section>

    <!-- Substitutes -->
    <section v-if="ingredient.substitutes?.length" class="mb-10">
      <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">替代品</h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLink v-for="sub in ingredient.substitutes" :key="sub"
          :to="`/ingredients/${sub}`"
          class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-[#6B5D4D] hover:bg-gray-200 transition-colors">
          {{ sub }}
        </NuxtLink>
      </div>
    </section>

    <!-- AI Insights -->
    <section class="mb-10">
      <div class="flex items-center gap-3 mb-3">
        <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest">食材搭配</h2>
        <button
          v-if="!insights"
          class="text-[11px] text-[#C06030] hover:text-[#A85028] disabled:opacity-50"
          :disabled="insightsLoading"
          @click="loadInsights"
        >{{ insightsLoading ? '分析中...' : 'AI 解读' }}</button>
      </div>
      <div v-if="insights" class="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <div v-if="insights.pairs?.length">
          <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-2">常见搭配</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="p in insights.pairs" :key="p" class="px-2.5 py-1 bg-[#F4ECE2] text-[#6B5D4D] text-xs rounded-full">{{ p }}</span>
          </div>
        </div>
        <p v-if="insights.tip" class="text-sm text-[#6B5D4D]">💡 {{ insights.tip }}</p>
        <p v-if="insights.season" class="text-xs text-[#A69080]">时令：{{ insights.season }}</p>
      </div>
      <p v-else-if="!insightsLoading" class="text-sm text-[#A69080]">点击"AI 解读"查看搭配建议</p>
    </section>

    <!-- Related recipes -->
    <section>
      <h2 class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-4">使用这道食材的菜谱</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink v-for="r in ingredient.usedIn" :key="r.id" :to="`/recipes/${r.id}`"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all">
          <h3 class="text-sm font-semibold text-[#1a1714] mb-1">{{ r.name }}</h3>
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-[#D86830]">{{ r.score || '-' }}</span>
          </div>
        </NuxtLink>
      </div>
      <p v-if="!ingredient.usedIn?.length" class="text-sm text-[#A69080]">这个食材还没出现在任何菜谱里</p>
    </section>
  </div>

  <div v-else class="text-center py-20">
    <p class="text-[#8B7D6B]">这个食材可能被移除了</p>
    <NuxtLink to="/ingredients" class="text-sm text-[#C06030] mt-2 inline-block">返回食材库</NuxtLink>
  </div>
</template>
