// --------------------------
// Imports
// --------------------------
import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import { useDateFormat, useTimeAgo } from '@vueuse/core'
import { usersStore } from '@/stores/users'
import { gemoji } from 'gemoji'
import { toast } from 'frappe-ui'
import { h } from 'vue'

// --------------------------
// Toast / Alerts
// --------------------------
export function createToast(options) {
  toast({
    position: 'bottom-right',
    ...options,
  })
}

export function errorMessage(title, message) {
  createToast({
    title: title || 'Error',
    text: message,
    icon: 'x',
    iconClasses: 'text-red-600',
  })
}

export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(show_success)
  } else {
    const input = document.createElement('textarea')
    document.body.appendChild(input)
    input.value = text
    input.select()
    document.execCommand('copy')
    show_success()
    input.remove()
  }

  function show_success() {
    createToast({
      title: 'Copied to clipboard',
      text,
      icon: 'check',
      iconClasses: 'text-green-600',
    })
  }
}

// --------------------------
// Date Helpers
// --------------------------
export function dateFormat(date, format = 'DD-MM-YYYY HH:mm:ss') {
  return useDateFormat(date, format).value
}

// REQUIRED by FilesUploaderArea.vue
export function formatDate(date, format = 'DD-MM-YYYY') {
  return useDateFormat(date, format).value
}

export function timeAgo(date) {
  return useTimeAgo(date).value
}

export const dateTooltipFormat = 'ddd, MMM D, YYYY h:mm A'

// --------------------------
// Time Formatting
// --------------------------
export function formatTime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60

  let str = ''
  if (days) str += `${days}d `
  if (hours || days) str += `${hours}h `
  if (minutes || hours || days) str += `${minutes}m `
  return (str + `${remaining}s`).trim()
}

export function secondsToDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (!h && !m) return `${s}s`
  if (!h) return `${m}m ${s}s`
  return `${h}h ${m}m ${s}s`
}

// --------------------------
// Currency Helpers
// --------------------------
export function formatNumberIntoCurrency(value, currency = 'INR') {
  if (value === null || value === undefined || value === '') return ''

  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numericValue)) return ''

  const localeMap = {
    AED: 'ar-AE',
    AUD: 'en-AU',
    CHF: 'de-CH',
    CNY: 'zh-CN',
    EUR: 'de-DE',
    GBP: 'en-GB',
    INR: 'en-IN',
    JPY: 'ja-JP',
    USD: 'en-US',
  }

  const locale = localeMap[currency] || 'en-IN'

  const noDecimal = ['JPY', 'KRW', 'VND', 'IDR'].includes(currency)

  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  }

  try {
    return new Intl.NumberFormat(locale, options)
      .format(numericValue)
      .replace(/^(\D+)/, '$1 ')
  } catch {
    return `${currency} ${numericValue.toFixed(2)}`
  }
}

export const sanitizeCurrency = (str) => str.replace(/[^\d.-]/g, '')

// --------------------------
// Browser / Device / Files
// --------------------------
export function openWebsite(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  window.open(url, '_blank')
}

export function website(url) {
  return url?.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
}

export function isTouchScreenDevice() {
  return 'ontouchstart' in document.documentElement
}

export function convertSize(size) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0

  while (size > 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  return `${size.toFixed(2)} ${units[index]}`
}

export function isImage(ext) {
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(
    ext?.toLowerCase() || '',
  )
}

// REQUIRED by ProfileSettings.vue & FileUploader
export function validateIsImageFile(file) {
  if (!file) return true

  const type = file.type || ''
  const size = file.size || 0

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]

  if (!allowed.includes(type)) {
    return __('Please upload an image file (jpg, png, webp, gif, svg).')
  }

  const maxBytes = 5 * 1024 * 1024
  if (size > maxBytes) {
    return __('Image too large. Maximum size is 5 MB.')
  }

  return true
}

// --------------------------
// String Helpers
// --------------------------
export function htmlToText(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export function convertArrayToString(array) {
  return array.join(',')
}

export function startCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function validateEmail(email) {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email,
  )
}

export function isEmoji(str) {
  return gemoji.some((e) => e.emoji === str)
}

// --------------------------
// User & Assign Helpers
// --------------------------
export function setupAssignees(data) {
  const { getUser } = usersStore()
  const assignees = data._assign || []

  data._assignedTo = assignees.map((u) => {
    const user = getUser(u)
    return {
      name: u,
      image: user?.user_image,
      label: user?.full_name,
    }
  })
}

export const replaceMeWithUser = (obj, user) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '@me' ? user : v]),
  )

// --------------------------
// Script Evaluation (Form / List)
// --------------------------
export function _eval(code, context = {}) {
  const keys = Object.keys(context)
  const vals = Object.values(context)

  try {
    return new Function(...keys, `let out = ${code}; return out`)(...vals)
  } catch (error) {
    console.error(code)
    throw error
  }
}

export function evaluateDependsOnValue(expr, doc) {
  if (!expr || !doc) return true

  if (typeof expr === 'boolean') return expr
  if (typeof expr === 'function') return expr(doc)

  if (expr.startsWith('eval:')) {
    try {
      return _eval(expr.slice(5), { doc })
    } catch {
      return true
    }
  }

  const value = doc[expr]
  return Array.isArray(value) ? !!value.length : !!value
}

async function runScript(script, context, returnFn) {
  const fn = new Function(script + `\nreturn ${returnFn}`)()
  return (await fn(context)) || {}
}

export async function setupCustomizations(data, obj) {
  if (!data._form_script) return []

  const scripts = Array.isArray(data._form_script)
    ? data._form_script
    : [data._form_script]

  let statuses = []
  let actions = []

  for (const script of scripts) {
    const out = await runScript(script, obj, 'setupForm')
    statuses = statuses.concat(out.statuses || [])
    actions = actions.concat(out.actions || [])
  }

  data._customStatuses = statuses
  data._customActions = actions
  return { statuses, actions }
}

export async function setupListCustomizations(data, obj = {}) {
  if (!data.list_script) return []

  const scripts = Array.isArray(data.list_script)
    ? data.list_script
    : [data.list_script]

  let actions = []
  let bulkActions = []

  for (const script of scripts) {
    const out = await runScript(script, obj, 'setupList')
    actions = actions.concat(out.actions || [])
    bulkActions = bulkActions.concat(out.bulk_actions || [])
  }

  data.listActions = actions
  data.bulkActions = bulkActions

  return { actions, bulkActions }
}

// --------------------------
// Icons: Status & Priority
// --------------------------
export function todoStatusOptions(action, data) {
  return ['Backlog', 'Open', 'In Progress', 'Closed', 'Cancelled'].map(
    (status) => ({
      label: status,
      icon: () => h(ToDoStatusIcon, { status }),
      onClick: () => action?.(status, data),
    }),
  )
}

export function eventStatusOptions(action, data) {
  return ['Open', 'Completed', 'Closed', 'Cancelled'].map((status) => ({
    label: status,
    icon: () => h(EventStatusIcon, { status }),
    onClick: () => action?.(status, data),
  }))
}

export function todoPriorityOptions(action, data) {
  return ['Low', 'Medium', 'High'].map((priority) => ({
    label: priority,
    icon: () => h(ToDoPriorityIcon, { priority }),
    onClick: () => action?.(priority, data),
  }))
}

// --------------------------
// Misc
// --------------------------
export function getRandom(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  return Array.from({ length: len }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('')
}

export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
