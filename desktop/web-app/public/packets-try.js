// The preview page (packets-try.html). Makers open it with the blob: address of the built file after #.
// That address is held in the maker tab's memory: read here, never sent. The file runs in a sandboxed frame.
// Teacher tools connect to the open maker tab over BroadcastChannel on this origin.
(function () {
  'use strict';
  if (typeof window !== 'object' || window === null || typeof document !== 'object' || document === null || !window.location) return;
  var doc = document;
  var CHANNEL = 'alloflow-packets-preview';
  var STORE_KIND = 'alloflow-packet-store';
  var NAV_KIND = 'alloflow-packet-nav';
  var fail = function () {
    var waitEl = doc.getElementById('try-wait');
    var probEl = doc.getElementById('try-problem');
    if (waitEl) waitEl.hidden = true;
    if (probEl) probEl.hidden = false;
  };
  var origin = String(window.location.origin || '');
  var address = String(window.location.hash || '').slice(1);
  var mine = 'blob:' + origin + '/';
  if (!origin || origin === 'null' || address.indexOf(mine) !== 0 || typeof window.fetch !== 'function') { fail(); return; }

  var barHost = doc.getElementById('try-edit');
  var frame = null;
  var blobUrl = '';
  var navToken = '';
  var snapItems = Object.create(null);
  var MAX_SNAP_KEYS = 64;
  var MAX_SNAP_VALUE = 512 * 1024;
  var MAX_HTML_CHARS = 60 * 1024 * 1024;
  function isSafeSnapKey(key) {
    return typeof key === 'string' && key.length > 0 && key.length <= 256
      && key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
  }
  function makeNavToken() {
    var hex = '0123456789abcdef';
    var out = '';
    var bytes = null;
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        bytes = window.crypto.getRandomValues(new window.Uint8Array(16));
      }
    } catch (_) {}
    for (var i = 0; i < 16; i++) {
      var b = bytes ? bytes[i] : Math.floor(Math.random() * 256);
      out += hex[(b >> 4) & 15] + hex[b & 15];
    }
    return out;
  }
  var channel = null;
  var pendingFocus = '';
  var pendingNavFocus = '';
  var navAnnounced = false;
  var busyBar = false;
  var closed = false;

  function withSnapshot(html, items, token) {
    var clean = String(html || '').replace(/<script\b[^>]*id="packet-store-snapshot"[^>]*>[\s\S]*?<\/script>/gi, '');
    var payload = { kind: STORE_KIND, items: items || {} };
    if (typeof token === 'string' && token.length >= 16) payload.nav = token;
    var json = JSON.stringify(payload)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    var block = '<script type="application/json" id="packet-store-snapshot">' + json + '</script>';
    // In the head, BEFORE the file's own script: the player reads the block once, while it starts. Put before
    // </body> (as it was until 2026-11-16) it came after the script, the player found nothing, said "This browser
    // cannot keep your work" on every screen and never told this page which question was showing, so the teacher
    // bar stayed on question 1 and "Remove question" removed question 1. packets-open.js has always done it this way.
    var at = clean.search(/<\/head\s*>/i);
    return at >= 0 ? clean.slice(0, at) + block + clean.slice(at) : block + clean;
  }

  function revokeBlob() {
    if (blobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      blobUrl = '';
    }
  }

  function stopSpeech() {
    try {
      if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
  }

  function postChannel(msg) {
    if (!channel || closed) return;
    try { channel.postMessage(msg); } catch (_) {}
  }

  function showHtml(html) {
    if (!frame || closed) return;
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof Blob !== 'function') { fail(); return; }
    stopSpeech();
    revokeBlob();
    navToken = makeNavToken();
    blobUrl = URL.createObjectURL(new Blob([withSnapshot(html, snapItems, navToken)], { type: 'text/html' }));
    frame.src = blobUrl;
  }
  function sendNav(action, index, focusKey) {
    if (!frame || !frame.contentWindow || !navToken || busyBar) return;
    pendingNavFocus = focusKey || '';
    navAnnounced = true;
    var msg = { kind: NAV_KIND, token: navToken, action: action };
    if (index !== undefined) msg.index = index;
    try { frame.contentWindow.postMessage(msg, '*'); } catch (_) {}
  }
  window.addEventListener('pagehide', function () {
    closed = true;
    clearFetchTimer();
    if (fetchCtrl) { try { fetchCtrl.abort(); } catch (_) {} }
    stopSpeech();
    revokeBlob();
    if (channel && typeof channel.close === 'function') {
      try { channel.close(); } catch (_) {}
      channel = null;
    }
  });

  // 2026-11-18: "Hide answers" leaves the question's word out of the bar (the word is the answer in Word Sounds and
  // vocabulary), for a preview shown to a class. Off when a preview opens; this page keeps nothing in the browser.
  var hideAnswers = false;
  var moreOpen = false;
  var lastBar = null;
  function renderBar(bar) {
    if (!barHost) return;
    var activeNav = doc.activeElement && barHost.contains(doc.activeElement)
      ? String(doc.activeElement.getAttribute('data-preview-nav') || '')
      : '';
    var activeControl = '';
    if (!activeNav && doc.activeElement && barHost.contains(doc.activeElement)) {
      if (doc.activeElement.hasAttribute('data-preview-more')) activeControl = 'more';
      else if (doc.activeElement.hasAttribute('data-preview-hide')) activeControl = 'hide';
    }
    lastBar = bar;
    barHost.textContent = '';
    if (!bar || bar.hidden) { busyBar = false; barHost.hidden = true; return; }
    busyBar = !!bar.busy;
    barHost.classList.toggle('try-more-open', moreOpen);
    var hide = doc.createElement('button');
    hide.type = 'button';
    hide.className = 'btn btn-small try-hide try-edit-extra';
    hide.setAttribute('data-preview-hide', '');
    hide.setAttribute('aria-pressed', String(hideAnswers));
    hide.textContent = 'Hide answers';
    hide.addEventListener('click', function () {
      hideAnswers = !hideAnswers;
      answersByPresent = false;
      renderBar(lastBar);
      var again = barHost.querySelector('[data-preview-hide]');
      if (again) again.focus();
    });
    barHost.appendChild(hide);
    var shown = hideAnswers && typeof bar.whereQuiet === 'string' ? bar.whereQuiet : bar.where;
    if (shown) {
      var where = doc.createElement('span');
      where.className = 'try-edit-where';
      where.textContent = String(shown);
      barHost.appendChild(where);
    }
    var nav = bar.nav && typeof bar.nav === 'object' ? bar.nav : null;
    if (nav && Number(nav.total) > 0) {
      var navGroup = doc.createElement('div');
      navGroup.className = 'try-edit-nav';
      var prevBtn = doc.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'btn btn-small';
      prevBtn.setAttribute('data-preview-nav', 'prev');
      prevBtn.disabled = !!(busyBar || !nav.canPrev);
      prevBtn.textContent = 'Previous';
      prevBtn.addEventListener('click', function () {
        if (prevBtn.disabled) return;
        sendNav('prev', undefined, 'prev');
      });
      navGroup.appendChild(prevBtn);
      var skipBtn = doc.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'btn btn-small';
      skipBtn.setAttribute('data-preview-nav', 'next');
      skipBtn.disabled = !!(busyBar || !nav.canNext);
      skipBtn.textContent = 'Skip';
      skipBtn.addEventListener('click', function () {
        if (skipBtn.disabled) return;
        sendNav('next', undefined, 'next');
      });
      navGroup.appendChild(skipBtn);
      var navItems = Array.isArray(nav.items) ? nav.items : [];
      if (navItems.length) {
        var jump = doc.createElement('select');
        jump.className = 'try-nav-select try-edit-extra';
        jump.setAttribute('data-preview-nav', 'goto');
        jump.setAttribute('aria-label', 'Jump to question');
        jump.disabled = !!busyBar;
        if (!nav.started && !nav.finished) {
          var startOpt = doc.createElement('option');
          startOpt.value = '';
          startOpt.disabled = true;
          startOpt.hidden = true;
          startOpt.textContent = 'Start screen';
          jump.appendChild(startOpt);
        }
        navItems.forEach(function (entry, idx) {
          if (!entry || typeof entry !== 'object') return;
          var opt = doc.createElement('option');
          var val = typeof entry.index === 'number' ? entry.index : idx;
          opt.value = String(val);
          opt.textContent = hideAnswers && typeof entry.quietLabel === 'string'
            ? entry.quietLabel
            : String(entry.label || ('Question ' + (val + 1)));
          jump.appendChild(opt);
        });
        var endOpt = doc.createElement('option');
        endOpt.value = 'end';
        endOpt.textContent = 'End screen';
        jump.appendChild(endOpt);
        jump.value = nav.finished ? 'end' : (!nav.started ? '' : String(Math.max(0, Math.min(Number(nav.index) || 0, navItems.length - 1))));
        jump.addEventListener('change', function () {
          if (jump.disabled) return;
          var chosen = jump.value;
          if (!chosen) return;
          if (chosen === 'end') sendNav('goto', 'end', 'goto');
          else sendNav('goto', Number(chosen), 'goto');
        });
        navGroup.appendChild(jump);
      }
      barHost.appendChild(navGroup);
    }
    var list = Array.isArray(bar.buttons) ? bar.buttons : [];
    if (list.length) {
      var group = doc.createElement('div');
      group.className = 'try-edit-actions try-edit-extra';
      list.forEach(function (spec) {
        if (!spec || !spec.action) return;
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-small';
        btn.setAttribute('data-preview-act', String(spec.action));
        btn.disabled = !!(busyBar || spec.disabled);
        btn.textContent = String(spec.label || spec.action);
        btn.addEventListener('click', function () {
          if (!channel || busyBar || btn.disabled) return;
          pendingFocus = String(spec.action);
          pendingNavFocus = '';
          navAnnounced = false;
          busyBar = true;
          Array.prototype.forEach.call(barHost.querySelectorAll('button, select'), function (b) { b.disabled = true; });
          postChannel({ type: 'preview-act', id: address, action: String(spec.action) });
        });
        group.appendChild(btn);
      });
      barHost.appendChild(group);
    }
    var moreBtn = doc.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'btn btn-small try-more-btn';
    moreBtn.setAttribute('data-preview-more', '');
    moreBtn.setAttribute('aria-expanded', String(moreOpen));
    moreBtn.textContent = moreOpen ? 'Less' : 'More';
    moreBtn.addEventListener('click', function () {
      moreOpen = !moreOpen;
      barHost.classList.toggle('try-more-open', moreOpen);
      moreBtn.setAttribute('aria-expanded', String(moreOpen));
      moreBtn.textContent = moreOpen ? 'Less' : 'More';
    });
    barHost.appendChild(moreBtn);
    var editSaid = String(bar.said || '');
    if (editSaid && !navAnnounced) {
      var said = doc.createElement('span');
      said.className = 'try-edit-said';
      said.setAttribute('role', 'status');
      said.textContent = editSaid;
      barHost.appendChild(said);
    }
    if (navAnnounced && shown) {
      var navStatus = doc.createElement('span');
      navStatus.className = 'sr-only';
      navStatus.setAttribute('data-preview-nav-status', '');
      navStatus.setAttribute('role', 'status');
      navStatus.textContent = String(shown);
      barHost.appendChild(navStatus);
    }
    barHost.hidden = false;
    if (!busyBar && pendingFocus) {
      var target = null;
      var actBtns = barHost.querySelectorAll('[data-preview-act]');
      for (var ai = 0; ai < actBtns.length; ai++) {
        if (actBtns[ai].getAttribute('data-preview-act') === pendingFocus) { target = actBtns[ai]; break; }
      }
      pendingFocus = '';
      pendingNavFocus = '';
      if (target && !target.disabled) target.focus();
      else {
        var first = barHost.querySelector('button:not(:disabled)');
        if (first) first.focus();
      }
    } else if (!busyBar && (pendingNavFocus || activeNav)) {
      var wantNav = pendingNavFocus || activeNav;
      pendingNavFocus = '';
      if (wantNav === 'prev' || wantNav === 'next' || wantNav === 'goto') {
        var navTarget = barHost.querySelector('[data-preview-nav="' + wantNav + '"]');
        if (navTarget && !navTarget.disabled) {
          navTarget.focus();
        } else if (wantNav === 'next' || wantNav === 'prev') {
          var fallbackNav = barHost.querySelector('[data-preview-nav="' + (wantNav === 'next' ? 'prev' : 'next') + '"]');
          if (fallbackNav && !fallbackNav.disabled) fallbackNav.focus();
        }
      }
    } else if (!busyBar && activeControl) {
      var ctrlTarget = barHost.querySelector(activeControl === 'more' ? '[data-preview-more]' : '[data-preview-hide]');
      if (ctrlTarget && !ctrlTarget.disabled) ctrlTarget.focus();
    }
  }

  // 2026-11-18: Present, for a teacher showing the file to a group. The top of this page (the word Preview and the
  // teacher tools) slides away and the file fills the screen, in full screen where the browser allows it. The top
  // comes back while the pointer is at the top edge, while a control in it has keyboard focus, or from the tab under
  // it. Present turns Hide answers on, and off again after unless the teacher changed it. Esc, or Present again, ends it.
  var presentBtn = doc.getElementById('try-present');
  var tab = doc.getElementById('try-tab');
  if (tab && !tab.querySelector('.try-tab-label')) {
    var tabLabel = doc.createElement('span');
    tabLabel.className = 'try-tab-label';
    tabLabel.setAttribute('aria-hidden', 'true');
    tabLabel.textContent = 'Menu';
    tab.insertBefore(tabLabel, tab.firstChild);
  }
  var presenting = false;
  var wentFull = false;
  var answersByPresent = false;
  function fullNow() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
  function setOpen(open) {
    doc.body.classList.toggle('try-open', !!open);
    tab.setAttribute('aria-expanded', String(!!open));
  }
  function setPresent(on) {
    if (!!on === presenting) return;
    presenting = !!on;
    doc.body.classList.toggle('try-present', presenting);
    doc.body.classList.remove('try-no-full');
    presentBtn.setAttribute('aria-pressed', String(presenting));
    presentBtn.textContent = presenting ? 'Exit present' : 'Present';
    tab.hidden = !presenting;
    setOpen(false);
    if (presenting && !hideAnswers) { hideAnswers = true; answersByPresent = true; if (lastBar) renderBar(lastBar); }
    if (!presenting && answersByPresent) { hideAnswers = false; answersByPresent = false; if (lastBar) renderBar(lastBar); }
    var root = doc.documentElement;
    if (presenting) {
      var ask = root.requestFullscreen || root.webkitRequestFullscreen;
      var onDeclined = function () {
        wentFull = false;
        if (!presenting) return;
        doc.body.classList.add('try-no-full');
        tab.hidden = false;
        tab.setAttribute('aria-label', 'Top bar (press Escape to exit)');
        try { tab.focus(); } catch (_) {}
      };
      if (ask && !fullNow()) {
        wentFull = true;
        try {
          var asked = ask.call(root);
          if (asked && typeof asked.catch === 'function') asked.catch(onDeclined);
          if (frame) frame.focus();
        } catch (_) { onDeclined(); }
      } else {
        wentFull = false;
        doc.body.classList.add('try-no-full');
        tab.setAttribute('aria-label', 'Top bar (press Escape to exit)');
        if (frame) frame.focus();
      }
    } else {
      tab.setAttribute('aria-label', 'Top bar');
      var leave = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (wentFull && fullNow() && leave) { try { leave.call(doc); } catch (_) {} }
      wentFull = false;
    }
  }
  if (presentBtn && tab) {
    presentBtn.addEventListener('click', function () { setPresent(!presenting); });
    tab.addEventListener('click', function () { setOpen(!doc.body.classList.contains('try-open')); });
    var onEscape = function (event) {
      if (!presenting || !event || event.isComposing || event.keyCode === 229 || event.key !== 'Escape') return;
      setPresent(false);
      presentBtn.focus();
    };
    doc.addEventListener('keydown', onEscape);
    window.addEventListener('keydown', onEscape);
    var onFull = function () { if (presenting && wentFull && !fullNow()) setPresent(false); };
    doc.addEventListener('fullscreenchange', onFull);
    doc.addEventListener('webkitfullscreenchange', onFull);
  }

  function wireChannel() {
    if (typeof window.BroadcastChannel !== 'function') return;
    try { channel = new window.BroadcastChannel(CHANNEL); } catch (_) { channel = null; }
    if (!channel) return;
    if (typeof channel.unref === 'function') channel.unref();
    channel.onmessage = function (event) {
      var msg = event && event.data;
      if (!msg || typeof msg !== 'object' || msg.id !== address) return;
      if (msg.type === 'preview-bar') { renderBar(msg.bar || msg); return; }
      if (msg.type === 'preview-reload') {
        if (typeof msg.html !== 'string' || msg.html.length > MAX_HTML_CHARS || !/^<!doctype html>/i.test(msg.html) || msg.html.indexOf('id="packet-manifest"') < 0) return;
        navAnnounced = false;
        if (msg.snapshot && typeof msg.snapshot === 'object' && !Array.isArray(msg.snapshot)) {
          var nextSnap = Object.create(null);
          var snapKeys = Object.keys(msg.snapshot);
          var kept = 0;
          for (var si = 0; si < snapKeys.length && kept < MAX_SNAP_KEYS; si++) {
            var sk = snapKeys[si];
            if (!isSafeSnapKey(sk)) continue;
            var sv = msg.snapshot[sk];
            if (typeof sv === 'string' && sv.length <= MAX_SNAP_VALUE) { nextSnap[sk] = sv; kept++; }
          }
          snapItems = nextSnap;
        }
        showHtml(msg.html);
        if (msg.bar) renderBar(msg.bar);
        return;
      }
      if (msg.type === 'preview-stop') { renderBar({ hidden: true }); }
    };
    window.addEventListener('message', function (event) {
      if (!frame || event.source !== frame.contentWindow || (event.origin && event.origin !== 'null')) return;
      var d = event.data;
      if (!d || typeof d !== 'object' || d.kind !== STORE_KIND || !isSafeSnapKey(d.key)) return;
      if (d.value == null) {
        delete snapItems[d.key];
      } else {
        var strVal = String(d.value);
        if (strVal.length > MAX_SNAP_VALUE) return;
        if (!Object.prototype.hasOwnProperty.call(snapItems, d.key) && Object.keys(snapItems).length >= MAX_SNAP_KEYS) return;
        snapItems[d.key] = strVal;
      }
      postChannel({ type: 'preview-store', id: address, key: d.key, value: d.value == null ? null : String(d.value) });
    });
    postChannel({ type: 'preview-hello', id: address });
  }

  var fetchCtrl = typeof window.AbortController === 'function' ? new window.AbortController() : null;
  var fetchTimer = fetchCtrl ? setTimeout(function () { try { fetchCtrl.abort(); } catch (_) {} }, 15000) : null;
  var clearFetchTimer = function () { if (fetchTimer !== null) { clearTimeout(fetchTimer); fetchTimer = null; } };
  window.fetch(address, fetchCtrl ? { signal: fetchCtrl.signal } : undefined).then(function (reply) {
    if (closed) throw new Error('closed');
    if (!reply || !reply.ok) throw new Error('gone');
    var cl = Number(reply.headers && typeof reply.headers.get === 'function' ? reply.headers.get('content-length') : NaN);
    if (isFinite(cl) && cl > MAX_HTML_CHARS) throw new Error('too big');
    return reply.text();
  }).then(function (html) {
    clearFetchTimer();
    if (closed) return;
    if (typeof html !== 'string' || html.length > MAX_HTML_CHARS || !/^<!doctype html>/i.test(html) || html.indexOf('id="packet-manifest"') < 0) throw new Error('not a file from a maker');
    var mainEl = doc.getElementById('try-main');
    if (!mainEl) throw new Error('missing host');
    frame = doc.createElement('iframe');
    frame.className = 'try-frame';
    frame.title = 'The file a student gets';
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    showHtml(html);
    var waitEl = doc.getElementById('try-wait');
    if (waitEl) waitEl.hidden = true;
    mainEl.appendChild(frame);
    if (presentBtn) presentBtn.hidden = false;
    wireChannel();
  }).catch(function () {
    clearFetchTimer();
    if (!closed) fail();
  });
})();
