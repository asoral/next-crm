<template>
  <div class="min-h-screen p-4 space-y-4 ">
    <div v-if="pageData">
      <div
        v-html="pageData.main_section_html"
        class="p-4  w-full min-h-screen"
      />
    </div>


    <div v-else>
      Loading...
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const webPageName = route.params.webPageName
const pageData = ref(null)

onMounted(async () => {
  const res = await fetch(`/api/resource/CRM Web Page/${webPageName}`)
  const data = await res.json()
  pageData.value = data.data
})
</script>
<style>
html,
body,
#app {
  height: 100%;
}
</style>
