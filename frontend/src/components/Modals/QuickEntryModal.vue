<template>
  <Dialog v-model="show" :options="{ size: '4xl' }">
    <template #body-title>
      <h3 class="flex items-center gap-2 text-2xl font-semibold leading-6 text-ink-gray-9">
        <div>{{ __('Edit Quick Entry Layout') }}</div>
        <Badge v-if="dirty" :label="__('Not Saved')" variant="subtle" theme="orange" />
      </h3>
    </template>

    <template #body-content>
      <div class="flex flex-col gap-3">
        <div class="flex justify-between gap-2 items-center">
          <FormControl
            data-cy="quickentry-doctype"
            type="select"
            class="w-1/4"
            v-model="_doctype"
            :options="doctypeOptions"
            @change="reload"
          />

          <div class="flex items-center gap-2">
            <Switch
              v-model="preview"
              :label="preview ? __('Hide preview') : __('Show preview')"
              size="sm"
              data-cy="quickentry-preview"
            />
            <Button
              data-cy="quickentry-reset"
              variant="ghost"
              :label="__('Reset')"
              @click="reload"
            />
          </div>
        </div>

        <div v-if="sections?.data">
          <QuickEntryLayoutBuilder
            v-if="!preview"
            :sections="sections.data"
            :doctype="_doctype"
          />
          <Fields v-else :sections="sections.data" :data="{}" />
        </div>

        <div v-else class="text-sm text-ink-gray-5">{{ __('Loading layout...') }}</div>
      </div>
    </template>

    <template #actions>
      <div class="flex flex-row-reverse gap-2">
        <Button
          data-cy="quickentry-save"
          :loading="loading"
          :label="__('Save')"
          variant="solid"
          @click="saveChanges"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import Fields from '@/components/Fields.vue'
import QuickEntryLayoutBuilder from '@/components/QuickEntryLayoutBuilder.vue'
import { capture } from '@/telemetry'
import { Dialog, Badge, Switch, Button, FormControl, call, createResource } from 'frappe-ui'
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  doctype: { type: String, default: 'Lead' },
})

const show = defineModel()
const _doctype = ref(props.doctype)
const loading = ref(false)
const dirty = ref(false)
const preview = ref(false)

const doctypeOptions = ['Lead', 'Opportunity', 'Prospect', 'Contact', 'Customer', 'Address']

function getParams() {
  return { doctype: _doctype.value, type: 'Quick Entry' }
}

// createResource expects stable params — update sections.params when doctype changes
const sections = createResource({
  url: 'next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['quick-entry-sections'],
  params: getParams(),
  onSuccess(data) {
    // keep a deep copy to detect dirty state later
    sections.originalData = JSON.parse(JSON.stringify(data))
  },
})

// watch for doctype changes and reload the resource
watch(_doctype, (nv, ov) => {
  if (nv === ov) return
  reload()
})

// detect dirty state using deep equality
watch(
  () => sections?.data,
  () => {
    try {
      dirty.value = JSON.stringify(sections?.data) !== JSON.stringify(sections?.originalData)
    } catch (e) {
      dirty.value = true
    }
  },
  { deep: true },
)

function reload() {
  // ensure the params reflect current doctype and then reload
  nextTick(() => {
    sections.params = getParams()
    sections.reload()
  })
}

onMounted(() => {
  // initial load
  reload()
})

async function saveChanges() {
  if (!sections?.data) return

  loading.value = true
  try {
    const _sections = JSON.parse(JSON.stringify(sections.data || []))

    // normalize fields to strings (fieldname or name)
    _sections.forEach((section) => {
      if (!section.fields) {
        section.fields = []
        return
      }
      section.fields = section.fields
        .map((field) => {
          if (!field) return null
          if (typeof field === 'string') return field
          return field.fieldname || field.name || field.value || null
        })
        .filter(Boolean)
    })

    await call('next_crm.ncrm.doctype.crm_fields_layout.crm_fields_layout.save_fields_layout', {
      doctype: _doctype.value,
      type: 'Quick Entry',
      layout: JSON.stringify(_sections),
    })

    // update snapshot and reset dirty
    sections.originalData = JSON.parse(JSON.stringify(sections.data))
    dirty.value = false
    show.value = false
    capture('quick_entry_layout_builder', { doctype: _doctype.value })
  } catch (err) {
    console.error('saveChanges failed', err)
    // surface error to user via toast if frappe-ui provides one, otherwise console
    try {
      // use global frappe.toast if available
      window?.frappe?.show_alert?.({ message: __('Failed to save layout'), indicator: 'danger' })
    } catch {}
    throw err
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.w-1\/4 { width: 25%; }
</style>
