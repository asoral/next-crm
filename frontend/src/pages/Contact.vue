<template>
  <LayoutHeader v-if="contact.data">
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
    </template>
  </LayoutHeader>
  <div ref="parentRef" class="flex h-full">
    <Resizer
      v-if="contact.data"
      :parent="$refs.parentRef"
      class="flex h-full flex-col overflow-hidden border-r"
    >
      <div class="border-b">
        <FileUploader
          @success="changeContactImage"
          :validateFile="validateFile"
        >
          <template #default="{ openFileSelector, error }">
            <div class="flex flex-col items-start justify-start gap-4 p-5">
              <div class="flex gap-4 items-center">
                <div class="group relative h-15.5 w-15.5">
                  <Avatar
                    size="3xl"
                    class="h-15.5 w-15.5"
                    :label="contact.data.full_name"
                    :image="contact.data.image"
                  />
                  <component
                    :is="contact.data.image ? Dropdown : 'div'"
                    v-bind="
                      contact.data.image
                        ? {
                            options: [
                              {
                                icon: 'upload',
                                label: contact.data.image
                                  ? __('Change image')
                                  : __('Upload image'),
                                onClick: openFileSelector,
                              },
                              {
                                icon: 'trash-2',
                                label: __('Remove image'),
                                onClick: () => changeContactImage(''),
                              },
                            ],
                          }
                        : { onClick: openFileSelector }
                    "
                    class="!absolute bottom-0 left-0 right-0"
                  >
                    <div
                      class="z-1 absolute bottom-0 left-0 right-0 flex h-14 cursor-pointer items-center justify-center rounded-b-full bg-black bg-opacity-40 pt-5 opacity-0 duration-300 ease-in-out group-hover:opacity-100"
                      style="
                        -webkit-clip-path: inset(22px 0 0 0);
                        clip-path: inset(22px 0 0 0);
                      "
                    >
                      <CameraIcon class="h-6 w-6 cursor-pointer text-white" />
                    </div>
                  </component>
                </div>
                <div class="flex flex-col gap-2 truncate text-ink-gray-9">
                  <div class="truncate text-2xl font-medium">
                    <span v-if="contact.data.salutation">
                      {{ contact.data.salutation + '. ' }}
                    </span>
                    <span>{{ contact.data.full_name }}</span>
                  </div>
                  <div
                    v-if="contact.data.company_name"
                    class="flex items-center gap-1.5 text-base text-ink-gray-8"
                  >
                    <Avatar
                      size="xs"
                      :label="contact.data.company_name"
                      :image="
                        getCustomer(contact.data.company_name)
                          ?.image
                      "
                    />
                    <span class="">{{ contact.data.company_name }}</span>
                  </div>
                  <ErrorMessage :message="__(error)" />
                </div>
              </div>
              <div class="flex gap-1.5">
                <Button
                  v-if="contact.data.actual_mobile_no"
                  :label="__('Make Call')"
                  size="sm"
                  @click="
                    callEnabled && makeCall(contact.data.actual_mobile_no)
                  "
                >
                  <template #prefix>
                    <PhoneIcon class="h-4 w-4" />
                  </template>
                </Button>
                <Button
                  :label="__('Delete')"
                  theme="red"
                  size="sm"
                  @click="showDeleteModal = true"
                >
                  <template #prefix>
                    <FeatherIcon name="trash-2" class="h-4 w-4" />
                  </template>
                </Button>
              </div>
            </div>
          </template>
        </FileUploader>
      </div>
      <div
        v-if="fieldsLayout.data"
        class="flex flex-1 flex-col justify-between overflow-hidden"
      >
        <div class="flex flex-col overflow-y-auto">
          <div
            v-for="(section, i) in fieldsLayout.data"
            :key="section.label"
            class="flex flex-col p-3"
            :class="{ 'border-b': i !== fieldsLayout.data.length - 1 }"
          >
            <Section :is-opened="section.opened" :label="section.label">
              <template #actions>
                <Button
                  v-if="i == 0 && isManager()"
                  variant="ghost"
                  class="w-7"
                  @click="showSidePanelModal = true"
                >
                  <EditIcon class="h-4 w-4" />
                </Button>
              </template>
              <SectionFields
                v-if="section.fields"
                :fields="section.fields"
                :isLastSection="i == fieldsLayout.data.length - 1"
                v-model="contact.data"
                @update="updateField"
              />
            </Section>
          </div>
        </div>
      </div>
    </Resizer>
    <Tabs as="div" v-model="tabIndex" :tabs="tabs">
      <template #tab-item="{ tab, selected }">
        <button
          class="group flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:border-gray-400 hover:text-ink-gray-9"
          :class="{ 'text-ink-gray-9': selected }"
        >
          <component v-if="tab.icon" :is="tab.icon" class="h-5" />
          {{ __(tab.label) }}
          <Badge
            class="group-hover:bg-surface-gray-7"
            :class="[selected ? 'bg-surface-gray-7' : 'bg-gray-600']"
            variant="solid"
            theme="gray"
            size="sm"
          >
            {{ tab.count }}
          </Badge>
        </button>
      </template>
      <template #tab-panel="{ tab }">
        <OpportunitiesListView
          v-if="tab.label === 'Opportunities' && rows.length"
          class="mt-4"
          :rows="rows"
          :columns="columns"
          :options="{ selectable: false, showTooltip: false }"
        />
        <div
          v-if="!rows.length"
          class="grid flex-1 place-items-center text-xl font-medium text-ink-gray-4"
        >
          <div class="flex flex-col items-center justify-center space-y-3">
            <component :is="tab.icon" class="!h-10 !w-10" />
            <div>{{ __('No {0} Found', [__(tab.label)]) }}</div>
          </div>
        </div>
      </template>
    </Tabs>
  </div>
  <SidePanelModal
    v-if="showSidePanelModal"
    v-model="showSidePanelModal"
    doctype="Contact"
    @reload="() => fieldsLayout.reload()"
  />
  <AddressModal v-model="showAddressModal" v-model:address="_address" />
  <DeleteModal
    v-model="showDeleteModal"
    doctype="Contact"
    :docname="props.contactId"
    redirect-to="Contacts"
  />
</template>

<script setup>
import Resizer from '@/components/Resizer.vue'
import Icon from '@/components/Icon.vue'
import Section from '@/components/Section.vue'
import SectionFields from '@/components/SectionFields.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import CameraIcon from '@/components/Icons/CameraIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import OpportunitiesListView from '@/components/ListViews/OpportunitiesListView.vue'
import SidePanelModal from '@/components/Settings/SidePanelModal.vue'
import AddressModal from '@/components/Modals/AddressModal.vue'
import DeleteModal from '@/components/Modals/DeleteModal.vue'
import {
  dateFormat,
  dateTooltipFormat,
  timeAgo,
  formatNumberIntoCurrency,
  createToast,
} from '@/utils'
import { getView } from '@/utils/view'
import { globalStore } from '@/stores/global.js'
import { usersStore } from '@/stores/users.js'
import { customersStore } from '@/stores/customers.js'
import { statusesStore } from '@/stores/statuses'
import { callEnabled } from '@/composables/settings'
import {
  Breadcrumbs,
  Avatar,
  FileUploader,
  Tabs,
  call,
  createResource,
  usePageMeta,
  Dropdown,
} from 'frappe-ui'
import { ref, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { makeCall } = globalStore()

const { getUser, isManager } = usersStore()
const { getCustomer } = customersStore()
const { getDealStatus } = statusesStore()

const props = defineProps({
  contactId: {
    type: String,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()

const showAddressModal = ref(false)
const showSidePanelModal = ref(false)
const showDeleteModal = ref(false)
const _contact = ref({})
const _address = ref({})

const contact = createResource({
  url: 'next_crm.api.contact.get_contact',
  cache: ['contact', props.contactId],
  params: {
    name: props.contactId,
  },
  auto: true,
  transform: (data) => {
    return {
      ...data,
      actual_mobile_no: data.mobile_no,
      mobile_no: data.mobile_no,
    }
  },
})

const breadcrumbs = computed(() => {
  let items = [{ label: __('Contacts'), route: { name: 'Contacts' } }]

  if (route.query.view || route.query.viewType) {
    let view = getView(route.query.view, route.query.viewType, 'Contact')
    if (view) {
      items.push({
        label: __(view.label),
        icon: view.icon,
        route: {
          name: 'Contacts',
          params: { viewType: route.query.viewType },
          query: { view: route.query.view },
        },
      })
    }
  }

  items.push({
    label: contact.data?.full_name,
    route: { name: 'Contact', params: { contactId: props.contactId } },
  })
  return items
})

usePageMeta(() => {
  return {
    title: contact.data?.full_name || contact.data?.name,
  }
})

function validateFile(file) {
  let extn = file.name.split('.').pop().toLowerCase()
  if (!['png', 'jpg', 'jpeg'].includes(extn)) {
    return __('Only PNG and JPG images are allowed')
  }
}

async function changeContactImage(file) {
  await call('frappe.client.set_value', {
    doctype: 'Contact',
    name: props.contactId,
    fieldname: 'image',
    value: file?.file_url || '',
  })
  contact.reload()
}

const tabIndex = ref(0)
const tabs = [
  {
    label: 'Opportunities',
    icon: h(OpportunitiesIcon, { class: 'h-4 w-4' }),
    count: computed(() => opportunities.data?.length),
  },
]

const opportunities = createResource({
  url: 'next_crm.api.contact.get_linked_opportunities',
  cache: ['opportunities', props.contactId],
  params: {
    contact: props.contactId,
  },
  auto: true,
})

const rows = computed(() => {
  if (!opportunities.data || opportunities.data == []) return []

  return opportunities.data.map((row) => getOpportunityRowObject(row))
})

const fieldsLayout = createResource({
  url: 'next_crm.api.doc.get_sidebar_fields',
  cache: ['fieldsLayout', props.contactId],
  params: { doctype: 'Contact', name: props.contactId },
  auto: true,
  transform: (data) => getParsedFields(data),
})

function getParsedFields(data) {
  return data.map((section) => {
    return {
      ...section,
      fields: computed(() =>
        section.fields.map((field) => {
          if (field.name === 'email_id') {
            return {
              ...field,
              type: 'dropdown',
              options:
                contact.data?.email_ids?.map((email) => {
                  return {
                    name: email.name,
                    value: email.email_id,
                    selected: email.email_id === contact.data.email_id,
                    placeholder: 'john@doe.com',
                    onClick: () => {
                      _contact.value.email_id = email.email_id
                      setAsPrimary('email', email.email_id)
                    },
                    onSave: (option, isNew) => {
                      if (isNew) {
                        createNew('email', option.value)
                        if (contact.data.email_ids.length === 1) {
                          _contact.value.email_id = option.value
                        }
                      } else {
                        editOption(
                          'Contact Email',
                          option.name,
                          'email_id',
                          option.value,
                        )
                      }
                    },
                    onDelete: async (option, isNew) => {
                      contact.data.email_ids = contact.data.email_ids.filter(
                        (email) => email.name !== option.name,
                      )
                      !isNew &&
                        (await deleteOption('Contact Email', option.name))
                      if (_contact.value.email_id === option.value) {
                        if (contact.data.email_ids.length === 0) {
                          _contact.value.email_id = ''
                        } else {
                          _contact.value.email_id = contact.data.email_ids.find(
                            (email) => email.is_primary,
                          )?.email_id
                        }
                      }
                    },
                  }
                }) || [],
              create: () => {
                contact.data?.email_ids?.push({
                  name: 'new-1',
                  value: '',
                  selected: false,
                  isNew: true,
                })
              },
            }
          } else if (field.name === 'mobile_no') {
            return {
              ...field,
              type: 'dropdown',
              options:
                contact.data?.phone_nos?.map((phone) => {
                  return {
                    name: phone.name,
                    value: phone.phone,
                    selected: phone.phone === contact.data.actual_mobile_no,
                    onClick: () => {
                      _contact.value.actual_mobile_no = phone.phone
                      _contact.value.mobile_no = phone.phone
                      setAsPrimary('mobile_no', phone.phone)
                    },
                    onSave: (option, isNew) => {
                      if (isNew) {
                        createNew('phone', option.value)
                        if (contact.data.phone_nos.length === 1) {
                          _contact.value.actual_mobile_no = option.value
                        }
                      } else {
                        editOption(
                          'Contact Phone',
                          option.name,
                          'phone',
                          option.value,
                        )
                      }
                    },
                    onDelete: async (option, isNew) => {
                      contact.data.phone_nos = contact.data.phone_nos.filter(
                        (phone) => phone.name !== option.name,
                      )
                      !isNew &&
                        (await deleteOption('Contact Phone', option.name))
                      if (_contact.value.actual_mobile_no === option.value) {
                        if (contact.data.phone_nos.length === 0) {
                          _contact.value.actual_mobile_no = ''
                        } else {
                          _contact.value.actual_mobile_no =
                            contact.data.phone_nos.find(
                              (phone) => phone.is_primary_mobile_no,
                            )?.phone
                        }
                      }
                    },
                  }
                }) || [],
              create: () => {
                contact.data?.phone_nos?.push({
                  name: 'new-1',
                  value: '',
                  selected: false,
                  isNew: true,
                })
              },
            }
          } else if (field.name === 'address') {
            return {
              ...field,
              create: (value, close) => {
                _contact.value.address = value
                _address.value = {}
                showAddressModal.value = true
                close()
              },
              edit: async (addr) => {
                _address.value = await call('frappe.client.get', {
                  doctype: 'Address',
                  name: addr,
                })
                showAddressModal.value = true
              },
            }
          } else {
            return field
          }
        }),
      ),
    }
  })
}

async function setAsPrimary(field, value) {
  let d = await call('next_crm.api.contact.set_as_primary', {
    contact: contact.data.name,
    field,
    value,
  })
  if (d) {
    contact.reload()
    createToast({
      title: 'Contact updated',
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function createNew(field, value) {
  if (!value) return
  let d = await call('next_crm.api.contact.create_new', {
    contact: contact.data.name,
    field,
    value,
  })
  if (d) {
    contact.reload()
    createToast({
      title: 'Contact updated',
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function editOption(doctype, name, fieldname, value) {
  let d = await call('frappe.client.set_value', {
    doctype,
    name,
    fieldname,
    value,
  })
  if (d) {
    contact.reload()
    createToast({
      title: 'Contact updated',
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  }
}

async function deleteOption(doctype, name) {
  await call('frappe.client.delete', {
    doctype,
    name,
  })
  await contact.reload()
  createToast({
    title: 'Contact updated',
    icon: 'check',
    iconClasses: 'text-ink-green-3',
  })
}

async function updateField(fieldname, value) {
  await call('frappe.client.set_value', {
    doctype: 'Contact',
    name: props.contactId,
    fieldname,
    value,
  })
  createToast({
    title: 'Contact updated',
    icon: 'check',
    iconClasses: 'text-ink-green-3',
  })

  contact.reload()
}

const columns = computed(() => opportunityColumns)
function getOpportunityRowObject(opportunity) {
  // console.log('opportunity', opportunity.title)
  return {
    name: opportunity.name, 
    title: opportunity.title, 

    party_name: opportunity.party_name,
    customer: {
      label: opportunity.customer,
      logo: getCustomer(opportunity.customer)?.image,
    },
    opportunity_amount: formatNumberIntoCurrency(
      opportunity.opportunity_amount,
      opportunity.currency,
    ),
    probability: opportunity.probability + '%',
    sales_stage: opportunity.sales_stage,
    status: {
      label: opportunity.status,
      color: getDealStatus(opportunity.status)?.iconColorClass,
    },
    email: opportunity.contact_email,
    mobile_no: opportunity.contact_mobile,
    opportunity_owner: {
      label:
        opportunity.opportunity_owner &&
        getUser(opportunity.opportunity_owner).full_name,
      ...(opportunity.opportunity_owner &&
        getUser(opportunity.opportunity_owner)),
    },
    modified: {
      label: dateFormat(opportunity.modified, dateTooltipFormat),
      timeAgo: __(timeAgo(opportunity.modified)),
    },
  }
}

const opportunityColumns = [
  // {
  //   label: __('Opportunity'),
  //   key: 'party_name',
  //   width: '12rem',
  // },
  {
    label: __('Title'),
    key: 'title',
    width: '12rem',
  },
  {
    label: __('Opportunity Owner'),
    key: 'opportunity_owner',
    width: '12rem',
  },
  {
    label: __('Probability'),
    key: 'probability',
    width: '8rem',
  },
  {
    label: __('Last Modified'),
    key: 'modified',
    width: '10rem',
  },
  {
    label: __('Status'),
    key: 'status',
    width: '10rem',
  },
  {
    label: __('Sales Stage'),
    key: 'sales_stage',
    width: '10rem',
  },
]

</script>
