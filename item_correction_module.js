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
  if (window.AlloModules && window.AlloModules.ItemCorrection) {
    console.log('[ItemCorrection] Already loaded, skipping');
    return;
  }
  window.AlloModules = window.AlloModules || {};

  // Versioned private intake: an older public-staging Worker cannot accept this route.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/v2/submitItemCorrection';

  // Managed support configuration does not authorize independent community
  // contributions. Any configured policy blocks this POST;
  // a custom bug-report endpoint never receives this different payload.
  function communityFeedbackBlocked() {
    try { return Object.prototype.hasOwnProperty.call(window, 'ALLOFLOW_SUPPORT_REPORTING_POLICY'); }
    catch (_) { return true; }
  }
  var COMMUNITY_BLOCK_MESSAGE = 'Community feedback is disabled in this managed deployment. Your draft stays in this window. Contact your school\'s support team.';

  // What kind of problem is being reported. Kept short + stable so the ingest tool can bucket them.
  var KINDS = [
    { id: 'wrong-answer', label: 'The keyed answer looks wrong' },
    { id: 'ambiguous', label: 'The question is ambiguous or has more than one defensible answer' },
    { id: 'weak-distractor', label: 'A distractor is implausible or gives the answer away' },
    { id: 'outdated', label: 'Outdated / incorrect citation or guidance' },
    { id: 'not-exam-item', label: 'This guided activity is presented like a real exam question' },
    { id: 'typo', label: 'Typo, formatting, or accessibility issue' },
    { id: 'other', label: 'Something else' }
  ];

  var overlay = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function tierLabel(reviewTier) {
    if (reviewTier === 'guided-review') return 'Guided-review activity (assistant-authored, expert validation pending)';
    if (reviewTier === 'source-reviewed') return 'Source-reviewed question (independent expert validation pending)';
    return 'Practice item';
  }

  // Public: called from the host's per-item "Suggest a correction" button.
  function openFor(ctx) {
    ctx = ctx || {};
    var context = {
      packId: String(ctx.packId || '').slice(0, 120),
      packTitle: String(ctx.packTitle || ctx.packId || 'Practice pack').slice(0, 200),
      itemId: String(ctx.itemId || '').slice(0, 120),
      prompt: String(ctx.prompt || '').slice(0, 3000),
      domain: String(ctx.domain || '').slice(0, 120),
      reviewTier: ctx.reviewTier === 'guided-review' || ctx.reviewTier === 'source-reviewed' ? ctx.reviewTier : 'practice-item',
      currentAnswer: String(ctx.currentAnswer || '').slice(0, 600)
    };
    openModal(context);
  }

  function openModal(ctx) {
    if (!document.body) return;
    closeModal();

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
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">What is the problem? <span style="color:#dc2626">*</span></div>' +
      '<select id="allo-ic-kind" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px">' + kindOptions + '</select>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Your suggested fix <span style="color:#dc2626">*</span></div>' +
      '<textarea id="allo-ic-suggest" rows="3" placeholder="e.g. the keyed answer should be B because…, or reword the stem to…" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Source or reasoning (optional)</div>' +
      '<textarea id="allo-ic-note" rows="2" placeholder="e.g. per the current ETS blueprint / IDEA 2004 / a citation link" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:14px"></textarea>' +
      '<div id="allo-ic-err" role="alert" style="display:' + (communityFeedbackBlocked() ? 'block' : 'none') + ';color:#dc2626;font:13px system-ui;margin-bottom:10px">' + (communityFeedbackBlocked() ? esc(COMMUNITY_BLOCK_MESSAGE) : '') + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="allo-ic-cancel" type="button" style="padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:600 13px system-ui;cursor:pointer">Cancel</button>' +
        '<button id="allo-ic-send" type="button"' + (communityFeedbackBlocked() ? ' disabled' : '') + ' style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Send correction →</button>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var $ = function (id) { return panel.querySelector('#' + id); };
    $('allo-ic-x').onclick = closeModal;
    $('allo-ic-cancel').onclick = closeModal;
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    function showManagedBlock() {
      var error = $('allo-ic-err');
      if (error) { error.textContent = COMMUNITY_BLOCK_MESSAGE; error.style.display = 'block'; }
      var button = $('allo-ic-send');
      if (button) { button.disabled = true; button.textContent = 'Sending disabled'; }
    }

    function showThanks() {
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
      done.onclick = closeModal; done.focus();
    }

    $('allo-ic-send').onclick = function () {
      if (communityFeedbackBlocked()) { showManagedBlock(); return; }
      var errEl = $('allo-ic-err');
      var suggested = ($('allo-ic-suggest').value || '').trim();
      if (!suggested) { errEl.textContent = 'Please describe your suggested fix.'; errEl.style.display = 'block'; return; }
      var kindId = $('allo-ic-kind').value || 'other';
      var kindLabel = (KINDS.filter(function (k) { return k.id === kindId; })[0] || KINDS[KINDS.length - 1]).label;
      var payload = {
        packId: ctx.packId,
        packTitle: ctx.packTitle,
        itemId: ctx.itemId,
        domain: ctx.domain,
        reviewTier: ctx.reviewTier,
        prompt: ctx.prompt,
        currentAnswer: ctx.currentAnswer,
        kind: kindId + ' (' + kindLabel + ')',
        suggested: suggested,
        note: ($('allo-ic-note').value || '').trim()
      };
      var sendBtn = $('allo-ic-send');
      sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; errEl.style.display = 'none';
      var showSendFailure = function () {
        if (communityFeedbackBlocked()) { showManagedBlock(); return; }
        errEl.textContent = 'Submission was not confirmed. Your draft stays here. You can retry later or contact your support team.';
        errEl.style.display = 'block';
        sendBtn.disabled = false; sendBtn.textContent = 'Try sending again';
      };
      try {
        if (communityFeedbackBlocked()) { showManagedBlock(); return; }
        fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) { if (res.ok && res.j && res.j.ok && res.j.storage === 'private') showThanks(); else showSendFailure(); })
          .catch(function () { showSendFailure(); });
      } catch (_) { showSendFailure(); }
    };
    var first = $('allo-ic-suggest'); if (first) first.focus();
  }

  function closeModal() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }

  window.AlloModules.ItemCorrection = {
    openFor: openFor,       // host per-item button calls this
    openModal: openModal,   // open directly with a full context object
    KINDS: KINDS,
    _version: '1'
  };
  console.log('[ItemCorrection] loaded');
})();
