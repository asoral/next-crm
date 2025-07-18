import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import EventStatusIcon from '@/components/Icons/EventStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import { useDateFormat, useTimeAgo } from '@vueuse/core'
import { usersStore } from '@/stores/users'
import { gemoji } from 'gemoji'
import { toast } from 'frappe-ui'
import { h } from 'vue'

export function createToast(options) {
  toast({
    position: 'bottom-right',
    ...options,
  })
}

export function formatTime(seconds) {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  let formattedTime = ''

  if (days > 0) {
    formattedTime += `${days}d `
  }

  if (hours > 0 || days > 0) {
    formattedTime += `${hours}h `
  }

  if (minutes > 0 || hours > 0 || days > 0) {
    formattedTime += `${minutes}m `
  }

  formattedTime += `${remainingSeconds}s`

  return formattedTime.trim()
}

export function dateFormat(date, format) {
  const _format = format || 'DD-MM-YYYY HH:mm:ss'
  return useDateFormat(date, _format).value
}

export function timeAgo(date) {
  return useTimeAgo(date).value
}

export const dateTooltipFormat = 'ddd, MMM D, YYYY h:mm A'

export function todoStatusOptions(action, data) {
  return ['Backlog', 'Open', 'In Progress', 'Closed', 'Cancelled'].map(
    (status) => {
      return {
        icon: () => h(ToDoStatusIcon, { status }),
        label: status,
        onClick: () => action && action(status, data),
      }
    },
  )
}

export function eventStatusOptions(action, data) {
  return ['Open', 'Completed', 'Closed', 'Cancelled'].map(
    (status) => {
      return {
        icon: () => h(EventStatusIcon, { status }),
        label: status,
        onClick: () => action && action(status, data),
      }
    },
  )
}

export function todoPriorityOptions(action, data) {
  return ['Low', 'Medium', 'High'].map((priority) => {
    return {
      label: priority,
      icon: () => h(ToDoPriorityIcon, { priority }),
      onClick: () => action && action(priority, data),
    }
  })
}

export function openWebsite(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  window.open(url, '_blank')
}

export function website(url) {
  return url && url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
}

export function htmlToText(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export function secondsToDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const _seconds = Math.floor((seconds % 3600) % 60)

  if (hours == 0 && minutes == 0) {
    return `${_seconds}s`
  } else if (hours == 0) {
    return `${minutes}m ${_seconds}s`
  }
  return `${hours}h ${minutes}m ${_seconds}s`
}

export function formatNumberIntoCurrency(value, currency = 'INR') {
  if (value === null || value === undefined || value === '') return '';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return '';

  // Currency-specific locale settings
  const localeSettings = {
    'AED': 'ar-AE',    // UAE Dirham
    'AUD': 'en-AU',    // Australian Dollar
    'CHF': 'de-CH',    // Swiss Franc
    'CNY': 'zh-CN',    // Chinese Yuan
    'EUR': 'de-DE',    // Euro (German format)
    'GBP': 'en-GB',    // British Pound
    'INR': 'en-IN',    // Indian Rupee
    'JPY': 'ja-JP',    // Japanese Yen
    'USD': 'en-US',    // US Dollar
  };

  const locale = localeSettings[currency] || 'en-IN';

  const options = {
    style: 'currency',
    currency: currency || 'INR',
    currencyDisplay: 'symbol'
  };

  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR'];
  if (zeroDecimalCurrencies.includes(currency)) {
    options.maximumFractionDigits = 0;
    options.minimumFractionDigits = 0;
  } else {
    // Default to 2 decimal places
    options.minimumFractionDigits = 2;
    options.maximumFractionDigits = 2;
  }

  try {
    return new Intl.NumberFormat(locale, options).format(numericValue).replace(/^(\D+)/, '$1 ');
  } catch (e) {
    console.error(`Error formatting currency (${currency}):`, e);
    // Fallback to basic formatting
    return `${currency} ${numericValue.toFixed(2)}`;
  }
}

export function startCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function validateEmail(email) {
  let regExp =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return regExp.test(email)
}

export function setupAssignees(data) {
  let { getUser } = usersStore()
  let assignees = data._assign || []
  data._assignedTo = assignees.map((user) => ({
    name: user,
    image: getUser(user).user_image,
    label: getUser(user).full_name,
  }))
}

async function getFromScript(script, obj) {
  let scriptFn = new Function(script + '\nreturn setupForm')()
  let formScript = await scriptFn(obj)
  return formScript || {}
}

export async function setupCustomizations(data, obj) {
  if (!data._form_script) return []

  let statuses = []
  let actions = []
  if (Array.isArray(data._form_script)) {
    for (let script of data._form_script) {
      let _script = await getFromScript(script, obj)
      actions = actions.concat(_script?.actions || [])
      statuses = statuses.concat(_script?.statuses || [])
    }
  } else {
    let _script = await getFromScript(data._form_script, obj)
    actions = _script?.actions || []
    statuses = _script?.statuses || []
  }

  data._customStatuses = statuses
  data._customActions = actions
  return { statuses, actions }
}

async function getListScript(script, obj) {
  let scriptFn = new Function(script + '\nreturn setupList')()
  let listScript = await scriptFn(obj)
  return listScript || {}
}

export async function setupListCustomizations(data, obj = {}) {
  if (!data.list_script) return []

  let actions = []
  let bulkActions = []

  if (Array.isArray(data.list_script)) {
    for (let script of data.list_script) {
      let _script = await getListScript(script, obj)
      actions = actions.concat(_script?.actions || [])
      bulkActions = bulkActions.concat(_script?.bulk_actions || [])
    }
  } else {
    let _script = await getListScript(data.list_script, obj)
    actions = _script?.actions || []
    bulkActions = _script?.bulk_actions || []
  }

  data.listActions = actions
  data.bulkActions = bulkActions
  return { actions, bulkActions }
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
    navigator.clipboard.writeText(text).then(show_success_alert)
  } else {
    let input = document.createElement('textarea')
    document.body.appendChild(input)
    input.value = text
    input.select()
    document.execCommand('copy')
    show_success_alert()
    document.body.removeChild(input)
  }
  function show_success_alert() {
    createToast({
      title: 'Copied to clipboard',
      text: text,
      icon: 'check',
      iconClasses: 'text-green-600',
    })
  }
}

export function isEmoji(str) {
  const emojiList = gemoji.map((emoji) => emoji.emoji)
  return emojiList.includes(str)
}

export function isTouchScreenDevice() {
  return 'ontouchstart' in document.documentElement
}

export function convertArrayToString(array) {
  return array.map((item) => item).join(',')
}

export function _eval(code, context = {}) {
  let variable_names = Object.keys(context)
  let variables = Object.values(context)
  code = `let out = ${code}; return out`
  try {
    let expression_function = new Function(...variable_names, code)
    return expression_function(...variables)
  } catch (error) {
    console.log('Error evaluating the following expression:')
    console.error(code)
    throw error
  }
}

export function evaluateDependsOnValue(expression, doc) {
  if (!expression) return true
  if (!doc) return true

  let out = null

  if (typeof expression === 'boolean') {
    out = expression
  } else if (typeof expression === 'function') {
    out = expression(doc)
  } else if (expression.substr(0, 5) == 'eval:') {
    try {
      out = _eval(expression.substr(5), { doc })
    } catch (e) {
      out = true
    }
  } else {
    let value = doc[expression]
    if (Array.isArray(value)) {
      out = !!value.length
    } else {
      out = !!value
    }
  }

  return out
}

export function convertSize(size) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  while (size > 1024) {
    size /= 1024
    unitIndex++
  }
  return `${size?.toFixed(2)} ${units[unitIndex]}`
}

export function isImage(extention) {
  if (!extention) return false
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(
    extention.toLowerCase(),
  )
}

export function getRandom(len) {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  Array.from({ length: len }).forEach(() => {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  })
  return text
}

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
          fn(...args);
      }, delay);
  };
}

export const sanitizeCurrency = (str) => {
  return str.replace(/[^\d.-]/g, '');
}

export const replaceMeWithUser = (obj, user) => ({ ...obj, ...Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "@me" ? user : v])) });
