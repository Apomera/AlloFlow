// The preview page (packets-try.html). Makers open it with the blob: address of the built file after #.
// That address is held in the maker tab's memory: read here, never sent. The file runs in a sandboxed frame.
// Teacher tools connect to the open maker tab over BroadcastChannel on this origin.
(function () {
  'use strict';
  var doc = document;
  var CHANNEL = 'alloflow-packets-preview';
  var STORE_KIND = 'alloflow-packet-store';
  var fail = function () {
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-problem').hidden = false;
  };
  var address = String(window.location.hash || '').slice(1);
  var mine = 'blob:' + window.location.origin + '/';
  if (address.indexOf(mine) !== 0 || typeof window.fetch !== 'function') { fail(); return; }

  var barHost = doc.getElementById('try-edit');
  var frame = null;
  var blobUrl = '';
  var snapItems = Object.create(null);
  var MAX_SNAP_KEYS = 64;
  var MAX_SNAP_VALUE = 512 * 1024;
  function isSafeSnapKey(key) {
    return typeof key === 'string' && key.length > 0 && key.length <= 256
      && key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
  }
  var channel = null;
  var pendingFocus = '';
  var busyBar = false;

  function withSnapshot(html, items) {
    var clean = String(html || '').replace(/<script\b[^>]*id="packet-store-snapshot"[^>]*>[\s\S]*?<\/script>/i, '');
    var json = JSON.stringify({ kind: STORE_KIND, items: items || {} }).replace(/</g, '\\u003c');
    var block = '<script type="application/json" id="packet-store-snapshot">' + json + '</script>';
    // In the head, BEFORE the file's own script: the player reads the block once, while it starts. Put before
    // </body> (as it was until 2026-11-16) it came after the script, the player found nothing, said "This browser
    // cannot keep your work" on every screen and never told this page which question was showing, so the teacher
    // bar stayed on question 1 and "Remove question" removed question 1. packets-open.js has always done it this way.
    var at = clean.search(/<\/head\s*>/i);
    return at >= 0 ? clean.slice(0, at) + block + clean.slice(at) : block + clean;
  }

  function revokeBlob() {
    if (blobUrl && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      blobUrl = '';
    }
  }

  function showHtml(html) {
    if (!frame) return;
    revokeBlob();
    blobUrl = URL.createObjectURL(new Blob([withSnapshot(html, snapItems)], { type: 'text/html' }));
    frame.src = blobUrl;
  }
  window.addEventListener('pagehide', revokeBlob);

  // 2026-11-18: "Hide answers" leaves the question's word out of the bar (the word is the answer in Word Sounds and
  // vocabulary), for a preview shown to a class. Off when a preview opens; this page keeps nothing in the browser.
  var hideAnswers = false;
  var lastBar = null;
  function renderBar(bar) {
    if (!barHost) return;
    lastBar = bar;
    barHost.textContent = '';
    if (!bar || bar.hidden) { barHost.hidden = true; return; }
    busyBar = !!bar.busy;
    var hide = doc.createElement('button');
    hide.type = 'button';
    hide.className = 'btn btn-small try-hide';
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
    var list = Array.isArray(bar.buttons) ? bar.buttons : [];
    if (list.length) {
      var group = doc.createElement('div');
      group.className = 'try-edit-actions';
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
          busyBar = true;
          Array.prototype.forEach.call(barHost.querySelectorAll('button'), function (b) { b.disabled = true; });
          channel.postMessage({ type: 'preview-act', id: address, action: String(spec.action) });
        });
        group.appendChild(btn);
      });
      barHost.appendChild(group);
    }
    if (bar.said) {
      var said = doc.createElement('span');
      said.className = 'try-edit-said';
      said.setAttribute('role', 'status');
      said.textContent = String(bar.said);
      barHost.appendChild(said);
    }
    barHost.hidden = false;
    if (!busyBar && pendingFocus) {
      var target = null;
      var actBtns = barHost.querySelectorAll('[data-preview-act]');
      for (var ai = 0; ai < actBtns.length; ai++) {
        if (actBtns[ai].getAttribute('data-preview-act') === pendingFocus) { target = actBtns[ai]; break; }
      }
      pendingFocus = '';
      if (target && !target.disabled) target.focus();
      else {
        var first = barHost.querySelector('button:not(:disabled)');
        if (first) first.focus();
      }
    }
  }

  // 2026-11-18: Present, for a teacher showing the file to a group. The top of this page (the word Preview and the
  // teacher tools) slides away and the file fills the screen, in full screen where the browser allows it. The top
  // comes back while the pointer is at the top edge, while a control in it has keyboard focus, or from the tab under
  // it. Present turns Hide answers on, and off again after unless the teacher changed it. Esc, or Present again, ends it.
  var presentBtn = doc.getElementById('try-present');
  var tab = doc.getElementById('try-tab');
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
      if (!presenting || event.key !== 'Escape') return;
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
        if (typeof msg.html !== 'string' || !/^<!doctype html>/i.test(msg.html) || msg.html.indexOf('id="packet-manifest"') < 0) return;
        if (msg.snapshot && typeof msg.snapshot === 'object' && !Array.isArray(msg.snapshot)) {
          var nextSnap = Object.create(null);
          var snapKeys = Object.keys(msg.snapshot);
          for (var si = 0; si < snapKeys.length && si < MAX_SNAP_KEYS; si++) {
            var sk = snapKeys[si];
            if (!isSafeSnapKey(sk)) continue;
            var sv = msg.snapshot[sk];
            if (typeof sv === 'string' && sv.length <= MAX_SNAP_VALUE) nextSnap[sk] = sv;
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
      channel.postMessage({ type: 'preview-store', id: address, key: d.key, value: d.value == null ? null : String(d.value) });
    });
    channel.postMessage({ type: 'preview-hello', id: address });
  }

  window.fetch(address).then(function (reply) {
    if (!reply.ok) throw new Error('gone');
    return reply.text();
  }).then(function (html) {
    if (!/^<!doctype html>/i.test(html) || html.indexOf('id="packet-manifest"') < 0) throw new Error('not a file from a maker');
    frame = doc.createElement('iframe');
    frame.className = 'try-frame';
    frame.title = 'The file a student gets';
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    showHtml(html);
    doc.getElementById('try-wait').hidden = true;
    doc.getElementById('try-main').appendChild(frame);
    if (presentBtn) presentBtn.hidden = false;
    wireChannel();
  }).catch(fail);
})();
