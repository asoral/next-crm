<template>
  <div
    class="relative flex h-full flex-col justify-between transition-all duration-300 ease-in-out"
    :class="isSidebarCollapsed ? 'w-12' : 'w-[220px]'"
  >
    <!-- User -->
    <div>
      <UserDropdown class="p-2" :isCollapsed="isSidebarCollapsed" />
    </div>

    <!-- Main nav -->
    <div class="flex-1 overflow-y-auto">
      <!-- Notifications -->
      <div class="mb-3 flex flex-col">
        <SidebarLink
          id="notifications-btn"
          :label="__('Notifications')"
          :icon="NotificationsIcon"
          :isCollapsed="isSidebarCollapsed"
          @click="toggleNotificationPanel()"
          class="relative mx-2 my-0.5"
        >
          <template #right>
            <Badge
              v-if="!isSidebarCollapsed && unreadNotificationsCount"
              :label="unreadNotificationsCount"
              variant="subtle"
            />
            <div
              v-else-if="unreadNotificationsCount"
              class="absolute -left-1.5 top-1 z-20 h-[5px] w-[5px] translate-x-6 translate-y-1 rounded-full bg-surface-gray-6 ring-1 ring-white"
            />
          </template>
        </SidebarLink>
      </div>

      <!-- Core Views -->
      <div v-for="view in allViews" :key="view.name">
        <div
          v-if="!view.hideLabel && isSidebarCollapsed && view.views?.length"
          class="mx-2 my-2 h-1 border-b"
        />
        <Section :label="view.name" :hideLabel="view.hideLabel" :isOpened="view.opened">
          <template #header="{ opened, hide, toggle }">
            <div
              v-if="!hide"
              class="flex cursor-pointer gap-1.5 px-1 text-base font-medium text-ink-gray-5 transition-all duration-300 ease-in-out"
              :class="isSidebarCollapsed ? 'ml-0 h-0 overflow-hidden opacity-0' : 'ml-2 mt-4 h-7 w-auto opacity-100'"
              @click="toggle()"
            >
              <FeatherIcon
                name="chevron-right"
                class="h-4 text-ink-gray-9 transition-all duration-300 ease-in-out"
                :class="{ 'rotate-90': opened }"
              />
              <span>{{ __(view.name) }}</span>
            </div>
          </template>

          <nav class="flex flex-col">
            <SidebarLink
              v-for="link in view.views"
              :key="link.label"
              :icon="link.icon"
              :label="__(link.label)"
              :to="link.to"
              :isCollapsed="isSidebarCollapsed"
              class="mx-2 my-0.5"
            />
          </nav>
        </Section>
      </div>

      <!-- Dashboards (CRM Web Pages) -->
      <div class="mt-4">
        <div
          class="flex w-full items-center justify-between duration-300 ease-in-out px-2 py-1"
          @click="toggleWebPages"
        >
          <div class="flex items-center text-sm text-ink-gray-5 my-1">
            <span
              class="grid h-5 w-6 flex-shrink-0 place-items-center"
              v-if="!isSidebarCollapsed"
            >
              <FeatherIcon
                name="chevron-right"
                class="h-4 w-4 stroke-1.5 text-ink-gray-9 transition-all duration-300 ease-in-out"
                :class="{ 'rotate-90': !sidebarStore.isWebpagesCollapsed }"
              />
            </span>
            <span
              v-if="!isSidebarCollapsed"
              class="ml-2 text-lg"
            >
              {{ __('Dashboards') }}
            </span>
          </div>

          <Button
            v-if="!isSidebarCollapsed"
            variant="ghost"
            @click.stop="openPageModal()"
          >
            <FeatherIcon name="plus" class="h-4 w-4 text-ink-gray-7 stroke-1.5" />
          </Button>
        </div>

        <div
          class="flex flex-col transition-all duration-300 ease-in-out"
          v-show="!sidebarStore.isWebpagesCollapsed"
        >
          <div
            v-for="link in crmWebPages"
            :key="link.web_page"
            class="mx-2 my-0.5 flex h-7 cursor-pointer items-center rounded text-ink-gray-7 duration-300 ease-in-out hover:bg-surface-gray-2 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <div
              class="flex w-full items-center justify-between duration-300 ease-in-out px-2 py-1"
              @click="navigateToCRMPage(link)"
            >
              <div class="flex items-center truncate">
                <span class="grid flex-shrink-0 place-items-center">
                  <!-- Resolve lucide icon name OR Vue component -->
                  <component
                    :is="link._iconComp"
                    class="size-4 text-ink-gray-7"
                  />
                </span>
                <span
                  class="ml-2 text-sm truncate"
                  :class="isSidebarCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto'"
                >
                  {{ link.label }}
                </span>
              </div>
              <button
                v-if="!isSidebarCollapsed"
                class="ml-2 p-1 text-gray-500 hover:text-gray-600"
                @click.stop="confirmDelete(link)"
              >
                <FeatherIcon name="trash" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapse -->
    <div class="m-2 flex flex-col gap-1">
      <SidebarLink
        :label="isSidebarCollapsed ? __('Expand') : __('Collapse')"
        :isCollapsed="isSidebarCollapsed"
        @click="isSidebarCollapsed = !isSidebarCollapsed"
      >
        <template #icon>
          <span class="grid h-4.5 w-4.5 flex-shrink-0 place-items-center">
            <CollapseSidebar
              class="h-4.5 w-4.5 text-ink-gray-7 duration-300 ease-in-out"
              :class="{ '[transform:rotateY(180deg)]': isSidebarCollapsed }"
            />
          </span>
        </template>
      </SidebarLink>
    </div>

    <!-- Modals / Portals -->
    <PageModal
      v-model="showPageModal"
      :page="pageToEdit"
      :reloadSidebar="{ reload: fetchWebPages }"
    />
    <Notifications />
  </div>
</template>

<script setup>
import { computed, h, ref, watch, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { useRouter } from 'vue-router'
import * as lucide from 'lucide-vue-next'

import Section from '@/components/Section.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import SidebarLink from '@/components/SidebarLink.vue'
import Notifications from '@/components/Notifications.vue'
import PageModal from '@/components/Modals/PageModal.vue'

import LeadsIcon from '@/components/Icons/LeadsIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import ContactsIcon from '@/components/Icons/ContactsIcon.vue'
import AddressIcon from '@/components/Icons/AddressIcon.vue'
import CustomersIcon from '@/components/Icons/CustomersIcon.vue'
import EventsIcon from '@/components/Icons/EventIcon.vue'
import FileTextIcon from '@/components/Icons/FileTextIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import ProspectsIcon from '@/components/Icons/ProspectsIcon.vue'
import CollapseSidebar from '@/components/Icons/CollapseSidebar.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import CheckInIcon from '@/components/Icons/CheckIcon.vue'
import PinIcon from '@/components/Icons/PinIcon.vue'

import { Button, Badge, FeatherIcon, call } from 'frappe-ui'
import { viewsStore } from '@/stores/views'
import { unreadNotificationsCount, notificationsStore } from '@/stores/notifications'
import { sessionStore } from '@/stores/session'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'

const router = useRouter()
const { getPinnedViews, getPublicViews, getGroupedViews } = viewsStore()
const { toggle: toggleNotificationPanel } = notificationsStore()

// Collapsed state (local, persisted)
const isSidebarCollapsed = useStorage('isSidebarCollapsed', false)

// Store for other sidebar toggles (web pages)
const sidebarStore = useSidebar()

// Session / settings (kept for parity with develop)
sessionStore()
const settingsStore = useSettings()
const { sidebarSettings } = settingsStore // retained if used elsewhere

// NCRM Settings flag to hide some links
const isSideBarVisible = ref(false)
async function fetchCRMViewSettings() {
  try {
    const settings = await call('frappe.client.get', {
      doctype: 'NCRM Settings',
      name: 'NCRM Settings',
    })
    if (settings) {
      isSideBarVisible.value = Boolean(settings.custom_hide_options_in_sidebar)
    }
  } catch (e) {
    // fail-soft: don't block sidebar if settings missing
    isSideBarVisible.value = false
  }
}
onMounted(fetchCRMViewSettings)

// ----- Core Links -----
const links = [
  { label: 'Leads', icon: LeadsIcon, to: 'Leads' },
  { label: 'Opportunities', icon: OpportunitiesIcon, to: 'Opportunities' },
  { label: 'Prospects', icon: ProspectsIcon, to: 'Prospects' },
  { label: 'Contacts', icon: ContactsIcon, to: 'Contacts' },
  { label: 'Addresses', icon: AddressIcon, to: 'Addresses' },
  { label: 'Customers', icon: CustomersIcon, to: 'Customers' },
  { label: 'Reports', icon: FileTextIcon, to: 'Reports' },
  { label: 'ToDos', icon: ToDoIcon, to: 'ToDos' },
  { label: 'Events', icon: EventsIcon, to: 'Events' },
  { label: 'Call Logs', icon: PhoneIcon, to: 'Call Logs' },
  { label: 'Email Templates', icon: Email2Icon, to: 'Email Templates' },
  { label: 'Check In', icon: CheckInIcon, to: 'CheckIn' },
]

// Build "All Views" + dynamic view groups
const allViews = computed(() => {
  // Start with base links, optionally hide some per NCRM Settings
  let base = [...links]
  if (isSideBarVisible.value) {
    const hiddenLabels = ['Call Logs', 'Email Templates', 'Contacts', 'Addresses']
    base = base.filter((l) => !hiddenLabels.includes(l.label))
  }

  const out = [
    {
      name: 'All Views',
      hideLabel: true,
      opened: true,
      views: base.map(toSidebarView),
    },
  ]

  const publicViews = getPublicViews()
  const pinnedViews = getPinnedViews()
  const groupedViews = getGroupedViews()

  if (publicViews.length) {
    out.push({
      name: 'Public Views',
      opened: true,
      views: parseView(publicViews),
    })
  }
  if (pinnedViews.length) {
    out.push({
      name: 'Pinned Views',
      opened: true,
      views: parseView(pinnedViews),
    })
  }
  if (groupedViews.length) {
    out.push({
      name: 'Groups View',
      opened: true,
      views: parseView(groupedViews),
    })
  }

  return out
})

function toSidebarView(link) {
  return {
    label: link.label,
    icon: link.icon,
    to: { name: link.to },
  }
}

function parseView(views) {
  return views.map((view) => ({
    label: view.label,
    icon: resolveIconFromRoute(view.route_name, view.icon),
    to: {
      name: view.route_name,
      params: { viewType: view.type || 'list' },
      query: { view: view.name },
    },
  }))
}

function resolveIconFromRoute(routeName, inlineIcon) {
  if (inlineIcon) return h('div', { class: 'size-auto' }, inlineIcon)
  switch (routeName) {
    case 'Leads':
      return LeadsIcon
    case 'Opportunities':
      return OpportunitiesIcon
    case 'Contacts':
      return ContactsIcon
    case 'Addresses':
      return AddressIcon
    case 'Customers':
      return CustomersIcon
    case 'Events':
      return EventsIcon
    case 'Call Logs':
      return PhoneIcon
    case 'Reports':
      return FileTextIcon
    default:
      return PinIcon
  }
}

// ----- CRM Web Pages (Dashboards) -----
const showPageModal = ref(false)
const pageToEdit = ref(null)
const crmWebPages = ref([])

// Resolve icon: if string matches lucide export, use that; else fallback to PinIcon
function resolveLucideOrFallback(iconNameOrComp) {
  if (typeof iconNameOrComp === 'string' && iconNameOrComp in lucide) {
    return lucide[iconNameOrComp]
  }
  // If already a Vue component (custom icon), pass it through
  if (typeof iconNameOrComp === 'object' || typeof iconNameOrComp === 'function') {
    return iconNameOrComp
  }
  return PinIcon
}

const fetchWebPages = async () => {
  try {
    const resp = await fetch('/api/resource/CRM Web Page?fields=["name","page_name","icon"]')
    const data = await resp.json()
    const raw = Array.isArray(data?.data) ? data.data : []
    crmWebPages.value = raw.map((page) => ({
      label: page.page_name,
      web_page: page.name,
      // store resolved component for direct use in template
      _iconComp: resolveLucideOrFallback(page.icon),
    }))
  } catch (e) {
    crmWebPages.value = []
  }
}

onMounted(fetchWebPages)
watch(showPageModal, (val) => {
  if (!val) fetchWebPages()
})

const navigateToCRMPage = (link) => {
  router.push({
    name: 'CRMWebPage',
    params: { webPageName: link.web_page },
  })
}

const confirmDelete = async (link) => {
  if (!window.confirm(`Are you sure you want to delete "${link.label}"?`)) return
  await deletePage(link)
}

const deletePage = async (link) => {
  try {
    await call('frappe.client.delete', {
      doctype: 'CRM Web Page',
      name: link.web_page,
    })
    await fetchWebPages()
  } catch (err) {
    console.error('Error deleting page:', err)
  }
}


const openPageModal = (link = null) => {
  showPageModal.value = true
  pageToEdit.value = link
}

// ----- Toggles -----
const toggleWebPages = () => {
  sidebarStore.isWebpagesCollapsed = !sidebarStore.isWebpagesCollapsed
  localStorage.setItem('isWebpagesCollapsed', JSON.stringify(sidebarStore.isWebpagesCollapsed))
}
</script>
