<template>
  <Autocomplete :options="options" value="" @change="(e) => setGroupBy(e)">
    <template #target="{ togglePopover, isOpen }">
      <Button
        :label="
          hideLabel
            ? groupByValue?.label
            : __('Group By: ') + groupByValue?.label
        "
        :iconLeft="DetailsIcon"
        :iconRight="isOpen ? 'chevron-up' : 'chevron-down'"
        @click="togglePopover()"
      />
    </template>
  </Autocomplete>
</template>

<script setup>
import Autocomplete from '@/components/frappe-ui/Autocomplete.vue'
import DetailsIcon from '@/components/Icons/DetailsIcon.vue'
import { createResource } from 'frappe-ui'
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  doctype: {
    type: String,
    required: true,
  },
  hideLabel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update'])

/* list is provided by your app's model system (keeps original pattern) */
const list = defineModel()

/* currently selected group-by value */
const groupByValue = ref({
  label: '',
  fieldname: '',
})

/* fetch available group-by fields from API */
const groupByOptions = createResource({
  url: 'next_crm.api.doc.get_group_by_fields',
  cache: ['groupByOptions', props.doctype],
  params: { doctype: props.doctype },
})

onMounted(() => {
  if (groupByOptions.data?.length) return
  groupByOptions.fetch()
})

/* when user selects option from Autocomplete */
function setGroupBy(data) {
  if (!data?.fieldname) return
  groupByValue.value = data
  // emit fieldname to parent after DOM updates
  nextTick(() => emit('update', data.fieldname))
}

/* computed options: if the list already has a group_by_field use it as current
   and exclude it from the dropdown options (filter by fieldname) */
const options = computed(() => {
  if (!groupByOptions.data) return []
  if (!list.value?.data?.group_by_field) return groupByOptions.data

  // normalize and adopt list's group_by_field if present
  const listGroup = list.value.data.group_by_field
  if (listGroup?.fieldname) {
    groupByValue.value = {
      label: listGroup.label ?? listGroup.fieldname ?? '',
      fieldname: listGroup.fieldname,
    }
  }

  return groupByOptions.data.filter(
    (option) => option.fieldname !== groupByValue.value.fieldname,
  )
})
</script>
