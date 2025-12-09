<template>
  <EditValueModal
    v-if="showEditModal"
    v-model="showEditModal"
    :doctype="doctype"
    :selectedValues="selectedValues"
    @reload="reload"
  />
  <AssignmentModal
    v-if="showAssignmentModal"
    v-model="showAssignmentModal"
    v-model:assignees="bulkAssignees"
    :docs="selectedValues"
    :doctype="doctype"
    @reload="reload"
  />
  <DeleteLinkedDocModal
    v-if="showDeleteDocModal.showLinkedDocsModal"
    v-model="showDeleteDocModal.showLinkedDocsModal"
    :doctype="props.doctype"
    :docname="showDeleteDocModal.docname"
    :reload="reload"
  />
  <BulkDeleteLinkedDocModal
    v-if="showDeleteDocModal.showDeleteModal"
    v-model="showDeleteDocModal.showDeleteModal"
    :doctype="props.doctype"
    :items="showDeleteDocModal.items"
    :reload="reload"
  />
</template>

<script setup>
import EditValueModal from '@/components/Modals/EditValueModal.vue'
import AssignmentModal from '@/components/Modals/AssignmentModal.vue'
import { setupListCustomizations } from '@/utils'
import { globalStore } from '@/stores/global'
import { capture } from '@/telemetry'
import { call, toast } from 'frappe-ui'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  doctype: {
    type: String,
    default: '',
  },
  options: {
    type: Object,
    default: () => ({
      hideEdit: false,
      hideDelete: false,
      hideAssign: false,
    }),
  },
})

const list = defineModel()
const router = useRouter()
const { $dialog, $socket } = globalStore()

/* modal / selection state */
const showEditModal = ref(false)
const selectedValues = ref([])
const unselectAllAction = ref(() => {})
const showDeleteDocModal = ref({
  showLinkedDocsModal: false,
  showDeleteModal: false,
  docname: null,
})
const showAssignmentModal = ref(false)
const bulkAssignees = ref([])

/* Open edit modal with selections */
function editValues(selections, unselectAll) {
  selectedValues.value = selections
  showEditModal.value = true
  unselectAllAction.value = unselectAll
}

/* Convert selected leads to opportunities (confirmation dialog + backend calls) */
function convertToOpportunity(selections, unselectAll) {
  $dialog({
    title: __('Convert to Opportunity'),
    message: __('Are you sure you want to convert {0} Lead(s) to Opportunity(s)?', [selections.size]),
    variant: 'solid',
    theme: 'blue',
    actions: [
      {
        label: __('Convert'),
        variant: 'solid',
        onClick: (close) => {
          capture('bulk_convert_to_opportunity')
          const names = Array.from(selections)
          // Run conversions sequentially to preserve ordering and easier debugging
          Promise.all(
            names.map((name) =>
              call('next_crm.overrides.lead.convert_to_opportunity', {
                lead: name,
              }),
            ),
          )
            .then(() => {
              toast.success(__('Converted successfully'))
              list.value.reload()
              unselectAll()
              close()
            })
            .catch((err) => {
              // Show a toast error if any conversion failed
              toast.create && toast.create({ title: __('Conversion failed'), body: String(err) })
              close()
            })
        },
      },
    ],
  })
}

/* Delete flow:
   - store unselectAllAction
   - if one doc selected => show DeleteLinkedDocModal (to inspect linked docs before deleting)
   - else show BulkDeleteLinkedDocModal for many
*/
function deleteValues(selections, unselectAll) {
  unselectAllAction.value = unselectAll

  const selectedDocs = Array.from(selections)
  if (selectedDocs.length === 1) {
    showDeleteDocModal.value = {
      showLinkedDocsModal: true,
      showDeleteModal: false,
      docname: selectedDocs[0],
    }
  } else if (selectedDocs.length > 1) {
    showDeleteDocModal.value = {
      showLinkedDocsModal: false,
      showDeleteModal: true,
      items: selectedDocs,
      docname: null,
    }
  } else {
    // nothing selected — no-op
  }
}

/* Assign modal */
function assignValues(selections, unselectAll) {
  showAssignmentModal.value = true
  selectedValues.value = selections
  unselectAllAction.value = unselectAll
}

/* Clear assignment with confirmation */
function clearAssignemnts(selections, unselectAll) {
  $dialog({
    title: __('Clear Assignment'),
    message: __('Are you sure you want to clear assignment for {0} item(s)?', [selections.size]),
    variant: 'solid',
    theme: 'red',
    actions: [
      {
        label: __('Clear Assignment'),
        variant: 'solid',
        theme: 'red',
        onClick: (close) => {
          capture('bulk_clear_assignment')
          call('frappe.desk.form.assign_to.remove_multiple', {
            doctype: props.doctype,
            names: JSON.stringify(Array.from(selections)),
            ignore_permissions: true,
          })
            .then(() => {
              toast.success(__('Assignment cleared successfully'))
              reload(unselectAll)
              close()
            })
            .catch((err) => {
              toast.create && toast.create({ title: __('Failed to clear assignment'), body: String(err) })
              close()
            })
        },
      },
    ],
  })
}

/* Custom actions passed from setupListCustomizations or list data */
const customBulkActions = ref([])
const customListActions = ref([])

function bulkActions(selections, unselectAll) {
  let actions = []

  if (!props.options.hideEdit) {
    actions.push({
      label: __('Edit'),
      onClick: () => editValues(selections, unselectAll),
    })
  }

  if (!props.options.hideDelete) {
    actions.push({
      label: __('Delete'),
      onClick: () => deleteValues(selections, unselectAll),
    })
  }

  if (!props.options.hideAssign) {
    actions.push({
      label: __('Assign To'),
      onClick: () => assignValues(selections, unselectAll),
    })
    actions.push({
      label: __('Clear Assignment'),
      onClick: () => clearAssignemnts(selections, unselectAll),
    })
  }

  if (props.doctype === 'Lead') {
    actions.push({
      label: __('Convert to Opportunity'),
      onClick: () => convertToOpportunity(selections, unselectAll),
    })
  }

  customBulkActions.value.forEach((action) => {
    actions.push({
      label: __(action.label),
      onClick: () =>
        action.onClick({
          list: list.value,
          selections,
          unselectAll,
          call,
          createToast: toast.create, // keep compatibility for older custom actions
          toast,
          $dialog,
          router,
        }),
    })
  })

  return actions
}

/* reload helper resets delete modal state and reloads list */
function reload(unselectAll) {
  showDeleteDocModal.value = {
    showLinkedDocsModal: false,
    showDeleteModal: false,
    docname: null,
    items: undefined,
  }

  try {
    unselectAllAction.value?.()
  } catch (e) {
    /* ignore */
  }
  unselectAll?.()
  list.value?.reload()
}

/* mount customizations */
onMounted(async () => {
  if (!list.value?.data) return
  let customization = await setupListCustomizations(list.value.data, {
    list: list.value,
    call,
    createToast: toast.create,
    toast,
    $dialog,
    $socket,
    router,
  })
  customBulkActions.value = customization?.bulkActions || list.value?.data?.bulkActions || []
  customListActions.value = customization?.actions || list.value?.data?.listActions || []
})

defineExpose({
  bulkActions,
  customListActions,
})
</script>
