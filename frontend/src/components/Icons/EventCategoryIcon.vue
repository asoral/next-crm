<template>
  <div class="flex items-center justify-center rounded-full p-1" :class="categoryColorClass(category)">
    <FeatherIcon :name="categoryIcon(category)" class="h-4 w-4" />
  </div>
</template>

<script setup>
import { FeatherIcon } from 'frappe-ui'

const props = defineProps({
  category: { type: String, default: 'Meeting' }
})

function categoryIcon(category) {
  const icons = {
    'Meeting': 'users',
    'Call': 'phone',
    'Email': 'mail',
    'Task': 'check-circle',
    'Reminder': 'bell',
    'Other': 'calendar'
  }
  return icons[category] || 'calendar'
}

function categoryColorClass(category) {
  const colors = {
    'Meeting': 'bg-blue-100 text-blue-600',
    'Call': 'bg-green-100 text-green-600',
    'Email': 'bg-purple-100 text-purple-600',
    'Task': 'bg-orange-100 text-orange-600',
    'Reminder': 'bg-yellow-100 text-yellow-600',
    'Other': 'bg-gray-100 text-gray-600'
  }
  return colors[category] || 'bg-gray-100 text-gray-600'
}
</script>