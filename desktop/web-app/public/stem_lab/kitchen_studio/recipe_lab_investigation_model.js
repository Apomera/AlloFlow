/* A controlled, illustrative sauce investigation. Protocol 1 pins the existing
   cooking models and normalizes BOTH provided liquids to 80 C. These normalized
   arms are a separate activity, not ordinary recipe saves or calibrated rheology.
   Replay rebuilds the prescribed experiment from its versioned configuration;
   it never passes normalized states through KitchenRecipes.restore. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var flags=Object.freeze({thermalModel:3,mixingModel:2,sauceObservationModel:2,sauceModel:3,panModel:2,pieceModel:1,dryingModel:1,pastaModel:1,tomatoModel:1});
  var defaults=Object.freeze({doseMl:60,folds:2,waitSeconds:0}),predictions=['plain','reduced','same','unsure'];
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  function equal(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b));}
  function integer(value,min,max,step,name){if(!Number.isInteger(value)||value<min||value>max||value%step)throw new RangeError(name+' is outside this investigation protocol.');return value;}
  function configuration(value){
    if(value===undefined)value={};if(!object(value))throw new TypeError('Investigation configuration must be an object.');
    return {doseMl:integer(value.doseMl===undefined?defaults.doseMl:value.doseMl,10,100,10,'doseMl'),
      folds:integer(value.folds===undefined?defaults.folds:value.folds,0,4,1,'folds'),
      waitSeconds:integer(value.waitSeconds===undefined?defaults.waitSeconds:value.waitSeconds,0,120,15,'waitSeconds')};
  }
  function baseline(){
    if(!R||['startRescue','ingredients','act','mixing'].some(function(key){return typeof R[key]!=='function';}))throw new Error('The cooking engine is unavailable.');
    var s=R.startRescue('starchy',0,'practice'),n=s&&s.pan,p=s&&s.pot,amount=s&&R.ingredients(s);
    var known=s&&n&&p&&s.prep&&n.chemistry&&n.pendingLiquid&&Array.isArray(n.pieces)&&Array.isArray(s.log)&&amount&&Object.keys(flags).every(function(key){return s[key]===flags[key];})&&s.id==='mushroom'&&s.servings===2&&s.mode==='practice'&&s.time===0&&s.log.length===0&&!s.plated&&!s.submitted&&
      s.prep.pasta===160&&amount.pasta===160&&amount.produce===200&&amount.oil===15&&amount.garlic===2&&amount.water===1200&&n.temp===90&&n.moisture===45&&n.heat===0&&p.heat===0&&(n.placement||'burner')==='burner'&&n.size==='standard'&&
      n.combined&&n.produce&&n.garlic&&n.oil&&n.damage===0&&n.brown===1&&n.absorbedWaterMl===0&&n.evaporatedWaterMl===0&&
      n.chemistry.oilMl===15&&n.chemistry.starchG===3&&n.chemistry.dispersion===.9&&
      n.pendingLiquid.savedWaterMl===0&&n.pendingLiquid.plainWaterMl===0&&n.pendingLiquid.tomatoJuiceMl===0&&
      p.pasta&&p.drained&&p.progress===.9&&p.water===0&&p.starchG===0&&p.surfaceStarchG===0&&p.reserve===150&&p.reserveStarchG===6&&p.plainWater===250&&
      n.pieces.length===14&&n.pieces.every(function(piece){return piece&&piece.width===5&&Array.isArray(piece.faces)&&piece.faces.length===2&&Array.isArray(piece.damage)&&piece.damage.length===2&&piece.faces.every(function(v){return v===1;})&&piece.damage.every(function(v){return v===0;});});
    if(!known)throw new Error('This engine or supplied dish no longer matches sauce investigation protocol 1.');
    // Check defaults first, then explicitly pin the protocol. A future engine
    // change must introduce a supported study protocol instead of silently replaying differently.
    Object.assign(s,flags);p.reserveTemp=80;p.plainTemp=80;return s;
  }
  function arm(id,config){
    var state=baseline(),stages=[];
    function stage(stageId,label){
      state=R.act(state,'taste');var last=state.log[state.log.length-1];
      if(!last||!last.accepted||!last.inspection)throw new Error('A prescribed investigation check was not accepted.');
      stages.push({id:stageId,label:label,state:clone(state),reading:clone(last.inspection)});
    }
    function act(action,value){state=R.act(state,action,value);var last=state.log[state.log.length-1];if(!last||!last.accepted||last.action!==action)throw new Error('A prescribed investigation action was not accepted.');}
    stage('baseline','Before the addition');act(id==='plain'?'pourPlain':'pour',config.doseMl);stage('poured','After the measured addition');
    for(var fold=1;fold<=config.folds;fold++){act('stirPan');stage('fold-'+fold,'After fold '+fold);}
    if(config.waitSeconds){var remaining=config.waitSeconds;while(remaining){var seconds=Math.min(60,remaining);act('advance',seconds);remaining-=seconds;}stage('rested','After the matched pause');}
    return {id:id,label:id==='plain'?'Plain warm water':'Reduced cooking water',source:{temperature:80,starchGPer100Ml:id==='plain'?0:4},stages:stages};
  }
  function validity(arms,config){
    var a=arms[0],b=arms[1],checks=[];
    function add(label,condition,detail){checks.push({label:label,equal:!!condition,detail:detail});}
    function everyPair(test){return a.stages.length===b.stages.length&&a.stages.every(function(stage,index){return test(stage,b.stages[index]);});}
    function pour(arm){return arm.stages[1].state.log.find(function(e){return e.accepted&&(e.action==='pour'||e.action==='pourPlain');});}
    var ap=pour(a),bp=pour(b);
    add('Identical starting dishes',JSON.stringify(a.stages[0].state)===JSON.stringify(b.stages[0].state),'Both arms begin with the same prepared mushroom pasta, free water, starch and oil.');
    add('Equal liquid dose',equal(ap.transfer.amount,config.doseMl)&&equal(bp.transfer.amount,config.doseMl),config.doseMl+' mL is added to each dish.');
    add('Equal source temperature',ap.transfer.sourceTemperature===80&&bp.transfer.sourceTemperature===80,'Both provided liquids begin at 80°C.');
    add('Equal stage timing',everyPair(function(x,y){return x.id===y.id&&equal(x.state.time,y.state.time);}),config.folds+' matched six-second folds and '+config.waitSeconds+' seconds of additional waiting.');
    add('Prescribed fold duration',arms.every(function(arm){var final=arm.stages[arm.stages.length-1].state,mixes=final.log.filter(function(entry){return entry.accepted&&entry.action==='stirPan';});return mixes.length===config.folds&&mixes.every(function(entry){return entry.durationSeconds===6;})&&equal(final.time,config.folds*6+config.waitSeconds);}), 'Each completed fold lasts six simulated seconds; observation adds no cooking time.');
    add('Equal burner and pan conditions',arms.every(function(arm){return arm.stages.every(function(stage){var s=stage.state;return s.pan.heat===0&&s.pot.heat===0&&(s.pan.placement||'burner')==='burner'&&s.pan.size==='standard';});}),'Both burners stay off; both dishes use the same pan conditions.');
    add('Equal free-water history',everyPair(function(x,y){return equal(x.state.pan.moisture,y.state.pan.moisture)&&equal(x.state.pan.absorbedWaterMl,y.state.pan.absorbedWaterMl)&&equal(x.state.pan.evaporatedWaterMl,y.state.pan.evaporatedWaterMl);}),'Free water, pasta uptake and evaporation match at every recorded stage.');
    add('Equal temperature history',everyPair(function(x,y){return equal(x.state.pan.temp,y.state.pan.temp);}), 'The modeled pan-temperature histories match at each check.');
    add('Known starch difference',equal(ap.transfer.starchG,0)&&equal(bp.transfer.starchG,config.doseMl*.04),'Plain water adds no starch; reduced cooking water carries 4 g starch per 100 mL.');
    add('Water conserved',arms.every(function(arm){return arm.stages.every(function(stage,index){var n=stage.state.pan,expected=45+(index?config.doseMl:0)-n.absorbedWaterMl-n.evaporatedWaterMl,pending=R.mixing(stage.state).pending.totalMl;return equal(n.moisture,expected)&&pending>=0&&pending<=n.moisture+1e-7;});}),'Pasta uptake remains in the dish; evaporation leaves it. Pending liquid is already included in free water.');
    add('Starch and oil conserved',arms.every(function(arm){return arm.stages.every(function(stage,index){var c=stage.state.pan.chemistry;return equal(c.starchG,3+(index&&arm.id==='reduced'?config.doseMl*.04:0))&&equal(c.oilMl,15);});}),'Only the reduced-water addition changes starch mass; neither arm removes starch or oil.');
    return {valid:checks.every(function(check){return check.equal;}),checks:checks};
  }
  function run(value){
    var config=configuration(value),arms=[arm('plain',config),arm('reduced',config)];
    return {protocol:1,activity:'liquid-choice',configuration:config,
      setup:{initialPanTemperature:90,sourceTemperature:80,burner:0,servings:2,startingFreeWaterMl:45,startingStarchG:3,modelFlags:clone(flags),limitations:[
        'This is an illustrative controlled model, not a measured viscosity experiment.',
        'The model does not give added starch a separate heat capacity or model liquid density.',
        'When liquid still pools separately, concentration is a bulk average rather than a uniform local coating.',
        'Equal water doses can lead to the same body label; compare the recorded quantities as well as the spoon.']},arms:arms,validity:validity(arms,config)};
  }
  function createRecord(value){
    if(value===undefined)value={};if(!object(value))throw new TypeError('Investigation record must be an object.');
    var config=configuration(value),prediction=value.prediction===undefined?'unsure':value.prediction,reflection=value.reflection===undefined?'':value.reflection;
    if(predictions.indexOf(prediction)<0)throw new RangeError('Prediction must be plain, reduced, same or unsure.');
    if(typeof reflection!=='string'||reflection.length>2000)throw new RangeError('Reflection must be a string of at most 2000 characters.');
    return {protocol:1,activity:'liquid-choice',configuration:config,prediction:prediction,reflection:reflection};
  }
  function restoreRecord(value){
    if(!object(value)||value.protocol!==1||value.activity!=='liquid-choice'||!object(value.configuration)||!Object.keys(defaults).every(function(key){return Object.prototype.hasOwnProperty.call(value.configuration,key);})||!Object.prototype.hasOwnProperty.call(value,'prediction')||!Object.prototype.hasOwnProperty.call(value,'reflection'))return null;
    try{var record=createRecord(Object.assign({},value.configuration,{prediction:value.prediction,reflection:value.reflection}));return {record:record,investigation:run(record.configuration)};}catch(error){return null;}
  }
  var api={protocol:1,activity:'liquid-choice',defaults:defaults,run:run,createRecord:createRecord,restoreRecord:restoreRecord};
  root.KitchenSauceScienceBench=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
