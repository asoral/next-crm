<template>
  <div v-if="todos.length">
    <div v-for="(todo, i) in sortedTodos" :key="todo.name" :id="todo.name">
      <div class="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
        <div class="inline-flex items-center flex-wrap gap-1 text-ink-gray-5">
          <UserAvatar class="mr-1" :user="todo.allocated_to" size="md" />
          <span class="font-medium text-ink-gray-8">
            {{ getUser(todo.allocated_to).full_name }}
          </span>
          <span>{{ __('added a') }}</span>
          <span class="max-w-xs truncate font-medium text-ink-gray-8">
            {{ __('ToDo') }}
          </span>
        </div>
        <div class="ml-auto whitespace-nowrap">
         
          <Tooltip :text="dateFormat(todo.modified, dateTooltipFormat)">
            <div class="truncate text-sm text-ink-gray-7">
              {{ __(timeAgo(todo.modified)) }}
            </div>
          </Tooltip>
        </div>
        
        
           <div class="mt-2 flex justify-end gap-2">
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

      <div
        class="cursor-pointer rounded bg-surface-gray-1 px-3 py-[7.5px] text-base leading-6 transition-all duration-300 ease-in-out"
        @click="modalRef.showToDo(todo)"
      >
        <div class="prose-f">
          <div class="font-medium text-ink-gray-9">{{ todo.custom_title }}</div>
         
        
          <div class="text-ink-gray-7 mt-1 text-sm">{{ stripHtml(todo.description) }}</div>
        </div>

        <div class="mt-2 flex flex-wrap gap-3 items-center text-sm text-ink-gray-7">
          <div class="flex items-center gap-1">
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span v-if="todo.date">{{ dateFormat(todo.date, 'D MMM, YYYY') }}</span>
          </div>
          <div v-if="todo.custom_from_time" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(todo.custom_from_time, 'D MMM, hh:mm a') }}</span>
          </div>
          <div v-if="todo.custom_to_time" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <CalendarIcon class="size-4 text-ink-gray-5" />
            <span>{{ dateFormat(todo.custom_to_time, 'D MMM, hh:mm a') }}</span>
          </div>
         <div v-if="todo.priority" class="flex items-center gap-1">
            <DotIcon class="h-2.5 w-2.5 text-ink-gray-5" :radius="2" />
            <ToDoPriorityIcon class="!h-2 !w-2" :priority="todo.priority" />
            <span>{{ todo.priority }}</span>
          </div>
        </div>

     
      </div>

      <div v-if="i < todos.length - 1" class="my-3 border-t border-gray-200" />
    </div>
  </div>
</template>

<script setup>
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import ToDoStatusIcon from '@/components/Icons/ToDoStatusIcon.vue'
import ToDoPriorityIcon from '@/components/Icons/ToDoPriorityIcon.vue'
import DotIcon from '@/components/Icons/DotIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { Tooltip, Dropdown, Button } from 'frappe-ui'
import { dateFormat, timeAgo, dateTooltipFormat, todoStatusOptions } from '@/utils'
import { usersStore } from '@/stores/users'
import { globalStore } from '@/stores/global'
import { computed } from 'vue'



const props = defineProps({
  todos: Array,
  modalRef: Object,
})

// console.log('time', props.todos)
const { getUser } = usersStore()
const { $dialog } = globalStore()

const sortedTodos = computed(() => {
  return [...props.todos]
    .filter(todo => !!todo.modified) 
    .sort((a, b) => new Date(b.modified) - new Date(a.modified)) 
    .concat(props.todos.filter(todo => !todo.modified)) 
})


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


function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function convertToLocal(dateString) {
  const date = new Date(dateString.replace(' ', 'T'));
  return date;
}

</script>
