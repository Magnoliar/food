<script setup lang="ts">
import type { CookLog, Recipe, Tag } from '~/types'

const route = useRoute()
const router = useRouter()
const { getRecipes, getCookLogs, createCookLog, updateCookLog, uploadMedia } = useApi()
const toast = useToast()

type LogForm = { recipeId: string; selfScore: number; partnerScore: number; selfComment: string; partnerComment: string; notes: string; photos: string[] }
const emptyForm = (): LogForm => ({ recipeId: '', selfScore: 0, partnerScore: 0, selfComment: '', partnerComment: '', notes: '', photos: [] })
const logs = ref<CookLog[]>([])
const recipes = ref<Recipe[]>([])
const loading = ref(true)
const loadError = ref('')
const showCreateModal = ref(false)
const saving = ref(false)
const uploadingPhotos = ref(false)
const photoError = ref('')
const formError = ref('')
const aiMessage = ref('')
const editingLogId = ref('')
const draftLoading = ref(false)
const uploadedAssets = ref<Array<{ url: string; id: string }>>([])
const lightboxLog = ref<CookLog | null>(null)
const lightboxIndex = ref(0)
const lightboxRef = ref<HTMLElement | null>(null)
const pendingDeleteId = ref('')
const deleting = ref(false)
const discardConfirmOpen = ref(false)
const pendingNavigation = ref('')
const initialFormSnapshot = ref('')
const newLog = ref<LogForm>(emptyForm())
const formSnapshot = () => JSON.stringify(newLog.value)
const isFormDirty = computed(() => showCreateModal.value && formSnapshot() !== initialFormSnapshot.value)

const openLightbox = (log: CookLog, index: number) => { lightboxLog.value = log; lightboxIndex.value = index }
const closeLightbox = () => { lightboxLog.value = null; lightboxIndex.value = 0 }
const lightboxPrev = () => { if (!lightboxLog.value) return; const total = lightboxLog.value.photos?.length || 0; if (!total) return; lightboxIndex.value = (lightboxIndex.value - 1 + total) % total; lightboxRef.value?.focus() }
const lightboxNext = () => { if (!lightboxLog.value) return; const total = lightboxLog.value.photos?.length || 0; if (!total) return; lightboxIndex.value = (lightboxIndex.value + 1) % total; lightboxRef.value?.focus() }
const lightboxPhoto = computed(() => lightboxLog.value?.photos?.[lightboxIndex.value] || null)
const handleLightboxKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeLightbox(); else if (event.key === 'ArrowLeft') lightboxPrev(); else if (event.key === 'ArrowRight') lightboxNext() }
watch(lightboxLog, value => { if (value) nextTick(() => lightboxRef.value?.focus()) })

const loadPage = async () => {
  loading.value = true; loadError.value = ''
  try { const [recipeData, logData] = await Promise.all([getRecipes(), getCookLogs()]); recipes.value = recipeData; logs.value = logData; openFromQuery() }
  catch (error: unknown) { loadError.value = getApiErrorMessage(error, '烹饪记录没有加载出来。') }
  finally { loading.value = false }
}
const resetNewLog = () => { editingLogId.value = ''; newLog.value = emptyForm(); photoError.value = ''; formError.value = ''; aiMessage.value = ''; uploadedAssets.value = []; initialFormSnapshot.value = formSnapshot() }
const fillLogForm = (log: CookLog) => { editingLogId.value = log.id; newLog.value = { recipeId: log.recipeId || '', selfScore: log.selfScore || 0, partnerScore: log.partnerScore || 0, selfComment: log.selfComment || '', partnerComment: log.partnerComment || '', notes: log.notes || '', photos: [...(log.photos || [])] }; photoError.value = ''; formError.value = ''; aiMessage.value = ''; uploadedAssets.value = []; initialFormSnapshot.value = formSnapshot() }
const openCreateModal = (recipeId = '') => { resetNewLog(); newLog.value.recipeId = recipeId; initialFormSnapshot.value = formSnapshot(); showCreateModal.value = true }
const openEditModal = (log: CookLog) => { fillLogForm(log); showCreateModal.value = true }
const cleanupUploadedAssets = () => { const assets = [...uploadedAssets.value]; uploadedAssets.value = []; for (const asset of assets) void $fetch('/api/media/delete', { method: 'POST', body: { id: asset.id } }).catch(() => toast.warning('有一张未保存照片暂时没有清理成功。')) }
const finishCloseModal = () => { cleanupUploadedAssets(); showCreateModal.value = false; resetNewLog(); discardConfirmOpen.value = false; clearEntryQuery() }
const closeCreateModal = () => { if (saving.value || uploadingPhotos.value) return; if (isFormDirty.value) { discardConfirmOpen.value = true; return }; finishCloseModal() }
const discardChanges = async () => { const target = pendingNavigation.value; pendingNavigation.value = ''; finishCloseModal(); if (target) await navigateTo(target) }
const cancelDiscard = () => { discardConfirmOpen.value = false; pendingNavigation.value = '' }

const createLog = async () => {
  if (!newLog.value.recipeId || saving.value) return
  saving.value = true; formError.value = ''
  try {
    const wasEditing = Boolean(editingLogId.value)
    const log = wasEditing ? await updateCookLog(editingLogId.value, newLog.value) : await createCookLog(newLog.value)
    const index = logs.value.findIndex(item => item.id === log.id)
    if (index >= 0) logs.value[index] = log; else logs.value.unshift(log)
    uploadedAssets.value = []
    showCreateModal.value = false; resetNewLog(); clearEntryQuery(); toast.success(wasEditing ? '记录已更新。' : '这顿已经记下了。')
  } catch (error: unknown) { formError.value = getApiErrorMessage(error, '记录没有保存成功，请再试一次。') }
  finally { saving.value = false }
}
const generateDraft = async () => {
  const recipeName = recipes.value.find(recipe => recipe.id === newLog.value.recipeId)?.name || ''
  if (!recipeName || draftLoading.value) return
  draftLoading.value = true; aiMessage.value = ''
  try { const result = await $fetch<{ draft: string }>('/api/ai/review-draft', { method: 'POST', body: { recipeName, selfScore: newLog.value.selfScore || undefined, partnerScore: newLog.value.partnerScore || undefined, selfComment: newLog.value.selfComment || undefined, partnerComment: newLog.value.partnerComment || undefined } }); if (result.draft) { newLog.value.notes = result.draft; aiMessage.value = '已经写好一版，可以继续修改。' } }
  catch { aiMessage.value = '智能草稿暂时不可用，手动填写不受影响。' }
  finally { draftLoading.value = false }
}
const openFromQuery = () => { const editLogId = typeof route.query.editLog === 'string' ? route.query.editLog : ''; if (editLogId) { const log = logs.value.find(item => item.id === editLogId); if (log) openEditModal(log); return }; if (route.query.create === '1') openCreateModal(typeof route.query.recipeId === 'string' ? route.query.recipeId : '') }
const clearEntryQuery = () => { if (route.query.create || route.query.editLog || route.query.recipeId) void router.replace({ path: route.path, query: {} }) }
const handlePhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement; const files = Array.from(input.files || []); if (!files.length) return
  photoError.value = ''; uploadingPhotos.value = true
  try { for (const file of files.slice(0, 8)) { if (newLog.value.photos.length >= 20) break; const asset = await uploadMedia(file, 'cook-log'); newLog.value.photos.push(asset.url); if (asset.id) uploadedAssets.value.push({ url: asset.url, id: asset.id }) }; toast.success(files.length > 1 ? '照片已上传。' : '照片已上传。') }
  catch (error: unknown) { photoError.value = getApiErrorMessage(error, '照片上传失败，请换一张小于 5MB 的 jpg、png 或 webp。') }
  finally { uploadingPhotos.value = false; input.value = '' }
}
const removePendingPhoto = (index: number) => { const removedUrl = newLog.value.photos[index]; newLog.value.photos.splice(index, 1); const assetIndex = uploadedAssets.value.findIndex(asset => asset.url === removedUrl); if (assetIndex >= 0) { const [asset] = uploadedAssets.value.splice(assetIndex, 1); if (asset) void $fetch('/api/media/delete', { method: 'POST', body: { id: asset.id } }).catch(() => toast.error('照片已从表单移除，但文件清理失败。')) } }
const photoLabel = (index: string | number) => `查看第 ${Number(index) + 1} 张烹饪照片`
const removePhotoLabel = (index: string | number) => `移除第 ${Number(index) + 1} 张照片`
const requestDeleteLog = (id: string) => { pendingDeleteId.value = id }
const confirmDeleteLog = async () => { if (!pendingDeleteId.value || deleting.value) return; deleting.value = true; try { await $fetch(`/api/cook-logs/${pendingDeleteId.value}`, { method: 'DELETE' }); logs.value = logs.value.filter(log => log.id !== pendingDeleteId.value); pendingDeleteId.value = ''; toast.success('记录已删除。') } catch (error: unknown) { toast.error(getApiErrorMessage(error, '记录没有删除成功。')) } finally { deleting.value = false } }
const recipeTagName = (tag: Tag | string) => typeof tag === 'string' ? tag : tag.name
const scoreColor = (score: number) => score >= 9 ? 'text-[var(--color-accent)]' : score >= 7 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (!isFormDirty.value) return; event.preventDefault(); event.returnValue = '' }
onBeforeRouteLeave((to) => { if (!isFormDirty.value) return true; pendingNavigation.value = to.fullPath; discardConfirmOpen.value = true; return false })

onMounted(() => { void loadPage(); window.addEventListener('beforeunload', handleBeforeUnload) })
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="烹饪记录" eyebrow="厨房小本子" description="先记下做过这件事，照片、评分和复盘都可以慢慢补。"><template #actions><AppButton data-testid="cooklog-open-create" @click="openCreateModal()">快速记录</AppButton></template></PageHeader>

    <!-- Loading -->
    <div v-if="loading" class="py-12 text-center text-[var(--color-text-muted)]">正在翻烹饪日志…</div>
    <AppNotice v-else-if="loadError" tone="danger" role="alert" title="记录没有加载出来" :message="loadError"><AppButton class="mt-3" variant="secondary" @click="loadPage">重新加载</AppButton></AppNotice>

    <!-- Empty state -->
    <EmptyState v-else-if="!logs.length" title="还没有烹饪记录" description="做完一道菜后，先用快速记录把这顿存下来。"><AppButton class="mt-4" @click="openCreateModal()">记下第一顿</AppButton></EmptyState>

    <!-- Log list -->
    <div v-else class="space-y-4">
      <div v-for="log in logs" :key="log.id"
        data-testid="cooklog-card"
        class="surface-card p-4 transition-colors hover:border-[var(--color-border-strong)] sm:p-5">
        <div class="flex items-start justify-between mb-3">
          <div>
            <NuxtLink :to="`/recipes/${log.recipeId}`" class="text-base font-bold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]">
              {{ log.recipe?.name || '未知菜谱' }}
            </NuxtLink>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="tag in (log.recipe?.tags || [])" :key="recipeTagName(tag)"
                class="min-h-7 rounded-md bg-[var(--color-bg-soft)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                {{ recipeTagName(tag) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-[var(--color-text-faint)]">{{ log.date?.split('T')[0] }}</span>
            <button class="touch-target flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-faint)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]" aria-label="删除这条记录" @click="requestDeleteLog(log.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
            </button>
            <button class="touch-target rounded-[var(--radius-md)] px-3 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]" @click="openEditModal(log)">
              编辑
            </button>
          </div>
        </div>

        <!-- Scores -->
        <div class="flex gap-6 text-sm">
          <div v-if="log.selfScore">
            <span class="text-xs font-medium text-[var(--color-text-muted)]">猪猪</span>
            <span class="font-mono font-bold ml-1" :class="scoreColor(log.selfScore)">{{ log.selfScore }}/10</span>
          </div>
          <div v-if="log.partnerScore">
            <span class="text-xs font-medium text-[var(--color-text-muted)]">猪宝</span>
            <span class="font-mono font-bold ml-1" :class="scoreColor(log.partnerScore)">{{ log.partnerScore }}/10</span>
          </div>
        </div>

        <!-- Photos -->
        <div v-if="log.photos?.length" class="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          <button
            v-for="(photo, index) in log.photos"
            :key="`${log.id}-${photo}`"
            type="button"
            data-testid="cooklog-photo"
            class="touch-target aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)]"
            :aria-label="photoLabel(index)"
            @click="openLightbox(log, Number(index))">
            <img :src="photo" :alt="`${log.recipe?.name || '这道菜'}的第 ${Number(index) + 1} 张烹饪照片`" width="320" height="320" class="h-full w-full object-cover" loading="lazy" />
          </button>
        </div>

        <!-- Comments -->
        <div v-if="log.selfComment || log.partnerComment || log.notes" class="mt-3 space-y-1 border-t border-[var(--color-border)] pt-3">
          <p v-if="log.selfComment" class="text-sm text-[var(--color-text-muted)]">猪猪: {{ log.selfComment }}</p>
          <p v-if="log.partnerComment" class="text-sm text-[var(--color-text-muted)]">猪宝: {{ log.partnerComment }}</p>
          <p v-if="log.notes" class="text-sm italic text-[var(--color-text-faint)]">{{ log.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] p-0 sm:items-center sm:p-4" @click.self="closeCreateModal">
      <div class="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)] sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cooklog-form-title">
        <div class="mb-5">
          <h2 id="cooklog-form-title" class="font-serif text-xl font-semibold text-[var(--color-text)]">{{ editingLogId ? '补完整这顿' : '先记一顿' }}</h2>
          <p class="mt-1 text-sm text-[var(--color-text-muted)]">
            {{ editingLogId ? '照片、评分和复盘慢慢补也可以。' : '选好菜谱先存着，照片和评分吃完再补也行。' }}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label for="cooklog-recipe" class="field-label">菜谱</label>
            <select id="cooklog-recipe" v-model="newLog.recipeId" data-testid="cooklog-recipe-select" class="field-control">
              <option value="" disabled>选择菜谱...</option>
              <option v-for="r in recipes" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cooklog-self-score" class="field-label">猪猪评分</label>
              <input id="cooklog-self-score" v-model.number="newLog.selfScore" type="number" min="0" max="10" inputmode="numeric" class="field-control font-mono" />
            </div>
            <div>
              <label for="cooklog-partner-score" class="field-label">猪宝评分</label>
              <input id="cooklog-partner-score" v-model.number="newLog.partnerScore" type="number" min="0" max="10" inputmode="numeric" class="field-control font-mono" />
            </div>
          </div>

          <div>
            <label for="cooklog-self-comment" class="field-label">猪猪评语</label>
            <input id="cooklog-self-comment" v-model="newLog.selfComment" class="field-control" />
          </div>

          <div>
            <label for="cooklog-partner-comment" class="field-label">猪宝评语</label>
            <input id="cooklog-partner-comment" v-model="newLog.partnerComment" class="field-control" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="cooklog-notes" class="field-label">一点复盘</label>
              <button
                v-if="newLog.recipeId"
                type="button"
                class="touch-target rounded-lg px-2 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
                :disabled="draftLoading"
                @click="generateDraft"
              >{{ draftLoading ? '生成中...' : 'AI 帮写' }}</button>
            </div>
            <textarea id="cooklog-notes" v-model="newLog.notes" data-testid="cooklog-notes" rows="2" class="field-control resize-y" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="cooklog-photo-input" class="field-label">照片</label>
              <span class="text-xs text-[var(--color-text-faint)]">{{ newLog.photos.length }}/20</span>
            </div>
            <label
              class="flex min-h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              :class="uploadingPhotos ? 'opacity-70 pointer-events-none' : ''">
              <span>{{ uploadingPhotos ? '上传中...' : '添加烹饪照片' }}</span>
              <input id="cooklog-photo-input" data-testid="cooklog-photo-input" type="file" accept="image/*" multiple class="hidden" @change="handlePhotoUpload" />
            </label>
            <p v-if="photoError" class="mt-2 text-xs text-[var(--color-danger)]">{{ photoError }}</p>
            <div v-if="newLog.photos.length" class="mt-3 grid grid-cols-4 gap-2">
              <div
                v-for="(photo, index) in newLog.photos"
                :key="photo"
                data-testid="cooklog-photo-preview"
                class="relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                <img :src="photo" :alt="`待保存的第 ${Number(index) + 1} 张烹饪照片`" width="160" height="160" class="h-full w-full object-cover" />
                <button
                  type="button"
                  class="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg text-white transition hover:bg-black/75"
                  :aria-label="removePhotoLabel(index)"
                  @click="removePendingPhoto(index)">
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <AppNotice v-if="formError" class="mt-4" tone="danger" role="alert" :message="formError" /><AppNotice v-if="aiMessage" class="mt-4" :tone="aiMessage.includes('不可用') ? 'warning' : 'success'" :message="aiMessage" />
        <div class="mt-6 grid grid-cols-2 gap-2"><AppButton variant="secondary" block :disabled="saving || uploadingPhotos" @click="closeCreateModal">取消</AppButton><AppButton block data-testid="cooklog-save" :loading="saving" :disabled="uploadingPhotos || !newLog.recipeId" @click="createLog">{{ editingLogId ? '更新记录' : '先保存' }}</AppButton></div>
      </div>
    </div>
    <ConfirmDialog :open="Boolean(pendingDeleteId)" title="删除这条记录？" description="照片、评分和文字都会一起删除，且无法撤销。" confirm-label="删除记录" danger :busy="deleting" @confirm="confirmDeleteLog" @cancel="pendingDeleteId = ''" />
    <ConfirmDialog :open="discardConfirmOpen" title="放弃尚未保存的修改？" description="刚刚填写的评分、文字和新上传照片会被移除。" confirm-label="放弃修改" danger @confirm="discardChanges" @cancel="cancelDiscard" />
    <!-- 照片灯箱 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="lightboxLog && lightboxPhoto" ref="lightboxRef" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 outline-none" tabindex="-1" @click.self="closeLightbox" @keydown="handleLightboxKeydown">
          <button class="touch-target absolute right-4 top-4 z-10 flex items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="关闭照片预览" @click="closeLightbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-8 h-8"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" /></svg>
          </button>
          <button v-if="(lightboxLog.photos?.length || 0) > 1" class="touch-target absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="上一张照片" @click="lightboxPrev">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-10 h-10"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button v-if="(lightboxLog.photos?.length || 0) > 1" class="touch-target absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="下一张照片" @click="lightboxNext">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-10 h-10"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <img :src="lightboxPhoto" :alt="`${lightboxLog.recipe?.name || '这道菜'}的烹饪照片，第 ${lightboxIndex + 1} 张`" width="1600" height="1200" class="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
          <p class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">{{ lightboxIndex + 1 }} / {{ lightboxLog.photos?.length || 0 }}</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
