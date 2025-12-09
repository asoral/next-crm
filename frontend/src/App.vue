<template>
  <Layout class="isolate" v-if="session().isLoggedIn">
    <router-view :key="routeKey" />
  </Layout>
  <Dialogs />
  <Toasts />
</template>

<script setup>
import { Dialogs } from '@/utils/dialogs'
import { sessionStore as session } from '@/stores/session'
import { Toasts, setConfig } from 'frappe-ui'
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// ✅ Your custom keying logic for Lead / Opportunity + fallback
const routeKey = computed(() => {
  if (route.name === 'Lead') return route.params.leadId
  if (route.name === 'Opportunity') return route.params.opportunityId
  return route.fullPath
})

// ✅ Mobile / Desktop layout selection
const MobileLayout = defineAsyncComponent(
  () => import('./components/Layouts/MobileLayout.vue'),
)
const DesktopLayout = defineAsyncComponent(
  () => import('./components/Layouts/DesktopLayout.vue'),
)
const Layout = computed(() => {
  if (window.innerWidth < 640) {
    return MobileLayout
  } else {
    return DesktopLayout
  }
})

// ✅ Timezone config: support old + new keys
const tz = window.timezone || {}

setConfig('timezone', tz.user || tz.system || tz || null)
setConfig('systemTimezone', tz.system || tz.user || tz || null)
setConfig('localTimezone', tz.user || tz.system || tz || null)
</script>
