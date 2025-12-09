<template>
  <Dialog v-model="show" :options="{ size: '3xl' }">
    <template #body-title>
      <h3
        class="flex items-center gap-2 text-2xl font-semibold leading-6 text-ink-gray-9"
      >
        <div>{{ __('Edit Quick Entry Layout') }}</div>
        <Badge
          v-if="dirty"
          :label="__('Not Saved')"
          variant="subtle"
          theme="orange"
        />
      </h3>
    </template>
    <template #body-content>
      <div class="flex flex-col gap-3">
        <div class="flex justify-between gap-2">
          <FormControl
            type="select"
            class="w-1/4"
            v-model="_doctype"
            :options="[
              'Lead',
              'Opportunity',
              'Prospect',
              'Contact',
              'Customer',
              'Address',
            ]"
          />
          <Switch
            v-model="preview"
            :label="preview ? __('Hide preview') : __('Show preview')"
            size="sm"
          />
        </div>
        <div v-if="sections?.data">
          <QuickEntryLayoutBuilder
            v-if="!preview"
            :sections="sections.data"
            :doctype="_doctype"
          />
          <Fields v-else :sections="sections.data" :data="{}" />
        </div>
      </div>
    </template>
    <template #actions>
      <div class="flex flex-row-reverse gap-2">
        <Button
          :loading="loading"
          :label="__('Save')"
          variant="solid"
          @click="saveChanges"
        />
        <Button :label="__('Reset')" @click="reload" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import Fields from '@/components/Fields.vue'
import QuickEntryLayoutBuilder from '@/components/QuickEntryLayoutBuilder.vue'
import { capture } from '@/telemetry'
import {
  Dialog,
  Badge,
  Switch,
  call,
  createResource,
  FormControl,
  Button,
} from 'frappe-ui'
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  doctype: {
    type: String,
    default: 'Lead',
  },
})

const show = defineModel()
const _doctype = ref(props.doctype)
const loading = ref(false)
const dirty = ref(false)
const preview = ref(false)
const originalData = ref(null)

function getParams() {
  return { doctype: _doctype.value, type: 'Quick Entry' }
}

const sections = createResource({
  url: 'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['quick-entry-sections', _doctype.value],
  params: getParams(),
  onSuccess(data) {
    // Create a deep copy for comparison to avoid reference issues
    originalData.value = JSON.parse(JSON.stringify(data))
    dirty.value = false
  },
})

// Reload when doctype changes in dropdown
watch(_doctype, () => {
  reload()
})

watch(
  () => sections.data,
  (newData) => {
    if (!newData || !originalData.value) return
    dirty.value = JSON.stringify(newData) !== JSON.stringify(originalData.value)
  },
  { deep: true }
)

onMounted(() => {
  reload()
})

function reload() {
  nextTick(() => {
    sections.params = getParams()
    sections.reload()
  })
}

function saveChanges() {
  if (!sections.data) return

  let _sections = JSON.parse(JSON.stringify(sections.data))
  
  // Clean up fields structure for backend
  _sections.forEach((section) => {
    if (!section.fields) return
    section.fields = section.fields.map(
      (field) => field.fieldname || field.name
    )
  })

  loading.value = true
  
  call(
    'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.save_fields_layout',
    {
      doctype: _doctype.value,
      type: 'Quick Entry',
      layout: JSON.stringify(_sections),
    }
  )
    .then(() => {
      loading.value = false
      show.value = false
      capture('quick_entry_layout_builder', { doctype: _doctype.value })
      // Update original data so it doesn't show as dirty if reopened immediately
      originalData.value = JSON.parse(JSON.stringify(sections.data))
    })
    .catch((error) => {
      loading.value = false
      console.error('Failed to save layout:', error)
    })
}
</script>