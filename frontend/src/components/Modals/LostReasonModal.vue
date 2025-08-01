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
    @close="
      () => {
        show = false
      }
    "
  >
    <template #body-content>
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-1">
          <div class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm text-ink-gray-5 leading-5">
            Lost Reasons
            <span class="text-red-500">*</span>
          </div>
          <TagInput
            :data="tagsList"
            :loading="isLoading"
            :onChange="
              (value) => {
                selectedLostReason = value
              }
            "
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
          <div class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm text-ink-gray-5 leading-5">
            Competitors
          </div>
          <TagInput
            :data="competitorList"
            :loading="isCompetitorLoading"
            :onChange="
              (value) => {
                selectedCompetitors = value
              }
            "
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
          <div class="flex h-7 max-w-fit cursor-pointer items-center gap-2 text-sm text-ink-gray-5 leading-5">
            Detailed Reason
          </div>
          <FormControl type="textarea" v-model="detailedReason" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { call } from 'frappe-ui'
import TagInput from '@/components/TagInput.vue'
import { createToast } from '@/utils'
import { errorMessage } from '../../utils'

const props = defineProps({
  opportunity: {
    default: {},
    type: Object,
    required: true,
  },
  lead: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['reload'])

const show = defineModel()
const detailedReason = ref('')
const searchQuery = ref('')
const competitorSearchQuery = ref('')
const isLoading = ref(false)
const isCompetitorLoading = ref(false)
const tagsList = ref([])
const competitorList = ref([])
const selectedLostReason = ref([])
const selectedCompetitors = ref([])

const getLostReasons = async () => {
  isLoading.value = true
  try {
    const response = await call('frappe.client.get_list', {
      doctype: 'Opportunity Lost Reason',
      filters: searchQuery.value ? [['name', 'like', `%${searchQuery.value}%`]] : [],
      fields: ['name'],
      limit_page_length: 5,
    })
    tagsList.value = response?.map((reason) => reason.name)
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
      filters: competitorSearchQuery.value ? [['competitor_name', 'like', `%${competitorSearchQuery.value}%`]] : [],
      fields: ['competitor_name'],
      limit_page_length: 5,
    })
    competitorList.value = response?.map((reason) => reason.competitor_name)
  } catch (e) {
    errorMessage(__('Error fetching competitors'))
    console.error('Error fetching competitors', e)
  } finally {
    isCompetitorLoading.value = false
  }
}

const updateOpportunity = async () => {
  try {
    await call('next_crm.api.opportunity.declare_enquiry_lost_api', {
      name: props.opportunity.data.name,
      lost_reasons_list: selectedLostReason.value.map((item) => ({
        lost_reason: item,
      })),
      competitors: selectedCompetitors.value.map((item) => ({
        competitor: item,
      })),
      detailed_reason: detailedReason.value,
    })
    props.opportunity.reload()
    emit('reload')
    createToast({
      title: __('Opportunity updated'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  } catch (error) {
    errorMessage(__('Error updating opportunity'))
    console.error('Error updating opportunity:', error)
    throw error
  }
}

watch(show, async (val) => {
  if (val) {
    await getLostReasons()
    await getCompetitors()
  }
})


const updateLostInfo = async () => {
  const isLead = !!props.lead
  const doc = props.opportunity?.data ?? props.lead?.data

  // console.log('doc', doc.name)
  if (!doc?.name) {
    console.error('No document name found for update')
    return
  }

  try {
    if (isLead) {
  await call('frappe.client.set_value', {
    doctype: 'Lead',
    name: doc.name,
    fieldname: {
      status: 'Junk',
      custom_lost_reason: selectedLostReason.value.map(val => ({
        lost_reason: val,
        doctype: 'Opportunity Lost Reason Detail',
        parentfield: 'custom_lost_reason',
        parenttype: 'Lead',
      })),
      custom_compititer: selectedCompetitors.value.map(val => ({
        competitor: val,
        doctype: 'Competitor Detail', // replace with actual doctype
        parentfield: 'custom_compititer',
        parenttype: 'Lead',
      })),
      custom_detailed_reason: detailedReason.value || '',
    },
  })
}

 else {
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

    props.lead?.reload?.()
    props.opportunity?.reload?.()
    emit('reload')

    createToast({
      title: __(isLead ? 'Lead updated' : 'Opportunity updated'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  } catch (error) {
    errorMessage(__('Error updating ' + (isLead ? 'Lead' : 'Opportunity')))
    console.error('Update Error:', error)
    throw error
  }
}



</script>
