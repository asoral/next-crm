<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="iconPath"
  ></svg>
</template>

<script setup>
import { computed } from 'vue'
import icons from 'feather-icons/dist/icons.json'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 16,
  },
  strokeWidth: {
    type: [Number, String],
    default: 2,
  },
})

const iconPath = computed(() => {
  const icon = icons[props.name]
  if (!icon) {
    console.warn(`[FeatherIcon] Icon "${props.name}" not found.`)
    return ''
  }
  return icon
})
</script>