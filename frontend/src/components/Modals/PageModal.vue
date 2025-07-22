<template>
	<Dialog
		v-model="show"
		class="text-base"
		:options="{
			title: __('Add web page to sidebar'),
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
			<Link
				v-model="page.webpage"
				doctype="Web Page"
				:label="__('Web Page')"
				:filters="{
					published: 1,
				}"
			/>
			<!-- <IconPicker v-model="page.icon" :label="__('Icon')" class="mt-4" /> -->
		</template>
	</Dialog>
</template>
<script setup>
import { Dialog, toast } from 'frappe-ui'
import Link from '@/components/Controls/Link.vue'
import IconPicker from '@/components/IconPicker.vue'
import { reactive, watch } from 'vue'

const show = defineModel()

const page = reactive({
	icon: '',
	webpage: '',
})

const props = defineProps({
	page: {
		type: Object,
		default: null,
	},
})

watch(
	() => props.page,
	(newPage) => {
		if (newPage) {
			page.icon = newPage.icon
			page.webpage = newPage.web_page
		}
	},
	{ immediate: true }
)

const addWebPage = (close) => {
	if (!page.webpage) {
		toast.error('Please select a Web Page')
		return
	}

	// Get current stored links
	const stored = JSON.parse(localStorage.getItem('customMoreLinks') || '[]')

	// Add new entry
	stored.push({
		label: page.webpage,
		icon: page.icon || 'FileTextIcon',
		to: page.webpage,
	})

	localStorage.setItem('customMoreLinks', JSON.stringify(stored))
	close()

	// Optional: reload the page to reflect instantly
	window.location.reload()
}


</script>



