var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
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
  function _quizShuffleCopy(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }
  function SequenceSenseCard(p) {
    var q = p.q;
    var canonicalItems = Array.isArray(q.items) ? q.items.filter(Boolean) : [];
    var intentionallyWrongIndex = typeof q.intentionallyWrongIndex === 'number' ? q.intentionallyWrongIndex : null;
    var orderingPrinciple = q.orderingPrinciple || 'chronological';
    var principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 2 ? q.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = (q.question || '') + ' — Items in canonical order: ' + canonicalItems.join(', ') + '. Ordering principle: ' + orderingPrinciple + '.';
      var prompt = 'You are a patient teacher. A ' + grade + ' student is working a sequencing item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name the ordering principle, walk through one or two items as a concrete example, and end with a sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setStep('done');
      setGrade({
        step1Correct: false,
        step2Correct: false,
        step3Correct: false,
        status: 'idk',
        score: 0
      });
      if (aiExplainerEnabled) requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'sequence-sense',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    var presentedOrderState = React.useState(function () {
      if (Array.isArray(q.presentedOrder) && q.presentedOrder.length === canonicalItems.length) {
        return q.presentedOrder.slice();
      }
      var indices = canonicalItems.map(function (_, i) {
        return i;
      });
      for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }
      return indices;
    });
    var presentedOrder = presentedOrderState[0];
    var stepState = React.useState(1);
    var step = stepState[0];
    var setStep = stepState[1];
    var verifyState = React.useState(null);
    var verifyAnswer = verifyState[0];
    var setVerifyAnswer = verifyState[1];
    var clickedState = React.useState(null);
    var clickedIdx = clickedState[0];
    var setClickedIdx = clickedState[1];
    var principleState = React.useState(null);
    var principleAnswer = principleState[0];
    var setPrincipleAnswer = principleState[1];
    var gradeState = React.useState(null);
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    function answerVerify(ans) {
      setVerifyAnswer(ans);
      setStep(ans === 'no' ? 2 : 3);
    }
    function answerMisplaced(idx) {
      setClickedIdx(idx);
      setStep(3);
    }
    function answerPrinciple(p2) {
      setPrincipleAnswer(p2);
      var actualOrderIsCorrect = intentionallyWrongIndex === null;
      var step1Correct = verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
      var step2Correct;
      if (verifyAnswer === 'yes') {
        step2Correct = step1Correct;
      } else {
        step2Correct = clickedIdx === intentionallyWrongIndex;
      }
      var step3Correct = p2 === orderingPrinciple;
      var score = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (step3Correct ? 1 : 0);
      var status = score === 3 ? 'correct' : score === 2 ? 'partially-correct' : 'incorrect';
      setGrade({
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        step3Correct: step3Correct,
        status: status,
        score: score
      });
      setStep('done');
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'sequence-sense',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              verifyAnswer: verifyAnswer,
              clickedIdx: clickedIdx,
              principleAnswer: p2,
              score: score,
              status: status
            },
            timestamp: Date.now()
          });
        } catch (e) {}
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
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Sequence Sense</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || 'Below is a sequence. Verify and explain.'}</p></div></div><ol className="space-y-1.5 mb-3">{presentedOrder.map(function (canonicalIdx, displayIdx) {
          var item = canonicalItems[canonicalIdx];
          var isClickable = step === 2;
          var isClicked = clickedIdx === displayIdx;
          var showCorrectness = grade !== null;
          var thisIsActuallyMisplaced = intentionallyWrongIndex === displayIdx;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyMisplaced) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return <li key={displayIdx} onClick={isClickable ? function () {
            answerMisplaced(displayIdx);
          } : null} className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerMisplaced(displayIdx);
            }
          } : undefined}><span className="flex-shrink-0 text-xs font-bold text-slate-600 w-6">{displayIdx + 1 + '.'}</span><span className="flex-1 text-sm text-slate-800">{item}</span>{showCorrectness && thisIsActuallyMisplaced && <span className="text-xs font-bold text-amber-700">↔ misplaced</span>}{showCorrectness && isClicked && !thisIsActuallyMisplaced && <span className="text-xs font-bold text-rose-700">✗</span>}</li>;
        })}</ol>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 1 of 3 — Is this order correct?</div><div className="flex gap-2 flex-wrap"><button type="button" onClick={function () {
            answerVerify('yes');
          }} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">✓ Yes, correct</button><button type="button" onClick={function () {
            answerVerify('no');
          }} className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors">✗ No, something is off</button>{allowIDK && <button type="button" onClick={markIDK} className="px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors" aria-label="I don't know — skip without penalty" title="Skip — no penalty. The AI will explain."><span aria-hidden="true">🤔 </span>I don't know</button>}</div></div>}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900">Step 2 of 3 — Click the item that's out of place above.</div></div>}{step === 3 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 3 of 3 — What's the ordering principle?</div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{principleOptions.map(function (opt) {
            return <button key={opt} type="button" onClick={function () {
              answerPrinciple(opt);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors">{opt}</button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 3 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}><li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Verify: ' + (intentionallyWrongIndex === null ? 'order was correct' : 'order had one misplaced item') + (grade.step1Correct ? '' : ' (you said "' + verifyAnswer + '")')}</li>{verifyAnswer === 'no' && <li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Diagnose: ' + (grade.step2Correct ? 'you found the misplaced item' : 'the misplaced item was item #' + ((intentionallyWrongIndex || 0) + 1))}</li>}<li>{(grade.step3Correct ? '✓ ' : '✗ ') + 'Principle: ' + (grade.step3Correct ? '"' + orderingPrinciple + '"' : 'correct answer was "' + orderingPrinciple + '" (you picked "' + principleAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          try {
            p.callTTS(explainer.text);
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
  }
  function RelationMismatchCard(p) {
    var q = p.q;
    var pairs = Array.isArray(q.pairs) ? q.pairs.filter(function (pr) {
      return pr && pr.left && pr.right;
    }) : [];
    var wrongPairIndex = typeof q.wrongPairIndex === 'number' ? q.wrongPairIndex : 0;
    var correctPartnerForWrong = q.correctPartnerForWrong || '';
    var candidatePartners = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];
    var stepState = React.useState(1);
    var step = stepState[0];
    var setStep = stepState[1];
    var clickedPairState = React.useState(null);
    var clickedPairIdx = clickedPairState[0];
    var setClickedPairIdx = clickedPairState[1];
    var partnerAnswerState = React.useState(null);
    var partnerAnswer = partnerAnswerState[0];
    var setPartnerAnswer = partnerAnswerState[1];
    var gradeState = React.useState(null);
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var leftSide = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
      var conceptHint = (q.question || '') + ' — The correct relationship is "' + leftSide + '" ↔ "' + correctPartnerForWrong + '".';
      var prompt = 'You are a patient teacher. A ' + grade + ' student is working a relation-mismatch item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name what makes this relationship correct, and contrast it with the wrong pair the student saw. End with a sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setStep('done');
      setGrade({
        step1Correct: false,
        step2Correct: false,
        status: 'idk',
        score: 0
      });
      if (aiExplainerEnabled) requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'relation-mismatch',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    function answerWhichWrong(idx) {
      setClickedPairIdx(idx);
      setStep(2);
    }
    function answerPartner(ans) {
      setPartnerAnswer(ans);
      var step1Correct = clickedPairIdx === wrongPairIndex;
      var step2Correct = ans === correctPartnerForWrong;
      var score = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0);
      var status = score === 2 ? 'correct' : score === 1 ? 'partially-correct' : 'incorrect';
      setGrade({
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        status: status,
        score: score
      });
      setStep('done');
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'relation-mismatch',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              clickedPairIdx: clickedPairIdx,
              partnerAnswer: ans,
              score: score,
              status: status
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    function reset() {
      setStep(1);
      setClickedPairIdx(null);
      setPartnerAnswer(null);
      setGrade(null);
    }
    if (pairs.length === 0) return null;
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    var wrongPairLeft = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Relation Mismatch</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || 'One of these pairs is wrong. Find it and fix it.'}</p></div></div><div className="space-y-1.5 mb-3">{pairs.map(function (pair, idx) {
          var isClickable = step === 1;
          var isClicked = clickedPairIdx === idx;
          var thisIsActuallyWrong = idx === wrongPairIndex;
          var showCorrectness = grade !== null;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyWrong) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return <div key={idx} onClick={isClickable ? function () {
            answerWhichWrong(idx);
          } : null} className={'grid grid-cols-2 gap-3 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerWhichWrong(idx);
            }
          } : undefined}><span className="text-sm font-semibold text-slate-800">{pair.left}</span><span className="text-sm text-slate-700 flex items-center justify-between gap-2"><span>{'↔ ' + pair.right}</span>{showCorrectness && thisIsActuallyWrong && <span className="text-xs font-bold text-amber-700 flex-shrink-0">wrong</span>}{showCorrectness && isClicked && !thisIsActuallyWrong && <span className="text-xs font-bold text-rose-700 flex-shrink-0">✗</span>}</span></div>;
        })}</div>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="text-sm font-semibold text-indigo-900">Step 1 of 2 — Click the pair that's wrong above.</div>{allowIDK && <button type="button" onClick={markIDK} className="px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors" aria-label="I don't know — skip without penalty" title="Skip — no penalty. The AI will explain."><span aria-hidden="true">🤔 </span>I don't know</button>}</div></div>}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">{'Step 2 of 2 — Which item should "' + (clickedPairIdx !== null && pairs[clickedPairIdx] ? pairs[clickedPairIdx].left : wrongPairLeft) + '" have been paired with?'}</div><div className="grid grid-cols-2 gap-2">{(candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong]).map(function (cand) {
            return <button key={cand} type="button" onClick={function () {
              answerPartner(cand);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors">{cand}</button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}><li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Find: ' + (grade.step1Correct ? 'you spotted the wrong pair' : 'the wrong pair was "' + wrongPairLeft + ' ↔ ' + (pairs[wrongPairIndex] ? pairs[wrongPairIndex].right : '') + '"')}</li><li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Fix: ' + (grade.step2Correct ? 'correct partner — "' + correctPartnerForWrong + '"' : 'correct partner was "' + correctPartnerForWrong + '" (you picked "' + partnerAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          try {
            p.callTTS(explainer.text);
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
  }
  function McqEnhancements(p) {
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
    if (!allowIDK && !allowConfidence && !aiExplainerEnabled) return null;
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    var idkState = React.useState(false);
    var idkMarked = idkState[0];
    var setIdkMarked = idkState[1];
    var localConfidenceState = React.useState(null);
    var hasParentConfidence = typeof p.onSetConfidence === 'function';
    var confidence = hasParentConfidence ? p.currentConfidence : localConfidenceState[0];
    var setConfidence = hasParentConfidence ? p.onSetConfidence : localConfidenceState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = p.q && (p.q.question || p.q.correctAnswer) || '';
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept. Question or concept: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setIdkMarked(true);
      requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'mcq',
            conceptLabel: p.q && p.q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    return <div className="mt-3 ml-9 space-y-2">{(aiExplainerEnabled || allowIDK) && <div className="flex items-center gap-2 flex-wrap">{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors" aria-label={t("a11y.explain_concept")} title="Get a quick AI explanation of this concept"><span aria-hidden="true">🤖 </span>Explain this concept</button>}{allowIDK && !idkMarked && <button type="button" onClick={markIDK} className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors" aria-label="I don't know — skip without penalty" title="Skip — no penalty. The AI will explain the concept."><span aria-hidden="true">🤔 </span>I don't know</button>}{idkMarked && <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900">Marked "I don't know"</span>}</div>}{explainer.open && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          p.callTTS(explainer.text);
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{allowConfidence && <div className="flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">How sure were you?</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: 'I knew this',
            guessed: 'I guessed',
            'no-idea': 'No idea'
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" onClick={function () {
            setConfidence(lvl);
          }} className={'px-2 py-0.5 rounded border transition-colors ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
  }
  function LiveResultsDashboard(p) {
    var aggsMod = window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (!aggsMod) return null;
    var sessionData = p.sessionData || {};
    var quizState = sessionData.quizState || {};
    var generatedContent = p.generatedContent;
    var roster = sessionData.roster || {};
    var mode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
    var modeLabel = generatedContent && generatedContent.data && generatedContent.data.modeLabel || 'Exit Ticket';
    var modeIcon = generatedContent && generatedContent.data && generatedContent.data.modeIcon || '📝';
    var appId = p.appId;
    var conceptMasteryState = React.useState(null);
    var conceptMasteryByUid = conceptMasteryState[0];
    var setConceptMasteryByUid = conceptMasteryState[1];
    var rosterKeysSig = Object.keys(roster).sort().join(',');
    React.useEffect(function () {
      if (mode !== 'review') {
        setConceptMasteryByUid(null);
        return;
      }
      var fb = window.__alloFirebase;
      if (!fb || !fb.doc || !fb.getDoc || !appId) {
        setConceptMasteryByUid({});
        return;
      }
      var uids = Object.keys(roster);
      if (uids.length === 0) {
        setConceptMasteryByUid({});
        return;
      }
      var cancelled = false;
      Promise.all(uids.map(function (uid) {
        try {
          var ref = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'conceptMastery', uid);
          return fb.getDoc(ref).then(function (snap) {
            return [uid, snap.exists() ? snap.data() : null];
          }).catch(function () {
            return [uid, null];
          });
        } catch (e) {
          return Promise.resolve([uid, null]);
        }
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
      return function () {
        cancelled = true;
      };
    }, [mode, rosterKeysSig, appId]);
    var aiGradedState = React.useState({});
    var aiGradedCache = aiGradedState[0];
    var setAiGradedCache = aiGradedState[1];
    var aiGradedInFlightRef = React.useRef({});
    var allResponsesSig = React.useMemo(function () {
      try {
        return JSON.stringify(quizState.allResponses || {});
      } catch (e) {
        return '';
      }
    }, [quizState.allResponses]);
    React.useEffect(function () {
      var aiHelpers = window.AlloModules && window.AlloModules.QuizAIHelpers;
      if (!aiHelpers || typeof p.callGemini !== 'function') return;
      var allResponses = quizState.allResponses || {};
      var questions = generatedContent && generatedContent.data && generatedContent.data.questions || [];
      var pending = [];
      Object.keys(allResponses).forEach(function (uid) {
        var perStudent = allResponses[uid] || {};
        Object.keys(perStudent).forEach(function (qKey) {
          var qIdx = parseInt(qKey, 10);
          if (isNaN(qIdx) || !questions[qIdx]) return;
          var response = perStudent[qKey];
          if (!response || !response.answer || response.answer.idk) return;
          var q = questions[qIdx];
          var t = response.itemType || q && q.type;
          if (t !== 'short-answer' && t !== 'self-explanation') return;
          var text = response.answer && response.answer.text || '';
          if (!text || !text.trim()) return;
          var key = uid + ':' + qIdx;
          if (aiGradedCache[key] || aiGradedInFlightRef.current[key]) return;
          pending.push({
            key: key,
            q: q,
            text: text
          });
        });
      });
      if (pending.length === 0) return;
      pending.forEach(function (item) {
        aiGradedInFlightRef.current[item.key] = true;
      });
      Promise.all(pending.map(function (item) {
        return aiHelpers.gradeFreeformAnswer({
          question: item.q.question || item.q.contextSentence || '',
          expectedAnswer: item.q.expectedAnswer || item.q.exemplarAnswer || item.q.expectedFill || '',
          studentResponse: item.text,
          gradeLevel: p.gradeLevel,
          callGemini: p.callGemini
        }).then(function (result) {
          return {
            key: item.key,
            result: result
          };
        }).catch(function (err) {
          return {
            key: item.key,
            result: {
              status: 'error',
              feedback: err && err.message || 'Grader failed.'
            }
          };
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
        pending.forEach(function (item) {
          delete aiGradedInFlightRef.current[item.key];
        });
      });
    }, [allResponsesSig, generatedContent && generatedContent.id]);
    var inFlightCount = Object.keys(aiGradedInFlightRef.current || {}).length;
    var expandedRowsState = React.useState({});
    var expandedRows = expandedRowsState[0];
    var setExpandedRows = expandedRowsState[1];
    function toggleRowExpanded(uid) {
      setExpandedRows(function (prev) {
        var next = Object.assign({}, prev);
        if (next[uid]) delete next[uid];else next[uid] = true;
        return next;
      });
    }
    var expandedBarsState = React.useState({});
    var expandedBars = expandedBarsState[0];
    var setExpandedBars = expandedBarsState[1];
    function toggleBarExpanded(qIdx) {
      setExpandedBars(function (prev) {
        var next = Object.assign({}, prev);
        if (next[qIdx]) delete next[qIdx];else next[qIdx] = true;
        return next;
      });
    }
    function confidenceChip(confidence, status) {
      if (!confidence) return null;
      var labels = {
        knew: 'knew',
        guessed: 'guessed',
        'no-idea': 'no idea'
      };
      var color = 'slate';
      var note = '';
      if (status === 'correct') {
        if (confidence === 'guessed') {
          color = 'amber';
          note = ' (lucky)';
        } else if (confidence === 'no-idea') {
          color = 'rose';
          note = ' (?)';
        }
      } else if (status === 'incorrect' || status === 'partially-correct') {
        if (confidence === 'knew') {
          color = 'rose';
          note = ' (overconfident)';
        } else if (confidence === 'no-idea') {
          color = 'sky';
          note = '';
        }
      }
      var bgClass = color === 'amber' ? 'bg-amber-100 text-amber-800' : color === 'rose' ? 'bg-rose-100 text-rose-800' : color === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700';
      return <span className={'flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + bgClass} title={'Student rated: ' + labels[confidence] + note}>{'🎯 ' + labels[confidence]}</span>;
    }
    var explainerModalState = React.useState({
      open: false,
      conceptIdx: null,
      conceptText: '',
      loading: false,
      text: '',
      error: ''
    });
    var explainerModal = explainerModalState[0];
    var setExplainerModal = explainerModalState[1];
    var prevFocusRef = React.useRef(null);
    var explainerCloseBtnRef = React.useRef(null);
    function openExplainer(conceptIdx, conceptText) {
      try {
        prevFocusRef.current = document.activeElement;
      } catch (e) {}
      setExplainerModal({
        open: true,
        conceptIdx: conceptIdx,
        conceptText: conceptText,
        loading: true,
        text: '',
        error: ''
      });
      runExplainerCall(conceptText);
    }
    function runExplainerCall(conceptText) {
      if (typeof p.callGemini !== 'function') {
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            error: 'Explainer unavailable: callGemini not provided.'
          });
        });
        return;
      }
      var grade = p.gradeLevel || 'middle school';
      var prompt = 'You are explaining a concept to ' + grade + ' students who do not yet understand it. They just took a pre-check and got it wrong as a class. Write a 60-90 word explainer that: (1) names the concept clearly, (2) gives ONE concrete relatable example, (3) avoids jargon, (4) reads aloud naturally. Plain text only. No markdown, no fences, no headers.\n\nCONCEPT (from the pre-check question that the class missed):\n"' + String(conceptText || '').slice(0, 400) + '"\n\nReturn ONLY the explainer text.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = typeof raw === 'object' && raw && raw.text ? raw.text : String(raw || '');
        txt = txt.replace(/^```(?:[a-z]+)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            text: txt,
            error: ''
          });
        });
      }).catch(function (err) {
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            error: err && err.message || 'Explainer call failed.'
          });
        });
      });
    }
    function closeExplainer() {
      setExplainerModal({
        open: false,
        conceptIdx: null,
        conceptText: '',
        loading: false,
        text: '',
        error: ''
      });
      setPushState({
        pushing: false,
        pushed: false,
        error: ''
      });
      try {
        if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
          prevFocusRef.current.focus();
        }
      } catch (e) {}
    }
    React.useEffect(function () {
      if (!explainerModal.open) return;
      function onKey(e) {
        if (e.key === 'Escape') closeExplainer();
      }
      document.addEventListener('keydown', onKey);
      var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
        try {
          explainerCloseBtnRef.current && explainerCloseBtnRef.current.focus();
        } catch (e) {}
      }) : setTimeout(function () {
        try {
          explainerCloseBtnRef.current && explainerCloseBtnRef.current.focus();
        } catch (e) {}
      }, 0);
      return function () {
        document.removeEventListener('keydown', onKey);
        if (typeof cancelAnimationFrame === 'function' && raf) {
          try {
            cancelAnimationFrame(raf);
          } catch (e) {}
        }
      };
    }, [explainerModal.open]);
    function copyExplainer() {
      if (!explainerModal.text) return;
      try {
        navigator.clipboard.writeText(explainerModal.text);
      } catch (e) {}
    }
    function playExplainer() {
      if (!explainerModal.text || typeof p.callTTS !== 'function') return;
      try {
        p.callTTS(explainerModal.text);
      } catch (e) {}
    }
    var pushStateState = React.useState({
      pushing: false,
      pushed: false,
      error: ''
    });
    var pushState = pushStateState[0];
    var setPushState = pushStateState[1];
    function pushExplainerToStudents() {
      if (!explainerModal.text || pushState.pushing) return;
      var fb = window.__alloFirebase;
      if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !appId || !p.activeSessionCode) {
        setPushState({
          pushing: false,
          pushed: false,
          error: 'Push unavailable: live session not active.'
        });
        return;
      }
      setPushState({
        pushing: true,
        pushed: false,
        error: ''
      });
      try {
        var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
        Promise.resolve(fb.updateDoc(sessionRef, {
          'quizState.classExplainer': {
            conceptIdx: explainerModal.conceptIdx,
            conceptText: explainerModal.conceptText,
            text: explainerModal.text,
            ts: Date.now()
          }
        })).then(function () {
          setPushState({
            pushing: false,
            pushed: true,
            error: ''
          });
        }).catch(function (err) {
          setPushState({
            pushing: false,
            pushed: false,
            error: err && err.message || 'Push failed.'
          });
        });
      } catch (e) {
        setPushState({
          pushing: false,
          pushed: false,
          error: e && e.message || 'Push failed.'
        });
      }
    }
    var teacherOverrides = quizState && quizState.teacherOverrides || {};
    function setTeacherOverride(uid, qIdx, newStatus) {
      var fb = window.__alloFirebase;
      if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !fb.deleteField || !appId || !p.activeSessionCode) return;
      var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
      var path = 'quizState.teacherOverrides.' + uid + '.' + qIdx;
      var update = {};
      if (newStatus == null) {
        update[path] = fb.deleteField();
      } else {
        update[path] = {
          status: newStatus,
          ts: Date.now()
        };
      }
      try {
        fb.updateDoc(sessionRef, update);
      } catch (e) {}
    }
    var aggResult;
    try {
      aggResult = aggsMod.aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides);
    } catch (e) {
      console.warn('[LiveResultsDashboard] aggregator failed:', e);
      return null;
    }
    if (!aggResult || !aggResult.data) return null;
    var data = aggResult.data;
    var variant = aggResult.variant;
    var header = <div className="flex items-center gap-2 mb-3 flex-wrap"><span className="text-2xl" aria-hidden="true">{modeIcon}</span><h3 className="font-black text-lg text-slate-800">{'Live Results — ' + modeLabel}</h3><span className="text-xs text-slate-600">{data.totalStudents + ' student' + (data.totalStudents === 1 ? '' : 's') + ' · ' + data.totalQuestions + ' question' + (data.totalQuestions === 1 ? '' : 's')}</span>{inFlightCount > 0 && <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 animate-pulse" role="status" aria-live="polite" aria-label={'AI grading ' + inFlightCount + ' open response' + (inFlightCount === 1 ? '' : 's')} title={inFlightCount + ' open-response answer' + (inFlightCount === 1 ? '' : 's') + ' being graded by AI'}><span aria-hidden="true">✨ </span>{'AI grading ' + inFlightCount + '…'}</span>}</div>;
    var hasAnyResponses = false;
    if (variant === 'gradebook') {
      hasAnyResponses = data.studentRows.some(function (r) {
        return r.totalAnswered > 0;
      });
    } else if (variant === 'preLessonGap') {
      hasAnyResponses = data.conceptCards.some(function (c) {
        return c.totalAnswered > 0;
      });
    } else if (variant === 'retentionCurve') {
      hasAnyResponses = Array.isArray(data.conceptRows) && data.conceptRows.some(function (row) {
        return row.students.some(function (s) {
          return s.seen;
        });
      });
    } else {
      hasAnyResponses = data.bars.some(function (b) {
        return b.total > 0;
      });
    }
    if (!hasAnyResponses) {
      return <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 mb-4">{header}<p className="text-sm text-slate-600 italic">Waiting for student responses. Results will appear here as students submit answers in this live session.</p></div>;
    }
    var body;
    if (variant === 'gradebook') {
      var csvEscape = function (v) {
        var s = v == null ? '' : String(v);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      var buildGradebookCsv = function () {
        var questions = generatedContent && generatedContent.data && generatedContent.data.questions || [];
        var header = ['Student', 'Answered', 'Correct', 'IDK', 'Score %'];
        questions.forEach(function (_, idx) {
          header.push('Q' + (idx + 1) + ' Status', 'Q' + (idx + 1) + ' Answer', 'Q' + (idx + 1) + ' Confidence', 'Q' + (idx + 1) + ' AI Feedback');
        });
        var lines = [header.map(csvEscape).join(',')];
        data.studentRows.forEach(function (row) {
          var pct = row.totalAnswered > 0 ? Math.round(row.totalCorrect / row.totalAnswered * 100) : 0;
          var line = [row.displayName, row.totalAnswered, row.totalCorrect, row.totalIdk, pct + '%'];
          for (var i = 0; i < questions.length; i++) {
            var cell = row.byQuestion[i];
            if (!cell) {
              line.push('', '', '', '');
            } else {
              line.push(cell.status || '', cell.answerSummary || '', cell.confidence || '', cell.aiFeedback || '');
            }
          }
          lines.push(line.map(csvEscape).join(','));
        });
        return '﻿' + lines.join('\r\n');
      };
      var exportCsv = function () {
        try {
          var csv = buildGradebookCsv();
          var blob = new Blob([csv], {
            type: 'text/csv;charset=utf-8;'
          });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          var d = new Date();
          var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          a.href = url;
          a.download = 'quiz-gradebook-' + stamp + '-' + (mode || 'exit-ticket') + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 100);
        } catch (e) {}
      };
      var statusBadge = function (cell) {
        if (!cell) return <span className="text-slate-600" title="No response">—</span>;
        if (cell.status === 'correct') return <span className="text-emerald-600" title={cell.aiGraded ? 'AI-graded correct' : 'Correct'}>✓</span>;
        if (cell.status === 'incorrect') return <span className="text-rose-600" title={cell.aiGraded ? 'AI-graded incorrect' : 'Incorrect'}>✗</span>;
        if (cell.status === 'idk') return <span className="text-sky-600" title="Marked I don't know">🤔</span>;
        if (cell.status === 'partially-correct') return <span className="text-amber-600" title="Partially correct">◐</span>;
        return <span className="text-slate-600" title="Submitted (ungraded)">·</span>;
      };
      body = <div><div className="flex items-center justify-end mb-2"><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 transition-colors" aria-label={t("a11y.export_gradebook_csv")} data-help-key="quiz_csv_export_btn" title="Download gradebook as CSV — opens in Excel / Google Sheets / Numbers"><span aria-hidden="true">📥 </span>Export CSV</button></div><div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-100"><th className="w-7 px-1 py-1.5" aria-label={t("a11y.expand_row")} /><th className="text-left px-2 py-1.5 font-bold text-slate-700">Student</th><th className="text-center px-2 py-1.5 font-bold text-slate-700">Answered</th><th className="text-center px-2 py-1.5 font-bold text-slate-700">Correct</th><th className="text-center px-2 py-1.5 font-bold text-slate-700">IDK</th></tr></thead><tbody>{data.studentRows.map(function (row) {
                var pct = row.totalAnswered > 0 ? Math.round(row.totalCorrect / row.totalAnswered * 100) : 0;
                var isExpanded = !!expandedRows[row.uid];
                var canExpand = row.totalAnswered > 0;
                var summaryRow = <tr key={row.uid + ':summary'} className={'border-t border-slate-200 ' + (canExpand ? 'cursor-pointer hover:bg-indigo-50/40' : '')} onClick={canExpand ? function () {
                  toggleRowExpanded(row.uid);
                } : undefined}><td className="text-center px-1 py-1.5">{canExpand ? <button type="button" aria-expanded={isExpanded} aria-label={(isExpanded ? 'Collapse' : 'Expand') + ' ' + row.displayName + ' details'} className="text-slate-600 hover:text-indigo-600 transition-colors text-xs font-mono" onClick={function (e) {
                      e.stopPropagation();
                      toggleRowExpanded(row.uid);
                    }}>{isExpanded ? '▼' : '▶'}</button> : <span className="text-slate-600 text-xs">·</span>}</td><td className="px-2 py-1.5 text-slate-800">{row.displayName}</td><td className="text-center px-2 py-1.5"><span className="text-xs font-mono text-slate-600">{row.totalAnswered + ' / ' + data.totalQuestions}</span></td><td className="text-center px-2 py-1.5">{row.totalAnswered > 0 ? <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}>{row.totalCorrect + ' (' + pct + '%)'}</span> : <span className="text-xs text-slate-600">—</span>}</td><td className="text-center px-2 py-1.5">{row.totalIdk > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">{row.totalIdk}</span> : <span className="text-xs text-slate-600">0</span>}</td></tr>;
                if (!isExpanded) return summaryRow;
                var detailRow = <tr key={row.uid + ':detail'} className="border-t border-slate-100 bg-indigo-50/30"><td colSpan={5} className="px-3 py-3"><div className="space-y-2">{row.byQuestion.map(function (cell, qIdx) {
                        var qNum = qIdx + 1;
                        var qSnippet = cell && cell.questionText ? cell.questionText.slice(0, 90) + (cell.questionText.length > 90 ? '…' : '') : 'Question ' + qNum;
                        var border = !cell ? 'border-slate-200 bg-white' : cell.status === 'correct' ? 'border-emerald-200 bg-emerald-50/50' : cell.status === 'incorrect' ? 'border-rose-200 bg-rose-50/50' : cell.status === 'idk' ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white';
                        return <div key={qIdx} className={'p-2 rounded border ' + border}><div className="flex items-start gap-2 mb-1"><span className="text-base mt-0.5 leading-none">{statusBadge(cell)}</span><div className="flex-grow min-w-0"><p className="text-xs font-semibold text-slate-700 mb-0.5">{'Q' + qNum + '. ' + qSnippet}</p>{cell && cell.answerSummary ? <p className="text-xs text-slate-800 break-words"><span className="text-slate-600">Answered: </span>{cell.answerSummary}</p> : !cell && <p className="text-xs italic text-slate-600">No response yet</p>}</div>{cell && cell.aiGraded && <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" aria-label={'Graded by AI as ' + cell.aiStatus} title={'Graded by AI (' + cell.aiStatus + ')'}><span aria-hidden="true">✨ </span>AI</span>}{cell && cell.teacherOverridden && <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800" aria-label={'Teacher override applied, was previously ' + (cell.priorStatus || 'unknown')} title={'Teacher override (was: ' + (cell.priorStatus || '?') + ')'}><span aria-hidden="true">🖊 </span>Teacher</span>}{cell && confidenceChip(cell.confidence, cell.status)}</div>{cell && cell.aiFeedback && <p className="text-[11px] italic text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 mt-1">"{cell.aiFeedback}"</p>}{cell && p.activeSessionCode && <div className="mt-1 flex items-center gap-1 flex-wrap" data-help-key="quiz_teacher_override_row"><span className="text-xs text-slate-700 font-semibold mr-1">Override:</span>{[{
                              s: 'correct',
                              icon: '✓',
                              color: 'emerald',
                              label: 'correct'
                            }, {
                              s: 'incorrect',
                              icon: '✗',
                              color: 'rose',
                              label: 'incorrect'
                            }, {
                              s: 'partially-correct',
                              icon: '◐',
                              color: 'amber',
                              label: 'partially correct'
                            }].map(function (opt) {
                              var isActive = cell.teacherOverridden && cell.status === opt.s;
                              return <button key={opt.s} type="button" onClick={function (e) {
                                e.stopPropagation();
                                setTeacherOverride(row.uid, qIdx, isActive ? null : opt.s);
                              }} className={'text-xs font-bold w-6 h-6 rounded transition-colors ' + (isActive ? 'bg-' + opt.color + '-600 text-white border border-' + opt.color + '-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-' + opt.color + '-50 hover:border-' + opt.color + '-300')} aria-label={'Override status to ' + opt.label + (isActive ? ' (currently set, click to undo)' : '')} aria-pressed={isActive} title={'Set status to ' + opt.s + (isActive ? ' (click again to undo)' : '')}><span aria-hidden="true">{opt.icon}</span></button>;
                            })}{cell.teacherOverridden && <button type="button" onClick={function (e) {
                              e.stopPropagation();
                              setTeacherOverride(row.uid, qIdx, null);
                            }} className="text-xs font-bold px-2 h-6 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100" aria-label={t("a11y.remove_teacher_override")} title="Remove teacher override (revert to AI / deterministic grade)"><span aria-hidden="true">↺ </span>undo</button>}</div>}</div>;
                      })}</div></td></tr>;
                return [summaryRow, detailRow];
              })}</tbody></table></div></div>;
    } else if (variant === 'preLessonGap') {
      body = <div className="space-y-2">{data.conceptCards.map(function (card) {
          var color = card.totalAnswered === 0 ? 'slate' : card.percentCorrect >= 80 ? 'emerald' : card.percentCorrect >= 50 ? 'amber' : 'rose';
          var urgency = card.totalAnswered === 0 ? 'no responses' : card.percentCorrect < 50 ? '⚠ Needs pre-teaching' : card.percentCorrect < 80 ? 'Review with class' : 'Class is ready';
          var showExplainBtn = card.totalAnswered > 0 && card.percentCorrect < 80 && typeof p.callGemini === 'function';
          return <div key={card.questionIdx} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-start justify-between gap-3 mb-1"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{urgency}</span>{card.totalAnswered > 0 && <span className={'text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-200 text-' + color + '-900'}>{card.percentCorrect + '% correct'}</span>}</div><p className="text-sm text-slate-800 mb-2">{card.conceptText}</p><div className={'flex items-center gap-3 text-xs text-' + color + '-900'}><span>{card.correctCount + ' ✓'}</span><span>{card.incorrectCount + ' ✗'}</span>{card.idkCount > 0 && <span className="text-sky-700">{card.idkCount + ' 🤔'}</span>}<span className="text-slate-600">{'· ' + card.totalAnswered + ' / ' + data.totalStudents + ' students'}</span>{showExplainBtn && <button type="button" onClick={function () {
                openExplainer(card.questionIdx, card.conceptText);
              }} className="ml-auto inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" aria-label={t("a11y.explain_to_class")} data-help-key="quiz_explain_to_class_btn" title="Generate a 60-90 word concept explainer for the class"><span aria-hidden="true">🎓 </span>Explain to class</button>}</div></div>;
        })}</div>;
    } else if (variant === 'retentionCurve') {
      body = <div className="space-y-3"><p className="text-xs text-slate-600 italic mb-1">Cross-session retention. Concepts with longer time-since-last-attempt or unseen students surface first. Recent attempts shown as colored dots (green=correct, red=miss, sky=IDK).</p>{data.conceptRows.map(function (row) {
          var sortedStudents = row.students.slice().sort(function (a, b) {
            if (!a.seen && b.seen) return -1;
            if (a.seen && !b.seen) return 1;
            if (!a.seen && !b.seen) return 0;
            return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
          });
          var color = row.unseenCount > 0 ? 'rose' : row.maxDaysSinceLast >= 14 ? 'rose' : row.maxDaysSinceLast >= 7 ? 'amber' : 'emerald';
          return <div key={row.conceptId} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-center gap-2 mb-2"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{row.label}</span><span className={'ml-auto text-[10px] text-' + color + '-700'}>{row.unseenCount > 0 ? row.unseenCount + ' unseen · ' : ''}{'max ' + row.maxDaysSinceLast + 'd since seen'}</span></div><div className="space-y-1">{sortedStudents.map(function (s) {
                var dayBadgeColor = !s.seen ? 'rose' : s.daysSinceLast >= 14 ? 'rose' : s.daysSinceLast >= 7 ? 'amber' : 'emerald';
                return <div key={s.uid} className="flex items-center gap-2 text-xs"><span className="flex-shrink-0 text-slate-700 font-semibold w-32 truncate">{s.displayName}</span>{!s.seen ? <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">never seen</span> : <span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + dayBadgeColor + '-100 text-' + dayBadgeColor + '-800'}>{s.daysSinceLast + 'd ago'}</span>}{s.seen && <span className="flex items-center gap-0.5">{s.recent.map(function (att, attIdx) {
                      var dotColor = att.status === 'correct' ? '#10b981' : att.status === 'incorrect' ? '#ef4444' : att.status === 'idk' ? '#0ea5e9' : '#94a3b8';
                      return <span key={attIdx} className="inline-block rounded-full" style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: dotColor
                      }} title={att.status + ' on ' + new Date(att.ts).toLocaleDateString()} />;
                    })}</span>}{s.seen && typeof s.successRate === 'number' && <span className="text-slate-600 ml-auto">{s.correctAttempts + '/' + s.totalAttempts + ' (' + s.successRate + '%)'}</span>}</div>;
              })}</div></div>;
        })}</div>;
    } else {
      var statusColor = function (s) {
        if (s === 'correct') return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          icon: '✓'
        };
        if (s === 'incorrect') return {
          bg: 'bg-rose-100',
          text: 'text-rose-800',
          icon: '✗'
        };
        if (s === 'idk') return {
          bg: 'bg-sky-100',
          text: 'text-sky-800',
          icon: '🤔'
        };
        if (s === 'partially-correct') return {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          icon: '◐'
        };
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          icon: '·'
        };
      };
      body = <div className="space-y-2">{data.bars.map(function (bar) {
          var color = bar.total === 0 ? 'slate' : bar.percentCorrect >= 80 ? 'emerald' : bar.percentCorrect >= 50 ? 'amber' : 'rose';
          var pctCorrect = bar.total > 0 ? bar.correct / bar.total * 100 : 0;
          var pctIncorrect = bar.total > 0 ? bar.incorrect / bar.total * 100 : 0;
          var pctIdk = bar.total > 0 ? bar.idk / bar.total * 100 : 0;
          var pctSubmitted = bar.total > 0 ? bar.submitted / bar.total * 100 : 0;
          var qLabel = bar.questionText ? bar.questionText.slice(0, 70) + (bar.questionText.length > 70 ? '…' : '') : 'Question ' + (bar.questionIdx + 1);
          var canExpand = bar.total > 0;
          var isExpanded = !!expandedBars[bar.questionIdx];
          return <div key={bar.questionIdx} className="p-2 rounded bg-white border border-slate-200"><div className={'flex items-start gap-2 mb-1' + (canExpand ? ' cursor-pointer' : '')} onClick={canExpand ? function () {
              toggleBarExpanded(bar.questionIdx);
            } : undefined} role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : undefined} aria-expanded={canExpand ? isExpanded : undefined} aria-label={canExpand ? (isExpanded ? 'Collapse' : 'Expand') + ' question ' + (bar.questionIdx + 1) + ' student detail' : undefined} onKeyDown={canExpand ? function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleBarExpanded(bar.questionIdx);
              }
            } : undefined}>{canExpand && <span className="text-slate-600 hover:text-indigo-600 text-[10px] font-mono mt-0.5">{isExpanded ? '▼' : '▶'}</span>}<span className="text-xs text-slate-700 flex-1 min-w-0">{bar.questionIdx + 1 + '. ' + qLabel}</span>{bar.total > 0 && <span className={'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-100 text-' + color + '-800'}>{bar.percentCorrect + '%'}</span>}</div>{bar.total > 0 ? <div className="flex h-3 rounded overflow-hidden border border-slate-200">{pctCorrect > 0 && <div style={{
                width: pctCorrect + '%',
                backgroundColor: '#10b981'
              }} title={bar.correct + ' correct'} />}{pctIncorrect > 0 && <div style={{
                width: pctIncorrect + '%',
                backgroundColor: '#ef4444'
              }} title={bar.incorrect + ' incorrect'} />}{pctIdk > 0 && <div style={{
                width: pctIdk + '%',
                backgroundColor: '#0ea5e9'
              }} title={bar.idk + ' IDK'} />}{pctSubmitted > 0 && <div style={{
                width: pctSubmitted + '%',
                backgroundColor: '#94a3b8'
              }} title={bar.submitted + ' submitted (ungraded)'} />}</div> : <div className="h-3 rounded bg-slate-100 border border-slate-200" />}<div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600"><span>{bar.correct + ' ✓'}</span><span>{bar.incorrect + ' ✗'}</span>{bar.idk > 0 && <span className="text-sky-700">{bar.idk + ' 🤔'}</span>}{bar.submitted > 0 && <span className="text-slate-600">{bar.submitted + ' submitted'}</span>}<span className="ml-auto text-slate-600">{bar.total + ' / ' + data.totalStudents}</span></div>{isExpanded && Array.isArray(bar.byStudent) && bar.byStudent.length > 0 && <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">{bar.byStudent.map(function (s) {
                var sc = statusColor(s.status);
                return <div key={s.uid} className="flex items-start gap-2 text-xs"><span className={'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ' + sc.bg + ' ' + sc.text}>{sc.icon}</span><span className="flex-shrink-0 font-semibold text-slate-700 w-32 truncate">{s.displayName}</span><span className="flex-grow min-w-0 break-words text-slate-700">{s.answerSummary || <em className="text-slate-600">(no text)</em>}</span>{s.aiGraded && <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-indigo-100 text-indigo-800" title="AI-graded">✨</span>}{confidenceChip(s.confidence, s.status)}{s.aiFeedback && <span className="flex-shrink-0 italic text-[10px] text-indigo-800 truncate max-w-[12rem]" title={s.aiFeedback}>{'"' + s.aiFeedback.slice(0, 50) + (s.aiFeedback.length > 50 ? '…' : '') + '"'}</span>}</div>;
              })}</div>}</div>;
        })}</div>;
    }
    var explainerModalEl = explainerModal.open ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={t("a11y.concept_explainer")} onClick={function (e) {
      if (e.target === e.currentTarget) closeExplainer();
    }}><div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border-2 border-indigo-300"><div className="flex items-start justify-between gap-3 mb-3"><div><h4 className="font-black text-base text-slate-800"><span aria-hidden="true">🎓 </span>Explain to class</h4><p className="text-xs text-slate-600 mt-0.5">Concept the class missed:</p><p className="text-xs italic text-slate-700 mt-0.5">{'"' + (explainerModal.conceptText || '') + '"'}</p></div><button type="button" ref={explainerCloseBtnRef} onClick={closeExplainer} aria-label={t("a11y.close_concept_explainer")} className="flex-shrink-0 text-slate-600 hover:text-slate-700 text-xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded">×</button></div>{explainerModal.loading ? <div className="p-4 text-center text-sm text-slate-600"><span className="inline-block animate-pulse">✨ Generating explainer…</span></div> : explainerModal.error ? <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">{explainerModal.error}</div> : <div className="p-3 rounded bg-indigo-50 border border-indigo-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{explainerModal.text}</div>}<div className="flex items-center gap-2 mt-4 flex-wrap"><button type="button" onClick={function () {
            runExplainerCall(explainerModal.conceptText);
          }} disabled={explainerModal.loading} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">↻ Regenerate</button>{!explainerModal.loading && !explainerModal.error && <button type="button" onClick={copyExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100">📋 Copy</button>}{!explainerModal.loading && !explainerModal.error && typeof p.callTTS === 'function' && <button type="button" onClick={playExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100" title="Play explainer aloud">🔊 Play aloud</button>}{!explainerModal.loading && !explainerModal.error && p.activeSessionCode && <button type="button" onClick={pushExplainerToStudents} disabled={pushState.pushing} className={'text-xs font-bold px-3 py-1.5 rounded ' + (pushState.pushed ? 'bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white') + ' disabled:opacity-50'} aria-label={pushState.pushed ? 'Explainer pushed to all students' : 'Push this explainer to every student\'s screen'} data-help-key="quiz_push_to_students_btn" title="Send this explainer to every student's screen now">{pushState.pushing ? 'Pushing…' : pushState.pushed ? <><span aria-hidden="true">✓ </span>Pushed to students</> : <><span aria-hidden="true">📡 </span>Push to all students</>}</button>}{pushState.error && <span className="text-[10px] text-rose-700 italic" role="alert">{pushState.error}</span>}<button type="button" onClick={closeExplainer} className="ml-auto text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Close</button></div></div></div> : null;
    var reflectionsData = null;
    try {
      reflectionsData = aggsMod.aggregateReflections && aggsMod.aggregateReflections(quizState, generatedContent, roster);
    } catch (e) {
      reflectionsData = null;
    }
    var reflectionsExpandedState = React.useState(true);
    var reflectionsExpanded = reflectionsExpandedState[0];
    var setReflectionsExpanded = reflectionsExpandedState[1];
    var reflectionsEl = reflectionsData ? <div className="mt-4 pt-4 border-t-2 border-indigo-100"><button type="button" onClick={function () {
        setReflectionsExpanded(!reflectionsExpanded);
      }} aria-expanded={reflectionsExpanded} className="flex items-center gap-2 text-sm font-bold text-indigo-800 hover:text-indigo-900"><span className="text-xs font-mono">{reflectionsExpanded ? '▼' : '▶'}</span><span>{'✏️ Reflections (' + reflectionsData.totalReflections + ')'}</span></button>{reflectionsExpanded && <div className="mt-3 space-y-3">{reflectionsData.buckets.map(function (bucket) {
          return <div key={bucket.reflectionIdx} className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">{'Prompt ' + (bucket.reflectionIdx + 1)}</p><p className="text-sm italic text-slate-700 mb-2">{bucket.promptText}</p>{bucket.responses.length === 0 ? <p className="text-xs italic text-slate-600">No responses yet.</p> : <div className="space-y-2">{bucket.responses.map(function (r) {
                return <div key={r.uid} className="p-2 rounded bg-white border border-indigo-100"><p className="text-xs font-bold text-slate-700 mb-0.5">{r.displayName}</p><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{r.text}</p></div>;
              })}</div>}</div>;
        })}</div>}</div> : null;
    return <div className="p-5 rounded-xl border-2 border-indigo-300 bg-white mb-4 shadow-sm" role="region" aria-label={t("a11y.live_results_dashboard")}>{header}{body}{reflectionsEl}{explainerModalEl}</div>;
  }
  function FreeformItemsBlock(p) {
    var allQuestions = Array.isArray(p.questions) ? p.questions : [];
    var freeform = allQuestions.map(function (q, idx) {
      return {
        q: q,
        idx: idx
      };
    }).filter(function (entry) {
      return entry.q && (entry.q.type === 'fill-blank' || entry.q.type === 'short-answer' || entry.q.type === 'self-explanation' || entry.q.type === 'sequence-sense' || entry.q.type === 'relation-mismatch');
    });
    if (freeform.length === 0) return null;
    return <div className="space-y-4 mt-6"><h4 className="font-bold text-slate-700 flex items-center gap-2 text-base"><span aria-hidden="true">✏️</span> Open-Response Items</h4><p className="text-xs text-slate-600 mb-2">Type your answer and click "Grade my answer" — an AI will give you immediate feedback.</p>{freeform.map(function (entry) {
        if (entry.q.type === 'sequence-sense') {
          return <SequenceSenseCard key={entry.idx} q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
        }
        if (entry.q.type === 'relation-mismatch') {
          return <RelationMismatchCard key={entry.idx} q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
        }
        return <FreeformItemCard key={entry.idx} q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} QuizAIHelpers={p.QuizAIHelpers} modeStrategy={p.modeStrategy} onSubmitLiveAnswer={p.onSubmitLiveAnswer} />;
      })}</div>;
  }
  function FreeformItemCard(p) {
    var q = p.q;
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
    var responseState = React.useState('');
    var response = responseState[0];
    var setResponse = responseState[1];
    var gradeState = React.useState({
      status: null,
      feedback: '',
      loading: false
    });
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    var confidenceState = React.useState(null);
    var confidence = confidenceState[0];
    var setConfidence = confidenceState[1];
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    function emitLiveAnswer(extraConfidence) {
      if (typeof p.onSubmitLiveAnswer !== 'function' || typeof p.questionIdx !== 'number') return;
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: q.type || 'short-answer',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            text: response
          },
          confidence: typeof extraConfidence !== 'undefined' ? extraConfidence : confidence || null,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
    function submitGrade() {
      if (!response || !response.trim()) return;
      emitLiveAnswer();
      if (!p.QuizAIHelpers) {
        setGrade({
          status: 'error',
          feedback: 'Grader unavailable: QuizAIHelpers not loaded.',
          loading: false
        });
        return;
      }
      setGrade({
        status: null,
        feedback: '',
        loading: true
      });
      var graderArgs = {
        callGemini: p.callGemini,
        gradeLevel: p.gradeLevel
      };
      var promise;
      if (q.type === 'fill-blank') {
        graderArgs.contextSentence = q.question;
        graderArgs.expectedFill = q.expectedFill || '';
        graderArgs.acceptableAlternatives = q.acceptableAlternatives || [];
        graderArgs.studentFill = response;
        promise = p.QuizAIHelpers.gradeFillBlank(graderArgs);
      } else if (q.type === 'self-explanation') {
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
        setGrade({
          status: result.status || 'unclear',
          feedback: result.feedback || '',
          loading: false
        });
      }).catch(function (err) {
        setGrade({
          status: 'error',
          feedback: err && err.message ? err.message : 'Grader failed.',
          loading: false
        });
      });
    }
    function markIDK() {
      setGrade({
        status: 'idk',
        feedback: 'No worries — here\'s a quick explanation.',
        loading: false
      });
      requestExplainer();
    }
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable: callGemini not provided.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = q.type === 'fill-blank' ? q.expectedFill || q.question || '' : q.type === 'self-explanation' ? q.question || '' : q.question || '';
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept so they can answer the question. Concept or question: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    var statusColor = grade.status === 'correct' ? 'emerald' : grade.status === 'partially-correct' ? 'amber' : grade.status === 'incorrect' ? 'rose' : grade.status === 'error' ? 'rose' : grade.status === 'idk' ? 'sky' : 'slate';
    var statusLabel = grade.status === 'correct' ? '✓ Correct' : grade.status === 'partially-correct' ? '~ Close' : grade.status === 'incorrect' ? '✗ Not yet' : grade.status === 'unclear' ? '? Unclear' : grade.status === 'error' ? '! Error' : grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : '';
    var typeLabel = q.type === 'fill-blank' ? 'Fill-in-the-blank' : q.type === 'self-explanation' ? 'Self-explanation' : 'Short answer';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">{typeLabel}</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || ''}</p></div></div>{q.type === 'fill-blank' ? <input type="text" value={response} onChange={function (ev) {
        setResponse(ev.target.value);
      }} onKeyDown={function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitGrade();
        }
      }} placeholder="Type the missing word or phrase..." disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk'} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" aria-label={t("a11y.fill_in_blank")} /> : <textarea value={response} onChange={function (ev) {
        setResponse(ev.target.value);
      }} placeholder={q.type === 'self-explanation' ? 'Explain the concept in your own words (3-5 sentences)...' : 'Type your 1-2 sentence response...'} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk'} rows={q.type === 'self-explanation' ? 5 : 3} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 resize-y" aria-label={typeLabel + ' response'} />}<div className="flex items-center justify-between gap-2 mt-2 flex-wrap"><div className="flex items-center gap-2 flex-wrap"><button type="button" onClick={submitGrade} disabled={!response.trim() || grade.loading || grade.status === 'correct' || grade.status === 'idk'} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{grade.loading ? 'Grading…' : grade.status === 'correct' || grade.status === 'idk' ? '' : grade.status ? 'Re-check' : 'Grade my answer'}</button>{allowIDK && !grade.status && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors" aria-label="I don't know — skip without penalty" title="Skip — no penalty. The AI will explain the concept."><span aria-hidden="true">🤔 </span>I don't know</button>}</div>{grade.status && grade.status !== 'correct' && grade.status !== 'idk' && <button type="button" onClick={function () {
          setGrade({
            status: null,
            feedback: '',
            loading: false
          });
          setResponse('');
          setExplainer({
            open: false,
            loading: false,
            text: '',
            error: ''
          });
        }} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">Try again</button>}</div>{grade.status && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-1 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{statusLabel}</span>{aiExplainerEnabled && grade.status !== 'correct' && grade.status !== 'idk' && !explainer.open && <button type="button" onClick={requestExplainer} className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors" title="Get a quick AI explanation of this concept">🤖 Explain this</button>}</div>{grade.feedback && <p className={'text-sm text-' + statusColor + '-900 mb-2'}>{grade.feedback}</p>}{explainer.open && <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
            p.callTTS(explainer.text);
          }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>}{allowConfidence && grade.status && grade.status !== 'idk' && <div className="mt-2 flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">How sure were you?</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: 'I knew this',
            guessed: 'I guessed',
            'no-idea': 'No idea'
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" onClick={function () {
            setConfidence(lvl);
            emitLiveAnswer(lvl);
          }} className={'px-2 py-0.5 rounded border transition-colors ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
  }
  function QuizView(props) {
    var t = props.t;
    var isTeacherMode = props.isTeacherMode;
    var isParentMode = props.isParentMode;
    var isIndependentMode = props.isIndependentMode;
    var activeSessionCode = props.activeSessionCode;
    var sessionData = props.sessionData;
    var onSubmitLiveAnswer = activeSessionCode && typeof props.onSubmitLiveAnswer === 'function' ? props.onSubmitLiveAnswer : null;
    var mcqAnswersState = React.useState({});
    var studentMcqAnswers = mcqAnswersState[0];
    var setStudentMcqAnswers = mcqAnswersState[1];
    var mcqConfidenceState = React.useState({});
    var studentMcqConfidence = mcqConfidenceState[0];
    var setStudentMcqConfidence = mcqConfidenceState[1];
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
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              optionIdx: optIdx,
              optionText: optText
            },
            confidence: studentMcqConfidence[qIdx] || null,
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    function setMcqConfidence(qIdx, confidenceValue, q) {
      setStudentMcqConfidence(function (prev) {
        var next = Object.assign({}, prev);
        next[qIdx] = confidenceValue;
        return next;
      });
      var prevOptIdx = studentMcqAnswers[qIdx];
      if (typeof prevOptIdx !== 'number' || typeof onSubmitLiveAnswer !== 'function') return;
      try {
        onSubmitLiveAnswer({
          questionIdx: qIdx,
          itemType: 'mcq',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            optionIdx: prevOptIdx,
            optionText: q.options[prevOptIdx]
          },
          confidence: confidenceValue,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
    var reflectionAnswersState = React.useState({});
    var reflectionAnswers = reflectionAnswersState[0];
    var setReflectionAnswers = reflectionAnswersState[1];
    function setReflectionDraft(rIdx, text) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = Object.assign({}, next[rIdx] || {}, {
          draft: text
        });
        return next;
      });
    }
    function submitReflection(rIdx) {
      var entry = reflectionAnswers[rIdx] || {};
      var text = (entry.draft || '').trim();
      if (!text) return;
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = {
          draft: text,
          submitted: true,
          submittedText: text
        };
        return next;
      });
      if (typeof onSubmitLiveAnswer !== 'function') return;
      try {
        onSubmitLiveAnswer({
          questionIdx: 'r' + rIdx,
          itemType: 'reflection',
          conceptLabel: '',
          answer: {
            text: text
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
    function reopenReflection(rIdx) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = Object.assign({}, next[rIdx] || {}, {
          submitted: false
        });
        return next;
      });
    }
    var quizImageRefineInputsState = React.useState({});
    var quizImageRefineInputs = quizImageRefineInputsState[0];
    var setQuizImageRefineInputs = quizImageRefineInputsState[1];
    var isRefiningQuizImageState = React.useState({});
    var isRefiningQuizImage = isRefiningQuizImageState[0];
    var setIsRefiningQuizImage = isRefiningQuizImageState[1];
    var refineOpenState = React.useState({});
    var refineOpen = refineOpenState[0];
    var setRefineOpen = refineOpenState[1];
    function refineKey(qIdx, target, optIdx) {
      return target === 'question' ? qIdx + ':question' : qIdx + ':o' + optIdx;
    }
    function toggleRefinePanel(key) {
      setRefineOpen(function (prev) {
        var next = Object.assign({}, prev);
        if (next[key]) delete next[key];else next[key] = true;
        return next;
      });
    }
    async function refineQuizImage(qIdx, target, optIdx, instructionOverride) {
      var key = refineKey(qIdx, target, optIdx);
      var instruction = typeof instructionOverride === 'string' ? instructionOverride : (quizImageRefineInputs[key] || '').trim();
      if (!instruction) return;
      var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
      if (!q) return;
      var currentUrl = target === 'question' ? q.imageUrl : Array.isArray(q.optionImageUrls) ? q.optionImageUrls[optIdx] : null;
      if (!currentUrl || typeof currentUrl !== 'string' || currentUrl.indexOf(',') === -1) {
        if (typeof addToast === 'function') addToast(t('toasts.image_refine_yet'), 'error');
        return;
      }
      if (typeof callGeminiImageEdit !== 'function') {
        if (typeof addToast === 'function') addToast(t('toasts.image_edit_unavailable_callgeminiimageedit_provide'), 'error');
        return;
      }
      setIsRefiningQuizImage(function (prev) {
        var next = Object.assign({}, prev);
        next[key] = true;
        return next;
      });
      try {
        var rawBase64 = currentUrl.split(',')[1];
        var grade = props.gradeLevel || 'middle school';
        var styleHint = generatedContent && generatedContent.data && generatedContent.data.imageStyle || '';
        var styleClause = styleHint ? ' Required visual style: ' + styleHint + '.' : '';
        var prompt = 'Edit this educational quiz illustration. Maintain the same general visual style (colors, line weight, complexity).' + styleClause + ' Audience: ' + grade + ' level students. Edit instruction: "' + instruction + '"';
        var refinedUrl = await callGeminiImageEdit(prompt, rawBase64);
        if (typeof handleQuizImageRefine === 'function') {
          handleQuizImageRefine(qIdx, target, optIdx, refinedUrl);
        }
        setQuizImageRefineInputs(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        setRefineOpen(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        if (typeof addToast === 'function') addToast(t('toasts.image_refined'), 'success');
      } catch (err) {
        if (typeof addToast === 'function') addToast(err && err.message || 'Refine failed — try again.', 'error');
      } finally {
        setIsRefiningQuizImage(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      }
    }
    var isImprovingDistractorState = React.useState({});
    var isImprovingDistractor = isImprovingDistractorState[0];
    var setIsImprovingDistractor = isImprovingDistractorState[1];
    async function improveDistractor(qIdx, optIdx, currentDistractor, weakReason) {
      var key = qIdx + ':' + optIdx;
      if (isImprovingDistractor[key]) return;
      if (typeof props.callGemini !== 'function' || typeof handleQuizChange !== 'function') return;
      var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
      if (!q) return;
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        next[key] = true;
        return next;
      });
      try {
        var grade = props.gradeLevel || 'middle school';
        var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + (weakReason || 'does not encode a specific misconception') + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
        var raw = await props.callGemini(prompt, false);
        var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
        if (!newText) throw new Error('Empty rewrite');
        handleQuizChange(qIdx, 'option', newText, optIdx);
        if (typeof addToast === 'function') addToast(t('toasts.distractor_rewritten'), 'success');
      } catch (err) {
        if (typeof addToast === 'function') addToast(err && err.message || 'Rewrite failed.', 'error');
      } finally {
        setIsImprovingDistractor(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      }
    }
    var isBulkImprovingState = React.useState(false);
    var isBulkImproving = isBulkImprovingState[0];
    var setIsBulkImproving = isBulkImprovingState[1];
    async function bulkImproveDistractors() {
      if (isBulkImproving) return;
      if (!generatedContent || !generatedContent.data || !Array.isArray(generatedContent.data.questions)) return;
      if (typeof props.callGemini !== 'function' || typeof handleQuizBulkOptionChange !== 'function') {
        if (typeof addToast === 'function') addToast(t('toasts.bulk_improve_unavailable'), 'error');
        return;
      }
      var tasks = [];
      generatedContent.data.questions.forEach(function (q, qIdx) {
        if (!q || q.type && q.type !== 'mcq') return;
        if (!Array.isArray(q.distractorQuality) || !Array.isArray(q.options)) return;
        q.distractorQuality.forEach(function (dq) {
          if (!dq || dq.encodesMisconception !== false) return;
          var optIdx = q.options.indexOf(dq.distractor);
          if (optIdx < 0) return;
          if (q.options[optIdx] === q.correctAnswer) return;
          tasks.push({
            qIdx: qIdx,
            optIdx: optIdx,
            currentDistractor: dq.distractor,
            reason: dq.reason || ''
          });
        });
      });
      if (tasks.length === 0) {
        if (typeof addToast === 'function') addToast(t('toasts.weak_distractors_improve'), 'info');
        return;
      }
      setIsBulkImproving(true);
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        tasks.forEach(function (t) {
          next[t.qIdx + ':' + t.optIdx] = true;
        });
        return next;
      });
      if (typeof addToast === 'function') addToast(t('toasts.rewriting') + tasks.length + ' weak distractor' + (tasks.length === 1 ? '' : 's') + '…', 'info');
      var grade = props.gradeLevel || 'middle school';
      var results = await Promise.all(tasks.map(function (task) {
        var q = generatedContent.data.questions[task.qIdx];
        var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + task.currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + task.reason + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
        return Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
          var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
          newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
          if (!newText) return {
            ok: false,
            task: task
          };
          return {
            ok: true,
            task: task,
            newText: newText
          };
        }).catch(function () {
          return {
            ok: false,
            task: task
          };
        });
      }));
      var updates = results.filter(function (r) {
        return r.ok;
      }).map(function (r) {
        return {
          qIdx: r.task.qIdx,
          optIdx: r.task.optIdx,
          newText: r.newText
        };
      });
      if (updates.length > 0) {
        handleQuizBulkOptionChange(updates);
      }
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        tasks.forEach(function (t) {
          delete next[t.qIdx + ':' + t.optIdx];
        });
        return next;
      });
      setIsBulkImproving(false);
      var failures = tasks.length - updates.length;
      if (typeof addToast === 'function') {
        if (failures === 0) addToast(t('toasts.rewrote') + updates.length + ' distractor' + (updates.length === 1 ? '' : 's') + '.', 'success');else addToast(t('toasts.rewrote') + updates.length + ' / ' + tasks.length + ' (' + failures + ' failed — try again).', failures > updates.length ? 'error' : 'success');
      }
    }
    function renderImageRefineOverlay(qIdx, target, optIdx, isCompact) {
      if (!isEditingQuiz) return null;
      var key = refineKey(qIdx, target, optIdx);
      var isOpen = !!refineOpen[key];
      var isLoading = !!isRefiningQuizImage[key];
      var inputValue = quizImageRefineInputs[key] || '';
      var btnSize = isCompact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
      return <><button type="button" onClick={function (e) {
          e.stopPropagation();
          toggleRefinePanel(key);
        }} disabled={isLoading} className={'absolute top-1 right-1 ' + btnSize + ' rounded-full bg-white/90 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-700 shadow-sm flex items-center justify-center transition-colors disabled:opacity-50'} title={isLoading ? 'Refining…' : 'Refine this image'} aria-label={t("a11y.refine_image")} data-help-key="quiz_image_refine_btn">{isLoading ? '⋯' : '✏️'}</button>{isOpen && <div className="mt-2 p-2 rounded border border-indigo-200 bg-indigo-50 text-xs"><div className="flex items-center gap-2 mb-1.5 flex-wrap"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx, 'Remove all text and labels from this image. Keep everything else identical.');
            }} disabled={isLoading} className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50" aria-label="Remove text from this image" title="One-click: remove text from this image"><span aria-hidden="true">🧹 </span>Remove text</button></div><textarea value={inputValue} onChange={function (e) {
            var v = e.target.value;
            setQuizImageRefineInputs(function (prev) {
              var next = Object.assign({}, prev);
              next[key] = v;
              return next;
            });
          }} onKeyDown={function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              refineQuizImage(qIdx, target, optIdx);
            }
          }} placeholder={'Describe how to refine this image (e.g. "make the background pure white", "add a clearer label")…'} aria-label="Image refinement instructions" rows={2} className="w-full text-xs p-1.5 rounded border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none resize-y" disabled={isLoading} /><div className="flex items-center gap-2 mt-1.5"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx);
            }} disabled={isLoading || !inputValue.trim()} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Refining…' : 'Submit'}</button><button type="button" onClick={function () {
              toggleRefinePanel(key);
            }} disabled={isLoading} className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancel</button></div></div>}</>;
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
    var setReviewGameState = props.setReviewGameState;
    var setSoundEnabled = props.setSoundEnabled;
    var setGameTeams = props.setGameTeams;
    var setEscapeRoomState = props.setEscapeRoomState;
    var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
    var setConfirmDialog = props.setConfirmDialog;
    var handleStartLiveSession = props.handleStartLiveSession;
    var handleToggleInteractive = props.handleToggleInteractive;
    var handleEndLiveSession = props.handleEndLiveSession;
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
    var handleQuizImageRefine = props.handleQuizImageRefine;
    var handleQuizBulkOptionChange = props.handleQuizBulkOptionChange;
    var handleReflectionChange = props.handleReflectionChange;
    var handleFactCheck = props.handleFactCheck;
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
    var handleCreateGroup = props.handleCreateGroup;
    var handleAssignStudent = props.handleAssignStudent;
    var handleSetGroupResource = props.handleSetGroupResource;
    var handleSetGroupLanguage = props.handleSetGroupLanguage;
    var handleSetGroupProfile = props.handleSetGroupProfile;
    var handleDeleteGroup = props.handleDeleteGroup;
    var isPushingResource = props.isPushingResource;
    var callImagen = props.callImagen;
    var callGeminiImageEdit = props.callGeminiImageEdit;
    var getRows = props.getRows;
    var formatInlineText = props.formatInlineText;
    var renderFormattedText = props.renderFormattedText;
    var getReviewCategories = props.getReviewCategories;
    var playSound = props.playSound;
    var addToast = props.addToast;
    var ErrorBoundary = props.ErrorBoundary;
    var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
    var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
    var Stamp = props.Stamp;
    var ConfettiExplosion = props.ConfettiExplosion;
    var _quizMode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
    var _qmStrategiesMod = window.AlloModules && window.AlloModules.QuizModeStrategies || null;
    var _modeStrat = _qmStrategiesMod ? _qmStrategiesMod.getStrategy(_quizMode) : null;
    var _aiExplainerEnabled = !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail);
    var _showModeBanner = _quizMode !== 'exit-ticket' && !!_modeStrat;
    var _explainerState = React.useState({
      topic: '',
      loading: false,
      response: '',
      error: ''
    });
    var explainerData = _explainerState[0];
    var setExplainerData = _explainerState[1];
    var _explainerInput = React.useState('');
    var explainerInput = _explainerInput[0];
    var setExplainerInput = _explainerInput[1];
    function explainConcept(topic) {
      if (!topic || !topic.trim()) return;
      if (typeof props.callGemini !== 'function') {
        setExplainerData({
          topic: topic,
          loading: false,
          response: '',
          error: 'Explainer unavailable: callGemini not provided.'
        });
        return;
      }
      setExplainerData({
        topic: topic,
        loading: true,
        response: '',
        error: ''
      });
      var grade = props.gradeLevel || 'middle school';
      var prompt = 'You are a patient teacher explaining a concept to a ' + grade + ' student who needs a quick refresher. Explain "' + topic + '" in 60-90 words. Use simple, concrete language. Use an analogy or example if it helps. End with one sentence checking the student\'s understanding (e.g., "Does that make sense?"). Plain text only — no headings, no bullet points.';
      Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainerData({
          topic: topic,
          loading: false,
          response: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainerData({
          topic: topic,
          loading: false,
          response: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    var _smartSkips = generatedContent && generatedContent.data && Array.isArray(generatedContent.data.smartSkips) ? generatedContent.data.smartSkips : [];
    var _pushedExplainer = sessionData && sessionData.quizState && sessionData.quizState.classExplainer;
    var dismissedExplainerTsState = React.useState(0);
    var dismissedExplainerTs = dismissedExplainerTsState[0];
    var setDismissedExplainerTs = dismissedExplainerTsState[1];
    var _showClassExplainer = !!_pushedExplainer && _pushedExplainer.text && _pushedExplainer.ts !== dismissedExplainerTs && !isEditingQuiz && !isPresentationMode && !isTeacherMode;
    var classExplainerBanner = _showClassExplainer ? <div key="class-explainer-banner" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 mb-2 shadow-sm animate-in fade-in slide-in-from-top-2" role="region" aria-label="Teacher explanation"><div className="flex items-start gap-3"><span className="text-2xl flex-shrink-0" aria-hidden="true">📡</span><div className="flex-grow min-w-0"><div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 mb-1">From your teacher · pause and read</div>{_pushedExplainer.conceptText && <p className="text-xs italic text-amber-700 mb-1">{'"' + _pushedExplainer.conceptText + '"'}</p>}<p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{_pushedExplainer.text}</p><div className="flex items-center gap-2 mt-3 flex-wrap">{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
              try {
                props.callTTS(_pushedExplainer.text);
              } catch (e) {}
            }} className="text-xs font-bold px-3 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}<button type="button" onClick={function () {
              setDismissedExplainerTs(_pushedExplainer.ts);
            }} className="text-xs font-bold px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">✓ Got it</button></div></div></div></div> : null;
    var modeBanner = _showModeBanner ? <div key="mode-banner" className={'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50')} role="region" aria-label={_modeStrat.label}><div className="flex items-center gap-2 mb-1"><span className="text-xl" aria-hidden="true">{_modeStrat.icon}</span><h3 className={'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.label}</h3><span className={'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900')}>{_quizMode}</span></div>{_modeStrat.render.intro && <p className={'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.render.intro}</p>}{_smartSkips.length > 0 && <p className={'text-xs italic mt-2 ' + (_quizMode === 'pre-check' ? 'text-amber-800' : _quizMode === 'review' ? 'text-purple-800' : 'text-sky-800')}>{'ℹ️ Skipped ' + _smartSkips.join(' and ') + ' — using the dedicated tool instead avoids redundancy.'}</p>}{isTeacherMode && generatedContent && generatedContent.data && generatedContent.data.distractorReview && <div className="mt-2 flex items-center gap-2 flex-wrap" data-help-key="quiz_distractor_review_summary"><p className={'text-xs italic ' + (_quizMode === 'pre-check' ? 'text-amber-800' : 'text-sky-800')} title={(generatedContent.data.distractorReview.weakItems || []).length > 0 ? 'Weak items: Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
          return i + 1;
        }).join(', Q') : 'All MCQs have at least half their distractors encoding a known misconception'}><span aria-hidden="true">🎯 </span>{'Distractor review: ' + (generatedContent.data.distractorReview.misconceptionCount || 0) + ' of ' + (generatedContent.data.distractorReview.totalDistractors || 0) + ' distractors encode a misconception (' + (generatedContent.data.distractorReview.quality != null ? generatedContent.data.distractorReview.quality + '%' : '—') + ')' + ((generatedContent.data.distractorReview.weakItems || []).length > 0 ? ' — review Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
            return i + 1;
          }).join(', Q') + ' before deploying' : ' — looks solid')}</p>{isEditingQuiz && function () {
          var weakCount = (Array.isArray(generatedContent.data.questions) ? generatedContent.data.questions : []).reduce(function (sum, q) {
            if (!q || q.type && q.type !== 'mcq') return sum;
            if (!Array.isArray(q.distractorQuality)) return sum;
            return sum + q.distractorQuality.filter(function (dq) {
              return dq && dq.encodesMisconception === false && Array.isArray(q.options) && q.options.indexOf(dq.distractor) >= 0 && q.options[q.options.indexOf(dq.distractor)] !== q.correctAnswer;
            }).length;
          }, 0);
          if (weakCount === 0) return null;
          return <button type="button" onClick={bulkImproveDistractors} disabled={isBulkImproving} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors" aria-label={isBulkImproving ? 'Rewriting ' + weakCount + ' weak distractors' : 'Rewrite all ' + weakCount + ' flagged distractors in one batch'} data-help-key="quiz_bulk_improve_btn" title={'Rewrite all ' + weakCount + ' flagged distractor' + (weakCount === 1 ? '' : 's') + ' in one batch'}><span aria-hidden="true">✨ </span>{isBulkImproving ? 'Rewriting ' + weakCount + '…' : 'Improve all ' + weakCount}</button>;
        }()}</div>}</div> : null;
    var explainerPanel = _aiExplainerEnabled ? <div key="ai-explainer" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6" role="region" aria-label="AI concept explainer"><div className="flex items-center gap-2 mb-2"><span className="text-lg" aria-hidden="true">🤖</span><h4 className="font-bold text-sm text-indigo-900">Don't know a concept? Ask for a quick explainer.</h4></div><p className="text-xs text-indigo-800 mb-2">Type any concept from the quiz (or any prior knowledge you're unsure about). The AI will give you a 60-90 word explanation tuned to your grade level.</p><div className="flex items-stretch gap-2"><input type="text" value={explainerInput} onChange={function (ev) {
          setExplainerInput(ev.target.value);
        }} onKeyDown={function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            explainConcept(explainerInput);
          }
        }} placeholder={_quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"'} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" aria-label="Concept to explain" /><button type="button" onClick={function () {
          explainConcept(explainerInput);
        }} disabled={!explainerInput.trim() || explainerData.loading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{explainerData.loading ? 'Explaining…' : 'Explain'}</button></div>{explainerData.response && <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">{explainerData.topic}</div><p className="text-sm text-slate-800 leading-relaxed">{explainerData.response}</p>{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
          props.callTTS(explainerData.response);
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{explainerData.error && <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">{explainerData.error}</div>}</div> : null;
    return <div className="space-y-6">{classExplainerBanner}{modeBanner}{explainerPanel}<div className="bg-teal-50 p-4 rounded-lg border border-teal-100 mb-6 flex justify-between items-center flex-wrap gap-3"><p className="text-sm text-teal-800 flex-grow"><strong>UDL Goal:</strong> Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction.</p><div className="flex items-center gap-2 flex-wrap">{isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && <><button aria-label={t('common.connect')} onClick={handleStartLiveSession} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200" title={t('quiz.launch_live_tooltip')}><Wifi size={14} /> {t('quiz.launch_live_btn')}</button><div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in fade-in duration-300"><Users size={12} className="text-orange-700" /><span className="text-xs font-black text-orange-700">{Object.keys(sessionData?.roster || {}).length} {t('quiz.lobby_waiting') || "Ready"}</span></div><button aria-label={t('common.locked')} onClick={handleToggleInteractive} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`} title={t('session.toggle_interactive_title')}>{sessionData?.forceStatic ? <Lock size={12} /> : <Unlock size={12} />}{sessionData?.forceStatic ? t('session.static_only') : t('session.interactive')}</button></>}<button aria-label={t('common.confirm')} onClick={handleToggleIsPresentationMode} disabled={isReviewGame || isTeacherMode && sessionData?.quizState?.isActive} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`} title={t('quiz.presentation')}>{isPresentationMode ? <CheckCircle size={14} /> : <MonitorPlay size={14} />}{isPresentationMode ? t('common.close') : t('quiz.presentation')}</button><button onClick={handleToggleIsReviewGame} disabled={isPresentationMode} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isReviewGame ? 'bg-yellow-500 text-indigo-900 hover:bg-yellow-600 ring-2 ring-yellow-200' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'}`} title={t('quiz.review_game')} aria-label={t('quiz.review_game')}>{isReviewGame ? <XCircle size={14} /> : <Gamepad2 size={14} />}{isReviewGame ? t('common.close') : t('quiz.review_game')}</button><button onClick={() => {
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
          }} disabled={isPresentationMode || isReviewGame} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`} title={isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title')} aria-label={t('escape_room.title')}>{escapeRoomState.isActive ? <XCircle size={14} /> : <DoorOpen size={14} />}{escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')}</button>{isTeacherMode && !isIndependentMode && <button onClick={handleExportQTI} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-teal-600 border border-teal-200 hover:bg-teal-50 transition-all shadow-sm" title={t('export_menu.qti')} aria-label={t('export_menu.qti')}><FolderDown size={14} /> {t('quiz.export_qti_btn')}</button>}{!isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && <>{!isIndependentMode && !isParentMode && <button aria-label={t('common.toggle_edit_quiz')} onClick={handleToggleIsEditingQuiz} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`}>{isEditingQuiz ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingQuiz ? t('common.done_editing') : t('quiz.edit')}</button>}<button onClick={handleToggleShowQuizAnswers} className="text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors">{showQuizAnswers ? <CheckSquare size={14} className="fill-current" /> : <CheckSquare size={14} />}{showQuizAnswers ? isIndependentMode ? t('quiz.hide_answers_student') : isParentMode ? 'Hide Scores' : t('quiz.hide_key') : isIndependentMode ? t('quiz.check_answers') : isParentMode ? 'View Scores' : t('quiz.show_key')}</button></>}</div></div>{isTeacherMode && activeSessionCode && sessionData?.escapeRoomState?.isActive && <ErrorBoundary fallbackMessage="Escape room controls encountered an error. Refreshing..."><EscapeRoomTeacherControls sessionData={sessionData} activeSessionCode={activeSessionCode} appId={appId} t={t} /></ErrorBoundary>}{isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive ? <div className="flex flex-col gap-4"><LiveResultsDashboard sessionData={sessionData} generatedContent={generatedContent} appId={appId} activeSessionCode={activeSessionCode} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} /><ErrorBoundary fallbackMessage="Live quiz controls encountered an error. Refreshing..."><TeacherLiveQuizControls sessionData={sessionData} generatedContent={generatedContent} activeSessionCode={activeSessionCode} appId={appId} onGenerateImage={callImagen} onRefineImage={callGeminiImageEdit} onCreateGroup={handleCreateGroup} onAssignStudent={handleAssignStudent} onSetGroupResource={handleSetGroupResource} isPushingResource={isPushingResource} onSetGroupLanguage={handleSetGroupLanguage} onSetGroupProfile={handleSetGroupProfile} onDeleteGroup={handleDeleteGroup} history={props.history} /></ErrorBoundary><div className="flex justify-end px-4"><button onClick={handleEndLiveSession} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"><XCircle size={14} /> {t('session.action_end')}</button></div></div> : isReviewGame ? <div className="animate-in fade-in duration-500"><div className="bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-yellow-500 relative overflow-hidden min-h-[700px] flex flex-col"><div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" /><div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(59,130,246,0.2),transparent)]" /></div><div className="flex justify-between items-start mb-6 relative z-10"><div className="text-left"><h2 className="text-3xl font-black text-yellow-700 tracking-widest uppercase drop-shadow-md flex items-center gap-3"><Gamepad2 size={32} /> {t('review_game.title')}</h2><p className="text-slate-600 text-sm mt-1 font-medium">{t('review_game.subtitle')}</p></div><div className="flex gap-2"><button aria-label={t('common.volume')} onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSound('click');
              }} className={`p-2 rounded-full transition-colors ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-600'}`} title={t('review_game.toggle_sound')}>{soundEnabled ? <Volume2 size={20} /> : <MicOff size={20} />}</button><button aria-label={t('common.regenerate_vocabulary')} onClick={() => {
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
              }} className="p-2 bg-slate-700 text-slate-600 rounded-full hover:bg-slate-600" title={t('review_game.reset')}><RefreshCw size={20} /></button></div></div><div className="flex flex-wrap gap-4 justify-center mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">{gameTeams.map(team => <div key={team.id} className={`${team.color} bg-opacity-20 border-2 border-opacity-50 border-${team.color.split('-')[1]}-400 rounded-lg p-3 min-w-[140px] flex flex-col items-center relative group`}><input aria-label={t('common.enter_team')} className="bg-transparent text-center font-bold text-white outline-none focus:ring-2 focus:ring-white/50 w-full mb-1" value={team.name} onChange={e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
                ...t,
                name: e.target.value
              } : t))} /><div className="text-3xl font-black text-white drop-shadow-md">{team.score}</div>{scoreAnimation.teamId === team.id && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-700 font-black text-xl animate-[ping_1s_ease-out_reverse] pointer-events-none z-20 whitespace-nowrap shadow-sm">+{scoreAnimation.points}</div>}<div className="flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"><button onClick={() => handleManualScore(team.id, -100)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">-</button><button onClick={() => handleManualScore(team.id, 100)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">+</button></div>{gameTeams.length > 1 && <button onClick={() => handleRemoveTeam(team.id)} className="absolute -top-2 -right-2 bg-slate-800 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all shadow-sm" aria-label={t('common.remove')}><X size={10} /></button>}</div>)}{gameTeams.length < 6 && <button aria-label={t('common.add')} onClick={handleAddTeam} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors"><Plus size={24} /><span className="text-xs font-bold mt-1">{t('review_game.add_team')}</span></button>}</div><div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto w-full flex-grow content-start relative z-10">{getReviewCategories().map((cat, cIdx) => {
              const CategoryIcon = cIdx === 0 ? Brain : cIdx === 1 ? Languages : Search;
              const iconColor = cIdx === 0 ? "text-yellow-400" : cIdx === 1 ? "text-green-400" : "text-blue-400";
              return <div key={cIdx} className="flex flex-col gap-4"><div className="bg-slate-800/80 backdrop-blur-sm text-white font-bold text-center py-4 rounded-lg border-b-4 border-blue-600 shadow-lg uppercase tracking-wider text-sm md:text-base flex flex-col items-center gap-1"><CategoryIcon size={20} className={iconColor} />{cat.name}</div>{cat.questions.map((q, qIdx) => {
                  const isClaimed = reviewGameState.claimed.has(q.originalIndex);
                  return <button key={qIdx} onClick={() => !isClaimed && handleReviewTileClick(q, q.points)} disabled={isClaimed} aria-label={`Category: ${cat.name}, ${q.points} Points${isClaimed ? ', Claimed' : ''}`} aria-disabled={isClaimed} className={`
                                                            h-24 rounded-lg font-black text-3xl shadow-lg transition-all duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-700 border-slate-800 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `}>{!isClaimed && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]" />}<span className="relative z-10 drop-shadow-md">{isClaimed ? '' : q.points}</span></button>;
                })}</div>;
            })}</div>{reviewGameState.activeQuestion && <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 animate-in zoom-in-95 duration-300"><div className="bg-blue-800 w-full max-w-4xl rounded-2xl border-4 border-yellow-500 shadow-2xl p-8 text-center relative flex flex-col max-h-full overflow-y-auto"><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-blue-900 font-black text-2xl px-6 py-2 rounded-full shadow-lg border-2 border-white">{reviewGameState.activeQuestion.points}</div><button aria-label={t('common.close')} onClick={() => closeReviewModal(false)} className="absolute top-4 right-4 text-blue-700 hover:text-white transition-colors"><X size={24} /></button><div className="mt-8 mb-8"><h3 className="text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm">{formatInlineText(reviewGameState.activeQuestion.question, false, true)}</h3>{reviewGameState.activeQuestion.question_en && <p className="text-blue-200 text-lg italic mt-4">{formatInlineText(reviewGameState.activeQuestion.question_en, false, true)}</p>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">{reviewGameState.activeQuestion.options.map((opt, oIdx) => <div key={oIdx} className={`
                                                            p-4 rounded-xl text-lg font-medium border-2 transition-all
                                                            ${reviewGameState.showAnswer ? opt === reviewGameState.activeQuestion.correctAnswer ? 'bg-green-700 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'bg-blue-900/50 border-blue-700 text-blue-300 opacity-50' : 'bg-blue-700 border-blue-500 text-white'}
                                                        `}><span className="inline-block w-8 font-bold opacity-50">{String.fromCharCode(65 + oIdx)}.</span> {formatInlineText(opt, false, true)}</div>)}</div><div className="flex flex-col items-center gap-6 mt-auto pt-4 border-t border-blue-700">{!reviewGameState.showAnswer ? <button aria-label={t('common.check')} onClick={() => {
                  setReviewGameState(prev => ({
                    ...prev,
                    showAnswer: true
                  }));
                  playSound('reveal');
                }} className="bg-yellow-500 text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors shadow-lg hover:shadow-yellow-500/20">{t('review_game.reveal_answer')}</button> : <div className="w-full animate-in fade-in slide-in-from-bottom-4"><p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-3">{t('review_game.who_correct')}</p><div className="flex flex-wrap justify-center gap-3">{gameTeams.map(team => <button aria-label={t('common.check')} key={team.id} onClick={() => handleAwardPoints(team.id, reviewGameState.activeQuestion.points)} className={`${team.color.replace('bg-', 'bg-')} hover:opacity-90 ${team.color.includes('yellow') ? 'text-indigo-900' : 'text-white'} px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all`}><CheckCircle2 size={16} /> {team.name}</button>)}<button onClick={() => {
                      playSound('incorrect');
                      closeReviewModal(true);
                    }} className="bg-slate-700 text-slate-600 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-colors">{t('review_game.no_points')}</button></div></div>}</div></div></div>}</div></div> : escapeRoomState.isActive ? window.AlloModules && window.AlloModules.EscapeRoomGameplay ? <window.AlloModules.EscapeRoomGameplay escapeRoomState={escapeRoomState} setEscapeRoomState={setEscapeRoomState} escapeTimeLeft={escapeTimeLeft} isEscapeTimerRunning={isEscapeTimerRunning} setIsEscapeTimerRunning={setIsEscapeTimerRunning} handleSetIsEscapeTimerRunningToTrue={() => setIsEscapeTimerRunning(true)} handlers={{
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
      }} t={t} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} playSound={playSound} globalPoints={globalPoints} inputText={inputText} /> : null : isPresentationMode ? <div className="space-y-8 animate-in fade-in duration-500"><div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"><h2 className="font-bold text-xl flex items-center gap-2"><MonitorPlay size={24} className="text-teal-700" /> {t('quiz.presentation_board')}</h2><button aria-label={t('common.reset_presentation')} onClick={resetPresentation} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors"><RefreshCw size={14} /> {t('quiz.reset_board')}</button></div>{generatedContent?.data.questions.map((q, i) => {
          if (!q || !Array.isArray(q.options)) return null;
          const pState = presentationState[i] || {};
          const isAnswered = !!pState.selectedOption;
          const isCorrectlyAnswered = pState.isCorrect;
          const showAnswer = pState.showAnswer;
          const showExplanation = pState.showExplanation;
          return <div key={i} className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all"><div className="flex gap-4 mb-6"><div className="bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">{i + 1}</div><div className="flex-grow"><h3 className="text-2xl font-bold text-slate-800 leading-tight">{formatInlineText(q.question, false)}</h3>{q.question_en && <p className="text-lg text-slate-600 italic mt-2">{formatInlineText(q.question_en, false)}</p>}</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-14">{q.options.map((opt, optIdx) => {
                const isSelected = pState.selectedOption === opt;
                const isCorrectOption = opt === q.correctAnswer;
                let btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                let icon = <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors" />;
                if (isSelected) {
                  if (pState.isCorrect) {
                    btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
                    icon = <CheckCircle2 size={24} className="text-green-600" />;
                  } else {
                    btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake";
                    icon = <XCircle size={24} className="text-red-500" />;
                  }
                } else if (showAnswer && isCorrectOption) {
                  btnClass = "bg-green-50 border-2 border-green-400 text-green-800 ring-2 ring-green-200 ring-offset-2";
                  icon = <CheckCircle2 size={24} className="text-green-500" />;
                } else if (showAnswer) {
                  btnClass = "opacity-50 bg-slate-50 border-slate-100 text-slate-600 cursor-not-allowed";
                }
                return <button aria-label={t('common.cancel')} key={optIdx} onClick={() => handlePresentationOptionClick(i, opt)} disabled={showAnswer} className={`p-5 rounded-xl text-left font-bold text-lg transition-all duration-200 flex items-center gap-4 group w-full ${btnClass}`}><div className="shrink-0">{icon}</div><div className="flex-grow">{formatInlineText(opt, false)}{q.options_en && q.options_en[optIdx] && <div className="text-sm font-normal opacity-80 italic mt-1">{formatInlineText(q.options_en[optIdx], false)}</div>}</div></button>;
              })}</div><div className="mt-6 ml-0 md:ml-14 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2"><div className="h-8 flex items-center relative">{isAnswered && !isCorrectlyAnswered && !showAnswer && <span className="text-red-500 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-left-2"><XCircle size={18} /> {t('quiz.presentation_try_again')}</span>}{isAnswered && isCorrectlyAnswered && <span className="text-green-600 font-bold flex items-center gap-2 animate-in zoom-in duration-300 overflow-visible"><Sparkles size={18} /> {t('quiz.presentation_correct')}<ConfettiExplosion /></span>}</div><div className="flex gap-2">{q.factCheck && <button aria-label={t('common.collapse')} onClick={() => togglePresentationExplanation(i)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`}>{showExplanation ? <ChevronUp size={14} /> : <Info size={14} />}{showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')}</button>}<button aria-label={t('common.show')} onClick={() => togglePresentationAnswer(i)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{showAnswer ? <Eye size={14} /> : <MousePointerClick size={14} />}{showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')}</button></div></div>{showExplanation && q.factCheck && <div className="mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in slide-in-from-top-2"><div className="prose prose-sm text-slate-700 max-w-none leading-relaxed">{renderFormattedText(q.factCheck)}</div></div>}</div>;
        })}<div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl mt-8"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare size={24} className="text-indigo-300" /> {t('quiz.presentation_discussion')}</h3><div className="space-y-8">{Array.isArray(generatedContent?.data.reflections) ? generatedContent?.data.reflections.map((ref, i) => <div key={i} className="bg-indigo-800/50 p-6 rounded-xl border border-indigo-700"><p className="text-2xl font-medium leading-relaxed text-center">"{typeof ref === 'string' ? ref : ref.text}"</p>{typeof ref === 'object' && ref.text_en && <p className="text-lg text-indigo-300 italic text-center mt-4">"{ref.text_en}"</p>}</div>) : <p className="text-2xl font-medium leading-relaxed text-center">"{generatedContent?.data.reflection}"</p>}</div></div></div> : <div className="space-y-6">{generatedContent?.data.questions.map((q, i) => q && q.type && q.type !== 'mcq' ? null : <div key={i} className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question">{q.imageUrl && <div className="relative mb-3"><img src={q.imageUrl} alt={q.question || 'Question image'} loading="lazy" className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50" />{renderImageRefineOverlay(i, 'question', null, false)}</div>}<div className="flex justify-between items-start mb-4 gap-4"><div className="flex-grow flex gap-3"><span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1.5">{i + 1}</span><div className="flex-grow space-y-2">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_question') || 'Edit question'} value={q.question} onChange={e => handleQuizChange(i, 'question', e.target.value)} className="w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all" rows={getRows(q.question)} />{q.question_en !== undefined && <textarea aria-label={t('quiz.edit_question_english') || 'Edit question English translation'} value={q.question_en || ''} onChange={e => handleQuizChange(i, 'question', e.target.value, null, true)} className="w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all" rows={getRows(q.question_en || '')} placeholder={t('common.placeholder_english_trans')} />}</> : <><p className="font-bold text-slate-800 px-2 py-1">{q.question}</p>{q.question_en && <p className="text-sm text-slate-600 italic px-2">{q.question_en}</p>}</>}</div></div>{isTeacherMode && <button aria-label={t('common.refresh')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`} title={t('quiz.verify_tooltip')}>{isFactChecking[i] ? <RefreshCw size={12} className="animate-spin" /> : q.factCheck ? <RefreshCw size={12} /> : <ShieldCheck size={12} />}{isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')}</button>}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">{q.options.map((opt, optIdx) => <div key={optIdx} role={!isEditingQuiz ? 'button' : undefined} tabIndex={!isEditingQuiz ? 0 : undefined} aria-pressed={!isEditingQuiz ? studentMcqAnswers[i] === optIdx : undefined} onClick={!isEditingQuiz ? () => selectMcqOption(i, optIdx, opt, q) : undefined} onKeyDown={!isEditingQuiz ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMcqOption(i, optIdx, opt, q);
              }
            } : undefined} className={`p-2 rounded-lg border text-sm relative group/option ${!isEditingQuiz ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors' : ''} ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : studentMcqAnswers[i] === optIdx ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-100'}`}>{Array.isArray(q.optionImageUrls) && q.optionImageUrls[optIdx] && <div className="relative mb-2"><img src={q.optionImageUrls[optIdx]} alt={opt} loading="lazy" className="w-full h-24 object-contain rounded bg-white border border-slate-200" />{renderImageRefineOverlay(i, 'option', optIdx, true)}</div>}<div className="flex items-start gap-2"><span className="mt-1.5 opacity-50">{String.fromCharCode(65 + optIdx)}.</span><div className="flex-grow">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_option') || 'Edit answer option'} value={opt} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx)} className={`w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`} rows={getRows(opt, 30)} />{q.options_en && <textarea aria-label={t('quiz.edit_option_translation') || 'Edit option translation'} value={q.options_en[optIdx] || ''} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx, true)} className="w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all mt-1" rows={getRows(q.options_en[optIdx] || '', 30)} placeholder={t('common.placeholder_option_trans')} />}</> : <><p className={`px-1 py-0.5 ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`}>{opt}</p>{q.options_en && q.options_en[optIdx] && <p className="text-xs text-slate-600 mt-1 px-1 italic">{q.options_en[optIdx]}</p>}</>}</div></div>{showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer && <div className="absolute top-2 right-2 text-green-600"><CheckCircle2 size={14} /></div>}{isEditingQuiz && opt !== q.correctAnswer && Array.isArray(q.distractorQuality) && function () {
                var dq = q.distractorQuality.find(function (d) {
                  return d && d.distractor === opt;
                });
                if (!dq) return null;
                return <div className="mt-1.5 ml-1 flex items-center gap-1.5 flex-wrap">{dq.encodesMisconception ? <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" aria-label={'This distractor encodes a known student misconception. ' + (dq.reason || '')} title={dq.reason || 'Encodes a known student misconception'}><span aria-hidden="true">🎯 </span>misconception</span> : <><span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" aria-label={'Generic distractor — does not encode a specific misconception. ' + (dq.reason || '')} title={dq.reason || 'Generic distractor — does not encode a specific misconception'}><span aria-hidden="true">⚠ </span>generic</span><button type="button" onClick={function (e) {
                      e.stopPropagation();
                      improveDistractor(i, optIdx, opt, dq.reason || '');
                    }} disabled={!!isImprovingDistractor[i + ':' + optIdx]} className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" aria-label={isImprovingDistractor[i + ':' + optIdx] ? 'Rewriting distractor' : 'Rewrite this distractor to encode a real misconception'} title="Rewrite this distractor to encode a real misconception"><span aria-hidden="true">✨ </span>{isImprovingDistractor[i + ':' + optIdx] ? 'rewriting…' : 'improve'}</button></>}</div>;
              }()}</div>)}</div><McqEnhancements q={q} questionIdx={i} modeStrategy={_modeStrat} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} onSubmitLiveAnswer={onSubmitLiveAnswer} currentConfidence={studentMcqConfidence[i] || null} onSetConfidence={function (lvl) {
            setMcqConfidence(i, lvl, q);
          }} />{q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && <div className="mt-4 ml-9 p-3 pr-20 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2 items-start animate-in slide-in-from-top-2 relative"><Stamp label={t('quiz.verified_stamp')} position="top-2 right-2" size="small" /><button aria-label={t('common.refresh')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className="absolute bottom-2 right-2 p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors" title={t('quiz.regenerate_check')}><RefreshCw size={14} className={isFactChecking[i] ? "animate-spin" : ""} /></button><Sparkles size={14} className="mt-0.5 shrink-0 text-yellow-600" /><div className="flex-grow"><div className="whitespace-pre-line leading-relaxed text-slate-700">{renderFormattedText(q.factCheck)}</div></div></div>}</div>)}{Array.isArray(generatedContent?.data?.questions) && generatedContent.data.questions.some(function (q) {
          return q && (q.type === 'fill-blank' || q.type === 'short-answer' || q.type === 'self-explanation' || q.type === 'sequence-sense' || q.type === 'relation-mismatch');
        }) && <FreeformItemsBlock questions={generatedContent.data.questions} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} QuizAIHelpers={window.AlloModules && window.AlloModules.QuizAIHelpers} modeStrategy={_modeStrat} onSubmitLiveAnswer={onSubmitLiveAnswer} />}{(Array.isArray(generatedContent?.data.reflections) && generatedContent.data.reflections.length > 0 || generatedContent?.data.reflection) && <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"><h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><PenTool size={16} /> {t('quiz.reflections')}</h4>{Array.isArray(generatedContent?.data.reflections) ? <div className="space-y-6">{generatedContent?.data.reflections.map((ref, i) => {
              const text = typeof ref === 'string' ? ref : ref.text || ref.prompt || ref.question || (typeof ref === 'object' ? JSON.stringify(ref) : '');
              const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
              var refEntry = reflectionAnswers[i] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return <div key={i}>{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_reflection') || 'Edit reflection prompt'} value={text} onChange={e => handleReflectionChange(i, e.target.value)} className="w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all" rows={getRows(text)} />{(textEn !== null || leveledTextLanguage !== 'English') && <textarea aria-label={t('quiz.edit_reflection_translation') || 'Edit reflection translation'} value={textEn || ''} onChange={e => handleReflectionChange(i, e.target.value, true)} className="w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all" rows={getRows(textEn || '')} placeholder={t('common.placeholder_reflection_trans')} />}</> : <><p className="text-indigo-800 mb-1 italic text-sm px-2 py-1">{text}</p>{textEn && <p className="text-indigo-600 mb-4 text-xs px-2 py-1 italic">{textEn}</p>}</>}{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                    reopenReflection(i);
                  }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Edit response</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                    setReflectionDraft(i, e.target.value);
                  }} placeholder="Type your reflection here…" className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-y transition-all" rows={4} /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                      submitReflection(i);
                    }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Submit reflection</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">Type a response to enable submit</span>}</div></div>)}</div>;
            })}</div> : <><p className="text-indigo-800 mb-4 italic text-sm">{generatedContent?.data.reflection}</p>{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : function () {
              var refEntry = reflectionAnswers[0] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                  reopenReflection(0);
                }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Edit response</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                  setReflectionDraft(0, e.target.value);
                }} placeholder="Type your reflection here…" className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-y transition-all" rows={4} /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                    submitReflection(0);
                  }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Submit reflection</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">Type a response to enable submit</span>}</div></div>;
            }())}</>}</div>}</div>}</div>;
  }
