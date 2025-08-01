<template>
  <LayoutHeader v-if="opportunity.data">
    <header
      class="relative flex h-10.5 items-center justify-between gap-2 py-2.5 pl-2"
    >
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
      <div class="absolute right-0">
        <Dropdown :options="statusOptions('opportunity', updateField, customStatuses)">
          <template #default="{ open }">
            <Button
              :label="opportunity.data.status"
              :class="getDealStatus(opportunity.data.status).colorClass"
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
  v-if="opportunity.data"
  class="flex h-12 items-center justify-between border-b px-3 py-2.5"
>
  <div class="flex items-center gap-2">
    <AssignTo
      v-model="opportunity.data._assignedTo"
      :data="opportunity.data"
      doctype="Opportunity"
    />
    <Tooltip :text="__('Check Details')">
      <Button class="h-7 w-7" @click="redirectToLead">
        <FeatherIcon name="external-link" class="h-4 w-4" />
      </Button>
    </Tooltip>
  </div>

  <div class="flex items-center gap-2">
    <CustomActions v-if="customActions" :actions="customActions" />
  </div>
</div>

  <div v-if="opportunity.data" class="flex h-full overflow-hidden">
    <Tabs as="div" v-model="tabIndex" :tabs="tabs" class="overflow-auto">
      <TabList class="!px-3" />
      <TabPanel v-slot="{ tab }">
        <div v-if="tab.name == 'Details'">
          <SLASection
            v-if="opportunity.data.sla_status"
            v-model="opportunity.data"
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
                  <template #actions>
                    <div v-if="section.contacts" class="pr-2">
                      <Link
                        value=""
                        doctype="Contact"
                        @change="(e) => addContact(e)"
                        :onCreate="
                          (value, close) => {
                            _contact = {
                              first_name: value,
                              company_name: opportunity.data.customer,
                            }
                            showContactModal = true
                            close()
                          }
                        "
                      >
                        <template #target="{ togglePopover }">
                          <Button
                            class="h-7 px-3"
                            variant="ghost"
                            icon="plus"
                            @click="togglePopover()"
                          />
                        </template>
                      </Link>
                    </div>
                  </template>
                  <SectionFields
                    v-if="section.fields"
                    :fields="section.fields"
                    :isLastSection="i == fieldsLayout.data.length - 1"
                    v-model="opportunity.data"
                    @update="updateField"
                  />
                  <div v-else>
                    <div
                      v-if="
                        opportunityContacts?.loading && opportunityContacts?.data?.length == 0
                      "
                      class="flex min-h-20 flex-1 items-center justify-center gap-3 text-base text-ink-gray-4"
                    >
                      <LoadingIndicator class="h-4 w-4" />
                      <span>{{ __('Loading...') }}</span>
                    </div>
                    <div
                      v-else-if="section.contacts.length"
                      v-for="(contact, i) in section.contacts"
                      :key="contact.name"
                    >
                      <div
                        class="px-2 pb-2.5"
                        :class="[i == 0 ? 'pt-5' : 'pt-2.5']"
                      >
                        <Section :is-opened="contact.opened">
                          <template #header="{ opened, toggle }">
                            <div
                              class="flex cursor-pointer items-center justify-between gap-2 pr-1 text-base leading-5 text-ink-gray-7"
                            >
                              <div
                                class="flex h-7 items-center gap-2 truncate"
                                @click="toggle()"
                              >
                                <Avatar
                                  :label="contact.full_name"
                                  :image="contact.image"
                                  size="md"
                                />
                                <div class="truncate">
                                  {{ contact.full_name }}
                                </div>
                                <Badge
                                  v-if="contact.name == opportunity.data.contact_person"
                                  class="ml-2"
                                  variant="outline"
                                  :label="__('Primary')"
                                  theme="green"
                                />
                              </div>
                              <div class="flex items-center">
                                <Dropdown :options="contactOptions(contact.name)">
                                  <Button
                                    icon="more-horizontal"
                                    class="text-ink-gray-5"
                                    variant="ghost"
                                  />
                                </Dropdown>
                                <Button
                                  variant="ghost"
                                  @click="
                                    router.push({
                                      name: 'Contact',
                                      params: { contactId: contact.name },
                                    })
                                  "
                                >
                                  <ArrowUpRightIcon class="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" @click="toggle()">
                                  <FeatherIcon
                                    name="chevron-right"
                                    class="h-4 w-4 text-ink-gray-9 transition-all duration-300 ease-in-out"
                                    :class="{ 'rotate-90': opened }"
                                  />
                                </Button>
                              </div>
                            </div>
                          </template>
                          <div
                            class="flex flex-col gap-1.5 text-base text-ink-gray-8"
                          >
                            <div class="flex items-center gap-3 pb-1.5 pl-1 pt-4">
                              <Email2Icon class="h-4 w-4" />
                              <a :href="`mailto:${contact.email}`" class="hover:underline text-blue-600">
                                {{ contact.email }}
                              </a>                              </div>
                            <div class="flex items-center gap-3 p-1 py-1.5">
                              <PhoneIcon class="h-4 w-4" />
                              <a :href="`tel:${contact.mobile_no}`" class="hover:underline text-blue-600">
                                {{ contact.mobile_no }}
                              </a>                            </div>
                          </div>
                        </Section>
                      </div>
                      <div
                        v-if="i != section.contacts.length - 1"
                        class="mx-2 h-px border-t border-gray-200"
                      />
                    </div>
                    <div
                      v-else
                      class="flex h-20 items-center justify-center text-base text-ink-gray-5"
                    >
                      {{ __('No contacts added') }}
                    </div>
                  </div>
                </Section>
              </div>
            </div>
          </div>
        </div>
        <QuotationList
        v-if="tabs[tabIndex].name === 'Quotation'"
        :opportunity-id="opportunity.data.name"
        :count="tabs.find(tab => tab.name === 'Quotation').count"
      />
        <Activities
          v-else
          doctype="Opportunity"
          :tabs="tabs"
          v-model:reload="reload"
          v-model:tabIndex="tabIndex"
          v-model="opportunity"
        />

      </TabPanel>
    </Tabs>
  </div>
  <LostReasonModal v-if="opportunity?.data?.name" v-model="showLostReasonModal" :opportunity="opportunity"
    @reload="() => reload = true" />
  <CustomerModal
    v-model="showCustomerModal"
    v-model:customer="_customer"
    :options="{
      redirect: false,
      afterInsert: (doc) => updateField('customer', doc.name),
    }"
  />
  <ContactModal
    v-model="showContactModal"
    :contact="_contact"
    :options="{
      redirect: false,
      afterInsert: (doc) => addContact(doc.name),
    }"
  />
</template>
<script setup>
import Icon from '@/components/Icon.vue'
import DetailsIcon from '@/components/Icons/DetailsIcon.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import ActivityIcon from '@/components/Icons/ActivityIcon.vue'
import EmailIcon from '@/components/Icons/EmailIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import SuccessIcon from '@/components/Icons/SuccessIcon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import Activities from '@/components/Activities/Activities.vue'
import CustomerModal from '@/components/Modals/CustomerModal.vue'
import AssignTo from '@/components/AssignTo.vue'
import ContactModal from '@/components/Modals/ContactModal.vue'
import Link from '@/components/Controls/Link.vue'
import Section from '@/components/Section.vue'
import SectionFields from '@/components/SectionFields.vue'
import SLASection from '@/components/SLASection.vue'
import CustomActions from '@/components/CustomActions.vue'
import { createToast, setupAssignees, setupCustomizations } from '@/utils'
import { getView } from '@/utils/view'
import { globalStore } from '@/stores/global'
import { statusesStore } from '@/stores/statuses'
import QuotationList from '../components/ListViews/QuotationList.vue'
import ExportIcon from '@/components/Icons/ExportIcon.vue'
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
  Avatar,
  Tabs,
  TabList,
  TabPanel,
  Breadcrumbs,
  call,
  Tooltip
} from 'frappe-ui'
import { ref, computed, h, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { $dialog, $socket } = globalStore()
const { statusOptions, getDealStatus } = statusesStore()
const route = useRoute()
const router = useRouter()
const showLostReasonModal = ref(false)


const props = defineProps({
  opportunityId: {
    type: String,
    required: true,
  },
})

const customActions = ref([])
const customStatuses = ref([])

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
  if (opportunity.data) return
  opportunity.fetch()
})

const reload = ref(false)
const showCustomerModal = ref(false)
const _customer = ref({})

function updateOpportunity(fieldname, value, callback) {
  value = Array.isArray(fieldname) ? '' : value

  if (validateRequired(fieldname, value)) return

  createResource({
    url: 'frappe.client.set_value',
    params: {
      doctype: 'Opportunity',
      name: props.opportunityId,
      fieldname,
      value,
    },
    auto: true,
    onSuccess: () => {
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
    label: customer.data?.name || opportunity.data?.party_name || __('Untitled'),
    route: { name: 'Opportunity', params: { opportunityId: opportunity.data.name } },
  })
  return items
})



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
const { tabIndex } = useActiveTabManager(tabs, 'lastOpportunityTab')

const fieldsLayout = createResource({
  url: 'next_crm.api.doc.get_sidebar_fields',
  cache: ['fieldsLayout', props.opportunityId],
  params: { doctype: 'Opportunity', name: props.opportunityId },
  auto: true,
  transform: (data) => getParsedFields(data),
})

function getParsedFields(sections) {
  if (!Array.isArray(sections)) {
    console.warn('Invalid sections passed to getParsedFields:', sections)
    return []
  }

  sections.forEach((section) => {
    if (section.name == 'contacts_section') return

    if (!Array.isArray(section.fields)) {
      console.warn('Missing or invalid fields in section:', section)
      section.fields = [] 
    }

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


const showContactModal = ref(false)
const _contact = ref({})

function contactOptions(contact) {
  let options = [
    {
      label: __('Delete'),
      icon: 'trash-2',
      onClick: () => removeContact(contact),
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
  onSuccess: (data) => {
    let contactSection = fieldsLayout.data?.find(
      (section) => section.name == 'contacts_section',
    )
    if (!contactSection) return
    contactSection.contacts = data.map((contact) => {
      return {
        name: contact.name,
        full_name: contact.full_name,
        email: contact.email,
        mobile_no: contact.mobile_no,
        image: contact.image,
        is_primary_contact: contact.is_primary_contact,
        opened: false,
      }
    })
  },
})

function updateField(name, value, callback) {
  const isStatusField = name === "status";

if (isStatusField && opportunity.data[name] === value && value != "Won") {
  return;
} else if (isStatusField && value === "Lost") {
  showLostReasonModal.value = true;
  return;
}
  updateOpportunity(name, value, () => {
    opportunity.data[name] = value
    callback?.()
  })
}

async function deleteOpportunity(name) {
  await call('frappe.client.delete', {
    doctype: 'Opportunity',
    name,
  })
  router.push({ name: 'Opportunities' })
}
</script>
