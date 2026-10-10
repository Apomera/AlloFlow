import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_WATCH_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_engine.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js')),C=require(path.join(runtime,'recipe_lab_clock.js')),Cooking=require(path.join(runtime,'recipe_lab_cooking.js')),Sampling=require(path.join(runtime,'recipe_lab_sampling.js')),Sauce=require(path.join(runtime,'recipe_lab_sauce_check.js')),W=require(path.join(runtime,'recipe_lab_vessel_watch.js'));
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
function act(s,action,value){const next=R.act(s,action,value);expect(next.log.at(-1).accepted).toBe(true);return next;}
function pasta(){let s=R.start();for(const [a,v] of [['fill'],['measure',160],['potHeat',3]])s=act(s,a,v);while(s.pot.temp<96)s=act(s,'advance',60);s=act(s,'pasta');return act(s,'stirPot');}
function prepared(id='mushroom'){let s=R.start(id);for(const a of ['wash','rinse','cut','dry','garlicPrep','oil','produce','garlic'])s=act(s,a);return s;}
function dish(){let s=pasta();for(const a of ['wash','rinse','cut','dry','garlicPrep','oil','produce','garlic','sample','reserve','drain'])s=act(s,a);s=act(s,'potHeat',0);s=act(s,'combine');return act(s,'taste');}
function finished(){let s=act(dish(),'plate');return R.submit({...s,answers:[0,0]});}
afterEach(()=>vi.restoreAllMocks());

describe('The shared-clock watch is a read-only view of visible vessels',()=>{
 it('starts with public empty-vessel cues and navigation rather than a check',()=>{
  const s=R.start(),m=W.describe(s);expect(m.mode).toBe('live');expect(m.time).toBe(0);expect(m.summary).toContain('Looking records no check');expect(m.pot.cue).toBe(Cooking.describe(s).pot.note);expect(m.pan.cue).toBe(Cooking.describe(s).pan.note);expect(m.pot.lastCheck).toBeNull();expect(m.pan.lastCheck).toBeNull();expect(m.pot.route).toMatchObject({tool:'camera',view:'pot',enabled:true});expect(m.pan.route).toMatchObject({tool:'camera',view:'pan',enabled:true});expect(m.pot.route.detail).toContain('records no texture or temperature check');expect(m.pan.route.detail).toContain('records no coating check');expect(m.pot.reminder.status).toBe('none');expect(m.pot.visual).toMatchObject({water:false,pasta:false,bubbles:'still'});
 });
 it('labels numerical vessel temperatures as modeled, not a manually taken reading',()=>{
  const s=act(R.start(),'fill'),m=W.describe(s);expect(m.pot.context).toContain('22°C modeled water');expect(m.pan.context).toContain('22°C modeled pan');expect(m.pot.context).not.toMatch(/reading|measured|probe/i);expect(m.pot.route.tool).toBe('probe');expect(m.pot.lastCheck).toBeNull();expect(m.pot.route.detail).toContain('takes no temperature reading');
 });
 it('does not label an empty pot with a water temperature',()=>{
  const m=W.describe(R.start());expect(m.pot.context).toContain('No cooking water');expect(m.pot.context).not.toContain('°C');
 });
 it('uses observable bubbling tokens and a covered-lid prerequisite',()=>{
  let s=act(R.start(),'fill');s=act(s,'potHeat',3);while(s.pot.temp<96)s=act(s,'advance',60);const open=W.describe(s);expect(open.pot.visual.bubbles).toBe('rolling');expect(open.pot.route.tool).toBe('probe');s=act(s,'lidPlace','covered');const covered=W.describe(s);expect(covered.pot.visual.covered).toBe(true);expect(covered.pot.visual.bubbles).toBe('rolling');expect(covered.pot.route).toMatchObject({tool:'lid',view:'lid',enabled:true});expect(covered.pot.context).toContain('Lid covered');expect(covered.pot.route.detail).toContain('records no new check');
 });
 it('opens sampling for undrained pasta and keeps unsampled texture hidden',()=>{
  const s=pasta(),m=W.describe(s);expect(m.pot.route).toMatchObject({tool:'sample',view:'sample',enabled:true});expect(m.pot.lastCheck).toBeNull();expect(m.pot.checkText).toContain('No fork sample checked');expect(JSON.stringify(m)).not.toMatch(/Hard center|Still firm|Tender with|Overcooked|coreFraction|compression|progress/);expect(m.pot.route.detail).toContain('Opening the tool records no sample');
 });
 it('cannot reveal an unsampled readiness change through the model',()=>{
  const s=pasta(),early={...s,pot:{...s.pot,progress:.2}},late={...s,pot:{...s.pot,progress:1.4}};expect(W.describe(early)).toEqual(W.describe(late));
 });
 it('does not call hidden inspection, scoring, replay or cooking APIs',()=>{
  const s=pasta();for(const method of ['inspect','criteria','evidence','replay','act'])vi.spyOn(R,method).mockImplementation(()=>{throw Error('Unexpected '+method);});expect(()=>W.describe(s)).not.toThrow();
 });
 it('uses actual pan placement without describing a trivet as receiving burner heat',()=>{
  let s=act(prepared(),'panHeat',3);s=act(s,'advance',30);s=act(s,'panPlace','trivet');const m=W.describe(s);expect(m.pan.visual.site).toBe('trivet');expect(m.pan.context).toContain('On trivet; no burner input');expect(m.pan.context).toContain('Pan burner high');expect(m.pan.cue).toBe(Cooking.describe(s).pan.note);expect(m.pan.attentionText).toBe(R.monitor(s).find(c=>c.zone==='pan'&&c.level==='attention').text);expect(m.pan.attention).toBe(true);
 });
 it('prioritizes an existing empty-heated-pot warning and exposes its exact cause in text',()=>{
  const s=act(R.start(),'potHeat',2),m=W.describe(s),warning=R.monitor(s).find(c=>c.zone==='pot'&&c.level==='attention');expect(m.pot.attention).toBe(true);expect(m.pot.attentionText).toBe(warning.text);expect(m.pan.attention).toBe(false);expect(m.pan.attentionText).toBe('');
 });
 it('routes uncombined individual pieces to the deliberate Food lens',()=>{
  const s=prepared('tomato'),m=W.describe(s);expect(m.pan.route).toMatchObject({tool:'inspect',view:'inspect',enabled:true});expect(m.pan.route.detail).toContain('Opening the lens keeps no view');expect(m.pan.lastCheck).toBeNull();expect(m.pan.visual).toMatchObject({food:true,recipe:'tomato',surface:Cooking.describe(s).pan.type});
 });
 it('routes a combined dish to its coating gesture without treating the cue as a recorded check',()=>{
  const s=act(R.startRescue('dry',0),'water'),m=W.describe(s);expect(m.pan.route).toMatchObject({tool:'sauce-check',view:'sauce-check',enabled:true});expect(m.pan.lastCheck).toBeNull();expect(m.pan.checkText).toBe('No coating check recorded.');expect(m.pan.route.detail).toContain('Opening the tool records no coating check');
 });
 it('keeps a legacy whole-pan cook navigable without inventing individual pieces',()=>{
  const current=prepared(),legacy={...current,panModel:1,pieceModel:0,pan:{...current.pan,pieces:[]}},m=W.describe(legacy);expect(m.pan.route).toMatchObject({tool:'camera',view:'pan',enabled:true});expect(m.pan.route.detail).toContain('whole-pan view');expect(m.pan.visual.food).toBe(true);expect(m.pan.lastCheck).toBeNull();
 });
});

describe('Checks come from accepted observations and retain their freshness',()=>{
 it('shows an accepted sample with its true timestamp and only recorded texture',()=>{
  const s=act(pasta(),'sample'),r=Sampling.reading(s),m=W.describe(s);expect(m.pot.lastCheck).toEqual({kind:r.kind,time:r.time,label:r.label,observation:r.observation,stale:false});expect(m.pot.checkText).toContain(r.label);expect(m.pot.checkText).toContain('recorded sample, not live texture');expect(m.pot.lastCheck).not.toHaveProperty('range');expect(m.pot.lastCheck).not.toHaveProperty('coreFraction');
 });
 it('keeps the original sample reading after real cooking changes and marks it stale',()=>{
  const checked=act(pasta(),'sample'),before=W.describe(checked).pot.lastCheck,later=act(checked,'advance',30),m=W.describe(later);expect(m.pot.lastCheck).toMatchObject({time:before.time,label:before.label,stale:true});expect(m.pot.checkText).toContain('food changed since this check');expect(m.pot.lastCheck.observation).toBe(before.observation);
 });
 it('becomes fresh only after another accepted sample action',()=>{
  let s=act(pasta(),'sample');s=act(s,'advance',30);expect(W.describe(s).pot.lastCheck.stale).toBe(true);s=act(s,'sample');const m=W.describe(s);expect(m.pot.lastCheck.stale).toBe(false);expect(m.pot.lastCheck.time).toBe(s.time);
 });
 it('ignores rejected sample attempts rather than inventing check evidence',()=>{
  const s=R.act(R.start(),'sample'),m=W.describe(s);expect(s.log.at(-1).accepted).toBe(false);expect(m.pot.lastCheck).toBeNull();expect(m.pot.checkText).toContain('No fork sample checked');
 });
 it('keeps a drained-pot sample as a past observation and routes looking, not another sample',()=>{
  let s=act(pasta(),'sample');const old=Sampling.reading(s);s=act(s,'drain');const m=W.describe(s);expect(m.pot.lastCheck.label).toBe(old.label);expect(m.pot.route).toMatchObject({tool:'camera',view:'pot',enabled:true});expect(m.pot.visual).toMatchObject({water:false,pasta:false,drained:true});expect(m.pot.context).not.toContain('modeled water');
 });
 it('does not count the supplied rescue sample as a learner check',()=>{
  const s=R.startRescue('dry',0),m=W.describe(s);expect(s.pot.sample).toBeTruthy();expect(m.pot.lastCheck).toBeNull();expect(m.pot.checkText).toContain('Provided rescue pasta; no learner fork sample recorded');expect(m.pot.checkText).not.toContain(s.pot.sample.texture);expect(m.pan.lastCheck).toBeNull();
 });
 it('uses accepted sauce checks and marks them stale after a real adjustment',()=>{
  const checked=act(R.startRescue('dry',0),'taste'),r=Sauce.reading(checked);expect(W.describe(checked).pan.lastCheck).toEqual({kind:r.kind,time:r.time,label:r.label,observation:r.observation,stale:false});const changed=act(checked,'water'),m=W.describe(changed);expect(m.pan.lastCheck.label).toBe(r.label);expect(m.pan.lastCheck.stale).toBe(true);expect(m.pan.checkText).toContain('dish changed since this check');
 });
 it('uses a fresh new coating check after folding and checking again',()=>{
  let s=act(R.startRescue('dry',0),'taste');s=act(s,'water');s=act(s,'stirSweep','gesture');s=act(s,'taste');const m=W.describe(s);expect(m.pan.lastCheck.stale).toBe(false);expect(m.pan.lastCheck.label).toBe(Sauce.reading(s).label);expect(m.pan.checkText).toContain('recorded coating observation');
 });
 it('returns independent check objects that cannot mutate saved inspection entries',()=>{
  const s=act(pasta(),'sample'),before=JSON.stringify(s),m=W.describe(s);m.pot.lastCheck.label='changed';m.pot.lastCheck.observation='changed';expect(JSON.stringify(s)).toBe(before);expect(W.describe(s).pot.lastCheck.label).toBe(Sampling.reading(s).label);
 });
});

describe('Check reminders follow simulated time and never imply doneness',()=>{
 it('responds to timer-only changes without an engine action or a changed cook',()=>{
  const s=frozen(pasta()),before=JSON.stringify(s),none=W.describe(s),timers=frozen({pot:C.create(s.time,30),pan:C.create(s.time,60)}),m=W.describe(s,{checkTimers:timers});expect(none.pot.reminder.status).toBe('none');expect(m.pot.reminder).toMatchObject({status:'waiting',dueAt:s.time+30,remaining:30});expect(m.pan.reminder).toMatchObject({status:'waiting',remaining:60});expect(m.pot.reminder.text).toContain('simulated time');expect(m.pot.route).toEqual(none.pot.route);expect(m.pot.lastCheck).toEqual(none.pot.lastCheck);expect(JSON.stringify(s)).toBe(before);expect(m.summary).not.toMatch(/ready|done/i);
 });
 it('marks the exact chosen deadline due after a real clock step without taking a sample',()=>{
  const initial=pasta(),timers={pot:C.create(initial.time,30),pan:C.create(initial.time,60)},s=act(initial,'advance',30),m=W.describe(s,{checkTimers:timers});expect(m.pot.reminder).toMatchObject({status:'elapsed',remaining:0,dueAt:s.time});expect(m.pot.attention).toBe(true);expect(m.pot.attentionText).toContain('chosen check time');expect(m.pan.reminder).toMatchObject({status:'waiting',remaining:30});expect(m.pot.lastCheck).toBeNull();expect(s.log.at(-1).action).toBe('advance');expect(JSON.stringify(m.pot.reminder)).not.toMatch(/ready|done|cooked/i);
 });
 it('prioritizes a visible warning over a coincident check reminder without losing either',()=>{
  let s=act(R.start(),'potHeat',2);const timers={pot:C.create(s.time,15),pan:null};s=act(s,'advance',15);const m=W.describe(s,{checkTimers:timers}),warning=R.monitor(s).find(c=>c.zone==='pot'&&c.level==='attention');expect(m.pot.reminder.status).toBe('elapsed');expect(m.pot.attentionText).toBe(warning.text);expect(m.pot.reminder.text).toContain('chosen check time');
 });
 it('normalizes reminder status conservatively through the canonical clock rules',()=>{
  const s=pasta(),timer={...C.create(s.time,30),status:'elapsed'},m=W.describe(s,{checkTimers:{pot:timer}});expect(m.pot.reminder.status).toBe('waiting');expect(m.pot.attention).toBe(false);expect(timer.status).toBe('elapsed');
 });
 it.each([{setAt:0,dueAt:31,status:'waiting'},{setAt:9999,dueAt:10029,status:'waiting'},{setAt:0,dueAt:Infinity,status:'waiting'},null])('ignores an invalid reminder %j without mutating it',timer=>{
  const s=R.start(),raw=frozen({pot:timer}),before=JSON.stringify(raw),m=W.describe(s,{checkTimers:raw});expect(m.pot.reminder.status).toBe('none');expect(m.pot.reminder.dueAt).toBeNull();expect(JSON.stringify(raw)).toBe(before);
 });
});

describe('The watch follows the displayed lifecycle without creating work',()=>{
 it('uses historical replay prefixes rather than later samples or live reminders',()=>{
  const done=finished(),sampleIndex=done.log.findIndex(e=>e.accepted&&e.action==='sample'),before=R.replay(done,sampleIndex).state,after=R.replay(done,sampleIndex+1).state,timers={pot:C.create(done.time,30),pan:C.create(done.time,60)},early=W.describe(before,{historical:true,checkTimers:timers}),checked=W.describe(after,{historical:true,checkTimers:timers});expect(early.mode).toBe('recorded');expect(early.time).toBe(before.time);expect(early.pot.lastCheck).toBeNull();expect(checked.pot.lastCheck).not.toBeNull();expect(checked.pot.lastCheck.time).toBe(after.time);for(const station of ['pot','pan']){expect(early[station].route.enabled).toBe(false);expect(early[station].reminder).toMatchObject({status:'recorded',dueAt:null,remaining:null});expect(checked[station].reminder.text).toContain('hidden in replay');}expect(checked.pot.lastCheck).toEqual(W.describe(after).pot.lastCheck);
 });
 it('disables new routes when the caller marks a view ended without changing its observations',()=>{
  const s=pasta(),live=W.describe(s),locked=W.describe(s,{ended:true});expect(locked.mode).toBe('finished');expect(locked.pot.route.enabled).toBe(false);expect(locked.pan.route.enabled).toBe(false);expect(locked.pot.cue).toBe(live.pot.cue);expect(locked.pot.lastCheck).toEqual(live.pot.lastCheck);expect(locked.pot.route.detail).toContain('locked');
 });
 it('keeps partial serving descriptive and disables new checks even with food still in the pan',()=>{
  let s=act(R.startRescue('dry',0),'taste');s=act(s,'servePortion',0);const m=W.describe(s);expect(R.serving(s).remaining).toBeGreaterThan(0);expect(m.mode).toBe('serving');expect(m.pan.visual.food).toBe(true);expect(m.pot.route.enabled).toBe(false);expect(m.pan.route.enabled).toBe(false);expect(m.summary).toContain('Return every spoonful');expect(m.pan.lastCheck.label).toBe(Sauce.reading(s).label);
 });
 it('shows an empty pan after all portions leave it without losing the accepted last coating check',()=>{
  let s=act(R.startRescue('dry',0),'taste');for(let i=0;i<8;i++)s=act(s,'servePortion',i%2);const m=W.describe(s);expect(R.serving(s).remaining).toBe(0);expect(m.pan.visual.food).toBe(false);expect(m.pan.cue).toContain('pan is empty');expect(m.pan.lastCheck).not.toBeNull();expect(m.pan.route.enabled).toBe(false);
 });
 it('keeps plated views descriptive and locked rather than reporting a food readiness score',()=>{
  const s=finished(),m=W.describe(s);expect(m.mode).toBe('finished');expect(m.pan.visual.food).toBe(false);expect(m.pan.cue).toContain('On the plates');expect(m.pot.route.enabled).toBe(false);expect(m.pan.route.enabled).toBe(false);expect(JSON.stringify(m)).not.toMatch(/criteria|score|independent|readiness/);
 });
 it('automatically locks canonical simulation limits',()=>{
  let s=R.start();for(let i=0;i<60;i++)s=act(s,'advance',60);const m=W.describe(s);expect(s.time).toBe(3600);expect(m.mode).toBe('finished');expect(m.pot.route.enabled).toBe(false);expect(m.pan.route.enabled).toBe(false);
 });
 it('does not cache a timer or route across a fresh cook',()=>{
  const old=pasta(),watched=W.describe(old,{checkTimers:{pot:C.create(old.time,30)}}),fresh=W.describe(R.start());expect(watched.pot.route.tool).toBe('sample');expect(fresh.pot.route.tool).toBe('camera');expect(fresh.pot.reminder.status).toBe('none');expect(fresh.pot.lastCheck).toBeNull();
 });
 it('does not retain references to deeply frozen cook or options across repeated descriptions',()=>{
  const s=frozen(dish()),options=frozen({historical:false,ended:false,checkTimers:{pot:C.create(s.time,30),pan:null}}),before=JSON.stringify({s,options}),a=W.describe(s,options),b=W.describe(s,options);expect(a).toEqual(b);expect(a).not.toBe(b);expect(a.pot).not.toBe(b.pot);expect(a.pot.visual).not.toBe(b.pot.visual);expect(a.pot.lastCheck).not.toBe(b.pot.lastCheck);expect(a.pot.reminder).not.toBe(b.pot.reminder);expect(a.pan.route).not.toBe(b.pan.route);a.pot.visual.water=false;a.pot.reminder.text='changed';a.pan.route.tool='changed';expect(JSON.stringify({s,options})).toBe(before);
 });
 it.each([null,{}, {...R.start(),time:NaN},{...R.start(),time:Infinity},{...R.start(),pot:{...R.start().pot,temp:Infinity}},{...R.start(),pan:{...R.start().pan,heat:4}}])('returns no misleading model for an absent or malformed base state %j',state=>{
  expect(W.describe(state)).toBeNull();
 });
});
