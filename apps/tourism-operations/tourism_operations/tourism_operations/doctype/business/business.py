# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import re
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime, validate_url

class Business(Document):
	def before_save(self):
		if self.name:
			self.business_code = self.name

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

		# Record verification timestamps when status becomes Verified
		if self.registration_status == "Verified" and not self.get("verification_date"):
			self.verification_date = now_datetime()
			if not self.get("verified_by"):
				stf = frappe.db.get_value("Staff", {"user_id": frappe.session.user}) or frappe.db.get_value("Staff", {"email": frappe.session.user})
				self.verified_by = stf or None

		# Process child Business Documents verification metadata
		if self.get("documents"):
			stf_id = frappe.db.get_value("Staff", {"user_id": frappe.session.user}) or frappe.db.get_value("Staff", {"email": frappe.session.user})
			for doc_row in self.documents:
				if doc_row.verification_status == "Verified" and not doc_row.verification_date:
					doc_row.verification_date = now_datetime()
					if stf_id:
						doc_row.verified_by = stf_id

	def validate(self):
		self.validate_expiry_and_dates()
		self.validate_phone_numbers()
		self.validate_urls()

	def validate_expiry_and_dates(self):
		lic_exp = self.get("license_expiry")
		if lic_exp:
			exp_date = getdate(lic_exp)
			if exp_date < getdate(frappe.utils.nowdate()):
				self.registration_status = "Expired"

	def validate_phone_numbers(self):
		phone_pattern = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")

		p_num = str(self.get("contact_number") or "").strip()
		if not phone_pattern.match(p_num):
			frappe.throw(_("Invalid primary Contact Number format: {0}").format(p_num))

		alt_num = str(self.get("alternate_contact_number") or "").strip()
		if alt_num and not phone_pattern.match(alt_num):
			frappe.throw(_("Invalid Alternate Contact Number format: {0}").format(alt_num))

		emg_num = str(self.get("emergency_contact_number") or "").strip()
		if emg_num:
			if not phone_pattern.match(emg_num):
				frappe.throw(_("Invalid Emergency Contact Number format: {0}").format(emg_num))

			if emg_num == p_num:
				frappe.throw(_("Emergency Contact Number ({0}) cannot be equal to primary Contact Number.").format(emg_num))
			if alt_num and emg_num == alt_num:
				frappe.throw(_("Emergency Contact Number ({0}) cannot be equal to Alternate Contact Number.").format(emg_num))

	def validate_urls(self):
		web_url = self.get("website_url")
		if web_url:
			try:
				validate_url(web_url, throw=True)
			except Exception:
				frappe.throw(_("Invalid Website URL format: {0}").format(web_url))

	@frappe.whitelist()
	def verify_business(self, staff_member=None):
		from frappe.model.workflow import apply_workflow
		if self.get("workflow_state") == "Pending Verification":
			apply_workflow(self, "Approve & Verify")
		else:
			self.registration_status = "Verified"
			self.verification_date = now_datetime()
			if staff_member:
				self.verified_by = staff_member
			self.save(ignore_permissions=True)

	@frappe.whitelist()
	def reject_business(self, reason=None):
		from frappe.model.workflow import apply_workflow
		if reason:
			self.rejection_reason = reason
		if self.get("workflow_state") == "Pending Verification":
			apply_workflow(self, "Reject")
		else:
			self.registration_status = "Rejected"
			self.save(ignore_permissions=True)

	@frappe.whitelist()
	def suspend_business(self, reason=None):
		from frappe.model.workflow import apply_workflow
		if reason:
			self.suspension_reason = reason
		if self.get("workflow_state") == "Verified":
			apply_workflow(self, "Suspend")
		else:
			self.registration_status = "Suspended"
			self.save(ignore_permissions=True)

	@frappe.whitelist()
	def reactivate_business(self):
		from frappe.model.workflow import apply_workflow
		if self.get("workflow_state") in ["Suspended", "Expired"]:
			apply_workflow(self, "Reactivate")
		else:
			self.registration_status = "Verified"
			self.suspension_reason = None
			self.save(ignore_permissions=True)
