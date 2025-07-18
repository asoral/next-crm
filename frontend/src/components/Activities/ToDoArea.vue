<template>
  <div v-if="todos.length">
    <div v-for="(todo, i) in todos" :key="todo.name">
      <div
        class="activity flex cursor-pointer gap-6 rounded p-2.5 duration-300 ease-in-out hover:bg-gray-1"
        @click="modalRef.showToDo(todo)"
      >
        <div class="flex flex-1 flex-col gap-1.5 text-base truncate">
          <div class="font-medium text-ink-gray-9 truncate">
            {{ todo.custom_title }}
          </div>
          <div class="flex gap-1.5 text-ink-gray-8">
            <div class="flex items-center gap-1.5">
              <UserAvatar :user="todo.allocated_to" size="xs" />
              {{ getUser(todo.allocated_to).full_name }}
            </div>
            <div
              v-if="
                todo.date &&
                !Object.keys(todo).includes('custom_from_time') &&
                Object.keys(todo).includes('custom_to_time')
              "
              class="flex items-center justify-center"
            >
              <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            </div>
            <div
              v-if="
                todo.date &&
                !Object.keys(todo).includes('custom_from_time') &&
                Object.keys(todo).includes('custom_to_time')
              "
            >
              <Tooltip :text="dateFormat(todo.date, 'ddd, MMM D, YYYY')">
                <div class="flex gap-2">
                  <CalendarIcon />
                  <div>{{ dateFormat(todo.date, 'D MMM') }}</div>
                </div>
              </Tooltip>
            </div>
            <div class="flex items-center justify-center">
              <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            </div>
            <div v-if="todo?.custom_from_time">
              <Tooltip :text="dateFormat(todo?.custom_from_time, 'ddd, MMM D, YYYY | hh:mm a')">
                <div class="flex gap-2">
                  <CalendarIcon class="size-4 text-ink-gray-5" />
                  <div>{{ dateFormat(todo?.custom_from_time, 'D MMM , hh:mm a') }}</div>
                </div>
              </Tooltip>
            </div>
            <div v-if="todo?.custom_from_time" class="flex items-center justify-center">
              <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            </div>
            <div v-if="todo?.custom_to_time">
              <Tooltip :text="dateFormat(todo?.custom_to_time, 'ddd, MMM D, YYYY | hh:mm a')">
                <div class="flex gap-2">
                  <CalendarIcon class="size-4 text-ink-gray-5" />
                  <div>{{ dateFormat(todo?.custom_to_time, 'D MMM , hh:mm a') }}</div>
                </div>
              </Tooltip>
            </div>
            <div v-if="todo?.custom_to_time" class="flex items-center justify-center">
              <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            </div>
            <div class="flex gap-2">
              <ToDoPriorityIcon class="!h-2 !w-2" :priority="todo.priority" />
              {{ todo.priority }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <Dropdown :options="todoStatusOptions((status) => handleStatusChange(status, todo))" @click.stop>
            <Tooltip :text="__('Change Status')">
              <Button variant="ghosted" class="hover:bg-surface-gray-4">
                <ToDoStatusIcon :status="todo.status" />
              </Button>
            </Tooltip>
          </Dropdown>
          <Dropdown
            :options="[
              {
                label: __('Delete'),
                icon: 'trash-2',
                onClick: () => {
                  $dialog({
                    title: __('Delete ToDo'),
                    message: __('Are you sure you want to delete this todo?'),
                    actions: [
                      {
                        label: __('Delete'),
                        theme: 'red',
                        variant: 'solid',
                        onClick(close) {
                          modalRef.deleteToDo(todo.name)
                          close()
                        },
                      },
                    ],
                  })
                },
              },
            ]"
            @click.stop
          >
            <Button icon="more-horizontal" variant="ghosted" class="hover:bg-surface-gray-4 text-ink-gray-9" />
          </Dropdown>
        </div>
      </div>
      <div v-if="i < todos.length - 1" class="mx-2 h-px border-t border-gray-200" />
    </div>
  </div>
</template>
<script setup>
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import DotIcon from '@/components/Icons/DotIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { dateFormat, todoStatusOptions } from '@/utils'
import { usersStore } from '@/stores/users'
import { globalStore } from '@/stores/global'
import { Tooltip, Dropdown } from 'frappe-ui'

const props = defineProps({
  todos: Array,
  modalRef: Object,
})

const { getUser } = usersStore()
const { $dialog } = globalStore()
async function handleStatusChange(status, todo) {
  props.modalRef.updateToDoStatus(status, todo)

  if (status === 'Closed') {
    try {
      const res = await fetch(`/api/resource/ToDo/${todo.name}`)
      const fullToDo = await res.json()

      props.modalRef.showToDo({
  custom_title: '',
  description: '',
  allocated_to: fullToDo.data.allocated_to,
  assigned_by: fullToDo.data.assigned_by,
  date: '',
  status: 'Open',
  priority: fullToDo.data.priority || 'Medium',
})

    } catch (err) {
      console.error('Failed to fetch full ToDo:', err)
    }
  }
}





</script>
