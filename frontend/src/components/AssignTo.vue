<template>
  <component
    v-if="assignees && assignees.length"
    :is="assignees.length === 1 ? 'Button' : 'div'"
    @click="showAssignmentModal = true"
    class="cursor-pointer"
  >
    <MultipleAvatar :avatars="assignees" />
  </component>

  <Button v-else @click="showAssignmentModal = true" label="Assign to">
    {{ __('Assign to') }}
  </Button>

  <AssignmentModal
    v-if="showAssignmentModal"
    v-model="showAssignmentModal"
    v-model:assignees="assignees"
    :doctype="doctype"
    :doc="data"
  />
</template>

<script setup>
import MultipleAvatar from '@/components/MultipleAvatar.vue'
import AssignmentModal from '@/components/Modals/AssignmentModal.vue'
import { Button } from 'frappe-ui'
import { ref } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  doctype: {
    type: String,
    required: true,
  },
})

const showAssignmentModal = ref(false)

// Added default to prevent null pointer errors on .length checks
const assignees = defineModel({ type: Array, default: () => [] })
</script>