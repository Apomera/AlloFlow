// ═══════════════════════════════════════════════════════════════
// sel_tool_execfunction.js — Executive Function Workshop (v1.0)
// Concrete, skills-based EF instruction for middle-school students,
// especially those with ADHD, anxiety-driven planning paralysis,
// working-memory weakness, or perfectionism. Maps to the Russell
// Barkley + Peg Dawson EF framework. Six tabs: Map (assessment),
// Start (task initiation), Hold (working memory), Plan (backward
// planning), Time (time awareness + Pomodoro), Coach (AI).
// Registered tool ID: "execfunction"
// Category: self-management
// Grade-adaptive: uses ctx.gradeBand for vocabulary & depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // Reduced-motion CSS (WCAG 2.3.3) — guards Pomodoro animations and transitions.
  (function() {
    if (document.getElementById('allo-execfunction-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-execfunction-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .selh-execfunction *, .selh-execfunction *::before, .selh-execfunction *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-live-execfunction')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-execfunction';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // WCAG 2.2: accessible form dialog for adding habits and planner blocks.
  var execFunctionFormSequence = 0;
  function askExecFunctionForm(options) {
    return new Promise(function(resolve) {
      if (typeof document === 'undefined' || !document.body) { resolve(null); return; }
      options = options || {};
      var fields = Array.isArray(options.fields) ? options.fields : [];
      if (!fields.length) { resolve(null); return; }
      execFunctionFormSequence += 1;
      var idBase = 'exec-function-form-' + execFunctionFormSequence;
      var opener = document.activeElement;
      var blocked = Array.prototype.slice.call(document.body.children).map(function(el) {
        return { el: el, hadInert: el.hasAttribute('inert'), ariaHidden: el.getAttribute('aria-hidden') };
      });
      var overlay = document.createElement('div');
      overlay.setAttribute('role', 'presentation');
      overlay.setAttribute('data-exec-function-form', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10004;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
      var dialog = document.createElement('form');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', idBase + '-title');
      dialog.setAttribute('aria-describedby', idBase + '-description');
      dialog.style.cssText = 'box-sizing:border-box;width:min(32rem,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;color:#0f172a;border:2px solid #0891b2;border-radius:14px;padding:22px;box-shadow:0 24px 64px rgba(0,0,0,.45);font-family:system-ui,sans-serif;';
      var title = document.createElement('h2');
      title.id = idBase + '-title'; title.textContent = String(options.title || 'Add an item');
      title.style.cssText = 'margin:0 0 8px;font-size:1.25rem;line-height:1.3;color:#155e75;';
      var description = document.createElement('p');
      description.id = idBase + '-description'; description.textContent = String(options.description || 'Complete the fields below.');
      description.style.cssText = 'margin:0 0 16px;color:#334155;line-height:1.55;';
      dialog.appendChild(title); dialog.appendChild(description);
      var inputs = [];
      fields.forEach(function(field, index) {
        var fieldId = idBase + '-field-' + index;
        var group = document.createElement('div'); group.style.cssText = 'margin-top:14px;';
        var label = document.createElement('label');
        label.setAttribute('for', fieldId); label.textContent = String(field.label || 'Value');
        label.style.cssText = 'display:block;margin-bottom:6px;font-weight:700;color:#0f172a;';
        var input = document.createElement('input');
        input.id = fieldId; input.name = String(field.name || ('field' + index));
        input.type = String(field.type || 'text'); input.value = String(field.value == null ? '' : field.value);
        input.required = field.required !== false;
        if (input.required) input.setAttribute('aria-required', 'true');
        if (field.placeholder) input.placeholder = String(field.placeholder);
        if (field.maxLength) input.maxLength = Number(field.maxLength);
        if (field.min != null) input.min = String(field.min);
        if (field.max != null) input.max = String(field.max);
        if (field.step != null) input.step = String(field.step);
        if (field.inputMode) input.inputMode = String(field.inputMode);
        input.style.cssText = 'box-sizing:border-box;width:100%;min-height:44px;padding:9px 11px;border:2px solid #475569;border-radius:8px;background:#fff;color:#0f172a;font:inherit;';
        group.appendChild(label); group.appendChild(input); dialog.appendChild(group); inputs.push(input);
      });
      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:20px;';
      var cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'Cancel';
      cancel.style.cssText = 'min-width:44px;min-height:44px;padding:9px 16px;border:2px solid #475569;border-radius:8px;background:#fff;color:#0f172a;font-weight:700;cursor:pointer;';
      var submit = document.createElement('button');
      submit.type = 'submit'; submit.textContent = String(options.submitText || 'Add');
      submit.style.cssText = 'min-width:44px;min-height:44px;padding:9px 16px;border:2px solid #0e7490;border-radius:8px;background:#0e7490;color:#fff;font-weight:700;cursor:pointer;';
      actions.appendChild(cancel); actions.appendChild(submit); dialog.appendChild(actions);
      overlay.appendChild(dialog); document.body.appendChild(overlay);
      blocked.forEach(function(entry) { entry.el.setAttribute('inert', ''); entry.el.setAttribute('aria-hidden', 'true'); });
      var settled = false;
      function finish(values) {
        if (settled) return;
        settled = true;
        window.removeEventListener('keydown', onKeyDown, true);
        try { overlay.remove(); } catch (e) {}
        blocked.forEach(function(entry) {
          if (!entry.hadInert) entry.el.removeAttribute('inert');
          if (entry.ariaHidden == null) entry.el.removeAttribute('aria-hidden');
          else entry.el.setAttribute('aria-hidden', entry.ariaHidden);
        });
        try { if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus(); } catch (e) {}
        resolve(values);
      }
      function onKeyDown(event) {
        event.stopImmediatePropagation();
        if (event.key === 'Escape') { event.preventDefault(); finish(null); return; }
        if (event.key !== 'Tab') return;
        var focusable = inputs.concat([cancel, submit]);
        var first = focusable[0]; var last = focusable[focusable.length - 1];
        if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      cancel.addEventListener('click', function() { finish(null); });
      overlay.addEventListener('click', function(event) { if (event.target === overlay) finish(null); });
      dialog.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!dialog.checkValidity()) { dialog.reportValidity(); return; }
        var values = {}; inputs.forEach(function(input) { values[input.name] = input.value.trim(); });
        finish(values);
      });
      window.addEventListener('keydown', onKeyDown, true);
      inputs[0].focus();
    });
  }

  // ── Sound ──
  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.15)); } catch(e) {} }
  function sfxClick() { tone(880, 0.04, 'sine', 0.05); }
  function sfxStart() { tone(523, 0.08, 'sine', 0.06); setTimeout(function() { tone(784, 0.12, 'sine', 0.07); }, 80); }
  function sfxDone()  { tone(659, 0.1, 'sine', 0.08); setTimeout(function() { tone(784, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { tone(988, 0.18, 'sine', 0.09); }, 160); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  // EF self-assessment: 5 domains, each with 2 statements rated 0-3
  var DOMAINS = [
    { id: 'init',  icon: '🚀', label: 'Starting',
      desc: 'How hard is it to begin a task once you sit down?',
      items: [
        'I sit down to start, then end up on my phone instead.',
        'Starting feels harder than the actual work.'
      ],
      strategy: 'start',
      pitch: 'Task initiation strategies. The 5-minute rule and the future-self letter live here.'
    },
    { id: 'hold',  icon: '🧠', label: 'Working Memory',
      desc: 'How well does your brain hold the thing you are doing?',
      items: [
        'I forget what I was doing mid-task.',
        'If I do not write it down right now, it is gone.'
      ],
      strategy: 'hold',
      pitch: 'Brain dump, capture system, and re-cuing. Externalize everything.'
    },
    { id: 'plan',  icon: '🗺️', label: 'Planning',
      desc: 'How do you handle big projects with multiple steps?',
      items: [
        'Big projects feel like a wall I cannot get past.',
        'I usually start with whatever is loudest, not what is most important.'
      ],
      strategy: 'plan',
      pitch: 'Backward planning workbench. Pick a deadline, break it into chunks.'
    },
    { id: 'time',  icon: '⏱️', label: 'Time',
      desc: 'How accurate is your sense of time passing?',
      items: [
        'I think 30 minutes have passed and it has been 2 hours.',
        'I underestimate how long things actually take.'
      ],
      strategy: 'time',
      pitch: 'Time estimation game and a built-in Pomodoro. Calibrate your inner clock.'
    },
    { id: 'flex',  icon: '🔀', label: 'Flexibility',
      desc: 'How well do you switch between tasks or adjust to changes?',
      items: [
        'When my plan changes, I shut down.',
        'Switching between tasks is exhausting, even when both are easy.'
      ],
      strategy: 'coach',
      pitch: 'Talk it through with the coach. Flexibility is built one shift at a time.'
    }
  ];

  // Task initiation strategies
  var INIT_STRATEGIES = [
    {
      id: '5min', icon: '⏳', title: '5-Minute Rule',
      when: 'You know what to do but cannot start.',
      how: 'Promise yourself only 5 minutes. Set a timer. After 5, you can stop with no guilt. (Most of the time, you keep going.)',
      why: 'The hardest part of any task is the first minute. Once you are in motion, momentum does the work. The promise of "only 5 minutes" lowers the cost of starting until your brain stops resisting.',
      hasTimer: true
    },
    {
      id: 'futureself', icon: '✉️', title: 'Future-Self Letter',
      when: 'You have to start tomorrow morning. You are dreading it.',
      how: 'Write a 2-line note to yourself for tomorrow that says exactly where to start. "Open the math doc. Click on problem 3. Just read it."',
      why: 'Decision-making is the most expensive part of starting. Removing the decision (because past-you already made it) makes initiation almost automatic.',
      hasNote: true
    },
    {
      id: 'lower', icon: '🪜', title: 'Lower the Bar',
      when: 'Perfectionism is freezing you.',
      how: 'Promise yourself you will do it BADLY first. "I will write one bad sentence." "I will do problem 1 wrong." Permission to fail removes the threat.',
      why: 'Your brain treats high-stakes tasks like predator attacks. Lowering the bar tells your nervous system that this is safe. You can edit terrible work; you cannot edit a blank page.'
    },
    {
      id: 'trigger', icon: '🔗', title: 'Stack the Habit',
      when: 'You keep forgetting to start, or putting it off.',
      how: 'Tie the task to something you already do automatically. "After I close my last class tab, I open the homework doc." "After I drink water at my desk, I start problem 1."',
      why: 'Existing habits are wired into your brain like train tracks. Hooking a new task onto an old habit lets you ride those tracks instead of building new ones from scratch.'
    },
    {
      id: 'predecide', icon: '🎯', title: 'Pre-Decide',
      when: 'You have time, but you keep choosing other things.',
      how: 'Make the decision the night before, in writing. "Tomorrow at 4:00 I sit at my desk and open the science doc. No deciding required." Then follow the instructions like a person who is not you.',
      why: 'Willpower is a limited budget that runs out by 4 PM. Past-you with full willpower can spend it for present-you who has none left.'
    },
    {
      id: 'doubling', icon: '👥', title: 'Body Doubling',
      when: 'You cannot make yourself work alone.',
      how: 'Work in the same room as someone else, even silently. A parent at the kitchen table. A friend on a video call who is also doing homework. The presence is the point.',
      why: 'For ADHD brains and anxious brains, the presence of another person quiet alongside you makes initiation easier. This is not a weakness; it is how a lot of human work has always gotten done.'
    }
  ];

  // Working memory tools
  var HOLD_STRATEGIES = [
    {
      id: 'capture', icon: '📥', title: 'The Capture System',
      summary: 'One inbox for every loose thought.',
      body: 'Pick ONE place where every loose thought goes: phone notes, paper notebook, sticky pad on your desk. When something pings your brain ("oh I need to email the teacher"), it goes into the inbox immediately. The brain is for thinking, not storing.'
    },
    {
      id: 'dump', icon: '🌪️', title: 'Brain Dump',
      summary: 'When you feel scattered, externalize everything.',
      body: 'Set a 5-minute timer. Write down EVERY task on your mind. Don\'t organize, don\'t filter. Get it all out of your head and onto paper. The relief is the point. Once it is all visible, you can pick the next thing without your brain running 47 background processes.',
      interactive: true
    },
    {
      id: 'threelists', icon: '📋', title: 'Three Lists',
      summary: 'Today, This Week, Someday.',
      body: 'Most people try to keep one master list. It always gets too long. Instead: TODAY (3 things, max), THIS WEEK (a handful), SOMEDAY (everything else, no pressure). Most things live on Someday forever, and that is fine.'
    },
    {
      id: 'anchor', icon: '⚓', title: 'Mid-Task Anchor',
      summary: 'When interrupted, write down where you are.',
      body: 'About to be pulled away from a task? Before you stand up, write down literally where you stopped. "Step 3, looking up x in chapter 2." "Last sentence I wrote was about the second cause of WWI." When you sit back down, your past-self left a map.'
    },
    {
      id: 'recue', icon: '🔄', title: 'Re-Cue Aloud',
      summary: 'Say what you are doing before you stand up.',
      body: 'Before standing up to get water or grab a charger, say out loud what you will do when you sit back down. "I am coming back to write the third paragraph." Saying it engages a different memory system than thinking it. The cue stays louder.'
    }
  ];

  // Time estimation game items (with typical actual ranges in minutes)
  var TIME_GAME = {
    elementary: [
      { id: 't1', task: 'Brush your teeth (well)', actualMin: 2, actualMax: 3 },
      { id: 't2', task: 'Read one chapter of a chapter book', actualMin: 15, actualMax: 25 },
      { id: 't3', task: 'Get dressed for school', actualMin: 5, actualMax: 10 },
      { id: 't4', task: 'Eat breakfast (sit-down meal)', actualMin: 10, actualMax: 20 },
      { id: 't5', task: 'Do 10 math problems', actualMin: 15, actualMax: 25 }
    ],
    middle: [
      { id: 'm1', task: 'Write one rough paragraph (5 sentences)', actualMin: 10, actualMax: 20 },
      { id: 'm2', task: 'Read one chapter of a textbook (carefully)', actualMin: 25, actualMax: 45 },
      { id: 'm3', task: 'Do 20 math problems', actualMin: 30, actualMax: 60 },
      { id: 'm4', task: 'Start, distract, refocus, finish a homework set', actualMin: 60, actualMax: 120 },
      { id: 'm5', task: 'Make and pack lunch from scratch', actualMin: 10, actualMax: 20 },
      { id: 'm6', task: 'Take a "quick" shower', actualMin: 8, actualMax: 15 }
    ],
    high: [
      { id: 'h1', task: 'Write a polished one-page essay (planning + drafting + editing)', actualMin: 60, actualMax: 180 },
      { id: 'h2', task: 'Read 30 pages of a novel and take notes', actualMin: 45, actualMax: 90 },
      { id: 'h3', task: 'Solve a calculus problem set of 10 problems', actualMin: 60, actualMax: 150 },
      { id: 'h4', task: 'Make and submit a college application essay', actualMin: 240, actualMax: 600 },
      { id: 'h5', task: 'Drive to a place you have never been (suburban distance)', actualMin: 25, actualMax: 50 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('execfunction', {
    icon: '🧠',
    label: 'Executive Function',
    desc: 'Strategies for the harder parts of getting things done: starting, holding, planning, and tracking time.',
    color: 'cyan',
    category: 'self-direction',
    render: function(ctx) {
      // ── Host theme remap (consumes ctx.theme) — canonical SEL light-base pattern ──
      var _efCTheme = (ctx && ctx.theme) || {};
      var _efCHC = !!_efCTheme.isContrast, _efCDark = !_efCHC && !!_efCTheme.isDark;
      var _EFC_DARK = {'#fff':'#1e293b','#ffffff':'#1e293b','#f8fafc':'#0f172a','#f1f5f9':'#1e293b','#fef9c3':'#3a3410','#f0fdf4':'#0b2e22','#f0fdfa':'#0c2e2a','#0f172a':'#f1f5f9','#1f2937':'#e2e8f0','#374151':'#cbd5e1','#475569':'#cbd5e1','#64748b':'#94a3b8','#94a3b8':'#94a3b8','#9ca3af':'#cbd5e1','#e5e7eb':'#334155','#e2e8f0':'#334155','#d1d5db':'#475569','#cbd5e1':'#475569','#a16207':'#fde047','#713f12':'#fcd34d','#dc2626':'#f87171','#166534':'#86efac','#ecfeff':'#0c2e30','#cffafe':'#0c3e42','#0c4a6e':'#7dd3fc','#155e75':'#67e8f9','#0e7490':'#67e8f9','#0f766e':'#5eead4'};
      var _EFC_HC = {'#fff':'#000000','#ffffff':'#000000','#f8fafc':'#000000','#f1f5f9':'#000000','#fef9c3':'#000000','#f0fdf4':'#000000','#f0fdfa':'#000000','#0f172a':'#ffff00','#1f2937':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#64748b':'#ffff00','#94a3b8':'#ffff00','#9ca3af':'#ffff00','#e5e7eb':'#ffff00','#e2e8f0':'#ffff00','#d1d5db':'#ffff00','#cbd5e1':'#ffff00','#a16207':'#ffff00','#713f12':'#ffff00','#dc2626':'#ffff00','#166534':'#ffff00','#ecfeff':'#000000','#cffafe':'#000000','#0c4a6e':'#ffff00','#155e75':'#ffff00','#0e7490':'#ffff00','#0f766e':'#ffff00'};
      var _efC = function(hex){ return _efCHC ? (_EFC_HC[hex]||hex) : (_efCDark ? (_EFC_DARK[hex]||hex) : hex); };
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var announceToSR = ctx.announceToSR; // was used at the distraction-log site but never declared (ReferenceError)
      var band = ctx.gradeBand || 'middle';

      var d = (ctx.toolData && ctx.toolData.execfunction) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('execfunction', key); }
        else { if (ctx.update) ctx.update('execfunction', key, val); }
      };

      // State
      var activeTab    = d.activeTab || 'map';
      var soundOn      = d.soundOn != null ? d.soundOn : true;
      var mapAnswers   = d.mapAnswers || {}; // { domainId: [score0, score1] }
      var mapDone      = d.mapDone || false;
      var initIdx      = d.initIdx || 0;
      var futureNote   = d.futureNote || '';
      var savedNotes   = d.savedNotes || [];
      var fiveMinStart = d.fiveMinStart || 0; // timestamp
      var holdIdx      = d.holdIdx || 0;
      var brainDump    = d.brainDump || '';
      var brainDumps   = d.brainDumps || [];
      var planGoal     = d.planGoal || '';
      var planDeadline = d.planDeadline || '';
      var planChunks   = d.planChunks || [''];
      var timeGameIdx  = d.timeGameIdx || 0;
      var timeGuess    = d.timeGuess || '';
      var timeRevealed = d.timeRevealed || false;
      var timeScore    = d.timeScore || 0;
      var pomoStart    = d.pomoStart || 0;
      var pomoMode     = d.pomoMode || 'work'; // 'work' | 'break'
      var coachInput   = d.coachInput || '';
      var coachHistory = d.coachHistory || [];
      var coachLoading = d.coachLoading || false;
      var confirmAction = d.confirmAction || null;

      var CYAN = '#0891b2'; var CYAN_LIGHT = _efC('#ecfeff'); var CYAN_DARK = _efC('#155e75');
      function focusExecControl(id) {
        setTimeout(function() {
          var target = document.getElementById(id);
          if (target && target.focus) target.focus();
        }, 50);
      }
      function openDestructiveConfirm(action) {
        upd('confirmAction', action);
        focusExecControl('ef-confirm-cancel');
      }
      function closeDestructiveConfirm() {
        var triggerId = confirmAction && confirmAction.triggerId;
        upd('confirmAction', null);
        if (triggerId) focusExecControl(triggerId);
      }
      function commitDestructiveAction() {
        if (!confirmAction) return;
        if (confirmAction.type === 'clear-distractions') {
          upd({ confirmAction: null, distractions: [] });
          if (announceToSR) announceToSR('All distraction entries cleared.');
          focusExecControl('ef-distraction-heading');
        } else if (confirmAction.type === 'remove-habit') {
          upd({
            confirmAction: null,
            habits: (d.habits || []).filter(function(habit) { return habit.id !== confirmAction.habitId; })
          });
          if (announceToSR) announceToSR('Habit removed.');
          focusExecControl('ef-habits-heading');
        }
      }
      function handleConfirmKeyDown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeDestructiveConfirm();
          return;
        }
        if (event.key !== 'Tab') return;
        var buttons = event.currentTarget.querySelectorAll('button:not([disabled])');
        if (!buttons.length) return;
        var first = buttons[0];
        var last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      function renderDestructiveConfirm() {
        if (!confirmAction) return null;
        var clearing = confirmAction.type === 'clear-distractions';
        var title = clearing ? 'Clear all distraction entries?' : 'Remove this habit?';
        var description = clearing
          ? 'This permanently deletes all ' + (d.distractions || []).length + ' distraction log entries. This cannot be undone.'
          : 'This permanently removes “' + (confirmAction.habitLabel || 'this habit') + '” and its tracking history. This cannot be undone.';
        return h('div', {
          id: 'ef-destructive-confirm',
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ef-confirm-title',
          'aria-describedby': 'ef-confirm-description',
          onKeyDown: handleConfirmKeyDown,
          style: { position: 'fixed', inset: 0, zIndex: 10003, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
        },
          h('div', { style: { width: '100%', maxWidth: 500, borderRadius: 14, border: '2px solid ' + CYAN, background: _efC('#fff'), color: _efC('#0f172a'), padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' } },
            h('h3', { id: 'ef-confirm-title', style: { margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: CYAN_DARK } }, title),
            h('p', { id: 'ef-confirm-description', style: { margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: _efC('#475569') } }, description),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } },
              h('button', {
                id: 'ef-confirm-cancel',
                'data-primary-action': 'true',
                onClick: closeDestructiveConfirm,
                style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: _efC('#f8fafc'), color: _efC('#0f172a'), fontSize: 13, fontWeight: 700, cursor: 'pointer' }
              }, 'Cancel'),
              h('button', {
                onClick: commitDestructiveAction,
                style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid #dc2626', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
              }, clearing ? 'Clear all entries' : 'Remove habit')
            )
          )
        );
      }

      var TABS = [
        { id: 'map',     icon: '🗺️', label: 'Map' },
        { id: 'start',   icon: '🚀', label: 'Start' },
        { id: 'hold',    icon: '🧠', label: 'Hold' },
        { id: 'plan',    icon: '📐', label: 'Plan' },
        { id: 'time',    icon: '⏱️', label: 'Time' },
        { id: 'focus',   icon: '🎯', label: 'Focus' },
        { id: 'distract',icon: '📊', label: 'Distractions' },
        { id: 'habit',   icon: '✅', label: 'Habits' },
        { id: 'planner', icon: '📋', label: 'Day Planner' },
        { id: 'coach',   icon: '🤖', label: 'Coach' },
        { id: 'print',   icon: '🖨', label: 'Print' }
      ];

      // Accommodation suggestions per domain — what to ask for in 504/IEP meetings
      var ACCOMMODATIONS = {
        init:  ['Extra time to transition between activities and start work', 'Teacher cue or check-in to begin (silent signal, sticky note, brief 1:1 prompt)', 'Permission to use a 5-minute warm-up timer instead of starting cold', 'Permission to start with the easiest sub-task first to build momentum'],
        hold:  ['Written task lists provided alongside verbal instructions', 'Permission to use a note-taking app or paper capture system at all times', 'Steps broken into one-at-a-time chunks rather than multi-step directions', 'Repeat-back of directions allowed without it counting as "off task"'],
        plan:  ['Long projects broken into smaller graded checkpoints (not just one final deadline)', 'Backward-planning template provided at project assignment', 'Permission to check in with teacher at planning stage before working', 'Extended time on multi-step assignments'],
        time:  ['Visual timers visible during independent work', 'Time estimates provided for each assignment', 'Extended time on tests and timed assignments', 'Frequent natural breaks (Pomodoro-style structure)'],
        flex:  ['Advance warning of schedule changes whenever possible', 'A predictable transition routine (5-minute warning, end-of-class checklist)', 'Permission to take a 2-minute reset when a plan changes', 'A pass to a regulation space when overwhelmed by an unexpected change']
      };

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #cffafe', background: 'linear-gradient(180deg, #f0fdfa, #ecfeff)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: _efC('#e2e8f0'), position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + CYAN + ', #06b6d4)', transition: 'width 0.5s ease' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Executive Function sections'
        },
          TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id, role: 'tab',
              'aria-selected': a ? 'true' : 'false',
              'aria-label': t.label,
              onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? _efC('#cffafe') : 'transparent'), background: a ? 'linear-gradient(135deg, ' + CYAN + ', #0e7490)' : explored ? 'rgba(8,145,178,0.06)' : 'transparent', color: a ? '#fff' : explored ? CYAN_DARK : _efC('#475569'), fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(8,145,178,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#67e8f9', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { style: { marginLeft: '8px', fontSize: '10px', color: CYAN_DARK, fontWeight: 700, whiteSpace: 'nowrap', background: _efC('#cffafe'), padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '🔊' : '🔇')
        )
      );

      // ── Map (self-assessment) ──
      var mapContent = null;
      if (activeTab === 'map') {
        var totalQs = DOMAINS.length * 2;
        var answeredQs = 0;
        DOMAINS.forEach(function(dom) { var arr = mapAnswers[dom.id] || []; arr.forEach(function(v) { if (v != null) answeredQs++; }); });
        var allAnswered = answeredQs >= totalQs;

        // Compute domain scores
        var scoreFor = function(dom) {
          var arr = mapAnswers[dom.id] || [];
          var s = 0; arr.forEach(function(v) { if (v != null) s += v; });
          return s; // 0-6
        };
        var sortedByDifficulty = DOMAINS.slice().sort(function(a, b) { return scoreFor(b) - scoreFor(a); });

        mapContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '8px' } }, '🗺️'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Map Your EF'),
            h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Five domains, two questions each. Honest answers point to which strategies will help YOU most.')
          ),

          // Questions
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' } },
            DOMAINS.map(function(dom) {
              var arr = mapAnswers[dom.id] || [];
              return h('div', { key: dom.id, style: { background: _efC('#fff'), border: '2px solid #cffafe', borderRadius: '14px', padding: '14px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                  h('span', { style: { fontSize: '22px' } }, dom.icon),
                  h('h4', { style: { fontSize: '14px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, dom.label)
                ),
                h('p', { style: { fontSize: '11px', color: _efC('#475569'), margin: '0 0 10px', fontStyle: 'italic' } }, dom.desc),
                dom.items.map(function(stmt, qi) {
                  return h('div', { key: qi, style: { marginBottom: '10px' } },
                    h('p', { style: { fontSize: '13px', color: _efC('#374151'), margin: '0 0 6px', lineHeight: 1.5 } }, stmt),
                    h('div', { style: { display: 'flex', gap: '4px' } },
                      ['Rarely', 'Sometimes', 'Often', 'Always'].map(function(lbl, vi) {
                        var sel = arr[qi] === vi;
                        return h('button', {
                          key: vi,
                          'aria-label': stmt + ': ' + lbl,
                          onClick: function() {
                            var na = mapAnswers[dom.id] ? mapAnswers[dom.id].slice() : [];
                            na[qi] = vi;
                            var nm = Object.assign({}, mapAnswers); nm[dom.id] = na;
                            upd('mapAnswers', nm);
                            if (soundOn) sfxClick();
                          },
                          style: { flex: 1, padding: '6px 4px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', border: sel ? '2px solid ' + CYAN : '1px solid #e5e7eb', background: sel ? CYAN_LIGHT : _efC('#fff'), color: sel ? CYAN_DARK : _efC('#475569') }
                        }, lbl);
                      })
                    )
                  );
                })
              );
            })
          ),

          // Results (when all answered)
          allAnswered && h('div', { style: { background: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '16px', marginBottom: '14px' } },
            h('h4', { style: { fontSize: '14px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 10px' } }, '🎯 Your strategy menu'),
            sortedByDifficulty.slice(0, 3).map(function(dom, ri) {
              var s = scoreFor(dom);
              return h('button', {
                key: dom.id,
                onClick: function() { upd('activeTab', dom.strategy); if (soundOn) sfxStart(); if (!mapDone) { upd('mapDone', true); if (awardXP) awardXP(15, 'Mapped your EF profile!'); } },
                'aria-label': 'Open strategies for ' + dom.label,
                style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '10px 12px', background: _efC('#fff'), border: '1px solid #cffafe', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer' }
              },
                h('span', { style: { fontSize: '20px' } }, dom.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: CYAN_DARK } }, (ri + 1) + '. ' + dom.label + ' (score: ' + s + '/6)'),
                  h('div', { style: { fontSize: '11px', color: _efC('#475569'), marginTop: '2px' } }, dom.pitch)
                ),
                h('span', { style: { fontSize: '14px', color: CYAN } }, '→')
              );
            })
          ),

          !allAnswered && h('p', { style: { fontSize: '11px', color: _efC('#475569'), textAlign: 'center', fontStyle: 'italic' } }, 'Answered: ' + answeredQs + ' / ' + totalQs)
        );
      }

      // ── Start (task initiation) ──
      var startContent = null;
      if (activeTab === 'start') {
        var curS = INIT_STRATEGIES[initIdx % INIT_STRATEGIES.length];
        var fiveMinSeconds = fiveMinStart > 0 ? Math.max(0, 300 - Math.floor((Date.now() - fiveMinStart) / 1000)) : 0;
        var fiveMinDone = fiveMinStart > 0 && fiveMinSeconds === 0;
        startContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🚀'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Get Started'),
            h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Six strategies for the moment between "I should start" and "I am starting."')
          ),
          // Strategy selector pills
          h('div', { style: { display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' } },
            INIT_STRATEGIES.map(function(s, i) {
              var sel = i === initIdx % INIT_STRATEGIES.length;
              return h('button', {
                key: s.id,
                'aria-label': s.title,
                onClick: function() { upd('initIdx', i); if (soundOn) sfxClick(); },
                style: { flexShrink: 0, padding: '8px 12px', borderRadius: '8px', border: sel ? '2px solid ' + CYAN : '1px solid #cffafe', background: sel ? CYAN_LIGHT : _efC('#fff'), color: sel ? CYAN_DARK : _efC('#475569'), fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
              }, s.icon + ' ' + s.title);
            })
          ),
          // Strategy detail
          h('div', { style: { background: _efC('#fff'), border: '2px solid #cffafe', borderRadius: '14px', padding: '18px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
              h('span', { style: { fontSize: '32px' } }, curS.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, curS.title)
            ),
            h('div', { style: { background: CYAN_LIGHT, borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', borderLeft: '4px solid ' + CYAN } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: CYAN, marginBottom: '2px', textTransform: 'uppercase' } }, 'When this fits:'),
              h('p', { style: { fontSize: '13px', color: CYAN_DARK, margin: 0 } }, curS.when)
            ),
            h('div', { style: { background: _efC('#f0fdf4'), borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', borderLeft: '4px solid #4ade80' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a', marginBottom: '2px', textTransform: 'uppercase' } }, 'How to do it:'),
              h('p', { style: { fontSize: '13px', color: _efC('#166534'), margin: 0, lineHeight: 1.6 } }, curS.how)
            ),
            h('div', { style: { background: _efC('#fef9c3'), borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #facc15' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: _efC('#a16207'), marginBottom: '2px', textTransform: 'uppercase' } }, 'Why it works:'),
              h('p', { style: { fontSize: '12px', color: _efC('#713f12'), margin: 0, lineHeight: 1.6 } }, curS.why)
            )
          ),
          // 5-Minute timer interactive
          curS.hasTimer && h('div', { style: { background: _efC('#fff'), border: '2px solid ' + CYAN, borderRadius: '14px', padding: '18px', textAlign: 'center', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Try it now'),
            fiveMinStart === 0 ? h('button', {
              onClick: function() { upd('fiveMinStart', Date.now()); if (soundOn) sfxStart(); if (addToast) addToast('Timer started. 5 minutes only.', 'info'); },
              'aria-label': 'Start 5-minute timer',
              style: { padding: '12px 28px', background: CYAN, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
            }, '▶ Start 5 minutes') : h('div', null,
              h('div', { style: { fontSize: '36px', fontWeight: 800, color: fiveMinDone ? '#16a34a' : CYAN_DARK, fontVariantNumeric: 'tabular-nums', marginBottom: '6px' } },
                Math.floor(fiveMinSeconds / 60) + ':' + String(fiveMinSeconds % 60).padStart(2, '0')
              ),
              h('p', { style: { fontSize: '11px', color: _efC('#475569'), margin: '0 0 10px' } }, fiveMinDone ? '5 minutes done. Stop now or keep going.' : 'Just keep going. The timer is doing the deciding.'),
              h('button', {
                onClick: function() {
                  upd('fiveMinStart', 0);
                  if (fiveMinDone) { if (soundOn) sfxDone(); if (awardXP) awardXP(10, 'You started.'); }
                },
                style: { padding: '8px 18px', background: fiveMinDone ? '#16a34a' : _efC('#e5e7eb'), color: fiveMinDone ? '#fff' : _efC('#374151'), border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, fiveMinDone ? '✓ Done' : 'Stop timer')
            )
          ),
          // Future-self note interactive
          curS.hasNote && h('div', { style: { background: _efC('#fff'), border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Write your future-self note'),
            h('textarea', {
              value: futureNote,
              onChange: function(ev) { upd('futureNote', ev.target.value); },
              'aria-label': 'A 2-line note for tomorrow morning',
              placeholder: 'Tomorrow morning at 8am: open the science doc. Click problem 1. Read it.',
              style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '60px', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('button', {
              onClick: function() {
                if (!futureNote.trim()) return;
                var n = { id: Date.now().toString(), text: futureNote.trim(), date: new Date().toLocaleDateString(), ts: Date.now() };
                upd({ savedNotes: [n].concat(savedNotes), futureNote: '' });
                if (soundOn) sfxStart();
                if (awardXP) awardXP(8, 'Saved a future-self note');
              },
              disabled: !futureNote.trim(),
              style: { marginTop: '8px', padding: '8px 16px', background: futureNote.trim() ? CYAN : _efC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: futureNote.trim() ? 'pointer' : 'not-allowed' }
            }, '💾 Save for tomorrow'),
            savedNotes.length > 0 && h('div', { style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' } },
              savedNotes.slice(0, 5).map(function(n) {
                return h('div', { key: n.id, style: { background: CYAN_LIGHT, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: CYAN_DARK, position: 'relative' } },
                  h('div', { style: { fontSize: '10px', color: _efC('#475569'), marginBottom: '2px' } }, n.date),
                  h('p', { style: { margin: 0, lineHeight: 1.5 } }, n.text),
                  h('button', { onClick: function() { upd('savedNotes', savedNotes.filter(function(s) { return s.id !== n.id; })); }, 'aria-label': 'Delete note', style: { position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: _efC('#475569'), cursor: 'pointer', fontSize: '12px' } }, '✕')
                );
              })
            )
          )
        );
      }

      // ── Hold (working memory) ──
      var holdContent = null;
      if (activeTab === 'hold') {
        var curH = HOLD_STRATEGIES[holdIdx % HOLD_STRATEGIES.length];
        holdContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🧠'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Hold It'),
            h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Working-memory tools. The brain is for thinking, not storing.')
          ),
          h('div', { style: { display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' } },
            HOLD_STRATEGIES.map(function(s, i) {
              var sel = i === holdIdx % HOLD_STRATEGIES.length;
              return h('button', {
                key: s.id,
                'aria-label': s.title,
                onClick: function() { upd('holdIdx', i); if (soundOn) sfxClick(); },
                style: { flexShrink: 0, padding: '8px 12px', borderRadius: '8px', border: sel ? '2px solid ' + CYAN : '1px solid #cffafe', background: sel ? CYAN_LIGHT : _efC('#fff'), color: sel ? CYAN_DARK : _efC('#475569'), fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
              }, s.icon + ' ' + s.title);
            })
          ),
          h('div', { style: { background: _efC('#fff'), border: '2px solid #cffafe', borderRadius: '14px', padding: '18px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('span', { style: { fontSize: '32px' } }, curH.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: CYAN_DARK, margin: 0 } }, curH.title)
            ),
            h('p', { style: { fontSize: '12px', color: CYAN, fontWeight: 700, fontStyle: 'italic', margin: '0 0 12px' } }, curH.summary),
            h('p', { style: { fontSize: '14px', color: _efC('#374151'), margin: 0, lineHeight: 1.7 } }, curH.body)
          ),
          curH.interactive && h('div', { style: { background: _efC('#fff'), border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Brain dump zone'),
            h('textarea', {
              value: brainDump,
              onChange: function(ev) { upd('brainDump', ev.target.value); },
              'aria-label': 'Brain dump',
              placeholder: 'Every loose thought. Don\'t organize. Don\'t filter. Just dump.',
              style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '120px', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
              h('button', {
                onClick: function() {
                  if (!brainDump.trim()) return;
                  var entry = { id: Date.now().toString(), text: brainDump.trim(), date: new Date().toLocaleDateString(), ts: Date.now() };
                  upd({ brainDumps: [entry].concat(brainDumps), brainDump: '' });
                  if (soundOn) sfxDone();
                  if (awardXP) awardXP(10, 'Brain dumped! Relief.');
                  if (addToast) addToast('Out of your head. Onto the page.', 'success');
                },
                disabled: !brainDump.trim(),
                style: { padding: '8px 16px', background: brainDump.trim() ? CYAN : _efC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: brainDump.trim() ? 'pointer' : 'not-allowed' }
              }, '💾 Save dump'),
              h('button', {
                onClick: function() { upd('brainDump', ''); },
                disabled: !brainDump,
                style: { padding: '8px 12px', background: 'transparent', color: _efC('#475569'), border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: brainDump ? 'pointer' : 'not-allowed' }
              }, 'Clear')
            ),
            brainDumps.length > 0 && h('div', { style: { marginTop: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN_DARK, marginBottom: '6px' } }, '📥 Past dumps (' + brainDumps.length + ')'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' } },
                brainDumps.slice(0, 10).map(function(b) {
                  return h('div', { key: b.id, style: { background: _efC('#f8fafc'), padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: _efC('#374151') } },
                    h('div', { style: { fontSize: '10px', color: _efC('#475569'), marginBottom: '2px' } }, b.date),
                    h('p', { style: { margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, b.text.length > 200 ? b.text.slice(0, 200) + '…' : b.text)
                  );
                })
              )
            )
          )
        );
      }

      // ── Plan (backward planning workbench) ──
      var planContent = null;
      if (activeTab === 'plan') {
        var validChunks = planChunks.filter(function(c) { return c.trim().length > 0; });
        var deadlineDate = planDeadline ? new Date(planDeadline + 'T17:00:00') : null;
        var schedule = [];
        if (deadlineDate && validChunks.length > 0) {
          var daysBack = validChunks.length;
          for (var ci = 0; ci < validChunks.length; ci++) {
            var dueOffset = daysBack - 1 - ci; // last chunk = deadline; others walk backward
            var due = new Date(deadlineDate.getTime() - dueOffset * 86400000);
            schedule.push({ chunk: validChunks[ci], due: due });
          }
        }
        planContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '📐'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Backward Planning'),
            h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Start from the deadline. Walk back. Each chunk should be one hour or less.')
          ),
          // Goal
          h('label', { htmlFor: 'ef-plan-goal', style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The goal'),
          h('input', {
            id: 'ef-plan-goal',
            type: 'text', value: planGoal,
            onChange: function(ev) { upd('planGoal', ev.target.value); },
            placeholder: 'Submit science fair project',
            style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px' }
          }),
          // Deadline
          h('label', { htmlFor: 'ef-plan-deadline', style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The deadline'),
          h('input', {
            id: 'ef-plan-deadline',
            type: 'date', value: planDeadline,
            onChange: function(ev) { upd('planDeadline', ev.target.value); },
            style: { width: '100%', border: '1px solid #cffafe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '14px' }
          }),
          // Chunks (label is for the list as a whole; individual chunk inputs already have aria-label)
          h('label', { style: { fontSize: '12px', fontWeight: 700, color: CYAN_DARK, display: 'block', marginBottom: '4px' } }, 'The chunks (in order)'),
          h('p', { style: { fontSize: '11px', color: _efC('#475569'), fontStyle: 'italic', margin: '0 0 8px' } }, 'Last chunk = the deadline. First chunk = today. Each chunk should be one sit-down session, ≤1 hour.'),
          planChunks.map(function(ch, ci) {
            return h('div', { key: ci, style: { display: 'flex', gap: '6px', marginBottom: '6px' } },
              h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '32px', background: CYAN_LIGHT, color: CYAN_DARK, borderRadius: '6px', fontSize: '12px', fontWeight: 800, flexShrink: 0 } }, ci + 1),
              h('input', {
                type: 'text', value: ch,
                onChange: function(ev) { var nc = planChunks.slice(); nc[ci] = ev.target.value; upd('planChunks', nc); },
                'aria-label': 'Chunk ' + (ci + 1),
                placeholder: 'e.g. Read 3 articles, take notes',
                style: { flex: 1, border: '1px solid #cffafe', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              planChunks.length > 1 && h('button', {
                onClick: function() { upd('planChunks', planChunks.filter(function(_, j) { return j !== ci; })); },
                'aria-label': 'Remove chunk',
                style: { padding: '0 10px', background: 'transparent', border: '1px solid #e5e7eb', color: _efC('#9ca3af'), borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }
              }, '✕')
            );
          }),
          h('button', {
            onClick: function() { upd('planChunks', planChunks.concat([''])); },
            'aria-label': 'Add chunk',
            style: { padding: '6px 12px', background: 'transparent', border: '1px dashed ' + CYAN, color: CYAN_DARK, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, marginBottom: '14px' }
          }, '+ Add chunk'),

          // Schedule output
          schedule.length > 0 && h('div', { style: { background: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: '2px solid ' + CYAN, borderRadius: '14px', padding: '14px' } },
            h('h4', { style: { fontSize: '13px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 10px' } }, '🗓️ Your schedule'),
            h('p', { style: { fontSize: '11px', color: _efC('#475569'), fontStyle: 'italic', margin: '0 0 10px' } }, 'Goal: ' + (planGoal || '(name your goal above)')),
            schedule.map(function(s, si) {
              var isLast = si === schedule.length - 1;
              var dt = s.due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return h('div', { key: si, style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', background: _efC('#fff'), borderRadius: '8px', marginBottom: '6px', border: isLast ? '2px solid ' + CYAN : '1px solid #e5e7eb' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: isLast ? CYAN : _efC('#475569'), flexShrink: 0, minWidth: '90px' } }, dt + (isLast ? ' (deadline)' : '')),
                h('div', { style: { fontSize: '13px', color: _efC('#374151') } }, s.chunk)
              );
            }),
            h('button', {
              onClick: function() {
                var txt = 'Goal: ' + planGoal + '\n' + schedule.map(function(s) { return s.due.toLocaleDateString() + '  ' + s.chunk; }).join('\n');
                try { navigator.clipboard.writeText(txt); if (addToast) addToast('Schedule copied to clipboard.', 'success'); if (awardXP) awardXP(10, 'Made a backward plan!'); } catch(e) {}
              },
              'aria-label': 'Copy schedule',
              style: { marginTop: '6px', padding: '8px 14px', background: CYAN, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
            }, '📋 Copy schedule')
          )
        );
      }

      // ── Time (estimation game + Pomodoro) ──
      var timeContent = null;
      if (activeTab === 'time') {
        var games = TIME_GAME[band] || TIME_GAME.middle;
        var curT = games[timeGameIdx % games.length];
        var pomoRunning = pomoStart > 0;
        var pomoDuration = pomoMode === 'work' ? 25 * 60 : 5 * 60;
        var pomoSeconds = pomoRunning ? Math.max(0, pomoDuration - Math.floor((Date.now() - pomoStart) / 1000)) : pomoDuration;
        var pomoDone = pomoRunning && pomoSeconds === 0;

        timeContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '⏱️'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'Time'),
            h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Calibrate your inner clock. Then work in 25-minute chunks.')
          ),
          // Estimation game
          h('div', { style: { background: _efC('#fff'), border: '2px solid #cffafe', borderRadius: '14px', padding: '16px', marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '8px', textTransform: 'uppercase' } }, 'Estimation game'),
            timeScore > 0 && h('div', { style: { textAlign: 'center', marginBottom: '8px' } },
              h('span', { style: { background: CYAN_LIGHT, color: CYAN_DARK, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 } }, '🎯 ' + timeScore + ' calibrated')
            ),
            h('p', { style: { fontSize: '15px', fontWeight: 700, color: _efC('#374151'), margin: '0 0 10px' } }, 'How long does it take to: ' + curT.task + '?'),
            !timeRevealed && h('div', null,
              h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' } },
                h('input', {
                  type: 'number', value: timeGuess,
                  onChange: function(ev) { upd('timeGuess', ev.target.value); },
                  'aria-label': 'Your time estimate in minutes',
                  placeholder: '?',
                  min: '1', max: '600',
                  style: { width: '80px', border: '1px solid #cffafe', borderRadius: '6px', padding: '8px', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }
                }),
                h('span', { style: { fontSize: '13px', color: _efC('#475569') } }, 'minutes'),
                h('button', {
                  onClick: function() {
                    if (!timeGuess) return;
                    var g = parseInt(timeGuess, 10);
                    var inRange = g >= curT.actualMin && g <= curT.actualMax;
                    upd({ timeRevealed: true, timeScore: timeScore + (inRange ? 1 : 0) });
                    if (soundOn) inRange ? sfxDone() : sfxClick();
                    if (inRange && awardXP) awardXP(5, 'Calibrated!');
                  },
                  disabled: !timeGuess,
                  'aria-label': 'Submit estimate',
                  style: { padding: '8px 16px', background: timeGuess ? CYAN : _efC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: timeGuess ? 'pointer' : 'not-allowed' }
                }, 'Reveal')
              )
            ),
            timeRevealed && h('div', null,
              h('div', { style: { background: CYAN_LIGHT, padding: '10px 12px', borderRadius: '8px', marginBottom: '8px' } },
                h('p', { style: { fontSize: '12px', color: CYAN_DARK, margin: '0 0 4px' } }, 'Your guess: ' + timeGuess + ' min'),
                h('p', { style: { fontSize: '12px', color: CYAN_DARK, margin: 0, fontWeight: 700 } }, 'Typical actual: ' + curT.actualMin + '–' + curT.actualMax + ' min')
              ),
              h('button', {
                onClick: function() { upd({ timeGameIdx: (timeGameIdx + 1) % games.length, timeGuess: '', timeRevealed: false }); if (soundOn) sfxClick(); },
                'aria-label': 'Next estimation',
                style: { padding: '8px 16px', background: CYAN, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, 'Next →')
            )
          ),
          // Pomodoro
          h('div', { style: { background: _efC('#fff'), border: '2px solid ' + CYAN, borderRadius: '14px', padding: '18px', textAlign: 'center' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: CYAN, marginBottom: '6px', textTransform: 'uppercase' } }, 'Pomodoro: ' + (pomoMode === 'work' ? '25-min work' : '5-min break')),
            h('div', { style: { fontSize: '48px', fontWeight: 800, color: pomoDone ? '#16a34a' : CYAN_DARK, fontVariantNumeric: 'tabular-nums', marginBottom: '10px', letterSpacing: '0.05em' } },
              Math.floor(pomoSeconds / 60) + ':' + String(pomoSeconds % 60).padStart(2, '0')
            ),
            !pomoRunning ? h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
              h('button', {
                onClick: function() { upd({ pomoStart: Date.now(), pomoMode: 'work' }); if (soundOn) sfxStart(); },
                'aria-label': 'Start 25-minute work session',
                style: { padding: '10px 18px', background: CYAN, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
              }, '▶ Start work (25)'),
              h('button', {
                onClick: function() { upd({ pomoStart: Date.now(), pomoMode: 'break' }); if (soundOn) sfxStart(); },
                'aria-label': 'Start 5-minute break',
                style: { padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
              }, '☕ Start break (5)')
            ) : h('button', {
              onClick: function() { upd('pomoStart', 0); if (pomoDone) { if (soundOn) sfxDone(); if (awardXP) awardXP(pomoMode === 'work' ? 15 : 5, 'Pomodoro done.'); } },
              'aria-label': 'Stop pomodoro',
              style: { padding: '10px 18px', background: pomoDone ? '#16a34a' : _efC('#e5e7eb'), color: pomoDone ? '#fff' : _efC('#374151'), border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
            }, pomoDone ? '✓ Done' : 'Stop')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── FOCUS TIMER — multi-mode interactive timer ──
      // Pomodoro (25/5), deep work (50/10), sprint (15/3), body-doubling.
      // Includes start/pause/skip, visual ring progress, audible chimes.
      // ══════════════════════════════════════════════════════════
      if (activeTab === 'focus') {
        var FOCUS_MODES = [
          { id: 'pomo',   label: '🍅 Pomodoro',    work: 25, brk: 5,  desc: 'Classic — 25 work, 5 break. Best for short single tasks.' },
          { id: 'deep',   label: '🧘 Deep Work',   work: 50, brk: 10, desc: 'Longer block — best for projects and reading.' },
          { id: 'sprint', label: '⚡ Sprint',      work: 15, brk: 3,  desc: 'Short — great when starting cold or doing easy review.' },
          { id: 'body',   label: '👥 Body-Double', work: 30, brk: 5,  desc: 'Same timer, framed as parallel work with a friend or family.' },
          { id: 'custom', label: '⚙ Custom',       work: null, brk: null, desc: 'You set the times.' }
        ];
        var fm = d.focusMode || 'pomo';
        var mode = FOCUS_MODES.find(function(m) { return m.id === fm; }) || FOCUS_MODES[0];
        var custW = d.focusCustomWork || 25;
        var custB = d.focusCustomBreak || 5;
        var workMin = mode.id === 'custom' ? custW : mode.work;
        var brkMin  = mode.id === 'custom' ? custB : mode.brk;
        var phase = d.focusPhase || 'work';      // 'work' | 'break' | 'idle'
        var fStart = d.focusStartTime || 0;
        var fPaused = !!d.focusPaused;
        var fRemaining = d.focusRemaining != null ? d.focusRemaining : (workMin * 60);
        var sessions = d.focusSessions || 0;     // completed work sessions
        var now = Date.now();
        var sec;
        if (fPaused) {
          sec = Math.max(0, fRemaining);
        } else if (fStart > 0) {
          sec = Math.max(0, fRemaining - Math.floor((now - fStart) / 1000));
        } else {
          sec = workMin * 60;
        }
        var totalSec = (phase === 'work' ? workMin : brkMin) * 60;
        var pct = totalSec > 0 ? Math.min(100, Math.round(((totalSec - sec) / totalSec) * 100)) : 0;
        var mm = Math.floor(sec / 60); var ss = sec % 60;
        function startTimer() {
          upd({ focusStartTime: Date.now(), focusRemaining: fRemaining > 0 ? fRemaining : (phase === 'work' ? workMin * 60 : brkMin * 60), focusPaused: false });
          if (soundOn) sfxStart();
        }
        function pauseTimer() {
          var elapsed = fStart > 0 ? Math.floor((Date.now() - fStart) / 1000) : 0;
          upd({ focusPaused: true, focusRemaining: Math.max(0, fRemaining - elapsed), focusStartTime: 0 });
        }
        function skipPhase() {
          var nextPhase = phase === 'work' ? 'break' : 'work';
          var nextRem = nextPhase === 'work' ? workMin * 60 : brkMin * 60;
          var nextSess = phase === 'work' ? (sessions + 1) : sessions;
          upd({ focusPhase: nextPhase, focusStartTime: 0, focusRemaining: nextRem, focusPaused: false, focusSessions: nextSess });
          if (soundOn) sfxDone();
        }
        function resetTimer() {
          upd({ focusPhase: 'work', focusStartTime: 0, focusRemaining: workMin * 60, focusPaused: false });
        }

        // Auto-advance phase when timer hits 0
        if (sec === 0 && fStart > 0 && !fPaused) {
          skipPhase();
        }

        // Animation tick (force re-render every second while running)
        React.useEffect(function() {
          if (fStart > 0 && !fPaused) {
            var t = setInterval(function() {
              upd({ focusTick: (d.focusTick || 0) + 1 });
            }, 1000);
            return function() { clearInterval(t); };
          }
        }, [fStart, fPaused, d.focusTick]);

        // SVG ring
        var ringSize = 200, ringStroke = 14;
        var ringR = (ringSize / 2) - ringStroke;
        var ringC = 2 * Math.PI * ringR;
        var ringOffset = ringC * (1 - pct / 100);
        var ringColor = phase === 'work' ? CYAN : '#10b981';

        return h('div', { className: 'selh-execfunction', style: { padding: '14px', overflowY: 'auto', flex: 1 } },
          h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, marginBottom: '10px' } }, '🎯 Focus Timer'),
          h('p', { style: { fontSize: '12px', color: _efC('#475569'), marginBottom: '14px', lineHeight: 1.6 } }, 'Pick a mode. Hit start. The ring fills as your block runs. After work, the timer auto-flips to a break. You can pause, skip, or reset at any time — no streak punishment.'),

          // Mode picker
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            FOCUS_MODES.map(function(m) {
              var picked = fm === m.id;
              return h('button', { key: m.id, onClick: function() { upd({ focusMode: m.id, focusPhase: 'work', focusStartTime: 0, focusRemaining: (m.id === 'custom' ? custW : m.work) * 60, focusPaused: false }); },
                style: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid ' + (picked ? CYAN : _efC('#cbd5e1')), background: picked ? CYAN_LIGHT : _efC('#fff'), color: picked ? CYAN_DARK : _efC('#475569'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
                m.label);
            })
          ),

          h('p', { style: { fontSize: 11, color: _efC('#64748b'), fontStyle: 'italic', marginBottom: 14 } }, mode.desc),

          mode.id === 'custom' && h('div', { style: { display: 'flex', gap: 10, marginBottom: 14, padding: 10, background: _efC('#f8fafc'), borderRadius: 8, flexWrap: 'wrap' } },
            h('label', { htmlFor: 'ef-cust-work', style: { fontSize: 11, fontWeight: 700, color: _efC('#475569') } }, 'Work min: ',
              h('input', { id: 'ef-cust-work', type: 'number', min: 1, max: 90, value: custW, onChange: function(e) { upd('focusCustomWork', parseInt(e.target.value, 10) || 25); }, style: { width: 60, marginLeft: 6, padding: 4, border: '1px solid #cbd5e1', borderRadius: 4 } })
            ),
            h('label', { htmlFor: 'ef-cust-brk', style: { fontSize: 11, fontWeight: 700, color: _efC('#475569') } }, 'Break min: ',
              h('input', { id: 'ef-cust-brk', type: 'number', min: 1, max: 30, value: custB, onChange: function(e) { upd('focusCustomBreak', parseInt(e.target.value, 10) || 5); }, style: { width: 60, marginLeft: 6, padding: 4, border: '1px solid #cbd5e1', borderRadius: 4 } })
            )
          ),

          // Ring + readout
          h('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', marginBottom: 14 } },
            h('div', { style: { position: 'relative', width: ringSize, height: ringSize } },
              h('svg', { width: ringSize, height: ringSize, 'aria-hidden': 'true', focusable: 'false', style: { transform: 'rotate(-90deg)' } },
                h('circle', { cx: ringSize / 2, cy: ringSize / 2, r: ringR, fill: 'none', stroke: _efC('#e2e8f0'), strokeWidth: ringStroke }),
                h('circle', { cx: ringSize / 2, cy: ringSize / 2, r: ringR, fill: 'none', stroke: ringColor, strokeWidth: ringStroke, strokeLinecap: 'round',
                  strokeDasharray: ringC, strokeDashoffset: ringOffset, style: { transition: 'stroke-dashoffset 0.4s ease' } })
              ),
              h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                h('div', { style: { fontSize: 11, color: _efC('#64748b'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, phase === 'work' ? '⏱ Working' : '☕ Break'),
                h('div', { style: { fontSize: 42, fontWeight: 900, color: ringColor, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1 } },
                  (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss),
                h('div', { style: { fontSize: 10, color: _efC('#94a3b8'), marginTop: 4 } }, sessions + ' work sessions today')
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' } },
              fStart > 0 && !fPaused
                ? h('button', { onClick: pauseTimer, 'aria-label': 'Pause',
                    style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#b45309', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' } }, '⏸ Pause')
                : h('button', { onClick: startTimer, 'aria-label': 'Start',
                    style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: CYAN, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' } }, fPaused ? '▶ Resume' : '▶ Start'),
              h('button', { onClick: skipPhase, 'aria-label': 'Skip',
                style: { padding: '10px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: _efC('#fff'), color: _efC('#475569'), fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, '⏭ Skip phase'),
              h('button', { onClick: resetTimer, 'aria-label': 'Reset',
                style: { padding: '10px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: _efC('#fff'), color: _efC('#475569'), fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, '↺ Reset')
            )
          ),

          // Session log
          sessions > 0 && h('div', { style: { padding: 12, background: _efC('#f0fdfa'), border: '1px solid ' + CYAN, borderRadius: 10, marginTop: 6 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: CYAN_DARK, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '✓ Today\'s focus time'),
            h('div', { style: { fontSize: 15, fontWeight: 700, color: CYAN_DARK } }, sessions + ' completed ' + (mode.id === 'custom' ? 'custom' : mode.label.replace(/^[^A-Z]+/, '').toLowerCase()) + ' work sessions · ' + (sessions * workMin) + ' minutes')
          ),

          h('p', { style: { marginTop: 14, fontSize: 11, color: _efC('#64748b'), lineHeight: 1.55, fontStyle: 'italic' } },
            '💡 Why this works: a fixed timer gives your brain permission to release vigilance. You stop micromanaging "should I be focused?" and just focus until the bell. Then a real break — not a phone hijack — before the next round.')
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── DISTRACTION LOGGER — one-tap capture + pattern dashboard ──
      // The hypothesis: students underestimate how often they're pulled.
      // One tap to log a distraction. Then patterns show by time-of-day,
      // by trigger, and by class. Awareness alone moves behavior 30-40%
      // before any intervention.
      // ══════════════════════════════════════════════════════════
      if (activeTab === 'distract') {
        var distractions = d.distractions || [];
        var triggers = [
          { id: 'phone',    label: '📱 Phone',         color: '#ef4444' },
          { id: 'social',   label: '💬 Social pull',   color: '#f59e0b' },
          { id: 'tired',    label: '😴 Tired',         color: '#a855f7' },
          { id: 'bored',    label: '😑 Bored',         color: _efC('#64748b') },
          { id: 'anxious',  label: '😰 Anxious',       color: '#ec4899' },
          { id: 'noise',    label: '🔊 Noise',         color: '#0ea5e9' },
          { id: 'hungry',   label: '🍎 Hungry/thirsty', color: '#22c55e' },
          { id: 'overwhelm',label: '🌪 Overwhelm',     color: _efC('#dc2626') },
          { id: 'other',    label: '❓ Other',         color: _efC('#475569') }
        ];

        function logDistraction(triggerId) {
          var now = new Date();
          var entry = {
            id: 'd_' + now.getTime(),
            trigger: triggerId,
            time: now.toISOString(),
            hour: now.getHours()
          };
          upd({ distractions: distractions.concat([entry]) });
          if (announceToSR) announceToSR('Distraction logged.');
          if (soundOn) sfxClick();
        }
        function removeDistraction(id) { upd({ distractions: distractions.filter(function(d) { return d.id !== id; }) }); }
        function clearAll() { openDestructiveConfirm({ type: 'clear-distractions', triggerId: 'ef-clear-distractions' }); }

        // Patterns
        var byTrigger = {};
        var byHour = new Array(24).fill(0);
        distractions.forEach(function(d) {
          byTrigger[d.trigger] = (byTrigger[d.trigger] || 0) + 1;
          if (typeof d.hour === 'number') byHour[d.hour]++;
        });
        var maxHour = Math.max.apply(null, byHour);
        var topTrigger = triggers
          .map(function(t) { return { id: t.id, label: t.label, count: byTrigger[t.id] || 0, color: t.color }; })
          .sort(function(a, b) { return b.count - a.count; })[0];

        return h('div', { className: 'selh-execfunction', style: { padding: '14px', overflowY: 'auto', flex: 1 } },
          h('h3', { id: 'ef-distraction-heading', tabIndex: -1, style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, marginBottom: '10px' } }, '📊 Distraction Logger'),
          h('p', { style: { fontSize: '12px', color: _efC('#475569'), marginBottom: '14px', lineHeight: 1.6 } }, 'Catch yourself pulled off-task? Tap the trigger. Two seconds max. After a week, patterns appear — most students don\'t realize their phone is hitting them 30+ times a day until they see it.'),

          // Quick log buttons
          h('div', { style: { padding: 12, background: _efC('#fff'), borderRadius: 12, border: '2px solid ' + CYAN, marginBottom: 14 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: CYAN_DARK, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '⚡ Quick log — tap to capture'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 } },
              triggers.map(function(t) {
                return h('button', { key: t.id, onClick: function() { logDistraction(t.id); }, 'aria-label': 'Log ' + t.label + ' distraction',
                  style: { padding: '10px 8px', borderRadius: 8, border: '1.5px solid ' + t.color, background: _efC('#fff'), color: t.color, cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
                  t.label);
              })
            )
          ),

          // Stats card
          distractions.length > 0 && h('div', { style: { padding: 12, background: 'linear-gradient(135deg, #cffafe, #ecfeff)', borderRadius: 12, marginBottom: 14 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 } },
              h('div', null,
                h('div', { style: { fontSize: 10, color: _efC('#64748b'), textTransform: 'uppercase', fontWeight: 700 } }, 'Total logged'),
                h('div', { style: { fontSize: 24, fontWeight: 900, color: CYAN_DARK } }, distractions.length)
              ),
              topTrigger && topTrigger.count > 0 && h('div', null,
                h('div', { style: { fontSize: 10, color: _efC('#64748b'), textTransform: 'uppercase', fontWeight: 700 } }, 'Top trigger'),
                h('div', { style: { fontSize: 14, fontWeight: 800, color: topTrigger.color } }, topTrigger.label),
                h('div', { style: { fontSize: 11, color: _efC('#64748b') } }, topTrigger.count + ' times (' + Math.round((topTrigger.count / distractions.length) * 100) + '%)')
              )
            )
          ),

          // Hour distribution
          distractions.length > 0 && h('div', { style: { padding: 12, background: _efC('#fff'), borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: CYAN_DARK, textTransform: 'uppercase', marginBottom: 10 } }, '⏰ When during the day'),
            h('svg', { viewBox: '0 0 240 100', style: { width: '100%', height: 100 }, 'aria-label': 'Distractions by hour' },
              byHour.map(function(count, hour) {
                if (count === 0) return null;
                var x = (hour / 23) * 230 + 5;
                var hgt = maxHour > 0 ? (count / maxHour) * 80 : 0;
                return h('g', { key: hour },
                  h('rect', { x: x, y: 90 - hgt, width: 8, height: hgt, fill: CYAN, rx: 2 }),
                  h('text', { x: x + 4, y: 86 - hgt, textAnchor: 'middle', fontSize: 7, fill: _efC('#475569') }, count)
                );
              }),
              [0, 6, 12, 18, 23].map(function(h2) {
                var x = (h2 / 23) * 230 + 5;
                return h('g', { key: 'l' + h2 },
                  h('line', { x1: x + 4, y1: 90, x2: x + 4, y2: 94, stroke: _efC('#cbd5e1'), strokeWidth: 1 }),
                  h('text', { x: x + 4, y: 100, textAnchor: 'middle', fontSize: 8, fill: _efC('#64748b') }, h2 + 'h')
                );
              })
            )
          ),

          // Trigger breakdown
          distractions.length > 0 && h('div', { style: { padding: 12, background: _efC('#fff'), borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: CYAN_DARK, textTransform: 'uppercase', marginBottom: 10 } }, '🎯 By trigger'),
            triggers.filter(function(t) { return (byTrigger[t.id] || 0) > 0; })
              .sort(function(a, b) { return (byTrigger[b.id] || 0) - (byTrigger[a.id] || 0); })
              .map(function(t) {
                var n = byTrigger[t.id];
                var pct = Math.round((n / distractions.length) * 100);
                return h('div', { key: t.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 } },
                  h('div', { style: { minWidth: 120, fontSize: 12, fontWeight: 600, color: t.color } }, t.label),
                  h('div', { style: { flex: 1, height: 12, background: _efC('#f1f5f9'), borderRadius: 4, overflow: 'hidden' } },
                    h('div', { style: { width: pct + '%', height: '100%', background: t.color, transition: 'width 0.4s' } })
                  ),
                  h('span', { style: { fontSize: 11, color: _efC('#475569'), fontFamily: 'ui-monospace, Menlo, monospace', minWidth: 50 } }, n + ' · ' + pct + '%')
                );
              })
          ),

          // Recent log + clear
          distractions.length > 0 && h('details', { style: { marginBottom: 14 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, fontWeight: 700, color: CYAN_DARK } }, '📋 Recent log entries (' + distractions.length + ')'),
            h('div', { style: { marginTop: 8, maxHeight: 200, overflowY: 'auto' } },
              distractions.slice().reverse().slice(0, 20).map(function(item) {
                var trig = triggers.find(function(t) { return t.id === item.trigger; });
                var when = new Date(item.time);
                return h('div', { key: item.id, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9' } },
                  h('span', { style: { fontSize: 11, color: trig ? trig.color : _efC('#475569'), fontWeight: 600, minWidth: 110 } }, trig ? trig.label : item.trigger),
                  h('span', { style: { fontSize: 10, color: _efC('#94a3b8'), fontFamily: 'ui-monospace, Menlo, monospace' } }, when.toLocaleString()),
                  h('button', { onClick: function() { removeDistraction(item.id); }, 'aria-label': 'Remove entry', style: { marginLeft: 'auto', background: 'transparent', border: 'none', color: _efC('#94a3b8'), cursor: 'pointer', fontSize: 14 } }, '×')
                );
              })
            ),
            h('button', { id: 'ef-clear-distractions', onClick: clearAll, style: { marginTop: 10, padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', background: _efC('#fff'), color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'Clear all entries')
          ),

          distractions.length === 0 && h('div', { style: { padding: 20, textAlign: 'center', color: _efC('#64748b'), fontSize: 13, background: _efC('#fff'), borderRadius: 10, border: '1px dashed #cbd5e1' } },
            'No distractions logged yet. Tap a trigger button above each time you catch yourself pulled.'),
          renderDestructiveConfirm()
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── HABIT TRACKER — daily check-grid with non-punitive design ──
      // ══════════════════════════════════════════════════════════
      if (activeTab === 'habit') {
        var habits = d.habits || [];
        var todayIso = (function() { var n = new Date(); var y = n.getFullYear(); var m = String(n.getMonth() + 1).padStart(2, '0'); var d2 = String(n.getDate()).padStart(2, '0'); return y + '-' + m + '-' + d2; })();
        async function addHabit() {
          var values = await askExecFunctionForm({
            title: 'Add a habit to track',
            description: 'Choose one specific action you want to notice each day.',
            submitText: 'Add habit',
            fields: [{ name: 'label', label: 'Habit', placeholder: 'Write 3 things for tomorrow before leaving class', maxLength: 140 }]
          });
          if (!values) return;
          upd({ habits: habits.concat([{ id: 'h_' + Date.now(), label: values.label, days: {} }]) });
        }
        function toggleDay(hid, dayIso) {
          var nh = habits.map(function(h2) {
            if (h2.id !== hid) return h2;
            var days = Object.assign({}, h2.days || {});
            if (days[dayIso]) delete days[dayIso]; else days[dayIso] = true;
            return Object.assign({}, h2, { days: days });
          });
          upd({ habits: nh });
        }
        function removeHabit(hid, label) { openDestructiveConfirm({ type: 'remove-habit', habitId: hid, habitLabel: label, triggerId: 'ef-remove-habit-' + hid }); }

        // Last 14 days
        var days14 = [];
        for (var i = 13; i >= 0; i--) {
          var nd = new Date(); nd.setDate(nd.getDate() - i);
          var iso = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-' + String(nd.getDate()).padStart(2, '0');
          days14.push({ iso: iso, dayName: ['Su','Mo','Tu','We','Th','Fr','Sa'][nd.getDay()], dom: nd.getDate(), today: iso === todayIso });
        }

        return h('div', { className: 'selh-execfunction', style: { padding: '14px', overflowY: 'auto', flex: 1 } },
          h('h3', { id: 'ef-habits-heading', tabIndex: -1, style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, marginBottom: '10px' } }, '✅ Habit Tracker'),
          h('p', { style: { fontSize: '12px', color: _efC('#475569'), marginBottom: '14px', lineHeight: 1.6 } }, 'Small habits, tracked daily. Missed days are gray — they don\'t break anything; this is rhythm, not streak. Best for things tied to a clear cue (morning, after school, before bed).'),

          h('button', { id: 'ef-add-habit', onClick: addHabit, style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: CYAN, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 14 } }, '+ Add a habit'),

          habits.length === 0 && h('div', { style: { padding: 20, textAlign: 'center', color: _efC('#64748b'), fontSize: 13, background: _efC('#fff'), borderRadius: 10, border: '1px dashed #cbd5e1' } },
            'No habits yet. Tap "Add a habit" to start. Good starters: "Empty my bag at the kitchen table when I get home", "Write tomorrow\'s top 3 before I leave my last class", "10-minute review before bed".'),

          habits.map(function(hb) {
            var totalDays = Object.keys(hb.days || {}).length;
            var thisWindowDays = days14.filter(function(d2) { return (hb.days || {})[d2.iso]; }).length;
            return h('div', { key: hb.id, style: { padding: 12, background: _efC('#fff'), borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 14, fontWeight: 700, color: CYAN_DARK } }, hb.label),
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
                  h('span', { style: { fontSize: 11, color: _efC('#475569'), fontFamily: 'ui-monospace, Menlo, monospace' } }, thisWindowDays + ' of 14 days · total ' + totalDays),
                  h('button', { id: 'ef-remove-habit-' + hb.id, onClick: function() { removeHabit(hb.id, hb.label); }, 'aria-label': 'Remove habit ' + hb.label, style: { minWidth: 24, minHeight: 24, background: 'transparent', border: 'none', color: _efC('#94a3b8'), cursor: 'pointer', fontSize: 14 } }, '×')
                )
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 1fr))', gap: 4 } },
                days14.map(function(d2) {
                  var done = !!(hb.days || {})[d2.iso];
                  return h('button', { key: d2.iso, onClick: function() { toggleDay(hb.id, d2.iso); },
                    'aria-label': d2.iso + (done ? ' done' : ' not done'),
                    'aria-pressed': done,
                    style: { padding: '4px 0', borderRadius: 4, border: '1px solid ' + (d2.today ? CYAN : _efC('#e2e8f0')),
                      background: done ? CYAN : (d2.today ? CYAN_LIGHT : _efC('#f8fafc')),
                      color: done ? '#fff' : (d2.today ? CYAN_DARK : _efC('#94a3b8')),
                      cursor: 'pointer', fontSize: 9, fontWeight: 700, lineHeight: 1.2 } },
                    h('div', null, d2.dayName),
                    h('div', null, d2.dom));
                })
              )
            );
          }),
          renderDestructiveConfirm()
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── DAY PLANNER — drag-to-reorder day blocks ──
      // ══════════════════════════════════════════════════════════
      if (activeTab === 'planner') {
        var dayBlocks = d.dayBlocks || [];
        async function addBlock() {
          var values = await askExecFunctionForm({
            title: 'Add a day-planner block',
            description: 'Name the task and estimate how many minutes it needs.',
            submitText: 'Add block',
            fields: [
              { name: 'label', label: 'Task or block', placeholder: 'Math homework', maxLength: 140 },
              { name: 'minutes', label: 'Estimated minutes', type: 'number', value: 25, min: 1, max: 480, step: 1, inputMode: 'numeric' }
            ]
          });
          if (!values) return;
          var min = parseInt(values.minutes, 10) || 25;
          upd({ dayBlocks: dayBlocks.concat([{ id: 'b_' + Date.now(), label: values.label, min: min, done: false }]) });
        }
        function toggleBlock(id) {
          var nb = dayBlocks.map(function(b) { return b.id === id ? Object.assign({}, b, { done: !b.done }) : b; });
          upd({ dayBlocks: nb });
        }
        function removeBlock(id) { upd({ dayBlocks: dayBlocks.filter(function(b) { return b.id !== id; }) }); }
        function moveBlock(idx, dir) {
          var nb = dayBlocks.slice();
          var target = idx + dir;
          if (target < 0 || target >= nb.length) return;
          var tmp = nb[idx]; nb[idx] = nb[target]; nb[target] = tmp;
          upd({ dayBlocks: nb });
        }
        function clearDone() { upd({ dayBlocks: dayBlocks.filter(function(b) { return !b.done; }) }); }

        var totalMin = dayBlocks.reduce(function(s, b) { return s + (b.min || 0); }, 0);
        var doneMin = dayBlocks.filter(function(b) { return b.done; }).reduce(function(s, b) { return s + (b.min || 0); }, 0);
        var pctDone = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;

        return h('div', { className: 'selh-execfunction', style: { padding: '14px', overflowY: 'auto', flex: 1 } },
          h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, marginBottom: '10px' } }, '📋 Day Planner'),
          h('p', { style: { fontSize: '12px', color: _efC('#475569'), marginBottom: '14px', lineHeight: 1.6 } }, 'Sketch today: each block is a task + estimated time. Reorder with the ↑↓ arrows. Check off as you finish. The progress bar shows minutes actually completed, not items checked.'),

          h('div', { style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' } },
            h('button', { onClick: addBlock, style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: CYAN, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, '+ Add block'),
            dayBlocks.some(function(b) { return b.done; }) && h('button', { onClick: clearDone, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: _efC('#fff'), color: _efC('#475569'), fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, '🧹 Clear completed')
          ),

          dayBlocks.length > 0 && h('div', { style: { padding: 12, background: _efC('#f0fdfa'), borderRadius: 10, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 } },
              h('span', { style: { fontSize: 11, color: CYAN_DARK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Day progress'),
              h('span', { style: { fontSize: 12, color: CYAN_DARK, fontWeight: 700 } }, doneMin + ' of ' + totalMin + ' min · ' + pctDone + '%')
            ),
            h('div', { style: { height: 8, background: _efC('#fff'), borderRadius: 4, overflow: 'hidden' } },
              h('div', { 'aria-hidden': 'true', style: { width: pctDone + '%', height: '100%', background: CYAN, transition: 'width 0.4s' } })
            )
          ),

          dayBlocks.length === 0 && h('div', { style: { padding: 20, textAlign: 'center', color: _efC('#64748b'), fontSize: 13, background: _efC('#fff'), borderRadius: 10, border: '1px dashed #cbd5e1' } },
            'Empty day. Add your first block above.'),

          dayBlocks.map(function(b, idx) {
            return h('div', { key: b.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 10, background: b.done ? _efC('#f0fdf4') : _efC('#fff'), borderRadius: 10, marginBottom: 6, border: '1px solid ' + (b.done ? '#86efac' : _efC('#e2e8f0')) } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                h('button', { onClick: function() { moveBlock(idx, -1); }, disabled: idx === 0, 'aria-label': 'Move up', style: { padding: 2, border: 'none', background: 'transparent', color: idx === 0 ? _efC('#cbd5e1') : _efC('#475569'), cursor: idx === 0 ? 'default' : 'pointer', fontSize: 11 } }, '↑'),
                h('button', { onClick: function() { moveBlock(idx, 1); }, disabled: idx === dayBlocks.length - 1, 'aria-label': 'Move down', style: { padding: 2, border: 'none', background: 'transparent', color: idx === dayBlocks.length - 1 ? _efC('#cbd5e1') : _efC('#475569'), cursor: idx === dayBlocks.length - 1 ? 'default' : 'pointer', fontSize: 11 } }, '↓')
              ),
              h('button', { onClick: function() { toggleBlock(b.id); }, 'aria-label': b.done ? 'Mark not done' : 'Mark done', 'aria-pressed': b.done,
                style: { width: 22, height: 22, borderRadius: 4, border: '1.5px solid ' + (b.done ? '#22c55e' : _efC('#475569')), background: b.done ? '#22c55e' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12, flexShrink: 0, padding: 0 } }, b.done ? '✓' : ''),
              h('div', { style: { flex: 1, fontSize: 13, color: b.done ? _efC('#64748b') : _efC('#0f172a'), fontWeight: 600, textDecoration: b.done ? 'line-through' : 'none' } }, b.label),
              h('div', { style: { fontSize: 11, color: _efC('#475569'), fontFamily: 'ui-monospace, Menlo, monospace', minWidth: 50, textAlign: 'right' } }, b.min + ' min'),
              h('button', { onClick: function() { removeBlock(b.id); }, 'aria-label': 'Remove block', style: { background: 'transparent', border: 'none', color: _efC('#94a3b8'), cursor: 'pointer', fontSize: 14 } }, '×')
            );
          })
        );
      }

      // ── Coach (AI) ──
      var coachContent = null;
      if (activeTab === 'coach') {
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;
        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now());
          }, ctx.activeSessionCode);
        } else {
          coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
              h('div', { style: { fontSize: '52px', marginBottom: '4px' } }, '🤖'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: CYAN_DARK, margin: '0 0 4px' } }, 'EF Coach'),
              h('p', { style: { fontSize: '13px', color: _efC('#475569'), margin: 0 } }, 'Tell me what is hard right now. I will name the EF domain and give you ONE thing to try.')
            ),
            coachHistory.length > 0 && h('div', {
              role: 'log', 'aria-label': 'Coach conversation', 'aria-live': 'polite',
              'aria-busy': coachLoading ? 'true' : 'false',
              style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }
            },
              coachHistory.map(function(msg, i) {
                var isUser = msg.role === 'user';
                return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                  h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? _efC('#f1f5f9') : CYAN_LIGHT, border: '1px solid ' + (isUser ? _efC('#e2e8f0') : _efC('#cffafe')), fontSize: '13px', lineHeight: 1.6, color: _efC('#1f2937') } },
                    isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: _efC('#475569'), marginBottom: '4px' } }, '🗣️ You'),
                    !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: CYAN, marginBottom: '4px' } }, '🤖 EF Coach'),
                    msg.text
                  )
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', { 'aria-label': 'Tell the coach what is hard',
                type: 'text', value: coachInput,
                onChange: function(ev) { upd('coachInput', ev.target.value); },
                onKeyDown: function(ev) {
                  if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                    var msg = coachInput.trim();
                    var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                    upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                    var p = 'You are an executive function coach for a ' + band + ' school student. They said: "' + msg + '"\n\nDo three things, briefly:\n1. Name the EF domain at play (initiation, working memory, planning, time, or flexibility) in one sentence.\n2. Validate that this is a common EF struggle (not a character flaw).\n3. Offer ONE specific, concrete thing they can try in the next 10 minutes. Pick from: 5-minute rule, brain dump, lower-the-bar, future-self note, body doubling, Pomodoro, or backward planning. Be specific to their situation.\n\nWarm and direct. Max 4 sentences total.';
                    if (window.SelHub && window.SelHub.safeCoach) {
                      window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'execfunction', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); if (awardXP) awardXP(5, 'Asked for EF help'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I am having trouble connecting. But here is the thing: noticing that something is hard is itself an EF skill. That awareness is the start of any strategy.' }]), coachLoading: false }); });
                    } else {
                      callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); if (awardXP) awardXP(5, 'Asked for EF help'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I am having trouble connecting. But here is the thing: noticing that something is hard is itself an EF skill. That awareness is the start of any strategy.' }]), coachLoading: false }); });
                    }
                  }
                },
                disabled: coachLoading || !callGemini,
                placeholder: coachLoading ? 'Coach is thinking...' : 'What is hard right now?',
                style: { flex: 1, border: '2px solid #cffafe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                onClick: function() {
                  if (!coachInput.trim() || coachLoading || !callGemini) return;
                  var msg = coachInput.trim();
                  var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                  upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                  var p = 'EF coach for ' + band + ' student. They said: "' + msg + '" Name the EF domain, validate it is common, offer ONE specific 10-minute strategy. Max 4 sentences.';
                  if (window.SelHub && window.SelHub.safeCoach) {
                    window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'execfunction', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. Notice: you reached out for help. That alone is an EF win.' }]), coachLoading: false }); });
                  } else {
                    callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. Notice: you reached out for help. That alone is an EF win.' }]), coachLoading: false }); });
                  }
                },
                disabled: coachLoading || !coachInput.trim() || !callGemini,
                'aria-label': 'Send to coach',
                style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? CYAN : _efC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
              }, coachLoading ? '⏳' : '→')
            ),
            coachHistory.length === 0 && h('div', { style: { marginTop: '14px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: _efC('#475569'), marginBottom: '6px' } }, 'Try one of these:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                [
                  'I have a project due Friday and I cannot start',
                  'I lose track of what I was doing every 5 minutes',
                  'My plan changed and now I am frozen'
                ].map(function(p) {
                  return h('button', {
                    key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                    style: { padding: '5px 10px', background: CYAN_LIGHT, border: '1px solid #cffafe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: CYAN_DARK, fontWeight: 500 }
                  }, p);
                })
              )
            )
          );
        }
      }

      // ── Print: IEP / 504 accommodations artifact ──
      var printContent = null;
      if (activeTab === 'print') {
        var domainScores = DOMAINS.map(function(dom) {
          var scores = mapAnswers[dom.id] || [];
          var sum = 0, n = 0;
          scores.forEach(function(s) { if (typeof s === 'number') { sum += s; n++; } });
          var avg = n > 0 ? (sum / n) : null;
          return { dom: dom, avg: avg, n: n };
        });
        var topDomains = domainScores.filter(function(x) { return x.avg !== null; }).sort(function(a, b) { return b.avg - a.avg; }).slice(0, 3);

        printContent = h('div', { style: { padding: 16 } },
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: _efC('#ecfeff'), borderTop: '1px solid #67e8f9', borderRight: '1px solid #67e8f9', borderBottom: '1px solid #67e8f9', borderLeft: '3px solid ' + CYAN, marginBottom: 12, fontSize: 12.5, color: CYAN_DARK, lineHeight: 1.65 } },
            h('strong', null, '🖨 Executive function snapshot + accommodation list. '),
            'A one-page artifact for student-led conferences, 504/IEP meetings, or teacher conversations. Includes your self-assessment of where executive function is hardest, your active plan, and a list of accommodations to consider asking for, grouped by which executive function domain they support.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} }, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + CYAN + ', #0e7490)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#ef-print-region, #ef-print-region * { visibility: visible !important; } ' +
            '#ef-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#ef-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'ef-print-region', style: { padding: 18, borderRadius: 12, background: _efC('#ffffff'), color: _efC('#0f172a'), border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: _efC('#0f172a') } }, 'Executive Function Snapshot'),
              h('div', { style: { fontSize: 11, color: _efC('#475569') } }, 'Dawson & Guare framework')
            ),

            h('div', { style: { padding: 10, background: _efC('#f0fdfa'), border: '1px solid #99f6e4', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: _efC('#0f766e') } },
              h('strong', null, 'How to use this artifact. '),
              'This is a starting point for conversation with a teacher, school psychologist, case manager, or 504/IEP team. Not every accommodation listed will be right for every classroom. Pick the 3 to 5 that would help most and ask for those by name. The goal is access, not advantage.'
            ),

            // Self-assessment
            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _efC('#0f172a'), marginBottom: 8 } }, 'My self-assessment'),
              !mapDone ? h('div', { style: { fontSize: 12.5, color: _efC('#475569'), fontStyle: 'italic' } }, '(map not completed yet — go to the Map tab to fill it out)') : null,
              domainScores.map(function(s) {
                return h('div', { key: s.dom.id, style: { marginBottom: 6, paddingBottom: 6, borderBottom: '1px dashed #cbd5e1' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 700, color: _efC('#0f172a') } }, s.dom.icon + ' ' + s.dom.label),
                    h('div', { style: { fontSize: 11.5, color: _efC('#475569') } }, s.avg === null ? 'not rated' : 'avg ' + s.avg.toFixed(1) + ' / 4')
                  ),
                  h('div', { style: { fontSize: 11.5, color: _efC('#475569'), lineHeight: 1.5, marginTop: 2 } }, s.dom.desc)
                );
              }),
              topDomains.length > 0 ? h('div', { style: { marginTop: 10, padding: 8, background: _efC('#ecfeff'), borderRadius: 6, border: '1px solid #67e8f9', fontSize: 12, color: _efC('#0c4a6e'), lineHeight: 1.55 } },
                h('strong', null, 'Hardest right now: '),
                topDomains.map(function(t) { return t.dom.label; }).join(', '),
                '. Accommodations matching these domains are highlighted below.'
              ) : null
            ),

            // Active plan
            planGoal ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _efC('#0f172a'), marginBottom: 8 } }, 'My active plan'),
              h('div', { style: { fontSize: 12, color: _efC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Goal'),
              h('div', { style: { fontSize: 13, color: _efC('#0f172a'), marginBottom: 8 } }, planGoal),
              planDeadline ? h('div', { style: { fontSize: 12, color: _efC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Deadline') : null,
              planDeadline ? h('div', { style: { fontSize: 13, color: _efC('#0f172a'), marginBottom: 8 } }, planDeadline) : null,
              planChunks && planChunks.filter(function(c) { return c && c.trim(); }).length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, color: _efC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Steps'),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12.5, color: _efC('#0f172a'), lineHeight: 1.6 } },
                  planChunks.filter(function(c) { return c && c.trim(); }).map(function(c, i) { return h('li', { key: i }, c); })
                )
              ) : null
            ) : null,

            // Accommodation suggestions by domain
            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _efC('#0f172a'), marginBottom: 8 } }, 'Accommodations to consider'),
              h('div', { style: { fontSize: 11.5, color: _efC('#475569'), marginBottom: 10, fontStyle: 'italic' } }, 'Grouped by the executive function domain each one supports. Bring this to a 504/IEP meeting or a teacher conversation. Pick the few that would help most in your specific classrooms.'),
              DOMAINS.map(function(dom) {
                var isTop = topDomains.some(function(t) { return t.dom.id === dom.id; });
                var accs = ACCOMMODATIONS[dom.id] || [];
                return h('div', { key: dom.id, style: { marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #cbd5e1', pageBreakInside: 'avoid' } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 700, color: _efC('#0f172a') } }, dom.icon + ' ' + dom.label),
                    isTop ? h('div', { style: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, border: '1px solid #0891b2', color: _efC('#0e7490'), background: _efC('#ecfeff') } }, 'TOP PRIORITY') : null
                  ),
                  h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 11.5, color: _efC('#0f172a'), lineHeight: 1.55 } },
                    accs.map(function(a, i) { return h('li', { key: i, style: { marginBottom: 2 } }, a); })
                  )
                );
              })
            ),

            // Footer
            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: _efC('#475569'), lineHeight: 1.5 } },
              'Sources: Dawson, P. & Guare, R. (2018), Executive Skills in Children and Adolescents (3rd ed.). Self-assessment is not a diagnostic instrument. Accommodations require a 504 plan or IEP for legal protections. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      var content = mapContent || startContent || holdContent || planContent || timeContent || coachContent || printContent;
      return h('div', { className: 'selh-execfunction', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('execfunction', h, ctx) : null),
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
