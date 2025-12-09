// /home/sanket/fnext-crm/apps/next_crm/frontend/src/data/document.js

/**
 * Minimal useDocument wrapper for the frontend.
 *
 * This wraps frappe-ui's createDocumentResource and normalizes the return
 * shape so consuming components can always expect:
 *
 *   const { document } = useDocument(doctype, name)
 *
 *   document.doc             // object with fields
 *   document.get.loading     // boolean
 *   document.save.submit()   // function to save
 *   document.save.loading    // boolean
 *   document.isDirty         // boolean
 *
 * You can also pass an optional third parameter with extra options:
 *
 *   useDocument('CRM Lead', 'LEAD-0001', {
 *     fields: ['name', 'status'],
 *     auto: true,
 *     cache: ['lead', 'LEAD-0001'],
 *     resourceOptions: { /* anything else createDocumentResource supports */ /* }
 *   })
 */

import { createDocumentResource } from 'frappe-ui'

/**
 * @typedef {Object} UseDocumentOptions
 * @property {Array<string>} [fields]           - Fields to load (default: ['*'])
 * @property {boolean}       [auto]             - Auto-load on create (default: true)
 * @property {string|Array}  [cache]            - Cache key (default: ['document', doctype, name])
 * @property {Object}        [resourceOptions]  - Extra options forwarded to createDocumentResource
 */

/**
 * useDocument
 *
 * @param {string} doctype
 * @param {string} name
 * @param {UseDocumentOptions} [options]
 * @returns {{ document: any }}
 */
export function useDocument(doctype, name, options = {}) {
  // If createDocumentResource isn't available for some reason
  // (e.g. test environment), return a no-op stub to avoid crashes.
  const hasCreateDocumentResource = typeof createDocumentResource === 'function'

  // If doctype or name are missing, also return a stub.
  if (!doctype || !name || !hasCreateDocumentResource) {
    const stub = {
      doc: {},
      get: { loading: false, error: null },
      save: {
        loading: false,
        error: null,
        // noop submit so callers can safely call document.save.submit()
        submit: async () => {},
      },
      isDirty: false,
    }
    return { document: stub }
  }

  const {
    fields = ['*'],
    auto = true,
    cache = ['document', doctype, name],
    resourceOptions = {},
  } = options

  const document = createDocumentResource({
    doctype,
    name,
    fields,
    auto,
    cache,
    // Allow callers to pass any extra options createDocumentResource supports
    ...resourceOptions,
  })

  return { document }
}
    