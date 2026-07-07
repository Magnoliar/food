<script setup lang="ts">
import { difficultyLabel } from '~/constants/recipe'

const route = useRoute()
const router = useRouter()
const { recipes, tips, loadFromApi } = useMockData()
const { updateRecipe, uploadMedia } = useApi()

const recipe = computed(() => recipes.value.find(r => r.id === route.params.id))

// Editable state for each section
const editingName = ref(false)
const editingSteps = ref(false)
const editingIngredients = ref(false)
const editingTags = ref(false)
const editingTip = ref(false)
const editingNotes = ref(false)
const localNotes = ref('')
const tipIndex = ref(0)

// Local copies for editing
const localName = ref('')
const localDescription = ref('')
const localSteps = ref<string[]>([])
const localTip = ref('')
const localScore = ref(0)
const localStatus = ref('')
const localIngredients = ref<any[]>([])
const coverPhoto = ref<string | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const coverDropzone = ref<HTMLElement | null>(null)
const ingredientsSection = ref<HTMLElement | null>(null)
const stepsSection = ref<HTMLElement | null>(null)
const substituteFor = ref('')
const substituteResults = ref<Array<{ substitute: string; note: string }>>([])
const substituteLoading = ref(false)

// Drag state for steps
const dragIndex = ref<number | null>(null)

// Sync from recipe
watch(recipe, (r) => {
  if (r) {
    localName.value = r.name
    localDescription.value = r.description || ''
    localSteps.value = [...(r.steps || [])]
    localTip.value = r.tip || ''
    localScore.value = r.score
    localStatus.value = r.status
    localIngredients.value = JSON.parse(JSON.stringify(r.ingredients || []))
    localNotes.value = r.notes || ''
    coverPhoto.value = r.coverPhotoUrl || null
  }
}, { immediate: true })

// Auto-save helper
const autoSave = async (field: string, value: any) => {
  if (!recipe.value) return
  try {
    await updateRecipe(recipe.value.id, { [field]: value })
    ;(recipe.value as any)[field] = value
  } catch (e) {
    console.warn('Auto-save failed:', e)
  }
}

// Name editing
const startEditName = () => { editingName.value = true }
const saveName = () => {
  if (!localName.value.trim()) {
    localName.value = recipe.value?.name || ''
    return
  }
  editingName.value = false
  if (localName.value !== recipe.value?.name) autoSave('name', localName.value)
}

const saveDescription = () => {
  if (localDescription.value !== recipe.value?.description) autoSave('description', localDescription.value)
}

// Score editing
const setScore = (n: number) => {
  localScore.value = n
  autoSave('score', n)
}

// Status editing
const setStatus = (s: string) => {
  localStatus.value = s
  autoSave('status', s)
}

// Steps editing
const startEditSteps = () => { editingSteps.value = true }
const saveSteps = () => {
  editingSteps.value = false
  autoSave('steps', localSteps.value.filter(s => s.trim()))
}
const addStep = () => { localSteps.value.push('') }
const removeStep = (idx: number) => { localSteps.value.splice(idx, 1) }

// Drag to reorder
const onDragStart = (idx: number) => { dragIndex.value = idx }
const onDragOver = (e: DragEvent, idx: number) => {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === idx) return
  const arr = [...localSteps.value]
  const item = arr.splice(dragIndex.value, 1)[0]
  if (item === undefined) return
  arr.splice(idx, 0, item)
  localSteps.value = arr
  dragIndex.value = idx
}
const onDragEnd = () => { dragIndex.value = null; saveSteps() }

// Ingredients editing
const allIngredientNames = ref<string[]>([])
const editingIngIdx = ref<number | null>(null)
const ingSearchQuery = ref('')

const ingSuggestions = computed(() => {
  const q = ingSearchQuery.value.trim().toLowerCase()
  if (!q || !allIngredientNames.value.length) return []
  return allIngredientNames.value.filter(name => name.toLowerCase().includes(q)).slice(0, 8)
})

const startEditIngredients = () => {
  editingIngredients.value = true
  if (!allIngredientNames.value.length) {
    $fetch<any[]>('/api/ingredients').then(data => {
      allIngredientNames.value = (data || []).map((i: any) => i.name)
    }).catch(() => {})
  }
}
const saveIngredients = () => {
  editingIngredients.value = false
  editingIngIdx.value = null
  const filtered = localIngredients.value.filter((i: any) => i.name?.trim())
  autoSave('ingredients', filtered)
}
const onIngInput = (idx: number, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  localIngredients.value[idx].name = value
  ingSearchQuery.value = value
  editingIngIdx.value = value.trim() ? idx : null
}
const selectIngSuggestion = (idx: number, name: string) => {
  localIngredients.value[idx].name = name
  editingIngIdx.value = null
  ingSearchQuery.value = ''
}
const onIngBlur = (idx: number) => {
  window.setTimeout(() => { if (editingIngIdx.value === idx) editingIngIdx.value = null }, 150)
}
const addIngredient = () => {
  localIngredients.value.push({ name: '', amount: '', unit: '' })
}
const removeIngredient = (idx: number) => {
  localIngredients.value.splice(idx, 1)
}

const askSubstitute = async (ingredientName: string) => {
  if (substituteFor.value === ingredientName) {
    substituteFor.value = ''
    return
  }
  substituteFor.value = ingredientName
  substituteResults.value = []
  substituteLoading.value = true
  try {
    const result = await $fetch<Array<{ substitute: string; note: string }>>('/api/ai/substitute', {
      method: 'POST',
      body: { ingredientName, recipeName: recipe.value?.name },
    })
    substituteResults.value = result || []
  } catch {} finally {
    substituteLoading.value = false
  }
}

// Tags editing
const startEditTags = () => { editingTags.value = true }
const saveTags = () => {
  editingTags.value = false
  autoSave('tags', recipe.value?.tags || [])
}
const removeTag = (idx: number | string) => {
  if (recipe.value) {
    recipe.value.tags.splice(Number(idx), 1)
    autoSave('tags', recipe.value.tags)
  }
}
const addTagValue = ref('')
const addTag = () => {
  if (addTagValue.value.trim() && recipe.value) {
    recipe.value.tags.push(addTagValue.value.trim())
    autoSave('tags', recipe.value.tags)
    addTagValue.value = ''
  }
}

// Tip editing
const startEditTip = () => { editingTip.value = true }
const saveTip = () => {
  editingTip.value = false
  autoSave('tip', localTip.value)
}

const saveNotes = () => {
  editingNotes.value = false
  autoSave('notes', localNotes.value)
}

// Photo upload with paste support
const triggerPhotoUpload = () => { photoInput.value?.click() }
const handlePhotoUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || file.size > 5 * 1024 * 1024) return
  const asset = await uploadMedia(file, 'recipe-cover')
  coverPhoto.value = asset.url
  await autoSave('coverPhotoUrl', asset.url)
}

// Paste image support
const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        uploadMedia(file, 'recipe-cover').then((asset) => {
          coverPhoto.value = asset.url
          autoSave('coverPhotoUrl', asset.url)
        })
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
  loadFromApi()
  nextTick(() => {
    const editTarget = typeof route.query.edit === 'string' ? route.query.edit : ''
    if (editTarget === 'cover') {
      coverDropzone.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      triggerPhotoUpload()
    } else if (editTarget === 'ingredients') {
      startEditIngredients()
      ingredientsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (editTarget === 'steps') {
      startEditSteps()
      stepsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (editTarget) router.replace({ path: route.path, query: {} })
  })
})
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})

watch(
  () => route.params.id,
  async () => {
    await loadFromApi()
  },
  { immediate: true },
)

const relatedTips = computed(() => {
  if (!recipe.value) return []
  return tips.value.filter(t =>
    t.relatedIngredients?.some((ing: string) =>
      recipe.value!.ingredients?.some((ri: any) => ri.name.includes(ing))
    ) ?? false
  )
})

const statusOptions = [
  { key: 'want_to_make', label: '想做', color: 'border-crayon-lavender text-crayon-lavender' },
  { key: 'can_make', label: '会做', color: 'border-crayon-sky text-crayon-sky' },
  { key: 'made', label: '做过', color: 'border-morandi-green text-morandi-green' },
]

// Click outside any edit area to save and exit
const saveAllAndExit = () => {
  if (editingName.value) saveName()
  if (editingSteps.value) saveSteps()
  if (editingIngredients.value) saveIngredients()
  if (editingTags.value) saveTags()
  if (editingTip.value) saveTip()
  if (editingNotes.value) saveNotes()
}
</script>

<template>
  <div v-if="recipe" class="animate-fade-in" @click.self="saveAllAndExit">
    <NuxtLink to="/recipes" class="inline-flex items-center gap-1.5 text-[#8B7D6B] hover:text-[#1a1714] transition-colors text-sm mb-6">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
      返回菜谱库
    </NuxtLink>

    <!-- Hero image -->
    <div
      ref="coverDropzone"
      data-testid="recipe-cover-dropzone"
      class="rounded-lg overflow-hidden mb-8 aspect-[21/9] relative group cursor-pointer border-2 border-dashed transition-colors"
      :class="coverPhoto ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 bg-gray-50'"
      @click="triggerPhotoUpload"
    >
      <img v-if="coverPhoto" data-testid="recipe-cover-image" :src="coverPhoto" class="w-full h-full object-cover" />
      <div v-else class="flex flex-col items-center justify-center h-full gap-2 text-[#A69080]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 opacity-30">
          <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169" />
          <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
        <span class="text-sm opacity-60">点击或粘贴上传成品照片</span>
      </div>
      <div v-if="coverPhoto" class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <span class="text-white/0 group-hover:text-white/90 text-sm font-medium transition-colors bg-black/40 px-4 py-2 rounded-lg">更换照片</span>
      </div>
      <input ref="photoInput" data-testid="recipe-cover-input" type="file" accept="image/*" class="hidden" @change="handlePhotoUpload" />
    </div>

    <!-- Name + Description (double-click to edit) -->
    <div class="mb-8" @dblclick="startEditName">
      <template v-if="!editingName">
        <h1 data-testid="recipe-title" class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714] mb-2 cursor-pointer hover:opacity-80 transition-opacity">
          {{ localName }}
        </h1>
        <p class="text-base text-[#6B5D4D] cursor-pointer hover:opacity-80 transition-opacity">
          {{ localDescription || '双击添加描述...' }}
        </p>
        <p class="text-xs text-[#A69080] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">双击编辑</p>
      </template>
      <template v-else>
        <input v-model="localName" data-testid="recipe-title-input" class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714] w-full bg-transparent border-b-2 border-[#C06030] outline-none pb-1 mb-2"
          autofocus @blur="saveName" @keyup.enter="saveName" />
        <textarea v-model="localDescription" rows="2" class="w-full text-base text-[#6B5D4D] bg-transparent border border-gray-200 rounded-md p-2 outline-none resize-none focus:border-[#C06030]"
          placeholder="添加描述..." @blur="saveDescription" />
      </template>
    </div>

    <!-- Status + Score (inline edit) -->
    <div class="flex flex-wrap items-center gap-6 mb-8 pb-6 border-b border-gray-100">
      <!-- Status -->
      <div>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-2">状态</p>
        <div class="flex gap-1.5">
          <button v-for="opt in statusOptions" :key="opt.key"
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            :class="localStatus === opt.key ? opt.color + ' bg-gray-50' : 'border-gray-200 text-[#A69080] hover:bg-gray-50'"
            @click="setStatus(opt.key)">{{ opt.label }}</button>
        </div>
      </div>

      <!-- Score -->
      <div>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest mb-2">评分</p>
        <div class="flex items-center gap-1">
          <button v-for="n in 10" :key="n"
            class="w-7 h-7 rounded-md text-xs font-mono transition-all"
            :class="n <= localScore ? 'bg-[#D86830] text-white' : 'bg-gray-100 text-[#A69080] hover:bg-gray-200'"
            @click="setScore(n)">{{ n }}</button>
          <span class="font-mono text-sm font-bold text-[#D86830] ml-2">{{ localScore }}/10</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex gap-5 text-sm text-[#8B7D6B] ml-auto">
        <span class="font-mono">{{ recipe.estimatedTime }}min</span>
        <span>{{ difficultyLabel(recipe.difficulty) }}</span>
        <span class="font-mono">做过 {{ recipe.cookCount }}次</span>
      </div>
    </div>

    <!-- Tags (double-click to edit) -->
    <div class="mb-8" @dblclick="startEditTags">
      <template v-if="!editingTags">
        <div class="flex flex-wrap gap-2 cursor-pointer group/tags">
          <span v-for="tag in recipe.tags" :key="tag" class="text-xs text-[#8B7D6B] bg-gray-100 px-2.5 py-1 rounded-md hover:bg-gray-200 transition-colors">
            {{ tag }}
          </span>
          <span v-if="!recipe.tags.length" class="text-sm text-[#A69080] italic">双击添加标签...</span>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-wrap gap-2">
          <span v-for="(tag, idx) in recipe.tags" :key="idx"
            class="inline-flex items-center gap-1 text-xs bg-gray-100 px-2.5 py-1 rounded-md group/tag">
            {{ tag }}
            <button class="text-[#A69080] hover:text-[#D05050] opacity-0 group-hover/tag:opacity-100 transition-opacity" @click="removeTag(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
          <div class="flex gap-1">
            <input v-model="addTagValue" placeholder="新标签..." class="text-xs bg-transparent border border-gray-200 rounded-md px-2 py-1 w-20 outline-none focus:border-[#C06030]" @keyup.enter="addTag" @blur="saveTags" />
            <button class="text-xs text-[#C06030] hover:text-[#A85028]" @click="addTag">+</button>
          </div>
        </div>
      </template>
    </div>

    <!-- Ingredients (double-click to edit) -->
    <div ref="ingredientsSection" class="bg-white rounded-lg border border-gray-200 p-6 mb-6" @dblclick="startEditIngredients">
      <h2 class="text-lg font-serif font-bold text-[#1a1714] mb-4">食材清单</h2>
      <template v-if="!editingIngredients">
        <div class="flex flex-wrap gap-4 cursor-pointer">
          <div v-for="(ing, idx) in recipe.ingredients" :key="idx" class="relative group/sub">
            <IngredientBubble
              :name="ing.name" :amount="ing.amount" :unit="ing.unit"
              :line-art-url="ing.lineArtUrl" />
            <button
              type="button"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 text-[10px] text-[#A69080] flex items-center justify-center opacity-0 group-hover/sub:opacity-100 hover:border-[#C06030] hover:text-[#C06030] transition-all"
              title="没有这个食材？找替代"
              @click.stop="askSubstitute(ing.name)"
            >?</button>
          </div>
        </div>
        <div v-if="substituteFor" class="mt-3 rounded-lg border border-[#E3D6C8] bg-[#FAF7F0] p-3">
          <p class="text-xs font-bold text-[#A69080] mb-1">{{ substituteFor }} 的替代方案</p>
          <p v-if="substituteLoading" class="text-xs text-[#A69080]">正在想...</p>
          <div v-else-if="substituteResults.length" class="space-y-1">
            <p v-for="(s, i) in substituteResults" :key="i" class="text-sm text-[#6B5D4D]">
              → <span class="font-medium">{{ s.substitute }}</span> <span class="text-[#A69080]">{{ s.note }}</span>
            </p>
          </div>
          <p v-else class="text-xs text-[#A69080]">暂时没想到合适的替代</p>
        </div>
        <p class="text-xs text-[#A69080] mt-4">双击编辑食材 · 悬停问号找替代</p>
      </template>
      <template v-else>
        <div class="space-y-2">
          <div v-for="(ing, idx) in localIngredients" :key="idx" class="relative flex gap-2 items-center group/ing">
            <div class="flex-1 relative">
              <input
                :value="ing.name"
                class="w-full text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-[#C06030]"
                @input="onIngInput(idx, $event)"
                @focus="onIngInput(idx, $event); editingIngIdx = idx"
                @blur="onIngBlur(idx)"
              />
              <Transition name="dropdown">
                <div
                  v-if="editingIngIdx === idx && ingSuggestions.length"
                  class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-30 max-h-40 overflow-y-auto"
                  @mousedown.prevent
                >
                  <button
                    v-for="name in ingSuggestions"
                    :key="name"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    @mousedown.prevent="selectIngSuggestion(idx, name)"
                  >{{ name }}</button>
                </div>
              </Transition>
            </div>
            <input v-model="ing.amount" class="w-16 text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none font-mono focus:border-[#C06030]" @blur="saveIngredients" />
            <span class="text-xs text-[#A69080] w-8">{{ ing.unit }}</span>
            <button class="text-[#A69080] hover:text-[#D05050] transition-colors opacity-0 group-hover/ing:opacity-100" @click="removeIngredient(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button class="flex items-center gap-1.5 text-sm text-[#C06030] hover:text-[#A85028] transition-colors mt-2" @click="addIngredient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" /></svg>
            新增食材
          </button>
        </div>
      </template>
    </div>

    <!-- Steps (double-click to edit, drag to reorder) -->
    <div ref="stepsSection" class="bg-white rounded-lg border border-gray-200 p-6 mb-6" @dblclick="startEditSteps">
      <h2 class="text-lg font-serif font-bold text-[#1a1714] mb-4">做法步骤</h2>
      <template v-if="!editingSteps">
        <div class="space-y-4 cursor-pointer">
          <div v-for="(step, idx) in localSteps" :key="idx" class="flex gap-3">
            <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="font-mono text-xs text-[#1a1714]">{{ idx + 1 }}</span>
            </div>
            <p class="text-sm text-[#4A3D2E] leading-relaxed flex-1">{{ step }}</p>
          </div>
        </div>
        <p class="text-xs text-[#A69080] mt-4">双击编辑步骤 · 拖拽排序</p>
      </template>
      <template v-else>
        <div class="space-y-3">
          <div v-for="(step, idx) in localSteps" :key="idx"
            class="flex gap-3 items-start group/step"
            :class="dragIndex === idx ? 'opacity-50' : ''"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover="(e: DragEvent) => onDragOver(e, idx)"
            @dragend="onDragEnd"
          >
            <div class="flex flex-col items-center gap-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <span class="font-mono text-xs text-[#1a1714]">{{ idx + 1 }}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 text-[#A69080] opacity-0 group-hover/step:opacity-100 transition-opacity">
                <path d="M3 7.5h18M3 12h18M3 16.5h18" />
              </svg>
            </div>
            <textarea v-model="localSteps[idx]" rows="2"
              class="flex-1 text-sm text-[#1a1714] bg-gray-50 border border-gray-200 rounded-md p-2 outline-none resize-none focus:border-[#C06030]"
              @blur="saveSteps" />
            <button class="text-[#A69080] hover:text-[#D05050] transition-colors self-start mt-1 opacity-0 group-hover/step:opacity-100" @click="removeStep(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button class="flex items-center gap-1.5 text-sm text-[#C06030] hover:text-[#A85028] transition-colors mt-2" @click="addStep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" /></svg>
            新增步骤
          </button>
        </div>
      </template>
    </div>

    <!-- Tip (double-click to edit) -->
    <div class="bg-white rounded-lg p-5 border border-gray-200 shadow-sm mb-8 relative" @dblclick="startEditTip">
      <div class="absolute -top-1.5 -right-1 bg-[#D86830] text-white text-[9px] px-2.5 py-0.5 rotate-2 rounded-sm shadow-sm tracking-wider font-bold">TIP</div>
      <template v-if="!editingTip">
        <h3 class="text-sm font-bold text-[#1a1714] mb-2">烹饪贴士</h3>
        <p class="text-sm text-[#6B5D4D] leading-relaxed cursor-pointer hover:opacity-80 transition-opacity">
          {{ localTip || '双击添加贴士...' }}
        </p>
      </template>
      <template v-else>
        <textarea v-model="localTip" rows="3"
          class="w-full text-sm text-[#1a1714] bg-gray-50 border border-gray-200 rounded-md p-2 outline-none resize-none focus:border-[#C06030]"
          placeholder="输入烹饪贴士..." autofocus @blur="saveTip" />
      </template>
    </div>

    <!-- Notes / 点评区 (double-click to edit) -->
    <div class="bg-white rounded-lg p-5 border border-gray-200 mb-8" @dblclick="editingNotes = !editingNotes">
      <h3 class="text-sm font-bold text-[#1a1714] mb-2">📝 点评笔记</h3>
      <template v-if="!editingNotes">
        <p class="text-sm text-[#6B5D4D] leading-relaxed cursor-pointer hover:opacity-80">
          {{ localNotes || '双击记录这次做完的改进点、感受、调整...' }}
        </p>
      </template>
      <template v-else>
        <textarea v-model="localNotes" rows="4"
          class="w-full text-sm text-[#1a1714] bg-gray-50 border border-gray-200 rounded-md p-3 outline-none resize-none focus:border-[#C06030]"
          placeholder="记录这次做完需要改进的地方..." autofocus @blur="saveNotes" />
      </template>
    </div>

    <!-- Related tips (max 3, carousel) -->
    <div v-if="relatedTips.length" class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-hand text-xl text-[#6B5D4D]">相关贴士</h3>
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-full flex items-center justify-center text-[#A69080] hover:bg-gray-100 transition-all"
            @click="tipIndex = (tipIndex - 1 + Math.min(relatedTips.length, 3)) % Math.min(relatedTips.length, 3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button class="w-7 h-7 rounded-full flex items-center justify-center text-[#A69080] hover:bg-gray-100 transition-all"
            @click="tipIndex = (tipIndex + 1) % Math.min(relatedTips.length, 3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <p class="text-sm font-bold text-[#1a1714]">{{ relatedTips[tipIndex]?.title }}</p>
        <p class="text-sm text-[#6B5D4D] mt-1 leading-relaxed">{{ relatedTips[tipIndex]?.content }}</p>
      </div>
      <div class="flex justify-center gap-1.5 mt-3">
        <button v-for="(_, i) in Math.min(relatedTips.length, 3)" :key="i"
          class="w-1.5 h-1.5 rounded-full transition-all"
          :class="i === tipIndex ? 'bg-[#8B7D6B] w-4' : 'bg-gray-200'"
          @click="tipIndex = i" />
      </div>
    </div>
  </div>

  <div v-else class="text-center py-20">
    <p class="text-[#8B7D6B]">这道菜谱可能被删掉了</p>
    <NuxtLink to="/recipes" class="text-sm text-[#C06030] mt-2 inline-block">返回菜谱库</NuxtLink>
  </div>
</template>

<style scoped>
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
