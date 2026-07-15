<script setup lang="ts">
import type { CookLog } from '~/types'

type ViewMode = 'week' | 'month' | 'quarter' | 'year'
type JourneyMeal = { day: string; date: string; dinner: string; score: number | null; logId: string; recipeId: string }
type JourneyWeek = { id: string; name: string; dateRange: string; monthKey: string; monthLabel: string; quarterKey: string; quarterLabel: string; year: string; meals: JourneyMeal[]; stats: { totalDishes: number; avgScore: number | null; topDish: string } }

const { getCookLogs } = useApi()
const logs = ref<CookLog[]>([])
const loading = ref(true)
const loadError = ref('')
const viewMode = ref<ViewMode>('week')

const parseLogDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const getISOWeek = (input: Date) => {
  const date = new Date(input.getFullYear(), input.getMonth(), input.getDate())
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
const getWeekStart = (input: Date) => {
  const date = new Date(input.getFullYear(), input.getMonth(), input.getDate())
  date.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1))
  return date
}
const dayLabel = (date: Date) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()] || ''
const monthDay = (date: Date) => (date.getMonth() + 1) + '月' + date.getDate() + '日'
const scoreOf = (log: CookLog) => {
  const scores = [log.selfScore, log.partnerScore].filter((score): score is number => typeof score === 'number' && score > 0)
  return scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null
}

const loadJourney = async () => {
  loading.value = true
  loadError.value = ''
  try { logs.value = await getCookLogs() }
  catch (error: unknown) { loadError.value = getApiErrorMessage(error, '厨房足迹没有加载出来。') }
  finally { loading.value = false }
}

const groupedWeeks = computed<JourneyWeek[]>(() => {
  const groups = new Map<string, CookLog[]>()
  for (const log of logs.value) {
    const date = parseLogDate(log.date)
    if (!date) continue
    const week = getISOWeek(date)
    const key = date.getFullYear() + '-W' + String(week).padStart(2, '0')
    groups.set(key, [...(groups.get(key) || []), log])
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, weekLogs]) => {
    const datedLogs = weekLogs.map(log => ({ log, date: parseLogDate(log.date)! })).filter(item => item.date)
    const firstDate = datedLogs[0]?.date || new Date(0)
    const startDate = getWeekStart(firstDate)
    const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6)
    const scores = weekLogs.map(scoreOf).filter((score): score is number => score !== null)
    const best = weekLogs.slice().sort((a, b) => (scoreOf(b) || 0) - (scoreOf(a) || 0))[0]
    const year = String(startDate.getFullYear())
    const month = startDate.getMonth() + 1
    const quarter = Math.ceil(month / 3)
    return {
      id: key,
      name: '第 ' + getISOWeek(firstDate) + ' 周',
      dateRange: monthDay(startDate) + ' — ' + monthDay(endDate),
      monthKey: year + '-' + String(month).padStart(2, '0'),
      monthLabel: year + '年' + month + '月',
      quarterKey: year + '-Q' + quarter,
      quarterLabel: year + '年 · 第' + quarter + '季度',
      year,
      meals: datedLogs.sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ log, date }) => ({ day: dayLabel(date), date: monthDay(date), dinner: log.recipe?.name || '未命名的一顿', score: scoreOf(log), logId: log.id, recipeId: log.recipeId })),
      stats: { totalDishes: weekLogs.length, avgScore: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null, topDish: best?.recipe?.name || '' },
    }
  })
})

const monthGroups = computed(() => groupedWeeks.value.reduce<Record<string, { label: string; weeks: JourneyWeek[] }>>((groups, week) => { (groups[week.monthKey] ||= { label: week.monthLabel, weeks: [] }).weeks.push(week); return groups }, {}))
const periodGroups = computed(() => {
  const keyOf = (week: JourneyWeek) => viewMode.value === 'quarter' ? week.quarterKey : week.year
  const labelOf = (week: JourneyWeek) => viewMode.value === 'quarter' ? week.quarterLabel : week.year + '年'
  return groupedWeeks.value.reduce<Record<string, { label: string; weeks: JourneyWeek[]; dishes: number; avgScore: number | null; favorites: string[] }>>((groups, week) => {
    const key = keyOf(week)
    const group = groups[key] ||= { label: labelOf(week), weeks: [], dishes: 0, avgScore: null, favorites: [] }
    group.weeks.push(week); group.dishes += week.stats.totalDishes
    if (week.stats.topDish && !group.favorites.includes(week.stats.topDish)) group.favorites.push(week.stats.topDish)
    const scores = group.weeks.map(item => item.stats.avgScore).filter((score): score is number => score !== null)
    group.avgScore = scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null
    return groups
  }, {})
})
const overallStats = computed(() => {
  const scores = logs.value.map(scoreOf).filter((score): score is number => score !== null)
  return { weeks: groupedWeeks.value.length, totalDishes: logs.value.length, avgScore: scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : '—' }
})

onMounted(() => { void loadJourney() })
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="厨房足迹" eyebrow="慢慢积累的日子" description="按时间翻看一起做过的饭，不排名，也不催促。">
      <template #actions><div class="flex rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-1" role="group" aria-label="足迹时间范围"><button v-for="mode in (['week', 'month', 'quarter', 'year'] as const)" :key="mode" class="min-h-11 min-w-11 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition" :class="viewMode === mode ? 'bg-white text-[var(--color-text)] shadow-[var(--shadow-sm)]' : 'text-[var(--color-text-muted)]'" :aria-pressed="viewMode === mode" @click="viewMode = mode">{{ { week: '周', month: '月', quarter: '季', year: '年' }[mode] }}</button></div></template>
    </PageHeader>

    <div v-if="loading" class="py-16 text-center text-sm text-[var(--color-text-muted)]" role="status">正在翻看厨房小本子…</div>
    <AppNotice v-else-if="loadError" tone="danger" role="alert" title="足迹没有加载出来" :message="loadError"><AppButton class="mt-3" variant="secondary" @click="loadJourney">重新加载</AppButton></AppNotice>
    <EmptyState v-else-if="!logs.length" title="足迹会从第一顿开始" description="做完饭后先记下这件事，这里就会慢慢长出属于你们的时间线。"><NuxtLink to="/cook-logs"><AppButton class="mt-4">去记一顿</AppButton></NuxtLink></EmptyState>

    <template v-else>
      <section class="mb-8 grid grid-cols-3 gap-2 sm:gap-4" aria-label="足迹概览"><div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center sm:p-5"><p class="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">{{ overallStats.weeks }}</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">有记录的周</p></div><div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center sm:p-5"><p class="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text)]">{{ overallStats.totalDishes }}</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">一起做过</p></div><div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center sm:p-5"><p class="font-mono text-2xl font-semibold tabular-nums text-[var(--color-accent)]">{{ overallStats.avgScore }}</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">有评分的平均</p></div></section>

      <div v-if="viewMode === 'week'" class="space-y-8"><section v-for="week in groupedWeeks" :key="week.id"><header class="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">{{ week.name }}</h2><span class="font-mono text-xs text-[var(--color-text-faint)]">{{ week.dateRange }}</span><span class="ml-auto text-xs font-semibold text-[var(--color-accent)]">{{ week.stats.totalDishes }} 顿</span></header><div class="space-y-2"><NuxtLink v-for="meal in week.meals" :key="meal.logId" :to="meal.recipeId ? '/recipes/' + meal.recipeId : '/cook-logs?editLog=' + meal.logId" class="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-soft)]"><div><p class="font-serif text-sm text-[var(--color-text-muted)]">{{ meal.day }}</p><p class="mt-1 text-[11px] text-[var(--color-text-faint)]">{{ meal.date }}</p></div><p class="truncate font-serif font-semibold text-[var(--color-text)]">{{ meal.dinner }}</p><span class="font-mono text-xs font-semibold text-[var(--color-accent)]">{{ meal.score ? '⭐ ' + meal.score : '已记录' }}</span></NuxtLink></div></section></div>

      <div v-else-if="viewMode === 'month'" class="space-y-8"><section v-for="group in monthGroups" :key="group.label"><h2 class="mb-4 font-serif text-xl font-semibold text-[var(--color-text)]">{{ group.label }}</h2><div class="grid gap-4 sm:grid-cols-2"><article v-for="week in group.weeks" :key="week.id" class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div class="flex items-center justify-between"><h3 class="font-serif font-semibold text-[var(--color-text)]">{{ week.name }}</h3><span class="font-mono text-xs text-[var(--color-text-muted)]">{{ week.stats.totalDishes }} 顿</span></div><ul class="mt-3 space-y-2"><li v-for="meal in week.meals" :key="meal.logId" class="flex gap-3 text-sm"><span class="w-8 shrink-0 text-[var(--color-text-faint)]">{{ meal.day }}</span><span class="truncate text-[var(--color-text)]">{{ meal.dinner }}</span></li></ul></article></div></section></div>

      <div v-else class="grid gap-4 sm:grid-cols-2"><article v-for="group in periodGroups" :key="group.label" class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"><p class="text-sm text-[var(--color-text-muted)]">{{ group.label }}</p><p class="mt-2 font-serif text-2xl font-semibold text-[var(--color-text)]">做过 {{ group.dishes }} 顿饭</p><p class="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{{ group.weeks.length }} 个有记录的周<span v-if="group.avgScore">，平均评分 {{ group.avgScore }}</span>。每一顿都算数。</p><p v-if="group.favorites.length" class="mt-4 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] p-3 text-sm text-[var(--color-accent-strong)]">这一段时间常想起：{{ group.favorites.slice(0, 3).join('、') }}</p></article></div>
    </template>
  </div>
</template>
