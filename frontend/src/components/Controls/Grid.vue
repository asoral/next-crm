<template>
  <div class="flex flex-col flex-1 text-base">
    <div v-if="label" class="mb-1.5 text-sm text-ink-gray-5">
      {{ __(label) }}
    </div>

    <div v-if="activeFields?.length" class="rounded border border-outline-gray-modals">
      <!-- Header -->
      <div class="grid-header flex items-center rounded-t-[7px] bg-surface-gray-2 text-ink-gray-5 truncate">
        <!-- Master checkbox -->
        <div class="inline-flex items-center justify-center border-r border-outline-gray-2 h-8 p-2 w-12">
          <Checkbox
            class="cursor-pointer duration-300"
            :modelValue="allRowsSelected"
            @click.stop="toggleSelectAllRows($event.target.checked)"
          />
        </div>

        <!-- Sr. No. -->
        <div class="inline-flex items-center justify-center border-r border-outline-gray-2 py-2 px-1 w-12">
          {{ __('No') }}
        </div>

        <!-- Dynamic headers -->
        <div class="grid w-full truncate" :style="{ gridTemplateColumns: gridTemplateColumns }">
          <div
            v-for="f in activeFields"
            :key="f.fieldname"
            class="border-r border-outline-gray-2 p-2 truncate"
            :class="['Int','Float','Currency','Percent'].includes(f.fieldtype) ? 'text-right' : ''"
            :title="f.label"
          >
            {{ __(f.label) }}
            <span
              v-if="f.reqd || (f.mandatory_depends_on && f.mandatory_via_depends_on)"
              class="text-ink-red-2"
              >*</span
            >
          </div>
        </div>

        <!-- Columns/fields editor (develop mode only) -->
        <div class="flex items-center justify-center w-12">
          <Button
            v-if="isDevelopMode"
            :tooltip="__('Edit grid fields')"
            class="rounded !bg-surface-gray-2 border-0 !text-ink-gray-5"
            variant="outline"
            icon="settings"
            @click="showGridFieldsEditorModal = true"
          />
        </div>
      </div>

      <!-- Rows -->
      <template v-if="rows?.length">
        <Draggable
          class="w-full"
          v-model="rows"
          :delay="isTouchScreenDevice() ? 200 : 0"
          group="rows"
          item-key="name"
          @end="reorder"
        >
          <template #item="{ element: row, index }">
            <div
              class="grid-row flex cursor-pointer items-center border-b border-outline-gray-modals bg-surface-modals last:rounded-b last:border-b-0"
              @click.stop="() => { if (!gridSettings.editable_grid) showRowList[index] = true }"
            >
              <!-- Row checkbox -->
              <div class="grid-row-checkbox inline-flex h-9.5 items-center bg-surface-white justify-center border-r border-outline-gray-modals p-2 w-12">
                <Checkbox
                  class="cursor-pointer duration-300"
                  :modelValue="selectedRows.has(row.name)"
                  @click.stop="toggleSelectRow(row)"
                />
              </div>

              <!-- Sr. No. -->
              <div class="flex h-9.5 items-center justify-center bg-surface-white border-r border-outline-gray-modals py-2 px-1 text-sm text-ink-gray-8 w-12">
                {{ index + 1 }}
              </div>

              <!-- Cells -->
              <div class="grid w-full h-9.5" :style="{ gridTemplateColumns: gridTemplateColumns }">
                <div
                  v-for="f in activeFields"
                  :key="f.fieldname"
                  class="border-r border-outline-gray-modals h-full"
                >
                  <!-- Read-only text (for non-numeric/check) -->
                  <FormControl
                    v-if="f.read_only && !['Int','Float','Currency','Percent','Check'].includes(f.fieldtype)"
                    type="text"
                    :placeholder="f.placeholder"
                    v-model="row[f.fieldname]"
                    :disabled="true"
                  />

                  <!-- Link & Dynamic Link -->
                  <Link
                    v-else-if="['Link','Dynamic Link'].includes(f.fieldtype)"
                    class="text-sm text-ink-gray-8"
                    :value="row[f.fieldname]"
                    :doctype="f.fieldtype === 'Link' ? f.options : row[f.options]"
                    :filters="f.filters"
                    @change="(v) => fieldChange(v, f, row)"
                    :onCreate="isDevelopMode ? (value, close) => f.create && f.create(value, f, row, close) : undefined"
                  />

                  <!-- User with avatar -->
                  <Link
                    v-else-if="f.fieldtype === 'User'"
                    class="form-control"
                    :value="safeGetUser(row[f.fieldname]).full_name"
                    :doctype="f.options"
                    :filters="f.filters"
                    @change="(v) => fieldChange(v, f, row)"
                    :placeholder="f.placeholder"
                    :hideMe="true"
                  >
                    <template #prefix>
                      <UserAvatar class="mr-2" :user="row[f.fieldname]" size="sm" />
                    </template>
                    <template #item-prefix="{ option }">
                      <UserAvatar class="mr-2" :user="option.value" size="sm" />
                    </template>
                    <template #item-label="{ option }">
                      <Tooltip :text="option.value">
                        <div class="cursor-pointer">
                          {{ safeGetUser(option.value).full_name }}
                        </div>
                      </Tooltip>
                    </template>
                  </Link>

                  <!-- Check -->
                  <div v-else-if="f.fieldtype === 'Check'" class="flex h-full bg-surface-white justify-center items-center">
                    <Checkbox
                      class="cursor-pointer duration-300"
                      :disabled="!gridSettings.editable_grid"
                      v-model="row[f.fieldname]"
                      @change="(e) => fieldChange(e.target.checked, f, row)"
                    />
                  </div>

                  <!-- Time / Date / Datetime -->
                  <TimePicker
                    v-else-if="f.fieldtype === 'Time'"
                    :value="row[f.fieldname]"
                    variant="outline"
                    :format="getFormat('', '', false, true, false)"
                    input-class="border-none text-sm text-ink-gray-8"
                    @change="(v) => fieldChange(v, f, row)"
                  />
                  <DatePicker
                    v-else-if="f.fieldtype === 'Date'"
                    :value="row[f.fieldname]"
                    variant="outline"
                    :format="getFormat('', '', true, false, false)"
                    input-class="border-none text-sm text-ink-gray-8"
                    @change="(v) => fieldChange(v, f, row)"
                  />
                  <DateTimePicker
                    v-else-if="f.fieldtype === 'Datetime'"
                    :value="row[f.fieldname]"
                    variant="outline"
                    :format="getFormat('', '', true, true, false)"
                    input-class="border-none text-sm text-ink-gray-8"
                    @change="(v) => fieldChange(v, f, row)"
                  />

                  <!-- Text areas -->
                  <FormControl
                    v-else-if="['Small Text','Text','Long Text','Code'].includes(f.fieldtype)"
                    rows="1"
                    type="textarea"
                    variant="outline"
                    :value="row[f.fieldname]"
                    @change="fieldChange($event.target.value, f, row)"
                  />

                  <!-- Select -->
                  <FormControl
                    v-else-if="f.fieldtype === 'Select'"
                    class="text-sm text-ink-gray-8"
                    type="select"
                    variant="outline"
                    v-model="row[f.fieldname]"
                    :options="f.options"
                    @change="(e) => fieldChange(e.target.value, f, row)"
                  />

                  <!-- Password -->
                  <Password
                    v-else-if="f.fieldtype === 'Password'"
                    variant="outline"
                    :value="row[f.fieldname]"
                    :disabled="Boolean(f.read_only)"
                    @change="fieldChange($event.target.value, f, row)"
                  />

                  <!-- Numeric formatting -->
                  <FormattedInput
                    v-else-if="f.fieldtype === 'Int'"
                    class="[&_input]:text-right"
                    type="text"
                    variant="outline"
                    :value="row[f.fieldname] ?? '0'"
                    :disabled="Boolean(f.read_only)"
                    @change="fieldChange($event.target.value, f, row)"
                  />
                  <FormattedInput
                    v-else-if="f.fieldtype === 'Percent'"
                    class="[&_input]:text-right"
                    type="text"
                    variant="outline"
                    :value="getFloatWithPrecisionSafe(f.fieldname, row)"
                    :formattedValue="((row[f.fieldname] ?? '0')) + '%'"
                    :disabled="Boolean(f.read_only)"
                    @change="fieldChange(flt($event.target.value), f, row)"
                  />
                  <FormattedInput
                    v-else-if="f.fieldtype === 'Float'"
                    class="[&_input]:text-right"
                    type="text"
                    variant="outline"
                    :value="getFloatWithPrecisionSafe(f.fieldname, row)"
                    :formattedValue="row[f.fieldname]"
                    :disabled="Boolean(f.read_only)"
                    @change="fieldChange(flt($event.target.value), f, row)"
                  />
                  <FormattedInput
                    v-else-if="f.fieldtype === 'Currency'"
                    class="[&_input]:text-right"
                    type="text"
                    variant="outline"
                    :value="getCurrencyWithPrecisionSafe(f.fieldname, row)"
                    :formattedValue="getFormattedCurrencySafe(f.fieldname, row, parentDoc)"
                    :disabled="Boolean(f.read_only)"
                    @change="fieldChange(flt($event.target.value), f, row)"
                  />

                  <!-- Fallback text -->
                  <FormControl
                    v-else
                    class="text-sm text-ink-gray-8"
                    type="text"
                    variant="outline"
                    v-model="row[f.fieldname]"
                    :options="f.options"
                    @change="fieldChange($event.target.value, f, row)"
                  />
                </div>
              </div>

              <!-- Edit row -->
              <div class="edit-row flex items-center justify-center w-12">
                <Button
                  :tooltip="__('Edit row')"
                  class="rounded border-0 !text-ink-gray-7"
                  variant="outline"
                  :icon="EditIcon"
                  @click="showRowList[index] = true"
                />
              </div>

              <!-- Row modal (develop mode) -->
              <GridRowModal
                v-if="isDevelopMode && showRowList[index]"
                v-model="showRowList[index]"
                v-model:showGridRowFieldsModal="showGridRowFieldsModal"
                :index="index"
                :data="row"
                :doctype="doctype"
                :parentDoctype="parentDoctype"
              />

              <!-- Simple dialog (fallback for custom mode) -->
              <Dialog
                v-else-if="!isDevelopMode && showRowList[index]"
                v-model="showRowList[index]"
                :options="{ title: `${__('Editing Row')} ${index + 1}` }"
              >
                <template #body-content>
                  <div v-for="f in activeFields" :key="f.fieldname">
                    {{ f.label }}: {{ row[f.fieldname] }}
                  </div>
                </template>
              </Dialog>
            </div>
          </template>
        </Draggable>
      </template>

      <div v-else class="flex flex-col items-center rounded p-5 text-sm text-ink-gray-5">
        {{ __('No Data') }}
      </div>
    </div>

    <!-- Footer buttons -->
    <div v-if="activeFields?.length" class="mt-2 flex flex-row gap-2">
      <Button
        v-if="showDeleteBtn"
        :label="__('Delete')"
        variant="solid"
        theme="red"
        @click="deleteRows"
      />
      <Button :label="__('Add Row')" @click="addRow" />
    </div>

    <!-- Fields/columns editor (develop mode) -->
    <GridRowFieldsModal
      v-if="isDevelopMode && showGridRowFieldsModal"
      v-model="showGridRowFieldsModal"
      :doctype="doctype"
      :parentDoctype="parentDoctype"
    />
    <GridFieldsEditorModal
      v-if="isDevelopMode && showGridFieldsEditorModal"
      v-model="showGridFieldsEditorModal"
      :doctype="doctype"
      :parentDoctype="parentDoctype"
    />
  </div>
</template>

<script setup>
/** Unified Grid.vue: merges your custom features with Frappe develop */
import Password from '@/components/Controls/Password.vue'
import FormattedInput from '@/components/Controls/FormattedInput.vue'
import GridFieldsEditorModal from '@/components/Controls/GridFieldsEditorModal.vue'
import GridRowFieldsModal from '@/components/Controls/GridRowFieldsModal.vue'
import GridRowModal from '@/components/Controls/GridRowModal.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import Link from '@/components/Controls/Link.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getRandom, getFormat, isTouchScreenDevice } from '@/utils'
import { flt } from '@/utils/numberFormat.js'
import { usersStore } from '@/stores/users'
import { getMeta } from '@/stores/meta'
import { createDocument } from '@/composables/document'
import {
  FormControl,
  Checkbox,
  TimePicker,
  DateTimePicker,
  DatePicker,
  Tooltip,
  Dialog,
  dayjs,
  Button,
} from 'frappe-ui'
import Draggable from 'vuedraggable'
import { ref, reactive, computed, inject, provide } from 'vue'

/** Props: support BOTH modes */
const props = defineProps({
  // custom mode props (your HEAD)
  label: { type: String, default: '' },
  gridFields: { type: Array, default: () => [] }, // optional shortcut labels/layout (custom)
  fields: { type: Array, default: () => [] }, // optional external fields (custom)

  // develop mode props
  doctype: { type: String, default: '' },
  parentDoctype: { type: String, default: '' },
  parentFieldname: { type: String, default: '' },
})

/** Models */
const rows = defineModel()
const parentDoc = defineModel('parent')
provide('parentDoc', parentDoc)

/** External stores */
const { users, getUser } = usersStore()

/** Inject develop triggers (no-ops in custom mode) */
const triggerOnChange = inject('triggerOnChange', () => {})
const triggerOnRowAdd = inject('triggerOnRowAdd', () => {})
const triggerOnRowRemove = inject('triggerOnRowRemove', () => {})

/** Meta helpers (only if develop mode) */
const isDevelopMode = computed(() => !!(props.doctype && props.parentDoctype && props.parentFieldname))
let metaApi = null
if (isDevelopMode.value) {
  metaApi = getMeta(props.doctype)
  getMeta(props.parentDoctype) // warm the parent meta cache
}
const {
  getGridViewSettings = () => [],
  getFields = () => [],
  getFloatWithPrecision = () => (name, row) => row?.[name] ?? 0,
  getCurrencyWithPrecision = () => (name, row) => row?.[name] ?? 0,
  getFormattedCurrency = () => () => '',
  getGridSettings = () => ({ editable_grid: true }),
} = metaApi || {}

/** Local state */
const showRowList = ref(new Array(rows.value?.length || 0).fill(false))
const selectedRows = reactive(new Set())
const showGridFieldsEditorModal = ref(false)
const showGridRowFieldsModal = ref(false)
const gridSettings = computed(() => (isDevelopMode.value ? getGridSettings() : { editable_grid: true }))

/** Build field objects depending on mode */
function getFieldObj(field) {
  if (!field) return {}

  // Link create (develop)
  if (isDevelopMode.value && field.fieldtype === 'Link' && field.options !== 'User') {
    if (!field.create) {
      field.create = (value, fieldDef, row, close) => {
        const callback = (d) => d && fieldChange(d.name, fieldDef, row)
        createDocument(field.options, value, close, callback)
      }
    }
  }

  // User picker
  if (field.fieldtype === 'Link' && field.options === 'User') {
    field = { ...field, fieldtype: 'User' }
    field.link_filters = JSON.stringify({
      ...(field.link_filters ? JSON.parse(field.link_filters) : {}),
      name: ['in', users.data?.crmUsers?.map((u) => u.name) || []],
    })
  }

  return {
    ...field,
    filters: field.link_filters && JSON.parse(field.link_filters),
    placeholder: field.placeholder || field.label,
  }
}

/** Active fields (single source used by template) */
const activeFields = computed(() => {
  if (isDevelopMode.value) {
    const gridViewSettings = getGridViewSettings(props.parentDoctype) || []
    const all = (getFields() || []).map(getFieldObj)
    if (gridViewSettings.length) {
      const map = new Map(all.map((f) => [f.fieldname, f]))
      return gridViewSettings.map((gs) => getFieldObj({ ...map.get(gs.fieldname), columns: gs.columns }))
    }
    return all.filter((f) => f.in_list_view).map(getFieldObj)
  }

  // custom mode: prefer explicit fields prop, fallback to gridFields as minimal definition
  if (props.fields?.length) return props.fields.map(getFieldObj)
  if (props.gridFields?.length) return props.gridFields.map(getFieldObj)
  return []
})

/** Grid template columns */
const gridTemplateColumns = computed(() => {
  if (!activeFields.value?.length) return '1fr'
  if (isDevelopMode.value) {
    const settings = getGridViewSettings(props.parentDoctype) || []
    if (settings.length) return settings.map((gs) => `minmax(0, ${gs.columns || 2}fr)`).join(' ')
    return activeFields.value.map(() => `minmax(0, 2fr)`).join(' ')
  }
  // custom mode: use provided width if available
  return activeFields.value.map((f) => `minmax(0, ${f.width || 2}fr)`).join(' ')
})

/** Selection */
const allRowsSelected = computed(() => (rows.value?.length ? rows.value.length === selectedRows.size : false))
const showDeleteBtn = computed(() => selectedRows.size > 0)
const toggleSelectAllRows = (checked) => {
  if (checked) rows.value?.forEach((r) => selectedRows.add(r.name))
  else selectedRows.clear()
}
const toggleSelectRow = (row) => {
  selectedRows.has(row.name) ? selectedRows.delete(row.name) : selectedRows.add(row.name)
}

/** Add/Delete/Reorder rows */
const allFieldsForDefaults = computed(() => {
  // develop: all meta fields; custom: activeFields
  return isDevelopMode.value ? (getFields() || []).map(getFieldObj) : (activeFields.value || [])
})

const addRow = () => {
  const newRow = {}
  allFieldsForDefaults.value?.forEach((f) => {
    if (!f?.fieldname) return
    if (f.fieldtype === 'Check') newRow[f.fieldname] = false
    else newRow[f.fieldname] = ''

    if (f.default) {
      newRow[f.fieldname] = getDefaultValue(f.default, f.fieldtype)
    }
  })
  newRow.name = getRandom(10)
  showRowList.value.push(false)
  newRow['__islocal'] = true
  newRow['idx'] = (rows.value?.length || 0) + 1

  if (isDevelopMode.value) {
    newRow['doctype'] = props.doctype
    newRow['parentfield'] = props.parentFieldname
    newRow['parenttype'] = props.parentDoctype
  }

  rows.value.push(newRow)
  triggerOnRowAdd(newRow)
}

const deleteRows = () => {
  rows.value = rows.value.filter((r) => !selectedRows.has(r.name))
  triggerOnRowRemove(selectedRows, rows.value)
  showRowList.value.pop()
  selectedRows.clear()
}

const reorder = () => {
  rows.value?.forEach((r, i) => (r.idx = i + 1))
}

/** Field change hook */
function fieldChange(value, field, row) {
  triggerOnChange(field.fieldname, value, row)
}

/** Default value helpers (develop) */
function getDefaultValue(def, fieldtype) {
  if (['Float', 'Currency', 'Percent'].includes(fieldtype)) return flt(def)
  if (fieldtype === 'Check') {
    if (['1', 'true', 'True'].includes(def)) return true
    if (['0', 'false', 'False'].includes(def)) return false
  }
  if (fieldtype === 'Int') return parseInt(def)
  if (def === 'Today' && fieldtype === 'Date') return dayjs().format('YYYY-MM-DD')
  if (['Now', 'now'].includes(def) && fieldtype === 'Datetime') return dayjs().format('YYYY-MM-DD HH:mm:ss')
  if (['Now', 'now'].includes(def) && fieldtype === 'Time') return dayjs().format('HH:mm:ss')
  if (fieldtype === 'Date') return dayjs(def).format('YYYY-MM-DD')
  if (fieldtype === 'Datetime') return dayjs(def).format('YYYY-MM-DD HH:mm:ss')
  if (fieldtype === 'Time') return dayjs(def).format('HH:mm:ss')
  return def
}

/** Safe wrappers for meta helpers (so custom mode doesn't crash) */
const getFloatWithPrecisionSafe = (name, row) =>
  (isDevelopMode.value ? getFloatWithPrecision(name, row) : row?.[name]) ?? 0

const getCurrencyWithPrecisionSafe = (name, row) =>
  (isDevelopMode.value ? getCurrencyWithPrecision(name, row) : row?.[name]) ?? 0

const getFormattedCurrencySafe = (name, row, parent) =>
  isDevelopMode.value ? getFormattedCurrency(name, row, parent) : row?.[name] ?? ''

/** User safe accessor (prevents null errors) */
function safeGetUser(userId) {
  try {
    return getUser(userId) || { full_name: userId || '' }
  } catch {
    return { full_name: userId || '' }
  }
}
</script>

<style scoped>
/* Inputs & textareas */
:deep(.grid-row input:not([type='checkbox'])),
:deep(.grid-row textarea) {
  border: none;
  border-radius: 0;
  height: 38px;
}
:deep(.grid-row input:focus),
:deep(.grid-row input:hover),
:deep(.grid-row textarea:focus),
:deep(.grid-row textarea:hover) {
  box-shadow: none;
}
:deep(.grid-row input:focus-within),
:deep(.grid-row textarea:focus-within) {
  border: 1px solid var(--outline-gray-2);
}

/* Selects */
:deep(.grid-row select) {
  border: none;
  border-radius: 0;
  height: 38px;
}

/* Buttons */
:deep(.grid-row button) {
  border: none;
  border-radius: 0;
  background-color: var(--surface-white);
  height: 38px;
}
:deep(.grid-row:last-child .grid-row-checkbox) {
  border-bottom-left-radius: 7px;
}
:deep(.grid-row .edit-row button) {
  border-bottom-right-radius: 7px;
}
:deep(.grid-row button:focus),
:deep(.grid-row button:hover) {
  box-shadow: none;
  background-color: var(--surface-white);
}
:deep(.grid-row button:focus-within) {
  border: 1px solid var(--outline-gray-2);
}
</style>
