/* Public surface cues and accepted checks, beside the learner's shared clock.
   This model reads the displayed cook; it never cooks, checks, or sets reminders. */
(function(root){
  'use strict';
  function dependency(name,file){return root[name]||(typeof require==='function'?require('./'+file):null);}
  var R=dependency('KitchenRecipes','recipe_lab_engine.js'),Cooking=dependency('KitchenCooking','recipe_lab_cooking.js'),Sampling=dependency('KitchenSampling','recipe_lab_sampling.js'),Sauce=dependency('KitchenSauceCheck','recipe_lab_sauce_check.js'),Thermometer=dependency('KitchenThermometer','recipe_lab_thermometer.js'),Lid=dependency('KitchenLid','recipe_lab_lid.js'),Lens=dependency('KitchenFoodLens','recipe_lab_lens.js'),Clock=dependency('KitchenRecipeClock','recipe_lab_clock.js');
  function stamp(value){var n=Math.max(0,Math.floor(value));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
  function valid(s){return !!s&&!!s.pot&&!!s.pan&&!!s.prep&&Array.isArray(s.log)&&Number.isFinite(s.time)&&s.time>=0&&[s.pot.temp,s.pot.water,s.pan.temp].every(Number.isFinite)&&s.pot.water>=0&&[s.pot.heat,s.pan.heat].every(function(n){return Number.isInteger(n)&&n>=0&&n<=3;})&&(s.servings===2||s.servings===4);}
  function check(reading){return reading?{kind:reading.kind,time:reading.time,label:reading.label,observation:reading.observation,stale:!!reading.stale}:null;}
  function reminder(s,options,station){
    if(options.historical===true)return {status:'recorded',text:'Live check reminders are hidden in replay.',dueAt:null,remaining:null};
    var t=Clock.restore(options.checkTimers,s.time)[station];
    if(!t)return {status:'none',text:'No check reminder set.',dueAt:null,remaining:null};
    var remaining=Math.max(0,t.dueAt-s.time),elapsed=t.status==='elapsed';
    return {status:elapsed?'elapsed':'waiting',text:elapsed?'Your chosen check time has arrived. Inspect before deciding.':'Check again in '+stamp(Math.ceil(remaining))+' · at '+stamp(t.dueAt)+' simulated time.',dueAt:t.dueAt,remaining:remaining};
  }
  function route(tool,view,label,detail,available,locked,lockDetail){return {tool:tool,view:view,label:label,enabled:!locked&&available.ready,detail:locked?lockDetail:available.ready?detail:available.detail};}
  function potRoute(s,locked,lockDetail){
    var p=s.pot;
    if(p.lid==='covered')return route('lid','lid','Lift lid first','Open lid controls. Lift, carry and lower the lid onto its rest before reaching the water. Opening controls records no new check.',Lid.available(s,false),locked,lockDetail);
    if(p.pasta&&!p.drained)return route('sample','sample','Check pasta','Open the fork sample tool. Carry, press down, lift back and release, or complete its equivalent check. Opening the tool records no sample.',Sampling.available(s,false),locked,lockDetail);
    if(p.water>0&&!p.drained)return route('probe','probe','Check water','Open the water thermometer. Lower its probe into the water, lift back and release, or complete its equivalent check. Opening the tool takes no temperature reading.',Thermometer.available(s,false),locked,lockDetail);
    return route('camera','pot','Look at pot',p.drained?'Explore the drained pot. A camera view records no texture or temperature check.':'Explore the pot before filling it. A camera view records no texture or temperature check.',{ready:true},locked,lockDetail);
  }
  function panRoute(s,locked,lockDetail){
    if(s.pan.produce&&s.panModel===2){
      if(s.pan.combined)return route('sauce-check','sauce-check','Check coating','Open the spoon trail tool. Draw steadily through the sauce and release, or complete its equivalent check. Opening the tool records no coating check.',Sauce.available(s,false),locked,lockDetail);
      return route('inspect','inspect','Inspect food','Open the Food lens. Sweep across visible food and release on a piece to keep or compare a view. Opening the lens keeps no view and records no coating check.',{ready:Lens.available(s),detail:'No individual food view is available. Explore the pan with the camera.'},locked,lockDetail);
    }
    return route('camera','pan','Look at pan',s.panModel!==2?'Explore this cook\'s whole-pan view. A camera view records no coating check.':'Explore the pan surface. A camera view records no coating check.',{ready:true},locked,lockDetail);
  }
  function describe(s,options){
    if(!valid(s))return null;options=options||{};
    var historical=options.historical===true,portion=R.serving(s),ended=options.ended===true||!!s.plated||!!s.submitted||s.time>=3600||s.log.length>=1200,locked=historical||ended||portion.started,mode=historical?'recorded':ended?'finished':portion.started?'serving':'live';
    var lockDetail=historical?'Recorded kitchen. Opening a new inspection tool is locked.':ended?'Finished or limited cook. Opening a new inspection tool is locked.':'Serving is in progress. Return every spoonful to the pan before opening an inspection tool.';
    var surfaces=Cooking.describe(s),warnings=R.monitor(s),position=R.panPosition(s),potCheck=check(Sampling.reading(s)),panCheck=check(Sauce.reading(s)),potReminder=reminder(s,options,'pot'),panReminder=reminder(s,options,'pan');
    function attention(station,r){var warning=warnings.find(function(c){return c.zone===station&&c.level==='attention';});return warning?warning.text:r.status==='elapsed'?r.text:'';}
    var potAttention=attention('pot',potReminder),panAttention=attention('pan',panReminder),heat=['off','low','medium','high'];
    var potContext=(s.pot.water>0&&!s.pot.drained?Math.round(s.pot.temp)+'°C modeled water':'No cooking water')+' · Lid '+(s.pot.lid==='covered'?'covered':'on rest')+' · Burner '+heat[s.pot.heat]+'.';
    var panContext=Math.round(s.pan.temp)+'°C modeled pan · '+(position.site==='trivet'?'On trivet; no burner input':'On burner')+' · Pan burner '+heat[s.pan.heat]+'.';
    var potText=potCheck?'Last fork check · '+stamp(potCheck.time)+' · '+potCheck.label+'. '+(potCheck.stale?'The food changed since this check.':'This is a recorded sample, not live texture.'):s.rescue?'Provided rescue pasta; no learner fork sample recorded.':'No fork sample checked. Texture is revealed by a sample.';
    var panText=panCheck?'Last coating check · '+stamp(panCheck.time)+' · '+panCheck.label+'. '+(panCheck.stale?'The dish changed since this check.':'This is a recorded coating observation.'):'No coating check recorded.';
    return {mode:mode,time:s.time,summary:historical?'Recorded kitchen at '+stamp(s.time)+'. Live reminders are hidden.':ended?'Cook at '+stamp(s.time)+'. New inspection tools are locked.':portion.started?'Serving is in progress. Return every spoonful to resume cooking.':'Both vessels share simulated time. Looking records no check.',
      pot:{name:'Pasta pot',cue:surfaces.pot.note,context:potContext,visual:{kind:'pot',water:surfaces.pot.wet,covered:s.pot.lid==='covered',bubbles:surfaces.pot.activity===1?'rolling':surfaces.pot.activity>0?'edge':'still',pasta:!!s.pot.pasta&&!s.pot.drained&&!s.plated,drained:!!s.pot.drained},lastCheck:potCheck,checkText:potText,reminder:potReminder,attention:!!potAttention,attentionText:potAttention,route:potRoute(s,locked,lockDetail)},
      pan:{name:'Sauce pan',cue:surfaces.pan.note,context:panContext,visual:{kind:'pan',food:surfaces.pan.visible,recipe:s.id==='tomato'?'tomato':'mushroom',surface:surfaces.pan.type,site:position.site,steam:surfaces.pan.steam>0},lastCheck:panCheck,checkText:panText,reminder:panReminder,attention:!!panAttention,attentionText:panAttention,route:panRoute(s,locked,lockDetail)}};
  }
  var api={describe:describe};root.KitchenVesselWatch=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
