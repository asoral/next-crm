<template>
  <div>
    <slot name="header" v-bind="{ opened: openedLocal, hide: hideLocal, open, close, toggle }">
      <div
        v-if="!hideLocal"
        :class="['section-header flex items-center justify-between', headerClass, compactHeader ? 'h-8' : '']"
      >
        <div
          class="flex items-center gap-2 max-w-fit cursor-pointer text-base"
          :class="['text-ink-gray-9', labelClass]"
          @click="collapsible ? toggle() : toggleIfAlwaysClickable"
        >
          <!-- left icon when asked -->
          <FeatherIcon
            v-if="collapsible && collapseIconPosition === 'left'"
            name="chevron-right"
            class="h-4 transition-all duration-300 ease-in-out"
            :class="{ 'rotate-90': openedLocal }"
          />
          <!-- label -->
          <span>
            {{ __(label) || __('Untitled') }}
          </span>
          <!-- right icon when asked -->
          <FeatherIcon
            v-if="collapsible && collapseIconPosition === 'right'"
            name="chevron-right"
            class="h-4 transition-all duration-300 ease-in-out"
            :class="{ 'rotate-90': openedLocal }"
          />
        </div>

        <!-- actions slot (from frappe/develop) -->
        <slot name="actions"></slot>
      </div>
    </slot>

    <transition
      enter-active-class="duration-300 ease-in"
      leave-active-class="duration-300 ease-[cubic-bezier(0, 1, 0.5, 1)]"
      enter-to-class="max-h-[200px] overflow-hidden"
      leave-from-class="max-h-[200px] overflow-hidden"
      enter-from-class="max-h-0 overflow-hidden"
      leave-to-class="max-h-0 overflow-hidden"
    >
      <div class="columns" v-bind="$attrs" v-show="openedLocal">
        <slot v-bind="{ opened: openedLocal, open, close, toggle }" />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  hideLabel: {
    type: Boolean,
    default: false,
  },
  opened: {
    type: Boolean,
    default: true,
  },
  collapsible: {
    type: Boolean,
    default: true,
  },
  collapseIconPosition: {
    type: String,
    default: 'left',
  },
  labelClass: {
    type: [String, Object, Array],
    default: '',
  },
  headerClass: {
    type: [String, Object, Array],
    default: '',
  },
  /**
   * compactHeader: keeps old HEAD behavior of "h-8" header (your original)
   * set to true to apply the 'h-8' compact header height
   */
  compactHeader: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:opened'])

// local reactive state bound to props.opened (keeps build/runtime safe)
const openedLocal = ref(props.opened)
const hideLocal = ref(props.hideLabel)

// keep local state in sync when parent updates props
watch(
  () => props.opened,
  (v) => {
    openedLocal.value = v
  }
)
watch(
  () => props.hideLabel,
  (v) => {
    hideLocal.value = v
  }
)

// expose functions used by template and slots
function toggle() {
  openedLocal.value = !openedLocal.value
  emit('update:opened', openedLocal.value)
}

function open() {
  if (!openedLocal.value) {
    openedLocal.value = true
    emit('update:opened', true)
  }
}

function close() {
  if (openedLocal.value) {
    openedLocal.value = false
    emit('update:opened', false)
  }
}

// backward-compat clickable behavior for HEAD: if collapsible=false we still allow toggle on click
function toggleIfAlwaysClickable() {
  // preserve the earlier behavior where clicking header toggled unconditionally
  // but only if collapsible is false in which case we still want click to act.
  toggle()
}
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>