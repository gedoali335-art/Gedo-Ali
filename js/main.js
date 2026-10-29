/* حضانة ونادي جدو علي — السكربت الرئيسي */
(function () {
  'use strict';

  // ====== الإعدادات (تُعدَّل من هنا فقط) ======
  var CONFIG = {
    // البريد الذي تصله كل الاستمارات
    email: 'gedoali335@gmail.com',
    // خدمة FormSubmit المجانية (تعمل بدون سيرفر)
    endpoint: 'https://formsubmit.co/ajax/gedoali335@gmail.com',
    whatsapp: '201000837504',
    // رابط خلفية حجز المواعيد (Google Apps Script Web App) — انظر دليل النشر، الخطوة 3.
    // اتركه فارغًا ليعمل الموقع بدون حجز إلكتروني.
    bookingApi: 'https://script.google.com/macros/s/AKfycby95RwfSVnRHqqhd5YhSiLiP7-PscE4Bf2X923Ud5aAMaly696e8Nt8FWnvQIjzCSo/exec'
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ====== القائمة ======
  var burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); }); });

  // ====== ظهور تدريجي ======
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.01 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  // ====== المعرض وعرض الصور المكبّرة ======
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), cur = 0, vis = [];
  $$('.filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.filters button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var f = b.dataset.f;
      $$('#gal figure').forEach(function (fg) { fg.classList.toggle('hide', f !== 'all' && fg.dataset.cat !== f); });
    });
  });
  function capOf(f) {
    var c = $('figcaption', f); if (!c) return '';
    var t = $('b', c); return t ? t.textContent : c.textContent;
  }
  function show() {
    var f = vis[cur]; if (!f) return;
    var im = $('img', f);
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; lbCap.textContent = capOf(f);
  }
  function openLb(group, f) {
    vis = $$('figure.zoom', group).filter(function (x) { return !x.classList.contains('hide'); });
    cur = Math.max(0, vis.indexOf(f)); show();
    var multi = vis.length > 1;
    $('.nx', lb).style.display = multi ? '' : 'none'; $('.pv', lb).style.display = multi ? '' : 'none';
    lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeLb() { lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('figure.zoom');
    if (!f || lb.contains(e.target)) return;
    openLb(f.closest('[data-group]') || f.parentNode, f);
  });
  $('.x', lb).addEventListener('click', closeLb);
  $('.nx', lb).addEventListener('click', function () { cur = (cur + 1) % vis.length; show(); });
  $('.pv', lb).addEventListener('click', function () { cur = (cur - 1 + vis.length) % vis.length; show(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') $('.nx', lb).click();
    if (e.key === 'ArrowRight') $('.pv', lb).click();
  });

  // ====== الاستمارة ======
  var form = $('#regForm'), steps = $$('.step', form), stepsBar = $('#steps'), bar = $('#bar');
  var prev = $('#prev'), next = $('#next'), send = $('#send'), statusBox = $('#status'), idx = 0;

  // قوائم مشتركة
  var EDU = ['اختر', 'أمي', 'يقرأ ويكتب', 'مؤهل متوسط', 'مؤهل فوق متوسط', 'بكالوريوس / ليسانس', 'دراسات عليا (ماجستير / دكتوراه)'];
  var REL = ['اختر', 'الأب', 'الأم', 'الجد', 'الجدة', 'العم', 'العمة', 'الخال', 'الخالة', 'الأخ / الأخت الأكبر', 'أخرى'];
  function fill(sel, list) {
    list.forEach(function (t, i) { var o = document.createElement('option'); o.textContent = t; o.value = i ? t : ''; sel.appendChild(o); });
  }
  $$('.edu').forEach(function (s) { fill(s, EDU); });
  $$('.rel').forEach(function (s) { fill(s, REL); });

  // أزرار الخطوات
  steps.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = (i + 1) + '. ' + s.dataset.title;
    b.addEventListener('click', function () { if (i < idx || validate(idx)) go(i); });
    stepsBar.appendChild(b);
  });

  function go(i) {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach(function (s, k) { s.classList.toggle('on', k === idx); });
    $$('button', stepsBar).forEach(function (b, k) {
      b.classList.toggle('on', k === idx); b.classList.toggle('done', k < idx);
    });
    bar.style.width = ((idx + 1) / steps.length * 100) + '%';
    prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
    next.style.display = idx === steps.length - 1 ? 'none' : '';
    send.style.display = idx === steps.length - 1 ? '' : 'none';
    if (idx === steps.length - 1) loadSlots(false);
    var active = $$('button', stepsBar)[idx];
    if (active) stepsBar.scrollLeft = active.offsetLeft - stepsBar.clientWidth / 2 + active.clientWidth / 2;
    if (started) {
      var top = $('.form-wrap').getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }
  var started = false;
  prev.addEventListener('click', function () { go(idx - 1); });
  next.addEventListener('click', function () { if (validate(idx)) go(idx + 1); });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'checkbox') {
      e.preventDefault();
      if (idx < steps.length - 1) next.click();
    }
  });

  // أرقام عربية → إنجليزية
  function normDigits(s) {
    return s.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
            .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; });
  }
  $$('.tel').forEach(function (i) { i.addEventListener('input', function () { i.value = normDigits(i.value); }); });
  var telOk = function (v) { v = normDigits(v).replace(/[\s\-()]/g, ''); return /^(\+?20|0)?\d{8,11}$/.test(v); };

  // السن حتى تاريخ ملء البيانات (تاريخ اليوم)
  var dob = $('#c_dob'), ageOut = $('#ageOut'), ageIn = $('#c_age'), ageDate = $('#ageDate');
  var AGE_DEFAULT = 'يُحسب تلقائيًا من تاريخ الميلاد';
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() { var t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }
  function todayAr() { var t = new Date(); return pad(t.getDate()) + '/' + pad(t.getMonth() + 1) + '/' + t.getFullYear(); }
  function calcAge() {
    var now = new Date(), r = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dob.max = todayISO(); ageDate.textContent = 'محسوب حتى اليوم ' + todayAr();
    if (!dob.value) { ageOut.textContent = AGE_DEFAULT; ageIn.value = ''; return; }
    var p = dob.value.split('-'), b = new Date(+p[0], +p[1] - 1, +p[2]);
    if (b > r) { ageOut.textContent = 'تاريخ الميلاد بعد تاريخ اليوم'; ageIn.value = ''; return; }
    var m = (r.getFullYear() - b.getFullYear()) * 12 + (r.getMonth() - b.getMonth());
    if (r.getDate() < b.getDate()) m--;
    var y = Math.floor(m / 12), mo = m % 12, t = [];
    if (y) t.push(y === 1 ? 'سنة' : y === 2 ? 'سنتان' : y + (y <= 10 ? ' سنوات' : ' سنة'));
    if (mo) t.push(mo === 1 ? 'شهر' : mo === 2 ? 'شهران' : mo + (mo <= 10 ? ' شهور' : ' شهرًا'));
    var txt = t.length ? t.join(' و ') : 'أقل من شهر';
    ageOut.textContent = txt; ageIn.value = txt;
  }
  dob.addEventListener('change', calcAge);
  calcAge();

  // الحقول الشرطية
  function updateCond() {
    $$('.cond', form).forEach(function (c) {
      var dep = form.elements[c.dataset.dep];
      var on = dep && c.dataset.eq.split(',').indexOf(dep.value) > -1;
      c.classList.toggle('on', !!on);
      if (!on) { var inp = $('input,textarea', c); if (inp) inp.value = ''; }
    });
  }
  form.addEventListener('change', updateCond);
  updateCond();

  // التحقق
  function setErr(el, bad) {
    var f = el.closest('.f'); if (f) f.classList.toggle('err', bad); return !bad;
  }
  function validate(i) {
    var ok = true, first = null, s = steps[i];
    $$('[required]', s).forEach(function (el) {
      var bad = !el.value.trim(); setErr(el, bad);
      if (bad) { ok = false; first = first || el; }
    });
    if (i === 1) {
      var f = $('#f_tel'), m = $('#m_tel'), fv = f.value.trim(), mv = m.value.trim();
      var fBad = fv && !telOk(fv), mBad = mv && !telOk(mv), none = !fv && !mv;
      setErr(f, fBad); setErr(m, mBad);
      $('#telErr').style.display = none ? 'block' : 'none';
      if (fBad || mBad || none) { ok = false; first = first || (fBad || none ? f : m); }
    }
    if (i === steps.length - 1) {
      if (API) {
        var bOk = !!(bk.date && bk.time);
        if (!bOk) {
          showSum(bd ? 'من فضلك اختر يوم الموعد ثم الساعة من التقويم' : 'تعذّر تحميل المواعيد — اضغط «إعادة المحاولة» ثم اختر موعدك', true);
          ok = false; first = first || $('.cal-d.ok', cal) || $('[data-r]', cal);
        }
      }
      var c = $('#consent'); $('#consentErr').style.display = c.checked ? 'none' : 'block';
      if (!c.checked) { ok = false; first = first || c; }
    }
    if (first && first.focus) first.focus({ preventScroll: false });
    return ok;
  }
  form.addEventListener('input', function (e) { var f = e.target.closest('.f'); if (f) f.classList.remove('err'); });

  // ====== حجز موعد التقييم ======
  var API = (CONFIG.bookingApi || '').trim(), cal = $('#cal'), bookSum = $('#bookSum');
  var bk = { date: null, time: null }, bd = null, view = null, loadedAt = 0, loading = false;
  var MN = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DN = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  var WD = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function dowOf(k) { var p = k.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function keyOf(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function fmtTime(t) { var p = t.split(':'), h = +p[0]; return (h > 12 ? h - 12 : h) + ':' + p[1] + ' ' + (h < 12 ? 'صباحًا' : h < 17 ? 'ظهرًا' : 'مساءً'); }
  function fmtDate(k) { var p = k.split('-'); return WD[dowOf(k)] + ' ' + (+p[2]) + ' ' + MN[+p[1] - 1] + ' ' + p[0]; }
  function dayState(k) {
    if (k < bd.first || k > bd.last || bd.openDows.indexOf(dowOf(k)) < 0) return { s: 'off' };
    if (bd.closed.indexOf(k) > -1) return { s: 'closed' };
    var n = (bd.booked[k] || []).length;
    if (n >= bd.max) return { s: 'full' };
    return { s: 'ok', left: bd.max - n };
  }
  function showSum(t, bad) { bookSum.textContent = t || ''; bookSum.className = 'book-sum' + (t ? ' on' : '') + (bad ? ' bad' : ''); }
  function updateSum() { if (bk.date && bk.time) showSum('✅ موعدكم: ' + fmtDate(bk.date) + ' — الساعة ' + fmtTime(bk.time)); else showSum(''); }
  function msg(html) { cal.innerHTML = '<div class="cal-msg">' + html + '</div>'; }

  function renderCal() {
    if (!API) { msg('📅 الحجز الإلكتروني غير مفعّل حاليًا. أرسلوا الاستمارة وسنتواصل معكم لتحديد موعد التقييم (من 9:00 ص إلى 12:00 ظ).'); return; }
    if (!bd) return;
    var y = view.y, m = view.m, col = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 1) % 7;
    var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var f = bd.first.split('-'), l = bd.last.split('-');
    var minYM = +f[0] * 12 + (+f[1] - 1), maxYM = +l[0] * 12 + (+l[1] - 1), cur = y * 12 + m;
    var h = '<div class="cal-head"><button type="button" data-n="-1" aria-label="الشهر السابق"' + (cur <= minYM ? ' disabled' : '') + '>›</button>' +
      '<b>' + MN[m] + ' ' + y + '</b>' +
      '<button type="button" data-n="1" aria-label="الشهر التالي"' + (cur >= maxYM ? ' disabled' : '') + '>‹</button></div><div class="cal-grid">';
    DN.forEach(function (n) { h += '<div class="cal-dn">' + n + '</div>'; });
    for (var i = 0; i < col; i++) h += '<div class="cal-d void"></div>';
    for (var d = 1; d <= days; d++) {
      var k = keyOf(y, m, d), st = dayState(k);
      if (st.s === 'ok') h += '<button type="button" class="cal-d ok' + (bk.date === k ? ' sel' : '') + '" data-k="' + k + '"><b>' + d + '</b><small>' + st.left + ' متاح</small></button>';
      else if (st.s === 'full') h += '<div class="cal-d full" title="اكتمل هذا اليوم"><b>' + d + '</b><small>مكتمل</small></div>';
      else if (st.s === 'closed') h += '<div class="cal-d closed"><b>' + d + '</b><small>مغلق</small></div>';
      else h += '<div class="cal-d off"><b>' + d + '</b></div>';
    }
    h += '</div><div class="cal-legend"><span><i style="background:#eaf8d6"></i>متاح</span><span><i style="background:#ffe9ec"></i>مكتمل / مغلق</span><span><i style="background:#f6f2fa"></i>غير متاح (الجمعة والسبت)</span>' +
      '<button type="button" data-r="1" style="margin-inline-start:auto;border:0;background:none;color:var(--purple);font-weight:700;cursor:pointer;font-family:inherit">🔄 تحديث المواعيد</button></div>';
    if (bk.date) {
      var taken = bd.booked[bk.date] || [];
      h += '<div class="cal-slots"><h5>🕘 اختر الساعة — ' + fmtDate(bk.date) + '</h5><div class="slot-row">';
      bd.slots.forEach(function (t) {
        var tk = taken.indexOf(t) > -1;
        h += '<button type="button" class="slot' + (bk.time === t ? ' sel' : '') + '" data-t="' + t + '"' + (tk ? ' disabled' : '') + '>' + fmtTime(t) + (tk ? ' (محجوز)' : '') + '</button>';
      });
      h += '</div></div>';
    }
    cal.innerHTML = h;
  }

  function loadSlots(force) {
    if (!API) { renderCal(); return; }
    if (loading) return;
    if (!force && bd && Date.now() - loadedAt < 60000) { renderCal(); return; }
    loading = true; msg('⏳ جارٍ تحميل المواعيد المتاحة…');
    fetch(API + (API.indexOf('?') > -1 ? '&' : '?') + 'action=slots&t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error('bad');
        bd = j; loadedAt = Date.now();
        if (bk.date && dayState(bk.date).s !== 'ok') { bk.date = null; bk.time = null; }
        else if (bk.time && (bd.booked[bk.date] || []).indexOf(bk.time) > -1) bk.time = null;
        var ref = bk.date || bd.first, p = ref.split('-');
        if (!view || force) view = { y: +p[0], m: +p[1] - 1 };
        renderCal(); updateSum();
      })
      .catch(function () { bd = null; msg('تعذّر تحميل المواعيد. تأكد من الاتصال بالإنترنت.<br><button type="button" class="btn btn-purple btn-sm" data-r="1">🔄 إعادة المحاولة</button>'); })
      .then(function () { loading = false; });
  }

  cal.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.r) { loadSlots(true); return; }
    if (t.dataset.n) { var v = view.m + (+t.dataset.n); view = { y: view.y + Math.floor(v / 12), m: ((v % 12) + 12) % 12 }; renderCal(); return; }
    if (t.dataset.k) { if (bk.date !== t.dataset.k) { bk.date = t.dataset.k; bk.time = null; } renderCal(); updateSum(); return; }
    if (t.dataset.t) { bk.time = t.dataset.t; renderCal(); updateSum(); }
  });

  function bookSlot(info) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ date: bk.date, time: bk.time, child: info.child, phone: info.phone, parent: info.parent, section: info.section, notes: info.notes, form: info.form, hp: '' }) })
      .then(function (r) { return r.json(); });
  }
  var BOOK_ERR = {
    taken: 'للأسف تم حجز هذه الساعة للتو من ولي أمر آخر. من فضلك اختر ساعة أخرى.',
    full: 'اكتمل حجز هذا اليوم للتو. من فضلك اختر يومًا آخر.',
    closed: 'هذا اليوم غير متاح للحجز. من فضلك اختر يومًا آخر.',
    date: 'هذا التاريخ غير متاح. من فضلك اختر يومًا آخر.',
    invalid: 'بيانات الحجز غير مكتملة، راجع اسم الطفل ورقم الهاتف.'
  };
  function bookingError(r) {
    var t = BOOK_ERR[r.error] || 'تعذّر إتمام الحجز الآن. حاول مرة أخرى أو تواصل معنا على واتساب.';
    if (r.error === 'duplicate') t = 'يوجد حجز قائم على هذا الرقم يوم ' + fmtDate(r.date) + ' الساعة ' + fmtTime(r.time) + '. لتعديل الموعد تواصلوا معنا على واتساب.';
    if (r.error === 'taken') bk.time = null;
    if (r.error === 'full' || r.error === 'closed' || r.error === 'date') { bk.date = null; bk.time = null; }
    statusBox.className = 'status bad'; statusBox.textContent = '⚠️ ' + t;
    showSum(t, true);
  }

  // ====== الإرسال ======
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var k = 0; k < steps.length; k++) { if (!validate(k)) { go(k); validate(k); return; } }
    if (form.elements['_honey'].value) return; // روبوت
    calcAge();

    var data = {}, fd = new FormData(form);
    fd.forEach(function (v, key) {
      if (key === '_honey') return;
      v = String(v).trim(); if (v) data[key] = normDigits(v);
    });
    data['تاريخ ملء البيانات (تاريخ احتساب السن)'] = todayAr();
    var needBook = !!(API && bk.date && bk.time), slotTxt = '';
    if (needBook) {
      slotTxt = fmtDate(bk.date) + ' — الساعة ' + fmtTime(bk.time);
      data['الموعد | يوم المقابلة'] = fmtDate(bk.date);
      data['الموعد | الساعة'] = fmtTime(bk.time);
    }
    var child = data['الطفل | الاسم'] || 'طفل';
    var phone = data['الأب | الهاتف'] || data['الأم | الهاتف'] || '';
    var payload = Object.assign({
      '_subject': 'استمارة تسجيل جديدة – ' + child + ' – حضانة جدو علي' + (needBook ? ' – موعد ' + bk.date + ' ' + bk.time : ''),
      '_template': 'table',
      '_captcha': 'false',
      'تاريخ الإرسال': new Date().toLocaleString('ar-EG')
    }, data);

    send.disabled = true; var old = send.textContent; send.textContent = '⏳ جارٍ الإرسال…';
    statusBox.className = 'status'; statusBox.textContent = '';
    function unlock() { send.disabled = false; send.textContent = old; }

    function waLink(extra) {
      var m = 'السلام عليكم، أرسلت استمارة تسجيل للطفل: ' + child +
        (data['الطفل | تاريخ الميلاد'] ? ' (تاريخ الميلاد: ' + data['الطفل | تاريخ الميلاد'] + ')' : '') +
        (data['الطفل | القسم المطلوب'] ? ' - القسم: ' + data['الطفل | القسم المطلوب'] : '') +
        (phone ? ' - للتواصل: ' + phone : '') + (extra || '');
      return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(m);
    }
    function sendFail(booked) {
      statusBox.className = 'status bad';
      statusBox.innerHTML = (booked ? '✅ تم حجز موعدكم: <b>' + slotTxt + '</b>.<br>⚠️ لكن تعذّر إرسال الاستمارة الكاملة الآن. أرسلوا بياناتكم الأساسية عبر واتساب أو أعيدوا المحاولة:'
        : '⚠️ تعذّر إرسال الاستمارة الآن (تأكد من الاتصال بالإنترنت وحاول مرة أخرى). يمكنكم أيضًا التواصل معنا مباشرة:') +
        '<br><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + waLink(booked ? ' - موعد التقييم المحجوز: ' + slotTxt : '') + '">💬 أرسل البيانات الأساسية عبر واتساب</a>';
    }
    function sendForm() {
      return fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) === 'false') throw new Error(res.j.message || 'failed');
          statusBox.className = 'status ok';
          statusBox.innerHTML = '✅ تم استلام استمارة <b>' + escapeHtml(child) + '</b> بنجاح.' +
            (needBook ? '<br>📅 موعد التقييم: <b>' + slotTxt + '</b> — نرجو الحضور مع الطفل في الموعد.' : ' سنتواصل معكم قريبًا لتحديد موعد التقييم.') +
            '<br>شكرًا لثقتكم بجدو علي 💜';
          form.reset(); updateCond(); calcAge();
          bk = { date: null, time: null }; bd = null; updateSum();
          steps.forEach(function (s) { s.classList.remove('on'); }); go(0);
          statusBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    var bookP = needBook
      ? bookSlot({ child: child, phone: phone, parent: data['الأب | الاسم'] || data['الأم | الاسم'] || '', section: data['الطفل | القسم المطلوب'] || '', notes: data['الطفل | الفترة'] || '', form: data })
      : Promise.resolve({ ok: true });
    bookP.then(function (r) {
      if (!r.ok) { bookingError(r); loadSlots(true); unlock(); return; }
      return sendForm().catch(function () { sendFail(needBook); }).then(unlock);
    }).catch(function () { sendFail(false); unlock(); });
  });

  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  go(0);
  started = true;
})();
