# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import re
import frappe
from frappe import _
from frappe.model.document import Document

class Attraction(Document):
	def before_save(self):
		# Automatically populate attraction_code from the document name
		if self.name:
			self.attraction_code = self.name

	def validate(self):
		self.validate_coordinates()
		self.validate_timings()
		self.validate_capacities()
		self.validate_phone_numbers()

	def validate_coordinates(self):
		if self.latitude is not None and self.latitude != "":
			try:
				lat = float(self.latitude)
				if not (-90.0 <= lat <= 90.0):
					frappe.throw(_("Latitude must be between -90 and 90 degrees."))
			except ValueError:
				frappe.throw(_("Latitude must be a valid number."))

		if self.longitude is not None and self.longitude != "":
			try:
				lng = float(self.longitude)
				if not (-180.0 <= lng <= 180.0):
					frappe.throw(_("Longitude must be between -180 and 180 degrees."))
			except ValueError:
				frappe.throw(_("Longitude must be a valid number."))

	def validate_timings(self):
		if self.opening_time and self.closing_time:
			if str(self.opening_time) >= str(self.closing_time):
				frappe.throw(_("Opening Time ({0}) must be before Closing Time ({1}).").format(
					self.opening_time, self.closing_time
				))

	def validate_capacities(self):
		for field in ["maximum_capacity", "maximum_daily_visitors", "parking_capacity"]:
			val = getattr(self, field, None)
			if val is not None and val < 0:
				field_label = self.meta.get_label(field) or field
				frappe.throw(_("{0} cannot be negative.").format(field_label))

	def validate_phone_numbers(self):
		phone_fields = [
			"contact_number",
			"emergency_contact_number",
			"police_contact_number",
			"hospital_contact_number",
			"fire_station_contact_number"
		]
		# Permissive regex for phone numbers (digits, +, spaces, hyphens, parentheses, 7 to 20 chars)
		pattern = re.compile(r"^\+?[0-9\s\-\(\)]{7,20}$")
		
		for field in phone_fields:
			val = getattr(self, field, None)
			if val:
				val_str = str(val).strip()
				if not pattern.match(val_str):
					field_label = self.meta.get_label(field) or field
					frappe.throw(_("Invalid phone number format for {0}: {1}").format(field_label, val_str))
