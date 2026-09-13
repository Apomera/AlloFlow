import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { parse } from '@babel/parser';

// Execute the actual component handlers with controlled providers and mutable refs.
// Deferred promises reproduce races without making paid generation requests.
const source = fs.readFileSync('view_renderers_source.jsx', 'utf8');
const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const component = ast.program.body.flatMap(n => n.declarations || []).find(n => n.id.name === 'MemoryPalaceView').init;
const names = ['retryRecall', '_recallStopsToStrengthen', '_inRecallScope', 'advanceRecall', 'finishRecall', 'submitRecallAnswer', 'revealCurrent', 'revealSelfCheck', 'markSelfCheck', 'totalItems', 'recallEligible', '_quickPreviewValid', 'handleQuickVariant', 'persistPalace', '_beginArtJob', '_endArtJob', '_artTarget', '_artTargetValid', '_artDiscarded', '_saveGeneratedImage', '_persistObject', '_quickSnapshot', 'handleDirectSubmit', 'handleDirectGenerate', 'handleQuickCreate', 'handleQuickUndo', 'handleAiRefine', 'handleFurnish', 'handleSculpt'];
const declarations = component.body.body.flatMap(n => n.declarations || []).filter(n => names.includes(n.id.name));
const factory = new Function('env', 'with (env) {\n' + declarations.map(n => 'const ' + source.slice(n.start,n.end) + ';').join('\n') + '\nreturn {' + names.join(',') + '}; }');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<30;i++) await Promise.resolve(); };
let env, h, a, b;
beforeEach(() => {
  new Function(fs.readFileSync('memory_palace_module.js','utf8'))();
  new Function(fs.readFileSync('prim3d_module.js','utf8'))();
  const data = { main:'Water', branches:[{title:'Sky',items:['Evaporation','Condensation'],mnemonics:['Giant kettle','Knitting cloud']}] };
  const palace=window.AlloModules.MemoryPalace.buildPalace(data);
  a=palace.loci.find(l=>l.id==='b0_i0'); b=palace.loci.find(l=>l.id==='b0_i1');
  env={ React:{useMemo:fn=>fn()}, ready:true, window, data, title:'Water', t:()=>null, noWalk:false, recall:false, canImagen:true,
    recallOrderRef:{current:[a.id,b.id]}, recallResultsRef:{current:{}}, attemptsTotalRef:{current:0}, finishedRef:{current:false}, elapsedRef:{current:0},
    finished:null, selfRevealId:null, answered:0, playSound:vi.fn(), onScoreUpdate:vi.fn(), onGameComplete:vi.fn(),
    _resetRecallRun:vi.fn(()=>{env.recallResultsRef.current={};env.finished=null;env.finishedRef.current=false;}),
    pendingRecall:[], _laterRecall:fn=>env.pendingRecall.push(fn),
    currentRef:{current:a}, palaceRef:{current:palace}, mpRef:{current:{}}, aliveRef:{current:true},
    artScopeRef:{current:'water'}, artJobRef:{current:null}, genCancelRef:{current:false},
    handleRef:{current:Object.fromEntries(['goTo','revealLocus','setLocusStatus','setLocusImage','setLocusRelief','setLocusObject','replaceLocusObject','clearLocus','setLocusBusy'].map(k=>[k,vi.fn()]))},
    _PALACE_OWNED:['images','depths','objects','stamps','covered'],
    directType:'image', directPrompt:'A giant kettle', directEval:null, directBusy:null,
    reliefOn:false, quickCreateRef:{current:null}, nearbyEmptyRef:{current:a.id},
    refinePrompt:'Add a red hat', refineBusy:false, furnishing:null, sculpting:null, images:{}, depths:{},objects3d:{},
    addToast:vi.fn(), callImagen:vi.fn().mockResolvedValue('data:image/png;base64,new'),
    persist:vi.fn(), setNearbyEmpty:vi.fn(), setStopRequested:vi.fn(),
  };
  for(const key of ['Recall','Finished','RecallSaid','RecallHint','CanReveal','TypedAnswer','Answered','WrongFlash','SelfRevealId','ArtJob','DirectBusy','DirectEval','DirectPrompt','QuickCreate','RefineBusy','RefinePrompt','Furnishing','Sculpting']) {
    const field=key[0].toLowerCase()+key.slice(1);
    env['set'+key]=vi.fn(v=>{env[field]=typeof v==='function'?v(env[field]):v;if(key==='QuickCreate')env.quickCreateRef.current=v;});
  }
  window.callGemini=vi.fn().mockResolvedValue('{"verdict":"ok","enhancedPrompt":"A giant kettle"}');
  h=factory(env);
});
const recipe = JSON.stringify({name:'new sculpture',parts:[{shape:'sphere',size:[1,1,1],position:[0,0.5,0],color:'#ff0000'}]});

describe('Memory Palace generation lifecycle',()=>{
 it('keeps the original destination when prompt evaluation finishes after walking on',async()=>{
   const d=deferred();window.callGemini.mockReturnValueOnce(d.promise);
   const pending=h.handleDirectSubmit();env.currentRef.current=b;d.resolve('{"verdict":"ok"}');await pending;
   expect(env.mpRef.current.images[a.id]).toContain('data:image');expect(env.mpRef.current.images[b.id]).toBeUndefined();
   expect(env.artJobRef.current).toBeNull();
 });
 it('does not treat malformed evaluation as permission to generate',async()=>{
   window.callGemini.mockResolvedValue('unparseable');await h.handleDirectSubmit();
   expect(env.callImagen).not.toHaveBeenCalled();expect(env.addToast).toHaveBeenCalledWith(expect.stringContaining('Could not check'),'error');
   expect(env.artJobRef.current).toBeNull();
 });
 it('blocks rapid duplicate submissions and competing generation modes',async()=>{
   const d=deferred();window.callGemini.mockReturnValue(d.promise);
   const pending=h.handleDirectSubmit();h.handleDirectSubmit();h.handleQuickCreate('image',a);h.handleFurnish();h.handleSculpt();
   expect(window.callGemini).toHaveBeenCalledTimes(1);expect(env.callImagen).not.toHaveBeenCalled();
   d.resolve('{"verdict":"reject"}');await pending;expect(env.artJobRef.current).toBeNull();
 });
 it('replaces an existing sculpture in the live scene as well as storage',async()=>{
   env.directType='sculpture';env.mpRef.current={objects:{[a.id]:{name:'old'}}};
   window.callGemini.mockResolvedValueOnce('{"verdict":"ok"}').mockResolvedValueOnce(recipe);
   await h.handleDirectSubmit();
   expect(env.handleRef.current.replaceLocusObject).toHaveBeenCalledWith(a.id,expect.objectContaining({name:'new sculpture'}));
   expect(env.mpRef.current.objects[a.id].name).toBe('new sculpture');
 });
 it('drops obsolete depth, stamp names and covered images when replacing a frame',async()=>{
   env.mpRef.current={images:{[a.id]:'stamp'},depths:{[a.id]:'old-depth'},stamps:{[a.id]:'star'},covered:{[a.id]:{image:'buried'}},mastery:{keep:1}};
   await h.handleDirectSubmit();
   for(const key of ['depths','stamps','covered'])expect(env.mpRef.current[key][a.id]).toBeUndefined();
   expect(env.mpRef.current.mastery).toEqual({keep:1});
 });
 it('retains a usable flat image when the optional depth request throws synchronously',async()=>{
   env.reliefOn=true;env.callImagen.mockResolvedValueOnce('image').mockImplementationOnce(()=>{throw Error('offline');});
   await h.handleDirectSubmit();expect(env.mpRef.current.images[a.id]).toBe('image');expect(env.artJobRef.current).toBeNull();
 });
 it.each(['content','decoration','unmount'])('ignores a late image after %s changes',async(change)=>{
   const d=deferred();env.callImagen.mockReturnValue(d.promise);const pending=h.handleDirectSubmit();await flush();
   if(change==='content')env.artScopeRef.current='new-content';
   if(change==='decoration')env.mpRef.current={images:{[a.id]:'student-stamp'}};
   if(change==='unmount')env.aliveRef.current=false;
   d.resolve('late');await pending;
   expect(env.persist).not.toHaveBeenCalled();expect(env.handleRef.current.setLocusImage).not.toHaveBeenCalled();
 });
 it('clears the quick-create busy state after a synchronous image provider failure',async()=>{
   env.callImagen.mockImplementation(()=>{throw Error('offline');});h.handleQuickCreate('image',a);await flush();
   expect(env.artJobRef.current).toBeNull();expect(env.quickCreateRef.current).toBeNull();expect(env.handleRef.current.setLocusBusy).toHaveBeenLastCalledWith(a.id,false);
 });
 it('restores covered artwork with quick-create Undo',async()=>{
   const covered={image:'original',depth:'depth'};env.mpRef.current={images:{[a.id]:'stamp'},stamps:{[a.id]:'star'},covered:{[a.id]:covered}};
   h.handleQuickCreate('image',a);await flush();expect(env.mpRef.current.covered[a.id]).toBeUndefined();
   h.handleQuickUndo();expect(env.mpRef.current.covered[a.id]).toEqual(covered);expect(env.mpRef.current.images[a.id]).toBe('stamp');
 });
 it('does not overwrite a manual sculpture change while AI refinement is pending',async()=>{
   const d=deferred();env.mpRef.current={objects:{[a.id]:{name:'old',parts:[]}}};window.callGemini.mockReturnValue(d.promise);
   h.handleAiRefine();await flush();env.mpRef.current={objects:{[a.id]:{name:'manually changed'}}};d.resolve(recipe);await flush();
   expect(env.persist).not.toHaveBeenCalled();expect(env.artJobRef.current).toBeNull();
 });
 it('stops a batch after the current cue and keeps that completed cue',async()=>{
   const d=deferred();env.callImagen.mockReturnValue(d.promise);h.handleFurnish();await flush();env.genCancelRef.current=true;d.resolve('first');await flush();
   expect(env.callImagen).toHaveBeenCalledTimes(1);expect(env.mpRef.current.images[a.id]).toBe('first');expect(env.furnishing).toBeNull();expect(env.artJobRef.current).toBeNull();
 });
 it('continues a batch after a synchronous provider failure without losing later results',async()=>{
   env.callImagen.mockImplementationOnce(()=>{throw Error('offline');}).mockResolvedValueOnce('second');
   h.handleFurnish();await flush();expect(env.mpRef.current.images[b.id]).toBe('second');expect(env.furnishing).toBeNull();expect(env.artJobRef.current).toBeNull();
 });
 it('merges sequential saves before the parent rerenders',async()=>{
   env.callImagen.mockResolvedValueOnce('first').mockResolvedValueOnce('second');h.handleFurnish();await flush();
   expect(env.mpRef.current.images).toEqual({[a.id]:'first',[b.id]:'second'});
 });
});


describe('Memory Palace saved previews and practice entry',()=>{
 it('keeps saved versions and Undo after a failed regeneration',async()=>{
   env.mpRef.current={images:{[a.id]:'original'}};
   h.handleQuickCreate('image',a);await flush();const saved=env.quickCreateRef.current;
   env.callImagen.mockRejectedValueOnce(Error('offline'));
   h.handleQuickCreate('image',saved,saved.previous);await flush();
   expect(env.quickCreateRef.current.status).toBe('ready');expect(env.quickCreateRef.current.variants).toEqual(saved.variants);
   expect(env.quickCreateRef.current.error).toContain('saved cue');
   h.handleQuickUndo();expect(env.mpRef.current.images[a.id]).toBe('original');
 });
 it.each(['undo','variant','regenerate'])('does not let stale preview %s overwrite a later edit',async(action)=>{
   h.handleQuickCreate('image',a);await flush();const saved=env.quickCreateRef.current;env.persist.mockClear();env.callImagen.mockClear();
   env.mpRef.current={...env.mpRef.current,images:{[a.id]:'student edit'}};
   if(action==='undo')h.handleQuickUndo();else if(action==='variant')h.handleQuickVariant(0);else h.handleQuickCreate('image',saved,saved.previous);
   await flush();expect(env.mpRef.current.images[a.id]).toBe('student edit');expect(env.persist).not.toHaveBeenCalled();expect(env.callImagen).not.toHaveBeenCalled();
 });
 it('blocks preview mutations while another generator owns the art lock',async()=>{
   h.handleQuickCreate('image',a);await flush();env.persist.mockClear();env.artJobRef.current={kind:'refine'};
   h.handleQuickUndo();h.handleQuickVariant(0);expect(env.persist).not.toHaveBeenCalled();expect(env.quickCreateRef.current.status).toBe('ready');
 });
 it('keeps a completed cue reviewable after the learner walks away during creation',async()=>{
   const d=deferred();env.callImagen.mockReturnValue(d.promise);h.handleQuickCreate('image',a);
   env.currentRef.current=b;env.nearbyEmptyRef.current=null;d.resolve('new');await flush();
   expect(env.quickCreateRef.current).toMatchObject({id:a.id,status:'ready'});h.handleQuickUndo();expect(env.mpRef.current.images[a.id]).toBeUndefined();
 });
 it('lets a learner choose a saved version and still undo to the original cue',async()=>{
   env.mpRef.current={images:{[a.id]:'original'}};env.callImagen.mockResolvedValueOnce('first').mockResolvedValueOnce('second');
   h.handleQuickCreate('image',a);await flush();const first=env.quickCreateRef.current;h.handleQuickCreate('image',first,first.previous);await flush();
   h.handleQuickVariant(0);expect(env.mpRef.current.images[a.id]).toBe('first');h.handleQuickUndo();expect(env.mpRef.current.images[a.id]).toBe('original');
 });
 it('allows two-stop practice and counts valid student-created locations',()=>{
   expect(h.recallEligible).toBe(true);expect(h.totalItems).toBe(2);
   env.data={main:'Test',branches:[{title:'Room',items:['Only fact']}],memoryPalace:{extraLoci:[{id:'xl1',room:'b0',label:'My second fact'}]}};
   const withMine=factory(env);expect(withMine.totalItems).toBe(2);expect(withMine.recallEligible).toBe(true);
   env.data={main:'Test',branches:[{title:'Room',items:['Only fact']}]};expect(factory(env).recallEligible).toBe(false);
 });
});


describe('Memory Palace recall completion and scope',()=>{
 it('advances after a missed self-check and completes an all-missed walk once',()=>{
   env.recall={mode:'self'};
   h.revealSelfCheck();h.markSelfCheck(false);h.markSelfCheck(false);
   expect(env.answered).toBe(1);expect(env.attemptsTotalRef.current).toBe(1);
   env.pendingRecall.shift()();expect(env.handleRef.current.goTo).toHaveBeenLastCalledWith(env.palaceRef.current.route.indexOf(b.id));
   env.currentRef.current=b;h.revealSelfCheck();h.markSelfCheck(false);env.pendingRecall.shift()();
   expect(env.finished).toMatchObject({total:2,firstTry:0,eventual:0,perfect:false});
   expect(Object.keys(env.mpRef.current.mastery).sort()).toEqual([a.id,b.id].sort());
   h.advanceRecall();expect(env.onGameComplete).toHaveBeenCalledTimes(1);
 });
 it.each(['submit','reveal','selfReveal','rate'])('ignores %s outside the focused review',action=>{
   env.recall={mode:'self',focused:true};env.recallOrderRef.current=[b.id];env.selfRevealId=a.id;
   if(action==='submit')h.submitRecallAnswer(a.label,a.id);
   if(action==='reveal')h.revealCurrent();
   if(action==='selfReveal')h.revealSelfCheck();
   if(action==='rate')h.markSelfCheck(true);
   expect(env.recallResultsRef.current).toEqual({});expect(env.attemptsTotalRef.current).toBe(0);
   expect(env.handleRef.current.revealLocus).not.toHaveBeenCalled();
   h.advanceRecall();expect(env.handleRef.current.goTo).toHaveBeenLastCalledWith(env.palaceRef.current.route.indexOf(b.id));
 });
 it('scores and schedules only selected stops even if another result is present',()=>{
   env.recallOrderRef.current=[b.id];
   const previous={strength:0.8,due:'2030-01-01T00:00:00.000Z'};env.mpRef.current={mastery:{[a.id]:previous}};
   env.recallResultsRef.current={[a.id]:{attempts:3,correct:false,revealed:true},[b.id]:{attempts:1,correct:true,revealed:false}};
   h.finishRecall();expect(env.finished).toMatchObject({total:1,firstTry:1,perfect:true});
   expect(env.mpRef.current.mastery[a.id]).toEqual(previous);
   expect(env.onGameComplete).toHaveBeenCalledWith('palaceRecall',expect.objectContaining({totalItems:1,incorrectPlacements:[]}));
 });
 it('tracks incorrect-answer feedback with the recall session timers',()=>{
   env.recall={mode:'type'};h.submitRecallAnswer('wrong',null);
   expect(env.wrongFlash).toBe(true);expect(env.pendingRecall).toHaveLength(1);
   env.pendingRecall.shift()();expect(env.wrongFlash).toBe(false);
 });
});


describe('Memory Palace readable recall feedback',()=>{
 it('holds a revealed answer until the learner continues and ignores duplicate reveals',()=>{
   env.recall={mode:'bank'};h.submitRecallAnswer('wrong',null);env.pendingRecall.shift()();
   h.revealCurrent();h.revealCurrent();
   expect(env.recallResultsRef.current[a.id]).toMatchObject({attempts:1,correct:false,revealed:true});
   expect(env.answered).toBe(1);expect(env.pendingRecall).toHaveLength(0);expect(env.wrongFlash).toBe(false);
   expect(env.handleRef.current.goTo).not.toHaveBeenCalled();
   h.advanceRecall();expect(env.handleRef.current.goTo).toHaveBeenCalledWith(env.palaceRef.current.route.indexOf(b.id));
 });
 it('does not let a previous stop clear the current stop incorrect feedback',()=>{
   env.recall={mode:'bank'};h.submitRecallAnswer('wrong',null);
   env.currentRef.current=b;h.submitRecallAnswer('wrong',null);
   env.pendingRecall.shift()();expect(env.wrongFlash).toBe(true);
   env.pendingRecall.shift()();expect(env.wrongFlash).toBe(false);
 });
 it('does not let an earlier attempt clear newer feedback at the same stop',()=>{
   env.recall={mode:'bank'};h.submitRecallAnswer('wrong',null);h.submitRecallAnswer('still wrong',null);
   env.pendingRecall.shift()();expect(env.wrongFlash).toBe(true);
   expect(env.handleRef.current.setLocusStatus).not.toHaveBeenCalledWith(a.id,null);
   env.pendingRecall.shift()();expect(env.wrongFlash).toBe(false);
 });
});


describe('Memory Palace follow-up practice',()=>{
 it('lists only difficult stops, preserving order and explaining the outcome',()=>{
   env.finished={total:2};env.recallResultsRef.current={[a.id]:{correct:true,attempts:2},[b.id]:{correct:false,revealed:true}};
   expect(h._recallStopsToStrengthen()).toEqual([
     expect.objectContaining({id:a.id,reason:'retried',label:a.label,mnemonic:a.mnemonic}),
     expect.objectContaining({id:b.id,reason:'revealed'})
   ]);
   env.recallOrderRef.current=[b.id];expect(h._recallStopsToStrengthen().map(x=>x.id)).toEqual([b.id]);
 });
 it('omits first-try answers and remembered self-ratings, and never exposes answers during practice',()=>{
   env.finished={total:2};env.recallResultsRef.current={[a.id]:{correct:true,attempts:1},[b.id]:{correct:true,selfRated:true,attempts:1}};
   expect(h._recallStopsToStrengthen()).toEqual([]);
   env.recallResultsRef.current[b.id].correct=false;expect(h._recallStopsToStrengthen()).toEqual([expect.objectContaining({id:b.id,reason:'missed'})]);
   env.finished=null;expect(h._recallStopsToStrengthen()).toEqual([]);
 });
 it('captures and deduplicates a selected retry before clearing results',()=>{
   env.recall={mode:'self',direction:'backward'};env.finished={total:2};
   h.retryRecall('forward',[b.id,b.id,'gone']);
   expect(env._resetRecallRun).toHaveBeenCalledTimes(1);expect(env.recallOrderRef.current).toEqual([b.id]);
   expect(env.recall).toMatchObject({mode:'self',direction:'forward',focused:true,startAt:b.id});
 });
 it.each([[],['gone'],['b0_i0']].map(selection=>[selection]))('does not broaden invalid selected review %j',selection=>{
   env.recall={mode:'bank',focused:true};env.recallOrderRef.current=[b.id];
   h.retryRecall('forward',selection);expect(env._resetRecallRun).not.toHaveBeenCalled();expect(env.recallOrderRef.current).toEqual([b.id]);
 });
 it('keeps the focused subset for later backwards or shuffled retries',()=>{
   env.recall={mode:'bank',focused:true};env.recallOrderRef.current=[b.id];
   h.retryRecall('backward');expect(env.recallOrderRef.current).toEqual([b.id]);expect(env.recall.focused).toBe(true);
   h.retryRecall('shuffle');expect(env.recallOrderRef.current).toEqual([b.id]);expect(env.recall.direction).toBe('shuffle');
 });
});
