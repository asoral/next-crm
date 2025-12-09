<template>
  <Dialog
    v-model="show"
    :options="{ title: __('Assign To'), size: 'xl' }"
    @close="resetAssignees"
  >
    <template #body-content>
      <Link
        class="form-control"
        :value="''"
        doctype="User"
        @change="addValue"
        :placeholder="__('John Doe')"
        :filters="userFilters"
        :hideMe="true"
      >
        <template #item-prefix="{ option }">
          <UserAvatar class="mr-2" :user="option.value" size="sm" />
        </template>
        <template #item-label="{ option }">
          <Tooltip :text="option.value">
            <div class="cursor-pointer text-ink-gray-9">
              {{ getUser(option.value)?.full_name || option.value }}
            </div>
          </Tooltip>
        </template>

        <template #target="{ togglePopover }">
          <div
            class="w-full min-h-12 flex flex-wrap items-center gap-1.5 p-1.5 pb-5 rounded-lg bg-surface-gray-2 cursor-text border border-transparent focus-within:border-outline-gray-4 focus-within:ring-1 focus-within:ring-outline-gray-4 transition-all"
            @click.stop="togglePopover"
          >
            <Tooltip
              v-for="assignee in assignees"
              :key="assignee.name"
              :text="assignee.name"
              @click.stop
            >
              <div>
                <div
                  class="flex items-center text-sm text-ink-gray-6 border border-outline-gray-1 bg-surface-white rounded-full hover:bg-surface-gray-2 !p-0.5 transition-colors"
                  @click.stop
                >
                  <UserAvatar :user="assignee.name" size="sm" />
                  <div class="ml-1 font-medium">
                    {{ getUser(assignee.name)?.full_name || assignee.name }}
                  </div>
                  <Button
                    v-if="assignee.name !== owner"
                    variant="ghost"
                    class="rounded-full !size-4 m-1"
                    @click.stop="removeValue(assignee.name)"
                  >
                    <template #icon>
                      <FeatherIcon name="x" class="h-3 w-3 text-ink-gray-6" />
                    </template>
                  </Button>
                </div>
              </div>
            </Tooltip>

            <span
              v-if="!assignees?.length"
              class="text-sm text-ink-gray-4 select-none"
            >
              {{ __('Select users…') }}
            </span>
          </div>
        </template>
      </Link>

      <div v-if="assignees?.length" class="mt-3 flex flex-wrap items-center gap-2">
        <Tooltip
          v-for="assignee in assignees"
          :key="assignee.name"
          :text="assignee.name"
        >
          <Button :label="getUser(assignee.name)?.full_name || assignee.name" theme="gray">
            <template #prefix>
              <UserAvatar :user="assignee.name" size="sm" />
            </template>
            <template #suffix>
              <FeatherIcon
                v-if="assignee.name !== owner"
                class="h-3.5 cursor-pointer"
                name="x"
                @click.stop="removeValue(assignee.name)"
              />
            </template>
          </Button>
        </Tooltip>
      </div>
    </template>

    <template #actions>
      <div class="flex justify-between items-center gap-2 w-full">
        <div class="flex-1">
          <ErrorMessage v-if="error" :message="__(error)" />
        </div>
        <div class="flex items-center justify-end gap-2">
          <Button
            variant="subtle"
            :label="__('Cancel')"
            @click="handleCancel"
          />
          <Button
            variant="solid"
            :label="__('Update')"
            :loading="loading"
            @click="updateAssignees"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
// 1. Standard Imports (Vue -> Stores -> UI -> Utils)
import { ref, computed, watch, defineModel, defineProps, defineEmits } from 'vue'
import { usersStore } from '@/stores/users'
import { Dialog, Button, Tooltip, ErrorMessage, call, FeatherIcon } from 'frappe-ui'
import UserAvatar from '@/components/UserAvatar.vue'
import Link from '@/components/Controls/Link.vue'
import { capture } from '@/telemetry'

// 2. Props Definition
const props = defineProps({
  doc: {
    type: Object,
    default: null,
  },
  docs: {
    type: Set,
    default: () => new Set(),
  },
  doctype: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['reload'])

// 3. State Management
const show = defineModel()
const assignees = defineModel('assignees', { default: () => [] })
const oldAssignees = ref([])
const error = ref('')
const loading = ref(false)

const { users, getUser } = usersStore()

// 4. Computed Properties
const userFilters = computed(() => {
  const crmUsers = users.data?.crmUsers || []
  // If we have specific CRM users, filter by them. Otherwise, allow all.
  if (!crmUsers.length) return undefined
  return {
    name: ['in', crmUsers.map((u) => u.name)],
  }
})

const owner = computed(() => {
  if (!props.doc) return ''
  return props.doctype === 'Lead' ? props.doc.lead_owner : props.doc.opportunity_owner
})

// 5. Methods

// Helper to reset state
const resetAssignees = () => {
  if (oldAssignees.value.length) {
    assignees.value = [...oldAssignees.value]
  }
}

const handleCancel = () => {
  resetAssignees()
  show.value = false
}

const removeValue = (value) => {
  assignees.value = assignees.value.filter((assignee) => assignee.name !== value)
}

const addValue = (payload) => {
  error.value = ''
  // Robust check: payload might be the object {label, value} or just the value string depending on UI version
  const value = typeof payload === 'object' && payload?.value ? payload.value : payload

  if (!value) return

  const user = getUser(value)
  if (!user) return

  const isDuplicate = assignees.value.some((assignee) => assignee.name === value)
  
  if (!isDuplicate) {
    assignees.value.push({
      name: value,
      image: user.user_image,
      label: user.full_name,
    })
  }
}

// Robust Error Parser to prevent runtime crashes on weird server messages
const parseError = (e) => {
  if (e?._server_messages) {
    try {
      return JSON.parse(JSON.parse(e._server_messages)[0]).message
    } catch {
      return 'An error occurred while processing server messages.'
    }
  }
  return e?.message || typeof e === 'string' ? e : 'Something went wrong'
}

async function updateAssignees() {
  error.value = ''
  loading.value = true

  // Calculate Diffs
  const removedAssignees = oldAssignees.value
    .filter((old) => !assignees.value.some((current) => current.name === old.name))
    .map((a) => a.name)

  const addedAssignees = assignees.value
    .filter((current) => !oldAssignees.value.some((old) => old.name === current.name))
    .map((a) => a.name)

  try {
    // 1. Handle Removals
    if (removedAssignees.length) {
      await call('crm.api.doc.remove_assignments', {
        doctype: props.doctype,
        name: props.doc.name,
        assignees: JSON.stringify(removedAssignees),
      })
    }

    // 2. Handle Additions
    if (addedAssignees.length) {
      if (props.docs.size) {
        // Bulk Assign
        capture('bulk_assign_to', { doctype: props.doctype })
        await call('frappe.desk.form.assign_to.add_multiple', {
          doctype: props.doctype,
          name: JSON.stringify(Array.from(props.docs)),
          assign_to: addedAssignees,
          bulk_assign: true,
          re_assign: true,
        })
        emit('reload')
      } else {
        // Single Assign
        capture('assign_to', { doctype: props.doctype })
        await call('frappe.desk.form.assign_to.add', {
          doctype: props.doctype,
          name: props.doc.name,
          assign_to: addedAssignees,
        })
      }
    }

    show.value = false
  } catch (e) {
    error.value = parseError(e)
    // On error, we might want to reload the list to reflect reality, 
    // but usually keeping the modal open to retry is better.
  } finally {
    loading.value = false
  }
}

// 6. Watchers
// We only need to snapshot when the modal opens. 
// Using `watch` covers both button clicks and external triggers.
watch(
  show,
  (isOpen) => {
    if (isOpen) {
      // Create a deep-ish copy of the array structure
      oldAssignees.value = assignees.value.map(a => ({...a}))
      error.value = ''
    }
  }
)
</script>