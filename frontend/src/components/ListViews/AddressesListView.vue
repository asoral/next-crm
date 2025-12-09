<template>
  <ListView
    :class="$attrs.class"
    :columns="columns"
    :rows="rows"
    :options="{
      getRowRoute: (row) => ({
        name: 'Address',
        params: { addressId: row.name },
        query: { view: route.query.view, viewType: route.params.viewType },
      }),
      selectable: options.selectable,
      showTooltip: options.showTooltip,
      resizeColumn: options.resizeColumn,
    }"
    row-key="name"
    @update:selections="(selections) => emit('selectionsChanged', selections)"
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

    <!-- Use develop-style ListRows; keep your Address-specific cell UI -->
    <ListRows
      class="mx-3 sm:mx-5"
      :rows="rows"
      v-slot="{ idx, column, item, row }"
      doctype="Address"
      id="list-rows"
    >
      <ListRowItem :item="item" :align="column.align">
        <template #prefix>
          <div v-if="column.key === 'phone'">
            <PhoneIcon class="h-4 w-4" />
          </div>
        </template>

        <template #default="{ label }">
          <!-- Relative timestamps with filter click -->
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
            <Tooltip :text="item?.label">
              <div>{{ item?.timeAgo }}</div>
            </Tooltip>
          </div>

          <!-- Rich text (kept from develop behavior) -->
          <div
            v-else-if="column.type === 'Text Editor'"
            v-html="item"
            class="truncate text-base h-4 [&>p]:truncate"
          />

          <!-- Check fields -->
          <div v-else-if="column.type === 'Check'">
            <FormControl
              type="checkbox"
              :modelValue="item"
              :disabled="true"
              class="text-ink-gray-9"
            />
          </div>

          <!-- Like button -->
          <div v-else-if="column.key === '_liked_by'">
            <Button
              variant="ghosted"
              :class="isLiked(item) ? 'fill-red-500' : 'fill-white'"
              @click.stop.prevent="() => emit('likeDoc', { name: row?.name, liked: isLiked(item) })"
            >
              <HeartIcon class="h-4 w-4" />
            </Button>
          </div>

          <!-- Default clickable cell (applies filter) -->
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
    v-if="pageLengthCount"
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
    doctype="Address"
    :options="{ hideAssign: true }"
  />
</template>

<script setup>
import HeartIcon from '@/components/Icons/HeartIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import ListBulkActions from '@/components/ListBulkActions.vue'
import ListRows from '@/components/ListViews/ListRows.vue'

import {
  ListView,
  ListHeader,
  ListHeaderItem,
  ListSelectBanner,
  ListRowItem,
  ListFooter,
  Tooltip,
  Dropdown,
} from 'frappe-ui'
import { sessionStore } from '@/stores/session'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
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
  'columnWidthUpdated',
  'applyFilter',
  'applyLikeFilter',
  'likeDoc',
  'selectionsChanged',
])

const route = useRoute()

const pageLengthCount = defineModel()
const list = defineModel('list')

const isLikeFilterApplied = computed(() => {
  return !!list.value.params?.filters?._liked_by
})

const { user } = sessionStore()

function isLiked(item) {
  if (!item) return false
  try {
    const likedBy = JSON.parse(item)
    return Array.isArray(likedBy) && likedBy.includes(user)
  } catch {
    return false
  }
}

watch(pageLengthCount, (val, oldVal) => {
  if (val === oldVal) return
  emit('updatePageCount', val)
})

const listBulkActionsRef = ref(null)

defineExpose({
  customListActions: computed(() => listBulkActionsRef.value?.customListActions),
})
</script>
