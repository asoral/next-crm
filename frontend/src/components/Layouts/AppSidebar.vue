<template>
  <div
    class="relative flex h-full flex-col justify-between transition-all duration-300 ease-in-out"
    :class="isSidebarCollapsed ? 'w-12' : 'w-[220px]'"
  >
    <div>
      <UserDropdown class="p-2" :isCollapsed="isSidebarCollapsed" />
    </div>
    <div class="flex-1 overflow-y-auto">
      <div class="mb-3 flex flex-col">
        <SidebarLink
          id="notifications-btn"
          :label="__('Notifications')"
          :icon="NotificationsIcon"
          :isCollapsed="isSidebarCollapsed"
          @click="() => toggleNotificationPanel()"
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
      <div v-for="view in allViews" :key="view.label">
        <div v-if="!view.hideLabel && isSidebarCollapsed && view.views?.length" class="mx-2 my-2 h-1 border-b" />
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
              :icon="link.icon"
              :label="__(link.label)"
              :to="link.to"
              :isCollapsed="isSidebarCollapsed"
              class="mx-2 my-0.5"
            />
          </nav>
        </Section>
      </div>
      <div
				class="mt-4"
			>
				<div
					class="flex items-center justify-between pr-2 cursor-pointer"
					:class="sidebarStore.isSidebarCollapsed ? 'pl-3' : 'pl-4'"
					@click="toggleWebPages"
				>
					<div
						v-if="!sidebarStore.isSidebarCollapsed"
						class="flex items-center text-sm text-ink-gray-5 my-1"
					>
						<span class="grid h-5 w-6 flex-shrink-0 place-items-center">
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
	:class="!sidebarStore.isWebpagesCollapsed ? 'block' : 'hidden'"
>
<div
  v-for="link in crmWebPages"
  :key="link.web_page"
  class="mx-2 my-0.5 flex h-7 cursor-pointer items-center rounded text-ink-gray-7 duration-300 ease-in-out hover:bg-surface-gray-2 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-gray-400"
  :class="isSidebarCollapsed ? 'pl-[3px] p-1' : 'px-2 py-1'"
>
  <div
    class="flex w-full items-center justify-between"
    @click="navigateToCRMPage(link)"
  >
    <div class="flex items-center truncate">
      <span class="grid flex-shrink-0 place-items-center">
        <component
          :is="LucideIcons[link.icon] || LucideIcons.Folder"
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
      class="ml-2 p-1 text-gray-500 hover:text-gray-600"
      @click.stop="deletePage(link)"
    >
      <FeatherIcon name="trash" class="h-4 w-4" />
    </button>
  </div>
</div>

</div>

			</div>
    </div>
    <div class="m-2 flex flex-col gap-1">
      <SidebarLink
        :label="isSidebarCollapsed ? __('Expand') : __('Collapse')"
        :isCollapsed="isSidebarCollapsed"
        @click="isSidebarCollapsed = !isSidebarCollapsed"
        class=""
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
    <PageModal
	v-model="showPageModal"
	:page="pageToEdit"
	:reloadSidebar="{ reload: fetchWebPages }"
/>

    <Notifications />
  </div>
</template>

<script setup>
import AddressIcon from '@/components/Icons/AddressIcon.vue'
import Section from '@/components/Section.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import PinIcon from '@/components/Icons/PinIcon.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import LeadsIcon from '@/components/Icons/LeadsIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import ContactsIcon from '@/components/Icons/ContactsIcon.vue'
import CustomersIcon from '@/components/Icons/CustomersIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import FileTextIcon from '@/components/Icons/FileTextIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ProspectsIcon from '@/components/Icons/ProspectsIcon.vue'
import CollapseSidebar from '@/components/Icons/CollapseSidebar.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import SidebarLink from '@/components/SidebarLink.vue'
import Notifications from '@/components/Notifications.vue'
import { viewsStore } from '@/stores/views'
import { unreadNotificationsCount, notificationsStore } from '@/stores/notifications'
import { FeatherIcon } from 'frappe-ui'
import { useStorage } from '@vueuse/core'
import { computed, h, ref, watch } from 'vue'
import CheckInIcon from '@/components/Icons/CheckIcon.vue' 
// import { getSidebarLinks } from '@/utils'
// import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'
import { Button, createResource, Tooltip } from 'frappe-ui'
import PageModal from '@/components/Modals/PageModal.vue'
import { useRouter } from 'vue-router'
import * as LucideIcons from 'lucide-vue-next'

const router = useRouter()

const navigateToCRMPage = (link) => {
  router.push({
    name: 'CRMWebPage',
    params: {
      webPageName: link.web_page,
    },
  })
}
const { getPinnedViews, getPublicViews } = viewsStore()
const { toggle: toggleNotificationPanel } = notificationsStore()

const isSidebarCollapsed = useStorage('isSidebarCollapsed', false)
const { user } = sessionStore()
let sidebarStore = useSidebar()

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

// Fetch once on load
fetchWebPages()

// Also refetch when modal closes (see below)
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
    label: 'Prospects',
    icon: ProspectsIcon,
    to: 'Prospects',
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
    label: 'Reports',
    icon: FileTextIcon,
    to: 'Reports',
  },
  {
    label: 'ToDos',
    icon: ToDoIcon,
    to: 'ToDos',
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
    case 'Reports':
      return FileTextIcon
    default:
      return PinIcon
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
			await fetchWebPages() // Refresh sidebar list
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
