<template>
  <Dialog v-model="show" :options="dialogOptions">
    <template #body>
      <div class="bg-surface-modal px-4 pb-6 pt-5 sm:px-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
              {{ __(dialogOptions.title) || __('Untitled') }}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <!-- Quick Entry (keep your feature) -->
            <Button
              v-if="isManager()"
              variant="ghost"
              class="w-7"
              @click="openQuickEntryModal"
            >
              <EditIcon class="h-4 w-4" />
            </Button>
            <Button variant="ghost" class="w-7" @click="show = false">
              <FeatherIcon name="x" class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div v-if="sections.data">
          <Fields :sections="sections.data" :data="_address" />
          <ErrorMessage class="mt-2" :message="error" />
        </div>
      </div>

      <div class="px-4 pb-7 pt-4 sm:px-6">
        <div class="space-y-2">
          <Button
            class="w-full"
            v-for="action in dialogOptions.actions"
            :key="action.label"
            v-bind="action"
            :label="__(action.label)"
            :loading="loading"
          />
        </div>
      </div>
    </template>
  </Dialog>

  <!-- Keep Quick Entry modal -->
  <QuickEntryModal
    v-if="showQuickEntryModal"
    v-model="showQuickEntryModal"
    doctype="Address"
  />
</template>

<script setup>
import QuickEntryModal from '@/components/Modals/QuickEntryModal.vue'
import Fields from '@/components/Fields.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'
import { call, FeatherIcon, createResource, ErrorMessage, Dialog, Button } from 'frappe-ui'
import { ref, nextTick, watch, computed } from 'vue'

/** Props (unchanged) */
const props = defineProps({
  options: {
    type: Object,
    default: () => ({
      afterInsert: () => {},
    }),
  },
})

/** Stores */
const { isManager } = usersStore()

/** v-models */
const show = defineModel()
const address = defineModel('address')

/** Local state */
const loading = ref(false)
const error = ref(null)
const editMode = ref(false)

/** Working copy */
const _address = ref({
  name: '',
  address_title: '',
  address_type: 'Billing',
  address_line1: '',
  address_line2: '',
  city: '',
  county: '',
  state: '',
  country: '',
  pincode: '',
})

/** Dialog options */
const dialogOptions = computed(() => {
  const title = !editMode.value ? __('New Address') : __(_address.value.address_title || 'Address')
  const size = 'xl'
  const actions = [
    {
      label: editMode.value ? __('Save') : __('Create'),
      variant: 'solid',
      onClick: () => (editMode.value ? updateAddress() : createAddress.submit()),
    },
  ]
  return { title, size, actions }
})

/** Layout sections (Quick Entry layout) */
const sections = createResource({
  url: 'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['quickEntryFields', 'Address'],
  params: { doctype: 'Address', type: 'Quick Entry' },
  auto: true,
})

/** Original doc snapshot for dirty check */
const doc = ref({})

/** Update flow (set_value) */
function updateAddress() {
  error.value = null
  const oldJSON = JSON.stringify(doc.value || {})
  const newJSON = JSON.stringify(_address.value || {})

  // If nothing changed, just close.
  if (oldJSON === newJSON) {
    show.value = false
    return
  }

  loading.value = true
  // IMPORTANT: set_value expects scalar fieldnames -> value mapping.
  // We pass the full object but the endpoint will ignore immutable fields;
  // server may raise CannotChangeConstantError for protected fields.
  updateAddressValues.submit({
    doctype: 'Address',
    name: _address.value.name,
    fieldname: _address.value,
  })
}

const updateAddressValues = createResource({
  url: 'frappe.client.set_value',
  onSuccess(docOut) {
    loading.value = false
    if (docOut?.name) handleAddressUpdate(docOut)
  },
  onError(err) {
    loading.value = false
    error.value = err
  },
})

/** Create flow (insert) */
const createAddress = createResource({
  url: 'frappe.client.insert',
  makeParams() {
    return {
      doc: {
        doctype: 'Address',
        ..._address.value,
      },
    }
  },
  onSuccess(docOut) {
    loading.value = false
    if (docOut?.name) {
      capture('address_created')
      handleAddressUpdate(docOut)
    }
  },
  onError(err) {
    loading.value = false
    error.value = err
  },
})

function handleAddressUpdate(docOut) {
  show.value = false
  props.options.afterInsert && props.options.afterInsert(docOut)
}

/** Open/prepare modal */
watch(
  () => show.value,
  (value) => {
    if (!value) return
    editMode.value = false
    nextTick(() => {
      // hydrate from parent
      const src = address.value?.doc || address.value || {}
      doc.value = { ...src }
      _address.value = { ...src }
      if (_address.value.name) editMode.value = true
    })
  },
)

/** Quick Entry (kept) */
const showQuickEntryModal = ref(false)
function openQuickEntryModal() {
  showQuickEntryModal.value = true
  nextTick(() => {
    show.value = false
  })
}
</script>
