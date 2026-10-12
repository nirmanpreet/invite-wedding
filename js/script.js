/**
 * Wedding Invite - Nirman & Simran (reception)
 * No jQuery. PDF libraries load on demand only.
 */
'use strict';
(function () {
  /* Motion is NOT reduced on this site, deliberately.
     `REDUCED` is kept as a named flag rather than deleted, because the two
     behaviours it gates (the gate doors and the RSVP petal burst) are worth
     being able to switch off in ONE place - see the "force-motion" markers
     in css/style.css for the CSS half of the same switch.

     Why it was turned off: on the devices this invitation is actually opened
     on - Android phones, and Windows laptops with "show animations" turned
     off, which is the default on a lot of machines - the browser reports
     prefers-reduced-motion: reduce. Honouring it made the whole invitation
     static: no doors, no shimmer, no glow, no burst. The owner saw a dead
     page and reported it as "no animation". */
  var REDUCED = false;
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
  /* The weekday shown on the Save-the-Date card.
     startISO is preferred because it is unambiguous: it carries +05:30.
     countdownTarget is "Dec 6, 2026 10:00:00", which JavaScript parses in
     the VIEWER's timezone, so on a phone set to Australia/Melbourne the
     guest was being told the weekday of their own 10am. */
  var eventDate = config.startISO
    ? new Date(config.startISO)
    : new Date(config.countdownTarget || 'Dec 6, 2026 10:00:00');
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
    renderPrintSection();    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    updateIntroGate();
    renderSaveTheDate();
    renderTimeLines();
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
      /* name-shimmer rides on the two NAME spans, never on the connector - the
         "&" is a flat gold mark and a sweep across it would read as a
         rendering fault. In Punjabi the same class lands on the Gurmukhi
         name, which is correct: both scripts get the same welcome. */
      titleEl.innerHTML =
        '<h1 class="title-names"><span class="name-a name-shimmer">' + esc(n1) + n1Sub + '</span>' +
        '<span class="amp-title">' + esc(conn()) + '</span>' +
        '<span class="name-b name-shimmer">' + esc(n2) + n2Sub + '</span></h1>' +
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
    /* Which platform are we on, for choosing a button label. Only three
       buckets, because only three things actually differ:
         ios      iPhone / iPad - webcal:// and Apple Maps both work
         android  any Android, Samsung Internet included
         other    desktop, in-app browsers, anything unrecognised

       Samsung is deliberately NOT its own bucket. Samsung Internet is a
       Chromium browser on Android, not a platform with its own calendar or
       maps app: it does not implement webcal://, it does not implement the
       intent:// scheme (Samsung's own public tracker request for it is
       still open), and its maps is still Google Maps. Splitting it out
       would mean a button that behaves identically to the Android one
       under a name that implies it does something different. */
  function platformKind() {
    var ua = navigator.userAgent || '';
    if (isIOS()) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'other';
  }

  /* Label the venue button for the map app that will actually open.
       The URL never changes: the https Google Maps directions link is
       registered as an Android App Link, so Android and Samsung hand it
       straight to Google Maps, and iOS opens Apple Maps. The one approach
       that would NOT work is a geo: URI - Chrome does not register a
       handler for it and silently renders an error page instead. */
  function venueBtnLabel() {
    var kind = platformKind();
    if (kind === 'android') return t('venueBtnAndroid') || t('venueBtn') || 'OPEN IN GOOGLE MAPS';
    if (kind === 'ios') return t('venueBtnIos') || t('venueBtn') || 'OPEN IN APPLE MAPS';
    return t('venueBtn') || 'SEE THE VENUE';
  }

  var actionsEl = document.getElementById('invite-actions');
    if (actionsEl) {
      actionsEl.innerHTML =
        '<a href="' + esc(mapUrl) + '" target="_blank" rel="noopener"><div class="venue">' + esc(venueBtnLabel()) + '</div></a>' +
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
  /* Time and Venue only. The Date row was removed on purpose: the date is
     already on screen three times by the time a guest reaches this card -
     in the title block, in the Save-the-Date card, and again in the print
     header - and repeating it a fourth time adds nothing.
     The <h2> heading went with it for the same reason: it read "Reception",
     which is the occasion, not a label for the two rows below it. */
  function renderDayInfo() {
    var el = document.getElementById('day-info');
    if (!el) return;
    if (features.dayInfo === false) { el.innerHTML = ''; return; }
    el.innerHTML =
      '<div class="day-grid">' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoTime', 'Time')) + '</div><div class="value">' + esc(timeText() || '-') + '</div></div>' +
      '<div class="day-item"><div class="label">' + esc(txWith('dayInfoVenue', 'Venue')) + '</div><div class="value">' + esc(venueNameText()) + (venueAddrText() ? '<br>' + esc(venueAddrText()) : '') + '</div></div>' +
      '</div>';
  }

  /* A short burst of petals from the button the guest just pressed.
     Web Animations API only - no library, and no fallback path that fakes
     it: on a browser without el.animate the span is simply removed again
     rather than left on screen as a stuck petal. The elements are created
     fixed-position at the button's centre and removed on finish, so they
     never take part in layout and never trigger a reflow of the page. */
  function petalBurst(originEl) {
    if (REDUCED || !originEl || !originEl.getBoundingClientRect) return;
    var r = originEl.getBoundingClientRect();
    if (!r.width) return;
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var colors = ['#a4243b', '#e8c877', '#fffdf7', '#c8a24b'];
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('span');
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:10px;height:14px;' +
        'border-radius:70% 0 70% 0;pointer-events:none;z-index:10000;background:' + colors[i % 4] + ';';
      document.body.appendChild(p);
      if (!p.animate) { if (p.parentNode) p.parentNode.removeChild(p); continue; }
      var a = Math.random() * Math.PI * 2;
      var d = 60 + Math.random() * 90;
      var dx = Math.cos(a) * d;
      var dy = Math.sin(a) * d - 40 + 120;
      var spin = Math.round(Math.random() * 540 - 270);
      var anim;
      try {
        anim = p.animate([
          { transform: 'translate(-50%,-50%) scale(0.6) rotate(0deg)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1) rotate(' + spin + 'deg)', opacity: 0 }
        ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });
      } catch (e) { if (p.parentNode) p.parentNode.removeChild(p); continue; }
      anim.onfinish = (function (el) {
        return function () { if (el.parentNode) el.parentNode.removeChild(el); };
      })(p);
    }
  }

  /* Replaces the whole form with a confirmation, and keeps a link to the
     same WhatsApp thread. The link is not decoration: window.open() is
     blocked outright by several in-app browsers (and by any pop-up blocker
     on desktop), and without it a guest whose RSVP "did nothing" has no way
     back to the chat they were meant to send. */
  function showRsvpThanks(host, link) {
    var box = document.createElement('div');
    box.className = 'rsvp-thanks';
    box.setAttribute('role', 'status');
    var h = document.createElement('div');
    h.className = 'rsvp-thanks-title';
    h.textContent = txOr('rsvpThanks', 'Thank you!');
    box.appendChild(h);
    if (link) {
      var a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = txOr('rsvpReopen', 'Open WhatsApp again');
      box.appendChild(a);
    }
    host.innerHTML = '';
    host.appendChild(box);
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
    /* Punjabi does NOT fall back to noteEn. config.rsvp.notePa is
       deliberately empty - see _notePaWhy in data/config.json - so the
       old `notePa || noteEn` would have printed the English sentence under
       the Punjabi form, which is exactly the line the guest should not see. */
    var noteTxt = isPa
      ? (rsvpForm.notePa || '')
      : (rsvpForm.noteEn || '');
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
        if (link) {
          // Use an options OBJECT, not the positional features string.
          // window.open(link, '_blank', 'noopener') treats 'noopener' as a
          // window-FEATURES string: the browser opens a window literally named
          // "noopener" with no opener, and in several mobile in-app browsers
          // (and headless Chrome) nothing is shown at all - so the guest's RSVP
          // silently went nowhere. The options object sets the opener policy
          // correctly and always opens the chat.
          window.open(link, '_blank', { noopener: true, noreferrer: true });
          petalBurst(sendBtn);
          showRsvpThanks(el, link);
        } else {
          rsvpError(txOr('rsvpErrorName', 'Please try again.'));
        }
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
  /* The .ics payload itself lives in js/ics.js, shared with build.js and
     serve.js so the built file, the dev server and the page can never
     disagree about the date.

     What changed here: the Save-the-Date card used to link a
     data:text/calendar URI. iOS does nothing useful with those - a data:
     URL crashes SFSafariViewController, and an in-app browser can neither
     open the Calendar app nor download a file - so "Add to calendar" was
     a dead tap on exactly the phones this invitation is shared on. It now
     points at a real served .ics file, and the Save-the-Date card offers the
     two fallbacks that cover the cases a plain download misses. */
  var ICS_FILE = './wedding.ics';

  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    /* iPadOS 13+ reports as desktop Macintosh, so the UA looks like a Mac.
       The only tell is that it is a touchscreen: navigator.platform is
       "MacIntel" and maxTouchPoints is 5 (a real trackpad Mac reports 0). */
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  }

  /* The calendar options used to live in their own #calendar-section card,
     which duplicated the Save-the-Date link directly above it. They now
     render inside that card instead - see renderSaveTheDate(). */

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
      /* Each QR is drawn to fill its box exactly, using ITS OWN module
         count. Previously both were drawn on a shared pitch derived from
         targetN, which meant the map QR (fewer modules than the vCard)
         came out visibly smaller than the contact QR beside it. Filling the
         box makes the two identical on the card, and a QR decoder handles
         a coarser module pitch without trouble. */
      var n = entry.qr.getModuleCount();
      var x0 = (br.left - cardRect.left) * scale;
      var y0 = (br.top - cardRect.top) * scale;
      var px = (br.width * scale) / n;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y0, br.width * scale, br.height * scale);
      ctx.fillStyle = '#4a1220';
      for (var r = 0; r < n; r++) {
        var runStart = -1;
        for (var c = 0; c <= n; c++) {
          var dark = c < n && entry.qr.isDark(r, c);
          if (dark && runStart < 0) runStart = c;
          if (!dark && runStart >= 0) {
            var w = (c - runStart) * px;
            ctx.fillRect(x0 + runStart * px, y0 + r * px, w, px);
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

  /* Put the card back the way it shipped.
     It must be explicitly set to 'none', NOT cleared to ''. build.js emits
     the card with an INLINE display:none, and the stylesheet's own .pdf-card
     rule says display:block - deliberately, so html2canvas can capture it.
     Clearing the inline value therefore falls back to display:block and the
     card stays laid out. It is positioned off-screen (position:absolute,
     left:-9999px) so it never disturbs the page flow and a guest would
     never see it - but it stays in the render tree with its faces resolved
     for the rest of the session, which is exactly what the inline
     display:none was there to avoid.

     Called from all THREE exits: success, capture failure, and the case
     where html2canvas/jsPDF never loaded from the CDN. */
  function hideCard(card) {
    if (card) card.style.display = 'none';
  }

  function onDownloadPdfClick() {
    var card = document.getElementById('pdf-card');
    if (!card) return;
    var btn = document.getElementById('download-pdf');
    if (btn) { btn.textContent = tx('pdfWorking', 'Preparing...'); btn.disabled = true; }
    /* The card ships display:none so its faces are not downloaded by the
       99% of guests who never press this button. html2canvas cannot
       rasterise a display:none subtree - it would produce a blank page -
       so it is laid out here, just before the capture. The two script tags
       below are fetched on demand and arrive after this anyway, so the
       fonts have time to load inside that window. */
    card.style.display = 'block';
    loadPdfLibs(function () {
      if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        hideCard(card);
        alert('PDF libraries could not be loaded. Please check your connection.');
        if (btn) {
          btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
          btn.disabled = false;
        }
        return;
      }
      /* scale 2 on a 560px card rasterised 1120px of mostly-flat parchment
         and embedded it as PNG, which is why every download was 8.78 MB.
         scale 1.5 is still comfortably above print resolution for a
         560px card, and JPEG at 0.92 is the right format for this: it is a
         photographic-style image with no transparency. Typical output is
         now ~300 KB. */
      /* The card's faces (Great Vibes above all) are only requested now
         that it is visible. Waiting for them here is the difference
         between a card with script names on it and one where the names
         have silently fallen back to a serif. */
      function capture() {
      html2canvas(card, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#faf6ec' })
        .then(function (canvas) {
          // html2canvas cannot draw the QR modules, so paint them on here.
          paintQrCodesOnto(canvas, card);
          var imgData = canvas.toDataURL('image/jpeg', 0.92);
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
          /* Fit the card onto the page WITHOUT distorting it.
             The old code did:
               pw = pageWidth;                       // always 210
               ph = min(cardH * pw / cardW, 297);   // clamped to the page
             When the card is taller than A4 - which it is, at 840x1674
             against a 210x297 page - the clamp cut the HEIGHT but left
             the width at a full 210mm. The card was then drawn 210x297,
             squashing every pixel vertically by 29%: the Gurmukhi came
             out wide and flat, the Anand Karaj lost its proportions, and
             the QR codes were stretched (they still decoded, but only by
             luck and the decoder's tolerance).
             Scaling both dimensions by ONE factor keeps the card's real
             proportions; centring it in both axes leaves a slim margin
             down each side, which is how a mounted card is meant to print. */
          var pageW = pdf.internal.pageSize.getWidth();
          var pageH = pdf.internal.pageSize.getHeight();
          var fit = Math.min(pageW / canvas.width, pageH / canvas.height);
          var pw = canvas.width * fit;
          var ph = canvas.height * fit;
          var offX = (pageW - pw) / 2;
          var offY = (pageH - ph) / 2;
          pdf.addImage(imgData, 'JPEG', offX, offY, pw, ph, undefined, 'FAST');
          pdf.save('Invitation - ' + p1 + ' ' + connector + ' ' + p2 + '.pdf');
          hideCard(card);
          if (btn) {
            btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
            btn.disabled = false;
          }
        })
        .catch(function () {
          hideCard(card);
          alert('Could not generate the PDF. Please try again.');
          if (btn) {
            btn.textContent = t('downloadBtn') || 'DOWNLOAD INVITATION CARD';
            btn.disabled = false;
          }
        });
      }

      /* document.fonts.ready is the only way to know Great Vibes has
         actually arrived before html2canvas walks the DOM. Without the
         wait the card renders with the names in a fallback serif and
         nothing looks wrong - it just is not the invitation. */
      if (window.document && document.fonts && document.fonts.ready &&
          typeof document.fonts.load === 'function') {
        try {
          document.fonts.load('400 44px "Great Vibes"', p1 + p2)
            .then(function () { return document.fonts.ready; })
            .then(capture, capture);
          return;
        } catch (e) { /* fall through to the plain capture */ }
      }
      capture();
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
    /* One card carries everything calendar-related. There used to be a
       separate "Add to your calendar" section as well, which duplicated the
       Save-the-Date link and read as a bug - two competing calendar
       things stacked under each other.

       One button, not three links. Three equal pills plus two lines of
       explanation asked the guest to work out which one applies to their
       phone before they had read anything else on the page, and the whole
       card was also a stretched download link on top of them, so there were
       four competing affordances on one card. The options are all still
       here and all still work - they are simply folded away behind a single
       button until asked for.

       A real served file, not a data: URI - iOS cannot use data: URLs. */
    var google = (window.WeddingICS && window.WeddingICS.googleUrl)
      ? window.WeddingICS.googleUrl(config) : '';
    var ios = isIOS();
    var webcal = ios
      ? location.href.replace(/^https?:/, 'webcal:').replace(/[^/]*$/, '') + 'wedding.ics'
      : '';

    /* Per-platform, because no single link works everywhere:
         iOS      webcal:// is handed to the OS, which has a system-wide
                  handler and opens Apple Calendar directly - the only
                  reliable "open the calendar app" path anywhere. Note it
                  means SUBSCRIBE: the app adds the event and keeps
                  re-fetching the URL.
         Android  no dependable deep link exists. The Google Calendar app
                  for Android does not implement webcal:// at all, and
                  Chrome's intent:// is handled inconsistently by Samsung
                  Internet and blocked outright by in-app browsers. The
                  .ics file is the honest path there.
         Anywhere the Google link is the only option that works INSIDE a
                  WhatsApp/Instagram in-app browser, which is where most
                  guests will actually open this.

       The platform's best option goes first and is marked primary, so a
       guest on an iPhone taps one obvious button and lands in Calendar
       rather than reading three equal pills and guessing. */
    var calDl = ' download="' + esc(icsDownloadName()) + '"';
    var primary = ios
      ? { href: webcal, label: txOr('calendarApple', 'Open Apple Calendar') }
      : { href: ICS_FILE, dl: calDl, label: txOr('calendarFile', 'Download .ics') };
    var rest = [];
    if (ios) rest.push({ href: ICS_FILE, dl: calDl, label: txOr('calendarFile', 'Download .ics') });
    if (google) rest.push({ href: google, target: ' target="_blank" rel="noopener"', label: txOr('calendarGoogle', 'Google Calendar') });

    var calBtn = function (o, cls) {
      return '<a class="' + cls + '" href="' + esc(o.href) + '"' + (o.dl || '') + (o.target || '') + '>' + esc(o.label) + '</a>';
    };

    el.innerHTML =
      '<div class="save-date">' +
        '<div class="sd-title">' + esc(txOr('saveTheDateTitle', 'Save the Date')) + '</div>' +
        '<div class="sd-date">' + esc(full) + '</div>' +
        '<div class="sd-note">' + esc(txOr('saveTheDateNote', '')) + '</div>' +
        '<button type="button" class="sd-cta cal-toggle" id="cal-toggle" aria-expanded="false" aria-controls="cal-panel">' +
          esc(txOr('calendarLabel', 'Add to calendar')) +
        '</button>' +
        '<div class="cal-panel" id="cal-panel" hidden>' +
          '<div class="cal-actions">' +
            calBtn(primary, 'cal-btn cal-primary') +
            rest.map(function (o) { return calBtn(o, 'cal-btn'); }).join('') +
          '</div>' +
          '<div class="cal-hint">' + esc(txOr('calendarHint',
            ios ? 'Opens your calendar app straight away.'
                 : 'Saves the event to your phone. On iPhone this opens Apple Calendar instead.')) + '</div>' +
        '</div>' +
      '</div>';

    wireCalendarPanel(document.getElementById('cal-toggle'), document.getElementById('cal-panel'));
  }

  /* aria-expanded is what tells a screen reader whether the options are
     there; the .open class is what animates them in. Both are set on every
     toggle so the two can never disagree. */
  function wireCalendarPanel(btn, panel) {
    if (!btn || !panel) return;
    panel.hidden = true;
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var willOpen = panel.hidden;
      panel.hidden = !willOpen;
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) panel.classList.add('open'); else panel.classList.remove('open');
    });
  }

  /* ---------------------------------------------
     "N days to go" + "In your time".
     ---------------------------------------------
     Both are driven off config.startISO, which carries an explicit +05:30.
     The old eventDate is new Date('Dec 6, 2026 10:00:00'), which JavaScript
     parses in the VIEWER's own timezone - so a guest in Melbourne was being
     counted down against their local 10am rather than India's, which can
     even land them on the wrong weekday.

     Both lines live INSIDE the Save-the-Date card rather than loose in the
     page flow: they are about the same event, and as bare siblings between
     the card and "RECEPTION" they read as orphaned debris. */
  function renderTimeLines() {
    var host = document.getElementById('time');
    if (!host || !config.startISO) return;

    // Rebuilded wholesale on every render (first paint and every language
    // switch). Replaced rather than mutated, so the pair can never end up
    // duplicated or in the wrong order.
    var oldD = document.getElementById('days-to-go');
    var oldT = document.getElementById('tz-note');
    if (oldD && oldD.parentNode) oldD.parentNode.removeChild(oldD);
    if (oldT && oldT.parentNode) oldT.parentNode.removeChild(oldT);

    var start = new Date(config.startISO);
    if (isNaN(start.getTime())) return;

    /* --- days to go. Deliberately NOT a ticking timer: a number that does
       not change every second costs nothing and cannot distract.

       Counted in whole CALENDAR DAYS IN INDIA, not in elapsed 24-hour
       chunks. The brief specified Math.ceil(diff / 86400000), and that is
       wrong at the edges: at 3am on the morning of the reception it returns
       1 and the card says "Tomorrow" to a guest who is reading it seven
       hours before they leave the house. What a guest means by "tomorrow"
       is a calendar day, and the day that matters is the wedding's, so the
       difference is taken between the two India dates.

       India is a fixed +05:30 with no daylight saving, so shifting by that
       constant is exact and needs no timezone database. */
    var IST_OFFSET_MS = 330 * 60000;
    var startDay = Math.floor((start.getTime() + IST_OFFSET_MS) / 86400000);
    var nowDay = Math.floor((Date.now() + IST_OFFSET_MS) / 86400000);
    var n = startDay - nowDay;
    if (n >= 0) {
      var label;
      if (n === 0) label = txOr('daysZero', 'Today');
      else if (n === 1) label = txOr('daysOne', 'Tomorrow');
      else label = String(txOr('daysToGo', '{n} days to go').replace('{n}', String(n)));
      var daysEl = document.createElement('div');
      daysEl.id = 'days-to-go';
      daysEl.className = 'days-to-go';
      daysEl.textContent = label;
      host.appendChild(daysEl);
    }

    // --- timezone line
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    var inIndia = (tz === '' || tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta');
    var text = txOr('tzIst', 'IST (India time)');
    /* Only a guest genuinely outside India gets the second half. Someone in
       Punjab does not need the time twice, and if the device reports a zone
       we do not recognise we still always print the India time, because
       that is the one that is certain. */
    if (!inIndia && window.Intl && Intl.DateTimeFormat) {
      try {
        /* en-GB, deliberately NOT pa-IN. The Punjabi branch used to pass
           isPa() ? 'pa-IN' : undefined here, and Chrome's ICU returns
           "M12 6, Sun 3:30 PM" for pa-IN - a month called "M12", and the
           weekday out of order. Node's ICU returns "ਐਤ, 6 ਦਸੰ, 3:30 PM"
           for the same locale, so it renders correctly in one runtime and
           as garbage in the one that actually runs this page.
           This line is a machine-formatted timestamp, not prose, so it does
           not want a localised face anyway - and the rest of the Punjabi
           page already uses Latin digits ("6 ਦਸੰਬਰ 2026", "10:00 ਵਜੇ"),
           so en-GB is consistent as well as safe. It yields the same
           "Sun 6 Dec, 3:30 pm" in both languages, which is what a guest
           converting a time wants to see. */
        var f = new Intl.DateTimeFormat('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: 'numeric', minute: '2-digit', hour12: true
        });
        text += ' \u00B7 ' + txOr('tzYours', 'In your time') + ': ' + f.format(start);
      } catch (e) {}
    }
    var tzEl = document.createElement('div');
    tzEl.id = 'tz-note';
    tzEl.className = 'tz-note';
    tzEl.textContent = text;
    host.appendChild(tzEl);
  }

// ---------- Floating flowers ----------
  /* The falling-rose engine that used to live here (tsParticles, since
     deleted) has been replaced by css/invite-motion.css +
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
  /* Two panels that slide apart, rather than the whole screen fading out.
     The panels are created once, here, and are pure decoration
     (aria-hidden, pointer-events off while closed only by being behind the
     card). They are inserted BEFORE .card so the card sits on top. */
  function buildGateDoors() {
    var gate = document.getElementById('intro-gate');
    if (!gate || gate.getElementsByClassName('gate-door').length) return;
    var ref = null;
    var sides = ['l', 'r'];
    for (var i = 0; i < sides.length; i++) {
      var d = document.createElement('div');
      d.className = 'gate-door ' + sides[i];
      d.setAttribute('aria-hidden', 'true');
      /* Left first, then right inserted AFTER it. Both panels carry the
         same z-index, so DOM order decides which paints on top; inserting
         each before firstChild instead would leave 'r' first for no
         reason. */
      if (ref) gate.insertBefore(d, ref.nextSibling); else gate.insertBefore(d, gate.firstChild);
      ref = d;
    }
  }

  /* done() runs exactly once, whichever arrives first: the last panel's
     transitionend, or the safety net. The net matters more than it looks -
     a WebView that skips transitions, or one where the tab was backgrounded
     mid-open, would otherwise leave a guest staring at a gate whose panels
     have slid away but which still swallows every tap on the invitation. */
  /* Single source of truth, shared with the CSS "force-motion" markers.
     It does NOT re-read prefers-reduced-motion: the site animates for
     everyone, so the OS setting must not be able to switch the doors back
     off half way through. It used to, which meant the panels got
     transition:none, transitionend never fired, and the safety net left a
     faded-out gate over a dead page for 1.3 seconds. */
  function motionReduced() {
    return REDUCED;
  }

  function openGate(gate, done) {
    if (motionReduced()) { done(); return; }
    var finished = false;
    function fin() {
      if (finished) return;
      finished = true;
      done();
    }
    gate.classList.add('opening');
    gate.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'transform' && e.target.classList &&
          e.target.classList.contains('gate-door')) fin();
    });
    setTimeout(fin, 1300);
  }

  function enterSite(gate, pick, btn) {
    pick.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); x.classList.remove('pre'); });
    if (btn) btn.classList.add('active');
    var lang = btn ? btn.getAttribute('data-lang') : null;
    if (lang && i18n[lang]) setLang(lang);
    /* Everything above is synchronous and INSIDE the guest's tap, on
       purpose: setLang() and the wedding-enter dispatch both have to happen
       before the browser's user-gesture window closes, or iOS Safari refuses
       to start the music. The door animation below runs afterwards and
       touches neither. */
    try { window.dispatchEvent(new CustomEvent('wedding-enter')); } catch (e) {}
    // Auto-enter straight after picking a language
    try { sessionStorage.setItem('wedding-intro-seen', '1'); } catch (e) {}
    /* Immediate, not deferred to the end of the animation: the controls and
       the scroll-reveal both key off this, and the page behind the panels is
       meant to be revealed AS they part. */
    document.body.classList.add('intro-done');
    openGate(gate, function () {
      gate.classList.add('hide');
      gate.style.display = 'none';
    });
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
    prefillGateLanguage();
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
      /* No autofocus on load. The gate buttons are the first focusable
         elements in the document, so Tab still lands on them first for a
         keyboard user - but calling .focus() here made Chrome match
         :focus-visible on load, which drew a ring round ENGLISH and made
         one language look chosen again. That is the exact signal this whole
         change exists to remove. */
    }
  }

  function updateIntroGate() {
    var subEl = document.getElementById('intro-sub');
    if (subEl) subEl.textContent = txOr('introSub', 'Wedding Reception Invitation');
    var hintEl = document.getElementById('gate-hint');
    if (hintEl) renderGateHint(hintEl);
    // The occasion line is static in the HTML, so it never got localised.
    var medEl = document.getElementById('dance-med');
    if (medEl) medEl.textContent = tx('receptionHeading', 'Reception');
  }

  /* The gate hint is deliberately BILINGUAL - a guest who cannot read the
     instruction in one language still has to be able to find their own, and
     they should not have to work that out before tapping anything.
     It is stored in config as one string ("English · Gurmukhi") and split
     here on the middle dot into two runs, because the two halves need
     OPPOSITE typography: the Latin half is tracked and upper-cased, and the
     Gurmukhi half must be neither (letter-spacing severs the conjunct,
     W3C Gurmukhi Layout Requirements 5.1 / 6). One run of mixed text
     cannot be styled both ways. */
  function renderGateHint(el) {
    var raw = txOr('gateHintBoth', 'Tap your language to enter · ਭਾਸ਼ਾ ਚੁਣੋ');
    var parts = String(raw).split(/\s*·\s*/);
    if (parts.length < 2) {
      el.textContent = raw;
      return;
    }
    el.innerHTML = '';
    var latin = document.createElement('span');
    latin.className = 'hint-latin';
    latin.textContent = parts[0];
    var mid = document.createElement('span');
    mid.className = 'hint-mid';
    /* No spaces around the dot: flex layout trims leading and trailing
       whitespace out of a flex item, so " · " arrives as "·" and closes up
       against the Punjabi. The breathing room is margin - see .hint-mid. */
    mid.textContent = '·';
    mid.setAttribute('aria-hidden', 'true');
    var pa = document.createElement('span');
    pa.className = 'hint-pa';
    pa.textContent = parts.slice(1).join(' · ');
    el.appendChild(latin);
    el.appendChild(mid);
    el.appendChild(pa);
  }

  /* Runs once, before the gate is shown. Which language is pre-filled is a
     suggestion, never a choice: nothing is pre-selected on a phone whose
     language we do not recognise, so English is no longer highlighted by
     default. A guest on a Punjabi phone still has to tap.
     navigator.languages can be missing or throw in some in-app browsers, so
     every read is guarded. */
  function prefillGateLanguage() {
    var pick = document.getElementById('intro-lang-pick');
    if (!pick) return;
    var langs = '';
    try {
      langs = (navigator.languages && navigator.languages.length)
        ? navigator.languages.join(',') : (navigator.language || '');
    } catch (e) { langs = ''; }
    if (!langs) return;
    /* Matches "pa", "pa-IN", "pa_Cyrl" and a preference list, but not
       "pap" or "spa". */
    var wantsPa = /(^|,)\s*pa([-_][A-Za-z0-9]+)?\s*(,|$)/i.test(langs);
    if (!wantsPa) return;
    var btns = pick.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (String(btns[i].getAttribute('data-lang') || '').toLowerCase() === 'pa') {
        btns[i].classList.add('pre');
      }
    }
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
    buildGateDoors();
    updateIntroGate();   // gate copy must match the deep-linked language on load
    renderInvite();
    renderSaveTheDate();
    renderTimeLines();
    renderDayInfo();
    renderRsvp();
    renderVenueMapEmbed();
    renderPrintSection();    renderQrSection();
    updatePdfLang();
    renderLangToggle();
    initAnimations();
    /* Tell the motion layer what language we ended up in. invite-motion.js
       paints its two buttons at parse time, which is BEFORE this point, and
       it picks their labels from <html lang> - so on a guest arriving via
       #lang=pa, or returning with Punjabi already remembered, the buttons
       were labelled in English until they touched the language toggle.
       setLang() dispatches this same event on every real switch. */
    try { window.dispatchEvent(new CustomEvent('wedding-langchange')); } catch (e) {}
  }

  // ---------- Royal animation layer (GSAP, graceful fallback) ----------
  var royalAnimated = false;

  /* Container ids only, never their rendered children. The renderers
     replace innerHTML on every language switch, so observing a child would
     mean observing a node that no longer exists; observing the stable
     container means a switch cannot replay or break the effect. */
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

    targets.forEach(function (el, i) {
      /* Stagger index, capped at 3: anything longer just makes a guest who
         scrolls fast wait for content that is already on screen. */
      el.classList.add('reveal-target');
      try { el.style.setProperty('--i', String(i % 3)); } catch (e) {}
      io.observe(el);
    });

    // Failsafe: if the observer never fires (odd WebViews, restored bfcache
    // sessions), anything already inside the viewport is shown anyway.
    setTimeout(function () {
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('revealed');
      });
    }, 2500);
  }

  /* Deep language links: https://invite.nirmanpreet.com/#lang=pa (and #lang=en)
     go straight past the gate.
     resolveLang() has already applied the language to the whole page behind
     the gate, so all that is left is to run enterSite() for it. That is
     done with a real .click() on the button rather than by calling
     enterSite() directly, so exactly one code path can dismiss the gate -
     the same one a tap takes, including the synchronous dispatch of
     wedding-enter.

     A programmatic click is NOT a user gesture, so the browser will refuse
     to start the music. That is expected and handled: invite-motion.js
     catches the rejection and flips the button to its "off" icon so the
     guest is not shown a speaker that is lying. A tap on it starts the
     music normally. */
  function autoEnterFromHash() {
    var m = (window.location.hash || '').match(/#lang=([a-z]{2})/i);
    if (!m) return;
    var lang = m[1].toLowerCase();
    if (!i18n[lang]) return;
    var pick = document.getElementById('intro-lang-pick');
    if (!pick) return;
    var btn = pick.querySelector('button[data-lang="' + lang + '"]');
    if (btn) btn.click();
  }

  function initAnimations() {
    var gate = document.getElementById('intro-gate');
    var already = document.body.classList.contains('intro-done');
    if (already || !gate || gate.classList.contains('hide')) {
      setTimeout(playRoyalReveal, 120);
    } else {
      // A #lang= link is a deliberate "take me straight there" - do not
      // make that guest also dismiss a language screen they already
      // answered in the URL.
      try { autoEnterFromHash(); } catch (e) {}
      if (document.body.classList.contains('intro-done')) {
        setTimeout(playRoyalReveal, 260);
        return;
      }
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
