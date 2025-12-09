<template>
  <!-- ToDo -->
  <ToDoModal
    v-model="showToDoModal"
    v-model:reloadToDos="activities"
    :todo="todo"
    :doctype="doctype"
    :doc="safeDocName()"
    @after="onToDoAfter"
  />

  <!-- Event -->
  <EventModal
    v-model="showEventModal"
    v-model:reloadEvents="activities"
    :event="event"
    :doctype="doctype"
    :doc="safeDocName()"
    @after="onEventAfter"
  />

  <!-- Note -->
  <NoteModal
    v-model="showNoteModal"
    v-model:reloadNotes="activities"
    :note="note"
    :doctype="doctype"
    :doc="safeDocName()"
    @after="onNoteAfter"
  />
</template>

<script setup>
import ToDoModal from '@/components/Modals/ToDoModal.vue'
import EventModal from '@/components/Modals/EventModal.vue'
import NoteModal from '@/components/Modals/NoteModal.vue'
import { call } from 'frappe-ui'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usersStore } from '@/stores/users'
import { getMeta } from '@/stores/meta'
import { createToast } from '@/utils'

const props = defineProps({
  doctype: { type: String, required: true },
})

// v-models from parent
const activities = defineModel()           // parent passes a ref with .reload()
const doc = defineModel('doc')             // parent passes doc (often { data: {...} } or { name: ... })

// stores / meta
const { getUser } = usersStore()
const { getFields } = getMeta('ToDo')

// visibility
const showToDoModal = ref(false)
const showEventModal = ref(false)
const showNoteModal = ref(false)

// editors
const todo = ref({})
const event = ref({})
const note = ref({})

// some ToDo meta (optional fields)
const todoFields = getFields() || []
const hasFromTime = !!todoFields.find(f => f.fieldname === 'custom_from_time')
const hasToTime   = !!todoFields.find(f => f.fieldname === 'custom_to_time')

// ---- safe doc name for :doc binding ----
function safeDocName() {
  // supports: doc = { data: { name } } OR doc = { name } OR doc = 'NAME'
  const d = doc?.value ?? doc
  if (!d) return ''
  if (typeof d === 'string') return d
  if (d?.data?.name) return d.data.name
  if (d?.name) return d.name
  return ''
}

// ---- open helpers (exposed) ----
function showToDo(t = null) {
  todo.value = t || {
    custom_title: '',
    description: '',
    allocated_to: '',
    date: '',
    priority: 'Medium',
    status: 'Open',
    ...(hasFromTime && { custom_from_time: '' }),
    ...(hasToTime && { custom_to_time: '' }),
  }
  showToDoModal.value = true
}

function showEvent(e = null) {
  const gc = getUser()?.google_calendar
  event.value = e || {
    subtitle: '',
    description: '',
    _assign: '',
    starts_on: '',
    ends_on: '',
    status: 'Open',
    event_type: 'Public',
    event_category: 'Event',
    sync_with_google_calendar: gc ? 1 : 0,
    google_calendar: gc,
  }
  showEventModal.value = true
}

function showNote(n = null) {
  note.value = n || {
    title: '',
    content: '',
  }
  showNoteModal.value = true
}

defineExpose({
  showToDo,
  showEvent,
  showNote,
  deleteToDo,
  deleteEvent,
  updateToDoStatus,
  updateEventStatus,
})

// ---- after handlers (child emits @after on success) ----
const route = useRoute()
const router = useRouter()

function redirect(tab) {
  if (route.name === 'Lead' || route.name === 'Opportunity') {
    const hash = `#${tab}`
    if (route.hash !== hash) router.push({ ...route, hash })
  }
}

function reloadActivities() {
  try {
    activities?.value?.reload?.()
  } catch (_) {}
}

function onToDoAfter() {
  createToast({ title: __('Success'), text: __('To-Do saved successfully'), icon: 'check' })
  showToDoModal.value = false
  todo.value = {}
  reloadActivities()
  redirect('todos')
}

function onEventAfter() {
  createToast({ title: __('Success'), text: __('Event saved successfully'), icon: 'calendar-check' })
  showEventModal.value = false
  event.value = {}
  reloadActivities()
  redirect('events')
}

function onNoteAfter() {
  createToast({ title: __('Success'), text: __('Note saved successfully'), icon: 'file-text' })
  showNoteModal.value = false
  note.value = {}
  reloadActivities()
  redirect('notes')
}

// ---- destructive / status helpers (optional) ----
async function deleteToDo(name) {
  try {
    await call('frappe.client.delete', { doctype: 'ToDo', name })
    reloadActivities()
    createToast({ title: __('Todo deleted successfully'), icon: 'check', iconClasses: 'text-ink-green-3' })
  } catch (error) {
    createToast({ title: __('Error deleting ToDo'), text: __(error?.message || ''), icon: 'x', iconClasses: 'text-ink-red-4' })
  }
}

async function deleteEvent(name) {
  try {
    await call('frappe.client.delete', { doctype: 'Event', name })
    reloadActivities()
    createToast({ title: __('Event deleted successfully'), icon: 'check', iconClasses: 'text-ink-green-3' })
  } catch (error) {
    createToast({ title: __('Error deleting Event'), text: __(error?.message || ''), icon: 'x', iconClasses: 'text-ink-red-4' })
  }
}

function updateToDoStatus(status, t) {
  call('frappe.client.set_value', { doctype: 'ToDo', name: t.name, fieldname: 'status', value: status })
    .then(() => {
      reloadActivities()
      createToast({ title: __('ToDo status updated successfully'), icon: 'check', iconClasses: 'text-ink-green-3' })
    })
    .catch((error) => {
      createToast({ title: __('Error updating ToDo status'), text: __(error?.message || ''), icon: 'x', iconClasses: 'text-ink-red-4' })
    })
}

function updateEventStatus(status, e) {
  call('frappe.client.set_value', { doctype: 'Event', name: e.name, fieldname: 'status', value: status })
    .then(() => {
      reloadActivities()
      createToast({ title: __('Event status updated successfully'), icon: 'check', iconClasses: 'text-ink-green-3' })
    })
    .catch((error) => {
      createToast({ title: __('Error updating Event status'), text: __(error?.message || ''), icon: 'x', iconClasses: 'text-ink-red-4' })
    })
}
</script>
