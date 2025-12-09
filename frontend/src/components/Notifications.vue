<template>
  <div
    v-if="visible"
    ref="target"
    class="absolute z-20 h-screen bg-surface-white transition-all duration-300 ease-in-out"
    :style="{
      'box-shadow': '8px 0px 8px rgba(0, 0, 0, 0.1)',
      'max-width': '350px',
      'min-width': '350px',
      left: 'calc(100% + 1px)',
    }"
  >
    <div class="flex h-screen flex-col text-ink-gray-9">
      <div
        class="z-20 flex items-center justify-between border-b bg-surface-white px-5 py-2.5"
      >
        <div class="text-base font-medium">{{ __('Notifications') }}</div>
        <div class="flex gap-1">
          <!-- Mark all as read -->
          <Tooltip :text="__('Mark all as read')">
            <div>
              <Button
                :tooltip="__('Mark all as read')"
                :icon="MarkAsDoneIcon"
                variant="ghost"
                @click="markAllAsRead"
              />
            </div>
          </Tooltip>

          <!-- Clear all -->
          <Tooltip :text="__('Clear all notifications')">
            <div>
              <Button
                :tooltip="__('Clear all notifications')"
                icon="trash-2"
                variant="ghost"
                @click="clearAll"
              />
            </div>
          </Tooltip>

          <!-- Close -->
          <Tooltip :text="__('Close')">
            <div>
              <Button
                :tooltip="__('Close')"
                icon="x"
                variant="ghost"
                @click="toggle"
              />
            </div>
          </Tooltip>
        </div>
      </div>

      <div
        v-if="notifications.data?.length"
        class="divide-y divide-outline-gray-modals overflow-auto text-base"
      >
        <RouterLink
          v-for="n in notifications.data"
          :key="n.comment || n.notification_type_doc || n.reference_name"
          :to="getRoute(n)"
          class="flex cursor-pointer items-start gap-2.5 px-4 py-2.5 hover:bg-surface-gray-2"
          @click="markAsRead(n.comment || n.notification_type_doc)"
        >
          <div class="mt-1 flex items-center gap-2.5">
            <div
              class="size-[5px] rounded-full"
              :class="[n.read ? 'bg-transparent' : 'bg-surface-gray-7']"
            />
            <WhatsAppIcon v-if="n.type == 'WhatsApp'" class="size-7" />
            <UserAvatar v-else :user="n.from_user?.name" size="lg" />
          </div>

          <div>
            <div v-if="n.notification_text" v-html="n.notification_text" />
            <div v-else class="mb-2 space-x-1 leading-5 text-ink-gray-5">
              <span class="font-medium text-ink-gray-9">
                {{ n.from_user?.full_name }}
              </span>
              <span>
                {{ __('mentioned you in {0}', [n.reference_doctype]) }}
              </span>
              <span class="font-medium text-ink-gray-9">
                {{ n.reference_name }}
              </span>
            </div>

            <div class="text-sm text-ink-gray-5">
              {{ __(timeAgo(n.creation)) }}
            </div>
          </div>
        </RouterLink>
      </div>

      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center gap-2"
      >
        <NotificationsIcon class="h-20 w-20 text-ink-gray-2" />
        <div class="text-lg font-medium text-ink-gray-4">
          {{ __('No new notifications') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import MarkAsDoneIcon from '@/components/Icons/MarkAsDoneIcon.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { visible, notifications, notificationsStore } from '@/stores/notifications'
import { globalStore } from '@/stores/global'
import { timeAgo } from '@/utils'
import { onClickOutside } from '@vueuse/core'
import { capture } from '@/telemetry'
import { Tooltip, call, toast } from 'frappe-ui'
import { ref, onMounted, onBeforeUnmount } from 'vue'

/* Grab actions from notifications store */
const { mark_as_read, toggle, mark_doc_as_read } = notificationsStore()

/* socket from global store */
const { $socket } = globalStore()

/* local ref to the drawer/panel element for outside clicks */
const target = ref(null)
onClickOutside(
  target,
  () => {
    if (visible.value) toggle()
  },
  {
    ignore: ['#notifications-btn'],
  },
)

/* mark single notification as read */
function markAsRead(doc) {
  capture('notification_mark_as_read')
  mark_doc_as_read(doc)
}

/* mark all notifications as read (calls the resource reload) */
function markAllAsRead() {
  capture('notification_mark_all_as_read')
  mark_as_read.reload()
}

/* clear all notifications on server, then reload + show toast */
async function clearAll() {
  try {
    await call('next_crm.api.notifications.clear_all_notifications')
    toast.success(__('Notifications deleted successfully'))
    notifications.reload()
  } catch (err) {
    toast.create && toast.create({ title: __('Failed to clear notifications'), body: String(err) })
  }
}

/* cleanup socket listeners */
onBeforeUnmount(() => {
  $socket.off('crm_notification')
})

onMounted(() => {
  $socket.on('crm_notification', () => {
    notifications.reload()
  })
})

/* translate notification -> route for RouterLink */
function getRoute(notification) {
  const permittedDoctypes = ['Lead', 'Opportunity']

  let params
  if (notification.route_name === 'Lead') {
    params = {
      leadId: notification.reference_name,
    }
  } else if (notification.route_name === 'Opportunity') {
    params = {
      opportunityId: notification.reference_name,
    }
  } else {
    params = {
      doc: notification.reference_doctype?.trim?.()?.replaceAll?.(' ', '-')?.toLowerCase(),
      docname: notification.reference_name,
    }
  }

  return {
    name: permittedDoctypes.includes(notification.reference_doctype) ? notification.route_name : 'App',
    params: params,
    hash: notification.hash,
  }
}
</script>
