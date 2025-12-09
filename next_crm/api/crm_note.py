import frappe
from frappe import _
from frappe.desk.doctype.notification_log.notification_log import (
    enqueue_create_notification,
    get_title_html,
)
from frappe.utils import now, now_datetime, add_to_date

from next_crm.ncrm.doctype.crm_notification.crm_notification import notify_user


# how long we consider "duplicate" creations (seconds)
DUPLICATE_WINDOW_SECS = 60

# how long we consider Note + CRM Note "paired" by time window (seconds)
BACKEND_MATCH_WINDOW_SECS = 60


@frappe.whitelist()
def create_note(
    doctype, docname, title=None, note=None, parent_note=None, attachments=None
):
    """
    Create both a CRM Note (for frontend) and a standard Note (for backend visibility).
    Duplicate protection: if the same user has created an identical note/title for the
    same parent within DUPLICATE_WINDOW_SECS, return the existing CRM Note and a
    best-effort backend Note instead of creating new ones.
    """
    if not note and not title:
        raise frappe.ValidationError("Either note or title is required.")

    # ----- Duplicate detection -----
    try:
        window_start = add_to_date(now_datetime(), seconds=-DUPLICATE_WINDOW_SECS)
        existing = frappe.db.sql(
            """
            SELECT name, creation, custom_title, note
            FROM `tabCRM Note`
            WHERE parent = %s
              AND parenttype = %s
              AND owner = %s
              AND creation > %s
              AND (note = %s OR custom_title = %s)
            LIMIT 1
            """,
            (
                docname or "",
                doctype,
                frappe.session.user,
                window_start,
                note or "",
                title or "",
            ),
            as_dict=True,
        )
        if existing:
            row = existing[0]
            existing_name = row.name
            crm_created = row.creation
            title_val = row.custom_title or "Untitled"
            note_val = row.note or ""

            frappe.logger().info(
                f"[create_note] Duplicate prevented: user={frappe.session.user} parent={doctype}/{docname} existing_crm_note={existing_name}"
            )

            # Best-effort: try to find ONE corresponding Note created near that time
            backend_note = _find_backend_note_for_values(
                owner=frappe.session.user,
                title=title_val,
                content=note_val,
                around_datetime=crm_created,
            )

            return {"crm_note": existing_name, "note": backend_note}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "CRM Note duplicate check failed")

    # ----- 1️⃣ Create CRM Note -----
    crm_note = frappe.get_doc(
        {
            "doctype": "CRM Note",
            "custom_title": title,
            "note": note,
            "parenttype": doctype,
            "parent": docname or "",
            "parentfield": "notes",
            "owner": frappe.session.user,
            "added_by": frappe.session.user,
            "added_on": now(),
            "custom_parent_note": parent_note,
        }
    )

    if attachments:
        crm_note.set(
            "custom_note_attachments",
            [
                {"filename": file} if isinstance(file, str) else file
                for file in attachments
            ],
        )

    crm_note.insert(ignore_permissions=True)

    # ----- 2️⃣ Create backend Note -----
    frappe_note = frappe.get_doc(
        {
            "doctype": "Note",
            "title": title or "Untitled",
            "content": note or "",
            "public": 1,
            "owner": frappe.session.user,
        }
    )

    if attachments:
        frappe_note.set(
            "attachments",
            [
                {"file_url": file} if isinstance(file, str) else file
                for file in attachments
            ],
        )

    frappe_note.insert(ignore_permissions=True)

    frappe.db.commit()

    frappe.logger().info(
        f"[create_note] Created crm_note={crm_note.name} core_note={frappe_note.name} by {frappe.session.user} for {doctype}/{docname}"
    )

    frappe.clear_document_cache(doctype, docname)
    frappe.clear_document_cache("Note", frappe_note.name)

    notify_mentions_ncrm(note, crm_note.name, docname, doctype)

    return {
        "crm_note": crm_note.name,
        "note": frappe_note.name,
    }


@frappe.whitelist()
def update_note(doctype, docname, note_name, note=None, attachments=None):
    """
    Update a CRM Note and its corresponding backend Note.

    `note` from frontend can be:
      - dict: { custom_title, note }
      - string: "new note text"
    """
    # Normalize incoming payload
    if isinstance(note, dict):
        new_title = note.get("custom_title")
        new_content = note.get("note")
    else:
        # note is probably a plain string; keep title same, update only body
        new_title = None
        new_content = note

    if not new_title and not new_content:
        raise frappe.ValidationError("Either note or title is required.")

    # Load existing CRM Note
    crm_note_doc = frappe.get_doc("CRM Note", note_name)

    # Capture original values to locate backend Note
    old_title = crm_note_doc.custom_title or "Untitled"
    old_content = crm_note_doc.note or ""
    old_owner = crm_note_doc.owner
    old_creation = crm_note_doc.creation

    # Apply new values
    if new_title is not None:
        crm_note_doc.custom_title = new_title
    if new_content is not None:
        crm_note_doc.note = new_content

    # Attachments handling (same as before)
    if attachments:
        existing_filenames = {row.filename for row in crm_note_doc.custom_note_attachments}

        for file in attachments:
            if isinstance(file, str):
                filename = file
                attachment_row = {"filename": filename}
            elif isinstance(file, dict):
                filename = file.get("filename")
                attachment_row = file
            else:
                continue

            if filename and filename not in existing_filenames:
                crm_note_doc.append("custom_note_attachments", attachment_row)

    crm_note_doc.save()

    # ---- Update backend Note (best-effort) ----
    try:
        backend_note_name = _find_backend_note_for_values(
            owner=old_owner,
            title=old_title,
            content=old_content,
            around_datetime=old_creation,
        )

        if backend_note_name and frappe.db.exists("Note", backend_note_name):
            backend_note_doc = frappe.get_doc("Note", backend_note_name)
            if new_title is not None:
                backend_note_doc.title = new_title or "Untitled"
            if new_content is not None:
                backend_note_doc.content = new_content or ""
            backend_note_doc.save(ignore_permissions=True)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            f"Failed to update backend Note for CRM Note {crm_note_doc.name}",
        )

    notify_mentions_ncrm(crm_note_doc.note, note_name, docname, doctype)

    return crm_note_doc


def notify_mentions_ncrm(note, note_name, docname, doctype):
    from frappe.desk.notifications import extract_mentions

    mentions = set(extract_mentions(note))

    if not mentions:
        return

    for mention in mentions:
        owner = frappe.get_cached_value("User", frappe.session.user, "full_name")
        title = frappe.db.get_value(doctype, {"name": docname}, "title")
        name = title or docname or None
        notification_text = f"""
        <div class="mb-2 leading-5 text-ink-gray-5">
            <span class="font-medium text-ink-gray-9">{owner}</span>
            <span>{_("mentioned you in a Note in {0}").format(doctype)}</span>
            <span class="font-medium text-ink-gray-9">{name}</span>
        </div>
        """
        notify_user(
            {
                "owner": frappe.session.user,
                "assigned_to": mention,
                "notification_type": "Mention",
                "message": note,
                "notification_text": notification_text,
                "reference_doctype": "CRM Note",
                "reference_docname": note_name,
                "redirect_to_doctype": doctype,
                "redirect_to_docname": docname,
            }
        )

    email_notification_message = _(
        """[Next CRM] {0} mentioned you in a Note in {1} {2}"""
    ).format(frappe.bold(owner), frappe.bold(doctype), get_title_html(title))

    recipients = [
        frappe.db.get_value(
            "User",
            {
                "enabled": 1,
                "name": name,
                "user_type": "System User",
                "allowed_in_mentions": 1,
            },
            "email",
        )
        for name in mentions
    ]

    notification_doc = {
        "type": "Mention",
        "document_type": doctype,
        "document_name": docname,
        "subject": email_notification_message,
        "from_user": frappe.session.user,
        "email_content": note,
    }

    enqueue_create_notification(recipients, notification_doc)


def _find_backend_note_for_values(owner, title, content, around_datetime=None):
    """
    Best-effort helper to find a single backend Note that "matches" a CRM Note
    based on owner + title + content + (optionally) creation window.
    Returns Note.name or None.
    """
    filters = {
        "owner": owner,
        "title": title or "Untitled",
        "content": content or "",
    }

    # Time window around creation, if provided
    if around_datetime:
        window_start = add_to_date(around_datetime, seconds=-BACKEND_MATCH_WINDOW_SECS)
        window_end = add_to_date(around_datetime, seconds=BACKEND_MATCH_WINDOW_SECS)
        filters["creation"] = ["between", [window_start, window_end]]

    matches = frappe.get_all(
        "Note",
        filters=filters,
        fields=["name"],
        order_by="creation desc",
        limit=1,
    )

    if matches:
        return matches[0].name

    return None


def _delete_backend_note_for_crm_note_doc(crm_note_doc):
    """
    Delete exactly ONE backend Note that "belongs" to this CRM Note,
    using a safe, narrow match:
      - same owner
      - same title
      - same content
      - creation within BACKEND_MATCH_WINDOW_SECS around CRM Note.creation
    """
    owner = crm_note_doc.owner
    title = crm_note_doc.custom_title or "Untitled"
    content = crm_note_doc.note or ""
    around_datetime = crm_note_doc.creation

    backend_note_name = _find_backend_note_for_values(
        owner=owner,
        title=title,
        content=content,
        around_datetime=around_datetime,
    )

    if not backend_note_name:
        return None

    if not frappe.db.exists("Note", backend_note_name):
        return None

    frappe.delete_doc("Note", backend_note_name, force=True)
    return backend_note_name


@frappe.whitelist()
def delete_note(note_name):
    """
    Safely delete a CRM Note and its related attachments + child notes.
    Also delete ONE backend `Note` per CRM Note (parent + children),
    matched by owner + title + content + creation window.
    """
    try:
        if not note_name:
            frappe.throw(_("Note name is required"))

        # Normalize if frontend passed a dict
        if isinstance(note_name, dict):
            note_name = (
                note_name.get("name")
                or note_name.get("crm_note")
                or note_name.get("note_name")
            )

        if not note_name:
            frappe.throw(_("Note name is required"))

        filenames_to_delete = []
        deleted_backend_notes = []
        crm_note_name = None

        # ---- 1) Resolve CRM Note name ----
        if frappe.db.exists("CRM Note", note_name):
            crm_note_name = note_name
        else:
            # No CRM Note found: just delete backend Note by exact name if exists
            if frappe.db.exists("Note", note_name):
                frappe.delete_doc("Note", note_name, force=True)
                deleted_backend_notes.append(note_name)
                frappe.db.commit()
            return {"message": "Note deleted successfully"}

        # ---- 2) Load main CRM Note ----
        note = frappe.get_doc("CRM Note", crm_note_name)

        # Collect main note attachments
        if getattr(note, "custom_note_attachments", None):
            filenames_to_delete.extend(
                [row.filename for row in note.custom_note_attachments if row.filename]
            )

        # Collect child notes (if this is a parent)
        child_names = []
        if not note.custom_parent_note:
            child_names = frappe.get_all(
                "CRM Note",
                filters={"custom_parent_note": note.name},
                pluck="name",
            )

        # ---- 3) For each child CRM Note, delete ONE backend Note + CRM Note ----
        for child_name in child_names:
            child_doc = frappe.get_doc("CRM Note", child_name)

            if getattr(child_doc, "custom_note_attachments", None):
                filenames_to_delete.extend(
                    [
                        row.filename
                        for row in child_doc.custom_note_attachments
                        if row.filename
                    ]
                )

            deleted_name = _delete_backend_note_for_crm_note_doc(child_doc)
            if deleted_name:
                deleted_backend_notes.append(deleted_name)

            # delete child notifications
            frappe.db.delete(
                "CRM Notification",
                {"notification_type_doc": child_name},
            )

            # delete child CRM Note
            frappe.delete_doc("CRM Note", child_name, force=True)

        # ---- 4) Delete backend Note for main CRM Note ----
        deleted_name = _delete_backend_note_for_crm_note_doc(note)
        if deleted_name:
            deleted_backend_notes.append(deleted_name)

        # ---- 5) Delete notifications for main CRM Note ----
        frappe.db.delete(
            "CRM Notification",
            {"notification_type_doc": note.name},
        )

        # ---- 6) Delete main CRM Note ----
        frappe.delete_doc("CRM Note", note.name, force=True)

        # ---- 7) Delete attached files ----
        if filenames_to_delete:
            frappe.logger().info(
                f"[delete_note] Files to delete for CRM Note {crm_note_name}: {filenames_to_delete}"
            )

        for filename in filenames_to_delete:
            if filename and frappe.db.exists("File", filename):
                try:
                    frappe.delete_doc("File", filename, force=True)
                except Exception:
                    frappe.log_error(
                        frappe.get_traceback(),
                        f"File delete failed during CRM Note delete: {filename}",
                    )

        frappe.db.commit()

        frappe.logger().info(
            f"[delete_note] Deleted crm_note={crm_note_name} backend_notes={deleted_backend_notes} by user={frappe.session.user}"
        )

        return {"message": "Note deleted successfully"}

    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "CRM Note Delete Error")
        frappe.throw(
            _("An unexpected error occurred while deleting the note. Please check Error Log.")
        )


def copy_crm_notes_to_opportunity(lead, opportunity):
    notes = frappe.get_all(
        "CRM Note",
        fields="*",
        filters={
            "parent": lead,
            "parenttype": "Lead",
            "custom_parent_note": ["in", ["", None]],
        },
        order_by="creation asc",
    )

    for note in notes:
        new_parent_note = frappe.new_doc("CRM Note")
        new_parent_note.custom_title = note.custom_title or ""
        new_parent_note.note = note.note or ""
        new_parent_note.parenttype = "Opportunity"
        new_parent_note.parent = opportunity
        new_parent_note.parentfield = "notes"
        new_parent_note.added_by = note.added_by
        new_parent_note.added_on = note.added_on or now()

        attachments = frappe.get_all(
            "NCRM Attachments",
            filters={"parent": note.name, "parenttype": "CRM Note"},
            fields=["filename"],
        )
        for row in attachments:
            new_parent_note.append(
                "custom_note_attachments",
                {
                    "filename": row.filename,
                },
            )

        new_parent_note.insert(ignore_permissions=True)

        # ToDo : Duplicate file from oldnote to new parent note

        frappe.db.set_value(
            "CRM Note",
            new_parent_note.name,
            {
                "owner": note.owner,
            },
        )

        child_notes = frappe.get_all(
            "CRM Note",
            filters={"custom_parent_note": note.name},
            fields="*",
        )

        for child_note in child_notes:
            new_child_note = frappe.new_doc("CRM Note")
            new_child_note.custom_title = child_note.custom_title or ""
            new_child_note.note = child_note.note or ""
            new_child_note.parenttype = "Opportunity"
            new_child_note.parent = opportunity
            new_child_note.parentfield = "notes"
            new_child_note.added_by = child_note.added_by
            new_child_note.added_on = child_note.added_on or now()
            new_child_note.custom_parent_note = new_parent_note.name

            child_attachments = frappe.get_all(
                "NCRM Attachments",
                filters={"parent": child_note.name, "parenttype": "CRM Note"},
                fields=["filename"],
            )
            for row in child_attachments:
                new_child_note.append(
                    "custom_note_attachments",
                    {
                        "filename": row.filename,
                    },
                )

            new_child_note.insert(ignore_permissions=True)

            # ToDo : Duplicate file from oldnote to new child note

            frappe.db.set_value(
                "CRM Note",
                new_child_note.name,
                {
                    "owner": child_note.owner,
                },
            )
    frappe.db.commit()


@frappe.whitelist()
def delete_note_attachments(file_name, note_name=None):
    """
    Deletes a file from the 'NCRM Attachments' child table of a CRM Note
    and deletes the file from the File doctype.
    """
    if not file_name:
        raise frappe.ValidationError("File name is required.")

    if note_name:
        note_doc = frappe.get_doc("CRM Note", note_name)
        removed = False

        new_attachments = []
        for row in note_doc.custom_note_attachments:
            if row.filename == file_name:
                removed = True
                continue
            new_attachments.append(row)

        if not removed:
            frappe.throw("Attachment not found in CRM Note.")

        note_doc.set("custom_note_attachments", new_attachments)
        note_doc.save()

    try:
        frappe.delete_doc("File", file_name, force=True)
    except frappe.DoesNotExistError:
        pass

    return {"status": "success", "message": "Attachment deleted successfully."}
