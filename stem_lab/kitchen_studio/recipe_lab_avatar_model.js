/* Avatar activities: protocol 1 sauce rescue; protocol 2 preparation, texture and
   finite-batch plating. Hand/tool staging is reversible and does not cook.
   A deliberate release commits one existing engine action. Saved records keep
   learner/demonstrator intents; supplied setups rebuild from canonical actions.
   Imported physical snapshots are never trusted. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var ACTIVITY='avatar-sauce-rescue',LIMIT=96,modes=['watch','practice','independent'],methods=['button','keyboard','pointer'];
  var flags={thermalModel:3,mixingModel:2,sauceObservationModel:2,sauceModel:3,panModel:2,pieceModel:1,dryingModel:1,pastaModel:1,tomatoModel:1};
  var phaseSets={inspect:['pickup','dip','lift','ready'],pour:['pickup','measure','position','tilt','level','ready'],fold:['pickup','immerse','across','turn','ready'],mince:['pickup','position','cut','clear','ready'],serve:['pickup','scoop','lift','carry','tip','level','ready'],return:['pickup','scoop','lift','carry','tip','level','ready'],finish:['pickup','review','ready'],press:['pickup','position','contact','press','lift','ready'],blot:['pickup','position','contact','lift','ready'],wring:['pickup','carry','twist','release','ready'],addDry:['pickup','carry','tilt','level','ready'],returnDry:['pickup','scoop','carry','tip','ready'],addPasta:['pickup','lift','carry','tip','level','ready'],samplePasta:['pickup','dip','lift','check','ready'],reserveWater:['pickup','dip','lift','carry','tip','level','ready'],drainPasta:['pickup','lift','carry','tilt','level','ready'],turnMushroom:['pickup','position','grip','lift','turn','lower','ready'],waitPan:['pickup','observe','ready'],setPanHeat:['pickup','reach','adjust','ready']};
  var kinds=['inspect','pour','fold','fold','inspect'],labels=['Check the starting sauce','Choose and pour a measured splash','Complete the first fold','Complete the second fold','Compare a fresh spoon check'];
  phaseSets.movePan=['pickup','grip','lift','carry','lower','ready'];
  phaseSets.separatePasta=['pickup','position','dip','sweep','lift','ready'];
  phaseSets.sliceProduce=['pickup','position','brace','cut','lift','ready'];phaseSets.finishCuts=['pickup','review','ready'];
  phaseSets.moveMushroom=['pickup','position','grip','lift','carry','lower','release','ready'];
  phaseSets.rinseProduce=['pickup','carry','lower','rinse','lift','drain','return','tip','ready'];
  phaseSets.loadMushrooms=['pickup','grip','lift','carry','lower','tilt','ready'];
  phaseSets.combinePasta=['pickup','grip','lift','carry','lower','tilt','ready'];
  phaseSets.moveLid=['pickup','lift','carry','lower','ready'];phaseSets.waitPot=['pickup','observe','ready'];phaseSets.setPotHeat=['pickup','reach','adjust','ready'];
  var sessions=new WeakSet(),tokenSeed=0;
  function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.keys(v).forEach(function(key){freeze(v[key]);});Object.freeze(v);}return v;}
  function seal(s){freeze(s);sessions.add(s);return s;}
  function valid(s){return object(s)&&sessions.has(s);}
  function baseline(){
    if(!R||['startRescue','act','mixing','sauceChemistry','ingredients'].some(function(key){return typeof R[key]!=='function';}))throw new Error('The cooking engine is unavailable.');
    var s=R.startRescue('starchy',0,'practice'),n=s&&s.pan,p=s&&s.pot,amount=s&&R.ingredients(s);
    var known=s&&n&&p&&n.chemistry&&n.pendingLiquid&&Array.isArray(n.pieces)&&Array.isArray(s.log)&&s.version===1&&s.id==='mushroom'&&s.servings===2&&s.mode==='practice'&&s.time===0&&s.log.length===0&&!s.plated&&!s.submitted&&
      Object.keys(flags).every(function(key){return s[key]===flags[key];})&&s.rescue&&s.rescue.id==='starchy'&&s.rescue.prediction===0&&
      n.temp===90&&n.moisture===45&&n.heat===0&&n.combined&&n.produce&&n.garlic&&n.oil&&n.damage===0&&n.brown===1&&n.absorbedWaterMl===0&&n.evaporatedWaterMl===0&&n.size==='standard'&&(n.placement||'burner')==='burner'&&
      n.chemistry.starchG===3&&n.chemistry.oilMl===15&&n.chemistry.dispersion===.9&&n.pendingLiquid.savedWaterMl===0&&n.pendingLiquid.plainWaterMl===0&&n.pendingLiquid.tomatoJuiceMl===0&&
      s.prep&&s.prep.pasta===160&&amount&&amount.pasta===160&&amount.produce===200&&amount.oil===15&&amount.garlic===2&&amount.water===1200&&p.pasta&&p.drained&&p.progress===.9&&p.water===0&&p.starchG===0&&p.surfaceStarchG===0&&p.reserve===150&&p.reserveStarchG===6&&p.reserveTemp===92&&p.plainWater===250&&p.plainTemp===80&&p.heat===0&&
      n.pieces.length===14&&n.pieces.every(function(piece){return piece.width===5&&Array.isArray(piece.faces)&&piece.faces.length===2&&piece.faces.every(function(v){return v===1;})&&Array.isArray(piece.damage)&&piece.damage.length===2&&piece.damage.every(function(v){return v===0;});});
    if(!known)throw new Error('This engine or supplied dish no longer matches avatar sauce protocol 1.');
    return s;
  }
  function guide(mode,count){
    if(mode==='independent')return {index:count,kind:null,label:'Choose the next action using your observations',complete:false};
    var result={index:count,kind:kinds[count]||null,label:labels[count]||'The practice sequence is complete. Judge the actual sauce and explain what changed.',complete:count>=kinds.length};
    if(mode==='watch'&&result.kind==='pour'){result.source='plain';result.amountMl=60;}
    return result;
  }
  function create(options){
    if(options===undefined)options={};if(!object(options))throw new TypeError('Avatar session options must be an object.');
    var mode=options.mode===undefined?'practice':options.mode;if(modes.indexOf(mode)<0)throw new RangeError('Choose watch, practice or independent mode.');
    var activityId=options.activity===undefined?ACTIVITY:options.activity;if(activityId!==ACTIVITY)return createActivity(activityId,mode);
    return seal({protocol:1,activity:ACTIVITY,mode:mode,state:baseline(),reading:null,inspectionFresh:false,pending:null,sequence:0,
      record:{protocol:1,activity:ACTIVITY,mode:mode,intents:[],reflection:''},guide:guide(mode,0),receipts:[],lastReceipt:null,lastIntent:null,limitReached:false});
  }
  function normalizeIntent(raw,mode,activityId){
    if(activityId&&activityId!==ACTIVITY)return normalizeActivityIntent(raw,mode,activityId);
    if(!object(raw)||typeof raw.kind!=='string'||typeof raw.method!=='string'||raw.mode!==mode||raw.actor!==(mode==='watch'?'demonstrator':'learner'))return null;
    if(mode==='watch'?raw.method!=='demonstrator':methods.indexOf(raw.method)<0)return null;
    var out={kind:raw.kind,method:raw.method,actor:raw.actor,mode:mode},keys=['kind','method','actor','mode'];
    if(raw.kind==='pour'){
      if(!['plain','reduced'].includes(raw.source)||!Number.isInteger(raw.amountMl)||raw.amountMl<10||raw.amountMl>100||raw.amountMl%10)return null;
      out.source=raw.source;out.amountMl=raw.amountMl;keys.push('source','amountMl');
    }else if(raw.kind==='rest'){
      if(![15,30,60].includes(raw.seconds)||mode!=='independent')return null;out.seconds=raw.seconds;keys.push('seconds');
    }else if(raw.kind==='heat'){
      if(!Number.isInteger(raw.setting)||raw.setting<0||raw.setting>3||mode!=='independent')return null;out.setting=raw.setting;keys.push('setting');
    }else if(!['inspect','fold'].includes(raw.kind))return null;
    if(Object.keys(raw).some(function(key){return !keys.includes(key);}))return null;
    return out;
  }
  function allowed(s,intent){
    if(s.activity!==ACTIVITY)return allowedActivity(s,intent);
    if(!intent||s.limitReached)return false;
    if(s.state.time>=3600||intent.kind==='fold'&&s.state.time+6>3600||intent.kind==='rest'&&s.state.time+intent.seconds>3600)return false;
    if(s.mode!=='independent'&&(s.guide.complete||s.guide.kind!==intent.kind))return false;
    if(s.mode==='watch'&&intent.kind==='pour'&&(intent.source!=='plain'||intent.amountMl!==60))return false;
    if(intent.kind==='pour'&&s.state.pot[intent.source==='plain'?'plainWater':'reserve']<intent.amountMl)return false;
    return true;
  }
  function token(s,value){return value===undefined||Number.isInteger(value)&&s.pending&&value===s.pending.token;}
  function begin(s,kind,options){
    if(!valid(s)||s.pending||s.mode==='watch'||!Object.prototype.hasOwnProperty.call(phaseSets,kind))return s;
    if(options===undefined)options={};if(!object(options))return s;
    var raw={kind:kind,method:options.method===undefined?'button':options.method,actor:'learner',mode:s.mode};
    if(kind==='pour'){raw.source=options.source;raw.amountMl=options.amountMl;}
    if(s.activity!==ACTIVITY){raw.activity=s.activity;if(kind==='mince')raw.clove=options.clove;if(kind==='serve'||kind==='return')raw.plate=options.plate;if(kind==='press'||kind==='turnMushroom')raw.piece=options.piece;if(kind==='separatePasta')raw.group=options.group;if(kind==='sliceProduce'){raw.piece=options.piece;raw.cutMm=options.cutMm;}if(kind==='moveMushroom'){raw.piece=options.piece;raw.x=options.x;raw.z=options.z;}if(kind==='waitPan'||kind==='waitPot')raw.seconds=options.seconds;if(kind==='setPanHeat'||kind==='setPotHeat')raw.setting=options.setting;if(kind==='moveLid'||kind==='movePan')raw.placement=options.placement;if(kind==='blot')raw.area=options.area;if(kind==='addDry'||kind==='returnDry')raw.grams=options.grams;if(kind==='drainPasta')raw.amountMl=options.amountMl;}
    var intent=normalizeIntent(raw,s.mode,s.activity);if(!allowed(s,intent))return s;
    var steps=phaseSets[kind].slice(),next=Object.assign({},s,{sequence:s.sequence+1,pending:{kind:kind,steps:steps,stepIndex:0,phase:steps[0],token:++tokenSeed,intent:intent,method:intent.method}});
    if(kind==='pour'){next.pending.source=intent.source;next.pending.amountMl=intent.amountMl;}
    if(kind==='mince')next.pending.clove=intent.clove;if(kind==='serve'||kind==='return')next.pending.plate=intent.plate;if(kind==='press')next.pending.piece=intent.piece;if(kind==='blot')next.pending.area=intent.area;if(kind==='addDry'||kind==='returnDry'){next.pending.grams=intent.grams;next.pending.resultGrams=s.state.prep.pasta+(kind==='addDry'?intent.grams:-intent.grams);}if(kind==='addPasta')next.pending.grams=s.state.prep.pasta;stageWaterPreview(s.state,next.pending);
    return seal(next);
  }
  function beginDemonstration(s){
    if(!valid(s)||s.mode!=='watch'||s.pending||s.guide.complete||s.limitReached)return s;
    var raw={kind:s.guide.kind,method:'demonstrator',actor:'demonstrator',mode:s.mode};if(raw.kind==='pour'){raw.source='plain';raw.amountMl=60;}
    if(s.activity!==ACTIVITY){raw.activity=s.activity;if(raw.kind==='mince')raw.clove=s.guide.clove;if(raw.kind==='serve'||raw.kind==='return')raw.plate=s.guide.plate;if(raw.kind==='press'||raw.kind==='turnMushroom')raw.piece=s.guide.piece;if(raw.kind==='separatePasta')raw.group=s.guide.group;if(raw.kind==='sliceProduce'){raw.piece=s.guide.piece;raw.cutMm=s.guide.cutMm;}if(raw.kind==='moveMushroom'){raw.piece=s.guide.piece;raw.x=s.guide.x;raw.z=s.guide.z;}if(raw.kind==='waitPan'||raw.kind==='waitPot')raw.seconds=s.guide.seconds;if(raw.kind==='setPanHeat'||raw.kind==='setPotHeat')raw.setting=s.guide.setting;if(raw.kind==='moveLid'||raw.kind==='movePan')raw.placement=s.guide.placement;if(raw.kind==='blot')raw.area=s.guide.area;if(raw.kind==='addDry'||raw.kind==='returnDry')raw.grams=s.guide.grams;if(raw.kind==='drainPasta')raw.amountMl=s.guide.amountMl;}
    if((s.activity==='finish-pasta-in-sauce'||s.activity==='hold-and-recheck-sauce')&&raw.kind==='pour'){raw.source=s.guide.source;raw.amountMl=s.guide.amountMl;}
    var intent=normalizeIntent(raw,s.mode,s.activity);if(!allowed(s,intent))return s;
    var steps=phaseSets[intent.kind].slice(),next=Object.assign({},s,{sequence:s.sequence+1,pending:{kind:intent.kind,steps:steps,stepIndex:0,phase:steps[0],token:++tokenSeed,intent:intent,method:intent.method}});
    if(intent.kind==='pour'){next.pending.source=intent.source;next.pending.amountMl=intent.amountMl;}
    if(intent.kind==='mince')next.pending.clove=intent.clove;if(intent.kind==='serve'||intent.kind==='return')next.pending.plate=intent.plate;if(intent.kind==='press')next.pending.piece=intent.piece;if(intent.kind==='blot')next.pending.area=intent.area;if(intent.kind==='addDry'||intent.kind==='returnDry'){next.pending.grams=intent.grams;next.pending.resultGrams=s.state.prep.pasta+(intent.kind==='addDry'?intent.grams:-intent.grams);}if(intent.kind==='addPasta')next.pending.grams=s.state.prep.pasta;stageWaterPreview(s.state,next.pending);
    return seal(next);
  }
  function stageWaterPreview(state,pending){
    if(pending.kind==='combinePasta')pending.dryEquivalentGrams=160;
    if((pending.intent.activity==='finish-pasta-in-sauce'||pending.intent.activity==='hold-and-recheck-sauce')&&pending.kind==='setPanHeat')pending.initialSetting=state.pan.heat;
    if(pending.kind==='loadMushrooms'){pending.grams=200;pending.pieceCount=14;}
    if(pending.intent.activity==='preheat-and-load-mushrooms'&&pending.kind==='setPanHeat')pending.initialSetting=state.pan.heat;
    if(pending.kind==='sliceProduce'){
      pending.piece=pending.intent.piece;pending.cutMm=pending.intent.cutMm;pending.selectedWidth=state.prep.cuts[pending.piece];pending.pieceAnchor={x:450,y:350};
      pending.cutAnchor={x:330+240*pending.cutMm/pending.selectedWidth,y:350};pending.supportAnchor={x:pending.cutAnchor.x+(pending.cutMm<pending.selectedWidth/2?45:-45),y:345};
    }
    if(pending.kind==='separatePasta'){var group=R.pastaSurface(state).groups[pending.intent.group];pending.group=group.index;pending.groupAnchor={x:450+150*group.x,y:350+38*group.z};}
    if(state.rescue&&state.rescue.id==='separated'){
      pending.panPlacement=R.panPosition(state).site;
      if(pending.kind==='movePan'){pending.placement=pending.intent.placement;pending.fromPlacement=pending.panPlacement;pending.initialPlacement=pending.panPlacement;}
      if(pending.kind==='setPanHeat')pending.initialSetting=state.pan.heat;
    }
    if(pending.kind==='moveMushroom'){var moved=R.panSurface(state).pieces[pending.intent.piece];pending.piece=moved.index;pending.fromX=moved.x*100;pending.fromZ=moved.z*100;pending.targetX=pending.intent.x;pending.targetZ=pending.intent.z;pending.pieceAnchor={x:450+205*moved.x,y:350+45*moved.z};pending.targetAnchor={x:450+205*pending.intent.x/100,y:350+45*pending.intent.z/100};pending.pieceTopColor=moved.topColor;pending.pieceDown=moved.down;}
    if(pending.kind==='turnMushroom'){var piece=R.panSurface(state).pieces[pending.intent.piece];pending.piece=piece.index;pending.pieceAnchor={x:450+205*piece.x,y:350+45*piece.z};pending.pieceTopColor=piece.topColor;}
    if(pending.kind==='waitPan'||pending.kind==='waitPot')pending.seconds=pending.intent.seconds;
    if(pending.kind==='setPanHeat'||pending.kind==='setPotHeat')pending.setting=pending.intent.setting;
    if(pending.kind==='moveLid'){pending.placement=pending.intent.placement;pending.fromPlacement=state.pot.lid||'rest';pending.initialPlacement=pending.fromPlacement;}
    if(pending.kind==='setPotHeat')pending.initialSetting=state.pot.heat;
    if(pending.kind==='reserveWater'){pending.amountMl=R.waterHandling(state).scoop;pending.actualMl=pending.amountMl;}
    if(pending.kind==='drainPasta'){pending.amountMl=pending.intent.amountMl;pending.actualMl=Math.min(state.pot.water,pending.amountMl);}
  }
  function step(s,nextPhase,value){
    if(!valid(s)||!s.pending||!token(s,value)||s.pending.stepIndex>=s.pending.steps.length-1||nextPhase!==s.pending.steps[s.pending.stepIndex+1])return s;
    return seal(Object.assign({},s,{pending:Object.assign({},s.pending,{stepIndex:s.pending.stepIndex+1,phase:nextPhase})}));
  }
  function advance(s,value){return valid(s)&&s.pending?step(s,s.pending.steps[s.pending.stepIndex+1],value):s;}
  function cancel(s,value){if(!valid(s)||!s.pending||!token(s,value))return s;return seal(Object.assign({},s,{pending:null}));}
  function facts(state){var c=state.pan.chemistry;return {time:state.time,panTemperature:state.pan.temp,freeWaterMl:state.pan.moisture,starchG:c.starchG,oilMl:c.oilMl,pendingMl:R.mixing(state).pending.totalMl,heat:state.pan.heat,plainRemainingMl:state.pot.plainWater,reducedRemainingMl:state.pot.reserve};}
  function execute(s,intent){
    if(s.activity!==ACTIVITY)return executeActivity(s,intent);
    if(!allowed(s,intent))return s;
    var action,value,interaction=intent.method==='keyboard'?'keyboard':intent.kind==='pour'?(intent.method==='pointer'?'scene-pour':'tilt'):intent.kind==='fold'?'scene-stir':intent.kind==='inspect'?'sauce-trail':'select';
    if(intent.kind==='inspect')action='taste';
    if(intent.kind==='pour'){action=intent.source==='plain'?'pourPlain':'pour';value=intent.amountMl;}
    if(intent.kind==='fold'){action='stirSweep';value=intent.method==='pointer'?'gesture':'button';}
    if(intent.kind==='rest'){action='advance';value=intent.seconds;}
    if(intent.kind==='heat'){action='panHeat';value=intent.setting;}
    var state=R.act(s.state,action,value,interaction),entry=state&&state.log&&state.log[state.log.length-1];
    var duration=intent.kind==='fold'?6:intent.kind==='rest'?intent.seconds:0;
    if(state===s.state||!entry||!entry.accepted||entry.action!==action||state.log.length!==s.state.log.length+1||Math.abs(state.time-s.state.time-duration)>1e-9||intent.kind==='fold'&&entry.durationSeconds!==6||intent.kind==='inspect'&&(!entry.inspection||entry.inspection.kind!=='sauce'))return s;
    var intents=s.record.intents.concat([intent]),receipt={index:intents.length,kind:intent.kind,actor:intent.actor,method:intent.method,action:action,value:value===undefined?null:value,interaction:entry.interaction||null,before:facts(s.state),after:facts(state),durationSeconds:duration,transfer:entry.transfer?copy(entry.transfer):null,inspection:entry.inspection?copy(entry.inspection):null};
    return seal(Object.assign({},s,{state:state,reading:entry.inspection?copy(entry.inspection):s.reading,inspectionFresh:intent.kind==='inspect',pending:null,
      record:Object.assign({},s.record,{intents:intents}),guide:guide(s.mode,intents.length),receipts:s.receipts.concat([receipt]),lastReceipt:receipt,lastIntent:intent,limitReached:intents.length>=LIMIT}));
  }
  function commit(s,value){if(!valid(s)||!s.pending||!token(s,value)||s.pending.phase!=='ready')return s;return execute(s,s.pending.intent);}
  function demonstrateNext(s){
    if(!valid(s)||s.mode!=='watch'||s.pending||s.guide.complete)return s;
    var raw={kind:s.guide.kind,method:'demonstrator',actor:'demonstrator',mode:s.mode};if(raw.kind==='pour'){raw.source='plain';raw.amountMl=60;}
    if(s.activity!==ACTIVITY){raw.activity=s.activity;if(raw.kind==='mince')raw.clove=s.guide.clove;if(raw.kind==='serve'||raw.kind==='return')raw.plate=s.guide.plate;if(raw.kind==='press'||raw.kind==='turnMushroom')raw.piece=s.guide.piece;if(raw.kind==='separatePasta')raw.group=s.guide.group;if(raw.kind==='sliceProduce'){raw.piece=s.guide.piece;raw.cutMm=s.guide.cutMm;}if(raw.kind==='moveMushroom'){raw.piece=s.guide.piece;raw.x=s.guide.x;raw.z=s.guide.z;}if(raw.kind==='waitPan'||raw.kind==='waitPot')raw.seconds=s.guide.seconds;if(raw.kind==='setPanHeat'||raw.kind==='setPotHeat')raw.setting=s.guide.setting;if(raw.kind==='moveLid'||raw.kind==='movePan')raw.placement=s.guide.placement;if(raw.kind==='blot')raw.area=s.guide.area;if(raw.kind==='addDry'||raw.kind==='returnDry')raw.grams=s.guide.grams;if(raw.kind==='drainPasta')raw.amountMl=s.guide.amountMl;}
    if((s.activity==='finish-pasta-in-sauce'||s.activity==='hold-and-recheck-sauce')&&raw.kind==='pour'){raw.source=s.guide.source;raw.amountMl=s.guide.amountMl;}
    return execute(s,normalizeIntent(raw,s.mode,s.activity));
  }
  function immediate(s,kind,value,method){
    if(!valid(s)||s.mode!=='independent'||s.pending)return s;var raw={kind:kind,method:method===undefined?'button':method,actor:'learner',mode:s.mode};
    raw[kind==='rest'?'seconds':'setting']=value;if(s.activity!==ACTIVITY)raw.activity=s.activity;return execute(s,normalizeIntent(raw,s.mode,s.activity));
  }
  function rest(s,seconds,method){return immediate(s,'rest',seconds,method);}
  function heat(s,setting,method){return immediate(s,'heat',setting,method);}
  function createRecord(s,options){
    if(!valid(s))throw new TypeError('Use an active avatar session.');if(options===undefined)options={};if(!object(options))throw new TypeError('Record options must be an object.');
    var reflection=Object.prototype.hasOwnProperty.call(options,'reflection')?options.reflection:s.record.reflection;
    if(typeof reflection!=='string'||reflection.length>2000)throw new RangeError('Explanation must contain at most 2,000 characters.');
    return {protocol:s.protocol,activity:s.activity,mode:s.mode,intents:copy(s.record.intents),reflection:reflection};
  }
  function restoreRecord(raw){
    if(object(raw)&&raw.protocol===2)return restoreActivityRecord(raw);
    if(!object(raw)||raw.protocol!==1||raw.activity!==ACTIVITY||modes.indexOf(raw.mode)<0||!Array.isArray(raw.intents)||raw.intents.length>LIMIT||typeof raw.reflection!=='string'||raw.reflection.length>2000)return null;
    try{var s=create({mode:raw.mode});for(var i=0;i<raw.intents.length;i++){var intent=normalizeIntent(raw.intents[i],raw.mode),next=execute(s,intent);if(next===s)return null;s=next;}return seal(Object.assign({},s,{record:Object.assign({},s.record,{reflection:raw.reflection})}));}catch(e){return null;}
  }
  // Protocol 2 adds discrete preparation and finite-batch sharing activities.
  // Protocol 1's records, baseline, facts and receipts above remain unchanged.
  var activities=[
    {id:ACTIVITY,title:'Sauce rescue',protocol:1,description:'Inspect a heavy sauce, choose a liquid and compare a fresh coating after folding.',initialSetup:'A prepared mushroom pasta sauce at 90°C. Plain water starts at 80°C; reduced cooking water starts at 92°C.',kinds:['inspect','pour','fold'],tools:{inspect:'spoon',pour:'jug',fold:'spoon'},steps:kinds.map(function(kind,index){return {kind:kind,label:labels[index]};})},
    {id:'garlic-preparation',title:'Garlic preparation',protocol:2,description:'Work two cloves through sliced, chopped and minced using deliberate knife passes.',initialSetup:'Two whole cloves and washed hands are provided. Both burners are off; no cooking time has elapsed.',kinds:['mince'],tools:{mince:'knife'},steps:[0,0,0,1,1,1].map(function(clove,index){return {kind:'mince',clove:clove,label:'Clove '+(clove+1)+' · '+['slice','chop','mince'][index%3]};})},
    {id:'portion-and-plate',title:'Portion and plate',protocol:2,description:'Share a finite eight-spoonful dish, return portions to rebalance and deliberately finish the plates.',initialSetup:'A ready, checked mushroom pasta dish is provided after a canonical sauce preparation. Its kitchen clock starts at 0:12. Eight model spoonfuls are available for two plates.',kinds:['serve','return','finish'],tools:{serve:'spoon',return:'spoon',finish:'plates'},steps:[0,1,0,1,0,1,0,1].map(function(plate,index){return {kind:'serve',plate:plate,label:'Spoonful '+(index+1)+' · plate '+(plate+1)};}).concat([{kind:'finish',label:'Review and finish both plates'}])}
    ,{id:'tomato-texture',title:'Tomato texture',protocol:2,description:'Press softened tomato pieces to release their retained juice, fold it through and compare fresh spoon checks.',initialSetup:'A prepared tomato pasta dish has cooled to 35°C with both burners off. Fourteen representative pieces were already softened by cooking; together they retain 60 mL of modeled juice. Pressing changes texture, not doneness. The kitchen clock starts at 0:00.',kinds:['inspect','press','fold'],tools:{inspect:'spoon',press:'masher',fold:'spoon'},steps:[{kind:'inspect',label:'Inspect the unpressed tomato sauce'},{kind:'press',piece:0,label:'Split a softened piece'},{kind:'press',piece:0,label:'Crush the split piece'},{kind:'press',piece:1,label:'Split another softened piece'},{kind:'press',piece:1,label:'Crush the split piece'},{kind:'fold',label:'Fold the released juice through'},{kind:'fold',label:'Complete a second fold'},{kind:'inspect',label:'Compare a fresh sauce check'}]}
    ,{id:'surface-drying',title:'Blot and wring',protocol:2,description:'Remove rinse water from eight areas of a mushroom sample, manage the cloth capacity and wring the collected water into a bowl.',initialSetup:'Washed hands and rinsed raw mushrooms are provided. Sixteen modeled surface-water marks are spread over eight areas; a dry cloth holds eight marks. Blotting removes surface water while the mushrooms retain their natural internal moisture. Both burners are off; preparation actions are untimed.',kinds:['blot','wring'],tools:{blot:'cloth',wring:'cloth'},steps:Array.from({length:18},function(_,index){return index===8||index===17?{kind:'wring',label:'Wring collected water into the bowl'}:{kind:'blot',area:Math.floor((index>8?index-1:index)/2),label:'Blot a wet area of the mushroom sample'};})}
    ,{id:'pasta-weighing',title:'Weigh and add pasta',protocol:2,description:'Read the scale, correct a dry-pasta portion and carry the recorded amount into hot water. Compare the water temperature before and after adding the pasta.',initialSetup:'A supplied starter portion of 40 g sits on a zeroed scale; 760 g remains in the packet. The two-serving recipe calls for 160 g. This model records portions from 40 to 800 g in 10 g steps. Washed hands and a pot preheated to 100°C are provided; its burner is now off. Preparation used 2:00 of kitchen time and left about 1,189 mL of water. Weighing and carrying do not advance the clock. This activity ends after adding the dry pasta; it does not cook a finished dish.',kinds:['addDry','returnDry','addPasta'],tools:{addDry:'packet',returnDry:'scoop',addPasta:'tray'},steps:[{kind:'addDry',grams:80,label:'Read the scale and add a measured portion'},{kind:'addDry',grams:40,label:'Adjust to the 160 g recipe target'},{kind:'addPasta',label:'Carry the recorded portion into the pot'}]}
    ,{id:'reserve-and-drain',title:'Save water and drain pasta',protocol:2,description:'Sample cooked pasta, save a measured jug of its starchy cooking water and drain the finite remainder. Compare where the water and dissolved starch end up.',initialSetup:'A supplied portion, made from 160 g of dry pasta, has already cooked for eight kitchen minutes. The kitchen clock starts at 10:00; the burner is now off. About 1,020 mL of cooking water remains at 100°C, carrying about 6.35 g of dissolved starch. No sample or saved water is supplied. The jug holds 200 mL, and each ladle saves up to 50 mL in 10 mL steps. Sample the pasta, save 200 mL, then drain the remainder in controlled pours. Handling is untimed in this model; water does not cool during staged movements. Discarded water cannot be recovered. This activity does not combine or finish a sauce.',kinds:['samplePasta','reserveWater','drainPasta'],tools:{samplePasta:'spoon',reserveWater:'ladle',drainPasta:'pot'},steps:[{kind:'samplePasta',label:'Sample the cooked pasta'}].concat(Array.from({length:4},function(_,index){return {kind:'reserveWater',label:'Save ladle '+(index+1)+' of four'};}),[250,250,250,100].map(function(amount,index){return {kind:'drainPasta',amountMl:amount,label:index===3?'Drain the actual remaining water':'Drain a controlled portion of the remaining water'};}))}
    ,{id:'mushroom-turning',title:'Turn and brown mushrooms',protocol:2,description:'Turn individual mushroom pieces, choose short cooking intervals and compare the actual faces you reveal. Control the burner while protecting the surfaces from overbrowning.',initialSetup:'A supplied 200 g mushroom batch was rinsed, cut into even 5 mm pieces and patted dry. It was added to 15 mL of oil in a preheated pan. The clock starts at 3:15 with the pan near 173°C on medium heat. Fourteen representative pieces have pale exposed faces; turn them to see their hidden sides. The pot is empty. Turning and burner adjustments are untimed; only a committed cooking interval advances time. A hot pan keeps cooking during later intervals even after its burner is switched off. This activity does not prepare a complete pasta dish.',kinds:['turnMushroom','waitPan','setPanHeat'],tools:{turnMushroom:'tongs',waitPan:'none',setPanHeat:'dial'},steps:Array.from({length:14},function(_,piece){return {kind:'turnMushroom',piece:piece,label:'Reveal the first face of piece '+(piece+1)};}).concat([{kind:'waitPan',seconds:30,label:'Cook the second faces for 30 seconds'}],Array.from({length:14},function(_,piece){return {kind:'turnMushroom',piece:piece,label:'Reveal the second face of piece '+(piece+1)};}),[{kind:'setPanHeat',setting:0,label:'Switch off the pan burner and review both faces'}])}
    ,{id:'cover-and-check-pasta',title:'Cover, cook and check pasta',protocol:2,description:'Move the pot lid, choose heat and short cooking intervals, then compare actual pasta samples. Track evaporation and the heat that remains after switching off.',initialSetup:'A supplied portion made from 160 g of dry pasta has cooked for six kitchen minutes and was already stirred to separate its strands. The clock starts at 8:00 with about 1,063 mL of water at 100°C, the pot burner on high, and the lid at its rest. No texture sample is supplied. Record a starting sample before another cooking interval, then cover and control the heat. Lift the lid before sampling again. Lid movements, samples and burner changes are untimed; only a released cooking interval advances the clock. Switching off does not remove stored heat. This activity leaves the pasta in the pot; it does not drain or finish a dish.',kinds:['moveLid','waitPot','setPotHeat','samplePasta'],tools:{moveLid:'lid',waitPot:'none',setPotHeat:'dial',samplePasta:'spoon'},steps:[{kind:'samplePasta',label:'Record the starting pasta texture'},{kind:'setPotHeat',setting:2,label:'Choose medium pot heat'},{kind:'moveLid',placement:'covered',label:'Carry the lid onto the pot'},{kind:'waitPot',seconds:60,label:'Cook for a controlled minute'},{kind:'waitPot',seconds:30,label:'Cook for another short interval'},{kind:'moveLid',placement:'rest',label:'Lift the lid to its rest'},{kind:'samplePasta',label:'Compare a fresh pasta sample'},{kind:'setPotHeat',setting:0,label:'Switch off and review the current sample'}]}
    ,{id:'cool-and-fold-sauce',title:'Cool and fold a separated sauce',protocol:2,description:'Carry a hot pan to the trivet, control the burner and compare actual spoon checks before and after cooling and folding.',initialSetup:'A supplied mushroom pasta has visible oil beads at a modeled pan temperature of 115°C, on a medium burner. Its pasta begins tender with a slight bite. The dish contains 80 mL of free sauce water, 25 mL of oil and 1.2 g of starch; no learner spoon check has been recorded. A trivet and two mitts are provided. Carrying and burner adjustments are untimed and do not cool the pan immediately. A released wait or six-second fold advances kitchen time, so water can evaporate or enter the pasta and the pasta can soften. This activity offers no added liquid. Compare the oil and coating after your choices; it does not plate the dish or establish lasting emulsion stability.',kinds:['inspect','movePan','setPanHeat','waitPan','fold'],tools:{inspect:'spoon',movePan:'pan',setPanHeat:'dial',waitPan:'none',fold:'spoon'},steps:[{kind:'inspect',label:'Record the separated starting sauce'},{kind:'movePan',placement:'trivet',label:'Carry the pan level onto the trivet'},{kind:'setPanHeat',setting:0,label:'Switch off the empty burner'},{kind:'waitPan',seconds:30,label:'Allow a short cooling interval'},{kind:'fold',label:'Fold for six kitchen seconds'},{kind:'inspect',label:'Compare a fresh spoon check'}]}
  ];
  activities.push({id:'separate-and-check-pasta',title:'Separate and check pasta strands',protocol:2,description:'Sweep through individual clumps, then compare real pasta samples as the strands cook. Earlier differences remain after separation.',initialSetup:'A supplied portion made from 160 g of dry pasta has cooked for three kitchen minutes. The clock starts at 5:00 with about 1,154 mL of water at 100°C on medium heat. One of six representative groups was separated when the pasta entered the pot; five groups remain clumped. No texture sample is supplied. Sample before separating, release each sweep deliberately, and compare a new sample. Separating changes access to water for later cooking but does not instantly cook a strand or erase earlier differences. Only released cooking intervals advance time. The lid stays on its rest. This activity leaves the pasta in hot water; it does not drain or finish a dish.',kinds:['separatePasta','samplePasta','waitPot','setPotHeat'],tools:{separatePasta:'spoon',samplePasta:'spoon',waitPot:'none',setPotHeat:'dial'},steps:[{kind:'samplePasta',label:'Record the starting groups'}].concat([1,2,3,4,5].map(function(group){return {kind:'separatePasta',group:group,label:'Separate group '+(group+1)};}),[{kind:'samplePasta',label:'Compare after separation'},{kind:'waitPot',seconds:60,label:'Cook and check in short steps'},{kind:'samplePasta',label:'Check the firmest and softest sampled strands'},{kind:'setPotHeat',setting:0,label:'Switch off and review the current sample'}])});
  activities.push({id:'precision-mushroom-cuts',title:'Make consistent mushroom cuts',protocol:2,description:'Choose a piece and a cut position, then compare the actual widths before recording your preparation.',initialSetup:'A washed, rinsed 40 mm representative mushroom sample is supplied on the board. Both burners are off. Aim for 5 mm slices: the recipe accepts 4–6 mm widths with no more than 1 mm difference between the smallest and largest. A released cut splits one selected piece into two; their lengths still add to the original 40 mm sample. Slicing cannot put material back, and some choices cannot be corrected by further cuts. Record the preparation deliberately when ready. This activity measures a representative cutting sample, not the weight or cooking of a complete mushroom batch. Movements are illustrative and do not assess knife dexterity.',kinds:['sliceProduce','finishCuts'],tools:{sliceProduce:'knife',finishCuts:'none'},steps:Array.from({length:7},function(_,index){return {kind:'sliceProduce',piece:index,cutMm:5,label:'Cut another 5 mm slice'};}).concat([{kind:'finishCuts',label:'Record the actual prepared widths'}])});
  var spacingSites=freeze([[54,0],[44,32],[17,51],[-17,51],[-44,32],[-54,0],[-44,-32],[-17,-51],[17,-51],[44,-32],[20,0],[0,20],[-20,0],[0,-20]].map(function(pair,index){return {index:index,x:pair[0],z:pair[1],anchor:{x:450+205*pair[0]/100,y:350+45*pair[1]/100}};}));
  activities.push({id:'space-mushrooms',title:'Give mushrooms room in the pan',protocol:2,description:'Lift and place individual mushrooms with tongs, then compare how the actual spacing changes their modeled contact with the pan.',initialSetup:'A supplied 200 g mushroom batch was rinsed, cut into even 5 mm pieces, dried and cooked on its first side in 15 mL of oil. The clock starts at 3:15 with a hot pan near 173°C; both burners are now off. Eight of the fourteen representative pieces begin with at least two close neighbors. Move pieces to give every piece room. Moving preserves each face and its existing browning or damage. These movements do not advance the kitchen clock, so this activity does not model cooling during handling or assess cooked readiness. The pan remains hot. The contact and center-to-rim heat factors are illustrative, not measured temperatures or cooking guarantees.',kinds:['moveMushroom'],tools:{moveMushroom:'tongs'},steps:spacingSites.map(function(site){return {kind:'moveMushroom',piece:site.index,x:site.x,z:site.z,label:'Give piece '+(site.index+1)+' room at its suggested position'};})});
  activities.push({id:'rinse-and-dry-produce',title:'Rinse, drain and blot mushrooms',protocol:2,description:'Carry whole mushrooms to running water, drain and return them, then track the surface water as a finite cloth fills and is wrung into a bowl.',initialSetup:'Clean hands and a whole, unrinsed 200 g mushroom batch are supplied. Both burners are off, the empty vessels are at 22°C, and the kitchen clock starts at 0:00. Complete the illustrative basket rinse, lift to drain and return it to the board before releasing. The recorded rinse establishes 30 mL of modeled retained surface water across eight representative areas. It does not measure faucet use, cleanliness or food safety. Blotting moves 1.875 mL per water mark into a cloth that holds eight marks (15 mL); wringing transfers its collected water into the bowl. Preparation movements are untimed. Remove all sixteen surface-water marks and empty the cloth; natural internal mushroom moisture remains. This activity does not cut or cook the produce.',kinds:['rinseProduce','blot','wring'],tools:{rinseProduce:'basket',blot:'cloth',wring:'cloth'},steps:[{kind:'rinseProduce',label:'Rinse, drain and return the whole mushrooms'}].concat(Array.from({length:18},function(_,index){return index===8||index===17?{kind:'wring',label:'Wring the collected water into the bowl'}:{kind:'blot',area:Math.floor((index>8?index-1:index)/2),label:'Blot a wet area of the mushroom sample'};}))});
  activities.push({id:'preheat-and-load-mushrooms',title:'Preheat and load mushrooms',protocol:2,description:'Choose heat and short waits, carry a prepared mushroom batch into the pan, and compare the recorded temperature change before switching the burner off.',initialSetup:'Hands are already washed. A supplied 200 g mushroom batch was rinsed, sliced into even 5 mm pieces and dried. It waits on a tray; 15 mL of measured oil is already in the pan. Both burners are off, the vessels are at 22°C, and the kitchen clock starts at 0:00. Use the illustrative 150–190°C preheating range as a comparison target for this activity, not a food-safety temperature, universal cooking rule or readiness test. You may load below, within or above that range; the recorded loading condition cannot be changed afterward. One released transfer moves the entire batch and creates fourteen representative pieces, with 35 mL of modeled natural free moisture. Loading uses the engine\'s fixed 25°C temperature reduction, limited by a 22°C floor; this is not a calorimetric calculation from food mass. Only released waits advance kitchen time. Later waits continue heating, cooling, evaporation and cooking; switching off does not remove stored heat. Finish the handling sequence by switching off the burner. This activity does not turn the pieces or establish cooked readiness.',kinds:['setPanHeat','waitPan','loadMushrooms'],tools:{setPanHeat:'dial',waitPan:'none',loadMushrooms:'produce-tray'},steps:[{kind:'setPanHeat',setting:2,label:'Choose medium pan heat'},{kind:'waitPan',seconds:60,label:'Preheat for one measured minute'},{kind:'waitPan',seconds:30,label:'Compare after another short wait'},{kind:'loadMushrooms',label:'Transfer the entire prepared mushroom batch'},{kind:'setPanHeat',setting:0,label:'Switch off and compare the loading receipt'}]});
  activities.push({id:'finish-pasta-in-sauce',title:'Finish pasta in the sauce',protocol:2,description:'Transfer drained pasta into a prepared tomato sauce, compare a real spoon check, and choose liquid, mixing and heat while the pasta keeps changing.',initialSetup:'A supplied cook starts at 17:30 with both burners off. Hands were washed; 300 g of tomatoes were rinsed and evenly cut, and garlic was prepared. The tomato pan contains 15 mL oil and 34.624 mL free sauce water at about 108°C, with no recorded scorch damage. A drained pasta batch waits in a colander: 160 g is its original dry-weight equivalent, not its cooked weight. Its supplied pot sample was tender with a slight bite; that earlier sample is not a learner check of the finished dish. A jug holds 200 mL ordinary saved cooking water. Transfer the entire batch once; the released transfer also tosses for six simulated seconds, carrying 0.64 g of surface starch into the sauce. It does not calculate an instantaneous cooling drop from the pasta or a cooked pasta mass. Both vessels keep changing during each six-second toss or fold and every released wait. Pasta can absorb sauce water and soften; cooling and evaporation can change sauce body. The 450 mL free-water budget accounts for the initial 250 mL modeled tomato water and 200 mL saved water, including evaporation during the supplied cook; the tomatoes also retain 60 mL of internal juice that this activity does not release. A fresh spoon check and both burners off complete the handling sequence even if the observed result misses the coating and pasta-texture targets. You may continue correcting; depleted water, added starch, softening and scorch damage cannot be reversed.',kinds:['combinePasta','pour','fold','inspect','setPanHeat','waitPan'],tools:{combinePasta:'pasta-colander',pour:'jug',fold:'spoon',inspect:'spoon',setPanHeat:'dial',waitPan:'none'},steps:[{kind:'combinePasta',label:'Transfer and toss the drained pasta'},{kind:'inspect',label:'Check the combined dish'},{kind:'pour',source:'reduced',amountMl:30,label:'Choose a measured saved-water adjustment'},{kind:'fold',label:'Fold the liquid through for six kitchen seconds'},{kind:'inspect',label:'Compare a fresh coating and pasta check'}]});
  activities.push({id:'hold-and-recheck-sauce',title:'Hold and recheck a sauce',protocol:2,description:'Compare actual spoon checks across a serving pause, then adjust the finite saved water and test whether a coating lasts through a new pause.',initialSetup:'A supplied mushroom pasta dish starts at 0:00 with both burners off. It has 45 mL of free sauce water at a modeled 95°C, 15 mL oil and 1.25 g starch. A separate jug holds 150 mL ordinary saved cooking water with 1.8 g starch at 92°C. Its supplied pasta sample began tender with a slight bite; no learner sauce check is supplied. Record an actual check, then compare with another after at least 120 simulated seconds without an intervening liquid addition, fold or burner adjustment. A coating now may thicken during the pause: pasta takes up free sauce water, some water evaporates, and cooling changes the modeled body. A measured saved-water addition also adds starch; it cannot be returned to the jug. A fold advances six kitchen seconds, and waits advance only on Release. Untimed handling does not cool the dish. Complete a fresh pair of checks across the pause with both burners off, even if the later check misses the coating or pasta target. A successful comparison is evidence only for those two observations; it does not predict indefinite stability, safe holding or a plated dish. Scorch damage, depleted water and pasta softening remain after later corrections.',kinds:['inspect','pour','fold','waitPan','setPanHeat'],tools:{inspect:'spoon',pour:'jug',fold:'spoon',waitPan:'none',setPanHeat:'dial'},steps:[{kind:'inspect',label:'Record the supplied coating'},{kind:'pour',source:'reduced',amountMl:20,label:'Choose a measured saved-water adjustment'},{kind:'fold',label:'Fold the saved water through for six kitchen seconds'},{kind:'inspect',label:'Record the coating before the pause'},{kind:'waitPan',seconds:60,label:'Wait for one simulated minute'},{kind:'waitPan',seconds:60,label:'Complete a second simulated minute'},{kind:'inspect',label:'Compare a fresh coating and pasta check after the pause'}]});
  activities.forEach(function(entry){entry.phases={};entry.kinds.forEach(function(kind){entry.phases[kind]=phaseSets[kind];});});freeze(activities);
  function getActivity(id){return activities.find(function(entry){return entry.id===id;})||null;}
  function setupAction(state,action,value,interaction){var next=R.act(state,action,value,interaction),last=next&&next.log&&next.log[next.log.length-1];if(next===state||!last||!last.accepted||last.action!==action||next.log.length!==state.log.length+1)throw new Error('A provided activity preparation no longer matches avatar protocol 2.');return next;}
  function activityBaseline(id){
    if(!R||['start','act','ingredients','garlicPreparation','serving'].some(function(key){return typeof R[key]!=='function';}))throw new Error('This cooking engine cannot provide avatar protocol 2.');
    var state,setup;
    if(id==='hold-and-recheck-sauce'){
      if(['startRescue','holdingCheck','panPosition','panThermal','needsMixing'].some(function(key){return typeof R[key]!=='function';}))throw new Error('This cooking engine cannot provide the sauce-holding comparison.');
      state=R.startRescue('holding',0,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      var expectedPrep={hands:true,rinsed:true,cut:true,cuts:Array(8).fill(5),cutMethod:'provided',dry:true,garlic:true,pasta:160},expectedPot={starchG:0,reserveStarchG:1.8,reserveTemp:92,releasedStarchG:0,surfaceStarchG:0,discardedStarchG:0,lid:'rest',heat:0,temp:22,water:0,pasta:true,progress:.9,stirred:true,reserve:150,drained:true,sample:{time:0,progress:.9,texture:'Tender with a slight bite'}};
      var expectedPieces=Array.from({length:14},function(_,index){var angle=index*2.4,radius=.18+(index%3)*.14;return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,down:0,faces:[1,1],damage:[0,0],soft:0,cutIndex:Math.floor(index*8/14),width:5};}),expectedPan={pendingLiquid:{savedWaterMl:0,plainWaterMl:0,tomatoJuiceMl:0},absorbedWaterMl:0,evaporatedWaterMl:0,chemistry:{oilMl:15,starchG:1.25,dispersion:.9},pieces:expectedPieces,heat:0,temp:95,size:'standard',oil:true,produce:true,garlic:true,moisture:45,brown:1,soft:0,damage:0,lastStir:0,waterAdded:50,combined:true,tasted:false};
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||!Array.isArray(state.log)||state.log.length||state.plated||state.submitted||state.hints||state.plan!==''||state.reflection!==''||JSON.stringify(state.answers)!=='[null,null]'||!state.rescue||state.rescue.id!=='holding'||state.rescue.prediction!==0||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})||JSON.stringify(state.prep)!==JSON.stringify(expectedPrep)||JSON.stringify(p)!==JSON.stringify(expectedPot)||JSON.stringify(n)!==JSON.stringify(expectedPan)||q.produce!==200||q.pasta!==160||q.oil!==15||q.water!==1200||q.garlic!==2||R.sauceChemistry(state).type!=='coating'||R.holdingCheck(state).met)throw new Error('The supplied coating dish and saved water no longer match avatar protocol 2.');
      setup={id:'warm-mushroom-sauce-serving-pause-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'rescue',id:'holding',prediction:0},actions:[],clockAtStart:0,startingWaterMl:45,savedWaterMl:150,waterBudgetMl:195,startingStarchG:1.25,savedStarchG:1.8,totalStarchG:3.05,oilMl:15,startingPastaProgress:.9,requiredSeconds:120,limitations:holdingLimitations};
    }else if(id==='finish-pasta-in-sauce'){
      state=R.start('tomato',2,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      if(!state||!n||!p||state.version!==1||state.id!=='tomato'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length||state.plated||state.submitted||state.rescue||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})||JSON.stringify(state.prep)!=='{"hands":false,"rinsed":false,"cut":false,"cuts":[40],"cutMethod":null,"dry":false,"garlic":false,"pasta":0}'||q.produce!==300||q.pasta!==160||q.oil!==15||q.water!==1200||q.garlic!==2||n.temp!==22||n.heat||n.produce||n.oil||n.garlic||n.combined||n.tasted||n.moisture||n.absorbedWaterMl||n.evaporatedWaterMl||n.damage||n.soft||n.brown||n.pieces.length||n.size!=='standard'||JSON.stringify(n.chemistry)!=='{"oilMl":0,"starchG":0,"dispersion":0}'||JSON.stringify(n.pendingLiquid)!=='{"savedWaterMl":0,"plainWaterMl":0,"tomatoJuiceMl":0}'||p.temp!==22||p.heat||p.water||p.pasta||p.drained||p.progress||p.sample||p.reserve||p.starchG||p.surfaceStarchG||p.reserveStarchG||p.discardedStarchG||p.lid!=='rest')throw new Error('The supplied pasta-finishing recipe no longer matches avatar protocol 2.');
      var actions=[['wash'],['rinse'],['cut'],['garlicPrep'],['weigh',160],['fill'],['potHeat',3],['advance',60],['advance',60],['pasta'],['stirPot']];for(var i=0;i<8;i++)actions.push(['advance',60]);actions.push(['sample'],['reserve'],['drain'],['potHeat',0],['oil'],['produce'],['garlic'],['panHeat',2]);for(var i=0;i<7;i++)actions.push(['advance',60]);actions.push(['advance',30],['panHeat',0]);
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],'select');});n=state.pan;p=state.pot;
      function close(value,expected){return Number.isFinite(value)&&Math.abs(value-expected)<1e-8;}
      if(state.time!==1050||state.log.length!==36||state.log.some(function(entry,index){return entry.action!==actions[index][0]||entry.value!==(actions[index][1]===undefined?null:actions[index][1])||entry.interaction!=='select'||!entry.accepted;})||!state.prep.hands||!state.prep.rinsed||!state.prep.cut||!state.prep.garlic||state.prep.dry||state.prep.pasta!==160||JSON.stringify(state.prep.cuts)!=='[10,10,10,10]'||state.prep.cutMethod!=='simplified'||!n.produce||!n.garlic||!n.oil||n.combined||n.tasted||n.heat||n.damage||n.brown||n.waterAdded||n.absorbedWaterMl||n.chemistry.oilMl!==15||n.chemistry.starchG||!close(n.temp,107.98917248436108)||!close(n.moisture,34.624176793225246)||!close(n.evaporatedWaterMl,215.37582320677473)||!close(n.soft,1.3556931976435591)||R.mixing(state).pending.totalMl!==0||n.pieces.length!==14||n.pieces.some(function(piece){return piece.width!==10||piece.crushed!==0||!close(piece.juice,60/14)||piece.soft<.85||piece.faces.some(function(v){return v!==0;})||piece.damage.some(function(v){return v!==0;});})||p.heat||p.water||!p.pasta||!p.drained||!p.stirred||!p.sample||p.sample.time!==600||p.sample.texture!=='Tender with a slight bite'||!close(p.progress,.9928922094810545)||p.reserve!==200||!close(p.reserveStarchG,1.2459823805251855)||!close(p.reserveTemp,61.714200807389034)||p.surfaceStarchG!==.64||p.starchG||!p.bundles||p.bundles.length!==6||p.bundles.some(function(bundle){return !bundle.released||bundle.cling!==0||!close(bundle.progress,p.progress);}))throw new Error('The supplied drained pasta and tomato sauce no longer match avatar protocol 2.');
      setup={id:'drained-pasta-reduced-tomato-sauce-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'tomato',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:'select'};}),clockAtStart:1050,dryEquivalentGrams:160,produceGrams:300,oilMl:15,savedWaterMl:200,initialFreeWaterMl:n.moisture,initialEvaporatedWaterMl:n.evaporatedWaterMl,waterBudgetMl:450,retainedTomatoJuiceMl:60,surfaceStarchG:.64,savedStarchG:p.reserveStarchG,totalStarchG:p.reserveStarchG+.64};
    }else if(id==='preheat-and-load-mushrooms'){
      if(typeof R.panThermal!=='function'||typeof R.panSurface!=='function')throw new Error('This cooking engine cannot provide the pan-loading activity.');
      var supplied=activityBaseline('rinse-and-dry-produce'),before=supplied.state;state=before;var actions=['rinse','cut','dry','oil'];actions.forEach(function(action){state=setupAction(state,action,undefined,'select');});
      var expectedPrep=copy(before.prep);Object.assign(expectedPrep,{rinsed:true,cut:true,cuts:Array(8).fill(5),cutMethod:'simplified',dry:true});var expectedPan=copy(before.pan);expectedPan.oil=true;expectedPan.chemistry.oilMl=15;var expectedState=copy(before);expectedState.prep=expectedPrep;expectedState.pan=expectedPan;expectedState.log=copy(state.log);expectedState.feedback=state.feedback;
      var thermal=R.panThermal(state),drying=R.drying(state);if(JSON.stringify(state)!==JSON.stringify(expectedState)||state.log.length!==5||state.log.some(function(entry,index){return entry.action!==['wash','rinse','cut','dry','oil'][index]||entry.value!==null||entry.interaction!=='select'||entry.time!==0||!entry.accepted;})||!thermal||thermal.active||thermal.effectiveHeatCapacityMl!==86.75||thermal.referenceHeatCapacityMl!==454.75||thermal.rateFactor!==1||drying.remaining!==0||drying.surfaceWater!==0||drying.cloth!==0)throw new Error('The supplied dry mushroom tray and oiled pan no longer match avatar protocol 2.');
      setup={id:'dry-sliced-mushroom-tray-oiled-pan-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:supplied.setup.actions.concat(actions.map(function(action){return {action:action,value:null,interaction:'select'};})),clockAtStart:0,produceGrams:200,oilMl:15,cutWidthMm:5,representativePieceCount:14,initialPanTemperature:22,freeWaterOnLoadingMl:35};
    }else if(id==='rinse-and-dry-produce'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      var expectedPrep={hands:false,rinsed:false,cut:false,cuts:[40],cutMethod:null,dry:false,garlic:false,pasta:0};
      if(!state||!n||!p||typeof R.drying!=='function'||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||JSON.stringify(state.prep)!==JSON.stringify(expectedPrep)||q.produce!==200||q.oil!==15||q.pasta!==160||q.water!==1200||n.temp!==22||n.heat||n.produce||n.oil||n.garlic||n.combined||n.tasted||n.moisture!==0||n.brown!==0||n.soft!==0||n.damage!==0||n.lastStir!==0||n.waterAdded!==0||n.absorbedWaterMl!==0||n.evaporatedWaterMl!==0||n.size!=='standard'||n.pieces.length!==0||JSON.stringify(n.chemistry)!=='{"oilMl":0,"starchG":0,"dispersion":0}'||JSON.stringify(n.pendingLiquid)!=='{"savedWaterMl":0,"plainWaterMl":0,"tomatoJuiceMl":0}'||p.temp!==22||p.heat||p.water!==0||p.pasta||p.drained||p.sample||p.progress!==0||p.stirred||p.reserve!==0||p.reserveTemp!==22||p.starchG!==0||p.reserveStarchG!==0||p.releasedStarchG!==0||p.surfaceStarchG!==0||p.discardedStarchG!==0||p.lid!=='rest'||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied whole-mushroom rinsing station no longer matches avatar protocol 2.');
      var beforeWash=state;state=setupAction(state,'wash',undefined,'select');expectedPrep.hands=true;var expectedState=copy(beforeWash);expectedState.prep=expectedPrep;expectedState.log=copy(state.log);expectedState.feedback=state.feedback;
      var drying=R.drying(state);if(JSON.stringify(state)!==JSON.stringify(expectedState)||state.log[0].value!==null||state.log[0].interaction!=='select'||state.log[0].time!==0||drying.remaining!==16||drying.cloth!==0||drying.capacity!==8||drying.surfaceWater!==30||drying.clothWater!==0||drying.areas.some(function(v){return v!==2;}))throw new Error('The provided clean-hands rinsing setup no longer matches avatar protocol 2.');
      setup={id:'whole-mushrooms-clean-hands-rinse-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:[{action:'wash',value:null,interaction:'select'}],clockAtStart:0,produceGrams:200,retainedWaterAfterRinseMl:30,representativeAreas:8,clothCapacityMarks:8,clothCapacityMl:15};
    }else if(id==='space-mushrooms'){
      var supplied=activityBaseline('mushroom-turning'),previous=supplied.state;
      state=setupAction(previous,'panHeat',0,'select');var expectedPan=copy(previous.pan);expectedPan.heat=0;
      if(state.time!==195||state.log.length!==12||JSON.stringify(state.pan)!==JSON.stringify(expectedPan)||JSON.stringify(state.prep)!==JSON.stringify(previous.prep)||JSON.stringify(state.pot)!==JSON.stringify(previous.pot)||state.pan.heat||state.pot.heat||R.panSurface(state).crowded!==8)throw new Error('The provided mushroom spacing station no longer matches avatar protocol 2.');
      setup={id:'hot-mushroom-spacing-burner-off-v1',provided:true,description:getActivity(id).initialSetup,source:copy(supplied.setup.source),actions:supplied.setup.actions.concat([{action:'panHeat',value:0,interaction:'select'}]),clockAtStart:195,produceGrams:200,oilMl:15,pieceCount:14,startingCrowdedCount:8};
    }else if(id==='precision-mushroom-cuts'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||typeof R.cutProfile!=='function'||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||state.prep.hands||state.prep.rinsed||state.prep.cut||state.prep.pasta!==0||JSON.stringify(state.prep.cuts)!=='[40]'||state.prep.cutMethod!==null||n.produce||n.oil||n.heat||n.combined||n.temp!==22||p.heat||p.temp!==22||p.water!==0||p.pasta||p.drained||p.sample||p.lid!=='rest'||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied cutting station no longer matches avatar protocol 2.');
      state=setupAction(state,'wash',undefined,'select');state=setupAction(state,'rinse',undefined,'select');
      var profile=R.cutProfile(state);
      if(state.time!==0||state.log.length!==2||!state.prep.hands||!state.prep.rinsed||state.prep.cut||state.prep.garlic||state.prep.dry||state.prep.pasta!==0||JSON.stringify(profile.widths)!=='[40]'||profile.target!==5||profile.min!==40||profile.max!==40||!profile.even||profile.onTarget||profile.method!=='unrecorded'||state.pan.heat||state.pan.produce||state.pan.oil||state.pot.water||state.pot.heat)throw new Error('The provided 40 mm cutting sample no longer matches avatar protocol 2.');
      setup={id:'washed-forty-mm-mushroom-sample-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:[{action:'wash',value:null,interaction:'select'},{action:'rinse',value:null,interaction:'select'}],clockAtStart:0,sampleLengthMm:40,targetWidthMm:5};
    }else if(id==='separate-and-check-pasta'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||typeof R.pastaSurface!=='function'||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||state.prep.hands||state.prep.pasta!==0||n.produce||n.heat||p.heat||n.temp!==22||p.temp!==22||p.water!==0||p.pasta||p.drained||p.sample||p.lid!=='rest'||R.ingredients(state).pasta!==160||R.ingredients(state).water!==1200||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied strand-separation station no longer matches avatar protocol 2.');
      var actions=[['wash'],['measure',160],['fill'],['potHeat',3],['advance',60],['advance',60],['pasta'],['separatePasta',0],['potHeat',2],['advance',60],['advance',60],['advance',60]];
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],'select');});p=state.pot;
      var progress=[.3501708505506252,.2248367858836076,.21695794174621852,.23271563002099668,.2248367858836076,.21695794174621852],cling=[0,.88,.93,.83,.88,.93];
      if(!state.prep.hands||state.prep.pasta!==160||state.time!==300||state.log.length!==12||p.temp!==100||p.heat!==2||p.lid!=='rest'||!p.pasta||p.drained||p.sample||p.stirred||p.reserve!==0||p.reserveStarchG!==0||p.discardedStarchG!==0||Math.abs(p.water-1154.4)>1e-7||Math.abs(p.starchG-1.5642409982200258)>1e-9||p.releasedStarchG!==p.starchG||p.surfaceStarchG!==.64||Math.abs(p.progress-.24441265597187903)>1e-12||!Array.isArray(p.bundles)||p.bundles.length!==6||p.bundles.some(function(bundle,index){return bundle.released!==(index===0)||Math.abs(bundle.cling-cling[index])>1e-12||Math.abs(bundle.progress-progress[index])>1e-12;})||state.pan.produce||state.pan.heat||state.pan.combined)throw new Error('The provided partially separated pasta no longer matches avatar protocol 2.');
      setup={id:'partly-separated-three-minute-pasta-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:'select'};}),clockAtStart:300,dryPastaGrams:160,startingWaterMl:p.water,startingDissolvedStarchG:p.starchG,suppliedSeparatedGroups:[0]};
    }else if(id==='garlic-preparation'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot,amount=state&&R.ingredients(state),garlic=state&&R.garlicPreparation(state);
      var known=state&&n&&p&&state.version===1&&state.id==='mushroom'&&state.servings===2&&state.mode==='practice'&&state.time===0&&Array.isArray(state.log)&&state.log.length===0&&!state.plated&&!state.submitted&&!state.rescue&&
        Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})&&amount&&amount.pasta===160&&amount.produce===200&&amount.oil===15&&amount.garlic===2&&amount.water===1200&&
        state.prep&&!state.prep.hands&&!state.prep.garlic&&state.prep.pasta===0&&!n.garlic&&!n.produce&&!n.oil&&!n.combined&&n.heat===0&&n.temp===22&&n.moisture===0&&n.damage===0&&p.heat===0&&p.temp===22&&p.water===0&&!p.pasta&&
        garlic&&garlic.cloves.length===2&&garlic.cloves.every(function(clove){return clove.stage===0;});
      if(!known)throw new Error('The supplied garlic board no longer matches avatar protocol 2.');
      state=setupAction(state,'wash',undefined,'select');if(!state.prep.hands||state.time!==0||R.garlicPreparation(state).passes!==0)throw new Error('The provided clean-hands setup no longer matches avatar protocol 2.');
      setup={id:'whole-garlic-clean-hands-v1',provided:true,description:getActivity(id).initialSetup,actions:[{action:'wash',value:null,interaction:'select'}],clockAtStart:0};
    }else if(id==='portion-and-plate'){
      state=baseline();var actions=[['taste',undefined,'sauce-trail'],['pourPlain',60,'tilt'],['stirSweep','button','scene-stir'],['stirSweep','button','scene-stir'],['taste',undefined,'sauce-trail']];
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],entry[2]);});var serving=R.serving(state);
      if(state.time!==12||state.plated||!serving.ready||serving.total!==8||serving.served!==0||serving.remaining!==8||R.sauceChemistry(state).type!=='coating')throw new Error('The provided ready dish no longer matches avatar protocol 2.');
      setup={id:'checked-mushroom-eight-portions-v1',provided:true,description:getActivity(id).initialSetup,actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:entry[2]};}),clockAtStart:12};
    }else if(id==='tomato-texture'){
      if(typeof R.tomatoHandling!=='function')throw new Error('This cooking engine cannot provide the tomato texture activity.');
      state=R.startRescue('cooled',0,'practice');var tomato=state&&R.tomatoHandling(state),n=state&&state.pan,p=state&&state.pot;
      var known=state&&n&&p&&state.version===1&&state.id==='tomato'&&state.servings===2&&state.mode==='practice'&&state.time===0&&state.log.length===0&&!state.plated&&!state.submitted&&state.rescue&&state.rescue.id==='cooled'&&state.rescue.prediction===0&&
        Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})&&n.temp===35&&n.heat===0&&n.moisture===60&&n.soft===1&&n.damage===0&&n.combined&&n.produce&&n.garlic&&n.oil&&!n.tasted&&n.chemistry.starchG===.8&&n.chemistry.oilMl===15&&n.chemistry.dispersion===.9&&p.heat===0&&p.drained&&p.pasta&&p.progress===.9&&p.reserve===150&&
        tomato&&tomato.pieces.length===14&&tomato.pieces.every(function(piece){return piece.stage===0&&piece.ready&&Math.abs(piece.juice-60/14)<1e-9;})&&Math.abs(tomato.juiceRemaining-60)<1e-9&&R.mixing(state).pending.totalMl===0;
      if(!known)throw new Error('The provided softened tomato dish no longer matches avatar protocol 2.');
      setup={id:'cooled-softened-tomato-retained-juice-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'rescue',id:'cooled',prediction:0},actions:[],clockAtStart:0};
    }else if(id==='surface-drying'){
      if(typeof R.drying!=='function')throw new Error('This cooking engine cannot provide the surface-drying activity.');
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.prep.hands||state.prep.rinsed||state.prep.dry||n.produce||n.heat||p.heat||n.temp!==22||p.temp!==22||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The provided mushroom sample no longer matches avatar protocol 2.');
      state=setupAction(state,'wash',undefined,'select');state=setupAction(state,'rinse',undefined,'select');var drying=R.drying(state);
      if(!state.prep.hands||!state.prep.rinsed||state.time!==0||drying.remaining!==16||drying.cloth!==0||drying.capacity!==8||drying.surfaceWater!==30||!drying.areas.every(function(value){return value===2;}))throw new Error('The provided rinse-water setup no longer matches avatar protocol 2.');
      setup={id:'rinsed-mushroom-dry-cloth-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:[{action:'wash',value:null,interaction:'select'},{action:'rinse',value:null,interaction:'select'}],clockAtStart:0};
    }else if(id==='cool-and-fold-sauce'){
      state=R.startRescue('separated',2,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      if(!state||!n||!p||!n.chemistry||!n.pendingLiquid||!Array.isArray(n.pieces)||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||!state.rescue||state.rescue.id!=='separated'||state.rescue.prediction!==2||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})||!state.prep.hands||!state.prep.rinsed||!state.prep.cut||!state.prep.dry||!state.prep.garlic||state.prep.pasta!==160||state.prep.cuts.length!==8||state.prep.cuts.some(function(width){return width!==5;})||q.produce!==200||q.pasta!==160||q.oil!==15||n.temp!==115||n.heat!==2||R.panPosition(state).site!=='burner'||n.moisture!==80||n.absorbedWaterMl!==0||n.evaporatedWaterMl!==0||!n.oil||!n.produce||!n.garlic||!n.combined||n.tasted||n.brown!==1||n.damage!==0||n.waterAdded!==50||n.chemistry.oilMl!==25||n.chemistry.starchG!==1.2||n.chemistry.dispersion!==.08||Object.keys(n.pendingLiquid).some(function(key){return n.pendingLiquid[key]!==0;})||n.pieces.length!==14||n.pieces.some(function(piece){return piece.width!==5||piece.down!==0||piece.faces.some(function(v){return v!==1;})||piece.damage.some(function(v){return v!==0;});})||p.heat!==0||p.temp!==22||p.water!==0||!p.pasta||!p.drained||p.progress!==.9||!p.stirred||p.reserve!==150||p.reserveTemp!==92||p.reserveStarchG!==1.8||p.starchG!==0||p.surfaceStarchG!==0||p.discardedStarchG!==0)throw new Error('The provided hot separated sauce no longer matches avatar protocol 2.');
      if(n.size!=='standard'||n.lastStir!==0||n.soft!==0||p.lid!=='rest'||!p.sample||p.sample.time!==0||p.sample.progress!==.9||p.sample.texture!=='Tender with a slight bite'||n.pieces.some(function(piece,index){var angle=index*2.4,radius=.18+(index%3)*.14;return piece.x!==Math.cos(angle)*radius||piece.z!==Math.sin(angle)*radius||piece.cutIndex!==Math.floor(index*8/14)||piece.soft!==0;}))throw new Error('The provided hot-pan geometry or pasta setup no longer matches avatar protocol 2.');
      setup={id:'hot-separated-mushroom-sauce-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'rescue',id:'separated',prediction:2},actions:[],clockAtStart:0,startingWaterMl:80,startingOilMl:25,startingStarchG:1.2,startingPastaProgress:.9};
    }else if(id==='cool-and-fold-sauce'){
      state=R.startRescue('separated',2,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      if(!state||!n||!p||!n.chemistry||!n.pendingLiquid||!Array.isArray(n.pieces)||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||!state.rescue||state.rescue.id!=='separated'||state.rescue.prediction!==2||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);})||!state.prep.hands||!state.prep.rinsed||!state.prep.cut||!state.prep.dry||!state.prep.garlic||state.prep.pasta!==160||state.prep.cuts.length!==8||state.prep.cuts.some(function(width){return width!==5;})||q.produce!==200||q.pasta!==160||q.oil!==15||n.temp!==115||n.heat!==2||R.panPosition(state).site!=='burner'||n.moisture!==80||n.absorbedWaterMl!==0||n.evaporatedWaterMl!==0||!n.oil||!n.produce||!n.garlic||!n.combined||n.tasted||n.brown!==1||n.damage!==0||n.waterAdded!==50||n.chemistry.oilMl!==25||n.chemistry.starchG!==1.2||n.chemistry.dispersion!==.08||Object.keys(n.pendingLiquid).some(function(key){return n.pendingLiquid[key]!==0;})||n.pieces.length!==14||n.pieces.some(function(piece){return piece.width!==5||piece.down!==0||piece.faces.some(function(v){return v!==1;})||piece.damage.some(function(v){return v!==0;});})||p.heat!==0||p.temp!==22||p.water!==0||!p.pasta||!p.drained||p.progress!==.9||!p.stirred||p.reserve!==150||p.reserveTemp!==92||p.reserveStarchG!==1.8||p.starchG!==0||p.surfaceStarchG!==0||p.discardedStarchG!==0)throw new Error('The provided hot separated sauce no longer matches avatar protocol 2.');
      setup={id:'hot-separated-mushroom-sauce-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'rescue',id:'separated',prediction:2},actions:[],clockAtStart:0,startingWaterMl:80,startingOilMl:25,startingStarchG:1.2,startingPastaProgress:.9};
    }else if(id==='cover-and-check-pasta'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||state.prep.hands||state.prep.pasta!==0||n.produce||n.heat||p.heat||n.temp!==22||p.temp!==22||p.water!==0||p.pasta||p.drained||p.sample||p.lid!=='rest'||R.ingredients(state).pasta!==160||R.ingredients(state).water!==1200||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied covered-pot station no longer matches avatar protocol 2.');
      var actions=[['wash',undefined,'select'],['weigh',160,'packet-weigh'],['fill',undefined,'select'],['potHeat',3,'select'],['advance',60,'select'],['advance',60,'select'],['pasta',undefined,'select'],['stirPot',undefined,'select']];
      for(var i=0;i<6;i++)actions.push(['advance',60,'select']);
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],entry[2]);});p=state.pot;
      if(!state.prep.hands||state.prep.pasta!==160||state.time!==480||state.log.length!==14||p.temp!==100||p.heat!==3||p.lid!=='rest'||!p.pasta||p.drained||p.sample||p.reserve!==0||p.reserveStarchG!==0||p.discardedStarchG!==0||Math.abs(p.water-1063.2)>1e-7||Math.abs(p.starchG-4.7545101406787555)>1e-9||Math.abs(p.releasedStarchG-p.starchG)>1e-9||Math.abs(p.surfaceStarchG-.64)>1e-9||Math.abs(p.progress-.7428922094810555)>1e-9||!p.stirred||!Array.isArray(p.bundles)||p.bundles.length!==6||p.bundles.some(function(bundle){return bundle.cling!==0||!bundle.released||Math.abs(bundle.progress-.7428922094810555)>1e-9;})||state.pan.produce||state.pan.heat||state.pan.combined)throw new Error('The provided six-minute pasta batch no longer matches avatar protocol 2.');
      setup={id:'six-minute-pasta-uncovered-pot-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:entry[2]};}),clockAtStart:480,startingWaterMl:p.water,startingDissolvedStarchG:p.starchG,dryPastaGrams:160};
    }else if(id==='reserve-and-drain'){
      if(typeof R.waterHandling!=='function')throw new Error('This cooking engine cannot provide the reserve-and-drain activity.');
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||state.prep.hands||state.prep.pasta!==0||n.produce||n.heat||p.heat||n.temp!==22||p.temp!==22||p.water!==0||p.pasta||p.drained||p.reserve!==0||p.starchG!==0||R.ingredients(state).pasta!==160||R.ingredients(state).water!==1200||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied pasta cooking station no longer matches avatar protocol 2.');
      var actions=[['wash',undefined,'select'],['weigh',160,'packet-weigh'],['fill',undefined,'select'],['potHeat',3,'select'],['advance',60,'select'],['advance',60,'select'],['pasta',undefined,'select'],['stirPot',undefined,'select']];
      for(var i=0;i<8;i++)actions.push(['advance',60,'select']);actions.push(['potHeat',0,'select']);
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],entry[2]);});p=state.pot;
      if(!state.prep.hands||state.prep.pasta!==160||state.time!==600||state.log.length!==17||p.temp!==100||p.heat!==0||!p.pasta||p.drained||p.sample||p.reserve!==0||p.reserveStarchG!==0||p.discardedStarchG!==0||Math.abs(p.water-1020)>1e-7||Math.abs(p.starchG-6.354510140678749)>1e-9||Math.abs(p.releasedStarchG-p.starchG)>1e-9||Math.abs(p.surfaceStarchG-.64)>1e-9||Math.abs(p.progress-.9928922094810545)>1e-9||!p.stirred||(p.lid||'rest')!=='rest'||!Array.isArray(p.bundles)||p.bundles.length!==6||p.bundles.some(function(bundle){return bundle.cling!==0||!bundle.released||Math.abs(bundle.progress-.9928922094810546)>1e-9;})||state.pan.produce||state.pan.heat||state.pan.combined)throw new Error('The provided cooked pasta and starchy water no longer match avatar protocol 2.');
      setup={id:'sample-ready-cooked-pasta-starchy-water-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:entry[2]};}),clockAtStart:600,targetReserveMl:200,startingWaterMl:p.water,startingDissolvedStarchG:p.starchG};
    }else if(id==='mushroom-turning'){
      if(typeof R.panSurface!=='function')throw new Error('This cooking engine cannot provide mushroom turning.');
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot,q=state&&R.ingredients(state);
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.rescue||state.prep.hands||state.prep.rinsed||state.prep.cut||state.prep.dry||state.prep.pasta!==0||n.produce||n.oil||n.combined||n.heat||p.heat||n.temp!==22||p.temp!==22||p.water!==0||p.pasta||q.produce!==200||q.oil!==15||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied mushroom cooking station no longer matches avatar protocol 2.');
      var actions=[['wash'],['rinse'],['cut'],['dry'],['oil'],['panHeat',2],['advance',60],['advance',60],['produce'],['advance',60],['advance',15]];
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],'select');});n=state.pan;
      var expectedFaces=[.7363522463337576,.6662234609686379,.7008140105068389,.7363522463337576,.6662234609686379,.7008140105068389,.6069930679237732,.7832627176252903,.8055333454101595,.4776338895137887,.7832627176252903,.8055333454101595,.6069930679237732,.6662234609686379];
      if(state.time!==195||state.log.length!==11||!state.prep.hands||!state.prep.rinsed||!state.prep.cut||!state.prep.dry||!n.produce||!n.oil||n.combined||n.garlic||n.heat!==2||Math.abs(n.temp-173.21055795472736)>1e-9||n.moisture!==0||n.evaporatedWaterMl!==35||n.damage!==0||Math.abs(n.brown-.3479362517149765)>1e-12||n.chemistry.oilMl!==15||state.pot.water||state.pot.pasta||state.pot.heat||n.pieces.length!==14||n.pieces.some(function(piece,index){var a=index*2.4,r=.18+(index%3)*.14;return piece.down!==0||piece.width!==5||piece.cutIndex!==Math.floor(index*8/14)||Math.abs(piece.x-Math.cos(a)*r)>1e-12||Math.abs(piece.z-Math.sin(a)*r)>1e-12||Math.abs(piece.faces[0]-expectedFaces[index])>1e-12||piece.faces[1]!==0||piece.damage[0]!==0||piece.damage[1]!==0;})||R.panSurface(state).crowded!==8)throw new Error('The provided mushroom faces no longer match avatar protocol 2.');
      setup={id:'first-side-mushroom-browning-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:'select'};}),clockAtStart:195,produceGrams:200,oilMl:15,pieceCount:14};
    }else if(id==='pasta-weighing'){
      state=R.start('mushroom',2,'practice');var n=state&&state.pan,p=state&&state.pot;
      if(!state||!n||!p||state.version!==1||state.id!=='mushroom'||state.servings!==2||state.mode!=='practice'||state.time!==0||state.log.length!==0||state.plated||state.submitted||state.prep.hands||state.prep.pasta!==0||n.produce||n.heat||p.heat||n.temp!==22||p.temp!==22||p.water!==0||p.pasta||p.drained||R.ingredients(state).pasta!==160||R.ingredients(state).water!==1200||!Object.keys(flags).every(function(key){return state[key]===(key==='sauceModel'?2:flags[key]);}))throw new Error('The supplied weighing station no longer matches avatar protocol 2.');
      var actions=[['wash',undefined,'select'],['weigh',40,'packet-weigh'],['fill',undefined,'select'],['potHeat',3,'select'],['advance',60,'select'],['advance',60,'select'],['potHeat',0,'select']];
      actions.forEach(function(entry){state=setupAction(state,entry[0],entry[1],entry[2]);});p=state.pot;
      if(!state.prep.hands||state.prep.pasta!==40||state.time!==120||p.temp!==100||p.heat!==0||p.pasta||p.drained||p.progress!==0||p.reserve!==0||p.starchG!==0||(p.lid||'rest')!=='rest'||Math.abs(p.water-1189.2)>1e-7||state.pan.produce||state.pan.heat)throw new Error('The provided hot-water and starter-portion setup no longer matches avatar protocol 2.');
      setup={id:'weighed-starter-preheated-pot-v1',provided:true,description:getActivity(id).initialSetup,source:{kind:'recipe',id:'mushroom',servings:2},actions:actions.map(function(entry){return {action:entry[0],value:entry[1]===undefined?null:entry[1],interaction:entry[2]};}),clockAtStart:120,supplyGrams:800,targetGrams:160,starterGrams:40};
    }else throw new RangeError('Choose a supported chef activity.');
    return {state:state,setup:setup};
  }
  function activityGuide(id,mode,state,receipts){
    if(id==='hold-and-recheck-sauce')return holdingGuide(mode,state,receipts||[]);
    if(id==='finish-pasta-in-sauce')return finishingGuide(mode,state,receipts||[]);
    if(id==='preheat-and-load-mushrooms')return panLoadingGuide(state,receipts||[]);
    if(id==='rinse-and-dry-produce')return rinsingGuide(state,receipts||[]);
    if(id==='space-mushrooms')return spacingGuide(state,receipts||[]);
    if(id==='precision-mushroom-cuts')return cuttingGuide(state,receipts||[]);
    if(id==='separate-and-check-pasta')return strandsGuide(state,receipts||[]);
    if(id==='cool-and-fold-sauce')return thermalGuide(state,receipts||[]);
    if(id==='cover-and-check-pasta')return coveringGuide(state,receipts||[]);
    if(id==='mushroom-turning')return browningGuide(state,receipts||[]);
    if(id==='reserve-and-drain'){
      var water=drainageFacts(state),drainCount=state.log.filter(function(entry){return entry.accepted&&entry.action==='drainPour';}).length;
      if(water.drained)return {index:9,kind:null,amountMl:null,label:water.reserveTargetMet?(water.drainedBeforeTargetMl>0?'The pot is drained. You recovered the 200 mL reserve after some water had already been discarded.':'The pot is drained and 200 mL of starchy water was saved before draining.')+' Compare the saved and discarded starch; this does not finish a sauce.':'The pot is drained with '+water.savedWaterMl+' mL saved, '+water.remainingReserveMl+' mL short of the 200 mL target. The discarded water cannot be recovered in this attempt. This does not finish a sauce.',complete:true,targetMet:water.reserveTargetMet};
      if(!water.sampled)return {index:0,kind:'samplePasta',amountMl:null,label:'Take an actual pasta sample before draining. No texture reading has been recorded for this supplied batch.',complete:false,targetMet:false};
      if(water.nextScoopMl>0&&!water.reserveTargetMet)return {index:1+Math.min(3,Math.floor(water.savedWaterMl/50)),kind:'reserveWater',amountMl:water.nextScoopMl,label:'The jug holds '+water.savedWaterMl+' of the 200 mL target. The next ladle saves '+water.nextScoopMl+' mL of the cooking water still in the pot.'+(water.lostReserveMl>0?' At least '+water.lostReserveMl+' mL of the target can no longer be recovered.':''),complete:false,targetMet:false};
      var amount=water.potWaterMl>100?250:water.potWaterMl>50?100:water.potWaterMl>25?50:25;
      return {index:5+Math.min(3,drainCount),kind:'drainPasta',amountMl:amount,label:water.emptyNeedsFinish?'The pot contains no water. Confirm the empty pot to finish the drain; this transfers 0 mL.':water.traceWater?'Only a trace of cooking water remains. Finish this final pour; its actual transfer is less than 0.01 mL.':(water.reserveTargetMet?'The 200 mL reserve is saved. ':'No more whole 10 mL ladles can be saved. '+water.remainingReserveMl+' mL of the reserve target is missing. ')+'Choose a maximum pour; only the water actually left in the pot will drain. Discarded water and its dissolved starch cannot return.',complete:false,targetMet:water.reserveTargetMet};
    }
    if(id==='pasta-weighing'){
      var portion=weighingFacts(state),difference=portion.targetGrams-portion.recordedGrams;
      if(portion.transferred)return {index:3,kind:null,grams:null,label:portion.onTarget?'The recorded 160 g portion has entered the pot. The scale is empty; compare the before-and-after water temperature. The pasta has not been cooked by this activity.':'The recorded '+portion.recordedGrams+' g portion has entered the pot, '+Math.abs(difference)+' g '+(difference>0?'below':'above')+' the 160 g target. This transfer is finished with a portion mismatch; the pasta has not been cooked by this activity.',complete:true,targetMet:portion.onTarget};
      if(!difference)return {index:2,kind:'addPasta',grams:null,label:'The scale records the 160 g recipe target. Carry this tray level, tip it over the prepared pot and compare the water temperature after release.',complete:false,targetMet:true};
      var grams=[80,40,20,10].find(function(amount){return amount<=Math.abs(difference);});
      return {index:portion.recordedGrams<120?0:1,kind:difference>0?'addDry':'returnDry',grams:grams,label:'The scale records '+portion.recordedGrams+' g; the recipe target is 160 g. '+(difference>0?'Add':'Return')+' '+grams+' g, then read the new total before deciding on another adjustment.',complete:false,targetMet:false};
    }
    if(id==='garlic-preparation'){
      var garlic=R.garlicPreparation(state),next=garlic.cloves.find(function(clove){return clove.stage<3;});
      return {index:garlic.passes,kind:next?'mince':null,clove:next?next.index:null,label:next?'Clove '+(next.index+1)+' is '+next.texture+'. Make the next pass to leave it '+['sliced','chopped','minced'][next.stage]+'.':'Both cloves are minced. Compare their recorded preparation stages and explain the knife sequence.',complete:garlic.complete};
    }
    if(id==='tomato-texture'){
      var tomato=R.tomatoHandling(state),presses=tomato.crushed*2+tomato.split,lastPress=-1,firstPress=-1;
      state.log.forEach(function(entry,index){if(entry.accepted&&entry.action==='crushTomato'){lastPress=index;if(firstPress<0)firstPress=index;}});
      var folds=state.log.slice(lastPress+1).filter(function(entry){return entry.accepted&&entry.action==='stirSweep';}).length,next=tomato.pieces.find(function(piece){return piece.ready;});
      if(!state.log.length)return {index:0,kind:'inspect',piece:null,label:'Check the starting sauce before releasing any retained tomato juice.',complete:false};
      if(presses<4)return {index:1+presses,kind:'press',piece:next.index,label:'Piece '+(next.index+1)+' is '+next.texture+'. Press a softened piece; '+(4-presses)+' of the four guided presses remain.',complete:false};
      if(folds<2)return {index:5+Math.min(1,folds),kind:'fold',piece:null,label:'Fold the released juice through the sauce. '+(2-folds)+' complete folds remain before a fresh comparison.',complete:false};
      if(!state.pan.tasted)return {index:7,kind:'inspect',piece:null,label:'Take a fresh spoon check after folding; compare the sauce body and tomato texture with the starting check.',complete:false};
      if(!state.log.slice(0,firstPress).some(function(entry){return entry.accepted&&entry.action==='taste';}))return {index:7,kind:null,piece:null,label:'A fresh current check is recorded, but no starting check was taken before pressing. Start a fresh attempt to compare before and after; you can keep exploring this dish independently.',complete:false,comparisonMissing:true};
      return {index:8,kind:null,piece:null,label:'Compare the recorded checks: '+tomato.crushed+' crushed and '+tomato.split+' split pieces; '+Math.round(tomato.juiceReleased*10)/10+' mL of retained juice released. This does not certify the sauce is ready to serve.',complete:true};
    }
    if(id==='surface-drying'){
      var drying=R.drying(state),area=drying.areas.findIndex(function(amount){return amount>0;}),complete=drying.complete&&drying.cloth===0,index=state.log.length-2;
      if(complete)return {index:index,kind:null,area:null,label:'All sixteen modeled surface-water marks are removed and the cloth has been wrung into the bowl. Internal mushroom moisture remains.',complete:true};
      if(drying.cloth===drying.capacity||drying.complete)return {index:index,kind:'wring',area:null,label:(drying.complete?'The mushroom surfaces are blotted.':'The cloth is full; it cannot absorb more.')+' Wring '+drying.cloth+' collected water marks into the bowl.',complete:false};
      return {index:index,kind:'blot',area:area,label:'Blot a wet area. '+drying.remaining+' surface-water marks remain; the cloth holds '+drying.cloth+' of '+drying.capacity+'.',complete:false};
    }
    var portion=R.serving(state),over=portion.plates.findIndex(function(amount){return amount>4;}),least=portion.plates[0]<=portion.plates[1]?0:1;
    if(state.plated)return {index:9,kind:null,plate:null,label:portion.balanced?'The eight spoonfuls are plated in equal shares. Explain how you checked the portions.':'The eight spoonfuls were plated in unequal shares. The recorded counts show the final distribution.',complete:true};
    if(portion.remaining>0)return {index:portion.served,kind:'serve',plate:least,label:'Carry one spoonful to plate '+(least+1)+'. '+portion.remaining+' remain in the pan; compare both plate counts.',complete:false};
    if(!portion.balanced&&mode!=='independent')return {index:8,kind:'return',plate:over,label:'The pan is empty, but the portions differ. Return a spoonful from plate '+(over+1)+' before sharing it again.',complete:false};
    return {index:8,kind:'finish',plate:null,label:portion.balanced?'The pan is empty and both plates hold four spoonfuls. Review the plates before finishing.':'The pan is empty with unequal shares. You can return a portion to rebalance or finish and record this distribution.',complete:false};
  }
  function createActivity(id,mode){
    var definition=getActivity(id);if(!definition||definition.protocol!==2)throw new RangeError('Choose a supported chef activity.');var supplied=activityBaseline(id);
    return seal({protocol:2,activity:id,mode:mode,state:supplied.state,setup:supplied.setup,reading:null,inspectionFresh:false,pending:null,sequence:0,
      record:{protocol:2,activity:id,mode:mode,intents:[],reflection:''},guide:activityGuide(id,mode,supplied.state),receipts:[],lastReceipt:null,lastIntent:null,limitReached:false});
  }
  function normalizeActivityIntent(raw,mode,id){
    var definition=getActivity(id);if(!definition||definition.protocol!==2||!object(raw)||raw.activity!==id||raw.mode!==mode||raw.actor!==(mode==='watch'?'demonstrator':'learner')||typeof raw.method!=='string'||(mode==='watch'?raw.method!=='demonstrator':methods.indexOf(raw.method)<0)||!definition.kinds.includes(raw.kind))return null;
    var out={kind:raw.kind,method:raw.method,actor:raw.actor,mode:mode,activity:id},keys=['kind','method','actor','mode','activity'];
    if((id==='finish-pasta-in-sauce'||id==='hold-and-recheck-sauce')&&raw.kind==='pour'){if(raw.source!=='reduced'||!Number.isInteger(raw.amountMl)||raw.amountMl<10||raw.amountMl>100||raw.amountMl%10)return null;out.source=raw.source;out.amountMl=raw.amountMl;keys.push('source','amountMl');}
    if(raw.kind==='moveMushroom'){if(!Number.isInteger(raw.piece)||raw.piece<0||raw.piece>13||!Number.isInteger(raw.x)||!Number.isInteger(raw.z)||Math.hypot(raw.x,raw.z)>60)return null;out.piece=raw.piece||0;out.x=raw.x||0;out.z=raw.z||0;keys.push('piece','x','z');}
    if(raw.kind==='sliceProduce'){if(!Number.isInteger(raw.piece)||raw.piece<0||raw.piece>39||!Number.isInteger(raw.cutMm)||raw.cutMm<1||raw.cutMm>39)return null;out.piece=raw.piece;out.cutMm=raw.cutMm;keys.push('piece','cutMm');}
    if(raw.kind==='separatePasta'){if(!Number.isInteger(raw.group)||raw.group<0||raw.group>5)return null;out.group=raw.group;keys.push('group');}
    if(raw.kind==='mince'){if(!Number.isInteger(raw.clove)||raw.clove<0||raw.clove>1)return null;out.clove=raw.clove;keys.push('clove');}
    if(raw.kind==='serve'||raw.kind==='return'){if(!Number.isInteger(raw.plate)||raw.plate<0||raw.plate>1)return null;out.plate=raw.plate;keys.push('plate');}
    if(raw.kind==='press'||raw.kind==='turnMushroom'){if(!Number.isInteger(raw.piece)||raw.piece<0||raw.piece>13)return null;out.piece=raw.piece;keys.push('piece');}
    if(raw.kind==='blot'){if(!Number.isInteger(raw.area)||raw.area<0||raw.area>7)return null;out.area=id==='rinse-and-dry-produce'?(raw.area||0):raw.area;keys.push('area');}
    if(raw.kind==='addDry'||raw.kind==='returnDry'){if(![10,20,40,80].includes(raw.grams))return null;out.grams=raw.grams;keys.push('grams');}
    if(raw.kind==='drainPasta'){if(![25,50,100,250].includes(raw.amountMl))return null;out.amountMl=raw.amountMl;keys.push('amountMl');}
    if(raw.kind==='waitPan'||raw.kind==='waitPot'){if(![15,30,60].includes(raw.seconds))return null;out.seconds=raw.seconds;keys.push('seconds');}
    if(raw.kind==='setPanHeat'||raw.kind==='setPotHeat'){if(!Number.isInteger(raw.setting)||raw.setting<0||raw.setting>3)return null;out.setting=['preheat-and-load-mushrooms','finish-pasta-in-sauce'].includes(id)?(raw.setting||0):raw.setting;keys.push('setting');}
    if(raw.kind==='moveLid'||raw.kind==='movePan'){if(!(raw.kind==='moveLid'?['covered','rest']:['burner','trivet']).includes(raw.placement))return null;out.placement=raw.placement;keys.push('placement');}
    if(Object.keys(raw).some(function(key){return !keys.includes(key);}))return null;return out;
  }
  function allowedActivity(s,intent){
    if(!intent||s.limitReached||s.state.plated||s.state.submitted||s.state.time>=3600)return false;
    if(intent.activity!==s.activity||intent.mode!==s.mode)return false;
    if(s.activity==='hold-and-recheck-sauce'){
      if(intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat||intent.kind==='pour'&&intent.amountMl>s.state.pot.reserve||intent.kind==='fold'&&s.state.time+6>3600||intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='pour'?intent.source===s.guide.source&&intent.amountMl===s.guide.amountMl:intent.kind==='waitPan'?intent.seconds===s.guide.seconds:intent.kind==='setPanHeat'?intent.setting===s.guide.setting:true);
    }
    if(s.activity==='finish-pasta-in-sauce'){
      if(intent.kind==='combinePasta'&&s.state.pan.combined||intent.kind==='inspect'&&!s.state.pan.combined||intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat||intent.kind==='pour'&&intent.amountMl>s.state.pot.reserve||(intent.kind==='combinePasta'||intent.kind==='fold')&&s.state.time+6>3600||intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='pour'?intent.source===s.guide.source&&intent.amountMl===s.guide.amountMl:intent.kind==='waitPan'?intent.seconds===s.guide.seconds:intent.kind==='setPanHeat'?intent.setting===s.guide.setting:true);
    }
    if(s.activity==='preheat-and-load-mushrooms'){
      if(intent.kind==='loadMushrooms'&&s.state.pan.produce||intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat||intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='waitPan'?s.guide.seconds===intent.seconds:intent.kind==='setPanHeat'?s.guide.setting===intent.setting:true);
    }
    if(s.activity==='rinse-and-dry-produce'){
      if(!s.state.prep.hands||s.state.prep.cut||s.state.pan.produce)return false;
      if(s.mode==='watch'&&(s.guide.complete||s.guide.kind!==intent.kind||intent.kind==='blot'&&s.guide.area!==intent.area))return false;
      if(intent.kind==='rinseProduce')return !s.state.prep.rinsed;
      if(!s.state.prep.rinsed)return false;
      var drying=R.drying(s.state);
      if(intent.kind==='blot')return drying.cloth<drying.capacity&&drying.areas[intent.area]>0;
      return intent.kind==='wring'&&drying.cloth>0;
    }
    if(s.activity==='space-mushrooms'){
      var piece=s.state.pan.pieces[intent.piece];if(!piece||piece.x===intent.x/100&&piece.z===intent.z/100)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&s.guide.piece===intent.piece&&s.guide.x===intent.x&&s.guide.z===intent.z;
    }
    if(s.activity==='precision-mushroom-cuts'){
      var widths=s.state.prep.cuts;if(s.state.prep.cut)return false;
      if(intent.kind==='sliceProduce'&&(intent.piece>=widths.length||intent.cutMm>=widths[intent.piece])||intent.kind==='finishCuts'&&widths.length<2)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind!=='sliceProduce'||s.guide.piece===intent.piece&&s.guide.cutMm===intent.cutMm);
    }
    if(s.activity==='separate-and-check-pasta'){
      var p=s.state.pot;if(!p.pasta||p.drained||p.lid!=='rest')return false;
      if(intent.kind==='waitPot'&&s.state.time+intent.seconds>3600||intent.kind==='setPotHeat'&&intent.setting===p.heat||intent.kind==='separatePasta'&&(p.water<=0||p.bundles[intent.group].released))return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='separatePasta'?s.guide.group===intent.group:intent.kind==='waitPot'?s.guide.seconds===intent.seconds:intent.kind==='setPotHeat'?s.guide.setting===intent.setting:true);
    }
    if(s.activity==='cool-and-fold-sauce'){
      if(intent.kind==='fold'&&s.state.time+6>3600||intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      if(intent.kind==='movePan'&&intent.placement===R.panPosition(s.state).site||intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='movePan'?s.guide.placement===intent.placement:intent.kind==='waitPan'?s.guide.seconds===intent.seconds:intent.kind==='setPanHeat'?s.guide.setting===intent.setting:true);
    }
    if(s.activity==='cool-and-fold-sauce'){
      if(intent.kind==='fold'&&s.state.time+6>3600||intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      if(intent.kind==='movePan'&&intent.placement===R.panPosition(s.state).site||intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='movePan'?s.guide.placement===intent.placement:intent.kind==='waitPan'?s.guide.seconds===intent.seconds:intent.kind==='setPanHeat'?s.guide.setting===intent.setting:true);
    }
    if(s.activity==='cover-and-check-pasta'){
      var p=s.state.pot;if(!p.pasta||p.drained)return false;
      if(intent.kind==='waitPot'&&s.state.time+intent.seconds>3600)return false;
      if(intent.kind==='setPotHeat'&&intent.setting===p.heat)return false;
      if(intent.kind==='moveLid'&&(intent.placement===p.lid||intent.placement==='covered'&&p.water<=0)||intent.kind==='samplePasta'&&p.lid==='covered')return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='moveLid'?s.guide.placement===intent.placement:intent.kind==='waitPot'?s.guide.seconds===intent.seconds:intent.kind==='setPotHeat'?s.guide.setting===intent.setting:true);
    }
    if(s.activity==='mushroom-turning'){
      if(intent.kind==='waitPan'&&s.state.time+intent.seconds>3600)return false;
      if(intent.kind==='setPanHeat'&&intent.setting===s.state.pan.heat)return false;
      return s.mode!=='watch'||!s.guide.complete&&s.guide.kind===intent.kind&&(intent.kind==='turnMushroom'?s.guide.piece===intent.piece:intent.kind==='waitPan'?s.guide.seconds===intent.seconds:s.guide.setting===intent.setting);
    }
    if(s.activity==='reserve-and-drain'){
      var water=drainageFacts(s.state);if(water.drained)return false;
      if(s.mode==='watch'&&(s.guide.kind!==intent.kind||intent.kind==='drainPasta'&&s.guide.amountMl!==intent.amountMl))return false;
      if(intent.kind==='samplePasta')return true;
      if(intent.kind==='reserveWater')return water.nextScoopMl>0&&(s.mode==='independent'||water.sampled);
      return intent.kind==='drainPasta'&&water.sampled&&(s.mode==='independent'||water.reserveTargetMet);
    }
    if(s.activity==='pasta-weighing'){
      var portion=weighingFacts(s.state);if(portion.transferred||s.state.pot.drained)return false;
      if(s.mode==='watch'&&(s.guide.kind!==intent.kind||(intent.kind==='addDry'||intent.kind==='returnDry')&&s.guide.grams!==intent.grams))return false;
      if(intent.kind==='addDry')return portion.recordedGrams+intent.grams<=portion.maximumGrams;
      if(intent.kind==='returnDry')return portion.recordedGrams-intent.grams>=portion.minimumGrams;
      return intent.kind==='addPasta'&&(s.mode==='independent'||portion.onTarget)&&s.state.pot.water>=500&&s.state.pot.temp>=96&&(s.state.pot.lid||'rest')==='rest';
    }
    if(s.activity==='garlic-preparation'){
      if(intent.kind!=='mince'||R.garlicPreparation(s.state).cloves[intent.clove].stage>=3)return false;
      return s.mode!=='watch'||s.guide.kind==='mince'&&intent.clove===s.guide.clove;
    }
    if(s.activity==='tomato-texture'){
      if(s.mode!=='independent'&&(s.guide.complete||s.guide.kind!==intent.kind))return false;
      if(intent.kind==='press')return R.tomatoHandling(s.state).pieces[intent.piece].ready&&(s.mode!=='watch'||s.guide.piece===intent.piece);
      if(intent.kind==='fold')return s.state.time+6<=3600;
      return intent.kind==='inspect';
    }
    if(s.activity==='surface-drying'){
      var drying=R.drying(s.state);
      if(s.mode==='watch'&&(s.guide.complete||s.guide.kind!==intent.kind||intent.kind==='blot'&&s.guide.area!==intent.area))return false;
      if(intent.kind==='blot')return drying.cloth<drying.capacity&&drying.areas[intent.area]>0;
      return intent.kind==='wring'&&drying.cloth>0;
    }
    var portion=R.serving(s.state);
    if(s.mode==='watch'&&(s.guide.kind!==intent.kind||(intent.kind==='serve'||intent.kind==='return')&&s.guide.plate!==intent.plate))return false;
    if(intent.kind==='serve')return portion.ready&&portion.remaining>0;
    if(intent.kind==='return')return portion.plates[intent.plate]>0;
    if(intent.kind==='finish')return portion.ready&&portion.manual&&portion.served===portion.total&&portion.remaining===0&&(s.mode==='independent'||portion.balanced);
    return false;
  }
  // This activity's supplied cook is pinned above. Surface starch stays on the
  // pasta; it is deliberately excluded from the dissolved-water starch budget.
  function drainageFacts(state){
    var p=state.pot,handling=R.waterHandling(state),saved=0,earlyDrain=0;
    state.log.forEach(function(entry){if(!entry.accepted||!entry.transfer)return;if(entry.action==='ladle')saved+=entry.transfer.amount;if(entry.action==='drainPour'&&saved<200)earlyDrain+=entry.transfer.amount;});
    var totalWater=p.water+p.reserve+handling.drained,totalStarch=p.starchG+p.reserveStarchG+p.discardedStarchG;
    return {potWaterMl:p.water,savedWaterMl:p.reserve,drainedWaterMl:handling.drained,totalWaterMl:totalWater,startingWaterMl:1020,potStarchG:p.starchG,savedStarchG:p.reserveStarchG,discardedStarchG:p.discardedStarchG,totalDissolvedStarchG:totalStarch,startingDissolvedStarchG:6.354510140678749,surfaceStarchG:p.surfaceStarchG,potTemperature:p.water>0?p.temp:null,savedTemperature:p.reserve>0?p.reserveTemp:null,targetReserveMl:200,remainingReserveMl:Math.max(0,200-p.reserve),nextScoopMl:handling.scoop,sampled:!!p.sample,sampleCurrent:!!p.sample&&p.sample.time===state.time&&Math.abs(p.sample.progress-p.progress)<1e-9,drained:!!p.drained,reserveTargetMet:p.reserve===200,lostReserveMl:Math.max(0,200-p.reserve-Math.floor(p.water/10)*10),traceWater:p.water>0&&p.water<.01,emptyNeedsFinish:p.water===0&&!p.drained,waterConserved:Math.abs(totalWater-1020)<1e-7,starchConserved:Math.abs(totalStarch-6.354510140678749)<1e-9,drainedBeforeTargetMl:earlyDrain};
  }
  function drainage(s){return valid(s)&&s.activity==='reserve-and-drain'?freeze(drainageFacts(s.state)):null;}
  // The engine has a default drying profile even before a rinse. Do not present
  // that default as an observed water quantity: the learner's rinse establishes
  // this activity's retained-water budget, not a measurement of faucet flow.
  function rinsingState(state){
    var rinsed=!!state.prep.rinsed,drying=R.drying(state),surface=rinsed?drying.surfaceWater:null,cloth=drying.clothWater,bowl=rinsed?30-surface-cloth:null;
    return {time:state.time,handsWashed:!!state.prep.hands,rinsed:rinsed,burnersOff:state.pan.heat===0&&state.pot.heat===0,areas:rinsed?drying.areas:null,surfaceMarks:rinsed?drying.remaining:null,surfaceWaterMl:surface,clothMarks:drying.cloth,clothCapacity:drying.capacity,clothWaterMl:cloth,wrungWaterMl:bowl,retainedWaterMl:rinsed?30:null,waterConserved:rinsed?Math.abs(surface+cloth+bowl-30)<1e-9:null,targetMet:rinsed&&drying.remaining===0&&drying.cloth===0};
  }
  function rinsingGuide(state,receipts){
    var facts=rinsingState(state),index=receipts.length;
    if(!facts.rinsed)return {index:index,kind:'rinseProduce',area:null,label:'Carry the whole mushrooms under plain running water, turn the basket, lift to drain and return it to the board. Release to record the completed rinse; no retained-water amount is established before that release.',complete:false,targetMet:false};
    if(facts.targetMet)return {index:index,kind:null,area:null,label:'All sixteen modeled surface-water marks have moved into the bowl, and the cloth is empty. The mushrooms retain their natural internal moisture. This records rinsing and surface-water handling, not a cleanliness measurement or a cooked dish.',complete:true,targetMet:true};
    if(facts.clothMarks===facts.clothCapacity||facts.surfaceMarks===0)return {index:index,kind:'wring',area:null,label:(facts.surfaceMarks===0?'The modeled surface water is removed; the cloth still holds water.':'The cloth is full and cannot absorb another mark.')+' Wring its '+facts.clothWaterMl+' mL into the bowl before continuing.',complete:false,targetMet:false};
    return {index:index,kind:'blot',area:facts.areas.findIndex(function(value){return value>0;}),label:'Choose a wet area. '+facts.surfaceMarks+' marks remain on the mushrooms; the cloth holds '+facts.clothMarks+' of '+facts.clothCapacity+'. Each committed blot transfers 1.875 mL. Wring early if you choose; the actual water totals follow your order.',complete:false,targetMet:false};
  }
  function rinsing(s){
    if(!valid(s)||s.activity!=='rinse-and-dry-produce')return null;
    function metadata(receipt){return receipt?Object.assign({actionNumber:receipt.index,actor:receipt.actor,method:receipt.method},copy(receipt.prepWater)):null;}
    return freeze(Object.assign(rinsingState(s.state),{rinseReceipt:metadata(s.receipts.find(function(receipt){return receipt.kind==='rinseProduce';})),lastTransfer:metadata(s.lastReceipt)}));
  }
  var preheatRange=freeze({minimum:150,maximum:190,unit:'°C',illustrative:true});
  var holdingLimitations=freeze(['The supplied pasta amount is its 160 g dry-weight equivalent; cooked pasta mass is not modeled.','Two actual spoon observations compare this mixture across a simulated pause; they do not prove continuous or indefinite stability, safe holding, or a plated dish.','Handling previews are untimed. Each released fold advances six seconds, and each released wait continues cooling or heating, evaporation, water uptake and pasta softening.','The water budget tracks free sauce water, saved water, pasta uptake and evaporation. Pending liquid is part of free water, not an additional reservoir.']);
  function holdingState(state){
    var n=state.pan,p=state.pot,mix=R.mixing(state),water=n.moisture+n.absorbedWaterMl+n.evaporatedWaterMl+p.reserve,starch=n.chemistry.starchG+p.reserveStarchG;
    return {provided:true,time:state.time,dryEquivalentGrams:160,produceGrams:200,panTemperature:n.temp,heat:n.heat,effectiveHeat:R.panPosition(state).heat,burnerOff:n.heat===0,potBurnerOff:p.heat===0,freeWaterMl:n.moisture,savedWaterMl:p.reserve,savedWaterUsedMl:150-p.reserve,savedWaterTemperature:p.reserveTemp,absorbedWaterMl:n.absorbedWaterMl,evaporatedWaterMl:n.evaporatedWaterMl,startingWaterMl:45,initialSavedWaterMl:150,waterBudgetMl:195,waterConserved:Math.abs(water-195)<1e-7,oilMl:n.chemistry.oilMl,sauceStarchG:n.chemistry.starchG,savedStarchG:p.reserveStarchG,totalStarchG:3.05,starchConserved:Math.abs(starch-3.05)<1e-9,pendingLiquidMl:mix.pending.totalMl,needsMixing:mix.needsMixing,pastaProgress:p.progress,pastaTexture:R.inspect(state).pasta,damage:n.damage,damaged:n.damage>=1,scorched:n.damage>=1,pastaTooSoft:p.progress>1.2,requiredSeconds:120,limitations:holdingLimitations};
  }
  function holdingFacts(state,receipts){
    var result=holdingState(state),checks=[],first=null,latest=null,comparisons=[],engine=R.holdingCheck(state),coatingStart=null;
    function metadata(receipt){return receipt?{actionNumber:receipt.index,time:receipt.inspection.time,actor:receipt.actor,method:receipt.method,reading:copy(receipt.inspection),pastaTexture:receipt.holdingCheck.pastaTexture}:null;}
    receipts.forEach(function(receipt){
      if(['pour','fold','setPanHeat'].includes(receipt.kind)){first=null;latest=null;coatingStart=null;}
      if(receipt.kind==='inspect'){
        checks.push(receipt);if(!first)first=receipt;latest=receipt;
        if(receipt.inspection.type==='coating'){if(!coatingStart)coatingStart=receipt;}else coatingStart=null;
        if(receipt.index!==first.index&&receipt.inspection.time-first.inspection.time>=120)comparisons.push({fromAction:first.index,toAction:receipt.index,fromTime:first.inspection.time,toTime:receipt.inspection.time,seconds:receipt.inspection.time-first.inspection.time,firstType:first.inspection.type,latestType:receipt.inspection.type,pastaTexture:receipt.holdingCheck.pastaTexture,damaged:!!receipt.inspection.scorched});
      }
    });
    var last=checks[checks.length-1],fresh=!!last&&last.index===receipts.length,elapsed=first?Math.max(0,state.time-first.inspection.time):0,comparison=first&&latest?Math.max(0,latest.inspection.time-first.inspection.time):0,observed=coatingStart&&latest?Math.max(0,latest.inspection.time-coatingStart.inspection.time):0,held=!!coatingStart&&fresh&&observed>=120&&engine.met&&engine.observedSeconds===observed&&engine.firstCheckAt===coatingStart.inspection.time&&engine.latestCheckAt===latest.inspection.time,complete=fresh&&comparison>=120&&result.burnerOff&&result.potBurnerOff,target=complete&&held&&!result.needsMixing&&!result.damaged&&!result.pastaTooSoft&&result.pastaTexture==='Tender with a slight bite';
    return Object.assign(result,{baseline:metadata(checks[0]),firstCheck:metadata(first),latest:metadata(last),lastCheck:metadata(last),coatingCheck:metadata(coatingStart),checkCount:checks.length,inspectionFresh:fresh,checkCurrent:fresh,comparisonSeconds:comparison,comparisonWaitingSeconds:elapsed,remainingSeconds:Math.max(0,120-elapsed),observedSeconds:observed,waitingSeconds:elapsed,coatingWaitingSeconds:coatingStart?Math.max(0,state.time-coatingStart.inspection.time):0,firstCheckAt:coatingStart?coatingStart.inspection.time:null,latestCheckAt:latest?latest.inspection.time:null,holdingMet:held,complete:complete,targetMet:target,comparisons:comparisons,foldCount:receipts.filter(function(receipt){return receipt.kind==='fold';}).length,totalWaitSeconds:receipts.filter(function(receipt){return receipt.kind==='waitPan';}).reduce(function(total,receipt){return total+receipt.durationSeconds;},0)});
  }
  function holding(s){return valid(s)&&s.activity==='hold-and-recheck-sauce'?freeze(holdingFacts(s.state,s.receipts)):null;}
  function holdingGuide(mode,state,receipts){
    var b=holdingFacts(state,receipts),kind='inspect',label='Record an actual starting spoon check. The supplied pot sample is not a learner sauce observation.',options={},index=receipts.length;
    if(mode==='watch'){
      var step=getActivity('hold-and-recheck-sauce').steps[index];
      return Object.assign({index:index,kind:step?step.kind:null,label:step?step.label:'The two unchanged coating checks are 120 simulated seconds apart. Both burners are off and the pasta retains a slight bite. This pair does not establish indefinite stability or safe holding.',complete:b.targetMet,targetMet:b.targetMet},step?Object.keys(step).reduce(function(out,key){if(key!=='kind'&&key!=='label')out[key]=step[key];return out;},{}):{});
    }
    if(b.heat){kind='setPanHeat';options.setting=0;label='Switch off the burner before beginning a new unchanged-mixture comparison. Changing the setting restarts the observation pair but does not instantly cool the pan.';}
    else if(b.targetMet){kind=null;label='Fresh coating checks of the unchanged mixture are at least 120 simulated seconds apart and the pasta retains a slight bite. Further waiting may still change it; the pair does not predict indefinite stability or safe holding.';}
    else if((b.damaged||b.pastaTooSoft)&&b.inspectionFresh){kind=null;label='The fresh check records '+b.latest.reading.label.toLowerCase()+' and '+b.latest.pastaTexture.toLowerCase()+'. Scorching and pasta softening cannot be reversed. Review the recorded pause and choices or start a fresh attempt.';}
    else if(b.needsMixing){kind='fold';label='Added saved water still pools separately. Release one six-second fold, then take a fresh check before starting a new pause. Folding restarts the comparison and keeps cooking both vessels.';}
    else if(!b.firstCheck||!b.inspectionFresh&&b.remainingSeconds===0){label='Take a fresh spoon check after the recorded actions. Elapsed time alone does not establish the later coating or pasta texture.';}
    else if(b.inspectionFresh&&['thick','dry'].includes(b.latest.reading.type)){
      if(b.savedWaterMl>=10){kind='pour';options.source='reduced';options.amountMl=Math.min(20,Math.floor(b.savedWaterMl/10)*10);label='The check records '+b.latest.reading.label.toLowerCase()+'. Choose a small saved-water adjustment, fold it through, and compare actual checks across a new pause. Each dose also adds starch, and the finite jug cannot be refilled.';}
      else{kind=null;label='The check records a dry or heavy coating and the saved-water jug is exhausted. Folding cannot restore that liquid. Review the actual checks or start fresh.';}
    }
    else if(b.inspectionFresh&&b.latest.reading.type!=='coating'){kind=null;label='The actual check records '+b.latest.reading.label.toLowerCase()+'. Compare its water, oil and pasta evidence before another adjustment. This pause has not established a coating; the controls remain available for exploration.';}
    else if(b.firstCheck&&b.remainingSeconds>0){kind='waitPan';options.seconds=b.remainingSeconds>=60?60:b.remainingSeconds>=30?30:15;if(state.time+options.seconds>3600){kind=null;options={};label='Too little kitchen time remains to complete the next observation interval. Review the recorded checks or start a fresh attempt.';}else label='Release a '+options.seconds+'-second pause, then compare the recorded time. The sauce and pasta keep changing with the burner off. Another liquid addition, fold or burner change restarts the unchanged-mixture comparison.';}
    return Object.assign({index:index,kind:kind,label:label,complete:b.complete,targetMet:b.targetMet},options);
  }
  var finishingEvaporatedAtStart=215.37582320677473,finishingStarchTotal=1.8859823805251855;
  function finishingState(state){
    var n=state.pan,p=state.pot,mix=R.mixing(state),starch=n.chemistry.starchG+p.reserveStarchG+p.surfaceStarchG,water=n.moisture+n.absorbedWaterMl+n.evaporatedWaterMl+p.reserve;
    return {time:state.time,combined:!!n.combined,dryEquivalentGrams:160,inColander:n.combined?0:160,inPan:n.combined?160:0,produceGrams:300,oilMl:n.chemistry.oilMl,panTemperature:n.temp,heat:n.heat,burnerOff:n.heat===0,potBurnerOff:p.heat===0,savedWaterMl:p.reserve,savedWaterUsedMl:200-p.reserve,savedWaterTemperature:p.reserveTemp,freeWaterMl:n.moisture,absorbedWaterMl:n.absorbedWaterMl,evaporatedWaterMl:n.evaporatedWaterMl,evaporatedSinceStartMl:n.evaporatedWaterMl-finishingEvaporatedAtStart,waterBudgetMl:450,waterConserved:Math.abs(water-450)<1e-7,sauceStarchG:n.chemistry.starchG,savedStarchG:p.reserveStarchG,surfaceStarchG:p.surfaceStarchG,surfaceStarchTransferredG:n.combined?.64:0,totalStarchG:finishingStarchTotal,starchConserved:Math.abs(starch-finishingStarchTotal)<1e-9,pendingLiquidMl:mix.pending.totalMl,needsMixing:mix.needsMixing,damage:n.damage,scorched:n.damage>=1};
  }
  function finishingFacts(state,receipts){
    var facts=finishingState(state),checks=receipts.filter(function(receipt){return receipt.kind==='inspect';}),last=checks[checks.length-1],first=checks[0],combined=receipts.find(function(receipt){return receipt.kind==='combinePasta';}),current=!!last&&receipts[receipts.length-1]===last;
    function metadata(receipt){return receipt?{actionNumber:receipt.index,actor:receipt.actor,method:receipt.method,time:receipt.inspection.time,reading:copy(receipt.inspection),pastaTexture:receipt.finishCheck.pastaTexture}:null;}
    var complete=facts.combined&&current&&facts.burnerOff&&facts.potBurnerOff,target=complete&&last.inspection.type==='coating'&&!last.inspection.scorched&&!last.inspection.needsMixing&&last.finishCheck.pastaTexture==='Tender with a slight bite';
    return Object.assign(facts,{firstCheck:metadata(first),lastCheck:metadata(last),checkCurrent:current,complete:complete,targetMet:target,combineReceipt:combined?Object.assign({actionNumber:combined.index,actor:combined.actor,method:combined.method},copy(combined.pastaTransfer)):null});
  }
  function finishing(s){return valid(s)&&s.activity==='finish-pasta-in-sauce'?freeze(finishingFacts(s.state,s.receipts)):null;}
  function finishingGuide(mode,state,receipts){
    var facts=finishingFacts(state,receipts),kind='inspect',label='Take a fresh spoon check of the combined dish. The supplied pot sample does not establish its current sauce or pasta texture.',options={};
    if(!facts.combined){kind='combinePasta';label='Carry the drained pasta into the tomato sauce. Release transfers the entire 160 g dry-weight-equivalent batch and completes a six-second toss; it also brings surface starch into the sauce.';}
    else if(facts.heat){
      var wateryCheck=facts.lastCheck&&facts.lastCheck.reading.type==='watery'&&facts.lastCheck.pastaTexture==='Tender with a slight bite',waited=!!facts.lastCheck&&receipts.some(function(receipt){return receipt.index>facts.lastCheck.actionNumber&&receipt.kind==='waitPan';});
      if(facts.heat===1&&wateryCheck&&!facts.scorched&&!waited&&state.time+15<=3600){kind='waitPan';options.seconds=state.time+30<=3600?30:15;label='A loose sauce was recorded before this low-heat adjustment. Release one '+options.seconds+'-second cooking wait, then switch off and take a fresh check. Evaporation can reduce liquid while the pasta continues softening.';}
      else{kind='setPanHeat';options.setting=0;label='Switch the pan burner off before completing this finishing check. Turning off does not instantly cool the dish or reverse pasta softening.';}
    }
    else if(facts.targetMet){kind=null;label='The fresh check records a coating and pasta with a slight bite, with both burners off. Compare this evidence with the earlier check; further waiting can still change the dish.';}
    else if(facts.checkCurrent&&(facts.lastCheck.reading.scorched||facts.lastCheck.pastaTexture!=='Tender with a slight bite')){kind=null;label='The fresh check records '+facts.lastCheck.reading.label.toLowerCase()+' and pasta described as '+facts.lastCheck.pastaTexture.toLowerCase()+'. The handling sequence is recorded. Scorch damage and pasta softening cannot be reversed by adding water or folding. You can still explore the controls, but this attempt cannot recover all finishing targets.';}
    else if(facts.needsMixing){kind='fold';label='Added liquid still pools separately. Complete one six-second fold, then check again. Folding also advances cooking, water uptake and evaporation.';}
    else if(facts.checkCurrent){
      var failed=facts.lastCheck.reading.type;
      if(failed==='thick'||failed==='dry'){if(facts.savedWaterMl>=10){kind='pour';options.source='reduced';options.amountMl=Math.min(30,Math.floor(facts.savedWaterMl/10)*10);label='The check records '+facts.lastCheck.reading.label.toLowerCase()+'. Choose a small saved-water adjustment, fold it through, then compare a fresh check. The jug is finite and each dose also brings starch.';}else{kind=null;label='The fresh check records a dry or heavy coating and the saved-water jug is exhausted. This attempt is recorded; more folding cannot restore the missing liquid.';}}
      else if(failed==='watery'){if(state.time+15<=3600){kind='setPanHeat';options.setting=1;label='The fresh check records a loose sauce. Choose low heat for one short cooking wait, then switch off and compare a new check before repeating. Evaporation competes with pasta softening; the added liquid cannot be poured back into the jug.';}else{kind=null;label='The fresh check records a loose sauce, but too little kitchen time remains for a complete cooking wait. Review this recorded attempt; turning the burner on and off alone cannot evaporate the extra liquid.';}}
      else{kind='fold';label='Compare the recorded oil and coating cues, then choose another controlled fold or liquid adjustment before a new check.';}
    }
    return Object.assign({index:receipts.length,kind:kind,label:label,complete:mode==='watch'?facts.targetMet:facts.complete,targetMet:facts.targetMet},options);
  }
  function preheatBand(temperature){return temperature<preheatRange.minimum?'below':temperature>preheatRange.maximum?'above':'within';}
  function panLoadingState(state){
    var n=state.pan,loaded=!!n.produce,thermal=R.panThermal(state),pieces=R.panSurface(state).pieces.map(function(piece){return {index:piece.index,x:piece.x,z:piece.z,anchor:{x:450+205*piece.x,y:350+45*piece.z},widthMm:piece.width,topColor:piece.topColor,topBrowning:piece.top,topDamage:n.pieces[piece.index].damage[1-piece.down]};}),water=loaded?35:0;
    return {time:state.time,panTemperature:n.temp,heat:n.heat,burnerOff:n.heat===0,loaded:loaded,trayGrams:loaded?0:200,panGrams:loaded?200:0,totalGrams:200,oilMl:n.chemistry.oilMl,freeWaterMl:n.moisture,evaporatedWaterMl:n.evaporatedWaterMl,absorbedWaterMl:n.absorbedWaterMl,waterBudgetMl:water,waterConserved:Math.abs(n.moisture+n.evaporatedWaterMl+n.absorbedWaterMl-water)<1e-8,damage:n.damage,scorched:n.damage>=1,panHeatCapacityMl:thermal.effectiveHeatCapacityMl,thermalRateFactor:thermal.rateFactor,pieceCount:pieces.length,pieces:pieces,coachingRange:preheatRange,currentBand:preheatBand(n.temp),complete:loaded&&n.heat===0};
  }
  function panLoadingFacts(state,receipts){
    var facts=panLoadingState(state),load=receipts.find(function(receipt){return receipt.kind==='loadMushrooms';}),waits=receipts.filter(function(receipt){return receipt.kind==='waitPan';}),lastWait=waits[waits.length-1],transfer=load&&load.produceTransfer;
    return Object.assign(facts,{loadBand:transfer?transfer.band:null,loadTemperature:transfer?transfer.beforeTemperature:null,afterLoadTemperature:transfer?transfer.afterTemperature:null,loadDrop:transfer?transfer.coolingDrop:null,loadTime:transfer?transfer.time:null,loadHeat:transfer?transfer.heat:null,preheatSeconds:transfer?transfer.time:state.time,postLoadSeconds:transfer?state.time-transfer.time:0,targetMet:!!transfer&&transfer.band==='within',loadReceipt:load?Object.assign({actionNumber:load.index,actor:load.actor,method:load.method},copy(transfer)):null,lastWait:lastWait?Object.assign({actionNumber:lastWait.index,actor:lastWait.actor,method:lastWait.method},copy(lastWait.panWait)):null});
  }
  function panLoading(s){return valid(s)&&s.activity==='preheat-and-load-mushrooms'?freeze(panLoadingFacts(s.state,s.receipts)):null;}
  function panLoadingGuide(state,receipts){
    var facts=panLoadingFacts(state,receipts),kind='loadMushrooms',setting=null,seconds=null,label='',index=receipts.length;
    if(facts.loaded){
      var condition='The batch was loaded '+(facts.targetMet?'within':facts.loadBand==='below'?'below':'above')+' the illustrative 150–190°C comparison range, at '+Math.round(facts.loadTemperature*10)/10+'°C. That recorded condition cannot be changed by later heating or cooling.';
      if(facts.complete)return {index:index,kind:null,setting:null,seconds:null,label:condition+' The burner is now off. The pan still holds heat; neither this range nor the transfer establishes cooked readiness. Further waits can evaporate water or continue cooking.',complete:true,targetMet:facts.targetMet};
      return {index:index,kind:'setPanHeat',setting:0,seconds:null,label:condition+' Switch off the burner to finish this handling sequence. Stored heat remains after switching off.',complete:false,targetMet:facts.targetMet};
    }
    if(facts.currentBand==='within')label='The modeled pan is inside this activity\'s illustrative 150–190°C range. Carry the entire prepared tray, then Release to record the actual loading temperature and the model\'s temperature drop. This range is not a readiness or safety test.';
    else if(facts.currentBand==='above'){
      if(facts.heat!==0){kind='setPanHeat';setting=0;label='The pan is above this activity\'s comparison range. Switch off before choosing a cooling wait; changing the dial alone does not lower its temperature.';}
      else{kind='waitPan';seconds=30;label='The burner is off, but stored heat keeps the pan above the comparison range. Choose a short cooling wait, then compare the temperature again.';}
    }else if(facts.heat!==2){kind='setPanHeat';setting=2;label='The pan is below this activity\'s comparison range. Choose medium heat, then compare short, released preheating waits. You can also choose to load now and retain that earlier condition in your receipt.';}
    else{kind='waitPan';seconds=facts.panTemperature<125?60:30;label='The pan is below the comparison range. Release a '+seconds+'-second preheating wait, then read the actual temperature before deciding to load.';}
    return {index:index,kind:kind,setting:setting,seconds:seconds,label:label,complete:false,targetMet:false};
  }
  function weighingFacts(state){
    var grams=state.prep.pasta,transferred=!!state.pot.pasta;
    return {targetGrams:160,recordedGrams:grams,trayGrams:transferred?0:grams,packetGrams:800-grams,inPotGrams:transferred?grams:0,totalGrams:800,minimumGrams:40,maximumGrams:800,onTarget:grams===160,transferred:transferred,potTemperature:state.pot.temp,potWaterMl:state.pot.water,potHeat:state.pot.heat};
  }
  function weighing(s){return valid(s)&&s.activity==='pasta-weighing'?freeze(weighingFacts(s.state)):null;}
  // Only committed turns disclose hidden faces. Cooking can invalidate that
  // face's earlier disclosure without rewriting its recorded color or time.
  function browningState(state){
    var surface=R.panSurface(state),visible={pale:0,golden:0,dark:0,scorched:0};
    var pieces=surface.pieces.map(function(piece){visible[piece.topColor]++;return {index:piece.index,x:piece.x,z:piece.z,anchor:{x:450+205*piece.x,y:350+45*piece.z},down:piece.down,topFace:1-piece.down,topColor:piece.topColor,topBrowning:piece.top,topDamage:state.pan.pieces[piece.index].damage[1-piece.down],crowded:piece.crowded};});
    return {time:state.time,panTemperature:state.pan.temp,heat:state.pan.heat,freeWaterMl:state.pan.moisture,evaporatedWaterMl:state.pan.evaporatedWaterMl,pieceCount:pieces.length,crowdedCount:surface.crowded,visible:visible,pieces:pieces};
  }
  function browningFacts(state,receipts){
    var result=browningState(state),first=0,second=0,golden=0,dark=0,scorched=0,waitCount=0,totalWait=0,last=null;
    result.pieces.forEach(function(piece){piece.turns=0;piece.faces=[null,null];piece.lastReveal=null;});
    receipts.forEach(function(receipt){
      if(receipt.kind==='waitPan'){waitCount++;totalWait+=receipt.durationSeconds;}
      var turn=receipt.mushroomTurn;if(!turn)return;var piece=result.pieces[turn.piece],face=turn.revealedFace;
      var reveal={face:face,color:turn.color,browning:turn.browning,damage:turn.damage,time:turn.time,actionNumber:receipt.index,actor:receipt.actor,method:receipt.method,current:turn.browning===state.pan.pieces[turn.piece].faces[face]&&turn.damage===state.pan.pieces[turn.piece].damage[face]};
      piece.turns++;piece.faces[face]=reveal;piece.lastReveal=reveal;last=Object.assign({piece:turn.piece},reveal);
    });
    result.pieces.forEach(function(piece){if(piece.faces[0])first++;if(piece.faces[1])second++;piece.faces.forEach(function(face){if(!face)return;if(face.current&&face.color==='golden')golden++;if(face.color==='dark')dark++;if(face.color==='scorched')scorched++;});});
    Object.assign(result,{firstFacesRevealed:first,secondFacesRevealed:second,revealedFaceCount:first+second,currentGoldenFaceCount:golden,knownDarkFaces:dark,knownScorchedFaces:scorched,allFacesObserved:first+second===28,waitCount:waitCount,totalWaitSeconds:totalWait,burnerOff:state.pan.heat===0,targetMet:golden===28&&state.pan.heat===0,lastReveal:last});
    return result;
  }
  function browning(s){return valid(s)&&s.activity==='mushroom-turning'?freeze(browningFacts(s.state,s.receipts)):null;}
  // Spacing changes contact for future cooking. It neither turns a face nor
  // advances time, and its live goal can be undone by a later crowded placement.
  function spacingState(state){
    var surface=R.panSurface(state),pieces=surface.pieces.map(function(piece){return {index:piece.index,x:piece.x,z:piece.z,xUnits:piece.x*100,zUnits:piece.z*100,anchor:{x:450+205*piece.x,y:350+45*piece.z},down:piece.down,topColor:piece.topColor,contact:piece.contact,neighbors:surface.pieces.filter(function(other){return other.index!==piece.index&&Math.hypot(other.x-piece.x,other.z-piece.z)<.22;}).length,crowded:piece.crowded,relativeHeat:piece.heat};}),full=pieces.filter(function(piece){return piece.contact===1;}).length;
    return {time:state.time,panTemperature:state.pan.temp,heat:state.pan.heat,pieceCount:pieces.length,crowdedCount:surface.crowded,fullContactCount:full,targetMet:pieces.length===14&&full===14,pieces:pieces};
  }
  function spacingGuide(state,receipts){
    var facts=spacingState(state),next=facts.pieces.find(function(piece){var site=spacingSites[piece.index];return piece.x!==site.x/100||piece.z!==site.z/100;}),site=next?spacingSites[next.index]:null;
    if(facts.targetMet)return {index:receipts.length,kind:null,piece:null,x:null,z:null,label:'All fourteen pieces have room: each has full modeled contact. This records spacing, not cooked readiness. A later move can crowd the pieces again; the hot pan and the existing faces are unchanged.',complete:true,targetMet:true};
    return {index:receipts.length,kind:'moveMushroom',piece:next.index,x:site.x,z:site.z,label:facts.fullContactCount+' of fourteen pieces have full modeled contact. Lift piece '+(next.index+1)+' and place it at the suggested position, or choose another position with room around it. Moving does not turn or cook it.',complete:false,targetMet:false};
  }
  function spacing(s){if(!valid(s)||s.activity!=='space-mushrooms')return null;var last=s.receipts.length?s.receipts[s.receipts.length-1]:null;return freeze(Object.assign(spacingState(s.state),{destinations:copy(spacingSites),moveCount:s.receipts.length,lastMove:last?Object.assign({actionNumber:last.index,actor:last.actor,method:last.method},copy(last.mushroomMove)):null}));}
  // Historical samples come only from deliberate, committed sample actions.
  // Lid and burner changes do not cook pasta or invalidate an unchanged sample.
  function coveringState(state){
    var p=state.pot,values=p.bundles.map(function(bundle){return bundle.progress;});
    return {time:state.time,potTemperature:p.temp,heat:p.heat,lid:p.lid,waterMl:p.water,dissolvedStarchG:p.starchG,progress:p.progress,range:{min:Math.min.apply(null,values),max:Math.max.apply(null,values)},clumped:R.pastaSurface(state).clumped};
  }
  function coveringFacts(state,receipts){
    var current=coveringState(state),waits=receipts.filter(function(receipt){return receipt.kind==='waitPot';}),checks=receipts.filter(function(receipt){return receipt.kind==='samplePasta'&&receipt.inspection&&receipt.inspection.kind==='pasta';}),firstWait=waits.length?waits[0].index:Infinity,covered=0,uncovered=0;
    waits.forEach(function(receipt){if(receipt.before.covering.lid==='covered')covered+=receipt.durationSeconds;else uncovered+=receipt.durationSeconds;});
    function metadata(receipt){if(!receipt)return null;var observed=receipt.after.covering;return {actionNumber:receipt.index,time:receipt.inspection.time,actor:receipt.actor,method:receipt.method,reading:copy(receipt.inspection),progress:observed.progress,current:observed.progress===current.progress&&observed.range.min===current.range.min&&observed.range.max===current.range.max&&observed.clumped===current.clumped};}
    var latest=metadata(checks[checks.length-1]),earlier=metadata(checks[checks.length-2]),baseline=metadata(checks.find(function(receipt){return receipt.index<firstWait;})),fresh=!!latest&&latest.current,suitable=fresh&&latest.reading.label==='Tender with a slight bite'&&latest.progress>=.9&&latest.progress<=1.2&&latest.reading.range.min>=.85&&latest.reading.range.max<=1.2&&latest.reading.clumped===0,tooSoft=fresh&&(latest.reading.label==='Soft'||latest.reading.label==='Overcooked'),last=waits[waits.length-1];
    var ready=!!baseline&&!!latest&&latest.actionNumber>baseline.actionNumber&&latest.time>baseline.time&&suitable&&covered>0&&current.waterMl>0;
    return {time:current.time,potTemperature:current.potTemperature,heat:current.heat,lid:current.lid,waterMl:current.waterMl,startingWaterMl:1063.200000000038,evaporatedWaterMl:1063.200000000038-current.waterMl,dissolvedStarchG:current.dissolvedStarchG,startingDissolvedStarchG:4.7545101406787555,coveredSeconds:covered,uncoveredSeconds:uncovered,totalWaitSeconds:covered+uncovered,waitCount:waits.length,checkCount:checks.length,hasStartingCheck:!!baseline,baseline:baseline,earlier:earlier,latest:latest,sampleCurrent:fresh,textureSuitable:suitable,tooSoft:tooSoft,coveredCooking:covered>0,readyToFinish:ready,targetMet:ready&&current.heat===0&&current.lid==='rest',lastWait:last?Object.assign({actionNumber:last.index},copy(last.potWait)):null};
  }
  function covering(s){return valid(s)&&s.activity==='cover-and-check-pasta'?freeze(coveringFacts(s.state,s.receipts)):null;}
  // Integer partitions establish whether further cuts can still meet the
  // existing 4–6 mm target and <=1 mm spread. No cut can join material again.
  function cuttingPartition(width,low){for(var large=0;large<=Math.floor(width/(low+1));large++)if((width-large*(low+1))%low===0)return true;return false;}
  function cuttingBands(widths){return [5,4].filter(function(low){return widths.every(function(width){return cuttingPartition(width,low);});});}
  function cuttingState(state){
    var profile=R.cutProfile(state),start=0,recorded=state.prep.cut,target=profile.onTarget&&profile.even,pieces=profile.widths.map(function(width,index){var from=start;start+=width;return {index:index,widthMm:width,startMm:from,endMm:start,anchor:{x:340+6*(from+width/2),y:415}};});
    return {time:state.time,totalMm:start,targetMm:profile.target,minMm:profile.min,maxMm:profile.max,spreadMm:profile.max-profile.min,even:profile.even,onTarget:profile.onTarget,recorded:recorded,readyToRecord:!recorded&&target,targetMet:recorded&&target,irreparable:cuttingBands(profile.widths).length===0,result:recorded?(target?'recorded-target':'recorded-outside-target'):'in-progress',pieces:pieces};
  }
  function cuttingFacts(state,receipts){var facts=cuttingState(state),cuts=receipts.filter(function(r){return r.kind==='sliceProduce';}),last=cuts[cuts.length-1];return Object.assign(facts,{cutCount:cuts.length,lastCut:last?Object.assign({actionNumber:last.index,actor:last.actor,method:last.method},copy(last.cut)):null});}
  function cutting(s){return valid(s)&&s.activity==='precision-mushroom-cuts'?freeze(cuttingFacts(s.state,s.receipts)):null;}
  function cuttingGuide(state,receipts){
    var c=cuttingFacts(state,receipts),kind='sliceProduce',piece=null,cutMm=null,stage='cut',label;
    if(c.recorded)return {index:receipts.length,kind:null,piece:null,cutMm:null,stage:'complete',label:c.targetMet?'The actual cuts are recorded: every piece is within 4–6 mm, and the widths differ by at most 1 mm. All 40 mm are accounted for. This is a prepared representative sample, not a cooked mushroom dish.':'The actual cuts are recorded, but their widths do not meet the recipe target and consistency together. The sample is locked; start fresh to try different cut positions. Recording the result does not make the pieces consistent.',complete:true,targetMet:c.targetMet};
    if(c.irreparable){kind='finishCuts';stage='review';label='These widths cannot all become consistent 4–6 mm pieces through further cuts. Slicing can only make pieces smaller; it cannot join them again. Record the actual result or start a fresh practice sample.';}
    else if(c.readyToRecord){kind='finishCuts';stage='record';label='The actual widths meet the recipe target and consistency. Put the knife aside and deliberately record this preparation; a preview alone does not finish it.';}
    else{
      var low=cuttingBands(state.prep.cuts)[0],selected=c.pieces.find(function(p){return p.widthMm>low+1;});piece=selected.index;
      cutMm=[5,low,low+1].find(function(width){return width>=low&&width<=low+1&&width<selected.widthMm&&cuttingPartition(selected.widthMm-width,low);});
      label='Cut piece '+(piece+1)+' ('+selected.widthMm+' mm) at '+cutMm+' mm from its left edge. The other piece will be '+(selected.widthMm-cutMm)+' mm. Release deliberately to record the split; preview movement changes no widths.';
    }
    return {index:receipts.length,kind:kind,piece:piece,cutMm:cutMm,stage:stage,label:label,complete:false,targetMet:false};
  }
  // These labels describe recorded sample endpoints, using the engine's texture
  // categories. Live bundle progress remains internal to guards and freshness.
  function strandTexture(progress){return progress<.6?'Hard center':progress<.9?'Still firm':progress<=1.2?'Tender with a slight bite':progress<=1.45?'Soft':'Overcooked';}
  function strandsState(state){
    var p=state.pot,values=p.bundles.map(function(bundle){return bundle.progress;});
    return {time:state.time,potTemperature:p.temp,heat:p.heat,lid:p.lid,waterMl:p.water,dissolvedStarchG:p.starchG,progress:p.progress,range:{min:Math.min.apply(null,values),max:Math.max.apply(null,values)},clumped:R.pastaSurface(state).clumped};
  }
  function strandsFacts(state,receipts){
    var current=strandsState(state),surface=R.pastaSurface(state),waits=receipts.filter(function(r){return r.kind==='waitPot';}),separations=receipts.filter(function(r){return r.kind==='separatePasta';}),changes=receipts.filter(function(r){return r.kind==='separatePasta'||r.kind==='waitPot';}),checks=receipts.filter(function(r){return r.kind==='samplePasta'&&r.inspection&&r.inspection.kind==='pasta';}),firstChange=changes.length?changes[0].index:Infinity;
    function metadata(receipt){if(!receipt)return null;var r=receipt.inspection,observed=receipt.after.strands;return {actionNumber:receipt.index,time:r.time,actor:receipt.actor,method:receipt.method,reading:copy(r),current:observed.progress===current.progress&&r.range.min===current.range.min&&r.range.max===current.range.max&&r.clumped===current.clumped,firmestTexture:strandTexture(r.range.min),softestTexture:strandTexture(r.range.max)};}
    var baseline=metadata(checks.find(function(r){return r.index<firstChange&&r.inspection.clumped>0;})),latest=metadata(checks[checks.length-1]),earlier=metadata(checks[checks.length-2]),fresh=!!latest&&latest.current,allSeparated=surface.clumped===0,postCheck=allSeparated&&!!latest&&latest.reading.clumped===0&&(!separations.length||latest.actionNumber>separations[separations.length-1].index),uneven=fresh&&latest.reading.range.max-latest.reading.range.min>.18,tooSoft=fresh&&latest.reading.range.max>1.2,suitable=fresh&&latest.reading.label==='Tender with a slight bite'&&latest.reading.range.min>=.9&&latest.reading.range.max<=1.2&&!uneven,ready=!!baseline&&!!latest&&latest.actionNumber>baseline.actionNumber&&latest.time>baseline.time&&postCheck&&suitable&&current.waterMl>0,last=separations[separations.length-1],lastWait=waits[waits.length-1];
    return {time:current.time,potTemperature:current.potTemperature,heat:current.heat,lid:current.lid,waterMl:current.waterMl,startingWaterMl:1154.4000000000017,evaporatedWaterMl:1154.4000000000017-current.waterMl,dissolvedStarchG:current.dissolvedStarchG,startingDissolvedStarchG:1.5642409982200258,groups:surface.groups.map(function(g){return {index:g.index,x:g.x,z:g.z,anchor:{x:450+150*g.x,y:350+38*g.z},cling:g.cling,separated:g.separated};}),clumped:surface.clumped,separated:surface.separated,learnerSeparated:separations.length,totalWaitSeconds:waits.reduce(function(sum,r){return sum+r.durationSeconds;},0),waitCount:waits.length,checkCount:checks.length,baseline:baseline,earlier:earlier,latest:latest,hasStartingCheck:!!baseline,sampleCurrent:fresh,allSeparated:allSeparated,postSeparationCheck:postCheck,textureSuitable:suitable,unevenKnown:uneven,tooSoftKnown:tooSoft,readyToFinish:ready,targetMet:ready&&current.heat===0,lastSeparation:last?Object.assign({actionNumber:last.index,actor:last.actor,method:last.method},copy(last.pastaSeparation)):null,lastWait:lastWait?Object.assign({actionNumber:lastWait.index},copy(lastWait.potWait)):null};
  }
  function strands(s){return valid(s)&&s.activity==='separate-and-check-pasta'?freeze(strandsFacts(s.state,s.receipts)):null;}
  function strandsGuide(state,receipts){
    var b=strandsFacts(state,receipts),kind='samplePasta',group=null,seconds=null,setting=null,stage='baseline',label='Record a starting pasta sample before a sweep or cooking interval. The supplied groups are not a learner texture observation.',changed=receipts.some(function(r){return r.kind==='separatePasta'||r.kind==='waitPot';});
    if(b.targetMet)return {index:receipts.length,kind:null,group:null,seconds:null,setting:null,stage:'complete',label:'The fresh sample records tender strands across the sampled groups, with the earlier differences still present within this activity\'s range. All groups are separated and the burner is off. The pasta remains in hot water; a later interval can soften it further. This does not drain or finish a dish.',complete:true,targetMet:true};
    if(b.waterMl<=0){stage='review';kind=b.heat?'setPotHeat':'samplePasta';setting=b.heat?0:null;label='The supplied water has evaporated. '+(b.heat?'Switch off the burner. ':'')+'This activity cannot refill the pot; start fresh for the strand comparison.';}
    else if(!b.hasStartingCheck&&changed){stage='review';if(b.latest&&b.sampleCurrent&&b.heat){kind='setPotHeat';setting=0;}label='No starting sample was recorded before the first sweep or cooking interval. '+(!b.latest||!b.sampleCurrent?'Take a current sample to see the groups now. ':b.heat?'Switch off and review the current sample. ':'The current sample remains useful. ')+'Start fresh for the before-and-after comparison; a later check cannot recreate the missing baseline.';}
    else if(!b.hasStartingCheck){}
    else if(!b.sampleCurrent&&receipts.some(function(r){return r.kind==='waitPot'&&(!b.latest||r.index>b.latest.actionNumber);})){stage='check';label='Cooking time has passed since the last sample. Check the firmest and softest sampled strands before deciding what to do next.';}
    else if(b.unevenKnown||b.tooSoftKnown){stage='review';kind=b.heat?'setPotHeat':'samplePasta';setting=b.heat?0:null;label=(b.tooSoftKnown?'The fresh sample includes strands that are too soft.':'The fresh sample records a wider cooking difference than this activity accepts.')+' Separating now cannot erase earlier cooking differences or make softened strands firm again. '+(b.heat?'Switch off, then review the samples.':'The burner is off. Start fresh and separate earlier for another comparison.');}
    else if(!b.allSeparated){var pendingGroup=b.groups.find(function(g){return !g.separated;});if(!pendingGroup)return null;stage='separate';kind='separatePasta';group=pendingGroup.index;label='Sweep through group '+(group+1)+' to separate its strands. This changes access to water during later cooking, without instantly changing texture or kitchen time.';}
    else if(!b.postSeparationCheck||!b.sampleCurrent){stage='check';label='All six groups are separated. Take a fresh sample: separation changed the clumps, but it did not erase the cooking differences already present.';}
    else if(b.readyToFinish){stage='finish';kind='setPotHeat';setting=0;label='The actual sample records tender strands from the firmest to the softest sampled group. Switch off the burner and review the comparison; stored heat remains.';}
    else if(b.heat!==2){stage='heat';kind='setPotHeat';setting=2;label='The recorded sample still needs cooking. Choose medium heat, then use a short interval and another real sample.';}
    else{stage='cook';kind='waitPot';seconds=b.latest.reading.range.min<.8?60:30;label='The firmest sampled strands are '+b.latest.firmestTexture.toLowerCase()+'. Cook for a short interval, then sample again. Later separation cannot reverse differences made earlier.';}
    return {index:receipts.length,kind:kind,group:group,seconds:seconds,setting:setting,stage:stage,label:label,complete:false,targetMet:false};
  }
  function thermalState(state){
    var n=state.pan,position=R.panPosition(state);
    return {time:state.time,panTemperature:n.temp,panPlacement:position.site,burnerSetting:n.heat,effectiveHeat:position.heat,freeWaterMl:n.moisture,absorbedWaterMl:n.absorbedWaterMl,evaporatedWaterMl:n.evaporatedWaterMl,startingWaterMl:80,pastaProgress:state.pot.progress,reserveWaterMl:state.pot.reserve,damaged:n.damage>=1,pastaTooSoft:state.pot.progress>1.2};
  }
  function thermalFacts(state,receipts){
    var result=thermalState(state),checks=receipts.filter(function(receipt){return receipt.kind==='inspect'&&receipt.inspection&&receipt.inspection.kind==='sauce';}),firstCooking=receipts.find(function(receipt){return receipt.durationSeconds>0;}),boundary=firstCooking?firstCooking.index:Infinity;
    function metadata(receipt){return receipt?{actionNumber:receipt.index,time:receipt.inspection.time,actor:receipt.actor,method:receipt.method,reading:copy(receipt.inspection)}:null;}
    var baseline=metadata(checks.find(function(receipt){return receipt.index<boundary&&receipt.inspection.type==='separated'&&receipt.inspection.chemistry&&receipt.inspection.chemistry.oilDroplets===true;})),latest=metadata(checks[checks.length-1]),fresh=!!latest&&latest.actionNumber===receipts.length,coating=fresh&&latest.reading.type==='coating'&&latest.reading.bodyType==='coating'&&latest.reading.chemistry&&latest.reading.chemistry.oilDroplets===false&&!latest.reading.needsMixing;
    Object.assign(result,{foldCount:receipts.filter(function(receipt){return receipt.kind==='fold';}).length,totalWaitSeconds:receipts.filter(function(receipt){return receipt.kind==='waitPan';}).reduce(function(total,receipt){return total+receipt.durationSeconds;},0),trivetSeconds:receipts.reduce(function(total,receipt){return total+(receipt.before.thermalRescue.panPlacement==='trivet'?receipt.durationSeconds:0);},0),moveCount:receipts.filter(function(receipt){return receipt.kind==='movePan';}).length,baseline:baseline,latest:latest,checkCount:checks.length,hasStartingCheck:!!baseline,inspectionFresh:fresh,targetMet:!!baseline&&!!latest&&latest.actionNumber>baseline.actionNumber&&latest.time>baseline.time&&!!coating&&!R.needsMixing(state)&&!result.damaged&&result.pastaProgress>=.9&&!result.pastaTooSoft&&result.burnerSetting===0&&state.pot.heat===0&&result.panPlacement==='trivet'});
    return result;
  }
  function thermalRescue(s){return valid(s)&&s.activity==='cool-and-fold-sauce'?freeze(thermalFacts(s.state,s.receipts)):null;}
  function thermalGuide(state,receipts){
    var b=thermalFacts(state,receipts),last=receipts[receipts.length-1],kind='inspect',placement=null,seconds=null,setting=null,stage='baseline',index=0,label='Record the starting oil and coating before any cooking interval or fold. The supplied dish is not a learner spoon check.';
    if(b.targetMet)return {index:6,kind:null,placement:null,seconds:null,setting:null,stage:'complete',label:'The fresh spoon check records a coating without distinct oil droplets. The pan is on the trivet, both burners are off, and the modeled pasta retains a slight bite. Stored heat remains; this check does not establish lasting stability or a plated dish.',complete:true,targetMet:true};
    if(!b.checkCount&&!b.totalWaitSeconds&&!b.foldCount){/* An actual starting check comes before the proposed adjustments. */}
    else if(b.panPlacement!=='trivet'){kind='movePan';placement='trivet';stage='move';index=1;label='Carry the pan level onto the trivet. Leaving the burner removes its heat input on later clock steps; the pan keeps its stored heat.';}
    else if(b.burnerSetting!==0){kind='setPanHeat';setting=0;stage='heat';index=2;label='Switch off the burner. Moving the pan did not switch it off, and changing the setting will not cool the pan instantly.';}
    else if(b.damaged||b.pastaTooSoft){index=5;stage='review';label=b.inspectionFresh?(b.damaged?'The fresh check still includes scorch damage. Cooling and folding cannot remove it. Review the choices or start fresh.':'The modeled pasta has softened beyond the activity target. Cooling cannot reverse that cooking; review the actual check or start fresh.'):'Record a fresh spoon check before reviewing this attempt. Further cooling or folding cannot reverse recorded scorch damage or softened pasta.';}
    else if(!b.hasStartingCheck&&(b.foldCount||b.totalWaitSeconds)){index=5;stage='review';label=b.inspectionFresh?'No separated starting check was recorded before cooking or folding. The current check is real, but a new attempt is needed for the starting-to-finished comparison.':'Record the current sauce honestly. No starting spoon check was taken before cooking or folding; a later check cannot recreate it.';}
    else if(!b.hasStartingCheck){label='Record the separated starting sauce before another cooking interval or fold.';}
    else if(b.latest&&receipts.some(function(receipt){return receipt.index>b.latest.actionNumber&&receipt.kind==='fold';})){index=5;stage='check';label='Record a fresh spoon check after the fold. Compare the oil droplets and the body; the movement alone does not establish a coating.';}
    else if(!b.inspectionFresh&&b.latest&&b.latest.reading.type!=='separated'){index=5;stage='check';label='The earlier check predates later recorded actions. Inspect again before deciding whether another fold is needed.';}
    else if(b.inspectionFresh&&b.latest&&['dry','thick','watery','scorched','unmixed'].includes(b.latest.reading.type)){index=5;stage='review';label='The actual check records '+b.latest.reading.label.toLowerCase()+'. This bounded activity offers cooling and folding, not added liquid. Review its water and pasta changes or start fresh; completing the motions does not guarantee a rescue.';}
    else if(state.pan.temp>110){kind='waitPan';seconds=30;stage='cool';index=3;label='Allow a short cooling interval before folding, then check what the sauce actually does. This model temperature is a teaching cue, not a universal temperature target.';}
    else if(!b.inspectionFresh&&last&&last.kind!=='waitPan'){index=5;stage='check';label='Take a fresh spoon check after the later recorded actions before deciding whether another fold is needed.';}
    else{kind='fold';stage='fold';index=4;label='Complete one six-second fold, then inspect the oil and coating again. The hot contents keep changing during the fold.';}
    return {index:index,kind:kind,placement:placement,seconds:seconds,setting:setting,stage:stage,label:label,complete:false,targetMet:false};
  }
  function coveringGuide(state,receipts){
    var b=coveringFacts(state,receipts),p=state.pot,kind='samplePasta',placement=null,seconds=null,setting=null,stage='baseline',label='Record a starting pasta sample before any cooking interval. A supplied batch is not a learner observation.',index=0;
    if(b.targetMet)return {index:8,kind:null,placement:null,seconds:null,setting:null,stage:'complete',label:'The starting and later samples are recorded, the fresh sample is tender with a slight bite, and the burner is off with the lid at its rest. Pasta remains in hot water; a later interval can still soften it. This activity has not drained or finished a dish.',complete:true,targetMet:true};
    if(p.water<=0){stage='review';index=7;kind=p.heat?'setPotHeat':p.lid==='covered'?'moveLid':'samplePasta';setting=p.heat?0:null;placement=kind==='moveLid'?'rest':null;label='The supplied cooking water has evaporated. '+(p.heat?'Switch off the burner. ':p.lid==='covered'?'Return the lid to its rest. ':'')+'This activity cannot refill the batch; start fresh to compare covered cooking and texture.';}
    else if(!b.waitCount&&!b.checkCount){if(p.lid==='covered'){kind='moveLid';placement='rest';label='Lift the lid to its rest before recording a starting sample. Moving the lid does not cook the pasta.';}}
    else if(b.readyToFinish){index=7;stage='finish';kind=p.lid==='covered'?'moveLid':'setPotHeat';placement=kind==='moveLid'?'rest':null;setting=kind==='setPotHeat'?0:null;label=kind==='moveLid'?'The fresh sample is suitable. Return the lid to its rest so the pot remains accessible.':'The fresh sample is tender with a slight bite. Switch off the burner; stored heat remains in the water.';}
    else if(p.progress>=.9){
      index=6;stage='check';
      if(p.progress>1.2&&p.heat){kind='setPotHeat';setting=0;stage='finish';label='Pause the burner and gather a fresh sample. An earlier sample cannot establish the texture after further cooking.';}
      else if(b.hasStartingCheck&&b.textureSuitable&&!b.coveredCooking){index=2;stage=p.lid==='covered'?'cook':'cover';kind=p.lid==='covered'?'waitPot':'moveLid';placement=kind==='moveLid'?'covered':null;seconds=kind==='waitPot'?15:null;label='No cooking interval was recorded with the lid on. The sample is already tender; another interval can soften it further. Start fresh for the planned comparison, or explore a short covered interval and sample again.';}
      else if(p.lid==='covered'){kind='moveLid';placement='rest';stage='uncover';index=5;label='Lift the lid to its rest, then sample the pasta. The elapsed time alone does not establish its texture.';}
      else if(!b.sampleCurrent){label='Record a fresh pasta sample. Compare its resistance and center with the actual starting sample, if one was recorded.';}
      else if(b.tooSoft){stage='review';label='The fresh sample is '+b.latest.reading.label.toLowerCase()+'. Cooling cannot reverse the texture already recorded. Review the samples or start fresh with shorter intervals.';}
      else if(!b.hasStartingCheck){stage='review';kind=p.heat?'setPotHeat':'samplePasta';setting=p.heat?0:null;label='The current sample is recorded, but no starting sample was taken before cooking. '+(p.heat?'Switch off the burner. ':'')+'Start fresh for the before-and-after comparison; a later check cannot recreate the missing baseline.';}
      else{label='Record a later fresh sample after a cooking interval; two untimed samples cannot show a cooking change.';}
    }else if(p.heat!==2){index=1;stage='heat';kind='setPotHeat';setting=2;label='Choose medium pot heat for a controlled interval. A burner adjustment does not instantly change water temperature.';}
    else if(p.lid!=='covered'){index=2;stage='cover';kind='moveLid';placement='covered';label='Place the lid over the pot. Covering changes heating, cooling and evaporation on later clock steps, not during the movement.';}
    else{index=b.waitCount?4:3;stage='cook';kind='waitPot';var estimated=(.9-p.progress)*480;seconds=estimated>60?60:estimated>15?30:15;label='Advance a short cooking interval, then lift the lid and sample before judging texture. The water and pasta change only when this interval is released.';}
    return {index:index,kind:kind,placement:placement,seconds:seconds,setting:setting,stage:stage,label:label,complete:false,targetMet:false};
  }
  function browningGuide(state,receipts){
    var b=browningFacts(state,receipts),piece,kind='turnMushroom',seconds=null,setting=null,label='',stage='reveal-first',index=b.firstFacesRevealed;
    if(b.targetMet)return {index:30,kind:null,piece:null,seconds:null,setting:null,stage:'complete',label:'Both faces of all 14 pieces were revealed golden, and the burner is off. The pan is still hot; a later cooking interval can change these surfaces. This is a browning result, not a completed pasta dish.',complete:true,targetMet:true};
    if(b.knownScorchedFaces||b.knownDarkFaces||b.visible.scorched||b.visible.dark){kind=state.pan.heat?'setPanHeat':'turnMushroom';setting=state.pan.heat?0:null;piece=b.pieces.find(function(p){return !p.faces[p.down]||!p.faces[p.down].current;})||b.pieces[0];stage='review';label='A revealed surface is '+(b.knownScorchedFaces||b.visible.scorched?'scorched':'dark')+'. Turning cannot make it golden again. '+(state.pan.heat?'Switch off the burner, then review the surfaces.':'The burner is off. You can reveal other faces, or start fresh for an all-golden comparison.');}
    else if(b.currentGoldenFaceCount===28){kind='setPanHeat';setting=0;index=29;stage='cool';label='Both faces of every piece were revealed golden. Switch off the burner; the hot pan will still cook during any later interval.';}
    else if((piece=b.pieces.find(function(p){return !p.faces[0];}))){label='Turn piece '+(piece.index+1)+' to reveal its first cooked face. The visible top does not tell you the hidden side.';}
    else if(!b.waitCount){kind=state.pan.heat===0?'setPanHeat':'waitPan';setting=kind==='setPanHeat'?2:null;seconds=kind==='waitPan'?30:null;index=14;stage='cook-second';label=kind==='setPanHeat'?'Choose medium heat before the short cooking interval.':'The first faces are revealed. Cook the second faces for a short interval, then turn to compare; animation time does not cook them.';}
    else if((piece=b.pieces.find(function(p){return p.topColor==='pale';}))){index=15+b.secondFacesRevealed;stage='cook-second';label='Piece '+(piece.index+1)+' has an exposed pale face. Turn that face toward the pan before cooking it further.';}
    else if((piece=b.pieces.find(function(p){return !p.faces[p.down]||!p.faces[p.down].current;}))){index=15+b.secondFacesRevealed;stage='reveal-second';label='Turn piece '+(piece.index+1)+' to reveal the other face. Its earlier appearance cannot tell you what happened while it contacted the pan.';}
    else{kind=state.pan.heat===2?'waitPan':'setPanHeat';setting=kind==='setPanHeat'?2:null;seconds=kind==='waitPan'?15:null;index=14;stage='cook-second';label=kind==='setPanHeat'?'Some revealed faces are still pale. Choose medium heat for another short interval.':'Some revealed faces are still pale and face the pan. Cook for a short interval, then turn again to compare.';}
    return {index:Math.min(29,index),kind:kind,piece:kind==='turnMushroom'&&piece?piece.index:null,seconds:seconds,setting:setting,stage:stage,label:label,complete:false,targetMet:false};
  }
  function activityFacts(state,id){
    if(id==='hold-and-recheck-sauce'){var hold=holdingState(state);return {time:state.time,panTemperature:hold.panTemperature,freeWaterMl:hold.freeWaterMl,starchG:hold.sauceStarchG,oilMl:hold.oilMl,pendingMl:hold.pendingLiquidMl,heat:hold.heat,savedRemainingMl:hold.savedWaterMl,holding:hold};}
    if(id==='finish-pasta-in-sauce'){var finish=finishingState(state);return {time:state.time,panTemperature:finish.panTemperature,freeWaterMl:finish.freeWaterMl,starchG:finish.sauceStarchG,oilMl:finish.oilMl,pendingMl:finish.pendingLiquidMl,heat:finish.heat,savedRemainingMl:finish.savedWaterMl,finishing:finish};}
    if(id==='preheat-and-load-mushrooms')return {time:state.time,panLoading:panLoadingState(state)};
    if(id==='rinse-and-dry-produce')return {time:state.time,rinsing:rinsingState(state)};
    if(id==='space-mushrooms')return {time:state.time,spacing:spacingState(state)};
    if(id==='precision-mushroom-cuts')return {time:state.time,cutting:cuttingState(state)};
    if(id==='separate-and-check-pasta')return {time:state.time,strands:strandsState(state)};
    if(id==='cool-and-fold-sauce')return Object.assign(facts(state),{thermalRescue:thermalState(state)});
    if(id==='cover-and-check-pasta')return {time:state.time,covering:coveringState(state)};
    if(id==='mushroom-turning')return {time:state.time,browning:browningState(state)};
    if(id==='reserve-and-drain')return {time:state.time,drainage:drainageFacts(state)};
    if(id==='pasta-weighing')return {time:state.time,weighing:weighingFacts(state)};
    if(id==='tomato-texture')return Object.assign(facts(state),{tomatoHandling:copy(R.tomatoHandling(state)),mixing:copy(R.mixing(state))});
    if(id==='surface-drying'){var drying=R.drying(state);return {time:state.time,handsWashed:state.prep.hands,rinsed:state.prep.rinsed,drying:copy(drying),wrungWaterMl:30-drying.surfaceWater-drying.clothWater};}
    return id==='garlic-preparation'?{time:state.time,handsWashed:state.prep.hands,garlicPreparation:copy(R.garlicPreparation(state))}:{time:state.time,serving:copy(R.serving(state)),plated:state.plated};
  }
  function validFinishingTransition(before,state,intent,entry,value,duration){
    var old=before.pan,n=state.pan,op=before.pot,p=state.pot,expected=copy(before),facts=finishingState(state),mixing=intent.kind==='combinePasta'||intent.kind==='fold';expected.pan=copy(n);expected.pot=copy(p);expected.time=state.time;expected.log=before.log.concat([entry]);expected.feedback=state.feedback;
    if(JSON.stringify(state)!==JSON.stringify(expected)||entry.value!==(value===undefined?null:value)||entry.time!==state.time||entry.inspection&&intent.kind!=='inspect'||!facts.waterConserved||!facts.starchConserved||n.chemistry.oilMl!==15||n.heat!==(intent.kind==='setPanHeat'?intent.setting:old.heat)||!n.produce||!n.oil||!n.garlic||n.size!=='standard'||!Number.isFinite(n.temp)||n.temp<22||n.temp>270||!Number.isFinite(n.damage)||n.damage<old.damage||p.heat||p.water||!p.pasta||!p.drained||n.moisture<0||n.absorbedWaterMl<before.pan.absorbedWaterMl||n.evaporatedWaterMl<old.evaporatedWaterMl||p.reserve<0||p.reserve>200||n.pendingLiquid.plainWaterMl!==0||n.pendingLiquid.tomatoJuiceMl!==0)return false;
    if(intent.kind==='setPanHeat'||intent.kind==='inspect'){
      var wanted=copy(old);if(intent.kind==='setPanHeat')wanted.heat=intent.setting;else wanted.tasted=true;
      if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(op)||entry.transfer)return false;
      if(intent.kind==='inspect'){var check=entry.inspection,chemistry=R.sauceChemistry(state),type=facts.scorched?'scorched':facts.needsMixing?'unmixed':chemistry.type;if(!check||check.time!==state.time||check.type!==type||JSON.stringify(check.chemistry)!==JSON.stringify(chemistry)||check.needsMixing!==facts.needsMixing||check.scorched!==facts.scorched||!entry.observation.endsWith('Pasta: '+R.inspect(state).pasta+'.'))return false;}
      return true;
    }
    if(intent.kind==='pour'){
      var added=intent.amountMl,starch=op.reserveStarchG*added/op.reserve,capacity=R.panThermal(before).effectiveHeatCapacityMl,wanted=copy(old),wantedPot=copy(op);Object.assign(wanted,{moisture:old.moisture+added,waterAdded:old.waterAdded+added,temp:(old.temp*capacity+op.reserveTemp*added)/(capacity+added),chemistry:copy(n.chemistry),pendingLiquid:copy(old.pendingLiquid)});wanted.pendingLiquid.savedWaterMl+=added;if(old.combined)wanted.tasted=false;wantedPot.reserve-=added;wantedPot.reserveStarchG=Math.max(0,op.reserveStarchG-starch);
      var transfer=entry.transfer,thermal=transfer&&transfer.thermal;if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(wantedPot)||Math.abs(n.chemistry.starchG-old.chemistry.starchG-starch)>1e-10||!transfer||transfer.from!=='saved cooking water'||transfer.to!=='sauce'||!Number.isFinite(transfer.amount)||Math.abs(transfer.amount-added)>1e-9||Math.abs(transfer.starchG-starch)>1e-10||transfer.sourceTemperature!==op.reserveTemp||!thermal||thermal.sourceTemperature!==op.reserveTemp||thermal.beforeTemperature!==old.temp||thermal.afterTemperature!==n.temp||!Number.isFinite(thermal.waterMl)||Math.abs(thermal.waterMl-added)>1e-9||thermal.heatCapacityBeforeMl!==capacity||thermal.heatCapacityAfterMl!==R.panThermal(state).effectiveHeatCapacityMl)return false;
      return true;
    }
    var wanted=copy(old),wantedPot=copy(op);['temp','moisture','absorbedWaterMl','evaporatedWaterMl','soft','damage','chemistry','pendingLiquid','pieces'].forEach(function(key){wanted[key]=copy(n[key]);});['temp','reserveTemp','progress','bundles'].forEach(function(key){wantedPot[key]=copy(p[key]);});
    if(intent.kind==='combinePasta'){wanted.combined=true;wantedPot.surfaceStarchG=0;}
    if(mixing){wanted.lastStir=state.time;wanted.turns=(old.turns||0)+1;}if(wanted.combined)wanted.tasted=false;
    if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(wantedPot)||entry.transfer||Math.abs(n.chemistry.starchG-old.chemistry.starchG-(intent.kind==='combinePasta'?op.surfaceStarchG:0))>1e-10||n.soft<old.soft||n.moisture>old.moisture||!Number.isFinite(p.progress)||p.progress<op.progress||!Number.isFinite(p.temp)||p.temp<22||p.temp>op.temp||!Number.isFinite(p.reserveTemp)||p.reserveTemp<22||p.reserveTemp>op.reserveTemp||!p.bundles||p.bundles.length!==6||p.bundles.some(function(bundle,index){var prior=op.bundles[index];return bundle.cling!==prior.cling||bundle.released!==prior.released||!Number.isFinite(bundle.progress)||Math.abs(bundle.progress-prior.progress-(p.progress-op.progress))>1e-9;}))return false;
    if(mixing&&(!entry.mixing||entry.mixing.model!==2||entry.startedAt!==before.time||entry.durationSeconds!==6||entry.mixing.pendingBefore.totalMl!==R.mixing(before).pending.totalMl||entry.mixing.pendingAfter.totalMl!==facts.pendingLiquidMl||!Number.isFinite(entry.mixing.effort)||entry.mixing.effort<=0))return false;
    if(n.pieces.length!==14||n.pieces.some(function(piece,index){var prior=old.pieces[index],turn=(old.turns||0)+1,angle=index*2.4+turn*.61,radius=.18+((index+turn)%3)*.14;return piece.width!==prior.width||piece.cutIndex!==prior.cutIndex||piece.juice!==prior.juice||piece.crushed!==prior.crushed||!Number.isFinite(piece.soft)||piece.soft<prior.soft||piece.x!==(mixing?Math.cos(angle)*radius:prior.x)||piece.z!==(mixing?Math.sin(angle)*radius:prior.z)||piece.down!==(mixing&&index%2===turn%2?1-prior.down:prior.down)||piece.faces.some(function(face,side){return face!==prior.faces[side];})||piece.damage.some(function(damage,side){return !Number.isFinite(damage)||damage<prior.damage[side];});}))return false;
    return true;
  }
  function validHoldingTransition(before,state,intent,entry,value,duration){
    var old=before.pan,n=state.pan,op=before.pot,p=state.pot,expected=copy(before),budget=holdingState(state),fold=intent.kind==='fold';expected.pan=copy(n);expected.pot=copy(p);expected.time=state.time;expected.log=before.log.concat([entry]);expected.feedback=state.feedback;
    if(JSON.stringify(state)!==JSON.stringify(expected)||entry.value!==(value===undefined?null:value)||entry.time!==state.time||entry.inspection&&intent.kind!=='inspect'||!budget.waterConserved||!budget.starchConserved||n.chemistry.oilMl!==15||!Number.isFinite(n.chemistry.dispersion)||n.chemistry.dispersion<0||n.chemistry.dispersion>1||n.heat!==(intent.kind==='setPanHeat'?intent.setting:old.heat)||(n.placement||'burner')!=='burner'||!n.combined||!n.produce||!n.oil||!n.garlic||n.size!=='standard'||!Number.isFinite(n.temp)||n.temp<22||n.temp>270||!Number.isFinite(n.damage)||n.damage<old.damage||p.heat||p.water||!p.pasta||!p.drained||n.moisture<0||n.absorbedWaterMl<old.absorbedWaterMl||n.evaporatedWaterMl<old.evaporatedWaterMl||p.reserve<0||p.reserve>150||n.pendingLiquid.plainWaterMl!==0||n.pendingLiquid.tomatoJuiceMl!==0)return false;
    if(intent.kind==='setPanHeat'||intent.kind==='inspect'){
      var wanted=copy(old);if(intent.kind==='setPanHeat')wanted.heat=intent.setting;else wanted.tasted=true;
      if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(op)||entry.transfer)return false;
      if(intent.kind==='inspect'){var check=entry.inspection,chemistry=R.sauceChemistry(state),type=budget.scorched?'scorched':budget.needsMixing?'unmixed':chemistry.type;if(!check||check.time!==state.time||check.type!==type||JSON.stringify(check.chemistry)!==JSON.stringify(chemistry)||check.needsMixing!==budget.needsMixing||check.scorched!==budget.scorched||!entry.observation.endsWith('Pasta: '+R.inspect(state).pasta+'.'))return false;}
      return true;
    }
    if(intent.kind==='pour'){
      var amount=intent.amountMl,starch=op.reserveStarchG*amount/op.reserve,capacity=R.panThermal(before).effectiveHeatCapacityMl,wanted=copy(old),wantedPot=copy(op);wanted.moisture+=amount;wanted.waterAdded+=amount;wanted.temp=(old.temp*capacity+op.reserveTemp*amount)/(capacity+amount);wanted.chemistry={oilMl:15,starchG:old.chemistry.starchG+starch,dispersion:old.chemistry.dispersion*Math.pow(old.moisture/(old.moisture+amount),.75)};wanted.pendingLiquid.savedWaterMl+=amount;wanted.tasted=false;wantedPot.reserve-=amount;wantedPot.reserveStarchG=Math.max(0,op.reserveStarchG-starch);
      var transfer=entry.transfer,thermal=transfer&&transfer.thermal;if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(wantedPot)||!transfer||transfer.from!=='saved cooking water'||transfer.to!=='sauce'||!Number.isFinite(transfer.amount)||Math.abs(transfer.amount-amount)>1e-9||Math.abs(transfer.starchG-starch)>1e-10||transfer.sourceTemperature!==op.reserveTemp||!thermal||thermal.sourceTemperature!==op.reserveTemp||thermal.beforeTemperature!==old.temp||thermal.afterTemperature!==n.temp||!Number.isFinite(thermal.waterMl)||Math.abs(thermal.waterMl-amount)>1e-9||thermal.heatCapacityBeforeMl!==capacity||thermal.heatCapacityAfterMl!==R.panThermal(state).effectiveHeatCapacityMl)return false;
      return true;
    }
    var wanted=copy(old),wantedPot=copy(op);['temp','moisture','absorbedWaterMl','evaporatedWaterMl','brown','damage','chemistry','pendingLiquid','pieces'].forEach(function(key){wanted[key]=copy(n[key]);});['temp','reserveTemp','progress'].forEach(function(key){wantedPot[key]=copy(p[key]);});wanted.tasted=false;
    if(fold){wanted.lastStir=state.time;wanted.turns=(old.turns||0)+1;}
    if(JSON.stringify(n)!==JSON.stringify(wanted)||JSON.stringify(p)!==JSON.stringify(wantedPot)||entry.transfer||n.chemistry.starchG!==old.chemistry.starchG||n.brown<old.brown||n.moisture>old.moisture||!Number.isFinite(p.progress)||p.progress<op.progress||!Number.isFinite(p.temp)||p.temp!==22||!Number.isFinite(p.reserveTemp)||p.reserveTemp<22||p.reserveTemp>op.reserveTemp||n.pieces.length!==14||n.pieces.some(function(piece,index){var prior=old.pieces[index],turn=(old.turns||0)+1,angle=index*2.4+turn*.61,radius=.18+((index+turn)%3)*.14;return piece.width!==prior.width||piece.cutIndex!==prior.cutIndex||piece.soft!==prior.soft||piece.x!==(fold?Math.cos(angle)*radius:prior.x)||piece.z!==(fold?Math.sin(angle)*radius:prior.z)||piece.down!==(fold&&index%2===turn%2?1-prior.down:prior.down)||piece.faces.some(function(face,side){return !Number.isFinite(face)||face<prior.faces[side];})||piece.damage.some(function(damage,side){return !Number.isFinite(damage)||damage<prior.damage[side];});}))return false;
    if(fold&&(!entry.mixing||entry.mixing.model!==2||entry.startedAt!==before.time||entry.durationSeconds!==6||entry.mixing.pendingBefore.totalMl!==R.mixing(before).pending.totalMl||entry.mixing.pendingAfter.totalMl!==budget.pendingLiquidMl||!Number.isFinite(entry.mixing.effort)||entry.mixing.effort<=0))return false;
    return true;
  }
  function executeActivity(s,intent){
    if(!allowedActivity(s,intent))return s;
    var action=intent.kind==='mince'?'minceGarlic':intent.kind==='serve'?'servePortion':intent.kind==='return'?'returnPortion':'plate',value=intent.kind==='mince'?intent.clove:intent.kind==='finish'?undefined:intent.plate;
    var interaction=intent.method==='keyboard'?'keyboard':intent.kind==='mince'?(intent.method==='pointer'?'scene-mince':'knife-mince'):intent.kind==='finish'?'select':intent.method==='pointer'?'scene-serve':'spoon-serve',duration=0;
    if(s.activity==='hold-and-recheck-sauce'){
      action=intent.kind==='pour'?'pour':intent.kind==='fold'?'stirSweep':intent.kind==='inspect'?'taste':intent.kind==='waitPan'?'advance':'panHeat';value=intent.kind==='pour'?intent.amountMl:intent.kind==='fold'?(intent.method==='pointer'?'gesture':'button'):intent.kind==='waitPan'?intent.seconds:intent.kind==='setPanHeat'?intent.setting:undefined;duration=intent.kind==='fold'?6:intent.kind==='waitPan'?intent.seconds:0;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='pour'?(intent.method==='pointer'?'scene-pour':'tilt'):intent.kind==='fold'?'scene-stir':intent.kind==='inspect'?'sauce-trail':intent.kind==='setPanHeat'?'dial':'select';
    }
    if(s.activity==='finish-pasta-in-sauce'){
      action=intent.kind==='combinePasta'?'combine':intent.kind==='pour'?'pour':intent.kind==='fold'?'stirSweep':intent.kind==='inspect'?'taste':intent.kind==='waitPan'?'advance':'panHeat';value=intent.kind==='pour'?intent.amountMl:intent.kind==='fold'?(intent.method==='pointer'?'gesture':'button'):intent.kind==='waitPan'?intent.seconds:intent.kind==='setPanHeat'?intent.setting:undefined;duration=intent.kind==='fold'||intent.kind==='combinePasta'?6:intent.kind==='waitPan'?intent.seconds:0;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='combinePasta'?(intent.method==='pointer'?'scene-handoff':'select'):intent.kind==='pour'?(intent.method==='pointer'?'scene-pour':'tilt'):intent.kind==='fold'?'scene-stir':intent.kind==='inspect'?'sauce-trail':intent.kind==='setPanHeat'?'dial':'select';
    }
    if(s.activity==='preheat-and-load-mushrooms'){
      action=intent.kind==='loadMushrooms'?'produce':intent.kind==='waitPan'?'advance':'panHeat';value=intent.kind==='waitPan'?intent.seconds:intent.kind==='setPanHeat'?intent.setting:undefined;duration=intent.kind==='waitPan'?intent.seconds:0;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='loadMushrooms'?(intent.method==='pointer'?'scene-handoff':'select'):intent.kind==='setPanHeat'?'dial':'select';
    }
    if(s.activity==='rinse-and-dry-produce'){
      action=intent.kind==='rinseProduce'?'rinse':intent.kind;value=intent.kind==='blot'?intent.area:undefined;
      interaction=intent.kind==='rinseProduce'?(intent.method==='keyboard'?'keyboard-rinse':intent.method==='pointer'?'scene-rinse':'select'):intent.method==='keyboard'?'keyboard':intent.method==='pointer'?'scene-cloth':'cloth-contact';
    }
    if(s.activity==='space-mushrooms'){action='movePiece';value=intent.piece+':'+intent.x+':'+intent.z;interaction=intent.method==='keyboard'?'keyboard':intent.method==='pointer'?'scene-piece':'pan-map';}
    if(s.activity==='precision-mushroom-cuts'){action=intent.kind==='sliceProduce'?'slice':'finishCuts';value=intent.kind==='sliceProduce'?intent.piece+':'+intent.cutMm:undefined;interaction=intent.method==='keyboard'?'keyboard':intent.kind==='sliceProduce'?(intent.method==='pointer'?'scene-cut':'knife-stroke'):'select';}
    if(s.activity==='separate-and-check-pasta'){
      action=intent.kind==='separatePasta'?'separatePasta':intent.kind==='waitPot'?'advance':intent.kind==='setPotHeat'?'potHeat':'sample';value=intent.kind==='separatePasta'?intent.group:intent.kind==='waitPot'?intent.seconds:intent.kind==='setPotHeat'?intent.setting:undefined;duration=intent.kind==='waitPot'?intent.seconds:0;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='separatePasta'?(intent.method==='pointer'?'scene-pot-sweep':'pot-sweep'):intent.kind==='setPotHeat'?'dial':intent.kind==='samplePasta'?(intent.method==='pointer'?'scene-sample':'sample-press'):'select';
    }
    if(s.activity==='tomato-texture'){
      action=intent.kind==='press'?'crushTomato':intent.kind==='fold'?'stirSweep':'taste';value=intent.kind==='press'?intent.piece:intent.kind==='fold'?(intent.method==='pointer'?'gesture':'button'):undefined;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='press'?(intent.method==='pointer'?'scene-masher':'masher-press'):intent.kind==='fold'?'scene-stir':'sauce-trail';duration=intent.kind==='fold'?6:0;
    }
    if(s.activity==='mushroom-turning'){action=intent.kind==='turnMushroom'?'flipPiece':intent.kind==='waitPan'?'advance':'panHeat';value=intent.kind==='turnMushroom'?intent.piece:intent.kind==='waitPan'?intent.seconds:intent.setting;duration=intent.kind==='waitPan'?intent.seconds:0;interaction=intent.method==='keyboard'?'keyboard':intent.kind==='turnMushroom'?'scene-turn':intent.kind==='setPanHeat'?'dial':'select';}
    if(s.activity==='cool-and-fold-sauce'){
      action=intent.kind==='movePan'?'panPlace':intent.kind==='setPanHeat'?'panHeat':intent.kind==='waitPan'?'advance':intent.kind==='fold'?'stirSweep':'taste';value=intent.kind==='movePan'?intent.placement:intent.kind==='setPanHeat'?intent.setting:intent.kind==='waitPan'?intent.seconds:intent.kind==='fold'?(intent.method==='pointer'?'gesture':'button'):undefined;duration=intent.kind==='fold'?6:intent.kind==='waitPan'?intent.seconds:0;
      interaction=intent.kind==='movePan'?(intent.method==='keyboard'?'pan-carry-keyboard':intent.method==='pointer'?'scene-pan-carry':'pan-placement'):intent.method==='keyboard'?'keyboard':intent.kind==='setPanHeat'?'dial':intent.kind==='fold'?'scene-stir':intent.kind==='inspect'?'sauce-trail':'select';
    }
    if(s.activity==='cover-and-check-pasta'){
      action=intent.kind==='moveLid'?'lidPlace':intent.kind==='waitPot'?'advance':intent.kind==='setPotHeat'?'potHeat':'sample';value=intent.kind==='moveLid'?intent.placement:intent.kind==='waitPot'?intent.seconds:intent.kind==='setPotHeat'?intent.setting:undefined;duration=intent.kind==='waitPot'?intent.seconds:0;
      interaction=intent.kind==='moveLid'?(intent.method==='keyboard'?'keyboard-lid':intent.method==='pointer'?'scene-lid':'lid-carry'):intent.method==='keyboard'?'keyboard':intent.kind==='setPotHeat'?'dial':intent.kind==='samplePasta'?(intent.method==='pointer'?'scene-sample':'sample-press'):'select';
    }
    if(s.activity==='surface-drying'){action=intent.kind;value=intent.kind==='blot'?intent.area:undefined;interaction=intent.method==='keyboard'?'keyboard':intent.method==='pointer'?'scene-cloth':'cloth-contact';}
    if(s.activity==='reserve-and-drain'){
      action=intent.kind==='samplePasta'?'sample':intent.kind==='reserveWater'?'ladle':'drainPour';value=intent.kind==='drainPasta'?intent.amountMl:undefined;
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='samplePasta'?(intent.method==='pointer'?'scene-sample':'sample-press'):intent.kind==='reserveWater'?(intent.method==='pointer'?'scene-ladle':'ladle-carry'):(intent.method==='pointer'?'scene-drain':'drain-tilt');
    }
    if(s.activity==='pasta-weighing'){
      action=intent.kind==='addPasta'?'pasta':'weigh';value=intent.kind==='addPasta'?undefined:s.state.prep.pasta+(intent.kind==='addDry'?intent.grams:-intent.grams);
      interaction=intent.method==='keyboard'?'keyboard':intent.kind==='addPasta'?(intent.method==='pointer'?'scene-handoff':'select'):(intent.method==='pointer'?'scene-weigh':'packet-weigh');
    }
    var state=R.act(s.state,action,value,interaction),entry=state&&state.log&&state.log[state.log.length-1];
    if(state===s.state||!entry||!entry.accepted||entry.action!==action||state.log.length!==s.state.log.length+1||Math.abs(state.time-s.state.time-duration)>1e-9||duration&&!['waitPan','waitPot'].includes(intent.kind)&&entry.durationSeconds!==duration||intent.kind==='inspect'&&(!entry.inspection||entry.inspection.kind!=='sauce'))return s;
    if(s.activity==='finish-pasta-in-sauce'&&(entry.interaction!==interaction||!validFinishingTransition(s.state,state,intent,entry,value,duration)))return s;
    if(s.activity==='hold-and-recheck-sauce'&&(entry.interaction!==interaction||!validHoldingTransition(s.state,state,intent,entry,value,duration)))return s;
    if(s.activity==='preheat-and-load-mushrooms'){
      var oldPan=s.state.pan,newPan=state.pan,expectedState=copy(s.state);expectedState.pan=copy(newPan);expectedState.time=state.time;expectedState.log=s.state.log.concat([entry]);expectedState.feedback=state.feedback;
      if(JSON.stringify(state)!==JSON.stringify(expectedState)||entry.value!==(value===undefined?null:value)||entry.interaction!==interaction||entry.time!==state.time||entry.inspection||entry.transfer||!newPan.oil||newPan.chemistry.oilMl!==15||newPan.chemistry.starchG!==0||newPan.absorbedWaterMl!==0||newPan.waterAdded!==0||newPan.garlic||newPan.combined||newPan.tasted||newPan.size!=='standard'||!Number.isFinite(newPan.temp)||newPan.temp<22||newPan.temp>270||!Number.isFinite(newPan.damage)||newPan.damage<oldPan.damage)return s;
      if(intent.kind==='loadMushrooms'){
        var expectedPan=copy(oldPan);expectedPan.produce=true;expectedPan.moisture=35;expectedPan.temp=Math.max(22,oldPan.temp-25);expectedPan.lastStir=state.time;expectedPan.pieces=Array.from({length:14},function(_,index){var angle=index*2.4,radius=.18+(index%3)*.14;return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,down:0,faces:[0,0],damage:[0,0],soft:0,cutIndex:Math.floor(index*8/14),width:5};});
        if(JSON.stringify(newPan)!==JSON.stringify(expectedPan))return s;
      }else if(intent.kind==='setPanHeat'){
        var expectedPan=copy(oldPan);expectedPan.heat=intent.setting;if(JSON.stringify(newPan)!==JSON.stringify(expectedPan))return s;
      }else if(!oldPan.produce){
        var expectedPan=copy(oldPan),target=[22,112,185,270][oldPan.heat],rate=oldPan.heat?.018:.0035,expectedTemperature=target+(oldPan.temp-target)*Math.exp(-rate*duration);expectedPan.temp=newPan.temp;if(Math.abs(newPan.temp-expectedTemperature)>1e-9||JSON.stringify(newPan)!==JSON.stringify(expectedPan))return s;
      }else{
        var allowedPan=copy(oldPan);['temp','moisture','evaporatedWaterMl','brown','soft','damage','pieces','chemistry'].forEach(function(key){allowedPan[key]=copy(newPan[key]);});
        if(JSON.stringify(newPan)!==JSON.stringify(allowedPan)||!panLoadingState(state).waterConserved||newPan.moisture>oldPan.moisture||newPan.moisture<0||newPan.evaporatedWaterMl<oldPan.evaporatedWaterMl||newPan.pieces.length!==14||newPan.pieces.some(function(piece,index){var old=oldPan.pieces[index];return piece.x!==old.x||piece.z!==old.z||piece.down!==old.down||piece.width!==old.width||piece.cutIndex!==old.cutIndex||piece.soft!==old.soft||!Array.isArray(piece.faces)||!Array.isArray(piece.damage)||piece.faces.length!==2||piece.damage.length!==2||piece.faces.some(function(value,side){return !Number.isFinite(value)||value<old.faces[side]||side!==old.down&&value!==old.faces[side];})||piece.damage.some(function(value,side){return !Number.isFinite(value)||value<old.damage[side]||side!==old.down&&value!==old.damage[side];});}))return s;
      }
    }
    if(s.activity==='rinse-and-dry-produce'){
      var expectedPrep=copy(s.state.prep),beforeDrying=R.drying(s.state);
      if(intent.kind==='rinseProduce'){expectedPrep.rinsed=true;expectedPrep.dry=false;if(expectedPrep.blotAreas)expectedPrep.blotAreas=Array(8).fill(2);}
      else if(intent.kind==='blot'){expectedPrep.blotAreas=beforeDrying.areas.slice();expectedPrep.blotAreas[intent.area]--;expectedPrep.clothLoad=beforeDrying.cloth+1;expectedPrep.dry=expectedPrep.blotAreas.every(function(value){return value===0;});}
      else expectedPrep.clothLoad=0;
      var expectedState=copy(s.state);expectedState.prep=expectedPrep;expectedState.log=s.state.log.concat([entry]);expectedState.feedback=state.feedback;
      var facts=rinsingState(state);
      if(JSON.stringify(state)!==JSON.stringify(expectedState)||entry.value!==(value===undefined?null:value)||entry.interaction!==interaction||entry.time!==state.time||entry.inspection||entry.transfer||!facts.rinsed||facts.clothCapacity!==8||!facts.waterConserved||facts.surfaceMarks<0||facts.surfaceMarks>16||facts.clothMarks<0||facts.clothMarks>8||facts.clothMarks!==(state.prep.clothLoad||0)||facts.surfaceWaterMl!==facts.surfaceMarks*1.875||facts.clothWaterMl!==facts.clothMarks*1.875||facts.wrungWaterMl<0||facts.areas.length!==8||JSON.stringify(facts.areas)!==JSON.stringify(state.prep.blotAreas||Array(8).fill(2))||facts.surfaceMarks!==facts.areas.reduce(function(sum,amount){return sum+amount;},0)||state.prep.dry!==(facts.surfaceMarks===0)||facts.areas.some(function(amount){return !Number.isInteger(amount)||amount<0||amount>2;}))return s;
    }
    if(s.activity==='space-mushrooms'){
      var expectedPan=copy(s.state.pan);expectedPan.pieces[intent.piece].x=intent.x/100;expectedPan.pieces[intent.piece].z=intent.z/100;
      if(JSON.stringify(state.pan)!==JSON.stringify(expectedPan)||JSON.stringify(state.prep)!==JSON.stringify(s.state.prep)||JSON.stringify(state.pot)!==JSON.stringify(s.state.pot)||entry.value!==value||entry.inspection||state.plated||state.submitted)return s;
    }
    if(s.activity==='precision-mushroom-cuts'){
      var expectedPrep=copy(s.state.prep),widths=state.prep.cuts;
      if(intent.kind==='sliceProduce'){var originalWidth=expectedPrep.cuts[intent.piece];expectedPrep.cuts.splice(intent.piece,1,intent.cutMm,originalWidth-intent.cutMm);expectedPrep.cutMethod='board';}else{expectedPrep.cut=true;expectedPrep.cutMethod='board';}
      if(JSON.stringify(state.prep)!==JSON.stringify(expectedPrep)||JSON.stringify(state.pan)!==JSON.stringify(s.state.pan)||JSON.stringify(state.pot)!==JSON.stringify(s.state.pot)||entry.value!==(value===undefined?null:value)||entry.inspection||state.plated||state.submitted||!Array.isArray(widths)||widths.length>40||widths.some(function(width){return !Number.isInteger(width)||width<1;})||widths.reduce(function(sum,width){return sum+width;},0)!==40)return s;
    }
    if(s.activity==='separate-and-check-pasta'){
      var beforePot=s.state.pot,afterPot=state.pot;
      if(!afterPot.pasta||afterPot.drained||afterPot.lid!=='rest'||state.prep.pasta!==160||JSON.stringify(state.prep)!==JSON.stringify(s.state.prep)||JSON.stringify(state.pan)!==JSON.stringify(s.state.pan)||afterPot.reserve!==0||afterPot.reserveStarchG!==0||afterPot.discardedStarchG!==0||afterPot.surfaceStarchG!==.64||!Array.isArray(afterPot.bundles)||afterPot.bundles.length!==6||![afterPot.temp,afterPot.water,afterPot.progress,afterPot.starchG,afterPot.releasedStarchG].every(Number.isFinite)||afterPot.water<0||afterPot.water>beforePot.water+1e-9||afterPot.starchG<beforePot.starchG||Math.abs(afterPot.starchG-afterPot.releasedStarchG)>1e-9||Math.abs(afterPot.progress-afterPot.bundles.reduce(function(sum,b){return sum+b.progress;},0)/6)>1e-10||afterPot.stirred!==afterPot.bundles.every(function(b){return b.released;}))return s;
      if(intent.kind==='waitPot'){
        if(afterPot.heat!==beforePot.heat||JSON.stringify(afterPot.sample)!==JSON.stringify(beforePot.sample)||afterPot.bundles.some(function(b,index){var old=beforePot.bundles[index];return !Number.isFinite(b.progress)||b.progress<old.progress||!Number.isFinite(b.cling)||b.cling<old.cling||b.cling>.95||b.released!==old.released||b.released&&b.cling!==0;}))return s;
      }else{
        var expectedPot=copy(beforePot);
        if(intent.kind==='separatePasta'){expectedPot.bundles[intent.group].cling=0;expectedPot.bundles[intent.group].released=true;expectedPot.stirred=expectedPot.bundles.every(function(b){return b.released;});}
        if(intent.kind==='setPotHeat')expectedPot.heat=intent.setting;
        if(intent.kind==='samplePasta'){
          var observed=strandsState(s.state);
          if(!entry.inspection||entry.inspection.kind!=='pasta'||entry.inspection.time!==state.time||!afterPot.sample||afterPot.sample.time!==state.time||afterPot.sample.progress!==beforePot.progress||entry.inspection.label!==R.inspect(state).pasta||entry.inspection.label!==afterPot.sample.texture||JSON.stringify(entry.inspection.range)!==JSON.stringify(observed.range)||JSON.stringify(entry.inspection.range)!==JSON.stringify(afterPot.sample.range)||entry.inspection.clumped!==observed.clumped||entry.inspection.clumped!==afterPot.sample.clumped)return s;
          expectedPot.sample=copy(afterPot.sample);
        }
        if(JSON.stringify(afterPot)!==JSON.stringify(expectedPot))return s;
      }
    }
    if(s.activity==='cool-and-fold-sauce'){
      var oldPan=s.state.pan,newPan=state.pan,oldPot=s.state.pot,newPot=state.pot;
      if(!newPan.combined||!newPan.produce||!newPan.oil||!newPan.garlic||newPan.pieces.length!==14||!newPot.pasta||!newPot.drained||newPot.heat!==0||newPot.reserve!==150||newPot.reserveStarchG!==1.8||newPan.chemistry.oilMl!==25||newPan.chemistry.starchG!==1.2||newPan.waterAdded!==50||newPot.progress<oldPot.progress||newPan.damage<oldPan.damage||newPan.absorbedWaterMl<oldPan.absorbedWaterMl||newPan.evaporatedWaterMl<oldPan.evaporatedWaterMl||![newPan.temp,newPan.moisture,newPan.absorbedWaterMl,newPan.evaporatedWaterMl,newPan.chemistry.dispersion,newPot.progress].every(Number.isFinite)||newPan.moisture<0||Math.abs(newPan.moisture+newPan.absorbedWaterMl+newPan.evaporatedWaterMl-80)>1e-7)return s;
      if(!duration){var expectedPan=copy(oldPan);if(intent.kind==='movePan')expectedPan.placement=intent.placement;if(intent.kind==='setPanHeat')expectedPan.heat=intent.setting;if(intent.kind==='inspect')expectedPan.tasted=true;if(JSON.stringify(expectedPan)!==JSON.stringify(newPan)||JSON.stringify(oldPot)!==JSON.stringify(newPot))return s;}
      else if(R.panPosition(state).site!==R.panPosition(s.state).site||newPan.heat!==oldPan.heat)return s;
    }
    if(s.activity==='cover-and-check-pasta'){
      var beforePot=s.state.pot,afterPot=state.pot;
      if(!afterPot.pasta||afterPot.drained||state.prep.pasta!==160||state.pan.produce||state.pan.heat||state.pan.combined||afterPot.reserve!==0||afterPot.reserveStarchG!==0||afterPot.discardedStarchG!==0||afterPot.surfaceStarchG!==.64||!Array.isArray(afterPot.bundles)||afterPot.bundles.length!==6||![afterPot.temp,afterPot.water,afterPot.progress,afterPot.starchG,afterPot.releasedStarchG].every(Number.isFinite)||afterPot.water<0||afterPot.water>beforePot.water+1e-9||Math.abs(afterPot.starchG-afterPot.releasedStarchG)>1e-9)return s;
      if(intent.kind==='waitPot'){
        if(afterPot.heat!==beforePot.heat||afterPot.lid!==beforePot.lid||afterPot.progress<beforePot.progress||afterPot.starchG<beforePot.starchG||JSON.stringify(afterPot.sample)!==JSON.stringify(beforePot.sample)||afterPot.bundles.some(function(bundle,index){var before=beforePot.bundles[index];return !Number.isFinite(bundle.progress)||bundle.progress<before.progress||bundle.cling!==before.cling||bundle.released!==before.released;}))return s;
      }else{
        var expectedPot=copy(beforePot);
        if(intent.kind==='moveLid')expectedPot.lid=intent.placement;
        if(intent.kind==='setPotHeat')expectedPot.heat=intent.setting;
        if(intent.kind==='samplePasta'){
          if(!entry.inspection||entry.inspection.kind!=='pasta'||entry.inspection.time!==state.time||!afterPot.sample||afterPot.sample.time!==state.time||afterPot.sample.progress!==beforePot.progress||entry.inspection.label!==afterPot.sample.texture||JSON.stringify(entry.inspection.range)!==JSON.stringify(afterPot.sample.range)||entry.inspection.clumped!==afterPot.sample.clumped)return s;
          expectedPot.sample=copy(afterPot.sample);
        }
        if(JSON.stringify(afterPot)!==JSON.stringify(expectedPot))return s;
      }
    }
    if(s.activity==='reserve-and-drain'){
      if(intent.kind==='samplePasta'&&(!entry.inspection||entry.inspection.kind!=='pasta'||!state.pot.sample))return s;
      if(intent.kind!=='samplePasta'){
        var expected=intent.kind==='reserveWater'?R.waterHandling(s.state).scoop:Math.min(s.state.pot.water,intent.amountMl),removed=s.state.pot.water-state.pot.water;
        if(!entry.transfer||entry.transfer.to!==(intent.kind==='reserveWater'?'jug':'drain')||Math.abs(entry.transfer.amount-expected)>1e-9||Math.abs(removed-expected)>1e-9||intent.kind==='reserveWater'&&Math.abs(state.pot.reserve-s.state.pot.reserve-expected)>1e-9||intent.kind==='drainPasta'&&(state.pot.reserve!==s.state.pot.reserve||state.pot.drained!==(state.pot.water===0)))return s;
      }
      var budget=drainageFacts(state);if(!budget.waterConserved||!budget.starchConserved)return s;
    }
    if(s.activity==='mushroom-turning'){
      if(state.pan.pieces.length!==14||state.pan.combined||state.pot.pasta)return s;
      if(intent.kind==='turnMushroom'&&(state.pan.pieces.some(function(piece,index){var before=s.state.pan.pieces[index];return piece.down!==(index===intent.piece?1-before.down:before.down)||JSON.stringify(piece.faces)!==JSON.stringify(before.faces)||JSON.stringify(piece.damage)!==JSON.stringify(before.damage)||piece.x!==before.x||piece.z!==before.z;})||state.pan.heat!==s.state.pan.heat))return s;
      if(intent.kind==='setPanHeat'&&(state.pan.heat!==intent.setting||JSON.stringify(state.pan.pieces)!==JSON.stringify(s.state.pan.pieces)))return s;
      if(intent.kind==='waitPan'&&(state.pan.heat!==s.state.pan.heat||state.pan.pieces.some(function(piece,index){var before=s.state.pan.pieces[index];return piece.down!==before.down||piece.faces.some(function(face,side){return face<before.faces[side];})||piece.damage.some(function(damage,side){return damage<before.damage[side];});})))return s;
    }
    if(s.activity==='pasta-weighing'&&(intent.kind==='addPasta'?(!state.pot.pasta||state.prep.pasta!==s.state.prep.pasta):(state.prep.pasta!==value||state.pot.pasta)))return s;
    var intents=s.record.intents.concat([intent]),receipt={index:intents.length,kind:intent.kind,actor:intent.actor,method:intent.method,action:action,value:value===undefined?null:value,interaction:entry.interaction||null,before:activityFacts(s.state,s.activity),after:activityFacts(state,s.activity),durationSeconds:duration,transfer:entry.transfer?copy(entry.transfer):null,inspection:entry.inspection?copy(entry.inspection):null,engineLogIndex:state.log.length-1};
    if(s.activity==='hold-and-recheck-sauce'&&intent.kind==='inspect')receipt.holdingCheck={pastaTexture:R.inspect(state).pasta};
    if(s.activity==='finish-pasta-in-sauce'){
      if(intent.kind==='combinePasta')receipt.pastaTransfer={dryEquivalentGrams:160,from:'colander',to:'pan',surfaceStarchTransferredG:s.state.pot.surfaceStarchG-state.pot.surfaceStarchG,startedAt:s.state.time,endedAt:state.time,durationSeconds:6,beforeTemperature:s.state.pan.temp,afterTemperature:state.pan.temp,absorbedWaterMl:state.pan.absorbedWaterMl-s.state.pan.absorbedWaterMl,evaporatedWaterMl:state.pan.evaporatedWaterMl-s.state.pan.evaporatedWaterMl,pendingBeforeMl:R.mixing(s.state).pending.totalMl,pendingAfterMl:R.mixing(state).pending.totalMl};
      if(intent.kind==='inspect')receipt.finishCheck={pastaTexture:R.inspect(state).pasta};
    }
    if(s.activity==='preheat-and-load-mushrooms'){
      if(intent.kind==='loadMushrooms')receipt.produceTransfer={grams:200,pieces:14,from:'tray',to:'pan',beforeTemperature:s.state.pan.temp,afterTemperature:state.pan.temp,coolingDrop:s.state.pan.temp-state.pan.temp,initialFreeWaterMl:35,time:state.time,heat:s.state.pan.heat,band:preheatBand(s.state.pan.temp)};
      if(intent.kind==='waitPan')receipt.panWait={seconds:duration,loaded:!!s.state.pan.produce,heat:s.state.pan.heat,beforeTemperature:s.state.pan.temp,afterTemperature:state.pan.temp,beforeWaterMl:s.state.pan.moisture,afterWaterMl:state.pan.moisture,evaporatedWaterMl:state.pan.evaporatedWaterMl-s.state.pan.evaporatedWaterMl,beforeDamage:s.state.pan.damage,afterDamage:state.pan.damage};
    }
    if(s.activity==='rinse-and-dry-produce'){
      var after=receipt.after.rinsing;receipt.prepWater={operation:intent.kind==='rinseProduce'?'rinse':intent.kind,area:intent.kind==='blot'?intent.area:null,from:intent.kind==='rinseProduce'?'running-water':intent.kind==='blot'?'produce':'cloth',to:intent.kind==='wring'?'bowl':intent.kind==='blot'?'cloth':'produce',amountMl:intent.kind==='rinseProduce'?30:intent.kind==='blot'?1.875:receipt.before.rinsing.clothWaterMl,surfaceWaterMl:after.surfaceWaterMl,clothWaterMl:after.clothWaterMl,wrungWaterMl:after.wrungWaterMl,time:state.time};
    }
    if(s.activity==='space-mushrooms'){var before=receipt.before.spacing,after=receipt.after.spacing,oldPiece=before.pieces[intent.piece],newPiece=after.pieces[intent.piece];receipt.mushroomMove={piece:intent.piece,from:{x:oldPiece.x,z:oldPiece.z},to:{x:newPiece.x,z:newPiece.z},beforeContact:oldPiece.contact,afterContact:newPiece.contact,beforeNeighbors:oldPiece.neighbors,afterNeighbors:newPiece.neighbors,beforeCrowdedCount:before.crowdedCount,afterCrowdedCount:after.crowdedCount,faceDown:newPiece.down,time:state.time};}
    if(s.activity==='precision-mushroom-cuts'){
      if(intent.kind==='sliceProduce')receipt.cut={piece:intent.piece,cutMm:intent.cutMm,beforeWidthMm:s.state.prep.cuts[intent.piece],afterWidthsMm:state.prep.cuts.slice(intent.piece,intent.piece+2),totalBeforeMm:40,totalAfterMm:40,time:state.time};
      else receipt.cutRecord={widthsMm:state.prep.cuts.slice(),totalMm:40,onTarget:R.cutProfile(state).onTarget,even:R.cutProfile(state).even,targetMet:R.cutProfile(state).onTarget&&R.cutProfile(state).even,time:state.time};
    }
    if(s.activity==='separate-and-check-pasta'){
      if(intent.kind==='separatePasta')receipt.pastaSeparation={group:intent.group,time:state.time,clumpedBefore:R.pastaSurface(s.state).clumped,clumpedAfter:R.pastaSurface(state).clumped,progressUnchanged:true};
      if(intent.kind==='waitPot')receipt.potWait={seconds:duration,lid:s.state.pot.lid,heat:s.state.pot.heat,beforeTemperature:s.state.pot.temp,afterTemperature:state.pot.temp,beforeWaterMl:s.state.pot.water,afterWaterMl:state.pot.water,evaporatedWaterMl:s.state.pot.water-state.pot.water};
    }
    if(s.activity==='cool-and-fold-sauce'&&intent.kind==='movePan')receipt.panMove={from:R.panPosition(s.state).site,to:R.panPosition(state).site,time:state.time,burnerSetting:state.pan.heat,effectiveHeatBefore:R.panPosition(s.state).heat,effectiveHeatAfter:R.panPosition(state).heat};
    if(s.activity==='cover-and-check-pasta'){
      if(intent.kind==='moveLid')receipt.lidMove={from:s.state.pot.lid,to:state.pot.lid,time:state.time};
      if(intent.kind==='waitPot')receipt.potWait={seconds:duration,lid:s.state.pot.lid,heat:s.state.pot.heat,beforeTemperature:s.state.pot.temp,afterTemperature:state.pot.temp,beforeWaterMl:s.state.pot.water,afterWaterMl:state.pot.water,evaporatedWaterMl:s.state.pot.water-state.pot.water};
    }
    if(s.activity==='mushroom-turning'&&intent.kind==='turnMushroom'){var surface=R.panSurface(state).pieces[intent.piece],face=1-surface.down;receipt.mushroomTurn={piece:intent.piece,fromDown:s.state.pan.pieces[intent.piece].down,toDown:surface.down,revealedFace:face,color:surface.topColor,browning:surface.top,damage:state.pan.pieces[intent.piece].damage[face],time:state.time,x:surface.x,z:surface.z};}
    if(s.activity==='reserve-and-drain'&&intent.kind!=='samplePasta')receipt.waterTransfer={from:'pot',to:intent.kind==='reserveWater'?'jug':'drain',requestedMl:intent.kind==='reserveWater'?50:intent.amountMl,actualMl:s.state.pot.water-state.pot.water,starchG:s.state.pot.starchG-state.pot.starchG,sourceTemperature:s.state.pot.water>0?s.state.pot.temp:null};
    if(s.activity==='pasta-weighing')receipt.massTransfer={from:intent.kind==='addDry'?'packet':'scale',to:intent.kind==='returnDry'?'packet':intent.kind==='addPasta'?'pot':'scale',grams:intent.kind==='addPasta'?s.state.prep.pasta:intent.grams};
    return seal(Object.assign({},s,{state:state,reading:entry.inspection?copy(entry.inspection):s.reading,inspectionFresh:s.activity==='separate-and-check-pasta'?strandsFacts(state,s.receipts.concat([receipt])).sampleCurrent:s.activity==='cover-and-check-pasta'?coveringFacts(state,s.receipts.concat([receipt])).sampleCurrent:s.activity==='reserve-and-drain'?drainageFacts(state).sampleCurrent:intent.kind==='inspect',pending:null,record:Object.assign({},s.record,{intents:intents}),guide:activityGuide(s.activity,s.mode,state,s.receipts.concat([receipt])),receipts:s.receipts.concat([receipt]),lastReceipt:receipt,lastIntent:intent,limitReached:intents.length>=LIMIT}));
  }
  function restoreActivityRecord(raw){
    if(!object(raw)||raw.protocol!==2||!getActivity(raw.activity)||getActivity(raw.activity).protocol!==2||modes.indexOf(raw.mode)<0||!Array.isArray(raw.intents)||raw.intents.length>LIMIT||typeof raw.reflection!=='string'||raw.reflection.length>2000)return null;
    try{var s=create({activity:raw.activity,mode:raw.mode});for(var i=0;i<raw.intents.length;i++){var intent=normalizeActivityIntent(raw.intents[i],raw.mode,raw.activity),next=executeActivity(s,intent);if(next===s)return null;s=next;}return seal(Object.assign({},s,{record:Object.assign({},s.record,{reflection:raw.reflection})}));}catch(e){return null;}
  }
  function canBegin(s,kind,options){
    if(!valid(s)||s.pending||s.mode==='watch'||!Object.prototype.hasOwnProperty.call(phaseSets,kind))return false;if(options===undefined)options={};if(!object(options))return false;
    var raw={kind:kind,method:options.method===undefined?'button':options.method,actor:'learner',mode:s.mode};if(kind==='pour'){raw.source=options.source;raw.amountMl=options.amountMl;}
    if(s.activity!==ACTIVITY){raw.activity=s.activity;if(kind==='mince')raw.clove=options.clove;if(kind==='serve'||kind==='return')raw.plate=options.plate;if(kind==='press'||kind==='turnMushroom')raw.piece=options.piece;if(kind==='separatePasta')raw.group=options.group;if(kind==='sliceProduce'){raw.piece=options.piece;raw.cutMm=options.cutMm;}if(kind==='moveMushroom'){raw.piece=options.piece;raw.x=options.x;raw.z=options.z;}if(kind==='waitPan'||kind==='waitPot')raw.seconds=options.seconds;if(kind==='setPanHeat'||kind==='setPotHeat')raw.setting=options.setting;if(kind==='moveLid'||kind==='movePan')raw.placement=options.placement;if(kind==='blot')raw.area=options.area;if(kind==='addDry'||kind==='returnDry')raw.grams=options.grams;if(kind==='drainPasta')raw.amountMl=options.amountMl;}
    return allowed(s,normalizeIntent(raw,s.mode,s.activity));
  }
  // A view over committed avatar receipts. Supplied setup observations are
  // excluded, and later actions never rewrite either historical spoon check.
  function sauceReview(s){
    if(!valid(s)||(s.activity!==ACTIVITY&&s.activity!=='tomato-texture'&&s.activity!=='cool-and-fold-sauce'&&s.activity!=='finish-pasta-in-sauce'&&s.activity!=='hold-and-recheck-sauce'))return null;
    function finite(value){return typeof value==='number'&&Number.isFinite(value)?value:null;}
    function metadata(receipt){return {actionNumber:receipt.index,engineLogIndex:Number.isInteger(receipt.engineLogIndex)?receipt.engineLogIndex:s.state.log.length-s.receipts.length+receipt.index-1,time:receipt.inspection.time,actor:receipt.actor,method:receipt.method,reading:copy(receipt.inspection)};}
    var checks=s.receipts.filter(function(receipt){return receipt.inspection&&receipt.inspection.kind==='sauce';}),latest=checks.length?metadata(checks[checks.length-1]):null,previous=checks.length>1?metadata(checks[checks.length-2]):null,between=null;
    if(previous&&latest){
      var span=s.receipts.filter(function(receipt){return receipt.index>previous.actionNumber&&receipt.index<latest.actionNumber;});
      var changes=root.KitchenSauceChanges||(typeof require==='function'?require('./recipe_lab_sauce_changes.js'):null),selection={fromIndex:previous.engineLogIndex,toIndex:latest.engineLogIndex};
      between={fromAction:previous.actionNumber,toAction:latest.actionNumber,actionCount:span.length,actions:span.map(function(receipt){return {actionNumber:receipt.index,kind:receipt.kind,action:receipt.action,time:receipt.after.time,actor:receipt.actor,method:receipt.method,durationSeconds:receipt.durationSeconds};}),changes:changes&&typeof changes.betweenChecks==='function'?copy(changes.betweenChecks(s.state,selection)):null,starch:changes&&typeof changes.starchBudget==='function'?copy(changes.starchBudget(s.state,selection)):null};
    }
    // Both pinned supplied dishes start with zero uptake and evaporation.
    // Use the first action's before-facts, not the earliest check: independent
    // learners may adjust the dish before they record their first observation.
    var budget={initialMl:finite(s.receipts.length?s.receipts[0].before.freeWaterMl:s.state.pan.moisture),savedAddedMl:0,plainAddedMl:0,tomatoAddedMl:0,absorbedMl:finite(s.state.pan.absorbedWaterMl),evaporatedMl:finite(s.state.pan.evaporatedWaterMl),currentMl:finite(s.state.pan.moisture),expectedMl:null,residualMl:null,complete:true,balanced:false};
    // Finishing begins after a supplied reduction; only later evaporation is
    // charged against this learner-attempt budget. Existing activities retain
    // their original zero-baseline totals and serialized output.
    if(s.activity==='finish-pasta-in-sauce')budget.evaporatedMl-=finishingEvaporatedAtStart;
    s.receipts.forEach(function(receipt){
      var key=receipt.action==='pour'?'savedAddedMl':receipt.action==='pourPlain'?'plainAddedMl':receipt.action==='crushTomato'?'tomatoAddedMl':null;if(!key)return;
      var amount=receipt.transfer&&finite(receipt.transfer.amount);if(amount===null||amount===undefined||amount<0){budget.complete=false;budget[key]=null;}else if(budget[key]!==null)budget[key]+=amount;
    });
    budget.complete=budget.complete&&[budget.initialMl,budget.savedAddedMl,budget.plainAddedMl,budget.tomatoAddedMl,budget.absorbedMl,budget.evaporatedMl,budget.currentMl].every(function(value){return value!==null&&Number.isFinite(value)&&value>=0;});
    if(budget.complete){budget.expectedMl=budget.initialMl+budget.savedAddedMl+budget.plainAddedMl+budget.tomatoAddedMl-budget.absorbedMl-budget.evaporatedMl;budget.residualMl=budget.currentMl-budget.expectedMl;budget.balanced=Math.abs(budget.residualMl)<=1e-7*Math.max(1,budget.initialMl,budget.currentMl);}
    return freeze({status:checks.length>1?'ready':checks.length?'needs-second-check':'needs-first-check',checkCount:checks.length,previous:previous,latest:latest,latestFresh:!!latest&&s.inspectionFresh,between:between,waterBudget:budget});
  }
  var api={protocol:1,protocols:freeze([1,2]),activity:ACTIVITY,activities:activities,getActivity:getActivity,weighing:weighing,drainage:drainage,browning:browning,covering:covering,strands:strands,cutting:cutting,spacing:spacing,rinsing:rinsing,panLoading:panLoading,finishing:finishing,holding:holding,thermalRescue:thermalRescue,sauceReview:sauceReview,limit:LIMIT,phases:freeze(phaseSets),create:create,canBegin:canBegin,begin:begin,beginDemonstration:beginDemonstration,step:step,advance:advance,commit:commit,cancel:cancel,demonstrateNext:demonstrateNext,rest:rest,heat:heat,createRecord:createRecord,restoreRecord:restoreRecord};
  root.KitchenAvatarStation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
