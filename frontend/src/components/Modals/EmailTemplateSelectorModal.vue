<template>
  <Dialog
    v-model="show"
    :options="{ title: __('Email Templates'), size: '4xl' }"
  >
    <template #body-content>
      <TextInput
        ref="searchInput"
        v-model="search"
        type="text"
        :placeholder="__('Payment Reminder')"
        data-cy="email-template-search"
      >
        <template #prefix>
          <FeatherIcon name="search" class="h-4 w-4 text-ink-gray-4" />
        </template>
      </TextInput>

      <div
        v-if="filteredTemplates.length"
        class="mt-2 grid max-h-[560px] sm:grid-cols-3 grid-cols-1 gap-2 overflow-y-auto"
      >
        <div
          v-for="template in filteredTemplates"
          :key="template.name + (template.modified || '')"
          data-cy="template-card"
          class="flex h-56 cursor-pointer flex-col gap-2 rounded-lg border p-3 hover:bg-surface-gray-2"
          @click="selectTemplate(template)"
          role="button"
          tabindex="0"
          @keydown.enter.prevent="selectTemplate(template)"
        >
          <div class="border-b pb-2 text-base font-semibold">{{ template.name }}</div>

          <div v-if="template.subject" class="text-sm text-ink-gray-5">
            {{ __('Subject: {0}', [template.subject]) }}
          </div>

          <TextEditor
            v-if="template.use_html && template.response_html"
            :content="template.response_html"
            :editable="false"
            editor-class="!prose-sm max-w-none !text-sm text-ink-gray-5 focus:outline-none"
            class="flex-1 overflow-hidden"
          />

          <TextEditor
            v-else-if="template.response"
            :content="template.response"
            :editable="false"
            editor-class="!prose-sm max-w-none !text-sm text-ink-gray-5 focus:outline-none"
            class="flex-1 overflow-hidden"
          />
        </div>
      </div>

      <div v-else class="mt-2">
        <div class="flex h-56 flex-col items-center justify-center">
          <div class="text-lg text-ink-gray-4">{{ __('No templates found') }}</div>
          <Button
            :label="__('Create New')"
            class="mt-4"
            @click="openCreateTemplate"
            data-cy="create-new-template"
          />
        </div>
      </div>
    </template>
  </Dialog>

  <EmailTemplateModal
    v-model:show="showEmailTemplateModal"
    :emailTemplate="emailTemplate"
    @saved="onTemplateSaved"
  />
</template>

<script setup>
import EmailTemplateModal from '@/components/Modals/EmailTemplateModal.vue'
import { TextEditor, createListResource, TextInput, Button, FeatherIcon } from 'frappe-ui'
import { ref, computed, nextTick, watch, onMounted } from 'vue'

const props = defineProps({
  doctype: { type: String, default: '' },
})

// v-model binding for Dialog
const show = defineModel()
const emit = defineEmits(['apply'])

// refs
const searchInput = ref(null)
const search = ref('')

// internal state for create-new flow
const showEmailTemplateModal = ref(false)
const emailTemplate = ref({})

// resource to load email templates filtered by reference_doctype
const templates = createListResource({
  type: 'list',
  doctype: 'Email Template',
  cache: ['emailTemplates', props.doctype],
  fields: [
    'name',
    'enabled',
    'use_html',
    'reference_doctype',
    'subject',
    'response',
    'response_html',
    'modified',
    'owner',
  ],
  filters: { enabled: 1, reference_doctype: props.doctype },
  orderBy: 'modified desc',
  pageLength: 99999,
})

onMounted(() => {
  if (templates.data == null) {
    templates.fetch().catch((e) => console.error('Failed to fetch templates', e))
  }
})

// safe computed filter (guards against missing fields)
const filteredTemplates = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!templates.data || !templates.data.length) return []
  if (!q) return templates.data

  return templates.data.filter((template) => {
    const name = (template.name || '').toLowerCase()
    const subj = (template.subject || '').toLowerCase()
    return name.includes(q) || subj.includes(q)
  })
})

// focus search input when dialog opens
watch(show, (value) => value && nextTick(() => searchInput.value?.el?.focus()))

function selectTemplate(template) {
  emit('apply', template)
  // close modal explicitly (v-model expects ref mutation)
  try { show.value = false } catch (e) { /* noop if not writable */ }
}

function openCreateTemplate() {
  // prepare a new template pre-filled with reference_doctype
  emailTemplate.value = { reference_doctype: props.doctype, enabled: 1 }
  show.value = false
  showEmailTemplateModal.value = true
}

function onTemplateSaved(savedTemplate) {
  // after saving, refresh list and close modal
  showEmailTemplateModal.value = false
  templates.fetch().catch((e) => console.error('Failed to refresh templates', e))
  // focus back to selector if desired
  nextTick(() => {
    show.value = true
    nextTick(() => searchInput.value?.el?.focus())
  })
}
</script>
