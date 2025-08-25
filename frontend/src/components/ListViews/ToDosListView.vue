<template>
  <ListView
    :columns="columns"
    :rows="rows"
    :options="{
      onRowClick: (row) => emit('showToDo', row.name),
      selectable: options.selectable,
      showTooltip: options.showTooltip,
      resizeColumn: options.resizeColumn,
    }"
    row-key="name"
  >
    <ListHeader class="mx-3 sm:mx-5" @columnWidthUpdated="emit('columnWidthUpdated')">
      <ListHeaderItem
        v-for="column in columns"
        :key="column.key"
        :item="column"
        @columnWidthUpdated="emit('columnWidthUpdated', column)"
      >
        <Button
          v-if="column.key == '_liked_by'"
          variant="ghosted"
          class="!h-4"
          :class="isLikeFilterApplied ? 'fill-red-500' : 'fill-white'"
          @click="() => emit('applyLikeFilter')"
        >
          <HeartIcon class="h-4 w-4" />
        </Button>
      </ListHeaderItem>
    </ListHeader>

<ListRows class="mx-3 sm:mx-5" id="list-rows">
  <template v-for="(row, index) in rows" :key="row.name || row.groupLabel">
    <!-- Group Header Row -->
    <div
      v-if="row.isGroup"
      class="py-2 px-6 font-medium text-base text-ink-gray-6 flex items-center cursor-pointer select-none"
      @click="toggleGroup(row.groupLabel)"
    >
      <!-- Arrow icon (rotates when open) -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 16 16"
  fill="none"
  class="h-4 w-4 text-ink-gray-6 mr-2 transition-transform duration-200"
  :class="{ 'rotate-180': isGroupOpen(row.groupLabel) }"
>
  <path
    fill="currentColor"
    d="M4.293 5.28h7.413a.5.5 0 0 1 .41.787l-3.707 5.295a.5.5 0 0 1-.82 0L3.884 6.067a.5.5 0 0 1 .41-.787Z"
  />
</svg>
      {{ row.groupLabel }}
    </div>

    <!-- Actual ToDo Row -->
    <ListRow
      v-else
      v-show="isGroupOpen(getGroupLabelForRow(index))"
      :row="row"
      v-slot="{ idx, column, item }"
    >
      <div v-if="column.key === 'date'">
        <Tooltip :text="item && dateFormat(item, 'ddd, MMM D, YYYY')">
          <div class="flex items-center gap-2 truncate text-base">
            <div><CalendarIcon /></div>
            <div v-if="item" class="truncate">
              {{ dateFormat(item, 'D MMM, YYYY') }}
            </div>
          </div>
        </Tooltip>
      </div>

      <ListRowItem v-else :item="item">
        <template #prefix>
          <div v-if="column.key === 'status'">
            <ToDoStatusIcon :status="item" />
          </div>
          <div v-else-if="column.key === 'priority'">
            <ToDoPriorityIcon :priority="item" />
          </div>
          <div v-else-if="column.key === 'allocated_to'">
            <Avatar
              v-if="item.full_name"
              class="flex items-center"
              :image="item.user_image"
              :label="item.full_name"
              size="sm"
            />
          </div>
        </template>
        <template #default="{ label }">
          <div
            v-if="['modified', 'creation'].includes(column.key)"
            class="truncate text-base"
            @click="
              (event) =>
                emit('applyFilter', {
                  event,
                  idx,
                  column,
                  item,
                  firstColumn: columns[0],
                })
            "
          >
            <Tooltip :text="item.label">
              <div>{{ item.timeAgo }}</div>
            </Tooltip>
          </div>
          <div
            v-else-if="column.type === 'Text Editor'"
            v-html="item"
            class="truncate text-base h-4 [&>p]:truncate"
          />
          <div v-else-if="column.type === 'Check'">
            <FormControl type="checkbox" :modelValue="item" :disabled="true" class="text-ink-gray-9" />
          </div>
          <div v-else-if="column.key === '_liked_by'">
            <Button
              v-if="column.key == '_liked_by'"
              variant="ghosted"
              :class="isLiked(item) ? 'fill-red-500' : 'fill-white'"
              @click.stop.prevent="() => emit('likeDoc', { name: row.name, liked: isLiked(item) })"
            >
              <HeartIcon class="h-4 w-4" />
            </Button>
          </div>
          <div
            v-else
            class="truncate text-base"
            @click="
              (event) =>
                emit('applyFilter', {
                  event,
                  idx,
                  column,
                  item,
                  firstColumn: columns[0],
                })
            "
          >
            {{ label }}
          </div>
        </template>
      </ListRowItem>
    </ListRow>
  </template>
</ListRows>

    <ListSelectBanner>
      <template #actions="{ selections, unselectAll }">
        <Dropdown :options="listBulkActionsRef.bulkActions(selections, unselectAll)">
          <Button icon="more-horizontal" variant="ghost" />
        </Dropdown>
      </template>
    </ListSelectBanner>
  </ListView>

  <ListFooter
    class="border-t px-3 py-2 sm:px-5"
    v-model="pageLengthCount"
    :options="{
      rowCount: options.rowCount,
      totalCount: options.totalCount,
    }"
    @loadMore="emit('loadMore')"
  />

  <ListBulkActions
    ref="listBulkActionsRef"
    v-model="list"
    doctype="ToDo"
    :options="{
      hideAssign: true,
    }"
  />
</template>

<script setup>
import HeartIcon from '@/components/Icons/HeartIcon.vue'
import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import ListBulkActions from '@/components/ListBulkActions.vue'
import { dateFormat } from '@/utils'
import {
  Avatar,
  ListView,
  ListHeader,
  ListHeaderItem,
  ListRows,
  ListRow,
  ListSelectBanner,
  ListRowItem,
  ListFooter,
  Dropdown,
  Tooltip,
} from 'frappe-ui'
import { sessionStore } from '@/stores/session'
import { ref, computed, watch } from 'vue'
import { reactive } from 'vue'

// reactive object to store open/close state of groups by groupLabel
const openGroups = reactive({})

// toggle open state on click
function toggleGroup(groupLabel) {
  openGroups[groupLabel] = !openGroups[groupLabel]
}

// check if group is open (default open if undefined)
function isGroupOpen(groupLabel) {
  return openGroups[groupLabel] !== false  // open by default
}

// find groupLabel for a row by looking backward through rows
function getGroupLabelForRow(rowIndex) {
  for (let i = rowIndex - 1; i >= 0; i--) {
    if (props.rows[i].isGroup) return props.rows[i].groupLabel
  }
  return null
}

const props = defineProps({
  rows: {
    type: Array,
    required: true,
  },
  columns: {
    type: Array,
    required: true,
  },
  options: {
    type: Object,
    default: () => ({
      selectable: true,
      showTooltip: true,
      resizeColumn: false,
      totalCount: 0,
      rowCount: 0,
    }),
  },
})

const emit = defineEmits([
  'loadMore',
  'updatePageCount',
  'showToDo',
  'columnWidthUpdated',
  'applyFilter',
  'applyLikeFilter',
  'likeDoc',
])

const pageLengthCount = defineModel()
const list = defineModel('list')

const isLikeFilterApplied = computed(() => {
  return list.value.params?.filters?._liked_by ? true : false
})

const { user } = sessionStore()

function isLiked(item) {
  if (item) {
    let likedByMe = JSON.parse(item)
    return likedByMe.includes(user)
  }
}

watch(pageLengthCount, (val, old_value) => {
  if (val === old_value) return
  emit('updatePageCount', val)
})

const listBulkActionsRef = ref(null)

defineExpose({
  customListActions: computed(() => listBulkActionsRef.value?.customListActions),
})
</script>
