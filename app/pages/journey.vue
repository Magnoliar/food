<script setup lang="ts">
const { getCookLogs } = useApi()

const logs = ref<any[]>([])
const loading = ref(true)
const viewMode = ref<'week' | 'month' | 'quarter' | 'year'>('week')

const loadJourney = async () => {
  try {
    const cookLogs = await getCookLogs()
    logs.value = cookLogs.length ? cookLogs : []
  } catch {
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadJourney)
onServerPrefetch(loadJourney)

const groupedWeeks = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const log of logs.value) {
    const d = new Date(log.date)
    const weekKey = getISOWeekKey(d)
    if (!groups[weekKey]) groups[weekKey] = []
    groups[weekKey].push(log)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, weekLogs]) => {
      const first = new Date(weekLogs[0].date)
      const startDate = getWeekStart(first)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const meals = weekLogs.map(log => ({
        day: getDayLabel(new Date(log.date)),
        dinner: log.recipe?.name || '未知',
        score: log.selfScore || log.partnerScore || null,
        logId: log.id,
      }))
      const avgScore = weekLogs.length
        ? weekLogs.reduce((sum, l) => sum + ((l.selfScore || 0) + (l.partnerScore || 0)), 0) / weekLogs.length
        : 0
      return {
        id: key,
        name: `第${getISOWeek(first)}周`,
        dateRange: `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`,
        month: `${startDate.getMonth() + 1}月`,
        quarter: `Q${Math.ceil((startDate.getMonth() + 1) / 3)}`,
        meals,
        stats: {
          totalDishes: weekLogs.length,
          avgScore: Number(avgScore.toFixed(1)),
          topDish: weekLogs.reduce((best, l) => ((l.selfScore || 0) > (best.selfScore || 0)) ? l : best, weekLogs[0])?.recipe?.name || '',
        },
      }
    })
})

const monthGroups = computed(() => {
  const groups: Record<string, typeof groupedWeeks.value> = {}
  groupedWeeks.value.forEach(w => {
    const month = w.month || '未知'
    if (!groups[month]) groups[month] = []
    groups[month].push(w)
  })
  return groups
})

const overallStats = computed(() => {
  const all = groupedWeeks.value
  if (!all.length) return { weeks: 0, totalDishes: 0, avgScore: '0' }
  const totalDishes = all.reduce((s, w) => s + w.stats.totalDishes, 0)
  const avgScore = all.reduce((s, w) => s + w.stats.avgScore, 0) / all.length
  return { weeks: all.length, totalDishes, avgScore: avgScore.toFixed(1) }
})

function getISOWeekKey(d: Date): string {
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return date
}

function getDayLabel(d: Date): string {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return labels[d.getDay()] || ''
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="flex items-end justify-between mb-8">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Food Journey</p>
        <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">美食足迹</h1>
      </div>
      <div class="flex gap-1 p-1 bg-gray-100 rounded-lg">
        <button v-for="mode in (['week', 'month', 'quarter', 'year'] as const)" :key="mode"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          :class="viewMode === mode ? 'bg-white text-[#1a1714] shadow-sm' : 'text-[#8B7D6B] hover:text-[#1a1714]'"
          @click="viewMode = mode">
          {{ { week: '周', month: '月', quarter: '季', year: '年' }[mode] }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12"><p class="text-[#A69080]">正在回顾美食足迹...</p></div>
    <div v-else-if="!logs.length" class="text-center py-20">
      <p class="text-4xl mb-4">🗺️</p>
      <p class="text-[#8B7D6B] mb-2">还没有烹饪记录，等你开灶那天就开始了</p>
      <NuxtLink to="/cook-logs" class="inline-block mt-4 px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors">去记录</NuxtLink>
    </div>

    <template v-else>
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-lg p-5 border border-gray-200 text-center">
          <p class="font-mono text-2xl font-bold text-[#1a1714]">{{ overallStats.weeks }}</p>
          <p class="text-xs text-[#8B7D6B] mt-1">记录周数</p>
        </div>
        <div class="bg-white rounded-lg p-5 border border-gray-200 text-center">
          <p class="font-mono text-2xl font-bold text-[#1a1714]">{{ overallStats.totalDishes }}</p>
          <p class="text-xs text-[#8B7D6B] mt-1">做过菜品</p>
        </div>
        <div class="bg-white rounded-lg p-5 border border-gray-200 text-center">
          <p class="font-mono text-2xl font-bold text-[#D86830]">{{ overallStats.avgScore }}</p>
          <p class="text-xs text-[#8B7D6B] mt-1">平均评分</p>
        </div>
      </div>

      <template v-if="viewMode === 'week'">
        <div v-for="week in groupedWeeks" :key="week.id" class="mb-6">
          <div class="flex items-center gap-3 mb-3">
            <h2 class="font-serif text-lg font-bold text-[#1a1714]">{{ week.name }}</h2>
            <span class="font-mono text-xs text-[#A69080]">{{ week.dateRange }}</span>
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="font-mono text-xs text-[#D86830] font-bold">{{ week.stats.totalDishes }} 道</span>
          </div>
          <div class="space-y-2">
            <div v-for="meal in week.meals" :key="meal.logId" class="flex items-center gap-4 bg-white rounded-lg border border-gray-200 px-5 py-3 hover:border-gray-300 transition-colors">
              <span class="font-serif text-sm text-[#8B7D6B] w-10 flex-shrink-0">{{ meal.day }}</span>
              <div class="w-px h-5 bg-gray-200"></div>
              <div class="flex-1 min-w-0">
                <NuxtLink v-if="meal.logId && !meal.logId.startsWith('ac-')" :to="`/recipes/${meal.logId}`" class="font-serif text-sm text-[#1a1714] font-medium hover:text-[#C06030]">{{ meal.dinner }}</NuxtLink>
                <span v-else class="font-serif text-sm text-[#1a1714] font-medium">{{ meal.dinner }}</span>
              </div>
              <span class="font-mono text-xs font-bold text-[#D86830]">{{ meal.score ? '⭐ ' + meal.score : '' }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-if="viewMode === 'month'">
        <div v-for="(weeks, month) in monthGroups" :key="month" class="mb-8">
          <h2 class="font-serif text-xl font-bold text-[#1a1714] mb-4">{{ month }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="week in weeks" :key="week.id" class="bg-white rounded-lg border border-gray-200 p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-serif text-base font-bold text-[#1a1714]">{{ week.name }}</h3>
                <span class="font-mono text-xs text-[#8B7D6B]">{{ week.stats.totalDishes }} 道</span>
              </div>
              <div class="space-y-1.5">
                <div v-for="meal in week.meals" :key="meal.logId" class="flex items-center gap-2 text-sm">
                  <span class="text-[#A69080] text-xs w-8">{{ meal.day }}</span>
                  <span class="text-[#1a1714] truncate">{{ meal.dinner }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="viewMode === 'quarter' || viewMode === 'year'">
        <div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p class="text-lg text-[#8B7D6B] font-serif">📊 数据积累中...</p>
          <p class="text-sm text-[#A69080] mt-2">记录更多周次后，{{ viewMode === 'quarter' ? '季度' : '年度' }}总结将自动汇总</p>
        </div>
      </template>
    </template>
  </div>
</template>
