<script setup lang="ts">
const achievements = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    achievements.value = await $fetch('/api/achievements')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="animate-fade-in">
    <div class="mb-8">
      <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Milestones</p>
      <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">家庭厨房成就</h1>
    </div>

    <div v-if="loading" class="text-sm text-[#8B7D6B]">正在翻成就册...</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <article
        v-for="item in achievements"
        :key="item.code"
        class="bg-white rounded-lg border p-5 transition-all"
        :class="item.unlocked ? 'border-[#6D8B74]/40 shadow-sm' : 'border-gray-200 opacity-60'"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs text-[#A69080] uppercase tracking-widest mb-2">{{ item.code }}</p>
            <h2 class="font-serif text-xl font-bold text-[#1a1714]">{{ item.name }}</h2>
          </div>
          <span class="text-xs px-2 py-1 rounded-full" :class="item.unlocked ? 'bg-[#6D8B74]/10 text-[#6D8B74]' : 'bg-gray-100 text-[#A69080]'">
            {{ item.unlocked ? '已解锁' : '未解锁' }}
          </span>
        </div>
        <p class="text-sm text-[#6B5D4D] mt-3">{{ item.description }}</p>
      </article>
    </div>
  </div>
</template>
