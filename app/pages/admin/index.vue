<script setup lang="ts">
import type { CookLog, Ingredient, Recipe, Tag } from '~/types'

type AppSettings = { ai: { baseUrl1: string; apiKey1: string; model1: string; modelLight1: string; baseUrl2: string; apiKey2: string; model2: string; modelLight2: string; baseUrl3: string; apiKey3: string; model3: string; modelLight3: string }; xyq: { accessKey: string; baseUrl: string } }
type HealthResult = { label: string; status: 'ok' | 'not_configured' | 'error'; latency?: number | null; error?: string }
type ImportRecipe = Partial<Recipe> & { name?: string }

const emptySettings = (): AppSettings => ({ ai: { baseUrl1: '', apiKey1: '', model1: '', modelLight1: '', baseUrl2: '', apiKey2: '', model2: '', modelLight2: '', baseUrl3: '', apiKey3: '', model3: '', modelLight3: '' }, xyq: { accessKey: '', baseUrl: '' } })
const { user, checkAuth } = useAuth()
const toast = useToast()
const authChecked = ref(false)
const isAllowed = computed(() => user.value?.role === 'admin')
const loading = ref(false)
const loadError = ref('')
const settings = ref<AppSettings>(emptySettings())
const settingsSaving = ref(false)
const settingsError = ref('')
const healthResults = ref<HealthResult[]>([])
const checking = ref(false)
const tags = ref<Tag[]>([])
const stats = ref({ recipes: 0, ingredients: 0, cookLogs: 0 })
const newTagName = ref('')
const newTagDimension = ref('custom')
const tagBusy = ref(false)
const tagError = ref('')
const editingTagId = ref('')
const editingTagName = ref('')
const pendingDeleteTag = ref<Tag | null>(null)
const deletingTag = ref(false)
const importing = ref(false)
const importResult = ref('')
const importError = ref('')

const tagDimensions: Record<string, string> = { custom: '自定义', cuisine: '菜系', dish_type: '菜品类型', cook_method: '烹饪方式', taste: '口味', scenario: '场景', region: '地区', cook_tool: '工具', nutrition: '营养' }
const endpointIndexes = [1, 2, 3] as const

const loadAdminData = async () => {
  if (!isAllowed.value) return
  loading.value = true
  loadError.value = ''
  const [settingsResult, tagsResult, recipesResult, ingredientsResult, logsResult] = await Promise.allSettled([
    $fetch<AppSettings>('/api/admin/settings'),
    $fetch<Record<string, Omit<Tag, 'dimension'>[]>>('/api/tags'),
    $fetch<Recipe[]>('/api/recipes'),
    $fetch<Ingredient[]>('/api/ingredients'),
    $fetch<CookLog[]>('/api/cook-logs'),
  ])
  if (settingsResult.status === 'fulfilled') settings.value = settingsResult.value
  if (tagsResult.status === 'fulfilled') tags.value = Object.entries(tagsResult.value).flatMap(([dimension, list]) => list.map(tag => ({ ...tag, dimension })))
  if (recipesResult.status === 'fulfilled') stats.value.recipes = recipesResult.value.length
  if (ingredientsResult.status === 'fulfilled') stats.value.ingredients = ingredientsResult.value.length
  if (logsResult.status === 'fulfilled') stats.value.cookLogs = logsResult.value.length
  const failed = [settingsResult, tagsResult, recipesResult, ingredientsResult, logsResult].find(result => result.status === 'rejected')
  if (failed?.status === 'rejected') loadError.value = getApiErrorMessage(failed.reason, '部分管理数据没有加载出来。')
  loading.value = false
}

const saveSettings = async () => {
  if (settingsSaving.value) return
  settingsSaving.value = true
  settingsError.value = ''
  try { await $fetch('/api/admin/settings', { method: 'POST', body: settings.value }); toast.success('系统配置已保存。') }
  catch (error: unknown) { settingsError.value = getApiErrorMessage(error, '系统配置没有保存成功。') }
  finally { settingsSaving.value = false }
}

const checkHealth = async () => {
  if (checking.value) return
  checking.value = true
  try { healthResults.value = await $fetch<HealthResult[]>('/api/ai/health') }
  catch (error: unknown) { healthResults.value = []; toast.error(getApiErrorMessage(error, '连接检测没有完成。')) }
  finally { checking.value = false }
}

const addTag = async () => {
  const name = newTagName.value.trim()
  if (!name || tagBusy.value) { tagError.value = name ? '' : '请填写标签名称。'; return }
  tagBusy.value = true; tagError.value = ''
  try { const tag = await $fetch<Tag>('/api/tags', { method: 'POST', body: { name, dimension: newTagDimension.value } }); tags.value.push({ ...tag, dimension: newTagDimension.value }); newTagName.value = ''; toast.success('标签已添加。') }
  catch (error: unknown) { tagError.value = getApiErrorMessage(error, '标签没有添加成功。') }
  finally { tagBusy.value = false }
}
const startEditTag = (tag: Tag) => { editingTagId.value = tag.id; editingTagName.value = tag.name }
const cancelEditTag = () => { editingTagId.value = ''; editingTagName.value = '' }
const saveEditTag = async (tag: Tag) => {
  const name = editingTagName.value.trim()
  if (!name || tagBusy.value) return
  tagBusy.value = true; tagError.value = ''
  try { await $fetch('/api/tags/' + tag.id, { method: 'PATCH', body: { name } }); tag.name = name; cancelEditTag(); toast.success('标签已更新。') }
  catch (error: unknown) { tagError.value = getApiErrorMessage(error, '标签没有更新成功。') }
  finally { tagBusy.value = false }
}
const confirmDeleteTag = async () => {
  const tag = pendingDeleteTag.value
  if (!tag || deletingTag.value) return
  deletingTag.value = true
  try { await $fetch('/api/tags/' + tag.id, { method: 'DELETE' }); tags.value = tags.value.filter(item => item.id !== tag.id); pendingDeleteTag.value = null; toast.success('标签已删除。') }
  catch (error: unknown) { toast.error(getApiErrorMessage(error, '标签没有删除成功。')) }
  finally { deletingTag.value = false }
}

const isImportRecipe = (value: unknown): value is ImportRecipe => Boolean(value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string')
const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || importing.value) return
  importing.value = true; importResult.value = ''; importError.value = ''
  try {
    const parsed: unknown = JSON.parse(await file.text())
    const items = (Array.isArray(parsed) ? parsed : [parsed]).filter(isImportRecipe)
    if (!items.length) throw new Error('文件里没有带 name 字段的菜谱。')
    const results = await Promise.allSettled(items.map(item => $fetch('/api/recipes', { method: 'POST', body: item })))
    const success = results.filter(result => result.status === 'fulfilled').length
    importResult.value = '成功 ' + success + ' 条，失败 ' + (results.length - success) + ' 条，共 ' + results.length + ' 条。'
    stats.value.recipes = (await $fetch<Recipe[]>('/api/recipes')).length
    if (success) toast.success('菜谱导入完成。')
  } catch (error: unknown) { importError.value = getApiErrorMessage(error, '文件无法导入，请检查 JSON 格式。') }
  finally { importing.value = false; input.value = '' }
}

onMounted(async () => { await checkAuth(); authChecked.value = true; if (isAllowed.value) await loadAdminData() })
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="!authChecked" class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">正在确认管理权限…</div>
    <EmptyState v-else-if="!isAllowed" data-testid="admin-forbidden" title="这里仅供管理员维护" description="普通家庭成员不需要接触系统配置；如需维护，请使用管理员账号登录。"><NuxtLink to="/"><AppButton class="mt-4" variant="secondary">返回首页</AppButton></NuxtLink></EmptyState>

    <template v-else>
      <PageHeader title="管理与维护" eyebrow="仅管理员可见" description="集中维护标签、连接和数据导入。敏感配置默认折叠，避免误操作。"><template #actions><AppButton variant="secondary" :loading="loading" @click="loadAdminData">刷新数据</AppButton></template></PageHeader>
      <AppNotice v-if="loadError" class="mb-5" tone="warning" title="部分数据未加载" :message="loadError" />

      <section class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="数据概览"><div v-for="item in [{ label: '菜谱', value: stats.recipes }, { label: '标签', value: tags.length }, { label: '食材', value: stats.ingredients }, { label: '烹饪记录', value: stats.cookLogs }]" :key="item.label" class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"><p class="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">{{ item.value }}</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">{{ item.label }}</p></div></section>

      <div class="space-y-6">
        <section class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div class="mb-4"><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">标签管理</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">标签会出现在菜谱筛选和编辑界面中。</p></div>
          <form class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]" @submit.prevent="addTag"><div><label for="admin-tag-name" class="field-label">标签名称</label><input id="admin-tag-name" v-model="newTagName" class="field-control" placeholder="例如：下饭" /></div><div><label for="admin-tag-dimension" class="field-label">标签类别</label><select id="admin-tag-dimension" v-model="newTagDimension" class="field-control"><option v-for="(label, value) in tagDimensions" :key="value" :value="value">{{ label }}</option></select></div><div class="self-end"><AppButton type="submit" block :loading="tagBusy">添加标签</AppButton></div></form>
          <AppNotice v-if="tagError" class="mt-3" tone="danger" :message="tagError" />
          <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><article v-for="tag in tags" :key="tag.id" class="flex min-h-14 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2"><template v-if="editingTagId === tag.id"><label :for="'edit-tag-' + tag.id" class="sr-only">编辑{{ tag.name }}</label><input :id="'edit-tag-' + tag.id" v-model="editingTagName" class="field-control min-w-0 flex-1" @keyup.enter="saveEditTag(tag)" @keyup.escape="cancelEditTag" /><button class="touch-target shrink-0 rounded-md text-sm font-semibold text-[var(--color-success)]" aria-label="保存标签" @click="saveEditTag(tag)">✓</button><button class="touch-target shrink-0 rounded-md text-sm text-[var(--color-text-muted)]" aria-label="取消编辑" @click="cancelEditTag">×</button></template><template v-else><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ tag.name }}</p><p class="text-xs text-[var(--color-text-faint)]">{{ tagDimensions[tag.dimension] || tag.dimension }}</p></div><button class="touch-target shrink-0 rounded-md text-sm text-[var(--color-text-muted)]" :aria-label="'编辑标签' + tag.name" @click="startEditTag(tag)">编辑</button><button class="touch-target shrink-0 rounded-md text-lg text-[var(--color-text-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" :aria-label="'删除标签' + tag.name" @click="pendingDeleteTag = tag">×</button></template></article></div>
        </section>

        <section class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6"><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">数据导入</h2><p class="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">导入 JSON 菜谱。每条至少包含 <code>name</code>，可选描述、分类、难度、时间、步骤、食材与标签。已有数据不会被自动删除。</p><div class="mt-4"><label for="admin-import-file" class="field-label">选择 JSON 文件</label><input id="admin-import-file" type="file" accept="application/json,.json" class="block min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2 text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent-soft)] file:px-3 file:py-2 file:text-[var(--color-accent-strong)]" :disabled="importing" @change="handleImport" /></div><AppNotice v-if="importError" class="mt-3" tone="danger" :message="importError" /><AppNotice v-if="importResult" class="mt-3" tone="success" title="导入完成" :message="importResult" /></section>

        <details class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6"><summary class="flex min-h-11 cursor-pointer items-center justify-between gap-4"><span><strong class="block font-serif text-xl font-semibold text-[var(--color-text)]">敏感连接配置</strong><span class="mt-1 block text-sm text-[var(--color-text-muted)]">仅在更换 AI 服务或排查连接时展开。</span></span><span class="rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-warning)]">谨慎修改</span></summary><div class="mt-6 space-y-6">
          <section v-for="index in endpointIndexes" :key="index" class="rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)] p-4"><h3 class="font-semibold text-[var(--color-text)]">AI 服务 {{ index }}</h3><div class="mt-3 grid gap-3 sm:grid-cols-2"><div class="sm:col-span-2"><label :for="'ai-url-' + index" class="field-label">接口地址</label><input :id="'ai-url-' + index" v-model="settings.ai[('baseUrl' + index) as keyof AppSettings['ai']]" type="url" class="field-control font-mono text-xs" autocomplete="off" /></div><div><label :for="'ai-key-' + index" class="field-label">API 密钥</label><input :id="'ai-key-' + index" v-model="settings.ai[('apiKey' + index) as keyof AppSettings['ai']]" type="password" class="field-control font-mono text-xs" autocomplete="new-password" /></div><div><label :for="'ai-model-' + index" class="field-label">主要模型</label><input :id="'ai-model-' + index" v-model="settings.ai[('model' + index) as keyof AppSettings['ai']]" class="field-control font-mono text-xs" autocomplete="off" /></div><div class="sm:col-span-2"><label :for="'ai-light-' + index" class="field-label">轻量模型</label><input :id="'ai-light-' + index" v-model="settings.ai[('modelLight' + index) as keyof AppSettings['ai']]" class="field-control font-mono text-xs" autocomplete="off" /></div></div></section>
          <section class="rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)] p-4"><h3 class="font-semibold text-[var(--color-text)]">线稿服务</h3><div class="mt-3 grid gap-3 sm:grid-cols-2"><div><label for="xyq-url" class="field-label">接口地址</label><input id="xyq-url" v-model="settings.xyq.baseUrl" type="url" class="field-control font-mono text-xs" autocomplete="off" /></div><div><label for="xyq-key" class="field-label">访问密钥</label><input id="xyq-key" v-model="settings.xyq.accessKey" type="password" class="field-control font-mono text-xs" autocomplete="new-password" /></div></div></section>
          <AppNotice v-if="settingsError" tone="danger" :message="settingsError" /><div class="flex flex-col gap-2 sm:flex-row"><AppButton :loading="settingsSaving" @click="saveSettings">保存连接配置</AppButton><AppButton variant="secondary" :loading="checking" @click="checkHealth">检测 AI 连接</AppButton></div>
          <div v-if="healthResults.length" class="grid gap-2 sm:grid-cols-3"><article v-for="result in healthResults" :key="result.label" class="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-[var(--color-text)]">{{ result.label }}</span><span class="rounded-full px-2 py-1 text-xs font-semibold" :class="result.status === 'ok' ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : result.status === 'not_configured' ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]' : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'">{{ result.status === 'ok' ? '可用' : result.status === 'not_configured' ? '未配置' : '异常' }}</span></div><p class="mt-2 text-xs text-[var(--color-text-muted)]">{{ result.latency ? result.latency + ' ms' : result.error || '暂无延迟信息' }}</p></article></div>
        </div></details>
      </div>
    </template>

    <ConfirmDialog :open="Boolean(pendingDeleteTag)" :title="pendingDeleteTag ? '删除标签“' + pendingDeleteTag.name + '”？' : '删除标签？'" description="菜谱数据不会被删除，但这个筛选标签将不再可用。" confirm-label="删除标签" danger :busy="deletingTag" @confirm="confirmDeleteTag" @cancel="pendingDeleteTag = null" />
  </div>
</template>
