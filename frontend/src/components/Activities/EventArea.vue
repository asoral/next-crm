<template>
  <div v-if="events.length">
    <div v-for="(event, i) in sortedEvents" :key="event.name" :id="event.name">
      <div class="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
        <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
          <UserAvatar class="mr-1" :user="event.allocated_to" size="md" />
          <span class="font-medium text-ink-gray-8">
            {{ getUser(event.allocated_to).full_name }}
          </span>
          <span>{{ __('added an') }}</span>
          <span class="max-w-xs truncate font-medium text-ink-gray-8">
            {{ __('Event') }}
          </span>
        </div>
        <div class="ml-auto whitespace-nowrap">
         
          <Tooltip :text="dateFormat(event.modified, dateTooltipFormat)">
            <div class="truncate text-sm text-ink-gray-7">
              {{ __(timeAgo(event.modified)) }}
            </div>
          </Tooltip>
        </div>
        <!-- Action Buttons -->
        <div class="mt-2 flex justify-end gap-2">
          <Dropdown :options="eventStatusOptions((status) => handleStatusChange(status, event))" @click.stop>
            <Tooltip :text="__('Change Status')">
              <Button variant="ghosted" class="hover:bg-surface-gray-4">
                <EventStatusIcon :status="event.status" />
              </Button>
            </Tooltip>
          </Dropdown>

          <Dropdown
            :options="[
              {
                label: __('Delete'),
                icon: 'trash-2',
                onClick: () => {
                  $dialog({
                    title: __('Delete Event'),
                    message: __('Are you sure you want to delete this event?'),
                    actions: [
                      {
                        label: __('Delete'),
                        theme: 'red',
                        variant: 'solid',
                        onClick(close) {
                          modalRef.deleteEvent(event.name)
                          close()
                        },
                      },
                    ],
                  })
                },
              },
            ]"
            @click.stop
          >
            <Button icon="more-horizontal" variant="ghosted" class="hover:bg-surface-gray-4 text-ink-gray-9" />
          </Dropdown>
        </div>
      </div>

      <div
        class="cursor-pointer rounded bg-surface-gray-1 px-3 py-[7.5px] text-base leading-6 transition-all duration-300 ease-in-out"
        @click="modalRef.showEvent(event)"
      >
        <div class="prose-f">
          <div class="font-medium text-ink-gray-9">{{ event.subject }}</div>
          <div class="text-ink-gray-7 mt-1 text-sm">{{ stripHtml(event.description) }}</div>
        </div>

        <div class="mt-2 flex flex-wrap gap-3 items-center text-sm text-ink-gray-7">
          <div class="flex items-center gap-1">
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span v-if="event.starts_on">{{ dateFormat(event.starts_on, 'D MMM, YYYY') }}</span>
          </div>
          <div v-if="event.starts_on" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(event.starts_on, 'hh:mm a') }}</span>
          </div>
          <div v-if="event.ends_on" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(event.ends_on, 'D MMM, hh:mm a') }}</span>
          </div>
          <div v-if="event.event_type" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <component 
              :is="event.event_type === 'Private' ? LockIcon : GlobeIcon" 
              class="h-3 w-3 text-ink-gray-5"
            />
            <span>{{ event.event_type }}</span>
          </div>
        </div>
      </div>

      <div v-if="i < events.length - 1" class="my-3 border-t border-gray-200" />
    </div>
  </div>
</template>

<script setup>
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import LockIcon from '@/components/Icons/LockIcon.vue'
import GlobeIcon from '@/components/Icons/GlobeIcon.vue'
import DotIcon from '@/components/Icons/DotIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { Tooltip, Dropdown, Button } from 'frappe-ui'
import { dateFormat, timeAgo, dateTooltipFormat, eventStatusOptions } from '@/utils'
import { usersStore } from '@/stores/users'
import { globalStore } from '@/stores/global'
import { computed } from 'vue'

const props = defineProps({
  events: Array,
  modalRef: Object,
})

const { getUser } = usersStore()
const { $dialog } = globalStore()



async function handleStatusChange(status, event) {
  props.modalRef.updateEventStatus(status, event)

  if (status === 'Completed') {
    try {
      const res = await fetch(`/api/resource/Event/${event.name}`)
      const fullEvent = await res.json()

      props.modalRef.showEvent({
        subject: '',
        description: '',
        allocated_to: fullEvent.data.allocated_to,
        starts_on: '',
        ends_on: '',
        status: 'Open',
        event_type: fullEvent.data.event_type || 'Private',
      })
    } catch (err) {
      console.error('Failed to fetch full Event:', err)
    }
  }
}

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    const dateA = new Date(a.starts_on || a.creation)
    const dateB = new Date(b.starts_on || b.creation)
    return dateB - dateA 
  })
})


</script>