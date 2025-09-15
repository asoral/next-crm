import frappe

from next_crm.api.todo import notify_assigned_user


def before_insert(doc, method=None):
    from frappe.desk.doctype.notification_log.notification_log import get_title

    if not doc.custom_title and (doc.reference_type and doc.reference_name):
        title = get_title(doc.reference_type, doc.reference_name)
        doc.custom_title = title

    if not doc.reference_type == "Task":
        return
    ref_doc_desc = frappe.get_value(
        doc.reference_type, doc.reference_name, "description"
    )
    doc.description = ref_doc_desc


def after_insert(doc, method=None):
    if (
        doc.reference_type in ["Lead", "Opportunity"]
        and doc.reference_name
        and doc.allocated_to
    ):
        fieldname = (
            "lead_owner" if doc.reference_type == "Lead" else "opportunity_owner"
        )
        lead_owner = frappe.db.get_value(
            doc.reference_type, doc.reference_name, fieldname
        )
        if not lead_owner:
            frappe.db.set_value(
                doc.reference_type, doc.reference_name, fieldname, doc.allocated_to
            )

    if (
        doc.reference_type in ["Lead", "Opportunity", "ToDo"]
        and doc.reference_name
        and doc.allocated_to
    ):
        notify_assigned_user(doc)


def on_update(doc, method=None):
    if (
        doc.has_value_changed("status")
        and doc.status == "Cancelled"
        and doc.reference_type in ["Lead", "Opportunity", "ToDo"]
        and doc.reference_name
        and doc.allocated_to
    ):
        notify_assigned_user(doc, is_cancelled=True)


def on_trash(doc, method=None):
    if doc.custom_linked_event:
        frappe.delete_doc(
            "Event",
            doc.custom_linked_event,
            ignore_permissions=True,
            force=True,
        )


def before_save(doc, method):
    if doc.is_new():
        return
    db_value = frappe.get_doc("ToDo", doc.name)
    print("db values:----->", db_value.db_get("status"), db_value.db_get("reference_type"))
    print("new_value:---->",doc.status, doc.reference_type)

    if db_value.db_get("status") == "Closed" and db_value.db_get("reference_type") == "Lead":
        doc.db_set("custom_converting_into_opportunity", 1)
    
    if doc.db_get("custom_converting_into_opportunity") == 1 and doc.reference_type == "Opportunity" and doc.status != "Closed":
        doc.db_set("status", "Closed")