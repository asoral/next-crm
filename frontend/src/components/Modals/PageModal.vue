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