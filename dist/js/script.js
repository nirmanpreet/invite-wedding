/**
 * Wedding Invite - Nirman & Simran (reception)
 * No jQuery. PDF libraries load on demand only.
 */
'use strict';
(function () {
  var config = (typeof window !== 'undefined' && window.__WEDDING_CONFIG__) ? window.__WEDDING_CONFIG__ : {};
  var couple = config.couple || {};
  var p1 = couple.partner1 || 'Nirman';
  var p2 = couple.partner2 || 'Simran';
  var connector = couple.connector || '&';
  var date = config.date || '6 December 2026';
  var time = config.time || '6:00 PM';
  var venueName = (config.venue && config.venue.name) || 'Venue';
  var venueAddress = (config.venue && config.venue.address) || '';
  var footerMsg = (config.footer && config.footer.message) || '';
  var footerContact = (config.footer && config.footer.contact) || '';
  var footerContactLabel = (config.footer && config.footer.contactLabel) || '';
  var footerPhone = (config.footer && config.footer.phone) || '';
  var footerPhoneHref = (config.footer && config.footer.phoneHref) || '';
  var mapUrl = (config.links && config.links.venueMap) || 'https://maps.google.com';
  var eventDate = new Date(config.countdownTarget || 'Dec 6, 2026 10:00:00');
  if (isNaN(eventDate.getTime())) eventDate = new Date('Dec 6, 2026 10:00:00');
  var social = config.social || {};
  var socialEnabled = !!(social.enabled && social.url);
  var features = config.features || {};
  var rsvpWhatsApp = config.rsvpWhatsApp || {};
  var rsvpForm = config.rsvpForm || {};
  var i18n = (config.i18n && typeof config.i18n === 'object') ? config.i18n : {};
  var langs = Object.keys(i18n).filter(function (k) {
    return typeof i18n[k] === 'object' && k !== '_extra';
  });
  var defaultLang = langs.indexOf('en') >= 0 ? 'en' : (langs[0] || 'en');
  function resolveLang() {
    try {
      var m = (window.location.hash || '').match(/#lang=([a-z]{2})/i);
      if (m && i18n[m[1].toLowerCase()]) return m[1].toLowerCase();
    } catch (e) {}
    try {
      var stored = sessionStorage.getItem('wedding-lang');
      if (stored && i18n[stored]) return stored;
    } catch (e) {}
    return defaultLang;
  }
  var currentLang = resolveLang();
  var L = i18n[currentLang] || i18n[defaultLang] || {};
  var extraBlock = (i18n._extra && typeof i18n._extra === 'object') ? i18n._extra : {};

  function t(key) {
    var s = L[key];
    return (s === null || s === undefined) ? '' : String(s);
  }
  function txWith(key, fallback) {
    var block = extraBlock[currentLang] || extraBlock[defaultLang] || {};
    return block[key] || fallback || '';
  }
  function tx(key, fallback) {
    var block = extraBlock[currentLang] || extraBlock[defaultLang] || {};
    var s = block[key];
    if (s === null || s === undefined || s === '') s = fallback || '';
    return String(s).replace('{date}', date);
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // ---------- Language-aware values ----------
  // Punjabi mode uses the *Pa variants; English mode the plain Latin values.
  function isPa() { return currentLang === 'pa'; }
  function v(enKey, paKey, fallback) {
    if (isPa() && paKey) {
      var pv = (function () {
        var parts = paKey.split('.');
        var o = config;
        for (var i = 0; i < parts.length; i++) { if (!o) return ''; o = o[parts[i]]; }
        return o;
      })();
      if (pv) return String(pv);
    }
    return fallback === undefined ? '' : String(fallback === null ? '' : fallback);
  }
  function name1() { return isPa() && couple.partner1Pa ? String(couple.partner1Pa) : p1; }
  function name2() { return isPa() && couple.partner2Pa ? String(couple.partner2Pa) : p2; }
  function name1Latin() { return p1; }
  function name2Latin() { return p2; }
  function conn() { return isPa() && couple.connectorPa ? String(couple.connectorPa) : connector; }
  function dateText() { return isPa() && config.datePa ? String(config.datePa) : date; }
  function timeText() { return isPa() && config.timePa ? String(config.timePa) : time; }
  function venueNameText() { return isPa() && config.venue && config.venue.namePa ? String(config.venue.namePa) : venueName; }
  function venueAddrText() { return isPa() && config.venue && config.venue.addressPa ? String(config.venue.addressPa) : venueAddress; }
  function rsvpNoteText() {
    if (isPa() && config.rsvp && config.rsvp.notePa) return String(config.rsvp.notePa);
    return (config.rsvp && config.rsvp.note) ? String(config.rsvp.note) : '';
  }
  function contactLabelText() {
    if (isPa() && config.footer && config.footer.contactLabelPa) return String(config.footer.contactLabelPa);
    return footerContactLabel;
  }
  // Weekday name in the active language
  function weekdayText() {
    var arr = txList('weekdays');
    if (!arr.length) return '';
    return arr[eventDate.getDay()] || arr[0];
  }
  function txList(key) {
    var block = extraBlock[currentLang] || extraBlock[defaultLang] || {};
    var a = block[key];
    return Array.isArray(a) ? a : [];
  }
  function txOr(key, fb) {
    var block = extraBlock[currentLang] || extraBlock[defaultLang] || {};
    var s = block[key];
    if (s === null || s === undefined || s === '') s = fb || '';
    return String(s);
  }
  function whatsappEscape(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D')
      .replace(/#/g, '%23').replace(/@/g, '%40').replace(/\+/g, '%2B');
  }

  // ---------- Gurmukhi literals (ASCII \uXXXX) ----------
  var G = {
    headingPa: '\u0A30\u0A3F\u0A38\u0A48\u0A2A\u0A38\u0A3C\u0A28',
    headRsvpPa: 'RSVP',
    pdfSubPa: 'ਤੁਹਾਨੂੰ ਰਿਸੈਪ਼ਣ ਲਈ ਸੱਦਾ ਦਿੱਤਾ ਗਿਆ ਹੈ',
    pdfFootPa: 'ਪਿਆਰ ਅਤੇ ਖੁਸ਼ੀ ਨਾਲ, ਉਨ੍ਹਾਂ ਦੇ ਪਰਿਵਾਰਾਂ ਦੇ ਨਾਲ',
  };

  // ---------- Language switching ----------
  function setLang(lang) {
    if (!i18n[lang]) return;
    currentLang = lang;
    try { sessionStorage.setItem('wedding-lang', lang); } catch (e) {}
    try { history.replaceState(null, '', '#lang=' + lang); } catch (e) {}
    L = i18n[currentLang] || i18n[defaultLang] || {};
    document.documentElement.lang = (lang === 'pa') ? 'pa' : 'en';
    renderInvite();
    renderDayInfo();
    renderRsvp();
    renderVenueMapEmbed();
    renderCalendarSection();
    renderPrintSection();
    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    updateIntroGate();
    renderSaveTheDate();
  }

  // ---------- Invite ----------
  function renderInvite() {
    var titleEl = document.getElementById('invite-title');
    if (titleEl) {
      var n1 = name1();
      var n2 = name2();
      // Punjabi mode: Gurmukhi name with the Latin name underneath.
      var n1Sub = isPa() ? '<span class="name-latin">' + esc(name1Latin()) + '</span>' : '';
      var n2Sub = isPa() ? '<span class="name-latin">' + esc(name2Latin()) + '</span>' : '';
      // Punjabi puts the "on" marker (ਨੂੰ) AFTER the date; English before it.
      var datePart, timePart = '';
      if (isPa()) {
        datePart = '<span class="date">' + esc(dateText()) + '</span> ' + esc(tx('onWording', 'ਨੂੰ'));
        timePart = timeText() ? ' &middot; ' + esc(timeText()) : '';
      } else {
        datePart = esc(tx('onWording', 'on')) + ' <span class="date">' + esc(dateText()) + '</span>';
        timePart = time ? ' &middot; ' + esc(tx('atWording', 'at')) + ' <span class="place">' + esc(timeText()) + '</span>' : '';
      }
      titleEl.innerHTML =
        '<h1>' + esc(n1) + n1Sub + '</h1>' +
        '<h2>' + esc(conn()) + '</h2>' +
        '<h1>' + esc(n2) + n2Sub + '</h1>' +
        '<h3>' + esc(t('inviteTitle') || 'Wedding Reception') + '</h3>' +
        '<p>' + datePart + timePart + '</p>';
    }
    // Blessing at the top of the page: ੴ + Satgur Prasad + Lakh khushiaan pathshahiaan
    var blessingEl = document.getElementById('invite-blessing');
    if (blessingEl) {
      var blessingText = t('footerNote');
      // Only fall back to English if translation is truly missing (not just empty string)
      if (blessingText === '' || blessingText === undefined || blessingText === null) {
        blessingText = footerMsg;
      }
      // Convert newlines to <br> for HTML rendering, then escape
      // We replace \n with a placeholder, escape, then restore <br>
      blessingText = blessingText.replace(/\n/g, '\u0001');
      blessingText = esc(blessingText);
      blessingText = blessingText.replace(/\u0001/g, '<br>');
      blessingEl.innerHTML =
        '<span class="ik" aria-hidden="true">ੴ</span>' +
        '<div class="blessing-text">' + blessingText + '</div>';
    }
    // Footer at the bottom: contact only
    var footerEl = document.getElementById('invite-footer');
    if (footerEl) {
      var contactLine = '';
      if (footerContactLabel && footerPhone) {
        contactLine = esc(contactLabelText()) + ' <a class="phone" href="tel:' + esc(footerPhoneHref) + '">' + esc(footerPhone) + '</a>';
      } else if (footerContact) {
        contactLine = esc(footerContact);
      }
      footerEl.innerHTML = contactLine;
    }
    var actionsEl = document.getElementById('invite-actions');
    if (actionsEl) {
      actionsEl.innerHTML =
        '<a href="' + esc(mapUrl) + '" target="_blank" rel="noopener"><div class="venue">' + esc(t('venueBtn') || 'SEE THE VENUE') + '</div></a>' +
        '<button id="download-pdf" class="venue" type="button">' + esc(t('downloadBtn') || 'DOWNLOAD INVITATION CARD') + '</button>';
      var btn = document.getElementById('download-pdf');
      if (btn) btn.addEventListener('click', onDownloadPdfClick);
    }
    var socialEl = document.getElementById('invite-social');
    if (socialEl) {
      if (socialEnabled) {
        socialEl.style.display = 'block';
        socialEl.innerHTML = esc(tx('shareLabel', 'Share the happiness!')) +
          '<br><a href="' + esc(social.url) + '" target="_blank" rel="noopener" class="twitter"><i class="fa fa-whatsapp"></i></a>';
      } else {
        socialEl.style.display = 'none';
      }
    }
  }

  // ---------- Day info ----------
  function renderDayInfo() {
    var el = document.getElementById('day-info');
    if (!el) return;
    if (features.dayInfo === false) { el.innerHTML = ''; return; }
    var isPa = (currentLang === 'pa');
    // Both languages must use the same occasion wording - "Reception" was
    // leaking through as English inside Punjabi mode.
    var heading = tx('receptionHeading', 'Reception');
    var items = '';
    el.innerHTML =
      '<h4>' + esc(heading) + '</h4>' +
      '<div class="day-grid">' + items +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoDate', 'Date')) + '</div><div class="value">' + esc(dateText()) + '</div></div>' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoTime', 'Time')) + '</div><div class="value">' + esc(timeText() || '-') + '</div></div>' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoVenue', 'Venue')) + '</div><div class="value">' + esc(venueNameText()) + (venueAddrText() ? '<br>' + esc(venueAddrText()) : '') + '</div></div>' +
      '</div>';
  }

  // ---------- RSVP ----------
  // "Yes"/"No" -> Punjabi, for the outgoing WhatsApp message
  function translateAttend(v) {
    var s = String(v || '');
    if (/^yes$/i.test(s)) return rsvpWhatsApp.attendYesPa || 'ਹਾਂ';
    if (/^no$/i.test(s)) return rsvpWhatsApp.attendNoPa || 'ਨਹੀਂ';
    return s;
  }

  function buildWhatsappRsvpLink(attending, guestName, guests) {
    var phone = (rsvpWhatsApp && rsvpWhatsApp.phone) ? String(rsvpWhatsApp.phone).replace(/[^0-9+]/g, '') : '';
    if (!phone) return null;
    var isPa = (currentLang === 'pa');
    var baseMsg = isPa
      ? (rsvpWhatsApp.defaultMessagePa || rsvpWhatsApp.defaultMessageEn || '')
      : (rsvpWhatsApp.defaultMessageEn || rsvpWhatsApp.defaultMessagePa || '');
    var parts = [];
    if (guestName && String(guestName).trim()) {
      var nameKey = isPa ? '\u0A28\u0A3E\u0A2E: ' : 'Name: ';
      parts.push(nameKey + String(guestName).trim());
    }
    if (guests !== '' && /^[0-9]+$/.test(String(guests))) {
      var gKey = isPa ? '\u0A2E\u0A39\u0A2E\u0A3E\u0A28: ' : 'Guests: ';
      parts.push(gKey + guests);
    }
    if (attending) {
      // The button carries data-attend="Yes"/"No"; the outgoing message
      // must state it in the reader's language, not echo the English token.
      var aKey = isPa ? 'ਹਾਜ਼ਰੀ: ' : 'Attending: ';
      parts.push(aKey + (isPa ? translateAttend(attending) : attending));
    }
    var msg = parts.length ? parts.join(' | ') + ' | ' + baseMsg : baseMsg;
    return 'https://wa.me/' + phone + '?text=' + whatsappEscape(msg);
  }

  function renderRsvp() {
    var el = document.getElementById('rsvp-section');
    if (!el) return;
    var show = (features.rsvpWhatsApp !== false) || (features.rsvpForm !== false);
    if (!show) { el.innerHTML = ''; return; }
    var isPa = (currentLang === 'pa');
    var label = isPa ? (rsvpWhatsApp.labelPa || 'RSVP') : (rsvpWhatsApp.labelEn || 'RSVP via WhatsApp');
    var formEnabled = features.rsvpForm !== false;
    var namePh = isPa
      ? (rsvpForm.guestNamePlaceholderPa || '\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A3E \u0A28\u0A3E\u0A2E')
      : (rsvpForm.guestNamePlaceholderEn || 'Your name');
    var sendLbl = isPa
      ? (rsvpForm.submitLabelPa || 'Send RSVP via WhatsApp')
      : (rsvpForm.submitLabelEn || 'Send RSVP via WhatsApp');
    var noteTxt = isPa
      ? (rsvpForm.notePa || rsvpForm.noteEn || '')
      : (rsvpForm.noteEn || rsvpForm.notePa || '');
    var attendLbl = isPa
      ? (rsvpForm.attendLabelPa || '\u0A15\u0A40 \u0A24\u0A41\u0A38\u0A40\u0A02 \u0A06\u0A09\u0A23\u0A17\u0A47?')
      : (rsvpForm.attendLabelEn || 'Will you be there?');
    var yesLbl = isPa
      ? (rsvpForm.yesLabelPa || '\u0A39\u0A3E\u0A02, \u0A2E\u0A48\u0A02 \u0A1C\u0A3C\u0A41\u0A30\u0A42\u0A30 \u0A06\u0A09\u0A70\u0A17\u0A3E')
      : (rsvpForm.yesLabelEn || "Yes, I'll be there");
    var noLbl = isPa
      ? (rsvpForm.noLabelPa || '\u0A28\u0A39\u0A40\u0A02, \u0A2E\u0A48\u0A02 \u0A28\u0A39\u0A40\u0A02 \u0A06 \u0A38\u0A15\u0A26\u0A3E')
      : (rsvpForm.noLabelEn || "No, I can't make it");
    var rsvpByName = rsvpNoteText();
    var rsvpBy = (config.rsvp && config.rsvp.displayNote !== false && rsvpByName)
      ? '<div class="rsvp-by">' + esc(rsvpByName) + '</div>' : '';

    el.innerHTML =
      '<h4>' + esc(isPa ? G.headRsvpPa : (t('rsvpTitle') || 'RSVP')) + '</h4>' + rsvpBy +
      (formEnabled
        ? '<label class="sr-only" for="rsvp-name">' + esc(namePh) + '</label>' +
          '<input id="rsvp-name" type="text" placeholder="' + esc(namePh) + '" autocomplete="name">' +
          '<div class="rsvp-attend-label">' + esc(attendLbl) + '</div>' +
          '<div class="rsvp-attending" role="group" aria-label="' + esc(attendLbl) + '">' +
            '<button type="button" class="attend-btn" data-attend="Yes" aria-pressed="false">' + esc(yesLbl) + '</button>' +
            '<button type="button" class="attend-btn" data-attend="No" aria-pressed="false">' + esc(noLbl) + '</button>' +
          '</div>' +
          '<div class="rsvp-actions">' +
            '<button id="rsvp-send" type="button">' + esc(sendLbl) + '</button>' +
          '</div>' +
          (noteTxt ? '<div class="rsvp-note">' + esc(noteTxt) + '</div>' : '')
        : '<a id="rsvp-direct-only" href="#" target="_blank" rel="noopener" class="venue">' + esc(label) + '</a>');

    var selectedAttend = '';
    var attendBtns = el.querySelectorAll('.attend-btn');
    Array.prototype.forEach.call(attendBtns, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(attendBtns, function (b) {
          b.classList.remove('selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
        selectedAttend = btn.getAttribute('data-attend') || '';
      });
    });

    var sendBtn = document.getElementById('rsvp-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var nameEl = document.getElementById('rsvp-name');
        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) { if (nameEl) nameEl.focus(); return; }
        var link = buildWhatsappRsvpLink(selectedAttend, name, '');
        if (link) window.open(link, '_blank', 'noopener');
      });
    }
    var directOnly = document.getElementById('rsvp-direct-only');
    if (directOnly) {
      var dl = buildWhatsappRsvpLink('', '', '');
      if (dl) directOnly.setAttribute('href', dl);
    }
  }

  // ---------- Venue map embed ----------
  function renderVenueMapEmbed() {
    var el = document.getElementById('venue-map-embed');
    if (!el) return;
    if (features.venueMapEmbed === false) { el.innerHTML = ''; return; }
    // Always query with the LATIN address + coordinates - never the Punjabi text,
    // and never place_id (that form returns an empty 1.4KB shell with no place).
    var lat = (config.venue && config.venue.lat);
    var lng = (config.venue && config.venue.lng);
    var embedUrl = (lat && lng)
      ? 'https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=15&hl=en&output=embed'
      : 'https://maps.google.com/maps?q=' + encodeURIComponent((venueName + ' ' + venueAddress).trim()) + '&z=15&hl=en&output=embed';
    el.innerHTML =
      '<iframe src="' + esc(embedUrl) + '" allowfullscreen loading="lazy"></iframe>' +
      '<div class="map-label">' + esc(tx('venueMapLabel', 'View venue on map')) + '</div>';
  }

  // ---------- Calendar (.ics) ----------
  function renderCalendarSection() {
    var el = document.getElementById('calendar-section');
    if (!el) return;
    if (features.calendarIcs === false) { el.innerHTML = ''; return; }
    var label = tx('calendarLabel', 'Add to calendar');
    var note = tx('calendarNote', 'Opens your calendar app with the event pre-filled.');
    // Derive YYYYMMDD + HHMMSS from the parsed Date, not by splitting the
    // display string. The old parser assumed "Month Day Year" but the config
    // is "6 December 2026", so it emitted 2026120; and it read the AM/PM
    // capture group as the hour, producing DTSTART ...TNaN0000.
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    // Day/month/year from the Date using LOCAL getters: the wedding is on
    // 6 December 2026, and UTC getters would shift it to the 5th for
    // anyone east of Greenwich.
    var icsDate = eventDate.getFullYear() + pad(eventDate.getMonth() + 1) + pad(eventDate.getDate());
    // The start time is a wall-clock time in India (TZID below), NOT the
    // viewer's local time, so it must come from the config string.
    var hm = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(time || '');
    var icsHour = 10, icsMin = 0;
    if (hm) {
      icsHour = parseInt(hm[1], 10);
      icsMin = parseInt(hm[2], 10);
      var mer = (hm[3] || '').toUpperCase();
      if (mer === 'PM' && icsHour < 12) icsHour += 12;
      if (mer === 'AM' && icsHour === 12) icsHour = 0;
    }
    var startT = 'T' + pad(icsHour) + pad(icsMin) + '00';
    var icsContent =
      'BEGIN:VCALENDAR\r\n' +
      'VERSION:2.0\r\n' +
      'PRODID:-//NirmanSimranWedding//EN\r\n' +
      'BEGIN:VEVENT\r\n' +
      'UID:' + icsDate + '-nirman-simran@wedding\r\n' +
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z\r\n' +
      'SUMMARY:' + p1 + ' & ' + p2 + ' - Wedding Reception\r\n' +
      'DTSTART;TZID=Asia/Kolkata:' + icsDate + startT + '\r\n' +
      'DTEND;TZID=Asia/Kolkata:' + icsDate + 'T235900\r\n' +
      'DESCRIPTION:Wedding Reception for ' + p1 + ' & ' + p2 + ' on ' + date + ' at ' + venueName + '\r\n' +
      // LOCATION stays Latin: calendar apps + GPS need the ASCII address.
      'LOCATION:' + venueName + (venueAddress ? ', ' + venueAddress : '') + '\r\n' +
      'END:VEVENT\r\n' +
      'END:VCALENDAR';
    var icsData = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
    el.innerHTML =
      '<a href="' + esc(icsData) + '" download="' + esc(p1 + '_' + p2 + '_reception.ics') + '">' + esc(label) + '</a>' +
      '<div class="cal-note">' + esc(note) + '</div>';
  }

  // ---------- Print ----------
  function renderPrintSection() {
    var el = document.getElementById('print-section');
    if (!el) return;
    if (features.printButton === false) { el.innerHTML = ''; return; }
    el.innerHTML = '<button id="print-invite" type="button">' + esc(tx('printLabel', 'Print this invitation')) + '</button>';
    var btn = document.getElementById('print-invite');
    if (btn) btn.addEventListener('click', function () { window.print(); });
    var headerEl = document.getElementById('print-header');
    if (headerEl) {
      var isPa = (currentLang === 'pa');
      headerEl.innerHTML =
        '<h1>' + esc(p1 + ' ' + connector + ' ' + p2) + '</h1>' +
        '<p>' + esc(tx('receptionHeading', 'Reception')) +
        ' \u2022 ' + esc(dateText()) + (timeText() ? ' \u2022 ' + esc(timeText()) : '') + '</p>' +
        '<p>' + esc(venueNameText()) + (venueAddrText() ? ', ' + esc(venueAddrText()) : '') + '</p>';
    }
  }

  // ---------- QR codes (venue map + contact vCard) ----------
  function makeQr(text) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr;
  }

  // Render a QR as a table, padded with white modules so both QRs share the
  // exact same grid size (and therefore the exact same physical size).
  // wrapInLink: 'map' | 'contact' | null - wraps the QR in <a> for click-to-open
  // html2canvas (the PDF renderer) cannot rasterise the QR in ANY form: a
  // <table> with border-collapse, a <canvas>, and inline SVG all came out
  // as blank white squares in the downloaded card. So the PDF card keeps an
  // empty white box of the correct size for html2canvas to capture, and the
  // modules are painted straight onto html2canvas's output canvas afterwards
  // (see paintQrCodesOnto). The live page still uses real <table> QRs.
  function qrBlankBox(cellPx, targetN) {
    var side = targetN * cellPx;
    var pad = cellPx * 4;
    var el = document.createElement('div');
    el.className = 'qr-wrap qr-wrap-blank';
    el.style.cssText = 'width:' + side + 'px;height:' + side + 'px;background:#fff;' +
      'padding:0;border-radius:10px;';
    return el;
  }

  function qrTableHtml(qr, cellPx, targetN, wrapInLink) {
    var n = qr.getModuleCount();
    var top = Math.floor((targetN - n) / 2);
    var left = Math.floor((targetN - n) / 2);
    var rows = '';
    for (var r = 0; r < targetN; r++) {
      rows += '<tr>';
      for (var c = 0; c < targetN; c++) {
        var dr = r - top;
        var dc = c - left;
        var dark = (dr >= 0 && dr < n && dc >= 0 && dc < n && qr.isDark(dr, dc));
        rows += '<td style="width:' + cellPx + 'px;height:' + cellPx + 'px;background:' +
          (dark ? '#4a1220' : '#ffffff') + ';"></td>';
      }
      rows += '</tr>';
    }
    var tableHtml = '<div class="qr-wrap" style="background:#fff;padding:' + (cellPx * 4) + 'px;display:inline-block;line-height:0;border-radius:10px;">' +
      '<table class="qr-table" style="border-collapse:collapse;" cellpadding="0" cellspacing="0">' + rows + '</table></div>';
    if (wrapInLink === 'map') {
      var mapHref = (config.qr && config.qr.mapUrl) ||
        ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((venueName || '') + ' ' + (venueAddress || '')));
      return '<a class="qr-link" href="' + esc(mapHref) + '" target="_blank" rel="noopener" aria-label="Open venue map">' + tableHtml + '</a>';
    }
    if (wrapInLink === 'contact') {
      var phoneHref = (config.footer && config.footer.phoneHref) || '+61423594009';
      return '<a class="qr-link" href="tel:' + esc(phoneHref) + '" aria-label="Call ' + esc(phoneHref) + '">' + tableHtml + '</a>';
    }
    return tableHtml;
  }

  function buildVCard() {
    var name = (config.qr && config.qr.vcardName) || p1;
    var phone = (config.qr && config.qr.vcardPhone) || (config.footer && config.footer.phoneHref) || '';
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + name];
    if (phone) lines.push('TEL;TYPE=CELL:' + phone);
    if (venueName || venueAddress) lines.push('ADR:;;' + [venueName, venueAddress].filter(Boolean).join(', '));
    if (date) lines.push('NOTE:Wedding Reception ' + date);
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

// QR placeholders recorded by renderQrSection and painted onto the PDF
  // canvas after html2canvas runs. Declared here because renderQrSection
  // runs on every language change.
  var qrPaintList = [];

  function renderQrSection() {
    var el = document.getElementById('qr-section');
    if (!el) return;
    if (features.qrCode === false || typeof qrcode !== 'function') { el.innerHTML = ''; return; }
    var mapText = (config.qr && config.qr.mapUrl) ||
      ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((venueName || '') + ' ' + (venueAddress || '')));
    var vcard = buildVCard();
    var title = esc(tx('qrTitle', 'Scan me for venue'));
    var mapLbl = esc(tx('qrMap', 'Venue Map'));
    var contactLbl = esc(tx('qrContact', 'Contact Details'));
    var note = esc(tx('qrNote', 'Scan with your phone camera'));

    var q1 = makeQr(mapText);
    var q2 = makeQr(vcard);
    // Both QRs share one grid size (the larger module count), so they render
    // at the exact same size - on the page and identically on the PDF card.
    var targetN = Math.max(q1.getModuleCount(), q2.getModuleCount());
    var cellPx = 3;

    // Live page: real <table> QRs, each wrapped in a clickable link.
    el.innerHTML =
      '<h4>' + title + '</h4>' +
      '<div class="qr-grid">' +
        '<div class="qr-item">' + qrTableHtml(q1, cellPx, targetN, 'map') +
          '<div class="qr-label">' + mapLbl + '</div></div>' +
        '<div class="qr-item">' + qrTableHtml(q2, cellPx, targetN, 'contact') +
          '<div class="qr-label">' + contactLbl + '</div></div>' +
      '</div>' +
      '<div class="qr-note">' + note + '</div>';

    // PDF card: blank white boxes of identical size, plus a record of what to
    // paint into each one once html2canvas has captured the card.
    qrPaintList = [];
    var pdfQr = document.getElementById('pdf-qr');
    if (pdfQr) {
      pdfQr.innerHTML = '';
      var pdfTitle = document.createElement('div');
      pdfTitle.className = 'pdf-qr-title';
      pdfTitle.textContent = tx('qrTitle', 'Scan me for venue');
      var pdfGrid = document.createElement('div');
      pdfGrid.className = 'pdf-qr-grid';
      [[q1, tx('qrMap', 'Venue Map')], [q2, tx('qrContact', 'Contact Details')]].forEach(function (entry) {
        var item = document.createElement('div');
        item.className = 'qr-item';
        var box = qrBlankBox(cellPx, targetN);
        item.appendChild(box);
        var lbl = document.createElement('div');
        lbl.className = 'qr-label';
        lbl.textContent = entry[1];
        item.appendChild(lbl);
        pdfGrid.appendChild(item);
        qrPaintList.push({ box: box, qr: entry[0], cell: cellPx, target: targetN });
      });
      pdfQr.appendChild(pdfTitle);
      pdfQr.appendChild(pdfGrid);
    }
  }

  // Paint the QR modules straight onto html2canvas's output canvas. html2canvas
  // cannot rasterise a table, canvas or SVG, so the modules are drawn here.
  function paintQrCodesOnto(canvas, card) {
    if (!qrPaintList || !qrPaintList.length) return;
    var cardRect = card.getBoundingClientRect();
    var scale = canvas.width / cardRect.width;
    var ctx = canvas.getContext('2d');
    // html2canvas leaves its render scale on the context, so draw in device
    // pixels with an identity transform. Without this every fill lands at
    // double the intended offset, i.e. off the canvas.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    qrPaintList.forEach(function (entry) {
      var br = entry.box.getBoundingClientRect();
      if (!br.width) return;
      var side = entry.target * entry.cell;
      // The QR area sits inside the box; centre it the same way the table
      // version does (blank rows/cols around a smaller QR).
      var n = entry.qr.getModuleCount();
      var off = Math.floor((entry.target - n) / 2);
      var x0 = (br.left - cardRect.left) * scale + (br.width - side) * scale / 2;
      var y0 = (br.top - cardRect.top) * scale + (br.height - side) * scale / 2;
      var px = side * scale / entry.target;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y0, side * scale, side * scale);
      ctx.fillStyle = '#4a1220';
      for (var r = 0; r < n; r++) {
        var runStart = -1;
        for (var c = 0; c <= n; c++) {
          var dark = c < n && entry.qr.isDark(r, c);
          if (dark && runStart < 0) runStart = c;
          if (!dark && runStart >= 0) {
            var w = (c - runStart) * px;
            ctx.fillRect(x0 + (off + runStart) * px, y0 + (off + r) * px, w, px);
            runStart = -1;
          }
        }
      }
    });
    ctx.restore();
  }

  // ---------- PDF (lazy-loaded libs) ----------
  function updatePdfLang() {
    var isPa = (currentLang === 'pa');
    var subEl = document.getElementById('pdf-subtext');
    if (subEl) subEl.textContent = isPa ? (L.pdfSubtext || G.pdfSubPa) : ((config._pdf && config._pdf.subtext) || 'You are cordially invited to the wedding reception of');
    var footEl = document.getElementById('pdf-footer-note');
    if (footEl) footEl.textContent = isPa ? (L.pdfFooterNote || G.pdfFootPa) : ((config._pdf && config._pdf.footerNote) || 'With love and joy, together with their families');
    // Names + connector
    var n1 = document.getElementById('pdf-name-1');
    if (n1) n1.textContent = name1();
    var n2 = document.getElementById('pdf-name-2');
    if (n2) n2.textContent = name2();
    var cn = document.getElementById('pdf-connector');
    if (cn) cn.textContent = conn();
    // Event line: "Reception • 6 December 2026"
    var ev = document.getElementById('pdf-event-line');
    if (ev) ev.textContent = tx('receptionHeading', 'Reception') + ' \u2022 ' + dateText();
    var tl = document.getElementById('pdf-time-line');
    if (tl) tl.textContent = timeText();
    var vl = document.getElementById('pdf-venue-line');
    if (vl) vl.textContent = venueNameText() + (venueAddrText() ? ', ' + venueAddrText() : '');
    var ct = document.getElementById('pdf-contact');
    if (ct) ct.textContent = contactLabelText() + ' ' + footerPhone;
    // Gurmukhi blessing lines (same 2 lines as the page, minus Ik Onkar)
    var bl = document.getElementById('pdf-blessing');
    if (bl) {
      var note = t('footerNote') || '';
      var lines = String(note).split('\u2014')[0].replace(/\\s+$/, '');
      bl.textContent = lines.trim();
    }
  }

  function loadPdfLibs(cb) {
    if (window._pdfLibsReady) { cb(); return; }
    if (window._pdfLibsLoading) { setTimeout(function () { loadPdfLibs(cb); }, 150); return; }
    window._pdfLibsLoading = true;
    var c = document.head || document.getElementsByTagName('head')[0];
    var s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    var s2 = document.createElement('script');
    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    var done = 0;
    function ok() { done++; if (done >= 2) { window._pdfLibsReady = true; cb(); } }
    s1.onload = ok; s2.onload = ok;
    s1.onerror = ok; s2.onerror = ok;
    c.appendChild(s1); c.appendChild(s2);
  }

  function onDownloadPdfClick() {
    var card = document.getElementById('pdf-card');
    if (!card) return;
    var btn = document.getElementById('download-pdf');
    if (btn) { btn.textContent = tx('pdfWorking', 'Preparing...'); btn.disabled = true; }
    loadPdfLibs(function () {
      if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert('PDF libraries could not be loaded. Please check your connection.');
        if (btn) {
          btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
          btn.disabled = false;
        }
        return;
      }
      html2canvas(card, { scale: 2, useCORS: true, logging: false })
        .then(function (canvas) {
          // html2canvas cannot draw the QR modules, so paint them on here.
          paintQrCodesOnto(canvas, card);
          var imgData = canvas.toDataURL('image/png');
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
          var pw = pdf.internal.pageSize.getWidth();
          var ph = Math.min((canvas.height * pw) / canvas.width, pdf.internal.pageSize.getHeight());
          // Centre the card on the page; otherwise a tall A4 page leaves a
          // wide empty band under a wide, short card.
          var offY = Math.max(0, (pdf.internal.pageSize.getHeight() - ph) / 2);
          pdf.addImage(imgData, 'PNG', 0, offY, pw, ph);
          pdf.save('Invitation - ' + p1 + ' ' + connector + ' ' + p2 + '.pdf');
          if (btn) {
            btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
            btn.disabled = false;
          }
        })
        .catch(function () {
          alert('Could not generate the PDF. Please try again.');
          if (btn) {
            btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
            btn.disabled = false;
          }
        });
    });
  }

    // ---------- Save the Date card (replaces the ticking countdown) ----------
  function renderSaveTheDate() {
    var el = document.getElementById('time');
    if (!el) return;
    if (features.saveTheDate === false) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    var wd = weekdayText();
    var dTxt = dateText();
    // Punjabi: "ਐਤਵਾਰ, 6 ਦਸੰਬਰ 2026"  |  English: "Sunday, 6 December 2026"
    var full = wd ? wd + ', ' + dTxt : dTxt;
    el.innerHTML =
      '<div class="save-date">' +
        '<div class="sd-title">' + esc(txOr('saveTheDateTitle', 'Save the Date')) + '</div>' +
        '<div class="sd-date">' + esc(full) + '</div>' +
        '<div class="sd-note">' + esc(txOr('saveTheDateNote', '')) + '</div>' +
      '</div>';
  }

// ---------- Rose petals ----------
  // A sparse shower over the hero only: one rose every 3s in soft pink/cream,
  // stopping once the hero scrolls away so the rest of the page stays calm and
  // readable. Respects prefers-reduced-motion.
  function startPetal() {
    if (features.sakura === false) return;
    var container = document.getElementById('sakura-falling');
    if (!container) return;
    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reducedMotion) return;

    var COLORS = ['#e9aec0', '#f2cdd9', '#fbe9ee', '#d98fa8', '#f7dfe6'];
    var INTERVAL = 3000;   // sparse on purpose - was 550ms and read as rain
    var MAX_AGE = 14000;

    var hero = document.querySelector('.wrap') || document.body;
    var inView = true;

    function spawn() {
      if (!inView) return;
      var petal = document.createElement('div');
      petal.className = 'rose-petal';
      var size = 9 + Math.random() * 5;
      petal.style.width = size + 'px';
      petal.style.height = size + 'px';
      petal.style.setProperty('--petal', COLORS[Math.floor(Math.random() * COLORS.length)]);
      petal.style.left = (6 + Math.random() * 88) + '%';
      petal.style.animationDuration = (11 + Math.random() * 6) + 's';
      petal.style.animationDelay = (Math.random() * 2.5) + 's';
      container.appendChild(petal);
      setTimeout(function () {
        if (petal.parentNode) petal.parentNode.removeChild(petal);
      }, MAX_AGE);
    }

    // Stop once the hero scrolls away; resume if the guest scrolls back up.
    if (typeof IntersectionObserver === 'function') {
      var io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.1 });
      io.observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      inView = !document.hidden;
    });

    spawn();
    setInterval(spawn, INTERVAL);
  }

  // ---------- Language toggle ----------
  function renderLangToggle() {
    var toggle = document.getElementById('lang-toggle');
    if (!toggle || langs.length <= 1) return;
    var html = '<span style="display:block; text-align:center; margin-bottom:8px;">';
    langs.forEach(function (key) {
      var label = (i18n[key] && i18n[key].langLabel) || key.toUpperCase();
      var active = (key === currentLang);
      html += '<a href="#lang=' + esc(key) + '" data-lang="' + esc(key) + '" class="' + (active ? 'active-lang' : '') + '">' + esc(label) + '</a> ';
    });
    html += '</span>';
    toggle.innerHTML = html;
    toggle.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var m = a.getAttribute('href').match(/^#lang=([a-z]{2})$/i);
        if (m) {
          var newLang = m[1].toLowerCase();
          if (i18n[newLang] && newLang !== currentLang) setLang(newLang);
        }
        e.preventDefault();
      });
    });
  }

  // ---------- Intro gate ----------
  function enterSite(gate, pick, btn) {
    pick.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var lang = btn ? btn.getAttribute('data-lang') : null;
    if (lang && i18n[lang]) setLang(lang);
    // Auto-enter straight after picking a language
    try { sessionStorage.setItem('wedding-intro-seen', '1'); } catch (e) {}
    gate.classList.add('hide');
    document.body.classList.add('intro-done');
    setTimeout(function () { gate.style.display = 'none'; }, 500);
    var wrap = document.querySelector('.wrap');
    if (wrap) {
      wrap.setAttribute('tabindex', '-1');
      try { wrap.focus({ preventScroll: true }); } catch (e) { wrap.focus(); }
    }
  }

  function setupIntroGate() {
    var gate = document.getElementById('intro-gate');
    if (!gate) { document.body.classList.add('intro-done'); return; }
    var seen = false;
    try { seen = !!sessionStorage.getItem('wedding-intro-seen'); } catch (e) {}
    if (seen) {
      gate.style.display = 'none';
      document.body.classList.add('intro-done');
      return;
    }
    updateIntroGate();
    var pick = document.getElementById('intro-lang-pick');
    if (pick) {
      pick.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { enterSite(gate, pick, b); });
      });
      gate.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          var btn = pick.querySelector('button[data-lang="' + currentLang + '"]') || pick.querySelector('button');
          if (btn) { e.preventDefault(); enterSite(gate, pick, btn); }
        }
      });
      var firstBtn = pick.querySelector('button[data-lang="' + currentLang + '"]') || pick.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }

  function updateIntroGate() {
    var subEl = document.getElementById('intro-sub');
    if (subEl) subEl.textContent = txOr('introSub', 'Wedding Reception Invitation');
    var hintEl = document.getElementById('gate-hint');
    if (hintEl) hintEl.textContent = txOr('gateHint', 'Tap your language to enter');
    // The occasion line is static in the HTML, so it never got localised.
    var medEl = document.getElementById('dance-med');
    if (medEl) medEl.textContent = tx('receptionHeading', 'Reception');
  }

  // ---------- Boot ----------
  function boot() {
    // Set <html lang> before anything renders: the Punjabi typography rules are
    // scoped to html[lang="pa"], and setLang() only runs on interaction.
    document.documentElement.lang = isPa() ? 'pa' : 'en';
    setupIntroGate();
    updateIntroGate();   // gate copy must match the deep-linked language on load
    renderInvite();
    renderSaveTheDate();
    renderDayInfo();
    renderRsvp();
    renderVenueMapEmbed();
    renderCalendarSection();
    renderPrintSection();
    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    startPetal();
    initAnimations();
  }

  // ---------- Royal animation layer (GSAP, graceful fallback) ----------
  var royalAnimated = false;

  function revealTargets() {
    var ids = ['invite-blessing', 'invite-title', 'time', 'invite-actions',
      'invite-footer', 'lang-toggle', 'day-info', 'qr-section',
      'rsvp-section', 'venue-map-embed', 'calendar-section', 'print-section'];
    var out = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.offsetParent !== null) out.push(el);
    });
    var orn = document.querySelectorAll('.ornament');
    var art = document.querySelector('.ceremony-image img');
    if (art) out.push(art);
    return out.concat(Array.prototype.slice.call(orn));
  }

  function playIntroCard() {
    var card = document.querySelector('.intro-gate .card');
    var gate = document.getElementById('intro-gate');
    if (!card || !gate || gate.classList.contains('hide')) return;
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!window.gsap || reduce) return;
    gsap.from(card, {
      opacity: 0, y: 26, duration: 1.1, ease: 'power2.out', delay: 0.15
    });
  }

  function playRoyalReveal() {
    if (royalAnimated) return;
    royalAnimated = true;
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var targets = revealTargets();
    if (!targets.length) return;

    // Always make content visible first so it can never be stuck hidden.
    targets.forEach(function (el) {
      el.style.opacity = '';
      el.style.transform = '';
    });
    if (!window.gsap || reduce) return;

    document.body.classList.add('royal-animating');

    var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('#invite-blessing', { opacity: 0, y: 18, duration: 1.0 })
      .from('.ornament', { opacity: 0, scaleX: 0.4, duration: 0.9 }, '-=0.6')
      .from('.ceremony-image img', { opacity: 0, y: 24, duration: 1.1 }, '-=0.5')
      .from('#invite-title', { opacity: 0, y: 20, duration: 0.9 }, '-=0.6')
      .from('#time', { opacity: 0, y: 18, duration: 0.8 }, '-=0.55')
      .from('#invite-actions', { opacity: 0, y: 14, duration: 0.7 }, '-=0.45')
      .from(['#invite-footer', '#lang-toggle'], { opacity: 0, y: 12, duration: 0.6 }, '-=0.4')
      .from(['#day-info', '#qr-section', '#rsvp-section', '#venue-map-embed',
        '#calendar-section', '#print-section'], {
        opacity: 0, y: 16, duration: 0.7, stagger: 0.12
      }, '-=0.35');

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to('.ceremony-image img', {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: '.ceremony-image', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    }
  }

  function initAnimations() {
    playIntroCard();
    var gate = document.getElementById('intro-gate');
    var already = document.body.classList.contains('intro-done');
    if (already || !gate || gate.classList.contains('hide')) {
      setTimeout(playRoyalReveal, 120);
    } else {
      // Reveal once the intro gate is dismissed by any path.
      var iv = setInterval(function () {
        if (document.body.classList.contains('intro-done')) {
          clearInterval(iv);
          setTimeout(playRoyalReveal, 260);
        }
      }, 120);
      setTimeout(function () { clearInterval(iv); }, 20000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
