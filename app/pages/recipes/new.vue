<script setup lang="ts">
const { aiGenerateRecipe } = useApi()

const recipeName = ref('')
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)
const skipped = ref(false)

const form = ref({
  description: '',
  category: '',
  difficulty: 3,
  estimatedTime: 30,
  ingredients: [] as Array<{ name: string; amount: string; unit: string }>,
  steps: [] as string[],
  tip: '',
  tags: [] as string[],
})
const tagsInput = ref('')

const route = useRoute()

onMounted(() => {
  const presetName = route.query.name
  if (typeof presetName === 'string' && presetName.trim()) {
    recipeName.value = presetName.trim()
    generateRecipe()
  }
})

const generateRecipe = async () => {
  if (!recipeName.value.trim()) return
  generating.value = true
  error.value = ''
  showForm.value = false
  skipped.value = false

  try {
    const result = await aiGenerateRecipe(recipeName.value.trim())
    if (skipped.value) return
    if (result) {
      fillFormFromAI(result as any)
      showForm.value = true
    } else {
      error.value = 'AI 没生成出来，手动填也行'
      showForm.value = true
    }
  } catch {
    error.value = 'AI 暂时不可用，手动填吧'
    showForm.value = true
  } finally {
    generating.value = false
  }
}

const fillFormFromAI = (result: any) => {
  form.value.description = result.description || ''
  form.value.category = result.category || ''
  form.value.difficulty = result.difficulty || 3
  form.value.estimatedTime = result.estimatedTime || 30
  form.value.ingredients = (result.ingredients || []).map((i: any) => ({
    name: i.name || '',
    amount: String(i.amount || ''),
    unit: i.unit || '',
  }))
  form.value.steps = result.steps || []
  form.value.tip = result.tip || ''
  form.value.tags = result.tags || []
  tagsInput.value = (result.tags || []).join('、')
}

const skipAI = () => {
  skipped.value = true
  showForm.value = true
  tagsInput.value = ''
  form.value = {
    description: '',
    category: '',
    difficulty: 3,
    estimatedTime: 30,
    ingredients: [{ name: '', amount: '', unit: '' }],
    steps: [''],
    tip: '',
    tags: [],
  }
}

const addIngredient = () => {
  if (form.value.ingredients.length >= 30) return
  form.value.ingredients.push({ name: '', amount: '', unit: '' })
}

const removeIngredient = (idx: number) => {
  form.value.ingredients.splice(idx, 1)
}

const addStep = () => {
  if (form.value.steps.length >= 20) return
  form.value.steps.push('')
}

const removeStep = (idx: number) => {
  form.value.steps.splice(idx, 1)
}

const saveRecipe = async () => {
  if (!recipeName.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    const tags = tagsInput.value.split(/[、,，]/).map(t => t.trim()).filter(Boolean)
    const saved = await $fetch('/api/recipes', {
      method: 'POST',
      body: {
        name: recipeName.value.trim(),
        description: form.value.description || '',
        category: form.value.category || '',
        difficulty: form.value.difficulty || 3,
        estimatedTime: form.value.estimatedTime || 30,
        steps: form.value.steps.filter(s => s.trim()),
        tip: form.value.tip || '',
        ingredients: form.value.ingredients.filter(i => i.name.trim()),
        tags,
      },
    })
    navigateTo(`/recipes/${saved.id}`)
  } catch {
    error.value = '保存失败了，稍后再试一次'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <NuxtLink to="/recipes" class="inline-flex items-center gap-1.5 text-sm text-[#8B7D6B] hover:text-[#1a1714] mb-8 transition-colors">返回菜谱库</NuxtLink>

    <div class="mb-8">
      <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">New Recipe</p>
      <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">新建菜谱</h1>
    </div>

    <!-- 菜名输入 -->
    <div class="mb-6 max-w-xl">
      <label class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-2 block">菜名</label>
      <div class="flex gap-3">
        <input
          v-model="recipeName"
          placeholder="输入菜名，如：红烧肉、酸菜鱼..."
          class="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-[#1a1714] placeholder:text-[#A69080]/40 focus:outline-none focus:border-[#C06030]"
          @keyup.enter="generateRecipe"
        />
        <button
          class="px-5 py-3 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
          :disabled="generating || !recipeName.trim()"
          @click="generateRecipe"
        >
          {{ generating ? '生成中...' : 'AI 生成' }}
        </button>
      </div>
      <div v-if="!showForm" class="mt-3 flex items-center gap-3">
        <p v-if="error" class="text-sm text-[#D05050]">{{ error }}</p>
        <button class="text-sm text-[#A69080] hover:text-[#1a1714] transition-colors" @click="skipAI">跳过，直接手填</button>
      </div>
    </div>

    <!-- 快捷菜名 -->
    <div v-if="!showForm" class="mb-8">
      <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">试试这些</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="name in ['红烧肉', '酸菜鱼', '宫保鸡丁', '麻婆豆腐', '可乐鸡翅', '蒜蓉虾']" :key="name"
          class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-[#6B5D4D] hover:bg-gray-200 transition-colors"
          @click="recipeName = name; generateRecipe()">
          {{ name }}
        </button>
      </div>
    </div>

    <!-- 编辑表单（AI 填充或手动填写） -->
    <div v-if="showForm" class="space-y-6 max-w-2xl">
      <p v-if="error" class="text-sm text-[#D86830]">{{ error }}</p>

      <!-- 基本信息 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">描述</label>
          <input v-model="form.description" placeholder="一句话说说这道菜" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
        </div>
        <div>
          <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">分类</label>
          <input v-model="form.category" placeholder="如：川菜、家常菜" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">难度（1-5）</label>
          <div class="flex gap-1">
            <button v-for="n in 5" :key="n"
              class="w-10 h-10 rounded-lg border text-sm font-mono transition-colors"
              :class="form.difficulty === n ? 'bg-[#C06030] text-white border-[#C06030]' : 'bg-white border-gray-200 text-[#8B7D6B] hover:border-[#C06030]'"
              @click="form.difficulty = n"
            >{{ n }}</button>
          </div>
        </div>
        <div>
          <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">预估时间（分钟）</label>
          <input v-model.number="form.estimatedTime" type="number" min="1" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#C06030]" />
        </div>
      </div>

      <!-- 食材 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold text-[#A69080] uppercase tracking-widest">食材</label>
          <button class="text-xs text-[#C06030] hover:text-[#A85028]" @click="addIngredient">+ 添加</button>
        </div>
        <div class="space-y-2">
          <div v-for="(ing, idx) in form.ingredients" :key="idx" class="flex gap-2 items-center">
            <input v-model="ing.name" placeholder="名称" class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
            <input v-model="ing.amount" placeholder="用量" class="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#C06030]" />
            <input v-model="ing.unit" placeholder="单位" class="w-16 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
            <button class="text-[#A69080] hover:text-[#D05050] transition-colors" @click="removeIngredient(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 步骤 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold text-[#A69080] uppercase tracking-widest">做法</label>
          <button class="text-xs text-[#C06030] hover:text-[#A85028]" @click="addStep">+ 添加</button>
        </div>
        <div class="space-y-2">
          <div v-for="(_, idx) in form.steps" :key="idx" class="flex gap-2 items-start">
            <span class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-mono mt-1.5">{{ idx + 1 }}</span>
            <textarea v-model="form.steps[idx]" rows="1" class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#C06030]" />
            <button class="text-[#A69080] hover:text-[#D05050] transition-colors mt-1.5" @click="removeStep(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div>
        <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">标签（顿号分隔）</label>
        <input v-model="tagsInput" placeholder="如：家常、快手、下饭" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
      </div>

      <!-- 贴士 -->
      <div>
        <label class="text-xs font-bold text-[#8B7D6B] uppercase tracking-wider mb-1 block">小贴士</label>
        <input v-model="form.tip" placeholder="有什么特别注意的" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C06030]" />
      </div>

      <!-- 保存 -->
      <button
        class="w-full py-3 bg-[#6D8B74] text-white rounded-lg text-sm font-medium hover:bg-[#5A7A62] transition-colors disabled:opacity-50"
        :disabled="saving || !recipeName.trim()"
        @click="saveRecipe"
      >
        {{ saving ? '保存中...' : '保存菜谱' }}
      </button>
    </div>
  </div>
</template>
