<template>
  <div class="flex justify-between gap-3 border-t px-4 py-2.5 sm:px-10">
    <div class="flex gap-1.5">
      <Button
        v-if="!showNoteBox"
        ref="sendEmailRef"
        variant="ghost"
        :class="[showEmailBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '']"
        :label="__('Reply')"
        @click="toggleEmailBox()"
      >
        <template #prefix>
          <Email2Icon class="h-4" />
        </template>
      </Button>
      <Button
        variant="ghost"
        v-if="doc?.data.hide_comments_tab !== 1 && !showNoteBox"
        :label="__('Comment')"
        :class="[showCommentBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '']"
        @click="toggleCommentBox()"
      >
        <template #prefix>
          <CommentIcon class="h-4" />
        </template>
      </Button>
      <Button
        v-if="showNoteBox"
        variant="ghost"
        :label="__('Note')"
        :class="[showNoteBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '']"
        @click="toggleNoteBox()"
      >
        <template #prefix>
          <NoteIcon class="h-4" />
        </template>
      </Button>
    </div>
  </div>
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
        onClick: () => {
          showEmailBox = false
          newEmailEditor.subject = subject
          newEmailEditor.toEmails = doc.data.email ? [doc.data.email] : []
          newEmailEditor.ccEmails = []
          newEmailEditor.bccEmails = []
          newEmailEditor.cc = false
          newEmailEditor.bcc = false
          newEmail = ''
        },
      }"
      :editable="showEmailBox"
      v-model="doc.data"
      v-model:attachments="attachments"
      :doctype="doctype"
      :subject="subject"
      :placeholder="__('Hi John, \n\nCan you please provide more details on this...')"
    />
  </div>
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
      v-model="doc.data"
      v-model:attachments="attachments"
      :doctype="doctype"
      :placeholder="__('@John, can you please check this?')"
    />
  </div>
  <div v-show="showNoteBox">
    <NoteEditor
      ref="newNoteEditor"
      :doctype="props.doctype"
      :docname="doc?.data?.name"
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
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import NoteIcon from '@/components/Icons/NoteIcon.vue'
import { capture } from '@/telemetry'
import { usersStore } from '@/stores/users'
import { useStorage } from '@vueuse/core'
import { call, createResource } from 'frappe-ui'
import { ref, watch, computed } from 'vue'
import { createToast } from '../utils'
import NoteEditor from '@/components/NoteEditor.vue'

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

const showEmailBox = ref(false)
const showCommentBox = ref(false)
const newEmail = useStorage('emailBoxContent', '')
const newComment = useStorage('commentBoxContent', '')
const newEmailEditor = ref(null)
const newCommentEditor = ref(null)
const sendEmailRef = ref(null)
const attachments = ref([])

const subject = computed(() => {
  let prefix = ''
  if (doc.value.data?.lead_name) {
    prefix = doc.value.data.lead_name
  } else if (doc.value.data?.customer) {
    prefix = doc.value.data.customer
  }
  return `${prefix} (#${doc.value.data.name})`
})

const signature = createResource({
  url: 'next_crm.api.get_user_signature',
  cache: 'user-email-signature',
  auto: true,
})

function setSignature(editor) {
  if (!signature.data) return
  signature.data = signature.data.replace(/\n/g, '<br>')
  let emailContent = editor.getHTML()
  emailContent = emailContent.startsWith('<p></p>') ? emailContent.slice(7) : emailContent
  editor.commands.setContent(signature.data + emailContent)
  editor.commands.focus('start')
}

watch(
  () => showEmailBox.value,
  (value) => {
    if (value) {
      let editor = newEmailEditor.value.editor
      editor.commands.focus()
      setSignature(editor)
    }
  },
)

watch(
  () => showCommentBox.value,
  (value) => {
    if (value) {
      newCommentEditor.value.editor.commands.focus()
    }
  },
)

const commentEmpty = computed(() => {
  return !newComment.value || newComment.value === '<p></p>'
})

const emailEmpty = computed(() => {
  return !newEmail.value || newEmail.value === '<p></p>'
})

async function sendMail() {
  let recipients = newEmailEditor.value.toEmails
  if (!recipients.length) {
    createToast({
      title: __('Please add at least one recipient'),
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return false
  }
  let subject = newEmailEditor.value.subject
  let cc = newEmailEditor.value.ccEmails || []
  let bcc = newEmailEditor.value.bccEmails || []

  if (attachments.value.length) {
    capture('email_attachments_added')
  }
  try {
    await call('frappe.core.doctype.communication.email.make', {
      recipients: recipients.join(', '),
      attachments: attachments.value.map((x) => x.name),
      cc: cc.join(', '),
      bcc: bcc.join(', '),
      subject: subject,
      content: newEmail.value,
      doctype: props.doctype,
      name: doc.value.data.name,
      send_email: 1,
      sender: getUser().email,
      sender_full_name: getUser()?.full_name || undefined,
    })
  } catch (error) {
    createToast({
      title: __('Error'),
      text: error.message,
      icon: 'x',
      iconClasses: 'text-ink-red-4',
    })
    return false
  }
  return true
}

async function sendComment() {
  let comment = await call('frappe.desk.form.utils.add_comment', {
    reference_doctype: props.doctype,
    reference_name: doc.value.data.name,
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
}

async function submitEmail() {
  if (emailEmpty.value) return
  showEmailBox.value = false
  let sendResult = await sendMail()
  if (!sendResult) {
    return false
  }
  newEmail.value = ''
  reload.value = true
  emit('scroll')
  capture('email_sent', { doctype: props.doctype })
}

async function submitComment() {
  if (commentEmpty.value) return
  showCommentBox.value = false
  await sendComment()
  newComment.value = ''
  reload.value = true
  emit('scroll')
  capture('comment_sent', { doctype: props.doctype })
}

function toggleEmailBox() {
  if (showCommentBox.value) {
    showCommentBox.value = false
  }
  showNoteBox.value = false
  showEmailBox.value = !showEmailBox.value
}

function toggleCommentBox() {
  if (showEmailBox.value) {
    showEmailBox.value = false
  }
  showNoteBox.value = false
  showCommentBox.value = !showCommentBox.value
}

const showNoteBox = ref(false)
const newNoteTitle = ref('')
const newNoteContent = ref('')
const newAttachments = ref([])
const newNoteEditor = ref(null)
const noteParent = ref('')
const submittingNoteReply = ref(false)

const noteEmpty = computed(() => {
  return !newNoteTitle.value && (!newNoteContent.value || newNoteContent.value === '<p></p>')
})

function toggleNoteBox() {
  showEmailBox.value = false
  showCommentBox.value = false
  showNoteBox.value = !showNoteBox.value
}

async function submitNote() {
  if (noteEmpty.value) return
  submittingNoteReply.value = true
  await call('next_crm.api.crm_note.create_note', {
    doctype: props.doctype,
    docname: doc.value.data.name || '',
    title: newNoteTitle.value,
    note: newNoteContent.value,
    parent_note: noteParent.value,
    attachments: newAttachments.value,
  })
  showNoteBox.value = false
  submittingNoteReply.value = false
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
}

watch(
  () => showNoteBox.value,
  (value) => {
    if (value) {
      newNoteEditor.value.editor.commands.focus()
    }
  },
)

defineExpose({
  show: showEmailBox,
  showComment: showCommentBox,
  showNote: showNoteBox,
  noteParent: noteParent,
  editor: newEmailEditor,
})
</script>
