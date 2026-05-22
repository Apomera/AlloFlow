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
    desc: 'The 7-column thought record from Cognitive Behavioral Therapy. Walk through a hard moment: situation, emotion, automatic thought, evidence for and against, balanced thought, emotion re-rating. Saves over time so you can see your patterns. Foundational tool from Beck and Burns.',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.thoughtRecord || defaultState();
      function setTR(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.thoughtRecord) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.entries) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { thoughtRecord: next });
        });
      }
      var view = d.view || 'new';
      function goto(v) { setTR({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#c4b5fd', fontSize: 22, fontWeight: 900 } }, '📓 CBT Thought Record'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Walk through a hard moment in seven steps.')
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
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : '#334155'),
                background: active ? 'rgba(167,139,250,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.4)', borderRight: '1px solid rgba(167,139,250,0.4)', borderBottom: '1px solid rgba(167,139,250,0.4)', borderLeft: '3px solid #a78bfa', marginBottom: 12, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.65 } },
          h('strong', null, '📓 What this is: '),
          'a CBT (Cognitive Behavioral Therapy) reflection. CBT helps when the thoughts driving a hard feeling are out of proportion to the actual situation. It does NOT help when the situation itself is the problem (an injustice, a real loss, an unsafe environment). If your honest answer to "is this thought really distorted, or is something genuinely wrong?" is the second one, this tool is the wrong tool, and you deserve an adult on the situation with you.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Thought records are a CBT technique, not therapy. If you find yourself doing many records about the same theme and it is not shifting, that is a sign to bring it to a counselor or therapist. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NEW ENTRY — guided walk through 7 columns
      // ═══════════════════════════════════════════════════════════
      function renderNew() {
        var draft = d.activeEntry || {
          situation: '',
          emotion1: '',
          emotion1Rating: 50,
          thought: '',
          evidenceFor: '',
          evidenceAgainst: '',
          distortions: [],
          balanced: '',
          emotion2Rating: 50
        };

        function setDraft(patch) {
          setTR({ activeEntry: Object.assign({}, draft, patch) });
        }
        function toggleDistortion(id) {
          var dl = (draft.distortions || []).slice();
          var idx = dl.indexOf(id);
          if (idx >= 0) dl.splice(idx, 1); else dl.push(id);
          setDraft({ distortions: dl });
        }
        function saveEntry() {
          if (!draft.situation && !draft.thought) {
            if (addToast) addToast('Add at least a situation or thought before saving.', 'info');
            return;
          }
          var entry = Object.assign({}, draft, { id: uid(), date: todayISO() });
          setTR({ entries: (d.entries || []).concat([entry]), activeEntry: null });
          if (addToast) addToast('Saved.', 'success');
          if (announceToSR) announceToSR('Thought record saved.');
        }
        function clearDraft() { setTR({ activeEntry: null }); }

        return h('div', null,
          safetyBanner(),

          // 1 Situation
          stepBox('Step 1', '📍 Situation', '#0ea5e9',
            'Where? When? Who was there? What happened? Keep it factual.',
            h('textarea', { id: 'tr-situation', value: draft.situation,
              onChange: function(e) { setDraft({ situation: e.target.value }); },
              placeholder: 'e.g. In math class on Tuesday, my friend laughed when I got the problem wrong.',
              style: textareaStyle })
          ),

          // 2 Emotion + rating
          stepBox('Step 2', '😔 Emotion (and 0-100 rating)', '#ec4899',
            'Name the emotion in one word (sad, embarrassed, angry, anxious, ashamed). Then rate how intense it was at the time, 0 to 100.',
            h('div', null,
              h('input', { id: 'tr-emotion1', type: 'text', value: draft.emotion1,
                onChange: function(e) { setDraft({ emotion1: e.target.value }); },
                placeholder: 'e.g. embarrassed',
                style: inputStyle }),
              h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } },
                h('label', { htmlFor: 'tr-emotion1-rating', style: { fontSize: 12, color: '#94a3b8', minWidth: 90 } }, 'Intensity:'),
                h('input', { id: 'tr-emotion1-rating', type: 'range', min: 0, max: 100, value: draft.emotion1Rating,
                  onChange: function(e) { setDraft({ emotion1Rating: parseInt(e.target.value, 10) }); },
                  style: { flex: 1 } }),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: '#ec4899', minWidth: 40, textAlign: 'right' } }, draft.emotion1Rating + '/100')
              )
            )
          ),

          // 3 Automatic thought
          stepBox('Step 3', '💭 Automatic thought', '#f59e0b',
            'What went through your mind right then? The fast, automatic thought, the one underneath the emotion. Write it as-is, even if it seems harsh.',
            h('textarea', { id: 'tr-thought', value: draft.thought,
              onChange: function(e) { setDraft({ thought: e.target.value }); },
              placeholder: 'e.g. Everyone in class thinks I am dumb.',
              style: textareaStyle })
          ),

          // 4 Evidence for
          stepBox('Step 4', '➕ Evidence FOR the thought', '#94a3b8',
            'What facts (not feelings, facts) actually support the thought? Be honest; sometimes there is some real evidence.',
            h('textarea', { id: 'tr-evfor', value: draft.evidenceFor,
              onChange: function(e) { setDraft({ evidenceFor: e.target.value }); },
              placeholder: 'e.g. I have struggled with this unit. One person did laugh.',
              style: textareaStyle })
          ),

          // 5 Evidence against
          stepBox('Step 5', '➖ Evidence AGAINST the thought', '#22c55e',
            'What facts do NOT support the thought? Things you know that the automatic thought ignored.',
            h('textarea', { id: 'tr-evagainst', value: draft.evidenceAgainst,
              onChange: function(e) { setDraft({ evidenceAgainst: e.target.value }); },
              placeholder: 'e.g. Other people got problems wrong too. My friend laughs at everyone, not just me. The teacher said the unit is hard.',
              style: textareaStyle })
          ),

          // Distortion check
          h('div', { style: stepBoxStyle('#6366f1') },
            h('div', { style: stepHeaderStyle('Optional', '🔎 Common thinking traps', '#6366f1') }),
            h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' } },
              'Does your automatic thought have any of these patterns? Click any that apply.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 } },
              DISTORTIONS.map(function(dist) {
                var on = (draft.distortions || []).indexOf(dist.id) !== -1;
                return h('button', { key: dist.id, onClick: function() { toggleDistortion(dist.id); }, 'aria-label': dist.label, 'aria-pressed': on,
                  style: { textAlign: 'left', padding: 8, borderRadius: 6, border: '1px solid ' + (on ? '#6366f1' : '#334155'), background: on ? 'rgba(99,102,241,0.18)' : '#1e293b', color: on ? '#c7d2fe' : '#cbd5e1', cursor: 'pointer' } },
                  h('div', { style: { fontSize: 12, fontWeight: 700 } }, (on ? '✓ ' : '') + dist.label),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.45 } }, dist.desc)
                );
              })
            )
          ),

          // 6 Balanced thought
          stepBox('Step 6', '⚖️ Balanced thought', '#0ea5e9',
            'Holding the evidence for AND against, what is a more accurate way of seeing this? Not a forced positive; a fair-minded version.',
            h('textarea', { id: 'tr-balanced', value: draft.balanced,
              onChange: function(e) { setDraft({ balanced: e.target.value }); },
              placeholder: 'e.g. I did get one problem wrong and one person laughed. That does not mean everyone thinks I am dumb; it means this unit is hard and one person reacted that way. I am still learning.',
              style: textareaStyle })
          ),

          // 7 Emotion re-rating
          stepBox('Step 7', '🌤 Re-rate the emotion', '#22c55e',
            'After working through the balanced thought, how intense is the emotion now, 0 to 100?',
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('label', { htmlFor: 'tr-emotion2-rating', style: { fontSize: 12, color: '#94a3b8', minWidth: 90 } }, 'Intensity now:'),
              h('input', { id: 'tr-emotion2-rating', type: 'range', min: 0, max: 100, value: draft.emotion2Rating,
                onChange: function(e) { setDraft({ emotion2Rating: parseInt(e.target.value, 10) }); },
                style: { flex: 1 } }),
              h('span', { style: { fontSize: 14, fontWeight: 800, color: '#22c55e', minWidth: 40, textAlign: 'right' } }, draft.emotion2Rating + '/100')
            )
          ),

          // Save / clear
          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: saveEntry, 'aria-label': 'Save this thought record',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✓ Save this record'),
            h('button', { onClick: clearDraft, 'aria-label': 'Clear and start over',
              style: { padding: '10px 22px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, 'Clear')
          ),

          softPointer()
        );
      }

      var inputStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit' };
      var textareaStyle = { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' };

      function stepBoxStyle(color) {
        return { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 12 };
      }
      function stepHeaderStyle(stepNum, title, color) {
        return { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 };
      }
      function stepBox(stepNum, title, color, blurb, content) {
        return h('div', { style: stepBoxStyle(color) },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
            h('span', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, stepNum),
            h('span', { style: { fontSize: 14, fontWeight: 800, color: color } }, title)
          ),
          h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),
          content
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PAST ENTRIES
      // ═══════════════════════════════════════════════════════════
      function renderPast() {
        var entries = (d.entries || []).slice().reverse();
        if (entries.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📚'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'No past records yet'),
              h('button', { onClick: function() { goto('new'); }, 'aria-label': 'Start one',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #a78bfa', background: 'rgba(167,139,250,0.18)', color: '#e9d5ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '+ Start a new record')
            )
          );
        }

        function deleteEntry(id) {
          setTR({ entries: (d.entries || []).filter(function(e) { return e.id !== id; }) });
        }

        return h('div', null,
          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, entries.length + ' record' + (entries.length === 1 ? '' : 's')),
          entries.map(function(e) {
            var shift = (e.emotion1Rating || 0) - (e.emotion2Rating || 0);
            var distortionLabels = (e.distortions || []).map(function(id) { var di = DISTORTIONS.find(function(x) { return x.id === id; }); return di ? di.label : ''; }).filter(Boolean);
            return h('div', { key: e.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' } }, e.date),
                h('span', { style: { fontSize: 12, color: '#e9d5ff', fontWeight: 700 } }, (e.emotion1 || 'emotion') + ' · ' + e.emotion1Rating + ' → ' + e.emotion2Rating),
                shift > 0 ? h('span', { style: { fontSize: 11, color: '#22c55e' } }, '↓ ' + shift + ' points') : null,
                h('button', { onClick: function() { deleteEntry(e.id); }, 'aria-label': 'Delete record',
                  style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              ),
              e.situation ? h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } }, h('strong', null, 'Situation: '), e.situation) : null,
              e.thought ? h('div', { style: { fontSize: 12.5, color: '#fde68a', fontStyle: 'italic', marginBottom: 4 } }, '💭 "' + e.thought + '"') : null,
              e.balanced ? h('div', { style: { fontSize: 12.5, color: '#bbf7d0', marginBottom: 4 } }, '⚖️ ' + e.balanced) : null,
              distortionLabels.length > 0 ? h('div', { style: { fontSize: 11, color: '#c7d2fe', marginTop: 4 } }, '🔎 ' + distortionLabels.join(', ')) : null
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var entries = (d.entries || []).slice().reverse();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(167,139,250,0.10)', borderRadius: 8, border: '1px solid rgba(167,139,250,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('past'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'tr-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#tr-print-region, #tr-print-region * { visibility: visible !important; } ' +
              '#tr-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #7c3aed' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'CBT Thought Records'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Thought Records'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            entries.length > 0
              ? entries.map(function(e) {
                  return h('div', { key: e.id, style: { marginBottom: 22, pageBreakInside: 'avoid', borderTop: '1px solid #cbd5e1', paddingTop: 14 } },
                    h('div', { style: { fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, monospace', marginBottom: 8 } }, e.date),
                    printRow('1. Situation', e.situation),
                    printRow('2. Emotion (intensity)', (e.emotion1 || '–') + ' · ' + e.emotion1Rating + '/100'),
                    printRow('3. Automatic thought', e.thought),
                    printRow('4. Evidence FOR', e.evidenceFor),
                    printRow('5. Evidence AGAINST', e.evidenceAgainst),
                    printRow('6. Balanced thought', e.balanced),
                    printRow('7. Emotion re-rating', e.emotion2Rating + '/100')
                  );
                })
              : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No records yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'CBT Thought Record from Beck, Burns, Padesky. Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printRow(label, value) {
        return h('div', { style: { marginBottom: 8 } },
          h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 } }, label),
          h('div', { style: { fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6 } }, value || '(not filled in)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('thoughtRecord', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'What a CBT Thought Record is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A thought record is the central self-help technique of Cognitive Behavioral Therapy. The idea behind CBT is that situations do not directly cause feelings; the thoughts a person has ABOUT the situation cause the feelings. Different people in the same situation have different feelings because they have different thoughts about it.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'When the thoughts are accurate, the feelings are usually proportionate. When the thoughts are distorted (catastrophizing, mind-reading, all-or-nothing thinking, and so on), the feelings get out of proportion to what is actually happening. A thought record is a structured way to catch a distorted thought, examine it against the actual evidence, and arrive at a more accurate take.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'Where CBT comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Cognitive Behavioral Therapy was developed by psychiatrist Aaron T. Beck at the University of Pennsylvania, starting in the 1960s. Beck originally trained as a psychoanalyst and developed CBT after observing that his depressed patients had recurrent negative thought patterns that were not addressed by classical psychoanalysis. CBT became one of the most heavily researched psychotherapies; it has consistently been shown effective for depression, anxiety, PTSD, OCD, and many other conditions. The thought record format you are using is essentially unchanged from the one Beck taught in the 1970s.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for CBT and the thought record.'),
            sourceCard('Beck, A. T. (1979)', 'Cognitive Therapy of Depression, Guilford Press', 'The foundational text of CBT. Heavily cited.', null),
            sourceCard('Burns, D. D. (1980)', 'Feeling Good: The New Mood Therapy, William Morrow', 'The book that brought CBT to general audiences. Includes the 10 cognitive distortions taught in this tool.', null),
            sourceCard('Greenberger, D. and Padesky, C. A. (2015)', 'Mind Over Mood: Change How You Feel by Changing the Way You Think (2nd ed.), Guilford Press', 'The most widely-used CBT self-help workbook. The 7-column thought record in its current form.', null),
            sourceCard('Beck Institute for Cognitive Behavior Therapy', 'beckinstitute.org', 'The institutional home of CBT, founded by Aaron Beck. Free resources and ongoing research.', 'https://beckinstitute.org/'),
            sourceCard('Hofmann, S. G. et al. (2012)', '"The Efficacy of CBT: A Review of Meta-analyses," Cognitive Therapy and Research, 36(5), 427-440', 'Meta-analytic review of CBT outcomes across many conditions.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'CBT can be misused. The assumption that distorted thinking is the source of suffering presumes the situation is okay; sometimes it is not. A student in a genuinely unsafe environment who is told their fear is a "catastrophizing distortion" is being gaslit, not helped.'),
              h('li', null, 'CBT was developed in a particular cultural context (mid-century US clinical psychology) and rests on assumptions about the value of rational analysis and the locus of agency that not all traditions share. Some critiques argue it pulls toward individualizing problems that are actually relational or structural.'),
              h('li', null, 'A thought record is one technique among many. If thought records do not help you, that is not a failure; it might mean a different approach (somatic, narrative, relational, structural) fits better.'),
              h('li', null, 'CBT and antidepressants are roughly equally effective for moderate depression; many people benefit from both, not one or the other.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.3)', borderRight: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Thought records are a clinical-grade tool that students can use as self-help. They work best when paired with a skill-building conversation: walking through a record together once or twice, then handing it back as a private practice. If a student is doing thought records every day and they are not helping, that is a sign the underlying situation needs adult attention, not more records.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e9d5ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
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
        body
      );
    }
  });

})();
}
