// /home/sanket/fnext-crm/apps/next_crm/frontend/src/stores/settings.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { createDocumentResource } from 'frappe-ui'
import { sessionStore } from './session'

/**
 * Pinia store: useSettings
 * - keeps local UI state for the settings panel (open/close, active tab)
 * - lightweight and safe to import across the app
 */
export const useSettings = defineStore('settings', () => {
  const { isLoggedIn } = sessionStore()
  const isSettingsOpen = ref(false)
  const activeTab = ref(null)

  function openSettings(tab = null) {
    activeTab.value = tab
    isSettingsOpen.value = true
  }

  function closeSettings() {
    activeTab.value = null
    isSettingsOpen.value = false
  }

  function toggleSettings(tab = null) {
    if (isSettingsOpen.value) {
      closeSettings()
    } else {
      openSettings(tab)
    }
  }

  return {
    isSettingsOpen,
    activeTab,
    isLoggedIn,
    openSettings,
    closeSettings,
    toggleSettings,
  }
})

/**
 * getSettings helper (frappe/develop)
 * - loads "FCRM Settings" document and keeps brand meta
 * - used by page meta and other parts of the UI
 */
const settings = ref({})
const brand = reactive({})

const _settings = createDocumentResource({
  doctype: 'FCRM Settings',
  name: 'FCRM Settings',
  onSuccess: (data) => {
    settings.value = data
    getSettings().setupBrand()
    return data
  },
})

export function getSettings() {
  function setupBrand() {
    brand.name = settings.value?.brand_name || brand.name
    brand.logo = settings.value?.brand_logo || brand.logo
    brand.favicon = settings.value?.favicon || brand.favicon
  }

  return {
    _settings,
    settings,
    brand,
    setupBrand,
  }
}
