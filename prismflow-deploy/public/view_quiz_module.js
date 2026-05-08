/**
 * AlloFlow View - Quiz Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='quiz' block.
 * Source range (post-Phase 1 lift of inline Firestore handlers): ~629 lines.
 * Renders: live-session controls (start/toggle/end via lifted host handlers),
 * presentation mode (slide-by-slide quiz), review game (Jeopardy-style board),
 * escape room (delegated to AlloModules.EscapeRoomGameplay), edit/student
 * quiz card view, fact-check panel, reflections.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizView) {
    console.log('[CDN] ViewQuizModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewQuizModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Wifi = _lazyIcon('Wifi');
  var Users = _lazyIcon('Users');
  var Lock = _lazyIcon('Lock');
  var Unlock = _lazyIcon('Unlock');
  var CheckCircle = _lazyIcon('CheckCircle');
  var MonitorPlay = _lazyIcon('MonitorPlay');
  var XCircle = _lazyIcon('XCircle');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var DoorOpen = _lazyIcon('DoorOpen');
  var FolderDown = _lazyIcon('FolderDown');
  var Pencil = _lazyIcon('Pencil');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var CheckSquare = _lazyIcon('CheckSquare');
  var Volume2 = _lazyIcon('Volume2');
  var MicOff = _lazyIcon('MicOff');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Plus = _lazyIcon('Plus');
  var Brain = _lazyIcon('Brain');
  var Languages = _lazyIcon('Languages');
  var Search = _lazyIcon('Search');
  var X = _lazyIcon('X');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronUp = _lazyIcon('ChevronUp');
  var Info = _lazyIcon('Info');
  var Eye = _lazyIcon('Eye');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var ShieldCheck = _lazyIcon('ShieldCheck');

  // ─── Plan S Slice 4: shuffle helper ───────────────────────────────────
  // Fisher-Yates shuffle. Used for sequencing (shuffle the items so students
  // can't read the correct order off the array) and matching (shuffle the
  // right column).
  function _quizShuffleCopy(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // ─── SequenceSenseCard (Plan S Slice 5) ───────────────────────────────
  // 3-step diagnostic that probes verification + diagnosis + metacognitive
  // reasoning about WHY ordering matters. Genuinely distinct from Timeline
  // (which produces an order); this verifies, diagnoses, AND identifies
  // the underlying principle. Deterministic grade.
  function SequenceSenseCard(p) {
    var q = p.q;
    var canonicalItems = Array.isArray(q.items) ? q.items.filter(Boolean) : [];
    var intentionallyWrongIndex = (typeof q.intentionallyWrongIndex === 'number') ? q.intentionallyWrongIndex : null;
    var orderingPrinciple = q.orderingPrinciple || 'chronological';
    var principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 2
      ? q.principleOptions
      : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];

    // Derive presentedOrder: use q.presentedOrder if provided, else shuffle once on first render.
    var presentedOrderState = React.useState(function () {
      if (Array.isArray(q.presentedOrder) && q.presentedOrder.length === canonicalItems.length) {
        return q.presentedOrder.slice();
      }
      // Fallback: shuffle indices
      var indices = canonicalItems.map(function (_, i) { return i; });
      for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
      }
      return indices;
    });
    var presentedOrder = presentedOrderState[0];

    var stepState = React.useState(1);  // 1 = verify, 2 = click misplaced, 3 = principle, 'done'
    var step = stepState[0]; var setStep = stepState[1];
    var verifyState = React.useState(null);  // 'yes' | 'no'
    var verifyAnswer = verifyState[0]; var setVerifyAnswer = verifyState[1];
    var clickedState = React.useState(null);  // index in presentedOrder of which item student thought was misplaced
    var clickedIdx = clickedState[0]; var setClickedIdx = clickedState[1];
    var principleState = React.useState(null);
    var principleAnswer = principleState[0]; var setPrincipleAnswer = principleState[1];
    var gradeState = React.useState(null);  // {step1Correct, step2Correct, step3Correct, status, score}
    var grade = gradeState[0]; var setGrade = gradeState[1];

    function answerVerify(ans) {
      setVerifyAnswer(ans);
      // If user says "No", they need to identify the misplaced item; if "Yes", skip to principle.
      setStep(ans === 'no' ? 2 : 3);
    }

    function answerMisplaced(idx) {
      setClickedIdx(idx);
      setStep(3);
    }

    function answerPrinciple(p2) {
      setPrincipleAnswer(p2);
      // Compute composite grade
      var actualOrderIsCorrect = (intentionallyWrongIndex === null);
      var step1Correct = (verifyAnswer === 'yes') ? actualOrderIsCorrect : !actualOrderIsCorrect;
      var step2Correct;
      if (verifyAnswer === 'yes') {
        // User skipped step 2 — give credit if their step 1 was right (the order really was correct)
        step2Correct = step1Correct;
      } else {
        step2Correct = (clickedIdx === intentionallyWrongIndex);
      }
      var step3Correct = (p2 === orderingPrinciple);
      var score = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (step3Correct ? 1 : 0);
      var status = score === 3 ? 'correct' : score === 2 ? 'partially-correct' : 'incorrect';
      setGrade({ step1Correct: step1Correct, step2Correct: step2Correct, step3Correct: step3Correct, status: status, score: score });
      setStep('done');
      // Plan T Slice Ta: live session response capture for sequence-sense
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'sequence-sense',
            conceptLabel: (q && q.conceptLabel) || '',
            answer: {
              verifyAnswer: verifyAnswer,
              clickedIdx: clickedIdx,
              principleAnswer: p2,
              score: score,
              status: status,
            },
            timestamp: Date.now(),
          });
        } catch (e) { /* swallow */ }
      }
    }

    function reset() {
      setStep(1);
      setVerifyAnswer(null);
      setClickedIdx(null);
      setPrincipleAnswer(null);
      setGrade(null);
    }

    if (canonicalItems.length === 0) return null;

    var statusColor = grade && grade.status === 'correct' ? 'emerald' :
                      grade && grade.status === 'partially-correct' ? 'amber' :
                      grade ? 'rose' : 'slate';

    return React.createElement('div', {
      className: 'bg-white p-5 rounded-xl border border-slate-300 shadow-sm',
    },
      React.createElement('div', { className: 'flex items-start gap-3 mb-3' },
        React.createElement('span', { className: 'flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5' }, p.itemNumber),
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('span', { className: 'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1' }, 'Sequence Sense'),
          React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, q.question || 'Below is a sequence. Verify and explain.')
        )
      ),
      // Items list — clickable in step 2, otherwise read-only
      React.createElement('ol', { className: 'space-y-1.5 mb-3' },
        presentedOrder.map(function (canonicalIdx, displayIdx) {
          var item = canonicalItems[canonicalIdx];
          var isClickable = step === 2;
          var isClicked = clickedIdx === displayIdx;
          var showCorrectness = grade !== null;
          var thisIsActuallyMisplaced = (intentionallyWrongIndex === displayIdx);
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyMisplaced) rowClass = 'bg-amber-50 border-amber-400';
            else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';
            else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return React.createElement('li', {
            key: displayIdx,
            onClick: isClickable ? function () { answerMisplaced(displayIdx); } : null,
            className: 'flex items-center gap-2 px-3 py-2 rounded-lg border ' + rowClass,
            role: isClickable ? 'button' : undefined,
            tabIndex: isClickable ? 0 : undefined,
            onKeyDown: isClickable ? function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); answerMisplaced(displayIdx); } } : undefined,
          },
            React.createElement('span', { className: 'flex-shrink-0 text-xs font-bold text-slate-500 w-6' }, (displayIdx + 1) + '.'),
            React.createElement('span', { className: 'flex-1 text-sm text-slate-800' }, item),
            showCorrectness && thisIsActuallyMisplaced && React.createElement('span', { className: 'text-xs font-bold text-amber-700' }, '↔ misplaced'),
            showCorrectness && isClicked && !thisIsActuallyMisplaced && React.createElement('span', { className: 'text-xs font-bold text-rose-700' }, '✗')
          );
        })
      ),
      // Step 1: verify
      step === 1 && React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-200' },
        React.createElement('div', { className: 'text-sm font-semibold text-indigo-900 mb-2' }, 'Step 1 of 3 — Is this order correct?'),
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', {
            type: 'button',
            onClick: function () { answerVerify('yes'); },
            className: 'flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors',
          }, '✓ Yes, correct'),
          React.createElement('button', {
            type: 'button',
            onClick: function () { answerVerify('no'); },
            className: 'flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors',
          }, '✗ No, something is off')
        )
      ),
      // Step 2: click the misplaced
      step === 2 && React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-200' },
        React.createElement('div', { className: 'text-sm font-semibold text-indigo-900' }, 'Step 2 of 3 — Click the item that\'s out of place above.')
      ),
      // Step 3: pick the principle
      step === 3 && React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-200' },
        React.createElement('div', { className: 'text-sm font-semibold text-indigo-900 mb-2' }, 'Step 3 of 3 — What\'s the ordering principle?'),
        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
          principleOptions.map(function (opt) {
            return React.createElement('button', {
              key: opt,
              type: 'button',
              onClick: function () { answerPrinciple(opt); },
              className: 'px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors',
            }, opt);
          })
        )
      ),
      // Grade panel (after step 'done')
      grade && React.createElement('div', {
        className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
        role: 'status',
        'aria-live': 'polite',
      },
        React.createElement('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
          React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900' },
            grade.score + ' / 3 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review'))
        ),
        React.createElement('ul', { className: 'space-y-1 text-sm text-' + statusColor + '-900' },
          React.createElement('li', null, (grade.step1Correct ? '✓ ' : '✗ ') + 'Verify: ' + (intentionallyWrongIndex === null ? 'order was correct' : 'order had one misplaced item') + (grade.step1Correct ? '' : ' (you said "' + verifyAnswer + '")')),
          verifyAnswer === 'no' && React.createElement('li', null, (grade.step2Correct ? '✓ ' : '✗ ') + 'Diagnose: ' + (grade.step2Correct ? 'you found the misplaced item' : 'the misplaced item was item #' + ((intentionallyWrongIndex || 0) + 1))),
          React.createElement('li', null, (grade.step3Correct ? '✓ ' : '✗ ') + 'Principle: ' + (grade.step3Correct ? '"' + orderingPrinciple + '"' : 'correct answer was "' + orderingPrinciple + '" (you picked "' + principleAnswer + '")'))
        ),
        React.createElement('button', {
          type: 'button',
          onClick: reset,
          className: 'mt-2 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300',
        }, 'Try again')
      )
    );
  }

  // ─── RelationMismatchCard (Plan S Slice 5) ────────────────────────────
  // 2-step diagnostic: find the wrong pair, then pick the correct partner.
  // Distinct from Glossary's matching/memory game (which tests recall of all
  // pairs). This tests pair-error recognition + corrective reasoning.
  // Deterministic grade.
  function RelationMismatchCard(p) {
    var q = p.q;
    var pairs = Array.isArray(q.pairs) ? q.pairs.filter(function (pr) { return pr && pr.left && pr.right; }) : [];
    var wrongPairIndex = (typeof q.wrongPairIndex === 'number') ? q.wrongPairIndex : 0;
    var correctPartnerForWrong = q.correctPartnerForWrong || '';
    var candidatePartners = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];

    var stepState = React.useState(1);
    var step = stepState[0]; var setStep = stepState[1];
    var clickedPairState = React.useState(null);
    var clickedPairIdx = clickedPairState[0]; var setClickedPairIdx = clickedPairState[1];
    var partnerAnswerState = React.useState(null);
    var partnerAnswer = partnerAnswerState[0]; var setPartnerAnswer = partnerAnswerState[1];
    var gradeState = React.useState(null);
    var grade = gradeState[0]; var setGrade = gradeState[1];

    function answerWhichWrong(idx) {
      setClickedPairIdx(idx);
      setStep(2);
    }

    function answerPartner(ans) {
      setPartnerAnswer(ans);
      var step1Correct = (clickedPairIdx === wrongPairIndex);
      var step2Correct = (ans === correctPartnerForWrong);
      var score = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0);
      var status = score === 2 ? 'correct' : score === 1 ? 'partially-correct' : 'incorrect';
      setGrade({ step1Correct: step1Correct, step2Correct: step2Correct, status: status, score: score });
      setStep('done');
      // Plan T Slice Ta: live session response capture for relation-mismatch
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'relation-mismatch',
            conceptLabel: (q && q.conceptLabel) || '',
            answer: {
              clickedPairIdx: clickedPairIdx,
              partnerAnswer: ans,
              score: score,
              status: status,
            },
            timestamp: Date.now(),
          });
        } catch (e) { /* swallow */ }
      }
    }

    function reset() {
      setStep(1);
      setClickedPairIdx(null);
      setPartnerAnswer(null);
      setGrade(null);
    }

    if (pairs.length === 0) return null;

    var statusColor = grade && grade.status === 'correct' ? 'emerald' :
                      grade && grade.status === 'partially-correct' ? 'amber' :
                      grade ? 'rose' : 'slate';

    var wrongPairLeft = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';

    return React.createElement('div', {
      className: 'bg-white p-5 rounded-xl border border-slate-300 shadow-sm',
    },
      React.createElement('div', { className: 'flex items-start gap-3 mb-3' },
        React.createElement('span', { className: 'flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5' }, p.itemNumber),
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('span', { className: 'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1' }, 'Relation Mismatch'),
          React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, q.question || 'One of these pairs is wrong. Find it and fix it.')
        )
      ),
      // Step 1: pairs list (clickable to identify the wrong one)
      React.createElement('div', { className: 'space-y-1.5 mb-3' },
        pairs.map(function (pair, idx) {
          var isClickable = step === 1;
          var isClicked = clickedPairIdx === idx;
          var thisIsActuallyWrong = (idx === wrongPairIndex);
          var showCorrectness = grade !== null;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyWrong) rowClass = 'bg-amber-50 border-amber-400';
            else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';
            else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return React.createElement('div', {
            key: idx,
            onClick: isClickable ? function () { answerWhichWrong(idx); } : null,
            className: 'grid grid-cols-2 gap-3 px-3 py-2 rounded-lg border ' + rowClass,
            role: isClickable ? 'button' : undefined,
            tabIndex: isClickable ? 0 : undefined,
            onKeyDown: isClickable ? function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); answerWhichWrong(idx); } } : undefined,
          },
            React.createElement('span', { className: 'text-sm font-semibold text-slate-800' }, pair.left),
            React.createElement('span', { className: 'text-sm text-slate-700 flex items-center justify-between gap-2' },
              React.createElement('span', null, '↔ ' + pair.right),
              showCorrectness && thisIsActuallyWrong && React.createElement('span', { className: 'text-xs font-bold text-amber-700 flex-shrink-0' }, 'wrong'),
              showCorrectness && isClicked && !thisIsActuallyWrong && React.createElement('span', { className: 'text-xs font-bold text-rose-700 flex-shrink-0' }, '✗')
            )
          );
        })
      ),
      // Step 1 prompt
      step === 1 && React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-200' },
        React.createElement('div', { className: 'text-sm font-semibold text-indigo-900' }, 'Step 1 of 2 — Click the pair that\'s wrong above.')
      ),
      // Step 2: pick the correct partner
      step === 2 && React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-200' },
        React.createElement('div', { className: 'text-sm font-semibold text-indigo-900 mb-2' },
          'Step 2 of 2 — Which item should "' + (clickedPairIdx !== null && pairs[clickedPairIdx] ? pairs[clickedPairIdx].left : wrongPairLeft) + '" have been paired with?'),
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          (candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong]).map(function (cand) {
            return React.createElement('button', {
              key: cand,
              type: 'button',
              onClick: function () { answerPartner(cand); },
              className: 'px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors',
            }, cand);
          })
        )
      ),
      // Grade panel
      grade && React.createElement('div', {
        className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
        role: 'status',
        'aria-live': 'polite',
      },
        React.createElement('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
          React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900' },
            grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review'))
        ),
        React.createElement('ul', { className: 'space-y-1 text-sm text-' + statusColor + '-900' },
          React.createElement('li', null, (grade.step1Correct ? '✓ ' : '✗ ') + 'Find: ' + (grade.step1Correct ? 'you spotted the wrong pair' : 'the wrong pair was "' + wrongPairLeft + ' ↔ ' + (pairs[wrongPairIndex] ? pairs[wrongPairIndex].right : '') + '"')),
          React.createElement('li', null, (grade.step2Correct ? '✓ ' : '✗ ') + 'Fix: ' + (grade.step2Correct ? 'correct partner — "' + correctPartnerForWrong + '"' : 'correct partner was "' + correctPartnerForWrong + '" (you picked "' + partnerAnswer + '")'))
        ),
        React.createElement('button', {
          type: 'button',
          onClick: reset,
          className: 'mt-2 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300',
        }, 'Try again')
      )
    );
  }

  // ─── McqEnhancements (Plan S Slice 5+) ────────────────────────────────
  // Self-contained per-MCQ controls: inline AI Explain button, "I don't
  // know" non-penalized button, confidence rating. Each instance manages
  // its own state via useState so we don't have to thread per-question
  // state through QuizView. Mode-aware: only renders the controls the
  // current mode strategy enables.
  //
  // Injected into the existing MCQ render path at the end of each
  // question card. Mode-agnostic about whether the student answered
  // correctly — we don't track radio-button selection in standalone
  // (non-presentation) view, so Explain is always available rather than
  // gated on "got it wrong."
  function McqEnhancements(p) {
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
    if (!allowIDK && !allowConfidence && !aiExplainerEnabled) return null;

    var explainerState = React.useState({ open: false, loading: false, text: '', error: '' });
    var explainer = explainerState[0]; var setExplainer = explainerState[1];
    var idkState = React.useState(false);
    var idkMarked = idkState[0]; var setIdkMarked = idkState[1];
    var confidenceState = React.useState(null);
    var confidence = confidenceState[0]; var setConfidence = confidenceState[1];

    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({ open: true, loading: false, text: '', error: 'Explainer unavailable.' });
        return;
      }
      setExplainer({ open: true, loading: true, text: '', error: '' });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = (p.q && (p.q.question || p.q.correctAnswer)) || '';
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept. Question or concept: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = (raw && typeof raw === 'object' && raw.text) ? raw.text : String(raw || '');
        setExplainer({ open: true, loading: false, text: txt.trim(), error: '' });
      }).catch(function (err) {
        setExplainer({ open: true, loading: false, text: '', error: (err && err.message) ? err.message : 'Explainer failed.' });
      });
    }

    function markIDK() {
      setIdkMarked(true);
      requestExplainer();
      // Plan T Slice Ta: write IDK signal to live session if active
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'mcq',
            conceptLabel: (p.q && p.q.conceptLabel) || '',
            answer: { idk: true },
            timestamp: Date.now(),
          });
        } catch (e) { /* swallow */ }
      }
    }

    return React.createElement('div', { className: 'mt-3 ml-9 space-y-2' },
      // Action row: Explain / IDK
      (aiExplainerEnabled || allowIDK) && React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
        aiExplainerEnabled && !explainer.open && React.createElement('button', {
          type: 'button',
          onClick: requestExplainer,
          className: 'text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors',
          title: 'Get a quick AI explanation of this concept',
        }, '🤖 Explain this concept'),
        allowIDK && !idkMarked && React.createElement('button', {
          type: 'button',
          onClick: markIDK,
          className: 'text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors',
          title: 'Skip — no penalty. The AI will explain the concept.',
        }, '🤔 I don\'t know'),
        idkMarked && React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900' }, 'Marked "I don\'t know"')
      ),
      // Inline explainer panel
      explainer.open && React.createElement('div', { className: 'p-3 bg-indigo-50 border border-indigo-200 rounded-lg' },
        React.createElement('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1' }, '🤖 Quick explanation'),
        explainer.loading && React.createElement('p', { className: 'text-sm text-indigo-700 italic' }, 'Generating explanation…'),
        explainer.text && React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, explainer.text),
        explainer.error && React.createElement('p', { className: 'text-sm text-rose-700' }, explainer.error),
        explainer.text && typeof p.callTTS === 'function' && React.createElement('button', {
          type: 'button',
          onClick: function () { p.callTTS(explainer.text); },
          className: 'mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900',
          'aria-label': 'Read aloud',
        }, '🔊 Read aloud')
      ),
      // Confidence rating
      allowConfidence && React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-xs' },
        React.createElement('span', { className: 'text-slate-600 font-semibold' }, 'How sure were you?'),
        ['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = { knew: 'I knew this', guessed: 'I guessed', 'no-idea': 'No idea' };
          var active = confidence === lvl;
          return React.createElement('button', {
            key: lvl,
            type: 'button',
            onClick: function () { setConfidence(lvl); },
            className: 'px-2 py-0.5 rounded border transition-colors ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'),
          }, labels[lvl]);
        })
      )
    );
  }

  // ─── LiveResultsDashboard (Plan T Slice Tb) ───────────────────────────
  // Teacher-only, live-session-only. Reads sessionData.quizState.allResponses
  // (populated by Slice Ta) + roster, routes to a mode-specific aggregator
  // via QuizLiveAggregators.aggregateForMode, and renders one of three
  // visualizations:
  //
  //   gradebook       (exit-ticket): per-student score table
  //   preLessonGap    (pre-check):   concept cards sorted by % missing
  //   liveHeatmap     (formative + review fallback): per-question correct % bars
  //
  // Renders ABOVE the existing TeacherLiveQuizControls (which keeps doing
  // its presentation-mode option-distribution chart). Additive — no
  // disturbance to the legacy dashboard.
  function LiveResultsDashboard(p) {
    var aggsMod = window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (!aggsMod) return null;
    var sessionData = p.sessionData || {};
    var quizState = sessionData.quizState || {};
    var generatedContent = p.generatedContent;
    var roster = sessionData.roster || {};
    var mode = (generatedContent && generatedContent.data && generatedContent.data.mode) || 'exit-ticket';
    var modeLabel = (generatedContent && generatedContent.data && generatedContent.data.modeLabel) || 'Exit Ticket';
    var modeIcon = (generatedContent && generatedContent.data && generatedContent.data.modeIcon) || '📝';
    var appId = p.appId;

    // Plan T v3: for review mode, fetch concept-mastery docs for each student
    // in roster so the retention aggregator has cross-session data. Refetches
    // when roster key set changes. Uses __alloFirebase exposed at host.
    var conceptMasteryState = React.useState(null);
    var conceptMasteryByUid = conceptMasteryState[0]; var setConceptMasteryByUid = conceptMasteryState[1];
    var rosterKeysSig = Object.keys(roster).sort().join(',');
    React.useEffect(function () {
      if (mode !== 'review') { setConceptMasteryByUid(null); return; }
      var fb = window.__alloFirebase;
      if (!fb || !fb.doc || !fb.getDoc || !appId) { setConceptMasteryByUid({}); return; }
      var uids = Object.keys(roster);
      if (uids.length === 0) { setConceptMasteryByUid({}); return; }
      var cancelled = false;
      Promise.all(uids.map(function (uid) {
        try {
          var ref = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'conceptMastery', uid);
          return fb.getDoc(ref).then(function (snap) {
            return [uid, snap.exists() ? snap.data() : null];
          }).catch(function () { return [uid, null]; });
        } catch (e) { return Promise.resolve([uid, null]); }
      })).then(function (results) {
        if (cancelled) return;
        var map = {};
        results.forEach(function (entry) {
          if (entry && entry[1]) map[entry[0]] = entry[1];
        });
        setConceptMasteryByUid(map);
      }).catch(function () {
        if (!cancelled) setConceptMasteryByUid({});
      });
      return function () { cancelled = true; };
    }, [mode, rosterKeysSig, appId]);

    // Plan T v3+: async LLM grading for freeform responses (short-answer +
    // self-explanation). Walks responses, finds ungraded freeform text, calls
    // QuizAIHelpers.gradeFreeformAnswer in parallel, caches by '<uid>:<qIdx>'.
    // The cache is passed to the aggregator, which overrides 'submitted' →
    // 'correct'/'incorrect' so freeform items contribute to gradebook scores.
    var aiGradedState = React.useState({});
    var aiGradedCache = aiGradedState[0]; var setAiGradedCache = aiGradedState[1];
    var aiGradedInFlightRef = React.useRef({});
    var allResponsesSig = React.useMemo(function () {
      try { return JSON.stringify(quizState.allResponses || {}); } catch (e) { return ''; }
    }, [quizState.allResponses]);
    React.useEffect(function () {
      var aiHelpers = window.AlloModules && window.AlloModules.QuizAIHelpers;
      if (!aiHelpers || typeof p.callGemini !== 'function') return;
      var allResponses = quizState.allResponses || {};
      var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
      var pending = [];
      Object.keys(allResponses).forEach(function (uid) {
        var perStudent = allResponses[uid] || {};
        Object.keys(perStudent).forEach(function (qKey) {
          var qIdx = parseInt(qKey, 10);
          if (isNaN(qIdx) || !questions[qIdx]) return;
          var response = perStudent[qKey];
          if (!response || !response.answer || response.answer.idk) return;
          var q = questions[qIdx];
          var t = response.itemType || (q && q.type);
          if (t !== 'short-answer' && t !== 'self-explanation') return;
          var text = (response.answer && response.answer.text) || '';
          if (!text || !text.trim()) return;
          var key = uid + ':' + qIdx;
          if (aiGradedCache[key] || aiGradedInFlightRef.current[key]) return;
          pending.push({ key: key, q: q, text: text });
        });
      });
      if (pending.length === 0) return;
      pending.forEach(function (item) { aiGradedInFlightRef.current[item.key] = true; });
      Promise.all(pending.map(function (item) {
        return aiHelpers.gradeFreeformAnswer({
          question: item.q.question || item.q.contextSentence || '',
          expectedAnswer: item.q.expectedAnswer || item.q.exemplarAnswer || item.q.expectedFill || '',
          studentResponse: item.text,
          gradeLevel: p.gradeLevel,
          callGemini: p.callGemini,
        }).then(function (result) {
          return { key: item.key, result: result };
        }).catch(function (err) {
          return { key: item.key, result: { status: 'error', feedback: (err && err.message) || 'Grader failed.' } };
        });
      })).then(function (results) {
        setAiGradedCache(function (prev) {
          var next = Object.assign({}, prev);
          results.forEach(function (r) {
            next[r.key] = r.result;
            delete aiGradedInFlightRef.current[r.key];
          });
          return next;
        });
      }).catch(function () {
        // On unexpected failure, clear in-flight markers so they can retry next render
        pending.forEach(function (item) { delete aiGradedInFlightRef.current[item.key]; });
      });
    }, [allResponsesSig, generatedContent && generatedContent.id]);

    // Count in-flight grades for the header badge
    var inFlightCount = Object.keys(aiGradedInFlightRef.current || {}).length;

    // Plan T v3+: gradebook drill-down — track which student rows are expanded
    // so teacher can see per-question student responses (incl. AI feedback for
    // freeform answers). Only used by the gradebook variant; safe no-op for others.
    var expandedRowsState = React.useState({});
    var expandedRows = expandedRowsState[0]; var setExpandedRows = expandedRowsState[1];
    function toggleRowExpanded(uid) {
      setExpandedRows(function (prev) {
        var next = Object.assign({}, prev);
        if (next[uid]) delete next[uid]; else next[uid] = true;
        return next;
      });
    }

    // Plan T v3+: heatmap drill-down — expand a per-question bar to see
    // per-student status. Click a bar with responses to toggle.
    var expandedBarsState = React.useState({});
    var expandedBars = expandedBarsState[0]; var setExpandedBars = expandedBarsState[1];
    function toggleBarExpanded(qIdx) {
      setExpandedBars(function (prev) {
        var next = Object.assign({}, prev);
        if (next[qIdx]) delete next[qIdx]; else next[qIdx] = true;
        return next;
      });
    }

    // Plan T v3+: "Explain to class" — when a Pre-Check gap surfaces a concept
    // most students missed, teacher can click 🎓 to generate a 60-90 word
    // age-appropriate explainer they can immediately read aloud. Modal shows
    // the explainer with regen / copy / play-aloud (TTS) / close. Pure
    // teacher-side; no push to student screens in this slice.
    var explainerModalState = React.useState({ open: false, conceptIdx: null, conceptText: '', loading: false, text: '', error: '' });
    var explainerModal = explainerModalState[0]; var setExplainerModal = explainerModalState[1];
    function openExplainer(conceptIdx, conceptText) {
      setExplainerModal({ open: true, conceptIdx: conceptIdx, conceptText: conceptText, loading: true, text: '', error: '' });
      runExplainerCall(conceptText);
    }
    function runExplainerCall(conceptText) {
      if (typeof p.callGemini !== 'function') {
        setExplainerModal(function (prev) { return Object.assign({}, prev, { loading: false, error: 'Explainer unavailable: callGemini not provided.' }); });
        return;
      }
      var grade = p.gradeLevel || 'middle school';
      var prompt = 'You are explaining a concept to ' + grade + ' students who do not yet understand it. They just took a pre-check and got it wrong as a class. Write a 60-90 word explainer that: (1) names the concept clearly, (2) gives ONE concrete relatable example, (3) avoids jargon, (4) reads aloud naturally. Plain text only. No markdown, no fences, no headers.\n\nCONCEPT (from the pre-check question that the class missed):\n"' + String(conceptText || '').slice(0, 400) + '"\n\nReturn ONLY the explainer text.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = (typeof raw === 'object' && raw && raw.text) ? raw.text : String(raw || '');
        txt = txt.replace(/^```(?:[a-z]+)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        setExplainerModal(function (prev) { return Object.assign({}, prev, { loading: false, text: txt, error: '' }); });
      }).catch(function (err) {
        setExplainerModal(function (prev) { return Object.assign({}, prev, { loading: false, error: (err && err.message) || 'Explainer call failed.' }); });
      });
    }
    function closeExplainer() {
      setExplainerModal({ open: false, conceptIdx: null, conceptText: '', loading: false, text: '', error: '' });
    }
    function copyExplainer() {
      if (!explainerModal.text) return;
      try { navigator.clipboard.writeText(explainerModal.text); } catch (e) { /* noop */ }
    }
    function playExplainer() {
      if (!explainerModal.text || typeof p.callTTS !== 'function') return;
      try { p.callTTS(explainerModal.text); } catch (e) { /* noop */ }
    }

    var aggResult;
    try {
      aggResult = aggsMod.aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache);
    } catch (e) {
      console.warn('[LiveResultsDashboard] aggregator failed:', e);
      return null;
    }
    if (!aggResult || !aggResult.data) return null;
    var data = aggResult.data;
    var variant = aggResult.variant;

    // Header (shared across variants). When freeform responses are still being
    // graded by the LLM, surface a small spinner-style badge so the teacher
    // knows the gradebook numbers will rise as grading completes.
    var header = React.createElement('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
      React.createElement('span', { className: 'text-2xl', 'aria-hidden': 'true' }, modeIcon),
      React.createElement('h3', { className: 'font-black text-lg text-slate-800' }, 'Live Results — ' + modeLabel),
      React.createElement('span', { className: 'text-xs text-slate-600' },
        data.totalStudents + ' student' + (data.totalStudents === 1 ? '' : 's') + ' · ' + data.totalQuestions + ' question' + (data.totalQuestions === 1 ? '' : 's')),
      inFlightCount > 0 && React.createElement('span', {
        className: 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 animate-pulse',
        title: inFlightCount + ' open-response answer' + (inFlightCount === 1 ? '' : 's') + ' being graded by AI',
      }, '✨ AI grading ' + inFlightCount + '…')
    );

    // Empty state (no responses yet)
    var hasAnyResponses = false;
    if (variant === 'gradebook') {
      hasAnyResponses = data.studentRows.some(function (r) { return r.totalAnswered > 0; });
    } else if (variant === 'preLessonGap') {
      hasAnyResponses = data.conceptCards.some(function (c) { return c.totalAnswered > 0; });
    } else if (variant === 'retentionCurve') {
      hasAnyResponses = Array.isArray(data.conceptRows) && data.conceptRows.some(function (row) {
        return row.students.some(function (s) { return s.seen; });
      });
    } else {
      hasAnyResponses = data.bars.some(function (b) { return b.total > 0; });
    }

    if (!hasAnyResponses) {
      return React.createElement('div', {
        className: 'p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 mb-4',
      },
        header,
        React.createElement('p', { className: 'text-sm text-slate-600 italic' },
          'Waiting for student responses. Results will appear here as students submit answers in this live session.')
      );
    }

    // Render mode-specific body
    var body;
    if (variant === 'gradebook') {
      // Per-student table with expand-to-drill-down per row
      var statusBadge = function (cell) {
        if (!cell) return React.createElement('span', { className: 'text-slate-300', title: 'No response' }, '—');
        if (cell.status === 'correct') return React.createElement('span', { className: 'text-emerald-600', title: cell.aiGraded ? 'AI-graded correct' : 'Correct' }, '✓');
        if (cell.status === 'incorrect') return React.createElement('span', { className: 'text-rose-600', title: cell.aiGraded ? 'AI-graded incorrect' : 'Incorrect' }, '✗');
        if (cell.status === 'idk') return React.createElement('span', { className: 'text-sky-600', title: 'Marked I don\'t know' }, '🤔');
        if (cell.status === 'partially-correct') return React.createElement('span', { className: 'text-amber-600', title: 'Partially correct' }, '◐');
        return React.createElement('span', { className: 'text-slate-400', title: 'Submitted (ungraded)' }, '·');
      };
      body = React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'w-full text-sm border-collapse' },
          React.createElement('thead', null,
            React.createElement('tr', { className: 'bg-slate-100' },
              React.createElement('th', { className: 'w-7 px-1 py-1.5', 'aria-label': 'Expand row' }),
              React.createElement('th', { className: 'text-left px-2 py-1.5 font-bold text-slate-700' }, 'Student'),
              React.createElement('th', { className: 'text-center px-2 py-1.5 font-bold text-slate-700' }, 'Answered'),
              React.createElement('th', { className: 'text-center px-2 py-1.5 font-bold text-slate-700' }, 'Correct'),
              React.createElement('th', { className: 'text-center px-2 py-1.5 font-bold text-slate-700' }, 'IDK')
            )
          ),
          React.createElement('tbody', null,
            data.studentRows.map(function (row) {
              var pct = row.totalAnswered > 0 ? Math.round((row.totalCorrect / row.totalAnswered) * 100) : 0;
              var isExpanded = !!expandedRows[row.uid];
              var canExpand = row.totalAnswered > 0;
              var summaryRow = React.createElement('tr', {
                key: row.uid + ':summary',
                className: 'border-t border-slate-200 ' + (canExpand ? 'cursor-pointer hover:bg-indigo-50/40' : ''),
                onClick: canExpand ? function () { toggleRowExpanded(row.uid); } : undefined,
              },
                React.createElement('td', { className: 'text-center px-1 py-1.5' },
                  canExpand
                    ? React.createElement('button', {
                        type: 'button',
                        'aria-expanded': isExpanded,
                        'aria-label': (isExpanded ? 'Collapse' : 'Expand') + ' ' + row.displayName + ' details',
                        className: 'text-slate-500 hover:text-indigo-600 transition-colors text-xs font-mono',
                        onClick: function (e) { e.stopPropagation(); toggleRowExpanded(row.uid); },
                      }, isExpanded ? '▼' : '▶')
                    : React.createElement('span', { className: 'text-slate-300 text-xs' }, '·')
                ),
                React.createElement('td', { className: 'px-2 py-1.5 text-slate-800' }, row.displayName),
                React.createElement('td', { className: 'text-center px-2 py-1.5' },
                  React.createElement('span', { className: 'text-xs font-mono text-slate-600' }, row.totalAnswered + ' / ' + data.totalQuestions)
                ),
                React.createElement('td', { className: 'text-center px-2 py-1.5' },
                  row.totalAnswered > 0
                    ? React.createElement('span', {
                        className: 'text-xs font-bold px-2 py-0.5 rounded ' + (pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'),
                      }, row.totalCorrect + ' (' + pct + '%)')
                    : React.createElement('span', { className: 'text-xs text-slate-400' }, '—')
                ),
                React.createElement('td', { className: 'text-center px-2 py-1.5' },
                  row.totalIdk > 0
                    ? React.createElement('span', { className: 'text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800' }, row.totalIdk)
                    : React.createElement('span', { className: 'text-xs text-slate-400' }, '0')
                )
              );
              if (!isExpanded) return summaryRow;
              // Detail row: per-question card grid
              var detailRow = React.createElement('tr', {
                key: row.uid + ':detail',
                className: 'border-t border-slate-100 bg-indigo-50/30',
              },
                React.createElement('td', { colSpan: 5, className: 'px-3 py-3' },
                  React.createElement('div', { className: 'space-y-2' },
                    row.byQuestion.map(function (cell, qIdx) {
                      var qNum = qIdx + 1;
                      var qSnippet = cell && cell.questionText ? cell.questionText.slice(0, 90) + (cell.questionText.length > 90 ? '…' : '') : 'Question ' + qNum;
                      var border = !cell ? 'border-slate-200 bg-white' :
                                   cell.status === 'correct' ? 'border-emerald-200 bg-emerald-50/50' :
                                   cell.status === 'incorrect' ? 'border-rose-200 bg-rose-50/50' :
                                   cell.status === 'idk' ? 'border-sky-200 bg-sky-50/50' :
                                   'border-slate-200 bg-white';
                      return React.createElement('div', {
                        key: qIdx,
                        className: 'p-2 rounded border ' + border,
                      },
                        React.createElement('div', { className: 'flex items-start gap-2 mb-1' },
                          React.createElement('span', { className: 'text-base mt-0.5 leading-none' }, statusBadge(cell)),
                          React.createElement('div', { className: 'flex-grow min-w-0' },
                            React.createElement('p', { className: 'text-xs font-semibold text-slate-700 mb-0.5' }, 'Q' + qNum + '. ' + qSnippet),
                            cell && cell.answerSummary
                              ? React.createElement('p', { className: 'text-xs text-slate-800 break-words' },
                                  React.createElement('span', { className: 'text-slate-500' }, 'Answered: '),
                                  cell.answerSummary)
                              : !cell && React.createElement('p', { className: 'text-xs italic text-slate-400' }, 'No response yet')
                          ),
                          cell && cell.aiGraded && React.createElement('span', {
                            className: 'flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800',
                            title: 'Graded by AI (' + cell.aiStatus + ')',
                          }, '✨ AI')
                        ),
                        cell && cell.aiFeedback && React.createElement('p', {
                          className: 'text-[11px] italic text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 mt-1',
                        }, '"', cell.aiFeedback, '"')
                      );
                    })
                  )
                )
              );
              return [summaryRow, detailRow];
            })
          )
        )
      );
    } else if (variant === 'preLessonGap') {
      // Concept gap cards — lowest % first. Cards where the class is below
      // 80% correct get an "Explain to class" button that opens the AI
      // explainer modal.
      body = React.createElement('div', { className: 'space-y-2' },
        data.conceptCards.map(function (card) {
          var color = card.totalAnswered === 0 ? 'slate' :
                      card.percentCorrect >= 80 ? 'emerald' :
                      card.percentCorrect >= 50 ? 'amber' : 'rose';
          var urgency = card.totalAnswered === 0 ? 'no responses' :
                        card.percentCorrect < 50 ? '⚠ Needs pre-teaching' :
                        card.percentCorrect < 80 ? 'Review with class' :
                        'Class is ready';
          var showExplainBtn = card.totalAnswered > 0 && card.percentCorrect < 80 && typeof p.callGemini === 'function';
          return React.createElement('div', {
            key: card.questionIdx,
            className: 'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200',
          },
            React.createElement('div', { className: 'flex items-start justify-between gap-3 mb-1' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-' + color + '-800' }, urgency),
              card.totalAnswered > 0 && React.createElement('span', {
                className: 'text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-200 text-' + color + '-900',
              }, card.percentCorrect + '% correct')
            ),
            React.createElement('p', { className: 'text-sm text-slate-800 mb-2' }, card.conceptText),
            React.createElement('div', { className: 'flex items-center gap-3 text-xs text-' + color + '-900' },
              React.createElement('span', null, card.correctCount + ' ✓'),
              React.createElement('span', null, card.incorrectCount + ' ✗'),
              card.idkCount > 0 && React.createElement('span', { className: 'text-sky-700' }, card.idkCount + ' 🤔'),
              React.createElement('span', { className: 'text-slate-500' }, '· ' + card.totalAnswered + ' / ' + data.totalStudents + ' students'),
              showExplainBtn && React.createElement('button', {
                type: 'button',
                onClick: function () { openExplainer(card.questionIdx, card.conceptText); },
                className: 'ml-auto inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors',
                title: 'Generate a 60-90 word concept explainer for the class',
              }, '🎓 Explain to class')
            )
          );
        })
      );
    } else if (variant === 'retentionCurve') {
      // retentionCurve — per-concept rows with cross-session mastery sparklines
      body = React.createElement('div', { className: 'space-y-3' },
        React.createElement('p', { className: 'text-xs text-slate-600 italic mb-1' },
          'Cross-session retention. Concepts with longer time-since-last-attempt or unseen students surface first. Recent attempts shown as colored dots (green=correct, red=miss, sky=IDK).'),
        data.conceptRows.map(function (row) {
          // Sort students by urgency (unseen first, then longest days)
          var sortedStudents = row.students.slice().sort(function (a, b) {
            if (!a.seen && b.seen) return -1;
            if (a.seen && !b.seen) return 1;
            if (!a.seen && !b.seen) return 0;
            return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
          });
          var color = row.unseenCount > 0 ? 'rose' :
                      row.maxDaysSinceLast >= 14 ? 'rose' :
                      row.maxDaysSinceLast >= 7 ? 'amber' :
                      'emerald';
          return React.createElement('div', {
            key: row.conceptId,
            className: 'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200',
          },
            React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-' + color + '-800' }, row.label),
              React.createElement('span', { className: 'ml-auto text-[10px] text-' + color + '-700' },
                row.unseenCount > 0
                  ? row.unseenCount + ' unseen · '
                  : '',
                'max ' + row.maxDaysSinceLast + 'd since seen'
              )
            ),
            React.createElement('div', { className: 'space-y-1' },
              sortedStudents.map(function (s) {
                var dayBadgeColor = !s.seen ? 'rose' :
                                    s.daysSinceLast >= 14 ? 'rose' :
                                    s.daysSinceLast >= 7 ? 'amber' :
                                    'emerald';
                return React.createElement('div', {
                  key: s.uid,
                  className: 'flex items-center gap-2 text-xs',
                },
                  React.createElement('span', { className: 'flex-shrink-0 text-slate-700 font-semibold w-32 truncate' }, s.displayName),
                  !s.seen
                    ? React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, 'never seen')
                    : React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + dayBadgeColor + '-100 text-' + dayBadgeColor + '-800' }, s.daysSinceLast + 'd ago'),
                  s.seen && React.createElement('span', { className: 'flex items-center gap-0.5' },
                    s.recent.map(function (att, attIdx) {
                      var dotColor = att.status === 'correct' ? '#10b981' :
                                     att.status === 'incorrect' ? '#ef4444' :
                                     att.status === 'idk' ? '#0ea5e9' :
                                     '#94a3b8';
                      return React.createElement('span', {
                        key: attIdx,
                        className: 'inline-block rounded-full',
                        style: { width: '8px', height: '8px', backgroundColor: dotColor },
                        title: att.status + ' on ' + new Date(att.ts).toLocaleDateString(),
                      });
                    })
                  ),
                  s.seen && typeof s.successRate === 'number' && React.createElement('span', { className: 'text-slate-500 ml-auto' },
                    s.correctAttempts + '/' + s.totalAttempts + ' (' + s.successRate + '%)')
                );
              })
            )
          );
        })
      );
    } else {
      // liveHeatmap — per-question bars
      body = React.createElement('div', { className: 'space-y-2' },
        data.bars.map(function (bar) {
          var color = bar.total === 0 ? 'slate' :
                      bar.percentCorrect >= 80 ? 'emerald' :
                      bar.percentCorrect >= 50 ? 'amber' : 'rose';
          var pctCorrect = bar.total > 0 ? (bar.correct / bar.total) * 100 : 0;
          var pctIncorrect = bar.total > 0 ? (bar.incorrect / bar.total) * 100 : 0;
          var pctIdk = bar.total > 0 ? (bar.idk / bar.total) * 100 : 0;
          var pctSubmitted = bar.total > 0 ? (bar.submitted / bar.total) * 100 : 0;
          var qLabel = bar.questionText ? bar.questionText.slice(0, 70) + (bar.questionText.length > 70 ? '…' : '') : ('Question ' + (bar.questionIdx + 1));
          return React.createElement('div', { key: bar.questionIdx, className: 'p-2 rounded bg-white border border-slate-200' },
            React.createElement('div', { className: 'flex items-start justify-between gap-2 mb-1' },
              React.createElement('span', { className: 'text-xs text-slate-700 flex-1 min-w-0' }, (bar.questionIdx + 1) + '. ' + qLabel),
              bar.total > 0 && React.createElement('span', {
                className: 'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-100 text-' + color + '-800',
              }, bar.percentCorrect + '%')
            ),
            // Stacked bar
            bar.total > 0 ? React.createElement('div', { className: 'flex h-3 rounded overflow-hidden border border-slate-200' },
              pctCorrect > 0 && React.createElement('div', { style: { width: pctCorrect + '%', backgroundColor: '#10b981' }, title: bar.correct + ' correct' }),
              pctIncorrect > 0 && React.createElement('div', { style: { width: pctIncorrect + '%', backgroundColor: '#ef4444' }, title: bar.incorrect + ' incorrect' }),
              pctIdk > 0 && React.createElement('div', { style: { width: pctIdk + '%', backgroundColor: '#0ea5e9' }, title: bar.idk + ' IDK' }),
              pctSubmitted > 0 && React.createElement('div', { style: { width: pctSubmitted + '%', backgroundColor: '#94a3b8' }, title: bar.submitted + ' submitted (ungraded)' })
            ) : React.createElement('div', { className: 'h-3 rounded bg-slate-100 border border-slate-200' }),
            React.createElement('div', { className: 'flex items-center gap-3 mt-1 text-[10px] text-slate-600' },
              React.createElement('span', null, bar.correct + ' ✓'),
              React.createElement('span', null, bar.incorrect + ' ✗'),
              bar.idk > 0 && React.createElement('span', { className: 'text-sky-700' }, bar.idk + ' 🤔'),
              bar.submitted > 0 && React.createElement('span', { className: 'text-slate-500' }, bar.submitted + ' submitted'),
              React.createElement('span', { className: 'ml-auto text-slate-500' }, bar.total + ' / ' + data.totalStudents)
            )
          );
        })
      );
    }

    // Concept explainer modal (preLessonGap "Explain to class" button)
    var explainerModalEl = explainerModal.open ? React.createElement('div', {
      className: 'fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Concept explainer',
      onClick: function (e) { if (e.target === e.currentTarget) closeExplainer(); },
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border-2 border-indigo-300',
      },
        React.createElement('div', { className: 'flex items-start justify-between gap-3 mb-3' },
          React.createElement('div', null,
            React.createElement('h4', { className: 'font-black text-base text-slate-800' }, '🎓 Explain to class'),
            React.createElement('p', { className: 'text-xs text-slate-600 mt-0.5' }, 'Concept the class missed:'),
            React.createElement('p', { className: 'text-xs italic text-slate-700 mt-0.5' }, '"' + (explainerModal.conceptText || '') + '"')
          ),
          React.createElement('button', {
            type: 'button',
            onClick: closeExplainer,
            'aria-label': 'Close',
            className: 'flex-shrink-0 text-slate-400 hover:text-slate-700 text-xl leading-none',
          }, '×')
        ),
        explainerModal.loading
          ? React.createElement('div', { className: 'p-4 text-center text-sm text-slate-600' },
              React.createElement('span', { className: 'inline-block animate-pulse' }, '✨ Generating explainer…'))
          : explainerModal.error
            ? React.createElement('div', { className: 'p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800' }, explainerModal.error)
            : React.createElement('div', { className: 'p-3 rounded bg-indigo-50 border border-indigo-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap' }, explainerModal.text),
        React.createElement('div', { className: 'flex items-center gap-2 mt-4 flex-wrap' },
          React.createElement('button', {
            type: 'button',
            onClick: function () { runExplainerCall(explainerModal.conceptText); },
            disabled: explainerModal.loading,
            className: 'text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50',
          }, '↻ Regenerate'),
          !explainerModal.loading && !explainerModal.error && React.createElement('button', {
            type: 'button',
            onClick: copyExplainer,
            className: 'text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100',
          }, '📋 Copy'),
          !explainerModal.loading && !explainerModal.error && typeof p.callTTS === 'function' && React.createElement('button', {
            type: 'button',
            onClick: playExplainer,
            className: 'text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100',
            title: 'Play explainer aloud',
          }, '🔊 Play aloud'),
          React.createElement('button', {
            type: 'button',
            onClick: closeExplainer,
            className: 'ml-auto text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700',
          }, 'Close')
        )
      )
    ) : null;

    return React.createElement('div', {
      className: 'p-5 rounded-xl border-2 border-indigo-300 bg-white mb-4 shadow-sm',
      role: 'region',
      'aria-label': 'Live Results Dashboard',
    }, header, body, explainerModalEl);
  }

  // ─── FreeformItemsBlock (Plan S Slice 2) ──────────────────────────────
  // Renders fill-blank and short-answer items below the MCQ list. Each item
  // is a self-contained card with its own state (response, grading status,
  // feedback). Calls QuizAIHelpers.gradeFreeformAnswer / gradeFillBlank.
  function FreeformItemsBlock(p) {
    var allQuestions = Array.isArray(p.questions) ? p.questions : [];
    var freeform = allQuestions
      .map(function (q, idx) { return { q: q, idx: idx }; })
      .filter(function (entry) { return entry.q && (entry.q.type === 'fill-blank' || entry.q.type === 'short-answer' || entry.q.type === 'self-explanation' || entry.q.type === 'sequence-sense' || entry.q.type === 'relation-mismatch'); });
    if (freeform.length === 0) return null;
    return React.createElement('div', { className: 'space-y-4 mt-6' },
      React.createElement('h4', { className: 'font-bold text-slate-700 flex items-center gap-2 text-base' },
        React.createElement('span', { 'aria-hidden': 'true' }, '✏️'),
        ' Open-Response Items'),
      React.createElement('p', { className: 'text-xs text-slate-600 mb-2' },
        'Type your answer and click "Grade my answer" — an AI will give you immediate feedback.'),
      freeform.map(function (entry) {
        if (entry.q.type === 'sequence-sense') {
          return React.createElement(SequenceSenseCard, {
            key: entry.idx,
            q: entry.q,
            itemNumber: entry.idx + 1,
            questionIdx: entry.idx,
            onSubmitLiveAnswer: p.onSubmitLiveAnswer,
          });
        }
        if (entry.q.type === 'relation-mismatch') {
          return React.createElement(RelationMismatchCard, {
            key: entry.idx,
            q: entry.q,
            itemNumber: entry.idx + 1,
            questionIdx: entry.idx,
            onSubmitLiveAnswer: p.onSubmitLiveAnswer,
          });
        }
        return React.createElement(FreeformItemCard, {
          key: entry.idx,
          q: entry.q,
          itemNumber: entry.idx + 1,
          questionIdx: entry.idx,
          callGemini: p.callGemini,
          callTTS: p.callTTS,
          gradeLevel: p.gradeLevel,
          QuizAIHelpers: p.QuizAIHelpers,
          modeStrategy: p.modeStrategy,
          onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        });
      })
    );
  }

  function FreeformItemCard(p) {
    var q = p.q;
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);

    var responseState = React.useState('');
    var response = responseState[0]; var setResponse = responseState[1];
    var gradeState = React.useState({ status: null, feedback: '', loading: false });
    var grade = gradeState[0]; var setGrade = gradeState[1];
    var confidenceState = React.useState(null); // 'knew' | 'guessed' | 'no-idea' | null
    var confidence = confidenceState[0]; var setConfidence = confidenceState[1];
    var explainerState = React.useState({ open: false, loading: false, text: '', error: '' });
    var explainer = explainerState[0]; var setExplainer = explainerState[1];

    function submitGrade() {
      if (!response || !response.trim()) return;
      // Plan T Slice Ta: write the raw response to live session if active.
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: q.type || 'short-answer',
            conceptLabel: (q && q.conceptLabel) || '',
            answer: { text: response },
            timestamp: Date.now(),
          });
        } catch (e) { /* swallow — local grading still proceeds */ }
      }
      if (!p.QuizAIHelpers) {
        setGrade({ status: 'error', feedback: 'Grader unavailable: QuizAIHelpers not loaded.', loading: false });
        return;
      }
      setGrade({ status: null, feedback: '', loading: true });
      var graderArgs = {
        callGemini: p.callGemini,
        gradeLevel: p.gradeLevel,
      };
      var promise;
      if (q.type === 'fill-blank') {
        graderArgs.contextSentence = q.question;
        graderArgs.expectedFill = q.expectedFill || '';
        graderArgs.acceptableAlternatives = q.acceptableAlternatives || [];
        graderArgs.studentFill = response;
        promise = p.QuizAIHelpers.gradeFillBlank(graderArgs);
      } else if (q.type === 'self-explanation') {
        // Self-explanation grader: rubric-style. Reuses gradeFreeformAnswer with
        // a synthesized "expectedAnswer" that prompts the LLM to grade for
        // demonstration of understanding rather than match against a key.
        graderArgs.question = 'EXPLAIN IN YOUR OWN WORDS: ' + (q.question || '');
        graderArgs.expectedAnswer = q.rubric || q.expectedAnswer || 'Student demonstrates understanding of the concept in their own words, including key terms and relationships. Avoid grading on memorization of specific phrasing — reward genuine understanding.';
        graderArgs.studentResponse = response;
        promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
      } else {
        graderArgs.question = q.question;
        graderArgs.expectedAnswer = q.expectedAnswer || '';
        graderArgs.studentResponse = response;
        promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
      }
      Promise.resolve(promise).then(function (result) {
        setGrade({ status: result.status || 'unclear', feedback: result.feedback || '', loading: false });
      }).catch(function (err) {
        setGrade({ status: 'error', feedback: (err && err.message) ? err.message : 'Grader failed.', loading: false });
      });
    }

    function markIDK() {
      // Non-penalized: status = 'idk', auto-open the explainer for just-in-time remediation
      setGrade({ status: 'idk', feedback: 'No worries — here\'s a quick explanation.', loading: false });
      requestExplainer();
    }

    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({ open: true, loading: false, text: '', error: 'Explainer unavailable: callGemini not provided.' });
        return;
      }
      setExplainer({ open: true, loading: true, text: '', error: '' });
      var grade = p.gradeLevel || 'middle school';
      // For self-explanation: explain the underlying concept the student was asked about.
      // For fill-blank: explain the missing term in context.
      // For short-answer: explain the question's core concept.
      var conceptHint = q.type === 'fill-blank' ? (q.expectedFill || q.question || '') :
                        q.type === 'self-explanation' ? (q.question || '') :
                        (q.question || '');
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept so they can answer the question. Concept or question: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = (raw && typeof raw === 'object' && raw.text) ? raw.text : String(raw || '');
        setExplainer({ open: true, loading: false, text: txt.trim(), error: '' });
      }).catch(function (err) {
        setExplainer({ open: true, loading: false, text: '', error: (err && err.message) ? err.message : 'Explainer failed.' });
      });
    }

    var statusColor = grade.status === 'correct' ? 'emerald' :
                      grade.status === 'partially-correct' ? 'amber' :
                      grade.status === 'incorrect' ? 'rose' :
                      grade.status === 'error' ? 'rose' :
                      grade.status === 'idk' ? 'sky' :
                      'slate';
    var statusLabel = grade.status === 'correct' ? '✓ Correct' :
                      grade.status === 'partially-correct' ? '~ Close' :
                      grade.status === 'incorrect' ? '✗ Not yet' :
                      grade.status === 'unclear' ? '? Unclear' :
                      grade.status === 'error' ? '! Error' :
                      grade.status === 'idk' ? '🤔 Marked "I don\'t know"' :
                      '';
    var typeLabel = q.type === 'fill-blank' ? 'Fill-in-the-blank' :
                    q.type === 'self-explanation' ? 'Self-explanation' :
                    'Short answer';

    return React.createElement('div', {
      className: 'bg-white p-5 rounded-xl border border-slate-300 shadow-sm',
    },
      React.createElement('div', { className: 'flex items-start gap-3 mb-3' },
        React.createElement('span', { className: 'flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5' }, p.itemNumber),
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('span', { className: 'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1' }, typeLabel),
          React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, q.question || '')
        )
      ),
      // Input area
      q.type === 'fill-blank' ?
        React.createElement('input', {
          type: 'text',
          value: response,
          onChange: function (ev) { setResponse(ev.target.value); },
          onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submitGrade(); } },
          placeholder: 'Type the missing word or phrase...',
          disabled: grade.loading || grade.status === 'correct' || grade.status === 'idk',
          className: 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50',
          'aria-label': 'Fill in the blank',
        })
      :
        React.createElement('textarea', {
          value: response,
          onChange: function (ev) { setResponse(ev.target.value); },
          placeholder: q.type === 'self-explanation' ? 'Explain the concept in your own words (3-5 sentences)...' : 'Type your 1-2 sentence response...',
          disabled: grade.loading || grade.status === 'correct' || grade.status === 'idk',
          rows: q.type === 'self-explanation' ? 5 : 3,
          className: 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 resize-y',
          'aria-label': typeLabel + ' response',
        }),
      // Submit button + IDK + retry
      React.createElement('div', { className: 'flex items-center justify-between gap-2 mt-2 flex-wrap' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
          React.createElement('button', {
            type: 'button',
            onClick: submitGrade,
            disabled: !response.trim() || grade.loading || grade.status === 'correct' || grade.status === 'idk',
            className: 'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          }, grade.loading ? 'Grading…' : (grade.status === 'correct' || grade.status === 'idk' ? '' : grade.status ? 'Re-check' : 'Grade my answer')),
          allowIDK && !grade.status && React.createElement('button', {
            type: 'button',
            onClick: markIDK,
            className: 'px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors',
            title: 'Skip — no penalty. The AI will explain the concept.',
          }, '🤔 I don\'t know')
        ),
        grade.status && grade.status !== 'correct' && grade.status !== 'idk' && React.createElement('button', {
          type: 'button',
          onClick: function () { setGrade({ status: null, feedback: '', loading: false }); setResponse(''); setExplainer({ open: false, loading: false, text: '', error: '' }); },
          className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors',
        }, 'Try again')
      ),
      // Feedback panel
      grade.status && React.createElement('div', {
        className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
        role: 'status',
        'aria-live': 'polite',
      },
        React.createElement('div', { className: 'flex items-center gap-2 mb-1 flex-wrap' },
          React.createElement('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900' }, statusLabel),
          // Inline Explain button: shown when student got it wrong (or unclear), and mode allows it
          aiExplainerEnabled && grade.status !== 'correct' && grade.status !== 'idk' && !explainer.open && React.createElement('button', {
            type: 'button',
            onClick: requestExplainer,
            className: 'ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors',
            title: 'Get a quick AI explanation of this concept',
          }, '🤖 Explain this')
        ),
        grade.feedback && React.createElement('p', { className: 'text-sm text-' + statusColor + '-900 mb-2' }, grade.feedback),
        // Inline explainer panel (collapses below feedback)
        explainer.open && React.createElement('div', { className: 'mt-2 p-3 bg-white border border-indigo-200 rounded-lg' },
          React.createElement('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1' }, '🤖 Quick explanation'),
          explainer.loading && React.createElement('p', { className: 'text-sm text-indigo-700 italic' }, 'Generating explanation…'),
          explainer.text && React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, explainer.text),
          explainer.error && React.createElement('p', { className: 'text-sm text-rose-700' }, explainer.error),
          explainer.text && typeof p.callTTS === 'function' && React.createElement('button', {
            type: 'button',
            onClick: function () { p.callTTS(explainer.text); },
            className: 'mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900',
            'aria-label': 'Read aloud',
          }, '🔊 Read aloud')
        )
      ),
      // Confidence rating: optional, shown after a grade lands and when mode allows
      allowConfidence && grade.status && grade.status !== 'idk' && React.createElement('div', { className: 'mt-2 flex items-center gap-2 flex-wrap text-xs' },
        React.createElement('span', { className: 'text-slate-600 font-semibold' }, 'How sure were you?'),
        ['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = { knew: 'I knew this', guessed: 'I guessed', 'no-idea': 'No idea' };
          var active = confidence === lvl;
          return React.createElement('button', {
            key: lvl,
            type: 'button',
            onClick: function () { setConfidence(lvl); },
            className: 'px-2 py-0.5 rounded border transition-colors ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'),
          }, labels[lvl]);
        })
      )
    );
  }

  function QuizView(props) {
  // State reads
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isParentMode = props.isParentMode;
  var isIndependentMode = props.isIndependentMode;
  var activeSessionCode = props.activeSessionCode;
  var sessionData = props.sessionData;
  // Plan T Slice Ta: live-session response capture. When the host passes
  // onSubmitLiveAnswer AND we're in an active session, item cards write
  // each submission to quizState.allResponses[uid][questionIdx]. Inactive
  // session → onSubmitLiveAnswer is undefined and writes are no-ops.
  var onSubmitLiveAnswer = (activeSessionCode && typeof props.onSubmitLiveAnswer === 'function')
    ? props.onSubmitLiveAnswer
    : null;
  // Plan T v3+: per-MCQ student-answer state for the standalone (non-presentation)
  // view. Map of questionIdx → selected optionIdx. Click an option to select +
  // auto-submit to live session if active. Doesn't disturb presentation-mode
  // path (which has its own pState handler).
  var mcqAnswersState = React.useState({});
  var studentMcqAnswers = mcqAnswersState[0];
  var setStudentMcqAnswers = mcqAnswersState[1];
  function selectMcqOption(qIdx, optIdx, optText, q) {
    setStudentMcqAnswers(function (prev) {
      var next = Object.assign({}, prev);
      next[qIdx] = optIdx;
      return next;
    });
    if (typeof onSubmitLiveAnswer === 'function') {
      try {
        onSubmitLiveAnswer({
          questionIdx: qIdx,
          itemType: 'mcq',
          conceptLabel: (q && q.conceptLabel) || '',
          answer: { optionIdx: optIdx, optionText: optText },
          timestamp: Date.now(),
        });
      } catch (e) { /* swallow — local selection still works */ }
    }
  }
  var isPresentationMode = props.isPresentationMode;
  var isReviewGame = props.isReviewGame;
  var isEditingQuiz = props.isEditingQuiz;
  var escapeRoomState = props.escapeRoomState;
  var escapeTimeLeft = props.escapeTimeLeft;
  var isEscapeTimerRunning = props.isEscapeTimerRunning;
  var gameTeams = props.gameTeams;
  var reviewGameState = props.reviewGameState;
  var scoreAnimation = props.scoreAnimation;
  var soundEnabled = props.soundEnabled;
  var globalPoints = props.globalPoints;
  var inputText = props.inputText;
  var presentationState = props.presentationState;
  var generatedContent = props.generatedContent;
  var isFactChecking = props.isFactChecking;
  var showQuizAnswers = props.showQuizAnswers;
  var leveledTextLanguage = props.leveledTextLanguage;
  var appId = props.appId;
  // Setters
  var setReviewGameState = props.setReviewGameState;
  var setSoundEnabled = props.setSoundEnabled;
  var setGameTeams = props.setGameTeams;
  var setEscapeRoomState = props.setEscapeRoomState;
  var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
  var setConfirmDialog = props.setConfirmDialog;
  // Handlers (lifted in Phase 1)
  var handleStartLiveSession = props.handleStartLiveSession;
  var handleToggleInteractive = props.handleToggleInteractive;
  var handleEndLiveSession = props.handleEndLiveSession;
  // Existing handlers
  var handleToggleIsPresentationMode = props.handleToggleIsPresentationMode;
  var handleToggleIsReviewGame = props.handleToggleIsReviewGame;
  var handleToggleIsEditingQuiz = props.handleToggleIsEditingQuiz;
  var handleToggleShowQuizAnswers = props.handleToggleShowQuizAnswers;
  var handleExportQTI = props.handleExportQTI;
  var handleManualScore = props.handleManualScore;
  var handleAddTeam = props.handleAddTeam;
  var handleRemoveTeam = props.handleRemoveTeam;
  var handleReviewTileClick = props.handleReviewTileClick;
  var handleAwardPoints = props.handleAwardPoints;
  var closeReviewModal = props.closeReviewModal;
  var handlePresentationOptionClick = props.handlePresentationOptionClick;
  var togglePresentationAnswer = props.togglePresentationAnswer;
  var togglePresentationExplanation = props.togglePresentationExplanation;
  var resetPresentation = props.resetPresentation;
  var handleQuizChange = props.handleQuizChange;
  var handleReflectionChange = props.handleReflectionChange;
  var handleFactCheck = props.handleFactCheck;
  // Escape room handlers
  var endCollaborativeEscapeRoom = props.endCollaborativeEscapeRoom;
  var resetEscapeRoom = props.resetEscapeRoom;
  var launchCollaborativeEscapeRoom = props.launchCollaborativeEscapeRoom;
  var openEscapeRoomSettings = props.openEscapeRoomSettings;
  var generateEscapeRoom = props.generateEscapeRoom;
  var handlePuzzleSolved = props.handlePuzzleSolved;
  var handleSelectObject = props.handleSelectObject;
  var handleWrongAnswer = props.handleWrongAnswer;
  var handleEscapeRoomAnswer = props.handleEscapeRoomAnswer;
  var handleSequenceAnswer = props.handleSequenceAnswer;
  var handleCipherAnswer = props.handleCipherAnswer;
  var handleMatchingSelect = props.handleMatchingSelect;
  var handleScrambleAnswer = props.handleScrambleAnswer;
  var handleFillinAnswer = props.handleFillinAnswer;
  var handleFinalDoorAnswer = props.handleFinalDoorAnswer;
  var handleRevealHint = props.handleRevealHint;
  var derangeShuffle = props.derangeShuffle;
  // For TeacherLiveQuizControls pass-through
  var handleCreateGroup = props.handleCreateGroup;
  var handleAssignStudent = props.handleAssignStudent;
  var handleSetGroupResource = props.handleSetGroupResource;
  var handleSetGroupLanguage = props.handleSetGroupLanguage;
  var handleSetGroupProfile = props.handleSetGroupProfile;
  var handleDeleteGroup = props.handleDeleteGroup;
  var isPushingResource = props.isPushingResource;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  // Pure helpers
  var getRows = props.getRows;
  var formatInlineText = props.formatInlineText;
  var renderFormattedText = props.renderFormattedText;
  var getReviewCategories = props.getReviewCategories;
  var playSound = props.playSound;
  var addToast = props.addToast;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
  var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
  var Stamp = props.Stamp;
  var ConfettiExplosion = props.ConfettiExplosion;

  // ─── Plan S: Quiz Mode-aware header + AI explainer ────────────────────
  // Reads mode + strategy from the resolved quiz item. Default 'exit-ticket'
  // preserves all existing UX. Other modes render a small intro banner +
  // (for pre-check + review) an inline AI Concept Explainer panel.
  var _quizMode = (generatedContent && generatedContent.data && generatedContent.data.mode) || 'exit-ticket';
  var _qmStrategiesMod = (window.AlloModules && window.AlloModules.QuizModeStrategies) || null;
  var _modeStrat = _qmStrategiesMod ? _qmStrategiesMod.getStrategy(_quizMode) : null;
  var _aiExplainerEnabled = !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail);
  var _showModeBanner = _quizMode !== 'exit-ticket' && !!_modeStrat;

  // Local state for the AI Concept Explainer (pre-check + review modes only)
  var _explainerState = React.useState({ topic: '', loading: false, response: '', error: '' });
  var explainerData = _explainerState[0]; var setExplainerData = _explainerState[1];
  var _explainerInput = React.useState('');
  var explainerInput = _explainerInput[0]; var setExplainerInput = _explainerInput[1];

  function explainConcept(topic) {
    if (!topic || !topic.trim()) return;
    if (typeof props.callGemini !== 'function') {
      setExplainerData({ topic: topic, loading: false, response: '', error: 'Explainer unavailable: callGemini not provided.' });
      return;
    }
    setExplainerData({ topic: topic, loading: true, response: '', error: '' });
    var grade = props.gradeLevel || 'middle school';
    var prompt = 'You are a patient teacher explaining a concept to a ' + grade + ' student who needs a quick refresher. Explain "' + topic + '" in 60-90 words. Use simple, concrete language. Use an analogy or example if it helps. End with one sentence checking the student\'s understanding (e.g., "Does that make sense?"). Plain text only — no headings, no bullet points.';
    Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
      var txt = (raw && typeof raw === 'object' && raw.text) ? raw.text : String(raw || '');
      setExplainerData({ topic: topic, loading: false, response: txt.trim(), error: '' });
    }).catch(function (err) {
      setExplainerData({ topic: topic, loading: false, response: '', error: err && err.message ? err.message : 'Explainer failed.' });
    });
  }

  // Plan S Slice 5+: surface smart-skip notice when the dispatcher dropped an
  // item type because the curriculum already has the dedicated tool (Timeline /
  // Glossary). Helps teachers understand why their pre-check or review didn't
  // include certain mechanics.
  var _smartSkips = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.smartSkips)) ? generatedContent.data.smartSkips : [];

  var modeBanner = _showModeBanner ? React.createElement('div', {
    key: 'mode-banner',
    className: 'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50'),
    role: 'region',
    'aria-label': _modeStrat.label,
  },
    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
      React.createElement('span', { className: 'text-xl', 'aria-hidden': 'true' }, _modeStrat.icon),
      React.createElement('h3', { className: 'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900') }, _modeStrat.label),
      React.createElement('span', { className: 'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900') }, _quizMode)
    ),
    _modeStrat.render.intro && React.createElement('p', { className: 'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900') }, _modeStrat.render.intro),
    _smartSkips.length > 0 && React.createElement('p', { className: 'text-xs italic mt-2 ' + (_quizMode === 'pre-check' ? 'text-amber-800' : _quizMode === 'review' ? 'text-purple-800' : 'text-sky-800') },
      'ℹ️ Skipped ' + _smartSkips.join(' and ') + ' — using the dedicated tool instead avoids redundancy.'
    )
  ) : null;

  var explainerPanel = _aiExplainerEnabled ? React.createElement('div', {
    key: 'ai-explainer',
    className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6',
    role: 'region',
    'aria-label': 'AI concept explainer',
  },
    React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
      React.createElement('span', { className: 'text-lg', 'aria-hidden': 'true' }, '🤖'),
      React.createElement('h4', { className: 'font-bold text-sm text-indigo-900' }, 'Don\'t know a concept? Ask for a quick explainer.')
    ),
    React.createElement('p', { className: 'text-xs text-indigo-800 mb-2' },
      'Type any concept from the quiz (or any prior knowledge you\'re unsure about). The AI will give you a 60-90 word explanation tuned to your grade level.'
    ),
    React.createElement('div', { className: 'flex items-stretch gap-2' },
      React.createElement('input', {
        type: 'text',
        value: explainerInput,
        onChange: function (ev) { setExplainerInput(ev.target.value); },
        onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); explainConcept(explainerInput); } },
        placeholder: _quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"',
        className: 'flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
        'aria-label': 'Concept to explain',
      }),
      React.createElement('button', {
        type: 'button',
        onClick: function () { explainConcept(explainerInput); },
        disabled: !explainerInput.trim() || explainerData.loading,
        className: 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
      }, explainerData.loading ? 'Explaining…' : 'Explain')
    ),
    explainerData.response && React.createElement('div', { className: 'mt-3 p-3 bg-white border border-indigo-200 rounded-lg' },
      React.createElement('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1' }, explainerData.topic),
      React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, explainerData.response),
      typeof props.callTTS === 'function' && React.createElement('button', {
        type: 'button',
        onClick: function () { props.callTTS(explainerData.response); },
        className: 'mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900',
        'aria-label': 'Read aloud',
      }, '🔊 Read aloud')
    ),
    explainerData.error && React.createElement('div', { className: 'mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800' },
      explainerData.error
    )
  ) : null;

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, modeBanner, explainerPanel, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 p-4 rounded-lg border border-teal-100 mb-6 flex justify-between items-center flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-teal-800 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.connect'),
    onClick: handleStartLiveSession,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200",
    title: t('quiz.launch_live_tooltip')
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 14
  }), " ", t('quiz.launch_live_btn')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 12,
    className: "text-orange-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-orange-700"
  }, Object.keys(sessionData?.roster || {}).length, " ", t('quiz.lobby_waiting') || "Ready")), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.locked'),
    onClick: handleToggleInteractive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`,
    title: t('session.toggle_interactive_title')
  }, sessionData?.forceStatic ? /*#__PURE__*/React.createElement(Lock, {
    size: 12
  }) : /*#__PURE__*/React.createElement(Unlock, {
    size: 12
  }), sessionData?.forceStatic ? t('session.static_only') : t('session.interactive'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.confirm'),
    onClick: handleToggleIsPresentationMode,
    disabled: isReviewGame || isTeacherMode && sessionData?.quizState?.isActive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`,
    title: t('quiz.presentation')
  }, isPresentationMode ? /*#__PURE__*/React.createElement(CheckCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 14
  }), isPresentationMode ? t('common.close') : t('quiz.presentation')), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleIsReviewGame,
    disabled: isPresentationMode,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isReviewGame ? 'bg-yellow-500 text-indigo-900 hover:bg-yellow-600 ring-2 ring-yellow-200' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'}`,
    title: t('quiz.review_game'),
    "aria-label": t('quiz.review_game')
  }, isReviewGame ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), isReviewGame ? t('common.close') : t('quiz.review_game')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (escapeRoomState.isActive) {
        if (isTeacherMode && activeSessionCode) {
          endCollaborativeEscapeRoom();
        } else {
          resetEscapeRoom();
        }
      } else {
        if (isTeacherMode && activeSessionCode) {
          launchCollaborativeEscapeRoom();
        } else {
          openEscapeRoomSettings();
        }
      }
    },
    disabled: isPresentationMode || isReviewGame,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`,
    title: isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title'),
    "aria-label": t('escape_room.title')
  }, escapeRoomState.isActive ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(DoorOpen, {
    size: 14
  }), escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')), isTeacherMode && !isIndependentMode && /*#__PURE__*/React.createElement("button", {
    onClick: handleExportQTI,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-teal-600 border border-teal-200 hover:bg-teal-50 transition-all shadow-sm",
    title: t('export_menu.qti'),
    "aria-label": t('export_menu.qti')
  }, /*#__PURE__*/React.createElement(FolderDown, {
    size: 14
  }), " ", t('quiz.export_qti_btn')), !isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && /*#__PURE__*/React.createElement(React.Fragment, null, !isIndependentMode && !isParentMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_quiz'),
    onClick: handleToggleIsEditingQuiz,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingQuiz ? t('common.done_editing') : t('quiz.edit')), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleShowQuizAnswers,
    className: "text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors"
  }, showQuizAnswers ? /*#__PURE__*/React.createElement(CheckSquare, {
    size: 14,
    className: "fill-current"
  }) : /*#__PURE__*/React.createElement(CheckSquare, {
    size: 14
  }), showQuizAnswers ? isIndependentMode ? t('quiz.hide_answers_student') : isParentMode ? 'Hide Scores' : t('quiz.hide_key') : isIndependentMode ? t('quiz.check_answers') : isParentMode ? 'View Scores' : t('quiz.show_key'))))), isTeacherMode && activeSessionCode && sessionData?.escapeRoomState?.isActive && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Escape room controls encountered an error. Refreshing..."
  }, /*#__PURE__*/React.createElement(EscapeRoomTeacherControls, {
    sessionData: sessionData,
    activeSessionCode: activeSessionCode,
    appId: appId,
    t: t
  })), isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4"
  },
    // Plan T Slice Tb: mode-aware Live Results Dashboard. Renders ABOVE the
    // existing TeacherLiveQuizControls so teachers see per-mode aggregates
    // (gradebook / pre-lesson concept gaps / live heatmap) without losing
    // the legacy presentation-mode option-distribution chart below.
    /*#__PURE__*/React.createElement(LiveResultsDashboard, {
      sessionData: sessionData,
      generatedContent: generatedContent,
      appId: appId,
      callGemini: props.callGemini,
      callTTS: props.callTTS,
      gradeLevel: props.gradeLevel,
    }),
    /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Live quiz controls encountered an error. Refreshing..."
  }, /*#__PURE__*/React.createElement(TeacherLiveQuizControls, {
    sessionData: sessionData,
    generatedContent: generatedContent,
    activeSessionCode: activeSessionCode,
    appId: appId,
    onGenerateImage: callImagen,
    onRefineImage: callGeminiImageEdit,
    onCreateGroup: handleCreateGroup,
    onAssignStudent: handleAssignStudent,
    onSetGroupResource: handleSetGroupResource,
    isPushingResource: isPushingResource,
    onSetGroupLanguage: handleSetGroupLanguage,
    onSetGroupProfile: handleSetGroupProfile,
    onDeleteGroup: handleDeleteGroup
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end px-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleEndLiveSession,
    className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }), " ", t('session.action_end')))) : isReviewGame ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in fade-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-yellow-500 relative overflow-hidden min-h-[700px] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 opacity-10 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(59,130,246,0.2),transparent)]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-6 relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-md flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 32
  }), " ", t('review_game.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm mt-1 font-medium"
  }, t('review_game.subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    onClick: () => {
      setSoundEnabled(!soundEnabled);
      if (!soundEnabled) playSound('click');
    },
    className: `p-2 rounded-full transition-colors ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-600'}`,
    title: t('review_game.toggle_sound')
  }, soundEnabled ? /*#__PURE__*/React.createElement(Volume2, {
    size: 20
  }) : /*#__PURE__*/React.createElement(MicOff, {
    size: 20
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.regenerate_vocabulary'),
    onClick: () => {
      setConfirmDialog({
        message: t('review_game.reset_confirm') || 'Reset the game?',
        onConfirm: () => {
          setReviewGameState({
            claimed: new Set(),
            activeQuestion: null,
            showAnswer: false
          });
          setGameTeams(gameTeams.map(t => ({
            ...t,
            score: 0
          })));
        }
      });
    },
    className: "p-2 bg-slate-700 text-slate-600 rounded-full hover:bg-slate-600",
    title: t('review_game.reset')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-4 justify-center mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
  }, gameTeams.map(team => /*#__PURE__*/React.createElement("div", {
    key: team.id,
    className: `${team.color} bg-opacity-20 border-2 border-opacity-50 border-${team.color.split('-')[1]}-400 rounded-lg p-3 min-w-[140px] flex flex-col items-center relative group`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_team'),
    className: "bg-transparent text-center font-bold text-white outline-none focus:ring-2 focus:ring-white/50 w-full mb-1",
    value: team.name,
    onChange: e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
      ...t,
      name: e.target.value
    } : t))
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-white drop-shadow-md"
  }, team.score), scoreAnimation.teamId === team.id && /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-xl animate-[ping_1s_ease-out_reverse] pointer-events-none z-20 whitespace-nowrap shadow-sm"
  }, "+", scoreAnimation.points), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleManualScore(team.id, -100),
    className: "text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "-"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleManualScore(team.id, 100),
    className: "text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "+")), gameTeams.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveTeam(team.id),
    className: "absolute -top-2 -right-2 bg-slate-800 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all shadow-sm",
    "aria-label": t('common.remove')
  }, /*#__PURE__*/React.createElement(X, {
    size: 10
  })))), gameTeams.length < 6 && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: handleAddTeam,
    className: "flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold mt-1"
  }, t('review_game.add_team')))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 max-w-4xl mx-auto w-full flex-grow content-start relative z-10"
  }, getReviewCategories().map((cat, cIdx) => {
    const CategoryIcon = cIdx === 0 ? Brain : cIdx === 1 ? Languages : Search;
    const iconColor = cIdx === 0 ? "text-yellow-400" : cIdx === 1 ? "text-green-400" : "text-blue-400";
    return /*#__PURE__*/React.createElement("div", {
      key: cIdx,
      className: "flex flex-col gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/80 backdrop-blur-sm text-white font-bold text-center py-4 rounded-lg border-b-4 border-blue-600 shadow-lg uppercase tracking-wider text-sm md:text-base flex flex-col items-center gap-1"
    }, /*#__PURE__*/React.createElement(CategoryIcon, {
      size: 20,
      className: iconColor
    }), cat.name), cat.questions.map((q, qIdx) => {
      const isClaimed = reviewGameState.claimed.has(q.originalIndex);
      return /*#__PURE__*/React.createElement("button", {
        key: qIdx,
        onClick: () => !isClaimed && handleReviewTileClick(q, q.points),
        disabled: isClaimed,
        "aria-label": `Category: ${cat.name}, ${q.points} Points${isClaimed ? ', Claimed' : ''}`,
        "aria-disabled": isClaimed,
        className: `
                                                            h-24 rounded-lg font-black text-3xl shadow-lg transition-all duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-700 border-slate-800 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `
      }, !isClaimed && /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"
      }), /*#__PURE__*/React.createElement("span", {
        className: "relative z-10 drop-shadow-md"
      }, isClaimed ? '' : q.points));
    }));
  })), reviewGameState.activeQuestion && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 animate-in zoom-in-95 duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-800 w-full max-w-4xl rounded-2xl border-4 border-yellow-500 shadow-2xl p-8 text-center relative flex flex-col max-h-full overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-blue-900 font-black text-2xl px-6 py-2 rounded-full shadow-lg border-2 border-white"
  }, reviewGameState.activeQuestion.points), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: () => closeReviewModal(false),
    className: "absolute top-4 right-4 text-blue-300 hover:text-white transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm"
  }, formatInlineText(reviewGameState.activeQuestion.question, false, true)), reviewGameState.activeQuestion.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-lg italic mt-4"
  }, formatInlineText(reviewGameState.activeQuestion.question_en, false, true))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left"
  }, reviewGameState.activeQuestion.options.map((opt, oIdx) => /*#__PURE__*/React.createElement("div", {
    key: oIdx,
    className: `
                                                            p-4 rounded-xl text-lg font-medium border-2 transition-all
                                                            ${reviewGameState.showAnswer ? opt === reviewGameState.activeQuestion.correctAnswer ? 'bg-green-700 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'bg-blue-900/50 border-blue-700 text-blue-300 opacity-50' : 'bg-blue-700 border-blue-500 text-white'}
                                                        `
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-8 font-bold opacity-50"
  }, String.fromCharCode(65 + oIdx), "."), " ", formatInlineText(opt, false, true)))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-6 mt-auto pt-4 border-t border-blue-700"
  }, !reviewGameState.showAnswer ? /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    onClick: () => {
      setReviewGameState(prev => ({
        ...prev,
        showAnswer: true
      }));
      playSound('reveal');
    },
    className: "bg-yellow-500 text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors shadow-lg hover:shadow-yellow-500/20"
  }, t('review_game.reveal_answer')) : /*#__PURE__*/React.createElement("div", {
    className: "w-full animate-in fade-in slide-in-from-bottom-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-sm font-bold uppercase tracking-wider mb-3"
  }, t('review_game.who_correct')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3"
  }, gameTeams.map(team => /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    key: team.id,
    onClick: () => handleAwardPoints(team.id, reviewGameState.activeQuestion.points),
    className: `${team.color.replace('bg-', 'bg-')} hover:opacity-90 ${team.color.includes('yellow') ? 'text-indigo-900' : 'text-white'} px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all`
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }), " ", team.name)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      playSound('incorrect');
      closeReviewModal(true);
    },
    className: "bg-slate-700 text-slate-600 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"
  }, t('review_game.no_points'))))))))) : escapeRoomState.isActive ? window.AlloModules && window.AlloModules.EscapeRoomGameplay ? /*#__PURE__*/React.createElement(window.AlloModules.EscapeRoomGameplay, {
    escapeRoomState: escapeRoomState,
    setEscapeRoomState: setEscapeRoomState,
    escapeTimeLeft: escapeTimeLeft,
    isEscapeTimerRunning: isEscapeTimerRunning,
    setIsEscapeTimerRunning: setIsEscapeTimerRunning,
    handleSetIsEscapeTimerRunningToTrue: () => setIsEscapeTimerRunning(true),
    handlers: {
      generateEscapeRoom,
      handlePuzzleSolved,
      handleSelectObject,
      handleWrongAnswer,
      handleEscapeRoomAnswer,
      handleSequenceAnswer,
      handleCipherAnswer,
      handleMatchingSelect,
      handleScrambleAnswer,
      handleFillinAnswer,
      handleFinalDoorAnswer,
      resetEscapeRoom,
      handleRevealHint,
      derangeShuffle,
      openEscapeRoomSettings
    },
    t: t,
    soundEnabled: soundEnabled,
    setSoundEnabled: setSoundEnabled,
    playSound: playSound,
    globalPoints: globalPoints,
    inputText: inputText
  }) : null : isPresentationMode ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-in fade-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-xl flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 24,
    className: "text-teal-400"
  }), " ", t('quiz.presentation_board')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.reset_presentation'),
    onClick: resetPresentation,
    className: "flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  }), " ", t('quiz.reset_board'))), generatedContent?.data.questions.map((q, i) => {
    const pState = presentationState[i] || {};
    const isAnswered = !!pState.selectedOption;
    const isCorrectlyAnswered = pState.isCorrect;
    const showAnswer = pState.showAnswer;
    const showExplanation = pState.showExplanation;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-4 mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm"
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-2xl font-bold text-slate-800 leading-tight"
    }, formatInlineText(q.question, false)), q.question_en && /*#__PURE__*/React.createElement("p", {
      className: "text-lg text-slate-600 italic mt-2"
    }, formatInlineText(q.question_en, false)))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-14"
    }, q.options.map((opt, optIdx) => {
      const isSelected = pState.selectedOption === opt;
      const isCorrectOption = opt === q.correctAnswer;
      let btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
      let icon = /*#__PURE__*/React.createElement("div", {
        className: "w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors"
      });
      if (isSelected) {
        if (pState.isCorrect) {
          btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
          icon = /*#__PURE__*/React.createElement(CheckCircle2, {
            size: 24,
            className: "text-green-600"
          });
        } else {
          btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake";
          icon = /*#__PURE__*/React.createElement(XCircle, {
            size: 24,
            className: "text-red-500"
          });
        }
      } else if (showAnswer && isCorrectOption) {
        btnClass = "bg-green-50 border-2 border-green-400 text-green-800 ring-2 ring-green-200 ring-offset-2";
        icon = /*#__PURE__*/React.createElement(CheckCircle2, {
          size: 24,
          className: "text-green-500"
        });
      } else if (showAnswer) {
        btnClass = "opacity-50 bg-slate-50 border-slate-100 text-slate-600 cursor-not-allowed";
      }
      return /*#__PURE__*/React.createElement("button", {
        "aria-label": t('common.cancel'),
        key: optIdx,
        onClick: () => handlePresentationOptionClick(i, opt),
        disabled: showAnswer,
        className: `p-5 rounded-xl text-left font-bold text-lg transition-all duration-200 flex items-center gap-4 group w-full ${btnClass}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "shrink-0"
      }, icon), /*#__PURE__*/React.createElement("div", {
        className: "flex-grow"
      }, formatInlineText(opt, false), q.options_en && q.options_en[optIdx] && /*#__PURE__*/React.createElement("div", {
        className: "text-sm font-normal opacity-80 italic mt-1"
      }, formatInlineText(q.options_en[optIdx], false))));
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 ml-0 md:ml-14 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-8 flex items-center relative"
    }, isAnswered && !isCorrectlyAnswered && !showAnswer && /*#__PURE__*/React.createElement("span", {
      className: "text-red-500 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-left-2"
    }, /*#__PURE__*/React.createElement(XCircle, {
      size: 18
    }), " ", t('quiz.presentation_try_again')), isAnswered && isCorrectlyAnswered && /*#__PURE__*/React.createElement("span", {
      className: "text-green-600 font-bold flex items-center gap-2 animate-in zoom-in duration-300 overflow-visible"
    }, /*#__PURE__*/React.createElement(Sparkles, {
      size: 18
    }), " ", t('quiz.presentation_correct'), /*#__PURE__*/React.createElement(ConfettiExplosion, null))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, q.factCheck && /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.collapse'),
      onClick: () => togglePresentationExplanation(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`
    }, showExplanation ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Info, {
      size: 14
    }), showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.show'),
      onClick: () => togglePresentationAnswer(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`
    }, showAnswer ? /*#__PURE__*/React.createElement(Eye, {
      size: 14
    }) : /*#__PURE__*/React.createElement(MousePointerClick, {
      size: 14
    }), showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')))), showExplanation && q.factCheck && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in slide-in-from-top-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "prose prose-sm text-slate-700 max-w-none leading-relaxed"
    }, renderFormattedText(q.factCheck))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-900 text-white p-8 rounded-2xl shadow-xl mt-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold mb-6 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 24,
    className: "text-indigo-300"
  }), " ", t('quiz.presentation_discussion')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-8"
  }, Array.isArray(generatedContent?.data.reflections) ? generatedContent?.data.reflections.map((ref, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-indigo-800/50 p-6 rounded-xl border border-indigo-700"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-medium leading-relaxed text-center"
  }, "\"", typeof ref === 'string' ? ref : ref.text, "\""), typeof ref === 'object' && ref.text_en && /*#__PURE__*/React.createElement("p", {
    className: "text-lg text-indigo-300 italic text-center mt-4"
  }, "\"", ref.text_en, "\""))) : /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-medium leading-relaxed text-center"
  }, "\"", generatedContent?.data.reflection, "\"")))) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.questions.map((q, i) => (q && q.type && q.type !== 'mcq') ? null : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question"
  },
    // Plan S Slice 5: Visual MCQ — question image stimulus when present
    q.imageUrl && /*#__PURE__*/React.createElement("img", {
      src: q.imageUrl,
      alt: q.question || 'Question image',
      loading: "lazy",
      className: "w-full max-h-64 object-contain rounded-lg border border-slate-200 mb-3 bg-slate-50",
    }),
    /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1.5"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow space-y-2"
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_question') || 'Edit question',
    value: q.question,
    onChange: e => handleQuizChange(i, 'question', e.target.value),
    className: "w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
    rows: getRows(q.question)
  }), q.question_en !== undefined && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_question_english') || 'Edit question English translation',
    value: q.question_en || '',
    onChange: e => handleQuizChange(i, 'question', e.target.value, null, true),
    className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
    rows: getRows(q.question_en || ''),
    placeholder: t('common.placeholder_english_trans')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-800 px-2 py-1"
  }, q.question), q.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic px-2"
  }, q.question_en)))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: `flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`,
    title: t('quiz.verify_tooltip')
  }, isFactChecking[i] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : q.factCheck ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 12
  }), isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9"
  }, q.options.map((opt, optIdx) => /*#__PURE__*/React.createElement("div", {
    key: optIdx,
    role: !isEditingQuiz ? 'button' : undefined,
    tabIndex: !isEditingQuiz ? 0 : undefined,
    "aria-pressed": !isEditingQuiz ? (studentMcqAnswers[i] === optIdx) : undefined,
    onClick: !isEditingQuiz ? () => selectMcqOption(i, optIdx, opt, q) : undefined,
    onKeyDown: !isEditingQuiz ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMcqOption(i, optIdx, opt, q); } } : undefined,
    className: `p-2 rounded-lg border text-sm relative group/option ${!isEditingQuiz ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors' : ''} ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : (studentMcqAnswers[i] === optIdx ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-100')}`
  },
    // Plan S Slice 5: Visual MCQ — option image thumbnail when present
    Array.isArray(q.optionImageUrls) && q.optionImageUrls[optIdx] && /*#__PURE__*/React.createElement("img", {
      src: q.optionImageUrls[optIdx],
      alt: opt,
      loading: "lazy",
      className: "w-full h-24 object-contain rounded mb-2 bg-white border border-slate-200",
    }),
    /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mt-1.5 opacity-50"
  }, String.fromCharCode(65 + optIdx), "."), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option') || 'Edit answer option',
    value: opt,
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx),
    className: `w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`,
    rows: getRows(opt, 30)
  }), q.options_en && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option_translation') || 'Edit option translation',
    value: q.options_en[optIdx] || '',
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx, true),
    className: "w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all mt-1",
    rows: getRows(q.options_en[optIdx] || '', 30),
    placeholder: t('common.placeholder_option_trans')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: `px-1 py-0.5 ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`
  }, opt), q.options_en && q.options_en[optIdx] && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mt-1 px-1 italic"
  }, q.options_en[optIdx])))), showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 right-2 text-green-600"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }))))),
    // Plan S Slice 5+: per-MCQ enhancements (Explain / IDK / confidence) — same parity as freeform items
    /*#__PURE__*/React.createElement(McqEnhancements, {
      q: q,
      questionIdx: i,
      modeStrategy: _modeStrat,
      callGemini: props.callGemini,
      callTTS: props.callTTS,
      gradeLevel: props.gradeLevel,
      onSubmitLiveAnswer: onSubmitLiveAnswer,
    }),
    q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 ml-9 p-3 pr-20 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2 items-start animate-in slide-in-from-top-2 relative"
  }, /*#__PURE__*/React.createElement(Stamp, {
    label: t('quiz.verified_stamp'),
    position: "top-2 right-2",
    size: "small"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: "absolute bottom-2 right-2 p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors",
    title: t('quiz.regenerate_check')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: isFactChecking[i] ? "animate-spin" : ""
  })), /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "mt-0.5 shrink-0 text-yellow-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "whitespace-pre-line leading-relaxed text-slate-700"
  }, renderFormattedText(q.factCheck)))))),
    // ─── Plan S Slice 2: freeform item types (fill-blank + short-answer) ───
    // Renders below MCQ items. Each freeform item gets its own card with input
    // + AI-graded feedback via QuizAIHelpers. Mode-agnostic — works in any
    // mode that includes these item types in its strategy.
    Array.isArray(generatedContent?.data?.questions) &&
    generatedContent.data.questions.some(function (q) { return q && (q.type === 'fill-blank' || q.type === 'short-answer' || q.type === 'self-explanation' || q.type === 'sequence-sense' || q.type === 'relation-mismatch'); }) &&
    /*#__PURE__*/React.createElement(FreeformItemsBlock, {
      questions: generatedContent.data.questions,
      callGemini: props.callGemini,
      callTTS: props.callTTS,
      gradeLevel: props.gradeLevel,
      QuizAIHelpers: window.AlloModules && window.AlloModules.QuizAIHelpers,
      modeStrategy: _modeStrat,
      onSubmitLiveAnswer: onSubmitLiveAnswer,
    }),
    /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 16
  }), " ", t('quiz.reflections')), Array.isArray(generatedContent?.data.reflections) ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.reflections.map((ref, i) => {
    const text = typeof ref === 'string' ? ref : ref.text;
    const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
    return /*#__PURE__*/React.createElement("div", {
      key: i
    }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection') || 'Edit reflection prompt',
      value: text,
      onChange: e => handleReflectionChange(i, e.target.value),
      className: "w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(text)
    }), (textEn !== null || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection_translation') || 'Edit reflection translation',
      value: textEn || '',
      onChange: e => handleReflectionChange(i, e.target.value, true),
      className: "w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(textEn || ''),
      placeholder: t('common.placeholder_reflection_trans')
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-800 mb-1 italic text-sm px-2 py-1"
    }, text), textEn && /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-600 mb-4 text-xs px-2 py-1 italic"
    }, textEn)), /*#__PURE__*/React.createElement("div", {
      className: "h-24 border-b border-indigo-200 border-dashed"
    }));
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-800 mb-4 italic text-sm"
  }, generatedContent?.data.reflection), /*#__PURE__*/React.createElement("div", {
    className: "h-24 border-b border-indigo-200 border-dashed"
  })))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizView = QuizView;
  window.AlloModules.ViewQuizModule = true;
})();
