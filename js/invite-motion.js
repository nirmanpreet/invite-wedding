/* invite-motion.js - petals (depth + mogra), scroll reveal, action bar. No dependencies. ES5-safe.
   -------------------------------------------------------------------------------------------
   Phase 3 notes (differences from the supplied kit, all deliberate):
   1. The old tsParticles system honoured config.features.sakura (default OFF, opt-in
      button). Petals now always show - Hard Rule 6 - but the config toggle is still
      respected, so a host who sets features.sakura:false keeps their switch. With the
      current config (true) petals are on for everyone, in every motion mode.
   2. The scroll reveal never touches anything inside #intro-gate: the gate is a
      separate, static layer (Phase 0 decision) and must not pick up the card shine.
   3. The dock block is a no-op until Phase 4 adds <nav class="dock" id="dock">.
   ------------------------------------------------------------------------------------------- */
(function () {
  var d = document, h = d.documentElement;
  h.classList.add('js');                                   // CSS only hides .reveal items if this script runs
  var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---- A. Petals: mogra flowers on 3 depth layers ---- */
  var cfg = (typeof window !== 'undefined' && window.__WEDDING_CONFIG__) ? window.__WEDDING_CONFIG__ : {};
  var petalsDisabled = !!(cfg.features && cfg.features.sakura === false);

  function inGate(el) {
    var p = el && el.parentNode;
    while (p && p !== d.body) {
      if (p.id === 'intro-gate') return true;
      p = p.parentNode;
    }
    return false;
  }

  var box = d.getElementById('petals');
  function ring(n, off, rx, ry, attr) {
    var o = '', k; for (k = 0; k < n; k++) o += '<ellipse cx="24" cy="' + (24 - off) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + (k * 360 / n) + ' 24 24)" ' + attr + '/>';
    return o;
  }
  function flower(fill, stroke, centre) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + ring(5, 10, 8, 13, 'fill="' + fill + '" stroke="' + stroke + '" stroke-width=".8"') + '<circle cx="24" cy="24" r="3.5" fill="' + centre + '"/></svg>';
  }
  var KINDS = [flower('#fffdf6', '#e6c9d2', '#f2cf5b'), flower('#fff3f6', '#f0b7c8', '#f2cf5b'), flower('#ffffff', '#ead9c0', '#e8b84a')];
  var LAYERS = [   // name, share of petals, size px [phone], fall seconds, sway px
    { n: 'far',  share: .40, s: [12, 20], d: [24, 34], sw: [10, 26] },
    { n: 'mid',  share: .35, s: [20, 30], d: [16, 24], sw: [16, 40] },
    { n: 'near', share: .25, s: [32, 46], d: [11, 16], sw: [24, 60] }
  ];
  function R(a, b) { return a + Math.random() * (b - a); }
  function F(n, p) { return n.toFixed(p || 0); }
  var lastW = window.innerWidth;
  function petals() {
    if (!box || petalsDisabled) return;
    box.textContent = '';
    box.style.setProperty('--h', (Math.max(window.innerHeight, h.clientHeight) + 80) + 'px');
    KINDS.forEach(function (svg, i) { box.style.setProperty('--k' + i, 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'); });
    var small = window.innerWidth < 640, total = small ? 26 : 40, calm = rm.matches ? 1.8 : 1;
    if ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 4) <= 2) total = Math.round(total * .7);   // low-end phones
    if (calm > 1) total = Math.round(total * .6);                                                                        // Reduce Motion: fewer + slower, never hidden
    LAYERS.forEach(function (L) {
      var n = Math.round(total * L.share), i;
      for (i = 0; i < n; i++) {
        var p = d.createElement('i'), w = d.createElement('i'), s = d.createElement('i'), dur = R(L.d[0], L.d[1]) * calm, k = Math.floor(Math.random() * KINDS.length);
        p.className = 'p ' + L.n; w.className = 'w'; s.className = 's';
        var size = R(L.s[0], L.s[1]) * (small ? 1 : 1.2);
        p.style.cssText = '--x:' + F(R(0, 100), 1) + '%;--s:' + F(size) + 'px;--d:' + F(dur, 1) + 's;--dl:' + F(-R(0, dur), 1) + 's';
        w.style.cssText = '--sw:' + F(R(L.sw[0], L.sw[1])) + 'px;--sd:' + F(R(3.5, 6.5) * calm, 1) + 's;--sdl:' + F(-R(0, 5), 1) + 's';
        s.style.cssText = '--img:var(--k' + k + ');--r:' + F(R(4, 8) * calm, 1) + 's;--rdl:' + F(-R(0, 6), 1) + 's;--rz:' + F(R(90, 260)) + 'deg';
        w.appendChild(s); p.appendChild(w); box.appendChild(p);
      }
    });
  }
  var t;
  window.addEventListener('resize', function () {   // iOS fires "resize" when the URL bar collapses: react to WIDTH changes only
    clearTimeout(t); t = setTimeout(function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; petals(); } }, 200);
  });
  window.addEventListener('orientationchange', function () { setTimeout(function () { lastW = window.innerWidth; petals(); }, 300); });
  petals();

  /* ---- B. Scroll reveal (IntersectionObserver, with a no-IO fallback) ---- */
  [].forEach.call(d.querySelectorAll('.stagger'), function (g) {
    [].forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  var items = [].slice.call(d.querySelectorAll('.reveal, .card')).filter(function (el) { return !inGate(el); });
  function show(el) { el.classList.add('in'); }
  if (!('IntersectionObserver' in window)) { items.forEach(show); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- C. Sticky action bar: appears after the hero, hides while typing or at the RSVP section ---- */
  var dock = d.getElementById('dock'), hero = d.querySelector('.hero'), rsvp = d.getElementById('rsvp-section');
  if (dock && hero && 'IntersectionObserver' in window) {
    h.classList.add('has-dock');
    var pastHero = false, atRsvp = false, typing = false;
    function sync() { dock.classList.toggle('show', pastHero && !atRsvp && !typing); }
    new IntersectionObserver(function (es) { pastHero = !es[0].isIntersecting; sync(); }, { threshold: .1 }).observe(hero);
    if (rsvp) new IntersectionObserver(function (es) { atRsvp = es[0].isIntersecting; sync(); }, { threshold: .2 }).observe(rsvp);
    d.addEventListener('focusin', function (e) { typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName); sync(); });   // iOS keyboard pushes fixed bars around
    d.addEventListener('focusout', function () { typing = false; sync(); });
  }
})();
