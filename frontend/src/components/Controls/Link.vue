<template>
  <div class="space-y-1.5 p-[2px] -m-[2px] truncate">
    <label class="block" :class="labelClasses" v-if="attrs.label">
      {{ __(attrs.label) }}
    </label>

    <Autocomplete
      ref="autocomplete"
      :options="options.data ?? []"
      v-model="value"
      :size="attrs.size || 'sm'"
      :variant="attrs.variant"
      :placeholder="attrs.placeholder"
      :disabled="attrs.disabled"
      :placement="attrs.placement"
      :filterable="false"
      :multiple="props.multiple"
      @update:query="onQueryUpdate"
    >
      <!-- keep target slot API -->
      <template #target="{ open, togglePopover }">
        <slot name="target" v-bind="{ open, togglePopover }" />
      </template>

      <template #prefix>
        <slot name="prefix" />
      </template>

      <template #item-prefix="{ active, selected, option }">
        <slot name="item-prefix" v-bind="{ active, selected, option }" />
      </template>

      <template #item-label="{ active, selected, option }">
        <slot name="item-label" v-bind="{ active, selected, option }">
          <div v-if="option.description" class="flex flex-col gap-1">
            <div class="flex-1 font-semibold truncate text-ink-gray-7">
              {{ option.label }}
            </div>
            <div class="flex-1 text-sm truncate text-ink-gray-5">
              {{ option.description }}
            </div>
          </div>
          <div v-else class="flex-1 truncate text-ink-gray-7">
            {{ option.label }}
          </div>
        </slot>
      </template>

      <!-- footer supports both 'close' (develop) and 'togglePopover' (custom) -->
      <template #footer="{ value, close, togglePopover }">
        <div v-if="attrs.onCreate">
          <Button
            variant="ghost"
            class="w-full !justify-start"
            :label="__('Create New')"
            iconLeft="plus"
            @click="() => attrs.onCreate(value, close || togglePopover)"
          />
        </div>
        <div>
          <Button
            variant="ghost"
            class="w-full !justify-start"
            :label="__('Clear')"
            iconLeft="x"
            @click="() => clearValue(close || togglePopover)"
          />
        </div>
      </template>
    </Autocomplete>
  </div>
</template>

<script setup>
import Autocomplete from './Autocomplete.vue'
import { watchDebounced } from '@vueuse/core'
import { createResource, Button } from 'frappe-ui'
import { useAttrs, computed, ref, watch } from 'vue'

const props = defineProps({
  doctype: { type: String, required: true },
  filters: { type: [Array, Object, String], default: [] },
  modelValue: { type: [String, Array], default: '' },
  hideMe: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])
const attrs = useAttrs()

/** detect external v-model via :value to stay backward-compatible */
const valuePropPassed = computed(() => 'value' in attrs)

/** v-model adapter (single + multiple) */
const value = computed({
  get: () => {
    if (props.multiple) {
      const v = valuePropPassed.value ? attrs.value : props.modelValue
      if (v === '') return v
      return Array.isArray(v) ? v : v ? [v] : []
    } else {
      return valuePropPassed.value ? attrs.value : props.modelValue
    }
  },
  set: (val) => {
    if (props.multiple) {
      if (Array.isArray(val)) {
        const filtered = val.filter(
          (v) => v && v.value !== undefined && v.value !== null && v.value !== ''
        )
        emit(valuePropPassed.value ? 'change' : 'update:modelValue', filtered.map((v) => v.value))
      } else {
        emit(valuePropPassed.value ? 'change' : 'update:modelValue', [])
      }
    } else {
      emit(valuePropPassed.value ? 'change' : 'update:modelValue', val?.value)
    }
  },
})

const autocomplete = ref(null)
const text = ref('')
const query = ref('')

function onQueryUpdate(val) {
  query.value = val
}

/** debounced query watcher (load immediately on mount) */
watchDebounced(
  query,
  (val) => {
    const q = val || ''
    if (text.value === q) return
    text.value = q
    reload(q)
  },
  { debounce: 300, immediate: true }
)

/** refresh when doctype/filters/hideMe changes */
watchDebounced(
  () => [props.doctype, props.hideMe, JSON.stringify(props.filters)],
  () => reload(''),
  { debounce: 300, immediate: true }
)

/** resource to frappe search_link */
const options = createResource({
  url: 'frappe.desk.search.search_link',
  cache: () => [props.doctype, text.value, props.hideMe, JSON.stringify(props.filters)],
  method: 'POST',
  params: () => ({
    txt: text.value,
    doctype: props.doctype,
    filters: parse_filters(props.filters),
    page_length: 20,
  }),
  transform: (data) => {
    // normalize + include description (develop), fallback label
    let allData = (data || []).map((option) => ({
      label: option.label || option.value,
      value: option.value,
      description: option.description,
    }))

    // de-duplicate by 'value'
    const seen = new Set()
    allData = allData.filter((o) => (o && !seen.has(o.value) ? (seen.add(o.value), true) : false))

    // @me for Users (unless hideMe)
    if (!props.hideMe && props.doctype === 'User') {
      allData.unshift({ label: '@me', value: '@me' })
    }
    return allData
  },
})

function parse_filters(link_filters) {
  let parsed = link_filters
  if (typeof link_filters === 'string') {
    try {
      parsed = JSON.parse(link_filters)
    } catch {
      parsed = []
    }
  }
  if (!Array.isArray(parsed)) return parsed
  const filters = {}
  parsed.forEach((f) => {
    const [_, fieldname, operator, value] = f || []
    if (!fieldname) return
    if (value?.startsWith?.('eval:')) return
    filters[fieldname] = [operator, value]
  })
  return filters
}

function reload(val) {
  if (!props.doctype) return
  // avoid redundant reload if query + doctype unchanged and we already have data
  if (options.data?.length && val === options.params?.txt && props.doctype === options.params?.doctype) return

  options.update({
    params: {
      txt: val,
      doctype: props.doctype,
      filters: parse_filters(props.filters),
      page_length: 20,
    },
  })
  options.reload()
}

function clearValue(close) {
  emit(valuePropPassed.value ? 'change' : 'update:modelValue', props.multiple ? [] : '')
  close?.()
}

const labelClasses = computed(() => {
  return [
    { sm: 'text-xs', md: 'text-base' }[attrs.size || 'sm'],
    'text-ink-gray-5',
  ]
})
</script>
