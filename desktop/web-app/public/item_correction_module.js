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
 * Submit path (mirrors translation feedback): POST to the SAME Cloudflare
 * Worker (catalog/cloudflare-worker) on a new /submitItemCorrection route,
 * which commits one record to item_corrections/pending/ in the repo. If the
 * worker is unreachable OR the route isn't deployed yet, we fall back to the
 * pre-filled Google Form so the reviewer's input is NEVER lost. That fallback
 * is why this works today, before the Cloudflare route is set up.
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

  // ── Google Form config — SAME form as error_reporter / translation_feedback ──
  var FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform?usp=pp_url';
  var ENTRY_TYPE    = '640908447';   // Type of Issue (add "Practice Item Correction" option to the form)
  var ENTRY_WHAT    = '234547532';   // What happened? — machine-parseable correction block
  var ENTRY_STEPS   = '1969020676';  // Steps / notes — reviewer's free-text reason + URL
  var ENTRY_BROWSER = '937961519';   // Browser & Device

  // Primary submit path: the SAME Cloudflare Worker that accepts community lesson + translation
  // submissions, new /submitItemCorrection route → commits to item_corrections/pending/ in the
  // repo. If unreachable (e.g. route not yet deployed), fall back to the pre-filled Google Form.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submitItemCorrection';

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

  // ── Build the pre-filled Google Form URL (fallback; mirrors translation feedback technique) ──
  function buildFormUrl(payload) {
    var what =
      '[AlloFlow Practice Item Correction]\n' +
      'pack: ' + payload.packTitle + ' (' + payload.packId + ')\n' +
      'itemId: ' + (payload.itemId || '(unknown)') + '\n' +
      'domain: ' + (payload.domain || '(n/a)') + '\n' +
      'reviewTier: ' + payload.reviewTier + '\n' +
      'problem: ' + payload.kind + '\n' +
      'prompt: ' + (payload.prompt || '').slice(0, 1200) + '\n' +
      'currentAnswer: ' + (payload.currentAnswer || '(n/a)') + '\n' +
      'suggested: ' + payload.suggested;
    var steps = (payload.note ? payload.note + '\n\n' : '') + 'URL: ' + (location.href || '').slice(0, 300);
    var browser = navigator.userAgent + ' · viewport ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?');
    return FORM_BASE +
      '&entry.' + ENTRY_TYPE    + '=' + encodeURIComponent('Practice Item Correction') +
      '&entry.' + ENTRY_WHAT    + '=' + encodeURIComponent(what.slice(0, 8000)) +
      '&entry.' + ENTRY_STEPS   + '=' + encodeURIComponent(steps.slice(0, 3000)) +
      '&entry.' + ENTRY_BROWSER + '=' + encodeURIComponent(browser.slice(0, 500));
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
      '<p style="margin:0 0 14px;font:13px/1.5 system-ui;color:#475569">These practice packs are being validated by experts right now, and educator review is exactly how items get better. Flag anything that looks wrong. It opens a short form for you to review before sending — the same way bug reports and translation fixes are sent.</p>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Pack</div>' +
      '<div style="font:13px system-ui;color:#334155;background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:10px">' + esc(ctx.packTitle) + '</div>' +
      tierRow + promptRow +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">What is the problem? <span style="color:#dc2626">*</span></div>' +
      '<select id="allo-ic-kind" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px">' + kindOptions + '</select>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Your suggested fix <span style="color:#dc2626">*</span></div>' +
      '<textarea id="allo-ic-suggest" rows="3" placeholder="e.g. the keyed answer should be B because…, or reword the stem to…" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:10px"></textarea>' +
      '<div style="font:600 12px system-ui;color:#475569;margin-bottom:2px">Source or reasoning (optional)</div>' +
      '<textarea id="allo-ic-note" rows="2" placeholder="e.g. per the current ETS blueprint / IDEA 2004 / a citation link" style="width:100%;box-sizing:border-box;font:13px system-ui;border:1px solid #cbd5e1;border-radius:6px;padding:8px;margin-bottom:14px"></textarea>' +
      '<div id="allo-ic-err" role="alert" style="display:none;color:#dc2626;font:13px system-ui;margin-bottom:10px"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="allo-ic-cancel" type="button" style="padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:600 13px system-ui;cursor:pointer">Cancel</button>' +
        '<button id="allo-ic-send" type="button" style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Send correction →</button>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var $ = function (id) { return panel.querySelector('#' + id); };
    $('allo-ic-x').onclick = closeModal;
    $('allo-ic-cancel').onclick = closeModal;
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    function showThanks(viaForm) {
      panel.innerHTML =
        '<div style="text-align:center;padding:12px">' +
          '<div style="font-size:34px" aria-hidden="true">🙏</div>' +
          '<h2 style="margin:8px 0;font:700 17px system-ui;color:#0f172a">Thank you!</h2>' +
          '<p style="margin:0 0 16px;font:13px/1.5 system-ui;color:#475569">' +
            (viaForm
              ? 'Your correction opened in a form in a new tab — submit it there to send it for review.'
              : 'Your correction was sent for review. Accepted fixes are applied to the pack; expert validation stays a separate, documented step.') +
          '</p>' +
          '<button id="allo-ic-done" type="button" style="padding:9px 16px;border-radius:8px;border:none;background:#0f766e;color:#fff;font:700 13px system-ui;cursor:pointer">Done</button>' +
        '</div>';
      var done = panel.querySelector('#allo-ic-done');
      done.onclick = closeModal; done.focus();
    }

    $('allo-ic-send').onclick = function () {
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
