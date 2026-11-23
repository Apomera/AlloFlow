(function () {
  'use strict';
  var form = document.getElementById('pack-filters');
  if (!form) return;
  var topics = Array.from(document.querySelectorAll('.pack-topic'));
  var search = document.getElementById('pack-search');
  var subject = document.getElementById('pack-subject');
  var grade = document.getElementById('pack-grade');
  function normalize(text) { return String(text == null ? '' : text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]/g, ' '); }
  function matchesGrade(value, wanted) {
    if (!wanted) return true;
    var numbers = String(value == null ? '' : value).match(/\d+/g) || [];
    return numbers.length > 1 ? Number(wanted) >= Number(numbers[0]) && Number(wanted) <= Number(numbers[1]) : numbers[0] === wanted;
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
      return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin === window.location.origin;
    } catch (_) { return false; }
  }
  function filter() {
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
  }
  form.hidden = false;
  form.addEventListener('input', filter);
  form.addEventListener('change', filter);
  form.addEventListener('submit', function (event) { event.preventDefault(); filter(); });
  form.addEventListener('reset', function () {
    if (search) search.value = '';
    if (subject) subject.value = '';
    if (grade) grade.value = '';
    filter();
    setStatus('Filters cleared.');
  });
  if (search) {
    search.addEventListener('keydown', function (event) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape' && search.value) {
        event.preventDefault();
        search.value = '';
        filter();
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
            var chunks = [], total = 0;
            try {
              while (true) {
                var step = await reader.read();
                if (step.done) break;
                var val = step.value instanceof Uint8Array ? step.value : new Uint8Array(step.value);
                total += val.byteLength;
                if (total > MAX_PACK_BYTES) {
                  try { await reader.cancel(); } catch (_) {}
                  throw new Error('Pack exceeds maximum size');
                }
                chunks.push(val);
              }
            } finally {
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
          var pack = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ''), function (k, v) {
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
        } catch (_) {
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
