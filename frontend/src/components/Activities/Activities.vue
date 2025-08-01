<template>
  <ActivityHeader
  v-if="title !== 'Quotation'"
    v-model="tabIndex"
    v-model:showWhatsappTemplates="showWhatsappTemplates"
    v-model:showFilesUploader="showFilesUploader"
    :tabs="tabs"
    :title="title"
    :doc="doc"
    :emailBox="emailBox"
    :whatsappBox="whatsappBox"
    :modalRef="modalRef"
  />
  <FadedScrollableDiv :maskHeight="30" class="flex flex-col flex-1 overflow-y-auto">
    <div
      v-if="all_activities?.loading"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-xl font-medium text-ink-gray-4"
    >
      <LoadingIndicator class="h-6 w-6" />
      <span>{{ __('Loading...') }}</span>
    </div>
    <div v-else-if="activities?.length || (whatsappMessages.data?.length && title == 'WhatsApp')" class="activities">
      <div v-if="title == 'WhatsApp' && whatsappMessages.data?.length">
        <WhatsAppArea
          class="px-3 sm:px-10"
          v-model="whatsappMessages"
          v-model:reply="replyMessage"
          :messages="whatsappMessages.data"
        />
      </div>
      <div v-else-if="title == 'Notes'" class="grid grid-cols-1 gap-4 px-3 pb-3 sm:px-10 sm:pb-5">
        <div v-for="note in activities">
          <NoteArea
            :note="note"
            v-model="all_activities"
            :modalRef="modalRef"
            @reply-note="
              (note) => {
                emailBox.noteParent = note.name
                emailBox.showNote = true
              }
            "
          />
        </div>
      </div>
      <div v-else-if="title == 'Comments'" class="pb-5">
        <div v-for="(comment, i) in activities">
          <div class="activity grid grid-cols-[30px_minmax(auto,_1fr)] gap-2 px-3 sm:gap-4 sm:px-10">
            <div
              class="relative flex justify-center after:absolute after:left-[50%] after:top-0 after:-z-10 after:border-l after:border-gray-200"
              :class="i != activities.length - 1 ? 'after:h-full' : 'after:h-4'"
            >
              <div class="z-10 flex h-8 w-7 items-center justify-center bg-surface-white">
                <CommentIcon class="text-ink-gray-8" />
              </div>
            </div>
            <CommentArea class="mb-4" :activity="comment" />
          </div>
        </div>
      </div>
      <div v-else-if="title == 'ToDos'" class="px-3 pb-3 sm:px-10 sm:pb-5">
        <ToDoArea :modalRef="modalRef" :todos="activities" :doctype="doctype" />
      </div>
      <div v-else-if="title == 'Events'" class="px-3 pb-3 sm:px-10 sm:pb-5">
        <EventArea :modalRef="modalRef" :events="activities" :doctype="doctype" />
      </div>
      <div v-else-if="title == 'Calls'" class="activity">
        <div v-for="(call, i) in activities">
          <div class="activity grid grid-cols-[30px_minmax(auto,_1fr)] gap-4 px-3 sm:px-10">
            <div
              class="relative flex justify-center after:absolute after:left-[50%] after:top-0 after:-z-10 after:border-l after:border-gray-200"
              :class="i != activities.length - 1 ? 'after:h-full' : 'after:h-4'"
            >
              <div class="z-10 flex h-8 w-7 items-center justify-center bg-surface-white text-ink-gray-8">
                <MissedCallIcon v-if="call.status == 'No Answer'" class="text-ink-red-4" />
                <DeclinedCallIcon v-else-if="call.status == 'Busy'" />
                <component v-else :is="call.type == 'Incoming' ? InboundCallIcon : OutboundCallIcon" />
              </div>
            </div>
            <CallArea class="mb-4" :activity="call" />
          </div>
        </div>
      </div>
      <div v-else-if="title == 'Attachments'" class="px-3 pb-3 sm:px-10 sm:pb-5">
        <AttachmentArea
          :docname="doc?.data?.name"
          :doctype="doc?.data?.doctype"
          :attachments="activities"
          @reload="all_activities.reload()"
        />
      </div>
      <div
        v-else
        v-for="(activity, i) in activities"
        class="activity px-3 sm:px-10"
        :class="['Activity', 'Emails'].includes(title) ? 'grid grid-cols-[30px_minmax(auto,_1fr)] gap-2 sm:gap-4' : ''"
      >
        <div
          v-if="['Activity', 'Emails'].includes(title)"
          class="relative flex justify-center before:absolute before:left-[50%] before:top-0 before:-z-10 before:border-l before:border-gray-200"
          :class="[i != activities.length - 1 ? 'before:h-full' : 'before:h-4']"
        >
          <div
            class="z-10 flex h-7 w-7 items-center justify-center bg-surface-white"
            :class="{
              'mt-2.5': ['communication'].includes(activity.activity_type),
              'bg-surface-white': ['added', 'removed', 'changed'].includes(activity.activity_type),
              'h-8': ['comment', 'communication', 'incoming_call', 'outgoing_call'].includes(activity.activity_type),
            }"
          >
            <UserAvatar v-if="activity.activity_type == 'communication'" :user="activity.data.sender" size="md" />
            <MissedCallIcon
              v-else-if="
                ['incoming_call', 'outgoing_call'].includes(activity.activity_type) && activity.status == 'No Answer'
              "
              class="text-ink-red-4"
            />
            <DeclinedCallIcon
              v-else-if="
                ['incoming_call', 'outgoing_call'].includes(activity.activity_type) && activity.status == 'Busy'
              "
            />
            <component
              v-else
              :is="activity.icon"
              :class="
                ['added', 'removed', 'changed'].includes(activity.activity_type) ? 'text-ink-gray-4' : 'text-ink-gray-8'
              "
            />
          </div>
        </div>
        <div v-if="activity.activity_type == 'communication'" class="pb-5 mt-px">
          <EmailArea :activity="activity" :emailBox="emailBox" />
        </div>
        <div class="mb-4" :id="activity.name" v-else-if="activity.activity_type == 'comment'">
          <CommentArea :activity="activity" />
        </div>
        <div v-else-if="activity.activity_type == 'note'" class="pb-3 sm:pb-5">
          <div>
            <NoteArea
              :note="activity"
              :modalRef="modalRef"
              v-model="all_activities"
              @reply-note="
                (note) => {
                  emailBox.noteParent = note.name
                  emailBox.showNote = true
                }
              "
            />
          </div>
        </div>
        <div
          class="mb-4 flex flex-col gap-2 py-1.5"
          :id="activity.name"
          v-else-if="activity.activity_type == 'attachment_log'"
        >
          <div class="flex items-center justify-stretch gap-2 text-base">
            <div class="inline-flex items-center flex-wrap gap-1.5 text-ink-gray-8 font-medium">
              <span class="font-medium">{{ activity.owner_name }}</span>
              <span class="text-ink-gray-5">{{ __(activity.data.type) }}</span>
              <a v-if="activity.data.file_url" :href="activity.data.file_url" target="_blank">
                <span>{{ activity.data.file_name }}</span>
              </a>
              <span v-else>{{ activity.data.file_name }}</span>
              <FeatherIcon v-if="activity.data.is_private" name="lock" class="size-3" />
            </div>
            <div class="ml-auto whitespace-nowrap">
              <Tooltip :text="dateFormat(activity.creation, dateTooltipFormat)">
                <div class="text-sm text-ink-gray-5">
                  {{ __(timeAgo(activity.creation)) }}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
        <div
          v-else-if="activity.activity_type == 'incoming_call' || activity.activity_type == 'outgoing_call'"
          class="mb-4"
        >
          <CallArea :activity="activity" />
        </div>
        <div v-else class="mb-4 flex flex-col gap-2 py-1.5">
          <div class="flex items-center justify-stretch gap-2 text-base">
            <div v-if="activity.other_versions" class="inline-flex flex-wrap gap-1.5 text-ink-gray-8 font-medium">
              <span>{{ activity.show_others ? __('Hide') : __('Show') }}</span>
              <span> +{{ activity.other_versions.length + 1 }} </span>
              <span>{{ __('changes from') }}</span>
              <span>{{ activity.owner_name }}</span>
              <Button class="!size-4" variant="ghost" @click="activity.show_others = !activity.show_others">
                <template #icon>
                  <SelectIcon />
                </template>
              </Button>
            </div>
            <div v-else class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
              <span class="font-medium text-ink-gray-8">
                {{ activity.owner_name }}
              </span>
              <span v-if="activity.type">{{ __(activity.type) }}</span>
              <span v-if="activity.data.field_label" class="max-w-xs truncate font-medium text-ink-gray-8">
                {{ __(activity.data.field_label) }}
              </span>
              <span v-if="activity.value">{{ __(activity.value) }}</span>
              <span v-if="activity.data.old_value" class="max-w-xs font-medium text-ink-gray-8">
                <div class="flex items-center gap-1" v-if="activity.options == 'User'">
                  <UserAvatar :user="activity.data.old_value" size="xs" />
                  {{ getUser(activity.data.old_value).full_name }}
                </div>
                <div class="truncate" v-else>
                  {{ activity.data.old_value }}
                </div>
              </span>
              <span v-if="activity.to">{{ __('to') }}</span>
              <span v-if="activity.data.value" class="max-w-xs font-medium text-ink-gray-8">
                <div class="flex items-center gap-1" v-if="activity.options == 'User'">
                  <UserAvatar :user="activity.data.value" size="xs" />
                  {{ getUser(activity.data.value).full_name }}
                </div>
                <div class="truncate" v-else>
                  {{ activity.data.value }}
                </div>
              </span>
            </div>

            <div class="ml-auto whitespace-nowrap">
              <Tooltip :text="dateFormat(activity.creation, dateTooltipFormat)">
                <div class="text-sm text-ink-gray-5">
                  {{ __(timeAgo(activity.creation)) }}
                </div>
              </Tooltip>
            </div>
          </div>
          <div v-if="activity.other_versions && activity.show_others" class="flex flex-col gap-0.5">
            <div
              v-for="activity in [activity, ...activity.other_versions]"
              class="flex items-start justify-stretch gap-2 py-1.5 text-base"
            >
              <div class="inline-flex flex-wrap gap-1 text-ink-gray-5">
                <span v-if="activity.data.field_label" class="max-w-xs truncate text-ink-gray-5">
                  {{ __(activity.data.field_label) }}
                </span>
                <FeatherIcon name="arrow-right" class="mx-1 h-4 w-4 text-ink-gray-5" />
                <span v-if="activity.type">
                  {{ startCase(__(activity.type)) }}
                </span>
                <span v-if="activity.data.old_value" class="max-w-xs font-medium text-ink-gray-8">
                  <div class="flex items-center gap-1" v-if="activity.options == 'User'">
                    <UserAvatar :user="activity.data.old_value" size="xs" />
                    {{ getUser(activity.data.old_value).full_name }}
                  </div>
                  <div class="truncate" v-else>
                    {{ activity.data.old_value }}
                  </div>
                </span>
                <span v-if="activity.to">{{ __('to') }}</span>
                <span v-if="activity.data.value" class="max-w-xs font-medium text-ink-gray-8">
                  <div class="flex items-center gap-1" v-if="activity.options == 'User'">
                    <UserAvatar :user="activity.data.value" size="xs" />
                    {{ getUser(activity.data.value).full_name }}
                  </div>
                  <div class="truncate" v-else>
                    {{ activity.data.value }}
                  </div>
                </span>
              </div>

              <div class="ml-auto whitespace-nowrap">
                <Tooltip :text="dateFormat(activity.creation, dateTooltipFormat)">
                  <div class="text-sm text-ink-gray-5">
                    {{ __(timeAgo(activity.creation)) }}
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
    v-else-if="title !== 'Quotation'"
     class="flex flex-1 flex-col items-center justify-center gap-3 text-xl font-medium text-ink-gray-4">
      <component :is="emptyTextIcon" class="h-10 w-10" />
      <span>{{ __(emptyText) }}</span>
      <Button v-if="title == 'Calls'" :label="__('Make a Call')" @click="makeCall(doc.data.mobile_no)" />
      <Button v-else-if="title == 'Notes'" :label="__('Create Note')" @click="modalRef.showNote()" />
      <Button v-else-if="title == 'Emails'" :label="__('New Email')" @click="emailBox.show = true" />
      <Button v-else-if="title == 'Comments'" :label="__('New Comment')" @click="emailBox.showComment = true" />
      <Button v-else-if="title == 'ToDos'" :label="__('Create ToDo')" @click="modalRef.showToDo()" />
      <Button v-else-if="title == 'Events'" :label="__('Create Events')" @click="modalRef.showEvent()" />
      <Button v-else-if="title == 'Attachments'" :label="__('Upload Attachment')" @click="showFilesUploader = true" />
    </div>
  </FadedScrollableDiv>
  <div>
    <CommunicationArea
      ref="emailBox"
      v-if="['Emails', 'Comments', 'Activity', 'Notes'].includes(title)"
      v-model="doc"
      v-model:reload="reload_email"
      v-model:activities="all_activities"
      :doctype="doctype"
    />
    <WhatsAppBox
      ref="whatsappBox"
      v-if="title == 'WhatsApp'"
      v-model="doc"
      v-model:reply="replyMessage"
      v-model:whatsapp="whatsappMessages"
      :doctype="doctype"
    />
  </div>
  <WhatsappTemplateSelectorModal
    v-if="whatsappEnabled"
    v-model="showWhatsappTemplates"
    :doctype="doctype"
    @send="(t) => sendTemplate(t)"
  />
  <AllModals ref="modalRef" v-model="all_activities" :doctype="doctype" :doc="doc" />
  <FilesUploader
    v-if="doc.data?.name"
    v-model="showFilesUploader"
    :doctype="doctype"
    :docname="doc.data.name"
    @after="
      () => {
        all_activities.reload()
        changeTabTo('attachments')
      }
    "
  />
</template>
<script setup>
import ActivityHeader from '@/components/Activities/ActivityHeader.vue'
import EmailArea from '@/components/Activities/EmailArea.vue'
import CommentArea from '@/components/Activities/CommentArea.vue'
import CallArea from '@/components/Activities/CallArea.vue'
import NoteArea from '@/components/Activities/NoteArea.vue'
import ToDoArea from '@/components/Activities/ToDoArea.vue'
import EventArea from '@/components/Activities/EventArea.vue'
import AttachmentArea from '@/components/Activities/AttachmentArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ActivityIcon from '@/components/Icons/ActivityIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import EventIcon from '@/components/Icons/EventIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import WhatsAppArea from '@/components/Activities/WhatsAppArea.vue'
import WhatsAppBox from '@/components/Activities/WhatsAppBox.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import LeadsIcon from '@/components/Icons/LeadsIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import DotIcon from '@/components/Icons/DotIcon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import SelectIcon from '@/components/Icons/SelectIcon.vue'
import MissedCallIcon from '@/components/Icons/MissedCallIcon.vue'
import DeclinedCallIcon from '@/components/Icons/DeclinedCallIcon.vue'
import InboundCallIcon from '@/components/Icons/InboundCallIcon.vue'
import OutboundCallIcon from '@/components/Icons/OutboundCallIcon.vue'
import FadedScrollableDiv from '@/components/FadedScrollableDiv.vue'
import CommunicationArea from '@/components/CommunicationArea.vue'
import WhatsappTemplateSelectorModal from '@/components/Modals/WhatsappTemplateSelectorModal.vue'
import AllModals from '@/components/Activities/AllModals.vue'
import FilesUploader from '@/components/FilesUploader/FilesUploader.vue'
import { timeAgo, dateFormat, dateTooltipFormat, secondsToDuration, startCase } from '@/utils'
import { globalStore } from '@/stores/global'
import { usersStore } from '@/stores/users'

import { whatsappEnabled } from '@/composables/settings'
import { capture } from '@/telemetry'
import { Button, Tooltip, createResource } from 'frappe-ui'
import { useElementVisibility } from '@vueuse/core'
import { ref, computed, h, markRaw, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const { makeCall, $socket } = globalStore()
const { getUser } = usersStore()

const props = defineProps({
  doctype: {
    type: String,
    default: 'Lead',
  },
  tabs: {
    type: Array,
    default: () => [],
  },
})

const route = useRoute()

const doc = defineModel()
const reload = defineModel('reload')
const tabIndex = defineModel('tabIndex')

const reload_email = ref(false)
const modalRef = ref(null)
const showFilesUploader = ref(false)

const title = computed(() => props.tabs?.[tabIndex.value]?.name || 'Activity')

const changeTabTo = (tabName) => {
  const tabNames = props.tabs?.map((tab) => tab.name?.toLowerCase())
  const index = tabNames?.indexOf(tabName)
  if (index == -1) return
  tabIndex.value = index
}

const all_activities = createResource({
  url: 'next_crm.api.activities.get_activities',
  params: { name: doc.value.data.name },
  cache: ['activity', doc.value.data.name],
  auto: true,
  transform: ([versions, calls, notes, todos, events, attachments]) => {
    return { versions, calls, notes, todos, events, attachments }
  },
})

const showWhatsappTemplates = ref(false)

const whatsappMessages = createResource({
  url: 'next_crm.api.whatsapp.get_whatsapp_messages',
  cache: ['whatsapp_messages', doc.value.data.name],
  params: {
    reference_doctype: props.doctype,
    reference_name: doc.value.data.name,
  },
  auto: true,
  transform: (data) => sortByCreation(data),
})

onBeforeUnmount(() => {
  $socket.off('whatsapp_message')
})

onMounted(() => {
  $socket.on('whatsapp_message', (data) => {
    if (data.reference_doctype === props.doctype && data.reference_name === doc.value.data.name) {
      whatsappMessages.reload()
    }
  })
})

function sendTemplate(template) {
  showWhatsappTemplates.value = false
  capture('send_whatsapp_template', { doctype: props.doctype })
  createResource({
    url: 'next_crm.api.whatsapp.send_whatsapp_template',
    params: {
      reference_doctype: props.doctype,
      reference_name: doc.value.data.name,
      to: doc.value.data.mobile_no,
      template,
    },
    auto: true,
  })
}

const replyMessage = ref({})

function get_activities() {
  if (!all_activities.data?.versions) return []
  if (!all_activities.data?.calls.length) return all_activities.data.versions || []
  return [...all_activities.data.versions, ...all_activities.data.calls]
}

const activities = computed(() => {
  let _activities = []
  if (title.value == 'Activity') {
    _activities = get_activities()

    if (Boolean(doc?.value?.data?.hide_comments_tab)) {
      _activities = _activities.filter((activity) => activity.activity_type !== 'comment')
    }

    const notesAsActivities = (all_activities.data?.notes || []).map((note) => ({
      ...note,
      activity_type: 'note',
      icon: NoteIcon,
      creation: note.added_on,
      content: note.note,
      custom_title: note.custom_title,
      owner: note.owner,
      owner_name: note.owner_name,
      name: note.name,
      type: 'note',
      value: 'added a note',
      attachments: note.attachments || [],
    }))

    _activities = [..._activities, ...notesAsActivities]
  } else if (title.value == 'Emails') {
    if (!all_activities.data?.versions) return []
    _activities = all_activities.data.versions.filter((activity) => activity.activity_type === 'communication')
  } else if (title.value == 'Comments') {
    if (!all_activities.data?.versions) return []
    _activities = all_activities.data.versions.filter((activity) => activity.activity_type === 'comment')
  } else if (title.value == 'Calls') {
    if (!all_activities.data?.calls) return []
    return sortByCreation(all_activities.data.calls)
  } else if (title.value == 'ToDos') {
    if (!all_activities.data?.todos) return []
    return sortByCreation(all_activities.data.todos)
  } else if (title.value == 'Events') {
    if (!all_activities.data?.events) return []
    return sortByCreation(all_activities.data.events)
  } else if (title.value == 'Notes') {
    if (!all_activities.data?.notes) return []
    return sortByCreation(all_activities.data.notes)
  } else if (title.value == 'Attachments') {
    if (!all_activities.data?.attachments) return []
    return sortByCreation(all_activities.data.attachments)
  }

  _activities.forEach((activity) => {
    activity.icon = timelineIcon(activity.activity_type, activity.is_lead)

    if (
      activity.activity_type == 'incoming_call' ||
      activity.activity_type == 'outgoing_call' ||
      activity.activity_type == 'communication'
    )
      return

    update_activities_details(activity)

    if (activity.other_versions) {
      activity.show_others = false
      activity.other_versions.forEach((other_version) => {
        update_activities_details(other_version)
      })
    }
  })
  return sortByCreation(_activities)
})

function sortByCreation(list) {
  return list.sort((a, b) => new Date(b.creation) - new Date(a.creation))
}

function update_activities_details(activity) {
  activity.owner_name = getUser(activity.owner).full_name
  activity.type = ''
  activity.value = ''
  activity.to = ''

  if (activity.activity_type == 'creation') {
    activity.type = activity.data
  } else if (activity.activity_type == 'added') {
    activity.type = 'added'
    activity.value = 'as'
  } else if (activity.activity_type == 'removed') {
    activity.type = 'removed'
    activity.value = 'value'
  } else if (activity.activity_type == 'changed') {
    activity.type = 'changed'
    activity.value = 'from'
    activity.to = 'to'
  }
}

const emptyText = computed(() => {
  let text = 'No Activities'
  if (title.value == 'Emails') {
    text = 'No Email Communications'
  } else if (title.value == 'Comments') {
    text = 'No Comments'
  } else if (title.value == 'Calls') {
    text = 'No Call Logs'
  } else if (title.value == 'Notes') {
    text = 'No Notes'
  } else if (title.value == 'ToDos') {
    text = 'No ToDos'
  } else if (title.value == 'Events') {
    text = 'No Events'
  } else if (title.value == 'Attachments') {
    text = 'No Attachments'
  } else if (title.value == 'WhatsApp') {
    text = 'No WhatsApp Messages'
  }
  return text
})

const emptyTextIcon = computed(() => {
  let icon = ActivityIcon
  if (title.value == 'Emails') {
    icon = Email2Icon
  } else if (title.value == 'Comments') {
    icon = CommentIcon
  } else if (title.value == 'Calls') {
    icon = PhoneIcon
  } else if (title.value == 'Notes') {
    icon = NoteIcon
  } else if (title.value == 'ToDos') {
    icon = ToDoIcon
  } else if (title.value == 'Events') {
    icon = EventIcon
  } else if (title.value == 'Attachments') {
    icon = AttachmentIcon
  } else if (title.value == 'WhatsApp') {
    icon = WhatsAppIcon
  }
  return h(icon, { class: 'text-ink-gray-4' })
})

function timelineIcon(activity_type, is_lead) {
  let icon
  switch (activity_type) {
    case 'creation':
      icon = is_lead ? LeadsIcon : OpportunitiesIcon
      break
    case 'opportunity':
      icon = OpportunitiesIcon
      break
    case 'comment':
      icon = CommentIcon
      break
    case 'incoming_call':
      icon = InboundCallIcon
      break
    case 'outgoing_call':
      icon = OutboundCallIcon
      break
    case 'attachment_log':
      icon = AttachmentIcon
      break
    case 'note':
      icon = NoteIcon
      break
    default:
      icon = DotIcon
  }

  return markRaw(icon)
}

const emailBox = ref(null)
const whatsappBox = ref(null)

watch([reload, reload_email], ([reload_value, reload_email_value]) => {
  if (reload_value || reload_email_value) {
    all_activities.reload()
    reload.value = false
    reload_email.value = false
  }
})

watch(
  () => all_activities.data,
  (value) => {
    const getActivityCount = (type) =>
      value?.versions?.filter((activity) => activity.activity_type === type).length || 0

    const tabCounts = {
      Emails: getActivityCount('communication'),
      Comments: getActivityCount('comment'),
      ToDos: value?.todos?.length || 0,
      Events: value?.events?.length || 0,
      Notes: value?.notes?.length || 0,
      Attachments: value?.attachments?.length || 0,
    }

    for (const [name, count] of Object.entries(tabCounts)) {
      const tab = props.tabs.find((t) => t.name === name)
      if (tab) {
        tab.count.value = count
      }
    }
  },
)

defineExpose({ emailBox, all_activities })
</script>
