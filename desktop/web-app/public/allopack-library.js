(function () {
  'use strict';
  var form = document.getElementById('pack-filters');
  if (!form) return;
  var topics = Array.from(document.querySelectorAll('.pack-topic'));
  var search = document.getElementById('pack-search');
  var subject = document.getElementById('pack-subject');
  var grade = document.getElementById('pack-grade');
  function normalize(text) { return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]/g, ' '); }
  function matchesGrade(value, wanted) {
    if (!wanted) return true;
    var numbers = String(value).match(/\d+/g) || [];
    return numbers.length > 1 ? Number(wanted) >= Number(numbers[0]) && Number(wanted) <= Number(numbers[1]) : numbers[0] === wanted;
  }
  function filter() {
    var terms = normalize(search.value).trim().split(/\s+/).filter(Boolean), count = 0, versions = 0;
    topics.forEach(function (topic) {
      var hay = normalize(topic.dataset.packSearch);
      topic.hidden = !terms.every(function (term) { return hay.indexOf(term) !== -1; }) || (subject.value && topic.dataset.packSubject !== subject.value) || !matchesGrade(topic.dataset.packGrade, grade.value);
      if (!topic.hidden) { count++; versions += topic.querySelectorAll('[data-pack-id]').length; }
    });
    var results = document.getElementById('pack-results');
    var countLabel = results.dataset.packCountLabel || 'pack versions';
    if (versions === 1) countLabel = countLabel === 'packs' ? 'pack' : 'pack version';
    results.textContent = count + ' of ' + topics.length + ' topics · ' + versions + ' ' + countLabel;
    document.getElementById('pack-empty').hidden = count !== 0;
  }
  form.hidden = false;
  form.addEventListener('input', filter);
  form.addEventListener('submit', function (event) { event.preventDefault(); filter(); });
  form.addEventListener('reset', function () { search.value = ''; subject.value = ''; grade.value = ''; filter(); });
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
      var fallback = button.closest('.pack-version').querySelector('.pack-copy-fallback');
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(button.dataset.copyPack);
        fallback.hidden = true;
        document.getElementById('pack-copy-status').textContent = 'Pack link copied.';
      } catch (_) {
        fallback.hidden = false;
        fallback.querySelector('input').focus();
        fallback.querySelector('input').select();
        document.getElementById('pack-copy-status').textContent = 'Select and copy the link below the pack.';
      }
    });
  });
  document.querySelectorAll('[data-pack-download]').forEach(function (link) {
    link.addEventListener('click', async function (event) {
      event.preventDefault();
      if (link.getAttribute('aria-busy') === 'true') return;
      link.setAttribute('aria-busy', 'true');
      var status = document.getElementById('pack-copy-status');
      status.textContent = 'Preparing the JSON download…';
      async function readPack(url) {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
        try {
          var init = { credentials: 'omit', referrerPolicy: 'no-referrer' };
          if (ctrl) init.signal = ctrl.signal;
          var response = await fetch(url, init);
          if (!response.ok) throw new Error('Download unavailable');
          var lenHdr = Number(response.headers && response.headers.get && response.headers.get('content-length'));
          if (Number.isFinite(lenHdr) && lenHdr > 25 * 1024 * 1024) throw new Error('Pack exceeds maximum size');
          var bytes = await response.arrayBuffer();
          if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Pack exceeds maximum size');
          var pack = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ''), function (k, v) {
            return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
          });
          if (!pack || typeof pack !== 'object' || Array.isArray(pack) || !pack.allopack || !Array.isArray(pack.history)) throw new Error('The response is not an AlloPack');
          return bytes;
        } finally {
          if (timer !== null) clearTimeout(timer);
        }
      }
      try {
        var bytes;
        try { bytes = await readPack(link.href); }
        catch (_) {
          var relPath = String(link.dataset.packDownload || '').replace(/^\/+/, '');
          if (!/^[A-Za-z0-9_./-]+\.json$/.test(relPath) || relPath.indexOf('..') !== -1) throw new Error('Invalid pack path');
          bytes = await readPack('https://raw.githubusercontent.com/Apomera/AlloFlow/main/' + relPath);
        }
        var safeDownload = String(link.download || 'allopack.json').replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '') || 'allopack.json';
        var blobUrl = URL.createObjectURL(new Blob([bytes], {type:'application/json'}));
        var anchor = document.createElement('a');
        try {
          anchor.href = blobUrl; anchor.download = safeDownload;
          document.body.appendChild(anchor); anchor.click();
        } finally {
          if (anchor.parentNode) anchor.remove();
          setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 1000);
        }
        status.textContent = 'JSON download started. Use Load Project in AlloFlow to open it.';
      } catch (_) { status.textContent = 'The download could not be prepared. Please try again.'; }
      finally { link.removeAttribute('aria-busy'); }
    });
  });
}());
