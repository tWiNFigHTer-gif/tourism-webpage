# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import re
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime, today, validate_email_address

class Tourist(Document):
	def before_save(self):
		if self.name:
			self.tourist_id = self.name

		# Generate full_name
		f_name = (self.first_name or "").strip()
		l_name = (self.last_name or "").strip()
		self.full_name = f"{f_name} {l_name}".strip()

		# Sync registration_status from Frappe native runtime workflow_state
		wf_state = self.get("workflow_state")
		if wf_state:
			prev_wf_state = self.db_get("workflow_state") if self.name and not self.is_new() else None
			self.registration_status = wf_state

			# Record audit log metadata if workflow state changed
			if prev_wf_state and prev_wf_state != wf_state:
				audit_entry = f"[{now_datetime()}] Workflow State changed from '{prev_wf_state}' to '{wf_state}' by User '{frappe.session.user}'."
				if self.remarks:
					self.remarks = f"{self.remarks}\n{audit_entry}"
				else:
					self.remarks = audit_entry

		# Record blacklisting timestamps when status becomes Blacklisted
		if self.registration_status == "Blacklisted" and not self.get("blacklist_date"):
			self.blacklist_date = now_datetime()
			if not self.get("blacklisted_by"):
				stf = frappe.db.get_value("Staff", {"user_id": frappe.session.user}) or frappe.db.get_value("Staff", {"email": frappe.session.user})
				self.blacklisted_by = stf or None

	def validate(self):
		self.validate_dates()
		self.validate_contact_numbers()
		self.validate_email()
		self.validate_government_id()
		self.validate_uniqueness()

	def validate_dates(self):
		if self.date_of_birth:
			dob = getdate(self.date_of_birth)
			if dob > getdate(today()):
				frappe.throw(_("Date of Birth ({0}) cannot be in the future.").format(dob))

		if self.arrival_date and self.departure_date:
			arr_d = getdate(self.arrival_date)
			dep_d = getdate(self.departure_date)
			if arr_d > dep_d:
				frappe.throw(_("Arrival Date ({0}) cannot be after Departure Date ({1}).").format(arr_d, dep_d))

	def validate_contact_numbers(self):
		phone_pattern = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")

		p_num = str(self.phone_number or "").strip()
		if not phone_pattern.match(p_num):
			frappe.throw(_("Invalid primary Phone Number format: {0}").format(p_num))

		alt_num = str(self.get("alternate_phone_number") or "").strip()
		if alt_num:
			if not phone_pattern.match(alt_num):
				frappe.throw(_("Invalid Alternate Phone Number format: {0}").format(alt_num))

		emg_num = str(self.get("emergency_contact_phone") or self.get("emergency_contact_number") or "").strip()
		if emg_num:
			if not phone_pattern.match(emg_num):
				frappe.throw(_("Invalid Emergency Contact Number format: {0}").format(emg_num))

			if emg_num == p_num:
				frappe.throw(_("Emergency Contact Number ({0}) cannot be equal to primary Phone Number.").format(emg_num))
			if alt_num and emg_num == alt_num:
				frappe.throw(_("Emergency Contact Number ({0}) cannot be equal to Alternate Phone Number.").format(emg_num))

	def validate_email(self):
		if self.email:
			validate_email_address(str(self.email).strip(), throw=True)

	def validate_government_id(self):
		gid_type = self.get("government_id_type")
		gid_num = self.get("government_id_number") or self.get("national_id_number") or self.get("passport_number")
		if gid_type and not gid_num:
			frappe.throw(_("Government ID Number is mandatory when Government ID Type ({0}) is selected.").format(
				gid_type
			))

	def validate_uniqueness(self):
		p_num = str(self.phone_number or "").strip()
		if p_num:
			existing_p = frappe.db.get_value("Tourist", {"phone_number": p_num, "name": ["!=", self.name]})
			if existing_p:
				frappe.throw(_("A Tourist record with Phone Number {0} already exists ({1}).").format(p_num, existing_p))

		e_mail = str(self.email or "").strip().lower()
		if e_mail:
			existing_e = frappe.db.get_value("Tourist", {"email": e_mail, "name": ["!=", self.name]})
			if existing_e:
				frappe.throw(_("A Tourist record with Email {0} already exists ({1}).").format(e_mail, existing_e))

		g_id = str(self.get("government_id_number") or "").strip()
		if g_id:
			existing_g = frappe.db.get_value("Tourist", {"government_id_number": g_id, "name": ["!=", self.name]})
			if existing_g:
				frappe.throw(_("A Tourist record with Government ID Number {0} already exists ({1}).").format(g_id, existing_g))

	@frappe.whitelist()
	def blacklist_tourist(self, staff_member=None, reason=None):
		from frappe.model.workflow import apply_workflow
		if reason:
			self.blacklist_reason = reason
		if self.get("workflow_state") == "Active":
			apply_workflow(self, "Blacklist")
		else:
			self.registration_status = "Blacklisted"
			self.blacklist_date = now_datetime()
			if staff_member:
				self.blacklisted_by = staff_member
			self.save(ignore_permissions=True)

	@frappe.whitelist()
	def reactivate_tourist(self):
		from frappe.model.workflow import apply_workflow
		if self.get("workflow_state") in ["Blacklisted", "Inactive"]:
			apply_workflow(self, "Reactivate")
		else:
			self.registration_status = "Active"
			self.blacklist_reason = None
			self.save(ignore_permissions=True)
