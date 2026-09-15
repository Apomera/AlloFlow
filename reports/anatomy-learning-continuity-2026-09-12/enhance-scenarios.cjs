const fs=require('node:fs');const parser=require('@babel/parser');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');
function rep(a,b,n=1){const count=s.split(a).length-1;if(count!==n)throw Error(`Expected ${n}, got ${count}: ${a.slice(0,85)}`);s=s.split(a).join(b);}
const code=`        var MOTION_LEARNING = {
          exercise: {
            objective: t('stem.anatomy.motion_goal_exercise', 'Explain how muscle force, joint movement, blood flow, and gas exchange support climbing stairs.'),
            prediction: t('stem.anatomy.motion_predict_exercise', 'The air–blood barrier becomes thicker. With other factors unchanged, will oxygen transfer decrease, increase, or stay the same?'), expected: 'less',
            transfer: t('stem.anatomy.motion_transfer_exercise', 'You hold a bag still with your elbow bent. Which explanation fits the active arm muscles?'),
            options: [t('stem.anatomy.motion_exercise_a', 'No joint movement means no muscle tension.'),t('stem.anatomy.motion_exercise_b', 'Muscles can produce tension while holding their length.'),t('stem.anatomy.motion_exercise_c', 'Muscles push the bones to keep the bag still.')], correct: 1,
            explanation: t('stem.anatomy.motion_explain_exercise', 'An isometric contraction produces tension without visible joint movement. A contraction does not always mean shortening.'),
            reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension'
          },
          meal: {
            objective: t('stem.anatomy.motion_goal_meal', 'Connect intestinal surface area, absorption, and transport to the delivery of nutrients.'),
            prediction: t('stem.anatomy.motion_predict_meal', 'Villi become shorter, reducing absorptive surface area. With other factors unchanged, will nutrient absorption decrease, increase, or stay the same?'), expected: 'less',
            transfer: t('stem.anatomy.motion_transfer_meal', 'Villi are intact, but their lacteals cannot carry lymph away. Which transport route is most directly affected?'),
            options: [t('stem.anatomy.motion_meal_a', 'Glucose entering nearby blood capillaries.'),t('stem.anatomy.motion_meal_b', 'Oxygen entering blood in the lungs.'),t('stem.anatomy.motion_meal_c', 'Chylomicrons carrying absorbed long-chain dietary fats into lymph.')], correct: 2,
            explanation: t('stem.anatomy.motion_explain_meal', 'Lacteals carry chylomicrons through lymph. Sugars and amino acids generally enter blood capillaries; absorption and onward transport are different links.'),
            reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look'
          },
          wound: {
            objective: t('stem.anatomy.motion_goal_wound', 'Trace how clotting, immune responses, blood supply, and tissue rebuilding cooperate during repair.'),
            prediction: t('stem.anatomy.motion_predict_wound', 'Blood supply to rebuilding tissue falls and inflammation persists. Will the time needed to close the wound decrease, increase, or stay the same?'), expected: 'more',
            transfer: t('stem.anatomy.motion_transfer_wound', 'The skin surface has closed. Which statement best describes what may still happen underneath?'),
            options: [t('stem.anatomy.motion_wound_a', 'Collagen can continue to reorganize as the tissue remodels.'),t('stem.anatomy.motion_wound_b', 'All repair stops the instant the surface closes.'),t('stem.anatomy.motion_wound_c', 'The repaired tissue must already have its original strength.')], correct: 0,
            explanation: t('stem.anatomy.motion_explain_wound', 'Surface closure and completion of repair are different. Remodeling continues, and repaired tissue may not regain its original strength.'),
            reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/5-3-functions-of-the-integumentary-system'
          },
          fluid: {
            objective: t('stem.anatomy.motion_goal_fluid', 'Distinguish how much fluid is filtered from which substances cross the kidney filter.'),
            prediction: t('stem.anatomy.motion_predict_fluid', 'The glomerular barrier becomes more permeable to plasma proteins. Will protein entering the filtrate decrease, increase, or stay the same?'), expected: 'more',
            transfer: t('stem.anatomy.motion_transfer_fluid', 'In a different model, less fluid is filtered but the barrier remains intact. Does the smaller filtered volume alone show that protein is leaking?'),
            options: [t('stem.anatomy.motion_fluid_a', 'Yes. Filtered volume and protein selectivity are the same property.'),t('stem.anatomy.motion_fluid_b', 'No. Filtration volume and barrier selectivity are different properties.'),t('stem.anatomy.motion_fluid_c', 'Yes. Any reduction in filtered volume means more protein crosses.')], correct: 1,
            explanation: t('stem.anatomy.motion_explain_fluid', 'A change in filtered volume does not by itself establish protein leakage. The amount filtered and the barrier’s selectivity must be considered separately.'),
            reference: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney'
          }
        };
        var systemsMotionLearning = {};
        systemsMotionScenarioIds.forEach(function(id) {
          var raw = d._systemsMotionLearning && d._systemsMotionLearning[id] || {};
          systemsMotionLearning[id] = {
            prediction: ['less','more','same'].indexOf(raw.prediction) !== -1 ? raw.prediction : null,
            explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0,1200) : '',
            transfer: [0,1,2].indexOf(raw.transfer) !== -1 ? raw.transfer : null,
            transferExplanation: typeof raw.transferExplanation === 'string' ? raw.transferExplanation.slice(0,1200) : '',
            selfReview: raw.selfReview === true
          };
        });
        var motionLearning = systemsMotionLearning[systemsMotionScenarioId];
        var motionLesson = MOTION_LEARNING[systemsMotionScenarioId];
        function updateMotionLearning(patch) {
          var next = Object.assign({}, systemsMotionLearning);
          next[systemsMotionScenarioId] = Object.assign({}, motionLearning, patch);
          upd('_systemsMotionLearning', next);
        }
        function renderMotionPrediction() {
          var predicting = d._systemsMotionPredicting === systemsMotionScenarioId;
          return h('section', { className: 'anatomy-motion-learning', 'aria-labelledby': 'anatomy-motion-objective', 'data-anatomy-motion-learning': systemsMotionScenarioId },
            h('h4', { id: 'anatomy-motion-objective' }, t('stem.anatomy.motion_objective', 'Learning objective')),
            h('p', null, motionLesson.objective),
            h('p', { className: 'anatomy-motion-learning-status' },
              (motionLearning.prediction ? '✓ ' : '○ ') + t('stem.anatomy.motion_predicted', 'Predict') + ' · ' +
              (motionLearning.explanation.trim() ? '✓ ' : '○ ') + t('stem.anatomy.motion_explained', 'Explain') + ' · ' +
              (motionLearning.transfer !== null ? '✓ ' : '○ ') + t('stem.anatomy.motion_transferred', 'Try a new situation')),
            predicting || motionLearning.prediction ? h('fieldset', { 'data-anatomy-motion-prediction': systemsMotionScenarioId },
              h('legend', null, motionLesson.prediction),
              [['less',t('stem.anatomy.motion_less','Decrease')],['more',t('stem.anatomy.motion_more','Increase')],['same',t('stem.anatomy.motion_same','Stay the same')]].map(function(option) {
                return h('label', { key: option[0] }, h('input', { type: 'radio', name: 'anatomy-motion-prediction', value: option[0], checked: motionLearning.prediction === option[0], disabled: systemsMotionPerturbation,
                  onChange: function() { updateMotionLearning({ prediction: option[0] }); } }), option[1]);
              }),
              !systemsMotionPerturbation ? h('button', { type: 'button', disabled: !motionLearning.prediction, 'data-anatomy-motion-reveal': 'true', onClick: toggleSystemsMotionPerturbation }, t('stem.anatomy.motion_compare_prediction','Compare my prediction')) : null
            ) : null,
            systemsMotionPerturbation && motionLearning.prediction ? h('p', { role: 'status', 'data-anatomy-motion-prediction-feedback': 'true' },
              (motionLearning.prediction === motionLesson.expected ? t('stem.anatomy.motion_prediction_match','Your prediction matches the model. ') : t('stem.anatomy.motion_prediction_rethink','Compare your prediction with the model. ')) + t('stem.anatomy.motion_read_chain','Use the structural change, local effect, and pathway consequence below to explain why.')) : null
          );
        }
        function renderMotionReflection() {
          if (!systemsMotionPerturbation) return null;
          return h('section', { className: 'anatomy-motion-learning', 'aria-labelledby': 'anatomy-motion-reflection-title', 'data-anatomy-motion-reflection': systemsMotionScenarioId },
            h('h4', { id: 'anatomy-motion-reflection-title' }, t('stem.anatomy.motion_reflection_title','Explain the chain, then use it elsewhere')),
            h('label', { htmlFor: 'anatomy-motion-explanation' }, t('stem.anatomy.motion_explanation_prompt','In your own words, how does the structural change affect another part of the pathway?'),
              h('textarea', { id: 'anatomy-motion-explanation', rows: 3, maxLength: 1200, value: motionLearning.explanation, onChange: function(event) { updateMotionLearning({ explanation: event.target.value.slice(0,1200) }); } })),
            h('button', { type: 'button', disabled: !motionLearning.explanation.trim(), 'aria-expanded': motionLearning.selfReview, 'aria-controls': 'anatomy-motion-self-review',
              onClick: function() { updateMotionLearning({ selfReview: !motionLearning.selfReview }); } }, t('stem.anatomy.motion_check_explanation','Check my explanation')),
            h('div', { id: 'anatomy-motion-self-review', hidden: !motionLearning.selfReview },
              h('p', null, t('stem.anatomy.motion_self_review','Check: Did you name the changed structure, describe the local effect, and connect it to another system? Revise your explanation using the model evidence.'))),
            h('fieldset', { 'data-anatomy-motion-transfer': systemsMotionScenarioId },
              h('legend', null, motionLesson.transfer),
              motionLesson.options.map(function(option, index) { return h('button', { key: index, type: 'button', 'data-anatomy-motion-transfer-option': String(index), 'aria-pressed': motionLearning.transfer === index,
                onClick: function() { updateMotionLearning({ transfer: index }); if (typeof announceToSR === 'function') announceToSR((index === motionLesson.correct ? t('stem.anatomy.recap_correct_short','Correct.') : t('stem.anatomy.recap_incorrect_short','Not quite.')) + ' ' + motionLesson.explanation); } }, option); })),
            motionLearning.transfer !== null ? h('p', { role: 'status', 'data-anatomy-motion-transfer-correct': motionLearning.transfer === motionLesson.correct ? 'true' : 'false' },
              (motionLearning.transfer === motionLesson.correct ? t('stem.anatomy.motion_transfer_match','The explanation fits. ') : t('stem.anatomy.motion_transfer_rethink','Reconsider the difference between the two situations. ')) + motionLesson.explanation) : null,
            h('label', { htmlFor: 'anatomy-motion-transfer-explanation' }, t('stem.anatomy.motion_transfer_reason','What stayed the same, and what changed in this new situation?'),
              h('textarea', { id: 'anatomy-motion-transfer-explanation', rows: 2, maxLength: 1200, value: motionLearning.transferExplanation, onChange: function(event) { updateMotionLearning({ transferExplanation: event.target.value.slice(0,1200) }); } })),
            h('p', null, t('stem.anatomy.motion_saved_scope','Your writing is saved for review and included in the study sheet. The choice is checked; the writing is not automatically graded.')),
            h('a', { href: motionLesson.reference, target: '_blank', rel: 'noopener noreferrer' }, t('stem.anatomy.motion_reference','Read the supporting anatomy — OpenStax'))
          );
        }

`;
rep('        var systemsMotionScenario = SYSTEMS_IN_MOTION_SCENARIOS[systemsMotionScenarioId];','        var systemsMotionScenario = SYSTEMS_IN_MOTION_SCENARIOS[systemsMotionScenarioId];\n'+code);
rep('          var nextPerturbation = !systemsMotionPerturbation;',`          if (!systemsMotionPerturbation && !motionLearning.prediction) {
            upd('_systemsMotionPredicting', systemsMotionScenarioId);
            if (typeof announceToSR === 'function') announceToSR(t('stem.anatomy.motion_predict_first','Record a prediction before revealing the disruption.'));
            return;
          }
          var nextPerturbation = !systemsMotionPerturbation;`);
rep('            _systemsMotionScenario: requestedScenarioId,','            _systemsMotionScenario: requestedScenarioId,\n            _systemsMotionPerturbation: requestedScenarioId === systemsMotionScenarioId && systemsMotionPerturbation,\n            _systemsMotionPredicting: null,');
rep('_regionalAtlasClinical: systemsMotionPerturbation && motionStep.id === requestedScenario.perturbation.affectedStepId','_regionalAtlasClinical: systemsMotionPerturbation && requestedScenarioId === systemsMotionScenarioId && motionStep.id === requestedScenario.perturbation.affectedStepId');
rep("            h('div', { className: 'anatomy-motion-route', role: 'group', 'aria-label': systemsMotionScenario.routeLabel }, routeChildren),", "            renderMotionPrediction(),\n            h('div', { className: 'anatomy-motion-route', role: 'group', 'aria-label': systemsMotionScenario.routeLabel }, routeChildren),");
rep('            renderSystemsInterventionLab(),','            renderMotionReflection(),\n            renderSystemsInterventionLab(),');
rep("value: activeTab, 'aria-controls': 'anatomy-mode-panel', onChange: function(event) { activateAnatomyTab(event.target.value); }", "value: showSystemsMotion ? 'systemsMotion' : activeTab, 'aria-controls': showSystemsMotion ? 'anatomy-systems-motion' : 'anatomy-mode-panel', onChange: function(event) { if (event.target.value === 'systemsMotion') openSystemsMotionStep(0); else activateAnatomyTab(event.target.value); }");
rep("navigableAnatomyTabs.map(function(tab) { return h('option', { key: tab, value: tab }, ANATOMY_ACTIVITY_NAMES[tab]); })", "navigableAnatomyTabs.map(function(tab) { return h('option', { key: tab, value: tab }, ANATOMY_ACTIVITY_NAMES[tab]); }),\n              h('option', { value: 'systemsMotion' }, t('stem.anatomy.motion_activity','Guided scenarios'))");
rep('            updMulti(Object.assign(progress, patch));','            updMulti(Object.assign(progress, { _showSystemsMotion: false }, patch));');
const css='.anatomy-motion-learning{display:grid;gap:10px;margin:12px;padding:14px;border:1px solid #94a3b8;border-radius:12px;background:var(--allo-stem-panel,#f8fafc);color:var(--allo-stem-text,#0f172a);font-size:13px;line-height:1.55;min-width:0}.anatomy-motion-learning h4{font-size:15px;font-weight:800;margin:0}.anatomy-motion-learning label{display:grid;gap:5px}.anatomy-motion-learning fieldset{border:1px solid #94a3b8;padding:10px;border-radius:10px;display:grid;gap:6px;min-width:0}.anatomy-motion-learning legend{font-weight:800;max-width:100%;white-space:normal}.anatomy-motion-learning fieldset label{display:flex;gap:8px;align-items:center;min-height:44px}.anatomy-motion-learning textarea{width:100%;min-width:0;border:1px solid #64748b;border-radius:8px;padding:8px;font-size:16px;background:#fff;color:#0f172a}.anatomy-motion-learning button{min-height:44px;padding:8px 12px;border:1px solid #64748b;border-radius:8px;color:#0f172a;background:#fff;font-weight:700;text-align:start}.anatomy-motion-learning button[aria-pressed=true]{background:#0f766e;color:#fff;border-color:#0f766e}.anatomy-motion-learning button:disabled{opacity:.6}.anatomy-motion-learning :focus-visible{outline:3px solid #0891b2;outline-offset:3px}.anatomy-motion-learning-status{font-weight:700}.anatomy-motion-learning a{color:#075985;text-decoration:underline}.anatomy-motion-learning [hidden]{display:none!important}.theme-dark .anatomy-motion-learning{background:#0f172a;color:#e2e8f0}.theme-dark .anatomy-tool-shell .anatomy-motion-learning textarea,.theme-dark .anatomy-motion-learning button{background:#1e293b!important;color:#e2e8f0!important}.theme-dark .anatomy-motion-learning button[aria-pressed=true]{background:#115e59!important;color:#fff!important}.theme-dark .anatomy-motion-learning a{color:#7dd3fc}';
rep("      '.theme-dark .anatomy-tool-shell{color:", '      '+JSON.stringify(css)+',\n'+"      '.theme-dark .anatomy-tool-shell{color:");
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);console.log('Prediction, reflection, transfer, and direct mobile scenario access added.');
