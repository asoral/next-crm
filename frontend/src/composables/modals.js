// src/composables/modals.js
import { ref } from 'vue'

/**
 * Global modal composable
 *
 * This file centralizes all app-wide modal state so that
 * different components can coordinate without prop-drilling.
 *
 * Pattern:
 * - Each modal has:
 *    - a `showXxxModal` boolean ref
 *    - an `xxxProps` ref for payload / config
 * - Helper functions open/close each modal and keep props in sync.
 */

/* -----------------------------------------------------------
 * Quick Entry Modal (used by Lead / Contact etc.)
 * --------------------------------------------------------- */

/**
 * Controls visibility of the Quick Entry modal.
 * @type {import('vue').Ref<boolean>}
 */
export const showQuickEntryModal = ref(false)

/**
 * Props for Quick Entry modal.
 * @type {import('vue').Ref<{ doctype: string, [key: string]: any }>}
 */
export const quickEntryProps = ref({ doctype: '' })

/**
 * Open Quick Entry modal with given props.
 * @param {Object} options
 * @param {string} options.doctype - Target doctype (e.g. 'CRM Lead')
 * @param {Object} [options.data]  - Any additional data needed by the modal
 */
export function openQuickEntryModal({ doctype, data = {} } = {}) {
  quickEntryProps.value = {
    doctype: doctype || '',
    ...data,
  }
  showQuickEntryModal.value = true
}

/**
 * Close Quick Entry modal and optionally clear props.
 * @param {boolean} [clearProps=true]
 */
export function closeQuickEntryModal(clearProps = true) {
  showQuickEntryModal.value = false
  if (clearProps) {
    quickEntryProps.value = { doctype: '' }
  }
}

/* -----------------------------------------------------------
 * Address Modal (used by Contact / Address flows)
 * --------------------------------------------------------- */

/**
 * Controls visibility of the Address modal.
 * @type {import('vue').Ref<boolean>}
 */
export const showAddressModal = ref(false)

/**
 * Props for Address modal.
 * @type {import('vue').Ref<{ doctype: string, address: any, [key: string]: any }>}
 */
export const addressProps = ref({ doctype: '', address: null })

/**
 * Open Address modal.
 * @param {Object} options
 * @param {string} options.doctype - Target doctype (e.g. 'Address')
 * @param {any} [options.address=null] - Existing address doc / data
 * @param {Object} [options.data] - Extra payload
 */
export function openAddressModal({ doctype, address = null, data = {} } = {}) {
  addressProps.value = {
    doctype: doctype || '',
    address,
    ...data,
  }
  showAddressModal.value = true
}

/**
 * Close Address modal and optionally clear props.
 * @param {boolean} [clearProps=true]
 */
export function closeAddressModal(clearProps = true) {
  showAddressModal.value = false
  if (clearProps) {
    addressProps.value = { doctype: '', address: null }
  }
}

/* -----------------------------------------------------------
 * Files Uploader (generic)
 * --------------------------------------------------------- */

/**
 * Controls visibility of generic Files Uploader.
 * @type {import('vue').Ref<boolean>}
 */
export const showFilesUploader = ref(false)

/**
 * Open global Files Uploader.
 */
export function openFilesUploader() {
  showFilesUploader.value = true
}

/**
 * Close global Files Uploader.
 */
export function closeFilesUploader() {
  showFilesUploader.value = false
}

/* -----------------------------------------------------------
 * Utilities
 * --------------------------------------------------------- */

/**
 * Close all modals at once.
 * Good for route changes / global resets.
 */
export function closeAllModals() {
  closeQuickEntryModal()
  closeAddressModal()
  closeFilesUploader()
}

/**
 * Hard reset: close all modals AND reset all props.
 */
export function resetModalState() {
  closeQuickEntryModal(true)
  closeAddressModal(true)
  closeFilesUploader()
}
