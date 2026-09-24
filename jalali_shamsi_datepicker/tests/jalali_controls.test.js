// Run: node --test jalali_shamsi_datepicker/tests/jalali_controls.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const jsDir = path.join(__dirname, "..", "public", "js");
const coreSrc = fs.readFileSync(path.join(jsDir, "jalali_core.js"), "utf8");
const controlsSrc = fs.readFileSync(path.join(jsDir, "jalali_controls.js"), "utf8");

function makeContext(enabled) {
	class ControlDate {
		format_for_input(value) {
			return value || "";
		}
		parse(value) {
			return value;
		}
	}
	class ControlDatetime extends ControlDate {}
	const formatDate = (value) => value || "";
	const formatDatetime = (value) => value || "";
	const frappe = {
		boot: { jalali_calendar_enabled: enabled },
		ui: { form: { ControlDate, ControlDatetime } },
		form: { formatters: { Date: formatDate, Datetime: formatDatetime } },
		datetime: { user_to_str: (v) => v, str_to_user: (v) => v },
	};
	const $ = () => ({ addClass() {} });
	const ctx = vm.createContext({ frappe, $, __: (s) => s });
	ctx.window = ctx;
	vm.runInContext(coreSrc, ctx);
	return { ctx, frappe, originals: { ControlDate, ControlDatetime, formatDate, formatDatetime } };
}

test("disabled setting leaves standard controls and formatters untouched", () => {
	const { ctx, frappe, originals } = makeContext(false);
	vm.runInContext(controlsSrc, ctx);
	assert.equal(frappe.ui.form.ControlDate, originals.ControlDate);
	assert.equal(frappe.ui.form.ControlDatetime, originals.ControlDatetime);
	assert.equal(frappe.form.formatters.Date, originals.formatDate);
	assert.equal(frappe.form.formatters.Datetime, originals.formatDatetime);
	assert.equal(frappe.form.formatters.Date("2026-09-24"), "2026-09-24");
});

test("enabled setting patches once and formats Jalali without changing the value", () => {
	const { ctx, frappe, originals } = makeContext(true);
	vm.runInContext(controlsSrc, ctx);
	const patchedDate = frappe.ui.form.ControlDate;
	assert.notEqual(patchedDate, originals.ControlDate);
	assert.ok(new patchedDate() instanceof originals.ControlDate);
	assert.equal(frappe.form.formatters.Date("2026-09-24"), "1405/07/02");
	assert.equal(frappe.form.formatters.Datetime("2026-09-24 14:30:05"), "1405/07/02 14:30:05");

	vm.runInContext(controlsSrc, ctx);
	assert.equal(frappe.ui.form.ControlDate, patchedDate, "second load must not wrap again");
});
