<template>
  <Dialog
    v-model="show"
    :options="{
      title: __('Set as Lost'),
      size: 'xl',
      actions: [
        {
          label: __('Update'),
          variant: 'solid',
          disabled: selectedLostReason.length === 0,
          onClick: async () => {
            await updateLostInfo()
            show = false
          },
        },
      ],
    }"
  >
    <template #body-content>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <div
            class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ink-gray-5"
          >
            {{ __('Lost Reasons') }}
            <span class="text-red-500">*</span>
          </div>
          <TagInput
            :data="tagsList"
            :loading="isLoading"
            :onChange="(value) => (selectedLostReason = value)"
            :searchQuery="searchQuery"
            @update:searchQuery="
              async (val) => {
                searchQuery = val
                await getLostReasons()
              }
            "
          />
        </div>

        <div class="flex flex-col gap-1">
          <div
            class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ink-gray-5"
          >
            {{ __('Competitors') }}
          </div>
          <TagInput
            :data="competitorList"
            :loading="isCompetitorLoading"
            :onChange="(value) => (selectedCompetitors = value)"
            :searchQuery="competitorSearchQuery"
            @update:searchQuery="
              async (val) => {
                competitorSearchQuery = val
                await getCompetitors()
              }
            "
          />
        </div>

        <div class="flex flex-col gap-1">
          <div
            class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ink-gray-5"
          >
            {{ __('Detailed Reason') }}
          </div>
          <FormControl type="textarea" v-model="detailedReason" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { call, Dialog, FormControl } from 'frappe-ui'
import TagInput from '@/components/TagInput.vue'
import { createToast } from '@/utils'
import { errorMessage } from '../../utils'

const props = defineProps({
  opportunity: {
    type: Object,
    default: () => ({}),
  },
  lead: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['reload'])
const show = defineModel()

// Form Data
const detailedReason = ref('')
const selectedLostReason = ref([])
const selectedCompetitors = ref([])

// Search & Loading States
const searchQuery = ref('')
const competitorSearchQuery = ref('')
const isLoading = ref(false)
const isCompetitorLoading = ref(false)
const tagsList = ref([])
const competitorList = ref([])

const getLostReasons = async () => {
  isLoading.value = true
  try {
    const response = await call('frappe.client.get_list', {
      doctype: 'Opportunity Lost Reason',
      filters: searchQuery.value
        ? [['name', 'like', `%${searchQuery.value}%`]]
        : [],
      fields: ['name'],
      limit_page_length: 5,
    })
    tagsList.value = response?.map((reason) => reason.name) || []
  } catch (e) {
    errorMessage(__('Error fetching lost reasons'))
    console.error('Error fetching lost reasons', e)
  } finally {
    isLoading.value = false
  }
}

const getCompetitors = async () => {
  isCompetitorLoading.value = true
  try {
    const response = await call('frappe.client.get_list', {
      doctype: 'Competitor',
      filters: competitorSearchQuery.value
        ? [['competitor_name', 'like', `%${competitorSearchQuery.value}%`]]
        : [],
      fields: ['competitor_name'],
      limit_page_length: 5,
    })
    competitorList.value = response?.map((res) => res.competitor_name) || []
  } catch (e) {
    errorMessage(__('Error fetching competitors'))
    console.error('Error fetching competitors', e)
  } finally {
    isCompetitorLoading.value = false
  }
}

watch(show, async (val) => {
  if (val) {
    // Reset form when opening
    selectedLostReason.value = []
    selectedCompetitors.value = []
    detailedReason.value = ''
    searchQuery.value = ''
    competitorSearchQuery.value = ''

    // Fetch data in parallel
    await Promise.all([getLostReasons(), getCompetitors()])
  }
})

const updateLostInfo = async () => {
  const isLead = !!props.lead
  const doc = props.opportunity?.data || props.lead?.data

  if (!doc?.name) {
    console.error('No document name found for update')
    errorMessage(__('Document not found'))
    return
  }

  try {
    if (isLead) {
      await call('frappe.client.set_value', {
        doctype: 'Lead',
        name: doc.name,
        fieldname: {
          status: 'Junk',
          custom_lost_reason: selectedLostReason.value.map((val) => ({
            lost_reason: val,
            doctype: 'Opportunity Lost Reason Detail',
            parentfield: 'custom_lost_reason',
            parenttype: 'Lead',
          })),
          // Note: Keeping 'custom_compititer' as requested (assuming backend field name)
          custom_compititer: selectedCompetitors.value.map((val) => ({
            competitor: val,
            doctype: 'Competitor Detail',
            parentfield: 'custom_compititer',
            parenttype: 'Lead',
          })),
          custom_detailed_reason: detailedReason.value || '',
        },
      })
    } else {
      await call('next_crm.api.opportunity.declare_enquiry_lost_api', {
        name: doc.name,
        lost_reasons_list: selectedLostReason.value.map((item) => ({
          lost_reason: item,
        })),
        competitors: selectedCompetitors.value.map((item) => ({
          competitor: item,
        })),
        detailed_reason: detailedReason.value,
      })
    }

    // Reload parent data
    if (props.lead && typeof props.lead.reload === 'function')
      props.lead.reload()
    if (props.opportunity && typeof props.opportunity.reload === 'function')
      props.opportunity.reload()

    emit('reload')

    createToast({
      title: __(isLead ? 'Lead updated' : 'Opportunity updated'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  } catch (error) {
    errorMessage(__('Error updating ' + (isLead ? 'Lead' : 'Opportunity')))
    console.error('Update Error:', error)
  }
}
</script>