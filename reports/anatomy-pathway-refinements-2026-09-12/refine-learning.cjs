const fs=require('node:fs'),parser=require('@babel/parser');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),english={};
function T(key,value){english[key]=value;return "t('stem.anatomy."+key+"', "+JSON.stringify(value)+")";}
function rep(a,b,n=1){if(s.split(a).length-1!==n)throw Error('Missing/duplicate '+a.slice(0,100));s=s.split(a).join(b);}
const checks=JSON.parse(fs.readFileSync('reports/anatomy-pathway-refinements-2026-09-12/checks.json','utf8'));
let bank='        var PATHWAY_CONCEPT_CHECKS = {\n'+Object.entries(checks).map(([id,rows])=>'          '+id+': [\n'+rows.map(row=>{const key='route_check_'+id.slice(5)+'_'+row.id;return '            {id:'+JSON.stringify(row.id)+',step:'+row.step+',prompt:'+T(key+'_prompt',row.prompt)+',correct:'+JSON.stringify(row.correct)+',options:['+row.options.map(([id,text,feedback])=>'{id:'+JSON.stringify(id)+',text:'+T(key+'_'+id,text)+',feedback:'+T(key+'_'+id+'_feedback',feedback)+'}').join(',')+']}';}).join(',\n')+'\n          ]').join(',\n')+'\n        };\n';
rep('        // ── Pathway state ──',bank+'        // ── Pathway state ──');
const a=s.indexOf('        // ── Pathway recap: same retrieval'),b=s.indexOf('        function completeActivePathway(pw)',a);if(a<0||b<0)throw Error('Recap bounds');
s=s.slice(0,a)+`        // These questions assess pathway concepts, independently of diagram landmarks.
        var rawPathwayRecap = d._pathwayRecap && typeof d._pathwayRecap === 'object' && !Array.isArray(d._pathwayRecap) ? d._pathwayRecap : {};
        var pathwayRecapActive = !!activePathway && rawPathwayRecap.active === true && rawPathwayRecap.pathwayId === activePathwayId;
        function getPathwayRecapQuestions() { return activePathway ? PATHWAY_CONCEPT_CHECKS[activePathway.id] || [] : []; }
        function validPathwayAnswers(raw, questions) {
          var answers = {}; if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return answers;
          questions.forEach(function(question) { if (question.options.some(function(option) { return option.id === raw[question.id]; })) answers[question.id] = raw[question.id]; });
          return answers;
        }
        var pathwayRecapAnswers = pathwayRecapActive && rawPathwayRecap.version === 2 ? validPathwayAnswers(rawPathwayRecap.answers,getPathwayRecapQuestions()) : {};
        function answerPathwayRecap(question, optionId) {
          if (!activePathway || !question.options.some(function(option) { return option.id === optionId; })) return;
          var pathId = activePathway.id, questions = getPathwayRecapQuestions();
          setLabToolData(function(previous) {
            var state = previous.anatomy || {}, recap = state._pathwayRecap || {};
            if (state._activePathway !== pathId || recap.active !== true || recap.pathwayId !== pathId) return previous;
            var answers = recap.version === 2 ? validPathwayAnswers(recap.answers,questions) : {};
            if (answers[question.id]) return previous;
            answers[question.id] = optionId;
            var patch = {_pathwayRecap:{active:true,version:2,pathwayId:pathId,answers:answers}};
            if (questions.every(function(item) { return !!answers[item.id]; })) {
              patch._pathwayChecks = Object.assign({},state._pathwayChecks);
              patch._pathwayChecks[pathId] = {version:2,answers:Object.assign({},answers)};
            }
            return Object.assign({},previous,{anatomy:Object.assign({},state,patch)});
          });
          var option = question.options.find(function(item) { return item.id === optionId; });
          playSound(optionId === question.correct ? 'quizCorrect' : 'quizWrong');
          if (typeof announceToSR === 'function') announceToSR(option.feedback);
        }
        function pathwayCheckSummary(pathId) {
          var record = d._pathwayChecks && d._pathwayChecks[pathId], questions = PATHWAY_CONCEPT_CHECKS[pathId] || [];
          if (!record || record.version !== 2) return null;
          var answers = validPathwayAnswers(record.answers,questions);
          if (!questions.length || !questions.every(function(question) { return !!answers[question.id]; })) return null;
          return {correct:questions.filter(function(question) { return answers[question.id] === question.correct; }).length,total:questions.length};
        }
        function showPathwayDiagram(step) {
          updMulti(structureFocusPatch(step.structure, {_pathwayStep:pathwayStepIdx})); announceStructure(step.structure);
          setTimeout(function() { var panel = document.querySelector('[data-anatomy-model-shell]'); if (panel) { panel.focus({preventScroll:true}); panel.scrollIntoView({block:'start',behavior:'auto'}); } },0);
        }
        function reviewPathwayConcept(pw, question) {
          var step = pw.steps[question.step];
          updMulti(structureFocusPatch(step.structure,{_pathwayStep:question.step,_pathwayRecap:null})); announceStructure(step.structure);
          setTimeout(function() { var panel = document.querySelector('[data-anatomy-pathway-step]'); if (panel) { panel.focus({preventScroll:true}); panel.scrollIntoView({block:'nearest'}); } },0);
        }
`+s.slice(b);
const ra=s.indexOf('        function renderPathwayRecap(pw)'),rb=s.indexOf('        var pathwayIds',ra);if(ra<0||rb<0)throw Error('Render bounds');
s=s.slice(0,ra)+`        function renderPathwayRecap(pw) {
          var questions = getPathwayRecapQuestions(), answered = Object.keys(pathwayRecapAnswers).length;
          var done = answered === questions.length, correct = questions.filter(function(question) { return pathwayRecapAnswers[question.id] === question.correct; }).length;
          return h('section',{className:'anatomy-route-checks','data-anatomy-recap':'pathway','data-anatomy-recap-state':done?'done':'open','aria-labelledby':'anatomy-pathway-check-title'},
            h('h5',{id:'anatomy-pathway-check-title'},${T('route_check_title','Explain the pathway')}),
            h('p',null,${T('route_check_intro','Choose an explanation for each situation. These checks assess the process, not the nearby diagram marker.')}),
            h('p',{role:'status'},answered+'/'+questions.length+' '+${T('route_answered','answered')}),
            questions.map(function(question) {
              var chosen = pathwayRecapAnswers[question.id], selected = question.options.find(function(option) { return option.id === chosen; });
              return h('fieldset',{key:question.id,'data-anatomy-pathway-question':question.id},
                h('legend',null,question.prompt),
                question.options.map(function(option) { return h('button',{key:option.id,type:'button',disabled:!!chosen,'aria-pressed':chosen===option.id,'data-anatomy-pathway-option':option.id,'data-result':chosen ? option.id===question.correct?'correct':chosen===option.id?'incorrect':undefined : undefined,
                  onClick:function(){answerPathwayRecap(question,option.id);}},option.text); }),
                selected && h('div',{role:'status','data-anatomy-pathway-feedback':chosen===question.correct?'correct':'incorrect'},
                  h('strong',null,chosen===question.correct ? ${T('route_correct','Correct. ')} : ${T('route_rethink','Reconsider. ')}),selected.feedback,
                  chosen!==question.correct && h('p',null,${T('route_answer','Answer: ')}+question.options.find(function(option){return option.id===question.correct;}).text)),
                selected && chosen!==question.correct && h('button',{type:'button','data-anatomy-pathway-review':String(question.step),onClick:function(){reviewPathwayConcept(pw,question);}},${T('route_review_step','Revisit the related step')})
              );
            }),
            done && h('p',{role:'status'},correct+'/'+questions.length+' '+${T('route_score','concept checks correct. Reviewing a route and rating confidence are separate from these answers.')}),
            h('div',{className:'anatomy-route-actions'},
              h('button',{type:'button',onClick:function(){upd('_pathwayRecap',null);}},${T('route_back_steps','Back to the steps')}),
              h('button',{type:'button',disabled:!done,onClick:function(){completeActivePathway(pw);}},${T('route_finish','Finish pathway')}),
              !done && h('button',{type:'button',onClick:function(){completeActivePathway(pw);}},${T('route_finish_without_check','Finish without completing checks')})
            )
          );
        }
`+s.slice(rb);
rep("var diagramMatchesStep = !!stepContext && stepContext.systemId === sysKey && stepViewMatches;","var diagramMatchesStep = !!stepContext && stepContext.systemId === sysKey && stepViewMatches && selectedStructureId === step.structure;");
rep("h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3' },\n                  h('div', { className: 'flex items-center justify-between mb-2' }","h('div', { className: 'anatomy-pathway-panel bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3', 'data-anatomy-pathway-panel':true },\n                  h('div', { className: 'flex items-center justify-between mb-2' }");
rep("{ _activePathway: pw.id, _pathwayStep: 0 }","{ _activePathway: pw.id, _pathwayStep: 0, _pathwayRecap: null }");
rep("onClick: function() { updMulti({ _activePathway: null, _pathwayStep: 0 }); }","onClick: function() { updMulti({ _activePathway: null, _pathwayStep: 0, _pathwayRecap: null }); }");
rep("h('p', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed' }, pw.desc)","h('p', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed' }, pw.desc),\n                        pathwayCheckSummary(pw.id) ? h('p', {'data-anatomy-pathway-score':pw.id}, pathwayCheckSummary(pw.id).correct+'/'+pathwayCheckSummary(pw.id).total+' '+"+T('route_latest_score','correct on the latest completed concept check')+") : null");
rep("pathwayRecapActive ? renderPathwayRecap(pw) : step ? h('div', { className: 'rounded-xl p-4 border-2', role: 'status',","h('label', {className:'anatomy-route-jump',htmlFor:'anatomy-pathway-jump'}, "+T('route_jump','Go to step')+", h('select',{id:'anatomy-pathway-jump',value:pathwayStepIdx,onChange:function(event){var index=Number(event.target.value);if(!Number.isInteger(index)||!pw.steps[index])return;updMulti(structureFocusPatch(pw.steps[index].structure,{_pathwayStep:index,_pathwayRecap:null}));announceStructure(pw.steps[index].structure);}},pw.steps.map(function(item,index){return h('option',{key:index,value:index},(index+1)+'. '+item.label);}))),\n                      pathwayRecapActive ? renderPathwayRecap(pw) : step ? h('div', { className: 'rounded-xl p-4 border-2', 'data-anatomy-pathway-step':pathwayStepIdx, tabIndex:-1, role: 'status',");
rep("!diagramMatchesStep ? h('button', {\n                            onClick: function() { updMulti(structureFocusPatch(step.structure, { _pathwayStep: pathwayStepIdx })); announceStructure(step.structure); },","h('button', {\n                            'data-anatomy-pathway-diagram':true, onClick: function() { showPathwayDiagram(step); },");
rep("}, 'Focus diagram') : null","}, diagramMatchesStep ? "+T('route_show_marker','Show marker on diagram')+" : 'Focus diagram')");
rep("ttsBtn(step.detail, t('stem.anatomy.read_step_aloud', 'Read this step aloud'))","step.scope && h('p',{className:'anatomy-route-scope','data-anatomy-pathway-scope':step.structure},h('strong',null,"+T('route_marker_scope','What this marker shows: ')+"),step.scope),\n                        h('a',{href:pw.reference,target:'_blank',rel:'noopener noreferrer',className:'anatomy-route-reference'},"+T('route_reference','Read about this pathway — OpenStax')+"),\n                        ttsBtn(step.detail + (step.scope ? ' ' + step.scope : ''), t('stem.anatomy.read_step_aloud', 'Read this step aloud'))");
rep("_pathwayRecap: { active: true, pathwayId: pw.id, answers: {} }","_pathwayRecap: { active: true, version: 2, pathwayId: pw.id, answers: {} }");
rep("t('stem.anatomy.pathway_recap_announce', 'Pathway recap: answer a short clue for each step you traced.')",T('route_check_announce','Pathway check: choose explanations for two situations.'));
const css='.anatomy-pathway-panel{min-width:0}.anatomy-pathway-panel button{min-height:44px}.anatomy-route-jump{display:grid;gap:5px;font-size:13px;font-weight:700}.anatomy-route-jump select{width:100%;min-width:0;min-height:44px;font-size:16px;border:1px solid #64748b;border-radius:8px;padding:7px;background:#fff;color:#0f172a}.anatomy-route-scope{font-size:13px;line-height:1.5;border-inline-start:3px solid #64748b;padding:8px;margin-block:8px;background:#f1f5f9;color:#334155}.anatomy-route-reference{display:block;font-size:12px;color:#075985;text-decoration:underline;margin-block:8px}.anatomy-route-checks{display:grid;gap:12px;font-size:13px;line-height:1.5;color:#0f172a}.anatomy-route-checks h5{font-weight:800;font-size:16px}.anatomy-route-checks fieldset{min-width:0;border:1px solid #94a3b8;border-radius:10px;padding:10px;display:grid;gap:8px;background:#fff}.anatomy-route-checks legend{font-weight:800;max-width:100%}.anatomy-route-checks button{padding:8px;border:1px solid #64748b;border-radius:8px;text-align:start;background:#fff;color:#0f172a;font-weight:700}.anatomy-route-checks button[data-result=correct]{border:2px solid #047857;background:#ecfdf5;color:#065f46}.anatomy-route-checks button[data-result=incorrect]{border:2px solid #be123c;background:#fff1f2;color:#9f1239}.anatomy-route-actions{display:flex;gap:8px;flex-wrap:wrap}.anatomy-route-actions button:disabled{opacity:.6}.anatomy-pathway-panel :focus-visible{outline:3px solid #0891b2;outline-offset:3px}.theme-dark .anatomy-route-scope,.theme-dark .anatomy-route-checks fieldset{background:#0f172a!important;color:#e2e8f0!important}.theme-dark .anatomy-route-checks,.theme-dark .anatomy-route-jump{color:#e2e8f0}.theme-dark .anatomy-route-reference{color:#7dd3fc}.theme-dark .anatomy-pathway-panel .anatomy-route-checks button,.theme-dark .anatomy-route-jump select{background:#1e293b!important;color:#e2e8f0!important}.theme-dark .anatomy-pathway-panel .anatomy-route-checks button[data-result=correct]{background:#064e3b!important;color:#ecfdf5!important}.theme-dark .anatomy-pathway-panel .anatomy-route-checks button[data-result=incorrect]{background:#881337!important;color:#fff1f2!important}@media(max-width:900px){.anatomy-tool-shell[data-anatomy-tab="pathways"] .anatomy-side-column{order:-1}}';
rep("      '.theme-dark .anatomy-tool-shell{color:",'      '+JSON.stringify(css)+',\n'+"      '.theme-dark .anatomy-tool-shell{color:");
parser.parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);fs.writeFileSync('reports/anatomy-pathway-refinements-2026-09-12/learning-english.json',JSON.stringify(english,null,2)+'\n');console.log(Object.keys(english).length+' pathway question and navigation strings added.');
