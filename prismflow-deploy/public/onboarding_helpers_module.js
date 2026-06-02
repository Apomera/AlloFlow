/**
 * AlloFlow OnboardingHelpers Module (Tier 2)
 *
 * Sister-module to OnboardingCoach (Tier 1). Adds the agentic-coach plumbing
 * the Tier 2 spec asked for, without touching the host beyond a single
 * `window.AlloModules.AlloBotRef` exposure line.
 *
 * Public surface (all hung off window.AlloOnboarding):
 *
 *   Screen awareness — FERPA-safe (key names only, never textContent):
 *     readVisibleScreen()              -> { screen, elements, truncated, scrubbed, capturedAt }
 *     onScreenChange(cb)               -> unsubscribe fn; cb({screen, prevScreen, firstVisit})
 *     getScreenGreeting(screen)        -> localized greeting string or null
 *
 *   TTS — opt-in, defaults OFF, layered ON TOP of the existing global mute.
 *   Routes through alloBotRef.current.speak  ->  window.AlloSpeechPlayer.speak
 *   ->  window.speechSynthesis (chunked + Chrome keep-alive).
 *     speak(text)                      -> best-effort opt-in TTS, never throws
 *     announce(text, {politeness})     -> aria-live; works for AT users with TTS off
 *     cancel()                         -> stop OUR utterance (never the global queue)
 *     isOnboardingTTSEnabled()         -> bool: (perFeatureOptIn && !globalMute)
 *     setOnboardingTTSEnabled(bool)    -> persists per-feature opt-in only
 *
 *   First-visit tracking — per-profile namespaced under
 *   `alloflow.onboarding.greeted.<profileId|default>`:
 *     markGreeted(key)                 -> persists; auto-prepends "onboarding:" prefix
 *     wasGreeted(key)
 *     clearGreeted(key?)               -> QA / "reset onboarding" escape hatch
 *     greetOnce(key, text)             -> markGreeted BEFORE speak (AlloBot pattern)
 *
 *   Internal (underscored, do not call from app code):
 *     _prefersReducedMotion()          -> for Tier 2 follow-ups (alloBot.flyTo etc.)
 *     _debug                           -> {resetGreetings, dumpState} for QA
 *
 * Design notes (anchored in the Tier 2 workflow review):
 *   - Default-deny FERPA allowlist for readVisibleScreen: data-help-key (regex'd),
 *     tagName (uppercase), role (enum), type (enum). NEVER textContent / value /
 *     innerText / aria-label / aria-describedby / placeholder / title / alt /
 *     name / iterate element.attributes. See SECURITY note inline.
 *   - speak() requires a real user gesture to unlock (iOS Safari). Pre-gesture
 *     calls queue in _pendingGreeting and drain on first click/keydown/touchend.
 *   - Chrome silently truncates utterances >= 15s. We chunk by sentence (cap
 *     200 chars) and run a 10s pause/resume keep-alive while speaking.
 *   - markGreeted persists BEFORE speak fires — onend is unreliable on Safari
 *     when the tab is backgrounded. Mirrors AlloBot's introFiredGlobal pattern.
 *   - cancel() never calls window.speechSynthesis.cancel() unless WE were the
 *     last speaker — global cancel would kill AlloBot mid-line.
 *   - localStorage access wrapped in safeLocal (Safari private + sandboxed
 *     iframe will throw).
 *   - Refs are read lazily at every call site, never cached in module scope —
 *     host re-mounts (theme/lang/profile swap) would otherwise strand them.
 *   - Single MutationObserver for the whole module (childList + subtree on
 *     document.body, debounced 500ms). onScreenChange fans out to N subscribers.
 *
 * Wiring required from the host:
 *   1. loadModule('OnboardingHelpers', '…onboarding_helpers_module.js')
 *   2. Beside the existing `window.__alloT = t;` (around line 14575 in
 *      AlloFlowANTI.txt), add:
 *          window.AlloModules = window.AlloModules || {};
 *          window.AlloModules.AlloBotRef = alloBotRef;
 *      So speak() can reach the imperative speak handle without an init() call.
 */
(function () {
  'use strict';
  if (window.AlloOnboarding && window.AlloOnboarding.__tier === 2) {
    console.log('[CDN] OnboardingHelpers already loaded, skipping');
    return;
  }

  // ───────────────────────────────────────────────────────────────────────
  // SafeLocal — Safari private mode and sandboxed iframes throw on storage.
  // We never let a storage failure surface as an uncaught render-path error.
  // ───────────────────────────────────────────────────────────────────────
  function safeLocal(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) { window.localStorage.removeItem(key); return; }
      window.localStorage.setItem(key, value);
    } catch (_) { /* quota / private / sandboxed — fall through silently */ }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Lazy accessors — never store React refs in module-scope closures.
  // Host re-mounts (theme switch, lang switch, profile swap) re-create them.
  // ───────────────────────────────────────────────────────────────────────
  function getT() {
    return (typeof window.__alloT === 'function') ? window.__alloT : function (k) { return k; };
  }
  function getLang() {
    return window.__alloTextLanguage || 'English';
  }
  function getBot() {
    var holder = window.AlloModules && window.AlloModules.AlloBotRef;
    return (holder && holder.current) || null;
  }
  function getGlobalMuted() {
    if (typeof window.__alloIsGlobalMuted === 'function') {
      try { return !!window.__alloIsGlobalMuted(); } catch (_) {}
    }
    return safeLocal('alloflow-global-muted') === 'true';
  }
  function getProfileId() {
    return safeLocal('alloflow-active-profile-id') || 'default';
  }

  // ───────────────────────────────────────────────────────────────────────
  // First-visit tracking — per-profile namespaced.
  // Storage key: alloflow.onboarding.greeted.<profileId>  →  JSON Array<string>
  // ───────────────────────────────────────────────────────────────────────
  var GREETED_PREFIX = 'onboarding:';

  function greetedStorageKey() { return 'alloflow.onboarding.greeted.' + getProfileId(); }

  function loadGreetedSet() {
    var raw = safeLocal(greetedStorageKey());
    if (!raw) return new Set();
    try {
      var arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) { return new Set(); }
  }
  function saveGreetedSet(s) {
    try { safeLocal(greetedStorageKey(), JSON.stringify(Array.from(s))); } catch (_) {}
  }

  function normGreetedKey(key) {
    if (typeof key !== 'string' || !key) return null;
    return key.indexOf(GREETED_PREFIX) === 0 ? key : (GREETED_PREFIX + key);
  }

  function markGreeted(key) {
    var k = normGreetedKey(key); if (!k) return;
    var s = loadGreetedSet(); if (s.has(k)) return;
    s.add(k); saveGreetedSet(s);
  }
  function wasGreeted(key) {
    var k = normGreetedKey(key); if (!k) return false;
    return loadGreetedSet().has(k);
  }
  function clearGreeted(key) {
    if (key === undefined || key === null) { safeLocal(greetedStorageKey(), null); return; }
    var k = normGreetedKey(key); if (!k) return;
    var s = loadGreetedSet(); s.delete(k); saveGreetedSet(s);
  }

  // ───────────────────────────────────────────────────────────────────────
  // TTS opt-in gate (layered ON TOP of the existing global mute).
  // Storage key: alloflow-onboarding-tts-optin (string 'true' / 'false').
  // Effective gate: isOnboardingTTSEnabled() = optIn && !globalMute
  // ───────────────────────────────────────────────────────────────────────
  function isOnboardingTTSEnabled() {
    var optIn = safeLocal('alloflow-onboarding-tts-optin') === 'true';
    return optIn && !getGlobalMuted();
  }
  function setOnboardingTTSEnabled(b) {
    safeLocal('alloflow-onboarding-tts-optin', b ? 'true' : 'false');
  }

  // ───────────────────────────────────────────────────────────────────────
  // iOS Safari TTS-unlock — speechSynthesis.speak() called pre-gesture is
  // silently swallowed; subsequent calls can lock the queue until reload.
  // We require a real user gesture before any utterance fires, and drain
  // a single _pendingGreeting on first unlock.
  // ───────────────────────────────────────────────────────────────────────
  var _ttsUnlocked = false;
  var _pendingGreeting = null;
  var _iAmSpeaking = false;
  var _keepAliveTimer = null;

  (function setupGestureUnlock() {
    var events = ['click', 'keydown', 'touchend'];
    function handler() {
      _ttsUnlocked = true;
      events.forEach(function (ev) {
        try { document.removeEventListener(ev, handler, true); } catch (_) {}
      });
      if (_pendingGreeting) {
        var pending = _pendingGreeting;
        _pendingGreeting = null;
        try { speak(pending); } catch (_) {}
      }
    }
    events.forEach(function (ev) {
      try { document.addEventListener(ev, handler, true); } catch (_) {}
    });
  })();

  // ───────────────────────────────────────────────────────────────────────
  // Voice list is async on all browsers; first read often returns [].
  // Warm at first call to speak() so the promise is ready by transition 2.
  // ───────────────────────────────────────────────────────────────────────
  var _voicesPromise = null;
  function getVoicesReady() {
    if (_voicesPromise) return _voicesPromise;
    _voicesPromise = new Promise(function (resolve) {
      if (!window.speechSynthesis) return resolve([]);
      var v = window.speechSynthesis.getVoices();
      if (v && v.length) return resolve(v);
      var done = false;
      function onChange() {
        if (done) return; done = true;
        try { window.speechSynthesis.removeEventListener('voiceschanged', onChange); } catch (_) {}
        resolve(window.speechSynthesis.getVoices() || []);
      }
      try { window.speechSynthesis.addEventListener('voiceschanged', onChange); } catch (_) {}
      setTimeout(onChange, 1000);
    });
    return _voicesPromise;
  }

  // ───────────────────────────────────────────────────────────────────────
  // speak() — best-effort, never throws. Delegation order:
  //   1. alloBotRef.current.speak       (mood + dictation coordination for free)
  //   2. window.AlloSpeechPlayer.speak  (singleton TTS coordinator)
  //   3. window.speechSynthesis         (chunked + 10s keep-alive)
  //   4. announce() polite              (final AT-safe fallback)
  // ───────────────────────────────────────────────────────────────────────
  function speak(text) {
    if (!isOnboardingTTSEnabled()) return;
    if (!text || typeof text !== 'string') return;
    if (!_ttsUnlocked) { _pendingGreeting = text; return; }

    var bot = getBot();
    if (bot && typeof bot.speak === 'function') {
      try { bot.speak(text); return; } catch (_) {}
    }

    var sp = window.AlloSpeechPlayer;
    if (sp && typeof sp.speak === 'function') {
      try { sp.speak(text); return; } catch (_) {}
    }

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      announce(text, { politeness: 'polite' });
      return;
    }

    // Warm voices for next time (no need to await here).
    try { getVoicesReady(); } catch (_) {}

    // Chunk by sentence; cap each chunk at 200 chars to dodge Chrome's
    // 15-second auto-cancel on long utterances.
    var sentences = String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [String(text)];
    var safe = [];
    sentences.forEach(function (raw) {
      var c = raw;
      while (c.length > 200) {
        var cut = c.lastIndexOf(' ', 200);
        if (cut <= 0) cut = 200;
        safe.push(c.slice(0, cut));
        c = c.slice(cut);
      }
      safe.push(c);
    });

    var i = 0;
    _iAmSpeaking = true;
    function nextChunk() {
      if (i >= safe.length) {
        _iAmSpeaking = false;
        if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
        return;
      }
      var u;
      try { u = new SpeechSynthesisUtterance(safe[i++]); }
      catch (_) { _iAmSpeaking = false; return; }
      u.onend = nextChunk; u.onerror = nextChunk;
      var lang = getLang();
      if (lang && typeof lang === 'string' && lang.length <= 8) u.lang = lang;
      try { window.speechSynthesis.speak(u); }
      catch (_) { nextChunk(); }
    }

    if (_keepAliveTimer) clearInterval(_keepAliveTimer);
    _keepAliveTimer = setInterval(function () {
      try {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else if (_keepAliveTimer) {
          clearInterval(_keepAliveTimer);
          _keepAliveTimer = null;
        }
      } catch (_) {}
    }, 10000);

    nextChunk();
  }

  // ───────────────────────────────────────────────────────────────────────
  // cancel() — never cancels the global queue unless WE were the last speaker.
  // ───────────────────────────────────────────────────────────────────────
  function cancel() {
    var bot = getBot();
    if (bot && typeof bot.dismissMessage === 'function') {
      try { bot.dismissMessage(); } catch (_) {}
    }
    if (_iAmSpeaking && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
      _iAmSpeaking = false;
    }
    if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
  }

  // Pause our queue on tab-hide; Safari can leave it stalled otherwise.
  try {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && _iAmSpeaking) cancel();
    });
  } catch (_) {}

  // ───────────────────────────────────────────────────────────────────────
  // announce() — aria-live region. Works with screen readers without
  // colliding (the AT picks it up; no audio overlap with the page).
  // Singleton, lazily created on first call.
  // ───────────────────────────────────────────────────────────────────────
  var _politeRegion = null;
  var _assertiveRegion = null;
  var _politeTimer = null;
  var _assertiveTimer = null;

  function ensureLiveRegion(politeness) {
    if (!document.body) return null;
    var assertive = politeness === 'assertive';
    var existing = assertive ? _assertiveRegion : _politeRegion;
    if (existing && existing.isConnected) return existing;
    var div = document.createElement('div');
    div.setAttribute('role', assertive ? 'alert' : 'status');
    div.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    div.setAttribute('aria-atomic', 'true');
    div.setAttribute('aria-label',
      (getT()('onboarding.live_region_label') || 'AlloBot onboarding announcements'));
    div.style.cssText =
      'position:absolute;left:-10000px;top:auto;width:1px;height:1px;' +
      'overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap;';
    try { document.body.appendChild(div); } catch (_) { return null; }
    if (assertive) _assertiveRegion = div; else _politeRegion = div;
    return div;
  }

  function announce(text, opts) {
    if (!text || typeof text !== 'string') return;
    var politeness = (opts && opts.politeness === 'assertive') ? 'assertive' : 'polite';
    var region = ensureLiveRegion(politeness);
    if (!region) return;
    // Clear + rewrite — some AT skip identical successive content.
    var timerHolder = (politeness === 'assertive') ? '_assertiveTimer' : '_politeTimer';
    var existingTimer = (politeness === 'assertive') ? _assertiveTimer : _politeTimer;
    if (existingTimer) clearTimeout(existingTimer);
    region.textContent = '';
    var t = setTimeout(function () { region.textContent = text; }, 150);
    if (politeness === 'assertive') _assertiveTimer = t; else _politeTimer = t;
  }

  // ───────────────────────────────────────────────────────────────────────
  // greetOnce(key, text) — persists BEFORE speak, mirroring the AlloBot
  // introFiredGlobal pattern. Always emits via aria-live; layers TTS on top
  // when the user has opted in.
  // ───────────────────────────────────────────────────────────────────────
  function greetOnce(key, text) {
    if (!text) return;
    if (wasGreeted(key)) return;
    markGreeted(key);
    announce(text, { politeness: 'polite' });
    if (isOnboardingTTSEnabled()) speak(text);
  }

  // ───────────────────────────────────────────────────────────────────────
  // readVisibleScreen() — FERPA boundary.
  //
  // SECURITY: This function is consumed by the Tier 2 onScreenChange
  // subscriber AND by future Tier 3 LLM prompts. Its output may be logged
  // by Gemini. The allowlist is exhaustive — adding fields requires
  // explicit FERPA review.
  //
  // ALLOWED:
  //   - data-help-key                  (regex /^[a-z][a-z0-9_]*$/, ≤64 chars)
  //   - tagName                        (uppercase)
  //   - role                           (limited to known ARIA enum)
  //   - type                           (limited to known HTML input-type enum)
  //
  // DENIED (every one of these is contaminated with student PII somewhere
  // in this codebase — see Tier 2 workflow FERPA review for evidence):
  //   - textContent, innerText, innerHTML, descendant text nodes
  //   - value, name (form)
  //   - aria-label, aria-describedby (resolved), aria-labelledby (resolved)
  //   - placeholder, title, alt
  //   - any data-* OTHER than data-help-key
  //
  // Implementation forbids iterating element.attributes — that would silently
  // include any future attribute. We hand-build the output object.
  //
  // 250ms result cache to keep this cheap; an internal MutationObserver
  // invalidates the cache on DOM changes.
  // ───────────────────────────────────────────────────────────────────────
  var KEY_RE = /^[a-z][a-z0-9_]*$/;
  var ROLE_ENUM = new Set(['button', 'dialog', 'textbox', 'list', 'listitem',
    'group', 'status', 'main', 'navigation', 'region', 'tablist', 'tab',
    'tabpanel', 'menu', 'menuitem', 'banner', 'alert', 'form', 'search',
    'switch', 'slider', 'checkbox', 'radio', 'link', 'heading']);
  var TYPE_ENUM = new Set(['text', 'submit', 'button', 'radio', 'checkbox',
    'file', 'range', 'number', 'password', 'email', 'search', 'tel', 'url']);

  // PII scrub canaries — these should NEVER fire if the allowlist holds,
  // but if a regression silently broadens the allowlist this catches it.
  var PII_NAME_RE = /[A-Z][a-z]+\s+[A-Z][a-z]+/;     // capitalized word pairs
  var PII_LONG_DIGITS_RE = /\b\d{4,}\b/;             // student IDs / scores
  var PII_EMAIL_RE = /@[a-z]/i;

  var _screenCache = null;
  var _screenCacheAt = 0;

  function readVisibleScreen() {
    var nowPerf = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    if (_screenCache && (nowPerf - _screenCacheAt) < 250) return _screenCache;

    var vh = window.innerHeight || 1;
    var vw = window.innerWidth || 1;
    var nodes;
    try { nodes = document.querySelectorAll('[data-help-key]'); }
    catch (_) { nodes = []; }

    var screen = null;
    var screenArea = 0;
    var elements = [];
    var seenCount = 0;
    var MAX = 40;

    for (var i = 0; i < nodes.length; i++) {
      if (elements.length >= MAX) break;
      var el = nodes[i];

      var rawKey = el.getAttribute('data-help-key');
      if (!rawKey || rawKey.length > 64 || !KEY_RE.test(rawKey)) continue;

      var r;
      try { r = el.getBoundingClientRect(); } catch (_) { continue; }
      if (!r || r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;

      seenCount++;

      var isContainer = (r.width >= vw * 0.85 && r.height >= vh * 0.85);
      var area = r.width * r.height;
      if (isContainer && area > screenArea) {
        screen = rawKey;
        screenArea = area;
      }

      var tag = ((el.tagName || '') + '').toUpperCase();
      var roleRaw = el.getAttribute('role');
      var typeRaw = el.getAttribute('type');

      elements.push({
        key: rawKey,
        tag: tag,
        role: ROLE_ENUM.has(roleRaw) ? roleRaw : null,
        type: TYPE_ENUM.has(typeRaw) ? typeRaw : null,
        scope: isContainer ? 'container' : 'element',
      });
    }

    var truncated = seenCount > MAX;
    var scrubbed = 0;

    // Defensive PII scrub — belt-and-suspenders. Should always be 0 because
    // the allowlist forbids free text; non-zero counts mean a regression.
    var blob;
    try { blob = JSON.stringify({ s: screen, e: elements }); } catch (_) { blob = ''; }
    if (PII_NAME_RE.test(blob) || PII_LONG_DIGITS_RE.test(blob) || PII_EMAIL_RE.test(blob)) {
      var before = elements.length;
      elements = elements.filter(function (e) {
        var s = JSON.stringify(e);
        return !PII_NAME_RE.test(s) && !PII_LONG_DIGITS_RE.test(s) && !PII_EMAIL_RE.test(s);
      });
      scrubbed = before - elements.length;
      window.__ferpaScrubCount = (window.__ferpaScrubCount || 0) + scrubbed;
      if (scrubbed > 0) {
        try { console.warn('[OnboardingHelpers] FERPA scrub fired:', scrubbed, 'elements dropped'); } catch (_) {}
      }
    }

    _screenCache = {
      screen: screen,
      elements: elements,
      truncated: truncated,
      scrubbed: scrubbed,
      capturedAt: Date.now(),
    };
    _screenCacheAt = nowPerf;
    return _screenCache;
  }

  // ───────────────────────────────────────────────────────────────────────
  // onScreenChange(cb) — ONE MutationObserver, debounced 500ms. Computes a
  // screen signature; fires on transitions. Internally drives the auto-
  // greeter below.
  // ───────────────────────────────────────────────────────────────────────
  var _screenListeners = [];
  var _lastScreen = null;
  var _observer = null;
  var _observerScheduledTimer = null;

  function ensureObserver() {
    if (_observer) return;
    if (!document.body || typeof MutationObserver === 'undefined') return;
    try {
      _observer = new MutationObserver(function () {
        if (_observerScheduledTimer) return;
        _observerScheduledTimer = setTimeout(function () {
          _observerScheduledTimer = null;
          _screenCache = null; // invalidate
          var curr;
          try { curr = readVisibleScreen(); } catch (_) { return; }
          if (curr.screen !== _lastScreen) {
            var prev = _lastScreen;
            _lastScreen = curr.screen;
            var firstVisit = !!curr.screen && !wasGreeted('screen:' + curr.screen);
            var payload = { screen: curr.screen, prevScreen: prev, firstVisit: firstVisit };
            _screenListeners.slice().forEach(function (cb) {
              try { cb(payload); } catch (_) {}
            });
          }
        }, 500);
      });
      _observer.observe(document.body, { childList: true, subtree: true });
    } catch (_) { /* no DOM yet — onScreenChange will be a no-op */ }
  }

  function onScreenChange(cb) {
    if (typeof cb !== 'function') return function () {};
    ensureObserver();
    _screenListeners.push(cb);
    return function unsubscribe() {
      _screenListeners = _screenListeners.filter(function (x) { return x !== cb; });
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Curated screen greetings (Tier 2 spec: 4-6 contextual decision-point
  // greetings). These fire ONCE per profile per screen, always via aria-live
  // (free for AT users), TTS layered on top when opted in.
  //
  // Keys are tried as help_strings entries first (onboarding_greet_<screen>),
  // then fall back to the English literals below. Lang-pack sweep can add
  // translations later without code changes.
  //
  // Selected from the discovery's CONTAINER-class list — these are the
  // full-screen surfaces a 0-familiarity user lands on with no on-screen
  // explanation of what to do next.
  // ───────────────────────────────────────────────────────────────────────
  var SCREEN_GREETINGS_EN = {
    concept_sort_game:
      'You are in Concept Sort. Drag each card to the bucket where it best fits. ' +
      'Use Tab and Space to move cards if you prefer the keyboard.',
    venn_game_container:
      'This is the Venn diagram game. Place each item into the region that ' +
      'matches its attributes. Items belonging to both groups go in the overlap.',
    crossword_game_container:
      'Crossword time. Click any square to start, then type your answer. ' +
      'Use the arrow keys to move between squares.',
    learner_progress_panel:
      'Here is your learner progress panel. Each row is one student. ' +
      'Scroll to see all of them, or use the search box to find a student fast.',
    gen_loading_screen:
      'AlloFlow is generating your content. This usually takes ten to twenty seconds. ' +
      'You can keep this tab open and switch windows — I will let you know when it is ready.',
  };

  function getScreenGreeting(screen) {
    if (!screen || typeof screen !== 'string') return null;
    var t = getT();
    var i18nKey = 'onboarding_greet_' + screen;
    try {
      var translated = t(i18nKey);
      if (translated && translated !== i18nKey) return translated;
    } catch (_) {}
    return SCREEN_GREETINGS_EN[screen] || null;
  }

  // Auto-greeter — wired internally on module load. One subscriber, fires
  // greetOnce per first-visit. Tier 3 can add more subscribers for context-
  // aware LLM prompts.
  function installAutoGreeter() {
    onScreenChange(function (ev) {
      if (!ev || !ev.screen || !ev.firstVisit) return;
      var greeting = getScreenGreeting(ev.screen);
      if (!greeting) return;
      greetOnce('screen:' + ev.screen, greeting);
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Internal helpers used by Tier 2 follow-ups (alloBot.flyTo, playAnimation).
  // ───────────────────────────────────────────────────────────────────────
  function _prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────
  window.AlloOnboarding = {
    __tier: 2,
    // Screen awareness
    readVisibleScreen: readVisibleScreen,
    onScreenChange: onScreenChange,
    getScreenGreeting: getScreenGreeting,
    // TTS
    speak: speak,
    announce: announce,
    cancel: cancel,
    isOnboardingTTSEnabled: isOnboardingTTSEnabled,
    setOnboardingTTSEnabled: setOnboardingTTSEnabled,
    // First-visit tracking
    markGreeted: markGreeted,
    wasGreeted: wasGreeted,
    clearGreeted: clearGreeted,
    greetOnce: greetOnce,
    // Internal (underscored)
    _prefersReducedMotion: _prefersReducedMotion,
    _debug: {
      resetGreetings: function () { safeLocal(greetedStorageKey(), null); _lastScreen = null; },
      dumpState: function () {
        return {
          ttsOptIn: safeLocal('alloflow-onboarding-tts-optin') === 'true',
          ttsEffective: isOnboardingTTSEnabled(),
          globalMute: getGlobalMuted(),
          unlocked: _ttsUnlocked,
          pending: _pendingGreeting,
          speaking: _iAmSpeaking,
          profile: getProfileId(),
          greeted: Array.from(loadGreetedSet()),
          lastScreen: _lastScreen,
          listeners: _screenListeners.length,
          ferpaScrubCount: window.__ferpaScrubCount || 0,
        };
      },
    },
  };

  // Module-load auto-greeter — installs the single internal subscriber.
  installAutoGreeter();

  // Also register under AlloModules for parity with other CDN modules.
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OnboardingHelpers = window.AlloOnboarding;

  console.log('[CDN] OnboardingHelpers loaded (Tier 2)');
})();
