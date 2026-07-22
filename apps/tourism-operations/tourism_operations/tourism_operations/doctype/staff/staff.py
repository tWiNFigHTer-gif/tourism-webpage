# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import re
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today, validate_email_address

class Staff(Document):
	def before_save(self):
		self.set_full_name()
		if self.name:
			self.employee_id = self.name

	def validate(self):
		self.set_full_name()
		self.validate_full_name()
		self.validate_contact_info()
		self.validate_uniqueness()
		self.validate_dates()
		self.validate_user_account()

	def set_full_name(self):
		parts = [self.get("first_name"), self.get("last_name")]
		full_name_str = " ".join([p.strip() for p in parts if p and str(p).strip()])
		self.full_name = full_name_str

	def validate_full_name(self):
		if not self.get("full_name") or not str(self.full_name).strip():
			frappe.throw(_("Full Name cannot be empty."))

	def validate_contact_info(self):
		email = self.get("email")
		if email:
			validate_email_address(str(email).strip(), throw=True)

		phone_fields = ["phone_number", "alternate_phone_number", "emergency_contact_number"]
		pattern = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")
		
		for field in phone_fields:
			val = getattr(self, field, None)
			if val:
				val_str = str(val).strip()
				if not pattern.match(val_str):
					field_label = self.meta.get_label(field) or field
					frappe.throw(_("Invalid phone number format for {0}: {1}").format(field_label, val_str))

	def validate_uniqueness(self):
		# 1. Duplicate Email
		email = self.get("email")
		if email:
			email_clean = str(email).strip()
			existing_email = frappe.db.get_value("Staff", {"email": email_clean, "name": ["!=", self.name or ""]})
			if existing_email:
				frappe.throw(_("Email address {0} is already registered to Staff member {1}.").format(email_clean, existing_email))

		# 2. Duplicate Primary Phone Number
		phone = self.get("phone_number")
		if phone:
			phone_clean = str(phone).strip()
			existing_phone = frappe.db.get_value("Staff", {"phone_number": phone_clean, "name": ["!=", self.name or ""]})
			if existing_phone:
				frappe.throw(_("Phone number {0} is already registered to Staff member {1}.").format(phone_clean, existing_phone))

		# 3. Emergency Contact Uniqueness
		em_phone = self.get("emergency_contact_number")
		if em_phone:
			em_clean = str(em_phone).strip()
			pri_phone = str(self.get("phone_number") or "").strip()
			alt_phone = str(self.get("alternate_phone_number") or "").strip()
			
			if pri_phone and em_clean == pri_phone:
				frappe.throw(_("Emergency Contact Number cannot be identical to Primary Phone Number."))
			if alt_phone and em_clean == alt_phone:
				frappe.throw(_("Emergency Contact Number cannot be identical to Alternate Phone Number."))

	def validate_dates(self):
		current_date = getdate(today())
		dob = None
		if self.get("date_of_birth"):
			dob = getdate(self.date_of_birth)
			if dob > current_date:
				frappe.throw(_("Date of Birth ({0}) cannot be in the future.").format(dob))

		if self.get("date_of_joining"):
			doj = getdate(self.date_of_joining)
			if dob and doj < dob:
				frappe.throw(_("Date of Joining ({0}) cannot be before Date of Birth ({1}).").format(doj, dob))

	def validate_user_account(self):
		user_acc = self.get("user_account")
		if user_acc:
			user_data = frappe.db.get_value("User", user_acc, ["name", "enabled"], as_dict=True)
			if not user_data:
				frappe.throw(_("User Account {0} does not exist.").format(user_acc))
			elif not user_data.enabled:
				frappe.throw(_("User Account {0} is disabled.").format(user_acc))
