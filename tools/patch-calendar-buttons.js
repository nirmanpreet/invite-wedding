/**
 * Replace lines 780-802 of js/script.js (the calendar-button block inside
 * renderSaveTheDate) with a version where the platform's best option is
 * the prominent primary button.
 *
 * Line-range splice rather than string matching, because the block is
 * mostly single-quoted HTML fragments that are awkward to quote exactly.
 * The range is asserted before it is touched.
 */
'use strict';
const fs = require('fs');
const p = 'js/script.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');

const FROM = 780; // 1-based, inclusive
const TO = 802;   // 1-based, inclusive

// Assert we are about to replace what we think we are.
const head = lines[FROM - 1];
const tail = lines[TO - 1];
if (!head.includes('var google = (window.WeddingICS')) throw new Error('FROM mismatch: ' + head);
if (!tail.trim().startsWith("'</div>';")) throw new Error('TO mismatch: ' + tail);
if (!lines[TO].includes('}')) throw new Error('line after TO is not the function close: ' + lines[TO]);

const replacement = `    var google = (window.WeddingICS && window.WeddingICS.googleUrl)
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
        '<a class="sd-stretch" id="save-date-link" href="' + esc(ICS_FILE) + '" download="' + esc(icsDownloadName()) + '">' +
          esc(txOr('saveTheDateCta', 'Tap to add to your calendar')) + '</a>' +
        '<div class="sd-title">' + esc(txOr('saveTheDateTitle', 'Save the Date')) + '</div>' +
        '<div class="sd-date">' + esc(full) + '</div>' +
        '<div class="sd-note">' + esc(txOr('saveTheDateNote', '')) + '</div>' +
        '<div class="sd-cta">' + esc(txOr('saveTheDateCta', 'Tap to add to your calendar')) + '</div>' +
        '<div class="cal-actions">' +
          calBtn(primary, 'cal-btn cal-primary') +
          rest.map(function (o) { return calBtn(o, 'cal-btn'); }).join('') +
        '</div>' +
        '<div class="cal-hint">' + esc(txOr('calendarHint',
          ios ? 'Opens your calendar app straight away.'
               : 'Saves the event to your phone. On iPhone this opens Apple Calendar instead.')) + '</div>' +
      '</div>';`;

lines.splice(FROM - 1, TO - FROM + 1, replacement);
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('replaced lines ' + FROM + '-' + TO + ' with ' + replacement.split('\n').length + ' lines');
