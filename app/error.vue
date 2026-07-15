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
  <main class="grid min-h-[100dvh] place-items-center bg-[var(--color-bg)] px-6 py-10 text-[var(--color-text)]">
    <section class="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="error-title">
      <p class="mb-5 text-6xl" aria-hidden="true">{{ is404 ? '🍳' : '😅' }}</p>
      <h1 id="error-title" class="heading-serif text-3xl">
        {{ is404 ? '这个页面找不到了' : '出了点小状况' }}
      </h1>
      <p class="mx-auto mt-3 max-w-[34ch] leading-7 text-[var(--color-text-muted)]">
        {{ is404 ? '可能链接不对，或者页面已经搬走了。' : '别担心，回到首页后可以继续使用厨房本。' }}
      </p>
      <AppButton class="mt-7" size="lg" @click="handleError">回到首页</AppButton>
    </section>
  </main>
</template>
