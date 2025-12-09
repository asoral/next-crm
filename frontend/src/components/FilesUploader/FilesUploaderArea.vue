<template>
  <div v-if="showWebLink">
    <TextInput v-model="webLink" placeholder="https://example.com" />
  </div>

  <div v-else-if="showCamera">
    <video v-show="!cameraImage" ref="video" class="rounded" autoplay></video>
    <canvas
      v-show="cameraImage"
      ref="canvas"
      class="rounded"
      style="width: -webkit-fill-available"
    />
  </div>

  <div v-else>
    <!-- File Drop Area -->
    <div
      class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-outline-gray-modals min-h-64 text-ink-gray-5"
      @dragover.prevent="dragover"
      @dragleave.prevent="dragleave"
      @drop.prevent="dropfiles"
      v-show="files.length === 0"
    >
      <div v-if="!isDragging" class="flex flex-col gap-3">
        <div class="text-center text-ink-gray-5">
          {{ __('Drag and drop files here or upload from') }}
        </div>
        <div class="grid grid-flow-col justify-center gap-4 text-center text-base">
          <!-- Device -->
          <input
            type="file"
            class="hidden"
            ref="fileInput"
            @change="onFileInput"
            :multiple="allowMultiple"
            :accept="(restrictions.allowedFileTypes || []).join(', ')"
          />
          <div>
            <Button icon="monitor" size="md" @click="browseFiles" />
            <div class="mt-1">{{ __('Device') }}</div>
          </div>

          <!-- Library -->
          <div v-if="!disableFileBrowser">
            <Button icon="folder" size="md" @click="showFileBrowser = true" />
            <div class="mt-1">{{ __('Library') }}</div>
          </div>

          <!-- Web Link -->
          <div v-if="allowWebLink">
            <Button icon="link" size="md" @click="showWebLink = true" />
            <div class="mt-1">{{ __('Link') }}</div>
          </div>

          <!-- Camera -->
          <div v-if="allowTakePhoto">
            <Button icon="camera" size="md" @click="startCamera" />
            <div class="mt-1">{{ __('Camera') }}</div>
          </div>
        </div>
      </div>
      <div v-else>
        {{ __('Drop files here') }}
      </div>
    </div>

    <!-- File List -->
    <div v-show="files.length" class="flex flex-col divide-y">
      <div
        v-for="file in files"
        :key="file.name"
        class="flex items-center justify-between gap-2 py-3"
      >
        <div class="flex items-center gap-4 truncate">
          <div
            class="size-11 rounded overflow-hidden flex-shrink-0 flex justify-center items-center"
            :class="{ border: !file.type?.startsWith('image') }"
          >
            <img
              v-if="file.type?.startsWith('image')"
              class="size-full object-cover"
              :src="file.src"
              :alt="file.name"
            />
            <component v-else class="size-4" :is="fileIcon(file.type)" />
          </div>
          <div class="flex flex-col gap-1 text-sm text-ink-gray-5 truncate">
            <div class="text-base text-ink-gray-8 truncate">
              {{ file.name }}
            </div>
            <div class="mb-1">
              {{ convertSize(file.fileObj.size) }}
            </div>
            <FormControl
              v-model="file.private"
              type="checkbox"
              class="[&>label]:text-sm [&>label]:text-ink-gray-5"
              :label="__('Private')"
            />
            <ErrorMessage
              class="mt-2"
              v-if="file.errorMessage"
              :message="file.errorMessage"
            />
          </div>
        </div>
        <div>
          <CircularProgressBar
            v-if="file.uploading || file.uploaded == file.total"
            :class="{ 'text-ink-green-2': file.uploaded == file.total }"
            :theme="{ primary: '#22C55E', secondary: 'lightgray' }"
            :step="file.uploaded || 1"
            :totalSteps="file.total || 100"
            size="xs"
            variant="outline"
            :showPercentage="file.uploading"
          />
          <Button
            v-else
            variant="ghost"
            icon="trash-2"
            @click="removeFile(file.name)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import FileTextIcon from '@/components/Icons/FileTextIcon.vue'
import FileAudioIcon from '@/components/Icons/FileAudioIcon.vue'
import FileVideoIcon from '@/components/Icons/FileVideoIcon.vue'
import { formatDate, convertSize } from '@/utils'
import {
  FormControl,
  CircularProgressBar,
  createResource,
  toast,
} from 'frappe-ui'
import { ref, onMounted, watch, onUnmounted } from 'vue'

const props = defineProps({
  doctype: { type: String, required: true },
  options: { type: Object, default: () => ({}) },
})

const files = defineModel()
const fileInput = ref(null)
const isDragging = ref(false)
const showWebLink = ref(false)
const showFileBrowser = ref(false)
const showCamera = ref(false)

const webLink = ref('')
const cameraImage = ref(null)

const allowMultiple = ref(props.options.allowMultiple !== false)
const disableFileBrowser = ref(!!props.options.disableFileBrowser)
const allowWebLink = ref(props.options.allowWebLink !== false)
const allowTakePhoto = ref(
  props.options.allowTakePhoto && window.navigator.mediaDevices,
)
const restrictions = ref(props.options.restrictions || {})
const makeAttachmentsPublic = ref(props.options.makeAttachmentsPublic || false)

/* Load default restrictions from backend */
onMounted(() => {
  createResource({
    url: 'next_crm.api.get_file_uploader_defaults',
    params: { doctype: props.doctype },
    cache: ['file_uploader_defaults', props.doctype],
    auto: true,
    transform: (data) => {
      restrictions.value = {
        allowedFileTypes: data.allowed_file_types
          ? data.allowed_file_types.split('\n').map((ext) => `.${ext}`)
          : [],
        maxFileSize: data.max_file_size,
        maxNumberOfFiles: data.max_number_of_files,
      }
      makeAttachmentsPublic.value = Boolean(data.make_attachments_public)
    },
  })
})

/* Drag & Drop Events */
function dragover() {
  isDragging.value = true
}
function dragleave() {
  isDragging.value = false
}
function dropfiles(e) {
  isDragging.value = false
  addFiles(e.dataTransfer.files)
}

/* File Input */
function browseFiles() {
  fileInput.value.click()
}
function onFileInput() {
  addFiles(fileInput.value.files)
}

/* Camera Setup */
const video = ref(null)
const facingMode = ref('environment')
const stream = ref(null)

async function startCamera() {
  showCamera.value = true
  stream.value = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facingMode.value },
    audio: false,
  })
  video.value.srcObject = stream.value
}

function stopStream() {
  stream.value?.getTracks()?.forEach((t) => t.stop())
  showCamera.value = false
  cameraImage.value = null
}

function switchCamera() {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  stopStream()
  startCamera()
}

const canvas = ref(null)
function captureImage() {
  const width = video.value.videoWidth
  const height = video.value.videoHeight
  canvas.value.width = width
  canvas.value.height = height
  canvas.value.getContext('2d').drawImage(video.value, 0, 0, width, height)
  cameraImage.value = canvas.value.toDataURL('image/png')
}

function uploadViaCamera() {
  const nowDatetime = formatDate(new Date(), 'YYYY_MM_DD_HH_mm_ss')
  const filename = `capture_${nowDatetime}.png`
  urlToFile(cameraImage.value, filename, 'image/png').then((file) => {
    addFiles([file])
    showCamera.value = false
    cameraImage.value = null
  })
}

function urlToFile(url, filename, mime_type) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((buf) => new File([buf], filename, { type: mime_type }))
}

/* File Adding Logic */
function addFiles(fileArray) {
  let _files = Array.from(fileArray)
    .filter(checkRestrictions)
    .map((file, i) => {
      const isImage = file.type?.startsWith('image')
      const sizeKb = file.size / 1024
      return {
        index: i,
        src: isImage ? URL.createObjectURL(file) : null,
        fileObj: file,
        type: file.type,
        optimize: sizeKb > 200 && isImage && !file.type?.includes('svg'),
        name: file.name,
        uploading: false,
        errorMessage: null,
        private: !makeAttachmentsPublic.value,
      }
    })

  const maxNumberOfFiles = restrictions.value.maxNumberOfFiles
  if (maxNumberOfFiles && _files.length > maxNumberOfFiles) {
    _files.slice(maxNumberOfFiles).forEach((f) =>
      showMaxFilesNumberWarning(f, maxNumberOfFiles),
    )
    _files = _files.slice(0, maxNumberOfFiles)
  }

  files.value = files.value.concat(_files)
}

/* Restriction Validation */
function checkRestrictions(file) {
  const { maxFileSize, allowedFileTypes = [] } = restrictions.value
  let isCorrectType = true
  let validFileSize = true

  if (allowedFileTypes.length) {
    isCorrectType = allowedFileTypes.some((type) => {
      if (type.includes('/')) return file.type?.match(type)
      if (type[0] === '.') return file.name.toLowerCase().endsWith(type)
      return false
    })
  }

  if (maxFileSize && file.size != null) {
    validFileSize = file.size < maxFileSize
  }

  if (!isCorrectType) {
    toast.warning(
      __('File "{0}" was skipped because of invalid file type', [file.name]),
    )
  }
  if (!validFileSize) {
    toast.warning(
      __('File "{0}" was skipped because size exceeds {1} MB', [
        file.name,
        maxFileSize / (1024 * 1024),
      ]),
    )
  }

  return isCorrectType && validFileSize
}

/* Restriction Warnings */
function showMaxFilesNumberWarning(file, max) {
  const msg = props.doctype
    ? __('File "{0}" was skipped because only {1} uploads are allowed for DocType "{2}"', [
        file.name,
        max,
        props.doctype,
      ])
    : __('File "{0}" was skipped because only {1} uploads are allowed', [
        file.name,
        max,
      ])
  toast.warning(msg)
}

/* File Utilities */
function removeFile(name) {
  files.value = files.value.filter((f) => f.name !== name)
}

function fileIcon(type) {
  if (type?.startsWith('audio')) return FileAudioIcon
  if (type?.startsWith('video')) return FileVideoIcon
  return FileTextIcon
}

/* Cleanup */
watch(showCamera, (v) => {
  if (!v) stopStream()
})
onUnmounted(() => stopStream())

defineExpose({
  showFileBrowser,
  showWebLink,
  webLink,
  showCamera,
  cameraImage,
  captureImage,
  uploadViaCamera,
  switchCamera,
})
</script>
