<template>
  <Dialog v-model="show" :options="{ size: '3xl' }">
    <template #body>
      <div class="bg-surface-modal px-4 pb-6 pt-5 sm:px-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
              {{ __('Create Lead') }}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <!-- Use global Quick Entry layout editor (desktop only) -->
            <Button
              v-if="isManager() && !isMobileView"
              variant="ghost"
              class="w-7"
              :tooltip="__('Edit fields layout')"
              :icon="EditIcon"
              @click="openQuickEntryModal"
            />
            <Button
              variant="ghost"
              class="w-7"
              icon="x"
              @click="show = false"
            />
          </div>
        </div>

        <div>
          <Fields
            v-if="sections.data"
            :sections="sections.data"
            :data="lead.doc"
          />
          <ErrorMessage
            class="mt-4"
            v-if="error"
            :message="__(error)"
          />
        </div>
      </div>

      <div class="px-4 pb-7 pt-4 sm:px-6">
        <div class="flex flex-row-reverse gap-2">
          <Button
            variant="solid"
            :label="__('Create')"
            :loading="isLeadCreating"
            @click="createNewLead"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import EditIcon from '@/components/Icons/EditIcon.vue'
import Fields from '@/components/Fields.vue'

import { usersStore } from '@/stores/users'
import { statusesStore } from '@/stores/statuses'
import { sessionStore } from '@/stores/session'
import { isMobileView } from '@/composables/settings'
import { showQuickEntryModal, quickEntryProps } from '@/composables/modals'

import { capture } from '@/telemetry'
import { createResource, ErrorMessage, call } from 'frappe-ui'
import { computed, onMounted, ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  defaults: Object,
})

const show = defineModel()
const router = useRouter()

const { user } = sessionStore()
const { getUser, isManager } = usersStore()
const { getLeadStatus, statusOptions } = statusesStore()

// Use doc wrapper to stay consistent with other forms
const lead = reactive({ doc: {} })

const error = ref(null)
const isLeadCreating = ref(false)

const leadStatuses = computed(() => {
  const opts = statusOptions('lead') || []
  if (!lead.doc.status && opts[0]?.value) {
    lead.doc.status = opts[0].value
  }
  return opts
})

/**
 * Load Quick Entry layout for Lead.
 * Also:
 *  - convert `status` to Select with our options & color prefix
 *  - init Table fields to []
 */
const sections = createResource({
  url: 'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['quickEntryFields', 'Lead'],
  params: { doctype: 'Lead', type: 'Quick Entry' },
  auto: true,
  transform: (_sections) => {
    _sections.forEach((section) => {
      (section.fields || []).forEach((field) => {
        // status Select with colored prefix
        if (field.fieldname === 'status') {
          field.fieldtype = 'Select'
          field.options = leadStatuses.value
          if (lead.doc.status) {
            const st = getLeadStatus(lead.doc.status)
            field.prefix = st?.color
          }
        }

        // make sure table fields are arrays
        if (field.fieldtype === 'Table' && lead.doc[field.fieldname] == null) {
          lead.doc[field.fieldname] = []
        }
      })
    })
    return _sections
  },
})

const createLead = createResource({ url: 'frappe.client.insert' })

async function createNewLead() {
  error.value = null

  // Normalize website
  if (lead.doc.website && !/^https?:\/\//i.test(lead.doc.website)) {
    lead.doc.website = 'https://' + lead.doc.website
  }

  // Validations (merged / cleaned from both versions)
  if (!lead.doc.first_name) {
    error.value = __('First Name is mandatory')
    return
  }

  if (lead.doc.annual_revenue) {
    const num =
      typeof lead.doc.annual_revenue === 'string'
        ? lead.doc.annual_revenue.replace(/,/g, '')
        : lead.doc.annual_revenue
    if (isNaN(num)) {
      error.value = __('Annual Revenue should be a number')
      return
    }
    lead.doc.annual_revenue = num
  }

  if (
    lead.doc.mobile_no &&
    isNaN(String(lead.doc.mobile_no).replace(/[-+() ]/g, ''))
  ) {
    error.value = __('Mobile No should be a number')
    return
  }

  if (lead.doc.email_id && !String(lead.doc.email_id).includes('@')) {
    error.value = __('Invalid Email')
    return
  }

  if (!lead.doc.status) {
    error.value = __('Status is required')
    return
  }

  isLeadCreating.value = true

  createLead.submit(
    {
      doc: {
        doctype: 'Lead',
        ...lead.doc,
      },
    },
    {
      async onSuccess(data) {
        // --- BEST OF VERSION A: auto-create Address if city exists ---
        try {
          if (lead.doc.city) {
            await call('frappe.client.insert', {
              doc: {
                doctype: 'Address',
                address_title: `${lead.doc.first_name || ''} ${lead.doc.last_name || ''}`.trim() || data.name,
                address_line1: lead.doc.city,
                address_line2: lead.doc.city,
                city: lead.doc.city || '',
                state: lead.doc.state || '',
                country: lead.doc.country || 'India',
                pincode: lead.doc.pincode || '',
                phone: lead.doc.mobile_no || '',
                links: [
                  {
                    link_doctype: 'Lead',
                    link_name: data.name,
                  },
                ],
              },
            })
          }
        } catch (e) {
          // don't block lead creation if address fails
          console.error('Error creating address from lead:', e)
        }

        capture('lead_created')
        isLeadCreating.value = false
        show.value = false
        router.push({ name: 'Lead', params: { leadId: data.name } })
      },
      onError(err) {
        isLeadCreating.value = false
        if (!err?.messages) {
          error.value = err?.message || String(err)
        } else {
          error.value = err.messages.join('\n')
        }
      },
    },
  )
}

// Global Quick Entry layout editor (for managers, desktop)
function openQuickEntryModal() {
  showQuickEntryModal.value = true
  quickEntryProps.value = { doctype: 'Lead' }
  nextTick(() => (show.value = false))
}

onMounted(() => {
  // sensible defaults + props.defaults
  lead.doc = {
    no_of_employees: '1-10',
    country: 'India',
  }
  Object.assign(lead.doc, props.defaults || {})

  if (!lead.doc.lead_owner) {
    lead.doc.lead_owner = getUser().name
  }
  if (!lead.doc.status && leadStatuses.value[0]?.value) {
    lead.doc.status = leadStatuses.value[0].value
  }
})
</script>
