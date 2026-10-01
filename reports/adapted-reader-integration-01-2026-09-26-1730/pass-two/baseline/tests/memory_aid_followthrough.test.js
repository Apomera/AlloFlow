import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
let React,DOM,act,root,host,H,rules;
const makeCard=extra=>({id:'solid',target:'A solid keeps its shape',type:'keyword-association',mode:'generated',essentialFacts:['A solid keeps its shape.','A solid has a definite volume.'],factLocked:true,factVerified:true,aiExample:'A solid statue stays in shape.',mapping:'The statue holds its shape and occupies space.',applicationQuestion:'A wooden block moves from a tall jar to a wide bowl. What changes?',applicationGuidance:'The block retains its own shape and volume in either container.',visualStatus:'off',...extra});
const makeData=cards=>({resourceId:'follow-through',title:'Solids keep shape and volume',schemaVersion:2,cards:cards||[makeCard()]});
beforeAll(()=>{
  React=require(resolve('desktop/web-app/node_modules/react'));DOM=require(resolve('desktop/web-app/node_modules/react-dom/client'));act=React.act;
  global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
  for(const f of ['image_asset_editor_module.js','memory_aid_module.js','studio_response_module.js','doc_pipeline_module.js','generate_dispatcher_module.js'])loadAlloModule(f);
  H=window.AlloModules.MemoryAid._testing;rules=window.AlloModules.MemoryAid.exportRules;
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());if(host)host.remove();root=host=null;window.localStorage.clear();window.sessionStorage.clear();});
async function mount(data=makeData(),props={}){host=document.createElement('div');document.body.append(host);root=DOM.createRoot(host);const update=vi.fn();await act(async()=>root.render(React.createElement(window.AlloModules.MemoryAidView,{generatedContent:{id:'follow-through',type:'memory-aid',data},isTeacherMode:false,activeProfileId:'follow-through-learner',isProcessing:false,handleNoteUpdate:update,addToast:()=>{},...props})));return update;}
const visible=n=>n&&!n.closest('[hidden]');
async function click(name){const b=[...host.querySelectorAll('button')].find(b=>visible(b)&&b.textContent===name);expect(b,'Button '+name).toBeTruthy();await act(async()=>b.click());}
async function input(el,value){expect(el).toBeTruthy();const proto=el.tagName==='SELECT'?window.HTMLSelectElement.prototype:el.tagName==='INPUT'?window.HTMLInputElement.prototype:window.HTMLTextAreaElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
async function completeRecall(){await click('Try recall');await click('Start recall practice');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'A solid keeps its shape and volume.');await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());}
describe('Memory Aid application and later review',()=>{
  it('normalizes review dates, preserves private application evidence, and preserves review plans after cue edits',()=>{
    const card=makeCard(),attempt=H.createMemoryAidPracticeAttempt(card,{response:'Shape and volume.',supportMode:'none'});
    const completed=H.normalizeMemoryAidPracticeAttempt({...attempt,factChecks:['recalled','practice'],nextReviewDate:'2026-09-20',applicationQuestion:'New situation',applicationResponse:'Private explanation',applicationRevealed:true,applicationCheck:'revisit'},card,0);
    expect(rules.reviewPlan(card,[completed],'2026-09-21')).toMatchObject({due:true,needsPractice:true,date:'2026-09-20'});
    expect(completed.applicationResponse).toBe('Private explanation');
    expect(H.normalizeMemoryAidPracticeAttempt({...completed,nextReviewDate:'2026-02-30'},card,0).nextReviewDate).toBe('');
    expect(rules.reviewPlan({...card,studentDraft:'Changed cue'},[completed])).toMatchObject({earlierCue:true,needsPractice:true,date:'2026-09-20',latest:{id:completed.id}});
    expect(rules.reviewPlan(card,[{...completed,nextReviewDate:'',reviewSchedule:'off'}]).date).toBe('');
  });
  it('saves an application response and chosen date privately, then clears the next attempt',async()=>{
    const update=await mount();await completeRecall();
    await input(host.querySelector('[aria-label="Your explanation"]'),'The wooden block keeps its shape and volume in the bowl.');
    await click('Compare my explanation');
    await input(host.querySelector('[aria-label="Review again on"]'),'2026-09-20');
    await click('Save private practice plan');
    expect(host.textContent).toContain('Private practice plan saved.');
    const saved=H.loadMemoryAidPrivatePractice('resource:follow-through',[makeCard()],'follow-through-learner');
    expect(saved.solid[0]).toMatchObject({nextReviewDate:'2026-09-20',applicationResponse:'The wooden block keeps its shape and volume in the bowl.'});
    expect(JSON.stringify(update.mock.calls)).not.toContain('wooden block');
    await click('Practice again');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'Same shape and volume.');await click('Reveal the facts');
    for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('');
  });
  it('allows keeping a supplied cue or copying it for editing without marking its picture stale',async()=>{
    const update=await mount();await click('Make it mine');expect(host.textContent).toContain('Current memory cue');await click('Use this cue');
    expect(update).not.toHaveBeenCalled();await click('Make it mine');await click('Edit a copy');
    const updater=update.mock.calls.at(-1)[1];const changed=updater([makeCard()]);expect(changed[0].studentDraft).toBe('A solid statue stays in shape.');expect(changed[0].visualNeedsReview).toBe(false);
  });
  it('never enables private follow-up saving in teacher preview',async()=>{
    await mount(makeData(),{isTeacherMode:true});await completeRecall();
    expect([...host.querySelectorAll('button')].some(b=>b.textContent==='Save private practice plan')).toBe(false);
  });
});
describe('Memory Aid export presets',()=>{
  const buildPipeline=()=>window.AlloModules.createDocPipeline({callGemini:async()=>'{}',callGeminiVision:async()=>'{}',callImagen:async()=>null,addToast:()=>{},t:key=>key,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=> 'Document',state:{}});
  it('omits all answer and private evidence fields from unsupported worksheets, including the pack topic',()=>{
    const data=makeData([makeCard({visualImage:'data:image/png;base64,AAAA',visualAlt:'ANSWER_DESCRIPTION',studentReasoning:'PRIVATE_REASONING',practiceAttempts:[{response:'PRIVATE_ATTEMPT'}]})]);
    data.memoryAidExportPreset='no-hints';
    const html=buildPipeline().generateFullPackHTML([{id:'r',type:'memory-aid',title:'Recall practice',data}],'ANSWER_IN_TOPIC',true,{}, {includeTeacherKey:false,annotations:[]});
    for(const secret of ['ANSWER_IN_TOPIC','ANSWER_DESCRIPTION','PRIVATE_REASONING','PRIVATE_ATTEMPT','A solid keeps its shape','solid statue','wooden block'])expect(html).not.toContain(secret);
    expect(rules.renderPreset({...data,memoryAidExportPositions:[3]},'no-hints')).toContain('Memory target 3');
    expect(html).not.toContain('<script');
    expect(html).toContain('Memory target 1');expect(html).toContain('Recall response');expect(html).not.toContain('<img');
  });
  it('prints the chosen cue and all facts in study cards while excluding private work',()=>{
    const html=rules.renderPreset(makeData([makeCard({studentDraft:'My selected cue',studentReasoning:'PRIVATE_REASONING'})]),'study');
    expect(html).toContain('My selected cue');expect(html).not.toContain('solid statue');expect(html).toContain('definite volume');expect(html).not.toContain('PRIVATE_REASONING');
  });
  it('includes application guidance in the teacher key and never implies an unrecorded human review',()=>{
    const html=rules.renderPreset(makeData(),'teacher');expect(html).toContain('The block retains');expect(html).toContain('Ready to study');expect(html).not.toContain('Reviewed by you');
  });
  it('passes the selected preset and target scope to the host without changing the saved resource',async()=>{
    const onPrint=vi.fn();const data=makeData([makeCard(),makeCard({id:'second',target:'Second target'})]);const update=await mount(data,{onPrint});
    await input(host.querySelector('[aria-label="Format"]'),'no-hints');await input(host.querySelector('[aria-label="Include targets"]'),'current');await click('Open export preview');
    expect(onPrint.mock.calls[0][0].data.cards).toHaveLength(1);expect(onPrint.mock.calls[0][0].data.memoryAidExportPreset).toBe('no-hints');expect(data.memoryAidExportPreset).toBeUndefined();
  });
});
describe('Memory Aid target preview',()=>{
  it('lets a teacher edit proposed targets and sends the original source token when building',async()=>{
    host=document.createElement('div');document.body.append(host);root=DOM.createRoot(host);
    const generate=vi.fn(async()=>({targets:['Solids'],source:'Original lesson'}));
    await act(async()=>root.render(React.createElement(window.AlloModules.MemoryAidPanel,{expandedTools:['memory-aid'],hasSourceOrAnalysis:true,isProcessing:false,handleGenerate:generate})));
    await click('Preview and edit targets');await input(host.querySelector('[aria-label="Proposed target 1"]'),'Solid shape and volume');await click('Build memory aids');
    expect(generate.mock.calls[0]).toEqual(['memory-aid',null,false,null,{memoryAidPreviewOnly:true},false]);
    expect(generate.mock.calls[1][4]).toEqual({memoryAidTargets:['Solid shape and volume'],memoryAidPreviewSource:'Original lesson',memoryAidCount:1});
  });
  it.each(['preview','changed-source'])('does not generate images or save a resource for %s',async mode=>{
    const source=readFileSync(resolve('generate_dispatcher_source.jsx'),'utf8');const from=source.indexOf("} else if (type === 'memory-aid') {");const to=source.indexOf("} else if (type === 'anchor-chart') {",from);const branch=source.slice(from,to).replace('} else if','if')+'}';
    const run=Function('env','with(env){return (async()=>{let content;let metaInfo;let memoryProgress=null;let memoryBaseline=null;'+branch+';return content;})();}');
    const env={window,type:'memory-aid',switchView:false,keepLoading:false,generatedContent:{},configOverride:mode==='preview'?{memoryAidPreviewOnly:true}:{memoryAidPreviewSource:'Old source'},memoryAidSelectionMode:'auto-mix',memoryAidTypes:[],memoryAidAuthorshipMode:'generated',memoryAidReflectionLevel:'quick',memoryAidReasoningRequired:false,memoryAidCount:1,memoryAidIncludeVisuals:true,memoryAidIncludeHookFacts:false,usesLocalTextBackend:false,textToProcess:'Original lesson',sourceTopic:'Matter',effectiveGrade:'4',effectiveLanguage:'English',languageDirective:'',standardsDirective:'',emojiDirective:'',dokDirective:'',effCustomInstructions:'',universalImageStyle:'',imageGenerationStyle:'',useLowQualityVisuals:false,generationSignal:null,setIsProcessing:()=>{},setActiveView:vi.fn(),setGenerationStep:()=>{},setGenerationTaskProgress:()=>{},warnLog:()=>{},addToast:()=>{},t:()=>'',cleanJson:x=>x,sanitizeMemoryAidPromptData:window.AlloModules.GenDispatcher.sanitizeMemoryAidPromptData,mergeMemoryAidProgress:window.AlloModules.GenDispatcher.mergeMemoryAidProgress,throwIfGenerationAborted:()=>{},getDefaultTitle:()=> 'Memory aids',_buildItemConfig:()=>({}),setHistory:vi.fn(),setGeneratedContent:vi.fn(),callGemini:vi.fn(async()=>JSON.stringify({title:'Matter',cards:[makeCard()]})),callImagen:vi.fn(),callGeminiVision:null};
    const result=await run(env);expect(env.callImagen).not.toHaveBeenCalled();expect(env.setHistory).not.toHaveBeenCalled();expect(env.setGeneratedContent).not.toHaveBeenCalled();
    if(mode==='preview')expect(result).toEqual({targets:['A solid keeps its shape'],source:'Original lesson'});else{expect(result.memoryAidPreviewExpired).toBe(true);expect(env.callGemini).not.toHaveBeenCalled();}
  });
});
