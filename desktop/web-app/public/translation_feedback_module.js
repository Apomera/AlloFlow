/**
 * AlloFlow Translation Feedback Module
 *
 * Lets multilingual users (teachers/students viewing the app in their own
 * language) suggest a correction to a translated string and send it to the
 * maintainers — the SAME way a bug report is sent (a pre-filled Google Form
 * opened in a new tab for review; no backend, no silent fetch). Reuses the
 * exact form + technique from error_reporter_module.js.
 *
 * Why this exists: automation got the packs machine-clean (no broken Spanglish,
 * placeholders intact). What's left is native-speaker judgment — register,
 * idiom, dialect, a word that's technically-right-but-wrong-here. Only a fluent
 * user catches that, and only in context. This gives them a one-click channel,
 * and emits a STRUCTURED payload (language + key + current + suggestion) so the
 * fix flows back through dev-tools/i18n/ingest_translation_feedback.cjs almost
 * exactly like a bug fix.
 *
 * Discovery: rides help-mode. When help-mode (the "?" layer) is on and the user
 * clicks a string with a help tooltip, AlloFlowContent calls
 *   window.AlloModules.TranslationFeedback.offerFor({key, current, language})
 * which shows a small, dismissible "✎ Suggest a better translation" pill. The
 * pill opens an accessible modal pre-filled with that string's context. (If the
 * module isn't loaded, the host's try/catch makes the hook a no-op — the app is
 * unchanged.)
 *
 * Plain DOM, no React dep — works even if React fails, and inside Canvas embeds.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.TranslationFeedback) {
    console.log('[TranslationFeedback] Already loaded, skipping');
    return;
  }
  window.AlloModules = window.AlloModules || {};

  // ── Google Form config — SAME form as error_reporter_module.js ──
  var FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform?usp=pp_url';
  var ENTRY_TYPE    = '640908447';   // Type of Issue (add "Translation Correction" option to the form)
  var ENTRY_WHAT    = '234547532';   // What happened? — we put the machine-parseable correction block here
  var ENTRY_STEPS   = '1969020676';  // Steps / notes — user's free-text reason + URL
  var ENTRY_BROWSER = '937961519';   // Browser & Device

  // Primary submit path: the SAME Cloudflare Worker that accepts community lesson submissions
  // (catalog/cloudflare-worker), new /submitTranslation route → commits to translations/pending/
  // in the repo. If the worker is unreachable (e.g. not yet deployed), we fall back to the
  // pre-filled Google Form so the user's input is never lost.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submitTranslation';

  var lastContext = null;   // {key, current, language}
  var pill = null, overlay = null;
  var pillHideTimer = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function currentLanguage(ctx) {
    if (ctx && ctx.language) return ctx.language;
    try { if (window.__alloTextLanguage) return window.__alloTextLanguage; } catch (_) {}
    return 'English';
  }

  // ── Build the pre-filled Google Form URL (mirrors error_reporter technique) ──
  function buildFormUrl(payload) {
    // Machine-parseable block for dev-tools/i18n/ingest_translation_feedback.cjs.
    // Stable delimiters so the ingest regex is robust to user edits around it.
    var what =
      '[AlloFlow Translation Correction]\n' +
      'language: ' + payload.language + '\n' +
      'key: ' + (payload.key || '(unknown — see "current" text)') + '\n' +
      'current: ' + payload.current + '\n' +
      'suggested: ' + payload.suggested + '\n' +
      'english: ' + (payload.english || '(n/a)');
    var steps = (payload.note ? payload.note + '\n\n' : '') + 'URL: ' + (location.href || '').slice(0, 300);
    var browser = navigator.userAgent + ' · viewport ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?');
    return FORM_BASE +
      '&entry.' + ENTRY_TYPE    + '=' + encodeURIComponent('Translation Correction') +
      '&entry.' + ENTRY_WHAT    + '=' + encodeURIComponent(what.slice(0, 8000)) +
      '&entry.' + ENTRY_STEPS   + '=' + encodeURIComponent(steps.slice(0, 3000)) +
      '&entry.' + ENTRY_BROWSER + '=' + encodeURIComponent(browser.slice(0, 500));
  }

  // ── English-source lookup (lazy; fetched from the same public source the app uses) ──
  var EN = null, EN_LOADING = false;
  var EN_CACHE_KEY = 'alloflow_ui_strings_cache';
  function flatten(obj, prefix, out) {
    out = out || {}; prefix = prefix || '';
    if (!obj || typeof obj !== 'object') return out;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k], f = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, f, out);
      else if (typeof v === 'string') out[f] = v;
    }
    return out;
  }
  function loadEnglish() {
    if (EN || EN_LOADING) return;
    EN_LOADING = true;
    try {
      var cached = localStorage.getItem(EN_CACHE_KEY);
      if (cached) { EN = flatten(JSON.parse(cached)); return; }
    } catch (_) {}
    try {
      fetch('https://raw.githubusercontent.com/Apomera/AlloFlow/main/ui_strings.js')
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          var j = txt.replace(/^[^{]*/, '').replace(/;?\s*$/, '');
          EN = flatten(JSON.parse(j));
        })
        .catch(function () {});
    } catch (_) {}
  }
  function englishFor(key) {
    if (!key || !EN) return '';
    return EN[key] || '';
  }

  // ── The "✎ Suggest a better translation" pill (shown by offerFor during help-mode) ──
  function ensurePill() {
    if (pill) return;
    pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'allo-tfb-pill';
    pill.setAttribute('aria-label', 'Suggest a better translation for the item you just opened');
    pill.style.cssText = [
      'position:fixed', 'bottom:64px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:2147483646', 'padding:8px 16px', 'border-radius:999px',
      'background:#0f766e', 'color:#fff', 'border:2px solid #fff',
      'font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.3)',
      'display:none', 'align-items:center', 'gap:6px'
    ].join(';');
    pill.onclick = function () { hidePill(); openModal(lastContext); };
    pill.onkeydown = function (ev) { if (ev.key === 'Escape') hidePill(); };
    document.body.appendChild(pill);
  }
  function hidePill() { if (pill) pill.style.display = 'none'; if (pillHideTimer) { clearTimeout(pillHideTimer); pillHideTimer = null; } }

  // Public: called from the host's help-mode click handler.
  function offerFor(ctx) {
    if (!ctx || !document.body) return;
    lastContext = { key: ctx.key || '', current: ctx.current || '', language: currentLanguage(ctx) };
    loadEnglish();
    ensurePill();
    pill.textContent = '✎ Suggest a better ' + lastContext.language + ' translation';
    pill.style.display = 'inline-flex';
    if (pillHideTimer) clearTimeout(pillHideTimer);
    pillHideTimer = setTimeout(hidePill, 15000); // auto-dismiss; non-nagging
  }

  // ── The modal ──
  function openModal(ctx) {
    ctx = ctx || lastContext || { key: '', current: '', language: currentLanguage(null) };
    closeModal();
    var lang = currentLanguage(ctx);
    var english = englishFor(ctx.key);
    overlay = document.createElement('div');
    overlay.id = 'allo-tfb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Suggest a translation correction');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'background:rgba(0,0,0,0.5)',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:16px'
    ].join(';');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    var keyRow = ctx.key
      ? '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">String ID</div>' +
        '<div style="font:12px ui-monospace,Menlo,Consolas,monospace;color:#0f172a;background:#f1f5f9;border-radius:6px;padding:6px 8px;margin-bottom:10px;word-break:break-all">' + esc(ctx.key) + '</div>'
      : '';
    var enRow = english
      ? '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">English (source)</div>' +
        '<div style="font:13px system-ui;color:#334155;background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:10px">' + esc(english) + '</div>'
      : '';
    var curRow = ctx.current
      ? '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Current ' + esc(lang) + '</div>' +
        '<div style="font:13px system-ui;color:#334155;background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:10px">' + esc(ctx.current) + '</div>'
      : '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">The text you want corrected</div>' +
        '<textarea id="allo-tfb-current" rows="2" placeholder="Paste the exact text as it appears in the app" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>';

    var panel = document.createElement('div');
    panel.style.cssText = [
      'background:#fff', 'border-radius:12px', 'max-width:520px', 'width:100%',
      'max-height:90vh', 'overflow:auto', 'padding:20px', 'box-shadow:0 20px 60px rgba(0,0,0,0.35)'
    ].join(';');
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:12px">' +
        '<h2 style="margin:0;font:700 17px system-ui;color:#0f172a">✎ Suggest a translation fix</h2>' +
        '<button id="allo-tfb-x" type="button" aria-label="Close" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#64748b">×</button>' +
      '</div>' +
      '<p style="margin:0 0 14px;font:13px/1.5 system-ui;color:#475569">Spotted a word that’s awkward, wrong, or unnatural in <strong>' + esc(lang) + '</strong>? Suggest a better version. It opens a short form for you to review before sending — the same way bug reports are sent.</p>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Language</div>' +
      '<input id="allo-tfb-lang" type="text" value="' + esc(lang) + '" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px" />' +
      keyRow + enRow + curRow +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Your suggested ' + esc(lang) + ' translation <span style="color:#dc2626">*</span></div>' +
      '<textarea id="allo-tfb-suggest" rows="3" placeholder="Type the corrected text" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Why / notes (optional)</div>' +
      '<textarea id="allo-tfb-note" rows="2" placeholder="e.g. wrong register, regional word, sounds robotic" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:14px"></textarea>' +
      '<div id="allo-tfb-err" role="alert" style="display:none;color:#dc2626;font:13px system-ui;margin-bottom:10px"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="allo-tfb-cancel" type="button" style="padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:600 13px system-ui;cursor:pointer">Cancel</button>' +
        '<button id="allo-tfb-send" type="button" style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Open report form →</button>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var $ = function (id) { return panel.querySelector('#' + id); };
    $('allo-tfb-x').onclick = closeModal;
    $('allo-tfb-cancel').onclick = closeModal;
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    function showThanks(viaForm) {
      panel.innerHTML =
        '<div style="text-align:center;padding:12px">' +
          '<div style="font-size:34px" aria-hidden="true">🌍</div>' +
          '<h2 style="margin:8px 0;font:700 17px system-ui;color:#0f172a">Thank you!</h2>' +
          '<p style="margin:0 0 16px;font:13px/1.5 system-ui;color:#475569">' +
            (viaForm
              ? 'Your suggestion opened in a form in a new tab — submit it there to send it for review.'
              : 'Your ' + esc(lang) + ' suggestion was sent for review. Maintainers apply accepted fixes to the language pack.') +
          '</p>' +
          '<button id="allo-tfb-done" type="button" style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Done</button>' +
        '</div>';
      var done = panel.querySelector('#allo-tfb-done');
      done.onclick = closeModal; done.focus();
    }

    $('allo-tfb-send').onclick = function () {
      var errEl = $('allo-tfb-err');
      var suggested = ($('allo-tfb-suggest').value || '').trim();
      if (!suggested) { errEl.textContent = 'Please enter your suggested translation.'; errEl.style.display = 'block'; return; }
      var curEl = panel.querySelector('#allo-tfb-current');
      var payload = {
        language: ($('allo-tfb-lang').value || lang).trim(),
        key: ctx.key || '',
        current: ctx.current || (curEl ? (curEl.value || '').trim() : ''),
        suggested: suggested,
        english: english,
        note: ($('allo-tfb-note').value || '').trim()
      };
      var sendBtn = $('allo-tfb-send');
      sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; errEl.style.display = 'none';
      var fellBack = false;
      var fallbackToForm = function () {
        if (fellBack) return; fellBack = true;
        try { window.open(buildFormUrl(payload), '_blank', 'noopener'); } catch (_) { location.href = buildFormUrl(payload); }
        showThanks(true);
      };
      try {
        fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) { if (res.ok && res.j && res.j.ok) showThanks(false); else fallbackToForm(); })
          .catch(function () { fallbackToForm(); });
      } catch (_) { fallbackToForm(); }
    };
    var first = $('allo-tfb-suggest'); if (first) first.focus();
  }

  function closeModal() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }

  window.AlloModules.TranslationFeedback = {
    offerFor: offerFor,         // host help-mode hook calls this
    openModal: openModal,       // open directly (e.g. from a menu item)
    _version: '1'
  };
  console.log('[TranslationFeedback] loaded');
})();
