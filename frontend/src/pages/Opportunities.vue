<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs v-model="viewControls" routeName="Opportunities" />
    </template>
    <template #right-header>
      <CustomActions
        v-if="opportunitiesListView?.customListActions"
        :actions="opportunitiesListView.customListActions"
      />
      <Button
        v-if="hasCreateAccess"
        variant="solid"
        :label="__('Create')"
        @click="showOpportunityModal = true"
      >
        <template #prefix><FeatherIcon name="plus" class="h-4" /></template>
      </Button>
    </template>
  </LayoutHeader>
  <ViewControls
    ref="viewControls"
    v-model="opportunities"
    v-model:loadMore="loadMore"
    v-model:resizeColumn="triggerResize"
    v-model:updatedPageCount="updatedPageCount"
    doctype="Opportunity"
    :options="{
      allowedViews: ['list', 'group_by', 'kanban'],
    }"
  />
  <KanbanView
    v-if="route.params.viewType == 'kanban'"
    v-model="opportunities"
    :options="{
      getRoute: (row) => ({
        name: 'Opportunity',
        params: { opportunityId: row.name },
        query: { view: route.query.view, viewType: route.params.viewType },
      }),
      onNewClick: (column) => onNewClick(column),
    }"
    @update="(data) => viewControls.updateKanbanSettings(data)"
    @loadMore="(columnName) => viewControls.loadMoreKanban(columnName)"
  >
    <template #title="{ fields, titleField, itemName }">
      <div class="flex gap-2 items-center justify-between">
        <div class="flex gap-2 items-center">
          <div v-if="titleField === 'status'">
            <IndicatorIcon :class="getRow(itemName, titleField).color" />
          </div>
          <div
            v-else-if="
              titleField === 'customer' && getRow(itemName, titleField).label
            "
          >
            <Avatar
              class="flex items-center"
              :image="getRow(itemName, titleField).logo"
              :label="getRow(itemName, titleField).label"
              size="sm"
            />
          </div>
          <div
            v-else-if="
              titleField === 'opportunity_owner' &&
              getRow(itemName, titleField).full_name
            "
          >
            <Avatar
              class="flex items-center"
              :image="getRow(itemName, titleField).user_image"
              :label="getRow(itemName, titleField).full_name"
              size="sm"
            />
          </div>
          <div
            v-if="
              [
                'modified',
                'creation',
                'first_response_time',
                'first_responded_on',
                'response_by',
              ].includes(titleField)
            "
            class="truncate text-base"
          >
            <Tooltip :text="getRow(itemName, titleField).label">
              <div>{{ getRow(itemName, titleField).timeAgo }}</div>
            </Tooltip>
          </div>
          <div v-else-if="titleField === 'sla_status'" class="truncate text-base">
            <Badge
              v-if="getRow(itemName, titleField).value"
              :variant="'subtle'"
              :theme="getRow(itemName, titleField).color"
              size="md"
              :label="getRow(itemName, titleField).value"
            />
          </div>
          <div
            v-else-if="getRow(itemName, titleField).label"
            class="text-base"
          >
            {{ getRow(itemName, titleField).label }}
          </div>
          <div class="text-ink-gray-4" v-else>{{ __('No Title') }}</div>
        </div>
        <Badge v-if='fields["custom_priority"]' :variant="'subtle'" :theme="fields['custom_priority'] === 'High' ? 'red' : fields['custom_priority'] === 'Medium' ? 'orange' : 'gray'" class="text-base" :label="fields['custom_priority']"/>
      </div>
    </template>

    <template #fields="{ fieldName, itemName }">
      <div
        v-if="getRow(itemName, fieldName).label"
        class="truncate flex items-center gap-2"
      >
        <div v-if="fieldName === 'status'">
          <IndicatorIcon :class="getRow(itemName, fieldName).color" />
        </div>
        <div v-else-if="fieldName === 'customer'">
          <Avatar
            v-if="getRow(itemName, fieldName).label"
            class="flex items-center"
            :image="getRow(itemName, fieldName).logo"
            :label="getRow(itemName, fieldName).label"
            size="xs"
          />
        </div>
        <div v-else-if="fieldName === 'opportunity_owner'">
          <Avatar
            v-if="getRow(itemName, fieldName).full_name"
            class="flex items-center"
            :image="getRow(itemName, fieldName).user_image"
            :label="getRow(itemName, fieldName).full_name"
            size="xs"
          />
        </div>
        <div
          v-if="
            [
              'modified',
              'creation',
              'first_response_time',
              'first_responded_on',
              'response_by',
            ].includes(fieldName)
          "
          class="truncate text-base"
        >
          <Tooltip :text="getRow(itemName, fieldName).label">
            <div>{{ getRow(itemName, fieldName).timeAgo }}</div>
          </Tooltip>
        </div>
        <div v-else-if="fieldName === 'sla_status'" class="truncate text-base">
          <Badge
            v-if="getRow(itemName, fieldName).value"
            :variant="'subtle'"
            :theme="getRow(itemName, fieldName).color"
            size="md"
            :label="getRow(itemName, fieldName).value"
          />
        </div>
        <div v-else-if="fieldName === '_assign'" class="flex items-center">
          <MultipleAvatar
            :avatars="getRow(itemName, fieldName).label"
            size="xs"
          />
        </div>
        <div v-else-if="fieldName === 'probability'">
          {{ getRow(itemName, fieldName).label }}%
        </div>
        <div v-else class="truncate text-base">
          {{ getRow(itemName, fieldName).label }}
        </div>
      </div>
    </template>

    <template #actions="{ itemName }">
      <div class="flex gap-2 items-center justify-between">
        <div class="text-ink-gray-5 flex items-center gap-1.5">
          <EmailAtIcon class="h-4 w-4" />
          <span v-if="getRow(itemName, '_email_count').label">
            {{ getRow(itemName, '_email_count').label }}
          </span>
          <span class="text-3xl leading-[0]"> &middot; </span>
          <NoteIcon class="h-4 w-4" />
          <span v-if="getRow(itemName, '_note_count').label">
            {{ getRow(itemName, '_note_count').label }}
          </span>
          <span class="text-3xl leading-[0]"> &middot; </span>
          <ToDoIcon class="h-4 w-4" />
          <span v-if="getRow(itemName, '_todo_count').label">
            {{ getRow(itemName, '_todo_count').label }}
          </span>
          <span class="text-3xl leading-[0]"> &middot; </span>
          <CommentIcon class="h-4 w-4" />
          <span v-if="getRow(itemName, '_comment_count').label">
            {{ getRow(itemName, '_comment_count').label }}
          </span>
        </div>
        <Dropdown
          class="flex items-center gap-2"
          :options="actions(itemName)"
          variant="ghost"
          @click.stop.prevent
        >
          <Button icon="plus" variant="ghost" />
        </Dropdown>
      </div>
    </template>
  </KanbanView>
  <OpportunitiesListView
    ref="opportunitiesListView"
    v-else-if="opportunities.data && rows.length"
    v-model="opportunities.data.page_length_count"
    v-model:list="opportunities"
    :rows="rows"
    :columns="opportunities.data.columns"
    :options="{
      showTooltip: false,
      resizeColumn: true,
      rowCount: opportunities.data.row_count,
      totalCount: opportunities.data.total_count,
    }"
    @loadMore="() => loadMore++"
    @columnWidthUpdated="() => triggerResize++"
    @updatePageCount="(count) => (updatedPageCount = count)"
    @applyFilter="(data) => viewControls.applyFilter(data)"
    @applyLikeFilter="(data) => viewControls.applyLikeFilter(data)"
    @likeDoc="(data) => viewControls.likeDoc(data)"
  />
  <div v-else-if="opportunities.data" class="flex h-full items-center justify-center">
    <div
      class="flex flex-col items-center gap-3 text-xl font-medium text-ink-gray-4"
    >
      <OpportunitiesIcon class="h-10 w-10" />
      <span>{{ __('No {0} Found', [__('Opportunities')]) }}</span>
      <Button :label="__('Create')" @click="showOpportunityModal = true">
        <template #prefix><FeatherIcon name="plus" class="h-4" /></template>
      </Button>
    </div>
  </div>
  <OpportunityModal
    v-if="showOpportunityModal"
    v-model="showOpportunityModal"
    v-model:quickEntry="showQuickEntryModal"
    :defaults="defaults"
  />
  <NoteModal
    v-if="showNoteModal"
    v-model="showNoteModal"
    :note="note"
    doctype="Opportunity"
    :doc="docname"
  />
  <ToDoModal
    v-if="showToDoModal"
    v-model="showToDoModal"
    :todo="todo"
    doctype="Opportunity"
    :doc="docname"
  />
  <QuickEntryModal
    v-if="showQuickEntryModal"
    v-model="showQuickEntryModal"
    doctype="Opportunity"
  />
</template>

<script setup>
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import MultipleAvatar from '@/components/MultipleAvatar.vue'
import CustomActions from '@/components/CustomActions.vue'
import EmailAtIcon from '@/components/Icons/EmailAtIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import ToDoIcon from '@/components/Icons/ToDoIcon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import OpportunitiesIcon from '@/components/Icons/OpportunitiesIcon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import OpportunitiesListView from '@/components/ListViews/OpportunitiesListView.vue'
import KanbanView from '@/components/Kanban/KanbanView.vue'
import OpportunityModal from '@/components/Modals/OpportunityModal.vue'
import NoteModal from '@/components/Modals/NoteModal.vue'
import ToDoModal from '@/components/Modals/ToDoModal.vue'
import QuickEntryModal from '@/components/Modals/QuickEntryModal.vue'
import ViewControls from '@/components/ViewControls.vue'
import { globalStore } from '@/stores/global'
import { usersStore } from '@/stores/users'
import { customersStore } from '@/stores/customers'
import { statusesStore } from '@/stores/statuses'
import { callEnabled } from '@/composables/settings'
import {
  dateFormat,
  dateTooltipFormat,
  timeAgo,
  website,
  formatNumberIntoCurrency,
  formatTime,
} from '@/utils'
import { getDefaultView } from '@/utils/view'
import { Tooltip, Avatar, Dropdown, call } from 'frappe-ui'
import { useRoute } from 'vue-router'
import { ref, reactive, computed, h, onBeforeMount, onBeforeUpdate } from 'vue'

const { makeCall } = globalStore()
const { getUser } = usersStore()
const { getCustomer } = customersStore()
const { getDealStatus } = statusesStore()

const route = useRoute()

const opportunitiesListView = ref(null)
const showOpportunityModal = ref(false)
const showQuickEntryModal = ref(false)

const defaults = reactive({})

const hasCreateAccess = ref(false)

call('next_crm.api.doc.check_create_access', {
  doctype: "Opportunity"
}).then((show) => {
  hasCreateAccess.value = show;       
})

const opportunities = ref({})
const loadMore = ref(1)
const triggerResize = ref(1)
const updatedPageCount = ref(20)
const viewControls = ref(null)

function getRow(name, field) {
  function getValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value
    }
    return { label: value }
  }
  return getValue(rows.value?.find((row) => row.name == name)[field])
}

// Rows
const rows = computed(() => {
  if (!opportunities.value?.data?.data) return []
  if (opportunities.value.data.view_type === 'group_by') {
    if (!opportunities.value?.data.group_by_field?.name) return []
    return getGroupedByRows(
      opportunities.value?.data.data,
      opportunities.value?.data.group_by_field,
    )
  } else if (opportunities.value.data.view_type === 'kanban') {
    return getKanbanRows(opportunities.value.data.data)
  } else {
    return parseRows(opportunities.value?.data.data)
  }
})

function getGroupedByRows(listRows, groupByField) {
  let groupedRows = []

  groupByField.options?.forEach((option) => {
    let filteredRows = []

    if (!option) {
      filteredRows = listRows.filter((row) => !row[groupByField.name])
    } else {
      filteredRows = listRows.filter((row) => row[groupByField.name] == option)
    }

    let groupDetail = {
      label: groupByField.label,
      group: option || __(' '),
      collapsed: false,
      rows: parseRows(filteredRows),
    }
    if (groupByField.name == 'status') {
      groupDetail.icon = () =>
        h(IndicatorIcon, {
          class: getDealStatus(option)?.iconColorClass,
        })
    }
    groupedRows.push(groupDetail)
  })

  return groupedRows || listRows
}

function getKanbanRows(data) {
  let _rows = []
  data.forEach((column) => {
    column.data?.forEach((row) => {
      _rows.push(row)
    })
  })
  return parseRows(_rows)
}

function parseRows(rows) {
  return rows.map((opportunity) => {
    let _rows = {}
    opportunities.value.data.rows.forEach((row) => {
      _rows[row] = opportunity[row]

      if (row == 'customer') {
        _rows[row] = {
          label: opportunity.customer,
          logo: getCustomer(opportunity.customer)?.image,
        }
      } else if (row === 'website') {
        _rows[row] = website(opportunity.website)
      } else if (row == 'opportunity_amount') {
        _rows[row] = formatNumberIntoCurrency(
          opportunity.opportunity_amount,
          opportunity.currency,
        )
      } else if (row == 'status') {
        _rows[row] = {
          label: opportunity.status,
          color: getDealStatus(opportunity.status)?.iconColorClass,
        }
      } else if (row == 'sla_status') {
        let value = opportunity.sla_status
        let tooltipText = value
        let color =
          opportunity.sla_status == 'Failed'
            ? 'red'
            : opportunity.sla_status == 'Fulfilled'
              ? 'green'
              : 'orange'
        if (value == 'First Response Due') {
          value = __(timeAgo(opportunity.response_by))
          tooltipText = dateFormat(opportunity.response_by, dateTooltipFormat)
          if (new Date(opportunity.response_by) < new Date()) {
            color = 'red'
          }
        }
        _rows[row] = {
          label: tooltipText,
          value: value,
          color: color,
        }
      } else if (row == 'opportunity_owner') {
        _rows[row] = {
          label: opportunity.opportunity_owner && getUser(opportunity.opportunity_owner).full_name,
          ...(opportunity.opportunity_owner && getUser(opportunity.opportunity_owner)),
        }
      } else if (row == '_assign') {
        let assignees = JSON.parse(opportunity._assign || '[]')
        if (!assignees.length && opportunity.opportunity_owner) {
          assignees = [opportunity.opportunity_owner]
        }
        _rows[row] = assignees.map((user) => ({
          name: user,
          image: getUser(user).user_image,
          label: getUser(user).full_name,
        }))
      } else if (['modified', 'creation'].includes(row)) {
        _rows[row] = {
          label: dateFormat(opportunity[row], dateTooltipFormat),
          timeAgo: __(timeAgo(opportunity[row])),
        }
      } else if (
        ['first_response_time', 'first_responded_on', 'response_by'].includes(
          row,
        )
      ) {
        let field = row == 'response_by' ? 'response_by' : 'first_responded_on'
        _rows[row] = {
          label: opportunity[field] ? dateFormat(opportunity[field], dateTooltipFormat) : '',
          timeAgo: opportunity[row]
            ? row == 'first_response_time'
              ? formatTime(opportunity[row])
              : __(timeAgo(opportunity[row]))
            : '',
        }
      }
    })
    _rows['_email_count'] = opportunity._email_count
    _rows['_note_count'] = opportunity._note_count
    _rows['_todo_count'] = opportunity._todo_count
    _rows['_comment_count'] = opportunity._comment_count
    return _rows
  })
}

function onNewClick(column) {
  let column_field = opportunities.value.params.column_field

  if (column_field) {
    defaults[column_field] = column.column.name
  }

  showOpportunityModal.value = true
}

function actions(itemName) {
  let mobile_no = getRow(itemName, 'mobile_no')?.label || ''
  let actions = [
    {
      icon: h(PhoneIcon, { class: 'h-4 w-4' }),
      label: __('Make a Call'),
      onClick: () => makeCall(mobile_no),
      condition: () => mobile_no && callEnabled.value,
    },
    {
      icon: h(NoteIcon, { class: 'h-4 w-4' }),
      label: __('New Note'),
      onClick: () => showNote(itemName),
    },
    {
      icon: h(ToDoIcon, { class: 'h-4 w-4' }),
      label: __('New ToDo'),
      onClick: () => showToDo(itemName),
    },
  ]
  return actions.filter((action) =>
    action.condition ? action.condition() : true,
  )
}

const docname = ref('')
const showNoteModal = ref(false)
const note = ref({
  title: '',
  content: '',
})

function showNote(name) {
  docname.value = name
  showNoteModal.value = true
}

const showToDoModal = ref(false)
const todo = ref({
  title: '',
  description: '',
  allocated_to: '',
  date: '',
  priority: 'Medium',
  status: 'Open',
})

function showToDo(name) {
  docname.value = name
  showToDoModal.value = true
}

onBeforeMount(() => getDefaultView("Opportunity", route))
onBeforeUpdate(() => getDefaultView("Opportunity", route))
</script>
