# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt
import frappe
from frappe.desk.doctype.event.event import Event

# from frappe.desk.form.assign_to import add as assign
# from frappe.desk.form.assign_to import remove as unassign

# from next_crm.ncrm.doctype.crm_notification.crm_notification import notify_user


class Event(Event):
    # def after_insert(self):
    # 	# self.assign_to()
    # 	pass

    # def validate(self):
    # 	if self.is_new() or not self.allocated_to:
    # 		return

    # 	if self.get_doc_before_save().allocated_to != self.allocated_to:
    # 		self.unassign_from_previous_user(self.get_doc_before_save().allocated_to)
    # 		# self.assign_to()
    # 	super().validate()

    # def unassign_from_previous_user(self, user):
    # 	unassign(self.doctype, self.name, user)

    # def assign_to(self):
    # 	if self.allocated_to:
    # 		assign({
    # 			"assign_to": [self.allocated_to],
    # 			"doctype": self.doctype,
    # 			"name": self.name,
    # 			"description": self.custom_title or self.description,
    # 		})

    @staticmethod
    def default_list_data():
        columns = [
            {
                "label": "Subject",
                "type": "Data",
                "key": "subject",
                "width": "16rem",
            },
            {
                "label": "Status",
                "type": "Select",
                "key": "status",
                "width": "8rem",
            },
            {
                "label": "Last Modified",
                "type": "Datetime",
                "key": "modified",
                "width": "8rem",
            },
            {
                "label": "Modified By",
                "type": "Link",
                "key": "modified_by",
                "width": "16rem",
            },
        ]

        rows = [
            "name",
            "subject",
            "description",
            "modified_by",
            "status",
            "modified",
        ]

        todo_meta = frappe.get_meta("Event")

        if todo_meta.has_field("custom_from_time"):
            rows.append("custom_from_time")
        if todo_meta.has_field("custom_to_time"):
            rows.append("custom_to_time")

        return {"columns": columns, "rows": rows}

    @staticmethod
    def default_kanban_settings():
        return {
            "column_field": "status",
            "title_field": "subject",
            "kanban_fields": '["description", "priority", "creation"]',
        }
