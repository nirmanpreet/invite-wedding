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
    renderPrintSection();
    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    updateIntroGate();
    renderSaveTheDate();
    // Petal toggle label + any lang-dependent chrome re-render with it.
    try { window.dispatchEvent(new CustomEvent('wedding-langchange')); } catch (e) {}
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
      /* One <h1> holding the couple (two h1s plus a skipped level below them
         failed axe's heading-order rule). The connector is a styled span
         inside the h1; the occasion becomes a real <h2>, so the outline is
         h1 > h2 everywhere on the page. */
      titleEl.innerHTML =
        '<h1 class="title-names"><span class="name-a">' + esc(n1) + n1Sub + '</span>' +
        '<span class="amp-title">' + esc(conn()) + '</span>' +
        '<span class="name-b">' + esc(n2) + n2Sub + '</span></h1>' +
        '<h2 class="title-sub">' + esc(t('inviteTitle') || 'Wedding Reception') + '</h2>' +
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
        // Second contact number (India). Same label, second tel: link.
        var phone2 = (config.footer && config.footer.phone2) || '';
        var phone2Href = (config.footer && config.footer.phone2Href) || String(phone2).replace(/[^0-9+]/g, '');
        if (phone2) {
          contactLine += ' &middot; <a class="phone" href="tel:' + esc(phone2Href) + '">' + esc(phone2) + '</a>';
        }
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
          '<br><a href="' + esc(social.url) + '" target="_blank" rel="noopener" class="twitter"><svg class="icon-whatsapp" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1 4.51-14.35 9.4 9.4 0 0 1 9.4 9.4c0 1.98-.72 3.86-2.03 5.35a9.36 9.36 0 0 1-2.63 2.22M20.5 3.49A11.76 11.76 0 0 0 12.04 0C5.5 0 .19 5.31.19 11.85c0 2.09.55 4.13 1.59 5.93L.09 24l6.36-1.67a11.85 11.85 0 0 0 5.59 1.42h.01c6.54 0 11.85-5.31 11.85-11.85a11.77 11.77 0 0 0-3.4-8.41z"/></svg></a>';
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
      '<h2>' + esc(heading) + '</h2>' +
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
      '<h2>' + esc(isPa ? G.headRsvpPa : (t('rsvpTitle') || 'RSVP')) + '</h2>' + rsvpBy +
      (formEnabled
        ? '<label class="sr-only" for="rsvp-name">' + esc(namePh) + '</label>' +
          '<input id="rsvp-name" type="text" placeholder="' + esc(namePh) + '" autocomplete="name">' +
          '<p class="rsvp-error" id="rsvp-error" role="alert" hidden></p>' +
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
    var errEl = document.getElementById('rsvp-error');
    // Silent validation (focus with no message) failed the a11y review:
    // a screen-reader or slow-tap guest had no idea why nothing happened.
    function rsvpError(msg) {
      if (!errEl) return;
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
    }
    var nameInput = document.getElementById('rsvp-name');
    if (nameInput) {
      nameInput.addEventListener('input', function () { rsvpError(''); });
    }
    Array.prototype.forEach.call(el.querySelectorAll('.attend-btn'), function (btn) {
      btn.addEventListener('click', function () { rsvpError(''); });
    });
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
          rsvpError(txWith('rsvpErrorName', 'Please enter your name.'));
          if (nameInput) nameInput.focus();
          return;
        }
        if (!selectedAttend) {
          rsvpError(txWith('rsvpErrorAttend', 'Please tap Yes or No so we know.'));
          return;
        }
        rsvpError('');
        var link = buildWhatsappRsvpLink(selectedAttend, name, '');
        // Use an options OBJECT, not the positional features string.
        // window.open(link, '_blank', 'noopener') treats 'noopener' as a
        // window-FEATURES string: the browser opens a window literally named
        // "noopener" with no opener, and in several mobile in-app browsers
        // (and headless Chrome) nothing is shown at all - so the guest's RSVP
        // silently went nowhere. The options object sets the opener policy
        // correctly and always opens the chat.
        if (link) window.open(link, '_blank', { noopener: true, noreferrer: true });
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
    // The iframe needs a title: an unlabelled frame fails axe and leaves
    // screen readers announcing just "frame".
    var frameTitle = venueName
      ? (venueName + ' — Google Maps')
      : 'Venue — Google Maps';
    el.innerHTML =
      '<iframe src="' + esc(embedUrl) + '" title="' + esc(frameTitle) + '" allowfullscreen loading="lazy"></iframe>' +
      '<div class="map-label">' + esc(tx('venueMapLabel', 'View venue on map')) + '</div>';
  }

  // ---------- Calendar (.ics) ----------
  /* Build the .ics payload once, so the Save the Date card and the calendar
     section can never disagree about the event details. */
  function buildIcsHref() {
    // Derive YYYYMMDD + HHMMSS from the parsed Date, not by splitting the
    // display string. The old parser assumed "Month Day Year" but the config
    // is "6 December 2026", so it emitted 2026120; and it read the AM/PM
    // capture group as the hour, producing DTSTART ...TNaN0000.
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    // Day/month/year from the Date using LOCAL getters: the wedding is on
    // 6 December 2026, and UTC getters would shift it to the 5th for
    // anyone east of Greenwich.
    var icsDate = eventDate.getFullYear() + pad(eventDate.getMonth() + 1) + pad(eventDate.getDate());
    // ALL-DAY event (RFC 5545 VALUE=DATE): no time, no TZID, so every
    // guest's calendar shows the whole of 6 December regardless of their
    // own zone. DTEND for an all-day event is EXCLUSIVE, i.e. the next day.
    var endDate = new Date(eventDate.getTime());
    endDate.setDate(endDate.getDate() + 1);
    var icsDateEnd = endDate.getFullYear() + pad(endDate.getMonth() + 1) + pad(endDate.getDate());
    var icsContent =
      'BEGIN:VCALENDAR\r\n' +
      'VERSION:2.0\r\n' +
      'PRODID:-//NirmanSimranWedding//EN\r\n' +
      'CALSCALE:GREGORIAN\r\n' +
      'METHOD:PUBLISH\r\n' +
      'BEGIN:VEVENT\r\n' +
      'UID:' + icsDate + '-nirman-simran@wedding\r\n' +
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z\r\n' +
      'SUMMARY:' + p1 + ' & ' + p2 + ' - Wedding Reception\r\n' +
      'DTSTART;VALUE=DATE:' + icsDate + '\r\n' +
      'DTEND;VALUE=DATE:' + icsDateEnd + '\r\n' +
      'DESCRIPTION:Wedding Reception for ' + p1 + ' & ' + p2 + ' on ' + date + ' at ' + venueName + '\r\n' +
      // LOCATION stays Latin: calendar apps + GPS need the ASCII address.
      'LOCATION:' + venueName + (venueAddress ? ', ' + venueAddress : '') + '\r\n' +
      // GEO lets a calendar app drop a pin. Read straight from config rather
      // than via a variable that may not exist.
      (function () {
        var la = config.venue && config.venue.lat;
        var ln = config.venue && config.venue.lng;
        return (la && ln) ? 'GEO:' + la + ';' + ln + '\r\n' : '';
      })() +
      'STATUS:CONFIRMED\r\n' +
      // 1-day-before reminder. TRIGGER is a negative DURATION relative to
      // DTSTART, which is the form that survives all-day events across
      // Google Calendar, Apple Calendar and Outlook.
      'BEGIN:VALARM\r\n' +
      'ACTION:DISPLAY\r\n' +
      'DESCRIPTION:' + p1 + ' & ' + p2 + ' Wedding Reception tomorrow\r\n' +
      'TRIGGER:-P1D\r\n' +
      'END:VALARM\r\n' +
      'END:VEVENT\r\n' +
      'END:VCALENDAR';
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
  }

  function icsDownloadName() {
    return p1 + '_' + p2 + '_reception.ics';
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
    var phone2 = (config.qr && config.qr.vcardPhone2) || (config.footer && config.footer.phone2Href) || '';
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + name];
    if (phone) lines.push('TEL;TYPE=CELL:' + phone);
    if (phone2 && phone2 !== phone) lines.push('TEL;TYPE=CELL:' + phone2);
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
      '<h2>' + title + '</h2>' +
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
    if (n1) {
      n1.textContent = name1();
      // Great Vibes has no Gurmukhi glyphs, so Punjabi names fell back to an
      // arbitrary font on the card. Switch the face with the language.
      n1.style.fontFamily = isPa
        ? "'Noto Sans Gurmukhi', 'Cormorant Garamond', serif"
        : "'Playfair Display', 'Cormorant Garamond', serif";
      n1.style.fontWeight = '700';
    }
    var n2 = document.getElementById('pdf-name-2');
    if (n2) {
      n2.textContent = name2();
      if (n1) n2.style.fontFamily = n1.style.fontFamily;
      n2.style.fontWeight = '700';
    }
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
    if (ct) {
      var phone2 = (config.footer && config.footer.phone2) || '';
      ct.textContent = contactLabelText() + ' ' + footerPhone + (phone2 ? ' \u00B7 ' + phone2 : '');
    }
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
    /* The whole card is a link, not just its title. It carries the same .ics as
       the calendar section, so tapping the date the guest came to read is the
       same action as tapping "Add to calendar" lower down.
       The href is a data: URI carrying the correct text/calendar MIME type,
       which is what makes iOS and Android calendar apps open it rather than
       showing the raw file; `download` covers desktop browsers. */
    var icsData = buildIcsHref();
    el.innerHTML =
      '<a class="save-date" id="save-date-link" href="' + esc(icsData) + '" download="' + esc(icsDownloadName()) + '">' +
        '<div class="sd-title">' + esc(txOr('saveTheDateTitle', 'Save the Date')) + '</div>' +
        '<div class="sd-date">' + esc(full) + '</div>' +
        '<div class="sd-note">' + esc(txOr('saveTheDateNote', '')) + '</div>' +
        '<div class="sd-cta">' + esc(txOr('saveTheDateCta', 'Tap to add to your calendar')) + '</div>' +
      '</a>';
  }

// ---------- Floating flowers ----------
  /* The falling-rose engine that used to live here (tsParticles, vendored at
     js/tsparticles.slim.min.js) has been replaced by css/invite-motion.css +
     js/invite-motion.js: a dependency-free three-depth shower of mogra,
     roses and marigolds inside the SAME #sakura-falling overlay, driven by
     CSS keyframes rather than a JS rAF loop. It also drops the separate
     "Petals: on/off" pill, which is now the icon-only #flowers-btn.

     The overlay element, its id, its classes and the features.sakura config
     flag are all unchanged - only the code that used to fill it is gone.
     Nothing else in this file was touched by that swap. */

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
    /* First deliberate tap of a language button (English or ਪੰਜਾਬੀ alike).
       invite-motion.js listens for this and starts the music. It is
       dispatched synchronously from inside the click handler, which is
       what iOS Safari and mobile in-app browsers require for play().
       setLang() never touches the audio, so switching language later
       cannot restart or interrupt playback. */
    try { window.dispatchEvent(new CustomEvent('wedding-enter')); } catch (e) {}
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
    // Reveal styles only apply when JS is running: content is visible by
    // default so a JS failure can never leave the invite blank.
    document.documentElement.classList.add('js-reveal');
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
    renderPrintSection();
    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    initAnimations();
  }

  // ---------- Royal animation layer (GSAP, graceful fallback) ----------
  var royalAnimated = false;

  function revealTargets() {
    var ids = ['invite-blessing', 'invite-title', 'time', 'invite-actions',
      'invite-footer', 'lang-toggle', 'day-info', 'qr-section',
      'rsvp-section', 'venue-map-embed', 'print-section'];
    var out = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.offsetParent !== null) out.push(el);
    });
    var orn = document.querySelectorAll('.ornament');
    var art = document.querySelector('.ceremony-image img');
    if (art) out.push(art);
    return out.concat(Array.prototype.slice.call(orn));
  }  function playIntroCard() {
    // The gate card's entrance is a pure CSS animation now (see
    // .intro-gate .card in style.css) - no library, no JS timing, and it
    // cannot strand content at opacity 0 the way the GSAP path could.
  }

  /* ============================================================
     REVEAL LAYER - CSS transitions + IntersectionObserver
     ------------------------------------------------------------
     Replaces GSAP/ScrollTrigger (two render-blocking CDN scripts for a
     fade-up). Rules that keep this safe by construction:
       - content is visible by default; the hidden state only exists once
         JS adds .reveal-target to an element (html.js-reveal is set at boot)
       - no JS is ever REQUIRED for visibility: no-IO browsers get an
         instant .is-in on everything, and a timed failsafe force-reveals
         anything still hidden in the viewport
       - reduced motion gets instant visibility via CSS, not a JS branch
     ============================================================ */
  function playRoyalReveal() {
    if (royalAnimated) return;
    royalAnimated = true;
    var targets = revealTargets();
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    targets.forEach(function (el) { el.classList.add('reveal-target'); io.observe(el); });

    // Failsafe: if the observer never fires (odd WebViews, restored bfcache
    // sessions), anything already inside the viewport is shown anyway.
    setTimeout(function () {
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('revealed');
      });
    }, 2500);
  }

  function initAnimations() {
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
