import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { sessionStore } from './session'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

export const usersStore = defineStore('crm-users', () => {
  const session = sessionStore()
  const router = useRouter()

  // cache of users keyed by name or email
  let usersByName = reactive({})

  const users = createResource({
    // moved to next_crm API
    url: 'next_crm.api.session.get_users',
    cache: 'crm-users',
    initialData: [],
    auto: true,
    transform([allUsers, crmUsers]) {
      // be defensive if backend ever changes
      allUsers = allUsers || []

      for (let user of allUsers) {
        // merge into existing user so we don't lose fields like user_image
        const existing = usersByName[user.name] || {}
        const merged = { ...existing, ...user }

        usersByName[user.name] = merged

        // for Administrator we also cache by email
        if (user.name === 'Administrator' && user.email) {
          usersByName[user.email] = merged
        }
      }

      return { allUsers, crmUsers }
    },
    onError(error) {
      if (error && error.exc_type === 'AuthenticationError') {
        router.push('/login')
      }
    },
  })

  function getUser(email) {
    if (!email || email === 'sessionUser') {
      email = session.user
    }

    if (!usersByName[email]) {
      // fallback stub if user list hasn’t loaded yet
      usersByName[email] = {
        name: email,
        email: email,
        full_name: email?.split?.('@')?.[0] || email,
        first_name: email?.split?.('@')?.[0] || email,
        last_name: '',
        user_image: null,
        role: null,
        google_calendar: null,
      }
    }

    return usersByName[email]
  }

  // 🔸 New: update current logged-in user in the store
  function updateCurrentUser(fields) {
    const email = session.user
    const user = getUser(email)
    Object.assign(user, fields)
  }

  function isAdmin(email) {
    return getUser(email).role === 'System Manager'
  }

  function isManager(email) {
    return getUser(email).role === 'Sales Manager' || isAdmin(email)
  }

  function isSalesUser(email) {
    return getUser(email).role === 'Sales User'
  }

  function isTelephonyAgent(email) {
    return getUser(email).is_telphony_agent
  }

  function getUserRole(email) {
    const user = getUser(email)
    if (user && user.role) {
      return user.role
    }
    return null
  }

  return {
    users,
    getUser,
    updateCurrentUser, // <- expose helper
    isAdmin,
    isManager,
    isSalesUser,
    isTelephonyAgent,
    getUserRole,
  }
})
