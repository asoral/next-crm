<template>
  <!-- Normal action buttons (desktop only) -->
  <Button
    v-for="(action, idx) in normalActions"
    v-if="normalActions.length && !isMobileView.value"
    :key="action.key || action.label || idx"
    :label="action.label"
    @click="handleClick(action)"
  >
    <template v-if="action.icon" #prefix>
      <FeatherIcon :name="action.icon" class="h-4 w-4" />
    </template>
  </Button>

  <!-- Grouped actions dropdown (mobile / general grouped actions) -->
  <Dropdown v-if="groupedActions.length" :options="groupedActions">
    <Button icon="more-horizontal" />
  </Dropdown>

  <!-- Grouped-with-label actions (desktop) -->
  <div
    v-for="(g, gIdx) in groupedWithLabelActions"
    v-if="groupedWithLabelActions.length && !isMobileView.value"
    :key="g.label || gIdx"
  >
    <Dropdown :options="g.action" v-slot="{ open }">
      <!-- merged behavior: iconRight prop AND suffix slot fallback -->
      <Button
        :label="g.label"
        :iconRight="open ? 'chevron-up' : 'chevron-down'"
        :aria-expanded="open ? 'true' : 'false'"
      >
        <template #suffix>
          <FeatherIcon :name="open ? 'chevron-up' : 'chevron-down'" class="h-4" />
        </template>
      </Button>
    </Dropdown>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { Dropdown, Button } from 'frappe-ui'
import { isMobileView } from '@/composables/settings'

/**
 * Local FeatherIcon shim:
 * - prevents build-time missing-file error.
 * - renders a small <i> placeholder with the icon name.
 * Replace this with your real FeatherIcon component later.
 */
const FeatherIcon = (props) => {
  // props: { name, class }
  const className = props.class || ''
  return h('i', { class: `feather-icon ${className}`, 'aria-hidden': 'true' }, props.name)
}

/* -------------------------
   props & helpers
   ------------------------- */
const props = defineProps({
  actions: {
    type: [Object, Array, undefined],
    default: () => [],
  },
})

const t = (s) => {
  try {
    return typeof __ !== 'undefined' ? __(s) : s
  } catch (e) {
    return s
  }
}

const actionsArray = computed(() => {
  if (!props.actions) return []
  return Array.isArray(props.actions) ? props.actions : [props.actions]
})

const normalActions = computed(() => actionsArray.value.filter((a) => !a.group))

const groupedWithLabelActions = computed(() => {
  const _actions = []
  actionsArray.value
    .filter((action) => action.buttonLabel && action.group)
    .forEach((action) => {
      const groupIndex = _actions.findIndex((a) => a.label === action.buttonLabel)
      if (groupIndex > -1) {
        _actions[groupIndex].action.push(action)
      } else {
        _actions.push({ label: action.buttonLabel, action: [action] })
      }
    })
  return _actions
})

const groupedActions = computed(() => {
  let _actions = []
  const _normalActions = normalActions.value

  if (isMobileView.value && _normalActions.length) {
    _actions.push({
      group: t('Actions'),
      hideLabel: true,
      items: _normalActions.map((action) => ({
        label: action.label,
        onClick: action.onClick,
        icon: action.icon,
      })),
    })
  }

  if (isMobileView.value && groupedWithLabelActions.value.length) {
    groupedWithLabelActions.value.forEach((group) => {
      group.action.forEach((action) => _actions.push(action))
    })
  }

  _actions = _actions.concat(
    actionsArray.value.filter((action) => action.group && !action.buttonLabel),
  )

  return _actions
})

function handleClick(action) {
  if (!action) return
  const fn = action.onClick
  if (typeof fn === 'function') {
    try {
      fn()
    } catch (e) {
      // avoid breaking UI during build/runtime
      // eslint-disable-next-line no-console
      console.error('Action onClick error:', e)
    }
  }
}
</script>
 