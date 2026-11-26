// Life Skills & Transition Simulation Packets builder, curated starter sets, and self-contained student adapters.
// Plain UMD script for browser pages (window.AlloPacketLifeSkills) and Node (module.exports).
// Five pure DOM/CSS real-world domains: Making Change & Budgeting, Transit Schedules,
// Kitchen & Home Safety, Laundry & Care Sorting, and Community & Emergency Signs.
// Deterministic local builder: no network calls, no browser storage, no markup strings.
(function (root) {
  'use strict';

  var VERSION = 1;
  var ACTIVITIES = ['life_money', 'life_transit', 'life_kitchen', 'life_laundry', 'life_signs'];

  var EXTRA_CSS = [
    '.ls-wrap{display:grid;gap:14px}',
    '.ls-prompt{margin:0;font-size:1.18rem;font-weight:700;line-height:1.4}',
    '.ls-sub{margin:0;color:var(--muted);font-size:.95rem;line-height:1.45}',
    '.ls-readout{margin:0;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--soft);font-weight:700;font-size:1.05rem;font-variant-numeric:tabular-nums}',
    '.ls-readout-warn{border-color:var(--warn);color:var(--warn)}',
    '.ls-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.ls-actions button{min-height:44px}',
    '.ls-hint-box{padding:10px 14px;border-radius:12px;border:1px solid var(--accent);background:var(--soft);font-size:.95rem}',
    '.ls-hint-box[hidden]{display:none}',
    /* Money Register & Budgeting */
    '.lm-receipt{padding:12px 14px;border:2px solid var(--line);border-radius:12px;background:var(--card);display:flex;flex-wrap:wrap;gap:10px 20px;font-variant-numeric:tabular-nums}',
    '.lm-receipt-cell{display:flex;flex-direction:column;gap:2px}',
    '.lm-receipt-lbl{font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;font-weight:700}',
    '.lm-receipt-val{font-size:1.25rem;font-weight:700}',
    '.lm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '@media (min-width:560px){.lm-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    '.lm-denom{display:flex;flex-direction:column;gap:8px;padding:10px;border:2px solid var(--line);border-radius:12px;background:var(--card)}',
    '.lm-chip{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;font-weight:700;font-size:1.05rem;font-variant-numeric:tabular-nums;border:2px solid var(--ink)}',
    '.lm-bill{background:var(--ok-bg);border-color:var(--ok);color:var(--ink)}',
    '.lm-coin{border-radius:999px;width:54px;height:54px;margin:0 auto;background:var(--soft);border-color:var(--ink)}',
    '.lm-dmeta{display:flex;justify-content:space-between;align-items:center;font-size:.86rem;color:var(--muted);font-weight:700}',
    '.lm-dcount{color:var(--accent);font-size:1rem;font-variant-numeric:tabular-nums}',
    '.lm-dctrls{display:flex;gap:6px}',
    '.lm-dctrls button{flex:1;min-height:44px;font-weight:700;padding:6px}',
    '.lm-budget-list{display:grid;gap:8px}',
    '.lm-budget-item{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;min-height:48px;padding:10px 14px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);text-align:start;font:inherit;font-weight:600;cursor:pointer}',
    '.lm-budget-item[aria-pressed=true]{border-color:var(--accent);background:var(--soft);box-shadow:inset 0 0 0 1px var(--accent);outline:none}',
    '.lm-budget-item:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.lm-price{font-variant-numeric:tabular-nums;font-weight:700;color:var(--accent)}',
    /* Transit Schedule */
    '.lt-route-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 14px;border-radius:12px;background:var(--soft);border:2px solid var(--line)}',
    '.lt-route-badge{padding:4px 10px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:.9rem}',
    '.lt-table-wrap{overflow-x:auto;border:2px solid var(--line);border-radius:12px;background:var(--card)}',
    '.lt-table{width:100%;border-collapse:collapse;font-size:.95rem;font-variant-numeric:tabular-nums}',
    '.lt-table caption{text-align:start;padding:8px 12px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--line)}',
    '.lt-table th,.lt-table td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:start;white-space:nowrap}',
    '.lt-table thead th{background:var(--soft);font-weight:700}',
    '@media (max-width:480px){.lt-table{font-size:.84rem}.lt-table th,.lt-table td{padding:7px 6px;white-space:normal}}',
    /* Shared Accessible Choices */
    '.ls-choices{display:grid;gap:8px;list-style:none;margin:0;padding:0}',
    '.ls-choice-btn{width:100%;min-height:48px;padding:11px 14px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);text-align:start;font:inherit;font-weight:600;line-height:1.35;cursor:pointer}',
    '.ls-choice-btn[aria-pressed=true]{border-color:var(--accent);background:var(--soft);box-shadow:inset 0 0 0 1px var(--accent);outline:none}',
    '.ls-choice-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.ls-choice-btn.ls-right{border-color:var(--ok);background:var(--ok-bg)}',
    /* Kitchen Scenario & Sequence */
    '.lk-card{padding:14px 16px;border:2px solid var(--line);border-inline-start:5px solid var(--accent);border-radius:12px;background:var(--soft);display:grid;gap:6px}',
    '.lk-tag{display:inline-block;justify-self:start;align-self:start;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:.82rem;font-weight:700;color:var(--muted)}',
    '.lk-seq-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}',
    '.lk-seq-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:var(--card)}',
    '.lk-seq-num{min-width:30px;height:30px;border-radius:999px;background:var(--soft);border:1.5px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-variant-numeric:tabular-nums}',
    '.lk-seq-text{flex:1 1 200px;font-weight:600;line-height:1.35}',
    '.lk-seq-btns{display:flex;gap:6px}',
    '.lk-seq-btns button{min-height:44px;min-width:44px;padding:6px 10px;font-weight:700}',
    /* Laundry & Care Tags */
    '.ll-garment{padding:12px 14px;border:2px solid var(--line);border-radius:12px;background:var(--card);display:grid;gap:8px}',
    '.ll-ghead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}',
    '.ll-gname{font-weight:700;font-size:1.05rem}',
    '.ll-swatch{display:inline-block;padding:2px 9px;border-radius:999px;border:1.5px solid var(--line);background:var(--soft);font-size:.82rem;font-weight:700}',
    '.ll-badges{display:flex;flex-wrap:wrap;gap:6px}',
    '.ll-badge{padding:3px 9px;border-radius:999px;border:1px dashed var(--line);background:var(--soft);color:var(--muted);font-size:.8rem;font-weight:700}',
    '.ll-bins{display:flex;flex-wrap:wrap;gap:6px}',
    '.ll-bin-btn{min-height:44px;padding:8px 12px;border:2px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-weight:600;cursor:pointer}',
    '.ll-bin-btn[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.ll-bin-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.ll-sort-list{display:grid;gap:10px}',
    /* Community & Emergency Signs */
    '.lg-placard{padding:20px 18px;border-radius:14px;border:4px solid var(--ink);box-shadow:inset 0 0 0 3px currentColor;text-align:center;display:grid;gap:6px;justify-items:center}',
    '.lg-placard-exit{background:#14532d;color:#ffffff;border-color:#052e16}',
    '.lg-placard-danger{background:#991b1b;color:#ffffff;border-color:#450a0a}',
    '.lg-placard-caution{background:#fef08a;color:#111827;border-color:#111827}',
    '.lg-placard-info{background:#1e3a8a;color:#ffffff;border-color:#172554}',
    '.lg-placard-crosswalk{background:#111827;color:#f8fafc;border-color:#334155}',
    '.lg-placard-emergency{background:#7f1d1d;color:#ffffff;border-color:#450a0a}',
    '.lg-sign-sym{font-size:2rem;line-height:1;font-weight:700}',
    '.lg-sign-head{margin:0;font-size:1.55rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}',
    '.lg-sign-sub{margin:0;font-size:1rem;font-weight:600}',
    '@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}',
    '@media (forced-colors:active){.lm-denom,.lt-table-wrap,.lk-card,.lk-seq-row,.ll-garment,.lg-placard{border:2px solid CanvasText}.lm-chip,.ll-badge,.lm-budget-item,.ls-choice-btn,.ll-bin-btn{border:2px solid ButtonText}.lm-budget-item[aria-pressed=true],.ls-choice-btn[aria-pressed=true],.ll-bin-btn[aria-pressed=true]{forced-color-adjust:none;background:Highlight;color:HighlightText;border:2px solid Highlight}[data-read-aloud-btn][aria-pressed=true]{forced-color-adjust:none;background:Highlight;color:HighlightText;border:2px solid Highlight}}',
    '.ls-read-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '[data-read-aloud-btn]{min-height:44px;min-width:44px;padding:6px 12px;font-size:.92rem;border-radius:10px}',
    '[data-read-aloud-btn][aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '[data-read-aloud-btn]:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '@media print{.ls-actions button,.ls-read-row,[data-read-aloud-btn],.lm-dctrls,.lk-seq-btns{display:none!important}}',
  ].join('\n');

  function str(v, max) {
    var s = v == null ? '' : String(v);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += (c < 32 || c === 127) ? ' ' : s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, max || 280);
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function fnv1a(text) {
    var h = 2166136261;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function slug(text, max) {
    var s = str(text, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (s || 'life-skills').slice(0, max || 44);
  }

  function codeName(raw) {
    return str(raw, 40);
  }

  function fileName(title, mode, learner) {
    var base = slug(title, 44) + (mode === 'probe' ? '-check' : '');
    var who = learner ? '__' + slug(learner, 24) : '';
    return base + who + '.html';
  }

  function withCodeName(html, learner) {
    var clean = codeName(learner);
    if (!clean) return html;
    var tag = '<script type="application/json" id="packet-manifest">';
    var start = html.indexOf(tag);
    if (start < 0) return html;
    var bodyStart = start + tag.length;
    var end = html.indexOf('</script>', bodyStart);
    if (end < 0) return html;
    try {
      var obj = JSON.parse(html.slice(bodyStart, end));
      obj.learner = clean;
      var json = JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      return html.slice(0, bodyStart) + json + html.slice(end);
    } catch (_) {
      return html;
    }
  }

  function withSpeechManifest(html) {
    var tag = '<script type="application/json" id="packet-manifest">';
    var start = typeof html === 'string' ? html.indexOf(tag) : -1;
    if (start < 0) return html;
    var bodyStart = start + tag.length;
    var end = html.indexOf('</script>', bodyStart);
    if (end < 0) return html;
    try {
      var obj = JSON.parse(html.slice(bodyStart, end), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return html;
      obj.speech = {
        engine: 'speechSynthesis',
        localOnly: true,
        when: 'only when the learner presses Read aloud',
      };
      var json = JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      return html.slice(0, bodyStart) + json + html.slice(end);
    } catch (_) {
      return html;
    }
  }

  // ---------------------------------------------------------------------------
  // Adapter 1: Making Change & Budgeting (life_money)
  // ---------------------------------------------------------------------------
  function renderLifeMoney(item, ctx) {
    var task = item.task === 'budget' ? 'budget' : item.task === 'make_change' ? 'make_change' : 'exact_pay';
    var locked = false;

    var fmtCents = function (c) {
      var neg = c < 0;
      var a = Math.abs(Math.round(Number(c) || 0));
      var d = Math.floor(a / 100);
      var rem = a % 100;
      return (neg ? '-' : '') + '$' + d + '.' + (rem < 10 ? '0' : '') + rem;
    };

    var wrap = ctx.el('div', { class: 'ls-wrap', 'data-life': 'money', 'data-life-task': task });
    wrap.appendChild(ctx.el('p', { class: 'ls-prompt', 'data-ls-prompt': '', text: item.prompt || 'Count the bills and coins.' }));

    var readout = ctx.el('p', { class: 'ls-readout', 'data-lm-readout': '', 'aria-live': 'polite' });

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'ls-hint-box', 'data-ls-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-ls-hint-btn': '',
        'aria-expanded': 'false',
        on: { click: function () {
          var show = hintBox.hidden;
          hintBox.hidden = !show;
          hintBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
          if (show) ctx.support('hint');
        } },
        text: 'Show hint',
      });
    }

    if (task === 'budget') {
      var budgetCents = Math.max(0, Math.round(Number(item.budgetCents) || 0));
      var minItems = Math.max(1, Math.floor(Number(item.minItems) || 1));
      var requiredIds = Array.isArray(item.requiredIds) ? item.requiredIds.slice() : [];
      var storeItems = Array.isArray(item.storeItems) ? item.storeItems : [];
      var picked = [];

      var header = ctx.el('div', { class: 'lm-receipt' }, [
        ctx.el('div', { class: 'lm-receipt-cell' }, [
          ctx.el('span', { class: 'lm-receipt-lbl', text: 'Budget limit' }),
          ctx.el('span', { class: 'lm-receipt-val', text: fmtCents(budgetCents) }),
        ]),
        ctx.el('div', { class: 'lm-receipt-cell' }, [
          ctx.el('span', { class: 'lm-receipt-lbl', text: 'Items needed' }),
          ctx.el('span', { class: 'lm-receipt-val', text: 'At least ' + minItems }),
        ]),
      ]);
      wrap.appendChild(header);
      wrap.appendChild(readout);

      var listEl = ctx.el('div', { class: 'lm-budget-list', role: 'group', 'aria-label': 'Store items' });
      var itemBtns = [];
      storeItems.forEach(function (si) {
        var b = ctx.el('button', {
          type: 'button',
          class: 'lm-budget-item',
          'data-lm-item': si.id,
          'aria-pressed': 'false',
          on: { click: function () {
            if (locked) return;
            var pos = picked.indexOf(si.id);
            if (pos >= 0) picked.splice(pos, 1); else picked.push(si.id);
            paintBudget(true);
          } },
        }, [
          ctx.el('span', { text: si.name + (si.required ? ' (needed)' : '') }),
          ctx.el('span', { class: 'lm-price', text: fmtCents(si.cents) }),
        ]);
        itemBtns.push({ btn: b, item: si });
        listEl.appendChild(b);
      });
      wrap.appendChild(listEl);

      var clearBtn = ctx.el('button', {
        type: 'button',
        'data-lm-clear': '',
        on: { click: function () { if (locked) return; picked = []; paintBudget(true); } },
        text: 'Clear basket',
      });
      var submitBtn = ctx.el('button', {
        type: 'button',
        class: 'primary',
        'data-ls-submit': '',
        on: { click: function () {
          if (locked || ctx.isDone()) return;
          if (!picked.length) {
            var emptyMsg = 'Select at least one item before checking your budget.';
            if (typeof ctx.feedback === 'function') ctx.feedback(emptyMsg);
            else { readout.textContent = emptyMsg; ctx.announce(emptyMsg); }
            return;
          }
          var total = 0;
          storeItems.forEach(function (si) { if (picked.indexOf(si.id) >= 0) total += Math.round(Number(si.cents) || 0); });
          var sorted = picked.slice().sort();
          var resp = total + 'c:' + sorted.join(',');
          if (ctx.check) { ctx.answer(resp); return; }
          var hasReq = requiredIds.every(function (rid) { return picked.indexOf(rid) >= 0; });
          var ok = total <= budgetCents && picked.length >= minItems && hasReq;
          var retryMsg = total > budgetCents
            ? ('Your basket total is ' + fmtCents(total) + ', which is ' + fmtCents(total - budgetCents) + ' over the ' + fmtCents(budgetCents) + ' budget. Swap for a lower-cost item and try again.')
            : !hasReq
            ? 'Check that every required item is in your basket, then try again.'
            : ('Select at least ' + minItems + ' items while staying within ' + fmtCents(budgetCents) + '.');
          ctx.answer(resp, ok, {
            correctText: 'Right. Your basket totals ' + fmtCents(total) + ' with ' + fmtCents(budgetCents - total) + ' remaining.',
            retryText: retryMsg,
            missedText: 'Stay at or under ' + fmtCents(budgetCents) + ' with at least ' + minItems + ' items including all needed items.',
          });
        } },
        text: ctx.check ? 'Submit basket' : 'Check budget',
      });

      wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitBtn, clearBtn, hintBtn]));
      if (hintBox) wrap.appendChild(hintBox);
      ctx.root.appendChild(wrap);

      var paintBudget = function (say) {
        var total = 0;
        itemBtns.forEach(function (row) {
          var on = picked.indexOf(row.item.id) >= 0;
          if (on) total += Math.round(Number(row.item.cents) || 0);
          row.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          row.btn.disabled = locked;
        });
        clearBtn.disabled = locked || picked.length === 0;
        submitBtn.disabled = locked;
        var activeEl = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
        if (activeEl && activeEl.disabled && ctx.root.contains(activeEl) && !locked) {
          try { (itemBtns[0] ? itemBtns[0].btn : submitBtn).focus(); } catch (_) {}
        }
        if (locked && !ctx.check) {
          var diff = budgetCents - total;
          readout.className = diff < 0 ? 'ls-readout ls-readout-warn' : 'ls-readout';
          var doneLine = 'Basket: ' + fmtCents(total) + ' (' + picked.length + (picked.length === 1 ? ' item' : ' items') + ') \u00b7 '
            + (diff >= 0 ? (fmtCents(diff) + ' left under ' + fmtCents(budgetCents)) : (fmtCents(-diff) + ' over ' + fmtCents(budgetCents)));
          readout.textContent = doneLine;
          if (say) ctx.announce(doneLine);
        } else {
          readout.className = 'ls-readout';
          var line = picked.length + (picked.length === 1 ? ' item' : ' items') + ' selected \u00b7 Budget: ' + fmtCents(budgetCents);
          readout.textContent = line;
          if (say) ctx.announce(line);
        }
      };
      paintBudget(false);
      return { reveal: function () { locked = true; paintBudget(false); } };
    }

    // Bills & coins register (exact_pay or make_change)
    var DENOMS = [
      { id: 'b20', cents: 2000, label: '$20', name: '$20 bill', kind: 'bill', max: 10 },
      { id: 'b10', cents: 1000, label: '$10', name: '$10 bill', kind: 'bill', max: 10 },
      { id: 'b5', cents: 500, label: '$5', name: '$5 bill', kind: 'bill', max: 10 },
      { id: 'b1', cents: 100, label: '$1', name: '$1 bill', kind: 'bill', max: 15 },
      { id: 'c25', cents: 25, label: '25\u00a2', name: 'quarter (25 cents)', kind: 'coin', max: 12 },
      { id: 'c10', cents: 10, label: '10\u00a2', name: 'dime (10 cents)', kind: 'coin', max: 15 },
      { id: 'c5', cents: 5, label: '5\u00a2', name: 'nickel (5 cents)', kind: 'coin', max: 15 },
      { id: 'c1', cents: 1, label: '1\u00a2', name: 'penny (1 cent)', kind: 'coin', max: 20 },
    ];
    var counts = {};
    DENOMS.forEach(function (d) { counts[d.id] = 0; });
    var targetCents = Math.max(0, Math.round(Number(item.targetCents) || 0));

    if (task === 'make_change' || item.costCents != null) {
      var cells = [];
      if (item.costCents != null) {
        cells.push(ctx.el('div', { class: 'lm-receipt-cell' }, [
          ctx.el('span', { class: 'lm-receipt-lbl', text: 'Total cost' }),
          ctx.el('span', { class: 'lm-receipt-val', text: fmtCents(item.costCents) }),
        ]));
      }
      if (item.paidCents != null) {
        cells.push(ctx.el('div', { class: 'lm-receipt-cell' }, [
          ctx.el('span', { class: 'lm-receipt-lbl', text: 'Amount paid' }),
          ctx.el('span', { class: 'lm-receipt-val', text: fmtCents(item.paidCents) }),
        ]));
      }
      if (cells.length) wrap.appendChild(ctx.el('div', { class: 'lm-receipt' }, cells));
    }
    wrap.appendChild(readout);

    var grid = ctx.el('div', { class: 'lm-grid', role: 'group', 'aria-label': 'US bills and coins' });
    var refs = {};
    DENOMS.forEach(function (d) {
      var countEl = ctx.el('span', { class: 'lm-dcount', 'data-lm-count': d.id, text: '0' });
      var decBtn = ctx.el('button', {
        type: 'button',
        'data-lm-dec': d.id,
        'aria-label': 'Remove one ' + d.name,
        on: { click: function () { if (locked || counts[d.id] <= 0) return; counts[d.id]--; paintReg(true); } },
        text: '\u2212',
      });
      var incBtn = ctx.el('button', {
        type: 'button',
        'data-lm-inc': d.id,
        'aria-label': 'Add one ' + d.name,
        on: { click: function () { if (locked || counts[d.id] >= d.max) return; counts[d.id]++; paintReg(true); } },
        text: '+',
      });
      refs[d.id] = { countEl: countEl, decBtn: decBtn, incBtn: incBtn, spec: d };
      grid.appendChild(ctx.el('div', { class: 'lm-denom' }, [
        ctx.el('div', { class: d.kind === 'bill' ? 'lm-chip lm-bill' : 'lm-chip lm-coin', 'aria-hidden': 'true', text: d.label }),
        ctx.el('div', { class: 'lm-dmeta' }, [ctx.el('span', { text: 'Count' }), countEl]),
        ctx.el('div', { class: 'lm-dctrls' }, [decBtn, incBtn]),
      ]));
    });
    wrap.appendChild(grid);

    var totalCentsOf = function () {
      var sum = 0;
      DENOMS.forEach(function (d) { sum += counts[d.id] * d.cents; });
      return sum;
    };

    var clearBtn2 = ctx.el('button', {
      type: 'button',
      'data-lm-clear': '',
      on: { click: function () {
        if (locked) return;
        DENOMS.forEach(function (d) { counts[d.id] = 0; });
        paintReg(true);
      } },
      text: 'Clear tray',
    });

    var submitBtn2 = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-ls-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var sum = totalCentsOf();
        var formatted = fmtCents(sum);
        if (ctx.check) { ctx.answer(formatted); return; }
        var ok = sum === targetCents;
        var retryMsg = sum < targetCents
          ? ('Your tray shows ' + formatted + ', which is ' + fmtCents(targetCents - sum) + ' short. Add bills or coins and try again.')
          : ('Your tray shows ' + formatted + ', which is ' + fmtCents(sum - targetCents) + ' too much. Remove bills or coins and try again.');
        ctx.answer(formatted, ok, {
          correctText: 'Exact match. Your tray equals ' + formatted + '.',
          retryText: retryMsg,
          missedText: 'Target amount: ' + fmtCents(targetCents) + '.',
        });
      } },
      text: ctx.check ? 'Submit amount' : 'Check amount',
    });

    wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitBtn2, clearBtn2, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paintReg = function (say) {
      var sum = totalCentsOf();
      DENOMS.forEach(function (d) {
        var r = refs[d.id];
        r.countEl.textContent = String(counts[d.id]);
        r.decBtn.disabled = locked || counts[d.id] <= 0;
        r.incBtn.disabled = locked || counts[d.id] >= d.max;
      });
      clearBtn2.disabled = locked || sum === 0;
      submitBtn2.disabled = locked;
      var activeEl = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
      if (activeEl && activeEl.disabled && ctx.root.contains(activeEl) && !locked) {
        var decId = activeEl.getAttribute('data-lm-dec');
        var incId = activeEl.getAttribute('data-lm-inc');
        var nextBtn = decId && refs[decId] ? refs[decId].incBtn : incId && refs[incId] ? refs[incId].decBtn : submitBtn2;
        try { if (nextBtn && !nextBtn.disabled) nextBtn.focus(); else submitBtn2.focus(); } catch (_) {}
      }
      var line = 'Tray total: ' + fmtCents(sum) + ' (' + sum + ' cents)';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paintReg(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          var rem = targetCents;
          DENOMS.forEach(function (d) {
            counts[d.id] = Math.min(d.max, Math.floor(rem / d.cents));
            rem -= counts[d.id] * d.cents;
          });
        }
        paintReg(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 2: Transit & Schedule Reading (life_transit)
  // ---------------------------------------------------------------------------
  function renderLifeTransit(item, ctx) {
    var chosen = '';
    var locked = false;
    var choices = Array.isArray(item.choices) ? item.choices : [];
    var stops = Array.isArray(item.stops) ? item.stops : [];
    var runs = Array.isArray(item.runs) ? item.runs : [];

    var wrap = ctx.el('div', { class: 'ls-wrap', 'data-life': 'transit' });
    wrap.appendChild(ctx.el('div', { class: 'lt-route-bar' }, [
      ctx.el('span', { class: 'lt-route-badge', text: item.route || 'Bus Route' }),
      ctx.el('span', { class: 'ls-sub', text: item.serviceNote || 'Weekday Schedule' }),
    ]));
    wrap.appendChild(ctx.el('p', { class: 'ls-prompt', 'data-ls-prompt': '', text: item.prompt || 'Use the schedule to pick the right departure.' }));

    if (stops.length && runs.length) {
      var headRow = ctx.el('tr', {}, [ctx.el('th', { scope: 'col', text: 'Run' })].concat(stops.map(function (st) {
        return ctx.el('th', { scope: 'col', text: st });
      })));
      var bodyRows = runs.map(function (run) {
        return ctx.el('tr', {}, [ctx.el('th', { scope: 'row', text: run.label || '' })].concat((run.times || []).map(function (tm) {
          return ctx.el('td', { text: tm });
        })));
      });
      var tbl = ctx.el('table', { class: 'lt-table', 'data-lt-schedule': '' }, [
        ctx.el('caption', { text: (item.route || 'Transit') + ' timetable' }),
        ctx.el('thead', {}, [headRow]),
        ctx.el('tbody', {}, bodyRows),
      ]);
      wrap.appendChild(ctx.el('div', { class: 'lt-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Transit schedule table' }, [tbl]));
    }

    var readout = ctx.el('p', { class: 'ls-readout', 'data-lt-readout': '', 'aria-live': 'polite', text: 'Select an option below.' });
    wrap.appendChild(readout);

    var choiceList = ctx.el('div', { class: 'ls-choices', role: 'group', 'aria-label': 'Schedule answer choices' });
    var btns = [];
    choices.forEach(function (ch) {
      var cid = String(ch.id != null ? ch.id : ch.label);
      var b = ctx.el('button', {
        type: 'button',
        class: 'ls-choice-btn',
        'data-ls-choice': cid,
        'aria-pressed': 'false',
        on: { click: function () {
          if (locked) return;
          chosen = cid;
          paint(true);
        } },
        text: ch.label || cid,
      });
      btns.push({ btn: b, id: cid, label: ch.label || cid });
      choiceList.appendChild(b);
    });
    wrap.appendChild(choiceList);

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'ls-hint-box', 'data-ls-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-ls-hint-btn': '',
        'aria-expanded': 'false',
        on: { click: function () {
          var show = hintBox.hidden;
          hintBox.hidden = !show;
          hintBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
          if (show) ctx.support('hint');
        } },
        text: 'Show hint',
      });
    }

    var submitBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-ls-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        if (!chosen) {
          var msg = 'Choose an option from the schedule first.';
          if (typeof ctx.feedback === 'function') ctx.feedback(msg);
          else { readout.textContent = msg; ctx.announce(msg); }
          return;
        }
        if (ctx.check) { ctx.answer(chosen); return; }
        var ok = chosen === String(item.targetId || item.target);
        var rightObj = btns.find(function (r) { return r.id === String(item.targetId || item.target); });
        ctx.answer(chosen, ok, {
          correctText: item.explain || ('Correct. ' + (rightObj ? rightObj.label : chosen) + ' fits the schedule.'),
          retryText: item.retryHint || 'Check the arrival and departure times in the table, then try again.',
          missedText: item.explain || ('Matching choice: ' + (rightObj ? rightObj.label : item.target) + '.'),
        });
      } },
      text: ctx.check ? 'Submit choice' : 'Check answer',
    });

    wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paint = function (say) {
      var label = '';
      btns.forEach(function (r) {
        var on = r.id === chosen;
        if (on) label = r.label;
        r.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        r.btn.disabled = locked;
      });
      submitBtn.disabled = locked;
      var line = label ? ('Selected: ' + label) : 'Select an option below.';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          var want = String(item.targetId || item.target || '');
          btns.forEach(function (r) { if (r.id === want) r.btn.classList.add('ls-right'); });
        }
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 3: Kitchen & Home Safety (life_kitchen)
  // ---------------------------------------------------------------------------
  function renderLifeKitchen(item, ctx) {
    var task = item.task === 'sequence' ? 'sequence' : 'decision';
    var locked = false;

    var wrap = ctx.el('div', { class: 'ls-wrap', 'data-life': 'kitchen', 'data-life-task': task });
    wrap.appendChild(ctx.el('div', { class: 'lk-card' }, [
      ctx.el('span', { class: 'lk-tag', text: item.area || 'Kitchen & Home' }),
      ctx.el('p', { class: 'ls-prompt', 'data-ls-prompt': '', text: item.prompt || 'Choose the safe action.' }),
      item.scenario ? ctx.el('p', { class: 'ls-sub', text: item.scenario }) : null,
    ]));

    var readout = ctx.el('p', { class: 'ls-readout', 'data-lk-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'ls-hint-box', 'data-ls-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-ls-hint-btn': '',
        'aria-expanded': 'false',
        on: { click: function () {
          var show = hintBox.hidden;
          hintBox.hidden = !show;
          hintBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
          if (show) ctx.support('hint');
        } },
        text: 'Show hint',
      });
    }

    if (task === 'sequence') {
      var rawSteps = Array.isArray(item.steps) ? item.steps.slice() : [];
      var order = rawSteps.map(function (st, idx) { return { id: String(st.id || ('s' + (idx + 1))), text: st.text || String(st) }; });
      // Deterministic shuffle if item did not already supply a pre-shuffled display order
      if (order.length >= 2 && !item.shuffled) {
        var seed = 2166136261;
        var keyStr = String(item.id || 'kit') + ':' + order.length;
        for (var si = 0; si < keyStr.length; si++) { seed ^= keyStr.charCodeAt(si); seed = Math.imul(seed, 16777619); }
        var origIds = order.map(function (s) { return s.id; }).join('>');
        for (var j = order.length - 1; j > 0; j--) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          var swap = seed % (j + 1);
          var tmp = order[j]; order[j] = order[swap]; order[swap] = tmp;
        }
        if (order.map(function (s) { return s.id; }).join('>') === origIds) {
          var first = order.shift(); order.push(first);
        }
      }
      var listEl = ctx.el('ol', { class: 'lk-seq-list', 'data-lk-seq': '' });
      wrap.appendChild(listEl);

      var moveStep = function (idx, dir) {
        if (locked) return;
        var next = idx + dir;
        if (next < 0 || next >= order.length) return;
        var tmp = order[idx]; order[idx] = order[next]; order[next] = tmp;
        paintSeq(true, next, dir < 0 ? 'up' : 'down');
      };

      var submitSeq = ctx.el('button', {
        type: 'button',
        class: 'primary',
        'data-ls-submit': '',
        on: { click: function () {
          if (locked || ctx.isDone()) return;
          var got = order.map(function (s) { return s.id; }).join('>');
          if (ctx.check) { ctx.answer(got); return; }
          var want = String(item.targetOrder || rawSteps.map(function (s, i) { return String(s.id || ('s' + (i + 1))); }).join('>'));
          var ok = got === want;
          ctx.answer(got, ok, {
            correctText: item.explain || 'Every step is in the right order.',
            retryText: 'Check which step must happen first and last, adjust the order, and try again.',
            missedText: item.explain || ('Correct order: ' + rawSteps.map(function (s, i) { return (i + 1) + '. ' + (s.text || s); }).join(' ')),
          });
        } },
        text: ctx.check ? 'Submit order' : 'Check order',
      });

      wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitSeq, hintBtn]));
      if (hintBox) wrap.appendChild(hintBox);
      ctx.root.appendChild(wrap);

      var paintSeq = function (say, focusIdx, preferDir) {
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        var rowCtrls = [];
        order.forEach(function (st, idx) {
          var upBtn = ctx.el('button', {
            type: 'button',
            'data-lk-up': st.id,
            'aria-label': 'Move step up: ' + st.text,
            on: { click: function () { moveStep(idx, -1); } },
            text: '\u2191 Up',
          });
          var downBtn = ctx.el('button', {
            type: 'button',
            'data-lk-down': st.id,
            'aria-label': 'Move step down: ' + st.text,
            on: { click: function () { moveStep(idx, 1); } },
            text: '\u2193 Down',
          });
          upBtn.disabled = locked || idx === 0;
          downBtn.disabled = locked || idx === order.length - 1;
          var li = ctx.el('li', { class: 'lk-seq-row', 'data-lk-step': st.id }, [
            ctx.el('span', { class: 'lk-seq-num', 'aria-hidden': 'true', text: String(idx + 1) }),
            ctx.el('span', { class: 'lk-seq-text', text: st.text }),
            ctx.el('div', { class: 'lk-seq-btns' }, [upBtn, downBtn]),
          ]);
          rowCtrls.push({ up: upBtn, down: downBtn });
          listEl.appendChild(li);
        });
        submitSeq.disabled = locked;
        if (typeof focusIdx === 'number' && rowCtrls[focusIdx] && !locked) {
          var ctrl = rowCtrls[focusIdx];
          var targetBtn = preferDir === 'up'
            ? (!ctrl.up.disabled ? ctrl.up : ctrl.down)
            : (!ctrl.down.disabled ? ctrl.down : ctrl.up);
          try { if (targetBtn && !targetBtn.disabled) targetBtn.focus(); else submitSeq.focus(); } catch (_) {}
        }
        var line = 'Order: ' + order.map(function (s, i) { return (i + 1) + '. ' + s.text; }).join(' | ');
        readout.textContent = 'Arrange the ' + order.length + ' steps from first to last.';
        if (say) ctx.announce(line);
      };
      paintSeq(false);
      return {
        reveal: function () {
          locked = true;
          if (!ctx.check) {
            order = rawSteps.map(function (st, idx) { return { id: String(st.id || ('s' + (idx + 1))), text: st.text || String(st) }; });
          }
          paintSeq(false);
        },
      };
    }

    // Decision scenario
    var chosen = '';
    var choices = Array.isArray(item.choices) ? item.choices : [];
    var choiceList = ctx.el('div', { class: 'ls-choices', role: 'group', 'aria-label': 'Action choices' });
    var btns = [];
    choices.forEach(function (ch) {
      var cid = String(ch.id != null ? ch.id : ch.label);
      var b = ctx.el('button', {
        type: 'button',
        class: 'ls-choice-btn',
        'data-ls-choice': cid,
        'aria-pressed': 'false',
        on: { click: function () { if (locked) return; chosen = cid; paintDec(true); } },
        text: ch.label || cid,
      });
      btns.push({ btn: b, id: cid, label: ch.label || cid });
      choiceList.appendChild(b);
    });
    wrap.appendChild(choiceList);

    var submitDec = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-ls-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        if (!chosen) {
          var msg = 'Choose an action first.';
          if (typeof ctx.feedback === 'function') ctx.feedback(msg);
          else { readout.textContent = msg; ctx.announce(msg); }
          return;
        }
        if (ctx.check) { ctx.answer(chosen); return; }
        var want = String(item.targetId || item.target);
        var ok = chosen === want;
        var rightObj = btns.find(function (r) { return r.id === want; });
        ctx.answer(chosen, ok, {
          correctText: item.explain || 'Good decision. That prevents injury or contamination.',
          retryText: item.retryHint || 'Think about the risk in this situation and try another choice.',
          missedText: item.explain || ('Recommended action: ' + (rightObj ? rightObj.label : want) + '.'),
        });
      } },
      text: ctx.check ? 'Submit choice' : 'Check choice',
    });

    wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitDec, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paintDec = function (say) {
      var lbl = '';
      btns.forEach(function (r) {
        var on = r.id === chosen;
        if (on) lbl = r.label;
        r.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        r.btn.disabled = locked;
      });
      submitDec.disabled = locked;
      var line = lbl ? ('Selected: ' + lbl) : 'Choose the best action for this situation.';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paintDec(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          var want = String(item.targetId || item.target || '');
          btns.forEach(function (r) { if (r.id === want) r.btn.classList.add('ls-right'); });
        }
        paintDec(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 4: Laundry & Care Sorting (life_laundry)
  // ---------------------------------------------------------------------------
  function renderLifeLaundry(item, ctx) {
    var task = item.task === 'setting' ? 'setting' : 'sort';
    var locked = false;

    var wrap = ctx.el('div', { class: 'ls-wrap', 'data-life': 'laundry', 'data-life-task': task });
    wrap.appendChild(ctx.el('p', { class: 'ls-prompt', 'data-ls-prompt': '', text: item.prompt || 'Sort each garment into the right laundry load.' }));

    var readout = ctx.el('p', { class: 'ls-readout', 'data-ll-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'ls-hint-box', 'data-ls-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-ls-hint-btn': '',
        'aria-expanded': 'false',
        on: { click: function () {
          var show = hintBox.hidden;
          hintBox.hidden = !show;
          hintBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
          if (show) ctx.support('hint');
        } },
        text: 'Show hint',
      });
    }

    if (task === 'setting') {
      var garment = item.garment || { name: 'Garment', color: 'Mixed', badges: ['Cold Wash', 'Air Dry'] };
      wrap.appendChild(ctx.el('div', { class: 'll-garment' }, [
        ctx.el('div', { class: 'll-ghead' }, [
          ctx.el('span', { class: 'll-gname', text: garment.name || 'Garment' }),
          garment.color ? ctx.el('span', { class: 'll-swatch', text: garment.color }) : null,
        ]),
        ctx.el('div', { class: 'll-badges', 'aria-label': 'Care label symbols' }, (garment.badges || []).map(function (bd) {
          return ctx.el('span', { class: 'll-badge', text: bd });
        })),
      ]));
      var chosenSet = '';
      var options = Array.isArray(item.choices) ? item.choices : [];
      var list = ctx.el('div', { class: 'ls-choices', role: 'group', 'aria-label': 'Washer and dryer settings' });
      var optBtns = [];
      options.forEach(function (opt) {
        var oid = String(opt.id != null ? opt.id : opt.label);
        var b = ctx.el('button', {
          type: 'button',
          class: 'ls-choice-btn',
          'data-ls-choice': oid,
          'aria-pressed': 'false',
          on: { click: function () { if (locked) return; chosenSet = oid; paintSetting(true); } },
          text: opt.label || oid,
        });
        optBtns.push({ btn: b, id: oid, label: opt.label || oid });
        list.appendChild(b);
      });
      wrap.appendChild(list);

      var submitSet = ctx.el('button', {
        type: 'button',
        class: 'primary',
        'data-ls-submit': '',
        on: { click: function () {
          if (locked || ctx.isDone()) return;
          if (!chosenSet) {
            var msg = 'Choose a washer and dryer setting first.';
            if (typeof ctx.feedback === 'function') ctx.feedback(msg);
            else { readout.textContent = msg; ctx.announce(msg); }
            return;
          }
          if (ctx.check) { ctx.answer(chosenSet); return; }
          var want = String(item.targetId || item.target);
          var ok = chosenSet === want;
          var rightObj = optBtns.find(function (r) { return r.id === want; });
          ctx.answer(chosenSet, ok, {
            correctText: item.explain || 'That setting matches every care tag on the garment.',
            retryText: 'Read each care badge on the garment tag (temperature, bleach, and drying), then try again.',
            missedText: item.explain || ('Matching setting: ' + (rightObj ? rightObj.label : want) + '.'),
          });
        } },
        text: ctx.check ? 'Submit setting' : 'Check setting',
      });
      wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitSet, hintBtn]));
      if (hintBox) wrap.appendChild(hintBox);
      ctx.root.appendChild(wrap);

      var paintSetting = function (say) {
        var lbl = '';
        optBtns.forEach(function (r) {
          var on = r.id === chosenSet;
          if (on) lbl = r.label;
          r.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          r.btn.disabled = locked;
        });
        submitSet.disabled = locked;
        var line = lbl ? ('Selected setting: ' + lbl) : 'Select the washer and dryer setting that matches the care tag.';
        readout.textContent = line;
        if (say) ctx.announce(line);
      };
      paintSetting(false);
      return {
        reveal: function () {
          locked = true;
          if (!ctx.check) {
            var want = String(item.targetId || item.target || '');
            optBtns.forEach(function (r) { if (r.id === want) r.btn.classList.add('ls-right'); });
          }
          paintSetting(false);
        },
      };
    }

    // Load sorting task
    var baskets = Array.isArray(item.baskets) && item.baskets.length ? item.baskets : [
      { id: 'lights', label: 'Whites & Lights' },
      { id: 'darks', label: 'Darks & Colors' },
      { id: 'delicates', label: 'Delicates (Cold)' },
    ];
    var garments = Array.isArray(item.garments) ? item.garments : [];
    var assigned = Object.create(null);
    var sortList = ctx.el('div', { class: 'll-sort-list' });
    var gRefs = [];
    garments.forEach(function (g) {
      var gid = String(g.id);
      var binRow = ctx.el('div', { class: 'll-bins', role: 'group', 'aria-label': 'Choose load for ' + g.name });
      var bList = [];
      baskets.forEach(function (bk) {
        var bb = ctx.el('button', {
          type: 'button',
          class: 'll-bin-btn',
          'data-ll-assign': gid + ':' + bk.id,
          'aria-pressed': 'false',
          on: { click: function () {
            if (locked) return;
            assigned[gid] = bk.id;
            paintSort(true, g.name + ' placed in ' + bk.label + '.');
          } },
          text: bk.label,
        });
        bList.push({ btn: bb, basketId: bk.id });
        binRow.appendChild(bb);
      });
      gRefs.push({ id: gid, garment: g, btns: bList });
      sortList.appendChild(ctx.el('div', { class: 'll-garment', 'data-ll-garment': gid }, [
        ctx.el('div', { class: 'll-ghead' }, [
          ctx.el('span', { class: 'll-gname', text: g.name }),
          g.color ? ctx.el('span', { class: 'll-swatch', text: g.color }) : null,
        ]),
        Array.isArray(g.badges) && g.badges.length
          ? ctx.el('div', { class: 'll-badges' }, g.badges.map(function (bd) { return ctx.el('span', { class: 'll-badge', text: bd }); }))
          : null,
        binRow,
      ]));
    });
    wrap.appendChild(sortList);

    var submitSort = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-ls-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var missing = garments.filter(function (g) { return !assigned[String(g.id)]; });
        if (missing.length) {
          var msg = 'Assign every garment to a load before checking (' + missing.length + ' left).';
          if (typeof ctx.feedback === 'function') ctx.feedback(msg);
          else { readout.textContent = msg; ctx.announce(msg); }
          return;
        }
        var resp = garments.map(function (g) { return g.id + '=' + (assigned[String(g.id)] || ''); }).join(';');
        if (ctx.check) { ctx.answer(resp); return; }
        var wrong = garments.filter(function (g) { return assigned[String(g.id)] !== g.basket; });
        var ok = wrong.length === 0;
        ctx.answer(resp, ok, {
          correctText: item.explain || 'Every garment is in the matching laundry load.',
          retryText: wrong.length + (wrong.length === 1 ? ' garment needs' : ' garments need') + ' a different load. Check colors and delicate/cold tags, then try again.',
          missedText: garments.map(function (g) {
            var bk = baskets.find(function (b) { return b.id === g.basket; });
            return g.name + ': ' + (bk ? bk.label : g.basket);
          }).join(' | '),
        });
      } },
      text: ctx.check ? 'Submit loads' : 'Check loads',
    });

    wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitSort, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paintSort = function (say, extra) {
      var placed = 0;
      gRefs.forEach(function (gr) {
        if (assigned[gr.id]) placed++;
        gr.btns.forEach(function (b) {
          b.btn.setAttribute('aria-pressed', assigned[gr.id] === b.basketId ? 'true' : 'false');
          b.btn.disabled = locked;
        });
      });
      submitSort.disabled = locked;
      var line = placed + ' of ' + garments.length + ' garments sorted into loads.';
      readout.textContent = line;
      if (say) ctx.announce((extra ? extra + ' ' : '') + line);
    };
    paintSort(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          garments.forEach(function (g) { if (g.basket) assigned[String(g.id)] = g.basket; });
        }
        paintSort(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 5: Community & Emergency Signs (life_signs)
  // ---------------------------------------------------------------------------
  function renderLifeSigns(item, ctx) {
    var chosen = '';
    var locked = false;
    var choices = Array.isArray(item.choices) ? item.choices : [];
    var tone = /^(exit|danger|caution|info|crosswalk|emergency)$/.test(item.tone || '') ? item.tone : 'info';

    var wrap = ctx.el('div', { class: 'ls-wrap', 'data-life': 'signs' });
    wrap.appendChild(ctx.el('div', {
      class: 'lg-placard lg-placard-' + tone,
      role: 'img',
      'aria-label': 'Sign reading: ' + (item.signTitle || '') + (item.signSub ? ' - ' + item.signSub : ''),
      'data-lg-sign': tone,
    }, [
      item.symbol ? ctx.el('span', { class: 'lg-sign-sym', 'aria-hidden': 'true', text: item.symbol }) : null,
      ctx.el('p', { class: 'lg-sign-head', text: item.signTitle || 'SIGN' }),
      item.signSub ? ctx.el('p', { class: 'lg-sign-sub', text: item.signSub }) : null,
    ]));

    wrap.appendChild(ctx.el('p', { class: 'ls-prompt', 'data-ls-prompt': '', text: item.prompt || 'What should you do when you see this sign?' }));
    if (item.location) wrap.appendChild(ctx.el('p', { class: 'ls-sub', text: 'Location: ' + item.location }));

    var readout = ctx.el('p', { class: 'ls-readout', 'data-lg-readout': '', 'aria-live': 'polite', text: 'Choose the matching action below.' });
    wrap.appendChild(readout);

    var list = ctx.el('div', { class: 'ls-choices', role: 'group', 'aria-label': 'Sign response choices' });
    var btns = [];
    choices.forEach(function (ch) {
      var cid = String(ch.id != null ? ch.id : ch.label);
      var b = ctx.el('button', {
        type: 'button',
        class: 'ls-choice-btn',
        'data-ls-choice': cid,
        'aria-pressed': 'false',
        on: { click: function () { if (locked) return; chosen = cid; paint(true); } },
        text: ch.label || cid,
      });
      btns.push({ btn: b, id: cid, label: ch.label || cid });
      list.appendChild(b);
    });
    wrap.appendChild(list);

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'ls-hint-box', 'data-ls-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-ls-hint-btn': '',
        'aria-expanded': 'false',
        on: { click: function () {
          var show = hintBox.hidden;
          hintBox.hidden = !show;
          hintBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
          if (show) ctx.support('hint');
        } },
        text: 'Show hint',
      });
    }

    var submitBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-ls-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        if (!chosen) {
          var msg = 'Choose a response first.';
          if (typeof ctx.feedback === 'function') ctx.feedback(msg);
          else { readout.textContent = msg; ctx.announce(msg); }
          return;
        }
        if (ctx.check) { ctx.answer(chosen); return; }
        var want = String(item.targetId || item.target);
        var ok = chosen === want;
        var rightObj = btns.find(function (r) { return r.id === want; });
        ctx.answer(chosen, ok, {
          correctText: item.explain || 'Correct. That matches what this sign tells you to do.',
          retryText: item.retryHint || 'Look closely at the sign words and symbol, then try another choice.',
          missedText: item.explain || ('Matching action: ' + (rightObj ? rightObj.label : want) + '.'),
        });
      } },
      text: ctx.check ? 'Submit answer' : 'Check answer',
    });

    wrap.appendChild(ctx.el('div', { class: 'ls-actions' }, [submitBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paint = function (say) {
      var lbl = '';
      btns.forEach(function (r) {
        var on = r.id === chosen;
        if (on) lbl = r.label;
        r.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        r.btn.disabled = locked;
      });
      submitBtn.disabled = locked;
      var line = lbl ? ('Selected: ' + lbl) : 'Choose the matching action below.';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          var want = String(item.targetId || item.target || '');
          btns.forEach(function (r) { if (r.id === want) r.btn.classList.add('ls-right'); });
        }
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Self-contained Read Aloud wrapper for all 5 Life Skills adapters
  // ---------------------------------------------------------------------------
  function lifeReadAloudWrapper(origRender, activityId) {
    return function (item, ctx) {
      var handle = origRender(item, ctx) || {};
      var root = ctx && ctx.root;
      if (!root) return handle;
      var L = (ctx && ctx.L) || {};
      var doc = root.ownerDocument;
      var view = doc && doc.defaultView;
      var synth = view && view.speechSynthesis && typeof view.speechSynthesis.speak === 'function' ? view.speechSynthesis : null;
      var speaking = false;
      var gen = 0;
      var obs = null;
      var readBtn = null;

      var disconnectObs = function () {
        if (obs) { try { obs.disconnect(); } catch (_) {} obs = null; }
      };

      var setBtnState = function (active) {
        speaking = !!active;
        if (readBtn) {
          readBtn.setAttribute('aria-pressed', speaking ? 'true' : 'false');
          readBtn.textContent = speaking ? 'Stop reading' : 'Read aloud';
        }
        if (!speaking) disconnectObs();
      };

      var stopSpeech = function () {
        gen++;
        var was = speaking;
        setBtnState(false);
        if (synth && (was || synth.speaking || synth.pending)) {
          try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        }
      };

      var readRate = function () {
        var attr = doc && doc.documentElement ? String(doc.documentElement.getAttribute('data-audio-speed') || '').trim().toLowerCase() : '';
        if (attr === 'slow') return 0.75;
        var n = Number(attr);
        if (attr && isFinite(n) && n >= 0.5 && n <= 2) return n;
        if (typeof ctx.speedRate === 'function') {
          var sr = Number(ctx.speedRate());
          if (isFinite(sr) && sr > 0 && sr !== 1) return sr;
        }
        if (typeof ctx.slow === 'function' && ctx.slow()) return 0.75;
        return 1.0;
      };

      var getVisiblePromptText = function () {
        var parts = [];
        var add = function (s) {
          var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
          if (t && parts.indexOf(t) < 0) parts.push(t);
        };
        if (activityId === 'life_transit') {
          add(item && item.route);
          add(item && item.serviceNote);
          add((item && item.prompt) || 'Use the schedule to pick the right departure.');
          add(L.life_transit_directions);
        } else if (activityId === 'life_kitchen') {
          add(item && item.area);
          add((item && item.prompt) || 'Choose the safe action.');
          add(item && item.scenario);
          add(L.life_kitchen_directions);
        } else if (activityId === 'life_laundry') {
          add((item && item.prompt) || 'Sort each garment into the right laundry load.');
          add(L.life_laundry_directions);
        } else if (activityId === 'life_signs') {
          if (item && item.signTitle) add('Sign: ' + item.signTitle);
          add(item && item.signSub);
          add((item && item.prompt) || 'What should you do when you see this sign?');
          if (item && item.location) add('Location: ' + item.location);
          add(L.life_signs_directions);
        } else {
          add((item && item.prompt) || 'Count the bills and coins.');
          add(L.life_money_directions);
        }
        return parts.map(function (p) { return /[.!?]$/.test(p) ? p : p + '.'; }).join(' ');
      };

      var cleanup = function () {
        disconnectObs();
        if (doc) {
          doc.removeEventListener('keydown', onKeyDown);
          doc.removeEventListener('click', onDocClick, true);
        }
        if (view) {
          view.removeEventListener('pagehide', onUnload);
          view.removeEventListener('beforeunload', onUnload);
        }
      };

      var onKeyDown = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        var k = ev && ev.key;
        if ((k === 'Escape' || k === 'Esc') && speaking) stopSpeech();
      };

      var onDocClick = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        if (!speaking || !ev || !ev.target) return;
        var t = ev.target.closest ? ev.target.closest('button') : null;
        if (!t || t === readBtn) return;
        if (t.hasAttribute('data-stop-audio') || /stop audio/i.test(String(t.textContent || ''))) {
          stopSpeech();
        }
      };

      var onUnload = function () {
        stopSpeech();
        cleanup();
      };

      if (synth && doc) {
        doc.addEventListener('keydown', onKeyDown);
        doc.addEventListener('click', onDocClick, true);
      }
      if (synth && view) {
        view.addEventListener('pagehide', onUnload);
        view.addEventListener('beforeunload', onUnload);
      }

      var speakNow = function () {
        if (!synth) return;
        if (speaking) { stopSpeech(); return; }
        var text = getVisiblePromptText();
        if (!text) return;
        if (typeof ctx.support === 'function') ctx.support('readAloud');
        gen++;
        var mine = gen;
        try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        var Utter = typeof view.SpeechSynthesisUtterance === 'function' ? view.SpeechSynthesisUtterance : null;
        var u = Utter ? new Utter(text) : { text: text, rate: 1.0, lang: 'en-US' };
        u.rate = readRate();
        var lang = (doc && doc.documentElement && doc.documentElement.lang) || 'en-US';
        u.lang = lang;
        try {
          if (typeof synth.getVoices === 'function') {
            var voices = synth.getVoices() || [];
            var want = String(lang).toLowerCase().split('-')[0];
            var local = voices.filter(function (v) {
              return v && v.localService === true && String(v.lang || '').toLowerCase().replace('_', '-').indexOf(want) === 0;
            })[0];
            if (local) { u.voice = local; u.lang = local.lang || lang; }
          }
        } catch (_) {}
        u.onend = function () { if (mine === gen) setBtnState(false); };
        u.onerror = function () { if (mine === gen) setBtnState(false); };
        setBtnState(true);
        if (view && typeof view.MutationObserver === 'function' && doc && doc.body) {
          disconnectObs();
          obs = new view.MutationObserver(function () {
            if (!root.isConnected) { stopSpeech(); cleanup(); }
          });
          try { obs.observe(doc.getElementById('app') || doc.body, { childList: true, subtree: true }); } catch (_) {}
        }
        try {
          synth.speak(u);
        } catch (_) {
          if (mine === gen) setBtnState(false);
        }
      };

      readBtn = ctx.el('button', {
        type: 'button',
        'data-read-aloud-btn': '',
        'aria-pressed': 'false',
        hidden: !synth,
        on: { click: speakNow },
        text: 'Read aloud',
      });

      var row = ctx.el('div', { class: 'ls-read-row' }, [readBtn]);
      var wrap = root.querySelector('.ls-wrap') || root;
      var anchor = wrap.querySelector('.lk-card') || wrap.querySelector('[data-ls-prompt]');
      if (anchor && anchor.parentNode === wrap) {
        wrap.insertBefore(row, anchor.nextSibling);
      } else {
        wrap.insertBefore(row, wrap.firstChild);
      }

      var origReveal = handle && typeof handle.reveal === 'function' ? handle.reveal : null;
      return Object.assign({}, handle, {
        reveal: function () {
          stopSpeech();
          if (origReveal) return origReveal.apply(handle, arguments);
        },
      });
    };
  }

  function wrapLifeRender(origRender, activityId) {
    var wrapped = function (item, ctx) {
      return lifeReadAloudWrapper(origRender, activityId)(item, ctx);
    };
    var src = '(' + lifeReadAloudWrapper.toString() + ')(' + origRender.toString() + ',' + JSON.stringify(activityId) + ')';
    wrapped.toString = function () { return src; };
    return wrapped;
  }

  // ---------------------------------------------------------------------------
  // Check-mode prepare() and score(item, expected, given) for all 5 domains
  // ---------------------------------------------------------------------------
  var ADAPTERS = {
    life_money: {
      id: 'life_money',
      title: 'Making Change & Budgeting',
      labels: {
        life_money_title: 'Making Change & Budgeting',
        life_money_directions: 'Build each amount using bills and coins or select items within the budget, then submit.',
        life_money_practice_wrong: 'Target: {answer}.',
      },
      prepare: function (raw) {
        var task = raw.task === 'budget' ? 'budget' : raw.task === 'make_change' ? 'make_change' : 'exact_pay';
        if (task === 'budget') {
          var bc = Math.max(0, Math.round(Number(raw.budgetCents) || 0));
          var minI = Math.max(1, Math.floor(Number(raw.minItems) || 1));
          var req = Array.isArray(raw.requiredIds) ? raw.requiredIds.slice().sort() : [];
          return {
            item: {
              id: str(raw.id, 40) || 'lm-b1',
              word: str(raw.word || 'Budget check', 60),
              prompt: str(raw.prompt || 'Choose items within budget.', 240),
              task: 'budget',
              budgetCents: bc,
              minItems: minI,
              storeItems: clone(raw.storeItems || []),
              answer: 'budget:' + bc + ':' + minI + ':' + req.join(','),
            },
          };
        }
        var tc = Math.max(0, Math.round(Number(raw.targetCents) || 0));
        var d = Math.floor(tc / 100), r = tc % 100;
        var clean = {
          id: str(raw.id, 40) || 'lm-1',
          word: str(raw.word || 'Money', 60),
          prompt: str(raw.prompt || 'Count the matching amount.', 240),
          task: task,
          answer: '$' + d + '.' + (r < 10 ? '0' : '') + r,
        };
        if (raw.costCents != null) clean.costCents = Math.round(Number(raw.costCents));
        if (raw.paidCents != null) clean.paidCents = Math.round(Number(raw.paidCents));
        return { item: clean };
      },
      score: function (item, expected, given) {
        var exp = String(expected || '').trim();
        var got = String(given || '').trim();
        if (exp.indexOf('budget:') === 0) {
          var bp = exp.split(':');
          var maxC = Number(bp[1]), minI = Number(bp[2]);
          var req = bp[3] ? bp[3].split(',').filter(Boolean) : [];
          var gm = /^(\d+)c:(.*)$/.exec(got);
          if (!gm) return { correct: false };
          var cents = Number(gm[1]);
          var picks = gm[2] ? gm[2].split(',').filter(Boolean) : [];
          return { correct: cents <= maxC && picks.length >= minI && req.every(function (r) { return picks.indexOf(r) >= 0; }) };
        }
        return { correct: got === exp };
      },
      render: wrapLifeRender(renderLifeMoney, 'life_money'),
    },
    life_transit: {
      id: 'life_transit',
      title: 'Transit & Schedule Reading',
      labels: {
        life_transit_title: 'Transit & Schedule Reading',
        life_transit_directions: 'Read the schedule table and select the choice that fits the trip goal.',
        life_transit_practice_wrong: 'Expected choice: {answer}.',
      },
      prepare: function (raw) {
        var ans = str(raw.targetId || raw.target, 60);
        if (!ans) return { missing: ['targetId'] };
        return {
          item: {
            id: str(raw.id, 40) || 'lt-1',
            word: str(raw.word || raw.route || 'Schedule', 60),
            route: str(raw.route || 'Bus Route', 60),
            serviceNote: str(raw.serviceNote || 'Weekday Schedule', 60),
            prompt: str(raw.prompt || 'Choose the matching departure.', 240),
            stops: clone(raw.stops || []),
            runs: clone(raw.runs || []),
            choices: clone(raw.choices || []),
            answer: ans,
          },
        };
      },
      score: function (item, expected, given) {
        return { correct: String(given || '').trim() === String(expected || '').trim() };
      },
      render: wrapLifeRender(renderLifeTransit, 'life_transit'),
    },
    life_kitchen: {
      id: 'life_kitchen',
      title: 'Kitchen & Home Safety',
      labels: {
        life_kitchen_title: 'Kitchen & Home Safety',
        life_kitchen_directions: 'Choose the safe home action or place the safety steps in order from first to last.',
        life_kitchen_practice_wrong: 'Expected response: {answer}.',
      },
      prepare: function (raw) {
        var task = raw.task === 'sequence' ? 'sequence' : 'decision';
        if (task === 'sequence') {
          var steps = Array.isArray(raw.steps) ? raw.steps.map(function (st, i) { return { id: String(st.id || ('s' + (i + 1))), text: str(st.text || st, 180) }; }) : [];
          if (steps.length < 2) return { missing: ['steps'] };
          var ansOrder = steps.map(function (s) { return s.id; }).join('>');
          var shuf = steps.slice();
          var seed = 2166136261;
          var keyStr = String(raw.id || 'kit') + ':' + shuf.length;
          for (var si = 0; si < keyStr.length; si++) { seed ^= keyStr.charCodeAt(si); seed = Math.imul(seed, 16777619); }
          for (var j = shuf.length - 1; j > 0; j--) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            var sw = seed % (j + 1);
            var tmp = shuf[j]; shuf[j] = shuf[sw]; shuf[sw] = tmp;
          }
          if (shuf.map(function (s) { return s.id; }).join('>') === ansOrder) {
            var first = shuf.shift(); shuf.push(first);
          }
          return {
            item: {
              id: str(raw.id, 40) || 'lk-s1',
              word: str(raw.word || 'Safety steps', 60),
              area: str(raw.area || 'Kitchen & Home', 40),
              prompt: str(raw.prompt || 'Put the steps in order.', 240),
              scenario: str(raw.scenario || '', 240),
              task: 'sequence',
              steps: shuf,
              shuffled: true,
              answer: ansOrder,
            },
          };
        }
        var ans = str(raw.targetId || raw.target, 60);
        if (!ans) return { missing: ['targetId'] };
        return {
          item: {
            id: str(raw.id, 40) || 'lk-1',
            word: str(raw.word || 'Kitchen safety', 60),
            area: str(raw.area || 'Kitchen & Home', 40),
            prompt: str(raw.prompt || 'Choose the safe action.', 240),
            scenario: str(raw.scenario || '', 240),
            task: 'decision',
            choices: clone(raw.choices || []),
            answer: ans,
          },
        };
      },
      score: function (item, expected, given) {
        return { correct: String(given || '').trim() === String(expected || '').trim() };
      },
      render: wrapLifeRender(renderLifeKitchen, 'life_kitchen'),
    },
    life_laundry: {
      id: 'life_laundry',
      title: 'Laundry & Care Sorting',
      labels: {
        life_laundry_title: 'Laundry & Care Sorting',
        life_laundry_directions: 'Sort each garment into its matching load or select the right washer and dryer setting.',
        life_laundry_practice_wrong: 'Expected: {answer}.',
      },
      prepare: function (raw) {
        var task = raw.task === 'setting' ? 'setting' : 'sort';
        if (task === 'setting') {
          var ans = str(raw.targetId || raw.target, 60);
          if (!ans) return { missing: ['targetId'] };
          return {
            item: {
              id: str(raw.id, 40) || 'll-s1',
              word: str(raw.word || 'Care tag', 60),
              prompt: str(raw.prompt || 'Pick the matching washer and dryer setting.', 240),
              task: 'setting',
              garment: clone(raw.garment || {}),
              choices: clone(raw.choices || []),
              answer: ans,
            },
          };
        }
        var garments = Array.isArray(raw.garments) ? raw.garments : [];
        if (!garments.length) return { missing: ['garments'] };
        var ansMap = garments.map(function (g) { return g.id + '=' + g.basket; }).join(';');
        var stripped = garments.map(function (g) {
          return { id: str(g.id, 30), name: str(g.name, 60), color: str(g.color, 30), badges: clone(g.badges || []) };
        });
        return {
          item: {
            id: str(raw.id, 40) || 'll-1',
            word: str(raw.word || 'Laundry sort', 60),
            prompt: str(raw.prompt || 'Sort each garment into the right load.', 240),
            task: 'sort',
            baskets: clone(raw.baskets || []),
            garments: stripped,
            answer: ansMap,
          },
        };
      },
      score: function (item, expected, given) {
        return { correct: String(given || '').trim() === String(expected || '').trim() };
      },
      render: wrapLifeRender(renderLifeLaundry, 'life_laundry'),
    },
    life_signs: {
      id: 'life_signs',
      title: 'Community & Emergency Signs',
      labels: {
        life_signs_title: 'Community & Emergency Signs',
        life_signs_directions: 'Read each community or emergency sign and choose the matching action.',
        life_signs_practice_wrong: 'Expected choice: {answer}.',
      },
      prepare: function (raw) {
        var ans = str(raw.targetId || raw.target, 60);
        if (!ans) return { missing: ['targetId'] };
        return {
          item: {
            id: str(raw.id, 40) || 'lg-1',
            word: str(raw.word || raw.signTitle || 'Community sign', 60),
            tone: str(raw.tone || 'info', 20),
            symbol: str(raw.symbol || '', 8),
            signTitle: str(raw.signTitle || 'SIGN', 60),
            signSub: str(raw.signSub || '', 100),
            location: str(raw.location || '', 100),
            prompt: str(raw.prompt || 'What should you do when you see this sign?', 240),
            choices: clone(raw.choices || []),
            answer: ans,
          },
        };
      },
      score: function (item, expected, given) {
        return { correct: String(given || '').trim() === String(expected || '').trim() };
      },
      render: wrapLifeRender(renderLifeSigns, 'life_signs'),
    },
  };

  // ---------------------------------------------------------------------------
  // 6 Curated Starter Sets (one per domain + Community Transition Mix)
  // ---------------------------------------------------------------------------
  var STARTER_SETS = [
    {
      id: 'ls_money_change',
      activity: 'life_money',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Making Change & Daily Budgeting',
      title: 'Making Change & Budgeting Practice',
      summary: 'Count exact bus fare, make change from $10 and $20, and build a grocery basket within a $12 budget.',
      adaptiveHints: {
        money: 'Count bills from largest to smallest first, then count quarters (25c), dimes (10c), nickels (5c), and pennies (1c).',
      },
      adaptiveExamples: {
        money: 'Worked example: $10.00 paid - $6.35 cost = $3.65 change (three $1 bills, two quarters, one dime, one nickel).',
      },
      items: [
        {
          id: 'm1', skill: 'money', word: 'Exact fare $2.75', task: 'exact_pay',
          prompt: 'The city bus fare is $2.75. Place exact bills and coins on the tray.',
          costCents: 275, targetCents: 275, target: '$2.75',
          hint: 'Use two $1 bills ($2.00) plus three quarters (75 cents).',
        },
        {
          id: 'm2', skill: 'money', word: 'Change $10 - $6.35', task: 'make_change',
          prompt: 'A customer buys groceries for $6.35 and hands you $10.00. Place the exact change on the tray.',
          costCents: 635, paidCents: 1000, targetCents: 365, target: '$3.65',
          hint: 'Count up from $6.35: +$0.65 gets to $7.00, then +$3.00 gets to $10.00 ($3.65 total).',
        },
        {
          id: 'm3', skill: 'money', word: 'Change $20 - $13.40', task: 'make_change',
          prompt: 'Lunch costs $13.40 and you pay with a $20.00 bill. Count the exact change due back.',
          costCents: 1340, paidCents: 2000, targetCents: 660, target: '$6.60',
          hint: 'From $13.40, add 60 cents to reach $14.00, then add $6.00 to reach $20.00.',
        },
        {
          id: 'm4', skill: 'money', word: '$12 Grocery Budget', task: 'budget',
          prompt: 'You have a $12.00 grocery budget. Pick at least 3 items, including Bread and Milk, without going over $12.00.',
          budgetCents: 1200, minItems: 3, requiredIds: ['bread', 'milk'], target: '<=$12.00',
          storeItems: [
            { id: 'bread', name: 'Whole Wheat Bread', cents: 350, required: true },
            { id: 'milk', name: 'Half Gallon Milk', cents: 325, required: true },
            { id: 'bananas', name: 'Bunch of Bananas', cents: 200 },
            { id: 'pasta', name: 'Box of Pasta', cents: 175 },
            { id: 'steak', name: 'Prepared Meal Tray', cents: 750 },
          ],
          hint: 'Bread ($3.50) + Milk ($3.25) = $6.75, leaving $5.25 for at least one more item.',
        },
      ],
      stretchItems: [
        {
          id: 'm-st1', word: 'Change $20 - $11.83', task: 'make_change',
          prompt: 'Stretch Challenge: Total is $11.83 and the customer pays $20.00. Count the exact change.',
          costCents: 1183, paidCents: 2000, targetCents: 817, target: '$8.17',
        },
      ],
    },
    {
      id: 'ls_transit_routes',
      activity: 'life_transit',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Bus & Train Schedules',
      title: 'Transit & Schedule Reading',
      summary: 'Read weekday and transfer timetables to choose departures that meet real arrival deadlines.',
      adaptiveHints: {
        transit: 'Find your destination stop column first, check which arrival time is BEFORE your deadline, then trace left to your boarding stop.',
      },
      adaptiveExamples: {
        transit: 'Worked example: Need to arrive by 9:15 AM -> 9:05 AM arrives on time; 9:35 AM is too late.',
      },
      items: [
        {
          id: 'tr1', skill: 'transit', word: 'Route 14 Morning',
          route: 'Route 14 \u00b7 Library Line', serviceNote: 'Weekday Morning',
          prompt: 'Your shift at City Library starts at 9:15 AM. Which bus should you board at Oak Station to arrive on time?',
          stops: ['Oak Station', 'Central Hub', 'City Library'],
          runs: [
            { label: 'Bus A', times: ['8:10 AM', '8:25 AM', '8:40 AM'] },
            { label: 'Bus B', times: ['8:35 AM', '8:50 AM', '9:05 AM'] },
            { label: 'Bus C', times: ['9:05 AM', '9:20 AM', '9:35 AM'] },
          ],
          choices: [
            { id: 'a', label: 'Bus A (leaves Oak Station 8:10 AM)' },
            { id: 'b', label: 'Bus B (leaves Oak Station 8:35 AM, arrives 9:05 AM)' },
            { id: 'c', label: 'Bus C (leaves Oak Station 9:05 AM, arrives 9:35 AM)' },
          ],
          targetId: 'b', target: 'b',
          hint: 'Compare the City Library column to 9:15 AM. Bus B arrives 10 minutes early without waiting 35 minutes.',
          explain: 'Bus B leaves Oak Station at 8:35 AM and reaches City Library at 9:05 AM, 10 minutes before your 9:15 AM shift.',
        },
        {
          id: 'tr2', skill: 'transit', word: 'Central Hub Transfer',
          route: 'Route 8 \u00b7 Clinic Connector', serviceNote: 'Afternoon Transfers',
          prompt: 'Your first bus reaches Central Hub at 2:20 PM. You need at least 10 minutes to walk to Platform 3. Which Route 8 bus should you take?',
          stops: ['Central Hub', 'River Mall', 'Health Clinic'],
          runs: [
            { label: 'Bus 1', times: ['2:25 PM', '2:40 PM', '2:52 PM'] },
            { label: 'Bus 2', times: ['2:35 PM', '2:50 PM', '3:02 PM'] },
            { label: 'Bus 3', times: ['3:05 PM', '3:20 PM', '3:32 PM'] },
          ],
          choices: [
            { id: 'b1', label: 'Bus 1 at 2:25 PM (5 minutes to transfer)' },
            { id: 'b2', label: 'Bus 2 at 2:35 PM (15 minutes to transfer)' },
            { id: 'b3', label: 'Bus 3 at 3:05 PM (45 minutes to transfer)' },
          ],
          targetId: 'b2', target: 'b2',
          hint: '2:20 PM + 10 minutes = 2:30 PM. Look for the first departure at or after 2:30 PM.',
          explain: 'Bus 2 departs at 2:35 PM, giving you 15 minutes to reach Platform 3 without an extra wait.',
        },
        {
          id: 'tr3', skill: 'transit', word: 'Last Evening Train',
          route: 'Blue Line Rail', serviceNote: 'Evening Service',
          prompt: 'Your class at Metro Center ends at 7:45 PM and takes 10 minutes to walk to the station. Which train can you catch?',
          stops: ['Metro Center', 'Park Ave', 'West End'],
          runs: [
            { label: 'Train 101', times: ['7:40 PM', '7:52 PM', '8:05 PM'] },
            { label: 'Train 102', times: ['8:05 PM', '8:17 PM', '8:30 PM'] },
            { label: 'Train 103', times: ['8:45 PM', '8:57 PM', '9:10 PM'] },
          ],
          choices: [
            { id: 't101', label: 'Train 101 at 7:40 PM' },
            { id: 't102', label: 'Train 102 at 8:05 PM' },
            { id: 't103', label: 'Train 103 at 8:45 PM' },
          ],
          targetId: 't102', target: 't102',
          hint: '7:45 PM + 10 minutes walking means you reach the platform at 7:55 PM.',
          explain: 'You reach Metro Center at 7:55 PM, so Train 102 at 8:05 PM is the next train you can board.',
        },
        {
          id: 'tr4', skill: 'transit', word: 'Travel Duration',
          route: 'Route 22 \u00b7 Market Loop', serviceNote: 'Saturday Service',
          prompt: 'You board the 10:15 AM bus at North Gate. How long does the ride take to reach Farmers Market?',
          stops: ['North Gate', 'High Street', 'Farmers Market'],
          runs: [
            { label: 'Run 1', times: ['10:15 AM', '10:28 AM', '10:40 AM'] },
            { label: 'Run 2', times: ['11:15 AM', '11:28 AM', '11:40 AM'] },
          ],
          choices: [
            { id: '13', label: '13 minutes' },
            { id: '25', label: '25 minutes' },
            { id: '40', label: '40 minutes' },
          ],
          targetId: '25', target: '25',
          hint: 'Subtract the North Gate time (10:15) from the Farmers Market time (10:40).',
          explain: 'From 10:15 AM to 10:40 AM is 25 minutes.',
        },
      ],
      stretchItems: [
        {
          id: 'tr-st1', word: 'Two-Leg Return Trip',
          route: 'Route 14 \u00b7 Return Service', serviceNote: 'Weekday Evening',
          prompt: 'Stretch Challenge: You leave City Library at 5:10 PM. Which bus gets you to Oak Station before 6:00 PM?',
          stops: ['City Library', 'Central Hub', 'Oak Station'],
          runs: [
            { label: 'Bus X', times: ['5:05 PM', '5:20 PM', '5:35 PM'] },
            { label: 'Bus Y', times: ['5:25 PM', '5:40 PM', '5:55 PM'] },
            { label: 'Bus Z', times: ['5:45 PM', '6:00 PM', '6:15 PM'] },
          ],
          choices: [
            { id: 'x', label: 'Bus X (leaves 5:05 PM)' },
            { id: 'y', label: 'Bus Y (leaves 5:25 PM, arrives 5:55 PM)' },
            { id: 'z', label: 'Bus Z (leaves 5:45 PM, arrives 6:15 PM)' },
          ],
          targetId: 'y', target: 'y',
        },
      ],
    },
    {
      id: 'ls_kitchen_safety',
      activity: 'life_kitchen',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Kitchen & Home Safety',
      title: 'Kitchen & Home Safety',
      summary: 'Make smart microwave, stove, and food-storage choices and order real-world kitchen safety procedures.',
      adaptiveHints: {
        kitchen: 'Prevent burns, electrical sparks, and raw-food cross-contamination by checking containers, heat controls, and washing hands first.',
      },
      adaptiveExamples: {
        kitchen: 'Worked example: Never use metal/foil in a microwave and never pour water on a grease flare-up.',
      },
      items: [
        {
          id: 'k1', skill: 'kitchen', word: 'Microwave Container', task: 'decision', area: 'Microwave',
          prompt: 'You want to reheat leftover pasta that is wrapped in aluminum foil. What should you do?',
          scenario: 'The pasta is sitting on the counter in a foil-wrapped takeout tray.',
          choices: [
            { id: 'foil', label: 'Put the foil tray straight into the microwave for 2 minutes.' },
            { id: 'transfer', label: 'Move the pasta onto a microwave-ready ceramic or glass plate before heating.' },
            { id: 'metal', label: 'Put the pasta into a metal mixing bowl and microwave on low.' },
          ],
          targetId: 'transfer', target: 'transfer',
          hint: 'Metal and aluminum foil can spark and cause a fire inside a microwave.',
          explain: 'Moving food to a microwave-ready glass or ceramic dish prevents sparks and fire.',
        },
        {
          id: 'k2', skill: 'kitchen', word: 'Raw Chicken Prep Order', task: 'sequence', area: 'Food Prep',
          prompt: 'Put these 4 food-handling steps in the right order when cooking chicken and salad.',
          scenario: 'You have raw chicken breasts, fresh lettuce, one knife, and a cutting board.',
          steps: [
            { id: 'wash_hands', text: 'Wash your hands with soap and warm water for 20 seconds.' },
            { id: 'cut_salad', text: 'Chop the fresh lettuce first on a clean cutting board and set it aside.' },
            { id: 'prep_chicken', text: 'Prepare the raw chicken last, then cook it thoroughly.' },
            { id: 'sanitize', text: 'Wash the board, knife, counter, and your hands with hot soapy water.' },
          ],
          hint: 'Prepare ready-to-eat produce BEFORE raw meat so raw juices never touch the salad.',
          explain: 'Washing hands first, prepping salad before raw chicken, and washing tools afterward prevents cross-contamination.',
        },
        {
          id: 'k3', skill: 'kitchen', word: 'Stove Pan Flare-Up', task: 'decision', area: 'Stovetop',
          prompt: 'Oil in a frying pan on the stove suddenly catches a small flame. What is the right action?',
          scenario: 'A metal lid is sitting right beside the stove and the burner knob is reachable.',
          choices: [
            { id: 'water', label: 'Pour a cup of cold tap water directly onto the burning oil.' },
            { id: 'lid', label: 'Turn off the burner and slide the metal lid over the pan to cut off air.' },
            { id: 'carry', label: 'Pick up the flaming pan and carry it to the sink.' },
          ],
          targetId: 'lid', target: 'lid',
          hint: 'Water makes hot grease splatter and spread flames. Cutting off heat and oxygen smothers the flame.',
          explain: 'Turning off the burner and sliding a metal lid over the pan cuts off heat and oxygen without splattering oil.',
        },
        {
          id: 'k4', skill: 'kitchen', word: 'Refrigerator Food Storage', task: 'sequence', area: 'Food Storage',
          prompt: 'Put these 4 leftover storage steps in the right order after dinner.',
          scenario: 'You just finished eating a pot of warm soup and want to store leftovers.',
          steps: [
            { id: 'cool', text: 'Divide hot soup into shallow clean containers so it cools quickly.' },
            { id: 'label', text: 'Put lids on and write the date on the container.' },
            { id: 'chill', text: 'Place the containers in the refrigerator within 2 hours of cooking.' },
            { id: 'reheat', text: 'When ready to eat within 3-4 days, reheat thoroughly until steaming.' },
          ],
          hint: 'Food should be cooled in shallow containers, dated, and refrigerated within 2 hours.',
          explain: 'Dividing into shallow containers, dating, and chilling within 2 hours keeps leftovers fresh.',
        },
      ],
      stretchItems: [
        {
          id: 'k-st1', word: 'Cleaning Supplies Storage', task: 'decision', area: 'Home Storage',
          prompt: 'Stretch Challenge: You buy a bottle of bleach and a bottle of glass cleaner with ammonia. How should you use and store them?',
          choices: [
            { id: 'mix', label: 'Mix them in one spray bottle so cleaning goes faster.' },
            { id: 'separate', label: 'Keep them in original labeled bottles away from food, and never mix them.' },
            { id: 'cup', label: 'Pour them into unmarked drinking cups for easy pouring.' },
          ],
          targetId: 'separate', target: 'separate',
          explain: 'Mixing bleach and ammonia releases dangerous toxic gas. Keep chemicals in labeled original bottles.',
        },
      ],
    },
    {
      id: 'ls_laundry_care',
      activity: 'life_laundry',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Laundry Sorting & Care Tags',
      title: 'Laundry & Care Sorting',
      summary: 'Sort garments into lights, darks, and delicates and pick matching washer and dryer settings from care tags.',
      adaptiveHints: {
        laundry: 'Keep dark dyes separate from whites, and put delicate or cold/air-dry items on gentle cold cycles.',
      },
      adaptiveExamples: {
        laundry: 'Worked example: Black jeans -> Darks; white cotton socks -> Whites & Lights; wool sweater -> Delicates (Cold).',
      },
      items: [
        {
          id: 'l1', skill: 'laundry', word: 'Sort Everyday Load', task: 'sort',
          prompt: 'Sort each garment into the right laundry load using its color and care tags.',
          baskets: [
            { id: 'lights', label: 'Whites & Lights' },
            { id: 'darks', label: 'Darks & Colors' },
            { id: 'delicates', label: 'Delicates (Cold)' },
          ],
          garments: [
            { id: 'g1', name: 'White Cotton T-Shirt', color: 'White', badges: ['Warm Wash', 'Tumble Dry'], basket: 'lights' },
            { id: 'g2', name: 'New Dark Blue Jeans', color: 'Dark Blue', badges: ['Cold Wash', 'Wash with Darks'], basket: 'darks' },
            { id: 'g3', name: 'Knit Wool Cardigan', color: 'Cream', badges: ['Cold Delicate', 'Lay Flat to Dry', 'No Bleach'], basket: 'delicates' },
          ],
          hint: 'Watch the knit cardigan care tags: even though it is light-colored, Cold Delicate + Lay Flat means Delicates.',
          explain: 'White cotton goes with Whites & Lights, dark jeans go with Darks, and the wool cardigan belongs in Delicates (Cold).',
        },
        {
          id: 'l2', skill: 'laundry', word: 'Wool Sweater Care Tag', task: 'setting',
          prompt: 'Read the care label badges on this sweater and choose the matching washer and dryer setting.',
          garment: { name: 'Soft Wool Sweater', color: 'Navy', badges: ['Cold 30\u00b0C', 'Gentle Cycle', 'No Bleach', 'Lay Flat / Air Dry'] },
          choices: [
            { id: 'hot', label: 'Hot wash with bleach, then high-heat dryer' },
            { id: 'cold_air', label: 'Cold gentle cycle (no bleach), then lay flat to air dry' },
            { id: 'warm_dry', label: 'Warm regular cycle, then regular tumble dry' },
          ],
          targetId: 'cold_air', target: 'cold_air',
          hint: 'Hot water and high heat shrink wool sweaters.',
          explain: 'Cold gentle wash without bleach plus air drying flat prevents shrinking and damage.',
        },
        {
          id: 'l3', skill: 'laundry', word: 'Sort Gym & Work Clothes', task: 'sort',
          prompt: 'Sort these 3 items into Whites & Lights, Darks & Colors, or Delicates (Cold).',
          baskets: [
            { id: 'lights', label: 'Whites & Lights' },
            { id: 'darks', label: 'Darks & Colors' },
            { id: 'delicates', label: 'Delicates (Cold)' },
          ],
          garments: [
            { id: 'g4', name: 'Red Athletic Hoodie', color: 'Bright Red', badges: ['Cold Wash', 'Colors Only'], basket: 'darks' },
            { id: 'g5', name: 'White Crew Socks', color: 'White', badges: ['Warm Wash', 'Tumble Dry'], basket: 'lights' },
            { id: 'g6', name: 'Silk Dress Shirt', color: 'Pale Gray', badges: ['Delicate Cold', 'Hang to Dry'], basket: 'delicates' },
          ],
          hint: 'Bright red dyes can bleed onto white socks, so keep red with Darks & Colors.',
          explain: 'Red hoodie stays with Darks & Colors so dye does not bleed; white socks go in Whites & Lights; silk goes in Delicates.',
        },
        {
          id: 'l4', skill: 'laundry', word: 'Towels & Sheets Tag', task: 'setting',
          prompt: 'Read the care label on these white cotton bath towels and choose the matching setting.',
          garment: { name: 'White Cotton Bath Towels', color: 'White', badges: ['Warm 40\u00b0C', 'Normal Cycle', 'Tumble Dry Medium'] },
          choices: [
            { id: 'warm_med', label: 'Warm normal wash, tumble dry medium (clean lint trap first)' },
            { id: 'dry_clean', label: 'Dry clean only, never place in water' },
            { id: 'cold_no_dry', label: 'Cold delicate rinse only, leave wet in hamper' },
          ],
          targetId: 'warm_med', target: 'warm_med',
          hint: 'Cotton towels wash well in warm water and dry on medium heat with a clean lint trap.',
          explain: 'Warm normal wash and medium tumble dry (with a clean lint trap) cleans and dries cotton towels properly.',
        },
      ],
      stretchItems: [
        {
          id: 'l-st1', word: 'Dryer Lint Trap Habit', task: 'setting',
          prompt: 'Stretch Challenge: Before starting the dryer on any load, what is the first habit to check?',
          garment: { name: 'Everyday Cotton Load', color: 'Assorted', badges: ['Tumble Dry Low', 'Clean Lint Screen'] },
          choices: [
            { id: 'lint', label: 'Pull out and clear the dryer lint filter before pressing Start.' },
            { id: 'overstuff', label: 'Pack wet clothes tightly to the top so the drum barely turns.' },
            { id: 'skip', label: 'Only empty the lint filter once a year.' },
          ],
          targetId: 'lint', target: 'lint',
        },
      ],
    },
    {
      id: 'ls_community_signs',
      activity: 'life_signs',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Community & Emergency Signs',
      title: 'Community & Emergency Signs',
      summary: 'Recognize Exit, Danger/Poison, Crosswalk, First Aid, and Emergency 911 vs. Non-Emergency signs and actions.',
      adaptiveHints: {
        signs: 'Red signals danger or emergency, yellow warns of caution hazards, green marks exits/first aid, and blue marks accessible services.',
      },
      adaptiveExamples: {
        signs: 'Worked example: Red DANGER POISON label -> never taste or open; wash hands and get adult/poison help if exposed.',
      },
      items: [
        {
          id: 'sg1', skill: 'signs', word: 'EXIT Sign', tone: 'exit', symbol: '\u2192',
          signTitle: 'EXIT', signSub: 'Keep Clear At All Times',
          location: 'Above a hallway door inside a community center',
          prompt: 'The fire alarm rings while you are in the hallway. What does this sign tell you?',
          choices: [
            { id: 'leave', label: 'Walk calmly through this door to leave the building.' },
            { id: 'store', label: 'Stack boxes in front of the door until later.' },
            { id: 'wait', label: 'Stay inside the hallway and wait for the elevator.' },
          ],
          targetId: 'leave', target: 'leave',
          hint: 'Green or illuminated EXIT signs mark the fastest path outside during an evacuation.',
          explain: 'Follow EXIT signs calmly to leave the building and never block exit doors.',
        },
        {
          id: 'sg2', skill: 'signs', word: 'DANGER POISON', tone: 'danger', symbol: '\u26a0',
          signTitle: 'DANGER: POISON', signSub: 'Harmful or Fatal if Swallowed',
          location: 'Printed on a chemical bottle in a utility closet',
          prompt: 'You see this label on a bottle with an unfamiliar blue liquid. What should you do?',
          choices: [
            { id: 'sniff', label: 'Open the cap and smell it closely to guess what it is.' },
            { id: 'leave_closed', label: 'Keep the cap closed, never taste it, and ask a supervisor before handling.' },
            { id: 'drink', label: 'Pour a small sip into a cup to check if it is sports drink.' },
          ],
          targetId: 'leave_closed', target: 'leave_closed',
          hint: 'A red DANGER: POISON sign means the liquid can cause serious harm if swallowed or inhaled.',
          explain: 'Leave poison containers sealed and ask a supervisor or adult before moving or using them.',
        },
        {
          id: 'sg3', skill: 'signs', word: 'CAUTION WET FLOOR', tone: 'caution', symbol: '\u26a0',
          signTitle: 'CAUTION', signSub: 'WET FLOOR',
          location: 'Standing near the entrance of a grocery store',
          prompt: 'You are pushing a cart toward the store doors and see this yellow sign. What is the smart choice?',
          choices: [
            { id: 'run', label: 'Hurry faster across the wet tiles so you get past quickly.' },
            { id: 'slow', label: 'Slow down, take short careful steps, or walk around the dry edge.' },
            { id: 'move_sign', label: 'Move the sign out of your way and leave it in the corner.' },
          ],
          targetId: 'slow', target: 'slow',
          hint: 'Yellow CAUTION signs warn you to slow down and watch for slip hazards.',
          explain: 'Slowing down or using the dry path prevents slips and falls while leaving the sign in place for others.',
        },
        {
          id: 'sg4', skill: 'signs', word: '911 Emergency vs Non-Emergency', tone: 'emergency', symbol: '\u260e',
          signTitle: 'CALL 911', signSub: 'Emergencies Only \u00b7 Fire, Medical, Immediate Danger',
          location: 'Posted beside a community office phone',
          prompt: 'Which situation below is a true 911 emergency?',
          choices: [
            { id: 'bus_late', label: 'The afternoon bus is running 10 minutes behind schedule.' },
            { id: 'collapse', label: 'Someone collapses, is not responding, or there is smoke and fire.' },
            { id: 'hours', label: 'You want to check what time the public library closes tonight.' },
          ],
          targetId: 'collapse', target: 'collapse',
          hint: 'Call 911 right away for life-threatening medical needs, fires, or immediate danger.',
          explain: 'Unresponsive collapse or fire requires 911 immediately; transit delays or library hours are non-emergencies.',
        },
      ],
      stretchItems: [
        {
          id: 'sg-st1', word: 'Accessible Entrance', tone: 'info', symbol: '\u267f',
          signTitle: 'ACCESSIBLE ENTRANCE', signSub: 'Ramp & Automatic Door \u2192',
          location: 'Outside the front steps of a public building',
          prompt: 'Stretch Challenge: A friend using a wheelchair arrives with you at the steps. What does this blue sign show?',
          choices: [
            { id: 'ramp', label: 'Follow the arrow to the step-free ramp and automatic door.' },
            { id: 'closed', label: 'The building is closed to all visitors today.' },
            { id: 'staff', label: 'Only delivery trucks may enter from that side.' },
          ],
          targetId: 'ramp', target: 'ramp',
        },
      ],
    },
    {
      id: 'ls_community_mix',
      activity: 'mixed',
      gradeBand: 'Grades 6-12 / Transition',
      name: 'Community Outing & Home Mix (All 5 Domains)',
      title: 'Community Transition Mix',
      summary: 'One cohesive real-world packet combining Money, Transit, Kitchen Safety, Laundry Care, and Community Signs.',
      blocks: null, // populated dynamically from first item of each domain in lessonFromLifeSkills
    },
  ];

  // ---------------------------------------------------------------------------
  // Plain-text custom scenario editor parser/formatter
  // ---------------------------------------------------------------------------
  function formatItemsText(activity, items) {
    var list = Array.isArray(items) ? items : [];
    if (activity === 'life_money') {
      return list.map(function (it) {
        if (it.task === 'budget') {
          var inv = (it.storeItems || []).map(function (s) { return s.name + '=' + (s.cents / 100).toFixed(2) + (s.required ? '*' : ''); }).join(', ');
          return ['budget', (it.budgetCents / 100).toFixed(2), 'min=' + (it.minItems || 2), inv, it.prompt || ''].join(' | ');
        }
        if (it.task === 'make_change') {
          return ['change', ((Number(it.costCents) || 0) / 100).toFixed(2), ((Number(it.paidCents) || 0) / 100).toFixed(2), it.prompt || '', it.hint || ''].filter(Boolean).join(' | ');
        }
        var payCents = it.targetCents != null ? Number(it.targetCents) : Number(it.costCents);
        return ['pay', isFinite(payCents) ? (payCents / 100).toFixed(2) : '?', it.prompt || '', it.hint || ''].filter(Boolean).join(' | ');
      }).join('\n');
    }
    if (activity === 'life_transit') {
      return list.map(function (it) {
        var ch = (it.choices || []).map(function (c) { return (c.id === (it.targetId || it.target) ? '*' : '') + c.label; }).join('; ');
        var runs = (it.runs || []).map(function (r) { return r.label + '=' + (r.times || []).join(','); }).join(' / ');
        return [it.route || 'Route', (it.stops || []).join(','), runs, it.prompt || '', ch].join(' | ');
      }).join('\n');
    }
    if (activity === 'life_kitchen') {
      return list.map(function (it) {
        if (it.task === 'sequence') {
          return ['sequence', it.area || 'Kitchen', it.prompt || '', (it.steps || []).map(function (s) { return s.text || s; }).join('; ')].join(' | ');
        }
        var ch = (it.choices || []).map(function (c) { return (c.id === (it.targetId || it.target) ? '*' : '') + c.label; }).join('; ');
        return ['decision', it.area || 'Kitchen', it.prompt || '', ch].join(' | ');
      }).join('\n');
    }
    if (activity === 'life_laundry') {
      var fmtGarmentMeta = function (g) {
        var col = str(g && g.color, 30);
        var bds = Array.isArray(g && g.badges) ? g.badges.filter(Boolean).join(', ') : '';
        if (col && bds) return ' (' + col + ': ' + bds + ')';
        if (col) return ' (' + col + ':)';
        if (bds) return ' (' + bds + ')';
        return '';
      };
      return list.map(function (it) {
        if (it.task === 'setting') {
          var g = it.garment || {};
          var ch = (it.choices || []).map(function (c) { return (c.id === (it.targetId || it.target) ? '*' : '') + c.label; }).join('; ');
          return ['setting', (g.name || 'Garment') + fmtGarmentMeta(g), it.prompt || '', ch].join(' | ');
        }
        var gs = (it.garments || []).map(function (g) { return g.name + fmtGarmentMeta(g) + '=' + (g.basket || '?'); }).join('; ');
        return ['sort', it.prompt || 'Sort garments into loads.', gs].join(' | ');
      }).join('\n');
    }
    if (activity === 'life_signs') {
      return list.map(function (it) {
        var ch = (it.choices || []).map(function (c) { return (c.id === (it.targetId || it.target) ? '*' : '') + c.label; }).join('; ');
        return [it.tone || 'info', it.signTitle || 'SIGN', it.signSub || '', it.prompt || '', ch].join(' | ');
      }).join('\n');
    }
    return '';
  }

  function parseDollarsToCents(raw) {
    var s = String(raw || '').replace(/[$,\s]/g, '');
    var n = Number(s);
    return isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
  }

  function parseStarChoices(raw) {
    var list = String(raw || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
    var choices = [], targetId = '';
    list.forEach(function (entry, idx) {
      var isRight = entry.charAt(0) === '*';
      var lbl = (isRight ? entry.slice(1) : entry).trim();
      if (!lbl) return;
      var id = 'c' + (idx + 1);
      if (isRight && !targetId) targetId = id;
      choices.push({ id: id, label: lbl });
    });
    if (!targetId && choices.length) targetId = choices[0].id;
    return { choices: choices, targetId: targetId };
  }

  function parseItemsText(activity, text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 16);
    var out = [];
    lines.forEach(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      if (activity === 'life_money') {
        var kind = String(parts[0] || '').toLowerCase();
        if (kind === 'budget') {
          var bc = parseDollarsToCents(parts[1]);
          if (!isFinite(bc) || bc <= 0) return;
          var minM = /^min=(\d+)$/i.exec(parts[2] || '');
          var minItems = minM ? Math.max(1, Number(minM[1])) : 2;
          var invRaw = minM ? (parts[3] || '') : (parts[2] || '');
          var prompt = minM ? (parts[4] || '') : (parts[3] || '');
          var storeItems = [], reqIds = [];
          invRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (seg, si) {
            var eq = seg.split('=');
            if (eq.length < 2) return;
            var required = eq[1].indexOf('*') >= 0;
            var cents = parseDollarsToCents(eq[1].replace(/\*/g, ''));
            if (!isFinite(cents)) return;
            var sid = 'i' + (si + 1);
            if (required) reqIds.push(sid);
            storeItems.push({ id: sid, name: eq[0].trim(), cents: cents, required: required });
          });
          if (storeItems.length < 2) return;
          out.push({
            id: 'lm-' + (i + 1), skill: 'money', word: 'Budget $' + (bc / 100).toFixed(2),
            task: 'budget', budgetCents: bc, minItems: minItems, requiredIds: reqIds,
            storeItems: storeItems, prompt: prompt || ('Stay within $' + (bc / 100).toFixed(2) + ' and pick at least ' + minItems + ' items.'),
            target: '<=$' + (bc / 100).toFixed(2),
          });
        } else if (kind === 'change') {
          var cost = parseDollarsToCents(parts[1]);
          var paid = parseDollarsToCents(parts[2]);
          if (!isFinite(cost) || !isFinite(paid) || paid < cost) return;
          var diff = paid - cost;
          out.push({
            id: 'lm-' + (i + 1), skill: 'money', word: 'Change $' + (diff / 100).toFixed(2),
            task: 'make_change', costCents: cost, paidCents: paid, targetCents: diff,
            target: '$' + (diff / 100).toFixed(2),
            prompt: parts[3] || ('Total is $' + (cost / 100).toFixed(2) + ' and paid $' + (paid / 100).toFixed(2) + '. Count the exact change.'),
            hint: parts[4] || undefined,
          });
        } else {
          var amt = parseDollarsToCents(kind === 'pay' ? parts[1] : parts[0]);
          if (!isFinite(amt) || amt <= 0) return;
          var pr = kind === 'pay' ? parts[2] : parts[1];
          var ht = kind === 'pay' ? parts[3] : parts[2];
          out.push({
            id: 'lm-' + (i + 1), skill: 'money', word: 'Pay $' + (amt / 100).toFixed(2),
            task: 'exact_pay', costCents: amt, targetCents: amt,
            target: '$' + (amt / 100).toFixed(2),
            prompt: pr || ('Place exact bills and coins totaling $' + (amt / 100).toFixed(2) + '.'),
            hint: ht || undefined,
          });
        }
      } else if (activity === 'life_transit') {
        var route = parts[0] || 'Bus Route';
        var stops = String(parts[1] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var runs = String(parts[2] || '').split('/').map(function (seg) {
          var eq = seg.split('=');
          if (eq.length < 2) return null;
          return { label: eq[0].trim(), times: eq[1].split(',').map(function (t) { return t.trim(); }).filter(Boolean) };
        }).filter(Boolean);
        var promptT = parts[3] || 'Choose the departure that matches the trip goal.';
        var parsedCh = parseStarChoices(parts[4] || '');
        if (!stops.length || !runs.length || parsedCh.choices.length < 2) return;
        out.push({
          id: 'lt-' + (i + 1), skill: 'transit', word: route, route: route,
          stops: stops, runs: runs, prompt: promptT,
          choices: parsedCh.choices, targetId: parsedCh.targetId, target: parsedCh.targetId,
        });
      } else if (activity === 'life_kitchen') {
        var kKind = String(parts[0] || '').toLowerCase();
        var area = parts[1] || 'Kitchen & Home';
        var prK = parts[2] || 'Choose the safe action.';
        if (kKind === 'sequence') {
          var stList = String(parts[3] || '').split(';').map(function (s, si) {
            var t = s.trim();
            return t ? { id: 's' + (si + 1), text: t } : null;
          }).filter(Boolean);
          if (stList.length < 2) return;
          out.push({
            id: 'lk-' + (i + 1), skill: 'kitchen', word: area + ' Steps',
            task: 'sequence', area: area, prompt: prK, steps: stList,
            targetOrder: stList.map(function (s) { return s.id; }).join('>'),
            target: stList.map(function (s) { return s.id; }).join('>'),
          });
        } else {
          var chK = parseStarChoices(parts[3] || parts[2] || '');
          if (chK.choices.length < 2) return;
          out.push({
            id: 'lk-' + (i + 1), skill: 'kitchen', word: area + ' Safety',
            task: 'decision', area: area, prompt: prK,
            choices: chK.choices, targetId: chK.targetId, target: chK.targetId,
          });
        }
      } else if (activity === 'life_laundry') {
        var parseGarmentSpec = function (spec) {
          var gm = /^([^(]+?)(?:\(([^)]*)\))?$/.exec(String(spec || '').trim());
          var gName = gm ? gm[1].trim() : String(spec || '').trim();
          var meta = gm && gm[2] != null ? gm[2].trim() : '';
          var gColor = '', gBadges = [];
          if (meta) {
            var colon = meta.indexOf(':');
            if (colon >= 0) {
              gColor = meta.slice(0, colon).trim();
              gBadges = meta.slice(colon + 1).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            } else {
              gBadges = meta.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            }
          }
          return { name: gName, color: gColor, badges: gBadges };
        };
        var lKind = String(parts[0] || '').toLowerCase();
        if (lKind === 'setting') {
          var parsedG = parseGarmentSpec(parts[1] || 'Garment (Cold Wash)');
          if (!parsedG.badges.length) parsedG.badges = ['Cold Wash'];
          var prL = parts[2] || 'Choose the matching washer and dryer setting.';
          var chL = parseStarChoices(parts[3] || '');
          if (chL.choices.length < 2) return;
          out.push({
            id: 'll-' + (i + 1), skill: 'laundry', word: parsedG.name, task: 'setting',
            garment: parsedG, prompt: prL,
            choices: chL.choices, targetId: chL.targetId, target: chL.targetId,
          });
        } else {
          var prS = parts[1] || 'Sort each garment into the right laundry load.';
          var gRaw = parts[2] || '';
          var baskets = [
            { id: 'lights', label: 'Whites & Lights' },
            { id: 'darks', label: 'Darks & Colors' },
            { id: 'delicates', label: 'Delicates (Cold)' },
          ];
          var garments = [], hasBadBasket = false;
          gRaw.split(';').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (seg, gi) {
            var eqIdx = seg.lastIndexOf('=');
            if (eqIdx < 1) { hasBadBasket = true; return; }
            var bk = seg.slice(eqIdx + 1).trim().toLowerCase();
            if (!/^(lights|darks|delicates)$/.test(bk)) { hasBadBasket = true; return; }
            var gp = parseGarmentSpec(seg.slice(0, eqIdx));
            if (!gp.name) { hasBadBasket = true; return; }
            garments.push({ id: 'g' + (gi + 1), name: gp.name, color: gp.color, badges: gp.badges, basket: bk });
          });
          if (!garments.length || hasBadBasket) return;
          out.push({
            id: 'll-' + (i + 1), skill: 'laundry', word: 'Sort Load ' + (i + 1), task: 'sort',
            prompt: prS, baskets: baskets, garments: garments,
            target: garments.map(function (g) { return g.id + '=' + g.basket; }).join(';'),
          });
        }
      } else if (activity === 'life_signs') {
        var tone = /^(exit|danger|caution|info|crosswalk|emergency)$/i.test(parts[0] || '') ? parts[0].toLowerCase() : 'info';
        var sTitle = parts[1] || 'SIGN';
        var sSub = parts[2] || '';
        var prG = parts[3] || 'What should you do when you see this sign?';
        var chG = parseStarChoices(parts[4] || '');
        if (chG.choices.length < 2) return;
        var symMap = { exit: '\u2192', danger: '\u26a0', caution: '\u26a0', info: '\u2139', crosswalk: '\u25c8', emergency: '\u260e' };
        out.push({
          id: 'lg-' + (i + 1), skill: 'signs', word: sTitle, tone: tone,
          symbol: symMap[tone] || '', signTitle: sTitle, signSub: sSub,
          prompt: prG, choices: chG.choices, targetId: chG.targetId, target: chG.targetId,
        });
      }
    });
    return out;
  }

  function findStarter(id) {
    for (var i = 0; i < STARTER_SETS.length; i++) {
      if (STARTER_SETS[i].id === id) return STARTER_SETS[i];
    }
    return null;
  }

  function defaultStarterFor(activity) {
    for (var i = 0; i < STARTER_SETS.length; i++) {
      if (STARTER_SETS[i].activity === activity) return STARTER_SETS[i];
    }
    return STARTER_SETS[0];
  }

  function mixedDefaultBlocks() {
    return ACTIVITIES.map(function (act) {
      var st = defaultStarterFor(act);
      return { activity: act, items: [clone(st.items[0])] };
    });
  }

  function normalizeGlossary(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0, 80).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      var term = str(k, 80);
      var map = raw[k];
      if (!term || !map || typeof map !== 'object' || Array.isArray(map)) return;
      var kept = {};
      Object.keys(map).forEach(function (lang) {
        if (/^(es|pt|fr|ar|vi|zh)$/.test(lang) && typeof map[lang] === 'string' && map[lang].trim()) {
          kept[lang] = str(map[lang], 180);
        }
      });
      if (Object.keys(kept).length) out[term] = kept;
    });
    return out;
  }

  function lessonFromLifeSkills(options) {
    var cfg = options && typeof options === 'object' ? options : {};
    var starter = cfg.starterId ? findStarter(cfg.starterId) : null;
    var isMixed = cfg.activity === 'mixed' || (starter && starter.activity === 'mixed') || (Array.isArray(cfg.blocks) && cfg.blocks.length > 1);
    var mode = cfg.mode === 'probe' ? 'probe' : 'practice';
    var blocks = [];
    var activity = 'life_money';

    if (isMixed) {
      blocks = Array.isArray(cfg.blocks) && cfg.blocks.length ? clone(cfg.blocks) : mixedDefaultBlocks();
      activity = 'mixed';
      starter = findStarter('ls_community_mix');
    } else {
      activity = ACTIVITIES.indexOf(cfg.activity) >= 0 ? cfg.activity : (starter && ACTIVITIES.indexOf(starter.activity) >= 0 ? starter.activity : 'life_money');
      if (!starter || starter.activity !== activity) starter = defaultStarterFor(activity);
      var items = Array.isArray(cfg.items) && cfg.items.length ? clone(cfg.items) : clone(starter.items);
      if (!items.length) throw new Error('Add at least one life skills scenario.');
      blocks = [{ activity: activity, items: items.slice(0, 16) }];
    }

    blocks = blocks.map(function (b) {
      if (ACTIVITIES.indexOf(b.activity) < 0) throw new Error('Unknown life skills domain: ' + b.activity);
      var cleanItems = (Array.isArray(b.items) ? b.items : []).slice(0, 16).map(function (it, idx) {
        var copy = clone(it);
        copy.id = str(copy.id, 40) || (b.activity + '-' + (idx + 1));
        return copy;
      });
      return { activity: b.activity, items: cleanItems };
    }).filter(function (b) { return b.items.length > 0; });
    if (!blocks.length) throw new Error('Add at least one life skills scenario.');

    var title = str(cfg.title || (starter && starter.title) || 'Life Skills Practice', 80);
    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); })
      : [];
    var bilingualGlossary = normalizeGlossary(cfg.bilingualGlossary);
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;
    var adaptiveOn = mode !== 'probe' && !!cfg.adaptiveScaffold;
    var stretchItems = adaptiveOn && !isMixed
      ? (Array.isArray(cfg.stretchItems) && cfg.stretchItems.length ? clone(cfg.stretchItems) : clone((starter && starter.stretchItems) || []))
      : [];

    var basis = JSON.stringify({
      v: VERSION,
      activity: activity,
      mode: mode,
      title: title,
      blocks: blocks,
      adaptiveOn: adaptiveOn,
      stretchItems: stretchItems,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
      form: mode === 'probe' ? str(cfg.form || 'Form A', 40) : '',
      timeLimitS: mode === 'probe' && Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null,
    });
    var rev = 'l' + fnv1a(basis);
    var lessonId = slug(title, 34) + '-' + (isMixed ? 'mix' : activity.replace(/^life_/, '')) + '-' + rev.slice(0, 5);

    var activityTitles = {};
    blocks.forEach(function (b) { activityTitles[b.activity] = ADAPTERS[b.activity].title; });

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: mode,
      blocks: blocks,
      activityTitles: activityTitles,
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
    };
    if (mode === 'probe') {
      lesson.form = str(cfg.form || 'Form A', 40);
      lesson.timeLimitS = Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null;
      lesson.check = {
        measure: isMixed ? 'life_skills_mix' : blocks[0].activity,
        scoreUnit: 'items_correct',
        allowSkip: true,
        scoringVersion: 1,
        formVersion: 1,
      };
    } else if (adaptiveOn) {
      var hints = {}, examples = {};
      STARTER_SETS.forEach(function (s) {
        Object.assign(hints, s.adaptiveHints || {});
        Object.assign(examples, s.adaptiveExamples || {});
      });
      lesson.adaptiveScaffold = typeof cfg.adaptiveScaffold === 'object'
        ? clone(cfg.adaptiveScaffold)
        : { missThreshold: 2, streakThreshold: 4, hints: hints, workedExamples: examples };
      if (stretchItems.length) lesson.stretchItems = stretchItems;
    }
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;
    return lesson;
  }

  function resolveLoader(given) {
    if (given && typeof given.buildHtml === 'function') return given;
    if (root && root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') return root.AlloWordSoundsTakeHome;
    throw new Error('buildLifeSkillsPacket needs AlloWordSoundsTakeHome loader');
  }

  function buildLifeSkillsPacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromLifeSkills(opts);
    var isProbe = lesson.mode === 'probe';
    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);

    var buildOpts = {
      extraAdapters: isProbe ? undefined : ADAPTERS,
      adapters: isProbe ? ADAPTERS : undefined,
      core: isProbe ? { soundAnswerMatches: function () { return false; } } : undefined,
      extraCss: EXTRA_CSS,
      labels: opts.labels,
      teacherCode: opts.teacherCode,
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      adaptiveScaffold: !isProbe && (opts.adaptiveScaffold || lesson.adaptiveScaffold) ? (opts.adaptiveScaffold || lesson.adaptiveScaffold) : undefined,
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
    };

    var baseHtml = withSpeechManifest(loader.buildHtml(lesson, buildOpts));
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var activity = lesson.blocks.length > 1 ? 'mixed' : (lesson.blocks[0] ? lesson.blocks[0].activity : 'life_money');
    var plain = fileName(lesson.title, lesson.mode, '');
    var name = fileName(lesson.title, lesson.mode, cleanLearner);
    var bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(html).length : html.length;
    var itemCount = lesson.blocks.reduce(function (n, b) { return n + (Array.isArray(b.items) ? b.items.length : 0); }, 0);

    return {
      html: html,
      baseHtml: baseHtml,
      bytes: bytes,
      lesson: lesson,
      name: name,
      plain: plain,
      learner: cleanLearner,
      activity: activity,
      mode: isProbe ? 'probe' : 'practice',
      itemCount: itemCount,
      revision: lesson.revision,
    };
  }

  function readLifeSkillsPacket(input, verifyCore) {
    var verify = verifyCore || root.AlloPacketVerify;
    var fail = function (kind, why, page) {
      return { ok: false, kind: kind, why: why, page: page || null, notes: [] };
    };
    if (!verify || typeof verify.readParts !== 'function') {
      return fail('other', 'This page could not load the file reader. Load the page again.');
    }
    var parts = verify.readParts(input);
    if (parts.refused === 'too_big') return fail('other', 'This file is larger than 60 MB.');
    if (parts.refused === 'empty') return fail('other', 'This file is empty.');
    if (parts.refused) return fail('other', 'This browser could not read the file.');
    if (parts.kind === 'results') {
      return fail('results', 'This is a results file, not a packet file. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
    }
    if (!parts.ok || !parts.lesson) {
      return fail('other', 'This is not a packet file made with this page. Choose the .html file you saved in step 3.');
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest || {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks.filter(function (b) { return b && typeof b.activity === 'string' && Array.isArray(b.items); }) : [];
    if (!blocks.length || !blocks.every(function (b) { return ACTIVITIES.indexOf(b.activity) >= 0; })) {
      return fail('other', 'This packet uses another activity type. Open it in the maker page that built it.', { href: 'packets.html', name: 'Packets home' });
    }
    var activity = blocks.length > 1 ? 'mixed' : blocks[0].activity;
    var mode = lesson.mode === 'probe' || (manifest.packet && manifest.packet.mode === 'check') ? 'probe' : 'practice';
    var notes = [];
    var teacherCode = !!(lesson.check && lesson.check.lock);
    if (mode === 'probe') {
      notes.push('Check mode scrambles answers inside the file, so review expected answers in step 2 before saving again.');
    }
    if (teacherCode) {
      notes.push('A teacher code is not kept in plain text inside the file. Enter it again if needed.');
    }
    var homeLanguages = [];
    if (lesson.bilingual && Array.isArray(lesson.bilingual.codes)) {
      homeLanguages = lesson.bilingual.codes.map(function (c) { return String(c || '').toLowerCase(); }).filter(Boolean);
    } else if (Array.isArray(lesson.homeLanguages)) {
      homeLanguages = lesson.homeLanguages.slice();
    }
    return {
      ok: true,
      kind: 'life-skills',
      title: str(lesson.title || manifest.title, 80),
      activity: activity,
      mode: mode,
      form: str(lesson.form, 40),
      timeLimitS: lesson.timeLimitS || null,
      blocks: clone(blocks),
      items: blocks.length === 1 ? clone(blocks[0].items) : [],
      adaptiveScaffold: !!lesson.adaptiveScaffold,
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      teacherCode: teacherCode,
      notes: notes,
    };
  }

  var api = {
    VERSION: VERSION,
    ACTIVITIES: ACTIVITIES,
    ADAPTERS: ADAPTERS,
    EXTRA_CSS: EXTRA_CSS,
    STARTER_SETS: STARTER_SETS,
    findStarter: findStarter,
    defaultStarterFor: defaultStarterFor,
    mixedDefaultBlocks: mixedDefaultBlocks,
    parseItemsText: parseItemsText,
    formatItemsText: formatItemsText,
    lessonFromLifeSkills: lessonFromLifeSkills,
    buildLifeSkillsPacket: buildLifeSkillsPacket,
    readLifeSkillsPacket: readLifeSkillsPacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketLifeSkills = api;
})(typeof window !== 'undefined' ? window : globalThis);
