# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import re
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, validate_email_address

class Event(Document):
	def before_save(self):
		if self.name:
			self.event_code = self.name
		
		# Calculate Remaining Seats
		max_p = self.maximum_participants or 0
		curr_r = self.current_registrations or 0
		self.remaining_seats = max(0, max_p - curr_r)

		# Auto-set registration_status to Full if capacity reached
		if max_p > 0 and curr_r >= max_p:
			self.registration_status = "Full"

	def validate(self):
		self.validate_dates()
		self.validate_capacity_and_pricing()
		self.validate_coordinator()
		self.validate_organizer_contact()
		self.validate_child_tables()

	def validate_dates(self):
		start_d = getdate(self.start_date) if self.start_date else None
		end_d = getdate(self.end_date) if self.end_date else None
		reg_d = getdate(self.registration_deadline) if self.registration_deadline else None

		if start_d and end_d:
			if end_d < start_d:
				frappe.throw(_("End Date ({0}) cannot be before Start Date ({1}).").format(end_d, start_d))

			if start_d == end_d and self.start_time and self.end_time:
				if str(self.start_time) >= str(self.end_time):
					frappe.throw(_("Start Time ({0}) must be before End Time ({1}) for same-day events.").format(
						self.start_time, self.end_time
					))

		if reg_d and start_d:
			if reg_d > start_d:
				frappe.throw(_("Registration Deadline ({0}) cannot be after Event Start Date ({1}).").format(reg_d, start_d))

	def validate_capacity_and_pricing(self):
		ev_type = self.get("event_type") or "Free"
		t_price = float(self.ticket_price or 0)

		if ev_type == "Free" and t_price != 0:
			frappe.throw(_("Ticket Price must be 0 for Free events."))
		elif ev_type == "Paid" and t_price <= 0:
			frappe.throw(_("Ticket Price must be greater than 0 for Paid events."))

		if self.maximum_participants is not None and int(self.maximum_participants) < 0:
			frappe.throw(_("Maximum Participants cannot be negative."))

		if self.minimum_age is not None and int(self.minimum_age) < 0:
			frappe.throw(_("Minimum Age cannot be negative."))

		if self.maximum_tickets_per_booking is not None and int(self.maximum_tickets_per_booking) < 0:
			frappe.throw(_("Maximum Tickets Per Booking cannot be negative."))

	def validate_coordinator(self):
		if self.event_coordinator:
			stf_status = frappe.db.get_value("Staff", self.event_coordinator, "status")
			if not stf_status:
				frappe.throw(_("Staff member {0} does not exist.").format(self.event_coordinator))
			elif stf_status != "Active":
				frappe.throw(_("Event Coordinator {0} must be an Active Staff member (current status: {1}).").format(
					self.event_coordinator, stf_status
				))

			# Ensure Event Coordinator is not also listed in Supporting Staff
			for row in (self.supporting_staff or []):
				if row.staff_member and row.staff_member == self.event_coordinator:
					frappe.throw(_("Event Coordinator ({0}) cannot also be listed as a Supporting Staff member.").format(
						self.event_coordinator
					))

	def validate_organizer_contact(self):
		org_email = self.get("organizer_email")
		if org_email:
			validate_email_address(str(org_email).strip(), throw=True)

		org_contact = self.get("organizer_contact")
		if org_contact:
			val_str = str(org_contact).strip()
			pattern = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")
			if not pattern.match(val_str):
				frappe.throw(_("Invalid phone number format for Organizer Contact: {0}").format(val_str))

	def validate_child_tables(self):
		# Validate duplicate supporting staff
		seen_staff = set()
		for row in (self.supporting_staff or []):
			if row.staff_member:
				if row.staff_member in seen_staff:
					frappe.throw(_("Duplicate Supporting Staff member found: {0}.").format(row.staff_member))
				seen_staff.add(row.staff_member)

		# Validate duplicate participating business
		seen_biz = set()
		for row in (self.participating_businesses or []):
			if row.business:
				if row.business in seen_biz:
					frappe.throw(_("Duplicate Participating Business found: {0}.").format(row.business))
				seen_biz.add(row.business)
