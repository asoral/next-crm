import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { reactive, ref } from 'vue'

export const viewsStore = defineStore('crm-views', (doctype) => {
  let viewsByName = reactive({})
  let pinnedViews = ref([])
  let publicViews = ref([])
  let groupedViews = ref([])

  // Your HEAD default view style (object mapped by dt + type)
  const defaultViewMap = ref({})

  // frappe/develop standard views
  const standardViews = ref({})

  // Views Resource
  const views = createResource({
    url: 'next_crm.api.views.get_views',
    params: { doctype: doctype || '' },
    cache: 'crm-views',
    initialData: [],
    auto: true,
    transform(views) {
      pinnedViews.value = []
      publicViews.value = []
      groupedViews.value = []
      viewsByName = reactive({})
      defaultViewMap.value = {}
      standardViews.value = {}

      for (let view of views) {
        if (!view) continue

        viewsByName[view.name] = view
        view.type = view.type || 'list'

        // Pinned
        if (view.pinned) pinnedViews.value.push(view)

        // Public
        if (view.public) publicViews.value.push(view)

        // Grouped (your feature)
        if (view.group) groupedViews.value.push(view)

        // Standard (frappe/develop)
        if (view.is_standard && view.dt) {
          standardViews.value[view.dt + ' ' + view.type] = view
        }

        // Default (HEAD behaviour)
        if (view.is_default && view.dt) {
          defaultViewMap.value[view.dt + ' ' + view.type] = view
        }
      }

      return views
    },
  })

  /* ---------------------------
    GETTERS
  ---------------------------- */

  function getDefaultView(doctype = null, type = 'list') {
    if (doctype) {
      return defaultViewMap.value[doctype + ' ' + type] || null
    }
    return defaultViewMap.value
  }

  function getView(view, type = 'list', doctype = null) {
    if (!view && doctype) {
      // First try standard view
      return standardViews.value[doctype + ' ' + type] || null
    }
    return viewsByName[view]
  }

  function getPinnedViews() {
    return pinnedViews.value || []
  }

  function getPublicViews() {
    return publicViews.value || []
  }

  function getGroupedViews() {
    return groupedViews.value || []
  }

  async function reload() {
    await views.reload()
  }

  /* ---------------------------
    RETURN STORE
  ---------------------------- */

  return {
    views,
    defaultViewMap,
    standardViews,

    getDefaultView,
    getPinnedViews,
    getPublicViews,
    getGroupedViews,

    getView,
    reload,
  }
})
