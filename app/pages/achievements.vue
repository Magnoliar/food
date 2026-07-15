<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

interface AchievementItem {
  id: string
  code: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt: string | null
}

const achievements = ref<AchievementItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

const unlockedCount = computed(() => achievements.value.filter(item => item.unlocked).length)

async function loadAchievements() {
  loading.value = true
  errorMessage.value = ''
  try {
    achievements.value = await $fetch<AchievementItem[]>('/api/achievements')
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '厨房回忆暂时没有加载成功。')
  } finally {
    loading.value = false
  }
}

function formatUnlockedAt(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

onMounted(() => { void loadAchievements() })
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="厨房里的小纪念" description="这些不是任务，只是一起做饭时自然留下的小小里程碑。">
      <template v-if="!loading && achievements.length" #actions>
        <span class="rounded-full bg-[var(--color-success-soft)] px-3 py-2 text-sm font-medium text-[var(--color-success)]">
          已留下 {{ unlockedCount }} 个纪念
        </span>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="正在加载厨房纪念">
      <div v-for="index in 5" :key="index" class="h-44 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]" />
    </div>

    <div v-else-if="errorMessage" class="max-w-xl">
      <AppNotice tone="danger" role="alert" title="暂时翻不开纪念册" :message="errorMessage" />
      <AppButton class="mt-4" @click="loadAchievements">重新加载</AppButton>
    </div>

    <EmptyState v-else-if="!achievements.length" title="纪念册还是空的" description="继续按自己的节奏做饭、记录，故事会慢慢长出来。" />

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="item in achievements"
        :key="item.code"
        class="surface-card min-h-44 p-5"
        :class="item.unlocked ? 'border-[var(--color-success)]/30' : 'opacity-70'"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-[var(--color-accent)]">厨房纪念</p>
            <h2 class="heading-serif mt-1 text-xl text-[var(--color-text)]">{{ item.name }}</h2>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="item.unlocked ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]'"
          >
            {{ item.unlocked ? '已经遇见' : '以后也许会遇见' }}
          </span>
        </div>
        <p class="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{{ item.description }}</p>
        <p v-if="item.unlockedAt" class="mt-4 text-xs text-[var(--color-text-subtle)]">{{ formatUnlockedAt(item.unlockedAt) }}</p>
      </article>
    </div>
  </div>
</template>
