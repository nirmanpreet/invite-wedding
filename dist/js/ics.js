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

  /* RFC 5545 section 3.1: a content line longer than 75 octets SHOULD be
     split with CRLF followed by a single space, and the leading space is
     not part of the value.

     DESCRIPTION and LOCATION both exceed 75 here - the address alone is 86
     octets, and the description grew when the IST label went in. Every
     major client tolerates an unfolded long line, so this was never visibly
     broken; but "tolerates" is not "conforms", and a strict parser is
     entitled to truncate. Unfolding is mandatory for any conforming parser,
     so folding is the safe direction to err.

     Counting is in OCTETS, not characters, and the split must not land in
     the middle of a multi-byte sequence - the Punjabi address and any
     Gurmukhi in a description would otherwise be corrupted, so the buffer
     is built out of whole code points. */
  var FOLD_AT = 75;
  function fold(line) {
    if (line.length <= FOLD_AT && octets(line) <= FOLD_AT) return line;
    var out = [];
    var cur = '';
    var curBytes = 0;
    var limit = FOLD_AT;
    /* Split by code point, not UTF-16 unit: Array.from yields whole
       characters, so a surrogate pair is never torn apart. */
    var chars = Array.from(line);
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var cb = octets(c);
      if (curBytes + cb > limit) {
        out.push(cur);
        cur = '';
        curBytes = 0;
        /* Every continuation line spends one octet on the leading space. */
        limit = FOLD_AT - 1;
      }
      cur += c;
      curBytes += cb;
    }
    if (cur) out.push(cur);
    return out.join('\r\n ');
  }

  function octets(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    /* Fallback for an old runtime without TextEncoder. encodeURIComponent
       throws on a lone surrogate, which cannot occur here because fold()
       splits on whole code points. */
    return unescape(encodeURIComponent(s)).length;
  }

  /* A timed event, emitted in UTC.
     An all-day event (VALUE=DATE) is the safer kind of thing in general - it
     cannot be shown at the wrong hour - but it is wrong here: the reception
     starts at 10:00 and a guest who saves it as all-day sees no time at
     all, so it looks like a day they might have other plans for.

     UTC (a trailing Z) rather than a TZID block, because a TZID needs the
     receiving calendar to know about Asia/Kolkata and to have a definition
     for it. A Z timestamp is unambiguous everywhere, including in the
     in-app browsers most guests will actually open this from.

       "2026-12-06T10:00:00+05:30"  ->  "20261206T043000Z" */
  function toIcsUtc(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /* Exact start and end in India time, straight from config.
     Returns null when either is missing or unparseable, so the caller can
     fall back rather than emit a DTSTART: with nothing after it. */
  function timedRange(config) {
    var s = String(att(config, 'startISO', '') || '');
    var e = String(att(config, 'endISO', '') || '');
    if (!s || !e) return null;
    var start = new Date(s);
    var end = new Date(e);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end.getTime() <= start.getTime()) return null;
    return { start: toIcsUtc(s), end: toIcsUtc(e) };
  }

  /* Config dates are written day-first ("6 December 2026"), but accept
     month-first too so a hand edit cannot silently emit 2026-12-0 - which
     is exactly the bug this function previously had.
     Now only a FALLBACK: startISO carries an explicit +05:30 and is used
     whenever it is present, because this parses in the machine's own
     timezone and the build machine is not necessarily in India. */
  function parseEventDate(config) {
    var iso = String(att(config, 'startISO', '') || '');
    if (iso) {
      var t0 = new Date(iso);
      if (!isNaN(t0.getTime())) return t0;
    }
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

  /* The start time as prose, always carrying "IST".

     config.time already ends in "IST", but this guarantees it. The event
     time a guest reads in their calendar app is rendered in THEIR zone, so
     a guest in Melbourne opening this event sees 3:30 pm and, with nothing
     else on screen saying "India", has no way to know the reception starts
     at 10. That is the whole reason the label goes into both the .ics
     DESCRIPTION and the Google Calendar details: the instants are correct
     either way, but a bare timestamp is not self-describing.

     A config hand-edit that drops "IST" - which is exactly what the live
     site had, for its entire life - can therefore no longer produce an
     unlabelled event. */
  function timeLine(config) {
    var t = String(att(config, 'time', '') || '').trim();
    if (!t) return '';
    if (!/(^|[^A-Za-z])IST([^A-Za-z]|$)/.test(t)) t += ' IST';
    return t;
  }

  function buildIcs(config) {
    config = config || {};
    var p1 = att(config, 'couple.partner1', 'Partner 1');
    var p2 = att(config, 'couple.partner2', 'Partner 2');
    var conn = att(config, 'couple.connector', '&');
    var dateText = att(config, 'date', '');
    var venueName = att(config, 'venue.name', '');
    var venueAddress = att(config, 'venue.address', '');
    var timeLineText = timeLine(config);
    var lat = att(config, 'venue.lat', '');
    var lng = att(config, 'venue.lng', '');

    var d = parseEventDate(config);

    /* Exact start and end in UTC, driven by config.startISO / endISO.
       Both are required: a VEVENT with no DTEND, or with one that is not
       after DTSTART, is rejected outright by several calendars, so if
       either is missing the all-day form below is used instead of emitting
       something broken. */
    var timed = timedRange(config);

    /* All-day form (VALUE=DATE), kept as the fallback. No time, no TZID, so
       every guest's calendar shows the whole of the day regardless of zone.
       DTEND for an all-day event is EXCLUSIVE, i.e. the next day. */
    var icsDate = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var nextDay = new Date(d.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    var icsEnd = nextDay.getFullYear() + pad(nextDay.getMonth() + 1) + pad(nextDay.getDate());

    /* DTSTAMP is the moment the file was produced, per RFC 5545 - NOT the
       day of the event. */
    var stamp = toIcsUtc(new Date().toISOString());

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
      timed
        ? 'DTSTART:' + timed.start
        : 'DTSTART;VALUE=DATE:' + icsDate,
      timed
        ? 'DTEND:' + timed.end
        : 'DTEND;VALUE=DATE:' + icsEnd,
      'DESCRIPTION:' + esc('Wedding Reception for ' + p1 + ' ' + conn + ' ' + p2 +
        ' on ' + dateText + (timeLineText ? ' at ' + timeLineText : '') +
        ', ' + venueName),
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
    return lines.map(fold).join('\r\n') + '\r\n';
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

    /* The same instants the .ics carries, so the two can never disagree:
       a guest who picks Google Calendar and a guest who download the file
       must end up with the same start and the same end. */
    var timed = timedRange(config);
    var dates;
    if (timed) {
      dates = timed.start + '/' + timed.end;
    } else {
      var nextDay = new Date(d.getTime());
      nextDay.setDate(nextDay.getDate() + 1);
      /* LOCAL getters, and no time component: this is the all-day fallback.
         Using getUTC* here shifted the whole event a day whenever the
         machine sat more than 10 hours ahead of UTC. */
      var fmt = function (t) {
        return t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate());
      };
      dates = fmt(d) + '/' + fmt(nextDay);
    }

    var q = new URLSearchParams({
      action: 'TEMPLATE',
      text: p1 + ' ' + conn + ' ' + p2 + ' - Wedding Reception',
      dates: dates,
      /* The time is IN the details, not only in `dates`. `dates` is a UTC
         instant pair that Google renders in the guest's own zone, so a guest
         in Melbourne opens this and sees "3:30 pm" with no idea it means
         10:00 in Punjab. The same self-describing rule as the .ics. */
      details: 'Wedding Reception for ' + p1 + ' ' + conn + ' ' + p2 + ' on ' +
        att(config, 'date', '') + (timeLine(config) ? ' at ' + timeLine(config) : '') +
        '.\n\nIndia Standard Time (IST, UTC+5:30). The times above are shown in your own timezone.',
      location: att(config, 'venue.name', '') + ', ' + att(config, 'venue.address', ''),
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  return {
    buildIcs: buildIcs,
    googleUrl: googleUrl,
    parseEventDate: parseEventDate,
    toIcsUtc: toIcsUtc
  };
});
