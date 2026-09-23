import frappe


def extend_bootinfo(bootinfo):
	"""Expose only the calendar toggle so users without System Settings read access get it too."""
	bootinfo.jalali_calendar_enabled = bool(
		frappe.db.get_single_value("System Settings", "custom_enable_shamsi_jalali_calendar")
	)
