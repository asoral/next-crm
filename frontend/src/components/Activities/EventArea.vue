<template>
  <div v-if="sortedEvents.length">
    <div
      v-for="(event, i) in sortedEvents"
      :key="event.name"
      class="activity grid grid-cols-[30px_minmax(auto,_1fr)] gap-4 px-3 sm:px-10"
      :id="event.name"
    >
      <!-- Timeline Indicator -->
      <div
        class="z-0 relative flex justify-center before:absolute before:left-[50%] before:-z-[1] before:top-0 before:border-l before:border-outline-gray-modals"
        :class="i != sortedEvents.length - 1 ? 'before:h-full' : 'before:h-4'"
      >
        <div
          class="flex h-8 w-7 items-center justify-center bg-surface-white text-ink-gray-8"
        >
          <CalendarIcon class="h-4 w-4" />
        </div>
      </div>

      <!-- Event Card -->
      <div class="mb-5">
        <div class="mb-1 flex items-center justify-between py-1 text-base">
          <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
            <UserAvatar class="mr-1" :user="event.allocated_to" size="md" />
            <span class="font-medium text-ink-gray-8">
              {{ getUser(event.allocated_to).full_name }}
            </span>
            <span>{{ __('added an Event') }}</span>
          </div>

          <div class="ml-auto whitespace-nowrap flex items-center gap-2">
            <Tooltip :text="dateFormat(event.modified, dateTooltipFormat)">
              <div class="truncate text-sm text-ink-gray-7">
                {{ __(timeAgo(event.modified)) }}
              </div>
            </Tooltip>

            <!-- Status Change -->
            <Dropdown
              :options="eventStatusOptions((status) => handleStatusChange(status, event))"
              @click.stop
            >
              <Tooltip :text="__('Change Status')">
                <Button variant="ghosted" class="hover:bg-surface-gray-4">
                  <EventStatusIcon :status="event.status" />
                </Button>
              </Tooltip>
            </Dropdown>

            <!-- Delete -->
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
              <Button
                icon="more-horizontal"
                variant="ghosted"
                class="hover:bg-surface-gray-4 text-ink-gray-9"
              />
            </Dropdown>
          </div>
        </div>

        <!-- Event Content -->
        <div
          class="cursor-pointer rounded-lg border border-outline-gray-modals bg-surface-cards px-3 py-2 transition-all duration-300 ease-in-out hover:bg-surface-gray-1"
          @click="modalRef.showEvent(event)"
        >
          <div class="prose-f">
            <div class="font-medium text-ink-gray-9">{{ event.subject }}</div>
            <div class="text-ink-gray-7 mt-1 text-sm">
              {{ stripHtml(event.description) }}
            </div>
          </div>

          <div
            class="mt-2 flex flex-wrap gap-3 items-center text-sm text-ink-gray-7"
          >
            <div class="flex items-center gap-1">
              <CalendarIcon class="size-4 text-ink-gray-5" />
              <span v-if="event.starts_on">
                {{ dateFormat(event.starts_on, 'D MMM, YYYY') }}
              </span>
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
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div
    v-else
    class="flex h-full flex-1 flex-col items-center justify-center gap-3 text-xl font-medium text-ink-gray-4"
  >
    <CalendarIcon class="h-10 w-10" />
    <span>{{ __('No Events Scheduled') }}</span>
    <Button :label="__('Schedule an Event')" @click="() => modalRef.showEvent({})" />
  </div>
</template>

<script setup>
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import LockIcon from '@/components/Icons/LockIcon.vue'
import GlobeIcon from '@/components/Icons/GlobeIcon.vue'
import DotIcon from '@/components/Icons/DotIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { Tooltip, Dropdown, Button, call } from 'frappe-ui'
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
  try {
    const ev = await call('frappe.client.get', {
      doctype: 'Event',
      name: event.name,
    }).then((r) => r?.data || r)

    const ref = ev?.event_participants?.find(
      (p) => p.reference_doctype && p.reference_docname,
    )
    if (ref) {
      await call('frappe.client.set_value', {
        doctype: ref.reference_doctype,
        name: ref.reference_docname,
        fieldname: { last_modified: new Date().toISOString() },
      })
    }

    if (status === 'Completed') {
      props.modalRef.showEvent({
        subject: '',
        description: '',
        allocated_to: ev.allocated_to,
        starts_on: '',
        ends_on: '',
        status: 'Open',
        event_type: ev.event_type || 'Private',
      })
    }
  } catch (err) {
    console.error('Failed in handleStatusChange:', err)
  }
}

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const sortedEvents = computed(() =>
  [...props.events].sort(
    (a, b) => new Date(b.starts_on || b.creation) - new Date(a.starts_on || a.creation),
  ),
)
</script>
