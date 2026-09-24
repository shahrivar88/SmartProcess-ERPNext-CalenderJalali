from jalali_shamsi_datepicker.uninstall import delete_app_custom_fields


def execute():
	"""Drop the deprecated "Date Storage Format" option; dates are always stored as Gregorian.

	Idempotent: does nothing when the field was never created or is already gone.
	"""
	delete_app_custom_fields((("System Settings", "custom_date_storage_format"),))
