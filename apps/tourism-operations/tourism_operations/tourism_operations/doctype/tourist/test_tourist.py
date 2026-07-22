# Copyright (c) 2026, Administrator and contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

class TestTourist(FrappeTestCase):
	def setUp(self):
		stf = frappe.get_all("Staff", filters={"status": "Active"}, limit=1)
		if stf:
			self.staff_name = stf[0].name
		else:
			self.staff_name = frappe.get_doc({
				"doctype": "Staff",
				"first_name": "OpsStaff",
				"role": "Security Officer",
				"status": "Active",
				"email": "opsstaff@example.com",
				"phone_number": "+14155559003"
			}).insert(ignore_permissions=True).name

	def test_tourist_creation_and_blacklisting_actions(self):
		t = frappe.get_doc({
			"doctype": "Tourist",
			"first_name": "Vikram",
			"last_name": "Singh",
			"phone_number": "+919988771122",
			"email": "vikram.singh@example.com"
		})
		t.insert(ignore_permissions=True)
		self.assertEqual(t.registration_status, "Active")

		# Test Blacklist
		t.blacklist_tourist(staff_member=self.staff_name, reason="Security Policy Violation")
		self.assertEqual(t.registration_status, "Blacklisted")
		self.assertEqual(t.blacklisted_by, self.staff_name)
		self.assertEqual(t.blacklist_reason, "Security Policy Violation")
		self.assertIsNotNone(t.blacklist_date)

		# Test Reactivate
		t.reactivate_tourist()
		self.assertEqual(t.registration_status, "Active")
		self.assertIsNone(t.blacklist_reason)
