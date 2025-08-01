<template>
  <LayoutHeader v-if="opportunity.data">
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
    </template>
    <template #right-header>
      <CustomActions v-if="customActions" :actions="customActions" />
      <AssignTo v-model="opportunity.data._assignedTo" :data="opportunity.data" doctype="Opportunity" />
      <Dropdown :options="statusOptions('opportunity', updateField, customStatuses)">
        <template #default="{ open }">
          <Button :label="opportunity.data.status" :class="getDealStatus(opportunity.data.status).colorClass">
            <template #prefix>
              <IndicatorIcon />
            </template>
            <template #suffix>
              <FeatherIcon :name="open ? 'chevron-up' : 'chevron-down'" class="h-4" />
            </template>
          </Button>
        </template>
      </Dropdown>
    </template>
  </LayoutHeader>
  <div v-if="opportunity.data" class="flex h-full overflow-hidden">
    <Tabs as="div" v-model="tabIndex" :tabs="tabs">
      <template #tab-item="{ tab, selected }">
        <button
          class="group flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:border-gray-400 hover:text-ink-gray-9"
          :class="{ 'text-ink-gray-9': selected }">
          <component v-if="tab.icon" :is="tab.icon" class="h-5" />
          {{ __(tab.label) }}
          <Badge v-if="tab.label != 'Activity'" variant="solid" theme="gray" size="sm">
            {{ tab.count || 0 }}
          </Badge>
        </button>
      </template>
      <template #tab-panel>
        <QuotationList
  v-if="tabs[tabIndex].name === 'Quotation' && opportunity?.data?.name"
  :opportunity-id="opportunity.data.name"
  :count="tabs.find(tab => tab.name === 'Quotation')?.count"
/>

        <Activities
          ref="activities"
          doctype="Opportunity"
          :tabs="tabs"
          v-model:reload="reload"
          v-model:tabIndex="tabIndex"
          v-model="opportunity"
        />
      </template>
      
      
      
    </Tabs>
    <Resizer side="right" class="flex flex-col justify-between border-l">
      <div class="flex h-10.5 cursor-copy items-center border-b px-5 py-2.5 text-lg font-medium text-ink-gray-9"
        @click="copyToClipboard(opportunity.data.name)">
        {{ __(opportunity.data.name) }}
      </div>
      <div class="flex items-center justify-start gap-5 border-b p-5">
        <Tooltip :text="__('Customer logo')">
          <div class="group relative size-12">
            <Avatar size="3xl" class="size-12"
              :label="customer.data?.name || opportunity.data?.party_name || __('Untitled')"
              :image="customer.data?.image" />
          </div>
        </Tooltip>
        <div class="flex flex-col gap-2.5 truncate text-ink-gray-9">
          <Tooltip
            :text="customer.data?.name || opportunity.data?.title || opportunity.data?.party_name || __('Set an customer')">
            <div class="truncate text-2xl font-medium" @click="showRenameModal = true">
              {{ customer.data?.name || opportunity.data?.title || opportunity.data?.party_name || __('Untitled') }}
            </div>
          </Tooltip>
          <div class="flex gap-1.5">
            <Tooltip v-if="callEnabled" :text="__('Make a call')">
              <Button class="h-7 w-7" @click="triggerCall">
                <PhoneIcon class="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip :text="__('Send an email')">
              <Button class="h-7 w-7">
                <Email2Icon class="h-4 w-4" @click="
                  opportunity.data.email
                    ? openEmailBox()
                    : errorMessage(__('No email set'))
                  " />
              </Button>
            </Tooltip>
            <Tooltip :text="__('Go to website')">
              <Button class="h-7 w-7">
                <LinkIcon class="h-4 w-4" @click="
                  opportunity.data.website
                    ? openWebsite(opportunity.data.website)
                    : errorMessage(__('No website set'))
                  " />
              </Button>
            </Tooltip>
            <Tooltip :text="__('Attach a file')">
              <Button class="size-7" @click="showFilesUploader = true">
                <AttachmentIcon class="size-4" />
              </Button>
            </Tooltip>
            <Tooltip :text="__('Delete Opportunity')">
              <Button theme="red" class="h-7 w-7" @click="deleteOpportunity">
                <FeatherIcon name="trash-2" class="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip :text="__('Check Details')">
              <Button  class="h-7 w-7" @click="redirectToLead">
                <FeatherIcon name="external-link" class="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      <SLASection v-if="opportunity.data.sla_status" v-model="opportunity.data" @updateField="updateField" />
      <div v-if="fieldsLayout.data" class="flex flex-1 flex-col justify-between overflow-hidden">
        <div class="flex flex-col overflow-y-auto">
          <div v-for="(section, i) in fieldsLayout.data" :key="section.label" class="section flex flex-col p-3"
            :class="{ 'border-b': i !== fieldsLayout.data.length - 1 }">
            <Section :is-opened="section.opened" :label="section.label">
              <template #actions>
                <div v-if="section.contacts" class="pr-2">
                  <Link value="" doctype="Contact" @change="(e) => addContact(e)" :onCreate="(value, close) => {
                    _contact = {
                      first_name: value,
                      company_name: opportunity.data.customer,
                    }
                    showContactModal = true
                    close()
                  }
                    ">
                  <template #target="{ togglePopover }">
                    <Button class="h-7 px-3" variant="ghost" icon="plus" @click="togglePopover()" />
                  </template>
                  </Link>
                </div>
                <div v-else-if="section.addresses" class="pr-2">
                  <Link value="" doctype="Address" @change="(e) => addAddress(e)" :onCreate="(value, close) => {
                    _address = {
                      name: value,
                    }
                    showAddressModal = true
                    close()
                  }
                    ">
                  <template #target="{ togglePopover }">
                    <Button class="h-7 px-3" variant="ghost" icon="plus" @click="togglePopover()" />
                  </template>
                  </Link>
                </div>
                <Button v-else-if="
                  ((!section.contacts && !section.addresses && i == 2) || i == 0) && isManager()
                " variant="ghost" class="w-7 mr-2" @click="showSidePanelModal = true">
                  <EditIcon class="h-4 w-4" />
                </Button>
              </template>
              <SectionFields v-if="section.fields" :fields="section.fields"
                :isLastSection="i == fieldsLayout.data.length - 1" v-model="opportunity.data" @update="updateField" />
              <div v-else>
                <div v-if="
                  section.contacts && opportunityContacts?.loading && opportunityContacts?.data?.length == 0
                " class="flex min-h-20 flex-1 items-center justify-center gap-3 text-base text-ink-gray-4">
                  <LoadingIndicator class="h-4 w-4" />
                  <span>{{ __('Loading...') }}</span>
                </div>
                <div v-if="
                  section.addresses && opportunityAddresses?.loading && opportunityAddresses?.data?.length == 0
                " class="flex min-h-20 flex-1 items-center justify-center gap-3 text-base text-ink-gray-4">
                  <LoadingIndicator class="h-4 w-4" />
                  <span>{{ __('Loading...') }}</span>
                </div>
                <div v-else-if="section.contacts && opportunityContacts?.data?.length"
                  v-for="(contact, i) in opportunityContacts.data" :key="contact.name">
                  <div class="px-2 pb-2.5" :class="[i == 0 ? 'pt-5' : 'pt-2.5']">
                    <Section :is-opened="contact.opened">
                      <template #header="{ opened, toggle }">
                        <div
                          class="flex cursor-pointer items-center justify-between gap-2 pr-1 text-base leading-5 text-ink-gray-7">
                          <div class="flex h-7 items-center gap-2 truncate" @click="toggle()">
                            <Avatar :label="contact.full_name" :image="contact.image" size="md" />
                            <div class="truncate">
                              {{ contact.full_name }}
                            </div>
                            <Badge v-if="contact.name == opportunity.data.contact_person" class="ml-2" variant="outline"
                              :label="__('Primary')" theme="green" />
                          </div>
                          <div class="flex items-center">
                            <Dropdown :options="contactOptions(contact)">
                              <Button icon="more-horizontal" class="text-ink-gray-5" variant="ghost" />
                            </Dropdown>
                            <Button variant="ghost" @click="
                              router.push({
                                name: 'Contact',
                                params: { contactId: contact.name },
                              })
                              ">
                              <ArrowUpRightIcon class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" @click="toggle()">
                              <FeatherIcon name="chevron-right"
                                class="h-4 w-4 text-ink-gray-9 transition-all duration-300 ease-in-out"
                                :class="{ 'rotate-90': opened }" />
                            </Button>
                          </div>
                        </div>
                      </template>
                      <div class="flex flex-col gap-1.5 text-base text-ink-gray-8">
                        <div class="flex items-center gap-3 pb-1.5 pl-1 pt-4">
                          <Email2Icon class="h-4 w-4" />
                          <a :href="`mailto:${contact.email}`" class="hover:underline text-blue-600">
                            {{ contact.email }}
                          </a>                         </div>
                        <div class="flex items-center gap-3 p-1 py-1.5">
                          <PhoneIcon class="h-4 w-4" />
                          <a :href="`tel:${contact.mobile_no}`" class="hover:underline text-blue-600">
                            {{ contact.mobile_no }}
                          </a>                        
                        </div>
                      </div>
                    </Section>
                  </div>
                  <div v-if="i != opportunityContacts.data.length - 1" class="mx-2 h-px border-t border-gray-200" />
                </div>
                <div v-else-if="section.addresses && opportunityAddresses?.data?.length"
                  v-for="(address, i) in opportunityAddresses.data" :key="address.name">
                  <div class="px-2 pb-2.5" :class="[i == 0 ? 'pt-5' : 'pt-2.5']">
                    <Section :is-opened="address.opened">
                      <template #header="{ opened, toggle }">
                        <div
                          class="flex cursor-pointer items-center justify-between gap-2 pr-1 text-base leading-5 text-ink-gray-7">
                          <div class="flex h-7 items-center gap-2 truncate" @click="toggle()">
                            <div class="truncate">
                              {{ address.name }}
                            </div>
                            <Badge v-if="address.is_primary_address" class="ml-2" variant="outline" :label="__('Bill')"
                              theme="green" />
                            <Badge v-if="address.is_shipping_address" class="ml-0" variant="outline" :label="__('Ship')"
                              theme="green" />
                          </div>
                          <div class="flex items-center">
                            <Dropdown :options="addressOptions(address)">
                              <Button icon="more-horizontal" class="text-ink-gray-5" variant="ghost" />
                            </Dropdown>
                            <Button variant="ghost" @click="
                              router.push({
                                name: 'Address',
                                params: { addressId: address.name },
                              })
                              ">
                              <ArrowUpRightIcon class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" @click="toggle()">
                              <FeatherIcon name="chevron-right"
                                class="h-4 w-4 text-ink-gray-9 transition-all duration-300 ease-in-out"
                                :class="{ 'rotate-90': opened }" />
                            </Button>
                          </div>
                        </div>
                      </template>
                      <div class="flex flex-col gap-1.5 text-base text-ink-gray-8">
                        <div class="flex items-center gap-3 pb-1.5 pl-1 pt-4">
                          <AddressIcon class="h-4 w-4" />
                          {{ address.address_line1 }}
                        </div>
                        <div class="flex items-center gap-3 p-1 py-1.5">
                          <PhoneIcon class="h-4 w-4" />
                          {{ address.phone }}
                        </div>
                      </div>
                    </Section>
                  </div>
                  <div v-if="i != opportunityAddresses.data.length - 1" class="mx-2 h-px border-t border-gray-200" />
                </div>
                <div v-else-if="section.addresses"
                  class="flex h-20 items-center justify-center text-base text-ink-gray-5">
                  {{ __('No addresses added') }}
                </div>
                <div v-else class="flex h-20 items-center justify-center text-base text-ink-gray-5">
                  {{ __('No contacts added') }}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </Resizer>
  </div>
  <CustomerModal v-model="showCustomerModal" v-model:customer="_customer" :options="{
    redirect: false,
    afterInsert: (doc) => updateField('customer', doc.name),
  }" />
  <ContactModal v-model="showContactModal" :contact="_contact" :options="{
    redirect: false,
    afterInsert: (doc) => addContact(doc.name),
  }" />
  <AddressModal v-model="showAddressModal" :address="_address" :options="{
    afterInsert: (doc) => addAddress(doc.name),
  }" />
  <SidePanelModal v-if="showSidePanelModal" v-model="showSidePanelModal" doctype="Opportunity"
    @reload="() => fieldsLayout.reload()" />
  <FilesUploader v-if="opportunity.data?.name" v-model="showFilesUploader" doctype="Opportunity"
    :docname="opportunity.data.name" @after="
      () => {
        activities?.all_activities?.reload()
        changeTabTo('attachments')
      }
    " />
  <RenameModal v-model="showRenameModal" doctype="Opportunity" :docname="opportunity?.data?.name"
    :title="opportunity?.data?.title" :options="{
      afterRename: afterRename
    }" />
  <LostReasonModal v-if="opportunity?.data?.name" v-model="showLostReasonModal" :opportunity="opportunity"
    @reload="() => reload = true" />
  <OpportunityFromSetModal v-model="showOpportunityFromModal" :opportunityFrom="opportunityFrom"
    :title="opportunity?.data?.party_name" :docname="opportunity?.data?.name" @after="() => {
      opportunity.reload()
      reload = true
    }" />
  <MissingValueModal v-model="showMissingValueModal" label="Update Missing Fields" :missingFieldValues="missingFields"
    :filteredFields="filteredFields" @update="(data) => {
      updateOpportunityFields({ ...data }, () => {
        callback?.()
      })
    }" />
  <Dialog :options="{
    title: 'Confirm',
    message: 'Do you want to create a project from this opportunity?',
    size: 'xl',
    icon: {
      name: 'alert-triangle',
      appearance: 'warning',
    },
    actions: [
      {
        label: 'Create Project',
        variant: 'solid',
        onClick: () => {
          return createProjectFromOpportunity()
        },
      },
    ],
  }" v-model="showCreateProjectModal" />
  <DeleteModal v-model="showDeleteModal" doctype="Opportunity" :docname="props.opportunityId" :redirectTo="'Opportunities'"/>
</template>
<script setup>
import Icon from '@/components/Icon.vue'
import Resizer from '@/components/Resizer.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import ActivityIcon from '@/components/Icons/ActivityIcon.vue'
import EmailIcon from '@/components/Icons/EmailIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import AddressIcon from '@/components/Icons/AddressIcon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import EventIcon from '@/components/Icons/EventIcon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import LinkIcon from '@/components/Icons/LinkIcon.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import SuccessIcon from '@/components/Icons/SuccessIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import Activities from '@/components/Activities/Activities.vue'
import CustomerModal from '@/components/Modals/CustomerModal.vue'
import AssignTo from '@/components/AssignTo.vue'
import FilesUploader from '@/components/FilesUploader/FilesUploader.vue'
import AddressModal from '@/components/Modals/AddressModal.vue'
import ContactModal from '@/components/Modals/ContactModal.vue'
import SidePanelModal from '@/components/Settings/SidePanelModal.vue'
import RenameModal from '@/components/Modals/RenameModal.vue'
import LostReasonModal from '@/components/Modals/LostReasonModal.vue'
import OpportunityFromSetModal from '../components/Modals/OpportunityFromSetModal.vue'
import MissingValueModal from '@/components/Modals/MissingValueModal.vue'
import DeleteModal from '@/components/Modals/DeleteModal.vue'
import Link from '@/components/Controls/Link.vue'
import Section from '@/components/Section.vue'
import SectionFields from '@/components/SectionFields.vue'
import SLASection from '@/components/SLASection.vue'
import CustomActions from '@/components/CustomActions.vue'
import {
  openWebsite,
  createToast,
  setupAssignees,
  setupCustomizations,
  errorMessage,
  copyToClipboard,
} from '@/utils'
import { getView } from '@/utils/view'
import { globalStore } from '@/stores/global'
import { statusesStore } from '@/stores/statuses'
import { usersStore } from '@/stores/users'
import { whatsappEnabled, callEnabled } from '@/composables/settings'
import {
  createResource,
  Dropdown,
  Tooltip,
  Avatar,
  Tabs,
  Breadcrumbs,
  call,
  usePageMeta,
} from 'frappe-ui'
import { ref, computed, h, onMounted, onBeforeUnmount, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActiveTabManager } from '@/composables/useActiveTabManager'
import { getMeta } from '@/stores/meta'
import { replaceMeWithUser } from '../utils'
import ExportIcon from '@/components/Icons/ExportIcon.vue'
import QuotationList from '../components/ListViews/QuotationList.vue'
const { $dialog, $socket, makeCall } = globalStore()
const { statusOptions, getDealStatus } = statusesStore()
const { isManager, getUser } = usersStore()
const route = useRoute()
const router = useRouter()
const { getFields } = getMeta("Project");
const props = defineProps({
  opportunityId: {
    type: String,
    required: true,
  },
})

const customActions = ref([])
const customStatuses = ref([])
const _address = ref([])
const opportunity = createResource({
  url: '/api/method/next_crm.api.opportunity.get_opportunity',
  params: { name: props.opportunityId },
  cache: ['opportunity', props.opportunityId],
  onSuccess: async (data) => {
    if (data.customer) {
      customer.update({
        params: { doctype: 'Customer', name: data.customer },
      })
      customer.fetch()
    }

    let obj = {
      doc: data,
      $dialog,
      $socket,
      router,
      updateField,
      createToast,
      deleteDoc: deleteOpportunity,
      resource: {
        opportunity,
        opportunityContacts,
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

const customer = createResource({
  url: 'frappe.client.get',
  onSuccess: (data) => (opportunity.data._customersObj = data),
})

onMounted(() => {
  $socket.on('crm_customer_created', () => {
    createToast({
      title: __('Customer created successfully'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  })

  if (opportunity.data) {
    customer.data = opportunity.data._customersObj
    return
  }
  opportunity.fetch()
})

onBeforeUnmount(() => {
  $socket.off('crm_customer_created')
})

const reload = ref(false)
const showCustomerModal = ref(false)
const showSidePanelModal = ref(false)
const showFilesUploader = ref(false)
const showRenameModal = ref(false)
const showOpportunityFromModal = ref(false)
const opportunityFrom = reactive({
  opportunityFrom: opportunity?.data?.opportunity_from,
  partyName: opportunity?.data?.party_name,
})
const _customer = ref({})
const showLostReasonModal = ref(false)
const showMissingValueModal = ref(false)
const showCreateProjectModal = ref(false)
const showDeleteModal = ref(false)

function updateOpportunity(fieldname, value, callback) {
  value = Array.isArray(fieldname) ? '' : value

  if (validateRequired(fieldname, value)) return

  if (fieldname == 'opportunity_from' || fieldname == 'party_name') {
    fieldname == 'opportunity_from' ? opportunityFrom.opportunityFrom = value : opportunityFrom.partyName = value
    showOpportunityFromModal.value = true
    return
  }

  createResource({
    url: 'frappe.client.set_value',
    params: {
      doctype: 'Opportunity',
      name: props.opportunityId,
      fieldname,
      value,
    },
    auto: true,
    onSuccess: (data) => {
      opportunity.reload()
      reload.value = true
      createToast({
        title: __('Opportunity updated'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })
      callback?.()
    },
    onError: (err) => {
      createToast({
        title: __('Error updating opportunity'),
        text: __(err.messages?.[0]),
        icon: 'x',
        iconClasses: 'text-ink-red-4',
      })
    },
  })
}
const updateOpportunityFields = async (fields, callback) => {
  for (const [fieldname, value] of Object.entries(fields)) {
    if (validateRequired(fieldname, value)) return
  }
  // The replaceMeWithUser utility replaces the value of any key containing @me with the currently logged-in user.
  const meParsedFields = replaceMeWithUser(fields,getUser().name)
  createResource({
    url: 'frappe.client.set_value',
    params: {
      doctype: 'Opportunity',
      name: props.opportunityId,
      fieldname: meParsedFields,
    },
    auto: true,
    onSuccess: async (data) => {
      opportunity.reload()
      reload.value = true
      createToast({
        title: __('Opportunity updated'),
        icon: 'check',
        iconClasses: 'text-ink-green-3',
      })
      callback?.()
      await createProject(data)
    },
    onError: (err) => {
      createToast({
        title: __('Error updating opportunity'),
        text: __(err.messages?.[0]),
        icon: 'x',
        iconClasses: 'text-ink-red-4',
      })
    },
  })
}


function validateRequired(fieldname, value) {
  let meta = opportunity.data.fields_meta || {}
  if (meta[fieldname]?.reqd && !value) {
    createToast({
      title: __('Error Updating Opportunity'),
      text: __('{0} is a required field', [meta[fieldname].label]),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return true
  }
  return false
}

const breadcrumbs = computed(() => {
  let items = [{ label: __('Opportunities'), route: { name: 'Opportunities' } }]

  if (route.query.view || route.query.viewType) {
    let view = getView(route.query.view, route.query.viewType, 'Opportunity')
    if (view) {
      items.push({
        label: __(view.label),
        icon: view.icon,
        route: {
          name: 'Opportunities',
          params: { viewType: route.query.viewType },
          query: { view: route.query.view },
        },
      })
    }
  }

  items.push({
    label: opportunity.data?.title || customer.data?.name || opportunity.data?.party_name || __('Untitled'),
    route: { name: 'Opportunity', params: { opportunityId: opportunity.data.name } },
  })
  return items
})

usePageMeta(() => {
  return {
    title: opportunity.data?.title || customer.data?.name || opportunity.data?.party_name || opportunity.data?.name,
  }
})

const quotationCount = ref(0)


const tabs = computed(() => {
  let tabOptions = [
    {
      name: 'Activity',
      label: __('Activity'),
      icon: ActivityIcon,
    },
    {
      name: 'Emails',
      label: __('Emails'),
      icon: EmailIcon,
      count: ref(0)
    },
    {
      name: 'Comments',
      label: __('Comments'),
      icon: CommentIcon,
      count: ref(0),
      condition: () => !Boolean(opportunity?.data?.hide_comments_tab),
    },
    {
      name: 'Calls',
      label: __('Calls'),
      icon: PhoneIcon,
      condition: () => callEnabled.value,
      count: ref(0)
    },
    {
      name: 'ToDos',
      label: __('ToDos'),
      icon: ToDoIcon,
      count: ref(0)
    },
    {
      name: 'Events',
      label: __('Events'),
      icon: EventIcon,
      count: ref(0)
    },
    {
      name: 'Notes',
      label: __('Notes'),
      icon: NoteIcon,
      count: ref(0)
    },
    {
      name: 'Attachments',
      label: __('Attachments'),
      icon: AttachmentIcon,
      count: ref(0)
    },
    {
      name: 'WhatsApp',
      label: __('WhatsApp'),
      icon: WhatsAppIcon,
      condition: () => whatsappEnabled.value,
      count: ref(0)
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
const { tabIndex } = useActiveTabManager(tabs, 'lastOpportunityTab')

const fieldsLayout = createResource({
  url: 'next_crm.api.doc.get_sidebar_fields',
  cache: ['fieldsLayout', props.opportunityId],
  params: { doctype: 'Opportunity', name: props.opportunityId },
  auto: true,
})

function getParsedFields(sections) {
  sections.forEach((section) => {
    if (section.name == 'contacts_section' || section.name == 'addresses_section') return
    section.fields.forEach((field) => {
      if (field.name == 'customer') {
        field.create = (value, close) => {
          _customer.value.customer_name = value
          showCustomerModal.value = true
          close()
        }
        field.link = (org) =>
          router.push({
            name: 'Customer',
            params: { customerId: org },
          })
      }
    })
  })
  return sections
}

watch(
  () => fieldsLayout.data,
  (data) => {
    if (!data) return
    const sections = getParsedFields(data)
    fieldsLayout.data = sections
  },
)

const showContactModal = ref(false)
const showAddressModal = ref(false)
const _contact = ref({})

function contactOptions(contact) {
  let options = [
    {
      label: __('Remove'),
      icon: 'trash-2',
      onClick: () => removeContact(contact.name),
    },
  ]

  if (!contact.is_primary_contact) {
    options.push({
      label: __('Set as Primary Contact'),
      icon: h(SuccessIcon, { class: 'h-4 w-4' }),
      onClick: () => setPrimaryContact(contact.name),
    })
  }

  return options
}

function addressOptions(address) {
  let options = [
    {
      label: __('Remove'),
      icon: 'trash-2',
      onClick: () => removeAddress(address.name),
    },
  ]

  if (!address.is_primary_address) {
    options.push({
      label: __('Set as Billing'),
      icon: h(SuccessIcon, { class: 'h-4 w-4' }),
      onClick: () => setBillingShippingAddress(address.name, true),
    })
  }

  if (!address.is_shipping_address) {
    options.push({
      label: __('Set as Shipping'),
      icon: h(SuccessIcon, { class: 'h-4 w-4' }),
      onClick: () => setBillingShippingAddress(address.name, false),
    })
  }

  return options
}

async function addContact(contact) {
  let d = await call('next_crm.api.contact.link_contact_to_doc', {
    contact: contact,
    doctype: "Opportunity",
    docname: props.opportunityId,
  })
  if (d) {
    opportunityContacts.reload()
    createToast({
      title: __('Contact added'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function addAddress(address) {
  let d = await call('next_crm.api.address.link_address_to_doc', {
    address,
    doctype: "Opportunity",
    docname: props.opportunityId,
  })
  if (d) {
    opportunityAddresses.reload()
    createToast({
      title: __('Address added'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function removeContact(contact) {
  let d = await call('next_crm.api.contact.remove_link_from_contact', {
    contact,
    docname: props.opportunityId,
    doctype: "Opportunity",
  })
  if (d) {
    opportunityContacts.reload()
    createToast({
      title: __('Contact removed'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function removeAddress(address) {
  let d = await call('next_crm.api.address.remove_address', {
    link_doctype: "Opportunity",
    link_name: props.opportunityId,
    address,
  })
  if (d) {
    opportunityAddresses.reload()
    createToast({
      title: __('Address removed'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function setBillingShippingAddress(address_name, is_billing) {
  let d = await call('next_crm.api.address.set_billing_shipping', {
    address_name,
    is_billing,
  })
  if (d) {
    opportunityAddresses.reload()
    let changed = 'Billing'
    if (!is_billing)
      changed = 'Shipping'
    createToast({
      title: __(`${changed} address modified`),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function setPrimaryContact(contact) {
  let d = await call('next_crm.api.contact.set_opportunity_primary_contact', {
    docname: props.opportunityId,
    contact,
  })
  if (d) {
    opportunity.reload()
    opportunityContacts.reload()
    createToast({
      title: __('Primary contact set'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

const opportunityContacts = createResource({
  url: '/api/method/next_crm.api.contact.get_lead_opportunity_contacts',
  params: {
    doctype: "Opportunity",
    docname: props.opportunityId
  },
  cache: ['opportunity_contacts', props.opportunityId],
  auto: true,
  transform: (data) => {
    data.forEach((contact) => {
      contact.opened = false
    })
    return data
  },
})

const opportunityAddresses = createResource({
  url: '/api/method/next_crm.api.address.get_linked_address',
  params: { link_doctype: "Opportunity", link_name: props.opportunityId },
  cache: ['opportunity_addresses', props.opportunityId],
  auto: true,
  transform: (data) => {
    data.forEach((address) => {
      address.opened = false
    })
    return data
  },
})

function triggerCall() {
  let primaryContact = opportunityContacts.data?.find((c) => c.is_primary_contact)
  let mobile_no = primaryContact.mobile_no || null

  if (!primaryContact) {
    errorMessage(__('No primary contact set'))
    return
  }

  if (!mobile_no) {
    errorMessage(__('No mobile number set'))
    return
  }

  makeCall(mobile_no)
}

function updateField(name, value, callback) {
  const isStatusField = name === "status";

  if (isStatusField && opportunity.data[name] === value && value != "Won") {
    return;
  } else if (isStatusField && value === "Lost") {
    showLostReasonModal.value = true;
    return;
  }

  updateOpportunity(name, value, () => {
    opportunity.data[name] = value;
    callback?.();
  });

  if (isStatusField && value === "Won") {
    showCreateProjectModal.value = true;
  }
}

const projectResource = createResource({
  url: "/api/resource/Project",
})

const OPPORTUNITY_TO_PROJECT_KEY_MAP = {
  "title": "project_name",
  "contact_person": "custom_client_point_of_contact",
  "customer": "customer",
  "territory": "custom_territory",
  "custom_project_manager": "custom_project_manager",
  "custom_complexity_level": "custom_complexity",
  "opportunity_amount": "estimated_costing",
  "currency": "custom_currency",
  "custom__project_size": "custom_project_size",
  "source": "custom_source",
  "industry": "custom_industry",
  "custom_deal_type": "custom_deal_type",
  "custom_timezone": "custom_timezone",
  "custom_current_host": "custom_host",
  "custom_project_type": "project_type",
  "custom_estimatedpurchased_hours": "custom_total_hours_purchased",
  "custom_service_type": "custom_service_type",
  "custom_restricted_under_nda": "custom_restricted_under_nda",
  "custom_duration": "custom_duration",
  "custom_previous_cms": "custom_previous_cms",
  "custom_billing_type": "custom_billing_type",
  "custom_description": "custom_project_detail",
};

const createProject = async (projectData) => {
  try {
    const projectMeta = getFields();
    const hasCustomOpportunity = projectMeta?.some(item => item.fieldname === 'custom_opportunity');
    const projectPayload = {
      project_name: projectData.title,
      status: "Open",
      ...(hasCustomOpportunity && {
        custom_opportunity: props.opportunityId
      })
    };

    Object.entries(OPPORTUNITY_TO_PROJECT_KEY_MAP).forEach(([sourceKey, targetKey]) => {
      if (projectData[sourceKey] !== undefined && projectData[sourceKey] !== null) {
        projectPayload[targetKey] = projectData[sourceKey];
      }
    });

    await projectResource.submit(projectPayload);
    createToast({
      title: __('Project created successfully'),
      text: __(`Created project named ${projectPayload.project_name}`),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
    showCreateProjectModal.value = false;
  } catch{
    createToast({
      title: __(projectResource?.error?.exc_type || 'Error creating project'),
      text: __(projectResource?.error?.messages[0] || 'Something went wrong'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
  }
};

const missingFields = ref({})

const fieldDefinitions = computed(() => {
  if (!opportunity?.data?.fields_meta || !missingFields.value) return []

  return Object.keys(missingFields.value).map(fieldname => {
    const fieldMeta = opportunity.data.fields_meta[fieldname] || {}
    const isSelectField = fieldMeta.fieldtype === 'Select'
    let options = fieldMeta.options

    if (isSelectField && options && typeof options === 'string') {
      options = options.split('\n')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0)
    }

    return {
      ...fieldMeta,
      name: fieldname,
      label: fieldMeta.label,
      type: fieldMeta.fieldtype || 'Data',
      options: options,
      mandatory: fieldMeta.fieldtype !== "Check"? true : false,
      reqd:fieldMeta.fieldtype !== "Check"? true : false,
    }
  })
})

const filteredFields = computed(() => {
  return fieldDefinitions.value.filter(field =>
    Object.prototype.hasOwnProperty.call(missingFields.value, field.fieldname)
  ).map(({ depends_on,display_via_depends_on, ...rest }) => rest);
});

const createProjectFromOpportunity = async () => {
  const requiredFields = Object.keys(OPPORTUNITY_TO_PROJECT_KEY_MAP);
  const filteredRequiredFields = requiredFields.filter(field => field in opportunity.data.fields_meta);
  const missingFieldArray = getMissingRequiredFields(filteredRequiredFields, opportunity.data);
  if (missingFieldArray.length) {
    showMissingValueModal.value = true;
    showCreateProjectModal.value = false;
    missingFields.value = Object.fromEntries(
      Object.entries(opportunity.data)
        .filter(([key]) => requiredFields.includes(key))
    );
  } else {
    await createProject(opportunity.data);
  }

}

async function deleteOpportunity() {
  showDeleteModal.value = true;
}

function redirectToLead() {
  const docType = opportunity.data.opportunity_from; 
  const docName = opportunity.data.party_name;

  if (!docType || !docName) {
    errorMessage(__('No linked party to redirect.'));
    return;
  }

  const routeBase = docType === 'Lead'
    ? `/leads/${docName}`
    : `/customers/${docName}`;

  router.push(`${routeBase}#activity`);
}

const activities = ref(null)

function openEmailBox() {
  activities.value.emailBox.show = true
}

function afterRename(renamed_docname) {
  router.push({ name: props.doctype, params: { opportunityId: renamed_docname } }).then(() => {
    location.reload();
  });
}

function getMissingRequiredFields(requiredFieldKeys, data) {
  return requiredFieldKeys.filter(key => {
    const value = data[key]
    return value === undefined || value === null || String(value).trim() === ''
  })
}

</script>

<style scoped>
:deep(.section:has(.section-field.hidden)) {
  display: none;
}

:deep(.section:has(.section-field:not(.hidden))) {
  display: flex;
}
</style>
