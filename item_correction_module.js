/**
 * AlloFlow Item Correction Module
 *
 * Lets anyone using a Test Prep practice pack flag a specific question and
 * suggest a fix — a wrong key, an ambiguous stem, a weak distractor, an
 * outdated citation, or "this guided activity isn't a real exam question." It
 * is the exact community-feedback loop the app already uses for translation
 * corrections (translation_feedback_module.js), pointed at practice-item
 * content instead of UI strings.
 *
 * Why this exists: the Test Prep packs ship candidly as 200 source-reviewed
 * questions plus 300 assistant-authored guided-review activities, with
 * independent expert (licensed-professional + psychometric) validation still
 * IN PROGRESS. That validation is exactly the kind of judgment a practicing
 * educator supplies best, in context, one item at a time. This gives them a
 * one-click channel and emits a STRUCTURED payload (pack + item + tier +
 * suggested change) so an accepted correction flows back through
 * dev-tools/i18n/ingest_item_corrections.cjs almost like a bug fix.
 *
 * Submit path: the versioned private review route on the catalog Worker.
 * Failed or unconfirmed submissions remain in the modal for retry; they are
 * never automatically sent to a different service.
 *
 * Discovery: the host (Test Prep Hub) renders a small "Suggest a correction"
 * button on each open question and calls
 *   window.AlloModules.ItemCorrection.openFor({ packId, packTitle, itemId,
 *     prompt, domain, reviewTier, currentAnswer })
 * If the module isn't loaded, the host's optional-chaining guard makes the
 * hook a no-op — the app is unchanged.
 *
 * Plain DOM, no React dep — works even if React fails, and inside Canvas embeds.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.ItemCorrection) {
    console.log('[ItemCorrection] Already loaded, skipping');
    return;
  }
  window.AlloModules = window.AlloModules || {};

  // Versioned private intake: an older public-staging Worker cannot accept this route.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/v2/submitItemCorrection';

  // Managed support configuration does not authorize independent community
  // contributions. Any configured policy (or student/QR/offline/desktop mode) blocks
  // this POST; a custom bug-report endpoint never receives this different payload.
  function communityFeedbackBlocked() {
    try {
      if (Object.prototype.hasOwnProperty.call(window, 'ALLOFLOW_SUPPORT_REPORTING_POLICY')) return true;
      if (window._isDesktopBundledApp === true || window.__alloQrStudentMode === true || window._alloQrBlocked === true || window.__alloStudentView === true || window.__alloOfflineOnly === true) return true;
      return false;
    } catch (_) { return true; }
  }
  var COMMUNITY_BLOCK_MESSAGE = 'Community feedback is disabled in this managed deployment. Your draft stays in this window. Contact your school\'s support team.';

  function scrubSubmissionText(s) {
    var out = String(s || '');
    try {
      var redactor = window.AlloModules && window.AlloModules.IdentifierRedaction;
      if (redactor && typeof redactor.scrubPersonalInfo === 'function') out = redactor.scrubPersonalInfo(out);
      if (redactor && typeof redactor.scrubRosterNames === 'function') out = redactor.scrubRosterNames(out);
    } catch (_) {}
    return out;
  }

  // What kind of problem is being reported. Kept short + stable so the ingest tool can bucket them.
  var KINDS = Object.freeze([
    Object.freeze({ id: 'wrong-answer', label: 'The keyed answer looks wrong' }),
    Object.freeze({ id: 'ambiguous', label: 'The question is ambiguous or has more than one defensible answer' }),
    Object.freeze({ id: 'weak-distractor', label: 'A distractor is implausible or gives the answer away' }),
    Object.freeze({ id: 'outdated', label: 'Outdated / incorrect citation or guidance' }),
    Object.freeze({ id: 'not-exam-item', label: 'This guided activity is presented like a real exam question' }),
    Object.freeze({ id: 'typo', label: 'Typo, formatting, or accessibility issue' }),
    Object.freeze({ id: 'other', label: 'Something else' })
  ]);

  var overlay = null;
  var activeController = null;
  var activeTimer = null;
  var modalToken = 0;
  var previousFocus = null;

  var hasOwn = Object.prototype.hasOwnProperty;

  function safeStr(s, maxLen) {
    if (s == null) return '';
    var raw = '';
    if (typeof s === 'string') raw = s;
    else if (typeof s === 'number' || typeof s === 'boolean') raw = String(s);
    else return '';
    return maxLen && raw.length > maxLen * 4 ? raw.slice(0, maxLen * 4) : raw;
  }

  function stripCtl(s, maxLen) {
    var out = safeStr(s, maxLen).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    return maxLen ? out.slice(0, maxLen) : out;
  }

  function esc(s) {
    return safeStr(s, 4096)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function tierLabel(reviewTier) {
    if (reviewTier === 'guided-review') return 'Guided-review activity (assistant-authored, expert validation pending)';
    if (reviewTier === 'source-reviewed') return 'Source-reviewed question (independent expert validation pending)';
    return 'Practice item';
  }

  function ownField(obj, key) {
    return hasOwn.call(obj, key) ? obj[key] : undefined;
  }

  function normalizeContext(ctx) {
    ctx = (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) ? ctx : {};
    var packId = stripCtl(ownField(ctx, 'packId') || '', 120).trim();
    var tier = ownField(ctx, 'reviewTier');
    return {
      packId: packId,
      packTitle: stripCtl(ownField(ctx, 'packTitle') || packId || 'Practice pack', 200).trim() || 'Practice pack',
      itemId: stripCtl(ownField(ctx, 'itemId') || '', 120).trim(),
      prompt: stripCtl(ownField(ctx, 'prompt') || '', 3000),
      domain: stripCtl(ownField(ctx, 'domain') || '', 120).trim(),
      reviewTier: tier === 'guided-review' || tier === 'source-reviewed' ? tier : 'practice-item',
      currentAnswer: stripCtl(ownField(ctx, 'currentAnswer') || '', 600)
    };
  }

  // Public: called from the host's per-item "Suggest a correction" button.
  function openFor(ctx) {
    openModal(normalizeContext(ctx));
  }

  function openModal(ctx) {
    if (typeof document === 'undefined' || !document.body) return;
    ctx = normalizeContext(ctx);
    closeModal();
    var myToken = ++modalToken;
    var inFlight = false;
    try { previousFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null; }
    catch (_) { previousFocus = null; }
    var blocked = communityFeedbackBlocked();

    overlay = document.createElement('div');
    overlay.id = 'allo-ic-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Suggest a correction to this practice item');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'background:rgba(0,0,0,0.5)',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:16px'
    ].join(';');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    var kindOptions = KINDS.map(function (k) {
      return '<option value="' + esc(k.id) + '">' + esc(k.label) + '</option>';
    }).join('');

    var promptRow = ctx.prompt
      ? '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Question</div>' +
        '<div style="font:13px system-ui;color:#334155;background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:10px;max-height:120px;overflow:auto">' + esc(ctx.prompt) + '</div>'
      : '';
    var tierRow =
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Review status of this item</div>' +
      '<div style="font:12px system-ui;color:#334155;background:#f1f5f9;border-radius:6px;padding:6px 8px;margin-bottom:10px">' + esc(tierLabel(ctx.reviewTier)) + '</div>';

    var panel = document.createElement('div');
    panel.style.cssText = [
      'background:#fff', 'border-radius:12px', 'max-width:560px', 'width:100%',
      'max-height:90vh', 'overflow:auto', 'padding:20px', 'box-shadow:0 20px 60px rgba(0,0,0,0.35)'
    ].join(';');
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:12px">' +
        '<h2 style="margin:0;font:700 17px system-ui;color:#0f172a">✎ Suggest a correction</h2>' +
        '<button id="allo-ic-x" type="button" aria-label="Close" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#64748b">×</button>' +
      '</div>' +
      '<p style="margin:0 0 14px;font:13px/1.5 system-ui;color:#475569">Flag a practice item that looks wrong. Your correction is stored privately for up to 30 days for maintainer review. Only reviewed corrections may be published. Do not include personal student details.</p>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Pack</div>' +
      '<div style="font:13px system-ui;color:#334155;background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:10px">' + esc(ctx.packTitle) + '</div>' +
      tierRow + promptRow +
      '<label for="allo-ic-kind" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">What is the problem? <span style="color:#dc2626">*</span></label>' +
      '<select id="allo-ic-kind" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px">' + kindOptions + '</select>' +
      '<label for="allo-ic-suggest" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">Your suggested fix <span style="color:#dc2626">*</span></label>' +
      '<textarea id="allo-ic-suggest" rows="3" maxlength="3000" aria-required="true" placeholder="e.g. the keyed answer should be B because…, or reword the stem to…" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>' +
      '<label for="allo-ic-note" style="display:block;font:600 12px system-ui;color:#475569;margin-bottom:2px">Source or reasoning (optional)</label>' +
      '<textarea id="allo-ic-note" rows="2" maxlength="2000" placeholder="e.g. per the current ETS blueprint / IDEA 2004 / a citation link" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:14px"></textarea>' +
      '<div id="allo-ic-err" role="alert" style="display:' + (blocked ? 'block' : 'none') + ';color:#dc2626;font:13px system-ui;margin-bottom:10px">' + (blocked ? esc(COMMUNITY_BLOCK_MESSAGE) : '') + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="allo-ic-cancel" type="button" style="padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:600 13px system-ui;cursor:pointer">Cancel</button>' +
        '<button id="allo-ic-send" type="button"' + (blocked ? ' disabled' : '') + ' style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Send correction →</button>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var $ = function (id) { return panel.querySelector('#' + id); };
    $('allo-ic-x').onclick = closeModal;
    $('allo-ic-cancel').onclick = closeModal;
    overlay.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var nodes = Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!nodes.length) return;
        var firstNode = nodes[0];
        var lastNode = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === firstNode || !panel.contains(document.activeElement))) {
          e.preventDefault();
          try { lastNode.focus(); } catch (_) {}
        } else if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault();
          try { firstNode.focus(); } catch (_) {}
        }
      }
    });

    function showManagedBlock() {
      if (myToken !== modalToken) return;
      inFlight = false;
      var error = $('allo-ic-err');
      if (error) { error.textContent = COMMUNITY_BLOCK_MESSAGE; error.style.display = 'block'; }
      var button = $('allo-ic-send');
      if (button) { button.disabled = true; button.textContent = 'Sending disabled'; }
    }

    function showThanks() {
      if (myToken !== modalToken) return;
      inFlight = false;
      panel.innerHTML =
        '<div style="text-align:center;padding:12px">' +
          '<div style="font-size:34px" aria-hidden="true">🙏</div>' +
          '<h2 style="margin:8px 0;font:700 17px system-ui;color:#0f172a">Thank you!</h2>' +
          '<p style="margin:0 0 16px;font:13px/1.5 system-ui;color:#475569">' +
            'Your correction was sent for review. Accepted fixes are applied to the pack; expert validation stays a separate, documented step.' +
          '</p>' +
          '<button id="allo-ic-done" type="button" style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Done</button>' +
        '</div>';
      var done = panel.querySelector('#allo-ic-done');
      if (done) { done.onclick = closeModal; done.focus(); }
    }

    $('allo-ic-send').onclick = function () {
      if (myToken !== modalToken || inFlight) return;
      if (communityFeedbackBlocked()) { showManagedBlock(); return; }
      var errEl = $('allo-ic-err');
      var suggested = scrubSubmissionText(stripCtl($('allo-ic-suggest').value || '', 3000).trim()).slice(0, 3000);
      if (!suggested) { errEl.textContent = 'Please describe your suggested fix.'; errEl.style.display = 'block'; try { $('allo-ic-suggest').focus(); } catch (_) {} return; }
      var rawKindId = ($('allo-ic-kind').value || 'other');
      var matchedKind = KINDS.filter(function (k) { return k.id === rawKindId; })[0] || KINDS[KINDS.length - 1];
      var payload = {
        packId: ctx.packId,
        packTitle: ctx.packTitle,
        itemId: ctx.itemId,
        domain: ctx.domain,
        reviewTier: ctx.reviewTier,
        prompt: ctx.prompt,
        currentAnswer: ctx.currentAnswer,
        kind: matchedKind.id + ' (' + matchedKind.label + ')',
        suggested: suggested,
        note: scrubSubmissionText(stripCtl($('allo-ic-note').value || '', 2000).trim()).slice(0, 2000)
      };
      var sendBtn = $('allo-ic-send');
      inFlight = true;
      sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; errEl.style.display = 'none';
      var showSendFailure = function () {
        if (myToken !== modalToken) return;
        inFlight = false;
        if (communityFeedbackBlocked()) { showManagedBlock(); return; }
        errEl.textContent = 'Submission was not confirmed. Your draft stays here. You can retry later or contact your support team.';
        errEl.style.display = 'block';
        sendBtn.disabled = false; sendBtn.textContent = 'Try sending again';
      };
      var ctrl = null;
      var timer = null;
      var cleanupRequest = function () {
        if (timer) { clearTimeout(timer); timer = null; }
        if (activeTimer && activeTimer === timer) activeTimer = null;
        if (activeController === ctrl) activeController = null;
      };
      try {
        if (communityFeedbackBlocked()) { showManagedBlock(); return; }
        if (typeof fetch !== 'function') { showSendFailure(); return; }
        ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 15000) : null;
        activeController = ctrl;
        activeTimer = timer;
        var fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
        if (ctrl) fetchOpts.signal = ctrl.signal;
        fetch(SUBMIT_URL, fetchOpts)
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) { if (myToken !== modalToken) return; if (res.ok && res.j && typeof res.j === 'object' && !Array.isArray(res.j) && res.j.ok === true && res.j.storage === 'private') showThanks(); else showSendFailure(); })
          .catch(function () { showSendFailure(); })
          .finally(function () {
            if (timer) clearTimeout(timer);
            if (activeTimer === timer) activeTimer = null;
            if (activeController === ctrl) activeController = null;
          });
      } catch (_) {
        if (timer) clearTimeout(timer);
        if (activeTimer === timer) activeTimer = null;
        if (activeController === ctrl) activeController = null;
        showSendFailure();
      }
    };
    var first = $('allo-ic-suggest'); if (first) first.focus();
  }

  function closeModal() {
    modalToken++;
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
    if (activeController) { try { activeController.abort(); } catch (_) {} activeController = null; }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus(); } catch (_) {}
    }
    previousFocus = null;
  }

  window.AlloModules.ItemCorrection = Object.freeze({
    openFor: openFor,       // host per-item button calls this
    openModal: openModal,   // open directly with a full context object
    closeModal: closeModal,
    KINDS: KINDS,
    _version: '1'
  });
  console.log('[ItemCorrection] loaded');
})();
