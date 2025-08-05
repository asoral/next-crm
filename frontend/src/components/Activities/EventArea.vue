<template>
  <div v-if="events.length">
    <div v-for="(event, i) in sortedEvents" :key="event.name" :id="event.name">
      <div class="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
        <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
          <UserAvatar class="mr-1" :user="event.owner" size="md" />
          <span class="font-medium text-ink-gray-8">
            {{ getUser(event.owner).full_name }}
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
          <div v-if="event.starts_on" class="flex items-center gap-1">
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(event.starts_on, 'D MMM, hh:mm a') }}</span>
          </div>
          <div v-if="event.ends_on" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(event.ends_on, 'D MMM, hh:mm a') }}</span>
          </div>
          <div v-if="event.event_type" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <span>{{ event.event_type }}</span>
          </div>
          <div v-if="event.event_category" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <span>{{ event.event_category }}</span>
          </div>

          <div v-if="event.status" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <EventStatusIcon class="!h-2 !w-2" :status="event.status" />
            <span>{{ event.status }}</span>
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
import DotIcon from '@/components/Icons/DotIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { Tooltip, Dropdown, Button } from 'frappe-ui'
import { dateFormat, timeAgo, dateTooltipFormat, eventStatusOptions } from '@/utils'
import { globalStore } from '@/stores/global'
import { usersStore } from '@/stores/users'
import { computed } from 'vue'


const { getUser } = usersStore()

const props = defineProps({
  events: Array,
  modalRef: Object,
})

const { $dialog } = globalStore()

function handleStatusChange(status, event) {
  props.modalRef.updateEventStatus(status, event)

  if (['Closed', 'Completed'].includes(status)) {
    props.modalRef.showEvent({
      subject: '',
      status: 'Open',
      starts_on: '',
      ends_on: '',
      event_type: event.event_type || 'Private',
      reference_type: event.reference_type,
      reference_name: event.reference_name,
      custom_from_time: '',
      custom_to_time: '',
    })
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
