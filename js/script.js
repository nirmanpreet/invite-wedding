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
  function whatsappEscape(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D')
      .replace(/#/g, '%23').replace(/@/g, '%40').replace(/\+/g, '%2B');
  }

  // ---------- Gurmukhi literals (ASCII \uXXXX) ----------
  var G = {
    headingPa: '\u0A30\u0A3F\u0A38\u0A48\u0A2A\u0A38\u0A3C\u0A28',
    introSubPa: '\u0A38\u0A3C\u0A3E\u0A26\u0A40 \u0A26\u0A3E \u0A28\u0A3F\u0A2E\u0A28\u0A24\u0A30\u0A28',
    headRsvpPa: 'RSVP',
    pdfSubPa: 'ਤੁਹਾਨੂੰ ਰਿਸੈਪ਼ਣ ਲਈ ਸੱਦਾ ਦਿੱਤਾ ਗਿਆ ਹੈ',
    pdfFootPa: 'ਪਿਆਰ ਅਤੇ ਖੁਸ਼ੀ ਨਾਲ, ਉਨ੍ਹਾਂ ਦੇ ਪਰਿਵਾਰਾਂ ਦੇ ਨਾਲ',
    cdLabelsEn: 'Days, Hours, Minutes, Seconds',
    cdLabelsPa: 'ਦਿਨ, ਘੰਟੇ, ਮਿੰਟ, ਸਕਿੰਟ'
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
    if (countdownTick) countdownTick();
  }

  // ---------- Invite ----------
  function renderInvite() {
    var titleEl = document.getElementById('invite-title');
    if (titleEl) {
      titleEl.innerHTML =
        '<h1>' + esc(p1) + '</h1>' +
        '<h2>' + esc(connector) + '</h2>' +
        '<h1>' + esc(p2) + '</h1>' +
        '<h3>' + esc(t('inviteTitle') || 'Are getting married') + '</h3>' +
        '<p>' + esc(tx('onWording', 'on')) + ' <span class="date">' + esc(date) + '</span>' +
        (time ? ', ' + esc(tx('atWording', 'at')) + ' <span class="place">' + esc(time) + '</span>' : '') +
        '</p>';
    }
    // Blessing at the top of the page: ੴ + lakh khushiaan pathshahiaan + Waheguru blessing
    var blessingEl = document.getElementById('invite-blessing');
    if (blessingEl) {
      blessingEl.innerHTML =
        '<span class="ik" aria-hidden="true">ੴ</span>' +
        '<div class="blessing-text">' + esc(t('footerNote') || footerMsg) + '</div>';
    }
    // Footer at the bottom: contact only
    var footerEl = document.getElementById('invite-footer');
    if (footerEl) {
      var contactLine = '';
      if (footerContactLabel && footerPhone) {
        contactLine = esc(footerContactLabel) + ' <a class="phone" href="tel:' + esc(footerPhoneHref) + '">' + esc(footerPhone) + '</a>';
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
    var heading = isPa ? G.headingPa : tx('receptionHeading', 'Reception');
    var items = '';
    el.innerHTML =
      '<h4>' + esc(heading) + '</h4>' +
      '<div class="day-grid">' + items +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoDate', 'Date')) + '</div><div class="value">' + esc(date) + '</div></div>' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoTime', 'Time')) + '</div><div class="value">' + esc(time || '-') + '</div></div>' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoVenue', 'Venue')) + '</div><div class="value">' + esc(venueName) + (venueAddress ? ', ' + esc(venueAddress) : '') + '</div></div>' +
      '</div>';
  }

  // ---------- RSVP ----------
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
      var aKey = isPa ? '\u0A06\u0A35\u0A23\u0A3E: ' : 'Attending: ';
      parts.push(aKey + attending);
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
    var rsvpByName = (config.rsvp && config.rsvp.note) ? config.rsvp.note : '';
    var rsvpBy = (config.rsvp && config.rsvp.displayNote !== false && rsvpByName)
      ? '<div class="rsvp-by">' + esc(rsvpByName) + '</div>' : '';

    el.innerHTML =
      '<h4>' + esc(isPa ? G.headRsvpPa : (t('rsvpTitle') || 'RSVP')) + '</h4>' + rsvpBy +
      (formEnabled
        ? '<label for="rsvp-name">' + esc(namePh) + '</label>' +
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
    var q = encodeURIComponent((venueName + ' ' + venueAddress).trim());
    var embedUrl = 'https://www.google.com/maps?q=' + q + '&output=embed';
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
    var monthMap = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06',
                     July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
    var dparts = String(date).split(' ');
    var day = String(dparts[1] || '1').replace(/[^0-9]/g, '');
    if (day.length < 2) day = '0' + day;
    var mon = monthMap[dparts[0]] || '12';
    var year = dparts[2] || '2026';
    var icsDate = year + mon + day;
    var startHM = /\d{1,2}:\d{2}\s*(AM|PM)/i.exec(time || '');
    var startT = 'T100000';
    if (startHM) {
      var h = parseInt(startHM[1], 10);
      var isPM = /pm/i.test(startHM[0]);
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      startT = 'T' + (h < 10 ? '0' + h : h) + '0000';
    }
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
        '<p>' + esc(isPa ? G.headingPa : tx('receptionHeading', 'Reception')) +
        ' \u2022 ' + esc(date) + (time ? ' \u2022 ' + esc(time) : '') + '</p>' +
        '<p>' + esc(venueName) + (venueAddress ? ', ' + esc(venueAddress) : '') + '</p>';
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

    // Both QRs share one grid size (the larger module count), so they render
    // at the exact same size — on the page and identically on the PDF card.
    function buildPair(cellPx, forPdf) {
      var q1 = makeQr(mapText);
      var q2 = makeQr(vcard);
      var targetN = Math.max(q1.getModuleCount(), q2.getModuleCount());
      // On page (not PDF), wrap in clickable links
      var wrapMap = forPdf ? null : 'map';
      var wrapContact = forPdf ? null : 'contact';
      return {
        map: qrTableHtml(q1, cellPx, targetN, wrapMap),
        contact: qrTableHtml(q2, cellPx, targetN, wrapContact)
      };
    }

    var pagePair = buildPair(3, false);
    el.innerHTML =
      '<h4>' + title + '</h4>' +
      '<div class="qr-grid">' +
        '<div class="qr-item">' + pagePair.map +
          '<div class="qr-label">' + mapLbl + '</div></div>' +
        '<div class="qr-item">' + pagePair.contact +
          '<div class="qr-label">' + contactLbl + '</div></div>' +
      '</div>' +
      '<div class="qr-note">' + note + '</div>';

    var pdfQr = document.getElementById('pdf-qr');
    if (pdfQr) {
      var pdfPair = buildPair(3, true);
      pdfQr.innerHTML =
        '<div class="pdf-qr-title">' + title + '</div>' +
        '<div class="pdf-qr-grid">' +
          '<div class="qr-item">' + pdfPair.map +
            '<div class="qr-label">' + mapLbl + '</div></div>' +
          '<div class="qr-item">' + pdfPair.contact +
            '<div class="qr-label">' + contactLbl + '</div></div>' +
        '</div>';
    }
  }

  // ---------- PDF (lazy-loaded libs) ----------
  function updatePdfLang() {
    var isPa = (currentLang === 'pa');
    var subEl = document.getElementById('pdf-subtext');
    if (subEl) subEl.textContent = isPa ? G.pdfSubPa : ((config._pdf && config._pdf.subtext) || 'You are cordially invited to the wedding reception of');
    var footEl = document.getElementById('pdf-footer-note');
    if (footEl) footEl.textContent = isPa ? G.pdfFootPa : ((config._pdf && config._pdf.footerNote) || 'With love and joy, together with their families');
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
          var imgData = canvas.toDataURL('image/png');
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
          var pw = pdf.internal.pageSize.getWidth();
          var ph = Math.min((canvas.height * pw) / canvas.width, pdf.internal.pageSize.getHeight());
          pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
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

  // ---------- Countdown ----------
  var countdownTick = null;
  function parseArray(s) {
    var parts = String(s || '').split(',');
    if (parts.length >= 4) return parts.map(function (x) { return x.trim(); });
    return ['Days', 'Hours', 'Minutes', 'Seconds'];
  }
  function startCountdown() {
    var target = new Date(config.countdownTarget || 'Dec 6, 2026 18:00:00').getTime();
    if (isNaN(target)) target = new Date('Dec 6, 2026 18:00:00').getTime();
    var el = document.getElementById('time');
    if (!el) return;
    if (features.countdown === false) { el.style.display = 'none'; return; }
    el.style.display = '';
    function tick() {
      var dist = target - Date.now();
      if (isNaN(dist)) { el.style.display = 'none'; return; }
      if (dist < 0) { el.style.display = 'none'; return; }
      var d = Math.floor(dist / 864e5);
      var h = Math.floor((dist % 864e5) / 36e5);
      var m = Math.floor((dist % 36e5) / 6e4);
      var s = Math.floor((dist % 6e4) / 1000);
      var isPa = (currentLang === 'pa');
      var labels = isPa ? G.cdLabelsPa : G.cdLabelsEn;
      var safeH = Math.max(0, Math.min(23, h));
      var safeM = Math.max(0, Math.min(59, m));
      var safeS = Math.max(0, Math.min(59, s));
      var parsable = parseArray(labels);
      if (parsable.length < 4) parsable = ['Days', 'Hours', 'Minutes', 'Seconds'];
      el.innerHTML =
        "<div class='container'>" +
        "<div class='days block'>" + d + '<br>' + esc(parsable[0]) + '</div>' +
        "<div class='hours block'>" + safeH + '<br>' + esc(parsable[1]) + '</div>' +
        "<div class='minutes block'>" + safeM + '<br>' + esc(parsable[2]) + '</div>' +
        "<div class='seconds block'>" + safeS + '<br>' + esc(parsable[3]) + '</div>' +
        '</div>';
    }
    tick();
    countdownTick = tick;
    setInterval(tick, 1000);
  }

  // ---------- Gold petals ----------
  function startPetal() {
    if (features.sakura === false) return;
    var container = document.getElementById('sakura-falling');
    if (!container) return;
    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reducedMotion) return;
    var isSmall = window.innerWidth < 600;
    var interval = isSmall ? 900 : 550;
    var maxAge = isSmall ? 9000 : 12000;
    var colors = ['#c8a24b', '#e5c46d', '#f6e2a1', '#b8862e', '#d9b865'];
    function spawn() {
      var petal = document.createElement('div');
      petal.className = 'sakura';
      var size = isSmall ? (5 + Math.random() * 6) : (7 + Math.random() * 9);
      petal.style.width = size + 'px';
      petal.style.height = size + 'px';
      petal.style.background = colors[Math.floor(Math.random() * colors.length)];
      petal.style.borderRadius = '50% 50% 50% 0';
      petal.style.left = (Math.random() * 100) + '%';
      petal.style.animationDuration = (5 + Math.random() * 5) + 's';
      petal.style.animationDelay = (Math.random() * 2) + 's';
      container.appendChild(petal);
      setTimeout(function () {
        if (petal.parentNode) petal.parentNode.removeChild(petal);
      }, maxAge);
    }
    spawn();
    setInterval(spawn, interval);
  }

  // ---------- Language toggle ----------
  function renderLangToggle() {
    var toggle = document.getElementById('lang-toggle');
    if (!toggle || langs.length <= 1) return;
    var html = '<span style="display:block; text-align:center; margin-bottom:8px;">';
    langs.forEach(function (key) {
      var label = (i18n[key] && i18n[key].langLabel) || key.toUpperCase();
      var active = (key === currentLang);
      html += '<a href="#lang=' + esc(key) + '" class="' + (active ? 'active-lang' : '') + '">' + esc(label) + '</a> ';
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
    var isPa = (currentLang === 'pa');
    var subEl = document.getElementById('intro-sub');
    if (subEl) subEl.textContent = tx('introSub', isPa ? G.introSubPa : 'Wedding Invite');
  }

  // ---------- Boot ----------
  function boot() {
    setupIntroGate();
    renderInvite();
    startCountdown();
    renderDayInfo();
    renderRsvp();
    renderVenueMapEmbed();
    renderCalendarSection();
    renderPrintSection();
    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    startPetal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
