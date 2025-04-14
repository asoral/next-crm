import frappe
from frappe import _


@frappe.whitelist()
def get_address(name):
    Address = frappe.qb.DocType("Address")

    query = frappe.qb.from_(Address).select("*").where(Address.name == name).limit(1)

    address = query.run(as_dict=True)
    if not len(address):
        frappe.throw(_("Address not found"), frappe.DoesNotExistError)
    address = address.pop()

    address["doctype"] = "Address"
    return address


@frappe.whitelist()
def get_linked_address(link_doctype, link_name):
    addresses = frappe.get_list(
        "Address",
        [
            ["Dynamic Link", "link_doctype", "=", link_doctype],
            ["Dynamic Link", "link_name", "=", link_name],
        ],
        pluck="name",
    )

    return addresses


@frappe.whitelist()
def get_linked_docs(address, link_doctype):
    address_doc = frappe.get_doc("Address", address)

    names = []
    for link in address_doc.links:
        if link.link_doctype == link_doctype:
            names.append(link.link_name)

    return names


@frappe.whitelist()
def link_address_to_doc(address, doctype, docname):
    if not frappe.has_permission(doctype, "write", docname):
        frappe.throw(_("Not allowed to link address"), frappe.PermissionError)

    address_doc = frappe.get_doc("Address", address)

    address_doc.append("links", {"link_doctype": doctype, "link_name": docname})

    address_doc.save()

    return address_doc.name


@frappe.whitelist()
def set_billing_shipping(address_name, is_billing):
    address = frappe.get_doc("Address", address_name)
    if is_billing:
        address.is_primary_address = True
    else:
        address.is_shipping_address = True

    address.save()
    return True
