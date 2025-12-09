<template>
  <div class="flex justify-between gap-3 border-t px-4 py-2.5 sm:px-10">
    <div class="flex gap-1.5">
      <Button
        v-if="!showNoteBox"
        ref="sendEmailRef"
        variant="ghost"
        :class="showEmailBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : ''"
        :label="__('Reply')"
        @click="toggleEmailBox()"
      >
        <template #prefix>
          <Email2Icon class="h-4" />
        </template>
      </Button>

      <Button
        v-if="docVisible && !showNoteBox"
        variant="ghost"
        :class="showCommentBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : ''"
        :label="__('Comment')"
        @click="toggleCommentBox()"
      >
        <template #prefix>
          <CommentIcon class="h-4" />
        </template>
      </Button>

      <Button
        v-if="showNoteBox || (!docVisible && !showNoteBox)"
        variant="ghost"
        :label="__('Note')"
        :class="showNoteBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : ''"
        @click="toggleNoteBox()"
      >
        <template #prefix>
          <NoteIcon class="h-4" />
        </template>
      </Button>
    </div>
  </div>

  <!-- Email editor -->
  <div
    v-show="showEmailBox"
    @keydown.ctrl.enter.capture.stop="submitEmail"
    @keydown.meta.enter.capture.stop="submitEmail"
  >
    <EmailEditor
      ref="newEmailEditor"
      v-model:content="newEmail"
      :submitButtonProps="{
        variant: 'solid',
        onClick: submitEmail,
        disabled: emailEmpty,
      }"
      :discardButtonProps="{
        onClick: discardEmail,
      }"
      :editable="showEmailBox"
      v-model="doc"
      v-model:attachments="attachments"
      :doctype="doctype"
      :subject="subject"
      :placeholder="__('Hi John, \\n\\nCan you please provide more details on this...')"
    />
  </div>

  <!-- Comment box -->
  <div v-show="showCommentBox">
    <CommentBox
      ref="newCommentEditor"
      v-model:content="newComment"
      :submitButtonProps="{
        variant: 'solid',
        onClick: submitComment,
        disabled: commentEmpty,
      }"
      :discardButtonProps="{
        onClick: () => {
          showCommentBox = false
          newComment = ''
        },
      }"
      :editable="showCommentBox"
      v-model="doc"
      v-model:attachments="attachments"
      :doctype="doctype"
      :placeholder="__('@John, can you please check this?')"
    />
  </div>


  <!-- Note editor -->
  <div v-show="showNoteBox">
    <NoteEditor
      ref="newNoteEditor"
      :doctype="doctype"
      :docname="docName"
      :attachments="all_activities?.data?.attachments"
      @reload="reload = true"
      v-model:title="newNoteTitle"
      v-model:content="newNoteContent"
      v-model:fileAttachments="newAttachments"
      :submitButtonProps="{
        variant: 'solid',
        onClick: submitNote,
        disabled: noteEmpty,
        loading: submittingNoteReply,
      }"
      :discardButtonProps="{
        onClick: () => {
          showNoteBox = false
          newNoteTitle = ''
          newNoteContent = ''
          newAttachments = []
        },
      }"
      :editable="showNoteBox"
    />
  </div>
</template>

<script setup>
import EmailEditor from '@/components/EmailEditor.vue'
import CommentBox from '@/components/CommentBox.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import { capture } from '@/telemetry'
import { usersStore } from '@/stores/users'
import { useStorage } from '@vueuse/core'
import { call, createResource } from 'frappe-ui'
import { useOnboarding } from 'frappe-ui/frappe'
import { ref, watch, computed } from 'vue'
import { createToast } from '../utils'

const props = defineProps({
  doctype: {
    type: String,
    default: 'Lead',
  },
})

const doc = defineModel()
const all_activities = defineModel('activities')
const reload = defineModel('reload')

const emit = defineEmits(['scroll'])

const { getUser } = usersStore()
const { updateOnboardingStep } = useOnboarding('frappecrm')

/* UI state */
const showEmailBox = ref(false)
const showCommentBox = ref(false)
const showNoteBox = ref(false)

const newEmail = useStorage('emailBoxContent', '')
const newComment = useStorage('commentBoxContent', '')

const newEmailEditor = ref(null)
const newCommentEditor = ref(null)
const newNoteEditor = ref(null)
const sendEmailRef = ref(null)
const attachments = ref([])
const newAttachments = ref([])

const newNoteTitle = ref('')
const newNoteContent = ref('')
const noteParent = ref('')
const submittingNoteReply = ref(false)

/* --- Helpers to work with both doc.value.data and doc.value shapes --- */
const docObj = computed(() => {
  // prefer doc.value.data if present, otherwise doc.value if that looks like the doc
  return doc?.value?.data || doc?.value || {}
})
const docName = computed(() => docObj.value?.name || doc?.value?.name || '')
const docVisible = computed(() => !!docObj.value && !!docName.value)

/* Subject builder (robust to both shapes) */
const subject = computed(() => {
  let prefix = ''
  if (docObj.value?.lead_name) {
    prefix = docObj.value.lead_name
  } else if (docObj.value?.customer) {
    prefix = docObj.value.customer
  } else if (docObj.value?.organization) {
    prefix = docObj.value.organization
  } else if (docObj.value?.company) {
    prefix = docObj.value.company
  }
  return `${prefix ? prefix + ' ' : ''}(#${docName.value || ''})`.trim()
})

/* User signature resource */
const signature = createResource({
  url: 'next_crm.api.get_user_signature',
  cache: 'user-email-signature',
  auto: true,
})

function setSignature(editor) {
  if (!signature.data) return
  const sigHtml = String(signature.data).replace(/\n/g, '<br>')
  let emailContent = editor.getHTML()
  emailContent = emailContent && emailContent.startsWith('<p></p>') ? emailContent.slice(7) : emailContent
  editor.commands.setContent(sigHtml + emailContent)
  editor.commands.focus('start')
}

/* Focus editors when shown */
watch(
  () => showEmailBox.value,
  (value) => {
    if (value && newEmailEditor.value?.editor) {
      let editor = newEmailEditor.value.editor
      editor.commands.focus()
      setSignature(editor)
    }
  },
)

watch(
  () => showCommentBox.value,
  (value) => {
    if (value && newCommentEditor.value?.editor) {
      newCommentEditor.value.editor.commands.focus()
    }
  },
)

watch(
  () => showNoteBox.value,
  (value) => {
    if (value && newNoteEditor.value?.editor) {
      newNoteEditor.value.editor.commands.focus()
    }
  },
)

/* emptiness checks */
const commentEmpty = computed(() => {
  return !newComment.value || newComment.value === '<p></p>'
})

const emailEmpty = computed(() => {
  return (
    !newEmail.value ||
    newEmail.value === '<p></p>' ||
    !newEmailEditor.value?.toEmails?.length
  )
})

const noteEmpty = computed(() => {
  return (
    !newNoteTitle.value &&
    (!newNoteContent.value || newNoteContent.value === '<p></p>')
  )
})

/* Toggle functions */
function toggleEmailBox() {
  if (showCommentBox.value) showCommentBox.value = false
  showNoteBox.value = false
  showEmailBox.value = !showEmailBox.value
}

function toggleCommentBox() {
  if (showEmailBox.value) showEmailBox.value = false
  showNoteBox.value = false
  showCommentBox.value = !showCommentBox.value
}

function toggleNoteBox() {
  showEmailBox.value = false
  showCommentBox.value = false
  showNoteBox.value = !showNoteBox.value
}

/* Discard email helper used by EmailEditor discardButtonProps */
function discardEmail() {
  showEmailBox.value = false
  if (newEmailEditor.value) {
    newEmailEditor.value.subject = subject.value || ''
    newEmailEditor.value.toEmails = docObj.value?.email ? [docObj.value.email] : []
    newEmailEditor.value.ccEmails = []
    newEmailEditor.value.bccEmails = []
    newEmailEditor.value.cc = false
    newEmailEditor.value.bcc = false
  }
  newEmail.value = ''
}

/* sendMail uses docName and docObj for robust fields */
async function sendMail() {
  const editor = newEmailEditor.value
  if (!editor) {
    createToast({ title: __('Email editor not available'), icon: 'x', iconClasses: 'text-ink-red-4' })
    return false
  }

  let recipients = editor.toEmails || []
  if (!recipients.length) {
    createToast({ title: __('Please add at least one recipient'), icon: 'x', iconClasses: 'text-ink-red-4' })
    return false
  }

  let subjectLocal = editor.subject || subject.value
  let cc = editor.ccEmails || []
  let bcc = editor.bccEmails || []

  // ensure lead_owner added to cc if present in docObj
  const leadOwner = docObj.value?.lead_owner || docObj.value?.owner
  if (leadOwner && !cc.includes(leadOwner)) {
    cc.push(leadOwner)
  }

  if (attachments.value.length) {
    capture('email_attachments_added')
  }

  try {
    await call('frappe.core.doctype.communication.email.make', {
      recipients: recipients.join(', '),
      attachments: attachments.value.map((x) => x.name),
      cc: cc.join(', '),
      bcc: bcc.join(', '),
      subject: subjectLocal,
      content: newEmail.value,
      doctype: props.doctype,
      name: docName.value,
      send_email: 1,
      sender: getUser().email,
      sender_full_name: getUser()?.full_name || undefined,
    })
    return true
  } catch (error) {
    createToast({
      title: __('Error'),
      text: error?.message || String(error),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return false
  }
}

/* sendComment */
async function sendComment() {
  try {
    const comment = await call('frappe.desk.form.utils.add_comment', {
      reference_doctype: props.doctype,
      reference_name: docName.value,
      content: newComment.value,
      comment_email: getUser().email,
      comment_by: getUser()?.full_name || undefined,
    })
    if (comment && attachments.value.length) {
      capture('comment_attachments_added')
      await call('next_crm.api.comment.add_attachments', {
        name: comment.name,
        attachments: attachments.value.map((x) => x.name),
      })
    }

    // try updating last_modified on the document; guard errors
    try {
      await call('frappe.client.set_value', {
        doctype: props.doctype,
        name: docName.value,
        fieldname: { last_modified: new Date().toISOString() },
      })
    } catch (e) {
      // non-fatal; log for debugging
      // eslint-disable-next-line no-console
      console.error('Failed to update last_modified:', e)
    }

    return true
  } catch (err) {
    createToast({
      title: __('Error sending comment'),
      text: err?.message || String(err),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return false
  }
}

/* submitEmail wrapper */
async function submitEmail() {
  if (emailEmpty.value) return
  showEmailBox.value = false
  const ok = await sendMail()
  if (!ok) return false
  newEmail.value = ''
  reload.value = true
  emit('scroll')
  capture('email_sent', { doctype: props.doctype })
  updateOnboardingStep('send_first_email')
}

/* submitComment wrapper */
async function submitComment() {
  if (commentEmpty.value) return
  showCommentBox.value = false
  const ok = await sendComment()
  if (!ok) return
  newComment.value = ''
  reload.value = true
  emit('scroll')
  capture('comment_sent', { doctype: props.doctype })
  updateOnboardingStep('add_first_comment')
}

/* submitNote */
async function submitNote() {
  if (noteEmpty.value) return
  submittingNoteReply.value = true
  try {
    await call('next_crm.api.crm_note.create_note', {
      doctype: props.doctype,
      docname: docName.value || '',
      title: newNoteTitle.value,
      note: newNoteContent.value,
      parent_note: noteParent.value,
      attachments: newAttachments.value,
    })
    showNoteBox.value = false
    newNoteTitle.value = ''
    newNoteContent.value = ''
    newAttachments.value = []
    reload.value = true
    emit('scroll')
    capture('note_sent', { doctype: props.doctype })
    createToast({
      title: __('Note reply added.'),
      icon: 'check',
      iconClasses: 'text-ink-green-3',
    })
  } catch (e) {
    createToast({
      title: __('Error'),
      text: e?.message || String(e),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
  } finally {
    submittingNoteReply.value = false
  }
}

/* Expose controls to parent */
defineExpose({
  show: showEmailBox,
  showComment: showCommentBox,
  showNote: showNoteBox,
  noteParent,
  editor: newEmailEditor,
})
</script>
