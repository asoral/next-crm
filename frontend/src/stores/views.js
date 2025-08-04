import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { reactive, ref } from 'vue'

export const viewsStore = defineStore('crm-views', (doctype) => {
  let viewsByName = reactive({})
  let pinnedViews = ref([])
  let publicViews = ref([])
  let groupedViews = ref([])
  let defaultView = ref({})

  // Views
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

      for (let view of views) {
        if (!view) continue 

        viewsByName[view.name] = view
        view.type = view.type || 'list'

        if (view.pinned) {
          pinnedViews.value?.push(view)
        }
        if (view.public) {
          publicViews.value?.push(view)
        }
        if (view.group) {
          groupedViews.value?.push(view)
        }
        if (view.is_default && view.dt) {
          defaultView.value[view.dt + ' ' + view.type] = view
        }
      }
      return views
    },
  })

  function getDefaultView() {
    return defaultView.value
  }

  function getView(view, type, doctype = null) {
    type = type || 'list'
    if (!view && doctype) {
      return defaultView.value[doctype + ' ' + type] || null
    }
    return viewsByName[view]
  }

 function getPinnedViews() {
    if (!pinnedViews.value?.length) return []
    return pinnedViews.value
  }

  function getPublicViews() {
    if (!publicViews.value?.length) return []
    return publicViews.value
  }

  function getGroupedViews() {
    if (!groupedViews.value?.length) return []
    return groupedViews.value
  }

  async function reload() {
    await views.reload()
  }

  return {
    views,
    defaultView,
    getDefaultView,
    getPinnedViews,
    getPublicViews,
    getGroupedViews,
    reload,
    getView,
  }
})