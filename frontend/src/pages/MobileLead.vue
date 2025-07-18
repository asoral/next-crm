<template>
  <LayoutHeader v-if="lead.data">
    <header
      class="relative flex h-10.5 items-center justify-between gap-2 py-2.5 pl-2"
    >
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
      <div class="absolute right-0">
        <Dropdown :options="statusOptions('lead', updateField, customStatuses)">
          <template #default="{ open }">
            <Button
              :label="lead.data.status"
              :class="getLeadStatus(lead.data.status).colorClass"
            >
              <template #prefix>
                <IndicatorIcon />
              </template>
              <template #suffix>
                <FeatherIcon
                  :name="open ? 'chevron-up' : 'chevron-down'"
                  class="h-4"
                />
              </template>
            </Button>
          </template>
        </Dropdown>
      </div>
    </header>
  </LayoutHeader>
  <div
    v-if="lead.data"
    class="flex h-12 items-center justify-between gap-2 border-b px-3 py-2.5"
  >
    <AssignTo
      v-model="lead.data._assignedTo"
      :data="lead.data"
      doctype="Lead"
    />
    <div class="flex items-center gap-2">
      <CustomActions v-if="customActions" :actions="customActions" />
      <Button
        :label="__('Convert')"
        variant="solid"
        @click="showConvertToOpportunityModal = true"
      />
    </div>
  </div>
  <div v-if="lead?.data" class="flex h-full overflow-hidden">
    <Tabs as="div" v-model="tabIndex" :tabs="tabs" class="overflow-auto">
      <TabList class="!px-3" />
      <TabPanel v-slot="{ tab }">
        <div v-if="tab.name == 'Details'">
          <SLASection
            v-if="lead.data.sla_status"
            v-model="lead.data"
            @updateField="updateField"
          />
          <div
            v-if="fieldsLayout.data"
            class="flex flex-1 flex-col justify-between overflow-hidden"
          >
            <div class="flex flex-col overflow-y-auto">
              <div
                v-for="(section, i) in fieldsLayout.data"
                :key="section.label"
                class="flex flex-col px-2 py-3 sm:p-3"
                :class="{ 'border-b': i !== fieldsLayout.data.length - 1 }"
              >
                <Section :is-opened="section.opened" :label="section.label">
                  <SectionFields
                    :fields="section.fields"
                    :isLastSection="i == fieldsLayout.data.length - 1"
                    v-model="lead.data"
                    @update="updateField"
                  />
                </Section>
              </div>
            </div>
          </div>
        </div>
        <QuotationList
          v-if="tabs[tabIndex].name === 'Quotation'"
          :lead-id="lead.data.name"
          :count="tabs.find(tab => tab.name === 'Quotation')?.count"
        />
        <Activities
          v-else
          doctype="Lead"
          :tabs="tabs"
          v-model:reload="reload"
          v-model:tabIndex="tabIndex"
          v-model="lead"
        />
      </TabPanel>
    </Tabs>
  </div>


  <Dialog
    v-model="showConvertToOpportunityModal"
    :options="{
      title: __('Convert to Opportunity'),
      size: 'xl',
      actions: [
        {
          label: __('Convert'),
          variant: 'solid',
          onClick: convertToOpportunity,
        },
      ],
    }"
  >
    <template #body-content>
      <div class="mb-4 flex items-center gap-2 text-ink-gray-5">
        <ProspectsIcon class="h-4 w-4" />
        <label class="block text-base">{{ __('Prospect') }}</label>
      </div>
      <div class="ml-6">
        <div class="flex items-center justify-between text-base">
          <div>{{ __('Choose Existing') }}</div>
          <Switch v-model="existingProspectChecked" />
        </div>
        <Link
          v-if="existingProspectChecked"
          class="form-control mt-2.5"
          variant="subtle"
          size="md"
          :value="existingProspect"
          doctype="Prospect"
          @change="(data) => (existingProspect = data)"
        />
        <div v-else class="mt-2.5 text-base">
          {{
            __(
              'New prospect will be created based on the data in details section',
            )
          }}
        </div>
      </div>

      <div class="mb-4 mt-6 flex items-center gap-2 text-ink-gray-5">
        <ContactsIcon class="h-4 w-4" />
        <label class="block text-base">{{ __('Contact') }}</label>
      </div>
      <div class="ml-6">
        <div class="flex items-center justify-between text-base">
          <div>{{ __('Choose Existing') }}</div>
          <Switch v-model="existingContactChecked" />
        </div>
        <Link
          v-if="existingContactChecked"
          class="form-control mt-2.5"
          variant="subtle"
          size="md"
          :value="existingContact"
          doctype="Contact"
          @change="(data) => (existingContact = data)"
        />
        <div v-else class="mt-2.5 text-base">
          {{ __("New contact will be created based on the person's details") }}
        </div>
      </div>
    </template>
  </Dialog>

  <LostReasonModal v-if="lead?.data?.name" v-model="showLostReasonModal" :lead="lead"
  @reload="() => reload = true" />
</template>
<script setup>
import Icon from '@/components/Icon.vue'
import DetailsIcon from '@/components/Icons/DetailsIcon.vue'
import ActivityIcon from '@/components/Icons/ActivityIcon.vue'
import EmailIcon from '@/components/Icons/EmailIcon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import ProspectsIcon from '@/components/Icons/ProspectsIcon.vue'
import ContactsIcon from '@/components/Icons/ContactsIcon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import Activities from '@/components/Activities/Activities.vue'
import AssignTo from '@/components/AssignTo.vue'
import Link from '@/components/Controls/Link.vue'
import Section from '@/components/Section.vue'
import SectionFields from '@/components/SectionFields.vue'
import SLASection from '@/components/SLASection.vue'
import CustomActions from '@/components/CustomActions.vue'
import { createToast, setupAssignees, setupCustomizations } from '@/utils'
import { getView } from '@/utils/view'
import { globalStore } from '@/stores/global'
import { statusesStore } from '@/stores/statuses'
import ExportIcon from '@/components/Icons/ExportIcon.vue'
import QuotationList from '../components/ListViews/QuotationList.vue'
import { capture } from '@/telemetry'
import LostReasonModal from '@/components/Modals/LostReasonModal.vue'

import {
  whatsappEnabled,
  callEnabled,
  isMobileView,
} from '@/composables/settings'
import { useActiveTabManager } from '@/composables/useActiveTabManager'
import {
  createResource,
  Dropdown,
  Tabs,
  TabList,
  TabPanel,
  Switch,
  Breadcrumbs,
  call,
} from 'frappe-ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const { $dialog, $socket } = globalStore()
const { statusOptions, getLeadStatus } = statusesStore()
const route = useRoute()
const router = useRouter()

const props = defineProps({
  leadId: {
    type: String,
    required: true,
  },
})

const customActions = ref([])
const customStatuses = ref([])
const showLostReasonModal = ref(false)

const lead = createResource({
  url: '/api/method/next_crm.api.lead.get_lead',
  params: { name: props.leadId },
  cache: ['lead', props.leadId],
  onSuccess: async (data) => {
    let obj = {
      doc: data,
      $dialog,
      $socket,
      router,
      updateField,
      createToast,
      deleteDoc: deleteLead,
      resource: {
        lead,
        fieldsLayout,
      },
      call,
    }
    setupAssignees(data)
    let customization = await setupCustomizations(data, obj)
    customActions.value = customization.actions || []
    customStatuses.value = customization.statuses || []
  },
})

onMounted(() => {
  if (lead.data) return
  lead.fetch()
})

const reload = ref(false)

function updateLead(fieldname, value, callback) {
  value = Array.isArray(fieldname) ? '' : value

  if (!Array.isArray(fieldname) && validateRequired(fieldname, value)) return

  createResource({
    url: 'frappe.client.set_value',
    params: {
      doctype: 'Lead',
      name: props.leadId,
      fieldname,
      value,
    },
    auto: true,
    onSuccess: () => {
      lead.reload()
      reload.value = true
      createToast({
        title: __('Lead updated'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })
      callback?.()
    },
    onError: (err) => {
      createToast({
        title: __('Error updating lead'),
        text: __(err.messages?.[0]),
        icon: 'x',
        iconClasses: 'text-ink-red-4',
      })
    },
  })
}

function validateRequired(fieldname, value) {
  let meta = lead.data.fields_meta || {}
  if (meta[fieldname]?.reqd && !value) {
    createToast({
      title: __('Error Updating Lead'),
      text: __('{0} is a required field', [meta[fieldname].label]),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return true
  }
  return false
}

const breadcrumbs = computed(() => {
  let items = [{ label: __('Leads'), route: { name: 'Leads' } }]

  if (route.query.view || route.query.viewType) {
    let view = getView(route.query.view, route.query.viewType, 'Lead')
    if (view) {
      items.push({
        label: __(view.label),
        icon: view.icon,
        route: {
          name: 'Leads',
          params: { viewType: route.query.viewType },
          query: { view: route.query.view },
        },
      })
    }
  }

  items.push({
    label: lead.data.lead_name || __('Untitled'),
    route: { name: 'Lead', params: { leadId: lead.data.name } },
  })
  return items
})

const quotationCount = ref(0)

const tabs = computed(() => {
  let tabOptions = [
    {
      name: 'Details',
      label: __('Details'),
      icon: DetailsIcon,
      condition: () => isMobileView.value,
    },
    {
      name: 'Activity',
      label: __('Activity'),
      icon: ActivityIcon,
    },
    {
      name: 'Emails',
      label: __('Emails'),
      icon: EmailIcon,
    },
    {
      name: 'Comments',
      label: __('Comments'),
      icon: CommentIcon,
    },
    {
      name: 'Calls',
      label: __('Calls'),
      icon: PhoneIcon,
      condition: () => callEnabled.value,
    },
    {
      name: 'ToDos',
      label: __('ToDos'),
      icon: ToDoIcon,
    },
    {
      name: 'Notes',
      label: __('Notes'),
      icon: NoteIcon,
    },
    {
      name: 'Attachments',
      label: __('Attachments'),
      icon: AttachmentIcon,
    },
    {
      name: 'WhatsApp',
      label: __('WhatsApp'),
      icon: WhatsAppIcon,
      condition: () => whatsappEnabled.value,
    },
    {
      name: 'Quotation',
      label: __('Quotation'),
      icon: NoteIcon,
      count: quotationCount
    },
  ]
  return tabOptions.filter((tab) => (tab.condition ? tab.condition() : true))
})
const { tabIndex } = useActiveTabManager(tabs, 'lastLeadTab')

watch(tabs, (value) => {
  if (value && route.params.tabName) {
    let index = value.findIndex(
      (tab) => tab.name.toLowerCase() === route.params.tabName.toLowerCase(),
    )
    if (index !== -1) {
      tabIndex.value = index
    }
  }
})

const fieldsLayout = createResource({
  url: 'next_crm.api.doc.get_sidebar_fields',
  cache: ['fieldsLayout', props.leadId],
  params: { doctype: 'Lead', name: props.leadId },
  auto: true,
})

async function updateField(name, value, callback) {
  const isStatusField = name === "status";

if (isStatusField && lead.data[name] === value) {
  return;
}

if (isStatusField && value === "Junk") {
  try {
    const res = await call('frappe.client.get_list', {
      doctype: 'Opportunity',
      filters: {
        party_name: lead.data.name,
        opportunity_from: 'Lead'
      },
      limit: 1,
    });
// console.log('res', res)
const hasOpportunity = res.length > 0;
      // console.log('Opportunity check:', res, 'Has Opportunity:', hasOpportunity);

      if (!hasOpportunity) {
        showLostReasonModal.value = true;
        return;
      }
    } catch (err) {
      console.error('Error checking opportunity:', err);
    }
  }

  updateLead(name, value, () => {
    lead.data[name] = value
    callback?.()
  })
}

async function deleteLead(name) {
  await call('frappe.client.delete', {
    doctype: 'Lead',
    name,
  })
  router.push({ name: 'Leads' })
}

// Convert to Opportunity
const showConvertToOpportunityModal = ref(false)
const existingContactChecked = ref(false)
const existingProspectChecked = ref(false)

const existingContact = ref('')
const existingProspect = ref('')

async function convertToOpportunity() {

if (existingContactChecked.value && !existingContact.value) {
  createToast({
    title: __('Error'),
    text: __('Please select an existing contact'),
    icon: 'x',
    iconClasses: 'text-ink-red-4',
  })
  return
}

if (existingProspectChecked.value && !existingProspect.value) {
  createToast({
    title: __('Error'),
    text: __('Please select an existing prospect'),
    icon: 'x',
    iconClasses: 'text-ink-red-4',
  })
  return
}

if (existingContactChecked.value && existingContact.value) {
  existingContact.value = ''
}

if (existingProspectChecked.value && existingProspect.value) {
  existingProspectChecked.value = false

}

let opportunity = await call(
  'next_crm.overrides.lead.convert_to_opportunity',
  {
    lead: lead.data.name,
    prospect: existingProspect.value
  },
).catch((err) => {
  createToast({
    title: __('Error converting to Opportunity'),
    text: __(err.messages?.[0]),
    icon: 'x',
    iconClasses: 'text-ink-red-4',
  })
})

if (opportunity) {
  capture('convert_lead_to_opportunity')

    // await contacts.reload()
  
  router.push({ name: 'Opportunity', params: { opportunityId: opportunity } })
}

}
</script>
