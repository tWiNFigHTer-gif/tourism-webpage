# Copyright (c) 2026, Administrator and contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

class TestEvent(FrappeTestCase):
	def setUp(self):
		# Create test Attraction
		att = frappe.get_all("Attraction", limit=1)
		if att:
			self.att_name = att[0].name
		else:
			self.att_name = frappe.get_doc({
				"doctype": "Attraction",
				"attraction_name": "EvtMandatoryAttraction",
				"category": "Waterfall",
				"status": "Open"
			}).insert(ignore_permissions=True).name

		# Create test Staff
		stf = frappe.get_all("Staff", filters={"status": "Active"}, limit=1)
		if stf:
			self.coord_name = stf[0].name
		else:
			self.coord_name = frappe.get_doc({
				"doctype": "Staff",
				"first_name": "EvtActiveCoord",
				"role": "Operations Manager",
				"status": "Active",
				"email": "active.evtcoord@example.com",
				"phone_number": "+14155557001"
			}).insert(ignore_permissions=True).name

		# Create secondary test Staff for supporting staff table
		stf2 = frappe.get_all("Staff", filters={"status": "Active", "name": ["!=", self.coord_name]}, limit=1)
		if stf2:
			self.supp_staff_name = stf2[0].name
		else:
			self.supp_staff_name = frappe.get_doc({
				"doctype": "Staff",
				"first_name": "EvtSuppStaff",
				"role": "Field Officer",
				"status": "Active",
				"email": "supp.staff@example.com",
				"phone_number": "+14155557002"
			}).insert(ignore_permissions=True).name

		# Create test Business
		biz = frappe.get_all("Business", limit=1)
		if biz:
			self.biz_name = biz[0].name
		else:
			self.biz_name = frappe.get_doc({
				"doctype": "Business",
				"business_name": "EvtPartnerResort",
				"business_type": "Resort",
				"attraction": self.att_name,
				"registration_status": "Verified",
				"contact_number": "+14155557003"
			}).insert(ignore_permissions=True).name

	def test_event_creation_mandatory_attraction_and_enhancements(self):
		doc = frappe.get_doc({
			"doctype": "Event",
			"naming_series": "EVT-.####",
			"event_name": "Grand Eco Tourism Summit",
			"category": "Eco Tourism",
			"visibility": "Public",
			"attraction": self.att_name,
			"venue": "Eco Center Hall",
			"start_date": today(),
			"end_date": today(),
			"event_type": "Free",
			"ticket_price": 0,
			"minimum_age": 12,
			"maximum_tickets_per_booking": 4,
			"is_refundable": 0,
			"event_coordinator": self.coord_name,
			"organizer_name": "Eco Kerala Board",
			"organizer_contact": "+14155557004",
			"organizer_email": "info@ecokerala.gov",
			"supporting_staff": [
				{
					"staff_member": self.supp_staff_name,
					"role": "Site Manager",
					"duty_start_time": "08:00:00",
					"duty_end_time": "17:00:00"
				}
			],
			"participating_businesses": [
				{
					"business": self.biz_name,
					"partnership_type": "Title Sponsor",
					"sponsor_level": "Title Sponsor"
				}
			]
		})
		doc.insert(ignore_permissions=True)
		self.assertTrue(doc.name.startswith("EVT-"))
		self.assertEqual(doc.attraction, self.att_name)
		self.assertEqual(doc.visibility, "Public")
		self.assertEqual(doc.supporting_staff[0].duty_start_time, "08:00:00")
		self.assertEqual(doc.participating_businesses[0].sponsor_level, "Title Sponsor")

	def test_free_paid_pricing_rules(self):
		# Free event with non-zero price should fail
		bad_free = frappe.get_doc({
			"doctype": "Event",
			"event_name": "Bad Free Event",
			"attraction": self.att_name,
			"event_type": "Free",
			"ticket_price": 100,
			"event_coordinator": self.coord_name
		})
		self.assertRaises(frappe.ValidationError, bad_free.insert, ignore_permissions=True)

		# Paid event with zero price should fail
		bad_paid = frappe.get_doc({
			"doctype": "Event",
			"event_name": "Bad Paid Event",
			"attraction": self.att_name,
			"event_type": "Paid",
			"ticket_price": 0,
			"event_coordinator": self.coord_name
		})
		self.assertRaises(frappe.ValidationError, bad_paid.insert, ignore_permissions=True)

	def test_coordinator_duplication_in_supporting_staff_rejection(self):
		bad_coord = frappe.get_doc({
			"doctype": "Event",
			"event_name": "Dup Coord Event",
			"attraction": self.att_name,
			"event_coordinator": self.coord_name,
			"supporting_staff": [
				{"staff_member": self.coord_name, "role": "Coordinator Role"}
			]
		})
		self.assertRaises(frappe.ValidationError, bad_coord.insert, ignore_permissions=True)

	def test_capacity_auto_full_registration_status(self):
		doc = frappe.get_doc({
			"doctype": "Event",
			"event_name": "Full Event Test",
			"attraction": self.att_name,
			"maximum_participants": 10,
			"current_registrations": 10,
			"event_coordinator": self.coord_name
		})
		doc.insert(ignore_permissions=True)
		self.assertEqual(doc.registration_status, "Full")
