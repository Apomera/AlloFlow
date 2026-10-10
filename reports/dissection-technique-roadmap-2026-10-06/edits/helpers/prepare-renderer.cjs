const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),before=fs.readFileSync(path.join(__dirname,'renderer-baseline.js'),'utf8');if(sha(before)!=='c9c4d0a4170a44cb7492f19c7e10823bded91490edcc7ad0998e59a814508a56')throw Error('Renderer baseline');let after=before;const edits=[];function replace(name,old,next){if(after.split(old).length!==2)throw Error('Unique renderer edit '+name);after=after.replace(old,()=>next);edits.push({name,before:old,after:next});}
const style=`.diss-technique-roadmap { grid-column: 1 / -1; display: grid; min-width: 0; gap: .55rem; padding: .7rem; border: 1px solid #a9bdd3; border-radius: .75rem; background: #fff; color: #173f69; }
.diss-technique-roadmap__head { display: flex; flex-wrap: wrap; min-width: 0; align-items: baseline; justify-content: space-between; gap: .35rem .75rem; }
[data-dissection-root] .diss-technique-roadmap :is(h4, p, strong, span, summary) { margin: 0; color: inherit; font-size: 1rem !important; line-height: 1.5 !important; overflow-wrap: anywhere; }
.diss-technique-roadmap__position { font-weight: 800; }
.diss-technique-roadmap__count { font-variant-numeric: tabular-nums; }
.diss-technique-roadmap progress { display: block; width: 100%; height: .55rem; accent-color: #0f766e; }
.diss-technique-roadmap__sequence { min-width: 0; border: 1px solid #a9bdd3; border-radius: .6rem; background: #f8fbff; }
[data-dissection-root] .diss-technique-roadmap__sequence > summary { display: list-item; min-height: 3rem; padding: .65rem .75rem; border-radius: .5rem; font-weight: 750; cursor: pointer; list-style-position: inside; }
[data-dissection-root] .diss-technique-roadmap__sequence > summary:is(:focus, :focus-visible) { outline: 3px solid #075985 !important; outline-offset: -5px !important; box-shadow: none !important; }
.diss-technique-roadmap__sequence[open] > summary { border-bottom: 1px solid #a9bdd3; border-radius: .5rem .5rem 0 0; }
.diss-technique-roadmap__body { display: grid; min-width: 0; gap: .65rem; padding: .75rem; }
.diss-technique-roadmap__list { display: grid; gap: .5rem; margin: 0; padding: 0; list-style: none; }
.diss-technique-roadmap__step { display: grid; min-width: 0; grid-template-columns: 2rem minmax(0, 1fr); align-items: start; gap: .65rem; padding: .65rem; border: 1px solid #a9bdd3; border-radius: .55rem; background: #fff; color: #173f69; }
.diss-technique-roadmap__step[aria-current="step"] { border: 2px solid #075985; background: #eff6ff; color: #075985; }
.diss-technique-roadmap__step[data-step-state="verified"] { border-color: #0f766e; background: #ecfdf5; color: #065f46; }
.diss-technique-roadmap__step[data-step-state="reflect"] { border-color: #6d28d9; background: #f5f3ff; color: #5b21b6; }
.diss-technique-roadmap__number { display: grid; width: 2rem; min-height: 2rem; place-items: center; border: 1px solid currentColor; border-radius: 50%; font-weight: 800; }
.diss-technique-roadmap__step-body { display: grid; min-width: 0; gap: .15rem; }
.diss-technique-roadmap__step-state { font-weight: 650; }
[data-dissection-root][data-text-size="large"] .diss-technique-roadmap :is(h4, p, strong, span, summary) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] :is(.diss-technique-roadmap, .diss-technique-roadmap__sequence, .diss-technique-roadmap__step) { color: #000 !important; background: #fff !important; border-color: #000 !important; }
[data-dissection-root][data-high-contrast="true"] .diss-technique-roadmap__step[aria-current="step"] { border-width: 3px; }
[data-dissection-root][data-high-contrast="true"] .diss-technique-roadmap__sequence > summary:is(:focus, :focus-visible) { outline-color: #000 !important; }
@media (forced-colors: active) { [data-dissection-root] :is(.diss-technique-roadmap, .diss-technique-roadmap__sequence, .diss-technique-roadmap__step) { color: CanvasText !important; background: Canvas !important; border-color: CanvasText !important; forced-color-adjust: auto; } [data-dissection-root] .diss-technique-roadmap progress { accent-color: Highlight; } [data-dissection-root] .diss-technique-roadmap__step[aria-current="step"] { border-width: 3px; } [data-dissection-root] .diss-technique-roadmap__sequence > summary:is(:focus, :focus-visible) { outline-color: Highlight !important; } }
`;
const styleAnchor='.diss-learning-check {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;';
replace('Readable expandable technique overview styles',styleAnchor,style+styleAnchor);
const renderer=`          function renderTechniqueRoadmap() {
            var ordered = procedureProtocol.order || [];
            if (!ordered.length) return null;
            var learning = procedureLearningSummary(currentProcedure);
            var currentAction = currentLearningGate.required ? currentLearningGate.action : procedureNext.action;
            var currentIndex = ordered.indexOf(currentAction);
            var position = currentIndex >= 0 ? 'Technique ' + (currentIndex + 1) + ' of ' + ordered.length : 'Current layer technique';
            var labels = { verified: 'Verified', reflect: 'Explanation needed', perform: 'Perform action', plan: 'Plan needed', recorded: 'Recorded action; evidence incomplete', upcoming: 'Upcoming' };
            return React.createElement('div', { id: 'diss-technique-roadmap', className: 'diss-technique-roadmap', role: 'group', 'aria-labelledby': 'diss-technique-roadmap-position', 'data-current-technique': currentAction },
              React.createElement('div', { className: 'diss-technique-roadmap__head' },
                React.createElement('h4', { id: 'diss-technique-roadmap-position', className: 'diss-technique-roadmap__position' }, position),
                React.createElement('p', { id: 'diss-technique-roadmap-count', className: 'diss-technique-roadmap__count' }, learning.verified + ' of ' + learning.total + ' steps verified')
              ),
              React.createElement('progress', { max: learning.total, value: learning.verified, 'aria-label': 'Verified technique steps', 'aria-valuetext': learning.verified + ' of ' + learning.total + ' steps verified' }),
              React.createElement('details', { className: 'diss-technique-roadmap__sequence' },
                React.createElement('summary', null, 'View technique sequence'),
                React.createElement('div', { className: 'diss-technique-roadmap__body' },
                  React.createElement('p', { id: 'diss-technique-roadmap-help' }, 'A step is verified after a correct plan, a recorded action and a correct explanation.'),
                  React.createElement('ol', { className: 'diss-technique-roadmap__list', role: 'list', 'aria-label': 'Current layer technique sequence' },
                    ordered.map(function (action, index) {
                      var entry = procedureLearningEntry(action, currentProcedure);
                      var complete = procedureActionComplete(currentProcedure, action);
                      var verified = complete && !!entry.predictionCorrect && !!entry.reflectionCorrect;
                      var current = action === currentAction && !verified;
                      var state = verified ? 'verified' : (current ? (currentLearningGate.required ? (currentLearningGate.phase === 'reflect' ? 'reflect' : 'plan') : 'perform') : (complete ? 'recorded' : 'upcoming'));
                      var label = (procedureProtocol.actions || [])[index] || procedureActionLabel(action);
                      return React.createElement('li', { key: action, className: 'diss-technique-roadmap__step', 'data-technique-action': action, 'data-step-state': state, 'aria-current': current ? 'step' : undefined },
                        React.createElement('span', { className: 'diss-technique-roadmap__number', 'aria-hidden': true }, index + 1),
                        React.createElement('div', { className: 'diss-technique-roadmap__step-body' },
                          React.createElement('strong', null, label),
                          React.createElement('span', { className: 'diss-technique-roadmap__step-state' }, labels[state])
                        )
                      );
                    })
                  )
                )
              )
            );
          }
`;
replace('Derived native protocol overview','          function renderProcedureLearningCheckpoint() {',renderer+'          function renderProcedureLearningCheckpoint() {');
replace('Place progress inside the existing visible checkpoint','              "data-learning-action": learningAction, tabIndex: -1, role: "region", "aria-labelledby": "diss-learning-check-title"\n            },','              "data-learning-action": learningAction, tabIndex: -1, role: "region", "aria-labelledby": "diss-learning-check-title"\n            },\n              renderTechniqueRoadmap(),');
replace('Honest review wording',"title: 'Specimen investigation complete', description: 'Review your evidence", "title: 'Review your specimen investigation', description: 'Review your evidence");
new vm.Script(after);let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.after).length!==2)throw Error('Inverse uniqueness');inverse=inverse.replace(e.after,()=>e.before);}if(inverse!==before)throw Error('Inverse bytes');fs.writeFileSync(path.join(__dirname,'renderer-next.js'),after);fs.writeFileSync(path.join(__dirname,'renderer-edits.json'),JSON.stringify({beforeSha256:sha(before),afterSha256:sha(after),edits,syntax:true,exactReversal:true},null,2));console.log(JSON.stringify({sourceSha256:sha(after),edits:edits.length,syntax:true,exactReversal:true}));
