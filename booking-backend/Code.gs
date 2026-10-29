/**
 * خلفية حجز مواعيد التقييم — حضانة ونادي جدو علي
 * -------------------------------------------------
 * - 5 مقابلات كحد أقصى في اليوم، من 9:00 ص إلى 12:00 ظ.
 * - عند اكتمال الخمس مقابلات يُغلق اليوم تلقائيًا.
 * - البيانات تُحفظ في ورقة "الحجوزات" داخل جدول Google Sheet الخاص بكم.
 * - لإلغاء حجز: غيّروا الحالة في عمود "الحالة" إلى: ملغي  (يُفتح الموعد فورًا).
 * - لإغلاق يوم (إجازة): أضيفوا تاريخه في ورقة "أيام مغلقة" بصيغة 2026-11-05.
 */
var CFG = {
  OWNER: 'gedoali335@gmail.com',
  TZ: 'Africa/Cairo',
  MAX_PER_DAY: 5,
  SLOTS: ['09:00', '09:40', '10:20', '11:00', '11:40'],
  DAYS_AHEAD: 75,            // أبعد يوم يمكن الحجز فيه (بعد اليوم)
  OPEN_DOWS: [0, 1, 2, 3, 4] // 0=الأحد ... 4=الخميس
};
var BOOK_SHEET = 'الحجوزات';
var CLOSED_SHEET = 'أيام مغلقة';
var BOOK_HEAD = ['وقت الحجز', 'التاريخ', 'الساعة', 'اسم الطفل', 'هاتف ولي الأمر', 'اسم ولي الأمر', 'القسم', 'ملاحظات', 'الحالة'];

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function sheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(head);
    s.setFrozenRows(1);
    s.getRange('A:E').setNumberFormat('@'); // نص عادي: يحفظ الأصفار والتواريخ كما هي
  }
  return s;
}
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function key_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ, 'yyyy-MM-dd');
  return String(v).trim();
}
function time_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ, 'HH:mm');
  var m = String(v).trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? pad_(+m[1]) + ':' + m[2] : String(v).trim();
}
function todayKey_() { return Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd'); }
function addDays_(k, n) {
  var p = k.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 864e5);
  return d.getUTCFullYear() + '-' + pad_(d.getUTCMonth() + 1) + '-' + pad_(d.getUTCDate());
}
function dow_(k) {
  var p = k.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
}
function bookings_() {
  var rows = sheet_(BOOK_SHEET, BOOK_HEAD).getDataRange().getValues(), out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[1] || String(r[8]).trim() === 'ملغي') continue;
    out.push({ date: key_(r[1]), time: time_(r[2]), phone: String(r[4]).replace(/[^\d+]/g, '') });
  }
  return out;
}
function closedDays_() {
  var rows = sheet_(CLOSED_SHEET, ['التاريخ (مثال 2026-11-05)', 'السبب']).getDataRange().getValues(), out = [];
  for (var i = 1; i < rows.length; i++) { if (rows[i][0]) out.push(key_(rows[i][0])); }
  return out;
}
function clean_(v, n) { return String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n || 120); }

/** جلب الأيام والمواعيد المحجوزة (بدون أي بيانات شخصية) */
function doGet(e) {
  try {
    var booked = {};
    bookings_().forEach(function (x) { (booked[x.date] = booked[x.date] || []).push(x.time); });
    var t = todayKey_();
    return json_({
      ok: true, slots: CFG.SLOTS, max: CFG.MAX_PER_DAY, today: t,
      first: addDays_(t, 1), last: addDays_(t, CFG.DAYS_AHEAD),
      openDows: CFG.OPEN_DOWS, booked: booked, closed: closedDays_()
    });
  } catch (err) { return json_({ ok: false, error: 'server' }); }
}

/** حجز موعد جديد (مع قفل يمنع حجز نفس الموعد مرتين) */
function doPost(e) {
  var lock = LockService.getScriptLock(), locked = false;
  try {
    lock.waitLock(20000); locked = true;
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.hp) return json_({ ok: false, error: 'invalid' });

    var date = clean_(d.date, 10), time = clean_(d.time, 5);
    var phone = String(d.phone || '').replace(/[^\d+]/g, '');
    var child = clean_(d.child, 80);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || CFG.SLOTS.indexOf(time) < 0 || !child || phone.length < 8) {
      return json_({ ok: false, error: 'invalid' });
    }
    var today = todayKey_();
    if (date <= today || date > addDays_(today, CFG.DAYS_AHEAD)) return json_({ ok: false, error: 'date' });
    if (CFG.OPEN_DOWS.indexOf(dow_(date)) < 0 || closedDays_().indexOf(date) > -1) return json_({ ok: false, error: 'closed' });

    var all = bookings_();
    var day = all.filter(function (x) { return x.date === date; });
    if (day.length >= CFG.MAX_PER_DAY) return json_({ ok: false, error: 'full' });
    if (day.some(function (x) { return x.time === time; })) return json_({ ok: false, error: 'taken' });
    var mine = all.filter(function (x) { return x.phone === phone && x.date > today; });
    if (mine.length) return json_({ ok: false, error: 'duplicate', date: mine[0].date, time: mine[0].time });

    sheet_(BOOK_SHEET, BOOK_HEAD).appendRow([
      Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm'), date, time, child, phone,
      clean_(d.parent, 80), clean_(d.section, 40), clean_(d.notes, 200), 'مؤكد'
    ]);
    SpreadsheetApp.flush();

    try {
      MailApp.sendEmail({
        to: CFG.OWNER,
        subject: 'حجز موعد تقييم – ' + child + ' – ' + date + ' ' + time,
        body: 'تم حجز موعد تقييم جديد:\n\nالطفل: ' + child + '\nولي الأمر: ' + clean_(d.parent, 80) +
          '\nالهاتف: ' + phone + '\nالقسم: ' + clean_(d.section, 40) +
          '\nالتاريخ: ' + date + '\nالساعة: ' + time +
          '\n\nعدد حجوزات هذا اليوم: ' + (day.length + 1) + ' من ' + CFG.MAX_PER_DAY +
          '\n(الاستمارة الكاملة تصل في رسالة منفصلة)'
      });
    } catch (mailErr) { /* الحجز تم حتى لو تعذر البريد */ }

    return json_({ ok: true, date: date, time: time });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (x) {} }
  }
}
