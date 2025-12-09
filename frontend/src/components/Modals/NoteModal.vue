<template>
  <Dialog v-model="show" :options="{ size: 'xl' }">
    <!-- Title -->
    <template #body-title>
      <div class="flex items-center gap-3">
        <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
          {{ editMode ? __('Edit Note') : __('Create Note') }}
        </h3>
        <Button
          v-if="canRedirect"
          size="sm"
          :label="redirectLabel"
          @click="redirect"
        >
          <template #suffix>
            <ArrowUpRightIcon class="h-4 w-4" />
          </template>
        </Button>
      </div>
    </template>

    <!-- Content -->
    <template #body-content>
      <div class="flex flex-col gap-4">
        <div>
          <FormControl
            ref="title"
            :label="__('Title')"
            v-model="_note.custom_title"
            :placeholder="__('Call with John Doe')"
          />
        </div>

        <div>
          <div class="mb-1.5 text-xs text-ink-gray-5">
            {{ __('Content') }}
          </div>
          <TextEditor
            variant="outline"
            ref="content"
            :fixed-menu="editorMenu"
            editor-class="!prose-sm overflow-auto min-h-[180px] max-h-80 py-1.5 px-2 rounded-b border border-[--surface-gray-2] bg-surface-gray-2 placeholder-ink-gray-4 hover:border-outline-gray-modals hover:bg-surface-gray-3 hover:shadow-sm focus:bg-surface-white focus:border-outline-gray-4 focus:shadow-sm focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3 text-ink-gray-8 transition-colors"
            :content="_note.note"
            :mentions="users"
            @change="(val) => (_note.note = val)"
            :placeholder="__('Took a call with John Doe and discussed the new project.')"
          />
        </div>

        <ErrorMessage class="mt-2" v-if="error" :message="__(error)" />
      </div>
    </template>

    <!-- Actions + Attachments -->
    <template #actions>
      <div class="flex items-center justify-between w-full gap-3">
        <div class="flex-1" />
        <div class="flex items-center gap-2">
          <Button
            :label="editMode ? __('Update') : __('Create')"
            variant="solid"
            :disabled="!hasChanged"
            @click="updateNote"
          />
        </div>
      </div>

      <!-- File uploader lives in the modal, triggered from editor toolbar -->
      <FilesUploader
        v-if="props.doc"
        v-model="showFilesUploader"
        :doctype="props.doctype"
        :docname="props.doc"
        @after="(files) => updateAttachments(files)"
      />

      <NoteAttachments
        :note_name="note?.name"
        :editMode="true"
        :attachments="filteredAttachments"
        @reload="() => updateAttachments()"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { TextEditor, call, ErrorMessage, Dialog, Button, FormControl } from 'frappe-ui'
import { ref, computed, nextTick, watch, h, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { usersStore } from '@/stores/users'
import { capture } from '@/telemetry'
import { createToast } from '@/utils'
import FilesUploader from '@/components/FilesUploader/FilesUploader.vue'
import NoteAttachments from '@/components/Activities/NoteAttachments.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import { isEqual, sortBy } from 'lodash'

const props = defineProps({
  note: { type: Object, default: () => ({}) },
  doctype: { type: String, default: 'Lead' },
  doc: { type: String, default: '' },
})

const show = defineModel()
const notes = defineModel('reloadNotes') // parent passes list resource for reload
const emit = defineEmits(['after'])

const router = useRouter()
const { users: usersList } = usersStore()

const error = ref(null)
const editMode = ref(false)
const _note = ref({})

/* ---------- Attachments handling ---------- */
const attachedFileNames = ref([])
const filteredAttachments = ref([])

const updateAttachments = (files) => {
  if (files?.length) {
    attachedFileNames.value = [...files, ...attachedFileNames.value]
  }
  notes.value?.reload?.()
}

watch(
  [() => notes?.value?.data?.attachments, attachedFileNames],
  ([attachments, fileNames]) => {
    if (!attachments || !fileNames.length) {
      filteredAttachments.value = []
      return
    }
    filteredAttachments.value = attachments.filter((att) =>
      fileNames.includes(att.name),
    )
  },
  { immediate: true },
)

/* ---------- Mentions in editor ---------- */
const users = computed(
  () =>
    usersList.data
      ?.filter((u) => u.enabled)
      .map((u) => ({ label: u.full_name.trimEnd(), value: u.name })) || [],
)

/* ---------- Redirect helpers (supports both schemas) ---------- */
const canRedirect = computed(() => {
  return Boolean(
    props.note?.parent ||
      (props.note?.reference_doctype && props.note?.reference_docname),
  )
})

const redirectLabel = computed(() => {
  const doctype =
    props.note?.parenttype ||
    props.note?.reference_doctype ||
    props.doctype ||
    ''
  if (doctype === 'Opportunity' || doctype === 'CRM Deal') {
    return __('Open Opportunity')
  }
  return __('Open Lead')
})

function redirect() {
  const refDoctype = props.note?.parenttype || props.note?.reference_doctype
  const refName = props.note?.parent || props.note?.reference_docname
  if (!refDoctype || !refName) return

  if (refDoctype === 'Opportunity' || refDoctype === 'CRM Deal') {
    router.push({ name: 'Opportunity', params: { opportunityId: refName } })
  } else {
    router.push({ name: 'Lead', params: { leadId: refName } })
  }
}

/* ---------- Rich text helpers + change detection ---------- */
function isRichTextEmpty(content) {
  if (!content) return true
  const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  return stripped.length === 0
}

const hasChanged = ref(false)

watchEffect(() => {
  const current = _note.value || {}
  const isEdit = editMode.value

  const title = current.custom_title?.trim() || ''
  const body = current.note || ''

  const originalTitle = props.note?.custom_title?.trim() || ''
  const originalBody = props.note?.note || ''

  const titleChanged = title !== originalTitle
  const bodyChanged = body !== originalBody

  const titleHasContent = title.length > 0
  const bodyHasContent = !isRichTextEmpty(body)

  const initialAttachmentNames = (props.note?.attachments || [])
    .map((a) => a.filename)
    .sort()
  const currentAttachmentNames = attachedFileNames.value.slice().sort()
  const attachmentsChanged = !isEqual(
    sortBy(initialAttachmentNames),
    sortBy(currentAttachmentNames),
  )

  hasChanged.value = isEdit
    ? (titleChanged && titleHasContent) ||
      (bodyChanged && bodyHasContent) ||
      attachmentsChanged
    : titleHasContent || bodyHasContent || attachedFileNames.value.length > 0
})

/* ---------- Save / Update ---------- */
const showFilesUploader = ref(false)

async function updateNote() {
  if (!hasChanged.value) return

  if (!_note.value.custom_title?.trim() && isRichTextEmpty(_note.value.note)) {
    createToast({
      title: __('Cannot save empty note'),
      text: __('Please add a title or description before saving.'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return
  }

  try {
    // Update existing note
    if (_note.value.name) {
      const d = await call('next_crm.api.crm_note.update_note', {
        doctype: props.doctype,
        docname: props.doc || '',
        note_name: _note.value.name,
        note: {
          custom_title: _note.value.custom_title,
          note: _note.value.note || '',
        },
        attachments: filteredAttachments.value.map((att) => att.name),
      })

      if (d?.name) {
        notes.value?.reload?.()
        emit('after', d)
        createToast({
          title: __('Note updated successfully'),
          icon: 'check',
          iconClasses: 'text-ink-green-3',
        })
      }
    }
    // Create new note
    else {
      const d = await call('next_crm.api.crm_note.create_note', {
        doctype: props.doctype,
        docname: props.doc || '',
        title: _note.value.custom_title,
        note: _note.value.note || '',
        attachments: filteredAttachments.value.map((att) => att.name),
      })

      if (d?.name) {
        capture('note_created')
        notes.value?.reload?.()
        emit('after', d, true)
        createToast({
          title: __('Note created successfully'),
          icon: 'check',
          iconClasses: 'text-ink-green-3',
        })
      }
    }

    show.value = false
  } catch (e) {
    error.value = e?.message || String(e)
    createToast({
      title: __(
        `Error ${_note.value?.name ? 'updating' : 'creating'} note`,
      ),
      text: error.value,
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
  }
}

/* ---------- Initialize on open ---------- */
watch(
  () => show.value,
  (val) => {
    if (!val) {
      attachedFileNames.value = []
      error.value = null
      return
    }
    editMode.value = Boolean(props.note?.name)
    nextTick(() => {
      _note.value = { ...props.note }
      const fileNames = (props.note?.attachments || []).map((i) => i.filename)
      attachedFileNames.value = fileNames
    })
  },
)

/* ---------- Editor toolbar (with Attach File) ---------- */
const AttachmentIcon = h(
  'svg',
  {
    width: '16',
    height: '16',
    viewBox: '0 0 16 16',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    class: 'w-4 h-4',
  },
  [
    h('path', {
      'fill-rule': 'evenodd',
      'clip-rule': 'evenodd',
      d: 'M12.5684 2.50774C11.5403 1.49742 9.95026 1.49742 8.92215 2.50774L3.62404 7.71417C2.12532 9.18695 2.12532 11.669 3.62404 13.1418C5.12762 14.6194 7.66861 14.6194 9.17219 13.1418L12.1609 10.2049C12.3578 10.0113 12.6744 10.0141 12.8679 10.211C13.0615 10.408 13.0587 10.7246 12.8618 10.9181L9.8731 13.8551C7.98045 15.715 4.81578 15.715 2.92313 13.8551C1.02562 11.9904 1.02562 8.86558 2.92313 7.00091L8.22124 1.79449C9.63842 0.401838 11.8521 0.401838 13.2693 1.79449C14.6914 3.19191 14.6914 5.38225 13.2693 6.77968L13.2668 6.78213L13.2668 6.78212L8.37876 11.5189C8.37834 11.5193 8.37793 11.5197 8.37752 11.5201C7.51767 12.3638 6.11144 12.3939 5.29119 11.5097C4.43611 10.6596 4.40778 9.26893 5.30922 8.46081L7.33823 6.46692C7.53518 6.27337 7.85175 6.27613 8.04531 6.47309C8.23886 6.67005 8.23609 6.98662 8.03913 7.18017L6.0014 9.18264L5.99203 9.19185L5.98219 9.20055C5.5391 9.59243 5.5104 10.3231 6.0014 10.8056L6.01078 10.8148L6.01967 10.8245C6.42299 11.2649 7.18224 11.2926 7.67785 10.8056L7.68034 10.8032L7.68035 10.8032L12.5684 6.06643C12.5688 6.06604 12.5692 6.06565 12.5696 6.06526C13.5917 5.05969 13.5913 3.51289 12.5684 2.50774Z',
      fill: 'currentColor',
    }),
  ],
)

const editorMenu = ref([
  ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6'],
  'Paragraph',
  'Separator',
  'Bold',
  'Italic',
  'Separator',
  'Bullet List',
  'Numbered List',
  'Separator',
  'Align Left',
  'Align Center',
  'Align Right',
  'FontColor',
  'Separator',
  'Image',
  'Video',
  'Link',
  'Blockquote',
  'Code',
  'Horizontal Rule',
  [
    'InsertTable',
    'AddColumnBefore',
    'AddColumnAfter',
    'DeleteColumn',
    'AddRowBefore',
    'AddRowAfter',
    'DeleteRow',
    'MergeCells',
    'SplitCell',
    'ToggleHeaderColumn',
    'ToggleHeaderRow',
    'ToggleHeaderCell',
    'DeleteTable',
  ],
  'Separator',
  'Undo',
  'Redo',
  'Separator',
  {
    label: 'Attach File',
    icon: AttachmentIcon,
    isActive: () => false,
    action: () => {
      showFilesUploader.value = true
    },
  },
])
</script>
