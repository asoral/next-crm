<template>
  <TransitionRoot :show="sidebarOpened">
    <Dialog as="div" @close="sidebarOpened = false" class="fixed inset-0 z-40">
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
          <div><UserDropdown class="p-2" /></div>
          <div class="flex-1 overflow-y-auto">
            <div class="mb-3 flex flex-col">
              <SidebarLink
                id="notifications-btn"
                :label="__('Notifications')"
                :icon="NotificationsIcon"
                :to="{ name: 'Notifications' }"
                class="relative mx-2 my-0.5"
              >
                <template #right>
                  <Badge v-if="unreadNotificationsCount" :label="unreadNotificationsCount" variant="subtle" />
                </template>
              </SidebarLink>
            </div>
            <div v-for="view in allViews" :key="view.label">
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
                    :icon="link.icon"
                    :label="__(link.label)"
                    :to="link.to"
                    class="mx-2 my-0.5"
                  />
                </nav>
              </Section>
            </div>
            <div
            class="mt-4"
          >
            <div
            class="flex w-full items-center justify-between duration-300 ease-in-out px-2 py-1"
            @click="toggleWebPages"
            >
              <div
                class="flex items-center text-sm text-ink-gray-5 my-1"
              >
                <span class="grid h-5 w-6 flex-shrink-0 place-items-center"
                >
                  <FeatherIcon name="chevron-right"
                    class="h-4 w-4 stroke-1.5 text-ink-gray-9 transition-all duration-300 ease-in-out"
                    :class="{ 'rotate-90': !sidebarStore.isWebpagesCollapsed }"

                  />
                </span>
                <span class="ml-2 text-lg">
                  {{ __('More') }}
                </span>
              </div>
              <Button
                variant="ghost"
                @click="openPageModal()"
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
            <component
      :is="icons[link.icon]"
      class="size-4 text-ink-gray-7"
    />
    
          </span>
          <span
            class="ml-2 text-sm truncate"
          >
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
          </div>
        </div>
      </TransitionChild>
      <PageModal
      v-model="showPageModal"
      :page="pageToEdit"
      :reloadSidebar="{ reload: fetchWebPages }"
      class="z-100"

    />
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
import AddressIcon from '@/components/Icons/AddressIcon.vue'
import { TransitionRoot, TransitionChild, Dialog, DialogOverlay } from '@headlessui/vue'
import Section from '@/components/Section.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import PinIcon from '@/components/Icons/PinIcon.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import LeadsIcon from '@/components/Icons/LeadsIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import CheckInIcon from '@/components/Icons/CheckIcon.vue' 
import ContactsIcon from '@/components/Icons/ContactsIcon.vue'
import CustomersIcon from '@/components/Icons/CustomersIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import EventsIcon from '@/components/Icons/EventIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import SidebarLink from '@/components/SidebarLink.vue'
import { viewsStore } from '@/stores/views'
import { unreadNotificationsCount } from '@/stores/notifications'
import { computed, h, ref, watch } from 'vue'
import { mobileSidebarOpened as sidebarOpened } from '@/composables/settings'
// import { getSidebarLinks } from '@/utils'
// import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'
import { Button, createResource, Tooltip } from 'frappe-ui'
import PageModal from '@/components/Modals/PageModal.vue'
import { useRouter } from 'vue-router'
import * as icons from 'lucide-vue-next'
import { FeatherIcon } from 'frappe-ui'
import { useStorage } from '@vueuse/core'
const { getPinnedViews, getPublicViews, getGroupedViews } = viewsStore()

const router = useRouter()

const navigateToCRMPage = (link) => {
  router.push({
    name: 'CRMWebPage',
    params: {
      webPageName: link.web_page,
    },
  }).then(() => {
    setTimeout(() => {
      window.location.reload()
    }, 100)
  })
}

const isSidebarCollapsed = useStorage('isSidebarCollapsed', false)
const { user } = sessionStore()
let sidebarStore = useSidebar()
if (sidebarStore.isWebpagesCollapsed === undefined) {
  sidebarStore.isWebpagesCollapsed = false
}


const showPageModal = ref(false)
const isModerator = ref(false)
const isInstructor = ref(false)
const pageToEdit = ref(null)
const settingsStore = useSettings()
const { sidebarSettings } = settingsStore
console.log('sidebarSettings', sidebarSettings)

const readOnlyMode = window.read_only_mode
const crmWebPages = ref([])

const fetchWebPages = async () => {
	const response = await fetch('/api/resource/CRM Web Page?fields=["name","page_name","icon"]')
	const data = await response.json()
  
	if (data.data) {
		crmWebPages.value = data.data.map((page) => ({
	label: page.page_name,
	icon: page.icon || PinIcon, 
	web_page: page.name,
}))

	}
}

fetchWebPages()

watch(showPageModal, (val) => {
	if (!val) fetchWebPages()
})


const links = [
  {
    label: 'Leads',
    icon: LeadsIcon,
    to: 'Leads',
  },
  {
    label: 'Opportunities',
    icon: OpportunitiesIcon,
    to: 'Opportunities',
  },
  {
    label: 'Contacts',
    icon: ContactsIcon,
    to: 'Contacts',
  },
  {
    label: 'Addresses',
    icon: AddressIcon,
    to: 'Addresses',
  },
  {
    label: 'Customers',
    icon: CustomersIcon,
    to: 'Customers',
  },
  {
    label: 'ToDos',
    icon: ToDoIcon,
    to: 'ToDos',
  },
  {
    label: 'Events',
    icon: EventsIcon,
    to: 'Events',
  },
  {
    label: 'Call Logs',
    icon: PhoneIcon,
    to: 'Call Logs',
  },
  {
    label: 'Email Templates',
    icon: Email2Icon,
    to: 'Email Templates',
  },
  {
  label: 'Check In',
  icon: CheckInIcon,
  to: 'CheckIn',
},

]

const allViews = computed(() => {
  let _views = [
    {
      name: 'All Views',
      hideLabel: true,
      opened: true,
      views: links,
    },
  ]
  if (getPublicViews().length) {
    _views.push({
      name: 'Public views',
      opened: true,
      views: parseView(getPublicViews()),
    })
  }

  if (getPinnedViews().length) {
    _views.push({
      name: 'Pinned views',
      opened: true,
      views: parseView(getPinnedViews()),
    })
  }

  if (getGroupedViews().length){
    _views.push({
      name: 'Groups Views',
      opened: true,
      views: parseView(getGroupedViews)
    })
  }
  return _views
})

function parseView(views) {
  return views.map((view) => {
    return {
      label: view.label,
      icon: getIcon(view.route_name, view.icon),
      to: {
        name: view.route_name,
        params: { viewType: view.type || 'list' },
        query: { view: view.name },
      },
    }
  })
}

function getIcon(routeName, icon) {
  if (icon) return h('div', { class: 'size-auto' }, icon)

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
    case 'Notes':
      return NoteIcon
    case 'Call Logs':
      return PhoneIcon
    default:
      return PinIcon
  }
}


const confirmDelete = async (link) => {
  const confirmed = window.confirm(`Are you sure you want to delete "${link.label}"?`)
  if (confirmed) {
    await deletePage(link)
  }
}

const deletePage = async (link) => {
  try {
    const response = await fetch(`/api/resource/CRM Web Page/${link.web_page}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      await fetchWebPages()
    } else {
      const error = await response.json()
      console.error('Delete failed:', error)
    }
  } catch (err) {
    console.error('Error deleting page:', err)
  }
}



const openPageModal = (link) => {
	showPageModal.value = true
	pageToEdit.value = link
}

const toggleSidebar = () => {
	sidebarStore.isSidebarCollapsed = !sidebarStore.isSidebarCollapsed
	localStorage.setItem(
		'isSidebarCollapsed',
		JSON.stringify(sidebarStore.isSidebarCollapsed)
	)
}

const toggleWebPages = () => {
	sidebarStore.isWebpagesCollapsed = !sidebarStore.isWebpagesCollapsed
	localStorage.setItem(
		'isWebpagesCollapsed',
		JSON.stringify(sidebarStore.isWebpagesCollapsed)
	)
}
</script>
