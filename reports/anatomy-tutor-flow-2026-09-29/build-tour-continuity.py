from pathlib import Path
import difflib

root = Path(__file__).resolve().parents[2]
target = root / 'stem_lab/stem_tool_anatomy.js'
before = target.read_text(encoding='utf-8')
after = before

def replace(old, new):
    global after
    count = after.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one match, found {count}: {old[:100]}')
    after = after.replace(old, new, 1)

replace("""        var tourRecapActive = tourActive && rawTourRecap.active === true && rawTourRecap.version === 2 && rawTourRecap.systemId === tourSystemId && tourSteps.length >= 2;
""", """        var tourRecapContext = 'tour-v2|' + tourSystemId + '|' + tourSteps.map(function(step) { return step.structureId; }).join(',');
        var tourRecapValid = tourActive && rawTourRecap.version === 2 && rawTourRecap.systemId === tourSystemId && tourSteps.length >= 2 && (!rawTourRecap.context || rawTourRecap.context === tourRecapContext);
        var tourRecapActive = tourRecapValid && rawTourRecap.active === true;
""")
replace("          tourRecapAnswers = tourRecapActive ? validTourAnswers(rawTourRecap.answers,tourRecapQuestionsMemo) : {};", "          tourRecapAnswers = tourRecapValid ? validTourAnswers(rawTourRecap.answers,tourRecapQuestionsMemo) : {};")
replace("""            if(state._tourActive!==true||systemId!==tourSystemId||recap.active!==true||recap.version!==2||recap.systemId!==tourSystemId)return previous;
""", """            if(state._activeTab!=='tour'||state._tourActive!==true||systemId!==tourSystemId||recap.active!==true||recap.version!==2||recap.systemId!==tourSystemId||(recap.context&&recap.context!==tourRecapContext)||(recap.token||null)!==(rawTourRecap.token||null))return previous;
""")
replace("            var patch=Object.assign({_tourRecap:{active:true,version:2,systemId:tourSystemId,answers:answers}},confidenceEvidencePatch(question.structureId,correct,state));", "            var patch=Object.assign({_tourRecap:Object.assign({},recap,{active:true,version:2,systemId:tourSystemId,answers:answers,focusIndex:question.index})},confidenceEvidencePatch(question.structureId,correct,state));")
replace("""          if(typeof announceToSR==='function')announceToSR((correct?t('stem.anatomy.recap_correct','Correct: '):t('stem.anatomy.recap_incorrect','Not quite. It was '))+question.structure.name+'.');
        }
        function focusTourStep(){setTimeout(function(){var panel=document.querySelector('[data-anatomy-tour-step]')||document.querySelector('#anatomy-tour-step-select');if(panel){panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'auto'});}},0);}
        function reviewTourQuestion(question){updMulti(structureFocusPatch(question.structureId,{_tourActive:true,_tourSystem:tourSystemId,_tourStepIdx:question.stepIndex,_tourRecap:null}));announceStructure(question.structureId);focusTourStep();}
""", """          if(typeof announceToSR==='function')announceToSR((correct?t('stem.anatomy.recap_correct','Correct: '):t('stem.anatomy.recap_incorrect','Not quite. It was '))+question.structure.name+'.');
          focusTourRecap(question.index, true, rawTourRecap.token);
        }
        function focusTourStep(systemId){var focusSystem=systemId||tourSystemId;setTimeout(function(){var root=document.querySelector('[data-anatomy-tour-panel]');if(!root||root.getAttribute('data-anatomy-tour-system')!==focusSystem)return;var panel=root.querySelector('[data-anatomy-tour-step]')||root.querySelector('#anatomy-tour-step-select');if(panel){panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'auto'});}},0);}
        function focusTourRecap(index, feedback, token) {
          setTimeout(function() {
            var panel = document.querySelector('[data-anatomy-recap="tour"]');
            if (!panel || panel.getAttribute('data-anatomy-recap-context') !== tourRecapContext || panel.getAttribute('data-anatomy-recap-token') !== (token || '')) return;
            var question = Number.isInteger(index) ? panel.querySelector('[data-anatomy-recap-index="' + index + '"]') : null;
            var target = question && feedback ? question.querySelector('[data-anatomy-tour-feedback]') : question;
            target = target || question || panel.querySelector('[data-anatomy-recap-heading]');
            if (target) { target.focus({preventScroll:true}); target.scrollIntoView({block:'start',behavior:'auto'}); }
          }, 0);
        }
        function savedTourRecapReturn() {
          var link = d._tourRecapReturn;
          if (activeTab !== 'tour' || !tourRecapValid || rawTourRecap.active !== false || rawTourRecap.context !== tourRecapContext || typeof rawTourRecap.token !== 'string' || !rawTourRecap.token || !link || typeof link !== 'object' || Array.isArray(link) || link.systemId !== tourSystemId || link.context !== tourRecapContext || link.token !== rawTourRecap.token || !Number.isInteger(link.questionIndex)) return null;
          return getTourRecapQuestions().some(function(question) { return question.index === link.questionIndex; }) ? link : null;
        }
        function pauseTourRecap(questionIndex, stepIndex) {
          if (!tourRecapActive) return;
          var questions = getTourRecapQuestions();
          var requested = questions.find(function(question) { return question.index === questionIndex; });
          if (questionIndex !== undefined && !requested) return;
          var destination = Number.isInteger(stepIndex) && tourSteps[stepIndex] ? stepIndex : tourStepIdx, accepted = false;
          setLabToolData(function(previous) {
            var state = previous.anatomy || {}, recap = state._tourRecap || {};
            var systemId = GUIDED_TOURS[state._tourSystem] ? state._tourSystem : (SYSTEMS[state.system] ? state.system : 'skeletal');
            if (state._activeTab !== 'tour' || state._tourActive !== true || systemId !== tourSystemId || recap.active !== true || recap.version !== 2 || recap.systemId !== tourSystemId || (recap.context && recap.context !== tourRecapContext) || (recap.token || null) !== (rawTourRecap.token || null)) return previous;
            var answers = validTourAnswers(recap.answers, questions);
            var focused = requested || questions.find(function(question) { return question.index === recap.focusIndex; }) || questions.find(function(question) { return !answers[question.index]; }) || questions[0];
            var token = typeof recap.token === 'string' && recap.token ? recap.token : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
            var link = {systemId:tourSystemId, context:tourRecapContext, token:token, questionIndex:focused.index};
            var patch = structureFocusPatch(tourSteps[destination].structureId, {_tourActive:true, _tourSystem:tourSystemId, _tourStepIdx:destination, _tourRecap:Object.assign({},recap,{active:false,version:2,systemId:tourSystemId,context:tourRecapContext,token:token,answers:answers,focusIndex:focused.index}), _tourRecapReturn:link});
            accepted = true;
            return Object.assign({}, previous, {anatomy:Object.assign({},state,patch)});
          });
          finishTourRecapUpdate(function(){return accepted;},function(){announceStructure(tourSteps[destination].structureId);focusTourStep();});
        }
        function resumeTourRecap() {
          var link = savedTourRecapReturn();
          if (!link) return;
          var questions = getTourRecapQuestions(), accepted = false;
          setLabToolData(function(previous) {
            var state = previous.anatomy || {}, recap = state._tourRecap || {}, currentLink = state._tourRecapReturn || {};
            var systemId = GUIDED_TOURS[state._tourSystem] ? state._tourSystem : (SYSTEMS[state.system] ? state.system : 'skeletal');
            if (state._activeTab !== 'tour' || state._tourActive !== true || systemId !== tourSystemId || recap.active !== false || recap.version !== 2 || recap.systemId !== tourSystemId || recap.context !== tourRecapContext || recap.token !== link.token || currentLink.systemId !== tourSystemId || currentLink.context !== tourRecapContext || currentLink.token !== link.token || currentLink.questionIndex !== link.questionIndex) return previous;
            accepted = true;
            return Object.assign({}, previous, {anatomy:Object.assign({},state,{_tourRecap:Object.assign({},recap,{active:true,answers:validTourAnswers(recap.answers,questions),focusIndex:link.questionIndex}),_tourRecapReturn:null})});
          });
          finishTourRecapUpdate(function(){return accepted;},function(){
            focusTourRecap(link.questionIndex, true, link.token);
            if (typeof announceToSR === 'function') announceToSR(t('stem.anatomy.tour_flow_resume_announce', 'Returning to recap clue {clue}.').replace('{clue}',String(link.questionIndex+1)));
          });
        }
        function openTourRecap(restart) {
          if (!restart && savedTourRecapReturn()) { resumeTourRecap(); return; }
          if (activeTab !== 'tour' || !tourActive || getTourRecapQuestions().length < 2) return;
          var token = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), accepted = false;
          setLabToolData(function(previous) {
            var state = previous.anatomy || {};
            var systemId = GUIDED_TOURS[state._tourSystem] ? state._tourSystem : (SYSTEMS[state.system] ? state.system : 'skeletal');
            if (state._activeTab !== 'tour' || state._tourActive !== true || systemId !== tourSystemId || (restart && ((state._tourRecap || {}).active !== true || (state._tourRecap || {}).token !== rawTourRecap.token)) || (!restart && ((state._tourRecap || {}).active === true || Number(state._tourStepIdx || 0) !== tourStepIdx))) return previous;
            accepted = true;
            return Object.assign({},previous,{anatomy:Object.assign({},state,{_tourRecap:{active:true,version:2,systemId:tourSystemId,context:tourRecapContext,token:token,answers:{}},_tourRecapReturn:null})});
          });
          finishTourRecapUpdate(function(){return accepted;},function(){
            playSound('guidedStep');
            focusTourRecap(null, false, token);
            if (typeof announceToSR === 'function') announceToSR(t('stem.anatomy.tour_recap_announce', 'Tour recap: answer a short clue for each structure you just saw.'));
          });
        }
        function changeTourStep(index) {
          if (!Number.isInteger(index) || !tourSteps[index]) return;
          if (tourRecapActive) { pauseTourRecap(undefined,index); return; }
          updMulti(structureFocusPatch(tourSteps[index].structureId,{_tourActive:true,_tourSystem:tourSystemId,_tourStepIdx:index}));
          announceStructure(tourSteps[index].structureId);
          focusTourStep();
        }
        function reviewTourQuestion(question){if(!tourRecapActive||!getTourRecapQuestions().some(function(item){return item.index===question.index&&item.structureId===question.structureId&&item.stepIndex===question.stepIndex;})||!tourRecapAnswers[question.index])return;pauseTourRecap(question.index,question.stepIndex);}
""")
replace("          updMulti({ _tourCompleted: true, _tourActive: false, _activeTab: 'explore', _tourRecap: null });", "          updMulti({ _tourCompleted: true, _tourActive: false, _activeTab: 'explore', _tourRecap: null, _tourRecapReturn: null });")
replace("""          return h('div', { className: 'space-y-3', 'data-anatomy-recap': cfg.key, 'data-anatomy-recap-state': recap.done ? 'done' : 'open' },
""", """          return h('div', { className: 'space-y-3', 'data-anatomy-recap': cfg.key, 'data-anatomy-recap-state': recap.done ? 'done' : 'open', 'data-anatomy-recap-context':cfg.context, 'data-anatomy-recap-token':cfg.token||'' },
""")
replace("              h('h5', { className: 'font-bold text-' + accent + '-900 text-sm' }, cfg.title),", "              h('h5', { className: 'font-bold text-' + accent + '-900 text-sm', 'data-anatomy-recap-heading':cfg.key, tabIndex:-1 }, cfg.title),")
replace("'data-anatomy-recap-question': question.structureId },", "'data-anatomy-recap-question': question.structureId, 'data-anatomy-recap-index':question.index, tabIndex:-1 },")
replace("'data-anatomy-tour-feedback':chosen===question.structureId?'correct':'incorrect',role:'status'", "'data-anatomy-tour-feedback':chosen===question.structureId?'correct':'incorrect',role:'status',tabIndex:-1")
replace("""              h('button', { type: 'button', 'aria-label': cfg.completeAria, onClick: cfg.onComplete,
""", """              cfg.onRestart && h('button', {type:'button','data-anatomy-tour-recap-restart':true,onClick:cfg.onRestart,'aria-describedby':'anatomy-tour-recap-restart-help',className:'anatomy-tour-recap-restart'},t('stem.anatomy.tour_flow_restart', 'Restart recap')),
              h('button', { type: 'button', 'aria-label': cfg.completeAria, onClick: cfg.onComplete,
""")
replace("""              }, recap.done ? cfg.completeLabel : cfg.skipLabel)
            )
""", """              }, recap.done ? cfg.completeLabel : cfg.skipLabel)
            ),
            cfg.onRestart && h('p',{id:'anatomy-tour-recap-restart-help',className:'anatomy-tour-recap-session-help'},t('stem.anatomy.tour_flow_restart_help', 'Restart clears these recap answers and starts a new attempt.'))
""")
replace("            onBack: function() { updMulti({ _tourRecap: null }); }, backLabel: t('stem.anatomy.recap_back', '← Back to the tour'),", "            onBack: function() { pauseTourRecap(); }, onRestart:function() { openTourRecap(true); }, backLabel: t('stem.anatomy.recap_back', '← Back to the tour'),")
replace("            key: 'tour', questions: getTourRecapQuestions(), answers: tourRecapAnswers, accent: 'emerald',", "            key: 'tour', context:tourRecapContext, token:rawTourRecap.token||'', questions: getTourRecapQuestions(), answers: tourRecapAnswers, accent: 'emerald',")
replace("'data-anatomy-tour-panel':true },", "'data-anatomy-tour-panel':true, 'data-anatomy-tour-system':tourSystemId },")
replace("_tourActive:true,_tourSystem:id,_tourStepIdx:0,_tourRecap:null}),{system:id}));announceStructure(first.structureId);", "_tourActive:true,_tourSystem:id,_tourStepIdx:0,_tourRecap:null,_tourRecapReturn:null}),{system:id}));announceStructure(first.structureId);focusTourStep(id);")
replace("""onChange:function(event){var index=Number(event.target.value);if(!Number.isInteger(index)||!tourSteps[index])return;updMulti(structureFocusPatch(tourSteps[index].structureId,{_tourActive:true,_tourSystem:tourSystemId,_tourStepIdx:index,_tourRecap:null}));announceStructure(tourSteps[index].structureId);}""", """onChange:function(event){changeTourStep(Number(event.target.value));}""")
replace("""                    tourRecapActive ? renderTourRecap() : currentTourStep ? h('div',""", """                    savedTourRecapReturn() && h('aside',{className:'anatomy-tour-recap-return','data-anatomy-tour-recap-return':true},
                      h('p',null,t('stem.anatomy.tour_flow_saved', 'Your recap answers are saved. Review this step, then return to the same clue.')),
                      h('button',{type:'button','data-anatomy-tour-recap-resume':true,onClick:resumeTourRecap},t('stem.anatomy.tour_flow_return', 'Return to recap · Clue {clue}').replace('{clue}',String(savedTourRecapReturn().questionIndex+1)))
                    ),
                    tourRecapActive ? renderTourRecap() : currentTourStep ? h('div',""")
replace("announceStructure(tourSteps[prev].structureId); playSound('guidedStep');", "announceStructure(tourSteps[prev].structureId); playSound('guidedStep'); focusTourStep();")
replace("announceStructure(tourSteps[next].structureId); playSound('guidedStep');", "announceStructure(tourSteps[next].structureId); playSound('guidedStep'); focusTourStep();")
replace("""onClick: function() { updMulti({ _tourRecap: { active: true, version: 2, systemId: tourSystemId, answers: {} } }); playSound('guidedStep'); if (typeof announceToSR === 'function') announceToSR(t('stem.anatomy.tour_recap_announce', 'Tour recap: answer a short clue for each structure you just saw.')); },""", """onClick: function() { openTourRecap(false); },""")
replace("_tourActive:true,_tourSystem:systemId,_tourStepIdx:0,_tourRecap:null}),{system:systemId}", "_tourActive:true,_tourSystem:systemId,_tourStepIdx:0,_tourRecap:null,_tourRecapReturn:null}),{system:systemId}")
replace("            } else changeTab(tourPatch);\n            return;", "            } else changeTab(tourPatch);\n            if(tourRecapActive)focusTourRecap(rawTourRecap.focusIndex,true,rawTourRecap.token);else focusTourStep();\n            return;")

replace("          var correct=optionId===question.structureId;\n          setLabToolData(function(previous){", "          var correct=optionId===question.structureId, accepted=false;\n          setLabToolData(function(previous){")
replace("            answers[question.index]=optionId;\n            var patch=", "            answers[question.index]=optionId;\n            accepted=true;\n            var patch=")
replace("""          playSound(correct?'quizCorrect':'quizWrong');
          if(typeof announceToSR==='function')announceToSR((correct?t('stem.anatomy.recap_correct','Correct: '):t('stem.anatomy.recap_incorrect','Not quite. It was '))+question.structure.name+'.');
          focusTourRecap(question.index, true, rawTourRecap.token);
""", """          finishTourRecapUpdate(function(){return accepted;},function(){
            playSound(correct?'quizCorrect':'quizWrong');
            if(typeof announceToSR==='function')announceToSR((correct?t('stem.anatomy.recap_correct','Correct: '):t('stem.anatomy.recap_incorrect','Not quite. It was '))+question.structure.name+'.');
            focusTourRecap(question.index, true, rawTourRecap.token);
          });
""")
replace("        function focusTourStep(systemId){", """        function finishTourRecapUpdate(accepted, effect) {
          var notified = false;
          function notify() { if (notified || !accepted()) return; notified = true; effect(); }
          notify(); setTimeout(notify, 0);
        }
        function focusTourStep(systemId){""")

patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile='a/stem_lab/stem_tool_anatomy.js', tofile='b/stem_lab/stem_tool_anatomy.js'))
(Path(__file__).parent / 'tour-continuity.patch').write_text(patch, encoding='utf-8', newline='\n')
print('Created source patch; canonical source and desktop mirror were not edited.')
