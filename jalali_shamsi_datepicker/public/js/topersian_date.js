// jalali_shamsi_datepicker/public/js/topersian_date.js
// نمایش تاریخ شمسی (Jalali) روی فیلدهای Date/Datetime
// فقط نمایشی — مقدار ذخیره‌شده در دیتابیس همیشه میلادی (Gregorian) می‌ماند.
frappe.provide("jalali_shamsi_datepicker");

jalali_shamsi_datepicker.is_enabled = function() {
    return Boolean(frappe.boot && frappe.boot.jalali_calendar_enabled);
};

$(function() {
    $("body").toggleClass("jalali-calendar-enabled", jalali_shamsi_datepicker.is_enabled());
});

// تبدیل اعداد فارسی به لاتین
function toLatinDigits(str) {
    const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const latinNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let result = str;
    for (let i = 0; i < 10; i++) {
        result = result.replace(persianNumbers[i], latinNumbers[i]);
    }
    return result;
}

// تبدیل مقدار میلادی (YYYY-MM-DD [HH:mm:ss]) به رشته شمسی فقط برای نمایش
function jalaliDisplayFromGregorian(value, isDatetime) {
    if (!value) return "";
    var parts = String(value).split(" ");
    var dparts = parts[0].split("-").map(Number);
    if (dparts.length !== 3 || isNaN(dparts[0]) || isNaN(dparts[1]) || isNaN(dparts[2])) return "";
    var tparts = (parts[1] || "0:0:0").split(":").map(Number);
    var d = new Date(dparts[0], dparts[1] - 1, dparts[2], tparts[0] || 0, tparts[1] || 0, tparts[2] || 0);
    var pDate = new persianDate(d);
    var fmt = isDatetime ? "YYYY/MM/DD HH:mm:ss" : "YYYY/MM/DD";
    return toLatinDigits(pDate.format(fmt));
}

// مقدار مدل همیشه YYYY-MM-DD است؛ مقدار input به فرمت تاریخ کاربر است و نباید مستقیم تجزیه شود.
function getModelValue(frm, fieldname, $input, isDatetime) {
    if (frm && frm.doc && frm.doc[fieldname] != null) {
        return frm.doc[fieldname];
    }
    var shown = $input.val();
    return shown ? frappe.datetime.user_to_str(shown, isDatetime) : "";
}

// روی فیلدی که مقدار فعال باشد، readonly است تا کاربر فقط از تقویم شمسی انتخاب کند.
// مقدار میلادی از طریق frm.set_value در مدل ثبت می‌شود و دیتابیس میلادی می‌ماند.
function setupJalaliField(frm, $input, isDatetime) {
    var fieldname = $input.attr("data-fieldname");
    var $shadow = $input.next(".jalali-shadow");
    var fmt = isDatetime ? "YYYY/MM/DD HH:mm:ss" : "YYYY/MM/DD";
    var gregFmt = isDatetime ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD";

    if (!$shadow.length) {
        $shadow = $("<input>", {
            type: "text",
            class: "form-control jalali-shadow",
            readonly: "readonly",
            autocomplete: "off",
            placeholder: fmt,
            "data-fieldname": fieldname
        }).insertAfter($input);

        $shadow.persianDatepicker({
            format: fmt,
            position: "auto",
            persianDigit: false, // اعداد لاتین
            autoClose: true,
            initialValue: false,
            timePicker: isDatetime ? { enabled: true } : undefined,
            onSelect: function(unix) {
                // toCalendar() mutates the instance, so each representation gets its own object.
                var jalaliValue = toLatinDigits(new persianDate(unix).format(fmt));
                var gregorianValue = new persianDate(unix).toCalendar("gregorian").toLocale("en").format(gregFmt);

                $shadow.val(jalaliValue);
                if (frm && frm.set_value) {
                    frm.set_value(fieldname, gregorianValue);
                } else {
                    $input.val(frappe.datetime.str_to_user(gregorianValue, false, !isDatetime)).trigger("change");
                }
                show_gregorian_date($shadow, gregorianValue);
            },
            onHide: function() {
                $shadow.val(jalaliDisplayFromGregorian(getModelValue(frm, fieldname, $input, isDatetime), isDatetime));
            }
        });

        $input.hide();
    }

    var currentValue = getModelValue(frm, fieldname, $input, isDatetime);
    $shadow.val(jalaliDisplayFromGregorian(currentValue, isDatetime));
    if (currentValue) {
        show_gregorian_date($shadow, currentValue);
    }
}

// Frappe رویداد form-refresh را قبل از refresh فیلدها می‌فرستد؛ اتصال به بعد از رندر موکول می‌شود.
$(document).on("form-refresh", function(e, frm) {
    if (!jalali_shamsi_datepicker.is_enabled() || !frm || !frm.wrapper) return;
    frappe.after_ajax(function() {
        setTimeout(function() {
            var $wrapper = $(frm.wrapper);
            $wrapper.find('input[data-fieldtype="Date"]').each(function() {
                setupJalaliField(frm, $(this), false);
            });
            $wrapper.find('input[data-fieldtype="Datetime"]').each(function() {
                setupJalaliField(frm, $(this), true);
            });
        }, 0);
    });
});

// نمایش معادل میلادی زیر فیلد شمسی
function show_gregorian_date($shadow, gregorian_date) {
    if (!gregorian_date) return;
    var $gregorian = $shadow.next(".gregorian-date");
    if (!$gregorian.length) {
        $gregorian = $('<div class="gregorian-date"></div>').insertAfter($shadow);
    }
    $gregorian.text("میلادی: " + gregorian_date);
}
