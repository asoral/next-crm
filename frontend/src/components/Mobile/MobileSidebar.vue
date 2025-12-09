<template>
  <TransitionRoot :show="sidebarOpened">
    <Dialog as="div" @close="sidebarOpened = false" class="fixed inset-0 z-40">
      <!-- Slide-in panel -->
      <TransitionChild
        as="template"
        enter="transition ease-in-out duration-200 transform"
        enter-from="-translate-x-full"
        enter-to="translate-x-0"
        leave="transition ease-in-out duration-200 transform"
        leave-from="translate-x-0"
        leave-to="-translate-x-full"
      >
        <div
          class="relative z-10 flex h-full w-[260px] flex-col justify-between border-r bg-surface-menu-bar transition-all duration-300 ease-in-out"
        >
          <!-- User -->
          <div><UserDropdown class="p-2" /></div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto">
            <!-- Notifications -->
            <div class="mb-3 flex flex-col">
              <SidebarLink
                id="notifications-btn"
                :label="__('Notifications')"
                :icon="NotificationsIcon"
                :to="{ name: 'Notifications' }"
                class="relative mx-2 my-0.5"
              >
                <template #right>
                  <Badge
                    v-if="unreadNotificationsCount"
                    :label="unreadNotificationsCount"
                    variant="subtle"
                  />
                </template>
              </SidebarLink>
            </div>

            <!-- Core Views -->
            <div v-for="view in allViews" :key="view.name">
              <Section :label="view.name" :hideLabel="view.hideLabel" :isOpened="view.opened">
                <template #header="{ opened, hide, toggle }">
                  <div
                    v-if="!hide"
                    class="ml-2 mt-4 flex h-7 w-auto cursor-pointer gap-1.5 px-1 text-base font-medium text-ink-gray-5 opacity-100 transition-all duration-300 ease-in-out"
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
                    class="mx-2 my-0.5"
                  />
                </nav>
              </Section>
            </div>

            <!-- More (CRM Web Pages) -->
            <div class="mt-4">
              <div
                class="flex w-full items-center justify-between duration-300 ease-in-out px-2 py-1"
                @click="toggleWebPages"
              >
                <div class="flex items-center text-sm text-ink-gray-5 my-1">
                  <span class="grid h-5 w-6 flex-shrink-0 place-items-center">
                    <FeatherIcon
                      name="chevron-right"
                      class="h-4 w-4 stroke-1.5 text-ink-gray-9 transition-all duration-300 ease-in-out"
                      :class="{ 'rotate-90': !sidebarStore.isWebpagesCollapsed }"
                    />
                  </span>
                  <span class="ml-2 text-lg">
                    {{ __('More') }}
                  </span>
                </div>

                <Button variant="ghost" @click.stop="openPageModal()">
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
                        <!-- resolved icon component -->
                        <component :is="link._iconComp" class="size-4 text-ink-gray-7" />
                      </span>
                      <span class="ml-2 text-sm truncate">
                        {{ link.label }}
                      </span>
                    </div>

                    <button
                      class="ml-2 p-1 text-gray-500 hover:text-gray-600"
                      @click.stop="confirmDelete(link)"
                    >
                      <FeatherIcon name="trash" class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- /More -->
          </div>
          <!-- /Body -->
        </div>
      </TransitionChild>

      <!-- Page modal lives alongside for proper stacking -->
      <PageModal
        v-model="showPageModal"
        :page="pageToEdit"
        :reloadSidebar="{ reload: fetchWebPages }"
      />

      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="transition-opacity ease-linear duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity ease-linear duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <DialogOverlay class="fixed inset-0 bg-gray-600 bg-opacity-50" />
      </TransitionChild>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { TransitionRoot, TransitionChild, Dialog, DialogOverlay } from '@headlessui/vue'
import { computed, h, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStorage } from '@vueuse/core'
import * as lucide from 'lucide-vue-next'

import Section from '@/components/Section.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import SidebarLink from '@/components/SidebarLink.vue'
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
import CheckInIcon from '@/components/Icons/CheckIcon.vue'
import PinIcon from '@/components/Icons/PinIcon.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'

import { Button, Badge, FeatherIcon, call } from 'frappe-ui'
import { viewsStore } from '@/stores/views'
import { unreadNotificationsCount } from '@/stores/notifications'
import { sessionStore } from '@/stores/session'
import { useSidebar } from '@/stores/sidebar'
import { mobileSidebarOpened as sidebarOpened } from '@/composables/settings'

const router = useRouter()
const { getPinnedViews, getPublicViews, getGroupedViews } = viewsStore()

// Ensure store is initialized (parity with develop)
sessionStore()

// Sidebar store for collapse states
const sidebarStore = useSidebar()
if (typeof sidebarStore.isWebpagesCollapsed === 'undefined') {
  sidebarStore.isWebpagesCollapsed = false
}

// Keep for parity if other parts rely on it (no direct use here)
useSettings()

// ----- NCRM Settings flag to hide specific links -----
const isSideBarVisible = ref(false)
async function fetchCRMViewSettings() {
  try {
    const settings = await call('frappe.client.get', {
      doctype: 'NCRM Settings',
      name: 'NCRM Settings',
    })
    isSideBarVisible.value = Boolean(settings?.custom_hide_options_in_sidebar)
  } catch {
    isSideBarVisible.value = false // fail-soft
  }
}
onMounted(fetchCRMViewSettings)

// ----- Base links -----
const links = [
  { label: 'Leads', icon: LeadsIcon, to: 'Leads' },
  { label: 'Opportunities', icon: OpportunitiesIcon, to: 'Opportunities' },
  { label: 'Contacts', icon: ContactsIcon, to: 'Contacts' },
  { label: 'Addresses', icon: AddressIcon, to: 'Addresses' },
  { label: 'Customers', icon: CustomersIcon, to: 'Customers' },
  { label: 'ToDos', icon: ToDoIcon, to: 'ToDos' },
  { label: 'Events', icon: EventsIcon, to: 'Events' },
  { label: 'Call Logs', icon: PhoneIcon, to: 'Call Logs' },
  { label: 'Email Templates', icon: Email2Icon, to: 'Email Templates' },
  { label: 'Check In', icon: CheckInIcon, to: 'CheckIn' },
]

// ----- Views (All/Public/Pinned/Groups) -----
const allViews = computed(() => {
  let base = [...links]

  // Hide certain links based on settings
  if (isSideBarVisible.value) {
    const hiddenLabels = ['Call Logs', 'Email Templates', 'Contacts', 'Addresses']
    base = base.filter((l) => !hiddenLabels.includes(l.label))
  }

  const out = [
    {
      name: 'All Views',
      hideLabel: true,
      opened: true,
      views: base.map((l) => ({
        label: l.label,
        icon: l.icon,
        to: { name: l.to },
      })),
    },
  ]

  const publicViews = getPublicViews()
  if (publicViews.length) {
    out.push({
      name: 'Public views',
      opened: true,
      views: parseView(publicViews),
    })
  }

  const pinnedViews = getPinnedViews()
  if (pinnedViews.length) {
    out.push({
      name: 'Pinned views',
      opened: true,
      views: parseView(pinnedViews),
    })
  }

  const groupedViews = getGroupedViews()
  if (groupedViews.length) {
    out.push({
      name: 'Groups Views',
      opened: true,
      views: parseView(groupedViews),
    })
  }

  return out
})

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
    case 'Leads': return LeadsIcon
    case 'Opportunities': return OpportunitiesIcon
    case 'Contacts': return ContactsIcon
    case 'Addresses': return AddressIcon
    case 'Customers': return CustomersIcon
    case 'Events': return EventsIcon
    case 'Call Logs': return PhoneIcon
    case 'Reports': return FileTextIcon
    default: return PinIcon
  }
}

// ----- CRM Web Pages ("More") -----
const showPageModal = ref(false)
const pageToEdit = ref(null)
const crmWebPages = ref([])

// Resolve lucide name -> component; else fallback to PinIcon; pass-through components
function resolveLucideOrFallback(iconNameOrComp) {
  if (typeof iconNameOrComp === 'string' && iconNameOrComp in lucide) {
    return lucide[iconNameOrComp]
  }
  if (typeof iconNameOrComp === 'object' || typeof iconNameOrComp === 'function') {
    return iconNameOrComp
  }
  return PinIcon
}

const fetchWebPages = async () => {
  try {
    const response = await fetch('/api/resource/CRM Web Page?fields=["name","page_name","icon"]')
    const data = await response.json()
    const raw = Array.isArray(data?.data) ? data.data : []
    crmWebPages.value = raw.map((page) => ({
      label: page.page_name,
      web_page: page.name,
      _iconComp: resolveLucideOrFallback(page.icon),
    }))
  } catch {
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
    const response = await fetch(`/api/resource/CRM Web Page/${link.web_page}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.ok) {
      await fetchWebPages()
    } else {
      console.error('Delete failed:', await response.json())
    }
  } catch (err) {
    console.error('Error deleting page:', err)
  }
}

const openPageModal = (link = null) => {
  showPageModal.value = true
  pageToEdit.value = link
}

// ----- Toggles -----
const isSidebarCollapsed = useStorage('isSidebarCollapsed', false) // kept for parity if needed elsewhere
const toggleWebPages = () => {
  sidebarStore.isWebpagesCollapsed = !sidebarStore.isWebpagesCollapsed
  localStorage.setItem('isWebpagesCollapsed', JSON.stringify(sidebarStore.isWebpagesCollapsed))
}
</script>
