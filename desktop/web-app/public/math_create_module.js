/**
 * AlloFlow — Math Studio (math_create_module.js)
 *
 * The former STEM Lab "Create" tab, moved home to the math tool per
 * docs/math_create_migration_plan.md (2026-08-17). Math-only end to end:
 * From Topic / From My Content / Solve One generation plus the Assessment
 * Builder. Output lands where it always did — the math view, Resources, and
 * the sidebar Fluency Probes panel. Plain JS, no source pair: this file IS
 * the source (same contract as math_fluency_module.js).
 *
 * The body below is the Create tab's code transplanted verbatim except for
 * three seams: setShowStemLab(false) became onClose(); the quick tool chips
 * now close this modal and open the STEAM Lab Explore tool they name; and
 * announceToSR is a local live region instead of the Lab's.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.MathCreate) {
    console.log('[CDN] MathCreateModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[MathCreateModule] React not found on window'); return; }

  var _lazyIcon = function (name) {
    return function (p) {
      var I = (window.AlloIcons && window.AlloIcons[name]) || window[name];
      return I ? React.createElement(I, p) : null;
    };
  };
  var X = _lazyIcon('X');
  var Sparkles = _lazyIcon('Sparkles');
  var GripVertical = _lazyIcon('GripVertical');
  var ArrowLeft = _lazyIcon('ArrowLeft');

  function MathCreateModal(props) {
    var t = props.t || function (k, f) { return typeof f === 'string' ? f : k; };
    var onClose = props.onClose || function () {};
    var addToast = props.addToast || function () {};
    var mathInput = props.mathInput || '';
    var setMathInput = props.setMathInput || function () {};
    var mathMode = props.mathMode;
    var setMathMode = props.setMathMode || function () {};
    var mathQuantity = props.mathQuantity || 5;
    var setMathQuantity = props.setMathQuantity || function () {};
    var mathSubject = props.mathSubject;
    var stemLabCreateMode = props.stemLabCreateMode || 'topic';
    var setStemLabCreateMode = props.setStemLabCreateMode || function () {};
    var showAssessmentBuilder = props.showAssessmentBuilder || false;
    var setShowAssessmentBuilder = props.setShowAssessmentBuilder || function () {};
    var assessmentBlocks = props.assessmentBlocks || [];
    var setAssessmentBlocks = props.setAssessmentBlocks || function () {};
    var handleGenerateMath = props.handleGenerateMath;
    var setActiveView = props.setActiveView || function () {};
    var setHistory = props.setHistory || function () {};
    var callGemini = props.callGemini;
    var setExpandedTools = props.setExpandedTools;
    var useMathSourceContext = props.useMathSourceContext;
    var hasSourceOrAnalysis = props.hasSourceOrAnalysis;
    var gradeLevel = props.gradeLevel;
    var setShowStemLab = props.setShowStemLab;
    var setStemLabTab = props.setStemLabTab;
    var setStemLabTool = props.setStemLabTool;

    // Live region: the Lab's announceToSR stayed with the Lab.
    var _sr = React.useState('');
    var srMsg = _sr[0], setSrMsg = _sr[1];
    function announceToSR(msg) {
      setSrMsg('');
      setTimeout(function () { setSrMsg(String(msg || '')); }, 30);
    }

    // Dialog semantics: focus the close button on open, trap Tab, close on
    // Escape, restore focus on unmount.
    var dialogRef = React.useRef(null);
    var closeBtnRef = React.useRef(null);
    React.useEffect(function () {
      var previouslyFocused = document.activeElement;
      if (closeBtnRef.current) closeBtnRef.current.focus();
      function onKeyDown(e) {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
        if (e.key !== 'Tab' || !dialogRef.current) return;
        var focusables = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', onKeyDown);
      return function () {
        document.removeEventListener('keydown', onKeyDown);
        if (previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
      };
    }, []);

    var body = showAssessmentBuilder
      ? React.createElement("div", {
          className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-3"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => setShowAssessmentBuilder(false),
          className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",
          'aria-label': 'Back'
        }, /*#__PURE__*/React.createElement(ArrowLeft, {
          size: 18,
          className: "text-slate-500"
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
          className: "text-lg font-bold text-slate-800"
        }, "\uD83D\uDCCB Assessment Builder"), /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-slate-500"
        }, "Compose blocks of different problem types into a custom assessment")))), /*#__PURE__*/React.createElement("div", {
          className: "space-y-2"
        }, assessmentBlocks.map((block, idx) => /*#__PURE__*/React.createElement("div", {
          key: block.id,
          className: "bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 flex items-start gap-3 transition-all group",
          draggable: true,
          onDragStart: e => e.dataTransfer.setData('blockIdx', idx.toString()),
          onDragOver: e => e.preventDefault(),
          onDrop: e => {
            const fromIdx = parseInt(e.dataTransfer.getData('blockIdx'));
            const newBlocks = [...assessmentBlocks];
            const [moved] = newBlocks.splice(fromIdx, 1);
            newBlocks.splice(idx, 0, moved);
            setAssessmentBlocks(newBlocks);
          }
        }, /*#__PURE__*/React.createElement("div", {
          // Reordering used to be drag-only: this column held nothing but a
          // GripVertical in a plain div, so a keyboard or touch user could not
          // change block order at all (WCAG 2.5.7 dragging movements, 2.1.1
          // keyboard). The drag handlers above are kept — they still work for a
          // mouse — and these two native buttons are the equivalent path, the
          // same shape stem_tool_geologyexplorer.js already uses for its
          // reorderable list.
          //
          // The labels carry the POSITION rather than the block type, because
          // block.type is a machine value ('word_problems') and several blocks
          // commonly share one type — "Move block 2 up" is the only phrasing
          // that identifies which row is about to move.
          className: "flex flex-col items-center pt-1 text-slate-500 group-hover:text-slate-600"
        }, /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => {
            if (idx === 0) return;
            const nb = [...assessmentBlocks];
            const [moved] = nb.splice(idx, 1);
            nb.splice(idx - 1, 0, moved);
            setAssessmentBlocks(nb);
            // Focus stays on this button, and its label silently becomes the
            // block's NEW position — a change a screen reader will not reliably
            // report on its own, so the move would be invisible to the user who
            // most needs confirming. stem_tool_coding.js announces its reorders
            // for exactly this reason.
            announceToSR('Block moved up to position ' + idx + ' of ' + assessmentBlocks.length + '.');
          },
          disabled: idx === 0,
          className: "px-1 leading-none text-xs rounded outline-none hover:text-indigo-600 focus:ring-2 focus:ring-indigo-400 disabled:opacity-30 disabled:hover:text-slate-500",
          "aria-label": "Move block " + (idx + 1) + " up"
        }, "▲"), /*#__PURE__*/React.createElement(GripVertical, {
          size: 16,
          className: "cursor-grab active:cursor-grabbing",
          "aria-hidden": "true"
        }), /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => {
            if (idx >= assessmentBlocks.length - 1) return;
            const nb = [...assessmentBlocks];
            const [moved] = nb.splice(idx, 1);
            nb.splice(idx + 1, 0, moved);
            setAssessmentBlocks(nb);
            announceToSR('Block moved down to position ' + (idx + 2) + ' of ' + assessmentBlocks.length + '.');
          },
          disabled: idx >= assessmentBlocks.length - 1,
          className: "px-1 leading-none text-xs rounded outline-none hover:text-indigo-600 focus:ring-2 focus:ring-indigo-400 disabled:opacity-30 disabled:hover:text-slate-500",
          "aria-label": "Move block " + (idx + 1) + " down"
        }, "▼")), /*#__PURE__*/React.createElement("div", {
          className: "flex-1 space-y-2"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, /*#__PURE__*/React.createElement("select", {
          // 'aria-label': 'Question type' also sat here. This object already ends
          // with "aria-label": "Block type", and the last duplicate key wins, so
          // the first was dead — the control has always announced "Block type".
          value: block.type,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].type = e.target.value;
            setAssessmentBlocks(nb);
          },
          className: "px-3 py-1.5 text-sm font-bold border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none",
          "aria-label": "Block type"
        }, /*#__PURE__*/React.createElement("option", {
          value: "computation"
        }, "\uD83D\uDD22 Computation"), /*#__PURE__*/React.createElement("option", {
          value: "word_problems"
        }, "\uD83D\uDCDD Word Problems"), /*#__PURE__*/React.createElement("option", {
          value: "fluency"
        }, "\u23F1\uFE0F Fluency Drill"), /*#__PURE__*/React.createElement("option", {
          value: "volume"
        }, "\uD83D\uDCE6 Volume"), /*#__PURE__*/React.createElement("option", {
          value: "fractions"
        }, "\uD83C\uDF55 Fractions"), /*#__PURE__*/React.createElement("option", {
          value: "geometry"
        }, "\uD83D\uDCD0 Geometry"), /*#__PURE__*/React.createElement("option", {
          value: "step_by_step"
        }, "\uD83D\uDCCA Step-by-Step"), /*#__PURE__*/React.createElement("option", {
          value: "custom"
        }, "\u2728 Custom"), /*#__PURE__*/React.createElement("option", {
          value: "manipulative"
        }, "\uD83E\uDDF1 Manipulative Response")), /*#__PURE__*/React.createElement("span", {
          className: "text-xs text-slate-500"
        }, "\xD7"), /*#__PURE__*/React.createElement("input", {
          type: "number",
          min: "1",
          max: "30",
          value: block.quantity,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
            setAssessmentBlocks(nb);
          },
          className: "w-14 px-2 py-1.5 text-sm font-mono border border-slate-400 rounded-lg text-center",
          "aria-label": "Quantity"
        }), block.type === 'fluency' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full"
        }, "\u23F1 Timed"), block.type === 'manipulative' && /*#__PURE__*/React.createElement("span", {
          className: "px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full"
        }, "\uD83E\uDDF1 Hands-on")), /*#__PURE__*/React.createElement("input", {
          value: block.directive,
          onChange: e => {
            const nb = [...assessmentBlocks];
            nb[idx].directive = e.target.value;
            setAssessmentBlocks(nb);
          },
          placeholder: "Directive (e.g. 'Single-digit multiplication', 'Division with remainders')...",
          // The placeholder was the only name this field had, and a placeholder
          // is gone the moment the user types — so anyone returning to a filled
          // form got an unlabelled text box (WCAG 3.3.2).
          "aria-label": "Block " + (idx + 1) + " directive",
          className: "w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none placeholder-slate-300"
        })), /*#__PURE__*/React.createElement("button", {
          onClick: () => setAssessmentBlocks(assessmentBlocks.filter((_, i) => i !== idx)),
          className: "p-1 text-slate-500 hover:text-red-500 transition-colors",
          "aria-label": "Remove block"
        }, /*#__PURE__*/React.createElement(X, {
          size: 14
        }))))), /*#__PURE__*/React.createElement("button", { "aria-label": "+ Add Block",
          onClick: () => setAssessmentBlocks([...assessmentBlocks, {
            id: 'b-' + Date.now(),
            type: 'computation',
            quantity: 5,
            directive: ''
          }]),
          className: "w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm rounded-xl hover:border-indigo-400 hover:text-indigo-500 transition-all"
        }, "+ Add Block"), assessmentBlocks.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "flex gap-3 pt-2"
        }, /*#__PURE__*/React.createElement("button", { "aria-label": "Generate assessment problems",
          onClick: () => {
            const fluencyBlocks = assessmentBlocks.filter(b => b.type === 'fluency');
            if (fluencyBlocks.length > 0 && assessmentBlocks.length === fluencyBlocks.length) {
              // Route to the LIVE fluency panel (MathFluencyPanel, mounted in the
              // sidebar math accordion under mathMode === 'Fluency Probes').
              // The old call here, startMathFluencyProbe(false), was the host's
              // DEAD implementation: its overlay was removed, so this button
              // showed a toast and nothing else while a 120s timer ran — and
              // before the finishMathFluencyProbe guard landed, that timer then
              // recorded a fabricated 0-attempt CBM result into the student's
              // probe history. The panel owns its own state, so all this button
              // must do is put it on screen.
              // Hand the panel what the blocks actually carry: their total
              // quantity. It used to be silently discarded at this seam
              // (migration plan enhancement #2). Free-text directives are NOT
              // parsed into settings; the panel consumes this slot once, on
              // mount, snapping the count to its own fixed options.
              try {
                window.__alloFluencyPendingConfig = {
                  problemCount: fluencyBlocks.reduce((s, b) => s + (Math.floor(Number(b.quantity)) || 0), 0),
                  at: Date.now()
                };
                // For the case where the panel is ALREADY mounted (teacher was
                // in Fluency Probes mode before opening Math Studio).
                window.dispatchEvent(new CustomEvent('alloflow:fluency-pending-config'));
              } catch (e) {}
              if (typeof setMathMode === 'function') setMathMode('Fluency Probes');
              if (typeof setExpandedTools === 'function') setExpandedTools(prev => (Array.isArray(prev) && prev.includes('math')) ? prev : [...(Array.isArray(prev) ? prev : []), 'math']);
              onClose();
              // Not the old "Fluency drill started!" key: nothing has started —
              // the panel opened, and saying otherwise is how this button lied
              // for a month. Fallback-first pattern matches the rest of this file.
              addToast(t('stem.fluency.panel_opened') || 'Fluency Probes is open in the Math panel. Set the operation and press Start.', 'info');
              return;
            }
            const nonFluencyBlocks = assessmentBlocks.filter(b => b.type !== 'fluency');
            // A MIXED assessment reaches here (the branch above only fires when
            // EVERY block is fluency), and fluency blocks cannot be generated
            // into a printed document — they are a timed interactive probe. They
            // used to be dropped without a word, so a teacher who composed
            // "10 computation + 1 fluency" got a document silently missing a
            // section. Say what is happening instead.
            if (fluencyBlocks.length > 0) {
              addToast(t('stem.fluency.mixed_blocks_note') || ('Note: ' + fluencyBlocks.length + ' fluency block(s) are not part of the generated document. Run them from the Math panel’s Fluency Probes mode.'), 'warning');
            }
            setMathInput('Building assessment: ' + nonFluencyBlocks.length + ' sections...');
            setMathMode('Freeform Builder');
            setActiveView('math');
            onClose();
            addToast('⏳ Generating assessment... ' + nonFluencyBlocks.length + ' sections', 'info');

            // Chunked generation: one callGemini per block, merge results, push to history once
            (async () => {
              const allProblems = [];
              let blockErrors = 0;
              for (let bi = 0; bi < nonFluencyBlocks.length; bi++) {
                const block = nonFluencyBlocks[bi];
                const blockLabel = block.type.replace(/_/g, ' ');
                addToast('🔄 Section ' + (bi + 1) + '/' + nonFluencyBlocks.length + ': ' + blockLabel + ' (' + block.quantity + ')...', 'info');
                const blockPrompt = 'You are an Expert Math Curriculum Designer.\n' +
                  'Generate EXACTLY ' + block.quantity + ' ' + blockLabel + ' math problems for grade ' + gradeLevel + '.\n' +
                  (block.directive && block.directive !== 'general' ? 'Focus area: ' + block.directive + '.\n' : '') +
                  'Subject: ' + (mathSubject || 'General Math') + '.\n\n' +
                  'Return a JSON object: {"title":"<section title>","problems":[{"question":"...","expression":"...","answer":<number or string>,"steps":[{"explanation":"...","latex":"..."}],"realWorld":"1-2 sentence real-life connection naming a specific career or situation where this skill is used — NOT a word problem restatement"}]}\n' +
                  'IMPORTANT: Return ONLY valid JSON. Every problem MUST have question, answer, and steps.';
                try {
                  const result = await callGemini(blockPrompt, true);
                  if (!result) throw new Error('Empty response');
                  let cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                  const startBrace = cleaned.indexOf('{');
                  if (startBrace > 0) cleaned = cleaned.substring(startBrace);
                  const endBrace = cleaned.lastIndexOf('}');
                  if (endBrace > 0) cleaned = cleaned.substring(0, endBrace + 1);
                  let parsed = null;
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { parsed = JSON.parse(window.jsonrepair(cleaned)); } catch (e) { /* fall through */ }
                  }
                  if (!parsed) parsed = JSON.parse(cleaned);
                  const problems = Array.isArray(parsed.problems) ? parsed.problems : (parsed.question ? [parsed] : []);
                  if (problems.length > 0) {
                    problems.forEach(p => { p._blockType = blockLabel; });
                    allProblems.push(...problems);
                    console.log('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + '): ' + problems.length + ' problems parsed');
                  } else {
                    throw new Error('No problems in parsed response');
                  }
                } catch (e) {
                  console.warn('[ASSESS] Block ' + (bi + 1) + ' (' + blockLabel + ') failed:', e.message);
                  blockErrors++;
                }
                if (bi < nonFluencyBlocks.length - 1) {
                  await new Promise(r => setTimeout(r, 500));
                }
              }
              if (allProblems.length === 0) {
                addToast('Assessment generation failed — no problems could be generated. Try fewer sections.', 'error');
              } else {
                allProblems.forEach(p => {
                  if (!Array.isArray(p.steps)) p.steps = [];
                  p.steps = p.steps.map(s => typeof s === 'string' ? { explanation: s, latex: '' } : s);
                });
                const normalizedContent = {
                  title: 'Assessment: ' + (mathSubject || 'General Math') + ' (Grade ' + gradeLevel + ')',
                  problems: allProblems,
                  graphData: null
                };
                const newItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  type: 'math',
                  data: normalizedContent,
                  meta: (mathSubject || 'General Math') + ' - Assessment',
                  title: normalizedContent.title,
                  timestamp: new Date(),
                  config: {}
                };
                setHistory(prev => [...prev, newItem]);
                // Trigger display by calling handleGenerateMath with a tiny prompt to show the last result
                // The problems are already in history, so user can access them from Resources
                if (blockErrors > 0) {
                  addToast('Assessment partially generated — ' + allProblems.length + ' problems (' + blockErrors + ' section(s) failed). Check Resources.', 'warning');
                } else {
                  addToast('✅ Assessment complete! ' + allProblems.length + ' problems across ' + nonFluencyBlocks.length + ' sections. Check Resources panel.', 'success');
                }
              }
            })();
          },
          className: "flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " Generate All (", assessmentBlocks.reduce((s, b) => s + b.quantity, 0), " problems)"), /*#__PURE__*/React.createElement("button", { "aria-label": "Save to Resources",
          onClick: () => {
            const stemAssessment = {
              id: 'stem-' + Date.now(),
              type: 'stem-assessment',
              title: t('stem.fluency.stem_assessment') + (mathSubject || 'General Math'),
              timestamp: Date.now(),
              data: {
                blocks: assessmentBlocks.map(b => ({
                  ...b
                })),
                subject: mathSubject || 'General Math',
                totalProblems: assessmentBlocks.reduce((s, b) => s + b.quantity, 0),
                results: null
              }
            };
            setHistory(prev => [...prev, stemAssessment]);
            addToast(t('stem.fluency.stem_assessment_saved_to_resources') + assessmentBlocks.length + ' blocks)', 'success');
          },
          className: "py-3 px-5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-bold rounded-xl text-sm hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
        }, "\uD83D\uDCBE Save to Resources")))
      : React.createElement("div", {
          className: "space-y-5 max-w-3xl mx-auto animate-in fade-in duration-200"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2"
        }, [{
          id: 'topic',
          label: '📋 From Topic'
        }, {
          id: 'content',
          label: '📖 From My Content'
        }, {
          id: 'solve',
          label: '✏️ Solve One'
        }].map(m => /*#__PURE__*/React.createElement("button", { "aria-label": m.label.replace(/[^\w\s]/g, '').trim() + ' mode',
          key: m.id,
          onClick: () => setStemLabCreateMode(m.id),
          className: `px-4 py-2 rounded-xl text-sm font-bold transition-all ${stemLabCreateMode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-400 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}`
        }, m.label)), /*#__PURE__*/React.createElement("div", {
          className: "flex-1"
        }), /*#__PURE__*/React.createElement("button", {
          // Direct door to the live timed-fluency panel (MathFluencyPanel in the
          // sidebar math accordion). Before this, Create's only fluency path was
          // hidden inside the Assessment Builder \u2014 compose blocks, set every one
          // to "fluency", press Generate \u2014 which nobody would discover. Same
          // routing as that branch; the panel owns its own state.
          "aria-label": t('stem.fluency.probe_button_aria') || 'Open the timed fluency probe in the Math panel',
          onClick: () => {
            if (typeof setMathMode === 'function') setMathMode('Fluency Probes');
            if (typeof setExpandedTools === 'function') setExpandedTools(prev => (Array.isArray(prev) && prev.includes('math')) ? prev : [...(Array.isArray(prev) ? prev : []), 'math']);
            onClose();
            addToast(t('stem.fluency.panel_opened') || 'Fluency Probes is open in the Math panel. Set the operation and press Start.', 'info');
          },
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-2"
        }, "\u23F1\uFE0F " + (t('stem.fluency.probe_button') || 'Fluency Probe')), /*#__PURE__*/React.createElement("button", { "aria-label": "Open assessment builder",
          onClick: () => setShowAssessmentBuilder(true),
          className: "px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-600 transition-all flex items-center gap-2"
        }, "\uD83D\uDCCB Build Assessment")), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500 uppercase"
        }, "Style:"), [{
          val: t('stem.solver.stepbystep'),
          label: t('stem.solver.stepbystep')
        }, {
          val: t('stem.solver.conceptual'),
          label: t('stem.solver.conceptual')
        }, {
          val: 'Real-World Application',
          label: t('stem.solver.realworld')
        }].map(s => /*#__PURE__*/React.createElement("button", { "aria-label": s.label + ' style',
          key: s.val,
          onClick: () => setMathMode(s.val),
          className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mathMode === s.val ? 'bg-blue-100 text-blue-700 border border-blue-600' : 'bg-white border border-slate-400 text-slate-500 hover:border-blue-200'}`
        }, s.label))), /*#__PURE__*/React.createElement("div", {
          className: "bg-slate-50 rounded-xl p-4 border border-slate-400"
        }, /*#__PURE__*/React.createElement("textarea", {
          value: mathInput,
          onChange: e => setMathInput(e.target.value),
          placeholder: stemLabCreateMode === 'solve' ? 'Enter a math problem to solve step-by-step...' : stemLabCreateMode === 'content' ? 'Paste or describe content to generate math problems from...' : 'Enter topic, standard, or description (e.g. "3rd grade multiplication word problems")...',
          className: "w-full h-28 px-4 py-3 text-sm border border-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white",
          "aria-label": "Math problem input"
        }), stemLabCreateMode === 'content' && /*#__PURE__*/React.createElement("p", {
          // "From My Content" never needed the teacher to re-paste the lesson:
          // handleGenerateMath attaches the current source itself, gated on the
          // useMathSourceContext flag (a MathPanel checkbox, default on). The
          // placeholder said "Paste or describe content", so teachers pasted
          // text the app already holds. Say what will actually happen instead.
          className: "text-xs mt-2 font-semibold " + (useMathSourceContext !== false && hasSourceOrAnalysis ? "text-emerald-700" : "text-amber-700"),
          role: "note"
        }, useMathSourceContext !== false && hasSourceOrAnalysis
          ? (t('stem.solver.content_source_attached') || '📎 Your current lesson content is attached automatically. Describe what to focus on; no need to paste it.')
          : hasSourceOrAnalysis
            ? (t('stem.solver.content_source_off') || 'Source attachment is turned off in the Math panel settings, so only what you type here is used.')
            : (t('stem.solver.content_source_none') || 'No lesson content is loaded yet. Add source text first, or describe the content here.')
        ), stemLabCreateMode !== 'solve' && /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-4 mt-3"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-bold text-slate-500"
        }, "Quantity:"), /*#__PURE__*/React.createElement("input", {
          type: "range",
          min: "1",
          max: "20",
          value: mathQuantity,
          onChange: e => setMathQuantity(parseInt(e.target.value)),
          // The visible "Quantity:" caption beside this slider is a <span>, which
          // names nothing. An unnamed range input announces only a bare number.
          "aria-label": "Quantity",
          className: "flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-sm font-bold text-indigo-700 w-8 text-center"
        }, mathQuantity))), /*#__PURE__*/React.createElement("button", { "aria-label": "Generate math problems",
          onClick: () => {
            // Resolve the mode ONCE and hand it to handleGenerateMath as
            // modeOverride. This button used to stage the mode and navigate to
            // the math view without ever generating — the teacher had to find
            // the sidebar's Generate themselves. The staging-vs-state race that
            // likely caused that (a freshly set mode is not yet readable) is
            // exactly what the modeOverride parameter exists for.
            let resolvedMode;
            if (stemLabCreateMode === 'content') {
              resolvedMode = 'Word Problems from Source';
            } else if (stemLabCreateMode === 'solve') {
              resolvedMode = 'Freeform Builder';
            } else {
              resolvedMode = (mathMode === 'Freeform Builder' || mathMode === 'Word Problems from Source') ? 'Problem Set Generator' : mathMode;
            }
            setMathMode(resolvedMode);
            if (typeof handleGenerateMath === 'function') {
              // switchView=true: handleGenerateMath clears stale content and
              // sets activeView('math') itself.
              handleGenerateMath(mathInput, true, resolvedMode);
              // Close so the teacher sees the generation progress they just
              // started. The old "stay open" comment here dated from when this
              // button generated nothing, so closing WAS abrupt: it dumped you
              // on an unchanged math view. Assessment building is unaffected —
              // the Builder has its own generate path and stays open.
              onClose();
            } else {
              // Older host without the handler in the bag: old behaviour.
              setActiveView('math');
            }
          },
          disabled: !mathInput.trim(),
          className: "w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        }, /*#__PURE__*/React.createElement(Sparkles, {
          size: 16
        }), " ", stemLabCreateMode === 'solve' ? 'Solve Problem' : 'Generate Problems'), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2 pt-1"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500 font-bold uppercase"
        }, "Tools:"), [{
          // @tool volume
          id: 'volume',
          icon: '📦',
          label: t('stem.assessment.volume_explorer')
        }, {
          id: 'numberline',
          icon: '📏',
          label: t('stem.assessment.number_line')
        }, {
          // @tool areamodel
          id: 'areamodel',
          icon: '🟧',
          label: t('stem.assessment.area_model')
        }, {
          id: 'fractionViz',
          icon: '🍕',
          label: t('stem.assessment.fraction_lab')
        }].map(tool => /*#__PURE__*/React.createElement("button", { "aria-label": "Open " + tool.label,
          key: tool.id,
          onClick: () => {
            onClose();
            try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(tool.id); } catch (e) {}
            if (typeof setStemLabTool === 'function') setStemLabTool(tool.id);
            if (typeof setStemLabTab === 'function') setStemLabTab('explore');
            if (typeof setShowStemLab === 'function') setShowStemLab(true);
          },
          className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
        }, tool.icon, " ", tool.label))));

    return React.createElement("div", {
      className: "fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: function (e) { if (e.target === e.currentTarget) onClose(); }
    }, React.createElement("div", {
      ref: dialogRef,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "math-create-title",
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
    }, React.createElement("div", {
      className: "flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50"
    }, React.createElement("div", null,
      React.createElement("h2", { id: "math-create-title", className: "font-bold text-slate-800 text-lg" }, "🧮 " + (t('math_create.title') || 'Math Studio')),
      React.createElement("p", { className: "text-xs text-slate-500" }, t('math_create.subtitle') || 'Create math problems, assessments, and fluency practice.')
    ), React.createElement("button", {
      ref: closeBtnRef, type: "button", onClick: onClose,
      className: "min-w-11 min-h-11 text-slate-600 hover:text-slate-800 text-2xl leading-none px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500",
      "aria-label": t('common.close') || 'Close Math Studio'
    }, React.createElement(X, { size: 20 }))),
      React.createElement("div", { className: "p-5 overflow-y-auto flex-1" }, body),
      React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" }, srMsg)
    ));
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathCreate = { MathCreateModal: MathCreateModal };
  window.AlloModules.MathCreateModule = true;
})();
