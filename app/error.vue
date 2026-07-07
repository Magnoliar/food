<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage: string
    message: string
  }
}>()

const is404 = computed(() => props.error?.statusCode === 404)

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen bg-[#FAF7F0] flex items-center justify-center px-6">
    <div class="text-center max-w-md">
      <p class="text-6xl mb-6">{{ is404 ? '🍳' : '😅' }}</p>
      <h1 class="text-3xl font-serif font-bold text-[#1a1714] mb-3">
        {{ is404 ? '这个页面找不到了' : '出了点小状况' }}
      </h1>
      <p class="text-[#8B7D6B] mb-8">
        {{ is404 ? '可能链接不对，或者页面已经搬走了。' : '别担心，刷新一下可能就好了。' }}
      </p>
      <button
        class="px-6 py-3 bg-[#C06030] text-white rounded-lg font-medium hover:bg-[#A85028] transition-colors"
        @click="handleError"
      >
        回到首页
      </button>
    </div>
  </div>
</template>
