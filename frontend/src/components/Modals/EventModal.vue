<template>
  <Dialog
    v-model="show"
    :options="{
      size: 'xl',
      actions: [
        {
          label: editMode ? __('Update') : __('Create'),
          variant: 'solid',
          onClick: updateEvent,
        },
      ],
    }"
  >
    <template #body-title>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
            {{ editMode ? __('Edit Event') : __('Create Event') }}
          </h3>

          <Button
            v-if="referenceDoc?.name"
            size="sm"
            :label="__('Open ') + referenceDoc.type"
            @click="redirect"
          >
            <template #suffix>
              <ArrowUpRightIcon class="h-4 w-4" />
            </template>
          </Button>
        </div>

        <div
          v-if="referenceTitle"
          class="text-base leading-6 text-ink-gray-9 mt-1 truncate"
          :title="referenceTitle"
        >
          {{ referenceTitle }}
        </div>
      </div>
    </template>

    <template #body-content>
      <div class="flex flex-col gap-4">
        <div>
          <FormControl
            ref="subject"
            :label="__('Subject')"
            v-model="_event.subject"
            :required="true"
            :placeholder="__('Call with John Doe')"
          />
        </div>

        <div>
          <div class="mb-1.5 text-xs text-ink-gray-5">
            {{ __('Description') }}
          </div>
          <TextEditor
            variant="outline"
            ref="description"
            editor-class="!prose-sm overflow-auto min-h-[180px] max-h-80 py-1.5 px-2 rounded border border-[--surface-gray-2] bg-surface-gray-2 placeholder-ink-gray-4 hover:border-outline-gray-modals hover:bg-surface-gray-3 hover:shadow-sm focus:bg-surface-white focus:border-outline-gray-4 focus:shadow-sm focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3 text-ink-gray-8 transition-colors"
            :bubbleMenu="true"
            :content="_event.description"
            @change="(val) => (_event.description = val)"
            :placeholder="__('Took a call with John Doe and discussed the new project.')"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Dropdown :options="eventStatusOptions(updateEventStatus)">
            <Button :label="_event.status" class="w-full justify-between">
              <template #prefix>
                <EventStatusIcon :status="_event.status" />
              </template>
            </Button>
          </Dropdown>
          <FormControl
            v-model="_event.event_category"
            type="select"
            :options="eventCategoryOptions"
            :placeholder="__('Event Category')"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <TextInput
            type="datetime-local"
            :ref_for="true"
            size="sm"
            variant="subtle"
            :placeholder="__('01/04/2024 10:00')"
            v-model="_event.starts_on"
            class="datepicker border-none"
          />
          <TextInput
            type="datetime-local"
            :ref_for="true"
            size="sm"
            variant="subtle"
            v-model="_event.ends_on"
            :placeholder="__('01/04/2024 11:00')"
            class="datepicker border-none"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <FormControl
            class="form-control"
            type="checkbox"
            v-model="_event.sync_with_google_calendar"
            @change="(e) => (_event.sync_with_google_calendar = e.target.checked)"
          />
          <label
            class="text-sm text-ink-gray-5 cursor-pointer"
            @click="_event.sync_with_google_calendar = !_event.sync_with_google_calendar"
          >
            {{ __('Sync with Google Calendar') }}
          </label>

          <Link
            v-if="_event.sync_with_google_calendar"
            class="form-control"
            :value="_event.google_calendar"
            doctype="Google Calendar"
            @change="(option) => (_event.google_calendar = option)"
            :placeholder="__('Google Calendar')"
            :hideMe="true"
            :filters="{ enable: 1 }"
          />
        </div>

        <div class="flex items-center gap-2" v-if="editMode">
          <FormControl class="form-control" type="checkbox" v-model="createAnother" />
          <label
            class="text-sm text-ink-gray-5 cursor-pointer"
            @click="createAnother = !createAnother"
          >
            {{ __('Create New Event') }}
          </label>
        </div>

        <div
          class="flex flex-wrap items-center gap-2 w-full"
          v-if="_event.sync_with_google_calendar"
        >
          <MultiValueInput
            v-model="event_participants"
            class="flex-grow"
            :placeholder="__('Add participants')"
            :errorMessage="(value) => __('Invalid email address: {0}', [value])"
            :validate="validate"
            :error="(value) => !validate(value)"
            :hideMe="true"
            :triggerKeys="['Enter', ',', 'Tab', ' ']"
          />
        </div>

        <ErrorMessage v-if="error" class="mt-2" :message="__(error)" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import Link from '@/components/Controls/Link.vue'
import MultiValueInput from '../Controls/MultiValueInput.vue'
import { eventStatusOptions, createToast } from '@/utils'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'
import { TextEditor, Dropdown, FormControl, call, TextInput, ErrorMessage, Button } from 'frappe-ui'
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'

const router = useRouter()

function validate(value) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

const props = defineProps({
  event: { type: Object, default: () => ({}) },
  doctype: { type: String, default: 'Lead' },
  doc: { type: String, default: '' },
})

const show = defineModel()
const events = defineModel('reloadEvents') // expect parent to pass list resource with reload()
const emit = defineEmits(['after'])

const { getUser } = usersStore()

const title = ref(null)
const editMode = ref(false)
const error = ref('')

const _event = ref({
  subject: '',
  description: '',
  starts_on: '',
  ends_on: '',
  status: 'Open',
  event_type: 'Public',
  event_category: 'Event',
  sync_with_google_calendar: getUser().google_calendar ? 1 : 0,
  google_calendar: getUser().google_calendar,
  event_participants: [],
})

const createAnother = ref(true)
const event_participants = ref([])

const eventMeta = ref({})
const eventCategoryOptions = ref([])
async function loadEventMeta() {
  try {
    const meta = await call('next_crm.api.doc.get_fields_meta', { doctype: 'Event' })
    eventMeta.value = meta || {}
    // event_category is a Select with \n separated options
    eventCategoryOptions.value = (meta?.event_category?.options || '')
      .split('\n')
      .filter(Boolean)
  } catch {
    eventCategoryOptions.value = ['Event', 'Meeting', 'Call']
  }
}

function updateEventStatus(status) {
  _event.value.status = status
}

// Resolve and show the reference record (Lead/Opportunity/Customer) title if present
const referenceTitle = ref('')
const referenceDoc = ref({ type: '', name: '' })

async function hydrateReferenceTitleFromParticipants() {
  const row = (_event.value.event_participants || []).find((p) =>
    ['Lead', 'Customer', 'Opportunity'].includes(p.reference_doctype),
  )
  if (!row) {
    referenceDoc.value = { type: '', name: '' }
    referenceTitle.value = ''
    return
  }
  referenceDoc.value = { type: row.reference_doctype, name: row.reference_docname }
  try {
    const doc = await call('frappe.client.get', {
      doctype: row.reference_doctype,
      name: row.reference_docname,
    })
    if (row.reference_doctype === 'Lead') {
      referenceTitle.value =
        [doc.company_name, doc.first_name, doc.last_name].filter(Boolean).join(' ').trim() ||
        doc.title ||
        doc.name
    } else if (row.reference_doctype === 'Customer') {
      referenceTitle.value = doc.customer_name || doc.name
    } else if (row.reference_doctype === 'Opportunity') {
      if (doc.lead) {
        try {
          const leadDoc = await call('frappe.client.get', {
            doctype: 'Lead',
            name: doc.lead,
          })
          referenceTitle.value =
            [leadDoc.company_name, leadDoc.first_name, leadDoc.last_name]
              .filter(Boolean)
              .join(' ')
              .trim() || leadDoc.title || leadDoc.name
        } catch {
          referenceTitle.value = doc.title || doc.name
        }
      } else {
        referenceTitle.value = doc.title || doc.name
      }
    } else {
      referenceTitle.value = doc.title || doc.name
    }
  } catch {
    referenceTitle.value = row.reference_docname
  }
}

function redirect() {
  if (!referenceDoc.value?.name) return
  const type = referenceDoc.value.type
  if (type === 'Opportunity') {
    router.push({ name: 'Opportunity', params: { opportunityId: referenceDoc.value.name } })
  } else if (type === 'Customer') {
    router.push({ name: 'Customer', params: { customerId: referenceDoc.value.name } })
  } else {
    router.push({ name: 'Lead', params: { leadId: referenceDoc.value.name } })
  }
}

async function updateEvent() {
  // Basic validation
  if (!_event.value.subject) {
    createToast({
      title: __('Error'),
      text: __('Subject is mandatory'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return
  }
  // Starts/Ends validation (optional: only if both provided)
  if (_event.value.starts_on && _event.value.ends_on) {
    const start = new Date(_event.value.starts_on).getTime()
    const end = new Date(_event.value.ends_on).getTime()
    if (!isFinite(start) || !isFinite(end) || end <= start) {
      createToast({
        title: __('Error'),
        text: __('End time must be after start time'),
        icon: 'x',
        iconClasses: 'text-ink-red-4',
      })
      return
    }
  }

  // Google Calendar checks
  if (!_event.value.sync_with_google_calendar) {
    _event.value.google_calendar = null
  } else if (!_event.value.google_calendar) {
    createToast({
      title: __('Error'),
      text: __('Select Google Calendar to which event should be synced'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return
  }

  // Build participants payload (keep any existing non-guest refs, plus guest emails)
  const existingRefs =
    (_event.value.event_participants || []).filter(
      (p) =>
        !['Lead', 'Opportunity', 'Customer'].includes(p.reference_doctype) &&
        (p.reference_doctype !== 'User' || p.reference_docname !== 'Guest'),
    ) || []

  const guestEmails = (event_participants.value || []).map((email) => ({
    reference_doctype: 'User',
    reference_docname: 'Guest',
    email,
  }))

  const participants = [...existingRefs, ...guestEmails]

  try {
    if (_event.value.name) {
      // UPDATE
      const d = await call('frappe.client.set_value', {
        doctype: 'Event',
        name: _event.value.name,
        fieldname: {
          ..._event.value,
          event_participants: participants,
        },
      })
      if (d.name) {
        events.value?.reload?.()
        createToast({
          title: __('Event updated successfully'),
          icon: 'check',
          iconClasses: 'text-ink-green-3',
        })
      }
    } else {
      // CREATE
      const doc = {
        doctype: 'Event',
        ..._event.value,
        event_participants: [
          ...(props.doc
            ? [{ reference_doctype: props.doctype, reference_docname: props.doc }]
            : []),
          ...participants,
        ],
      }
      const d = await call('frappe.client.insert', { doc })
      if (d.name) {
        capture('event_created')
        events.value?.reload?.()
        emit('after')
        createToast({
          title: __('Event created successfully'),
          icon: 'check',
          iconClasses: 'text-ink-green-3',
        })
      }
    }

    // Reset or close
    if (
      (_event.value.status === 'Closed' || _event.value.status === 'Completed') &&
      createAnother.value &&
      !_event.value.name /* just after create */
    ) {
      nextTick(() => {
        editMode.value = false
        _event.value = {
          subject: '',
          description: '',
          starts_on: '',
          ends_on: '',
          status: 'Open',
          event_type: 'Public',
          event_category: 'Event',
          sync_with_google_calendar: getUser().google_calendar ? 1 : 0,
          google_calendar: getUser().google_calendar,
          event_participants: [],
        }
        event_participants.value = [getUser().email].filter(Boolean)
        show.value = true
      })
    } else {
      show.value = false
    }
  } catch (e) {
    createToast({
      title: __(`Error ${editMode.value ? 'updating' : 'adding'} Event`),
      text: __(e.message || e),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
  }
}

async function render() {
  editMode.value = false
  nextTick(async () => {
    title.value?.el?.focus?.()
    _event.value = { ...props.event }

    if (_event.value.subject) {
      editMode.value = true
      // collect guest emails only
      event_participants.value = (_event.value.event_participants || [])
        .filter((p) => p.reference_doctype === 'User' && p.reference_docname === 'Guest')
        .map((p) => p.email)
    } else {
      event_participants.value = [getUser().email].filter(Boolean)
    }

    await hydrateReferenceTitleFromParticipants()
  })
}

onMounted(async () => {
  await loadEventMeta()
  if (show.value) render()
})
watch(show, (value) => {
  if (value) render()
})
</script>

<style scoped>
:deep(.datepicker svg) {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
