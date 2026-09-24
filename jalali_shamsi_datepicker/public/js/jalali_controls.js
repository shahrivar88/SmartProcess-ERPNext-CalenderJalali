// Jalali display/input layer for Frappe v16 Date and Datetime controls.
//
// The model value is never touched: Frappe keeps "YYYY-MM-DD" / "YYYY-MM-DD HH:mm:ss"
// (system time zone). Only the text shown in the input and in read-only/list formatters
// is Jalali, and Jalali text typed or picked by the user is converted back to Frappe's
// own user-format string before the original parse() runs, so time zone conversion,
// date expressions (+1d) and validation stay exactly as in Frappe.
//
// Version-sensitive (checked against Frappe 16.34):
//   - frappe.ui.form.make_control resolves frappe.ui.form["Control" + fieldtype] at call time.
//   - ControlDate.set_formatted_input / ControlDatetime.set_formatted_input return early
//     when this.datepicker is not set.
//   - ControlDatetime.format_for_input returns "<user date> <user time>" in the user time zone.
//   - frappe.form.formatters.Date / Datetime return the same user-format strings.
(function () {
	const ns = (window.jalali_shamsi_datepicker = window.jalali_shamsi_datepicker || {});
	const core = ns.core;

	if (ns.controls_installed) return;
	if (!(frappe.boot && frappe.boot.jalali_calendar_enabled)) return;
	if (!core || !frappe.ui.form.ControlDate || !frappe.ui.form.ControlDatetime) return;
	ns.controls_installed = true;

	const DATE_FMT = "YYYY/MM/DD";
	const DATETIME_FMT = "YYYY/MM/DD HH:mm:ss";

	// "<user date>[ <time>]" (Frappe user format) -> "<jalali date>[ <time>]"; unchanged if unparsable.
	function userToJalaliText(text) {
		if (!text) return text;
		const space = text.indexOf(" ");
		const datePart = space === -1 ? text : text.slice(0, space);
		const timePart = space === -1 ? "" : text.slice(space);
		const jalali = core.gregorianToJalaliString(frappe.datetime.user_to_str(datePart));
		return jalali ? jalali + timePart : text;
	}

	function withJalali(Base, isDatetime) {
		return class extends Base {
			make_picker() {
				// Frappe's air-datepicker is replaced by a Persian picker created on demand.
				this.set_date_options();
				this.set_t_for_today();
				if (!this.df.placeholder) {
					this.$input.attr("placeholder", isDatetime ? DATETIME_FMT : DATE_FMT);
				}
				this.$input.on("focus.jalali", () => this.show_jalali_picker());
			}

			set_formatted_input(value) {
				if (!isDatetime) {
					super.set_formatted_input(value);
					return;
				}
				// ControlDatetime.set_formatted_input only writes the input when air-datepicker exists.
				if (typeof value === "string" && ["today", "now"].includes(value.toLowerCase())) {
					value = frappe.datetime.now_datetime();
				}
				this.$input && this.$input.val(this.format_for_input(value));
			}

			format_for_input(value) {
				return userToJalaliText(super.format_for_input(value));
			}

			parse(value) {
				const parsed = core.parseJalaliInput(value);
				if (!parsed) {
					return super.parse(value);
				}
				if (!parsed.valid) {
					const current = this.get_model_value();
					frappe.msgprint({
						title: __("Invalid Date"),
						indicator: "red",
						message: __("{0} is not a valid Jalali date.", [parsed.input]),
					});
					setTimeout(() => this.set_formatted_input(current), 0);
					return current;
				}
				let userText = frappe.datetime.str_to_user(parsed.gregorian, false, true);
				if (isDatetime && parsed.time) {
					userText += " " + parsed.time;
				}
				return super.parse(userText);
			}

			show_jalali_picker() {
				if (this.jalali_picker || !this.$input || this.$input.prop("readonly")) return;

				const initial = core.parseJalaliInput(this.$input.val());
				// autoClose fires onHide before onSelect, so onHide uses this local reference.
				const picker = this.$input.persianDatepicker({
					format: isDatetime ? DATETIME_FMT : DATE_FMT,
					initialValue: false,
					observer: false,
					autoClose: !isDatetime,
					persianDigit: false,
					position: "auto",
					calendar: { persian: { locale: "fa", leapYearMode: "astronomical" } },
					timePicker: { enabled: isDatetime, second: { enabled: true } },
					toolbox: { calendarSwitch: { enabled: false } },
					onSelect: () => this.apply_jalali_selection(),
					onHide: () => this.destroy_jalali_picker(picker),
				});
				this.jalali_picker = picker;
				// Datetime pickers stay open until an outside click; close them when the
				// dialog or page goes away programmatically.
				const close = () => this.destroy_jalali_picker(picker);
				this.$input.closest(".modal").one("hide.bs.modal", close);
				frappe.router.once("change", close);

				if (initial && initial.valid) {
					const [gy, gm, gd] = initial.gregorian.split("-").map(Number);
					const [h, mi, s] = (initial.time || "0:0:0").split(":").map(Number);
					this._jalali_syncing = true;
					picker.setDate(new Date(gy, gm - 1, gd, h || 0, mi || 0, s || 0).getTime());
					this._jalali_syncing = false;
					this.$input.val(this.format_for_input(this.get_model_value()));
				}
				picker.show();
			}

			apply_jalali_selection() {
				if (this._jalali_syncing) return;
				// The picker has already written "YYYY/MM/DD[ HH:mm:ss]" (locale digits) into the
				// input. getState().selected is not used: after a day click it reports 12:00:00.
				this.$input.val(core.normalizeDigits(this.$input.val())).trigger("change");
			}

			destroy_jalali_picker(picker) {
				if (this.jalali_picker === picker) this.jalali_picker = null;
				if (picker._jalali_destroyed) return;
				picker._jalali_destroyed = true;
				setTimeout(() => picker.destroy(), 0);
			}
		};
	}

	frappe.ui.form.ControlDate = withJalali(frappe.ui.form.ControlDate, false);
	frappe.ui.form.ControlDatetime = withJalali(frappe.ui.form.ControlDatetime, true);

	const formatDate = frappe.form.formatters.Date;
	const formatDatetime = frappe.form.formatters.Datetime;
	frappe.form.formatters.Date = function (value, ...args) {
		return userToJalaliText(formatDate.call(this, value, ...args));
	};
	frappe.form.formatters.Datetime = function (value, ...args) {
		return userToJalaliText(formatDatetime.call(this, value, ...args));
	};

	$(() => $("body").addClass("jalali-calendar-enabled"));
})();
