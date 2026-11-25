// Controller for packets-packs.html (Remixable OER Starter Packet Library).
// Zero network, zero cookies, zero markup strings, deterministic in-browser packet assembly.
(function () {
  'use strict';

  var TRY_PAGE = 'packets-try.html';
  var $ = function (id) { return document.getElementById(id); };
  var catalog = null;
  var activePreviewSession = null;
  var activePreviewUrl = '';
  var highlightedPackId = '';

  var filters = {
    subject: 'All',
    gradeBand: 'All',
    features: [],
    query: '',
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fileSize(bytes) {
    if (!(bytes > 0)) return '0 KB';
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function showStatus(msg) {
    var box = $('pack-action-status');
    if (!box) return;
    box.textContent = msg || '';
    box.hidden = !msg;
  }

  function clearPreview() {
    if (activePreviewSession && typeof activePreviewSession.stop === 'function') {
      try { activePreviewSession.stop(); } catch (_) {}
    }
    activePreviewSession = null;
    if (activePreviewUrl) {
      try { URL.revokeObjectURL(activePreviewUrl); } catch (_) {}
      activePreviewUrl = '';
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
  }

  function hasActiveFilters() {
    return filters.subject !== 'All' || filters.gradeBand !== 'All' || filters.features.length > 0 || !!filters.query.trim();
  }

  function populateSelect(sel, values, allLabel) {
    sel.textContent = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'All';
    allOpt.textContent = allLabel;
    sel.appendChild(allOpt);
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  function drawPathways() {
    var grid = $('pathway-grid');
    if (!grid || !catalog || !Array.isArray(catalog.SCOPE_PATHWAYS)) return;
    grid.textContent = '';
    catalog.SCOPE_PATHWAYS.forEach(function (pw) {
      var card = el('article', 'pathway-card');
      card.setAttribute('data-pathway-id', pw.id);
      card.appendChild(el('p', 'pathway-title', pw.label));
      if (pw.standards) card.appendChild(el('p', 'pathway-std', pw.standards));
      card.appendChild(el('p', 'pathway-focus', pw.focus));
      var row = el('div', 'pathway-actions');
      var btn = el('button', 'btn btn-primary btn-small', 'Show ' + pw.gradeBand + ' packs');
      btn.type = 'button';
      btn.setAttribute('data-apply-pathway', pw.gradeBand);
      btn.addEventListener('click', function () {
        filters.subject = 'All';
        filters.gradeBand = pw.gradeBand;
        filters.features = [];
        filters.query = '';
        if ($('f-subject')) $('f-subject').value = 'All';
        if ($('f-grade')) $('f-grade').value = pw.gradeBand;
        if ($('f-search')) $('f-search').value = '';
        drawFeaturePills();
        drawGrid();
        showStatus('Filtered starter library to suggested ' + pw.label + ' pathway (student files stay grade-label free).');
      });
      row.appendChild(btn);
      if (pw.benchmarkLink && pw.benchmarkLink.href) {
        var bm = el('a', 'btn btn-small', pw.benchmarkLink.label);
        bm.href = pw.benchmarkLink.href;
        row.appendChild(bm);
      }
      card.appendChild(row);
      grid.appendChild(card);
    });
  }

  function drawFeaturePills() {
    var box = $('feature-pills');
    if (!box) return;
    catalog.FEATURES.forEach(function (feat) {
      var active = filters.features.indexOf(feat) >= 0;
      var probeFeatures = active ? filters.features.slice() : filters.features.concat([feat]);
      var matchCount = catalog.filterPacks({
        subject: filters.subject,
        gradeBand: filters.gradeBand,
        features: probeFeatures,
        query: filters.query,
      }).length;
      var existing = box.querySelector('[data-feature="' + feat.replace(/"/g, '\\"') + '"]');
      if (existing) {
        existing.setAttribute('aria-pressed', active ? 'true' : 'false');
        var cntNode = existing.querySelector('.pill-count');
        if (cntNode) cntNode.textContent = '(' + matchCount + ')';
        return;
      }
      var btn = el('button', 'feature-pill');
      btn.type = 'button';
      btn.setAttribute('data-feature', feat);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.appendChild(document.createTextNode(feat));
      btn.appendChild(el('span', 'pill-count', '(' + matchCount + ')'));
      btn.addEventListener('click', function () {
        var idx = filters.features.indexOf(feat);
        if (idx >= 0) filters.features.splice(idx, 1);
        else filters.features.push(feat);
        drawFeaturePills();
        drawGrid();
      });
      box.appendChild(btn);
    });
  }

  function buildFilterUrl() {
    var parts = [];
    if (filters.subject !== 'All') parts.push('subject=' + encodeURIComponent(filters.subject));
    if (filters.gradeBand !== 'All') parts.push('grade=' + encodeURIComponent(filters.gradeBand));
    if (filters.features.length) parts.push('feature=' + encodeURIComponent(filters.features.join(',')));
    var q = filters.query.trim();
    if (q) parts.push('q=' + encodeURIComponent(q));
    var base = String((window.location && window.location.href) || 'packets-packs.html').split('#')[0];
    return parts.length ? (base + '#' + parts.join('&')) : base;
  }

  function buildPackUrl(packId) {
    var base = String((window.location && window.location.href) || 'packets-packs.html').split('#')[0];
    return base + '#pack=' + encodeURIComponent(String(packId || ''));
  }

  function copyPackLink(pack) {
    var url = buildPackUrl(pack.id);
    var fallback = function () { showStatus('Direct link ready to copy: ' + url); };
    try {
      if (window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
        window.navigator.clipboard.writeText(url).then(function () {
          showStatus('Copied direct link for "' + pack.title + '" to clipboard.');
        }, fallback);
      } else {
        fallback();
      }
    } catch (_) { fallback(); }
  }

  function applyHashFilters() {
    var raw = String((window.location && window.location.hash) || '').replace(/^#/, '').trim();
    if (!raw) return false;
    var applied = false;
    var nextSubject = 'All';
    var nextGrade = 'All';
    var nextFeatures = [];
    var nextQuery = '';
    var nextPack = '';
    raw.split('&').forEach(function (pair) {
      var eq = pair.indexOf('=');
      if (eq <= 0) return;
      var key = pair.slice(0, eq).trim().toLowerCase();
      var val = '';
      try { val = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' ')).trim(); } catch (_) { val = ''; }
      if (!val) return;
      if (key === 'pack') {
        var found = catalog.PACKS.filter(function (p) { return p.id === val; })[0];
        if (found) { nextPack = found.id; applied = true; }
      } else if (key === 'subject' && catalog.SUBJECTS.indexOf(val) >= 0) { nextSubject = val; applied = true; }
      else if (key === 'grade' && catalog.GRADE_BANDS.indexOf(val) >= 0) { nextGrade = val; applied = true; }
      else if (key === 'feature' || key === 'features') {
        val.split(',').forEach(function (item) {
          var clean = item.trim();
          if (catalog.FEATURES.indexOf(clean) >= 0 && nextFeatures.indexOf(clean) < 0) {
            nextFeatures.push(clean);
            applied = true;
          }
        });
      } else if (key === 'q' || key === 'search') {
        nextQuery = val.slice(0, 60);
        applied = true;
      }
    });
    if (!applied) return false;
    highlightedPackId = nextPack;
    if (nextPack) {
      nextSubject = 'All';
      nextGrade = 'All';
      nextFeatures = [];
      nextQuery = '';
    }
    filters.subject = nextSubject;
    filters.gradeBand = nextGrade;
    filters.features = nextFeatures;
    filters.query = nextQuery;
    if ($('f-subject')) $('f-subject').value = nextSubject;
    if ($('f-grade')) $('f-grade').value = nextGrade;
    if ($('f-search')) $('f-search').value = nextQuery;
    return true;
  }

  function encodeUtf8Buffer(text) {
    if (typeof TextEncoder === 'function') {
      var u8 = new TextEncoder().encode(String(text || ''));
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }
    var str = String(text || '');
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out.buffer;
  }

  function customizePack(pack, event) {
    var handoff = window.AlloPacketHandoff;
    if (pack.draft && handoff && typeof handoff.redirectDraft === 'function') {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      showStatus('Handing "' + pack.title + '" over to ' + pack.makerName + '...');
      handoff.redirectDraft(pack.draft, pack.makerHref).catch(function () {
        window.location.href = pack.makerHref;
      });
      return;
    }
    if (pack.directDownload && handoff && typeof handoff.redirect === 'function') {
      if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button)) return;
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      try {
        var built = catalog.buildPackFile(pack);
        showStatus('Handing "' + pack.title + '" over to ' + pack.makerName + '...');
        handoff.redirect({ name: built.name, bytes: encodeUtf8Buffer(built.html) }, pack.makerHref, handoff.HASH || '#open-file').catch(function () {
          window.location.href = pack.makerHref;
        });
        return;
      } catch (_) {}
    }
    if (!event) window.location.href = pack.makerHref;
  }

  function downloadPack(pack) {
    try {
      var built = catalog.buildPackFile(pack);
      downloadBlob(new Blob([built.html], { type: 'text/html;charset=utf-8' }), built.name);
      showStatus('Saved ' + built.name + ' (' + fileSize(built.bytes) + '). Send this single offline file to students or open it in ' + pack.makerName + ' to customize.');
    } catch (err) {
      showStatus((err && err.message) || 'Could not build that starter packet.');
    }
  }

  function slugPart(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
  }

  function buildZipName(directCount) {
    var parts = [];
    if (filters.subject !== 'All') parts.push(slugPart(filters.subject));
    if (filters.gradeBand !== 'All') parts.push(slugPart(filters.gradeBand));
    if (filters.features.length) {
      parts.push(filters.features.slice(0, 2).map(slugPart).filter(Boolean).join('-'));
    }
    if (filters.query.trim()) parts.push(slugPart(filters.query.trim()));
    parts = parts.filter(Boolean);
    if (!parts.length) return 'alloflow-starter-packs__all-' + directCount + '.zip';
    return 'alloflow-starter-packs__' + parts.join('__') + '.zip';
  }

  function concatZipParts(parts) {
    var total = 0;
    for (var i = 0; i < parts.length; i++) total += parts[i].byteLength;
    var out = new Uint8Array(total), pos = 0;
    for (var j = 0; j < parts.length; j++) {
      var chunk = parts[j] instanceof Uint8Array ? parts[j] : new Uint8Array(parts[j]);
      out.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return out.buffer;
  }

  function buildFilteredZipBundle() {
    var matches = catalog.filterPacks(filters);
    var direct = matches.filter(function (p) { return p.directDownload; });
    var draftOnly = matches.filter(function (p) { return !p.directDownload; });
    if (!direct.length) {
      showStatus('No direct-download packs match the current filters.');
      return null;
    }
    var zipApi = window.AlloPacketZip;
    if (!zipApi || typeof zipApi.create !== 'function') {
      showStatus('ZIP bundler did not load. Download individual packs below or reload this page.');
      return null;
    }
    var zip = zipApi.create();
    var added = [];
    direct.forEach(function (pack) {
      var built = catalog.buildPackFile(pack);
      zip.add(built.name, built.html);
      added.push({ name: built.name, pack: pack });
    });
    var filterNotes = [];
    if (filters.subject !== 'All') filterNotes.push('Subject: ' + filters.subject);
    if (filters.gradeBand !== 'All') filterNotes.push('Suggested grade band: ' + filters.gradeBand);
    if (filters.features.length) filterNotes.push('Features: ' + filters.features.join(', '));
    if (filters.query.trim()) filterNotes.push('Keywords: ' + filters.query.trim());
    var readme = [
      'AlloFlow Packets - Offline Starter Pack Bundle',
      '==============================================',
      '',
      'Included direct-download student files: ' + added.length,
      'Filters: ' + (filterNotes.length ? filterNotes.join(' | ') : 'All direct-download starter packs'),
      '',
      'How to use these files:',
      '- Every .html file runs completely offline in Chrome, Edge, Safari, or Firefox.',
      '- Zero AI, no accounts, no cookies, and no internet connections inside the student files.',
      '- Student files stay grade-label free; suggested grade bands below are for teacher planning only.',
      '- Inspect any file on packets-verify.html ("Look inside a file") or reopen it in its maker to customize.',
      '',
      'Included student files:',
    ];
    added.forEach(function (entry, idx) {
      var p = entry.pack;
      readme.push((idx + 1) + '. ' + entry.name + ' - ' + p.title + ' (' + p.makerName + '; ' + p.subject + '; typical Grades ' + p.gradeBand + (p.standards ? '; ' + p.standards : '') + ')');
      if (Array.isArray(p.features) && p.features.length) {
        readme.push('   Features: ' + p.features.join(', '));
      }
    });
    if (draftOnly.length) {
      readme.push('');
      readme.push('Matched maker-only starter drafts (not bundled as standalone .html because recordings or pictures are chosen in the maker):');
      draftOnly.forEach(function (p) {
        readme.push('- ' + p.title + ' -> open ' + p.makerName + ' (' + p.makerHref + ')');
      });
    }
    zip.add('README-starter-packs.txt', readme.join('\r\n') + '\r\n');
    var parts = zip.finish();
    return {
      parts: parts,
      bytes: zip.bytes,
      zipName: buildZipName(added.length),
      direct: direct,
      draftOnly: draftOnly,
    };
  }

  function downloadFilteredZip() {
    try {
      var bundle = buildFilteredZipBundle();
      if (!bundle) return;
      downloadBlob(new Blob(bundle.parts, { type: 'application/zip' }), bundle.zipName);
      var msg = 'Saved ' + bundle.zipName + ' (' + fileSize(bundle.bytes) + ') with ' + bundle.direct.length + ' offline student ' + (bundle.direct.length === 1 ? 'file' : 'files') + ' and README-starter-packs.txt.';
      if (bundle.draftOnly.length) {
        msg += ' ' + bundle.draftOnly.length + ' maker-only draft ' + (bundle.draftOnly.length === 1 ? 'pack was' : 'packs were') + ' listed in the README.';
      }
      showStatus(msg);
    } catch (err) {
      showStatus((err && err.message) || 'Could not build the starter pack ZIP.');
    }
  }

  function sealFilteredZip() {
    var handoff = window.AlloPacketHandoff;
    try {
      var bundle = buildFilteredZipBundle();
      if (!bundle) return;
      if (!handoff || typeof handoff.redirect !== 'function') {
        downloadBlob(new Blob(bundle.parts, { type: 'application/zip' }), bundle.zipName);
        showStatus('Saved ' + bundle.zipName + '. Drop it on Collect by sealed QR (packets-qr.html) to attach your class key.');
        return;
      }
      showStatus('Handing ' + bundle.direct.length + ' ' + (bundle.direct.length === 1 ? 'pack' : 'packs') + ' over to Collect by sealed QR...');
      handoff.redirect({ name: bundle.zipName, bytes: concatZipParts(bundle.parts) }, 'packets-qr.html', '#seal-batch').catch(function () {
        downloadBlob(new Blob(bundle.parts, { type: 'application/zip' }), bundle.zipName);
        showStatus('Saved ' + bundle.zipName + '. Drop it on Collect by sealed QR (packets-qr.html) to attach your class key.');
      });
    } catch (err) {
      showStatus((err && err.message) || 'Could not prepare the starter packs for Collect by sealed QR.');
    }
  }

  function previewPack(pack) {
    try {
      clearPreview();
      var built = catalog.buildPackFile(pack);
      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        activePreviewUrl = URL.createObjectURL(new Blob([built.html], { type: 'text/html;charset=utf-8' }));
        if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.hostPreview === 'function') {
          activePreviewSession = window.AlloPacketHandoff.hostPreview({ url: activePreviewUrl, html: built.html });
        }
        window.open(TRY_PAGE + '#' + activePreviewUrl, '_blank', 'noopener');
        showStatus('Opened preview for "' + pack.title + '" in a new tab.');
      }
    } catch (err) {
      showStatus((err && err.message) || 'Could not open preview.');
    }
  }

  function drawGrid() {
    var matches = catalog.filterPacks(filters);
    var total = catalog.PACKS.length;
    var countEl = $('packs-count');
    if (countEl) {
      countEl.textContent = 'Showing ' + matches.length + ' of ' + total + ' starter ' + (total === 1 ? 'pack' : 'packs') + '.';
    }
    var clearBtn = $('btn-clear-filters');
    var copyBtn = $('btn-copy-filter-link');
    var zipBtn = $('btn-download-zip');
    var sealBtn = $('btn-seal-zip');
    var active = hasActiveFilters();
    var directCount = matches.filter(function (p) { return p.directDownload; }).length;
    if (zipBtn) {
      zipBtn.disabled = directCount === 0;
      zipBtn.textContent = directCount
        ? ('Download ' + directCount + ' ' + (directCount === 1 ? 'pack' : 'packs') + ' (.zip)')
        : 'No direct packs to zip';
    }
    if (sealBtn) {
      sealBtn.disabled = directCount === 0;
      sealBtn.textContent = directCount
        ? ('Seal ' + directCount + ' ' + (directCount === 1 ? 'pack' : 'packs') + ' with QR')
        : 'Seal filtered packs with QR';
    }
    if (copyBtn) copyBtn.disabled = !active;
    if (clearBtn) {
      var hadFocus = document.activeElement === clearBtn;
      clearBtn.disabled = !active;
      if (!active && hadFocus && $('f-subject')) {
        try { $('f-subject').focus(); } catch (_) {}
      }
    }

    var grid = $('packs-grid');
    var empty = $('packs-empty');
    grid.textContent = '';
    empty.hidden = matches.length > 0;

    var highlightedNode = null;
    var highlightedPack = null;
    matches.forEach(function (pack) {
      var isHighlighted = !!highlightedPackId && pack.id === highlightedPackId;
      var card = el('article', 'pack-card' + (isHighlighted ? ' is-highlighted' : ''));
      card.setAttribute('data-pack-id', pack.id);
      if (isHighlighted) {
        card.setAttribute('data-pack-highlighted', 'true');
        highlightedNode = card;
        highlightedPack = pack;
      }

      var meta = el('div', 'pack-meta');
      meta.appendChild(el('span', 'pack-tag', pack.subject));
      meta.appendChild(el('span', '', 'Typical: Grades ' + pack.gradeBand));
      meta.appendChild(el('span', '', '\u00b7 ' + pack.makerName));
      if (pack.standards) meta.appendChild(el('span', 'pack-std', pack.standards));
      card.appendChild(meta);

      card.appendChild(el('h3', 'pack-title', pack.title));
      card.appendChild(el('p', 'pack-summary', pack.summary));

      var featUl = el('ul', 'pack-features');
      featUl.setAttribute('aria-label', 'Included features');
      pack.features.forEach(function (ft) {
        featUl.appendChild(el('li', 'pack-feat', ft));
      });
      card.appendChild(featUl);

      if (!pack.directDownload && pack.handoffReason) {
        card.appendChild(el('p', 'pack-note', pack.handoffReason));
      }

      var actions = el('div', 'pack-actions');
      if (pack.directDownload) {
        var dlBtn = el('button', 'btn btn-primary btn-small', 'Download Student File (.html)');
        dlBtn.type = 'button';
        dlBtn.setAttribute('data-pack-download', pack.id);
        dlBtn.addEventListener('click', function () { downloadPack(pack); });
        actions.appendChild(dlBtn);

        var tryBtn = el('button', 'btn btn-small', 'Try it');
        tryBtn.type = 'button';
        tryBtn.setAttribute('data-pack-try', pack.id);
        tryBtn.addEventListener('click', function () { previewPack(pack); });
        actions.appendChild(tryBtn);
      }

      if (pack.draft) {
        var custBtn = el('button', pack.directDownload ? 'btn btn-small' : 'btn btn-primary btn-small', 'Customize in ' + pack.makerName);
        custBtn.type = 'button';
        custBtn.setAttribute('data-pack-customize', pack.id);
        custBtn.addEventListener('click', function () { customizePack(pack); });
        actions.appendChild(custBtn);
      } else {
        var link = el('a', 'btn btn-small', 'Customize in ' + pack.makerName);
        link.href = pack.makerHref;
        link.setAttribute('data-pack-customize', pack.id);
        if (pack.directDownload) {
          link.addEventListener('click', function (ev) { customizePack(pack, ev); });
        }
        actions.appendChild(link);
      }

      var copyLinkBtn = el('button', 'btn btn-text btn-small', 'Copy link');
      copyLinkBtn.type = 'button';
      copyLinkBtn.setAttribute('data-pack-copy-link', pack.id);
      copyLinkBtn.setAttribute('aria-label', 'Copy direct link for ' + pack.title);
      copyLinkBtn.addEventListener('click', function () { copyPackLink(pack); });
      actions.appendChild(copyLinkBtn);

      card.appendChild(actions);
      grid.appendChild(card);
    });

    if (highlightedNode && highlightedPack) {
      showStatus('Linked starter pack: "' + highlightedPack.title + '". Download it right away or customize it in ' + highlightedPack.makerName + '.');
      if (typeof highlightedNode.scrollIntoView === 'function') {
        try { highlightedNode.scrollIntoView({ block: 'center' }); } catch (_) {}
      }
    }
  }

  function wireEvents() {
    $('f-subject').addEventListener('change', function (e) { highlightedPackId = ''; filters.subject = e.target.value; drawFeaturePills(); drawGrid(); });
    $('f-grade').addEventListener('change', function (e) { highlightedPackId = ''; filters.gradeBand = e.target.value; drawFeaturePills(); drawGrid(); });
    $('f-search').addEventListener('input', function (e) { highlightedPackId = ''; filters.query = e.target.value; drawFeaturePills(); drawGrid(); });
    var zipBtn = $('btn-download-zip');
    if (zipBtn) {
      zipBtn.addEventListener('click', function () { downloadFilteredZip(); });
    }
    var sealBtn = $('btn-seal-zip');
    if (sealBtn) {
      sealBtn.addEventListener('click', function () { sealFilteredZip(); });
    }
    var copyBtn = $('btn-copy-filter-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = buildFilterUrl();
        var fallback = function () { showStatus('Filtered link ready to copy: ' + url); };
        try {
          if (window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
            window.navigator.clipboard.writeText(url).then(function () {
              showStatus('Copied filtered starter library link to clipboard.');
            }, fallback);
          } else {
            fallback();
          }
        } catch (_) { fallback(); }
      });
    }
    $('btn-clear-filters').addEventListener('click', function () {
      highlightedPackId = '';
      filters.subject = 'All';
      filters.gradeBand = 'All';
      filters.features = [];
      filters.query = '';
      $('f-subject').value = 'All';
      $('f-grade').value = 'All';
      $('f-search').value = '';
      drawFeaturePills();
      drawGrid();
    });
    window.addEventListener('hashchange', function () {
      if (applyHashFilters()) {
        drawFeaturePills();
        drawGrid();
      }
    });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    catalog = window.AlloPacketStarterPacks || null;
    $('loading').hidden = true;
    if (!catalog || !Array.isArray(catalog.PACKS)) {
      $('load-problem').hidden = false;
      return;
    }
    $('library').hidden = false;
    populateSelect($('f-subject'), catalog.SUBJECTS, 'All subjects');
    populateSelect($('f-grade'), catalog.GRADE_BANDS, 'All grade bands');
    applyHashFilters();
    drawPathways();
    drawFeaturePills();
    wireEvents();
    drawGrid();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
