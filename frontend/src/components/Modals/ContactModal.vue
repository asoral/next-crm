<template>
  <Dialog v-model="show" :options="dialogOptions">
    <template #body>
      <div class="bg-surface-modal px-4 pb-6 pt-5 sm:px-6 overflow-visible">
        
        <div class="mb-5 flex items-center justify-between relative z-10">
          <div>
            <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
              {{ __(dialogOptions.title) || __('Untitled') }}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-if="isManager() || detailMode"
              variant="ghost"
              class="w-7"
              @click="toggleEditMode"
            >
              <EditIcon class="h-4 w-4" />
            </Button>
            <Button variant="ghost" class="w-7" @click="show = false">
              <FeatherIcon name="x" class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div class="relative">
          <div v-if="detailMode" class="flex flex-col gap-3.5">
            <div
              v-for="field in detailFields"
              :key="field.name"
              class="flex min-h-[28px] items-center gap-3 text-base text-ink-gray-8"
            >
              <div class="grid w-7 shrink-0 place-content-center">
                <component :is="field.icon" />
              </div>

              <div class="flex-1 min-w-0">
                <div v-if="field.type === 'dropdown'" class="w-full">
                  <Dropdown :options="field.options" class="w-full">
                    <template #default="{ open }">
                      <Button
                        variant="ghost"
                        class="w-full justify-between px-2 hover:bg-surface-white"
                      >
                        <div class="truncate">{{ displayValue(field) }}</div>
                        <template #suffix>
                          <FeatherIcon :name="open ? 'chevron-up' : 'chevron-down'" class="h-4 text-ink-gray-5" />
                        </template>
                      </Button>
                    </template>
                  </Dropdown>
                </div>
                <div v-else class="truncate px-2">
                  {{ field.value }}
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="filteredSections.length" class="mt-2">
            <Fields 
              :sections="filteredSections" 
              :data="_contact" 
            />
          </div>
          
          <div v-else class="flex h-32 items-center justify-center text-ink-gray-4">
             {{ __('Loading fields...') }}
          </div>
        </div>
      </div>

      <div v-if="!detailMode" class="px-4 pb-7 pt-4 sm:px-6 bg-surface-modal rounded-b-lg">
        <div class="space-y-2">
          <Button
            class="w-full"
            v-for="action in dialogOptions.actions"
            :key="action.label"
            v-bind="action"
            :loading="loading"
          >
            {{ __(action.label) }}
          </Button>
        </div>
      </div>
    </template>
  </Dialog>

  <AddressModal 
    v-model="showAddressModal" 
    v-model:address="_address"
    @update:address="handleAddressUpdate" 
  />

  <QuickEntryModal 
    v-if="showQuickEntryModal" 
    v-model="showQuickEntryModal" 
    doctype="Contact" 
  />
</template>

<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'

// UI Components
import { Dialog, Button, FeatherIcon, call, createResource } from 'frappe-ui'
import Fields from '@/components/Fields.vue'
import AddressModal from '@/components/Modals/AddressModal.vue'
import QuickEntryModal from '@/components/Modals/QuickEntryModal.vue'
import Dropdown from '@/components/frappe-ui/Dropdown.vue'

// Icons
import ContactIcon from '@/components/Icons/ContactIcon.vue'
import GenderIcon from '@/components/Icons/GenderIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import CustomersIcon from '@/components/Icons/CustomersIcon.vue'
import AddressIcon from '@/components/Icons/AddressIcon.vue'
import CertificateIcon from '@/components/Icons/CertificateIcon.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'

const props = defineProps({
  contact: {
    type: Object,
    default: () => ({}),
  },
  options: {
    type: Object,
    default: () => ({
      redirect: true,
      detailMode: false,
      afterInsert: () => {},
    }),
  },
})

// Visibility Model
const show = defineModel()

// Store & Router
const { isManager } = usersStore()
const router = useRouter()

// State
const detailMode = ref(false)
const editMode = ref(false)
const loading = ref(false)

const _contact = ref({})
const _address = ref({})
const showAddressModal = ref(false)
const showQuickEntryModal = ref(false)

const contactData = computed(() => props.contact?.data || {})

/* ---------- Actions ---------- */

async function updateContact() {
  if (!dirty.value) {
    show.value = false
    return
  }
  loading.value = true
  
  try {
    const values = { ..._contact.value }
    const name = await callSetValue(values)
    handleContactUpdate({ name })
  } catch (e) {
    console.error('Failed to update contact', e)
  } finally {
    loading.value = false
  }
}

async function callSetValue(values) {
  const d = await call('frappe.client.set_value', {
    doctype: 'Contact',
    name: contactData.value.name,
    fieldname: values,
  })
  return d.name
}

async function callInsertDoc() {
  loading.value = true
  
  // Clone to avoid mutating form state
  const payload = { ..._contact.value }

  // 1. Normalize Email
  if (payload.email_id) {
    payload.email_ids = [{ email_id: payload.email_id }]
    delete payload.email_id
  }

  // 2. Normalize Mobile/Phone
  if (payload.mobile_no) {
    const mobile = payload.mobile_no
    payload.phone_nos = [
      {
        phone: mobile,
        is_primary_mobile_no: 1,
        is_primary_phone: 0,
        doctype: 'Contact Phone',
        parentfield: 'phone_nos',
        parenttype: 'Contact',
        __unsaved: 1,
        docstatus: 0,
      },
    ]
    payload.phone = mobile
  }

  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'Contact',
        ...payload,
      },
    })

    if (doc?.name) {
      capture('contact_created')
      handleContactUpdate(doc)
    }
  } catch (e) {
    console.error('Failed to insert contact', e)
  } finally {
    loading.value = false
  }
}

function handleContactUpdate(doc) {
  if (props.contact?.reload) {
    props.contact.reload()
  }
  
  if (doc?.name && props.options.redirect) {
    router.push({ name: 'Contact', params: { contactId: doc.name } })
  }
  
  show.value = false
  if (props.options.afterInsert) {
    props.options.afterInsert(doc)
  }
}

function handleAddressUpdate(newAddress) {
  // Logic to handle address updates if needed
}

/* ---------- UI Interaction ---------- */

function toggleEditMode() {
  if (detailMode.value) {
    detailMode.value = false
  } else {
    openQuickEntryModal()
  }
}

function openQuickEntryModal() {
  showQuickEntryModal.value = true
  nextTick(() => {
    show.value = false
  })
}

/* ---------- Dialog Meta ---------- */

const dialogOptions = computed(() => {
  const isEdit = editMode.value
  const title = !isEdit ? __('New Contact') : (_contact.value.full_name || __('Untitled'))
  const size = detailMode.value ? '' : 'xl'
  
  const actions = detailMode.value
    ? []
    : [
        {
          label: isEdit ? __('Save') : __('Create'),
          variant: 'solid',
          disabled: !dirty.value,
          loading: loading.value,
          onClick: () => (isEdit ? updateContact() : callInsertDoc()),
        },
      ]
      
  return { title, size, actions }
})

/* ---------- Detail View ---------- */

const detailFields = computed(() => {
  const c = _contact.value || {}
  const fullName = (c.salutation ? `${c.salutation}. ` : '') + (c.full_name || '')
  
  const list = [
    { icon: ContactIcon, name: 'full_name', value: fullName },
    { icon: GenderIcon, name: 'gender', value: c.gender },
    { icon: Email2Icon, name: 'email_id', value: c.email_id },
    { icon: PhoneIcon, name: 'mobile_no', value: c.actual_mobile_no || c.mobile_no },
    { icon: CustomersIcon, name: 'company_name', value: c.company_name },
    { icon: CertificateIcon, name: 'designation', value: c.designation },
    { icon: AddressIcon, name: 'address', value: c.address },
  ]
  return list.filter((d) => d.value)
})

function displayValue(field) {
  return _contact.value?.[field.name] ?? ''
}

/* ---------- Fields Layout (Server-Driven) ---------- */

const sections = createResource({
  url: 'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['quickEntryFields', 'Contact'],
  params: { doctype: 'Contact', type: 'Quick Entry' },
  auto: true,
})

const filteredSections = computed(() => {
  const data = sections.data
  if (!data || !Array.isArray(data)) return []

  // Deep clone to safely mutate
  const sectionsCopy = JSON.parse(JSON.stringify(data))

  sectionsCopy.forEach((s) => {
    if (!s.fields) return
    s.fields.forEach((field) => {
      // Address Field Handlers
      if (field.name === 'address') {
        field.create = (value, close) => {
          _contact.value.address = value
          _address.value = {}
          showAddressModal.value = true
          if (close) close()
        }
        field.edit = async (addr) => {
          try {
            _address.value = await call('frappe.client.get', {
              doctype: 'Address',
              name: addr,
            })
            showAddressModal.value = true
          } catch (e) {
            console.warn('Could not fetch address', e)
          }
        }
      }
    })
  })
  return sectionsCopy
})

/* ---------- Watchers ---------- */

const dirty = computed(() => {
  return JSON.stringify(contactData.value || {}) !== JSON.stringify(_contact.value || {})
})

watch(
  () => show.value,
  (isOpen) => {
    if (isOpen) {
      detailMode.value = !!props.options.detailMode
      editMode.value = false
      
      nextTick(() => {
        _contact.value = { ...(contactData.value || {}) }
        if (_contact.value?.name) {
          editMode.value = true
        }
      })
    }
  },
  { immediate: false } 
)
</script>