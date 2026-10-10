/**
 * The one and only iCalendar generator.
 *
 * It used to live inside js/script.js, which meant the build could not
 * emit a real .ics file and the page had to hand iOS a
 * data:text/calendar URI. That works on desktop and Android but never on
 * iOS: data: URLs crash SFSafariViewController, and in-app browsers
 * (WhatsApp, Instagram, Facebook) can neither reach the Calendar app nor
 * download a file. So the event had to be served as a real HTTP resource
 * with Content-Type: text/calendar.
 *
 * Loading it three ways, deliberately:
 *   - as a browser <script>, exposing window.WeddingICS
 *   - as a CommonJS module for build.js and serve.js
 * Keeping ONE generator is the point: the previous duplication is what let
 * the .ics date parser drift out of sync with config.date in the first place.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WeddingICS = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function att(o, path, fallback) {
    var cur = o;
    var parts = String(path).split('.');
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return fallback;
      if (!(parts[i] in cur)) return fallback;
      cur = cur[parts[i]];
    }
    return (cur === null || cur === undefined) ? fallback : cur;
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Config dates are written day-first ("6 December 2026"), but accept
     month-first too so a hand edit cannot silently emit 2026-12-0 - which
     is exactly the bug this function previously had. */
  function parseEventDate(config) {
    var raw = String(att(config, 'countdownTarget', '') || '').trim();
    if (raw) {
      var t = new Date(raw);
      if (!isNaN(t.getTime())) return t;
    }
    var parts = String(att(config, 'date', '')).trim().split(/\s+/);
    if (parts.length >= 3) {
      var d, m, y;
      if (/^\d{1,2}$/.test(parts[0])) { d = parts[0]; m = parts[1]; y = parts[2]; }
      else { m = parts[0]; d = parts[1]; y = parts[2]; }
      var mi = MONTHS.indexOf(String(m).replace(/[^A-Za-z]/g, ''));
      if (mi >= 0 && /^\d+$/.test(String(y).replace(/[^0-9]/g, ''))) {
        return new Date(Number(y), mi, Number(String(d).replace(/[^0-9]/g, '')), 10, 0, 0);
      }
    }
    return new Date(2026, 11, 6, 10, 0, 0);
  }

  /* RFC 5545 escaping. Without this a comma in the venue splits the field. */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function buildIcs(config) {
    config = config || {};
    var p1 = att(config, 'couple.partner1', 'Partner 1');
    var p2 = att(config, 'couple.partner2', 'Partner 2');
    var conn = att(config, 'couple.connector', '&');
    var dateText = att(config, 'date', '');
    var timeText = att(config, 'time', '');
    var venueName = att(config, 'venue.name', '');
    var venueAddress = att(config, 'venue.address', '');
    var lat = att(config, 'venue.lat', '');
    var lng = att(config, 'venue.lng', '');

    var d = parseEventDate(config);

    /* ALL-DAY event (VALUE=DATE): no time, no TZID, so every guest's
       calendar shows the whole of the day regardless of their zone.
       DTEND for an all-day event is EXCLUSIVE, i.e. the next day. */
    var icsDate = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var end = new Date(d.getTime());
    end.setDate(end.getDate() + 1);
    var icsEnd = end.getFullYear() + pad(end.getMonth() + 1) + pad(end.getDate());

    /* Stamp must not change on every build or the file is re-downloaded
       for nothing; derive it from the event date instead. */
    var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T000000Z';

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NirmanSimranWedding//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + icsDate + '-nirman-simran@wedding',
      'DTSTAMP:' + stamp,
      'SUMMARY:' + esc(p1 + ' ' + conn + ' ' + p2 + ' - Wedding Reception'),
      'DTSTART;VALUE=DATE:' + icsDate,
      'DTEND;VALUE=DATE:' + icsEnd,
      'DESCRIPTION:' + esc('Wedding Reception for ' + p1 + ' ' + conn + ' ' + p2 +
        ' on ' + dateText + ' at ' + venueName + (timeText ? ', ' + timeText : '')),
      /* LOCATION stays Latin: calendar apps and GPS need the ASCII address. */
      'LOCATION:' + esc(venueName + (venueAddress ? ', ' + venueAddress : '')),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE'
    ];

    if (lat && lng) lines.push('GEO:' + lat + ';' + lng);

    /* One-day-before reminder. A negative DURATION relative to DTSTART is
       the form that survives all-day events across Google Calendar, Apple
       Calendar and Outlook. */
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + esc(p1 + ' ' + conn + ' ' + p2 + ' Wedding Reception tomorrow'),
      'TRIGGER:-P1D',
      'END:VALARM'
    );

    lines.push('END:VEVENT', 'END:VCALENDAR');
    /* RFC 5545 requires CRLF line endings; a bare \n is tolerated by most
       parsers but rejected by Apple's. */
    return lines.join('\r\n') + '\r\n';
  }

  /* Google Calendar renders its own confirmation page and then hands the
     phone to the native calendar. It is the only option that works inside
     an in-app browser, so it is the universal fallback. */
  function googleUrl(config) {
    config = config || {};
    var p1 = att(config, 'couple.partner1', 'Partner 1');
    var p2 = att(config, 'couple.partner2', 'Partner 2');
    var conn = att(config, 'couple.connector', '&');
    var d = parseEventDate(config);
    var end = new Date(d.getTime());
    end.setDate(end.getDate() + 1);
    /* LOCAL getters, and no time component: this is an all-day event. Using
       getUTC* here shifted the whole event a day whenever the machine sat
       more than 10 hours ahead of UTC (Dec 6 10:00 local became Dec 5 UTC). */
    var fmt = function (t) {
      return t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate());
    };
    var q = new URLSearchParams({
      action: 'TEMPLATE',
      text: p1 + ' ' + conn + ' ' + p2 + ' - Wedding Reception',
      dates: fmt(d) + '/' + fmt(end),
      details: 'Wedding Reception for ' + p1 + ' ' + conn + ' ' + p2 + ' on ' +
        att(config, 'date', '') + ' at ' + att(config, 'venue.name', ''),
      location: att(config, 'venue.name', '') + ', ' + att(config, 'venue.address', ''),
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  return { buildIcs: buildIcs, googleUrl: googleUrl, parseEventDate: parseEventDate };
});
