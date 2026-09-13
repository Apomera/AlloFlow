/* Educational recipe model: deterministic heat, moisture, texture, and two-vessel timing.
   Coefficients are illustrative, not calibrated predictions of a real stove or recipe. */
(function(root){
  'use strict';
  var recipes=[
    {id:'mushroom',title:'Golden mushroom pasta',produce:'mushrooms',grams:200,description:'Brown sliced mushrooms, soften garlic, and finish pasta with its starchy cooking water.',question:'Why can a crowded, wet pan delay mushroom browning?',answers:['The released water keeps the cooking surface wet.','Mushrooms cannot brown unless the burner is on high.','Stirring removes all of the heat.'],correct:0},
    {id:'tomato',title:'Tomato & garlic pasta',produce:'tomatoes',grams:300,description:'Soften chopped tomatoes into a sauce while a separate pot cooks the pasta.',question:'Why lower the pan heat once the tomatoes release their juices?',answers:['Lower heat stops every ingredient from cooking.','A controlled simmer reduces the sauce with less risk of scorching.','The water must stay in the sauce forever.'],correct:1}
  ];
  var actions=[['wash','Wash hands with soap'],['rinse','Rinse the produce'],['cut','Slice / chop evenly'],['dry','Pat produce dry'],['garlicPrep','Mince the garlic'],['measure','Weigh dry pasta'],['fill','Fill the pasta pot'],['oil','Add measured olive oil'],['produce','Add prepared produce'],['garlic','Add minced garlic'],['stirPan','Stir the pan'],['pasta','Add pasta to boiling water'],['stirPot','Stir the pasta'],['sample','Check a pasta sample'],['reserve','Reserve cooking water'],['drain','Drain the pasta'],['water','Add 50 mL reserved water'],['combine','Add drained pasta & toss'],['taste','Check sauce consistency'],['plate','Plate the finished dish']];
  function recipe(id){return recipes.find(function(r){return r.id===id;})||recipes[0];}
  function ingredients(s){var r=recipe(s.id),factor=s.servings/2;return {pasta:160*factor,produce:r.grams*factor,oil:15*factor,garlic:2*factor,water:1200*factor};}
  function start(id,servings,mode){return {version:1,id:recipe(id).id,servings:servings===4?4:2,mode:mode==='demonstrate'?'demonstrate':'practice',time:0,log:[],hints:0,plan:'',reflection:'',answers:[null,null],submitted:false,plated:false,feedback:'Prepare your ingredients, then coordinate the pot and pan.',prep:{hands:false,rinsed:false,cut:false,dry:false,garlic:false,pasta:0},pot:{heat:0,temp:22,water:0,pasta:false,progress:0,stirred:false,reserve:0,drained:false,sample:null},pan:{heat:0,temp:22,size:'standard',oil:false,produce:false,garlic:false,moisture:0,brown:0,soft:0,damage:0,lastStir:0,waterAdded:0,combined:false,tasted:false}};}
  function copy(s){return Object.assign({},s,{prep:Object.assign({},s.prep),pot:Object.assign({},s.pot),pan:Object.assign({},s.pan),log:s.log.slice(),answers:s.answers.slice()});}
  function pastaTexture(progress){return progress<.6?'Hard center':progress<.9?'Still firm':progress<=1.2?'Tender with a slight bite':progress<=1.45?'Soft':'Overcooked';}
  function sauce(s){var p=s.pan;if(p.damage>=1)return 'Scorched';if(!p.produce)return p.garlic?'Garlic in the pan':p.oil?'Oil in the pan':'Not started';if(s.id==='mushroom'&&p.brown<.7)return p.moisture>10?'Releasing moisture':'Developing color';if(s.id==='tomato'&&p.soft<.85)return 'Tomatoes still firm';if(p.moisture>180*s.servings/2)return 'Loose and watery';if(p.moisture<20)return 'Dry; needs a splash';return s.id==='mushroom'?'Golden, glossy mushrooms':'Soft, coating tomato sauce';}
  function inspect(s){var p=s.pot,n=s.pan;return {pot:p.drained?'Pasta drained':!p.water?'Empty pot':!p.pasta?(p.temp>=96?'Boiling water':p.temp>=80?'Near a simmer':'Water heating'):'Pasta cooking',pasta:p.pasta?pastaTexture(p.progress):'Not in the pot',pan:sauce(s),crowded:n.produce&&ingredients(s).produce>(n.size==='wide'?650:300),burned:n.damage>=1};}
  function advance(s,seconds){
    var remaining=seconds,p=s.pot,n=s.pan,r=recipe(s.id),amount=ingredients(s);
    while(remaining>0){var dt=Math.min(1,remaining);remaining-=dt;s.time+=dt;
      var potTarget=[22,85,112,155][p.heat],potMass=Math.max(1,p.water/1200);
      p.temp+=(potTarget-p.temp)*(1-Math.exp(-(p.heat?.009:.0025)*dt/potMass));
      if(p.water>0)p.temp=Math.min(100,p.temp);
      if(p.water>0&&p.temp>96){p.water=Math.max(0,p.water-dt*.12*p.heat);}
      if(p.pasta&&!p.drained&&p.water>0)p.progress+=dt*Math.max(0,Math.min(1,(p.temp-75)/25))/480;
      var target=[22,112,185,270][n.heat];
      if(n.produce&&n.moisture>10)target=Math.min(target,108);
      n.temp+=(target-n.temp)*(1-Math.exp(-(n.heat?.018:.0035)*dt/(n.size==='wide'?1.25:1)));
      if(n.produce&&!s.plated){
        var heat=Math.max(0,(n.temp-70)/35),crowding=amount.produce>(n.size==='wide'?650:300)?.55:1;
        n.moisture=Math.max(0,n.moisture-dt*.35*heat*crowding);
        if(s.id==='tomato')n.soft+=dt*Math.max(0,Math.min(1,(n.temp-65)/35))/260;
        if(s.id==='mushroom'&&n.moisture<12&&n.temp>120)n.brown+=dt*(n.temp-120)/4200*crowding;
        var unattended=s.time-n.lastStir>90?1.7:1;
        if(n.moisture<8&&n.temp>200)n.damage+=dt*(n.temp-200)/6000*unattended;
        if(n.garlic&&n.moisture<8&&n.temp>175)n.damage+=dt*(n.temp-175)/11000*unattended;
        if(n.brown>1.9&&n.temp>120)n.damage+=dt*.006;
      }
      if(n.garlic&&!n.produce&&n.temp>175)n.damage+=dt*(n.temp-175)/6000;
      if(n.combined&&!s.plated&&n.temp>70){p.progress+=dt*Math.min(1,(n.temp-70)/40)/650;}
    }
  }
  function act(original,action,value){
    if(original.plated||original.submitted||original.log.length>=1200||original.time>=3600)return original;
    if(!actions.some(function(a){return a[0]===action;})&&['potHeat','panHeat','panSize','advance'].indexOf(action)<0)return original;
    if((action==='potHeat'||action==='panHeat')&&(!Number.isInteger(value)||value<0||value>3))return original;
    if(action==='measure'&&(!Number.isInteger(value)||value<40||value>800||value%40))return original;
    if(action==='advance'&&(!Number.isFinite(value)||value<=0||value>60))return original;
    if(action==='panSize'&&value!=='wide'&&value!=='standard')return original;
    var s=copy(original),p=s.pot,n=s.pan,v=s.prep,q=ingredients(s),ok=true,message='';
    function reject(text){ok=false;message=text;}
    if(action==='wash'){v.hands=true;message='Soap-and-water handwashing completed for at least 20 seconds in this model.';}
    if(action==='rinse'){v.rinsed=true;message='Produce rinsed under running water.';}
    if(action==='cut'){if(!v.hands||!v.rinsed)reject('Wash hands and rinse the produce before cutting.');else{v.cut=true;message='Produce prepared in even pieces on a clean, stable board.';}}
    if(action==='dry'){if(n.produce)reject('Dry the produce before adding it to the pan.');else{v.dry=true;message='Excess surface water removed.';}}
    if(action==='garlicPrep'){if(!v.hands)reject('Wash hands before preparing the garlic.');else{v.garlic=true;message='Garlic peeled and minced.';}}
    if(action==='measure'){if(p.pasta)reject('The pasta is already cooking; weighing cannot change this batch.');else{v.pasta=value;message='Measured '+value+' g of dry pasta. The recipe calls for '+q.pasta+' g.';}}
    if(action==='fill'){if(p.pasta||p.drained)reject('The pot is already in use for this batch.');else{p.water=q.water;p.temp=22;message='Pot filled with '+q.water+' mL of fresh water.';}}
    if(action==='potHeat'){p.heat=value;message='Pot burner '+['off','low','medium','high'][value]+'. The water temperature changes gradually.';}
    if(action==='panHeat'){n.heat=value;message='Pan burner '+['off','low','medium','high'][value]+'. The pan retains heat after you turn it down.';}
    if(action==='panSize'){if(n.oil||n.produce)reject('Choose the pan size before adding ingredients.');else{n.size=value;message=value==='wide'?'Wide pan selected for more space.':'Standard pan selected.';}}
    if(action==='oil'){if(n.oil)reject('The measured oil is already in the pan.');else{n.oil=true;message=q.oil+' mL olive oil added.';}}
    if(action==='produce'){if(n.produce)reject('The produce is already in the pan.');else if(!v.cut||!v.hands||!n.oil)reject('Prepare the produce and add the measured oil first.');else{n.produce=true;n.moisture=(s.id==='mushroom'?(v.dry?35:65):250)*s.servings/2;n.temp=Math.max(22,n.temp-25);n.lastStir=s.time;message='Produce added. Its moisture and mass affect the pan temperature.';}}
    if(action==='garlic'){if(n.garlic)reject('The garlic is already in the pan.');else if(!v.garlic||!n.oil)reject('Mince the garlic and add oil before putting garlic in the pan.');else{n.garlic=true;message='Garlic added. Watch its color as the pan heats.';}}
    if(action==='stirPan'){if(!n.produce)reject('Add produce before stirring the pan.');else{n.lastStir=s.time;message='Pan stirred to redistribute the pieces and sauce.';}}
    if(action==='pasta'){if(p.pasta||p.drained)reject('This batch of pasta has already been added.');else if(v.pasta<=0||p.water<500||p.temp<96)reject('Weigh pasta and bring a filled pot to a boil before adding it for this recipe.');else{p.pasta=true;p.temp=Math.max(22,p.temp-10*v.pasta/160);message='Pasta added. The cooler pasta briefly lowers the water temperature.';}}
    if(action==='stirPot'){if(!p.pasta||p.drained)reject('Stir while the pasta is in the water.');else{p.stirred=true;message='Pasta stirred to separate the pieces.';}}
    if(action==='sample'){if(!p.pasta||p.drained)reject('Check a sample while the pasta is cooking.');else{p.sample={time:s.time,progress:p.progress,texture:pastaTexture(p.progress)};message='Sample texture: '+p.sample.texture+'. Use the packet and a fresh sample in a real kitchen.';}}
    if(action==='reserve'){if(!p.pasta||p.drained||p.water<200*s.servings/2)reject('Reserve cooking water while the pasta is still in a filled pot, before draining.');else if(p.reserve+n.waterAdded>0)reject('The recipe allowance of cooking water has already been reserved. Use the water still in the jug.');else{p.reserve=200*s.servings/2;p.water-=p.reserve;message=p.reserve+' mL starchy cooking water reserved.';}}
    if(action==='drain'){if(!p.pasta||p.drained)reject('There is no undrained pasta in the pot.');else if(!p.sample)reject('Check a pasta sample before deciding to drain.');else{p.drained=true;p.water=0;message='Pasta drained. '+(p.reserve?'Reserved water is available for the sauce.':'No cooking water was saved; this cannot be recovered from the emptied pot.');}}
    if(action==='water'){if(!n.produce||p.reserve<50)reject('You need produce in the pan and at least 50 mL of reserved cooking water.');else{p.reserve-=50;n.moisture+=50;n.waterAdded+=50;n.temp=Math.max(22,n.temp-8);message='50 mL cooking water added. Observe how the sauce loosens.';}}
    if(action==='combine'){if(n.combined)reject('The pasta is already in the pan.');else if(!p.drained||!n.produce||!n.garlic)reject('Drain the pasta and add both prepared produce and garlic before combining.');else{n.combined=true;n.lastStir=s.time;message='Drained pasta added and tossed through the sauce.';}}
    if(action==='taste'){if(!n.combined)reject('Combine the dish before checking the final sauce consistency.');else{n.tasted=true;message='Sauce check: '+sauce(s)+'. Pasta: '+pastaTexture(p.progress)+'.';}}
    if(action==='plate'){if(!n.combined||!n.tasted)reject('Combine the pasta and sauce, then check the finished dish before plating.');else if(p.heat||n.heat)reject('Turn both burners off before plating.');else{s.plated=true;message='Dish plated. Review the texture, sauce, and choices you made.';}}
    if(action==='advance'){
      var burned=n.damage>=1;advance(s,Math.min(value,3600-s.time));
      message='Both vessels advanced '+Math.round(s.time-original.time)+' simulated seconds. '+(p.pasta&&!p.drained?'Pasta continues cooking':inspect(s).pot)+'; '+sauce(s)+'.';
      if(!burned&&n.damage>=1)reject('The pan has scorched. Lowering the heat or adding water will not undo this damage. You can finish and review this attempt, or start a fresh cook.');
    }
    if(ok&&n.combined&&['water','advance','combine'].indexOf(action)>=0)n.tasted=false;
    s.feedback=message;s.log.push({action:action,value:value===undefined?null:value,time:s.time,accepted:ok,observation:message});return s;
  }
  function criteria(s){var p=s.pot,n=s.pan,q=ingredients(s);return [
    {label:'Recipe portion measured',met:s.prep.pasta===q.pasta},
    {label:'Pasta checked and slightly firm',met:!!p.sample&&p.sample.progress>=.85&&Math.abs(p.sample.progress-p.progress)<=.18&&p.progress>=.9&&p.progress<=1.2&&p.stirred},
    {label:s.id==='mushroom'?'Mushrooms golden, without scorching':'Tomatoes softened, without scorching',met:n.produce&&n.damage<1&&(s.id==='mushroom'?n.brown>=.7&&n.brown<=1.9:n.soft>=.85)},
    {label:'Sauce coats the pasta',met:n.combined&&n.moisture>=20&&n.moisture<=180*s.servings/2&&n.waterAdded>=50},
    {label:'Dish checked; both burners off',met:s.plated&&n.tasted&&!n.heat&&!p.heat}
  ];}
  // Public observations never reveal unsampled pasta texture or a hidden readiness score.
  function monitor(s){var p=s.pot,n=s.pan,cues=[];
    if(s.plated)return [{zone:'finish',level:'normal',text:'Dish plated. Both burners are off; cookware retains heat.'}];
    if(p.heat&&!p.water)cues.push({zone:'pot',level:'attention',text:'The pot burner is on with no water in the pot.'});
    if(p.water&&p.temp>=96&&!p.pasta)cues.push({zone:'pot',level:'normal',text:'The pasta water is bubbling steadily.'});
    if(p.pasta&&!p.drained)cues.push({zone:'pot',level:'normal',text:p.sample?'Last pasta sample: '+p.sample.texture+' · '+Math.round(s.time-p.sample.time)+' simulated seconds ago.':'Pasta is cooking. No texture sample has been taken.'});
    if(n.damage>=1)cues.push({zone:'pan',level:'attention',text:'Scorched patches remain in the sauce.'});
    else if(n.garlic&&n.temp>175&&(!n.produce||n.moisture<8))cues.push({zone:'pan',level:'attention',text:'The garlic is darkening on a dry, hot surface.'});
    else if(n.produce&&n.moisture<12)cues.push({zone:'pan',level:'attention',text:'Very little visible liquid remains in the pan.'});
    if(s.id==='mushroom'&&n.produce&&n.brown>1.5&&n.damage<1)cues.push({zone:'pan',level:'attention',text:'The mushroom color is deepening beyond golden.'});
    if(!n.heat&&n.temp>70)cues.push({zone:'pan',level:'normal',text:'The pan is still hot with its burner off.'});
    if(!cues.length)cues.push({zone:'prep',level:'normal',text:'Watch both vessels as you advance the shared clock.'});
    return cues;
  }
  function review(s){if(!s.plated)return null;var p=s.pot,n=s.pan,q=ingredients(s),goals=criteria(s);
    var observations=[
      s.prep.pasta+' g weighed for '+s.servings+' servings; recipe target '+q.pasta+' g.',
      'Finished pasta: '+pastaTexture(p.progress)+'. Last sample: '+(p.sample?p.sample.texture:'none')+'. Pasta '+(p.stirred?'was':'was not')+' stirred in the pot.',
      sauce(s)+'. '+(n.size==='wide'?'Wide':'Standard')+' pan with '+q.produce+' g of '+recipe(s.id).produce+'.',
      Math.round(n.moisture)+' mL modeled sauce moisture; '+n.waterAdded+' mL reserved water added, '+p.reserve+' mL left in the jug.',
      'Final dish '+(n.tasted?'checked':'not checked')+'; pot burner '+(p.heat?'on':'off')+', pan burner '+(n.heat?'on':'off')+'.'
    ];
    var next=[
      goals[0].met?'Keep weighing against the scaled recipe before cooking.':'Compare the weighed portion with the serving count before adding pasta.',
      !p.stirred?'Stir after adding pasta so the model records separation.':!p.sample?'Take a sample before deciding to drain.':p.progress>1.2?'Sample and drain sooner; time in the hot sauce also softens pasta.':p.progress<.9?'Allow more cooking time, then check another sample before draining.':!goals[1].met?'Check a fresh sample close to draining; an earlier sample cannot establish the finished texture.':'Keep using a fresh sample and allow for the time spent finishing in the pan.',
      n.damage>=1?'Reduce heat before the dry surface scorches. Cooling cannot reverse the damage already recorded.':!goals[2].met?(s.id==='mushroom'?(n.brown>1.9?'Lower the heat when the mushrooms reach golden.':'Let surface moisture escape and watch for golden color. A wider pan gives a larger batch more space.'):'Allow the tomatoes to soften before combining.'):s.id==='mushroom'?'Keep watching color as moisture escapes; lower the heat once golden.':'Keep the softened tomatoes at a controlled simmer while coordinating the pot.',
      n.waterAdded<50?'Save cooking water before draining, then use a small measured splash when finishing.':n.moisture<20?'Add a small splash of the saved water and check the sauce again.':n.moisture>180*s.servings/2?'Let excess liquid reduce gently before the final consistency check.':'Keep adding saved water in small amounts and checking the coating.',
      goals[4].met?'Keep checking after your last adjustment and turning both burners off before plating.':'Check the dish after the last adjustment and switch off both burners before plating.'
    ];
    var milestones={produce:'Produce entered the pan',pasta:'Pasta entered the pot',garlic:'Garlic added',sample:'Pasta sampled',reserve:'Cooking water reserved',drain:'Pasta drained',water:'Sauce loosened with saved water',combine:'Pasta and sauce combined',taste:'Finished dish checked',plate:'Dish plated'};
    return {findings:goals.map(function(g,i){return {label:g.label,met:g.met,observation:observations[i],nextPractice:next[i]};}),timeline:s.log.filter(function(e){return e.accepted&&milestones[e.action];}).map(function(e){return {time:e.time,event:milestones[e.action],observation:e.observation};})};
  }
  function evidence(s){var goals=criteria(s),questionsCorrect=s.answers[0]===0&&s.answers[1]===recipe(s.id).correct,corrections=s.log.filter(function(e){return !e.accepted;}).length;return {title:recipe(s.id).title,servings:s.servings,mode:s.mode,simulatedSeconds:s.time,status:!s.submitted?'In progress':!goals.every(function(c){return c.met;})||!questionsCorrect?'Review and refine':s.mode==='practice'?'Recipe completed with coaching':s.hints||corrections?'Recipe completed with support':'Recipe completed independently',criteria:goals,questionsCorrect:questionsCorrect,corrections:corrections,hints:s.hints,plan:s.plan,reflection:s.reflection,answers:s.answers.slice(),explanations:[{question:'Why did adding pasta lower the water temperature?',answer:['Cooler pasta absorbed heat.','Pasta switches the burner off.','Boiling water cannot change temperature.'][s.answers[0]]||null},{question:recipe(s.id).question,answer:recipe(s.id).answers[s.answers[1]]||null}],pastaTexture:pastaTexture(s.pot.progress),sauce:sauce(s),review:review(s),actions:s.log.slice()};}
  // Rebuild a historical view from actions; never substitute it for the saved attempt.
  function replay(source,index){
    if(!source||!source.submitted||!source.plated||!Number.isInteger(index)||index<0||index>source.log.length)return null;
    var current=start(source.id,source.servings,source.mode),before=current;
    for(var i=0;i<index;i++){before=current;var entry=source.log[i];current=act(current,entry.action,entry.value);}
    var changes=[];
    function difference(label,a,b,unit){a=Math.round(a);b=Math.round(b);if(a!==b)changes.push(label+': '+a+unit+' → '+b+unit+'.');}
    if(before.pot.water>0&&current.pot.water>0)difference('Modeled water temperature',before.pot.temp,current.pot.temp,'°C');
    difference('Modeled pan temperature',before.pan.temp,current.pan.temp,'°C');
    difference('Water in the pot',before.pot.water,current.pot.water,' mL');
    difference('Water in the reserved jug',before.pot.reserve,current.pot.reserve,' mL');
    difference('Modeled sauce moisture',before.pan.moisture,current.pan.moisture,' mL');
    if(inspect(before).pan!==inspect(current).pan)changes.push('Pan observation: '+inspect(before).pan+' → '+inspect(current).pan+'.');
    if(current.pot.sample&&(!before.pot.sample||current.pot.sample.time!==before.pot.sample.time))changes.push('Texture sample: '+current.pot.sample.texture+'.');
    if(!before.pan.produce&&current.pan.produce)changes.push('Prepared produce moved from the board into the pan.');
    if(!before.pot.pasta&&current.pot.pasta)changes.push('Weighed pasta entered the pot.');
    if(!before.pan.combined&&current.pan.combined)changes.push('Drained pasta moved into the sauce pan.');
    if(!before.plated&&current.plated)changes.push('The finished dish moved onto the serving plate.');
    return {index:index,total:source.log.length,state:current,action:index?Object.assign({},current.log[current.log.length-1]):null,changes:changes};
  }
  function submit(s){if(!s.plated||s.submitted||!s.answers.every(function(a){return Number.isInteger(a)&&a>=0&&a<=2;}))return s;return Object.assign({},s,{submitted:true});}
  function restore(raw){if(!raw||raw.version!==1||!recipes.some(function(r){return r.id===raw.id;}))return null;var s=start(raw.id,raw.servings,raw.mode);(Array.isArray(raw.log)?raw.log.slice(0,1200):[]).forEach(function(e){if(e&&typeof e.action==='string')s=act(s,e.action,e.value);});s.hints=Number.isInteger(raw.hints)?Math.min(500,Math.max(0,raw.hints)):0;s.plan=typeof raw.plan==='string'?raw.plan.slice(0,600):'';s.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,2000):'';s.answers=Array.isArray(raw.answers)?[0,1].map(function(i){var a=raw.answers[i];return Number.isInteger(a)&&a>=0&&a<=2?a:null;}):[null,null];return raw.submitted?submit(s):s;}
  var api={recipes:recipes,recipe:recipe,actions:actions,start:start,ingredients:ingredients,act:act,inspect:inspect,monitor:monitor,review:review,replay:replay,criteria:criteria,evidence:evidence,submit:submit,restore:restore};
  root.KitchenRecipes=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
