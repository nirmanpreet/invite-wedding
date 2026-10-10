
<p align="center"><img src="./assets/wedding.gif" width="150px" height="150px"/></p>
<h1 align="center">Nirman &amp; Simran :ring: <br> <br> Wedding Reception <br> 6 December 2026</h1>

<p align="center">
  ਲੱਖ ਖੁਸ਼ੀਆਂ ਪਾਤਸ਼ਾਹੀਆਂ, ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇ — With the blessings of Waheguru, we joyfully invite you to celebrate the Wedding Reception of Nirman &amp; Simran!
</p>

<p align="center">
  <strong>6 December 2026 • 10:00 AM onwards • Park City Resort, Malout, Fazilka Rd, Malout Rural, Punjab 152107, India</strong>
</p>

## Features

- Bilingual — English / ਪੰਜਾਬੀ language toggle (remembers your choice)
- Gentle background music, starting only after the guest picks a language (toggleable)
- Floating mogra, rose and marigold shower in three depth layers (toggleable)
- Live countdown to the big day
- RSVP via WhatsApp with **Yes / No** attending buttons
- **QR codes** — "Scan me for venue": one QR opens the venue map, one stores the contact vCard (phone + venue address); shown on the page, the PDF card, and print
- Venue map embed + Google Maps directions
- Add to calendar (.ics) download
- Downloadable PDF invitation card (generated in the browser)
- Print-friendly view
- Tap-to-call contact link
- SEO (JSON-LD Event schema) + PWA manifest (add to home screen)
- Mobile-first, fast — no jQuery, flowers respect reduced-motion (slower, never hidden)

## Run locally

```bash
node serve.js
# Open http://localhost:3000
```

## Build for hosting (GitHub Pages / Vercel / Netlify)

```bash
node build.js
# Deploy the self-contained dist/ folder
```

## Customize

Edit [data/config.json](data/config.json) — names, date, time, venue, RSVP deadline, WhatsApp number, colors, feature toggles, and all English/ਪੰਜਾਬੀ strings — then refresh the page.

## Structure

```
index.html            # main page (dev, served by serve.js)
data/config.json      # all invitation content & settings
js/script.js          # app logic (no dependencies)
js/invite-motion.js   # floating flowers + flowers/music toggles
js/qrcode.min.js      # vendored QR generator (MIT)
css/style.css         # Sikh-theme styling (maroon / gold / ivory)
css/invite-motion.css # flower animation + the two control buttons
assets/icon.svg       # PWA home-screen icon
music.mp3             # background music (non-sacred instrumental)
build.js              # builds dist/ for static hosting
serve.js              # tiny dev server with live config
serve-dist.js         # static server for the built dist/ (QA)
```

Save the date: **6 December 2026** — we look forward to celebrating with you. ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਿਹ!
