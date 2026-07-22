# Copyright (c) 2026, Administrator and contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

class TestBusiness(FrappeTestCase):
	def setUp(self):
		att = frappe.get_all("Attraction", limit=1)
		if att:
			self.attraction_name = att[0].name
		else:
			self.attraction_name = frappe.get_doc({
				"doctype": "Attraction",
				"attraction_name": "Test Waterfall for Biz Gov",
				"category": "Waterfall",
				"status": "Open"
			}).insert(ignore_permissions=True).name

		stf = frappe.get_all("Staff", filters={"status": "Active"}, limit=1)
		if stf:
			self.staff_name = stf[0].name
		else:
			self.staff_name = frappe.get_doc({
				"doctype": "Staff",
				"first_name": "GovStaff",
				"role": "Inspector",
				"status": "Active",
				"email": "govstaff@example.com",
				"phone_number": "+14155559001"
			}).insert(ignore_permissions=True).name

	def test_business_creation_and_governance_actions(self):
		biz = frappe.get_doc({
			"doctype": "Business",
			"business_name": "Hilltop Heritage Resort",
			"business_type": "Resort",
			"attraction": self.attraction_name,
			"contact_number": "+14155559002"
		})
		biz.insert(ignore_permissions=True)
		self.assertEqual(biz.registration_status, "Pending Verification")

		# Test Verify
		biz.verify_business(staff_member=self.staff_name)
		self.assertEqual(biz.registration_status, "Verified")
		self.assertIsNotNone(biz.verification_date)
		self.assertEqual(biz.verified_by, self.staff_name)

		# Test Suspend
		biz.suspend_business(reason="License Renewal Overdue")
		self.assertEqual(biz.registration_status, "Suspended")
		self.assertEqual(biz.suspension_reason, "License Renewal Overdue")

		# Test Reactivate
		biz.reactivate_business()
		self.assertEqual(biz.registration_status, "Verified")
		self.assertIsNone(biz.suspension_reason)

		# Test Reject
		biz.reject_business(reason="Incomplete Documentation")
		self.assertEqual(biz.registration_status, "Rejected")
		self.assertEqual(biz.rejection_reason, "Incomplete Documentation")
