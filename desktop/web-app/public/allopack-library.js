(function () {
  'use strict';
  if (typeof window !== 'object' || !window || typeof document !== 'object' || !document) return;
  var form = document.getElementById('pack-filters');
  if (!form) return;
  var topics = Array.from(document.querySelectorAll('.pack-topic'));
  var search = document.getElementById('pack-search');
  var subject = document.getElementById('pack-subject');
  var grade = document.getElementById('pack-grade');
  function normalize(text) { return String(text == null ? '' : text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]/g, ' '); }
  function matchesGrade(value, wanted) {
    if (!wanted) return true;
    var raw = String(value == null ? '' : value).trim().toLowerCase();
    var target = String(wanted).trim().toLowerCase();
    if (!raw) return false;
    if (target === 'k' || target === 'pre-k' || target === 'prek') {
      return /\b(?:pre-?k|kindergarten|k)\b/.test(raw);
    }
    var targetNum = Number(target);
    if (!Number.isFinite(targetNum)) return raw.indexOf(target) !== -1;
    var rangeMatch = raw.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/);
    if (rangeMatch) {
      var lo = Number(rangeMatch[1]), hi = Number(rangeMatch[2]);
      if (targetNum >= Math.min(lo, hi) && targetNum <= Math.max(lo, hi)) return true;
    }
    var numbers = raw.match(/\d+/g) || [];
    for (var i = 0; i < numbers.length; i++) {
      if (Number(numbers[i]) === targetNum) return true;
    }
    return false;
  }
  function setStatus(text) {
    var el = document.getElementById('pack-copy-status');
    if (el) el.textContent = text;
  }
  function isSafeCopyUrl(raw) {
    var s = String(raw || '').trim();
    if (!s || /[\u0000-\u001f\u007f]/.test(s)) return false;
    if (/^\/p\/[A-Za-z0-9_-]+$/.test(s)) return true;
    try {
      var parsed = new URL(s);
      if (parsed.username || parsed.password) return false;
      if (parsed.protocol === 'https:') return true;
      if (parsed.protocol === 'http:') {
        var host = (parsed.hostname || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
      }
      return false;
    } catch (_) { return false; }
  }
  function isSameOriginHttpUrl(raw) {
    try {
      var parsed = new URL(String(raw || ''), window.location.href);
      if (parsed.username || parsed.password) return false;
      return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin === window.location.origin;
    } catch (_) { return false; }
  }
  function syncQueryParams(searchVal, subjectVal, gradeVal) {
    if (!window.history || typeof window.history.replaceState !== 'function' || typeof URLSearchParams !== 'function') return;
    try {
      var params = new URLSearchParams(window.location.search || '');
      if (searchVal) params.set('q', searchVal); else params.delete('q');
      if (subjectVal) params.set('subject', subjectVal); else params.delete('subject');
      if (gradeVal) params.set('grade', gradeVal); else params.delete('grade');
      var qs = params.toString();
      var nextUrl = window.location.pathname + (qs ? '?' + qs : '') + (window.location.hash || '');
      window.history.replaceState(null, '', nextUrl);
    } catch (_) { /* Ignore history restrictions in opaque origins or test harnesses. */ }
  }
  function applyInitialQueryParams() {
    if (typeof URLSearchParams !== 'function') return false;
    try {
      var params = new URLSearchParams(window.location.search || '');
      var applied = false;
      var q = params.get('q');
      if (search && q) { search.value = String(q).slice(0, 200); applied = true; }
      var subj = params.get('subject');
      if (subject && subj) {
        var validSubj = Array.from(subject.options || []).some(function (opt) { return opt.value === subj; });
        if (validSubj) { subject.value = subj; applied = true; }
      }
      var gr = params.get('grade');
      if (grade && gr) {
        var validGr = Array.from(grade.options || []).some(function (opt) { return opt.value === gr; });
        if (validGr) { grade.value = gr; applied = true; }
      }
      return applied;
    } catch (_) { return false; }
  }
  function filter(skipUrlSync) {
    var searchVal = search ? String(search.value || '').slice(0, 200) : '';
    var subjectVal = subject ? String(subject.value || '') : '';
    var gradeVal = grade ? String(grade.value || '') : '';
    var terms = normalize(searchVal).trim().split(/\s+/).filter(Boolean).slice(0, 12), count = 0, versions = 0;
    topics.forEach(function (topic) {
      var hay = normalize(topic.dataset.packSearch);
      topic.hidden = !terms.every(function (term) { return hay.indexOf(term) !== -1; }) || (subjectVal && topic.dataset.packSubject !== subjectVal) || !matchesGrade(topic.dataset.packGrade, gradeVal);
      if (!topic.hidden) { count++; versions += topic.querySelectorAll('[data-pack-id]').length; }
    });
    var results = document.getElementById('pack-results');
    if (results) {
      var countLabel = results.dataset.packCountLabel || 'pack versions';
      if (versions === 1) countLabel = countLabel === 'packs' ? 'pack' : 'pack version';
      results.textContent = count + ' of ' + topics.length + ' topics · ' + versions + ' ' + countLabel;
    }
    var emptyEl = document.getElementById('pack-empty');
    if (emptyEl) emptyEl.hidden = count !== 0;
    if (!skipUrlSync) syncQueryParams(searchVal.trim(), subjectVal, gradeVal);
  }
  form.hidden = false;
  if (applyInitialQueryParams()) filter(true);
  form.addEventListener('input', function () { filter(false); });
  form.addEventListener('change', function () { filter(false); });
  form.addEventListener('submit', function (event) { event.preventDefault(); filter(false); });
  form.addEventListener('reset', function () {
    if (search) search.value = '';
    if (subject) subject.value = '';
    if (grade) grade.value = '';
    filter(false);
    setStatus('Filters cleared.');
  });
  if (search) {
    search.addEventListener('keydown', function (event) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape' && search.value) {
        event.preventDefault();
        search.value = '';
        filter(false);
        setStatus('Search cleared.');
      }
    }, true);
  }
  // Retain the visitor's existing browser-app storage origin on either supported host.
  if (['https://alloflow.dev', 'https://alloflow-cdn.pages.dev'].includes(window.location.origin)) {
    document.querySelectorAll('[data-pack-alias]').forEach(function (link) {
      var alias = String(link.dataset.packAlias || '');
      if (/^[A-Za-z0-9_-]+$/.test(alias)) link.href = '/p/' + alias;
    });
  }
  document.querySelectorAll('[data-copy-pack]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', async function () {
      var container = button.closest('.pack-version');
      var fallback = container ? container.querySelector('.pack-copy-fallback') : null;
      var copyValue = String(button.dataset.copyPack || '').trim();
      if (!isSafeCopyUrl(copyValue)) {
        if (fallback) fallback.hidden = true;
        setStatus('This pack link is unavailable.');
        return;
      }
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(copyValue);
        if (fallback) fallback.hidden = true;
        setStatus('Pack link copied.');
      } catch (_) {
        if (fallback) {
          fallback.hidden = false;
          var input = fallback.querySelector('input');
          if (input) {
            input.value = copyValue;
            if (!input.dataset.escBound) {
              input.dataset.escBound = '1';
              input.addEventListener('keydown', function (ev) {
                if (ev.isComposing || ev.keyCode === 229) return;
                if (ev.key === 'Escape') {
                  ev.preventDefault();
                  fallback.hidden = true;
                  button.focus();
                }
              });
            }
            input.focus();
            input.select();
          }
        }
        setStatus('Select and copy the link below the pack.');
      }
    });
  });
  document.querySelectorAll('[data-pack-download]').forEach(function (link) {
    link.addEventListener('click', async function (event) {
      event.preventDefault();
      if (link.getAttribute('aria-busy') === 'true') return;
      link.setAttribute('aria-busy', 'true');
      setStatus('Preparing the JSON download…');
      async function readPack(url) {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 20000) : null;
        try {
          var MAX_PACK_BYTES = 25 * 1024 * 1024;
          var init = { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error' };
          if (ctrl) init.signal = ctrl.signal;
          var response = await fetch(url, init);
          if (!response.ok) throw new Error('Download unavailable');
          var lenHdr = Number(response.headers && response.headers.get && response.headers.get('content-length'));
          if (Number.isFinite(lenHdr) && lenHdr > MAX_PACK_BYTES) throw new Error('Pack exceeds maximum size');
          var bytes;
          if (response.body && typeof response.body.getReader === 'function') {
            var reader = response.body.getReader();
            var chunks = [], total = 0, completed = false;
            try {
              while (true) {
                var step = await reader.read();
                if (step.done) { completed = true; break; }
                var val = ArrayBuffer.isView(step.value)
                  ? new Uint8Array(step.value.buffer, step.value.byteOffset, step.value.byteLength)
                  : new Uint8Array(step.value);
                total += val.byteLength;
                if (total > MAX_PACK_BYTES) {
                  try { await reader.cancel(); } catch (_) {}
                  throw new Error('Pack exceeds maximum size');
                }
                chunks.push(val);
              }
            } finally {
              if (!completed) { try { Promise.resolve(reader.cancel()).catch(function () {}); } catch (_) {} }
              try { reader.releaseLock(); } catch (_) {}
            }
            var combined = new Uint8Array(total);
            var offset = 0;
            for (var ci = 0; ci < chunks.length; ci++) {
              combined.set(chunks[ci], offset);
              offset += chunks[ci].byteLength;
            }
            bytes = combined.buffer;
          } else {
            bytes = await response.arrayBuffer();
            if (bytes.byteLength > MAX_PACK_BYTES) throw new Error('Pack exceeds maximum size');
          }
          var pack = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''), function (k, v) {
            return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
          });
          if (!pack || typeof pack !== 'object' || Array.isArray(pack) || !pack.allopack || typeof pack.allopack !== 'object' || Array.isArray(pack.allopack) || !Array.isArray(pack.history)) throw new Error('The response is not an AlloPack');
          return bytes;
        } finally {
          if (timer !== null) clearTimeout(timer);
        }
      }
      try {
        var bytes;
        try {
          if (!isSameOriginHttpUrl(link.href)) throw new Error('Untrusted download origin');
          bytes = await readPack(link.href);
        } catch (primaryErr) {
          if (primaryErr && primaryErr.message === 'Pack exceeds maximum size') throw primaryErr;
          var relPath = String(link.dataset.packDownload || '').replace(/^\/+/, '');
          if (!/^allopacks\/[A-Za-z0-9_./-]+\.json$/.test(relPath) || relPath.indexOf('..') !== -1 || relPath.indexOf('//') !== -1) throw new Error('Invalid pack path');
          bytes = await readPack('https://raw.githubusercontent.com/Apomera/AlloFlow/main/' + relPath);
        }
        var safeDownload = String(link.download || 'allopack.json').replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 120) || 'allopack.json';
        var blobUrl = URL.createObjectURL(new Blob([bytes], {type:'application/json'}));
        var anchor = document.createElement('a');
        try {
          anchor.href = blobUrl; anchor.download = safeDownload;
          document.body.appendChild(anchor); anchor.click();
        } finally {
          if (anchor.parentNode) anchor.remove();
          setTimeout(function () { try { URL.revokeObjectURL(blobUrl); } catch (_) {} }, 1000);
        }
        setStatus('JSON download started. Use Load Project in AlloFlow to open it.');
      } catch (_) { setStatus('The download could not be prepared. Please try again.'); }
      finally { link.removeAttribute('aria-busy'); }
    });
  });
}());
