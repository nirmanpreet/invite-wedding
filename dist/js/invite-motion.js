/**
 * Invite motion — floating mogra/sunflower/rose shower + guest controls.
 *
 * Vanilla JS + CSS animations only. No animation library.
 *
 * Design contract
 * ---------------
 *  - Decor only. Everything lives inside the pre-existing
 *    #sakura-falling overlay (fixed, z-index 0, pointer-events none),
 *    so it can never cover the blessing, the artwork, the names or any
 *    control. Nothing here touches layout, text or styling of the page.
 *  - The two controls (#flowers-btn, #music-btn) are independent. One
 *    never reads or writes the other's state, and neither of them
 *    reloads, re-renders, scrolls or switches language.
 *  - Both remember the guest's choice for the session in
 *    sessionStorage, every access wrapped in try/catch: in-app browsers
 *    that block storage still get fully working buttons.
 *  - Music never starts on load. It starts on the guest's first
 *    deliberate tap of a language button (the `wedding-enter` event
 *    dispatched from enterSite() in script.js), inside that same
 *    synchronous click so iOS Safari accepts it.
 */
(function () {
  'use strict';

  var cfg = (typeof window !== 'undefined' && window.__WEDDING_CONFIG__) ? window.__WEDDING_CONFIG__ : {};
  var features = cfg.features || {};
  var box = document.getElementById('sakura-falling');

  var FLOWER_KEY = 'wedding-flowers';
  var MUSIC_KEY = 'wedding-music';

  // ---------- storage (never throws) ----------
  function loadPref(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function savePref(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) { /* blocked: in-page state still works */ }
  }

  // ==============================================================
  // FLOWER SHAPES
  // Ported from the reference "Phool varsha" file, re-tinted from its
  // pink-background palette (#f39a12 orange, #c2185b hot pink) to this
  // invitation's antique gold / maroon / blush. The mogra keeps its
  // true white: it is the flower the whole effect is named after.
  // ==============================================================
  var ROSE = 'M20 5C16 1 8 6 5 16C1 28 7 44 20 46C33 44 39 28 35 16C32 6 24 1 20 5Z';
  var MARI = 'M20 2C31 10 33 30 20 46C7 30 9 10 20 2Z';

  function W(vb, x) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">' + x + '</svg>'; }
  function G(a, b) {
    return '<defs><radialGradient id="g" cx=".35" cy=".3" r=".85">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/>' +
      '</radialGradient></defs>';
  }
  function ring(n, off, rx, ry, attr) {
    var o = '';
    for (var k = 0; k < n; k++) {
      o += '<ellipse cx="24" cy="' + (24 - off) + '" rx="' + rx + '" ry="' + ry +
        '" transform="rotate(' + (k * 360 / n) + ' 24 24)" ' + attr + '/>';
    }
    return o;
  }

  var SVG = {
    // roses
    r1: W('0 0 40 48', G('#b23a58', '#6d1a2d') + '<path d="' + ROSE + '" fill="url(#g)"/>'),
    r2: W('0 0 40 48', G('#e5a9b8', '#a4243b') + '<path d="' + ROSE + '" fill="url(#g)"/>'),
    r3: W('0 0 40 48', G('#f8dfe4', '#d99aa8') + '<path d="' + ROSE + '" fill="url(#g)"/>'),
    // marigold petal + full head, in antique gold rather than orange
    m: W('0 0 40 48', G('#e5c46d', '#a8812e') + '<path d="' + MARI + '" fill="url(#g)"/>'),
    g: W('0 0 48 48', ring(12, 11, 5, 11, 'fill="#c8a24b"') + ring(8, 7, 4, 8, 'fill="#e5c46d"') +
      '<circle cx="24" cy="24" r="4" fill="#7a5c22"/>'),
    // mogra — five white petals, gold centre
    j: W('0 0 48 48', ring(5, 10, 8, 13, 'fill="#fffdf6" stroke="#e3d5b3" stroke-width=".7"') +
      '<circle cx="24" cy="24" r="3.5" fill="#dfae3a"/>'),
    // gold shimmer + lotus
    s: W('0 0 40 40', G('#f2e2b4', '#c8a24b') +
      '<path d="M20 1Q22.5 17.5 39 20Q22.5 22.5 20 39Q17.5 22.5 1 20Q17.5 17.5 20 1Z" fill="url(#g)"/>'),
    l: W('0 0 40 48', '<defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0" stop-color="#d98aa8"/><stop offset="1" stop-color="#fff8ec"/>' +
      '</linearGradient></defs>' +
      '<path d="M20 2C32 14 36 32 20 46C4 32 8 14 20 2Z" fill="url(#g)" stroke="#e5b9c8" stroke-width=".6"/>')
  };

  // ==============================================================
  // DEPTH LAYERS
  // n = count [phone, desktop], s = size px, d = fall seconds,
  // sw = sway px, op = opacity, wx = sideways drift px, k = species pool
  // Mogra-dominant across all three layers, with roses and marigold
  // accents; the larger lotus shape only appears in the near layer.
  //
  // Denser and rosier than the first pass (20 on a phone, 26 on desktop).
  // Phone is now 28 and desktop 36, and the rose share of each pool is
  // roughly doubled - far 20%->33%, mid 40%->50%, near 50%->60% - so the
  // shower reads as mogra and rose rather than mogra and gold. Still cheap:
  // every flower is one element with a CSS transform animation, no
  // per-frame JS, so the count costs paint, not main-thread time.
  // ==============================================================
  var LAYERS = [
    { name: 'far',  n: [12, 16], s: [12, 20], d: [26, 34], sw: [10, 24], op: 0.42, wx: 0,       k: ['j', 'j', 'm', 'g', 'r3', 'r3'] },
    { name: 'mid',  n: [10, 13], s: [20, 32], d: [17, 24], sw: [18, 38], op: 0.68, wx: 0,       k: ['j', 'j', 'r2', 'r3', 'm', 'r2'] },
    { name: 'near', n: [6, 7],   s: [30, 46], d: [11, 17], sw: [30, 60], op: 0.92, wx: [10, 40], k: ['j', 'r1', 'r2', 'r2', 'l'] }
  ];

  function R(a, b) { return a + Math.random() * (b - a); }
  function F(n, d) { return n.toFixed(d === undefined ? 0 : d); }

  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {}

  function lowPower() {
    return (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 4) <= 2;
  }

  function setFallDistance() {
    if (!box) return;
    var h = Math.max(window.innerHeight, document.documentElement.clientHeight) + 80;
    box.style.setProperty('--h', h + 'px');
  }

  function build() {
    if (!box) return;
    box.textContent = '';
    var small = window.innerWidth < 640;
    var calm = reduced ? 1.8 : 1;
    var weak = lowPower();

    for (var li = 0; li < LAYERS.length; li++) {
      var L = LAYERS[li];
      var n = small ? L.n[0] : L.n[1];
      if (weak) n = Math.max(2, Math.round(n * 0.7));
      if (reduced) n = Math.max(2, Math.round(n * 0.6));

      for (var i = 0; i < n; i++) {
        var kind = L.k[Math.floor(Math.random() * L.k.length)];
        var size = R(L.s[0], L.s[1]);
        var dur = R(L.d[0], L.d[1]) * calm;

        var pe = document.createElement('i');
        var w = document.createElement('i');
        var s = document.createElement('i');
        pe.className = 'p';
        w.className = 'w';
        s.className = 's';

        // Negative delay seeds the shower mid-flight, so flowers are
        // already falling on first paint instead of after one cycle.
        pe.setAttribute('data-layer', L.name);
        pe.setAttribute('data-flower', kind);
        pe.style.cssText =
          '--x:' + F(R(0, 96), 1) + '%;' +
          '--s:' + F(size) + 'px;' +
          '--d:' + F(dur, 1) + 's;' +
          '--dl:' + F(-R(0, dur), 1) + 's;' +
          '--op:' + L.op +
          (L.wx ? ';--wx:' + F(R(L.wx[0], L.wx[1])) + 'px' : '');
        w.style.cssText =
          '--sw:' + F(R(L.sw[0], L.sw[1])) + 'px;' +
          '--sd:' + F(R(3.5, 6.5) * calm, 1) + 's;' +
          '--sdl:' + F(-R(0, 5), 1) + 's';
        s.style.cssText =
          '--img:var(--k_' + kind + ');' +
          '--r:' + F(R(5, 9) * calm, 1) + 's;' +
          '--rdl:' + F(-R(0, 6), 1) + 's;' +
          '--rz:' + F(R(120, 300)) + 'deg';

        w.appendChild(s);
        pe.appendChild(w);
        box.appendChild(pe);
      }
    }
  }

  // ==============================================================
  // MUSIC
  // ==============================================================
  var audio = document.getElementById('my_audio');
  var musicCfg = cfg.music || {};
  var musicSrc = musicCfg.src || '';
  var musicAvailable = !!musicSrc && musicCfg.enabled !== false;
  /* Music is ON by default but silent until the first language tap.
     A guest who muted it earlier in this session stays muted. */
  var musicOn = loadPref(MUSIC_KEY) !== 'off';
  var musicStarted = false; // has the language screen been tapped yet
  var resumeAfterHide = false;

  if (audio) {
    audio.setAttribute('preload', 'none');
    audio.loop = true;
    if (musicSrc) audio.setAttribute('src', musicSrc);
  }

  function tryPlay() {
    if (!audio || !musicAvailable || !musicOn || !musicStarted) return;
    if (!audio.paused) return;
    var p;
    try { p = audio.play(); } catch (e) { return; }
    // Autoplay refused (silent switch, locked WebView, low power mode):
    // fail silently and leave the invitation completely intact.
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  // ==============================================================
  // CONTROLS
  // ==============================================================
  var ICON = {
    flower:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<ellipse cx="12" cy="6.6" rx="2.9" ry="3.9"/>' +
      '<ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(72 12 12)"/>' +
      '<ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(144 12 12)"/>' +
      '<ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(216 12 12)"/>' +
      '<ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(288 12 12)"/>' +
      '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
    soundOn:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M4 9.5h3.1L12 5.7v12.6L7.1 14.5H4z" fill="currentColor" stroke="none"/>' +
      '<path d="M15.3 9.3a3.9 3.9 0 0 1 0 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M17.9 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    soundOff:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M4 9.5h3.1L12 5.7v12.6L7.1 14.5H4z" fill="currentColor" stroke="none"/>' +
      '<path d="M15.6 8.3l5.2 7.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="M20.8 8.3l-5.2 7.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  var LABEL = {
    en: {
      flowersOn: 'Turn floating flowers off',
      flowersOff: 'Turn floating flowers on',
      musicOn: 'Turn music off',
      musicOff: 'Turn music on'
    },
    pa: {
      flowersOn: 'ਫੁੱਲਾਂ ਬੰਦ ਕਰੋ',
      flowersOff: 'ਫੁੱਲਾਂ ਚਾਲੂ ਕਰੋ',
      musicOn: 'ਸੰਗੀਤ ਬੰਦ ਕਰੋ',
      musicOff: 'ਸੰਗੀਤ ਚਾਲੂ ਕਰੋ'
    }
  };
  function lang() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    return LABEL[l] ? l : 'en';
  }

  // Flowers are ON by default. An explicit "off" from this session is
  // the only thing that turns them off — reduced motion slows them
  // down, it never removes them.
  var flowersOn = loadPref(FLOWER_KEY) !== 'off';

  var controls = document.createElement('div');
  controls.className = 'im-controls';

  var flowerBtn = document.createElement('button');
  flowerBtn.type = 'button';
  flowerBtn.id = 'flowers-btn';
  flowerBtn.className = 'im-btn';
  flowerBtn.innerHTML = ICON.flower;

  var musicBtn = document.createElement('button');
  musicBtn.type = 'button';
  musicBtn.id = 'music-btn';
  musicBtn.className = 'im-btn';

  controls.appendChild(flowerBtn);
  if (musicAvailable) controls.appendChild(musicBtn);
  document.body.appendChild(controls);

  function paintFlowers() {
    flowerBtn.setAttribute('aria-pressed', flowersOn ? 'true' : 'false');
    flowerBtn.setAttribute('aria-label', lang() === 'pa'
      ? (flowersOn ? LABEL.pa.flowersOn : LABEL.pa.flowersOff)
      : (flowersOn ? LABEL.en.flowersOn : LABEL.en.flowersOff));
    if (box) box.style.display = flowersOn ? '' : 'none';
  }

  function paintMusic() {
    if (!musicAvailable) return;
    musicBtn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', lang() === 'pa'
      ? (musicOn ? LABEL.pa.musicOn : LABEL.pa.musicOff)
      : (musicOn ? LABEL.en.musicOn : LABEL.en.musicOff));
    musicBtn.innerHTML = musicOn ? ICON.soundOn : ICON.soundOff;
  }

  // ---- flower toggle: touches nothing but the overlay ----
  flowerBtn.addEventListener('click', function () {
    flowersOn = !flowersOn;
    savePref(FLOWER_KEY, flowersOn ? 'on' : 'off');
    paintFlowers();
  });

  // ---- music toggle: touches nothing but the audio element ----
  musicBtn.addEventListener('click', function () {
    musicOn = !musicOn;
    savePref(MUSIC_KEY, musicOn ? 'on' : 'off');
    if (musicOn) { tryPlay(); } else if (audio) { try { audio.pause(); } catch (e) {} }
    paintMusic();
  });

  paintFlowers();
  paintMusic();

  // ==============================================================
  // WIRING
  // ==============================================================
  // First deliberate language tap (English or ਪੰਜਾਬੀ alike).
  // enterSite() in script.js dispatches this synchronously inside the
  // click handler, so play() still counts as a user gesture.
  window.addEventListener('wedding-enter', function () {
    musicStarted = true;
    tryPlay();
    paintMusic();
  });

  // Switching language must never restart, duplicate or interrupt the
  // music — only the button labels are re-read.
  window.addEventListener('wedding-langchange', function () {
    paintFlowers();
    paintMusic();
  });

  document.addEventListener('visibilitychange', function () {
    if (!audio) return;
    if (document.hidden) {
      resumeAfterHide = !audio.paused;
      if (resumeAfterHide) { try { audio.pause(); } catch (e) {} }
    } else if (resumeAfterHide) {
      resumeAfterHide = false;
      tryPlay();
    }
  });

  // Never audible in a print-out or a PDF.
  var printResume = false;
  window.addEventListener('beforeprint', function () {
    if (!audio || audio.paused) return;
    printResume = true;
    try { audio.pause(); } catch (e) {}
  });
  window.addEventListener('afterprint', function () {
    if (!printResume) return;
    printResume = false;
    tryPlay();
  });

  // ---- build the shower ----
  function refresh() {
    setFallDistance();
    if (flowersOn) build();
  }

  if (box && features.sakura !== false) {
    Object.keys(SVG).forEach(function (k) {
      box.style.setProperty('--k_' + k, 'url("data:image/svg+xml,' + encodeURIComponent(SVG[k]) + '")');
    });
    refresh();
  }

  // iOS fires resize continuously as the URL bar collapses; rebuild on
  // a WIDTH change only, debounced.
  var lastW = window.innerWidth;
  var t = null;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; refresh(); }
    }, 200);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { lastW = window.innerWidth; refresh(); }, 300);
  });

  // Honour a live change of the OS motion setting.
  try {
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onMq = function () { reduced = mq.matches; refresh(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  } catch (e) {}
})();
