import { createResource } from 'frappe-ui'
import { computed, ref } from 'vue'

export const whatsappEnabled = ref(false)
export const isWhatsappInstalled = ref(false)

createResource({
  url: 'next_crm.api.whatsapp.is_whatsapp_enabled',
  cache: 'Is Whatsapp Enabled',
  auto: true,
  onSuccess: (data) => {
    whatsappEnabled.value = Boolean(data)
  },
})

createResource({
  url: 'next_crm.api.whatsapp.is_whatsapp_installed',
  cache: 'Is Whatsapp Installed',
  auto: true,
  onSuccess: (data) => {
    isWhatsappInstalled.value = Boolean(data)
  },
})

export const callEnabled = ref(false)
export const twilioEnabled = ref(false)
export const exotelEnabled = ref(false)
export const defaultCallingMedium = ref('')

/**
 * Use the newer, more generic endpoint if available (frappe/develop):
 *   crm.integrations.api.is_call_integration_enabled
 *
 * But handle older responses (boolean or twilio-only endpoints) gracefully.
 *
 * onSuccess accepts a few possible shapes:
 *  - { twilio_enabled: true, exotel_enabled: false, default_calling_medium: 'twilio' }
 *  - true  (older twilio-only boolean)
 *  - { twilio: true } or { twilio_enabled: true } (possible variants)
 */
createResource({
  // primary (frappe/develop) endpoint
  url: 'crm.integrations.api.is_call_integration_enabled',
  cache: 'Is Call Integration Enabled',
  auto: true,
  onSuccess: (data) => {
    // Reset defaults first
    twilioEnabled.value = false
    exotelEnabled.value = false
    defaultCallingMedium.value = ''

    // If server returned a boolean (old twilio-only endpoint), treat as twilio flag
    if (typeof data === 'boolean') {
      twilioEnabled.value = Boolean(data)
      callEnabled.value = twilioEnabled.value
      return
    }

    // If server returned an object (newer shape), try to read known keys
    if (data && typeof data === 'object') {
      // Common/expected keys from new endpoint
      if ('twilio_enabled' in data || 'exotel_enabled' in data || 'default_calling_medium' in data) {
        twilioEnabled.value = Boolean(data.twilio_enabled)
        exotelEnabled.value = Boolean(data.exotel_enabled)
        defaultCallingMedium.value = data.default_calling_medium || ''
        callEnabled.value = twilioEnabled.value || exotelEnabled.value
        return
      }

      // Try other possible shapes (defensive)
      if ('twilio' in data) {
        twilioEnabled.value = Boolean(data.twilio)
      } else if ('twilio_enabled' in data) {
        twilioEnabled.value = Boolean(data.twilio_enabled)
      }

      if ('exotel' in data) {
        exotelEnabled.value = Boolean(data.exotel)
      } else if ('exotel_enabled' in data) {
        exotelEnabled.value = Boolean(data.exotel_enabled)
      }

      // fallback to default_calling_medium or default
      defaultCallingMedium.value = data.default_calling_medium || data.defaultCallingMedium || ''

      callEnabled.value = twilioEnabled.value || exotelEnabled.value
      return
    }

    // Fallback: if data is unexpected, keep disabled
    twilioEnabled.value = false
    exotelEnabled.value = false
    defaultCallingMedium.value = ''
    callEnabled.value = false
  },
  onError: (err) => {
    // Defensive: if the newer endpoint is missing on older installs, try the legacy twilio-only endpoint
    // (This fallback avoids build/runtime errors and keeps features working on older deployments.)
    // Note: createResource doesn't return a promise here, so we manually call another resource.
    console.warn('is_call_integration_enabled failed, trying legacy twilio endpoint', err)
    createResource({
      url: 'next_crm.integrations.twilio.api.is_enabled',
      cache: 'Is Twilio Enabled (legacy)',
      auto: true,
      onSuccess: (resp) => {
        // legacy likely returns boolean
        twilioEnabled.value = Boolean(resp)
        exotelEnabled.value = false
        defaultCallingMedium.value = twilioEnabled.value ? 'twilio' : ''
        callEnabled.value = twilioEnabled.value
      },
      onError: (e) => {
        // final fallback
        console.warn('Legacy twilio check also failed', e)
        twilioEnabled.value = false
        exotelEnabled.value = false
        defaultCallingMedium.value = ''
        callEnabled.value = false
      },
    })
  },
})

export const mobileSidebarOpened = ref(false)

export const isMobileView = computed(() => {
  // defensive: server-side rendering / build time might not have window
  try {
    return window?.innerWidth < 768
  } catch (e) {
    return false
  }
})

export const showSettings = ref(false)

export const disableSettingModalOutsideClick = ref(false)

export const activeSettingsPage = ref('')
