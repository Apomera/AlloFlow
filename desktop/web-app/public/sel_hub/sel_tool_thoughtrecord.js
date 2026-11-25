// ═══════════════════════════════════════════════════════════════
// sel_tool_thoughtrecord.js — CBT Thought Record
// The 7-column thought record from Cognitive Behavioral Therapy
// (Beck 1979; Burns 1980; Padesky 2015 Mind Over Mood). Columns:
//   1. Situation
//   2. Emotion (and 0-100 rating)
//   3. Automatic thought
//   4. Evidence FOR the thought
//   5. Evidence AGAINST the thought
//   6. Balanced thought
//   7. Emotion re-rating
// Saves entries over time so the student can see patterns.
// Registered tool ID: "thoughtRecord"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('thoughtRecord'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-thoughtrecord')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-thoughtrecord';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // 10 common cognitive distortions (Burns 1980; widely taught)
  var DISTORTIONS = [
    { id: 'allOrNothing', label: 'All-or-nothing thinking', desc: 'I see it as totally good or totally bad, nothing in between.' },
    { id: 'overGen', label: 'Overgeneralizing', desc: 'One bad thing means everything is bad / will always be bad.' },
    { id: 'mentalFilter', label: 'Mental filter', desc: 'I focus only on the negative; the good stuff does not register.' },
    { id: 'discountPositive', label: 'Discounting the positive', desc: 'When something good happens, I find a reason it does not count.' },
    { id: 'jumpToConclusions', label: 'Jumping to conclusions', desc: 'I assume the worst (mind-reading or fortune-telling) without evidence.' },
    { id: 'catastrophizing', label: 'Catastrophizing', desc: 'I imagine the worst-case scenario and treat it as likely.' },
    { id: 'emotionalReasoning', label: 'Emotional reasoning', desc: 'Because I feel it strongly, I assume it must be true.' },
    { id: 'shoulds', label: 'Should statements', desc: 'I beat myself up with "should" / "must" / "have to."' },
    { id: 'labeling', label: 'Labeling', desc: 'I call myself a name ("I am a failure") instead of describing a specific behavior.' },
    { id: 'personalize', label: 'Personalizing', desc: 'I assume something is about me when it might not be.' }
  ];

  function defaultState() {
    return {
      view: 'new',
      entries: [],   // [{ id, date, situation, emotion1, emotion1Rating, thought, evidenceFor, evidenceAgainst, distortions, balanced, emotion2Rating }]
      activeEntry: null,
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function uid() { return 'e' + Math.random().toString(36).slice(2, 9); }

  window.SelHub.registerTool('thoughtRecord', {
    icon: '📓',
    label: 'CBT Thought Record',
    desc: 'The 7-column thought record from Cognitive Behavioral Therapy. Walk through a hard moment: situation, emotion, automatic thought, evidence for and against, balanced thought, emotion re-rating. Saves over time so you can see your patterns. Built on Beck\'s thought record, in the 7-column form developed by Padesky.',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _thT = (ctx && ctx.theme) || {};
      var _thHC = !!_thT.isContrast, _thL = !_thHC && !_thT.isDark;
      var _th_BGL = {'#1e293b':'#ffffff','#0f172a':'#f8fafc'}, _th_BGH = {'#1e293b':'#000000','#0f172a':'#000000','#fff':'#000000'};
      var _th_FGL = {'#cbd5e1':'#334155','#c4b5fd':'#5b21b6','#94a3b8':'#475569','#e9d5ff':'#581c87','#e2e8f0':'#1e293b','#fde68a':'#92400e','#c7d2fe':'#312e81','#fcd34d':'#78350f','#bbf7d0':'#166534','#22c55e':'#15803d','#ec4899':'#9d174d','#0ea5e9':'#0369a1','#f59e0b':'#92400e','#a78bfa':'#5b21b6','#6366f1':'#4338ca'}, _th_FGH = {'#cbd5e1':'#ffff00','#c4b5fd':'#ffff00','#94a3b8':'#ffff00','#e9d5ff':'#ffff00','#ec4899':'#ffff00','#22c55e':'#ffff00','#fff':'#ffff00','#e2e8f0':'#ffff00','#fde68a':'#ffff00','#bbf7d0':'#ffff00','#c7d2fe':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00','#0ea5e9':'#ffff00','#f59e0b':'#ffff00','#a78bfa':'#ffff00','#6366f1':'#ffff00'};
      var _th_BDL = {'#334155':'#cbd5e1','#475569':'#94a3b8','#1e293b':'#e2e8f0'}, _th_BDH = {'#334155':'#ffff00','#a78bfa':'#ffff00','#475569':'#ffff00','#1e293b':'#ffff00','#cbd5e1':'#ffff00','#7c3aed':'#ffff00','#f59e0b':'#ffff00','#0ea5e9':'#ffff00','#ec4899':'#ffff00','#22c55e':'#ffff00','#6366f1':'#ffff00','#94a3b8':'#ffff00'};
      var _thBg = function(h){ return _thHC ? (_th_BGH[h]||h) : (_thL ? (_th_BGL[h]||h) : h); };
      var _th_FGD = {'#6366f1':'#818cf8'};
      var _thFg = function(h){ return _thHC ? (_th_FGH[h]||h) : (_thL ? (_th_FGL[h]||h) : (_th_FGD[h]||h)); };
      var _thBd = function(h){ return _thHC ? (_th_BDH[h]||h) : (_thL ? (_th_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx && ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _thBand = (ctx && ctx.gradeBand) || 'high';

      var TR_VIEWS = ['new', 'past', 'print', 'about'];
      function clampRating(v, fallback) {
        if (v === '' || v === null || v === undefined) return fallback;
        var n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(0, Math.min(100, Math.round(n)));
      }
      function normalizeDraft(raw) {
        var r = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
        return {
          situation: typeof r.situation === 'string' ? r.situation : '',
          emotion1: typeof r.emotion1 === 'string' ? r.emotion1 : '',
          emotion1Rating: clampRating(r.emotion1Rating, 50),
          thought: typeof r.thought === 'string' ? r.thought : '',
          evidenceFor: typeof r.evidenceFor === 'string' ? r.evidenceFor : '',
          evidenceAgainst: typeof r.evidenceAgainst === 'string' ? r.evidenceAgainst : '',
          distortions: Array.isArray(r.distortions) ? r.distortions.filter(function(x) { return typeof x === 'string'; }) : [],
          balanced: typeof r.balanced === 'string' ? r.balanced : '',
          emotion2Rating: clampRating(r.emotion2Rating, 50)
        };
      }
      function normalizeEntries(raw) {
        if (!Array.isArray(raw)) return [];
        return raw.filter(function(item) { return item && typeof item === 'object' && !Array.isArray(item); }).map(function(item, idx) {
          var norm = normalizeDraft(item);
          return Object.assign(norm, {
            id: typeof item.id === 'string' && item.id ? item.id : ('e_' + idx),
            date: typeof item.date === 'string' ? item.date : ''
          });
        });
      }
      var rawTR = (labToolData.thoughtRecord && typeof labToolData.thoughtRecord === 'object' && !Array.isArray(labToolData.thoughtRecord)) ? labToolData.thoughtRecord : {};
      var d = Object.assign(defaultState(), rawTR);
      d.entries = normalizeEntries(rawTR.entries);
      function setTR(patchOrFn) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var safePrev = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
          var rawPrior = (safePrev.thoughtRecord && typeof safePrev.thoughtRecord === 'object' && !Array.isArray(safePrev.thoughtRecord)) ? safePrev.thoughtRecord : {};
          var prior = Object.assign(defaultState(), rawPrior);
          var patch = typeof patchOrFn === 'function' ? patchOrFn(prior) : patchOrFn;
          var next = Object.assign({}, prior, patch);
          if (patch && patch.entries) next.lastUpdated = todayISO();
          return Object.assign({}, safePrev, { thoughtRecord: next });
        });
      }
      function scanThoughtText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed || !window.SelHub) return false;
        var blocked = false;
        if (typeof window.SelHub.safeRehearseCheck === 'function') {
          var chk = window.SelHub.safeRehearseCheck(trimmed, { toolId: 'thoughtRecord', onSafetyFlag: onSafetyFlag });
          if (chk && chk.action === 'block') blocked = true;
        }
        if (!blocked && typeof window.SelHub.scanForCrisis === 'function') {
          var scan = window.SelHub.scanForCrisis(trimmed);
          if (scan && scan.triggered) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'thoughtRecord', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
        }
        if (blocked) {
          setTR({ _crisisTier: 3 });
          if (typeof window.SelHub.showCrisisModal === 'function') {
            window.SelHub.showCrisisModal({ toolName: 'CBT Thought Record', contentSnippet: trimmed });
          }
        }
        return blocked;
      }
      var view = TR_VIEWS.indexOf(d.view) !== -1 ? d.view : 'new';
      function goto(v) { setTR({ view: TR_VIEWS.indexOf(v) !== -1 ? v : 'new' }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid ' + _thBd('#334155'), borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _thFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _thFg('#c4b5fd'), fontSize: 22, fontWeight: 900 } }, '📓 CBT Thought Record'),
            h('div', { style: { fontSize: 12, color: _thFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Walk through a hard moment in seven steps.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'new', label: 'New entry', icon: '+' },
          { id: 'past', label: 'Past entries', icon: '📚' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Thought Record sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, idx) {
            var active = view === t.id;
            return h('button', { key: t.id, id: 'tr-tab-' + t.id, 'aria-controls': 'tr-panel-' + t.id,
              tabIndex: active ? 0 : -1,
              onClick: function() { goto(t.id); },
              onKeyDown: function(e) {
                var nextIdx = idx;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % tabs.length;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + tabs.length) % tabs.length;
                else if (e.key === 'Home') nextIdx = 0;
                else if (e.key === 'End') nextIdx = tabs.length - 1;
                else return;
                e.preventDefault();
                goto(tabs[nextIdx].id);
                var target = document.getElementById('tr-tab-' + tabs[nextIdx].id);
                if (target && typeof target.focus === 'function') target.focus();
              },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? _thBd('#a78bfa') : _thBd('#334155')),
                background: active ? (_thHC ? '#000000' : 'rgba(167,139,250,0.18)') : _thBg('#1e293b'),
                color: active ? _thFg('#e9d5ff') : _thFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: _thHC ? '#000000' : 'rgba(167,139,250,0.10)', borderTop: '1px solid ' + (_thHC ? '#ffff00' : 'rgba(167,139,250,0.4)'), borderRight: '1px solid ' + (_thHC ? '#ffff00' : 'rgba(167,139,250,0.4)'), borderBottom: '1px solid ' + (_thHC ? '#ffff00' : 'rgba(167,139,250,0.4)'), borderLeft: '3px solid ' + _thBd('#a78bfa'), marginBottom: 12, fontSize: 12.5, color: _thFg('#e9d5ff'), lineHeight: 1.65 } },
          h('strong', null, '📓 What this is: '),
          'a CBT (Cognitive Behavioral Therapy) reflection. CBT helps when the thoughts driving a hard feeling are out of proportion to the actual situation. It does NOT help when the situation itself is the problem (an injustice, a real loss, an unsafe environment). If your honest answer to "is this thought really distorted, or is something genuinely wrong?" is the second one, this tool is the wrong tool, and you deserve an adult on the situation with you.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _thBg('#0f172a'), border: '1px solid ' + _thBd('#334155'), fontSize: 11, color: _thFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Thought records are a CBT technique, not therapy. If you find yourself doing many records about the same theme and it is not shifting, that is a sign to bring it to a counselor or therapist. Crisis Text Line: text HOME to 741741.'
        );
      }

      function commandMetric(label, value, blurb, color) {
        return h('div', { style: { padding: 12, borderRadius: 8, background: _thBg('#0f172a'), borderTop: '1px solid ' + _thBd('#1e293b'), borderRight: '1px solid ' + _thBd('#1e293b'), borderBottom: '1px solid ' + _thBd('#1e293b'), borderLeft: '3px solid ' + _thBd(color), minHeight: 92 } },
          h('div', { style: { fontSize: 11, color: _thFg('#94a3b8'), fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 } }, label),
          h('div', { style: { fontSize: 20, color: _thFg(color), fontWeight: 900, marginBottom: 4 } }, value),
          h('div', { style: { fontSize: 11.5, color: _thFg('#cbd5e1'), lineHeight: 1.5 } }, blurb)
        );
      }

      function thoughtCommandPanel(draft) {
        var fields = [
          draft.situation,
          draft.emotion1,
          draft.thought,
          draft.evidenceFor,
          draft.evidenceAgainst,
          draft.balanced
        ];
        var completed = fields.filter(function(v) { return v && String(v).trim(); }).length;
        if (typeof draft.emotion2Rating === 'number' && draft.emotion2Rating !== 50) completed += 1;
        var initial = clampRating(draft.emotion1Rating, 50);
        var current = clampRating(draft.emotion2Rating, 50);
        var shift = initial - current;
        var savedCount = d.entries.length;
        var rail = [
          { label: 'Facts', done: !!(draft.situation && String(draft.situation).trim()) },
          { label: 'Feeling', done: !!(draft.emotion1 && String(draft.emotion1).trim()) },
          { label: 'Thought', done: !!(draft.thought && String(draft.thought).trim()) },
          { label: 'For', done: !!(draft.evidenceFor && String(draft.evidenceFor).trim()) },
          { label: 'Against', done: !!(draft.evidenceAgainst && String(draft.evidenceAgainst).trim()) },
          { label: 'Balanced', done: !!(draft.balanced && String(draft.balanced).trim()) },
          { label: 'Re-rate', done: current !== 50 }
        ];
        return h('section', { className: 'no-print', 'aria-label': 'Thought Record workspace summary',
          style: { padding: 14, borderRadius: 12, background: _thHC ? '#000000' : (_thL ? '#f5f3ff' : 'linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(15,23,42,0.62) 70%)'), border: '1px solid ' + (_thHC ? '#ffff00' : 'rgba(167,139,250,0.34)'), marginBottom: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 } },
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { fontSize: 12, color: _thFg('#c4b5fd'), fontWeight: 900, textTransform: 'uppercase', marginBottom: 2 } }, 'Thought lab'),
              h('div', { style: { fontSize: 13, color: _thFg('#e2e8f0'), lineHeight: 1.55 } }, 'Start with facts, test the thought, then check whether the feeling shifted.')
            ),
            h('button', { onClick: function() { goto('past'); }, 'aria-label': 'Past records — view saved thought records',
              style: { padding: '8px 12px', borderRadius: 8, border: '1px solid ' + _thBd('#a78bfa'), background: _thHC ? '#000000' : 'rgba(167,139,250,0.14)', color: _thFg('#e9d5ff'), cursor: 'pointer', fontWeight: 800, fontSize: 12 } },
              'Past records')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            commandMetric('Entry progress', completed + '/7', 'Each box can be short. Complete what helps today.', '#a78bfa'),
            commandMetric('Feeling shift', (shift > 0 ? '-' : shift < 0 ? '+' : '') + Math.abs(shift), shift > 0 ? 'Intensity is moving down.' : shift < 0 ? 'Intensity rose; pause and get support if needed.' : 'Re-rate after the balanced thought.', '#22c55e'),
            commandMetric('Saved records', String(savedCount), savedCount ? 'Patterns get easier to see over time.' : 'Nothing saved yet. Drafts stay local until saved.', '#0ea5e9')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 6 } },
            rail.map(function(item) {
              return h('div', { key: item.label, style: { padding: '7px 6px', borderRadius: 8, textAlign: 'center', background: item.done ? (_thHC ? '#000000' : 'rgba(34,197,94,0.16)') : _thBg('#1e293b'), border: '1px solid ' + (item.done ? _thBd('#22c55e') : _thBd('#334155')), color: item.done ? _thFg('#bbf7d0') : _thFg('#94a3b8'), fontSize: 10.5, fontWeight: 800 } },
                item.label
              );
            })
          )
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NEW ENTRY — guided walk through 7 columns
      // ═══════════════════════════════════════════════════════════
      function renderNew() {
        var draft = normalizeDraft(d.activeEntry);

        function setDraft(patchOrFn) {
          setTR(function(prior) {
            var curDraft = normalizeDraft(prior.activeEntry);
            var patch = typeof patchOrFn === 'function' ? patchOrFn(curDraft) : patchOrFn;
            return { activeEntry: Object.assign({}, curDraft, patch) };
          });
        }
        function toggleDistortion(id) {
          setDraft(function(curDraft) {
            var dl = curDraft.distortions.slice();
            var idx = dl.indexOf(id);
            if (idx >= 0) dl.splice(idx, 1); else dl.push(id);
            return { distortions: dl };
          });
        }
        function saveEntry() {
          if (!String(draft.situation || '').trim() && !String(draft.thought || '').trim()) {
            if (addToast) addToast('Add at least a situation or thought before saving.', 'info');
            return;
          }
          scanThoughtText([draft.situation, draft.emotion1, draft.thought, draft.evidenceFor, draft.evidenceAgainst, draft.balanced].join(' '));
          var entry = Object.assign({}, draft, { id: uid(), date: todayISO() });
          setTR(function(prior) {
            var priorEntries = normalizeEntries(prior.entries);
            return { entries: priorEntries.concat([entry]), activeEntry: null };
          });
          if (addToast) addToast('Saved.', 'success');
          if (announceToSR) announceToSR('Thought record saved.');
        }
        function clearDraft() { setTR({ activeEntry: null }); }

        return h('div', null,
          thoughtCommandPanel(draft),
          safetyBanner(),

          // 1 Situation
          stepBox('Step 1', '📍 Situation', '#0ea5e9',
            'Where? When? Who was there? What happened? Keep it factual.',
            h('textarea', { id: 'tr-situation', value: draft.situation,
              onChange: function(e) { setDraft({ situation: e.target.value }); },
              onBlur: function(e) { scanThoughtText(e.target.value); },
              placeholder: 'e.g. In math class on Tuesday, my friend laughed when I got the problem wrong.',
              style: textareaStyle }),
            'tr-situation'
          ),

          // 2 Emotion + rating
          stepBox('Step 2', '😔 Emotion (and 0-100 rating)', '#ec4899',
            'Name the emotion in one word (sad, embarrassed, angry, anxious, ashamed). Then rate how intense it was at the time, 0 to 100.',
            h('div', null,
              h('input', { id: 'tr-emotion1', type: 'text', value: draft.emotion1,
                onChange: function(e) { setDraft({ emotion1: e.target.value }); },
                onBlur: function(e) { scanThoughtText(e.target.value); },
                placeholder: 'e.g. embarrassed',
                style: inputStyle }),
              h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } },
                h('label', { htmlFor: 'tr-emotion1-rating', style: { fontSize: 12, color: _thFg('#94a3b8'), minWidth: 90 } }, 'Intensity:'),
                h('input', { id: 'tr-emotion1-rating', type: 'range', min: 0, max: 100, value: draft.emotion1Rating,
                  'aria-valuetext': draft.emotion1Rating + ' out of 100',
                  onChange: function(e) { setDraft({ emotion1Rating: clampRating(e.target.value, 50) }); },
                  style: { flex: 1, minWidth: 0 } }),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: _thFg('#ec4899'), minWidth: 60, textAlign: 'right' } }, draft.emotion1Rating + '/100')
              )
            ),
            'tr-emotion1'
          ),

          // 3 Automatic thought
          stepBox('Step 3', '💭 Automatic thought', '#f59e0b',
            'What went through your mind right then? The fast, automatic thought, the one underneath the emotion. Write it as-is, even if it seems harsh.',
            h('textarea', { id: 'tr-thought', value: draft.thought,
              onChange: function(e) { setDraft({ thought: e.target.value }); },
              onBlur: function(e) { scanThoughtText(e.target.value); },
              placeholder: 'e.g. Everyone in class thinks I am dumb.',
              style: textareaStyle }),
            'tr-thought'
          ),

          // 4 Evidence for
          stepBox('Step 4', '➕ Evidence FOR the thought', '#94a3b8',
            'What facts (not feelings, facts) actually support the thought? Be honest; sometimes there is some real evidence.',
            h('textarea', { id: 'tr-evfor', value: draft.evidenceFor,
              onChange: function(e) { setDraft({ evidenceFor: e.target.value }); },
              onBlur: function(e) { scanThoughtText(e.target.value); },
              placeholder: 'e.g. I have struggled with this unit. One person did laugh.',
              style: textareaStyle }),
            'tr-evfor'
          ),

          // 5 Evidence against
          stepBox('Step 5', '➖ Evidence AGAINST the thought', '#22c55e',
            'What facts do NOT support the thought? Things you know that the automatic thought ignored.',
            h('textarea', { id: 'tr-evagainst', value: draft.evidenceAgainst,
              onChange: function(e) { setDraft({ evidenceAgainst: e.target.value }); },
              onBlur: function(e) { scanThoughtText(e.target.value); },
              placeholder: 'e.g. Other people got problems wrong too. My friend laughs at everyone, not just me. The teacher said the unit is hard.',
              style: textareaStyle }),
            'tr-evagainst'
          ),

          // Distortion check
          h('div', { style: stepBoxStyle('#6366f1') },
            h('div', { style: stepHeaderStyle('Optional', '🔎 Common thinking traps', '#6366f1') },
              h('span', { style: { fontSize: 10, color: _thFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, 'Optional'),
              h('span', { style: { fontSize: 14, fontWeight: 800, color: _thFg('#6366f1') } }, '🔎 Common thinking traps')
            ),
            h('div', { style: { fontSize: 11.5, color: _thFg('#94a3b8'), marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' } },
              'Does your automatic thought have any of these patterns? Click any that apply.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 } },
              DISTORTIONS.map(function(dist) {
                var on = draft.distortions.indexOf(dist.id) !== -1;
                return h('button', { key: dist.id, onClick: function() { toggleDistortion(dist.id); }, 'aria-label': dist.label, 'aria-pressed': on,
                  style: { textAlign: 'left', padding: 8, borderRadius: 6, border: '1px solid ' + (on ? _thBd('#6366f1') : _thBd('#334155')), background: on ? (_thHC ? '#000000' : 'rgba(99,102,241,0.18)') : _thBg('#1e293b'), color: on ? _thFg('#c7d2fe') : _thFg('#cbd5e1'), cursor: 'pointer' } },
                  h('div', { style: { fontSize: 12, fontWeight: 700 } }, (on ? '✓ ' : '') + dist.label),
                  h('div', { style: { fontSize: 10, color: _thFg('#94a3b8'), marginTop: 2, lineHeight: 1.45 } }, dist.desc)
                );
              })
            )
          ),

          // 6 Balanced thought
          stepBox('Step 6', '⚖️ Balanced thought', '#0ea5e9',
            'Holding the evidence for AND against, what is a more accurate way of seeing this? Not a forced positive; a fair-minded version.',
            h('textarea', { id: 'tr-balanced', value: draft.balanced,
              onChange: function(e) { setDraft({ balanced: e.target.value }); },
              onBlur: function(e) { scanThoughtText(e.target.value); },
              placeholder: 'e.g. I did get one problem wrong and one person laughed. That does not mean everyone thinks I am dumb; it means this unit is hard and one person reacted that way. I am still learning.',
              style: textareaStyle }),
            'tr-balanced'
          ),

          // 7 Emotion re-rating
          stepBox('Step 7', '🌤 Re-rate the emotion', '#22c55e',
            'After working through the balanced thought, how intense is the emotion now, 0 to 100?',
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('label', { htmlFor: 'tr-emotion2-rating', style: { fontSize: 12, color: _thFg('#94a3b8'), minWidth: 90 } }, 'Intensity now:'),
              h('input', { id: 'tr-emotion2-rating', type: 'range', min: 0, max: 100, value: draft.emotion2Rating,
                'aria-valuetext': draft.emotion2Rating + ' out of 100',
                onChange: function(e) { setDraft({ emotion2Rating: clampRating(e.target.value, 50) }); },
                style: { flex: 1, minWidth: 0 } }),
              h('span', { style: { fontSize: 14, fontWeight: 800, color: _thFg('#22c55e'), minWidth: 60, textAlign: 'right' } }, draft.emotion2Rating + '/100')
            )
          ),

          // Save / clear
          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: saveEntry, style: { padding: '10px 22px', borderRadius: 10, border: _thHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _thHC ? '#000000' : 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)', color: _thFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '✓ Save this record'),
            h('button', { onClick: clearDraft, 'aria-label': 'Clear and start over',
              style: { padding: '10px 22px', borderRadius: 10, border: '1px solid ' + _thBd('#475569'), background: _thBg('#1e293b'), color: _thFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, 'Clear')
          ),

          softPointer()
        );
      }

      var inputStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid ' + _thBd('#334155'), background: _thBg('#1e293b'), color: _thFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit' };
      var textareaStyle = { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid ' + _thBd('#334155'), background: _thBg('#1e293b'), color: _thFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' };

      function stepBoxStyle(color) {
        return { padding: 14, borderRadius: 10, background: _thBg('#0f172a'), borderTop: '1px solid ' + _thBd('#1e293b'), borderRight: '1px solid ' + _thBd('#1e293b'), borderBottom: '1px solid ' + _thBd('#1e293b'), borderLeft: '3px solid ' + _thBd(color), marginBottom: 12 };
      }
      function stepHeaderStyle(stepNum, title, color) {
        return { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 };
      }
      function stepBox(stepNum, title, color, blurb, content, inputId) {
        return h('div', { style: stepBoxStyle(color) },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
            h('span', { style: { fontSize: 10, color: _thFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, stepNum),
            inputId
              ? h('label', { htmlFor: inputId, style: { fontSize: 14, fontWeight: 800, color: _thFg(color), cursor: 'pointer' } }, title)
              : h('span', { style: { fontSize: 14, fontWeight: 800, color: _thFg(color) } }, title)
          ),
          h('div', { style: { fontSize: 11.5, color: _thFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),
          content
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PAST ENTRIES
      // ═══════════════════════════════════════════════════════════
      function renderPast() {
        var entries = d.entries.slice().reverse();
        if (entries.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: _thBg('#0f172a'), border: '1px solid ' + _thBd('#1e293b'), textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📚'),
              h('div', { style: { color: _thFg('#cbd5e1'), fontSize: 14, marginBottom: 4 } }, 'No past records yet'),
              h('button', { onClick: function() { goto('new'); }, style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid ' + _thBd('#a78bfa'), background: _thHC ? '#000000' : 'rgba(167,139,250,0.18)', color: _thFg('#e9d5ff'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '+ Start a new record')
            )
          );
        }

        function deleteEntry(id) {
          setTR(function(prior) {
            return { entries: normalizeEntries(prior.entries).filter(function(e) { return e.id !== id; }) };
          });
        }

        return h('div', null,
          h('div', { style: { fontSize: 12, color: _thFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, entries.length + ' record' + (entries.length === 1 ? '' : 's')),
          entries.map(function(e) {
            var shift = e.emotion1Rating - e.emotion2Rating;
            var distortionLabels = e.distortions.map(function(id) { var di = DISTORTIONS.find(function(x) { return x.id === id; }); return di ? di.label : ''; }).filter(Boolean);
            return h('div', { key: e.id, style: { padding: 12, borderRadius: 10, background: _thBg('#0f172a'), borderTop: '1px solid ' + _thBd('#1e293b'), borderRight: '1px solid ' + _thBd('#1e293b'), borderBottom: '1px solid ' + _thBd('#1e293b'), borderLeft: '3px solid ' + _thBd('#a78bfa'), marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 11, color: _thFg('#94a3b8'), fontFamily: 'ui-monospace, monospace' } }, e.date),
                h('span', { style: { fontSize: 12, color: _thFg('#e9d5ff'), fontWeight: 700 } }, (e.emotion1 || 'emotion') + ' · ' + e.emotion1Rating + ' → ' + e.emotion2Rating),
                shift > 0 ? h('span', { style: { fontSize: 11, color: _thFg('#22c55e') } }, '↓ ' + shift + ' points') : null,
                h('button', { onClick: function() { deleteEntry(e.id); }, 'aria-label': 'Delete record from ' + (e.date || 'entry'),
                  style: { marginLeft: 'auto', background: 'transparent', border: '1px solid ' + _thBd('#475569'), color: _thFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              ),
              e.situation ? h('div', { style: { fontSize: 12, color: _thFg('#94a3b8'), marginBottom: 4 } }, h('strong', null, 'Situation: '), e.situation) : null,
              e.thought ? h('div', { style: { fontSize: 12.5, color: _thFg('#fde68a'), fontStyle: 'italic', marginBottom: 4 } }, '💭 "' + e.thought + '"') : null,
              e.balanced ? h('div', { style: { fontSize: 12.5, color: _thFg('#bbf7d0'), marginBottom: 4 } }, '⚖️ ' + e.balanced) : null,
              distortionLabels.length > 0 ? h('div', { style: { fontSize: 11, color: _thFg('#c7d2fe'), marginTop: 4 } }, '🔎 ' + distortionLabels.join(', ')) : null
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var entries = d.entries.slice().reverse();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _thHC ? '#000000' : 'rgba(167,139,250,0.10)', borderRadius: 8, border: '1px solid ' + (_thHC ? '#ffff00' : 'rgba(167,139,250,0.3)') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _thFg('#e9d5ff'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, style: { padding: '8px 18px', borderRadius: 8, border: _thHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _thHC ? '#000000' : 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)', color: _thFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('past'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid ' + _thBd('#475569'), background: _thBg('#1e293b'), color: _thFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'tr-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _thBg('#fff'), color: _thFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _thBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#tr-print-region, #tr-print-region * { visibility: visible !important; } ' +
              '#tr-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; } ' +
              '#tr-print-region * { color: inherit !important; border-color: #cbd5e1 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _thBd('#7c3aed') } },
              h('div', { style: { fontSize: 10, color: _thFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'CBT Thought Records'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Thought Records'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _thFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            entries.length > 0
              ? entries.map(function(e) {
                  return h('div', { key: e.id, style: { marginBottom: 22, pageBreakInside: 'avoid', borderTop: '1px solid #cbd5e1', paddingTop: 14 } },
                    h('div', { style: { fontSize: 11, color: _thFg('#64748b'), fontFamily: 'ui-monospace, monospace', marginBottom: 8 } }, e.date),
                    printRow('1. Situation', e.situation),
                    printRow('2. Emotion (intensity)', (e.emotion1 || '–') + ' · ' + e.emotion1Rating + '/100'),
                    printRow('3. Automatic thought', e.thought),
                    printRow('4. Evidence FOR', e.evidenceFor),
                    printRow('5. Evidence AGAINST', e.evidenceAgainst),
                    printRow('6. Balanced thought', e.balanced),
                    printRow('7. Emotion re-rating', e.emotion2Rating + '/100')
                  );
                })
              : h('div', { style: { fontSize: 12, color: _thFg('#475569'), fontStyle: 'italic' } }, 'No records yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _thFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'CBT Thought Record from Beck, Burns, Padesky. Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printRow(label, value) {
        return h('div', { style: { marginBottom: 8 } },
          h('div', { style: { fontSize: 10, color: _thFg('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 } }, label),
          h('div', { style: { fontSize: 13, color: _thFg('#0f172a'), whiteSpace: 'pre-wrap', lineHeight: 1.6 } }, value || '(not filled in)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('thoughtRecord', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _thBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _thFg('#c4b5fd'), fontSize: 16 } }, 'What a CBT Thought Record is'),
            h('p', { style: { margin: '0 0 10px', color: _thFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A thought record is the central self-help technique of Cognitive Behavioral Therapy. The idea behind CBT is that situations do not directly cause feelings; the thoughts a person has ABOUT the situation cause the feelings. Different people in the same situation have different feelings because they have different thoughts about it.'
            ),
            h('p', { style: { margin: 0, color: _thFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'When the thoughts are accurate, the feelings are usually proportionate. When the thoughts are distorted (catastrophizing, mind-reading, all-or-nothing thinking, and so on), the feelings get out of proportion to what is actually happening. A thought record is a structured way to catch a distorted thought, examine it against the actual evidence, and arrive at a more accurate take.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _thBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _thFg('#c4b5fd'), fontSize: 16 } }, 'Where CBT comes from'),
            h('p', { style: { margin: 0, color: _thFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'Cognitive Behavioral Therapy was developed by psychiatrist Aaron T. Beck at the University of Pennsylvania, starting in the 1960s. Beck originally trained as a psychoanalyst and developed CBT after observing that his depressed patients had recurrent negative thought patterns that were not addressed by classical psychoanalysis. CBT became one of the most heavily researched psychotherapies; it has consistently been shown effective for depression, anxiety, PTSD, OCD, and many other conditions. The thought record format you are using is the 7-column version developed by Christine Padesky and published in Mind Over Mood (Greenberger & Padesky, 1995). It builds on the 5-column Daily Record of Dysfunctional Thoughts that Beck introduced in the 1970s.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _thBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _thFg('#c4b5fd'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _thFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for CBT and the thought record.'),
            sourceCard('Beck, A. T. (1979)', 'Cognitive Therapy of Depression, Guilford Press', 'The foundational text of CBT. Heavily cited.', null),
            sourceCard('Burns, D. D. (1980)', 'Feeling Good: The New Mood Therapy, William Morrow', 'The book that brought CBT to general audiences. Includes the 10 cognitive distortions taught in this tool.', null),
            sourceCard('Greenberger, D. and Padesky, C. A. (2015)', 'Mind Over Mood: Change How You Feel by Changing the Way You Think (2nd ed.), Guilford Press', 'The most widely-used CBT self-help workbook. The 7-column thought record in its current form.', null),
            sourceCard('Beck Institute for Cognitive Behavior Therapy', 'beckinstitute.org', 'The institutional home of CBT, founded by Aaron Beck. Free resources and ongoing research.', 'https://beckinstitute.org/'),
            sourceCard('Hofmann, S. G. et al. (2012)', '"The Efficacy of CBT: A Review of Meta-analyses," Cognitive Therapy and Research, 36(5), 427-440', 'Meta-analytic review of CBT outcomes across many conditions.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _thFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _thFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'CBT can be misused. The assumption that distorted thinking is the source of suffering presumes the situation is okay; sometimes it is not. A student in a genuinely unsafe environment who is told their fear is a "catastrophizing distortion" is being gaslit, not helped.'),
              h('li', null, 'CBT was developed in a particular cultural context (mid-century US clinical psychology) and rests on assumptions about the value of rational analysis and the locus of agency that not all traditions share. Some critiques argue it pulls toward individualizing problems that are actually relational or structural.'),
              h('li', null, 'A thought record is one technique among many. If thought records do not help you, that is not a failure; it might mean a different approach (somatic, narrative, relational, structural) fits better.'),
              h('li', null, 'CBT and antidepressants are roughly equally effective for moderate depression; many people benefit from both, not one or the other.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.3)', borderRight: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', fontSize: 12.5, color: _thFg('#e9d5ff'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Thought records are a clinical-grade tool that students can use as self-help. They work best when paired with a skill-building conversation: walking through a record together once or twice, then handing it back as a private practice. If a student is doing thought records every day and they are not helping, that is a sign the underlying situation needs adult attention, not more records.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _thBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _thFg('#c4b5fd'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _thFg('#e9d5ff'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _thFg('#e9d5ff'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _thFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'past') body = renderPast();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderNew();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'CBT Thought Record' },
        header(),
        navTabs(),
        (d._crisisTier >= 3 && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
          ? window.SelHub.renderCrisisResources(h, _thBand) : null,
        h('div', { role: 'tabpanel', id: 'tr-panel-' + view, 'aria-labelledby': 'tr-tab-' + view }, body)
      );
    }
  });

})();
}
