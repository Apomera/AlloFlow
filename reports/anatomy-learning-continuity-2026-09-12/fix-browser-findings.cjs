const fs=require('node:fs');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function rep(a,b,n=1){if(s.split(a).length-1!==n)throw Error(a);s=s.split(a).join(b);}
rep('.anatomy-motion-node span{display:block;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#64748b;}','.anatomy-motion-node span{display:block;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#475569;}');
rep("activeTab === 'explore' && sel ? h('section', { className: 'anatomy-mobile-brief'","activeTab === 'explore' && sel && !showSystemsMotion ? h('section', { className: 'anatomy-mobile-brief'");
rep("!focusedAnatomyWorkspace && activeTab === 'explore' && structuresViewedCount === 0","!focusedAnatomyWorkspace && !showSystemsMotion && activeTab === 'explore' && structuresViewedCount === 0");
rep('        function toggleSystemsMotionPerturbation() {',`        function focusMotionLearning(selector) {
          setTimeout(function() { var target = document.querySelector(selector); if (target) { target.focus({preventScroll:true}); target.scrollIntoView({block:'nearest'}); } }, 0);
        }
        function toggleSystemsMotionPerturbation() {`);
rep("upd('_systemsMotionPredicting', systemsMotionScenarioId);","upd('_systemsMotionPredicting', systemsMotionScenarioId);\n            focusMotionLearning('[data-anatomy-motion-prediction]');");
rep("'data-anatomy-motion-prediction': systemsMotionScenarioId },","'data-anatomy-motion-prediction': systemsMotionScenarioId, tabIndex: -1 },");
rep("_regionalAtlasClinical: nextPerturbation && currentIsDisruptionPoint\n          });","_regionalAtlasClinical: nextPerturbation && currentIsDisruptionPoint\n          });\n          if (nextPerturbation) focusMotionLearning('[data-systems-motion-impact]');");
rep("'data-systems-motion-impact': systemsMotionScenario.perturbation.id\n","'data-systems-motion-impact': systemsMotionScenario.perturbation.id, tabIndex: -1\n");
rep("h('h3', { id: 'anatomy-systems-motion-title' },","h('h3', { id: 'anatomy-systems-motion-title', tabIndex: -1 },");
rep("if (event.target.value === 'systemsMotion') openSystemsMotionStep(0); else", "if (event.target.value === 'systemsMotion') { openSystemsMotionStep(0); focusMotionLearning('#anatomy-systems-motion-title'); } else");
require('@babel/parser').parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);console.log('Guided mode now prioritizes its content, moves focus to new questions/results, and fixes pathway contrast.');
