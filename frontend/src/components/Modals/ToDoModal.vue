<template>
  <Dialog
    v-model="show"
    :options="{
      size: 'xl',
      actions: [
        {
          label: editMode ? __('Update') : __('Create'),
          variant: 'solid',
          onClick: () => updateToDo(),
        },
      ],
    }"
  >
  <template #body-title>
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-3">
        <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
          {{ editMode ? __('Edit ToDo') : __('Create ToDo') }}
        </h3>
        <Button
          v-if="todo?.reference_name"
          size="sm"
          :label="todo.reference_type == 'Opportunity' ? __('Open Opportunity') : __('Open Lead')"
          @click="redirect()"
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
          ref="custom_title"
          :label="__('Title')"
          v-model="_todo.custom_title"
          :placeholder="__('Call with John Doe')"
          :error="!_todo.custom_title && showError"
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
            :content="_todo.description"
            @change="(val) => (_todo.description = val)"
            :placeholder="__('Took a call with John Doe and discussed the new project.')"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Dropdown :options="todoStatusOptions(updateToDoStatus)">
            <Button :label="_todo.status" class="w-full justify-between">
              <template #prefix>
                <ToDoStatusIcon :status="_todo.status" />
              </template>
            </Button>
          </Dropdown>
          <Link
            class="form-control"
            :value="getUser(_todo.allocated_to).full_name"
            doctype="User"
            @change="(option) => updateAssignee(option)"
            :placeholder="__('John Doe')"
            :hideMe="true"
          >
            <template #prefix>
              <UserAvatar class="mr-2 !h-4 !w-4" :user="_todo.allocated_to" />
            </template>
            <template #item-prefix="{ option }">
              <UserAvatar class="mr-2" :user="option.value" size="sm" />
            </template>
            <template #item-label="{ option }">
              <Tooltip :text="option.value">
                <div class="cursor-pointer">
                  {{ getUser(option.value).full_name }}
                </div>
              </Tooltip>
            </template>
          </Link>
          <DatePicker
            class="datepicker w-36"
            v-model="_todo.date"
            :placeholder="__('01/04/2024')"
            input-class="border-none"
          />
          <TextInput
            v-if="fromTime"
            type="datetime-local"
            :ref_for="true"
            size="sm"
            variant="subtle"
            :placeholder="__('From Time')"
            v-model="_todo.custom_from_time"
            class="datepicker w-fit border-none"
          />
          <TextInput
            v-if="toTime"
            type="datetime-local"
            :ref_for="true"
            size="sm"
            variant="subtle"
            :placeholder="__('To Time')"
            v-model="_todo.custom_to_time"
            class="datepicker w-fit border-none"
          />
          <Dropdown :options="todoPriorityOptions(updateToDoPriority)">
            <Button :label="_todo.priority" class="w-full justify-between">
              <template #prefix>
                <ToDoPriorityIcon :priority="_todo.priority" />
              </template>
            </Button>
          </Dropdown>
        </div>
<div v-if="editMode" class="flex items-center gap-2">
  <FormControl
    class="form-control"
    type="checkbox"
    v-model="createAnother"
  />
  <label
    class="text-sm text-ink-gray-5"
    @click="createAnother = !createAnother"
  >
    {{ __('Create New ToDo') }}
  </label>
</div>

      </div>
    </template>
  </Dialog>
</template>

<script setup>
import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import Link from '@/components/Controls/Link.vue'
import { todoStatusOptions, todoPriorityOptions } from '@/utils'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'
import { TextEditor, Dropdown, Tooltip, call, DatePicker, TextInput } from 'frappe-ui'
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMeta } from '@/stores/meta'
import { createToast } from '@/utils'

const props = defineProps({
  todo: {
    type: Object,
    default: {},
  },
  doctype: {
    type: String,
    default: 'Lead',
  },
  doc: {
    type: String,
    default: '',
  },
})

const show = defineModel()
const todos = defineModel('reloadToDos')
const createAnother = ref(true)

const emit = defineEmits(['updateToDo', 'after'])

const router = useRouter()
const { getUser } = usersStore()

const custom_title = ref(null)
const editMode = ref(false)
const fromTime = ref(false)
const toTime = ref(false)

const _todo = ref({
  custom_title: '',
  description: '',
  allocated_to: '',
  assigned_by: '',
  date: '',
  status: 'Open',
  priority: 'Medium',
  reference_type: props.doctype,
  reference_name: null,
})

function updateToDoStatus(status) {
  _todo.value.status = status
}

function updateToDoPriority(priority) {
  _todo.value.priority = priority
}

function updateAssignee(option) {
  _todo.value.allocated_to = option

  const assigneeUser = getUser(option)

  if (assigneeUser.google_calendar) {
    _event.value.google_calendar = assigneeUser.google_calendar
    _event.value.sync_with_google_calendar = 1
  } else {
    _event.value.google_calendar = null
    _event.value.sync_with_google_calendar = 0
  }
}

function redirect() {
  if (!props.todo?.reference_name) return
  let name = props.todo.reference_type == 'Opportunity' ? 'Opportunity' : 'Lead'
  let params = { leadId: props.todo.reference_name }
  if (name == 'Opportunity') {
    params = { opportunityId: props.todo.reference_name }
  }
  router.push({ name: name, params: params })
}
const showError = ref(false)


async function updateToDo() {
  if (!_todo.value.allocated_to) {
    _todo.value.allocated_to = getUser().name
  }
  _todo.value.assigned_by = getUser().name
  if (!_todo.value.custom_title || !_todo.value.custom_title) {
  createToast({
    title: __(`Error ${editMode.value ? 'updating' : 'adding'} ToDo`),
    text: __('ToDo title is required.'),
    icon: 'x',
    iconClasses: 'text-ink-red-4',
  })
  return
}

if (!_todo.value.description || !_todo.value.description) {
  createToast({
    title: __(`Error ${editMode.value ? 'updating' : 'adding'} ToDo`),
    text: __('ToDo must have either a title or a description.'),
    icon: 'x',
    iconClasses: 'text-ink-red-4',
  })
  return
}


  try {
    if (_todo.value.name) {
      let d = await call('frappe.client.set_value', {
        doctype: 'ToDo',
        name: _todo.value.name,
        fieldname: _todo.value,
      })
      if (d.name) {
        todos.value.reload()
        const refType = _todo.value.reference_type || props.doctype
const refName = _todo.value.reference_name || props.doc
if (refType && refName) {
  await call('frappe.client.set_value', {
    doctype: refType,
    name: refName,
    fieldname: {
      last_modified: new Date().toISOString(),
    },
  })
}

       

      }
      createToast({
        title: __('Todo updated successfully'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })
    } else {
      let d = await call('frappe.client.insert', {
        doc: {
          doctype: 'ToDo',
          reference_type: props.doctype,
          reference_name: props.doc || null,
          ..._todo.value,
        },
      })
      if (d.name) {
        capture('todo_created')
        todos.value.reload()
        emit('after')
        const refType = _todo.value.reference_type || props.doctype
const refName = _todo.value.reference_name || props.doc
console.log('refenrece_type', refType)
console.log('refenrece_name', refName)


if (refType && refName) {
  await call('frappe.client.set_value', {
    doctype: refType,
    name: refName,
    fieldname: {
      last_modified: new Date().toISOString(),
    },
  })
}


      }
      createToast({
        title: __('Todo created successfully'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })
    }
    if (_todo.value.status === 'Closed' && createAnother.value) {
  nextTick(() => {
    editMode.value = false
    _todo.value = {
      custom_title: '',
      description: '',
      allocated_to: '',
      assigned_by: '',
      date: '',
      status: 'Open',
      priority: 'Medium',
      reference_type: props.doctype,
      reference_name: props.doc || null,
    }
    show.value = true
  })
} else {
  show.value = false
}
  } catch (error) {
    createToast({
      title: __(`Error ${editMode.value ? 'updating' : 'adding'} ToDo`),
      text: __(error.message),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
  }
}
const referenceTitle = ref('')


async function render() {
  editMode.value = false

  nextTick(async () => {
    custom_title.value?.el?.focus?.()
    _todo.value = { ...props.todo }

    const { getFields } = await getMeta('ToDo')
    const todoFields = getFields()
    fromTime.value = todoFields?.some((item) => item.fieldname === 'custom_from_time')
    toTime.value = todoFields?.some((item) => item.fieldname === 'custom_to_time')

    if (_todo.value.description) {
      editMode.value = true
    }

    referenceTitle.value = ''

    if (editMode.value && _todo.value.reference_type && _todo.value.reference_name) {
      try {
        const res = await call('frappe.client.get', {
          doctype: _todo.value.reference_type,
          name: _todo.value.reference_name,
        })
        const doc = res
        const refType = (_todo.value.reference_type || '').toLowerCase()

        if (refType === 'lead') {
          let customTitle = [
            doc.company_name || '',
            doc.first_name || '',
            doc.last_name || ''
          ]
            .filter(Boolean)
            .join(' ')
            .trim()

          referenceTitle.value = customTitle || doc.title || doc.name
        } 
        
        else if (refType === 'opportunity') {
          if (doc.opportunity_from === 'Lead' && doc.party_name) {
            try {
              const leadDoc = await call('frappe.client.get', {
                doctype: 'Lead',
                name: doc.party_name,
              })
              let customTitle = [
                leadDoc.company_name || '',
                leadDoc.first_name || '',
                leadDoc.last_name || ''
              ]
                .filter(Boolean)
                .join(' ')
                .trim()

              referenceTitle.value = customTitle || doc.title || doc.name
            } catch (leadErr) {
              console.warn('Error fetching linked lead:', leadErr)
              referenceTitle.value = doc.title || doc.name
            }
          } else {
            referenceTitle.value = doc.title || doc.name
          }
        } 
        
        else {
          referenceTitle.value = doc.title || doc.name
        }
      } catch (err) {
        console.warn('Error fetching reference title:', err)
        referenceTitle.value = _todo.value.reference_name
      }
    }
  })
}





onMounted(() => show.value && render())

watch(show, (value) => {
  if (!value) return
  render()
})
</script>

<style scoped>
:deep(.datepicker svg) {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
