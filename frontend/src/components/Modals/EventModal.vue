<template>
  <Dialog
    v-model="show"
    :options="{
      size: 'xl',
      actions: [
        {
          label: editMode ? __('Update') : __('Create'),
          variant: 'solid',
          onClick: () => updateEvent(),
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
          class="text-base leading-6 text-ink-gray-9 mt-1"
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


        <!-- <div>
          <FormControl
            label="Create Event For"
            type="select"
            v-model="selectedRefType"
            :options="['Lead', 'Opportunity', 'Customer']"
            :placeholder="__('Select Type')"
          />
        </div>
        
        <div v-if="selectedRefType" class="mt-2">
          <Link
            v-model="selectedRefName"
            :doctype="selectedRefType"
            :placeholder="`Select ${selectedRefType}`"
            :hideMe="true"
            :options="formatRefLabel"
          />
        </div> -->
        

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
            :placeholder="__('01/04/2024')"
            v-model="_event.starts_on"
            class="datepicker border-none"
          />
          <TextInput
            type="datetime-local"
            :ref_for="true"
            size="sm"
            variant="subtle"
            v-model="_event.ends_on"
            :placeholder="__('01/04/2024')"
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
            class="text-sm text-ink-gray-5"
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
          >
          </Link>
        </div>
        <div v-if="editMode" class="flex items-center gap-2">
          <FormControl class="form-control" type="checkbox" v-model="createAnother" />
          <label
            class="text-sm text-ink-gray-5"
            @click="createAnother = !createAnother"
          >
            {{ __('Create New Event') }}
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full" v-if="_event.sync_with_google_calendar">
          <MultiValueInput
            v-model="event_participants"
            class="flex-grow"
            :placeholder="__('Add participants')"
            :errorMessage="(value) => __('Invalid email address: {0}', [value])"
            :validate="validate"
            :error="(value) => !validate(value)"
            :hideMe="true"
            :triggerKeys="['Enter', ',', 'Tab', ' ']"
          ></MultiValueInput>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import Link from '@/components/Controls/Link.vue'
import MultiValueInput from '../Controls/MultiValueInput.vue'
import { eventStatusOptions, createToast } from '@/utils'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'
import { TextEditor, Dropdown, FormControl, Tooltip, call, TextInput } from 'frappe-ui'
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'

const router = useRouter()

function validate(value) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

const props = defineProps({
  event: { type: Object, default: {} },
  doctype: { type: String, default: 'Lead' },
  doc: { type: String, default: '' },
})

const show = defineModel()
const createAnother = ref(true)
const events = defineModel('reloadEvents')
const emit = defineEmits(['updateEvent', 'after'])

const { getUser } = usersStore()
const selectedRefType = ref('')
const selectedRefName = ref('')

function formatRefLabel(doc) {
  // console.log('doc', doc)
  if (!doc) return ''
  if (selectedRefType.value === 'Customer') {
    return doc.customer_name || doc.name
  }
  if (selectedRefType.value === 'Lead') {
    return (
      [doc.company_name, doc.first_name, doc.last_name].filter(Boolean).join(' ') ||
      doc.name
    )
  }
  if (selectedRefType.value === 'Opportunity') {
    return doc.opportunity_title || doc.customer_name || doc.name
  }
  return doc.name
}


const title = ref(null)
const editMode = ref(false)
const _event = ref({
  title: '',
  description: '',
  _assign: '',
  starts_on: '',
  ends_on: '',
  status: 'Open',
  event_type: 'Public',
  event_category: 'Event',
  sync_with_google_calendar: getUser().google_calendar ? 1 : 0,
  google_calendar: getUser().google_calendar,
})

const event_participants = ref([])
const eventTypeOptions = ref({})
const eventCategoryOptions = ref({})
const eventMeta = ref({})
updateEventMeta()

const referenceTitle = ref('')
const referenceDoc = ref({ type: '', name: '' })

async function updateEventMeta() {
  eventMeta.value = await call('next_crm.api.doc.get_fields_meta', {
    doctype: 'Event',
  })
  eventTypeOptions.value = eventMeta.value.event_type.options.split('\n')
  eventCategoryOptions.value = eventMeta.value.event_category.options.split('\n')
}

function updateEventStatus(status) {
  _event.value.status = status
}

function redirect() {
  if (!referenceDoc.value?.name) return

  let name =
    referenceDoc.value.type === 'Opportunity'
      ? 'Opportunity'
      : referenceDoc.value.type === 'Customer'
      ? 'Customer'
      : 'Lead'

  let params = { leadId: referenceDoc.value.name }

  if (name === 'Opportunity') {
    params = { opportunityId: referenceDoc.value.name }
  } else if (name === 'Customer') {
    params = { customerId: referenceDoc.value.name }
  }

  router.push({ name, params })
}


async function updateEvent() {
  if (!_event.value.subject) {
    createToast({
      title: __('Error'),
      text: __('Subject is mandatory'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return
  }

  if (!_event.value.allocated_to) {
    _event.value.allocated_to = getUser().name
  }
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

  _event.value.assigned_by = getUser().name

  try {
    // -------- UPDATE CASE --------
    if (_event.value.name) {
      _event.value.event_participants = [
        // keep existing participants that are not Lead/Opportunity/Customer
        ..._event.value.event_participants.filter(
          (p) =>
            !['Lead', 'Opportunity', 'Customer'].includes(p.reference_doctype) &&
            (p.reference_doctype !== 'User' || p.reference_docname !== 'Guest')
        ),

        // add new reference participant if selected
        ...(selectedRefType.value && selectedRefName.value
          ? [
              {
                reference_doctype: selectedRefType.value,
                reference_docname: selectedRefName.value,
              },
            ]
          : []),

        // add participant emails
        ...event_participants.value.map((email) => ({
          reference_doctype: 'User',
          reference_docname: 'Guest',
          email: email,
        })),
      ]

      let d = await call('frappe.client.set_value', {
        doctype: 'Event',
        name: _event.value.name,
        fieldname: _event.value,
      })
      if (d.name) events.value.reload()
      createToast({
        title: __('Event updated successfully'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })

    // -------- CREATE CASE --------
    } 
else {
  let doc = {
    doctype: 'Event',
    event_participants: [
      ...(selectedRefType.value && selectedRefName.value
        ? [
            {
              reference_doctype: selectedRefType.value,
              reference_docname: selectedRefName.value,
            },
          ]
        : props.doc
        ? [
            {
              reference_doctype: props.doctype,
              reference_docname: props.doc,
            },
          ]
        : []),
      ...event_participants.value.map((email) => ({
        reference_doctype: 'User',
        reference_docname: 'Guest',
        email: email,
      })),
    ],
    ..._event.value,
  }

  let d = await call('frappe.client.insert', { doc })
  if (d.name) {
    capture('event_created')
    events.value.reload()
    emit('after')
  }
  createToast({
    title: __('Event created successfully'),
    icon: 'check',
    iconClasses: 'text-ink-green-3',
  })
}

    // -------- UPDATE last_modified of reference doc --------
    const refType = selectedRefType.value || props.doctype
    const refName = selectedRefName.value || props.doc
    if (refType && refName) {
      await call('frappe.client.set_value', {
        doctype: refType,
        name: refName,
        fieldname: {
          last_modified: new Date().toISOString(),
        },
      })
    }

    // -------- Reset dialog if needed --------
    if (
      (_event.value.status === 'Closed' || _event.value.status === 'Completed') &&
      createAnother.value
    ) {
      nextTick(() => {
        editMode.value = false
        _event.value = {
          title: '',
          description: '',
          _assign: '',
          starts_on: '',
          ends_on: '',
          status: 'Open',
          event_type: 'Public',
          event_category: 'Event',
          sync_with_google_calendar: getUser().google_calendar ? 1 : 0,
          google_calendar: getUser().google_calendar,
        }
        event_participants.value = [getUser().email]
        show.value = true
      })
    } else {
      show.value = false
    }

  } catch (error) {
    createToast({
      title: __(`Error ${editMode.value ? 'updating' : 'adding'} Event`),
      text: __(error.message),
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
      event_participants.value = (_event.value.event_participants || [])
        .filter((p) => p.reference_doctype === 'User' && p.reference_docname === 'Guest')
        .map((p) => p.email)
    } else {
      event_participants.value = [getUser().email]
    }

    referenceTitle.value = ''
    referenceDoc.value = { type: '', name: '' }

let refRow = (_event.value.event_participants || []).find(
  (p) => ['Lead', 'Customer', 'Opportunity'].includes(p.reference_doctype)
)

if (refRow) {
  selectedRefType.value = refRow.reference_doctype
  selectedRefName.value = refRow.reference_docname
}


if (refRow) {
  referenceDoc.value = {
    type: refRow.reference_doctype,
    name: refRow.reference_docname,
  }
  try {
    const doc = await call('frappe.client.get', {
      doctype: refRow.reference_doctype,
      name: refRow.reference_docname,
    })

    if (refRow.reference_doctype === 'Lead') {
      referenceTitle.value =
        [doc.company_name, doc.first_name, doc.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || doc.title || doc.name
    } else if (refRow.reference_doctype === 'Customer') {
      referenceTitle.value = doc.customer_name || doc.name
    } else if (refRow.reference_doctype === 'Opportunity') {
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
        } catch (leadErr) {
          referenceTitle.value = doc.title || doc.name
        }
      } else {
        referenceTitle.value = doc.title || doc.name
      }
    } else {
      referenceTitle.value = doc.title || doc.name
    }
  } catch (err) {
    referenceTitle.value = refRow.reference_docname
  }
}

  })
}

onMounted(() => show.value && render())
watch(show, (value) => { if (value) render() })




</script>

<style scoped>
:deep(.datepicker svg) {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
