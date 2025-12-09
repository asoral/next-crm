import { createResource } from 'frappe-ui'
import { formatCurrency, formatNumber } from '@/utils/numberFormat.js'
import { reactive } from 'vue'

const doctypeMeta = reactive({})
const userSettings = reactive({})

export function getMeta(doctype) {
  const meta = createResource({
    url: 'frappe.desk.form.load.getdoctype',
    params: {
      doctype: doctype,
      with_parent: 1,
      cached_timestamp: null,
    },
    cache: ['Meta', doctype],
    onSuccess: (res) => {
      let dtMetas = res.docs
      for (let dtMeta of dtMetas) {
        doctypeMeta[dtMeta.name] = dtMeta
      }

      try {
        userSettings[doctype] = JSON.parse(res.user_settings)
      } catch (e) {
        // gracefully handle if user_settings is not JSON
        userSettings[doctype] = {}
      }
    },
  })

  // If meta not loaded, fetch it
  if (!doctypeMeta[doctype] && !meta.loading) {
    meta.fetch()
  }

  function getFormattedPercent(fieldname, doc) {
    let value = getFormattedFloat(fieldname, doc)
    return value + '%'
  }

  function getFormattedFloat(fieldname, doc) {
    let df = doctypeMeta[doctype]?.fields?.find((f) => f.fieldname == fieldname)
    let precision = df?.precision ?? null
    return formatNumber(doc?.[fieldname], '', precision)
  }

  // new helper (frappe/develop): return numeric string with precision
  function getFloatWithPrecision(fieldname, doc) {
    let df = doctypeMeta[doctype]?.fields?.find((f) => f.fieldname == fieldname)
    let precision = df?.precision ?? null
    return formatNumber(doc?.[fieldname], '', precision)
  }

  // new helper (frappe/develop): currency with precision (raw number formatting)
  function getCurrencyWithPrecision(fieldname, doc) {
    let df = doctypeMeta[doctype]?.fields?.find((f) => f.fieldname == fieldname)
    let precision = df?.precision ?? null
    return formatCurrency(doc?.[fieldname], '', '', precision)
  }

  /**
   * getFormattedCurrency(fieldname, doc, parentDoc = null)
   *
   * - Keeps previous behavior (HEAD) but also handles the develop change:
   *   ability to look up currency field on parentDoc if present.
   * - If df.options contains ":" (special format), we leave currency as default system currency.
   */
  function getFormattedCurrency(fieldname, doc, parentDoc = null) {
    let currency = (window.sysdefaults && window.sysdefaults.currency) || 'USD'
    let df = doctypeMeta[doctype]?.fields?.find((f) => f.fieldname == fieldname)
    let precision = df?.precision ?? null

    if (df && df.options) {
      // if options contain ":" then some special handling may be required;
      // keep existing behavior (leave currency as system default)
      if (typeof df.options === 'string' && df.options.indexOf(':') != -1) {
        // nothing (keep currency as default)
      } else if (doc && df.options && doc[df.options]) {
        currency = doc[df.options]
      } else if (parentDoc && df.options && parentDoc[df.options]) {
        // frappe/develop: fallback to parentDoc (useful for child tables)
        currency = parentDoc[df.options]
      }
    }

    return formatCurrency(doc?.[fieldname], '', currency, precision)
  }

  function getGridSettings() {
    return doctypeMeta[doctype] || {}
  }

  function getGridViewSettings(parentDoctype, dt = null) {
    dt = dt || doctype
    if (!userSettings[parentDoctype]?.['GridView']?.[doctype]) return {}
    return userSettings[parentDoctype]['GridView'][doctype]
  }

  function getFields(dt = null) {
    dt = dt || doctype
    return doctypeMeta[dt]?.fields?.map((f) => {
      // normalize Select options from newline string -> array of {label, value}
      if (f.fieldtype === 'Select' && typeof f.options === 'string') {
        f.options = f.options.split('\n').map((option) => {
          return {
            label: option,
            value: option,
          }
        })

        if (f.options[0]?.value !== '') {
          f.options.unshift({
            label: '',
            value: '',
          })
        }
      }
      // treat Link to User as a special 'User' fieldtype for UI convenience
      if (f.fieldtype === 'Link' && f.options == 'User') {
        f.fieldtype = 'User'
      }
      return f
    })
  }

  function saveUserSettings(parentDoctype, key, value, callback) {
    let oldUserSettings = userSettings[parentDoctype] || {}
    let newUserSettings = JSON.parse(JSON.stringify(oldUserSettings))

    if (newUserSettings[key] === undefined) {
      newUserSettings[key] = { [doctype]: value }
    } else {
      newUserSettings[key][doctype] = value
    }

    if (JSON.stringify(oldUserSettings) !== JSON.stringify(newUserSettings)) {
      return createResource({
        url: 'frappe.model.utils.user_settings.save',
        params: {
          doctype: parentDoctype,
          user_settings: JSON.stringify(newUserSettings),
        },
        auto: true,
        onSuccess: () => {
          userSettings[parentDoctype] = newUserSettings
          callback?.()
        },
      })
    }
    userSettings[parentDoctype] = newUserSettings
    return callback?.()
  }

  return {
    meta,
    doctypeMeta,
    userSettings,
    getFields,
    getGridSettings,
    getGridViewSettings,
    saveUserSettings,
    // expose both older & develop helpers so callers from either branch work
    getFloatWithPrecision,
    getCurrencyWithPrecision,
    getFormattedFloat,
    getFormattedPercent,
    getFormattedCurrency,
  }
}
