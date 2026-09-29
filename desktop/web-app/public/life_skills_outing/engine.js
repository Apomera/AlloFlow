/* Authored, deterministic outing rules shared by 3D and text controls. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AlloOutingEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var PREFIX='alloflow-life-outing:v1:',MISSION='home-outing',MAX_COMMANDS=200;
  var copy=function(v){return JSON.parse(JSON.stringify(v));};
  function freeze(v){if(v&&typeof v==='object'){Object.keys(v).forEach(function(k){freeze(v[k]);});Object.freeze(v);}return v;}
  function validId(v){return typeof v==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(v);}
  function uid(){return typeof globalThis!=='undefined'&&globalThis.crypto&&globalThis.crypto.randomUUID?globalThis.crypto.randomUUID():'outing-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);}
  function pick(v,allowed,label){if(allowed.indexOf(v)<0)throw Error('Invalid '+label+'.');return v;}
  function config(c,manifest){if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Missing mission settings.');return {context:pick(c.context,['community','work'],'context'),support:pick(c.support,['guided','try','independent'],'support'),language:pick(c.language,['plain','standard'],'language'),variation:pick(c.variation,manifest===2?['rain','warm','bus-delay']:['rain','warm'],'variation')};}
  function createRun(o){o=o||{};var id=o.runId===undefined?uid():o.runId;if(!validId(id))throw Error('Invalid outing ID.');return freeze({version:1,manifestVersion:2,missionId:MISSION,runId:id,config:config({context:o.context||'community',support:o.support||'guided',language:o.language||'plain',variation:o.variation||'rain'},2),commands:[],content:[],createdAt:new Date().toISOString()});}
  function card(c){return c.context==='work'?'orientation card':'booking card';}
  function clock(m){var t=540+m;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
  function start(c,manifest){return {config:c,manifestVersion:manifest,revision:0,minutes:0,deadline:35,prepCount:0,hints:0,bottleFilled:false,bottlePacked:false,clothingReady:false,documentPacked:false,weatherItem:null,weatherPackingUsed:false,weather:'cloudy',forecastUpdated:false,forecastChecked:false,busDelayed:false,route:null,departed:false,arrival:null,observations:[],event:null,feedback:'Explore the room and make a plan. You can prepare in any order.'};}
  function arrival(s,r){if(r==='walk')return s.minutes+18;if(r==='ride'&&s.manifestVersion===2)return s.minutes+15;if(r==='bus')return s.minutes<=20?(s.busDelayed?45:30):null;if(r==='late_bus')return s.minutes<=40?50:null;return null;}
  function item(s){return s.weather==='rain'?'raincoat':'hat';}
  function missing(s){var a=[];if(!s.clothingReady)a.push('ready clothes');if(!s.bottlePacked)a.push('a filled water bottle');if(!s.documentPacked)a.push('your '+card(s.config));if(!s.forecastUpdated||s.weatherItem!==item(s))a.push('an item for the updated forecast');if(!s.route)a.push('a travel plan');else if(arrival(s,s.route)===null||arrival(s,s.route)>s.deadline)a.push('a route that arrives by 09:35');return a;}
  function actions(s){
    if(s.departed)return [];
    function a(id,label,disabled,reason,station){return {id:id,label:label,disabled:!!disabled,reason:disabled?reason:'',station:station};}
    var result = [
      a('fill_water','Fill the water bottle · 1 min',s.bottleFilled,'The bottle is already filled.','kitchen'),
      a('pack_water','Pack the filled bottle · 1 min',!s.bottleFilled||s.bottlePacked,s.bottlePacked?'The bottle is in your bag.':'Fill the bottle before packing it.','kitchen'),
      a('wear_ready','Choose the clean, dry outfit · 2 min',s.clothingReady,'Your clothes are already ready.','wardrobe'),
      a('prepare_clothes','Finish drying the other outfit · 8 min',s.clothingReady,'Your clothes are already ready.','wardrobe'),
      a('inspect_forecast','Read the forecast note · 1 min',s.forecastChecked,'The latest forecast is shown in your mission facts.','entry'),
      a('pack_document','Pack the '+card(s.config)+' · 1 min',s.documentPacked,'Your card is already in your bag.','entry'),
      a('pack_raincoat',(s.weatherItem==='hat'?'Swap the hat for a raincoat':'Pack a raincoat')+(s.weatherPackingUsed?'':' · 1 min'),s.weatherItem==='raincoat','A raincoat is already in your bag.','entry'),
      a('pack_hat',(s.weatherItem==='raincoat'?'Swap the raincoat for a sun hat':'Pack a sun hat')+(s.weatherPackingUsed?'':' · 1 min'),s.weatherItem==='hat','A sun hat is already in your bag.','entry'),
      a('choose_walk','Walk · 18 min from departure',s.route==='walk','Walking is your current plan.','travel'),
      a('choose_bus','Take the 09:20 bus · arrives '+(s.busDelayed?'09:45 (delayed)':'09:30'),s.route==='bus','The 09:20 bus is your current plan.','travel'),
      a('choose_late_bus','Take the 09:40 bus · arrives 09:50',s.route==='late_bus','The 09:40 bus is your current plan.','travel'),
      a('depart','Leave for the outing',missing(s).length>0,'Before leaving: '+missing(s).join('; ')+'.','travel'),
      a('hint','Ask for a clue',false,'','support')];
    if(s.manifestVersion===2)result.splice(result.length-2,0,a('choose_ride','Use the arranged ride · 15 min',s.route==='ride','The arranged ride is your current plan.','travel'));
    return result;
  }
  function observe(s,skill,text){s.observations.push({skill:skill,text:text,support:s.config.support+(s.hints?' · requested clue':'')});}
  function updateForecast(s){if(s.forecastUpdated||s.prepCount<3)return;s.forecastUpdated=true;s.forecastChecked=false;s.weather=s.config.variation==='warm'?'warm':'rain';s.busDelayed=s.config.variation==='bus-delay';s.event={title:s.busDelayed?'Rain and a bus delay':'The forecast changed',body:'This fictional forecast now says '+(s.weather==='rain'?'rain':'warm sunshine')+' during your outing. Check the weather item in your bag.'+(s.busDelayed?' The 09:20 bus will now arrive at 09:45. Recheck your travel plan.':'')};}
  function step(s,id,allowEvents){var prep=false;
    switch(id){
      case 'fill_water':s.bottleFilled=true;s.minutes++;prep=true;s.feedback='The bottle is filled. It still needs to go in your bag.';break;
      case 'pack_water':s.bottlePacked=true;s.minutes++;prep=true;s.feedback='The filled bottle is in your bag.';observe(s,'Preparation sequence','Filled the bottle before packing it.');break;
      case 'wear_ready':case 'prepare_clothes':s.clothingReady=true;s.minutes+=id==='wear_ready'?2:8;prep=true;s.feedback='Your outfit is ready. This took '+(id==='wear_ready'?'2':'8')+' minutes.';observe(s,'Planning time','Prepared clothes using the '+(id==='wear_ready'?'2-minute':'8-minute')+' option.');break;
      case 'inspect_forecast':s.forecastChecked=true;s.minutes++;s.feedback=s.forecastUpdated?s.event.body:'The fictional forecast starts cloudy. An update may arrive while you prepare.';if(s.forecastUpdated)observe(s,'Checking information','Read the updated '+s.weather+' forecast.');break;
      case 'pack_document':s.documentPacked=true;s.minutes++;prep=true;s.feedback='Your '+card(s.config)+' is in your bag.';observe(s,'Remembering essentials','Packed the '+card(s.config)+' for this outing.');break;
      case 'pack_raincoat':case 'pack_hat':s.weatherItem=id==='pack_raincoat'?'raincoat':'hat';if(!s.weatherPackingUsed){s.minutes++;s.weatherPackingUsed=true;prep=true;}s.feedback='Your bag now contains a '+(s.weatherItem==='hat'?'sun hat':'raincoat')+'. '+(s.forecastUpdated?(s.weatherItem===item(s)?'It fits the updated forecast.':'Compare it with the updated forecast. You can swap it.'):'Recheck it if the forecast changes.');if(s.forecastUpdated&&s.weatherItem===item(s))observe(s,'Adapting a plan','Selected an item for the updated '+s.weather+' forecast.');break;
      case 'choose_walk':case 'choose_bus':case 'choose_late_bus':case 'choose_ride':s.route=id.slice(7);s.feedback='This route would arrive at '+clock(arrival(s,s.route))+'. '+(arrival(s,s.route)<=s.deadline?'It fits the 09:35 start. You can still change your plan.':'That is after the 09:35 start. Choose another route.');break;
      case 'depart':s.arrival=arrival(s,s.route);s.departed=true;s.feedback='You leave prepared and arrive at '+clock(s.arrival)+', before the 09:35 start.';observe(s,'Travel planning','Used '+(s.route==='walk'?'the 18-minute walking route':s.route==='ride'?'the arranged ride':'the 09:20 bus')+'; arrival '+clock(s.arrival)+' for a 09:35 start.');observe(s,'Checking the plan','Left with ready clothes, filled water, the correct card, and an item for the updated forecast.');break;
      case 'hint':s.hints++;s.feedback='A clue is available. You can use support throughout this practice.';break;
      default:throw Error('Unknown action.');
    }
    if(prep)s.prepCount++;if(allowEvents!==false)updateForecast(s);s.revision++;return s;
  }
  function shape(raw){
    if(!raw||raw.version!==1||[1,2].indexOf(raw.manifestVersion)<0||raw.missionId!==MISSION||!validId(raw.runId))throw Error('Unrecognized outing save or mission version.');
    if(typeof raw.createdAt!=='string'||raw.createdAt.length>40||!Number.isFinite(Date.parse(raw.createdAt)))throw Error('Invalid outing date.');
    if(!Array.isArray(raw.commands)||raw.commands.length>MAX_COMMANDS)throw Error('Invalid outing journal.');
    var seen=Object.create(null),commands=raw.commands.map(function(e,i){if(!e||!validId(e.id)||seen[e.id]||e.revision!==i||typeof e.actionId!=='string'||e.actionId.length>40)throw Error('Invalid or duplicate journal event.');seen[e.id]=true;return {id:e.id,actionId:e.actionId,revision:i};});
    if(!Array.isArray(raw.content)||raw.content.length>4)throw Error('Invalid saved narration.');
    var contentIds=Object.create(null),contentKinds=Object.create(null),content=raw.content.map(function(e){
      if(!e||!validId(e.id)||contentIds[e.id]||!Number.isInteger(e.revision)||e.revision<0||e.revision>commands.length||['intro','dialogue'].indexOf(e.kind)<0||['authored','generated','fallback'].indexOf(e.status)<0||typeof e.text!=='string'||!e.text.trim()||e.text.length>1200||(e.kind==='dialogue'&&['plan','change','help'].indexOf(e.intent)<0)||(e.kind==='intro'&&e.intent!==undefined))throw Error('Invalid saved narration entry.');
      var key=e.kind==='intro'?'intro':e.intent;if(contentKinds[key])throw Error('This narration has already been accepted.');contentKinds[key]=true;contentIds[e.id]=true;
      var result={id:e.id,revision:e.revision,kind:e.kind,text:e.text,status:e.status};if(e.kind==='dialogue')result.intent=e.intent;return result;
    });
    return {version:1,manifestVersion:raw.manifestVersion,missionId:MISSION,runId:raw.runId,config:config(raw.config,raw.manifestVersion),commands:commands,content:content,createdAt:raw.createdAt};
  }
  function replay(run){var s=start(run.config,run.manifestVersion);run.commands.forEach(function(e){var a=actions(s).filter(function(a){return a.id===e.actionId;})[0];if(!a||a.disabled)throw Error('Saved action is unavailable: '+e.actionId+'.');step(s,e.actionId);});return s;}
  function validateRun(raw){var run=shape(raw);replay(run);return freeze(run);}
  function materialize(raw){return freeze(replay(shape(raw)));}
  function dispatch(raw,id,revision,eventId){var run=validateRun(raw);if(revision===undefined)revision=run.commands.length;if(revision!==run.commands.length)throw Error('This decision has already been handled. Refresh the current choices.');if(run.commands.length>=MAX_COMMANDS)throw Error('This practice journal is full. Replay to start another outing.');eventId=eventId===undefined?uid():eventId;if(!validId(eventId)||run.commands.some(function(e){return e.id===eventId;}))throw Error('Invalid or duplicate event ID.');var a=actions(replay(run)).filter(function(a){return a.id===id;})[0];if(!a||a.disabled)throw Error(a&&a.reason||'That action is unavailable now.');var next=copy(run);next.commands.push({id:eventId,actionId:id,revision:run.commands.length});return validateRun(next);}
  function addContent(raw,entry){var run=validateRun(raw);if(!entry||entry.revision!==run.commands.length)throw Error('This narration belongs to an earlier decision.');var next=copy(run);next.content.push(copy(entry));return validateRun(next);}
  function hint(s){
    if(!s.clothingReady)return {notice:'Two outfits are available.',connect:'One is ready now; the other needs 8 minutes.',try:'Choose the clothes that fit your plan.'};
    if(!s.bottleFilled)return {notice:'The water bottle is empty.',connect:'A packed empty bottle will not give you water.',try:'Fill it before packing it.'};
    if(!s.bottlePacked)return {notice:'Your filled bottle is still on the counter.',connect:'You need to bring it with you.',try:'Put the filled bottle in your bag.'};
    if(!s.documentPacked)return {notice:'Your card is by the door.',connect:'It tells the host which activity you booked.',try:'Pack your '+card(s.config)+'.'};
    if(s.weatherItem!==item(s))return {notice:'The forecast now says '+s.weather+'.',connect:s.weather==='rain'?'A raincoat helps keep your clothes dry.':'A sun hat gives shade in warm sunshine.',try:'Check the weather item in your bag.'};
    if(!s.route||arrival(s,s.route)>s.deadline)return {notice:'The outing starts at 09:35.',connect:s.busDelayed?'The bus now arrives at 09:45. Walking takes 18 minutes; an arranged ride takes 15.':'Walking takes 18 minutes. The earlier bus arrives at 09:30.',try:'Choose a route that arrives by the start.'};
    return {notice:'Your preparation list is complete.',connect:'Your route arrives before 09:35.',try:'Check your bag and leave when you are ready.'};
  }
  function basicView(raw){
    var s=materialize(raw),c=s.config,all=actions(s),inventory=[];
    if(s.bottlePacked)inventory.push({id:'water',label:'Filled water bottle'});if(s.documentPacked)inventory.push({id:'document',label:card(c)});if(s.weatherItem)inventory.push({id:s.weatherItem,label:s.weatherItem==='hat'?'Sun hat':'Raincoat'});
    var facts=['This is a fictional practice outing. All times and forecasts belong to this mission.',c.language==='plain'?'Start: 09:35. Get there by then.':'Your '+(c.context==='work'?'work orientation':'community session')+' begins at 09:35.','Walking takes 18 minutes. The 09:20 bus arrives at 09:30. The 09:40 bus arrives at 09:50.','Bring filled water and your '+card(c)+'. Wear clean, dry clothes.',s.forecastUpdated?'Updated forecast: '+(s.weather==='rain'?'rain.':'warm sunshine.')+(c.support==='guided'?(s.weather==='rain'?' A raincoat helps keep clothes dry.':' A sun hat gives shade.'):''):'Starting forecast: cloudy. Watch for an update while you prepare.'];
    var objectives=[{id:'clothing',label:'Clothes ready',complete:s.clothingReady},{id:'water',label:'Filled water packed',complete:s.bottlePacked},{id:'document',label:'Outing card packed',complete:s.documentPacked},{id:'weather',label:'Packed for the updated forecast',complete:s.forecastUpdated&&s.weatherItem===item(s)},{id:'travel',label:'Route arrives by 09:35',complete:!!s.route&&arrival(s,s.route)!==null&&arrival(s,s.route)<=s.deadline},{id:'depart',label:'Leave prepared',complete:s.departed}];
    var stations=[['kitchen','Kitchen',c.support==='guided'?'Fill your bottle, then put it in your bag.':'Prepare water for the outing.'],['wardrobe','Wardrobe','Choose an outfit and compare preparation time.'],['entry','Doorway','Check the forecast and pack what you need.'],['travel','Travel plan','Compare arrival times and decide when to leave.']];
    return freeze({title:c.context==='work'?'Get ready for a work orientation':'Get ready for a community outing',intro:c.language==='plain'?'An outing starts at 09:35. Get ready at home, pack your bag, and choose how to get there. Time moves when you choose an action. Take as long as you need to read or use support.':'Prepare at home for a 09:35 outing. Compare preparation and travel times, check a changing forecast, and leave with what you need. Only chosen actions advance the practice clock; reading and support are untimed.',clock:clock(s.departed?s.arrival:s.minutes),goal:'Leave prepared and arrive by 09:35.',summary:s.departed?'Prepared and arrived at '+clock(s.arrival)+'.':objectives.filter(function(o){return o.complete;}).length+' of 6 preparation checks complete.',phase:s.departed?'complete':s.forecastUpdated?'adapt':'prepare',completed:s.departed,facts:facts,inventory:inventory,objectives:objectives,stations:stations.map(function(st){return {id:st[0],label:st[1],description:st[2],actions:all.filter(function(a){return a.station===st[0];}).map(function(a){return {id:a.id,label:a.label,disabled:a.disabled,reason:a.reason};})};}),event:s.event,feedback:s.feedback,observations:s.observations,scene:{bottleFilled:s.bottleFilled,bottlePacked:s.bottlePacked,clothingReady:s.clothingReady,documentPacked:s.documentPacked,weatherItemPacked:!!s.weatherItem,weather:s.weather,departed:s.departed},hint:hint(s)});
  }
  function inspectables(s) {
    function object(id,label,station,status,description,actionIds) {
      return {id:id,label:label,station:station,status:status,description:description,actionIds:actionIds};
    }
    return [
      object('bottle','Water bottle','kitchen',s.bottlePacked?'Filled and packed':s.bottleFilled?'Filled · on the counter':'Empty · on the counter','Fill the bottle before putting it in your bag. Check its location as well as what is inside.',['fill_water','pack_water']),
      object('outfit','Clothes','wardrobe',s.clothingReady?'Outfit ready':'Two outfits available','The clean, dry outfit takes 2 minutes to get ready. The other outfit needs 8 minutes of drying.',['wear_ready','prepare_clothes']),
      object('card',card(s.config),'entry',s.documentPacked?'In your bag':'On the bench','This card identifies your '+(s.config.context==='work'?'orientation':'booking')+'. Bring it to the outing.',['pack_document']),
      object('forecast','Weather note','entry',s.forecastUpdated?'Updated: '+(s.weather==='rain'?'rain':'warm sunshine'):'Cloudy · update expected',s.event?s.event.body:'A forecast update will arrive while you prepare. Recheck what you packed when it changes.',['inspect_forecast']),
      object('raincoat','Raincoat','entry',s.weatherItem==='raincoat'?'In your bag':'On the hook','A raincoat helps keep clothing dry. You can swap the weather item in your bag.',['pack_raincoat']),
      object('hat','Sun hat','entry',s.weatherItem==='hat'?'In your bag':'On the hook','A sun hat gives shade. Check the latest forecast when choosing what to pack.',['pack_hat']),
      object('bag','Your bag','entry',[s.bottlePacked,s.documentPacked,!!s.weatherItem].filter(Boolean).length+' of 3 items packed','Your bag has space for a filled bottle, your outing card, and one weather item.',['pack_water','pack_document','pack_raincoat','pack_hat']),
      object('route','Travel plan','travel',s.route?'Arrival: '+clock(arrival(s,s.route)):'Choose how to get there','The outing starts at 09:35. Check your arrival after preparation and after any travel update.',['choose_walk','choose_bus','choose_late_bus','choose_ride','depart'])
    ];
  }
  function history(raw) {
    var run=validateRun(raw);
    var s=start(run.config,run.manifestVersion),result=[];
    run.commands.forEach(function(command,index){
      var action=actions(s).filter(function(a){return a.id===command.actionId;})[0],before=s.minutes;
      step(s,command.actionId);
      result.push({revision:index+1,actionId:action.id,station:action.station,label:action.label,clock:clock(s.departed?s.arrival:s.minutes),minutes:s.minutes-before,consequence:s.feedback});
    });
    return freeze(result);
  }
  function previewAction(raw,id) {
    var run=validateRun(raw),before=replay(run),action=actions(before).find(function(candidate){return candidate.id===id;});
    if(!action||action.disabled||id==='hint')throw Error(action&&action.reason||'Choose an available practice action to rehearse.');
    var after=copy(before);step(after,id,false);
    function facts(s) {
      var result=[{id:'clock',label:'Practice clock',value:clock(s.departed?s.arrival:s.minutes)}];
      inspectables(s).filter(function(object){return object.id!=='route';}).forEach(function(object){result.push({id:object.id,label:object.label,value:object.status});});
      var route=s.route?({walk:'Walk',bus:'09:20 bus',late_bus:'09:40 bus',ride:'Arranged ride'})[s.route]+', arriving '+clock(arrival(s,s.route)):'No route selected';
      result.push({id:'route',label:'Travel plan',value:route});return result;
    }
    var original=facts(before),revised=facts(after),changes=[];
    original.forEach(function(fact,index){if(fact.value!==revised[index].value)changes.push({label:fact.label,before:fact.value,after:revised[index].value});});
    return freeze({actionId:id,label:action.label,revision:run.commands.length,changes:changes,feedback:after.feedback,forecastMayChange:!before.forecastUpdated});
  }
  function view(raw) {
    var result=copy(basicView(raw)),s=materialize(raw);
    result.scenarioLabel=({'rain':'Changing weather','warm':'Warm-weather outing','bus-delay':'Rain and a bus delay'})[s.config.variation];
    result.objects=inspectables(s);
    var routeIds=s.manifestVersion===2?['walk','bus','ride','late_bus']:['walk','bus','late_bus'];
    result.routes=routeIds.map(function(id){var at=arrival(s,id);return {id:id,label:({walk:'Walk',bus:'09:20 bus',ride:'Arranged ride',late_bus:'09:40 bus'})[id],arrival:at===null?'Unavailable':clock(at),onTime:at!==null&&at<=s.deadline,selected:s.route===id,minutesBeforeStart:at===null?null:s.deadline-at};});
    result.travel=result.routes.filter(function(route){return route.selected;})[0]||null;
    result.facts[2]='Walking takes 18 minutes. The 09:20 bus arrives at '+(s.busDelayed?'09:45 (delayed)':'09:30')+'. The 09:40 bus arrives at 09:50.'+(s.manifestVersion===2?' An arranged ride takes 15 minutes.':'');
    if(result.travel)result.facts.push('Current travel plan: '+result.travel.label+', arriving '+result.travel.arrival+'.');
    result.recent=history(raw).slice(-4).reverse();
    result.scene.busDelayed=s.busDelayed;
    return freeze(result);
  }
  function forkRun(raw,o){var r=validateRun(raw);o=o||{};if(o.runId===r.runId)throw Error('A replay needs a new outing ID.');return createRun({context:r.config.context,support:r.config.support,language:r.config.language,variation:o.variation||r.config.variation,runId:o.runId});}
  function copyRun(raw,o){var run=copy(validateRun(raw));o=o||{};var id=o.runId===undefined?uid():o.runId;if(!validId(id)||id===run.runId)throw Error('A copy needs a new outing ID.');run.runId=id;run.createdAt=new Date().toISOString();return validateRun(run);}
  // A retry uses the original rules and only the journal and prose at its starting point.
  function branchRun(raw,revision,o){var run=validateRun(raw);if(!Number.isInteger(revision)||revision<0||revision>=run.commands.length)throw Error('Choose an existing decision to retry.');var next=copy(copyRun(run,o));next.commands=next.commands.slice(0,revision);next.content=next.content.filter(function(entry){return entry.revision<=revision;});return validateRun(next);}
  function validateComparison(raw,value){
    var run=validateRun(raw);if(!value||!Number.isInteger(value.revision))throw Error('Invalid comparison starting point.');
    var original=validateRun(value.original),revision=value.revision;
    if(revision<0||revision>=original.commands.length||revision>run.commands.length||original.manifestVersion!==run.manifestVersion||JSON.stringify(original.config)!==JSON.stringify(run.config)||original.commands.slice(0,revision).some(function(command,i){return JSON.stringify(command)!==JSON.stringify(run.commands[i]);}))throw Error('These practices do not share the same starting point.');
    return freeze({original:original,revision:revision});
  }
  function planOptions(raw) {
    var run=validateRun(raw),s=replay(run),available=actions(s);
    return freeze(actions(start(run.config,run.manifestVersion)).filter(function(action){return action.id!=='hint';}).map(function(action){
      var current=available.find(function(candidate){return candidate.id===action.id;});
      return {id:action.id,label:current?current.label:action.label,station:action.station};
    }));
  }
  function validatePlan(raw,value) {
    var run=validateRun(raw),allowed=planOptions(run).map(function(action){return action.id;});
    if(!value||value.version!==1||!Array.isArray(value.steps)||value.steps.length>12)throw Error('A plan can have up to 12 steps.');
    var checkedAt=value.checkedAt===undefined?null:value.checkedAt;
    if(checkedAt!==null&&(!Number.isInteger(checkedAt)||checkedAt<0||checkedAt>run.commands.length))throw Error('Invalid plan check.');
    var seen=Object.create(null),steps=value.steps.map(function(entry){
      if(!entry||!validId(entry.id)||seen[entry.id]||allowed.indexOf(entry.actionId)<0||!Number.isInteger(entry.addedAt)||entry.addedAt<0||entry.addedAt>run.commands.length)throw Error('Invalid planned step.');
      seen[entry.id]=true;return {id:entry.id,actionId:entry.actionId,addedAt:entry.addedAt};
    });
    return freeze({version:1,steps:steps,checkedAt:checkedAt});
  }
  function planView(raw,value) {
    var run=validateRun(raw),plan=validatePlan(run,value===undefined||value===null?{version:1,steps:[]}:value),s=replay(run),projected=copy(s);
    var options=planOptions(run),used=Object.create(null),issues=0,hasDeparture=false;
    var rows=plan.steps.map(function(entry){
      var option=options.find(function(action){return action.id===entry.actionId;}),doneAt=null;
      run.commands.some(function(command,index){if(index>=entry.addedAt&&!used[index]&&command.actionId===entry.actionId){used[index]=true;doneAt=index+1;return true;}return false;});
      return {id:entry.id,actionId:entry.actionId,label:option.label,station:option.station,doneAt:doneAt,problem:''};
    });
    rows.forEach(function(row){
      if(row.doneAt!==null)return;
      if(projected.departed){row.problem='This comes after leaving. Move it before departure or remove it.';issues++;return;}
      var action=actions(projected).find(function(candidate){return candidate.id===row.actionId;});
      if(row.actionId==='depart'){
        hasDeparture=true;
        var needs=missing(projected);
        // An unread future update is uncertain, rather than a hidden answer to a planning question.
        if(!s.forecastUpdated){needs=needs.filter(function(need){return need!=='an item for the updated forecast';});if(!projected.weatherItem)needs.push('a weather item to recheck after the update');}
        if(needs.length){row.problem='Before leaving: '+needs.join('; ')+'.';issues++;}
        else {projected.arrival=arrival(projected,projected.route);projected.departed=true;}
      } else if(!action||action.disabled){row.problem=action?action.reason:'This action is unavailable.';issues++;}
      else step(projected,row.actionId,false);
    });
    var pending=rows.filter(function(row){return row.doneAt===null;}),next=pending[0]||null;
    var currentAction=next&&actions(s).find(function(action){return action.id===next.actionId;});
    var estimate=hasDeparture&&!issues&&projected.departed&&!s.departed?{preparationClock:clock(projected.minutes),arrivalClock:clock(projected.arrival),minutesBeforeStart:s.deadline-projected.arrival}:null;
    var message=!rows.length?'Add a few steps in the order you want to try.':s.departed?'Outing complete. The board shows which planned actions you took.':!pending.length?'You have tried every step on this board. Check the outing list before leaving.':issues?'Check '+issues+' planned '+(issues===1?'step':'steps')+' before trying this order.':estimate?'With the current information, you would finish preparing at '+estimate.preparationClock+' and arrive at '+estimate.arrivalClock+'.':'This order can be tried with the current information. Add a departure step to estimate arrival.';
    return freeze({steps:rows,next:next?{id:next.id,actionId:next.actionId,label:next.label,station:next.station,available:!!currentAction&&!currentAction.disabled,reason:currentAction&&currentAction.reason||''}:null,issues:issues,estimate:estimate,forecastMayChange:!s.forecastUpdated,message:message,completed:s.departed});
  }
  var BACKUP_FORMAT='alloflow-life-skills-practice';
  function createBackup(raw,reflection,comparison,plan){
    if(typeof reflection!=='string'||reflection.length>600)throw Error('A reflection must be text of up to 600 characters.');
    var run=validateRun(raw),result={format:BACKUP_FORMAT,version:1,run:run,reflection:reflection};
    if(comparison)result.comparison=validateComparison(run,comparison);
    if(plan!==undefined&&plan!==null)result.plan=validatePlan(run,plan);
    return freeze(result);
  }
  function readBackup(source){
    if(typeof source!=='string'||source.length>300000)throw Error('Choose a practice backup smaller than 300 KB.');
    var raw;try{raw=JSON.parse(source);}catch(_){throw Error('This file is not a readable practice backup.');}
    if(raw&&raw.format===BACKUP_FORMAT){if(raw.version!==1)throw Error('This backup version is not supported.');return createBackup(raw.run,raw.reflection,raw.comparison,raw.plan);}
    // The first prototype downloaded the run directly, without an envelope.
    return createBackup(raw,'');
  }
  function saveKey(r){if(!r||!validId(r.runId))throw Error('Invalid outing ID.');return PREFIX+r.runId;}
  function saveRun(storage,raw){var r;try{r=validateRun(raw);}catch(e){return {ok:false,message:e.message};}try{var key=saveKey(r),existing=storage.getItem(key);if(existing!==null){var old;try{old=validateRun(JSON.parse(existing));}catch(e){return {ok:false,message:'The existing saved outing needs recovery. It was left untouched. Download this outing to keep your work.'};}if(old.manifestVersion!==r.manifestVersion||old.runId!==r.runId||old.createdAt!==r.createdAt||JSON.stringify(old.config)!==JSON.stringify(r.config)||old.commands.some(function(e,i){return JSON.stringify(e)!==JSON.stringify(r.commands[i]);})||old.content.some(function(e,i){return JSON.stringify(e)!==JSON.stringify(r.content[i]);}))return {ok:false,message:'Another version of this outing is already saved. It was left untouched. Download this outing before reopening the saved version.'};}storage.setItem(key,JSON.stringify(r));return {ok:true,key:key};}catch(e){return {ok:false,message:'This browser could not save your outing. Keep this page open and download it to keep your work.'};}}
  function readRun(storage,key){if(typeof key!=='string'||key.indexOf(PREFIX)!==0)throw Error('Only Life Skills outing saves can be opened here.');var text=storage.getItem(key);if(!text||text.length>100000)throw Error('This outing save cannot be read. Original data was retained.');var r=validateRun(JSON.parse(text));if(saveKey(r)!==key)throw Error('The outing ID does not match its storage key.');return r;}
  function listRuns(storage){var result=[];for(var i=0;i<storage.length;i++){var key=storage.key(i);if(typeof key!=='string'||key.indexOf(PREFIX)!==0)continue;try{result.push({key:key,run:readRun(storage,key)});}catch(e){result.push({key:key,error:'Saved outing needs recovery; original data retained.'});}}return result.sort(function(a,b){return ((b.run&&b.run.createdAt)||'').localeCompare((a.run&&a.run.createdAt)||'');});}
  return freeze({PREFIX:PREFIX,createRun:createRun,validateRun:validateRun,materialize:materialize,view:view,history:history,previewAction:previewAction,dispatch:dispatch,forkRun:forkRun,branchRun:branchRun,copyRun:copyRun,validateComparison:validateComparison,planOptions:planOptions,validatePlan:validatePlan,planView:planView,createBackup:createBackup,readBackup:readBackup,saveRun:saveRun,listRuns:listRuns,readRun:readRun,saveKey:saveKey,addContent:addContent});
});
