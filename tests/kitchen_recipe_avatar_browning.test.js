import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),A=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),'utf8');
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}
function fresh(mode='practice',model=A){return model.create({activity:'mushroom-turning',mode});}
function stage(s,kind,options={},model=A){let next=model.begin(s,kind,options);if(next===s)return s;while(next.pending.phase!=='ready')next=model.advance(next,next.pending.token);return next;}
function act(s,kind,options={},model=A){const ready=stage(s,kind,options,model);return ready===s?s:model.commit(ready,ready.pending.token);}
function turnAll(s,order=Array.from({length:14},(_,i)=>i)){for(const piece of order)s=act(s,'turnMushroom',{piece});return s;}
function finish(seconds=30,mode='practice'){let s=turnAll(fresh(mode));s=act(s,'waitPan',{seconds});s=turnAll(s);return act(s,'setPanHeat',{setting:0});}
function replay(s,model=A){const restored=model.restoreRecord(model.createRecord(s));expect(restored.state).toEqual(s.state);expect(restored.receipts).toEqual(s.receipts);expect(restored.setup).toEqual(s.setup);expect(restored.guide).toEqual(s.guide);expect(model.browning(restored)).toEqual(model.browning(s));return restored;}

describe('Mushroom turning uses persistent cooking faces and deliberate kitchen time',()=>{
 it('rebuilds and discloses its eleven-action supplied cook without supplying learner observations',()=>{
  const s=fresh();let expected=R.start('mushroom',2,'practice');for(const entry of s.setup.actions)expected=R.act(expected,entry.action,entry.value===null?undefined:entry.value,entry.interaction);
  expect(s.state).toEqual(expected);expect(s.setup).toMatchObject({id:'first-side-mushroom-browning-v1',provided:true,source:{kind:'recipe',id:'mushroom',servings:2},clockAtStart:195,produceGrams:200,oilMl:15,pieceCount:14});
  expect(s.setup.actions.map(a=>[a.action,a.value])).toEqual([['wash',null],['rinse',null],['cut',null],['dry',null],['oil',null],['panHeat',2],['advance',60],['advance',60],['produce',null],['advance',60],['advance',15]]);
  expect(s.state.pan.temp).toBeCloseTo(173.21055795472736,10);expect(s.state.pan.moisture).toBe(0);expect(s.state.pan.evaporatedWaterMl).toBe(35);expect(s.state.pan.heat).toBe(2);expect(s.state.pan.damage).toBe(0);expect(s.state.pan.combined).toBe(false);expect(s.state.pot.water).toBe(0);expect(s.state.pot.pasta).toBe(false);
  expect(s.setup.description).toContain('3:15');expect(s.setup.description).toContain('Turning and burner adjustments are untimed');expect(s.setup.description).toContain('does not prepare a complete pasta dish');expect(s.record.intents).toEqual([]);expect(s.receipts).toEqual([]);expect(s.reading).toBeNull();expect(s.inspectionFresh).toBe(false);
  const b=A.browning(s);expect(b).toMatchObject({pieceCount:14,crowdedCount:8,visible:{pale:14,golden:0,dark:0,scorched:0},revealedFaceCount:0,currentGoldenFaceCount:0,firstFacesRevealed:0,secondFacesRevealed:0,allFacesObserved:false,targetMet:false,lastReveal:null});
  for(const p of b.pieces){expect(p.faces).toEqual([null,null]);expect(p.topColor).toBe('pale');expect(p).not.toHaveProperty('bottomColor');expect(p).not.toHaveProperty('bottom');expect(p.turns).toBe(0);expect(p.lastReveal).toBeNull();}
 });
 it('exposes immutable evidence only for authentic mushroom sessions and registers distinct phases',()=>{
  const s=fresh(),b=A.browning(s);expect(Object.isFrozen(b)).toBe(true);expect(Object.isFrozen(b.pieces[0].anchor)).toBe(true);for(const candidate of [null,s.state,{...s},A.create()])expect(A.browning(candidate)).toBeNull();
  expect(A.getActivity('mushroom-turning')).toMatchObject({protocol:2,kinds:['turnMushroom','waitPan','setPanHeat'],tools:{turnMushroom:'tongs',waitPan:'none',setPanHeat:'dial'}});
  expect(A.phases.turnMushroom).toEqual(['pickup','position','grip','lift','turn','lower','ready']);expect(A.phases.waitPan).toEqual(['pickup','observe','ready']);expect(A.phases.setPanHeat).toEqual(['pickup','reach','adjust','ready']);expect(A.getActivity('mushroom-turning').steps).toHaveLength(30);
 });
 it('captures only the selected committed anchor and top face during a cancellable turn preview',()=>{
  const s=fresh('independent'),piece=R.panSurface(s.state).pieces[13],pending=A.begin(s,'turnMushroom',{piece:13,method:'pointer'});
  expect(pending.pending).toMatchObject({kind:'turnMushroom',piece:13,pieceTopColor:'pale',pieceAnchor:{x:450+205*piece.x,y:350+45*piece.z},intent:{piece:13,method:'pointer',actor:'learner'}});expect(pending.pending).not.toHaveProperty('pieceBottomColor');
  expect(pending.state).toBe(s.state);expect(pending.receipts).toBe(s.receipts);expect(A.browning(pending)).toEqual(A.browning(s));expect(A.cancel(pending,pending.pending.token).state).toBe(s.state);
 });
 it('turns exactly one selected piece without cooking, changing color values, or forging a sauce inspection',()=>{
  let s=fresh('independent');for(const [piece,method,interaction] of [[13,'pointer','scene-turn'],[0,'keyboard','keyboard'],[8,'button','scene-turn']]){
   const before=s;s=act(s,'turnMushroom',{piece,method});expect(s.state).toEqual(R.act(before.state,'flipPiece',piece,interaction));expect(s.state.time).toBe(195);expect(s.state.pan.temp).toBe(before.state.pan.temp);expect(s.state.pan.moisture).toBe(before.state.pan.moisture);
   s.state.pan.pieces.forEach((p,index)=>{expect(p.down).toBe(index===piece?1-before.state.pan.pieces[index].down:before.state.pan.pieces[index].down);expect(p.faces).toEqual(before.state.pan.pieces[index].faces);expect(p.damage).toEqual(before.state.pan.pieces[index].damage);});
   const p=s.state.pan.pieces[piece];expect(s.lastReceipt).toMatchObject({action:'flipPiece',value:piece,interaction,durationSeconds:0,inspection:null,transfer:null,mushroomTurn:{piece,fromDown:0,toDown:1,revealedFace:0,color:'golden',browning:p.faces[0],damage:0,time:195,x:p.x,z:p.z}});
   expect(s.reading).toBeNull();expect(s.inspectionFresh).toBe(false);expect(A.browning(s).lastReveal).toMatchObject({piece,face:0,color:'golden',time:195,actor:'learner',method,current:true,actionNumber:s.record.intents.length});
  }replay(s);
 });
 it('allows turning back to correct orientation while retaining both real surface histories',()=>{
  let s=act(fresh(),'turnMushroom',{piece:9});const first=s.lastReceipt.mushroomTurn;s=act(s,'turnMushroom',{piece:9});
  expect(s.state.pan.pieces[9].down).toBe(0);expect(s.lastReceipt.mushroomTurn).toMatchObject({piece:9,revealedFace:1,color:'pale',browning:0,time:195});expect(s.receipts[0].mushroomTurn).toEqual(first);
  const p=A.browning(s).pieces[9];expect(p.turns).toBe(2);expect(p.faces.map(f=>f.color)).toEqual(['golden','pale']);expect(p.faces.every(f=>f.current)).toBe(true);expect(s.guide.complete).toBe(false);expect(A.browning(s).currentGoldenFaceCount).toBe(1);
 });
 it('commits an interval through engine advance and applies time only on the explicit release',()=>{
  const before=turnAll(fresh()),pending=stage(before,'waitPan',{seconds:30,method:'keyboard'});expect(pending.pending.seconds).toBe(30);expect(pending.state).toBe(before.state);expect(pending.state.time).toBe(195);
  const s=A.commit(pending,pending.pending.token);expect(s.state).toEqual(R.act(before.state,'advance',30,'keyboard'));expect(s.lastReceipt).toMatchObject({action:'advance',value:30,interaction:'keyboard',durationSeconds:30,inspection:null});expect(s.state.log.at(-1)).not.toHaveProperty('durationSeconds');expect(s.state.time).toBe(225);
  expect(A.browning(s)).toMatchObject({waitCount:1,totalWaitSeconds:30,visible:{pale:0,golden:14,dark:0,scorched:0},revealedFaceCount:14,currentGoldenFaceCount:14,targetMet:false});expect(A.browning(s).pieces.every(p=>p.faces[1]===null)).toBe(true);
 });
 it('records a burner adjustment without instant cooling and refuses a repeated no-op setting',()=>{
  const initial=fresh('independent'),pending=stage(initial,'setPanHeat',{setting:0});expect(pending.pending.setting).toBe(0);expect(pending.state.pan.heat).toBe(2);
  const s=A.commit(pending,pending.pending.token);expect(s.state).toEqual(R.act(initial.state,'panHeat',0,'dial'));expect(s.state.pan.temp).toBe(initial.state.pan.temp);expect(s.state.time).toBe(195);expect(s.lastReceipt).toMatchObject({action:'panHeat',value:0,interaction:'dial',durationSeconds:0});
  expect(A.canBegin(s,'setPanHeat',{setting:0})).toBe(false);expect(A.begin(s,'setPanHeat',{setting:0})).toBe(s);const cooled=act(s,'waitPan',{seconds:30});expect(cooled.state.pan.temp).toBeLessThan(s.state.pan.temp);expect(cooled.state.pan.pieces[0].faces[0]).toBeGreaterThan(s.state.pan.pieces[0].faces[0]);expect(cooled.state.time).toBe(225);
 });
 it('rehearses every checkpoint without changing any committed piece, clock, evidence or record',()=>{
  const before=fresh('independent');for(const [kind,options] of [['turnMushroom',{piece:8}],['waitPan',{seconds:60}],['setPanHeat',{setting:3}]])for(let count=0;count<A.phases[kind].length;count++){
   let s=A.begin(before,kind,options);const token=s.pending.token;for(let n=0;n<count;n++)s=A.advance(s,token);expect(s.state).toBe(before.state);expect(s.record).toBe(before.record);expect(s.receipts).toBe(before.receipts);expect(s.guide).toBe(before.guide);expect(A.browning(s)).toEqual(A.browning(before));expect(A.commit(s,token-1)).toBe(s);expect(A.advance(s,token-1)).toBe(s);if(s.pending.phase!=='ready')expect(A.commit(s,token)).toBe(s);
   const canceled=A.cancel(s,token);expect(canceled.pending).toBeNull();expect(canceled.state).toBe(before.state);expect(A.createRecord(canceled)).toEqual(A.createRecord(before));expect(A.commit(canceled,token)).toBe(canceled);expect(A.restoreRecord(A.createRecord(s)).pending).toBeNull();
  }
 });
 it('demonstrates the exact thirty-action sequence with two real reveals per piece and one timed interval',()=>{
  let s=fresh('watch');for(let n=0;n<30;n++){const before=s;s=A.beginDemonstration(s);expect(s.pending).not.toBeNull();expect(s.pending.intent).toMatchObject({actor:'demonstrator',method:'demonstrator',mode:'watch',activity:'mushroom-turning'});while(s.pending.phase!=='ready'){expect(s.state).toBe(before.state);s=A.advance(s,s.pending.token);}s=A.commit(s,s.pending.token);expect(s.record.intents).toHaveLength(n+1);}
  expect(s.record.intents.map(i=>i.kind)).toEqual([...Array(14).fill('turnMushroom'),'waitPan',...Array(14).fill('turnMushroom'),'setPanHeat']);expect(s.record.intents[14].seconds).toBe(30);expect(s.record.intents[29].setting).toBe(0);expect(s.state.time).toBe(225);expect(s.state.pan.temp).toBeCloseTo(180.64202796034323,10);
  expect(A.browning(s)).toMatchObject({firstFacesRevealed:14,secondFacesRevealed:14,revealedFaceCount:28,currentGoldenFaceCount:28,burnerOff:true,targetMet:true,knownDarkFaces:0,knownScorchedFaces:0});expect(A.browning(s).pieces.every(p=>p.turns===2&&p.faces.every(f=>f.color==='golden'&&f.current))).toBe(true);expect(s.guide).toMatchObject({index:30,stage:'complete',complete:true,targetMet:true});expect(s.guide.label).toContain('not a completed pasta dish');expect(A.demonstrateNext(s)).toBe(s);replay(s);
 });
 it('accepts out-of-order practice targets and completes only after all actual disclosures and burner-off',()=>{
  let s=turnAll(fresh(),Array.from({length:14},(_,i)=>13-i));expect(s.guide).toMatchObject({kind:'waitPan',seconds:30,stage:'cook-second'});s=act(s,'waitPan',{seconds:30});s=turnAll(s,Array.from({length:14},(_,i)=>(i+5)%14));
  expect(A.browning(s).currentGoldenFaceCount).toBe(28);expect(s.guide.complete).toBe(false);expect(s.guide.kind).toBe('setPanHeat');s=act(s,'setPanHeat',{setting:0});expect(s.guide.complete).toBe(true);replay(s);
 });
 it('does not infer a successful result from 28 turns after a shortened or overlong interval',()=>{
  const short=finish(15),long=finish(60);expect(A.browning(short)).toMatchObject({revealedFaceCount:28,currentGoldenFaceCount:18,knownDarkFaces:0,targetMet:false});expect(short.guide.complete).toBe(false);expect(short.guide.label).toContain('pale');
  expect(A.browning(long)).toMatchObject({revealedFaceCount:28,knownDarkFaces:2,targetMet:false});expect(long.guide.complete).toBe(false);expect(long.guide.label).toContain('cannot make it golden again');replay(short);replay(long);
 });
 it('can correct observed pale faces by reorienting them, cooking briefly and revealing them again',()=>{
  let s=finish(15);for(let n=0;!s.guide.complete&&n<60;n++){const before=s,g=s.guide;s=act(s,g.kind,{piece:g.piece,seconds:g.seconds,setting:g.setting});expect(s).not.toBe(before);}
  expect(s.guide.complete).toBe(true);expect(A.browning(s).currentGoldenFaceCount).toBe(28);expect(A.browning(s).totalWaitSeconds).toBeGreaterThan(15);expect(s.state.pan.damage).toBe(0);replay(s);
 });
 it('keeps earlier face evidence historical when only its contacting face cooks further',()=>{
  let s=act(fresh('independent'),'turnMushroom',{piece:0});s=act(s,'turnMushroom',{piece:0});const receipts=s.receipts,first=A.browning(s).pieces[0].faces[0],second=A.browning(s).pieces[0].faces[1];
  s=act(s,'waitPan',{seconds:15});const p=A.browning(s).pieces[0];expect(p.faces[0]).toEqual({...first,current:false});expect(p.faces[1]).toEqual(second);expect(s.receipts.slice(0,2)).toEqual(receipts);expect(s.reading).toBeNull();expect(A.browning(s).lastReveal).toMatchObject({piece:0,face:1,color:'pale',time:195,current:true});
  s=act(s,'turnMushroom',{piece:0});expect(A.browning(s).pieces[0].faces[0]).toMatchObject({time:210,current:true,actionNumber:4});expect(A.browning(s).pieces[0].faces[0].browning).toBeGreaterThan(first.browning);
 });
 it('does not freeze independent tools at the target and withdraws completion after residual heat changes a disclosed face',()=>{
  const s=finish(30,'independent');expect(s.guide.complete).toBe(true);expect(A.canBegin(s,'waitPan',{seconds:15})).toBe(true);expect(A.canBegin(s,'turnMushroom',{piece:0})).toBe(true);
  const later=act(s,'waitPan',{seconds:15});expect(later.state.pan.heat).toBe(0);expect(later.state.pan.temp).toBeLessThan(s.state.pan.temp);expect(later.state.pan.pieces[0].faces[0]).toBeGreaterThan(s.state.pan.pieces[0].faces[0]);expect(A.browning(later).currentGoldenFaceCount).toBe(14);expect(later.guide.complete).toBe(false);expect(later.guide.kind).toBe('turnMushroom');expect(later.receipts.slice(0,30)).toEqual(s.receipts);replay(later);
 });
 it('preserves permanent surface damage under high heat, turning and later cooling',()=>{
  let s=act(fresh('independent'),'setPanHeat',{setting:3});for(let n=0;n<3;n++)s=act(s,'waitPan',{seconds:60});expect(s.state.pan.damage).toBeGreaterThanOrEqual(1);expect(A.browning(s).knownScorchedFaces).toBe(0);
  s=turnAll(s);expect(A.browning(s).knownScorchedFaces).toBeGreaterThan(0);expect(s.guide).toMatchObject({kind:'setPanHeat',setting:0,complete:false,targetMet:false});expect(s.guide.label).toContain('scorched');const damage=s.state.pan.pieces.map(p=>p.damage.slice());s=act(s,'setPanHeat',{setting:0});s=turnAll(s);s.state.pan.pieces.forEach((p,i)=>expect(p.damage).toEqual(damage[i]));expect(A.browning(s).targetMet).toBe(false);expect(s.guide.label).toContain('cannot make it golden again');replay(s);
 });
 it('enforces finite records, exact interval availability and the kitchen clock limit',()=>{
  let s=fresh('independent');for(let n=0;n<96;n++)s=act(s,'turnMushroom',{piece:n%14});expect(s.record.intents).toHaveLength(96);expect(s.limitReached).toBe(true);expect(A.begin(s,'waitPan',{seconds:15})).toBe(s);expect(A.begin(s,'setPanHeat',{setting:0})).toBe(s);expect(A.restoreRecord({...A.createRecord(s),intents:s.record.intents.concat(s.record.intents[0])})).toBeNull();
  let timed=fresh('independent');for(let n=0;n<56;n++)timed=act(timed,'waitPan',{seconds:60});expect(timed.state.time).toBe(3555);expect(A.canBegin(timed,'waitPan',{seconds:60})).toBe(false);timed=act(timed,'waitPan',{seconds:30});timed=act(timed,'waitPan',{seconds:15});expect(timed.state.time).toBe(3600);expect(timed.record.intents).toHaveLength(58);expect(A.begin(timed,'turnMushroom',{piece:0})).toBe(timed);replay(timed);
 });
 it('rebuilds supplied history, revealed faces and choices without trusting imported snapshots or previews',()=>{
  const states=[fresh(),act(fresh('independent'),'turnMushroom',{piece:13,method:'pointer'}),finish(15),finish(),finish(60,'independent')];for(const s of states){const record=A.createRecord(s,{reflection:'I turned the pieces to compare both actual faces.'}),restored=A.restoreRecord({...JSON.parse(JSON.stringify(record)),state:{pan:{heat:0,damage:0}},setup:{actions:[]},browning:{targetMet:true},reading:{kind:'sauce'},receipts:[],pending:{kind:'turnMushroom',phase:'ready'}});expect(restored.state).toEqual(s.state);expect(restored.receipts).toEqual(s.receipts);expect(restored.setup).toEqual(s.setup);expect(restored.guide).toEqual(s.guide);expect(A.browning(restored)).toEqual(A.browning(s));expect(restored.pending).toBeNull();expect(restored.reading).toBeNull();expect(A.createRecord(restored)).toEqual(record);expect(record).not.toHaveProperty('browning');expect(record).not.toHaveProperty('state');}
 });
 it('rejects invalid selectors, repeated heat no-ops, irrelevant actions and forged saved intentions',()=>{
  const s=fresh('independent');for(const piece of [-1,14,.5,'0',undefined,null,NaN,Infinity])expect(A.begin(s,'turnMushroom',{piece})).toBe(s);for(const seconds of [0,1,10,45,61,'15',undefined,null,NaN,Infinity])expect(A.begin(s,'waitPan',{seconds})).toBe(s);for(const setting of [-1,2,4,.5,'0',undefined,null,NaN,Infinity])expect(A.begin(s,'setPanHeat',{setting})).toBe(s);
  for(const kind of ['inspect','pour','fold','mince','press','blot','serve','reserveWater','drainPasta'])expect(A.begin(s,kind,{piece:0,source:'plain',amountMl:60,clove:0,area:0,plate:0})).toBe(s);expect(A.heat(s,0)).toBe(s);expect(A.rest(s,15)).toBe(s);
  const record=A.createRecord(act(s,'turnMushroom',{piece:0}));for(const change of [{piece:14},{piece:'0'},{pieceAnchor:{x:450,y:350}},{actor:'demonstrator'},{method:'demonstrator'},{mode:'watch'},{seconds:30},{activity:'tomato-texture'}]){const raw=JSON.parse(JSON.stringify(record));Object.assign(raw.intents[0],change);expect(A.restoreRecord(raw)).toBeNull();}expect(A.restoreRecord({...record,protocol:1})).toBeNull();
 });
 it('fails closed when the pinned fixture or accepted turn/time effect no longer matches its contract',()=>{
  const drift=injected({...R,act(s,action,value,interaction){const next=R.act(s,action,value,interaction);if(action==='advance'&&next.time===195){const altered=JSON.parse(JSON.stringify(next));altered.pan.pieces[3].faces[0]+=.01;return altered;}return next;}});expect(()=>fresh('practice',drift)).toThrow(/provided mushroom faces/);expect(drift.restoreRecord(A.createRecord(fresh()))).toBeNull();
  for(const badAction of ['flipPiece','advance','panHeat']){const B=injected({...R,act(s,action,value,interaction){const next=R.act(s,action,value,interaction);if(s.time>=195&&action===badAction){const altered=JSON.parse(JSON.stringify(next));if(action==='flipPiece')altered.pan.pieces[value].faces[0]+=.1;else if(action==='advance')altered.time+=1;else altered.pan.pieces[0].down=1-altered.pan.pieces[0].down;return altered;}return next;}}),initial=fresh('independent',B),kind=badAction==='flipPiece'?'turnMushroom':badAction==='advance'?'waitPan':'setPanHeat',pending=stage(initial,kind,{piece:0,seconds:15,setting:0},B);expect(B.commit(pending,pending.pending.token)).toBe(pending);expect(pending.state).toBe(initial.state);}
 });
 it('retains the exact seven prior completed demonstration snapshots',()=>{
  const expected={'avatar-sauce-rescue':'470b6646793df7d7348882dc8ce3a90f4f2fed13983060089b14e1542deb5719','garlic-preparation':'772e3a07db324eee49be2ef11f70aee46de4da5af6d3d7116a57c3d630eb9479','portion-and-plate':'459e17e70c9ed446bf01549283d2ff60cf3c9885da738cb6fd96063f214eaa2a','tomato-texture':'fbf142c0444e74d4502c7da55f987339c5bb44b5672dd5164f140f04684c1c9d','surface-drying':'47d46e43d2172a9581f3259edc6e04925a4bc1c5d89ecf324e3c38883c3a34cf','pasta-weighing':'3340040953b952fb3c78c88db90b73dd7ec51a519285ccfe8a35300e61efc20c','reserve-and-drain':'fa5919d4aae36b6fbabc20d545aeff23d65593838c0cd312076c9e233ea31634'};
  for(const [activity,hash] of Object.entries(expected)){let s=A.create({activity,mode:'watch'});for(let n=0;!s.guide.complete&&n<96;n++)s=A.demonstrateNext(s);expect(s.guide.complete).toBe(true);const snapshot={state:s.state,record:A.createRecord(s),setup:s.setup,reading:s.reading,inspectionFresh:s.inspectionFresh,guide:s.guide,receipts:s.receipts};expect(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')).toBe(hash);}
 });
});
