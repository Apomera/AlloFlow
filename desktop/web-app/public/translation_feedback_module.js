/**
 * AlloFlow Translation Feedback Module
 *
 * Lets multilingual users (teachers/students viewing the app in their own
 * language) suggest a correction to a translated string and send it to the
 * maintainers through a private, time-limited review queue. A failed or
 * unconfirmed send retains the draft in this window for retry.
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
  if (typeof window !== 'object' || !window) return;
  if (window.AlloModules && window.AlloModules.TranslationFeedback) {
    if (typeof console === 'object' && console && typeof console.log === 'function') console.log('[TranslationFeedback] Already loaded, skipping');
    return;
  }
  window.AlloModules = window.AlloModules || {};

  // Versioned private intake: an older public-staging Worker cannot accept this route.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/v2/submitTranslation';

  // A managed support destination does not authorize independent community
  // contributions. Any configured policy blocks this POST;
  // these payloads are never rerouted to a bug-report endpoint.
  function communityFeedbackBlocked() {
    try {
      return Object.prototype.hasOwnProperty.call(window, 'ALLOFLOW_SUPPORT_REPORTING_POLICY')
        || window._isDesktopBundledApp === true || window.__alloStudentView === true
        || Boolean(window.__alloQrStudentMode)
        || window._alloQrBlocked === true
        || window.__alloOfflineOnly === true;
    }
    catch (_) { return true; }
  }
  function safeStr(text) {
    if (text == null) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'number' || typeof text === 'boolean') return String(text);
    return '';
  }
  function stripControlChars(text) {
    return safeStr(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  function scrubFeedbackText(text, maxLen) {
    var limit = maxLen || 1000;
    var s = stripControlChars(text).trim().slice(0, limit);
    try {
      var ir = window.AlloModules && window.AlloModules.IdentifierRedaction;
      if (ir) {
        if (typeof ir.scrubPersonalInfo === 'function') s = ir.scrubPersonalInfo(s);
        if (typeof ir.scrubRosterNames === 'function') s = ir.scrubRosterNames(s);
      }
    } catch (_) {}
    return safeStr(s).trim().slice(0, limit);
  }
  function safeJsonParse(raw) {
    if (typeof raw !== 'string' || raw.length > 5 * 1024 * 1024) return null;
    return JSON.parse(raw, function (key, value) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });
  }
  var COMMUNITY_BLOCK_MESSAGE = 'Community feedback is disabled in this managed deployment. Your draft stays in this window. Contact your school\'s support team.';

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

  // ── English-source lookup (lazy; fetched from the same public source the app uses) ──
  var EN = null, EN_LOADING = false;
  var EN_CACHE_KEY = 'alloflow_ui_strings_cache';
  var EN_MAX_DEPTH = 8;
  var EN_MAX_KEYS = 50000;
  function flatten(obj, prefix, out, depth, seen, state) {
    out = out || Object.create(null); prefix = prefix || ''; depth = depth || 0;
    state = state || { count: 0 };
    if (!obj || typeof obj !== 'object' || depth > EN_MAX_DEPTH || state.count >= EN_MAX_KEYS) return out;
    if (!seen) seen = [];
    if (seen.indexOf(obj) >= 0) return out;
    seen.push(obj);
    for (var k in obj) {
      if (state.count >= EN_MAX_KEYS) break;
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      var v = obj[k], f = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, f, out, depth + 1, seen, state);
      else if (typeof v === 'string') { out[f] = v; state.count += 1; }
    }
    seen.pop();
    return out;
  }
  function loadEnglish() {
    if (EN || EN_LOADING || communityFeedbackBlocked()) return;
    EN_LOADING = true;
    try {
      var cached = localStorage.getItem(EN_CACHE_KEY);
      if (cached) {
        var parsedCache = safeJsonParse(cached);
        if (parsedCache && typeof parsedCache === 'object') { EN = flatten(parsedCache); EN_LOADING = false; return; }
      }
    } catch (_) {}
    var enTimer = null;
    try {
      if (typeof fetch !== 'function') { EN_LOADING = false; return; }
      var enCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      enTimer = enCtrl ? setTimeout(function () { try { enCtrl.abort(); } catch (_) {} }, 10000) : null;
      var enOpts = { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
      if (enCtrl) enOpts.signal = enCtrl.signal;
      fetch('./ui_strings.js', enOpts)
        .then(function (r) { if (!r || !r.ok) throw new Error('HTTP'); return r.text(); })
        .then(function (txt) {
          if (typeof txt !== 'string' || txt.length > 5 * 1024 * 1024) throw new Error('Size');
          var j = txt.replace(/^[^{]*/, '').replace(/;?\s*$/, '');
          var parsed = safeJsonParse(j);
          if (parsed && typeof parsed === 'object') EN = flatten(parsed);
          else EN_LOADING = false;
        })
        .catch(function () { EN_LOADING = false; })
        .finally(function () { if (enTimer) { clearTimeout(enTimer); enTimer = null; } });
    } catch (_) {
      if (enTimer) { clearTimeout(enTimer); enTimer = null; }
      EN_LOADING = false;
    }
  }
  function englishFor(key) {
    if (!key || !EN) return '';
    return Object.prototype.hasOwnProperty.call(EN, key) ? (EN[key] || '') : '';
  }

  // ── The "✎ Suggest a better translation" pill (shown by offerFor during help-mode) ──
  var openerBeforePill = null;
  var modalOpener = null;
  var activeTrapEntry = null;
  var activeModalCleanup = null;
  var modalTokenSeq = 0;
  var currentModalToken = 0;
  function validOpenerEl(el) {
    if (typeof document === 'undefined') return false;
    return !!(el && el !== document.body && el !== document.documentElement
      && (el.isConnected === true || (el.isConnected === undefined && typeof document.contains === 'function' && document.contains(el)))
      && typeof el.focus === 'function');
  }
  function ensureA11yStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-tfb-a11y-style')) return;
    var target = document.head || document.body || document.documentElement;
    if (!target) return;
    var st = document.createElement('style');
    st.id = 'allo-tfb-a11y-style';
    st.textContent = '#allo-tfb-pill:focus-visible,[data-allo-tfb-modal] :is(button,input,textarea):focus-visible{outline:2px solid #0f766e;outline-offset:2px;}';
    target.appendChild(st);
  }
  function ensurePill() {
    if (typeof document === 'undefined' || !document.body) return;
    ensureA11yStyle();
    if (pill && pill.isConnected) return;
    pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'allo-tfb-pill';
    pill.style.cssText = [
      'position:fixed', 'bottom:64px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:2147483646', 'padding:10px 16px', 'min-height:44px', 'border-radius:999px',
      'background:#0f766e', 'color:#fff', 'border:2px solid #fff',
      'font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.3)',
      'display:none', 'align-items:center', 'gap:6px', 'outline-offset:2px'
    ].join(';');
    pill.onclick = function () { hidePill(); openModal(lastContext); };
    pill.onkeydown = function (ev) {
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === 'Escape' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); ev.stopPropagation(); hidePill(); }
    };
    document.body.appendChild(pill);
  }
  function hidePill() { if (pill) pill.style.display = 'none'; if (pillHideTimer) { clearTimeout(pillHideTimer); pillHideTimer = null; } }

  // Public: called from the host's help-mode click handler.
  function offerFor(ctx) {
    if (typeof document === 'undefined' || !ctx || !document.body
      || window._isDesktopBundledApp === true
      || window.__alloStudentView === true
      || Boolean(window.__alloQrStudentMode)
      || window._alloQrBlocked === true
      || window.__alloOfflineOnly === true) return;
    if (validOpenerEl(document.activeElement) && document.activeElement !== pill) {
      openerBeforePill = document.activeElement;
    }
    lastContext = { key: stripControlChars(ctx.key || '').trim().slice(0, 160), current: stripControlChars(ctx.current || '').trim().slice(0, 1000), language: stripControlChars(currentLanguage(ctx)).trim().slice(0, 60) || 'English' };
    if (!communityFeedbackBlocked()) loadEnglish();
    ensurePill();
    if (!pill) return;
    pill.innerHTML = '<span aria-hidden="true">✎</span><span></span>';
    pill.lastChild.textContent = ' Suggest a better ' + lastContext.language + ' translation';
    pill.style.display = 'inline-flex';
    if (pillHideTimer) clearTimeout(pillHideTimer);
    pillHideTimer = setTimeout(hidePill, 15000); // auto-dismiss; non-nagging
  }

  // ── The modal ──
  function openModal(ctx) {
    if (typeof document === 'undefined' || !document.body) return;
    ctx = ctx || lastContext || { key: '', current: '', language: currentLanguage(null) };
    var activeNow = document.activeElement;
    var nextOpener = (validOpenerEl(activeNow) && activeNow !== pill) ? activeNow : openerBeforePill;
    closeModal();
    var myToken = ++modalTokenSeq;
    currentModalToken = myToken;
    var inFlight = false;
    ensureA11yStyle();
    modalOpener = nextOpener;
    var lang = stripControlChars(currentLanguage(ctx)).trim().slice(0, 60) || 'English';
    var english = englishFor(ctx.key);
    overlay = document.createElement('div');
    overlay.id = 'allo-tfb-overlay';
    overlay.setAttribute('data-allo-tfb-modal', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'allo-tfb-title');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'background:rgba(0,0,0,0.5)',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:16px'
    ].join(';');
    var backdropDown = false;
    overlay.addEventListener('mousedown', function (e) { backdropDown = (e.target === overlay); });
    overlay.addEventListener('click', function (e) {
      var allow = backdropDown;
      backdropDown = false;
      if (allow && e.target === overlay) closeModal();
    });

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
      : '<label for="allo-tfb-current" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">The text you want corrected</label>' +
        '<textarea id="allo-tfb-current" rows="2" maxlength="1000" placeholder="Paste the exact text as it appears in the app" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>';

    var panel = document.createElement('div');
    panel.style.cssText = [
      'background:#fff', 'border-radius:12px', 'max-width:520px', 'width:100%',
      'max-height:90vh', 'overflow:auto', 'padding:20px', 'box-shadow:0 20px 60px rgba(0,0,0,0.35)'
    ].join(';');
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:12px">' +
        '<h2 id="allo-tfb-title" style="margin:0;font:700 17px system-ui;color:#0f172a"><span aria-hidden="true">✎</span> Suggest a translation fix</h2>' +
        '<button id="allo-tfb-x" type="button" aria-label="Close" style="min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#475569">×</button>' +
      '</div>' +
      '<p style="margin:0 0 14px;font:13px/1.5 system-ui;color:#475569">Suggest a better translation. Your suggestion is stored privately for up to 30 days for maintainer review. Only reviewed corrections may be published. Do not include personal student details.</p>' +
      '<label for="allo-tfb-lang" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">Language</label>' +
      '<input id="allo-tfb-lang" type="text" maxlength="60" value="' + esc(lang) + '" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px" />' +
      keyRow + enRow + curRow +
      '<label for="allo-tfb-suggest" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">Your suggested ' + esc(lang) + ' translation <span style="color:#b91c1c" aria-hidden="true">*</span></label>' +
      '<textarea id="allo-tfb-suggest" rows="3" maxlength="1000" required aria-required="true" aria-describedby="allo-tfb-err" placeholder="Type the corrected text" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>' +
      '<label for="allo-tfb-note" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">Why / notes (optional)</label>' +
      '<textarea id="allo-tfb-note" rows="2" maxlength="500" placeholder="e.g. wrong register, regional word, sounds robotic" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:14px"></textarea>' +
      '<div id="allo-tfb-err" role="alert" aria-live="polite" style="display:' + (communityFeedbackBlocked() ? 'block' : 'none') + ';color:#b91c1c;font:13px system-ui;margin-bottom:10px">' + (communityFeedbackBlocked() ? esc(COMMUNITY_BLOCK_MESSAGE) : '') + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="allo-tfb-cancel" type="button" style="min-height:44px;padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:600 13px system-ui;cursor:pointer">Cancel</button>' +
        '<button id="allo-tfb-send" type="button"' + (communityFeedbackBlocked() ? ' disabled' : '') + ' style="min-height:44px;padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Send for private review →</button>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var trapStack = (window.__alloFocusTrapStack = Array.isArray(window.__alloFocusTrapStack) ? window.__alloFocusTrapStack : []);
    var trapEntry = { id: 'allo-tfb-modal', root: panel, container: overlay };
    activeTrapEntry = trapEntry;
    trapStack.push(trapEntry);

    function isTopTrap() {
      var s = window.__alloFocusTrapStack;
      return !Array.isArray(s) || !s.length || s[s.length - 1] === trapEntry;
    }
    function focusablesInPanel() {
      var list = panel.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.closest('[hidden], [inert], [aria-hidden="true"]')) continue;
        var hiddenByCss = false;
        try {
          if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
            for (var cur = el; cur && cur !== panel.parentElement; cur = cur.parentElement) {
              var cs = window.getComputedStyle(cur);
              if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) { hiddenByCss = true; break; }
              if (cur === panel) break;
            }
          }
        } catch (_) {}
        if (hiddenByCss) continue;
        out.push(el);
      }
      return out;
    }
    function onDocKeydown(e) {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
      if (!overlay || !overlay.isConnected || !isTopTrap()) return;
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); closeModal(); return; }
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var items = focusablesInPanel();
        if (!items.length) { e.preventDefault(); return; }
        e.preventDefault(); e.stopPropagation();
        var idx = items.indexOf(document.activeElement);
        if (idx < 0) (e.shiftKey ? items[items.length - 1] : items[0]).focus();
        else items[(idx + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
      }
    }
    function onDocFocusin(e) {
      if (!overlay || !overlay.isConnected || !isTopTrap()) return;
      if (!panel.contains(e.target)) {
        var items = focusablesInPanel();
        if (items.length) { try { items[0].focus(); } catch (_) {} }
      }
    }
    var activeSubmitCtrl = null;
    var activeSubmitTimer = null;
    document.addEventListener('keydown', onDocKeydown, true);
    document.addEventListener('focusin', onDocFocusin, true);
    activeModalCleanup = function () {
      document.removeEventListener('keydown', onDocKeydown, true);
      document.removeEventListener('focusin', onDocFocusin, true);
      if (activeSubmitTimer) { clearTimeout(activeSubmitTimer); activeSubmitTimer = null; }
      if (activeSubmitCtrl) { try { activeSubmitCtrl.abort(); } catch (_) {} activeSubmitCtrl = null; }
    };

    var $ = function (id) { return panel.querySelector('#' + id); };
    $('allo-tfb-x').onclick = closeModal;
    $('allo-tfb-cancel').onclick = closeModal;

    function showManagedBlock() {
      var error = $('allo-tfb-err');
      if (error) { error.textContent = COMMUNITY_BLOCK_MESSAGE; error.style.display = 'block'; }
      var button = $('allo-tfb-send');
      if (button) { button.disabled = true; button.textContent = 'Sending disabled'; }
    }

    function showThanks(submittedLang) {
      var displayLang = submittedLang || lang;
      panel.innerHTML =
        '<div style="text-align:center;padding:12px">' +
          '<div style="font-size:34px" aria-hidden="true">🌍</div>' +
          '<h2 id="allo-tfb-title" style="margin:8px 0;font:700 17px system-ui;color:#0f172a">Thank you!</h2>' +
          '<p style="margin:0 0 16px;font:13px/1.5 system-ui;color:#475569">' +
            'Your ' + esc(displayLang) + ' suggestion was sent for review. Maintainers apply accepted fixes to the language pack.' +
          '</p>' +
          '<button id="allo-tfb-done" type="button" style="min-height:44px;padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Done</button>' +
        '</div>';
      var done = panel.querySelector('#allo-tfb-done');
      if (done) { done.onclick = closeModal; try { done.focus(); } catch (_) {} }
    }

    $('allo-tfb-send').onclick = function () {
      if (communityFeedbackBlocked()) { showManagedBlock(); return; }
      if (inFlight) return;
      var errEl = $('allo-tfb-err');
      var suggested = scrubFeedbackText($('allo-tfb-suggest').value || '', 1000);
      if (!suggested) {
        errEl.textContent = 'Please enter your suggested translation.';
        errEl.style.display = 'block';
        try { $('allo-tfb-suggest').focus(); } catch (_) {}
        return;
      }
      var curEl = panel.querySelector('#allo-tfb-current');
      var payload = {
        language: scrubFeedbackText($('allo-tfb-lang').value || lang, 60) || lang,
        key: stripControlChars(ctx.key || '').trim().slice(0, 160),
        current: scrubFeedbackText(ctx.current || (curEl ? curEl.value : ''), 1000),
        suggested: suggested,
        english: stripControlChars(english || '').trim().slice(0, 1000),
        note: scrubFeedbackText($('allo-tfb-note').value, 500)
      };
      var sendBtn = $('allo-tfb-send');
      inFlight = true;
      sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; errEl.style.display = 'none';
      var showSendFailure = function () {
        inFlight = false;
        if (communityFeedbackBlocked()) { showManagedBlock(); return; }
        errEl.textContent = 'Submission was not confirmed. Your draft stays here. You can retry later or contact your support team.';
        errEl.style.display = 'block';
        sendBtn.disabled = false; sendBtn.textContent = 'Try sending again';
      };
      var submitCtrl = null;
      var submitTimer = null;
      var cleanupSubmit = function () {
        if (submitTimer) {
          clearTimeout(submitTimer);
          if (activeSubmitTimer === submitTimer) activeSubmitTimer = null;
          submitTimer = null;
        }
        if (activeSubmitCtrl === submitCtrl) activeSubmitCtrl = null;
        if (myToken === currentModalToken) inFlight = false;
      };
      try {
        if (communityFeedbackBlocked()) { inFlight = false; showManagedBlock(); return; }
        if (typeof fetch !== 'function') { showSendFailure(); return; }
        if (activeSubmitTimer) { clearTimeout(activeSubmitTimer); activeSubmitTimer = null; }
        if (activeSubmitCtrl) { try { activeSubmitCtrl.abort(); } catch (_) {} }
        submitCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        activeSubmitCtrl = submitCtrl;
        submitTimer = submitCtrl ? setTimeout(function () { try { submitCtrl.abort(); } catch (_) {} }, 15000) : null;
        activeSubmitTimer = submitTimer;
        var submitOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
        if (submitCtrl) submitOpts.signal = submitCtrl.signal;
        fetch(SUBMIT_URL, submitOpts)
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) {
            if (myToken !== currentModalToken || !overlay || !overlay.isConnected) return;
            if (res.ok && res.j && typeof res.j === 'object' && !Array.isArray(res.j) && res.j.ok === true && res.j.storage === 'private') { inFlight = false; showThanks(payload.language); }
            else showSendFailure();
          })
          .catch(function () {
            if (myToken !== currentModalToken || !overlay || !overlay.isConnected) return;
            showSendFailure();
          })
          .finally(cleanupSubmit);
      } catch (_) {
        cleanupSubmit();
        showSendFailure();
      }
    };
    var first = $('allo-tfb-suggest'); if (first) first.focus();
  }

  function closeModal() {
    currentModalToken = ++modalTokenSeq;
    if (activeModalCleanup) { try { activeModalCleanup(); } catch (_) {} activeModalCleanup = null; }
    var wasTop = true;
    if (activeTrapEntry && Array.isArray(window.__alloFocusTrapStack)) {
      var s = window.__alloFocusTrapStack;
      wasTop = !s.length || s[s.length - 1] === activeTrapEntry;
      var idx = s.lastIndexOf(activeTrapEntry);
      if (idx >= 0) s.splice(idx, 1);
    }
    activeTrapEntry = null;
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    var opener = modalOpener;
    modalOpener = null;
    openerBeforePill = null;
    if (wasTop && validOpenerEl(opener)) { try { opener.focus(); } catch (_) {} }
  }

  window.AlloModules.TranslationFeedback = Object.freeze({
    offerFor: offerFor,         // host help-mode hook calls this
    openModal: openModal,       // open directly (e.g. from a menu item)
    _version: '1'
  });
  if (typeof console === 'object' && console && typeof console.log === 'function') console.log('[TranslationFeedback] loaded');
})();
