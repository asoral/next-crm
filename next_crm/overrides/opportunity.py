# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from erpnext.crm.doctype.opportunity.opportunity import Opportunity
from erpnext.crm.utils import (
    copy_comments,
    link_communications,
    link_open_events,
    link_open_tasks,
)
from frappe import _
from frappe.desk.form.assign_to import add as assign
from frappe.utils import get_datetime

from next_crm.ncrm.doctype.crm_service_level_agreement.utils import get_sla
from next_crm.ncrm.doctype.crm_stage_change_log.crm_stage_change_log import (
    add_stage_change_log,
)
from next_crm.ncrm.doctype.crm_status_change_log.crm_status_change_log import (
    add_status_change_log,
)
from next_crm.utils import link_gmail_threads


class OverrideOpportunity(Opportunity):
    def before_validate(self):
        self.set_sla()

    def validate(self):
        if not self.is_new():
            curr_owner = frappe.db.get_value(
                self.doctype, self.name, "opportunity_owner"
            )
            if self.opportunity_owner and self.opportunity_owner != curr_owner:
                self.share_with_agent(self.opportunity_owner)
                self.assign_agent(self.opportunity_owner)

        if self.has_value_changed("status"):
            add_status_change_log(self)
            if self.status == "Won":
                self.custom_won_date = get_datetime()

        if self.has_value_changed("sales_stage"):
            add_stage_change_log(self)
        super().validate()

    def after_insert(self):
        if self.opportunity_from == "Lead":
            link_open_tasks(self.opportunity_from, self.party_name, self)
            link_open_events(self.opportunity_from, self.party_name, self)
            if frappe.db.get_single_value(
                "CRM Settings", "carry_forward_communication_and_comments"
            ):
                # copy_comments(self.opportunity_from, self.party_name, self)
                link_communications(self.opportunity_from, self.party_name, self)
                if "frappe_gmail_thread" in frappe.get_installed_apps():
                    link_gmail_threads(self.opportunity_from, self.party_name, self)
        self.set_primary_email_mobile_no()

    def before_save(self):
        self.apply_sla()

    def set_primary_email_mobile_no(self):
        from next_crm.api.contact import get_lead_opportunity_contacts

        contacts = get_lead_opportunity_contacts("Opportunity", self.name)
        if not contacts:
            self.contact_email = ""
            self.contact_mobile = ""
            self.phone = ""
            return

        primary_contact_exists = False
        for d in contacts:
            if d.get("is_primary_contact") == 1:
                primary_contact_exists = True
                self.contact_email = d.get("email").strip() if d.get("email") else ""
                self.contact_mobile = (
                    d.get("mobile_no").strip() if d.get("mobile_no") else ""
                )
                self.phone = d.get("phone").strip() if d.get("phone") else ""
                break

        if not primary_contact_exists:
            self.contact_email = ""
            self.contact_mobile = ""
            self.phone = ""

    def assign_agent(self, agent):
        if not agent:
            return

        assignees = self.get_assigned_users()
        if assignees:
            for assignee in assignees:
                if agent == assignee:
                    # the agent is already set as an assignee
                    return

        assign({"assign_to": [agent], "doctype": "Opportunity", "name": self.name})

    def share_with_agent(self, agent):
        if not agent:
            return

        docshares = frappe.get_all(
            "DocShare",
            filters={"share_name": self.name, "share_doctype": self.doctype},
            fields=["name", "user"],
        )

        shared_with = [d.user for d in docshares] + [agent]

        for user in shared_with:
            if user == agent and not frappe.db.exists(
                "DocShare",
                {"user": agent, "share_name": self.name, "share_doctype": self.doctype},
            ):
                frappe.share.add_docshare(
                    self.doctype,
                    self.name,
                    agent,
                    write=1,
                    flags={"ignore_share_permission": True},
                )
            elif user != agent:
                frappe.delete_doc("DocShare", self.name, ignore_permissions=True)

    def set_sla(self):
        """
        Find an SLA to apply to the opportunity.
        """
        if self.sla:
            return

        sla = get_sla(self)
        if not sla:
            self.first_responded_on = None
            self.first_response_time = None
            return
        self.sla = sla.name

    def apply_sla(self):
        """
        Apply SLA if set.
        """
        if not self.sla:
            return
        sla = frappe.get_last_doc("CRM Service Level Agreement", {"name": self.sla})
        if sla:
            sla.apply(self)

    @staticmethod
    def default_list_data():
        columns = [
            {
                "label": "Customer Name",
                "type": "Data",
                "key": "customer_name",
                "width": "14rem",
            },
            {
                "label": "First Name",
                "type": "Data",
                "key": "first_name",
                "width": "12rem",
            },
            {
                "label": "Status",
                "type": "Link",
                "key": "status",
                "width": "10rem",
            },
            {
                "label": "Sales Stage",
                "type": "Link",
                "key": "sales_stage",
                "width": "12rem",
            },
            {
                "label": "Probability",
                "type": "Percent",
                "key": "probability",
                "width": "10rem",
            },
            {
                "label": "Territory",
                "type": "Link",
                "key": "territory",
                "width": "11rem",
            },
            {
                "label": "Owner",
                "type": "Link",
                "key": "opportunity_owner",
                "width": "12rem",
            },
            {
                "label": "Last Modified",
                "type": "Datetime",
                "key": "modified",
                "width": "10rem",
            },
            {
                "label": "SLA",
                "type": "Data",
                "key": "sla_status",
                "width": "10rem",
            },
        ]

        rows = [
            "name",
            "customer_name",
            "first_name",
            "status",
            "sales_stage",
            "probability",
            "territory",
            "opportunity_owner",
            "sla_status",
            "modified",
        ]

        return {"columns": columns, "rows": rows}


    @staticmethod
    def default_kanban_settings():
        return {
            "column_field": "status",
            "title_field": "customer",
            "kanban_fields": '["opportunity_amount", "contact_email", "contact_mobile", "_assign", "modified"]',
        }


def create_prospect(doc):
    if not doc.get("customer_name"):
        return

    prospect = frappe.new_doc("Prospect")
    prospect.update(
        {
            "company_name": doc.get("customer_name"),
            "website": doc.get("website"),
            "territory": doc.get("territory"),
            "industry": doc.get("industry"),
            "annual_revenue": doc.get("opportunity_amount"),
        }
    )
    prospect.insert()
    return prospect.company_name


def contact_exists(doc):
    email_exist = frappe.db.exists(
        "Contact Email", {"email_id": doc.get("contact_email")}
    )
    mobile_exist = frappe.db.exists(
        "Contact Phone", {"phone": doc.get("contact_mobile")}
    )

    doctype = "Contact Email" if email_exist else "Contact Phone"
    name = email_exist or mobile_exist

    if name:
        return frappe.db.get_value(doctype, name, "parent")

    return False


def create_contact(doc):
    existing_contact = contact_exists(doc)
    if existing_contact:
        return existing_contact

    contact = frappe.new_doc("Contact")
    contact.update(
        {
            "first_name": doc.get("first_name"),
            "last_name": doc.get("last_name"),
            "salutation": doc.get("salutation"),
            "company_name": doc.get("customer") or doc.get("customer_name"),
        }
    )

    if doc.get("contact_email"):
        contact.append(
            "email_ids", {"email_id": doc.get("contact_email"), "is_primary": 1}
        )

    if doc.get("contact_mobile"):
        contact.append(
            "phone_nos", {"phone": doc.get("contact_mobile"), "is_primary_mobile_no": 1}
        )

    contact.insert()
    contact.reload()  # load changes by hooks on contact

    return contact.name


@frappe.whitelist()
def create_opportunity(args):
    from next_crm.api.contact import (
        link_contact_to_doc,
        set_opportunity_primary_contact,
    )

    opportunity = frappe.new_doc("Opportunity")

    contact = args.get("contact_person")
    if not contact and (
        args.get("first_name")
        or args.get("last_name")
        or args.get("email")
        or args.get("mobile_no")
    ):
        contact = create_contact(args)

    opportunity_from = args.get("opportunity_from")
    party_name = args.get("party_name")
    if party_name:
        if party_name == "":
            frappe.throw(_("Please enter either Customer, Lead or Prospect details"))
    elif args.get("customer_name") == "":
        frappe.throw(_("Please enter details for Prospect creation"))
    else:
        opportunity_from = "Prospect"
        party_name = create_prospect(args)
        opportunity.update({"custom_prospect": party_name})

    if opportunity_from == "Customer":
        opportunity.update({"customer": party_name})

    opportunity.update(
        {
            "opportunity_from": opportunity_from,
            "party_name": party_name,
        }
    )

    args.pop("customer", None)
    args.pop("lead", None)
    args.pop("custom_prospect", None)

    opportunity.update(args)

    opportunity.insert()
    
    if contact:
        link_contact_to_doc(contact, "Opportunity", opportunity.name)

        if party_name:
            frappe.db.set_value("Contact", contact, "company_name", party_name)

    set_opportunity_primary_contact(opportunity.name)

    return opportunity.name
