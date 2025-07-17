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
