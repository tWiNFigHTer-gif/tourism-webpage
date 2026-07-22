# Copyright (c) 2026, Administrator and contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

class TestStaff(FrappeTestCase):
	def test_staff_creation_naming_and_new_fields(self):
		doc = frappe.get_doc({
			"doctype": "Staff",
			"naming_series": "STF-.####",
			"first_name": "Alexander",
			"last_name": "Hamilton",
			"role": "Operations Manager",
			"department": "Operations",
			"employment_type": "Full-Time",
			"status": "Active",
			"availability": "Available",
			"email": "alex.hamilton@example.com",
			"phone_number": "+14155553001",
			"government_id_type": "Passport",
			"government_id_number": "P12345678",
			"years_of_experience": 8.5,
			"assigned_district": "Idukki",
			"assigned_panchayat": "Munnar",
			"date_of_birth": "1988-01-11",
			"date_of_joining": "2018-03-01"
		})
		doc.insert(ignore_permissions=True)
		self.assertTrue(doc.name.startswith("STF-"))
		self.assertEqual(doc.employee_id, doc.name)
		self.assertEqual(doc.full_name, "Alexander Hamilton")
		self.assertEqual(doc.employment_type, "Full-Time")
		self.assertEqual(doc.assigned_district, "Idukki")

	def test_duplicate_email_rejection(self):
		# Create first staff
		doc1 = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "StaffOne",
			"role": "Field Officer",
			"status": "Active",
			"email": "unique.email@example.com",
			"phone_number": "+14155553002"
		})
		doc1.insert(ignore_permissions=True)

		# Attempt second staff with duplicate email
		doc2 = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "StaffTwo",
			"role": "Field Officer",
			"status": "Active",
			"email": "unique.email@example.com",
			"phone_number": "+14155553003"
		})
		self.assertRaises(frappe.ValidationError, doc2.insert, ignore_permissions=True)

	def test_duplicate_phone_rejection(self):
		doc1 = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "PhoneOne",
			"role": "Eco Inspector",
			"status": "Active",
			"email": "phone1@example.com",
			"phone_number": "+14155553004"
		})
		doc1.insert(ignore_permissions=True)

		doc2 = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "PhoneTwo",
			"role": "Eco Inspector",
			"status": "Active",
			"email": "phone2@example.com",
			"phone_number": "+14155553004"
		})
		self.assertRaises(frappe.ValidationError, doc2.insert, ignore_permissions=True)

	def test_emergency_contact_matching_primary_rejection(self):
		doc = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "EmergencyTest",
			"role": "Safety Officer",
			"status": "Active",
			"email": "emergency@example.com",
			"phone_number": "+14155553005",
			"emergency_contact_number": "+14155553005"
		})
		self.assertRaises(frappe.ValidationError, doc.insert, ignore_permissions=True)

	def test_invalid_user_account_rejection(self):
		doc = frappe.get_doc({
			"doctype": "Staff",
			"first_name": "UserTest",
			"role": "Tourism Officer",
			"status": "Active",
			"email": "useraccount@example.com",
			"phone_number": "+14155553006",
			"user_account": "non_existent_user@example.com"
		})
		self.assertRaises(frappe.ValidationError, doc.insert, ignore_permissions=True)
