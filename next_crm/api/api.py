import json

import frappe
from frappe import _


# File: next_crm/api/api.py

@frappe.whitelist()
def get_all_events():
    events = frappe.get_all(
        "Event",
        fields=["*"],
        order_by="starts_on desc",
        limit=1000
    )

    # Now fetch child table data manually
    for e in events:
        e["event_participants"] = frappe.get_all(
            "Event Participants",
            fields=["reference_doctype", "reference_docname"],
            filters={"parent": e.name}
        )

    return events

# @frappe.whitelist()
# def update_sidebar_item(webpage, icon):
# 	filters = {
# 		"web_page": webpage,
# 		"parenttype": "LMS Settings",
# 		"parentfield": "sidebar_items",
# 		"parent": "LMS Settings",
# 	}

# 	if frappe.db.exists("LMS Sidebar Item", filters):
# 		frappe.db.set_value("LMS Sidebar Item", filters, "icon", icon)
# 	else:
# 		doc = frappe.new_doc("LMS Sidebar Item")
# 		doc.update(filters)
# 		doc.icon = icon
# 		doc.insert()



# @frappe.whitelist()
# def delete_sidebar_item(webpage):
# 	return frappe.db.delete(
# 		"LMS Sidebar Item",
# 		{
# 			"web_page": webpage,
# 			"parenttype": "LMS Settings",
# 			"parentfield": "sidebar_items",
# 			"parent": "LMS Settings",
# 		},
# 	)
# @frappe.whitelist(allow_guest=True)
# def get_lms_setting(field):
# 	return frappe.get_cached_value("LMS Settings", None, field)