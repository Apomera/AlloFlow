// Private SEL Check-In, Executive Function & "First-Then" Toolkit Packets builder and self-contained student adapters.
// Plain UMD script for browser pages (window.AlloPacketSel) and Node (module.exports).
// Four privacy-first, non-clinical, non-scored student toolkits:
//   - sel_first_then: Visual First-Then & Multi-Step Task Checklist
//   - sel_focus_timer: Visual Focus & Break Timer
//   - sel_calm_toolkit: Calm-Down & Self-Regulation Strategy Cards
//   - sel_udl_reflect: Metacognitive UDL Reflection & Goal Check
// Reflections and check-in feelings stay private on the student's screen by default unless explicitly opted in.
// Deterministic local builder: no network calls, no browser storage, no markup strings.
(function (root) {
  'use strict';

  var VERSION = 1;
  var ACTIVITIES = ['sel_first_then', 'sel_focus_timer', 'sel_calm_toolkit', 'sel_udl_reflect'];

  var EXTRA_CSS = [
    '.sel-wrap{display:grid;gap:14px}',
    '.sel-prompt{margin:0;font-size:1.18rem;font-weight:700;line-height:1.4}',
    '.sel-sub{margin:0;color:var(--muted);font-size:.95rem;line-height:1.45}',
    '.sel-privacy{margin:0;padding:10px 14px;border-radius:12px;border:1.5px solid var(--line);border-inline-start:4px solid var(--accent);background:var(--soft);font-size:.92rem;line-height:1.45}',
    '.sel-readout{margin:0;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--soft);font-weight:700;font-size:1rem;font-variant-numeric:tabular-nums}',
    '.sel-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.sel-actions button{min-height:44px}',
    /* First-Then & Checklist */
    '.ft-board{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:stretch}',
    '@media (max-width:520px){.ft-board{grid-template-columns:1fr}.ft-arrow{transform:rotate(90deg);justify-self:center}}',
    '.ft-box{padding:14px;border:2.5px solid var(--line);border-radius:14px;background:var(--card);display:grid;gap:6px;align-content:start}',
    '.ft-box-first{border-color:var(--accent)}',
    '.ft-box-then{border-color:var(--ok);background:var(--ok-bg)}',
    '.ft-kicker{margin:0;font-size:.82rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.ft-title{margin:0;font-size:1.2rem;font-weight:700;line-height:1.3}',
    '.ft-arrow{align-self:center;font-size:1.6rem;font-weight:800;color:var(--accent)}',
    '.ft-bar{height:12px;border-radius:999px;background:var(--line);overflow:hidden}',
    '.ft-bar-fill{display:block;height:100%;background:var(--ok);transition:width .16s ease}',
    '.ft-steps{list-style:none;margin:0;padding:0;display:grid;gap:8px}',
    '.ft-step-btn{width:100%;min-height:48px;padding:10px 14px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);display:flex;align-items:center;gap:10px;text-align:start;font:inherit;font-weight:600;cursor:pointer}',
    '.ft-step-btn[aria-pressed=true]{border-color:var(--ok);background:var(--ok-bg)}',
    '.ft-check{min-width:26px;height:26px;border-radius:6px;border:2px solid var(--ink);display:inline-flex;align-items:center;justify-content:center;font-weight:800;background:var(--card)}',
    '.ft-step-btn[aria-pressed=true] .ft-check{background:var(--ok);border-color:var(--ok);color:var(--card)}',
    '.ft-step-btn[aria-pressed=true] .ft-step-txt{text-decoration:line-through;opacity:.82}',
    '.ft-add-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.ft-add-row input{flex:1 1 200px;min-height:44px;width:auto;max-width:none;min-width:0}',
    /* Focus & Break Timer */
    '.tm-stage{padding:18px 16px;border:2px solid var(--line);border-radius:14px;background:var(--card);display:grid;gap:12px;text-align:center}',
    '.tm-phase{margin:0;font-size:.9rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--accent)}',
    '.tm-clock{margin:0;font-size:2.8rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}',
    '.tm-bar{height:16px;border-radius:999px;background:var(--line);overflow:hidden}',
    '.tm-bar-fill{display:block;height:100%;background:var(--accent);transition:width .2s linear}',
    '.tm-presets{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}',
    '.tm-presets button{min-height:44px;min-width:54px;font-weight:700}',
    '.tm-presets button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);outline:none}',
    '.tm-presets button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    /* Calm-Down & Strategy Cards */
    '.cm-states{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}',
    '.cm-state-btn{min-height:48px;padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font:inherit;font-weight:700;cursor:pointer;text-align:center}',
    '.cm-state-btn[aria-pressed=true]{border-color:var(--accent);background:var(--soft);box-shadow:inset 0 0 0 1px var(--accent);outline:none}',
    '.cm-state-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.cm-tabs{display:flex;flex-wrap:wrap;gap:6px}',
    '.cm-tabs button{min-height:44px;font-weight:700}',
    '.cm-tabs button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);outline:none}',
    '.cm-tabs button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.cm-panel{padding:16px;border:2px solid var(--line);border-radius:14px;background:var(--card);display:grid;gap:12px}',
    '.cm-breath-box{padding:16px;border-radius:12px;background:var(--soft);border:1.5px solid var(--line);text-align:center;display:grid;gap:8px}',
    '.cm-breath-cue{margin:0;font-size:1.35rem;font-weight:800;color:var(--accent)}',
    '.cm-breath-meter{height:14px;border-radius:999px;background:var(--line);overflow:hidden}',
    '.cm-breath-fill{display:block;height:100%;background:var(--accent);transition:width .25s ease}',
    '.cm-break-card{padding:18px;border:3px solid var(--accent);border-radius:14px;background:var(--soft);text-align:center;display:grid;gap:8px}',
    '.cm-break-title{margin:0;font-size:1.3rem;font-weight:800}',
    /* UDL Reflection */
    '.ur-chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.ur-chip{min-height:44px;padding:8px 14px;border:2px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);font:inherit;font-weight:600;cursor:pointer}',
    '.ur-chip[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.ur-chip:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.ur-field{display:grid;gap:6px}',
    '.ur-field label{font-weight:700}',
    '.ur-field textarea{width:100%;min-height:74px;padding:10px;border:2px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font:inherit}',
    '.sel-consent{display:flex;align-items:center;min-height:48px;gap:12px;padding:10px 14px;border:1.5px solid var(--line);border-radius:12px;background:var(--soft);font-size:.94rem;line-height:1.4;cursor:pointer}',
    '.sel-consent input{width:22px;height:22px;min-width:22px;min-height:22px;flex:0 0 auto;margin:0;accent-color:var(--accent)}',
    '@media (prefers-reduced-motion:reduce){.ft-bar-fill,.tm-bar-fill,.cm-breath-fill{transition:none}}',
    '@media (forced-colors:active){.ft-box,.tm-stage,.cm-panel,.cm-break-card,.sel-privacy,.sel-consent{border:2px solid CanvasText}.ft-step-btn,.cm-state-btn,.ur-chip{border:2px solid ButtonText}.ft-step-btn[aria-pressed=true]{border-color:Highlight}.ft-bar,.tm-bar,.cm-breath-meter{border:1px solid CanvasText}.ft-bar-fill,.tm-bar-fill,.cm-breath-fill,.cm-state-btn[aria-pressed=true],.ft-step-btn[aria-pressed=true] .ft-check,.cm-tabs button[aria-pressed=true],.ur-chip[aria-pressed=true],.tm-presets button[aria-pressed=true]{forced-color-adjust:none;background:Highlight;color:HighlightText}[data-read-aloud-btn][aria-pressed=true]{forced-color-adjust:none;background:Highlight;color:HighlightText;border:2px solid Highlight}}',
    '.sel-read-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '[data-read-aloud-btn]{min-height:44px;min-width:44px;padding:6px 12px;font-size:.92rem;border-radius:10px}',
    '[data-read-aloud-btn][aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '[data-read-aloud-btn]:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '@media print{.progress,.ft-bar,.sel-readout,.sel-privacy,.sel-read-row,[data-read-aloud-btn],.sel-actions button,.ft-add-row,.tm-presets,.cm-tabs,.sel-consent{display:none!important}.card{border:0;box-shadow:none;padding:0;margin:0}.ft-board,.ft-steps,.cm-break-card{break-inside:avoid}}',
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
    return (s || 'student-toolkit').slice(0, max || 44);
  }

  function codeName(raw) {
    return str(raw, 40);
  }

  function fileName(title, learner) {
    var base = slug(title, 44);
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
  // Adapter 1: Visual "First-Then" & Multi-Step Task Checklist (sel_first_then)
  // ---------------------------------------------------------------------------
  function renderFirstThen(item, ctx) {
    var steps = (Array.isArray(item.steps) && item.steps.length ? item.steps : ['Read the directions', 'Complete part 1', 'Check my work']).map(function (st, i) {
      return { id: 's' + (i + 1), text: typeof st === 'string' ? st : String(st.text || ''), done: false, custom: false };
    });
    var locked = false;

    var wrap = ctx.el('div', { class: 'sel-wrap', 'data-sel': 'first_then' });
    wrap.appendChild(ctx.el('p', { class: 'sel-prompt', text: item.prompt || 'Use your First-Then board and check off each step as you finish it.' }));

    var board = ctx.el('div', { class: 'ft-board', role: 'region', 'aria-label': 'First-Then visual schedule' }, [
      ctx.el('div', { class: 'ft-box ft-box-first', 'data-ft-first': '' }, [
        ctx.el('p', { class: 'ft-kicker', text: 'First' }),
        ctx.el('p', { class: 'ft-title', text: item.firstLabel || 'Finish my task steps' }),
      ]),
      ctx.el('div', { class: 'ft-arrow', 'aria-hidden': 'true', text: '\u2192' }),
      ctx.el('div', { class: 'ft-box ft-box-then', 'data-ft-then': '' }, [
        ctx.el('p', { class: 'ft-kicker', text: 'Then' }),
        ctx.el('p', { class: 'ft-title', text: item.thenLabel || 'Take a short break or choice time' }),
      ]),
    ]);
    wrap.appendChild(board);

    var fill = ctx.el('span', { class: 'ft-bar-fill' });
    wrap.appendChild(ctx.el('div', { class: 'ft-bar', 'aria-hidden': 'true' }, [fill]));
    var readout = ctx.el('p', { class: 'sel-readout', 'data-ft-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    var listEl = ctx.el('ul', { class: 'ft-steps', 'data-ft-steps': '' });
    wrap.appendChild(listEl);

    var addInputId = 'ft-add-' + String(item.id || '1').replace(/[^A-Za-z0-9_-]/g, '');
    var addInput = ctx.el('input', {
      id: addInputId,
      type: 'text',
      maxlength: '90',
      autocomplete: 'off',
      placeholder: 'Optional personal step (stays on this screen)',
      'data-ft-add-input': '',
      on: { keydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } } },
    });
    var addBtn = ctx.el('button', {
      type: 'button',
      'data-ft-add-btn': '',
      on: { click: function () {
        if (locked || steps.length >= 12) return;
        var txt = String(addInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 90);
        if (!txt) return;
        steps.push({ id: 'c' + (steps.length + 1), text: txt, done: false, custom: true });
        addInput.value = '';
        paint(true, steps.length - 1);
      } },
      text: 'Add step',
    });
    wrap.appendChild(ctx.el('div', { class: 'ft-add-row' }, [
      ctx.el('label', { class: 'sr', for: addInputId, text: 'Add a personal step' }),
      addInput,
      addBtn,
    ]));

    var doneBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-sel-done': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var doneCount = steps.filter(function (s) { return s.done; }).length;
        ctx.support('efChecklist');
        // Never export student-typed custom step text — only non-sensitive step counts.
        if (typeof ctx.checkNote === 'function') {
          ctx.checkNote('summary', { t: doneCount + ' of ' + steps.length + ' steps checked; tool: first_then' });
        }
        ctx.practice('traced', 'Nice work. ' + doneCount + ' of ' + steps.length + ' steps checked off. Ready for: ' + (item.thenLabel || 'your next break') + '.');
      } },
      text: 'Finish checklist',
    });
    var resetBtn = ctx.el('button', {
      type: 'button',
      'data-ft-reset': '',
      on: { click: function () {
        if (locked) return;
        steps.forEach(function (s) { s.done = false; });
        paint(true, 0);
      } },
      text: 'Uncheck all',
    });
    wrap.appendChild(ctx.el('div', { class: 'sel-actions' }, [doneBtn, resetBtn]));
    ctx.root.appendChild(wrap);

    var paint = function (say, focusIdx) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var btns = [];
      var doneCount = 0;
      steps.forEach(function (st, idx) {
        if (st.done) doneCount++;
        var btn = ctx.el('button', {
          type: 'button',
          class: 'ft-step-btn',
          'data-ft-step': st.id,
          'aria-pressed': st.done ? 'true' : 'false',
          on: { click: function () {
            if (locked) return;
            st.done = !st.done;
            paint(true, idx);
          } },
        }, [
          ctx.el('span', { class: 'ft-check', 'aria-hidden': 'true', text: st.done ? '\u2713' : '' }),
          ctx.el('span', { class: 'ft-step-txt', text: (idx + 1) + '. ' + st.text }),
        ]);
        btn.disabled = locked;
        btns.push(btn);
        listEl.appendChild(ctx.el('li', {}, [btn]));
      });
      if (typeof focusIdx === 'number' && btns[focusIdx] && !locked) {
        try { btns[focusIdx].focus(); } catch (_) {}
      }
      var pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
      fill.style.width = pct + '%';
      addInput.disabled = locked || steps.length >= 12;
      addBtn.disabled = locked || steps.length >= 12;
      resetBtn.disabled = locked || doneCount === 0;
      doneBtn.disabled = locked;
      var line = doneCount === steps.length
        ? ('All ' + steps.length + ' steps done. Time for: ' + (item.thenLabel || 'your next activity') + '.')
        : (doneCount + ' of ' + steps.length + ' steps done.');
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () { locked = true; paint(false); },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 2: Visual Focus & Break Timer (sel_focus_timer)
  // ---------------------------------------------------------------------------
  function renderFocusTimer(item, ctx) {
    var win = ctx.root.ownerDocument && ctx.root.ownerDocument.defaultView;
    var focusMin = Math.max(1, Math.min(30, Math.floor(Number(item.focusMinutes) || 5)));
    var breakMin = Math.max(1, Math.min(15, Math.floor(Number(item.breakMinutes) || 2)));
    var phase = 'focus'; // 'focus' | 'break'
    var totalSec = focusMin * 60;
    var leftSec = totalSec;
    var running = false;
    var completedBlocks = 0;
    var intervalId = null;
    var locked = false;

    var fmtClock = function (sec) {
      var s = Math.max(0, Math.floor(sec));
      var m = Math.floor(s / 60);
      var rem = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (rem < 10 ? '0' : '') + rem;
    };

    var stopClock = function () {
      running = false;
      if (intervalId != null && win && win.clearInterval) {
        win.clearInterval(intervalId);
      }
      intervalId = null;
    };

    var wrap = ctx.el('div', { class: 'sel-wrap', 'data-sel': 'focus_timer' });
    wrap.appendChild(ctx.el('p', { class: 'sel-prompt', text: item.prompt || 'Choose a comfortable focus block, work calmly, then take a short break.' }));

    var phaseEl = ctx.el('p', { class: 'tm-phase', 'data-tm-phase': '' });
    var clockEl = ctx.el('p', { class: 'tm-clock', 'data-tm-clock': '' });
    var fillEl = ctx.el('span', { class: 'tm-bar-fill' });
    var barWrap = ctx.el('div', { class: 'tm-bar', 'aria-hidden': 'true' }, [fillEl]);
    var readout = ctx.el('p', { class: 'sel-readout', 'data-tm-readout': '', 'aria-live': 'polite' });

    var presets = Array.isArray(item.presets) && item.presets.length ? item.presets : [1, 3, 5, 10, 15];
    var presetBtns = [];
    var presetRow = ctx.el('div', { class: 'tm-presets', role: 'group', 'aria-label': 'Focus minutes' });
    presets.forEach(function (mins) {
      var pb = ctx.el('button', {
        type: 'button',
        'data-tm-preset': String(mins),
        'aria-pressed': String(mins === focusMin),
        on: { click: function () {
          if (locked) return;
          stopClock();
          focusMin = mins;
          phase = 'focus';
          totalSec = focusMin * 60;
          leftSec = totalSec;
          paint(true, 'Focus timer set to ' + focusMin + ' minutes.');
        } },
        text: mins + ' min',
      });
      presetBtns.push({ btn: pb, mins: mins });
      presetRow.appendChild(pb);
    });

    var startPauseBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-tm-toggle': '',
      on: { click: function () {
        if (locked) return;
        if (running) {
          stopClock();
          paint(true, 'Timer paused at ' + fmtClock(leftSec) + '.');
          return;
        }
        if (leftSec <= 0) { leftSec = totalSec; }
        running = true;
        ctx.support('focusTimer');
        if (win && win.setInterval) {
          intervalId = win.setInterval(function () {
            if (!running) return;
            leftSec = Math.max(0, leftSec - 1);
            if (leftSec === 0) {
              stopClock();
              completedBlocks++;
              paint(true, phase === 'focus'
                ? 'Focus block finished. You can take a ' + breakMin + '-minute break now.'
                : 'Break finished. Ready when you are.');
              return;
            }
            paint(false);
          }, 1000);
        }
        paint(true, (phase === 'focus' ? 'Focus' : 'Break') + ' timer started for ' + fmtClock(leftSec) + '.');
      } },
      text: 'Start timer',
    });

    var switchBtn = ctx.el('button', {
      type: 'button',
      'data-tm-switch': '',
      on: { click: function () {
        if (locked) return;
        stopClock();
        phase = phase === 'focus' ? 'break' : 'focus';
        totalSec = (phase === 'focus' ? focusMin : breakMin) * 60;
        leftSec = totalSec;
        paint(true, phase === 'break' ? ('Switched to ' + breakMin + '-minute calm break.') : ('Switched to ' + focusMin + '-minute focus block.'));
      } },
      text: 'Switch to ' + breakMin + '-min break',
    });

    var resetBtn = ctx.el('button', {
      type: 'button',
      'data-tm-reset': '',
      on: { click: function () {
        if (locked) return;
        var doc = ctx.root.ownerDocument;
        var hadFocus = doc && doc.activeElement === resetBtn;
        stopClock();
        leftSec = totalSec;
        paint(true, 'Timer reset to ' + fmtClock(leftSec) + '.');
        if (hadFocus && !locked) { try { startPauseBtn.focus(); } catch (_) {} }
      } },
      text: 'Reset',
    });

    var doneBtn = ctx.el('button', {
      type: 'button',
      'data-sel-done': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        stopClock();
        ctx.support('focusTimer');
        if (typeof ctx.checkNote === 'function') {
          ctx.checkNote('summary', { t: 'Focus timer used (' + focusMin + 'm focus / ' + breakMin + 'm break; ' + completedBlocks + ' blocks finished)' });
        }
        ctx.practice('traced', 'Focus session logged. Great pacing.');
      } },
      text: 'Finish focus block',
    });

    wrap.appendChild(ctx.el('div', { class: 'tm-stage' }, [phaseEl, clockEl, barWrap, presetRow]));
    wrap.appendChild(readout);
    wrap.appendChild(ctx.el('div', { class: 'sel-actions' }, [startPauseBtn, switchBtn, resetBtn, doneBtn]));
    ctx.root.appendChild(wrap);

    var paint = function (say, note) {
      phaseEl.textContent = phase === 'focus' ? ('Focus block (' + focusMin + ' min)') : ('Calm break (' + breakMin + ' min)');
      clockEl.textContent = fmtClock(leftSec);
      var elapsedPct = totalSec > 0 ? Math.round(((totalSec - leftSec) / totalSec) * 100) : 0;
      fillEl.style.width = elapsedPct + '%';
      presetBtns.forEach(function (p) {
        p.btn.setAttribute('aria-pressed', String(phase === 'focus' && p.mins === focusMin));
        p.btn.disabled = locked || running;
      });
      startPauseBtn.textContent = running ? 'Pause timer' : (leftSec < totalSec && leftSec > 0 ? 'Resume timer' : 'Start timer');
      startPauseBtn.disabled = locked;
      switchBtn.textContent = phase === 'focus' ? ('Switch to ' + breakMin + '-min break') : ('Switch to ' + focusMin + '-min focus');
      switchBtn.disabled = locked;
      resetBtn.disabled = locked || (!running && leftSec === totalSec);
      doneBtn.disabled = locked;
      var statusText = note || (running ? ('Running: ' + fmtClock(leftSec) + ' remaining.') : ('Ready: ' + fmtClock(leftSec) + '.'));
      readout.textContent = statusText;
      if (say) ctx.announce(statusText);
    };
    paint(false);

    return {
      stop: stopClock,
      reveal: function () { stopClock(); locked = true; paint(false); },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 3: Calm-Down & Self-Regulation Strategy Cards (sel_calm_toolkit)
  // ---------------------------------------------------------------------------
  function renderCalmToolkit(item, ctx) {
    var win = ctx.root.ownerDocument && ctx.root.ownerDocument.defaultView;
    var locked = false;
    var chosenState = ''; // Private in-memory ONLY unless student opts in
    var activeCard = 'breath';
    var usedStrategies = Object.create(null);

    var STATES = [
      { id: 'ready', label: 'Ready to learn' },
      { id: 'low', label: 'Low energy' },
      { id: 'wiggled', label: 'Wiggled up' },
      { id: 'break', label: 'Need a break' },
    ];

    var wrap = ctx.el('div', { class: 'sel-wrap', 'data-sel': 'calm_toolkit' });
    wrap.appendChild(ctx.el('p', { class: 'sel-prompt', text: item.prompt || 'Check in with yourself privately, then try any reset card that feels helpful.' }));
    wrap.appendChild(ctx.el('p', { class: 'sel-privacy', 'data-sel-privacy': '', text: 'Private by default: your energy check-in stays only on this screen and is never added to a saved file unless you check the share box below.' }));

    // Private readiness check-in
    var stateBtns = [];
    var stateRow = ctx.el('div', { class: 'cm-states', role: 'group', 'aria-label': 'Private energy check-in' });
    STATES.forEach(function (st) {
      var b = ctx.el('button', {
        type: 'button',
        class: 'cm-state-btn',
        'data-cm-state': st.id,
        'aria-pressed': 'false',
        on: { click: function () {
          if (locked) return;
          chosenState = chosenState === st.id ? '' : st.id;
          paintState(true);
        } },
        text: st.label,
      });
      stateBtns.push({ btn: b, spec: st });
      stateRow.appendChild(b);
    });
    wrap.appendChild(stateRow);

    var readout = ctx.el('p', { class: 'sel-readout', 'data-cm-readout': '', 'aria-live': 'polite', text: 'Pick any strategy card below to practice a calm reset.' });
    wrap.appendChild(readout);

    // Strategy Card Switcher
    var CARDS = [
      { id: 'breath', label: 'Paced breathing' },
      { id: 'ground', label: '5-4-3-2-1 grounding' },
      { id: 'stretch', label: 'Quiet stretch' },
      { id: 'break_card', label: 'Ask for a break card' },
    ];
    var tabBtns = [];
    var tabRow = ctx.el('div', { class: 'cm-tabs', role: 'group', 'aria-label': 'Self-regulation strategy cards' });
    CARDS.forEach(function (c) {
      var tb = ctx.el('button', {
        type: 'button',
        'data-cm-tab': c.id,
        'aria-pressed': String(c.id === activeCard),
        on: { click: function () {
          if (locked) return;
          if (c.id !== activeCard) stopBreath();
          activeCard = c.id;
          paintCards();
        } },
        text: c.label,
      });
      tabBtns.push({ btn: tb, id: c.id });
      tabRow.appendChild(tb);
    });
    wrap.appendChild(tabRow);

    // Card 1: Paced breathing
    var BREATH_STEPS = [
      { cue: 'Breathe in slowly (4)', pct: 100 },
      { cue: 'Hold gently (2)', pct: 100 },
      { cue: 'Breathe out slowly (4)', pct: 25 },
      { cue: 'Rest quietly (2)', pct: 25 },
    ];
    var breathIdx = 0, breathRounds = 0, breathTimer = null, breathAutoBtn = null;
    var stopBreath = function () {
      if (breathTimer != null && win && win.clearInterval) win.clearInterval(breathTimer);
      breathTimer = null;
      if (breathAutoBtn) breathAutoBtn.textContent = 'Auto pace';
    };
    var breathCue = ctx.el('p', { class: 'cm-breath-cue', 'data-cm-breath-cue': '', text: BREATH_STEPS[0].cue });
    var breathFill = ctx.el('span', { class: 'cm-breath-fill' });
    breathFill.style.width = '25%';
    var breathCountEl = ctx.el('p', { class: 'sel-sub', 'data-cm-breath-rounds': '', text: 'Completed rounds: 0' });
    var stepBreath = function (say) {
      usedStrategies.breathing = true;
      ctx.support('calmBreath');
      breathIdx = (breathIdx + 1) % BREATH_STEPS.length;
      if (breathIdx === 0) breathRounds++;
      breathCue.textContent = BREATH_STEPS[breathIdx].cue;
      breathFill.style.width = BREATH_STEPS[breathIdx].pct + '%';
      breathCountEl.textContent = 'Completed rounds: ' + breathRounds;
      if (say) ctx.announce(BREATH_STEPS[breathIdx].cue);
    };
    var breathNextBtn = ctx.el('button', { type: 'button', class: 'primary', 'data-cm-breath-step': '', on: { click: function () { if (!locked) stepBreath(true); } }, text: 'Next breath step' });
    breathAutoBtn = ctx.el('button', {
      type: 'button',
      'data-cm-breath-auto': '',
      on: { click: function () {
        if (locked) return;
        if (breathTimer != null) { stopBreath(); return; }
        stepBreath(true);
        breathAutoBtn.textContent = 'Pause pace';
        if (win && win.setInterval) breathTimer = win.setInterval(function () { stepBreath(false); }, 3000);
      } },
      text: 'Auto pace',
    });
    var breathPanel = ctx.el('div', { class: 'cm-panel', 'data-cm-panel': 'breath' }, [
      ctx.el('div', { class: 'cm-breath-box' }, [
        breathCue,
        ctx.el('div', { class: 'cm-breath-meter', 'aria-hidden': 'true' }, [breathFill]),
        breathCountEl,
      ]),
      ctx.el('div', { class: 'sel-actions' }, [breathNextBtn, breathAutoBtn]),
    ]);

    // Card 2: 5-4-3-2-1 Grounding checklist
    var GROUND_ITEMS = [
      '5 things I can see around me right now',
      '4 things I can feel (chair, feet on floor, desk)',
      '3 quiet sounds I can hear',
      '2 things I can smell or notice in the air',
      '1 slow, steady breath',
    ];
    var groundDone = GROUND_ITEMS.map(function () { return false; });
    var groundList = ctx.el('ul', { class: 'ft-steps', 'data-cm-ground': '' });
    var paintGround = function (focusIdx) {
      while (groundList.firstChild) groundList.removeChild(groundList.firstChild);
      var gBtns = [];
      GROUND_ITEMS.forEach(function (txt, idx) {
        var b = ctx.el('button', {
          type: 'button',
          class: 'ft-step-btn',
          'data-cm-ground-item': String(idx),
          'aria-pressed': groundDone[idx] ? 'true' : 'false',
          on: { click: function () {
            if (locked) return;
            groundDone[idx] = !groundDone[idx];
            if (groundDone[idx]) { usedStrategies.grounding = true; ctx.support('calmGround'); }
            paintGround(idx);
            var c = groundDone.filter(Boolean).length;
            ctx.announce(c + ' of 5 grounding steps checked.');
          } },
        }, [
          ctx.el('span', { class: 'ft-check', 'aria-hidden': 'true', text: groundDone[idx] ? '\u2713' : '' }),
          ctx.el('span', { class: 'ft-step-txt', text: txt }),
        ]);
        b.disabled = locked;
        gBtns.push(b);
        groundList.appendChild(ctx.el('li', {}, [b]));
      });
      if (typeof focusIdx === 'number' && gBtns[focusIdx] && !locked) {
        try { gBtns[focusIdx].focus(); } catch (_) {}
      }
    };
    var groundPanel = ctx.el('div', { class: 'cm-panel', 'data-cm-panel': 'ground', hidden: true }, [
      ctx.el('p', { class: 'sel-sub', text: 'Check off each grounding step at your own pace. Nothing you notice is stored.' }),
      groundList,
    ]);

    // Card 3: Quiet stretch
    var STRETCHES = [
      'Roll shoulders slowly back 3 times, then let them drop.',
      'Open and relax both hands slowly.',
      'Sit tall, plant both feet on the floor, and exhale slowly.',
    ];
    var stretchDone = STRETCHES.map(function () { return false; });
    var stretchList = ctx.el('ul', { class: 'ft-steps', 'data-cm-stretch': '' });
    var paintStretch = function (focusIdx) {
      while (stretchList.firstChild) stretchList.removeChild(stretchList.firstChild);
      var sBtns = [];
      STRETCHES.forEach(function (txt, idx) {
        var b = ctx.el('button', {
          type: 'button',
          class: 'ft-step-btn',
          'data-cm-stretch-item': String(idx),
          'aria-pressed': stretchDone[idx] ? 'true' : 'false',
          on: { click: function () {
            if (locked) return;
            stretchDone[idx] = !stretchDone[idx];
            if (stretchDone[idx]) { usedStrategies.stretch = true; ctx.support('calmStretch'); }
            paintStretch(idx);
            var c = stretchDone.filter(Boolean).length;
            ctx.announce(c + ' of ' + STRETCHES.length + ' stretch steps checked.');
          } },
        }, [
          ctx.el('span', { class: 'ft-check', 'aria-hidden': 'true', text: stretchDone[idx] ? '\u2713' : '' }),
          ctx.el('span', { class: 'ft-step-txt', text: txt }),
        ]);
        b.disabled = locked;
        sBtns.push(b);
        stretchList.appendChild(ctx.el('li', {}, [b]));
      });
      if (typeof focusIdx === 'number' && sBtns[focusIdx] && !locked) {
        try { sBtns[focusIdx].focus(); } catch (_) {}
      }
    };
    var stretchPanel = ctx.el('div', { class: 'cm-panel', 'data-cm-panel': 'stretch', hidden: true }, [
      ctx.el('p', { class: 'sel-sub', text: 'Gentle seated movements you can do quietly at your desk.' }),
      stretchList,
    ]);

    // Card 4: Ask for a break visual desk card
    var breakMins = Math.max(1, Math.min(10, Math.floor(Number(item.breakMinutes) || 3)));
    var breakUsedBtn = ctx.el('button', {
      type: 'button',
      'data-cm-break-use': '',
      on: { click: function () {
        if (locked) return;
        usedStrategies.break_card = true;
        ctx.support('calmBreak');
        readout.textContent = 'Break card shown on screen. Take ' + breakMins + ' quiet minutes, then return ready.';
        ctx.announce(readout.textContent);
      } },
      text: 'Log that I used my break card',
    });
    var breakPanel = ctx.el('div', { class: 'cm-panel', 'data-cm-panel': 'break_card', hidden: true }, [
      ctx.el('div', { class: 'cm-break-card' }, [
        ctx.el('p', { class: 'cm-break-title', text: item.breakCardTitle || 'May I take a short reset break?' }),
        ctx.el('p', { class: 'sel-sub', text: item.breakCardText || ('I need ' + breakMins + ' quiet minutes to reset, then I will come right back to my work.') }),
      ]),
      ctx.el('div', { class: 'sel-actions' }, [breakUsedBtn]),
    ]);

    wrap.appendChild(breathPanel);
    wrap.appendChild(groundPanel);
    wrap.appendChild(stretchPanel);
    wrap.appendChild(breakPanel);

    // Explicit opt-in consent box (default OFF)
    var consentId = 'cm-share-' + String(item.id || '1').replace(/[^A-Za-z0-9_-]/g, '');
    var consentBox = ctx.el('input', { id: consentId, type: 'checkbox', 'data-sel-share-consent': '' });
    consentBox.checked = false;
    wrap.appendChild(ctx.el('label', { class: 'sel-consent', for: consentId }, [
      consentBox,
      ctx.el('span', { text: 'Share my energy check-in if I save a summary for my teacher (off by default — only strategy counts are saved when unchecked).' }),
    ]));

    var syncNote = function () {
      if (typeof ctx.checkNote !== 'function') return;
      if (consentBox.checked && chosenState) {
        var stObj = STATES.find(function (s) { return s.id === chosenState; });
        ctx.checkNote('shared_note', { t: 'Energy check-in: ' + (stObj ? stObj.label : chosenState) });
      } else {
        ctx.checkNote('shared_note', null);
      }
    };
    consentBox.addEventListener('change', syncNote);

    var doneBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-sel-done': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        stopBreath();
        var keys = Object.keys(usedStrategies);
        if (typeof ctx.checkNote === 'function') {
          ctx.checkNote('summary', { t: keys.length ? ('Strategies practiced: ' + keys.join(', ')) : 'Calm toolkit viewed' });
          syncNote();
        }
        ctx.practice('traced', 'Reset complete. Take a calm breath when you move on.');
      } },
      text: 'Done with reset',
    });
    wrap.appendChild(ctx.el('div', { class: 'sel-actions' }, [doneBtn]));
    ctx.root.appendChild(wrap);

    var paintState = function (say) {
      var lbl = '';
      stateBtns.forEach(function (s) {
        var on = s.spec.id === chosenState;
        if (on) lbl = s.spec.label;
        s.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        s.btn.disabled = locked;
      });
      syncNote();
      if (lbl) {
        readout.textContent = 'Private check-in: ' + lbl + ' (stays on this screen).';
        if (say) ctx.announce(readout.textContent);
      }
    };
    var paintCards = function () {
      tabBtns.forEach(function (t) {
        t.btn.setAttribute('aria-pressed', String(t.id === activeCard));
        t.btn.disabled = locked;
      });
      breathPanel.hidden = activeCard !== 'breath';
      groundPanel.hidden = activeCard !== 'ground';
      stretchPanel.hidden = activeCard !== 'stretch';
      breakPanel.hidden = activeCard !== 'break_card';
      breathNextBtn.disabled = locked;
      breathAutoBtn.disabled = locked;
      breakUsedBtn.disabled = locked;
      consentBox.disabled = locked;
      doneBtn.disabled = locked;
      paintGround();
      paintStretch();
    };
    paintState(false);
    paintCards();

    return {
      stop: stopBreath,
      reveal: function () { stopBreath(); locked = true; paintState(false); paintCards(); },
    };
  }

  // ---------------------------------------------------------------------------
  // Adapter 4: Metacognitive UDL Reflection & Goal Check (sel_udl_reflect)
  // ---------------------------------------------------------------------------
  function renderUdlReflect(item, ctx) {
    var locked = false;
    var SUPPORTS = (Array.isArray(item.supportOptions) && item.supportOptions.length ? item.supportOptions : [
      { id: 'udlReadAloud', label: 'Reading aloud' },
      { id: 'udlLargePrint', label: 'Larger print' },
      { id: 'udlLineFocus', label: 'Line focus' },
      { id: 'udlChecklist', label: 'Step checklist' },
      { id: 'udlTimer', label: 'Quiet timer' },
      { id: 'udlExamples', label: 'Worked examples' },
      { id: 'udlCheckIn', label: 'Partner or teacher check-in' },
    ]).map(function (s, i) {
      return typeof s === 'string' ? { id: 'udlSupport_' + (i + 1), label: s } : s;
    });
    var chosenSupports = [];

    var wrap = ctx.el('div', { class: 'sel-wrap', 'data-sel': 'udl_reflect' });
    wrap.appendChild(ctx.el('p', { class: 'sel-prompt', text: item.prompt || 'Reflect on your goal and which learning supports helped you most today.' }));
    wrap.appendChild(ctx.el('p', { class: 'sel-privacy', 'data-sel-privacy': '', text: 'Private by default: your reflection text stays only on this screen unless you check the opt-in box below before saving.' }));

    var uid = String(item.id || '1').replace(/[^A-Za-z0-9_-]/g, '');
    var goalInput = ctx.el('textarea', {
      id: 'ur-goal-' + uid,
      rows: '2',
      maxlength: '120',
      'data-ur-goal': '',
      placeholder: 'Optional private note about what you worked on',
    });
    wrap.appendChild(ctx.el('div', { class: 'ur-field' }, [
      ctx.el('label', { for: 'ur-goal-' + uid, text: item.goalQuestion || 'What goal did I work on?' }),
      goalInput,
    ]));

    var chipsWrap = ctx.el('div', { class: 'ur-chips', role: 'group', 'aria-label': 'Learning supports that helped today' });
    var chipBtns = [];
    SUPPORTS.forEach(function (sp) {
      var cb = ctx.el('button', {
        type: 'button',
        class: 'ur-chip',
        'data-ur-support': sp.id,
        'aria-pressed': 'false',
        on: { click: function () {
          if (locked) return;
          var pos = chosenSupports.indexOf(sp.id);
          if (pos >= 0) chosenSupports.splice(pos, 1); else chosenSupports.push(sp.id);
          paint(true);
        } },
        text: sp.label,
      });
      chipBtns.push({ btn: cb, spec: sp });
      chipsWrap.appendChild(cb);
    });
    wrap.appendChild(ctx.el('div', { class: 'ur-field' }, [
      ctx.el('p', { class: 'sel-sub', text: item.supportsQuestion || 'Which learning support helped me most today?' }),
      chipsWrap,
    ]));

    var nextInput = ctx.el('textarea', {
      id: 'ur-next-' + uid,
      rows: '2',
      maxlength: '120',
      'data-ur-next': '',
      placeholder: 'Optional private note for your next step',
    });
    wrap.appendChild(ctx.el('div', { class: 'ur-field' }, [
      ctx.el('label', { for: 'ur-next-' + uid, text: item.nextQuestion || 'My next step' }),
      nextInput,
    ]));

    var readout = ctx.el('p', { class: 'sel-readout', 'data-ur-readout': '', 'aria-live': 'polite' });
    wrap.appendChild(readout);

    // Explicit opt-in consent box (defaulted OFF)
    var consentId = 'ur-share-' + uid;
    var consentBox = ctx.el('input', { id: consentId, type: 'checkbox', 'data-sel-share-consent': '' });
    consentBox.checked = false;
    wrap.appendChild(ctx.el('label', { class: 'sel-consent', for: consentId }, [
      consentBox,
      ctx.el('span', { text: 'Share my reflection note if I save a summary for my teacher' }),
    ]));

    var buildSharedText = function () {
      var g = String(goalInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      var n = String(nextInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      var parts = [];
      if (g) parts.push('Goal: ' + g);
      if (n) parts.push('Next: ' + n);
      return parts.join(' | ').slice(0, 220);
    };

    var syncConsent = function () {
      if (typeof ctx.checkNote !== 'function') return;
      var shared = consentBox.checked ? buildSharedText() : '';
      ctx.checkNote('shared_note', shared ? { t: shared } : null);
    };
    consentBox.addEventListener('change', syncConsent);
    goalInput.addEventListener('input', syncConsent);
    nextInput.addEventListener('input', syncConsent);

    var doneBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-sel-done': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        var labels = [];
        chosenSupports.forEach(function (id) {
          var key = String(id).replace(/[^A-Za-z_]/g, '').slice(0, 24);
          if (key) ctx.support(key);
          var found = SUPPORTS.find(function (s) { return s.id === id; });
          if (found) labels.push(found.label);
        });
        if (typeof ctx.checkNote === 'function') {
          ctx.checkNote('summary', { t: labels.length ? ('Supports chosen: ' + labels.join(', ')) : 'Reflection completed (private)' });
          syncConsent();
        }
        ctx.practice('traced', consentBox.checked
          ? 'Reflection saved. Your shared note will appear if you save a summary.'
          : 'Reflection complete. Your private notes stay only on this screen.');
      } },
      text: 'Complete reflection',
    });
    wrap.appendChild(ctx.el('div', { class: 'sel-actions' }, [doneBtn]));
    ctx.root.appendChild(wrap);

    var paint = function (say) {
      var names = [];
      chipBtns.forEach(function (c) {
        var on = chosenSupports.indexOf(c.spec.id) >= 0;
        if (on) names.push(c.spec.label);
        c.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        c.btn.disabled = locked;
      });
      goalInput.disabled = locked;
      nextInput.disabled = locked;
      consentBox.disabled = locked;
      doneBtn.disabled = locked;
      var line = names.length ? ('Supports chosen: ' + names.join(', ')) : 'Select any supports that helped today.';
      readout.textContent = line;
      if (say) ctx.announce(line);
    };
    paint(false);

    return {
      reveal: function () { locked = true; paint(false); },
    };
  }

  // ---------------------------------------------------------------------------
  // Self-contained Read Aloud wrapper (ZERO outer closures for serialization!)
  // ---------------------------------------------------------------------------
  function selReadAloudWrapper(origRender, activityId) {
    return function (item, ctx) {
      var handle = origRender(item, ctx) || {};
      var root = ctx && ctx.root;
      if (!root) return handle;
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
        var promptEl = root.querySelector('.sel-prompt');
        add((promptEl && promptEl.textContent) || (item && item.prompt) || '');
        if (activityId === 'sel_first_then') {
          add('First: ' + ((item && item.firstLabel) || 'Finish my task steps'));
          add('Then: ' + ((item && item.thenLabel) || 'Take a short break or choice time'));
        } else if (activityId === 'sel_focus_timer') {
          var phaseEl = root.querySelector('[data-tm-phase]');
          if (phaseEl && phaseEl.textContent) add(phaseEl.textContent);
        } else if (activityId === 'sel_calm_toolkit') {
          var panels = root.querySelectorAll('[data-cm-panel]');
          for (var i = 0; i < panels.length; i++) {
            var p = panels[i];
            if (p.hidden) continue;
            var pid = p.getAttribute('data-cm-panel');
            if (pid === 'breath') {
              var cue = p.querySelector('[data-cm-breath-cue]');
              if (cue) add(cue.textContent);
            } else if (pid === 'ground') {
              add('5-4-3-2-1 grounding');
              var gs = p.querySelector('.sel-sub');
              if (gs) add(gs.textContent);
            } else if (pid === 'stretch') {
              add('Quiet stretch');
              var ss = p.querySelector('.sel-sub');
              if (ss) add(ss.textContent);
            } else if (pid === 'break_card') {
              var bt = p.querySelector('.cm-break-title');
              var bs = p.querySelector('.sel-sub');
              if (bt) add(bt.textContent);
              if (bs) add(bs.textContent);
            }
          }
        } else if (activityId === 'sel_udl_reflect') {
          add((item && item.goalQuestion) || 'What goal did I work on?');
          add((item && item.supportsQuestion) || 'Which learning support helped me most today?');
          add((item && item.nextQuestion) || 'My next step');
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

      var row = ctx.el('div', { class: 'sel-read-row' }, [readBtn]);
      var wrap = root.querySelector('.sel-wrap') || root;
      var anchor = wrap.querySelector('.sel-prompt');
      if (anchor && anchor.parentNode === wrap) {
        wrap.insertBefore(row, anchor.nextSibling);
      } else {
        wrap.insertBefore(row, wrap.firstChild);
      }

      var origReveal = handle && typeof handle.reveal === 'function' ? handle.reveal : null;
      var origStop = handle && typeof handle.stop === 'function' ? handle.stop : null;
      return Object.assign({}, handle, {
        stop: function () {
          stopSpeech();
          if (origStop) return origStop.apply(handle, arguments);
        },
        reveal: function () {
          stopSpeech();
          if (origReveal) return origReveal.apply(handle, arguments);
        },
      });
    };
  }

  function wrapSelRender(origRender, activityId) {
    var wrapped = function (item, ctx) {
      return selReadAloudWrapper(origRender, activityId)(item, ctx);
    };
    var src = '(' + selReadAloudWrapper.toString() + ')(' + origRender.toString() + ',' + JSON.stringify(activityId) + ')';
    wrapped.toString = function () { return src; };
    return wrapped;
  }

  var ADAPTERS = {
    sel_first_then: {
      id: 'sel_first_then',
      title: 'First-Then & Task Checklist',
      labels: { sel_first_then_title: 'First-Then & Task Checklist' },
      render: wrapSelRender(renderFirstThen, 'sel_first_then'),
    },
    sel_focus_timer: {
      id: 'sel_focus_timer',
      title: 'Visual Focus & Break Timer',
      labels: { sel_focus_timer_title: 'Visual Focus & Break Timer' },
      render: wrapSelRender(renderFocusTimer, 'sel_focus_timer'),
    },
    sel_calm_toolkit: {
      id: 'sel_calm_toolkit',
      title: 'Calm-Down Strategy Cards',
      labels: { sel_calm_toolkit_title: 'Calm-Down Strategy Cards' },
      render: wrapSelRender(renderCalmToolkit, 'sel_calm_toolkit'),
    },
    sel_udl_reflect: {
      id: 'sel_udl_reflect',
      title: 'UDL Reflection & Goal Check',
      labels: { sel_udl_reflect_title: 'UDL Reflection & Goal Check' },
      render: wrapSelRender(renderUdlReflect, 'sel_udl_reflect'),
    },
  };

  // Standard non-scored questions slot so opt-in shared_note and non-sensitive summary flow through checkNotes() cleanly.
  var PRIVACY_QUESTIONS = [
    { id: 'summary', kind: 'text', prompt: 'Toolkit summary' },
    { id: 'shared_note', kind: 'text', prompt: 'Opt-in shared reflection note' },
  ];

  // ---------------------------------------------------------------------------
  // 5 Curated Starter Toolkits (4 individual + Combined Daily EF & UDL Toolkit)
  // ---------------------------------------------------------------------------
  var STARTER_SETS = [
    {
      id: 'sel_first_then_routine',
      activity: 'sel_first_then',
      gradeBand: 'Grades K-12',
      name: 'First-Then & Independent Work Checklist',
      title: 'First-Then & Task Checklist',
      summary: 'Visual First-Then board paired with checkable work steps and a printable desk schedule.',
      items: [{
        id: 'ft-1',
        word: 'First-Then Work Plan',
        prompt: 'Follow your First-Then board and check off each step as you finish it.',
        firstLabel: 'Finish my independent work steps',
        thenLabel: 'Take a 3-minute stretch or choice break',
        steps: [
          'Open my materials and read the directions',
          'Start with the first question or section',
          'Use a reading tool or example if I get stuck',
          'Review my work and save or turn it in',
        ],
        questions: clone(PRIVACY_QUESTIONS),
      }],
    },
    {
      id: 'sel_focus_break_blocks',
      activity: 'sel_focus_timer',
      gradeBand: 'Grades 2-12',
      name: 'Visual Focus & Calm Break Timer',
      title: 'Visual Focus & Break Timer',
      summary: 'Student-paced focus blocks (1 to 15 minutes) with a smooth visual bar and quiet break transitions.',
      items: [{
        id: 'tm-1',
        word: 'Focus & Break Block',
        prompt: 'Pick a focus block length that feels doable, then switch to a short calm break.',
        focusMinutes: 5,
        breakMinutes: 2,
        presets: [1, 3, 5, 10, 15],
        questions: clone(PRIVACY_QUESTIONS),
      }],
    },
    {
      id: 'sel_calm_reset_cards',
      activity: 'sel_calm_toolkit',
      gradeBand: 'Grades K-12',
      name: 'Calm-Down & Self-Regulation Cards',
      title: 'Calm-Down Strategy Cards',
      summary: 'Private readiness check-in plus paced breathing, 5-4-3-2-1 grounding, desk stretches, and a silent break card.',
      items: [{
        id: 'cm-1',
        word: 'Calm Reset Toolkit',
        prompt: 'Check in privately with your energy level, then try any strategy card that helps you reset.',
        breakMinutes: 3,
        breakCardTitle: 'May I take a short reset break?',
        breakCardText: 'I need 3 quiet minutes to reset, then I will return to my task.',
        questions: clone(PRIVACY_QUESTIONS),
      }],
    },
    {
      id: 'sel_udl_goal_check',
      activity: 'sel_udl_reflect',
      gradeBand: 'Grades 3-12',
      name: 'UDL Learning Supports & Goal Check',
      title: 'UDL Reflection & Goal Check',
      summary: 'Private goal reflection paired with toggleable UDL support chips and an explicit opt-in share box.',
      items: [{
        id: 'ur-1',
        word: 'UDL Goal Reflection',
        prompt: 'Take a moment to reflect on your goal and notice which learning supports helped you today.',
        goalQuestion: 'What goal did I work on?',
        supportsQuestion: 'Which learning support helped me most today?',
        nextQuestion: 'My next step',
        supportOptions: [
          { id: 'udlReadAloud', label: 'Reading aloud' },
          { id: 'udlLargePrint', label: 'Larger print' },
          { id: 'udlLineFocus', label: 'Line focus' },
          { id: 'udlChecklist', label: 'Step checklist' },
          { id: 'udlTimer', label: 'Quiet timer' },
          { id: 'udlExamples', label: 'Worked examples' },
          { id: 'udlCheckIn', label: 'Partner or teacher check-in' },
        ],
        questions: clone(PRIVACY_QUESTIONS),
      }],
    },
    {
      id: 'sel_daily_toolkit_mix',
      activity: 'mixed',
      gradeBand: 'Grades 2-12',
      name: 'Daily Executive Function & UDL Toolkit (All 4)',
      title: 'Daily Focus & UDL Student Toolkit',
      summary: 'All four private student tools in one offline file: First-Then Checklist, Focus Timer, Calm Cards, and UDL Reflection.',
    },
  ];

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

  function lessonFromSel(options) {
    var cfg = options && typeof options === 'object' ? options : {};
    var starter = cfg.starterId ? findStarter(cfg.starterId) : null;
    var isMixed = cfg.activity === 'mixed' || (starter && starter.activity === 'mixed') || (Array.isArray(cfg.blocks) && cfg.blocks.length > 1);
    var blocks = [];
    var activity = 'sel_first_then';

    if (isMixed) {
      blocks = Array.isArray(cfg.blocks) && cfg.blocks.length ? clone(cfg.blocks) : mixedDefaultBlocks();
      activity = 'mixed';
      starter = findStarter('sel_daily_toolkit_mix');
    } else {
      activity = ACTIVITIES.indexOf(cfg.activity) >= 0 ? cfg.activity : (starter && ACTIVITIES.indexOf(starter.activity) >= 0 ? starter.activity : 'sel_first_then');
      if (!starter || starter.activity !== activity) starter = defaultStarterFor(activity);
      var items = Array.isArray(cfg.items) && cfg.items.length ? clone(cfg.items) : clone(starter.items);
      blocks = [{ activity: activity, items: items.slice(0, 8) }];
    }

    blocks = blocks.map(function (b) {
      if (ACTIVITIES.indexOf(b.activity) < 0) throw new Error('Unknown toolkit activity: ' + b.activity);
      var cleanItems = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(function (it, idx) {
        var copy = clone(it);
        copy.id = str(copy.id, 40) || (b.activity + '-' + (idx + 1));
        if (!Array.isArray(copy.questions) || !copy.questions.length) copy.questions = clone(PRIVACY_QUESTIONS);
        return copy;
      });
      return { activity: b.activity, items: cleanItems };
    }).filter(function (b) { return b.items.length > 0; });
    if (!blocks.length) throw new Error('Select at least one toolkit activity.');

    var title = str(cfg.title || (starter && starter.title) || 'Student Focus & UDL Toolkit', 80);
    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); })
      : [];
    var bilingualGlossary = normalizeGlossary(cfg.bilingualGlossary);
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;

    var basis = JSON.stringify({
      v: VERSION,
      activity: activity,
      title: title,
      blocks: blocks,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
    });
    var rev = 's' + fnv1a(basis);
    var lessonId = slug(title, 34) + '-' + (isMixed ? 'toolkit' : activity.replace(/^sel_/, '').replace(/_/g, '-')) + '-' + rev.slice(0, 5);

    var activityTitles = {};
    blocks.forEach(function (b) { activityTitles[b.activity] = ADAPTERS[b.activity].title; });

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: 'practice',
      blocks: blocks,
      activityTitles: activityTitles,
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
    };
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;
    return lesson;
  }

  function resolveLoader(given) {
    if (given && typeof given.buildHtml === 'function') return given;
    if (root && root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') return root.AlloWordSoundsTakeHome;
    throw new Error('buildSelPacket needs AlloWordSoundsTakeHome loader');
  }

  function buildSelPacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromSel(opts);
    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);

    var buildOpts = {
      extraAdapters: ADAPTERS,
      extraCss: EXTRA_CSS,
      labels: Object.assign({
        intro: 'This offline toolkit is here to help you plan, pace, and reset. Nothing here is graded, and personal notes stay private on this screen unless you choose to share them.',
      }, opts.labels || {}),
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
    };

    var baseHtml = withSpeechManifest(loader.buildHtml(lesson, buildOpts));
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var activity = lesson.blocks.length > 1 ? 'mixed' : (lesson.blocks[0] ? lesson.blocks[0].activity : 'sel_first_then');
    var plain = fileName(lesson.title, '');
    var name = fileName(lesson.title, cleanLearner);
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
      mode: 'practice',
      itemCount: itemCount,
      revision: lesson.revision,
    };
  }

  function readSelPacket(input, verifyCore) {
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
      return fail('results', 'This is a results file, not a toolkit packet. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
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
    var homeLanguages = [];
    if (lesson.bilingual && Array.isArray(lesson.bilingual.codes)) {
      homeLanguages = lesson.bilingual.codes.map(function (c) { return String(c || '').toLowerCase(); }).filter(Boolean);
    } else if (Array.isArray(lesson.homeLanguages)) {
      homeLanguages = lesson.homeLanguages.slice();
    }
    return {
      ok: true,
      kind: 'sel',
      title: str(lesson.title || manifest.title, 80),
      activity: activity,
      blocks: clone(blocks),
      items: blocks.length === 1 ? clone(blocks[0].items) : [],
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      notes: [],
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
    lessonFromSel: lessonFromSel,
    buildSelPacket: buildSelPacket,
    readSelPacket: readSelPacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketSel = api;
})(typeof window !== 'undefined' ? window : globalThis);
