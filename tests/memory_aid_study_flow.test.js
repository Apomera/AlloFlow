import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
let React,ReactDOM,act,host,root,H;
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
beforeAll(()=>{
  React=require(resolve('desktop/web-app/node_modules/react'));ReactDOM=require(resolve('desktop/web-app/node_modules/react-dom/client'));act=React.act;
  global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
  loadAlloModule('image_asset_editor_module.js');loadAlloModule('memory_aid_module.js');loadAlloModule('generate_dispatcher_module.js');loadAlloModule('studio_response_module.js');
  H=window.AlloModules.MemoryAid._testing;
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());if(host)host.remove();root=host=null;window.sessionStorage.clear();window.localStorage.clear();});
const card=(id='one',extra={})=>({id,target:'Solid shape and volume',type:'keyword-association',mode:'generated',essentialFacts:['Solids keep their shape.','Solids have a definite volume.'],factLocked:true,factVerified:true,aiExample:'Solid statue: same shape, same space.',mapping:'The statue holds its shape and occupies the same space.',studentDraft:'',visualStatus:'on-demand',...extra});
const data=(cards=[card()])=>({schemaVersion:2,resourceId:'study-flow',title:'States of matter',authorshipMode:'generated',reflectionLevel:'quick',cards});
async function mount(initial=data(),overrides={}){
  host=document.createElement('div');document.body.append(host);root=ReactDOM.createRoot(host);
  let current={type:'memory-aid',id:'study-flow',data:initial};
  const onChange=vi.fn();
  function App(){const [resource,setResource]=React.useState(current);return React.createElement(window.AlloModules.MemoryAidView,{generatedContent:resource,isTeacherMode:false,isProcessing:false,activeProfileId:'study-learner',handleNoteUpdate:(key,value)=>setResource(prev=>{const next={...prev,data:{...prev.data,[key]:typeof value==='function'?value(prev.data[key]):value}};current=next;onChange(next);return next;}),addToast:()=>{},callGemini:async()=>'{}',...overrides});}
  await act(async()=>root.render(React.createElement(App)));return {get resource(){return current;},onChange};
}
const visible=node=>!!node&&!node.closest('[hidden]');
const button=text=>[...host.querySelectorAll('button')].find(b=>visible(b)&&b.textContent===text);
async function click(text){const b=button(text);expect(b,'visible button: '+text).toBeTruthy();await act(async()=>b.click());}
async function input(node,value){expect(node).toBeTruthy();await act(async()=>{const setter=Object.getOwnPropertyDescriptor(node instanceof window.HTMLTextAreaElement?window.HTMLTextAreaElement.prototype:window.HTMLSelectElement.prototype,'value').set;setter.call(node,value);node.dispatchEvent(new Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});}

describe('Memory aid focused study flow',()=>{
  it('leads with a usable cue, shows one target, and saves personalization across target navigation',async()=>{
    const result=await mount(data([card(),card('two',{target:'Liquid shape'})]));
    expect([...host.querySelectorAll('article')].filter(visible)).toHaveLength(1);
    expect([...host.querySelectorAll('textarea')].filter(visible)).toHaveLength(0);
    expect(host.querySelector('.memory-aid-study').textContent).toContain('Solid statue');
    await click('Make it mine');
    await input(host.querySelector('textarea[id$="-draft"]'),'My solid sculpture');
    await click('Next');
    expect([...host.querySelectorAll('article')].find(visible).querySelector('h2').textContent).toBe('Liquid shape');
    await click('Previous');
    expect(host.querySelector('.memory-aid-study').textContent).toContain('My solid sculpture');
    expect(result.resource.data.cards[0].studentDraft).toBe('My solid sculpture');
  });
  it('hides answer-bearing titles, pictures, mappings and playback during unsupported recall',async()=>{
    const speak=vi.fn();await mount(data([card('one',{visualImage:PNG,visualAlt:'A statue on a table.',visualAltSource:'author'})]),{handleSpeak:speak});
    await click('Try recall');
    const choice=[...host.querySelectorAll('input[type=radio]')].find(i=>visible(i)&&i.parentElement.textContent==='Without hints');
    await act(async()=>choice.click());await click('Start recall practice');
    expect([...host.querySelectorAll('h2')].filter(visible).map(h=>h.textContent)).toEqual(['Memory target 1']);
    expect([...host.querySelectorAll('img')].filter(visible)).toHaveLength(0);
    expect(button('Listen to practice cue')).toBeUndefined();
    expect(host.querySelector('[aria-label="Recall response for Solid shape and volume"]')).toBeNull();
    await input(host.querySelector('[aria-label="Recall response for Memory target"]'),'It keeps its shape and volume.');
    await click('Reveal the facts');
    expect([...host.querySelectorAll('h3')].filter(visible).some(h=>h.textContent.includes('Compare your recall'))).toBe(true);
    expect(speak.mock.calls.every(call=>call[0]==='')).toBe(true);
  });
  it('retains recall support level in normalized private evidence',()=>{
    const c=card();const attempt=H.createMemoryAidPracticeAttempt(c,{supportMode:'none',response:'Shape and volume.',confidence:'somewhat'});
    expect(attempt.supportMode).toBe('none');expect(H.normalizeMemoryAidPracticeAttempt(attempt,c,0).supportMode).toBe('none');
    expect(H.normalizeMemoryAidPracticeAttempt({...attempt,supportMode:undefined},c,0).supportMode).toBe('cue');
  });
  it('accepts a described visual-only cue for feedback and preserves its state through the response boundary',()=>{
    const c=card('one',{aiExample:'',visualImage:PNG,visualAlt:'A solid sculpture standing on a table.',visualAltSource:'author',visualNeedsReview:true});
    expect(H.memoryAidFeedbackReady(c,false).ok).toBe(true);
    const api=window.AlloModules.StudioResponse;
    const resource={id:'r',type:'memory-aid',data:data([c])};
    const response=api.responseFromData('memory-aid',resource.data);
    expect(response.cards[0].visualAltSource).toBe('author');expect(response.cards[0].visualNeedsReview).toBe(true);
  });
  it('shows a retry when a saved resource contains interrupted pending pictures',async()=>{
    const generate=vi.fn(async()=>PNG);await mount({...data([card('one',{visualStatus:'generating'})]),visualsPending:true},{isTeacherMode:true,callImagen:generate});
    await click('Retry picture');expect(generate).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.memory-aid-study img').getAttribute('src')).toBe(PNG);
  });
  it('uses the existing setup state for complete aids and supports a single target',async()=>{
    host=document.createElement('div');document.body.append(host);root=ReactDOM.createRoot(host);
    const count=vi.fn();await act(async()=>root.render(React.createElement(window.AlloModules.MemoryAidPanel,{expandedTools:['memory-aid'],hasSourceOrAnalysis:true,setMemoryAidCount:count,handleGenerate:()=>{}})));
    expect(host.querySelector('[aria-label="What will learners do?"]').value).toBe('study');
    await input(host.querySelector('[aria-label="Number of memory targets"]'),'1');expect(count).toHaveBeenCalledWith(1);
    expect(host.querySelector('details').open).toBe(false);
  });
  it('keeps unmapped facts visible and respects text-only visual support',async()=>{
    await mount(data([card('one',{visualStatus:'off',visualKind:'groups',connections:[{cue:'Shape',factIndex:0,explanation:'A statue holds its shape.'},{cue:'Invalid',factIndex:null}]})]));
    const study=host.querySelector('.memory-aid-study');
    expect(study.querySelector('.memory-aid-diagram')).toBeNull();
    expect(study.textContent).toContain('Solids have a definite volume.');
    expect(study.textContent).not.toContain('Invalid');
  });
  it('sets a changed picture aside until the learner confirms that it still fits',async()=>{
    await mount(data([card('one',{visualImage:PNG,visualAlt:'A solid statue.',visualAltSource:'author',visualNeedsReview:true})]));
    expect(host.querySelector('.memory-aid-study img')).toBeNull();
    await click('Make it mine');await click('This picture still fits my cue');await click('Study');
    expect(host.querySelector('.memory-aid-study img')).not.toBeNull();
    expect(H.memoryAidPracticeReady(card('one',{aiExample:'',visualImage:PNG,visualAlt:'A solid statue.',visualAltSource:'author',visualNeedsReview:true})).ok).toBe(false);
  });
});

describe('Memory aid progressive visual delivery',()=>{
  it('does not overwrite a changed cue, edited title, manual picture or deleted/reordered card',()=>{
    const merge=window.AlloModules.GenDispatcher.mergeMemoryAidProgress;
    const baseline=data([card('one',{visualStatus:'queued'}),card('two',{visualStatus:'queued'}),card('three',{visualStatus:'queued'})]);
    const progress={id:'r',type:'memory-aid',data:{...baseline,cards:baseline.cards.map(c=>({...c,visualImage:PNG,visualStatus:'ready'}))}};
    const current={id:'r',type:'memory-aid',title:'Teacher title',data:{...baseline,cards:[{...baseline.cards[1],studentDraft:'A changed cue'},baseline.cards[0]]}};
    const result=merge(current,progress,baseline,true);
    expect(result.title).toBe('Teacher title');expect(result.data.cards.map(c=>c.id)).toEqual(['two','one']);
    expect(result.data.cards[0].studentDraft).toBe('A changed cue');expect(result.data.cards[0].visualImage).toBeUndefined();
    expect(result.data.cards[1].visualImage).toBe(PNG);expect(result.data.visualsPending).toBe(false);
    expect(merge({...current,id:'other'},progress,baseline,true).id).toBe('other');
    const manual={...current,data:{...baseline,cards:[{...baseline.cards[0],visualImage:'data:image/png;base64,TUFOVUFM',visualStatus:'ready'}]}};
    expect(merge(manual,progress,baseline,true).data.cards[0].visualImage).toContain('TUFOVUFM');
  });
  it.each([['ready', PNG], ['failed', '']])('publishes text before image completion and keeps one resource when the image is %s',async(status,imageResult)=>{
    const source=readFileSync(resolve('generate_dispatcher_source.jsx'),'utf8');
    const from=source.indexOf("} else if (type === 'memory-aid') {");const to=source.indexOf("} else if (type === 'anchor-chart') {",from);
    const branch=source.slice(from,to).replace("} else if",'if')+'}';
    const run=Function('env','with(env){return (async()=>{let content;let metaInfo;let memoryProgress=null;let memoryBaseline=null;'+branch+';return content;})();}');
    let resolveImage;const pending=new Promise(r=>{resolveImage=r;});let history=[],active=null;
    const env={window,type:'memory-aid',switchView:true,keepLoading:false,generatedContent:null,configOverride:{},memoryAidSelectionMode:'auto-mix',memoryAidTypes:[],memoryAidAuthorshipMode:undefined,memoryAidReflectionLevel:'quick',memoryAidReasoningRequired:false,memoryAidCount:1,memoryAidIncludeVisuals:true,memoryAidIncludeHookFacts:false,usesLocalTextBackend:false,textToProcess:'Solids retain shape and volume.',sourceTopic:'Matter',effectiveGrade:'4',effectiveLanguage:'English',languageDirective:'',standardsDirective:'',emojiDirective:'',dokDirective:'',effCustomInstructions:'',universalImageStyle:'',imageGenerationStyle:'',useLowQualityVisuals:false,generationSignal:null,setIsProcessing:()=>{},setActiveView:()=>{},setGenerationStep:()=>{},setGenerationTaskProgress:()=>{},warnLog:()=>{},addToast:()=>{},t:()=>'',cleanJson:x=>x,sanitizeMemoryAidPromptData:window.AlloModules.GenDispatcher.sanitizeMemoryAidPromptData,mergeMemoryAidProgress:window.AlloModules.GenDispatcher.mergeMemoryAidProgress,throwIfGenerationAborted:()=>{},getDefaultTitle:()=> 'Memory aids',_buildItemConfig:()=>({}),setHistory:update=>{history=typeof update==='function'?update(history):update;},setGeneratedContent:update=>{active=typeof update==='function'?update(active):update;},callGemini:async()=>JSON.stringify({title:'Matter',cards:[card('model',{visualKind:'image',visualIdea:'A solid statue.'})]}),callImagen:()=>pending,callImagenWithSignal:()=>pending,callGeminiVision:null};
    const completion=run(env);await Promise.resolve();await Promise.resolve();
    expect(active.data.cards[0].aiExample).toContain('Solid statue');expect(active.data.cards[0].mode).toBe('generated');expect(active.data.visualsPending).toBe(true);expect(history).toHaveLength(1);
    const originalId=active.id;resolveImage(imageResult);const result=await completion;
    expect(active.id).toBe(originalId);expect(active.data.visualsPending).toBe(false);expect(active.data.cards[0].visualImage || '').toBe(imageResult);expect(active.data.cards[0].visualStatus).toBe(status);expect(result.cards).toHaveLength(1);expect(history).toHaveLength(1);
  });
});
