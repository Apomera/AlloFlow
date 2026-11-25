// Interactive Visual Math Manipulative Packets builder, K-8 starter sets, and self-contained student adapters.
// Plain UMD script for browser pages (window.AlloPacketManipulatives) and Node (module.exports).
// Four pure DOM/CSS manipulatives: Base-Ten Blocks, Fraction Bars, Interactive Number Line, Balance-Scale Equations.
// Deterministic local builder: no network calls, no browser storage, no markup strings.
(function (root) {
  'use strict';

  var VERSION = 1;
  var ACTIVITIES = ['manip_base_ten', 'manip_fraction_bars', 'manip_number_line', 'manip_balance_scale'];

  var EXTRA_CSS = [
    '.mn-wrap{display:grid;gap:14px}',
    '.mn-wrap>*{min-width:0}',
    '.mn-prompt{margin:0;font-size:1.2rem;font-weight:700;line-height:1.4}',
    '.mn-sub{margin:0;color:var(--muted);font-size:.95rem}',
    '.mn-readout{margin:0;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--soft);font-weight:700;font-size:1.05rem;font-variant-numeric:tabular-nums}',
    '.mn-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.mn-actions button{min-height:44px}',
    '.mn-hint-box{padding:10px 14px;border-radius:12px;border:1px solid var(--accent);background:var(--soft);font-size:.95rem}',
    '.mn-hint-box[hidden]{display:none}',
    /* Base-Ten Blocks */
    '.b10-mat{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}',
    '.b10-col{display:flex;flex-direction:column;gap:8px;padding:12px;border:2px solid var(--line);border-radius:14px;background:var(--card)}',
    '.b10-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
    '.b10-title{font-weight:700;font-size:1rem;margin:0}',
    '.b10-count{font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}',
    '.b10-tray{min-height:92px;padding:8px;border-radius:10px;border:1px dashed var(--line);background:var(--soft);display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px}',
    '.b10-tray:empty{align-content:center}',
    '.b10-tray:empty::after{content:"Tap + 1 below";color:var(--muted);font-size:.84rem;font-weight:600;margin:auto}',
    '.b10-flat{width:64px;height:64px;border-radius:4px;border:2px solid var(--accent);background:repeating-linear-gradient(0deg,transparent,transparent 5px,var(--accent) 5px,var(--accent) 6px),repeating-linear-gradient(90deg,transparent,transparent 5px,var(--accent) 5px,var(--accent) 6px);background-color:var(--card)}',
    '.b10-rod{width:12px;height:64px;border-radius:3px;border:2px solid var(--accent);background:repeating-linear-gradient(0deg,transparent,transparent 5px,var(--accent) 5px,var(--accent) 6px);background-color:var(--card)}',
    '.b10-cube{width:14px;height:14px;border-radius:3px;border:2px solid var(--accent);background:var(--accent)}',
    '.b10-ctrls{display:flex;gap:8px;margin-top:auto}',
    '.b10-ctrls button{flex:1;min-height:44px;font-weight:700}',
    '.b10-trades{display:flex;flex-wrap:wrap;gap:8px}',
    '.b10-trades button{min-height:44px;font-size:.92rem}',
    /* Fraction Bars */
    '.fb-ref-list{display:grid;gap:8px}',
    '.fb-bar-block{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}',
    '.fb-bar-label{margin:0;font-size:.92rem;font-weight:700;color:var(--muted)}',
    '.fb-strip{display:flex;width:100%;min-height:52px;border:2px solid var(--ink);border-radius:10px;overflow-x:auto;overflow-y:hidden;background:var(--card)}',
    '.fb-part{flex:1 1 0;min-width:28px;min-height:48px;border:0;border-inline-end:1.5px solid var(--line);border-radius:0;padding:4px 2px;background:var(--card);color:var(--ink);font-size:clamp(.72rem,2.3vw,.86rem);font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '@media (max-width:480px){.fb-part{min-width:34px}}',
    '.fb-part:last-child{border-inline-end:0}',
    '.fb-part[aria-pressed=true],.fb-part.fb-on{background:var(--accent);color:var(--accent-ink);outline:none}',
    '.fb-part:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}',
    '.fb-part-static{cursor:default}',
    '.fb-denoms{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.fb-denoms button{min-height:44px;min-width:44px;padding:6px 12px;font-weight:700}',
    '.fb-denoms button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);outline:none}',
    '.fb-denoms button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.fb-cmp-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
    '.fb-cmp-row button{min-height:52px;min-width:72px;font-size:1.35rem;font-weight:700}',
    '.fb-cmp-row button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);outline:none}',
    '.fb-cmp-row button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    /* Interactive Number Line */
    '.nl-stage{padding:14px 12px 12px;border:2px solid var(--line);border-radius:14px;background:var(--card);min-width:0;max-width:100%}',
    '.nl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;max-width:100%}',
    '.nl-hops-trail{display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;align-items:center}',
    '.nl-hop-pill{padding:2px 9px;border-radius:999px;border:1.5px solid var(--accent);background:var(--soft);font-size:.86rem;font-weight:700;font-variant-numeric:tabular-nums}',
    '.nl-track-wrap{position:relative;padding:28px 6px 8px;width:max-content;min-width:100%}',
    '.nl-rail{position:relative;height:6px;border-radius:4px;background:var(--ink)}',
    '.nl-marker{position:absolute;top:-11px;width:28px;height:28px;margin-left:-14px;border-radius:999px;border:3px solid var(--card);background:var(--accent);box-shadow:0 0 0 2px var(--accent);transition:left .14s ease}',
    '.nl-start-dot{position:absolute;top:-5px;width:16px;height:16px;margin-left:-8px;border-radius:999px;border:2px solid var(--ink);background:var(--card)}',
    '.nl-stops{display:flex;width:100%;align-items:flex-start;margin-top:18px;gap:0}',
    '.nl-stop{flex:1 0 44px;min-width:44px;min-height:48px;padding:6px 2px;border:1.5px solid transparent;border-radius:8px;background:transparent;color:var(--ink);font-size:.84rem;font-weight:700;font-variant-numeric:tabular-nums;display:flex;flex-direction:column;align-items:center;gap:4px}',
    '@media (min-width:760px){.nl-stop{flex:1 1 0;min-width:36px}}',
    '.nl-stop::before{content:"";display:block;width:2px;height:10px;background:var(--ink)}',
    '.nl-stop[aria-pressed=true]{border-color:var(--accent);background:var(--soft);color:var(--accent);outline:none}',
    '.nl-stop:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.nl-hop-btns{display:flex;flex-wrap:wrap;gap:8px}',
    '.nl-hop-btns button{min-height:44px;min-width:58px;font-weight:700;font-variant-numeric:tabular-nums}',
    /* Balance-Scale Equations */
    '.bal-stage{padding:16px 12px 12px;border:2px solid var(--line);border-radius:14px;background:var(--card);display:grid;gap:12px}',
    '.bal-eq{margin:0;text-align:center;font-size:1.55rem;font-weight:700;letter-spacing:.02em;font-variant-numeric:tabular-nums}',
    '.bal-beam-wrap{display:grid;justify-items:center;gap:4px;padding:8px 0}',
    '.bal-beam{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:end;padding-bottom:10px;border-bottom:6px solid var(--ink);transition:transform .16s ease}',
    '.bal-beam[data-tilt="left"]{transform:rotate(-3deg)}',
    '.bal-beam[data-tilt="right"]{transform:rotate(3deg)}',
    '.bal-pan{min-height:92px;padding:10px;border:2px solid var(--line);border-radius:12px;background:var(--soft);display:flex;flex-direction:column;gap:8px}',
    '.bal-pan-label{margin:0;font-size:.85rem;font-weight:700;color:var(--muted);text-align:center}',
    '.bal-items{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;min-height:48px}',
    '.bal-xbox{min-width:40px;height:40px;padding:0 10px;border-radius:8px;border:2.5px solid var(--accent);background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:1.05rem;display:inline-flex;align-items:center;justify-content:center}',
    '.bal-unit{min-width:26px;height:26px;padding:0 6px;border-radius:6px;border:2px solid var(--ink);background:var(--card);color:var(--ink);font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;justify-content:center}',
    '.bal-unit-neg{border-style:dashed;color:var(--warn)}',
    '.bal-fulcrum{width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:24px solid var(--ink)}',
    '.bal-ops{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
    '.bal-ops button{min-height:44px;font-weight:700}',
    '.bal-log{margin:0;padding:8px 12px;list-style:none;border-radius:10px;background:var(--soft);border:1px solid var(--line);display:flex;flex-wrap:wrap;gap:6px 12px;font-size:.9rem;font-variant-numeric:tabular-nums}',
    '.bal-solve-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}',
    '.bal-solve-row input{width:96px;min-height:44px;text-align:center;font-size:1.15rem;font-weight:700}',
    '@media (prefers-reduced-motion:reduce){.nl-marker,.bal-beam{transition:none}}',
    '@media (forced-colors:active){.b10-flat,.b10-rod,.b10-cube,.fb-part[aria-pressed=true],.fb-part.fb-on,.nl-marker,.bal-xbox{forced-color-adjust:none;background:Highlight;color:HighlightText;border-color:CanvasText}.fb-strip,.b10-col,.nl-stage,.bal-stage,.bal-pan{border:2px solid CanvasText}.nl-rail{background:CanvasText}.bal-beam{border-bottom-color:CanvasText}.bal-fulcrum{border-bottom-color:CanvasText}}',
    '@media print{.mn-actions button,.b10-ctrls,.b10-trades,.fb-denoms,.nl-hop-btns,.bal-ops{display:none!important}}',
  ].join('\n');

  function str(v, max) {
    var s = v == null ? '' : String(v);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += (c < 32 || c === 127) ? ' ' : s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, max || 240);
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
    return (s || 'math-manipulatives').slice(0, max || 44);
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

  // ---------------------------------------------------------------------------
  // Adapter 1: Base-Ten Blocks (manip_base_ten)
  // ---------------------------------------------------------------------------
  function renderBaseTen(item, ctx) {
    var maxH = 9, maxT = 20, maxO = 20;
    var init = item.start && typeof item.start === 'object' ? item.start : {};
    var state = {
      h: Math.max(0, Math.min(maxH, Math.floor(Number(init.hundreds) || 0))),
      t: Math.max(0, Math.min(maxT, Math.floor(Number(init.tens) || 0))),
      o: Math.max(0, Math.min(maxO, Math.floor(Number(init.ones) || 0))),
    };
    var exact = item.match === 'exact';
    var targetVal = Math.max(0, Math.floor(Number(item.targetValue != null ? item.targetValue : item.target) || 0));
    var targetH = item.targetBlocks ? Math.floor(Number(item.targetBlocks.hundreds) || 0) : Math.floor(targetVal / 100);
    var targetT = item.targetBlocks ? Math.floor(Number(item.targetBlocks.tens) || 0) : Math.floor((targetVal % 100) / 10);
    var targetO = item.targetBlocks ? Math.floor(Number(item.targetBlocks.ones) || 0) : (targetVal % 10);
    var locked = false;

    var totalOf = function () { return state.h * 100 + state.t * 10 + state.o; };
    var wrap = ctx.el('div', { class: 'mn-wrap', 'data-manip': 'base_ten' });
    wrap.appendChild(ctx.el('p', { class: 'mn-prompt', 'data-mn-prompt': '', text: item.prompt || ('Build ' + targetVal + ' with base-ten blocks.') }));
    if (exact && !ctx.check) {
      wrap.appendChild(ctx.el('p', { class: 'mn-sub', text: 'Use regrouping so each column has the standard place-value count (fewer than 10 tens and fewer than 10 ones).' }));
    }
    var readout = ctx.el('p', { class: 'mn-readout', 'data-b10-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var mat = ctx.el('div', { class: 'b10-mat' });
    var colRefs = {};
    var cols = [
      { key: 'h', label: 'Hundreds (100)', cls: 'b10-flat', max: maxH, singular: 'hundred', plural: 'hundreds' },
      { key: 't', label: 'Tens (10)', cls: 'b10-rod', max: maxT, singular: 'ten', plural: 'tens' },
      { key: 'o', label: 'Ones (1)', cls: 'b10-cube', max: maxO, singular: 'one', plural: 'ones' },
    ];
    cols.forEach(function (c) {
      var countEl = ctx.el('span', { class: 'b10-count', 'data-b10-count': c.key, text: '0' });
      var tray = ctx.el('div', { class: 'b10-tray', 'data-b10-tray': c.key, 'aria-hidden': 'true' });
      var minusBtn = ctx.el('button', {
        type: 'button',
        'data-b10-dec': c.key,
        'aria-label': 'Remove 1 ' + c.singular,
        on: { click: function () { if (locked || state[c.key] <= 0) return; state[c.key]--; paint(true); } },
        text: '\u2212 1',
      });
      var plusBtn = ctx.el('button', {
        type: 'button',
        'data-b10-inc': c.key,
        'aria-label': 'Add 1 ' + c.singular,
        on: { click: function () { if (locked || state[c.key] >= c.max) return; state[c.key]++; paint(true); } },
        text: '+ 1',
      });
      var box = ctx.el('div', { class: 'b10-col', 'data-b10-col': c.key }, [
        ctx.el('div', { class: 'b10-head' }, [ctx.el('p', { class: 'b10-title', text: c.label }), countEl]),
        tray,
        ctx.el('div', { class: 'b10-ctrls' }, [minusBtn, plusBtn]),
      ]);
      colRefs[c.key] = { spec: c, countEl: countEl, tray: tray, minusBtn: minusBtn, plusBtn: plusBtn };
      mat.appendChild(box);
    });
    wrap.appendChild(mat);

    var tradeO2T = ctx.el('button', {
      type: 'button',
      'data-b10-trade': 'o2t',
      on: { click: function () {
        if (locked || state.o < 10 || state.t >= maxT) return;
        state.o -= 10; state.t += 1;
        ctx.support('regroup');
        paint(true);
      } },
      text: 'Trade 10 ones \u2192 1 ten',
    });
    var breakT2O = ctx.el('button', {
      type: 'button',
      'data-b10-trade': 't2o',
      on: { click: function () {
        if (locked || state.t < 1 || state.o + 10 > maxO) return;
        state.t -= 1; state.o += 10;
        ctx.support('regroup');
        paint(true);
      } },
      text: 'Break 1 ten \u2192 10 ones',
    });
    var tradeT2H = ctx.el('button', {
      type: 'button',
      'data-b10-trade': 't2h',
      on: { click: function () {
        if (locked || state.t < 10 || state.h >= maxH) return;
        state.t -= 10; state.h += 1;
        ctx.support('regroup');
        paint(true);
      } },
      text: 'Trade 10 tens \u2192 1 hundred',
    });
    var breakH2T = ctx.el('button', {
      type: 'button',
      'data-b10-trade': 'h2t',
      on: { click: function () {
        if (locked || state.h < 1 || state.t + 10 > maxT) return;
        state.h -= 1; state.t += 10;
        ctx.support('regroup');
        paint(true);
      } },
      text: 'Break 1 hundred \u2192 10 tens',
    });
    if (item.allowRegroup !== false) {
      wrap.appendChild(ctx.el('div', { class: 'b10-trades', role: 'group', 'aria-label': 'Regrouping trades' }, [tradeO2T, breakT2O, tradeT2H, breakH2T]));
    }

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'mn-hint-box', 'data-mn-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-mn-hint-btn': '',
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

    var resetBtn = ctx.el('button', {
      type: 'button',
      'data-b10-reset': '',
      on: { click: function () {
        if (locked) return;
        state.h = Math.max(0, Math.min(maxH, Math.floor(Number(init.hundreds) || 0)));
        state.t = Math.max(0, Math.min(maxT, Math.floor(Number(init.tens) || 0)));
        state.o = Math.max(0, Math.min(maxO, Math.floor(Number(init.ones) || 0)));
        paint(true);
      } },
      text: 'Reset blocks',
    });

    var submitBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-mn-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var val = totalOf();
        var summary = val + ' (' + state.h + 'H ' + state.t + 'T ' + state.o + 'O)';
        if (ctx.check) {
          ctx.answer(summary);
          return;
        }
        var ok = exact
          ? (state.h === targetH && state.t === targetT && state.o === targetO)
          : (val === targetVal);
        var retryMsg = 'Your mat shows ' + val + '.';
        if (!ok && exact && val === targetVal) {
          retryMsg = 'Your total is ' + val + ', which is right! Now use a Trade button so each column has fewer than 10 blocks.';
        } else if (!ok && val < targetVal) {
          retryMsg = 'Your mat shows ' + val + ', which is ' + (targetVal - val) + ' less than the target. Add blocks and try again.';
        } else if (!ok && val > targetVal) {
          retryMsg = 'Your mat shows ' + val + ', which is ' + (val - targetVal) + ' more than the target. Remove blocks and try again.';
        }
        var targetLabel = targetVal + ' (' + targetH + ' hundreds, ' + targetT + ' tens, ' + targetO + ' ones)';
        ctx.answer(summary, ok, {
          correctText: 'Right! Your blocks show ' + val + '.',
          retryText: retryMsg,
          missedText: 'Target model: ' + targetLabel + '.',
        });
      } },
      text: ctx.check ? 'Submit blocks' : 'Check blocks',
    });

    wrap.appendChild(ctx.el('div', { class: 'mn-actions' }, [submitBtn, resetBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paint = function (say) {
      cols.forEach(function (c) {
        var r = colRefs[c.key];
        var n = state[c.key];
        r.countEl.textContent = String(n);
        r.minusBtn.disabled = locked || n <= 0;
        r.plusBtn.disabled = locked || n >= c.max;
        while (r.tray.firstChild) r.tray.removeChild(r.tray.firstChild);
        for (var i = 0; i < n; i++) r.tray.appendChild(ctx.el('span', { class: c.cls }));
      });
      tradeO2T.disabled = locked || state.o < 10 || state.t >= maxT;
      breakT2O.disabled = locked || state.t < 1 || state.o + 10 > maxO;
      tradeT2H.disabled = locked || state.t < 10 || state.h >= maxH;
      breakH2T.disabled = locked || state.h < 1 || state.t + 10 > maxT;
      resetBtn.disabled = locked;
      submitBtn.disabled = locked;
      var activeEl = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
      if (activeEl && activeEl.disabled && ctx.root.contains(activeEl) && !locked) {
        var nextFocus = activeEl.getAttribute('data-b10-dec') ? colRefs[activeEl.getAttribute('data-b10-dec')].plusBtn
          : activeEl.getAttribute('data-b10-inc') ? colRefs[activeEl.getAttribute('data-b10-inc')].minusBtn
          : submitBtn;
        try { if (nextFocus && !nextFocus.disabled) nextFocus.focus(); else submitBtn.focus(); } catch (_) {}
      }
      var line = item.hideTotal
        ? ('Mat: ' + state.h + ' hundreds, ' + state.t + ' tens, ' + state.o + ' ones')
        : ('Total shown: ' + totalOf() + ' (' + state.h + ' hundreds, ' + state.t + ' tens, ' + state.o + ' ones)');
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          state.h = targetH;
          state.t = targetT;
          state.o = targetO;
        }
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 2: Fraction Bars (manip_fraction_bars)
  // ---------------------------------------------------------------------------
  function renderFractionBars(item, ctx) {
    var mode = item.task === 'compare' ? 'compare' : item.task === 'add' ? 'add' : 'build';
    var denoms = Array.isArray(item.denominators) && item.denominators.length ? item.denominators.slice() : [2, 3, 4, 6, 8, 12];
    var denom = denoms.indexOf(Number(item.startDenom)) >= 0 ? Number(item.startDenom) : denoms[0];
    var shaded = [];
    var chosenCmp = '';
    var locked = false;

    var targetNum = Math.max(0, Math.floor(Number(item.targetNum) || 0));
    var targetDen = Math.max(1, Math.floor(Number(item.targetDen) || 1));
    var matchMode = item.match === 'exact' ? 'exact' : 'equivalent';

    var wrap = ctx.el('div', { class: 'mn-wrap', 'data-manip': 'fraction_bars' });
    wrap.appendChild(ctx.el('p', { class: 'mn-prompt', 'data-mn-prompt': '', text: item.prompt || ('Shade ' + targetNum + '/' + targetDen + ' on the fraction bar.') }));

    var buildStaticBar = function (labelText, num, den) {
      var strip = ctx.el('div', { class: 'fb-strip', role: 'img', 'aria-label': labelText + ': ' + num + ' of ' + den + ' parts shaded' });
      for (var i = 0; i < den; i++) {
        strip.appendChild(ctx.el('span', { class: 'fb-part fb-part-static' + (i < num ? ' fb-on' : ''), text: '1/' + den }));
      }
      return ctx.el('div', { class: 'fb-bar-block', 'data-fb-ref': '' }, [
        ctx.el('p', { class: 'fb-bar-label', text: labelText }),
        strip,
      ]);
    };

    if (Array.isArray(item.referenceBars) && item.referenceBars.length) {
      var refList = ctx.el('div', { class: 'fb-ref-list' });
      item.referenceBars.forEach(function (rb) {
        if (!rb || !(Number(rb.den) > 0)) return;
        refList.appendChild(buildStaticBar(rb.label || (rb.num + '/' + rb.den), Math.floor(Number(rb.num) || 0), Math.floor(Number(rb.den))));
      });
      wrap.appendChild(refList);
    }

    var readout = ctx.el('p', { class: 'mn-readout', 'data-fb-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var denomBtns = [];
    var workStrip = ctx.el('div', { class: 'fb-strip', role: 'group', 'aria-label': 'Interactive fraction bar', 'data-fb-strip': '' });
    var cmpBtns = [];

    if (mode === 'compare') {
      var cmpRow = ctx.el('div', { class: 'fb-cmp-row', role: 'group', 'aria-label': 'Choose comparison symbol' });
      [
        { sym: '<', label: 'Less than (<)' },
        { sym: '=', label: 'Equal to (=)' },
        { sym: '>', label: 'Greater than (>)' },
      ].forEach(function (opt) {
        var b = ctx.el('button', {
          type: 'button',
          'data-fb-cmp': opt.sym,
          'aria-label': opt.label,
          'aria-pressed': 'false',
          on: { click: function () {
            if (locked) return;
            chosenCmp = opt.sym;
            paint(true);
          } },
          text: opt.sym,
        });
        cmpBtns.push(b);
        cmpRow.appendChild(b);
      });
      wrap.appendChild(cmpRow);
    } else {
      if (denoms.length > 1) {
        var denomRow = ctx.el('div', { class: 'fb-denoms', role: 'group', 'aria-label': 'Choose denominator bar size' }, [
          ctx.el('span', { class: 'fb-bar-label', text: 'Bar size:' }),
        ]);
        denoms.forEach(function (d) {
          var db = ctx.el('button', {
            type: 'button',
            'data-fb-denom': String(d),
            'aria-pressed': String(d === denom),
            on: { click: function () {
              if (locked || denom === d) return;
              denom = d;
              shaded = [];
              paint(true);
            } },
            text: '1/' + d,
          });
          denomBtns.push(db);
          denomRow.appendChild(db);
        });
        wrap.appendChild(denomRow);
      }
      wrap.appendChild(ctx.el('div', { class: 'fb-bar-block' }, [
        ctx.el('p', { class: 'fb-bar-label', text: 'Your bar (tap or press Space on parts to shade)' }),
        workStrip,
      ]));
    }

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'mn-hint-box', 'data-mn-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-mn-hint-btn': '',
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

    var clearBtn = mode === 'compare' ? null : ctx.el('button', {
      type: 'button',
      'data-fb-clear': '',
      on: { click: function () { if (locked) return; shaded = []; paint(true); } },
      text: 'Clear shading',
    });

    var submitBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-mn-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        if (mode === 'compare') {
          if (!chosenCmp) {
            var cmpMsg = 'Choose <, =, or > first.';
            if (typeof ctx.feedback === 'function') ctx.feedback(cmpMsg);
            else { readout.textContent = cmpMsg; ctx.announce(cmpMsg); }
            return;
          }
          if (ctx.check) { ctx.answer(chosenCmp); return; }
          var wantSym = String(item.targetSymbol || item.target || '=');
          var okCmp = chosenCmp === wantSym;
          ctx.answer(chosenCmp, okCmp, {
            correctText: 'Right! ' + (item.word || 'Comparison') + ' uses ' + wantSym + '.',
            retryText: 'Compare the shaded lengths on both bars and try again.',
            missedText: 'The matching symbol is ' + wantSym + '.',
          });
          return;
        }
        var num = shaded.length;
        var ansStr = num + '/' + denom;
        if (ctx.check) { ctx.answer(ansStr); return; }
        var ok;
        if (matchMode === 'exact') {
          ok = num === targetNum && denom === targetDen;
        } else {
          ok = num * targetDen === targetNum * denom;
          if (ok && item.forbidDenom && denom === Number(item.forbidDenom)) ok = false;
        }
        var retryText = 'You shaded ' + num + '/' + denom + '. Check how it lines up with the target and try again.';
        if (!ok && item.forbidDenom && denom === Number(item.forbidDenom) && num * targetDen === targetNum * denom) {
          retryText = 'You shaded ' + num + '/' + denom + '. Pick a different bar size to build an equivalent fraction.';
        }
        ctx.answer(ansStr, ok, {
          correctText: 'Right! ' + ansStr + ' matches the target fraction.',
          retryText: retryText,
          missedText: 'One matching fraction is ' + targetNum + '/' + targetDen + '.',
        });
      } },
      text: ctx.check ? 'Submit answer' : 'Check fraction',
    });

    wrap.appendChild(ctx.el('div', { class: 'mn-actions' }, [submitBtn, clearBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var paint = function (say, focusIdx) {
      if (mode === 'compare') {
        cmpBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-fb-cmp') === chosenCmp));
          b.disabled = locked;
        });
        var cmpLine = chosenCmp ? ('Selected comparison: ' + chosenCmp) : 'Select <, =, or > to compare the two bars.';
        readout.textContent = cmpLine;
        submitBtn.disabled = locked;
        if (say) ctx.announce(cmpLine);
        return;
      }
      denomBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-fb-denom')) === denom));
        b.disabled = locked;
      });
      while (workStrip.firstChild) workStrip.removeChild(workStrip.firstChild);
      var partBtns = [];
      for (var i = 0; i < denom; i++) {
        (function (idx) {
          var on = shaded.indexOf(idx) >= 0;
          var pb = ctx.el('button', {
            type: 'button',
            class: 'fb-part',
            'data-fb-part': String(idx),
            'aria-pressed': on ? 'true' : 'false',
            'aria-label': 'Part ' + (idx + 1) + ' of ' + denom + (on ? ', shaded' : ', unshaded'),
            on: {
              click: function () {
                if (locked) return;
                var pos = shaded.indexOf(idx);
                if (pos >= 0) shaded.splice(pos, 1); else shaded.push(idx);
                paint(true, idx);
              },
              keydown: function (e) {
                if (e.key === 'ArrowRight' && idx + 1 < partBtns.length) { e.preventDefault(); partBtns[idx + 1].focus(); }
                else if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); partBtns[idx - 1].focus(); }
              },
            },
            text: '1/' + denom,
          });
          pb.disabled = locked;
          partBtns.push(pb);
          workStrip.appendChild(pb);
        })(i);
      }
      if (typeof focusIdx === 'number' && partBtns[focusIdx] && !locked) {
        try { partBtns[focusIdx].focus(); } catch (_) {}
      }
      if (clearBtn) clearBtn.disabled = locked || shaded.length === 0;
      submitBtn.disabled = locked;
      var activeFb = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
      if (activeFb && activeFb.disabled && ctx.root.contains(activeFb) && !locked) {
        try { (partBtns[0] && !partBtns[0].disabled ? partBtns[0] : submitBtn).focus(); } catch (_) {}
      }
      var line = 'Shaded: ' + shaded.length + '/' + denom + ' (' + shaded.length + ' of ' + denom + ' equal parts)';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          if (mode === 'compare') {
            chosenCmp = String(item.targetSymbol || item.target || '=');
          } else {
            denom = targetDen;
            shaded = [];
            for (var i = 0; i < targetNum && i < denom; i++) shaded.push(i);
          }
        }
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 3: Interactive Number Line (manip_number_line)
  // ---------------------------------------------------------------------------
  function renderNumberLine(item, ctx) {
    var minVal = Number(item.min != null ? item.min : 0);
    var maxVal = Number(item.max != null ? item.max : 20);
    if (!(maxVal > minVal)) { minVal = 0; maxVal = 20; }
    var denom = Math.max(1, Math.floor(Number(item.denom) || 1));
    var step = Number(item.step) > 0 ? Number(item.step) : (1 / denom);
    var startVal = Number(item.start != null ? item.start : minVal);
    startVal = Math.max(minVal, Math.min(maxVal, startVal));
    var targetVal = Number(item.targetValue != null ? item.targetValue : item.target);
    var cur = startVal;
    var hops = [];
    var locked = false;

    var formatNum = function (v) {
      if (denom > 1) {
        var whole = Math.round(v * denom);
        if (whole === 0) return '0';
        var sign = whole < 0 ? '-' : '';
        var absN = Math.abs(whole);
        var gcd = function (a, b) { while (b) { var t = a % b; a = b; b = t; } return a || 1; };
        var g = gcd(absN, denom);
        var num = absN / g, den = denom / g;
        return den === 1 ? (sign + num) : (sign + num + '/' + den);
      }
      return String(Math.round(v * 1000) / 1000);
    };
    var formatHop = function (delta) {
      return (delta > 0 ? '+' : '') + formatNum(delta);
    };
    var clamp = function (v) {
      var snapped = Math.round((v - minVal) / step) * step + minVal;
      var clamped = Math.max(minVal, Math.min(maxVal, snapped));
      return Math.round(clamped * 100000) / 100000;
    };

    var hopChoices = Array.isArray(item.hops) && item.hops.length
      ? item.hops.map(Number).filter(function (n) { return isFinite(n) && n !== 0; })
      : (denom > 1 ? [-step, step] : (maxVal - minVal >= 15 ? [-5, -1, 1, 5] : [-1, 1]));

    var stopValues = [];
    var rawCount = Math.round((maxVal - minVal) / step);
    var stopStride = rawCount > 20 ? Math.ceil(rawCount / 20) : 1;
    for (var sIdx = 0; sIdx <= rawCount; sIdx += stopStride) {
      stopValues.push(clamp(minVal + sIdx * step));
    }
    if (Math.abs(stopValues[stopValues.length - 1] - maxVal) > 0.0001) stopValues.push(maxVal);

    var wrap = ctx.el('div', { class: 'mn-wrap', 'data-manip': 'number_line' });
    wrap.appendChild(ctx.el('p', { class: 'mn-prompt', 'data-mn-prompt': '', text: item.prompt || ('Move the point to ' + formatNum(targetVal) + '.') }));

    var readout = ctx.el('p', { class: 'mn-readout', 'data-nl-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var trail = ctx.el('div', { class: 'nl-hops-trail', 'data-nl-trail': '', 'aria-label': 'Hop history' });
    var startDot = ctx.el('span', { class: 'nl-start-dot', 'aria-hidden': 'true' });
    var marker = ctx.el('span', { class: 'nl-marker', 'data-nl-marker': '', 'aria-hidden': 'true' });
    var rail = ctx.el('div', { class: 'nl-rail' }, [startDot, marker]);
    rail.style.marginInline = (50 / Math.max(1, stopValues.length)).toFixed(4) + '%';
    var stopsWrap = ctx.el('div', { class: 'nl-stops', role: 'group', 'aria-label': 'Number line positions' });
    var stopBtns = [];
    stopValues.forEach(function (val, idx) {
      var sb = ctx.el('button', {
        type: 'button',
        class: 'nl-stop',
        'data-nl-stop': formatNum(val),
        'aria-pressed': 'false',
        'aria-label': 'Place point at ' + formatNum(val),
        on: {
          click: function () {
            if (locked) return;
            var diff = Math.round((val - cur) * 100000) / 100000;
            if (Math.abs(diff) > 0.0001) {
              cur = val;
              hops.push(diff);
              paint(true);
            }
          },
          keydown: function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              var nextIdx = e.key === 'ArrowRight' ? Math.min(stopBtns.length - 1, idx + 1) : Math.max(0, idx - 1);
              var targetStop = stopValues[nextIdx];
              if (!locked && Math.abs(targetStop - cur) > 0.0001) {
                hops.push(Math.round((targetStop - cur) * 100000) / 100000);
                cur = targetStop;
                paint(true);
              }
              if (stopBtns[nextIdx] && !stopBtns[nextIdx].disabled) stopBtns[nextIdx].focus();
            }
          },
        },
        text: formatNum(val),
      });
      stopBtns.push(sb);
      stopsWrap.appendChild(sb);
    });
    var trackScroll = ctx.el('div', { class: 'nl-scroll' }, [
      ctx.el('div', { class: 'nl-track-wrap' }, [rail, stopsWrap]),
    ]);
    var stage = ctx.el('div', { class: 'nl-stage' }, [
      trail,
      trackScroll,
    ]);
    wrap.appendChild(stage);

    var hopBtns = [];
    var hopRow = ctx.el('div', { class: 'nl-hop-btns', role: 'group', 'aria-label': 'Hop controls' });
    hopChoices.forEach(function (delta) {
      var hb = ctx.el('button', {
        type: 'button',
        'data-nl-hop': formatHop(delta),
        'aria-label': 'Hop ' + formatHop(delta),
        on: { click: function () {
          if (locked) return;
          var next = clamp(cur + delta);
          if (Math.abs(next - cur) < 0.0001) return;
          hops.push(Math.round((next - cur) * 100000) / 100000);
          cur = next;
          paint(true);
        } },
        text: 'Hop ' + formatHop(delta),
      });
      hopBtns.push({ btn: hb, delta: delta });
      hopRow.appendChild(hb);
    });
    wrap.appendChild(hopRow);

    var undoBtn = ctx.el('button', {
      type: 'button',
      'data-nl-undo': '',
      on: { click: function () {
        if (locked || !hops.length) return;
        var last = hops.pop();
        cur = clamp(cur - last);
        paint(true);
      } },
      text: 'Undo hop',
    });
    var resetBtn = ctx.el('button', {
      type: 'button',
      'data-nl-reset': '',
      on: { click: function () {
        if (locked) return;
        cur = startVal;
        hops = [];
        paint(true);
      } },
      text: 'Reset to ' + formatNum(startVal),
    });

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'mn-hint-box', 'data-mn-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-mn-hint-btn': '',
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
      'data-mn-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var ans = formatNum(cur);
        if (ctx.check) { ctx.answer(ans); return; }
        var ok = Math.abs(cur - targetVal) < 0.01;
        var retryText = cur < targetVal
          ? ('Your point is at ' + ans + '. Hop right (positive) to get closer and try again.')
          : ('Your point is at ' + ans + '. Hop left (negative) to get closer and try again.');
        ctx.answer(ans, ok, {
          correctText: 'Right! Your point landed on ' + ans + '.',
          retryText: retryText,
          missedText: 'The target position is ' + formatNum(targetVal) + '.',
        });
      } },
      text: ctx.check ? 'Submit point' : 'Check point',
    });

    wrap.appendChild(ctx.el('div', { class: 'mn-actions' }, [submitBtn, undoBtn, resetBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var pctOf = function (v) {
      return Math.max(0, Math.min(100, ((v - minVal) / (maxVal - minVal)) * 100));
    };

    var paint = function (say) {
      startDot.style.left = pctOf(startVal) + '%';
      marker.style.left = pctOf(cur) + '%';
      while (trail.firstChild) trail.removeChild(trail.firstChild);
      if (hops.length) {
        trail.appendChild(ctx.el('span', { class: 'fb-bar-label', text: 'Hops:' }));
        hops.forEach(function (h) { trail.appendChild(ctx.el('span', { class: 'nl-hop-pill', text: formatHop(h) })); });
      } else {
        trail.appendChild(ctx.el('span', { class: 'fb-bar-label', text: 'Started at ' + formatNum(startVal) + '. Use hop buttons or tap a position.' }));
      }
      var activeBtn = null;
      stopBtns.forEach(function (b, idx) {
        var isHere = Math.abs(stopValues[idx] - cur) < 0.005;
        b.setAttribute('aria-pressed', isHere ? 'true' : 'false');
        b.disabled = locked;
        if (isHere) activeBtn = b;
      });
      if (activeBtn && trackScroll && trackScroll.scrollWidth > trackScroll.clientWidth + 4 && typeof activeBtn.scrollIntoView === 'function') {
        try { activeBtn.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (_) {}
      }
      hopBtns.forEach(function (entry) {
        var next = clamp(cur + entry.delta);
        entry.btn.disabled = locked || Math.abs(next - cur) < 0.0001;
      });
      undoBtn.disabled = locked || !hops.length;
      resetBtn.disabled = locked || (Math.abs(cur - startVal) < 0.0001 && !hops.length);
      submitBtn.disabled = locked;
      var activeNl = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
      if (activeNl && activeNl.disabled && ctx.root.contains(activeNl) && !locked) {
        var altHop = hopBtns.find(function (entry) { return !entry.btn.disabled; });
        try { (altHop ? altHop.btn : submitBtn).focus(); } catch (_) {}
      }
      var line = 'Point at ' + formatNum(cur) + (hops.length ? (' (started at ' + formatNum(startVal) + ', ' + hops.length + (hops.length === 1 ? ' hop)' : ' hops)')) : (' (start: ' + formatNum(startVal) + ')'));
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check && isFinite(targetVal)) cur = clamp(targetVal);
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 4: Balance-Scale Equations (manip_balance_scale)
  // ---------------------------------------------------------------------------
  function renderBalanceScale(item, ctx) {
    var initA = Math.max(1, Math.min(6, Math.floor(Number(item.a) || 1)));
    var initB = Math.max(-12, Math.min(18, Math.floor(Number(item.b) || 0)));
    var initC = Math.max(-24, Math.min(36, Math.floor(Number(item.c) || 0)));
    var targetX = item.targetX != null ? Number(item.targetX) : (initC - initB) / initA;

    var curA = initA, curB = initB, curC = initC;
    var history = [];
    var locked = false;

    var eqText = function (a, b, c) {
      var lhs = (a === 1 ? 'x' : (a + 'x'));
      if (b > 0) lhs += ' + ' + b;
      else if (b < 0) lhs += ' \u2212 ' + Math.abs(b);
      return lhs + ' = ' + c;
    };

    var wrap = ctx.el('div', { class: 'mn-wrap', 'data-manip': 'balance_scale' });
    wrap.appendChild(ctx.el('p', { class: 'mn-prompt', 'data-mn-prompt': '', text: item.prompt || ('Balance both sides to solve ' + eqText(initA, initB, initC) + '.') }));

    var eqEl = ctx.el('p', { class: 'bal-eq', 'data-bal-eq': '' });
    var leftItems = ctx.el('div', { class: 'bal-items', 'data-bal-left': '' });
    var rightItems = ctx.el('div', { class: 'bal-items', 'data-bal-right': '' });
    var beam = ctx.el('div', { class: 'bal-beam', 'data-tilt': 'level' }, [
      ctx.el('div', { class: 'bal-pan' }, [ctx.el('p', { class: 'bal-pan-label', text: 'Left pan' }), leftItems]),
      ctx.el('div', { class: 'bal-pan' }, [ctx.el('p', { class: 'bal-pan-label', text: 'Right pan' }), rightItems]),
    ]);
    var beamWrap = ctx.el('div', { class: 'bal-beam-wrap' }, [beam, ctx.el('div', { class: 'bal-fulcrum', 'aria-hidden': 'true' })]);
    var logList = ctx.el('ul', { class: 'bal-log', 'data-bal-log': '', 'aria-label': 'Balanced equation steps' });
    var readout = ctx.el('p', { class: 'mn-readout', 'data-bal-readout': '', 'aria-live': 'polite' });

    var stage = ctx.el('div', { class: 'bal-stage' }, [eqEl, beamWrap, logList]);
    wrap.appendChild(stage);
    wrap.appendChild(readout);

    var applyOp = function (label, nextA, nextB, nextC) {
      if (locked) return;
      history.push({ a: curA, b: curB, c: curC, label: label });
      curA = nextA; curB = nextB; curC = nextC;
      ctx.support('balanceStep');
      if (curA === 1 && curB === 0) xInput.value = String(curC);
      paint(true);
    };

    var sub1Btn = ctx.el('button', {
      type: 'button',
      'data-bal-op': 'sub1',
      on: { click: function () { applyOp('\u22121 both sides', curA, curB - 1, curC - 1); } },
      text: '\u2212 1 from both sides',
    });
    var add1Btn = ctx.el('button', {
      type: 'button',
      'data-bal-op': 'add1',
      on: { click: function () { applyOp('+1 both sides', curA, curB + 1, curC + 1); } },
      text: '+ 1 to both sides',
    });
    var divBtn = ctx.el('button', {
      type: 'button',
      'data-bal-op': 'div',
      on: { click: function () {
        if (locked || curA <= 1 || curB !== 0 || curC % curA !== 0) return;
        var d = curA;
        applyOp('\u00f7' + d + ' both sides', 1, 0, curC / d);
      } },
      text: 'Split into ' + initA + ' equal groups (\u00f7 ' + initA + ')',
    });
    var undoBtn = ctx.el('button', {
      type: 'button',
      'data-bal-undo': '',
      on: { click: function () {
        if (locked || !history.length) return;
        var prev = history.pop();
        curA = prev.a; curB = prev.b; curC = prev.c;
        paint(true);
      } },
      text: 'Undo step',
    });
    var resetBtn = ctx.el('button', {
      type: 'button',
      'data-bal-reset': '',
      on: { click: function () {
        if (locked) return;
        curA = initA; curB = initB; curC = initC;
        history = [];
        xInput.value = '';
        paint(true);
      } },
      text: 'Reset scale',
    });
    wrap.appendChild(ctx.el('div', { class: 'bal-ops', role: 'group', 'aria-label': 'Balance operations on both sides' }, [sub1Btn, add1Btn, divBtn, undoBtn, resetBtn]));

    var xInputId = 'bal-x-' + String(item.id || '1').replace(/[^A-Za-z0-9_-]/g, '');
    var xInput = ctx.el('input', {
      id: xInputId,
      type: 'text',
      inputmode: 'numeric',
      autocomplete: 'off',
      'data-bal-x': '',
      placeholder: '?',
      on: { keydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); submitBtn.click(); } } },
    });
    wrap.appendChild(ctx.el('div', { class: 'bal-solve-row' }, [
      ctx.el('label', { for: xInputId, text: 'Value of x =' }),
      xInput,
    ]));

    var hintBox = null, hintBtn = null;
    if (!ctx.check && item.hint) {
      hintBox = ctx.el('p', { class: 'mn-hint-box', 'data-mn-hint': '', hidden: true, text: item.hint });
      hintBtn = ctx.el('button', {
        type: 'button',
        'data-mn-hint-btn': '',
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
      'data-mn-submit': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var raw = String(xInput.value || '').trim();
        var guessed = raw !== '' ? Number(raw) : (curA === 1 && curB === 0 ? curC : NaN);
        if (!isFinite(guessed)) {
          var balMsg = 'Isolate x on the balance scale or type a number for x first.';
          if (typeof ctx.feedback === 'function') ctx.feedback(balMsg);
          else { readout.textContent = balMsg; ctx.announce(balMsg); }
          xInput.focus();
          return;
        }
        var ansStr = 'x=' + guessed;
        if (ctx.check) { ctx.answer(ansStr); return; }
        var ok = Math.abs(guessed - targetX) < 0.001;
        var checkLeft = initA * guessed + initB;
        var retryText = 'If x = ' + guessed + ', the left pan weighs ' + checkLeft + ' while the right pan weighs ' + initC + '. Adjust your steps and try again.';
        if (!ok) {
          beam.setAttribute('data-tilt', checkLeft > initC ? 'left' : 'right');
        } else {
          beam.setAttribute('data-tilt', 'level');
        }
        ctx.answer(ansStr, ok, {
          correctText: 'Balanced! x = ' + targetX + ' makes ' + eqText(initA, initB, initC) + ' true.',
          retryText: retryText,
          missedText: 'Balanced solution: x = ' + targetX + '.',
        });
      } },
      text: ctx.check ? 'Submit x' : 'Check balance',
    });

    wrap.appendChild(ctx.el('div', { class: 'mn-actions' }, [submitBtn, hintBtn]));
    if (hintBox) wrap.appendChild(hintBox);
    ctx.root.appendChild(wrap);

    var fillUnits = function (container, count) {
      var absN = Math.abs(count);
      var neg = count < 0;
      if (absN <= 12) {
        for (var i = 0; i < absN; i++) {
          container.appendChild(ctx.el('span', { class: neg ? 'bal-unit bal-unit-neg' : 'bal-unit', text: neg ? '\u22121' : '1' }));
        }
      } else {
        var fives = Math.floor(absN / 5), ones = absN % 5;
        for (var j = 0; j < fives; j++) {
          container.appendChild(ctx.el('span', { class: neg ? 'bal-unit bal-unit-neg' : 'bal-unit', text: neg ? '\u22125' : '5' }));
        }
        for (var k = 0; k < ones; k++) {
          container.appendChild(ctx.el('span', { class: neg ? 'bal-unit bal-unit-neg' : 'bal-unit', text: neg ? '\u22121' : '1' }));
        }
      }
    };

    var paint = function (say) {
      eqEl.textContent = eqText(curA, curB, curC);
      beam.setAttribute('data-tilt', 'level');
      while (leftItems.firstChild) leftItems.removeChild(leftItems.firstChild);
      while (rightItems.firstChild) rightItems.removeChild(rightItems.firstChild);
      for (var i = 0; i < curA; i++) leftItems.appendChild(ctx.el('span', { class: 'bal-xbox', text: 'x' }));
      fillUnits(leftItems, curB);
      if (curC === 0) rightItems.appendChild(ctx.el('span', { class: 'bal-unit', text: '0' }));
      else fillUnits(rightItems, curC);

      while (logList.firstChild) logList.removeChild(logList.firstChild);
      logList.appendChild(ctx.el('li', { text: 'Start: ' + eqText(initA, initB, initC) }));
      var runA = initA, runB = initB, runC = initC;
      history.forEach(function (h, idx) {
        var nextState = idx + 1 < history.length ? history[idx + 1] : { a: curA, b: curB, c: curC };
        runA = nextState.a; runB = nextState.b; runC = nextState.c;
        logList.appendChild(ctx.el('li', { text: h.label + ' \u2192 ' + eqText(runA, runB, runC) }));
      });

      sub1Btn.disabled = locked || curB <= -12 || curC <= -24;
      add1Btn.disabled = locked || curB >= 18 || curC >= 36;
      divBtn.hidden = initA <= 1;
      divBtn.textContent = 'Split into ' + curA + ' equal groups (\u00f7 ' + curA + ')';
      divBtn.disabled = locked || curA <= 1 || curB !== 0 || (curC % curA !== 0);
      undoBtn.disabled = locked || !history.length;
      resetBtn.disabled = locked || !history.length;
      xInput.disabled = locked;
      submitBtn.disabled = locked;
      var activeBal = ctx.root.ownerDocument && ctx.root.ownerDocument.activeElement;
      if (activeBal && activeBal.disabled && ctx.root.contains(activeBal) && !locked) {
        try { (curA === 1 && curB === 0 ? submitBtn : (!sub1Btn.disabled ? sub1Btn : submitBtn)).focus(); } catch (_) {}
      }
      var isolated = curA === 1 && curB === 0;
      var line = 'Scale balanced: ' + eqText(curA, curB, curC) + (isolated ? (ctx.check ? ' (x is isolated. Press Submit x.)' : ' (x is isolated. Press Check balance.)') : '');
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () {
        locked = true;
        if (!ctx.check) {
          curA = 1; curB = 0; curC = targetX;
          xInput.value = String(targetX);
        }
        paint(false);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Check-mode prepare() and score() hooks for all 4 manipulatives
  // ---------------------------------------------------------------------------
  var ADAPTERS = {
    manip_base_ten: {
      id: 'manip_base_ten',
      title: 'Base-Ten Blocks',
      labels: {
        manip_base_ten_title: 'Base-Ten Blocks',
        manip_base_ten_directions: 'Build each number using hundreds, tens, and ones blocks, then press Submit blocks.',
        manip_base_ten_practice_wrong: 'Target model: {answer}.',
      },
      prepare: function (raw) {
        var tv = Math.max(0, Math.floor(Number(raw.targetValue != null ? raw.targetValue : raw.target) || 0));
        var h = raw.targetBlocks ? Math.floor(Number(raw.targetBlocks.hundreds) || 0) : Math.floor(tv / 100);
        var t = raw.targetBlocks ? Math.floor(Number(raw.targetBlocks.tens) || 0) : Math.floor((tv % 100) / 10);
        var o = raw.targetBlocks ? Math.floor(Number(raw.targetBlocks.ones) || 0) : (tv % 10);
        var exact = raw.match === 'exact';
        var ans = exact ? (tv + ':' + h + 'H' + t + 'T' + o + 'O') : String(tv);
        var clean = {
          id: str(raw.id, 40) || ('b10-' + tv),
          word: str(raw.word || ('Build ' + tv), 60),
          prompt: str(raw.prompt || ('Build ' + tv + ' with base-ten blocks.'), 220),
          match: exact ? 'exact' : 'value',
          allowRegroup: raw.allowRegroup !== false,
          hideTotal: !!raw.hideTotal,
          answer: ans,
        };
        if (raw.start && typeof raw.start === 'object') clean.start = { hundreds: Number(raw.start.hundreds) || 0, tens: Number(raw.start.tens) || 0, ones: Number(raw.start.ones) || 0 };
        return { item: clean };
      },
      score: function (item, expected, given) {
        var exp = String(expected || '').trim();
        var got = String(given || '').trim();
        var m = /^(\d+)\s*\((\d+)H\s+(\d+)T\s+(\d+)O\)/.exec(got);
        if (!m) return { correct: got === exp };
        var val = Number(m[1]), h = Number(m[2]), t = Number(m[3]), o = Number(m[4]);
        if (exp.indexOf(':') > 0) {
          return { correct: (val + ':' + h + 'H' + t + 'T' + o + 'O') === exp };
        }
        return { correct: String(val) === exp };
      },
      render: renderBaseTen,
    },
    manip_fraction_bars: {
      id: 'manip_fraction_bars',
      title: 'Fraction Bars',
      labels: {
        manip_fraction_bars_title: 'Fraction Bars',
        manip_fraction_bars_directions: 'Use the fraction bars to shade or compare each fraction, then submit your answer.',
        manip_fraction_bars_practice_wrong: 'Expected answer: {answer}.',
      },
      prepare: function (raw) {
        var task = raw.task === 'compare' ? 'compare' : raw.task === 'add' ? 'add' : 'build';
        var ans;
        if (task === 'compare') {
          ans = str(raw.targetSymbol || raw.target || '=', 4);
        } else {
          var tn = Math.max(0, Math.floor(Number(raw.targetNum) || 0));
          var td = Math.max(1, Math.floor(Number(raw.targetDen) || 1));
          var modeTag = raw.match === 'exact' ? 'exact' : 'eq';
          var forbid = raw.forbidDenom ? ('!' + Number(raw.forbidDenom)) : '';
          ans = modeTag + ':' + tn + '/' + td + forbid;
        }
        var clean = {
          id: str(raw.id, 40) || 'fb-1',
          word: str(raw.word || 'Fraction bar', 60),
          prompt: str(raw.prompt || 'Build the fraction on the bar.', 220),
          task: task,
          match: raw.match === 'exact' ? 'exact' : 'equivalent',
          denominators: Array.isArray(raw.denominators) && raw.denominators.length ? raw.denominators.slice(0, 10) : [2, 3, 4, 6, 8, 12],
          startDenom: Number(raw.startDenom) || 4,
          answer: ans,
        };
        if (Array.isArray(raw.referenceBars) && raw.referenceBars.length) clean.referenceBars = clone(raw.referenceBars);
        if (raw.forbidDenom) clean.forbidDenom = Number(raw.forbidDenom);
        return { item: clean };
      },
      score: function (item, expected, given) {
        var exp = String(expected || '').trim();
        var got = String(given || '').trim();
        if (exp === '<' || exp === '=' || exp === '>') return { correct: got === exp };
        var em = /^(exact|eq):(\d+)\/(\d+)(?:!(\d+))?$/.exec(exp);
        var gm = /^(\d+)\/(\d+)$/.exec(got);
        if (!em || !gm) return { correct: got === exp };
        var tn = Number(em[2]), td = Number(em[3]), forbid = em[4] ? Number(em[4]) : 0;
        var gn = Number(gm[1]), gd = Number(gm[2]);
        if (!(gd > 0)) return { correct: false };
        if (em[1] === 'exact') return { correct: gn === tn && gd === td };
        if (forbid && gd === forbid) return { correct: false };
        return { correct: gn * td === tn * gd };
      },
      render: renderFractionBars,
    },
    manip_number_line: {
      id: 'manip_number_line',
      title: 'Interactive Number Line',
      labels: {
        manip_number_line_title: 'Interactive Number Line',
        manip_number_line_directions: 'Move the point along the number line using hop buttons or positions, then press Submit point.',
        manip_number_line_practice_wrong: 'Target position: {answer}.',
      },
      prepare: function (raw) {
        var tv = Number(raw.targetValue != null ? raw.targetValue : raw.target);
        if (!isFinite(tv)) return { missing: ['targetValue'] };
        var clean = {
          id: str(raw.id, 40) || 'nl-1',
          word: str(raw.word || String(tv), 60),
          prompt: str(raw.prompt || 'Place the point on the number line.', 220),
          min: Number(raw.min != null ? raw.min : 0),
          max: Number(raw.max != null ? raw.max : 20),
          denom: Math.max(1, Math.floor(Number(raw.denom) || 1)),
          step: Number(raw.step) > 0 ? Number(raw.step) : (1 / Math.max(1, Math.floor(Number(raw.denom) || 1))),
          start: Number(raw.start != null ? raw.start : (raw.min != null ? raw.min : 0)),
          hops: Array.isArray(raw.hops) ? raw.hops.slice(0, 8) : undefined,
          answer: String(tv),
        };
        return { item: clean };
      },
      score: function (item, expected, given) {
        var parseVal = function (s) {
          var t = String(s || '').trim();
          var fm = /^(-?\d+)\/(\d+)$/.exec(t);
          if (fm && Number(fm[2]) > 0) return Number(fm[1]) / Number(fm[2]);
          var n = Number(t);
          return isFinite(n) ? n : NaN;
        };
        var ev = parseVal(expected), gv = parseVal(given);
        return { correct: isFinite(ev) && isFinite(gv) && Math.abs(ev - gv) < 0.01 };
      },
      render: renderNumberLine,
    },
    manip_balance_scale: {
      id: 'manip_balance_scale',
      title: 'Balance-Scale Equations',
      labels: {
        manip_balance_scale_title: 'Balance-Scale Equations',
        manip_balance_scale_directions: 'Use matching steps on both pans to isolate x, then submit the value of x.',
        manip_balance_scale_practice_wrong: 'Balanced solution: {answer}.',
      },
      prepare: function (raw) {
        var a = Math.max(1, Math.min(6, Math.floor(Number(raw.a) || 1)));
        var b = Math.max(-12, Math.min(18, Math.floor(Number(raw.b) || 0)));
        var c = Math.max(-24, Math.min(36, Math.floor(Number(raw.c) || 0)));
        var tx = raw.targetX != null ? Number(raw.targetX) : (c - b) / a;
        if (!isFinite(tx)) return { missing: ['targetX'] };
        var eq = (a === 1 ? 'x' : a + 'x') + (b > 0 ? ' + ' + b : b < 0 ? ' - ' + Math.abs(b) : '') + ' = ' + c;
        return {
          item: {
            id: str(raw.id, 40) || 'bal-1',
            word: str(raw.word || eq, 60),
            prompt: str(raw.prompt || ('Solve ' + eq + ' on the balance scale.'), 220),
            a: a,
            b: b,
            c: c,
            answer: 'x=' + tx,
          },
        };
      },
      score: function (item, expected, given) {
        var parseX = function (s) {
          var m = /^(?:x\s*=\s*)?(-?\d+(?:\.\d+)?)$/.exec(String(s || '').trim().toLowerCase());
          return m ? Number(m[1]) : NaN;
        };
        var ev = parseX(expected), gv = parseX(given);
        return { correct: isFinite(ev) && isFinite(gv) && Math.abs(ev - gv) < 0.001 };
      },
      render: renderBalanceScale,
    },
  };

  // ---------------------------------------------------------------------------
  // Curated K-8 Starter Problem Sets (2 per manipulative)
  // ---------------------------------------------------------------------------
  var STARTER_SETS = [
    {
      id: 'b10_place_value_g2',
      activity: 'manip_base_ten',
      gradeBand: 'Grades 1-2',
      name: 'Build Numbers to 250 (Place Value)',
      title: 'Base-Ten Place Value Practice',
      summary: 'Build 2-digit and 3-digit numbers using hundreds flats, tens rods, and ones cubes.',
      adaptiveHints: {
        place_value: 'Count hundreds first, then tens rods, then ones cubes.',
      },
      adaptiveExamples: {
        place_value: 'Worked example: 134 = 1 hundred, 3 tens, and 4 ones.',
      },
      items: [
        { id: 'b10-1', skill: 'place_value', word: '34', prompt: 'Build 34 with base-ten blocks.', targetValue: 34, target: '34', match: 'value', hint: '34 has 3 tens and 4 ones.', workedExample: '30 + 4 = 3 tens + 4 ones.' },
        { id: 'b10-2', skill: 'place_value', word: '57', prompt: 'Build 57 with base-ten blocks.', targetValue: 57, target: '57', match: 'value', hint: 'Start with 5 tens rods (50), then add 7 ones cubes.', workedExample: '50 + 7 = 5 tens + 7 ones.' },
        { id: 'b10-3', skill: 'place_value', word: '126', prompt: 'Build 126 with base-ten blocks.', targetValue: 126, target: '126', match: 'value', hint: 'Use 1 hundred flat, 2 tens rods, and 6 ones cubes.' },
        { id: 'b10-4', skill: 'place_value', word: '205', prompt: 'Build 205 with base-ten blocks.', targetValue: 205, target: '205', match: 'value', hint: 'Notice the 0 in the tens place: 2 hundreds, 0 tens, and 5 ones.' },
      ],
      stretchItems: [
        { id: 'b10-st1', word: '342', prompt: 'Stretch Challenge: Build 342 with hundreds, tens, and ones.', targetValue: 342, target: '342', match: 'value' },
      ],
    },
    {
      id: 'b10_regroup_add_g3',
      activity: 'manip_base_ten',
      gradeBand: 'Grades 2-3',
      name: 'Addition & Regrouping Trades',
      title: 'Base-Ten Regrouping Practice',
      summary: 'Start with blocks on the mat, add more, and trade 10 ones for 1 ten into standard form.',
      adaptiveHints: {
        regroup: 'Whenever you have 10 or more ones, press Trade 10 ones -> 1 ten.',
      },
      adaptiveExamples: {
        regroup: 'Worked example: 2 tens + 13 ones -> trade 10 ones -> 3 tens + 3 ones = 33.',
      },
      items: [
        { id: 'reg-1', skill: 'regroup', word: 'Regroup 2T 14O', prompt: 'Regroup 2 tens and 14 ones into standard place-value blocks.', start: { hundreds: 0, tens: 2, ones: 14 }, targetValue: 34, target: '34', match: 'exact', hint: 'Trade 10 ones for 1 ten so 4 ones remain.' },
        { id: 'reg-2', skill: 'regroup', word: '18 + 15', prompt: 'Start at 18, add 15 more, and regroup into standard form.', start: { hundreds: 0, tens: 1, ones: 8 }, targetValue: 33, target: '33', match: 'exact', hint: 'Add 1 ten and 5 ones to get 13 ones, then trade 10 ones for 1 ten.' },
        { id: 'reg-3', skill: 'regroup', word: '47 + 26', prompt: 'Start at 47, add 26 more, and regroup into standard form.', start: { hundreds: 0, tens: 4, ones: 7 }, targetValue: 73, target: '73', match: 'exact', hint: '7 ones + 6 ones = 13 ones. Trade 10 ones for 1 ten.' },
        { id: 'reg-4', skill: 'regroup', word: 'Regroup 11T 5O', prompt: 'Regroup 11 tens and 5 ones into standard place-value blocks.', start: { hundreds: 0, tens: 11, ones: 5 }, targetValue: 115, target: '115', match: 'exact', hint: 'Trade 10 tens for 1 hundred.' },
      ],
      stretchItems: [
        { id: 'reg-st1', word: '68 + 57', prompt: 'Stretch Challenge: Start at 68, add 57, and regroup into standard form.', start: { hundreds: 0, tens: 6, ones: 8 }, targetValue: 125, target: '125', match: 'exact' },
      ],
    },
    {
      id: 'frac_equiv_g4',
      activity: 'manip_fraction_bars',
      gradeBand: 'Grades 3-4',
      name: 'Equivalent Fractions (Halves to Twelfths)',
      title: 'Equivalent Fraction Bars',
      summary: 'Match reference bars by choosing a new denominator and shading an equal length.',
      adaptiveHints: {
        equiv: 'Line up the right edge of your shaded parts with the reference bar above.',
      },
      adaptiveExamples: {
        equiv: 'Worked example: 1/2 lines up with 2/4, 3/6, and 4/8.',
      },
      items: [
        { id: 'fe-1', skill: 'equiv', word: 'Equivalent to 1/2', prompt: 'Build a fraction equivalent to 1/2 using a different bar size.', task: 'build', match: 'equivalent', forbidDenom: 2, targetNum: 1, targetDen: 2, target: '2/4', denominators: [2, 3, 4, 6, 8, 12], startDenom: 4, referenceBars: [{ label: 'Reference: 1/2', num: 1, den: 2 }], hint: 'Try fourths (2/4), sixths (3/6), or eighths (4/8).' },
        { id: 'fe-2', skill: 'equiv', word: 'Equivalent to 1/3', prompt: 'Build a fraction equivalent to 1/3 using a different bar size.', task: 'build', match: 'equivalent', forbidDenom: 3, targetNum: 1, targetDen: 3, target: '2/6', denominators: [3, 4, 6, 8, 12], startDenom: 6, referenceBars: [{ label: 'Reference: 1/3', num: 1, den: 3 }], hint: 'Split each third in half to make sixths (2/6) or twelfths (4/12).' },
        { id: 'fe-3', skill: 'equiv', word: 'Equivalent to 3/4', prompt: 'Build a fraction equivalent to 3/4 using eighths or twelfths.', task: 'build', match: 'equivalent', forbidDenom: 4, targetNum: 3, targetDen: 4, target: '6/8', denominators: [4, 6, 8, 12], startDenom: 8, referenceBars: [{ label: 'Reference: 3/4', num: 3, den: 4 }], hint: 'Multiply top and bottom of 3/4 by 2 to get 6/8.' },
        { id: 'fe-4', skill: 'equiv', word: 'Equivalent to 2/3', prompt: 'Build a fraction equivalent to 2/3 using a different bar size.', task: 'build', match: 'equivalent', forbidDenom: 3, targetNum: 2, targetDen: 3, target: '4/6', denominators: [3, 4, 6, 9, 12], startDenom: 6, referenceBars: [{ label: 'Reference: 2/3', num: 2, den: 3 }], hint: 'Two thirds equals four sixths (4/6).' },
      ],
      stretchItems: [
        { id: 'fe-st1', word: 'Equivalent to 5/6', prompt: 'Stretch Challenge: Build a fraction equivalent to 5/6 using twelfths.', task: 'build', match: 'exact', targetNum: 10, targetDen: 12, target: '10/12', denominators: [6, 8, 10, 12], startDenom: 12, referenceBars: [{ label: 'Reference: 5/6', num: 5, den: 6 }] },
      ],
    },
    {
      id: 'frac_compare_add_g5',
      activity: 'manip_fraction_bars',
      gradeBand: 'Grades 4-5',
      name: 'Compare & Add Fractions',
      title: 'Fraction Comparison & Addition',
      summary: 'Compare two shaded bars using <, =, > and shade visual fraction sums.',
      adaptiveHints: {
        frac_ops: 'Compare total shaded width, or pick a common denominator bar to combine parts.',
      },
      adaptiveExamples: {
        frac_ops: 'Worked example: 1/2 + 1/4 = 2/4 + 1/4 = 3/4.',
      },
      items: [
        { id: 'fc-1', skill: 'frac_ops', word: '2/3 ? 3/6', prompt: 'Compare 2/3 and 3/6. Choose <, =, or >.', task: 'compare', targetSymbol: '>', target: '>', referenceBars: [{ label: 'First bar: 2/3', num: 2, den: 3 }, { label: 'Second bar: 3/6', num: 3, den: 6 }], hint: '2/3 equals 4/6, which is longer than 3/6.' },
        { id: 'fc-2', skill: 'frac_ops', word: '2/4 ? 4/8', prompt: 'Compare 2/4 and 4/8. Choose <, =, or >.', task: 'compare', targetSymbol: '=', target: '=', referenceBars: [{ label: 'First bar: 2/4', num: 2, den: 4 }, { label: 'Second bar: 4/8', num: 4, den: 8 }], hint: 'Both bars cover exactly half the strip.' },
        { id: 'fc-3', skill: 'frac_ops', word: '1/2 + 1/4', prompt: 'Shade the sum of 1/2 + 1/4 on your fraction bar.', task: 'add', match: 'equivalent', targetNum: 3, targetDen: 4, target: '3/4', denominators: [2, 4, 6, 8], startDenom: 4, referenceBars: [{ label: 'First addend: 1/2', num: 1, den: 2 }, { label: 'Second addend: 1/4', num: 1, den: 4 }], hint: '1/2 is 2/4, so 2/4 + 1/4 = 3/4.' },
        { id: 'fc-4', skill: 'frac_ops', word: '1/3 + 1/6', prompt: 'Shade the sum of 1/3 + 1/6 on your fraction bar.', task: 'add', match: 'equivalent', targetNum: 3, targetDen: 6, target: '3/6', denominators: [2, 3, 6, 12], startDenom: 6, referenceBars: [{ label: 'First addend: 1/3', num: 1, den: 3 }, { label: 'Second addend: 1/6', num: 1, den: 6 }], hint: '1/3 equals 2/6. Combine 2/6 + 1/6 = 3/6 (or 1/2).' },
      ],
      stretchItems: [
        { id: 'fc-st1', word: '1/4 + 3/8', prompt: 'Stretch Challenge: Shade the sum of 1/4 + 3/8 on your bar.', task: 'add', match: 'equivalent', targetNum: 5, targetDen: 8, target: '5/8', denominators: [4, 6, 8, 12], startDenom: 8, referenceBars: [{ label: 'First addend: 1/4', num: 1, den: 4 }, { label: 'Second addend: 3/8', num: 3, den: 8 }] },
      ],
    },
    {
      id: 'nl_add_sub_g2',
      activity: 'manip_number_line',
      gradeBand: 'Grades 1-3',
      name: 'Addition & Subtraction Hops (0 to 20)',
      title: 'Number Line Hops to 20',
      summary: 'Start at the first number and make +1, +5, +10, or -1 hops to model sums and differences.',
      adaptiveHints: {
        nl_ops: 'Hop right (+) to add and hop left (-) to subtract. Break bigger jumps into 5s and 1s.',
      },
      adaptiveExamples: {
        nl_ops: 'Worked example: 7 + 6 -> start at 7, hop +5 to 12, then hop +1 to 13.',
      },
      items: [
        { id: 'nl-1', skill: 'nl_ops', word: '6 + 7', prompt: 'Start at 6 and hop +7 to model 6 + 7.', min: 0, max: 20, step: 1, denom: 1, start: 6, targetValue: 13, target: '13', hops: [-5, -1, 1, 5], hint: 'From 6, hop +5 to 11, then +1 twice to land on 13.' },
        { id: 'nl-2', skill: 'nl_ops', word: '15 - 6', prompt: 'Start at 15 and hop back 6 to model 15 - 6.', min: 0, max: 20, step: 1, denom: 1, start: 15, targetValue: 9, target: '9', hops: [-5, -1, 1, 5], hint: 'From 15, hop -5 to 10, then -1 to 9.' },
        { id: 'nl-3', skill: 'nl_ops', word: '8 + 11', prompt: 'Start at 8 and hop +11 to model 8 + 11.', min: 0, max: 20, step: 1, denom: 1, start: 8, targetValue: 19, target: '19', hops: [-5, -1, 1, 5, 10], hint: 'From 8, hop +10 to 18, then +1 to 19.' },
        { id: 'nl-4', skill: 'nl_ops', word: '18 - 9', prompt: 'Start at 18 and hop back 9 to model 18 - 9.', min: 0, max: 20, step: 1, denom: 1, start: 18, targetValue: 9, target: '9', hops: [-5, -1, 1, 5], hint: 'Hop -5 to 13, then -1 four times to land on 9.' },
      ],
      stretchItems: [
        { id: 'nl-st1', word: '7 + 12', prompt: 'Stretch Challenge: Start at 7 and model 7 + 12.', min: 0, max: 20, step: 1, denom: 1, start: 7, targetValue: 19, target: '19', hops: [-5, -1, 1, 5, 10] },
      ],
    },
    {
      id: 'nl_integers_fracs_g6',
      activity: 'manip_number_line',
      gradeBand: 'Grades 5-7',
      name: 'Signed Integers & Fraction Number Lines',
      title: 'Integers & Fractions Number Line',
      summary: 'Plot and hop across negative integers (-6 to 6) and fourths (0 to 2).',
      adaptiveHints: {
        signed_nl: 'Negative hops move left past zero; positive hops move right.',
      },
      adaptiveExamples: {
        signed_nl: 'Worked example: 2 + (-5) -> start at 2, hop left 2 to 0, then left 3 more to -3.',
      },
      items: [
        { id: 'nli-1', skill: 'signed_nl', word: '3 + (-5)', prompt: 'Start at 3 and hop -5 to model 3 + (-5).', min: -6, max: 6, step: 1, denom: 1, start: 3, targetValue: -2, target: '-2', hops: [-5, -1, 1, 5], hint: 'Move 3 steps left to 0, then 2 more steps left to -2.' },
        { id: 'nli-2', skill: 'signed_nl', word: '-4 + 7', prompt: 'Start at -4 and hop +7 to model -4 + 7.', min: -6, max: 6, step: 1, denom: 1, start: -4, targetValue: 3, target: '3', hops: [-5, -1, 1, 5], hint: 'From -4, move 4 right to 0 and 3 more right to 3.' },
        { id: 'nli-3', skill: 'signed_nl', word: '1/4 + 1/2', prompt: 'Start at 1/4 and hop +1/2 on the fourths number line.', min: 0, max: 2, step: 0.25, denom: 4, start: 0.25, targetValue: 0.75, target: '3/4', hops: [-0.25, 0.25, 0.5], hint: '1/2 is two fourths (2/4). From 1/4, hop +1/2 to 3/4.' },
        { id: 'nli-4', skill: 'signed_nl', word: 'Plot 5/4', prompt: 'Start at 0 and place the point at 5/4 (1 and 1/4).', min: 0, max: 2, step: 0.25, denom: 4, start: 0, targetValue: 1.25, target: '5/4', hops: [-0.25, 0.25, 0.5, 1], hint: '4/4 equals 1 whole, so 5/4 is one fourth past 1.' },
      ],
      stretchItems: [
        { id: 'nli-st1', word: '-5 + 9', prompt: 'Stretch Challenge: Start at -5 and model -5 + 9.', min: -6, max: 6, step: 1, denom: 1, start: -5, targetValue: 4, target: '4', hops: [-5, -1, 1, 5] },
      ],
    },
    {
      id: 'bal_one_step_g6',
      activity: 'manip_balance_scale',
      gradeBand: 'Grades 5-6',
      name: 'One-Step Balance Equations',
      title: 'One-Step Balance-Scale Equations',
      summary: 'Isolate x using matching -1/+1 or equal-group division steps on both pans.',
      adaptiveHints: {
        one_step: 'Do the exact same step to both pans so the beam stays level until one x is alone.',
      },
      adaptiveExamples: {
        one_step: 'Worked example: x + 3 = 7 -> subtract 1 three times from both pans -> x = 4.',
      },
      items: [
        { id: 'b1-1', skill: 'one_step', word: 'x + 3 = 7', prompt: 'Balance both pans to solve x + 3 = 7.', a: 1, b: 3, c: 7, targetX: 4, target: 'x=4', hint: 'Remove 1 from both sides three times until x is alone.' },
        { id: 'b1-2', skill: 'one_step', word: 'x + 5 = 11', prompt: 'Balance both pans to solve x + 5 = 11.', a: 1, b: 5, c: 11, targetX: 6, target: 'x=6', hint: 'Remove 5 unit weights from both sides.' },
        { id: 'b1-3', skill: 'one_step', word: '2x = 8', prompt: 'Split both pans into equal groups to solve 2x = 8.', a: 2, b: 0, c: 8, targetX: 4, target: 'x=4', hint: 'Use Split into 2 equal groups (divide both sides by 2).' },
        { id: 'b1-4', skill: 'one_step', word: '3x = 12', prompt: 'Split both pans into equal groups to solve 3x = 12.', a: 3, b: 0, c: 12, targetX: 4, target: 'x=4', hint: 'Divide both sides by 3 to find one x.' },
      ],
      stretchItems: [
        { id: 'b1-st1', word: '4x = 20', prompt: 'Stretch Challenge: Solve 4x = 20 on the balance scale.', a: 4, b: 0, c: 20, targetX: 5, target: 'x=5' },
      ],
    },
    {
      id: 'bal_two_step_g7',
      activity: 'manip_balance_scale',
      gradeBand: 'Grades 6-8',
      name: 'Two-Step Balance Equations',
      title: 'Two-Step Balance-Scale Equations',
      summary: 'Remove constant weights first, then split equal groups to solve ax + b = c.',
      adaptiveHints: {
        two_step: 'First clear the extra unit weights (+ or - on both sides), then divide both sides by the number of x boxes.',
      },
      adaptiveExamples: {
        two_step: 'Worked example: 2x + 2 = 10 -> remove 2 from both pans (2x = 8) -> divide by 2 (x = 4).',
      },
      items: [
        { id: 'b2-1', skill: 'two_step', word: '2x + 2 = 10', prompt: 'Solve 2x + 2 = 10 on the balance scale.', a: 2, b: 2, c: 10, targetX: 4, target: 'x=4', hint: 'Remove 2 ones from both pans to get 2x = 8, then divide by 2.' },
        { id: 'b2-2', skill: 'two_step', word: '3x + 1 = 10', prompt: 'Solve 3x + 1 = 10 on the balance scale.', a: 3, b: 1, c: 10, targetX: 3, target: 'x=3', hint: 'Remove 1 from both pans (3x = 9), then split into 3 equal groups.' },
        { id: 'b2-3', skill: 'two_step', word: '2x + 4 = 14', prompt: 'Solve 2x + 4 = 14 on the balance scale.', a: 2, b: 4, c: 14, targetX: 5, target: 'x=5', hint: 'Remove 4 from both pans (2x = 10), then divide by 2.' },
        { id: 'b2-4', skill: 'two_step', word: '4x + 2 = 14', prompt: 'Solve 4x + 2 = 14 on the balance scale.', a: 4, b: 2, c: 14, targetX: 3, target: 'x=3', hint: 'Remove 2 from both pans (4x = 12), then divide by 4.' },
      ],
      stretchItems: [
        { id: 'b2-st1', word: '3x + 4 = 19', prompt: 'Stretch Challenge: Solve 3x + 4 = 19 on the balance scale.', a: 3, b: 4, c: 19, targetX: 5, target: 'x=5' },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Plain-text line parsers/formatters for the Step 2 custom teacher editor
  // ---------------------------------------------------------------------------
  function formatItemsText(activity, items) {
    var list = Array.isArray(items) ? items : [];
    if (activity === 'manip_base_ten') {
      return list.map(function (it) {
        var tv = Number(it.targetValue != null ? it.targetValue : it.target) || 0;
        var st = it.start && (it.start.hundreds || it.start.tens || it.start.ones)
          ? ('start=' + (it.start.hundreds || 0) + ',' + (it.start.tens || 0) + ',' + (it.start.ones || 0))
          : '';
        var cols = [String(tv), it.prompt || ('Build ' + tv + ' with base-ten blocks.')];
        if (it.match === 'exact' || st || it.hint) cols.push(it.match === 'exact' ? 'exact' : 'value');
        if (st || it.hint) cols.push(st);
        if (it.hint) cols.push(it.hint);
        return cols.join(' | ');
      }).join('\n');
    }
    if (activity === 'manip_fraction_bars') {
      return list.map(function (it) {
        if (it.task === 'compare') {
          var r0 = (it.referenceBars && it.referenceBars[0]) || { num: 1, den: 2 };
          var r1 = (it.referenceBars && it.referenceBars[1]) || { num: 1, den: 4 };
          var sym = it.targetSymbol || it.target || '=';
          var cols = ['compare', r0.num + '/' + r0.den + ' ' + sym + ' ' + r1.num + '/' + r1.den, it.prompt || ''];
          if (it.hint) cols.push(it.hint);
          return cols.join(' | ');
        }
        var frac = (it.targetNum || 1) + '/' + (it.targetDen || 2);
        var kind = it.task === 'add' ? 'add' : (it.match === 'exact' ? 'exact' : 'equiv');
        var refs = Array.isArray(it.referenceBars) ? it.referenceBars.map(function (r) { return r.num + '/' + r.den; }).join('+') : '';
        var cols2 = [kind, frac, it.prompt || ('Build ' + frac + ' on the fraction bar.')];
        if (refs || it.hint) cols2.push(refs);
        if (it.hint) cols2.push(it.hint);
        return cols2.join(' | ');
      }).join('\n');
    }
    if (activity === 'manip_number_line') {
      return list.map(function (it) {
        var range = (it.min != null ? it.min : 0) + '..' + (it.max != null ? it.max : 20);
        var dStr = (Number(it.denom) || 1) > 1 ? ('/' + it.denom) : '';
        var cols = [String(it.start != null ? it.start : 0), String(it.targetValue != null ? it.targetValue : 0), range + dStr, it.prompt || ''];
        if (it.hint) cols.push(it.hint);
        return cols.join(' | ');
      }).join('\n');
    }
    if (activity === 'manip_balance_scale') {
      return list.map(function (it) {
        var a = Number(it.a) || 1, b = Number(it.b) || 0, c = Number(it.c) || 0;
        var eq = (a === 1 ? 'x' : a + 'x') + (b > 0 ? ' + ' + b : b < 0 ? ' - ' + Math.abs(b) : '') + ' = ' + c;
        var cols = [eq, it.prompt || ('Solve ' + eq + ' on the balance scale.')];
        if (it.hint) cols.push(it.hint);
        return cols.join(' | ');
      }).join('\n');
    }
    return '';
  }

  function parseFracToken(tok) {
    var m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(tok || '').trim());
    if (!m || !(Number(m[2]) > 0)) return null;
    return { num: Math.floor(Number(m[1])), den: Math.floor(Number(m[2])) };
  }

  function parseItemsText(activity, text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
    var out = [];
    lines.forEach(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      if (activity === 'manip_base_ten') {
        var tv = Math.floor(Number(parts[0]));
        if (!isFinite(tv) || tv < 0 || tv > 999) return;
        var prompt = parts[1] || ('Build ' + tv + ' with base-ten blocks.');
        var match = /^exact$/i.test(parts[2] || '') ? 'exact' : 'value';
        var item = { id: 'b10-' + (i + 1), skill: match === 'exact' ? 'regroup' : 'place_value', word: String(tv), prompt: prompt, targetValue: tv, target: String(tv), match: match };
        var sm = /^start=(\d+),(\d+),(\d+)$/i.exec(parts[3] || '');
        if (sm) item.start = { hundreds: Number(sm[1]), tens: Number(sm[2]), ones: Number(sm[3]) };
        if (parts[4]) item.hint = parts[4];
        else if (parts[3] && !sm) item.hint = parts[3];
        out.push(item);
      } else if (activity === 'manip_fraction_bars') {
        var kind = String(parts[0] || '').toLowerCase();
        if (kind === 'compare') {
          var cm = /^(\d+\s*\/\s*\d+)\s*([<=>])\s*(\d+\s*\/\s*\d+)$/.exec(parts[1] || '');
          if (!cm) return;
          var f1 = parseFracToken(cm[1]), f2 = parseFracToken(cm[3]);
          if (!f1 || !f2) return;
          var sym = cm[2];
          var cItem = {
            id: 'fb-' + (i + 1),
            skill: 'frac_ops',
            word: f1.num + '/' + f1.den + ' ? ' + f2.num + '/' + f2.den,
            prompt: parts[2] || ('Compare ' + f1.num + '/' + f1.den + ' and ' + f2.num + '/' + f2.den + '. Choose <, =, or >.'),
            task: 'compare',
            targetSymbol: sym,
            target: sym,
            referenceBars: [
              { label: 'First bar: ' + f1.num + '/' + f1.den, num: f1.num, den: f1.den },
              { label: 'Second bar: ' + f2.num + '/' + f2.den, num: f2.num, den: f2.den },
            ],
          };
          if (parts[3]) cItem.hint = parts[3];
          out.push(cItem);
        } else {
          var targetF = parseFracToken(parts[1] || parts[0]);
          if (!targetF || targetF.den > 12) return;
          var isAdd = kind === 'add';
          var isExact = kind === 'exact';
          var refSpec = parts[3] || '';
          var refBars = [];
          if (refSpec) {
            refSpec.split('+').forEach(function (tok, ri) {
              var rf = parseFracToken(tok);
              if (rf && rf.den <= 12) refBars.push({ label: (isAdd ? ('Addend ' + (ri + 1) + ': ') : 'Reference: ') + rf.num + '/' + rf.den, num: rf.num, den: rf.den });
            });
          }
          var denoms = [2, 3, 4, 6, 8, 12];
          if (denoms.indexOf(targetF.den) < 0) denoms.push(targetF.den);
          denoms.sort(function (a, b) { return a - b; });
          var fItem = {
            id: 'fb-' + (i + 1),
            skill: isAdd ? 'frac_ops' : 'equiv',
            word: targetF.num + '/' + targetF.den,
            prompt: parts[2] || ('Shade ' + targetF.num + '/' + targetF.den + ' on the fraction bar.'),
            task: isAdd ? 'add' : 'build',
            match: isExact ? 'exact' : 'equivalent',
            targetNum: targetF.num,
            targetDen: targetF.den,
            target: targetF.num + '/' + targetF.den,
            denominators: denoms,
            startDenom: targetF.den,
          };
          if (refBars.length) {
            fItem.referenceBars = refBars;
            if (!isAdd && !isExact && refBars.length === 1 && refBars[0].num * targetF.den === targetF.num * refBars[0].den) {
              fItem.forbidDenom = refBars[0].den;
              var altDen = denoms.find(function (d) { return d !== refBars[0].den && (d % refBars[0].den === 0 || refBars[0].den % d === 0); })
                || denoms.find(function (d) { return d !== refBars[0].den; })
                || denoms[0];
              fItem.startDenom = altDen;
            }
          }
          if (parts[4]) fItem.hint = parts[4];
          out.push(fItem);
        }
      } else if (activity === 'manip_number_line') {
        var parseNumTok = function (tok) {
          var s = String(tok || '').trim().replace(/^\u2212/, '-');
          var sm = /^(-?)(\d+)\s*\/\s*(\d+)$/.exec(s);
          if (sm && Number(sm[3]) > 0) return (sm[1] ? -1 : 1) * (Number(sm[2]) / Number(sm[3]));
          var n = Number(s);
          return isFinite(n) ? n : NaN;
        };
        var sVal = parseNumTok(parts[0]);
        var tVal = parseNumTok(parts[1]);
        if (!isFinite(sVal) || !isFinite(tVal)) return;
        var rm = /^(-?\d+)\.\.(-?\d+)(?:\/(\d+))?$/.exec(parts[2] || '0..20');
        var minV = rm ? Number(rm[1]) : 0;
        var maxV = rm ? Number(rm[2]) : 20;
        var den = rm && rm[3] ? Math.max(1, Math.min(8, Math.floor(Number(rm[3])))) : 1;
        if (!(maxV > minV)) { minV = 0; maxV = 20; }
        var stepV = 1 / den;
        var hops = den > 1 ? [-stepV, stepV, 0.5] : (maxV - minV >= 15 ? [-5, -1, 1, 5] : [-1, 1]);
        var nItem = {
          id: 'nl-' + (i + 1),
          skill: minV < 0 || den > 1 ? 'signed_nl' : 'nl_ops',
          word: parts[1],
          prompt: parts[3] || ('Start at ' + parts[0] + ' and move the point to ' + parts[1] + '.'),
          min: minV,
          max: maxV,
          denom: den,
          step: stepV,
          start: Math.max(minV, Math.min(maxV, sVal)),
          targetValue: tVal,
          target: String(parts[1]),
          hops: hops,
        };
        if (parts[4]) nItem.hint = parts[4];
        out.push(nItem);
      } else if (activity === 'manip_balance_scale') {
        var em = /^(\d*)\s*x\s*(?:([+\-\u2212])\s*(\d+))?\s*=\s*(-?\d+)$/i.exec(parts[0] || '');
        if (!em) return;
        var a = em[1] ? Math.max(1, Math.min(6, Math.floor(Number(em[1])))) : 1;
        var b = em[3] ? ((em[2] === '-' || em[2] === '\u2212') ? -Number(em[3]) : Number(em[3])) : 0;
        var c = Number(em[4]);
        var tx = (c - b) / a;
        if (!isFinite(tx) || Math.floor(tx) !== tx) return;
        var eq = (a === 1 ? 'x' : a + 'x') + (b > 0 ? ' + ' + b : b < 0 ? ' - ' + Math.abs(b) : '') + ' = ' + c;
        var bItem = {
          id: 'bal-' + (i + 1),
          skill: a > 1 && b !== 0 ? 'two_step' : 'one_step',
          word: eq,
          prompt: parts[1] || ('Solve ' + eq + ' on the balance scale.'),
          a: a,
          b: b,
          c: c,
          targetX: tx,
          target: 'x=' + tx,
        };
        if (parts[2]) bItem.hint = parts[2];
        out.push(bItem);
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

  function lessonFromManipulatives(options) {
    var cfg = options && typeof options === 'object' ? options : {};
    var starter = cfg.starterId ? findStarter(cfg.starterId) : null;
    var activity = ACTIVITIES.indexOf(cfg.activity) >= 0 ? cfg.activity : (starter ? starter.activity : 'manip_base_ten');
    if (!starter || starter.activity !== activity) starter = defaultStarterFor(activity);

    var mode = cfg.mode === 'probe' ? 'probe' : 'practice';
    var items = Array.isArray(cfg.items) && cfg.items.length ? clone(cfg.items) : clone(starter.items);
    if (!items.length) throw new Error('Add at least one manipulative problem.');

    items = items.slice(0, 20).map(function (it, idx) {
      var copy = clone(it);
      copy.id = str(copy.id, 40) || (activity + '-' + (idx + 1));
      return copy;
    });

    var title = str(cfg.title || starter.title || ADAPTERS[activity].title, 80);
    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); })
      : [];
    var bilingualGlossary = normalizeGlossary(cfg.bilingualGlossary);
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;
    var adaptiveOn = mode !== 'probe' && !!cfg.adaptiveScaffold;
    var stretchItems = adaptiveOn
      ? (Array.isArray(cfg.stretchItems) && cfg.stretchItems.length ? clone(cfg.stretchItems) : clone(starter.stretchItems || []))
      : [];

    var basis = JSON.stringify({
      v: VERSION,
      activity: activity,
      mode: mode,
      title: title,
      items: items,
      adaptiveOn: adaptiveOn,
      stretchItems: stretchItems,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
      form: mode === 'probe' ? str(cfg.form || 'Form A', 40) : '',
      timeLimitS: mode === 'probe' && Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null,
    });
    var rev = 'm' + fnv1a(basis);
    var lessonId = slug(title, 34) + '-' + activity.replace(/^manip_/, '').replace(/_/g, '-') + '-' + rev.slice(0, 5);

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: mode,
      blocks: [{ activity: activity, items: items }],
      activityTitles: {},
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
    };
    lesson.activityTitles[activity] = ADAPTERS[activity].title;
    if (mode === 'probe') {
      lesson.form = str(cfg.form || 'Form A', 40);
      lesson.timeLimitS = Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null;
      lesson.check = {
        measure: activity,
        scoreUnit: 'items_correct',
        allowSkip: true,
        scoringVersion: 1,
        formVersion: 1,
      };
    } else if (adaptiveOn) {
      lesson.adaptiveScaffold = typeof cfg.adaptiveScaffold === 'object'
        ? clone(cfg.adaptiveScaffold)
        : {
          missThreshold: 2,
          streakThreshold: 4,
          hints: clone(starter.adaptiveHints || {}),
          workedExamples: clone(starter.adaptiveExamples || {}),
        };
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
    throw new Error('buildManipulativePacket needs AlloWordSoundsTakeHome loader');
  }

  function buildManipulativePacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromManipulatives(opts);
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

    var baseHtml = loader.buildHtml(lesson, buildOpts);
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var activity = lesson.blocks[0] ? lesson.blocks[0].activity : 'manip_base_ten';
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

  // Safely inspect an existing manipulative .html packet (reads JSON blocks only, runs nothing).
  function readManipulativePacket(input, verifyCore) {
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
    var activity = blocks[0].activity;
    var mode = lesson.mode === 'probe' || (manifest.packet && manifest.packet.mode === 'check') ? 'probe' : 'practice';
    var notes = [];
    var teacherCode = !!(lesson.check && lesson.check.lock);
    if (mode === 'probe') {
      notes.push('Check mode scrambles answers inside the file, so review target values in step 2 before saving again.');
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
      kind: 'manipulatives',
      title: str(lesson.title || manifest.title, 80),
      activity: activity,
      mode: mode,
      form: str(lesson.form, 40),
      timeLimitS: lesson.timeLimitS || null,
      items: clone(blocks[0].items),
      adaptiveScaffold: !!lesson.adaptiveScaffold,
      stretchItems: Array.isArray(lesson.stretchItems) ? clone(lesson.stretchItems) : [],
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
    parseItemsText: parseItemsText,
    formatItemsText: formatItemsText,
    lessonFromManipulatives: lessonFromManipulatives,
    buildManipulativePacket: buildManipulativePacket,
    readManipulativePacket: readManipulativePacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketManipulatives = api;
})(typeof window !== 'undefined' ? window : globalThis);
