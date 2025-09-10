<template>
 
    <div class="mx-4 my-3 flex items-center justify-between text-lg font-medium sm:mx-10 sm:mb-4 sm:mt-8">
      <div class="flex h-8 items-center text-xl font-semibold text-ink-gray-8">
        {{ __('Quotations') }}
      </div>
      <Button variant="solid" @click="goToNewQuotation">
        <template #prefix>
          <FeatherIcon name="plus" class="h-4 w-4" />
        </template>
        <span>{{ __('Create Quotation') }}</span>
      </Button>
    </div>
  
<div v-if="!loading && quotations.length === 0" class="flex flex-1 min-h-[40vh] items-center justify-center">
<div class="flex flex-col items-center justify-center gap-3 text-xl font-medium text-ink-gray-4">
  <FeatherIcon name="file-text" class="h-10 w-10" />
  <span>{{ __('No Quotations') }}</span>
  <Button :label="__('Create Quotation')" @click="goToNewQuotation" />
</div>


  </div>
  <div v-else class="w-[90%] mx-auto space-y-3 mt-2">
  
    
    <div  class="space-y-4">
      <div
        v-for="quotation in quotations"
        :key="quotation.name"
        class="activity group"
      >
        <!-- Header -->
        <div class="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
          <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
            <UserAvatar class="mr-1" :user="quotation.owner" size="md" />
            <span class="font-medium text-ink-gray-8" :title="getUser(quotation.owner).full_name">
              {{ getUser(quotation.owner).full_name }}
            </span>
          </div>
          <div class="flex items-center gap-2 ml-auto whitespace-nowrap">
            <Tooltip :text="dateFormat(quotation.creation, dateTooltipFormat)">
              <div class="truncate text-sm text-ink-gray-7">
                {{ timeAgo(quotation.creation) }}
              </div>
            </Tooltip>

            <Dropdown
              :options="[
                {
                  label: __('Cancel Quotation'),
                  icon: 'x',
                  onClick: () => cancelQuotation(quotation.name),
                },
              ]"
              @click.stop
              class="h-6 w-6"
            >
              <Button icon="more-horizontal" variant="ghosted" class="!h-6 !w-6 hover:bg-surface-gray-2" />
            </Dropdown>
          </div>
        </div>

<div
class="activity group flex max-h-auto cursor-pointer flex-col justify-between gap-2 rounded-md bg-surface-gray-1 px-4 py-3 hover:bg-surface-gray-2"
>
<div class="flex items-center justify-between" @click="goToQuotation(quotation.name)">
  <div class="truncate text-lg font-medium text-ink-gray-8">
    {{ quotation.name }}
  </div>
  <div
    class="text-xs rounded px-2 py-0.5"
    :class="statusColorClass(quotation.status)"
  >
    {{ quotation.status }}
  </div>
</div>

<div class="text-sm text-ink-gray-6">
  {{ __('Amount') }}:
  {{ quotation.symbol || quotation.currency }}  {{ quotation.grand_total.toLocaleString() }}
</div>

<!-- Toggle Button -->
<div class="flex justify-end">
  <button
    class="flex items-center text-blue-600 text-sm mt-2"
    @click.stop="toggleDetails(quotation.name)"
  >
    <FeatherIcon
      :name="expandedQuotations.includes(quotation.name) ? 'chevron-up' : 'chevron-down'"
      class="h-4 w-4 mr-1"
    />
    {{ expandedQuotations.includes(quotation.name) ? __('Hide Details') : __('View Details') }}
  </button>
</div>

<div
  v-if="expandedQuotations.includes(quotation.name)"
  class="mt-3 p-3 border rounded bg-white shadow-sm"
>
  <table class="w-full text-sm border border-gray-200 rounded-lg shadow-sm">
    <thead class="bg-gray-100">
      <tr>
        <th class="text-left py-1 px-2 font-medium text-gray-700">{{ __('Item Code') }}</th>
        <th class="text-left py-1 px-2 font-medium text-gray-700">{{ __('Item Name') }}</th>
        <th class="text-right py-1 px-2 font-medium text-gray-700">{{ __('Qty') }}</th>
        <th class="text-right py-1 px-2 font-medium text-gray-700">{{ __('Rate') }}</th>
        <th class="text-right py-1 px-2 font-medium text-gray-700">{{ __('Amount') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(item, index) in quotation.items"
        :key="item.item_code + index"
        :class="index % 2 === 0 ? 'bg-white' : 'bg-white'"
        class="hover:bg-blue-50 transition"
      >
        <td class="py-1 px-2 text-gray-800">{{ item.item_code }}</td>
        <td class="py-1 px-2 text-gray-800">{{ item.item_name }}</td>
        <td class="py-1 px-2 text-right text-gray-700">{{ item.qty }}</td>
          <td class="py-1 px-2 text-right text-gray-700">{{ quotation.symbol || quotation.currency }}  {{ item.rate.toLocaleString() }}</td>
                <td class="py-1 px-2 text-right text-gray-700">{{ quotation.symbol || quotation.currency }}  {{ item.amount.toLocaleString() }}</td>
      </tr>
    </tbody>
  </table>

  <div class="mt-3 text-sm text-ink-gray-7">
    <strong>{{ __('Terms & Conditions:') }}</strong>
    <p>{{ quotation.tc_name || __('No terms specified') }}</p>
    <p>{{ stripHtml(quotation.terms) }}</p>

  </div>
</div>
</div>

      </div>
    </div>
  </div>

</template>




<script setup>
import { ref, onMounted, watch } from 'vue'
import { call, Tooltip, Dropdown, Button } from 'frappe-ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { usersStore } from '@/stores/users'
import UserAvatar from '@/components/UserAvatar.vue'
import { dateFormat, dateTooltipFormat, timeAgo, createToast } from '@/utils'

dayjs.extend(relativeTime)

const props = defineProps({
  opportunityId: String,
  leadId: String,
  count: Object,
})



const quotations = ref([])
const loading = ref(true)
const { getUser } = usersStore()
const currencySymbols = ref({})

function statusColorClass(status) {
  switch (status) {
    case 'Draft':
      return 'bg-red-500 text-white'
      case 'Open':
      return 'bg-red-500 text-white'
    case 'Submitted':
      return 'bg-green-500 text-white'
    case 'Cancelled':
      return 'bg-red-500 text-white'
    default:
      return 'bg-ink-gray-4 text-white'
  }
}

function goToQuotation(name) {
  window.location.href = `/app/quotation/${name}`
}

async function cancelQuotation(name) {
  try {
    await call('frappe.client.cancel', {
      doctype: 'Quotation',
      name,
    })
    createToast({
      title: __('Quotation cancelled'),
      icon: 'check',
      iconClasses: 'text-green-500',
    })
    await fetchQuotations()
  } catch (error) {
    createToast({
      title: __('Failed to cancel quotation'),
      text: error.message,
      icon: 'x',
      iconClasses: 'text-red-500',
    })
  }
}
async function fetchQuotations() {
  const res = await call('/api/method/next_crm.api.api.get_quotations_with_items', {
    opportunity: props.opportunityId || '',
    lead: props.leadId || '',
  })

  // console.log('Quotations with Items:', res)

  quotations.value = res || []
  props.count.value = quotations.value.length
  loading.value = false
  for (const q of quotations.value) {
    q.symbol = await getCurrencySymbol(q.currency)
  }
}


onMounted(fetchQuotations)
watch(
  () => [props.opportunityId, props.leadId],
  fetchQuotations
)


async function getCurrencySymbol(currency) {
  if (currencySymbols.value[currency]) return currencySymbols.value[currency]

  try {
    const res = await call('frappe.client.get', {
      doctype: 'Currency',
      name: currency
    })
    currencySymbols.value[currency] = res.symbol || currency
    return currencySymbols.value[currency]
  } catch (err) {
    console.error('Currency fetch error:', err)
    return currency 
  }
}


function goToNewQuotation() {
  const isOpportunity = Boolean(props.opportunityId)
  const isLead = Boolean(props.leadId)
  
  if (isOpportunity) {
    const url = `/app/quotation/new-quotation?quotation_to=Opportunity&opportunity=${encodeURIComponent(props.opportunityId)}&party_name=${encodeURIComponent(props.opportunityId)}`
    window.location.href = url
  } 
  else if (isLead) {
    const url = `/app/quotation/new-quotation?quotation_to=Lead&lead=${encodeURIComponent(props.leadId)}&party_name=${encodeURIComponent(props.leadId)}`
    window.location.href = url
  }
}



const expandedQuotations = ref([])

function toggleDetails(name) {
  if (expandedQuotations.value.includes(name)) {
    expandedQuotations.value = expandedQuotations.value.filter(n => n !== name)
  } else {
    expandedQuotations.value.push(name)
  }
}

function stripHtml(html) {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html || ''
  return tempDiv.textContent || tempDiv.innerText || ''
}


</script>
