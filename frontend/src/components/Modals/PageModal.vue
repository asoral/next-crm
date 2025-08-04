<template>
	<Dialog
		v-model="show"
		class="text-base z-50"
		:options="{
			title: __('Add CRM Web Page'),
			size: 'lg',
			actions: [
				{
					label: 'Add',
					variant: 'solid',
					onClick: (close) => {
						addWebPage(close)
					},
				},
			],
		}"
	>
		<template #body-content>
			<TextInput
				v-model="page.page_name"
				label="Page Name"
				placeholder="Enter Page Name"
				class="mt-2"
			/>
			<IconPickerII v-model="page.icon" :label="__('Icon')" class="mt-2" />
			<Textarea
				v-model="page.html"
				label="HTML Content"
				placeholder="Paste HTML here"
				:rows="6"
				class="mt-2"
			/>
				<div class="mt-2 w-full">
				  <label class="text-sm font-medium text-gray-500">For Your Help</label>
			  
				  <div
					class="mt-1 w-full whitespace-pre-wrap rounded-md border border-gray-300 bg-gray-100 p-2 font-mono text-sm text-gray-800 shadow-sm"
					style="min-height: 150px;"
				  >
			  &lt;div style="display: flex; flex-direction: column; width: 100%; height: 100vh;"&gt;<br />
			  &nbsp;&nbsp;&lt;iframe <br />
			  &nbsp;&nbsp;&nbsp;&nbsp;src="Paste Your Url Here"<br />
			  &nbsp;&nbsp;&nbsp;&nbsp;style="flex: 1; width: 100%; border: none;"<br />
			  &nbsp;&nbsp;&nbsp;&nbsp;allowfullscreen<br />
			  &nbsp;&nbsp;&nbsp;&nbsp;loading="lazy"<br />
			  &nbsp;&nbsp;&gt;&lt;/iframe&gt;<br />
			  &lt;/div&gt;
				  </div>
				</div>
			  
			  
</template>

	</Dialog>
</template>

<script setup>
import { Dialog, TextInput, Textarea, createResource, toast } from 'frappe-ui'
import IconPicker from '@/components/Controls/IconPickerII.vue'
import { reactive, computed, ref } from 'vue'

const show = defineModel()
const sidebar = defineModel('reloadSidebar')

const page = reactive({
	page_name: '',
	icon: '',
	main_section_html: '',
})

const reaction = ref(false) // needed for IconPicker

// Only send icon name string
const iconName = computed(() =>
	typeof page.icon === 'object' && page.icon.name ? page.icon.name : page.icon
)

const webPage = createResource({
	url: '/api/resource/CRM Web Page',
	method: 'POST',
	makeParams() {
		return {
			page_name: page.page_name,
			icon: iconName.value,
			main_section_html: page.html,
		}
	},
})

const addWebPage = (close) => {
	webPage.submit(
		{},
		{
			onSuccess() {
				toast.success(__('CRM Web Page created'))
				close()
				page.page_name = ''
				page.icon = ''
				page.html = ''
				
				sidebar.value?.reload?.()
				window.location.reload()

			},
			onError(err) {
				page.page_name = ''
				page.icon = ''
				page.html = ''
				
				sidebar.value?.reload?.()
				window.location.reload()
				close()
			},
		}
	)
}
</script>

<style>
#dialog{
	z-index: 100;
}
</style>