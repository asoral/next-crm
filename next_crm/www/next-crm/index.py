# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# GNU GPLv3 License. See license.txt

import frappe

from next_crm.www import get_boot

no_cache = 1


def get_context():
    frappe.db.commit()
    context = frappe._dict()
    context.boot = get_boot()
    if frappe.session.user != "Guest":
    return context
