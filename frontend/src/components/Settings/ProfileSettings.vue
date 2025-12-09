<template>
  <div v-if="profile && profile.name" class="flex w-full items-center justify-between p-12 pt-14">
    <div class="flex items-center gap-4">
      <Avatar class="!size-16" :image="profile.user_image" :label="profile.full_name" />
      <div class="flex flex-col gap-1">
        <span class="text-2xl font-semibold text-ink-gray-9">{{ profile.full_name }}</span>
        <span class="text-base text-ink-gray-7">{{ profile.email }}</span>
      </div>
    </div>
    <Button :label="__('Edit profile')" @click="showProfileModal = true" />
    <Dialog
      :options="{ title: __('Edit Profile') }"
      v-model="showProfileModal"
      @after-leave="editingProfilePhoto = false"
    >
      <template #body-content>
        <div v-if="profile" class="space-y-4">
          <ProfileImageEditor v-model="profile" v-if="editingProfilePhoto" />
          <template v-else>
            <div class="flex items-center gap-4">
              <Avatar size="lg" :image="profile.user_image" :label="profile.full_name" />
              <Button :label="__('Edit Profile Photo')" @click="editingProfilePhoto = true" />
            </div>
            <FormControl label="First Name" v-model="profile.first_name" />
            <FormControl label="Last Name" v-model="profile.last_name" />
          </template>
        </div>
      </template>
      <template #actions>
        <Button
          v-if="editingProfilePhoto"
          class="mb-2 w-full"
          @click="editingProfilePhoto = false"
          :label="__('Back')"
        />
        <Button 
          variant="solid" 
          class="w-full" 
          :loading="updating" 
          @click="updateUser" 
          :label="__('Save')" 
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import ProfileImageEditor from '@/components/Settings/ProfileImageEditor.vue'
import { usersStore } from '@/stores/users'
import { Dialog, Avatar, createResource } from 'frappe-ui'
import { ref, computed, watch } from 'vue'

const { getUser, users } = usersStore()
const user = computed(() => getUser() || {})

const showProfileModal = ref(false)
const editingProfilePhoto = ref(false)
const profile = ref({})

// 1. Defined resource outside function for better state management
const userUpdateResource = createResource({
  url: 'frappe.client.set_value',
  makeParams(values) {
    return {
      doctype: 'User',
      name: user.value.name,
      fieldname: values,
    }
  },
  onSuccess: () => {
    showProfileModal.value = false
    users.reload()
  },
})

const updating = computed(() => userUpdateResource.loading)

function updateUser() {
  userUpdateResource.submit({
    first_name: profile.value.first_name,
    last_name: profile.value.last_name,
    user_image: profile.value.user_image,
  })
}

// 2. Replaced onMounted with watch to handle async data loading
watch(user, (newUser) => {
  if (newUser) {
    profile.value = { ...newUser }
  }
}, { immediate: true })

// 3. Reset form data when modal opens (discards unsaved changes)
watch(showProfileModal, (isOpen) => {
  if (isOpen && user.value) {
    profile.value = { ...user.value }
  }
})
</script>