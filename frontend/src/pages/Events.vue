<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs v-model="viewControls" routeName="Events" />
    </template>
    <template #right-header>
      <CustomActions
        v-if="eventsListView?.customListActions"
        :actions="eventsListView.customListActions"
      />
      <Button variant="solid" :label="__('Create')" @click="createEvent">
        <template #prefix><FeatherIcon name="plus" class="h-4" /></template>
      </Button>
    </template>
  </LayoutHeader>
  <ViewControls
    ref="viewControls"
    v-model="events"
    v-model:loadMore="loadMore"
    v-model:resizeColumn="triggerResize"
    v-model:updatedPageCount="updatedPageCount"
    doctype="Event"
    :options="{
      allowedViews: ['list', 'kanban', 'group_by'],
    }"
  />
  <KanbanView
    v-if="$route.params.viewType == 'kanban' && rows.length"
    v-model="events"
    :options="{
      onClick: (row) => showEvent(row.name),
      onNewClick: (column) => createEvent(column),
    }"
    @update="(data) => viewControls.updateKanbanSettings(data)"
    @loadMore="(columnName) => viewControls.loadMoreKanban(columnName)"
  >
   
     <template #title="{ titleField, itemName }">
      <div class="flex items-center gap-2">
        <div v-if="titleField === 'status'">
          <EventStatusIcon :status="getRow(itemName, titleField).label" />
        </div>
        <div v-else-if="titleField === 'allocated_to'">
          <Avatar
            v-if="getRow(itemName, titleField).full_name"
            class="flex items-center"
            :image="getRow(itemName, titleField).user_image"
            :label="getRow(itemName, titleField).full_name"
            size="sm"
          />
        </div>
        <div
          v-if="['starts_on', 'ends_on', 'modified', 'creation'].includes(titleField)"
          class="truncate text-base"
        >
          <Tooltip :text="getRow(itemName, titleField).label">
            <div>{{ getRow(itemName, titleField).timeAgo }}</div>
          </Tooltip>
        </div>
        <div
          v-else-if="getRow(itemName, titleField).label"
          class="truncate text-base"
        >
          {{ getRow(itemName, titleField).label }}
        </div>
        <div class="text-ink-gray-4" v-else>{{ __('No Title') }}</div>
      </div>
    </template>
    <template #fields="{ fieldName, itemName }">
      <div
        v-if="getRow(itemName, fieldName).label"
        class="truncate flex items-center gap-2"
      >
        <div v-if="fieldName === 'status'">
          <EventStatusIcon
            class="size-3"
            :status="getRow(itemName, fieldName).label"
          />
        </div>
        <div v-else-if="fieldName === 'event_type'">
          <div class="flex items-center gap-1">
            <LockIcon v-if="getRow(itemName, fieldName).label === 'Private'" class="h-3 w-3" />
            <GlobeIcon v-else class="h-3 w-3" />
            {{ getRow(itemName, fieldName).label }}
          </div>
        </div>
        <div v-else-if="fieldName === 'allocated_to'">
          <Avatar
            v-if="getRow(itemName, fieldName).full_name"
            class="flex items-center"
            :image="getRow(itemName, fieldName).user_image"
            :label="getRow(itemName, fieldName).full_name"
            size="sm"
          />
        </div>
       <div v-if="['starts_on','ends_on','modified','creation'].includes(fieldName)">
  <Tooltip :text="getRow(itemName, fieldName)?.label">
    <div>{{ getRow(itemName, fieldName)?.timeAgo }}</div>
  </Tooltip>
</div>


<div v-else>
  {{ getRow(itemName, fieldName)?.label }}
</div>

      </div>
    </template>
    <template #actions="{ itemName }">
      <div class="flex gap-2 items-center justify-between">
        <div>
          <Button
            class="-ml-2"
            v-if="getRow(itemName, 'reference_docname').label"
            variant="ghost"
            size="sm"
            :label="
              getRow(itemName, 'reference_type').label == 'Opportunity'
                ? __('Opportunity')
                : __('Lead')
            "
            @click.stop="
              redirect(
                getRow(itemName, 'reference_type').label,
                getRow(itemName, 'reference_docname').label,
              )
            "
          >
            <template #suffix>
              <ArrowUpRightIcon class="h-4 w-4" />
            </template>
          </Button>
        </div>
        <Dropdown
          class="flex items-center gap-2"
          :options="actions(itemName)"
          variant="ghost"
          @click.stop.prevent
        >
          <Button icon="more-horizontal" variant="ghost" />
        </Dropdown>
      </div>
    </template>
  </KanbanView>
  <EventsListView
    ref="eventsListView"
    v-else-if="events.data && rows.length"
    v-model="events.data.page_length_count"
    v-model:list="events"
    :rows="rows"
    :columns="events.data.columns"
    :options="{
      showTooltip: false,
      resizeColumn: true,
      rowCount: events.data.row_count,
      totalCount: events.data.total_count,
    }"
    @loadMore="() => loadMore++"
    @columnWidthUpdated="() => triggerResize++"
    @updatePageCount="(count) => (updatedPageCount = count)"
    @showEvent="showEvent"
    @applyFilter="(data) => viewControls.applyFilter(data)"
    @applyLikeFilter="(data) => viewControls.applyLikeFilter(data)"
    @likeDoc="(data) => viewControls.likeDoc(data)"
  />
  <div v-else-if="events.data" class="flex h-full items-center justify-center">
    <div
      class="flex flex-col items-center gap-3 text-xl font-medium text-ink-gray-4"
    >
      <CalendarIcon class="h-10 w-10" />
      <span>{{ __('No {0} Found', [__('Events')]) }}</span>
      <Button :label="__('Create')" @click="showEventModal = true">
        <template #prefix><FeatherIcon name="plus" class="h-4" /></template>
      </Button>
    </div>
  </div>
  
  <!-- Improved Event Modal with better handling -->
  <EventModal
    v-if="showEventModal"
    v-model="showEventModal"
    :event="selectedEvent"
    v-model:reloadEvents="reloadEvents"
  />
</template>

<script setup>
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import CustomActions from '@/components/CustomActions.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import LockIcon from '@/components/Icons/LockIcon.vue'
import GlobeIcon from '@/components/Icons/GlobeIcon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import ViewControls from '@/components/ViewControls.vue'
import EventsListView from '@/components/ListViews/EventsListView.vue'
import KanbanView from '@/components/Kanban/KanbanView.vue'
import EventModal from '@/components/Modals/EventModal.vue'
import { usersStore } from '@/stores/users'
import { dateFormat, dateTooltipFormat, timeAgo, createToast } from '@/utils'
import { Tooltip, Avatar, TextEditor, Dropdown, call } from 'frappe-ui'
import { computed, ref, onBeforeMount, onBeforeUpdate } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDefaultView } from '@/utils/view'

// const demoVar = "CRM-LEAD-2025-00001"
const { getUser } = usersStore()
const router = useRouter()
const route = useRoute()

const eventsListView = ref(null)
const events = ref({})
const loadMore = ref(1)
const triggerResize = ref(1)
const updatedPageCount = ref(20)
const viewControls = ref(null)
const showEventModal = ref(false)
const selectedEvent = ref({})

// For reloading events after create/update
const reloadEvents = ref({
  reload: () => {
    if (events.value?.reload) {
      events.value.reload()
    }
  }
})


// function openEventModal(event) {
//   selectedEvent.value = { ...event }
//   showEventModal.value = true
// }

function getRow(name, field) {
  function getValue(value) {
    if (value && typeof value === 'object') return value
    return { label: value }
  }
  const row = rows.value?.find((row) => row.name == name)
  return row ? getValue(row[field]) : { label: '' }
}

const rows = computed(() => {
  if (!events.value?.data?.data) return []

  const viewType = events.value.data.view_type
  const groupByField = events.value?.data.group_by_field

  if (viewType === 'group_by' && groupByField?.name) {
    const groupedRows = getGroupedByRows(events.value.data.data, groupByField)

    // Flatten grouped rows with headers
    return groupedRows.flatMap((group) => {
      const headerRow = {
        isGroup: true,
        groupLabel: `${groupByField.label} - ${group.group || __('Empty')}`,
        groupKey: group.group,
        collapsed: false,
      }

      const childRows = group.rows.map((row) => ({
        ...row,
        _group: group.group,
      }))

      return [headerRow, ...childRows]
    })
  }

  if (viewType === 'kanban') {
    return getKanbanRows(events.value.data.data)
  }

  return parseRows(events.value?.data.data)
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
  if (!rows) return [];

  return rows.map((event, idx) => {
    let _rows = { ...event };
    _rows.name = event.name;

    events.value?.data.rows.forEach((row) => {
      if (row === 'name') return;

      if (['starts_on', 'ends_on', 'modified', 'creation'].includes(row)) {
        const dateVal = event[row] || null;
        _rows[row] = dateVal
          ? {
              label: dateFormat(dateVal, dateTooltipFormat),
              timeAgo: __(timeAgo(dateVal)),
            }
          : { label: '', timeAgo: '' };
      } 
      else if (row === 'allocated_to') {
        _rows[row] = {
          label: event.allocated_to && getUser(event.allocated_to).full_name,
          ...(event.allocated_to && getUser(event.allocated_to)),
        };
      } 
      else if (row === 'event_type') {
        _rows[row] = {
          label: event.event_type,
          icon: event.event_type === 'Private' ? 'lock' : 'globe'
        };
      } 
      else {
        const val = event[row];
        _rows[row] =
          typeof val === 'object' && val !== null
            ? val
            : { label: (val ?? '').toString().replace(/<[^>]*>/g, '') };
      }
    });

    return _rows;
  });
}




async function getEventData(name) {
  // console.log("🔍 Fetching Event with name:", name)

  try {
    const eventValue = await call('frappe.client.get', {
      doctype: 'Event',
      name: name,
    })
    // console.log("✅ Event fetched:", eventValue)
    return eventValue
  } catch (error) {
    console.error("❌ Failed to fetch Event:", error)
    return null
  }
}



async function showEvent(name) {
  const event = rows.value?.find((row) => row.name === name)
  const fullEvent = await getEventData(event.name?.label || event.name)

    selectedEvent.value = {
      name: fullEvent.name?.label || fullEvent.name,
      subject: fullEvent.subject?.label || fullEvent.subject,
      description: fullEvent.description?.label || fullEvent.description,
      allocated_to: fullEvent.allocated_to?.name || fullEvent.allocated_to,
      starts_on: fullEvent.starts_on?.label || fullEvent.starts_on,
      ends_on: fullEvent.ends_on?.label || fullEvent.ends_on,
      status: fullEvent.status?.label || fullEvent.status,
      event_type: fullEvent.event_type?.label || fullEvent.event_type,
      event_category: fullEvent.event_category?.label || fullEvent.event_category,
      reference_type: fullEvent.reference_type?.label || fullEvent.reference_type,
      reference_docname:fullEvent.reference_docname?.label || fullEvent.reference_docname,
      event_participants: fullEvent.event_participants || [],
    }
    // console.log("-===0=-jkdjksnd ",selectedEvent.value)
    showEventModal.value = true
  }

function createEvent(column) {
  selectedEvent.value = {
    name: '',
    subject: '',
    description: '',
    allocated_to: '',
    starts_on: '',
    ends_on: '',
    status: 'Open',
    event_type: 'Public',
    event_category: 'Event',
    reference_type: '',
    reference_docname: '',
    event_participants: [],
  }

  if (column?.column?.name) {
    let column_field = events.value.params.column_field
    if (column_field) {
      selectedEvent.value[column_field] = column.column.name
    }
  }

  showEventModal.value = true
}

function actions(name) {
  return [
    {
      label: __('Delete'),
      icon: 'trash-2',
      onClick: () => {
        deleteEvent(name)
        events.value.reload()
      },
    },
  ]
}

async function deleteEvent(name) {
  await call('frappe.client.delete', {
    doctype: 'Event',
    name,
  })
}


function redirect(doctype, docname) {
  if (!docname) return
  let name = doctype == 'Opportunity' ? 'Opportunity' : 'Lead'
  let params = { leadId: docname }
  if (name == 'Opportunity') {
    params = { opportunityId: docname }
  }
  router.push({ name: name, params: params })
}

onBeforeMount(() => getDefaultView("Event", route))
onBeforeUpdate(() => getDefaultView("Event", route))
</script>