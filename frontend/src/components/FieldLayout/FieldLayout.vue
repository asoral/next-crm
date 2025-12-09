<template>
  <div class="field-layout">
    <!-- Tabs layout -->
    <div v-if="tabs && tabs.length" class="space-y-4">
      <div
        v-for="(tab, ti) in tabs"
        :key="tab.name || tab.label || ti"
        class="tab space-y-3"
      >
        <h3
          v-if="tab.label"
          class="tab-label text-base font-semibold text-ink-gray-9"
        >
          {{ tab.label }}
        </h3>

        <div
          v-for="(section, si) in tab.sections || []"
          :key="section.name || section.label || si"
          class="section space-y-2"
        >
          <div
            v-if="section.label"
            class="section-label text-sm font-medium text-ink-gray-7"
          >
            {{ section.label }}
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div
              v-for="(column, ci) in section.columns || []"
              :key="column.name || ci"
              class="space-y-2"
            >
              <div
                v-for="(field, fi) in visibleFields(column.fields)
                  "
                :key="field.fieldname || fi"
                class="field space-y-1.5"
              >
                <!-- protect against malformed field -->
                <template v-if="field && field.fieldname">
                  <!-- Label -->
                  <label
                    v-if="field.label"
                    class="block text-xs font-medium text-ink-gray-7"
                    :for="fieldId(field)"
                  >
                    {{ field.label }}
                    <span v-if="field.reqd" class="text-ink-red-4">*</span>
                  </label>

                  <!-- Control -->
                  <div>
                    <!-- Boolean / Check -->
                    <label
                      v-if="field.fieldtype === 'Check'"
                      class="inline-flex items-center gap-2 text-sm text-ink-gray-8 cursor-pointer"
                    >
                      <input
                        :id="fieldId(field)"
                        type="checkbox"
                        :disabled="isReadOnly(field)"
                        class="h-4 w-4 rounded border-outline-gray-2 text-ink-primary focus:ring-2 focus:ring-outline-gray-3"
                        v-model="localData[field.fieldname]"
                        @change="onFieldChange(field)"
                        :aria-checked="!!localData[field.fieldname]"
                      />
                      <span>{{ field.label }}</span>
                    </label>

                    <!-- Select -->
                    <select
                      v-else-if="field.fieldtype === 'Select'"
                      :id="fieldId(field)"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @change="onFieldChange(field)"
                      :aria-label="field.label || field.fieldname"
                    >
                      <option value="">{{ field.placeholder || __('Select...') }}</option>
                      <option v-for="opt in parseOptions(field.options)" :key="opt" :value="opt">{{ opt }}</option>
                    </select>

                    <!-- Multiline text -->
                    <textarea
                      v-else-if="['Text', 'Long Text', 'Small Text', 'Code'].includes(field.fieldtype)"
                      :id="fieldId(field)"
                      rows="3"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :placeholder="field.placeholder || field.label || field.fieldname"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                    />

                    <!-- Numeric -->
                    <input
                      v-else-if="['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)"
                      :id="fieldId(field)"
                      type="number"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :placeholder="field.placeholder || field.label || field.fieldname"
                      :disabled="isReadOnly(field)"
                      v-model.number="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                      :aria-valuemin="field.min || null"
                      :aria-valuemax="field.max || null"
                    />

                    <!-- Date / Datetime / Time -->
                    <input
                      v-else-if="field.fieldtype === 'Date'"
                      :id="fieldId(field)"
                      type="date"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                    />

                    <input
                      v-else-if="field.fieldtype === 'Datetime'"
                      :id="fieldId(field)"
                      type="datetime-local"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                    />

                    <input
                      v-else-if="field.fieldtype === 'Time'"
                      :id="fieldId(field)"
                      type="time"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                    />

                    <!-- Fallback: simple text input -->
                    <input
                      v-else
                      :id="fieldId(field)"
                      type="text"
                      class="w-full rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 text-sm text-ink-gray-9 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
                      :placeholder="field.placeholder || field.label || field.fieldname"
                      :disabled="isReadOnly(field)"
                      v-model="localData[field.fieldname]"
                      @input="onFieldChange(field)"
                    />
                  </div>

                  <!-- Description -->
                  <p v-if="field.description" class="text-[11px] leading-snug text-ink-gray-5">
                    {{ field.description }}
                  </p>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No tabs / empty state -->
    <div v-else class="no-fields text-sm text-ink-gray-6">{{ __('No fields to display.') }}</div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  tabs: { type: Array, default: () => [] },
  data: { type: Object, default: () => ({}) },
  doctype: { type: String, default: '' },
})

const emit = defineEmits(['update:data', 'change'])

// local reactive copy
const localData = reactive({ ...props.data })

// sync from parent when props.data changes
watch(
  () => props.data,
  (v) => {
    const value = v || {}
    Object.keys(localData).forEach((k) => delete localData[k])
    Object.assign(localData, value)
  },
  { deep: true }
)

// emit updates whenever localData changes
watch(
  () => ({ ...localData }),
  (v) => {
    emit('update:data', v)
    emit('change', v)
  },
  { deep: true }
)

// helpers
const visibleFields = (fields = []) => {
  if (!Array.isArray(fields)) return []
  return fields.filter((f) => {
    if (!f) return false
    if (['Section Break', 'Column Break', 'Tab Break'].includes(f.fieldtype)) return false
    if (f.hidden) return false
    return true
  })
}

const fieldId = (field) => `${props.doctype || 'doc'}-${field.fieldname || field.label || ''}`
const isReadOnly = (field) => !!field.read_only

const parseOptions = (opts) => {
  if (!opts) return []
  if (Array.isArray(opts)) return opts
  if (typeof opts === 'string') {
    return opts
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

// explicit change handler (useful for analytics or cleaning values per field)
function onFieldChange(field) {
  if (!field || !field.fieldname) return
  // you can add coercion/validation here if needed
  // e.g. trim strings, clamp numbers, format dates
}
</script>

<style scoped>
.field-layout { padding: 0.75rem 0.5rem }
.tab-label { color: #0f172a }
.section-label { color: #334155 }
</style>
