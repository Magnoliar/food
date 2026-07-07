<script setup lang="ts">
const healthResults = ref<any[]>([])
const checking = ref(false)

// API Settings
const settings = ref<any>(null)
const settingsSaving = ref(false)
const settingsMsg = ref('')

// Tag management
const newTagName = ref('')
const newTagDimension = ref('custom')
const tags = ref<any[]>([])
const stats = ref({ recipes: 0, ingredients: 0, cookLogs: 0 })
const { user, checkAuth } = useAuth()
const authChecked = ref(false)
const isAllowed = computed(() => user.value?.role === 'admin')

onMounted(async () => {
  await checkAuth()
  authChecked.value = true
  if (!isAllowed.value) return

  try { settings.value = await $fetch('/api/admin/settings') } catch {}
  try {
    const tagsData = await $fetch<any>('/api/tags')
    tags.value = Object.entries(tagsData).flatMap(([dim, list]: any) => list.map((t: any) => ({ ...t, dimension: dim })))
  } catch {}
  try { stats.value.recipes = (await $fetch<any[]>('/api/recipes')).length } catch {}
  try { stats.value.ingredients = (await $fetch<any[]>('/api/ingredients')).length } catch {}
  try { stats.value.cookLogs = (await $fetch<any[]>('/api/cook-logs')).length } catch {}
})

const checkHealth = async () => {
  checking.value = true
  try { healthResults.value = await $fetch('/api/ai/health') } catch { healthResults.value = [{ label: '检测失败', status: 'error' }] }
  finally { checking.value = false }
}

const saveSettings = async () => {
  settingsSaving.value = true
  settingsMsg.value = ''
  try {
    await $fetch('/api/admin/settings', { method: 'POST', body: settings.value })
    settingsMsg.value = '保存成功'
    setTimeout(() => { settingsMsg.value = '' }, 3000)
  } catch {
    settingsMsg.value = '保存失败'
  } finally {
    settingsSaving.value = false
  }
}

const addTag = async () => {
  if (!newTagName.value.trim()) return
  try {
    const tag = await $fetch('/api/tags', { method: 'POST', body: { name: newTagName.value.trim(), dimension: newTagDimension.value } })
    tags.value.push({ ...tag, dimension: newTagDimension.value })
    newTagName.value = ''
  } catch (e) { console.warn('Add tag failed:', e) }
}

const editingTagId = ref('')
const editingTagName = ref('')

const startEditTag = (tag: any) => {
  editingTagId.value = tag.id
  editingTagName.value = tag.name
}

const saveEditTag = async (tag: any) => {
  if (!editingTagName.value.trim()) return
  try {
    await $fetch(`/api/tags/${tag.id}`, { method: 'PATCH', body: { name: editingTagName.value.trim() } })
    tag.name = editingTagName.value.trim()
    editingTagId.value = ''
  } catch (e) { console.warn('Edit tag failed:', e) }
}

// Data import
const importMsg = ref('')
const importResult = ref('')

const handleImport = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importMsg.value = ''
  importResult.value = ''

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const items = Array.isArray(data) ? data : [data]

    let success = 0
    let failed = 0
    for (const item of items) {
      if (!item.name) { failed++; continue }
      try {
        await $fetch('/api/recipes', { method: 'POST', body: item })
        success++
      } catch { failed++ }
    }

    importMsg.value = '导入完成'
    importResult.value = `成功: ${success}, 失败: ${failed}, 总计: ${items.length}`
    // Refresh stats
    try { stats.value.recipes = (await $fetch<any[]>('/api/recipes')).length } catch {}
  } catch (e) {
    importMsg.value = '文件格式错误'
    importResult.value = String(e).slice(0, 100)
  }
}

const deleteTag = async (id: string) => {
  try {
    await $fetch(`/api/tags/${id}`, { method: 'DELETE' })
    tags.value = tags.value.filter(t => t.id !== id)
  } catch (e) { console.warn('Delete tag failed:', e) }
}
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="!authChecked" class="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-[#8B7D6B]">
      权限检查中...
    </div>

    <div v-else-if="!isAllowed" data-testid="admin-forbidden" class="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <p class="text-xs font-bold text-[#D05050] uppercase tracking-widest mb-2">Forbidden</p>
      <h1 class="text-2xl font-serif font-bold text-[#1a1714] mb-2">没有权限访问管理后台</h1>
      <p class="text-sm text-[#8B7D6B]">请使用 admin 账号登录后再进入。</p>
    </div>

    <template v-else>
    <div class="mb-8">
      <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Settings</p>
      <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">管理后台</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- AI API Settings -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[#1a1714]">AI API 配置</h2>
          <div class="flex items-center gap-2">
            <span v-if="settingsMsg" class="text-xs" :class="settingsMsg.includes('成功') ? 'text-[#6D8B74]' : 'text-[#D05050]'">{{ settingsMsg }}</span>
            <button class="text-xs text-[#8B7D6B] hover:text-[#1a1714] transition-colors" :disabled="checking" @click="checkHealth">
              {{ checking ? '检测中...' : '健康检查' }}
            </button>
            <button class="px-4 py-1.5 bg-[#C06030] text-white rounded-lg text-xs font-medium hover:bg-[#A85028] transition-colors disabled:opacity-50"
              :disabled="settingsSaving" @click="saveSettings">
              {{ settingsSaving ? '保存中...' : '保存配置' }}
            </button>
          </div>
        </div>

        <div v-if="settings" class="space-y-4">
          <!-- Endpoint 1 -->
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-[#8B7D6B]">端点 1</span>
              <span v-if="healthResults[0]" class="w-2 h-2 rounded-full" :class="healthResults[0].status === 'ok' ? 'bg-[#6D8B74]' : 'bg-[#D05050]'"></span>
              <span v-if="healthResults[0]?.latency" class="font-mono text-[10px] text-[#6D8B74]">{{ healthResults[0].latency }}ms</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Base URL</label>
                <input v-model="settings.ai.baseUrl1" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">API Key</label>
                <input v-model="settings.ai.apiKey1" type="password" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Model</label>
                <input v-model="settings.ai.model1" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Light Model</label>
                <input v-model="settings.ai.modelLight1" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" />
              </div>
            </div>
          </div>

          <!-- Endpoint 2 -->
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-[#8B7D6B]">端点 2</span>
              <span v-if="healthResults[1]" class="w-2 h-2 rounded-full" :class="healthResults[1].status === 'ok' ? 'bg-[#6D8B74]' : healthResults[1].status === 'not_configured' ? 'bg-gray-300' : 'bg-[#D05050]'"></span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Base URL</label><input v-model="settings.ai.baseUrl2" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">API Key</label><input v-model="settings.ai.apiKey2" type="password" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Model</label><input v-model="settings.ai.model2" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Light Model</label><input v-model="settings.ai.modelLight2" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
            </div>
          </div>

          <!-- XYQ Settings -->
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-[#8B7D6B]">小云雀 (XYQ)</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Base URL</label><input v-model="settings.xyq.baseUrl" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
              <div><label class="text-[10px] font-bold text-[#A69080] uppercase mb-1 block">Access Key</label><input v-model="settings.xyq.accessKey" type="password" class="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:border-[#C06030]" /></div>
            </div>
          </div>
        </div>

        <!-- Health results -->
        <div v-if="healthResults.length" class="mt-4 pt-3 border-t border-gray-100">
          <p class="text-xs text-[#A69080] uppercase tracking-widest mb-2">检测结果</p>
          <div v-for="r in healthResults" :key="r.label" class="flex items-center justify-between py-1.5">
            <span class="text-sm text-[#8B7D6B]">{{ r.label }}</span>
            <div class="flex items-center gap-2">
              <span v-if="r.latency" class="font-mono text-xs text-[#6D8B74]">{{ r.latency }}ms</span>
              <span class="text-xs font-medium" :class="r.status === 'ok' ? 'text-[#6D8B74]' : r.status === 'not_configured' ? 'text-[#A69080]' : 'text-[#D05050]'">
                {{ r.status === 'ok' ? 'OK' : r.status === 'not_configured' ? '未配置' : r.error?.slice(0, 50) || '错误' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tag Management -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <h2 class="text-base font-semibold text-[#1a1714] mb-4">标签管理</h2>
        <div class="flex gap-2 mb-4">
          <input v-model="newTagName" placeholder="新标签名..." class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#1a1714] placeholder:text-[#A69080]/40 focus:outline-none focus:border-[#C06030]" />
          <select v-model="newTagDimension" class="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#1a1714]">
            <option value="custom">自定义</option><option value="cuisine">菜系</option><option value="dish_type">类型</option>
            <option value="cook_method">烹饪方式</option><option value="taste">口味</option><option value="scenario">场景</option>
            <option value="region">地区</option><option value="cook_tool">工具</option><option value="nutrition">营养</option>
          </select>
          <button class="px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm hover:bg-[#A85028] transition-colors" @click="addTag">添加</button>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          <span v-for="tag in tags" :key="tag.id" class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-[#8B7D6B] group">
            <template v-if="editingTagId === tag.id">
              <input v-model="editingTagName" class="w-16 bg-transparent outline-none text-xs" autofocus @keyup.enter="saveEditTag(tag)" @blur="saveEditTag(tag)" />
            </template>
            <template v-else>
              <span class="cursor-pointer hover:underline" @dblclick="startEditTag(tag)">{{ tag.name }}</span>
              <span class="text-[10px] text-[#A69080]">{{ tag.dimension }}</span>
            </template>
            <button class="ml-1 text-[#A69080] hover:text-[#D05050] opacity-0 group-hover:opacity-100 transition-opacity" @click="deleteTag(tag.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Data Info -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <h2 class="text-base font-semibold text-[#1a1714] mb-4">数据概览</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-gray-50 rounded-lg"><p class="font-mono text-2xl font-bold text-[#1a1714]">{{ stats.recipes || '-' }}</p><p class="text-xs text-[#8B7D6B]">菜谱</p></div>
          <div class="text-center p-3 bg-gray-50 rounded-lg"><p class="font-mono text-2xl font-bold text-[#1a1714]">{{ tags.length }}</p><p class="text-xs text-[#8B7D6B]">标签</p></div>
          <div class="text-center p-3 bg-gray-50 rounded-lg"><p class="font-mono text-2xl font-bold text-[#1a1714]">{{ stats.ingredients || '-' }}</p><p class="text-xs text-[#8B7D6B]">食材</p></div>
          <div class="text-center p-3 bg-gray-50 rounded-lg"><p class="font-mono text-2xl font-bold text-[#1a1714]">{{ stats.cookLogs || '-' }}</p><p class="text-xs text-[#8B7D6B]">烹饪记录</p></div>
        </div>
      </div>

      <!-- Data Import -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <h2 class="text-base font-semibold text-[#1a1714] mb-4">数据导入</h2>
        <p class="text-sm text-[#8B7D6B] mb-3">导入 JSON 格式的菜谱数据。每个菜谱需包含 name 字段，可选 description、category、difficulty、estimatedTime、steps、ingredients、tags。</p>
        <div class="flex gap-3 items-start">
          <input ref="importInput" type="file" accept=".json" class="text-sm text-[#8B7D6B]" @change="handleImport" />
          <span v-if="importMsg" class="text-xs" :class="importMsg.includes('成功') ? 'text-[#6D8B74]' : 'text-[#D05050]'">{{ importMsg }}</span>
        </div>
        <p v-if="importResult" class="mt-2 text-xs font-mono text-[#A69080]">{{ importResult }}</p>
      </div>

    </div>
    </template>
  </div>
</template>
