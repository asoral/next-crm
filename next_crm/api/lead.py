import frappe
from frappe import _
import json

from next_crm.api.doc import get_assigned_users, get_fields_meta
from next_crm.ncrm.doctype.crm_form_script.crm_form_script import get_form_script


@frappe.whitelist()
def get_lead(name):
    Lead = frappe.qb.DocType("Lead")

    query = frappe.qb.from_(Lead).select("*").where(Lead.name == name).limit(1)

    lead = query.run(as_dict=True)
    if not len(lead):
        frappe.throw(_("Lead not found"), frappe.DoesNotExistError)
    lead = lead.pop()

    lead["doctype"] = "Lead"
    lead["fields_meta"] = get_fields_meta("Lead")
    lead["_form_script"] = get_form_script("Lead")
    lead["_assign"] = get_assigned_users("Lead", lead.name)
    hide_comments_tab = frappe.db.get_single_value("NCRM Settings", "hide_comments_tab")
    lead["hide_comments_tab"] = hide_comments_tab
    return lead


@frappe.whitelist()
def declare_enquiry_lost_api(name, lost_reasons_list, competitors, detailed_reason=None):
    import json

    if isinstance(lost_reasons_list, str):
        lost_reasons_list = json.loads(lost_reasons_list)

    if isinstance(competitors, str):
        competitors = json.loads(competitors)

    lead = frappe.get_doc("Lead", name)

    # Clear existing child table entries if needed
    lead.set("custom_lost_reason", [])
    for reason in lost_reasons_list:
        lead.append("custom_lost_reason", {
            "reason": reason,  # replace with actual fieldname in child table
        })

    lead.set("custom_competitor", [])
    for comp in competitors:
        lead.append("custom_competitor", {
            "competitor": comp,  # replace with actual fieldname in child table
        })

    if detailed_reason:
        lead.custom_detailed_reason = detailed_reason

    lead.status = "Junk"

    lead.save(ignore_permissions=True)
    return _("Lead updated successfully")

import frappe

@frappe.whitelist()
def check_opportunity_for_lead(lead_name):
    return frappe.db.exists("Opportunity", {"lead": lead_name}) is not None








