// Run: node --test jalali_shamsi_datepicker/tests/jalali_core.test.js jalali_shamsi_datepicker/tests/jalali_controls.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../public/js/jalali_core.js");

test("Gregorian -> Jalali display for known dates", () => {
	assert.equal(core.gregorianToJalaliString("2026-09-24"), "1405/07/02");
	assert.equal(core.gregorianToJalaliString("2026-10-07"), "1405/07/15");
	assert.equal(core.gregorianToJalaliString("2024-03-20"), "1403/01/01");
});

test("Jalali -> exact Gregorian value", () => {
	assert.equal(core.jalaliToGregorianString(1405, 7, 2), "2026-09-24");
	assert.equal(core.jalaliToGregorianString(1405, 7, 15), "2026-10-07");
});

test("Nowruz year boundary", () => {
	assert.equal(core.gregorianToJalaliString("2026-03-20"), "1404/12/29");
	assert.equal(core.gregorianToJalaliString("2026-03-21"), "1405/01/01");
	assert.equal(core.gregorianToJalaliString("2021-03-20"), "1399/12/30");
	assert.equal(core.gregorianToJalaliString("2021-03-21"), "1400/01/01");
});

test("Leap year Esfand", () => {
	assert.equal(core.isLeapJalaliYear(1399), true);
	assert.equal(core.isLeapJalaliYear(1403), true);
	assert.equal(core.isLeapJalaliYear(1404), false);
	assert.equal(core.jalaliMonthLength(1403, 12), 30);
	assert.equal(core.jalaliMonthLength(1404, 12), 29);
	assert.equal(core.jalaliToGregorianString(1403, 12, 30), "2025-03-20");
	assert.deepEqual(core.parseJalaliInput("1404/12/30"), { valid: false, input: "1404/12/30" });
});

test("Persian, Arabic and Latin digits are normalized", () => {
	const expected = { valid: true, gregorian: "2026-09-24", time: "" };
	assert.deepEqual(core.parseJalaliInput("۱۴۰۵/۰۷/۰۲"), expected);
	assert.deepEqual(core.parseJalaliInput("١٤٠٥/٠٧/٠٢"), expected);
	assert.deepEqual(core.parseJalaliInput("1405/7/2"), expected);
	assert.deepEqual(core.parseJalaliInput("1405-07-02"), expected);
});

test("Datetime input keeps the time portion untouched", () => {
	assert.deepEqual(core.parseJalaliInput("۱۴۰۵/۰۷/۰۲ ۱۴:۳۰:۰۵"), {
		valid: true,
		gregorian: "2026-09-24",
		time: "14:30:05",
	});
});

test("Impossible Jalali dates are rejected, not rolled over", () => {
	for (const bad of ["1405/13/01", "1405/00/10", "1405/07/31", "1405/01/32", "1405/07/00"]) {
		assert.equal(core.parseJalaliInput(bad).valid, false, bad);
	}
});

test("Non-Jalali input is left to Frappe", () => {
	for (const other of ["", "   ", null, undefined, "2026-09-24", "24-09-2026", "Today", "+1d", "abc"]) {
		assert.equal(core.parseJalaliInput(other), null, String(other));
	}
});

test("Invalid Gregorian input produces no Jalali text", () => {
	assert.equal(core.gregorianToJalaliString("2026-02-30"), "");
	assert.equal(core.gregorianToJalaliString("not a date"), "");
	assert.equal(core.gregorianToJalaliString(""), "");
});

test("Round trip is exact for every day 1990-2040", () => {
	const day = new Date(Date.UTC(1990, 0, 1));
	const end = Date.UTC(2040, 11, 31);
	let previous = "";
	while (day.getTime() <= end) {
		const iso = day.toISOString().slice(0, 10);
		const jalali = core.gregorianToJalaliString(iso);
		const parsed = core.parseJalaliInput(jalali);
		assert.equal(parsed.valid, true, iso);
		assert.equal(parsed.gregorian, iso);
		assert.ok(jalali > previous, "Jalali dates must increase: " + iso);
		previous = jalali;
		day.setUTCDate(day.getUTCDate() + 1);
	}
});
