<script setup lang="ts">
const { init: initDark } = useDarkMode()
onMounted(() => {
  initDark()
})
</script>

<template>
  <div class="min-h-screen bg-transparent dark:bg-dark-bg">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
