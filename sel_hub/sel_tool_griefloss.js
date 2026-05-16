// ═══════════════════════════════════════════════════════════════
// sel_tool_griefloss.js — Grief & Loss Companion
// A guided self-companion for adolescents experiencing loss:
// death of a person, death of a pet, friendship loss, family
// transitions (divorce, moving, parent deployment), loss of
// health, identity loss, ambiguous loss. NOT a clinical
// instrument; a structured space for naming what is being
// carried.
//
// Built on:
//   - Worden's Tasks of Mourning (1991, 2018 4th ed.) — the four
//     tasks framework, widely taught in grief counseling
//   - Stroebe & Schut Dual Process Model (1999) — oscillation
//     between loss-orientation and restoration-orientation
//   - Boss's framework of Ambiguous Loss (1999, 2006)
//   - Worden's adaptation for children and adolescents (2018)
//
// Safety: includes prominent guidance about when grief needs a
// clinician, and explicitly screens for thoughts of joining the
// deceased (referral to Crisis Companion / 988).
//
// Registered tool ID: "griefLoss"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('griefLoss'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-griefloss')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-griefloss';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Worden's 4 Tasks of Mourning (modernized phrasing)
  var TASKS = [
    {
      id: 'accept',
      number: 1,
      label: 'Accept the reality of the loss',
      icon: '👁️',
      color: '#6366f1',
      blurb: 'Not "be okay with" the loss. Accept that it has happened. The brain often holds onto disbelief ("they\'ll call later," "I\'ll see them at school") long after the cognitive knowing.',
      prompts: [
        'When did you first hear / understand what happened?',
        'Are there moments where you forget it has happened, and then remember?',
        'What rituals or moments have helped the reality settle in (a funeral, a service, a goodbye, a returned object)?'
      ],
      whatHelps: 'Saying it out loud. Going to the place. Looking at photos. Writing about it. Not rushing it.',
      whatHurts: 'Being told to "stay positive" or "they\'re in a better place" before you\'ve even let the loss land.'
    },
    {
      id: 'pain',
      number: 2,
      label: 'Process the pain of grief',
      icon: '🌊',
      color: '#0ea5e9',
      blurb: 'Grief is not a feeling; it\'s every feeling. Sadness, anger, guilt, relief, anxiety, numbness, longing, sometimes love so intense it hurts. ALL of these are normal. The work is to let them through, not to push them away.',
      prompts: [
        'What emotions have you been feeling? Even the ones you think you "shouldn\'t" be feeling?',
        'Where in your body do you feel the grief?',
        'Are there feelings you\'re afraid of (anger at the deceased, relief, jealousy)? These are normal in grief; they don\'t mean you didn\'t love them.'
      ],
      whatHelps: 'Letting yourself cry. Talking with someone who can hear hard feelings. Movement (walking, sports). Creative work (art, music, writing). Hard physical activity when you\'re angry. Soft activities when you\'re tender.',
      whatHurts: 'Suppression. "I should be over this by now." Substance use as the main coping. Being alone all the time.'
    },
    {
      id: 'adjust',
      number: 3,
      label: 'Adjust to a world without them',
      icon: '🌅',
      color: '#22c55e',
      blurb: 'The world is genuinely different now. Some of the adjustments are practical (who do I sit with at lunch?), some are emotional (who do I turn to when I\'m scared?), and some are about identity (who am I without them?).',
      prompts: [
        'What practical things have changed in your day-to-day?',
        'What role did the person play in your life that you now have to fill or replace differently?',
        'Has anything about who you ARE shifted since the loss?'
      ],
      whatHelps: 'Naming the specific role they played. Letting the role be filled in a new way over time, not all at once. New routines. New skills you didn\'t know you needed.',
      whatHurts: 'Rushing to fill the gap (a new partner, a new pet, a new project right away). Some gap needs to be felt before it gets filled.'
    },
    {
      id: 'connect',
      number: 4,
      label: 'Find an enduring connection while moving forward',
      icon: '🕯️',
      color: '#f59e0b',
      blurb: 'You don\'t leave the dead behind; you carry them differently. The task is finding the place for them in your life now — usually a place that\'s smaller in time but enduring. You move forward AND you stay connected. Both.',
      prompts: [
        'What about them do you want to carry forward?',
        'What rituals or moments would you want to keep — an annual visit, wearing something of theirs, telling stories on their birthday?',
        'How do you imagine your relationship with them, over time?'
      ],
      whatHelps: 'Anniversary rituals (visits to a grave, a meal they loved, a story session). Carrying an object. Letters you don\'t send. Doing something they would have valued. Telling their stories to people who didn\'t know them.',
      whatHurts: 'Either extreme: pretending they never existed, OR keeping them so present that you can\'t move forward.'
    }
  ];

  // Types of losses (so students know what counts)
  var LOSS_TYPES = [
    { id: 'death_person', label: 'Death of a person', desc: 'Family member, friend, mentor, classmate.' },
    { id: 'death_pet', label: 'Death of a pet', desc: 'Real grief, often dismissed by others. It counts.' },
    { id: 'family_change', label: 'Family change', desc: 'Parents divorcing, a parent moving away, a sibling leaving, a parent in prison or deployed.' },
    { id: 'friendship', label: 'Loss of a friendship', desc: 'A close friendship ending, a friend group changing, a best friend moving away.' },
    { id: 'health', label: 'Loss of health', desc: 'A new diagnosis, an injury, a change in what your body can do.' },
    { id: 'identity', label: 'Loss tied to identity', desc: 'Coming out and family rejection. A culture or language fading. A community changing.' },
    { id: 'place', label: 'Loss of a place', desc: 'Moving away, losing a home (fire, eviction, financial), losing a community.' },
    { id: 'role', label: 'Loss of a role', desc: 'Caregiving role ending, leaving a team, a relationship ending where you were "the one who".' },
    { id: 'future', label: 'Loss of an imagined future', desc: 'The life you thought you\'d have. Plans that changed. Dreams that have to be different now.' },
    { id: 'ambiguous', label: 'Ambiguous loss', desc: 'Loss without closure: a missing person, a parent with dementia, a friend who has changed beyond recognition, anyone "there but not there."' }
  ];

  function defaultState() {
    return {
      view: 'home',
      loss: '',                  // what is being grieved (free text)
      lossType: '',              // category
      whoOrWhat: '',             // name (private)
      taskNotes: {},             // taskId -> reflection text
      currentTask: null,         // which task is in focus
      letter: '',                // a letter to the lost (or about the loss)
      ritualPlan: '',            // anniversary / ritual ideas
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('griefLoss', {
    icon: '🕯️',
    label: 'Grief & Loss',
    desc: 'A guided self-companion for grief. Works for death of a person or pet, family changes, friend losses, identity losses, ambiguous loss. Built on Worden\'s Tasks of Mourning and the Dual Process Model. Includes strong pointers to clinical support for severe or complicated grief.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.griefLoss || defaultState();
      function setG(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.griefLoss) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { griefLoss: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setG({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🕯️ Grief & Loss'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A guided companion for grief, on your own time.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🕯️' },
          { id: 'name', label: 'Name the loss', icon: '✍️' },
          { id: 'tasks', label: 'The four tasks', icon: '🌊' },
          { id: 'letter', label: 'Letter', icon: '✉️' },
          { id: 'rituals', label: 'Rituals', icon: '🌿' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Grief and Loss sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fb7185' : '#334155'),
                background: active ? 'rgba(251,113,133,0.18)' : '#1e293b',
                color: active ? '#fecdd3' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      // Strong safety banner — always visible across all views
      function safetyBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🆘 Please read: '),
          'Grief is not the same as suicidality. But sometimes, in grief, people have thoughts about wanting to be with the person who died. If you\'re having those thoughts, that is a moment for an adult, not for this tool alone. Call 988 (Suicide and Crisis Lifeline), text HOME to 741741, or open the Crisis Companion in this SEL Hub. You deserve company in this. You do not have to carry it alone.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is a companion, not therapy. Severe grief, complicated grief, or grief tied to trauma deserves a counselor or grief-trained therapist. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fecdd3', marginBottom: 4 } }, 'Grief is the price of loving.'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Grief is not a problem to be fixed. It is the natural response to loss. The goal of grief work is not to "get over it" — that\'s a myth. The goal is to carry what has happened in a way that lets you keep living, while staying connected to what you loved.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'There is no timeline. There are no stages you must go through in order. There is only the work of letting reality land, feeling what comes, adjusting to a different world, and finding the new place for what you have lost. This tool is a companion for that work.'
            )
          ),

          // Loss types (so students know what counts)
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fda4af', marginBottom: 8 } }, '📝 Many things count as loss'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.6, fontStyle: 'italic' } }, 'Not all grief comes from death. If your loss is on this list, the work in this tool applies to you.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 } },
              LOSS_TYPES.map(function(lt) {
                return h('div', { key: lt.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid #fb7185' } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, lt.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, lt.desc)
                );
              })
            )
          ),

          // Dual Process explanation
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #818cf8', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '🌊 You will oscillate. That is normal.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Grief researchers Stroebe and Schut described how grief actually works: people don\'t move in a straight line from "broken" to "healed." They oscillate between LOSS-orientation (sitting with the pain, missing the person) and RESTORATION-orientation (doing daily life, eating, going to school, even laughing). BOTH are part of grief. The oscillation is the work. It is healthy. You are not betraying anyone when you have a good day, and you are not stuck when you have a hard day.'
            )
          ),

          // Roadmap
          stepCard('✍️ Name the loss', 'Optional private space to name what you\'re grieving. Your data stays on this device.', function() { goto('name'); }, '#fb7185'),
          stepCard('🌊 The four tasks', 'Worden\'s tasks: accept reality, process pain, adjust to a changed world, find an enduring connection. Not stages in order; tasks you move between.', function() { goto('tasks'); }, '#0ea5e9'),
          stepCard('✉️ Write a letter', 'A letter to the person, the pet, the place, or to your past self. You don\'t have to send it.', function() { goto('letter'); }, '#a855f7'),
          stepCard('🌿 Rituals', 'Plan anniversary rituals, ongoing ways to stay connected, things you want to do to keep them present.', function() { goto('rituals'); }, '#22c55e'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NAME — describe the loss
      // ═══════════════════════════════════════════════════════════
      function renderName() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', marginBottom: 14, fontSize: 13, color: '#fecdd3', lineHeight: 1.65 } },
            h('strong', null, '✍️ Name what you\'re carrying. '),
            'You can name as much or as little as you want. Nothing is shared anywhere. This is just for you to have words for it.'
          ),

          // Type
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-type', style: { display: 'block', fontSize: 12, color: '#fda4af', fontWeight: 800, marginBottom: 6 } }, 'What kind of loss is this?'),
            h('select', { id: 'g-type', value: d.lossType || '',
              onChange: function(e) { setG({ lossType: e.target.value }); },
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
              h('option', { value: '' }, '(pick one)'),
              LOSS_TYPES.map(function(lt) { return h('option', { key: lt.id, value: lt.id }, lt.label); })
            )
          ),

          // Who/what
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-who', style: { display: 'block', fontSize: 12, color: '#fda4af', fontWeight: 800, marginBottom: 6 } }, 'Who or what (a name, a relationship, a place — whatever fits)'),
            h('input', { id: 'g-who', type: 'text', value: d.whoOrWhat || '',
              placeholder: 'e.g. My grandma. My dog Rex. My friend group.',
              onChange: function(e) { setG({ whoOrWhat: e.target.value }); },
              style: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14 } })
          ),

          // Description
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-desc', style: { display: 'block', fontSize: 12, color: '#fda4af', fontWeight: 800, marginBottom: 6 } }, 'What happened?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'In your own words. As much or as little as feels okay right now.'),
            h('textarea', { id: 'g-desc', value: d.loss || '',
              placeholder: '',
              onChange: function(e) { setG({ loss: e.target.value }); },
              style: { width: '100%', minHeight: 140, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('tasks'); }, 'aria-label': 'Continue to the four tasks',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '→ Continue to the four tasks')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TASKS — Worden's 4 tasks of mourning
      // ═══════════════════════════════════════════════════════════
      function renderTasks() {
        var activeTaskId = d.currentTask || TASKS[0].id;
        var active = TASKS.find(function(t) { return t.id === activeTaskId; }) || TASKS[0];

        function setTaskNotes(taskId, val) {
          var n = Object.assign({}, (d.taskNotes || {}));
          n[taskId] = val;
          setG({ taskNotes: n });
        }

        return h('div', null,
          safetyBanner(),

          // Task selector (4 cards)
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            TASKS.map(function(t) {
              var isActive = t.id === activeTaskId;
              var hasNotes = (d.taskNotes || {})[t.id];
              return h('button', { key: t.id,
                onClick: function() { setG({ currentTask: t.id }); },
                'aria-label': 'Task ' + t.number + ': ' + t.label, 'aria-pressed': isActive,
                style: { textAlign: 'left', padding: 10, borderRadius: 8, border: '2px solid ' + (isActive ? t.color : '#334155'), background: isActive ? t.color + '22' : '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                  h('span', { style: { fontSize: 16 } }, t.icon),
                  h('span', { style: { fontSize: 10, color: t.color, fontWeight: 800 } }, 'Task ' + t.number),
                  hasNotes ? h('span', { style: { marginLeft: 'auto', fontSize: 10, color: t.color } }, '✓') : null
                ),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: isActive ? t.color : '#cbd5e1', marginTop: 4, lineHeight: 1.4 } }, t.label)
              );
            })
          ),

          // Active task card
          h('div', { style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + active.color + '66', borderLeft: '4px solid ' + active.color, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 36 } }, active.icon),
              h('div', null,
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Task ' + active.number + ' of 4'),
                h('h3', { style: { margin: '2px 0 0', color: active.color, fontSize: 19, fontWeight: 900 } }, active.label)
              )
            ),
            h('p', { style: { margin: '0 0 14px', color: '#e2e8f0', fontSize: 14, lineHeight: 1.75 } }, active.blurb),

            // Prompts
            h('div', { style: { padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: active.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Reflection prompts'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.8, fontStyle: 'italic' } },
                active.prompts.map(function(p, i) { return h('li', { key: i, style: { marginBottom: 4 } }, p); })
              )
            ),

            // What helps / what hurts
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 12 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✓ Helps'),
                h('p', { style: { margin: 0, color: '#dcfce7', fontSize: 12.5, lineHeight: 1.65 } }, active.whatHelps)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#fecaca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✕ Hurts more than it helps'),
                h('p', { style: { margin: 0, color: '#fee2e2', fontSize: 12.5, lineHeight: 1.65 } }, active.whatHurts)
              )
            ),

            // Notes
            h('label', { htmlFor: 'g-task-' + active.id, style: { display: 'block', fontSize: 12, color: '#cbd5e1', fontWeight: 700, marginBottom: 6 } }, 'Your reflection (optional)'),
            h('textarea', { id: 'g-task-' + active.id, value: (d.taskNotes || {})[active.id] || '',
              placeholder: 'Whatever is on this task right now. You can come back.',
              onChange: function(e) { setTaskNotes(active.id, e.target.value); },
              style: { width: '100%', minHeight: 110, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', fontSize: 13, color: '#c7d2fe', lineHeight: 1.7 } },
            h('strong', null, '🌊 Remember: '),
            'these are TASKS, not STAGES. You move between them, not through them in order. Today might be heavy on Task 2 (the pain) and weeks from now might be more about Task 4 (connection). Both are real.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LETTER — write a letter
      // ═══════════════════════════════════════════════════════════
      function renderLetter() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '✉️ Writing a letter you don\'t have to send. '),
            'This is a long-standing grief practice. You can write to the person who died, the pet, the place, the friendship — or to your past self before the loss. Say what you didn\'t get to say. Say what you wish you had said. Say what you would say now. Or just say what is on your mind. No rules.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } },
              'Some openings if you don\'t know how to start:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              h('li', null, '"There\'s something I never told you..."'),
              h('li', null, '"I wish you could see this..."'),
              h('li', null, '"I\'m angry at you for..."'),
              h('li', null, '"I miss you most when..."'),
              h('li', null, '"Here\'s what I\'m carrying that you would understand..."'),
              h('li', null, '"To the version of me from before..."')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7' } },
            h('label', { htmlFor: 'g-letter', style: { display: 'block', fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, 'Your letter'),
            h('textarea', { id: 'g-letter', value: d.letter || '',
              placeholder: 'Dear...',
              onChange: function(e) { setG({ letter: e.target.value }); },
              style: { width: '100%', minHeight: 280, padding: 12, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.85, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RITUALS
      // ═══════════════════════════════════════════════════════════
      function renderRituals() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '🌿 Rituals are how love keeps a place. '),
            'Cultures across human history have developed rituals around loss because they work: they give grief a CONTAINER, so it doesn\'t have to be carried as raw weight all the time. A ritual can be elaborate or it can be a candle on the windowsill once a year. What matters is that you choose it on purpose.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } },
              'Some ideas for rituals (pick what fits, ignore the rest):'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.85 } },
              h('li', null, 'Visit a grave, the ocean, a place that mattered, on a specific date each year.'),
              h('li', null, 'Cook their favorite meal on their birthday.'),
              h('li', null, 'Light a candle on the anniversary, or every Sunday, or any time you need to.'),
              h('li', null, 'Wear something of theirs (a ring, a jacket, a piece of jewelry).'),
              h('li', null, 'Donate or volunteer in their name annually.'),
              h('li', null, 'Tell a specific story about them to a specific person who didn\'t know them.'),
              h('li', null, 'Have a meal with people who also miss them.'),
              h('li', null, 'Write them a letter every year on the anniversary.'),
              h('li', null, 'Plant something, name something, build something, in their memory.'),
              h('li', null, 'Do a thing they always wanted to do but didn\'t get to.')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
            h('label', { htmlFor: 'g-rituals', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, 'My ritual plan'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'What rituals do you want to keep, build, or invent? What dates matter? What objects? What places?'),
            h('textarea', { id: 'g-rituals', value: d.ritualPlan || '',
              placeholder: 'Once a year on...   On their birthday I want to...   I want to carry...',
              onChange: function(e) { setG({ ritualPlan: e.target.value }); },
              style: { width: '100%', minHeight: 180, padding: 12, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fecdd3', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'This is your private work. Print only if you want a paper copy; nothing is shared anywhere.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'grief-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#grief-print-region, #grief-print-region * { visibility: visible !important; } ' +
              '#grief-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Grief & Loss Companion'),
              h('h1', { style: { margin: 0, fontSize: 24, fontWeight: 900 } }, d.whoOrWhat ? 'For ' + d.whoOrWhat : 'My grief work'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            d.loss ? h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'What happened'),
              h('p', { style: { margin: 0, color: '#0f172a', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, d.loss)
            ) : null,

            // Tasks
            TASKS.map(function(t) {
              var notes = (d.taskNotes || {})[t.id];
              if (!notes || !notes.trim()) return null;
              return h('div', { key: t.id, style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 6, background: t.color, color: '#fff' } },
                  h('span', { style: { fontSize: 16 } }, t.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Task ' + t.number + ': ' + t.label)
                ),
                h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, notes)
              );
            }),

            d.letter ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My letter'),
              h('p', { style: { margin: 0, color: '#0f172a', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', padding: 10, background: '#fdf2f8', borderLeft: '3px solid #be123c' } }, d.letter)
            ) : null,

            d.ritualPlan ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'Rituals'),
              h('p', { style: { margin: 0, color: '#0f172a', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, d.ritualPlan)
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Worden\'s Tasks of Mourning (2018, 4th ed.). Dual Process Model: Stroebe and Schut (1999). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('griefLoss', h, ctx) : null),

          // Strong safety frame first
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16 } }, '🆘 Read this first'),
            h('p', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'Grief is a normal response to loss. It is not a mental illness. BUT — sometimes grief gets complicated and crosses into territory that needs a professional:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fecaca', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Thoughts of wanting to die or join the deceased.'),
              h('li', null, 'Inability to function (going to school, eating, sleeping) for weeks.'),
              h('li', null, 'Heavy substance use as the main coping.'),
              h('li', null, 'Persistent guilt that you somehow caused the loss.'),
              h('li', null, 'Disturbing intrusive memories that won\'t stop (signs of trauma layered on grief).'),
              h('li', null, 'Continued severe impairment more than 12 months later (what is now called Prolonged Grief Disorder).')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'For any of these, please get clinical support. Call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 for immediate crisis. For ongoing support, a school psych, counselor, or grief-trained therapist is the right next step.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A structured companion for grief work — a private space to name what was lost, work through the four tasks of mourning, write a letter, and plan rituals. It works for many kinds of loss: death of a person or pet, family transitions, friendship loss, identity loss, ambiguous loss.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'It is not a substitute for human company in grief, and it is not therapy. The work of grief is relational, and tools alone do not do it. The tool is here for the moments between conversations, and to give the work some shape.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'Where the framework comes from'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Four Tasks of Mourning are from J. William Worden\'s "Grief Counseling and Grief Therapy" (1991, now in its 5th edition 2018). Worden\'s framework replaced the "five stages of grief" (Kübler-Ross) as the dominant clinical model because the tasks language better describes what people actually do in grief: they DO the work, in any order, sometimes multiple times. The stages model is widely misunderstood and has limited clinical utility for grief itself (Kübler-Ross developed it for dying patients, not bereaved survivors).'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Dual Process Model is from Margaret Stroebe and Henk Schut (1999) — the empirical finding that grievers oscillate between loss-orientation and restoration-orientation, and that BOTH are necessary. The framework of ambiguous loss is Pauline Boss\'s (1999) — naming loss without closure as a distinct kind of loss with its own dynamics.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Worden, J. W. (2018)', 'Grief Counseling and Grief Therapy: A Handbook for the Mental Health Practitioner (5th ed.), Springer', 'The foundational text. Includes the four tasks framework and clinical guidance.', null),
            sourceCard('Stroebe, M. and Schut, H. (1999)', '"The Dual Process Model of Coping with Bereavement," Death Studies, 23(3), 197-224', 'The empirical paper on grief oscillation.', null),
            sourceCard('Boss, P. (1999)', 'Ambiguous Loss: Learning to Live with Unresolved Grief, Harvard University Press', 'The foundational framework for losses without closure.', null),
            sourceCard('Dougy Center for Grieving Children', 'dougy.org', 'National Center for Grieving Children & Families. Free resources for adolescent and child grief.', 'https://www.dougy.org/'),
            sourceCard('National Alliance for Children\'s Grief', 'childrengrieve.org', 'Resource directory and educational materials for grief support for youth.', 'https://childrengrieve.org/'),
            sourceCard('Worden, J. W. (2018)', 'Children and Grief: When a Parent Dies, Guilford Press', 'Worden\'s adaptation of the tasks for children and adolescents.', null),
            sourceCard('American Psychological Association', 'Prolonged Grief Disorder', 'APA position on persistent grief that may warrant clinical attention.', 'https://www.apa.org/topics/grief')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A tool cannot grieve with you. Human company is the core of grief work. Use this tool alongside people, not instead of them.'),
              h('li', null, 'Grief is culturally specific. Different traditions have different timelines, rituals, beliefs about the afterlife, and conventions about expression. This tool draws mostly on Western clinical literature; it should be paired with the practices of your own culture, faith, or family.'),
              h('li', null, 'Pet loss, friendship loss, and ambiguous loss are often minimized by others ("it\'s just a dog," "you\'ll make new friends"). The grief is real even when the loss is dismissed. The tool intentionally includes these.'),
              h('li', null, 'For students who experienced a traumatic loss (suicide, homicide, accident witnessed), the grief is often layered with trauma. Grief work and trauma work are different; trauma-informed grief therapy is the right approach. A clinician matters.'),
              h('li', null, 'Some loss is structural (a child of a deported parent, a child whose community is gentrified, a young person whose climate future has been stolen). These losses are real and the grief is legitimate; AND the structural cause matters and is its own work.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: '#fecdd3', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'After a death in the school community, do not assume "everyone is fine." Make space for grief in Crew (see the Heavy News Day protocol in Crew Protocols). Use this tool with students individually after offering it. Do not require it. Be especially attentive to students whose grief is being minimized (a friend rather than a family member, a same-sex partner, a beloved pet). For children whose parent has died, work with the Dougy Center model: peer grief groups, sustained contact, integration into school not isolation from it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fda4af', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'name') body = renderName();
      else if (view === 'tasks') body = renderTasks();
      else if (view === 'letter') body = renderLetter();
      else if (view === 'rituals') body = renderRituals();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Grief and Loss Companion' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
