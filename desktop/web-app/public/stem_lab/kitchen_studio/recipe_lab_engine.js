/* Educational recipe model: deterministic heat, moisture, texture, and two-vessel timing.
   Coefficients are illustrative, not calibrated predictions of a real stove or recipe. */
(function(root){
  'use strict';
  var recipes=[
    {id:'mushroom',title:'Golden mushroom pasta',produce:'mushrooms',grams:200,description:'Brown sliced mushrooms, soften garlic, and finish pasta with its starchy cooking water.',question:'Why can a crowded, wet pan delay mushroom browning?',answers:['The released water keeps the cooking surface wet.','Mushrooms cannot brown unless the burner is on high.','Stirring removes all of the heat.'],correct:0},
    {id:'tomato',title:'Tomato & garlic pasta',produce:'tomatoes',grams:300,description:'Soften chopped tomatoes into a sauce while a separate pot cooks the pasta.',question:'Why lower the pan heat once the tomatoes release their juices?',answers:['Lower heat stops every ingredient from cooking.','A controlled simmer reduces the sauce with less risk of scorching.','The water must stay in the sauce forever.'],correct:1}
  ];
  var actions=[['wash','Wash hands with soap'],['rinse','Rinse the produce'],['cut','Use even cuts (simplified)'],['slice','Cut a selected piece'],['finishCuts','Use prepared pieces'],['resetCuts','Start a fresh cutting sample'],['dry','Pat produce dry'],['garlicPrep','Mince the garlic'],['measure','Weigh dry pasta'],['fill','Fill the pasta pot'],['oil','Add measured olive oil'],['produce','Add prepared produce'],['garlic','Add minced garlic'],['stirPan','Stir the pan'],['stirSweep','Mix with a complete pan sweep'],['pasta','Add pasta to boiling water'],['stirPot','Stir the pasta'],['sample','Check a pasta sample'],['reserve','Reserve cooking water'],['drain','Drain the pasta'],['water','Add 50 mL reserved water'],['pour','Pour a measured amount of saved water'],['combine','Add drained pasta & toss'],['taste','Check sauce consistency'],['plate','Plate the finished dish']];

  var rescues=[
    {id:'dry',title:'Rescue a dry sauce',recipe:'mushroom',moisture:8,reserve:200,waterAdded:0,heat:0,correct:0,brief:'Golden mushroom pasta is already combined, but the sauce looks dry. Both burners are off; the pan is still warm. You have 200 mL of saved pasta water.'},
    {id:'watery',title:'Rescue a watery sauce',recipe:'tomato',moisture:240,reserve:150,waterAdded:50,heat:1,correct:1,brief:'Soft tomato sauce and pasta are already combined, but the sauce looks loose and watery. The pan is on low; 150 mL of saved water remains. Watch the pasta while you adjust the sauce.'}
  ];
  var rescueExplanations=['A measured splash adds moisture; folding distributes it through the dish.','Heating over time lets moisture escape; stirring alone does not remove water.','Mixing alone adds the missing water and removes any extra liquid.'];
  function rescueDefinition(id){return rescues.find(function(r){return r.id===id;})||null;}
  function startRescue(id,prediction,mode){var r=rescueDefinition(id);if(!r||!Number.isInteger(prediction)||prediction<0||prediction>2)return null;var s=start(r.recipe,2,mode);s.rescue={id:id,prediction:prediction};s.prep={hands:true,rinsed:true,cut:true,cuts:Array(id==='dry'?8:4).fill(id==='dry'?5:10),cutMethod:'provided',dry:true,garlic:true,pasta:160};Object.assign(s.pot,{pasta:true,progress:.9,stirred:true,reserve:r.reserve,drained:true,sample:{time:0,progress:.9,texture:'Tender with a slight bite'}});Object.assign(s.pan,{heat:r.heat,temp:100,oil:true,produce:true,garlic:true,moisture:r.moisture,brown:id==='dry'?1:0,soft:id==='watery'?1:0,waterAdded:r.waterAdded,combined:true});s.feedback='Provided starting dish. '+r.brief;return s;}
  function rescueCriteria(s){return [
    {label:'Sauce adjusted to coat the pasta and mixed through',met:s.pan.moisture>=20&&s.pan.moisture<=180&&s.pan.damage<1&&mixing(s).waterSinceMix===0},
    {label:'Pasta retains a slight bite',met:s.pot.progress>=.9&&s.pot.progress<=1.2},
    {label:'Dish checked after adjustment; both burners off',met:s.plated&&s.pan.tasted&&!s.pan.heat&&!s.pot.heat}
  ];}
  function rescueEvidence(s){var r=rescueDefinition(s.rescue.id),goals=rescueCriteria(s),correct=s.answers[0]===r.correct,corrections=s.log.filter(function(e){return !e.accepted;}).length;return {title:r.title,servings:2,mode:s.mode,simulatedSeconds:s.time,status:!s.submitted?'In progress':!goals.every(function(g){return g.met;})||!correct?'Review and retry':s.mode==='practice'?'Rescue completed with coaching':s.hints||corrections?'Rescue completed with support':'Rescue demonstrated independently',criteria:goals,questionsCorrect:correct,corrections:corrections,hints:s.hints,scope:'Prepared starting dish supplied by the challenge. Only the following rescue actions belong to the learner.',rescue:{id:r.id,brief:r.brief,prediction:['Add a little saved water','Use heat and time to reduce liquid','Mix without changing the liquid'][s.rescue.prediction],startingMoisture:r.moisture,finalMoisture:Math.round(s.pan.moisture),startingReserve:r.reserve,finalReserve:s.pot.reserve},mixing:mixing(s),plan:s.plan,reflection:s.reflection,explanations:[{question:'Which change addresses the starting problem, and why?',answer:rescueExplanations[s.answers[0]]||null}],pastaTexture:pastaTexture(s.pot.progress),sauce:sauce(s),review:rescueReview(s),actions:s.log.slice()};}
  function rescueReview(s){if(!s.plated)return null;var r=rescueDefinition(s.rescue.id),goals=rescueCriteria(s),obs=[r.moisture+' mL starting moisture → '+Math.round(s.pan.moisture)+' mL at finish. '+sauce(s)+'. '+mixing(s).waterSinceMix+' mL saved water added since the last mix.','Provided pasta began with a slight bite. Finished texture: '+pastaTexture(s.pot.progress)+'.',s.pan.tasted?'The dish was checked after the last adjustment.':'The final adjustment was not followed by a dish check.'];return {findings:goals.map(function(g,i){return {label:g.label,met:g.met,observation:obs[i],nextPractice:i===0?(s.pan.damage>=1?'Scorching cannot be undone. Retry with controlled heat and shorter checks.':mixing(s).waterSinceMix?'Fold the saved water through before the final check.':s.pan.moisture<20?'Try a small measured splash, mix, and observe before adding more.':s.pan.moisture>180?'Allow some liquid to reduce with heat and time; inspect between small steps.':'Keep observing after each adjustment.'):i===1?(g.met?'Keep watching the pasta while adjusting the sauce.':'Try shorter time steps; pasta continues softening in the hot pan.'):'Check the dish after the last change and turn both burners off.'};}),timeline:s.log.filter(function(e){return e.accepted&&e.action!=='advance';}).map(function(e){return {time:e.time,event:(actions.find(function(a){return a[0]===e.action;})||[null,e.action])[1],observation:e.observation};})};}

  function recipe(id){return recipes.find(function(r){return r.id===id;})||recipes[0];}
  function ingredients(s){var r=recipe(s.id),factor=s.servings/2;return {pasta:160*factor,produce:r.grams*factor,oil:15*factor,garlic:2*factor,water:1200*factor};}
  function start(id,servings,mode){return {version:1,id:recipe(id).id,servings:servings===4?4:2,mode:mode==='demonstrate'?'demonstrate':'practice',time:0,log:[],hints:0,plan:'',reflection:'',answers:[null,null],submitted:false,plated:false,feedback:'Prepare your ingredients, then coordinate the pot and pan.',prep:{hands:false,rinsed:false,cut:false,cuts:[40],cutMethod:null,dry:false,garlic:false,pasta:0},pot:{heat:0,temp:22,water:0,pasta:false,progress:0,stirred:false,reserve:0,drained:false,sample:null},pan:{heat:0,temp:22,size:'standard',oil:false,produce:false,garlic:false,moisture:0,brown:0,soft:0,damage:0,lastStir:0,waterAdded:0,combined:false,tasted:false}};}
  function copy(s){return Object.assign({},s,{prep:Object.assign({},s.prep,{cuts:(s.prep.cuts||[40]).slice()}),pot:Object.assign({},s.pot),pan:Object.assign({},s.pan),log:s.log.slice(),answers:s.answers.slice()});}
  function cutProfile(s){var widths=(s.prep.cuts||[40]).slice(),target=s.id==='mushroom'?5:10,min=Math.min.apply(null,widths),max=Math.max.apply(null,widths);return {widths:widths,target:target,min:min,max:max,even:max-min<=1,onTarget:min>=target-1&&max<=target+1,method:s.prep.cutMethod||'unrecorded',rate:Math.max(.35,Math.min(1.5,target/max))};}
  function pastaTexture(progress){return progress<.6?'Hard center':progress<.9?'Still firm':progress<=1.2?'Tender with a slight bite':progress<=1.45?'Soft':'Overcooked';}
  function sauce(s){var p=s.pan;if(p.damage>=1)return 'Scorched';if(!p.produce)return p.garlic?'Garlic in the pan':p.oil?'Oil in the pan':'Not started';if(s.id==='mushroom'&&p.brown<.7)return p.moisture>10?'Releasing moisture':'Developing color';if(s.id==='tomato'&&p.soft<.85)return 'Tomatoes still firm';if(p.moisture>180*s.servings/2)return 'Loose and watery';if(p.moisture<20)return 'Dry; needs a splash';return s.id==='mushroom'?'Golden, glossy mushrooms':'Soft, coating tomato sauce';}
  function inspect(s){var p=s.pot,n=s.pan;return {pot:p.drained?'Pasta drained':!p.water?'Empty pot':!p.pasta?(p.temp>=96?'Boiling water':p.temp>=80?'Near a simmer':'Water heating'):'Pasta cooking',pasta:p.pasta?pastaTexture(p.progress):'Not in the pot',pan:sauce(s),crowded:n.produce&&ingredients(s).produce>(n.size==='wide'?650:300),burned:n.damage>=1};}
  function advance(s,seconds){
    var remaining=seconds,p=s.pot,n=s.pan,r=recipe(s.id),amount=ingredients(s),cutRate=cutProfile(s).rate;
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
        if(s.id==='tomato')n.soft+=dt*Math.max(0,Math.min(1,(n.temp-65)/35))/260*cutRate;
        if(s.id==='mushroom'&&n.moisture<12&&n.temp>120)n.brown+=dt*(n.temp-120)/4200*crowding*cutRate;
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
    if(action==='slice'&&(typeof value!=='string'||!/^\d{1,2}:\d{1,2}$/.test(value)))return original;
    if(action==='stirSweep'&&value!=='gesture'&&value!=='button')return original;
    if(action==='pour'&&(!Number.isInteger(value)||value<10||value>100||value%10))return original;
    if(action==='measure'&&(!Number.isInteger(value)||value<40||value>800||value%40))return original;
    if(action==='advance'&&(!Number.isFinite(value)||value<=0||value>60))return original;
    if(action==='panSize'&&value!=='wide'&&value!=='standard')return original;
    var s=copy(original),p=s.pot,n=s.pan,v=s.prep,q=ingredients(s),ok=true,message='';
    function reject(text){ok=false;message=text;}
    if(action==='wash'){v.hands=true;message='Soap-and-water handwashing completed for at least 20 seconds in this model.';}
    if(action==='rinse'){v.rinsed=true;message='Produce rinsed under running water.';}
    if(action==='cut'){if(n.produce)reject('The produce is already cooking; its cuts cannot be changed.');else if(!v.hands||!v.rinsed)reject('Wash hands and rinse the produce before cutting.');else{v.cut=true;var size=s.id==='mushroom'?5:10;v.cuts=Array(40/size).fill(size);v.cutMethod='simplified';message='Even '+size+' mm pieces prepared using the simplified control. This records a preparation choice, not knife dexterity.';}}
    if(action==='slice'){var parts=value.split(':').map(Number),index=parts[0],position=parts[1];if(n.produce||v.cut)reject('Start a fresh cutting sample before changing recorded pieces; cooking produce cannot be recut.');else if(!v.hands||!v.rinsed)reject('Wash hands and rinse the produce before cutting.');else if(index>=v.cuts.length||position<1||position>=v.cuts[index])reject('Place the cut inside the selected piece.');else{var width=v.cuts[index];v.cuts.splice(index,1,position,width-position);v.cutMethod='board';message='Piece '+(index+1)+' split into '+position+' mm and '+(width-position)+' mm pieces.';}}
    if(action==='finishCuts'){if(n.produce||v.cut)reject('These prepared pieces have already been recorded or added to the pan.');else if(!v.hands||!v.rinsed||v.cuts.length<2)reject('Wash hands, rinse the produce, and make at least one cut before using these pieces.');else{v.cut=true;v.cutMethod='board';var profile=cutProfile(s);message='Prepared '+v.cuts.length+' pieces, '+profile.min+'–'+profile.max+' mm wide. '+(profile.even?'The widths are consistent.':'The widths vary; larger pieces govern the modeled cooking rate.');}}
    if(action==='resetCuts'){if(n.produce)reject('The produce is already cooking; start a fresh cook to practice cutting again.');else{v.cuts=[40];v.cut=false;v.cutMethod=null;message='A fresh 40 mm representative sample is ready. Earlier cuts remain in your notebook.';}}
    if(action==='dry'){if(n.produce)reject('Dry the produce before adding it to the pan.');else{v.dry=true;message='Excess surface water removed.';}}
    if(action==='garlicPrep'){if(!v.hands)reject('Wash hands before preparing the garlic.');else{v.garlic=true;message='Garlic peeled and minced.';}}
    if(action==='measure'){if(p.pasta)reject('The pasta is already cooking; weighing cannot change this batch.');else{v.pasta=value;message='Measured '+value+' g of dry pasta. The recipe calls for '+q.pasta+' g.';}}
    if(action==='fill'){if(p.pasta||p.drained)reject('The pot is already in use for this batch.');else{p.water=q.water;p.temp=22;message='Pot filled with '+q.water+' mL of fresh water.';}}
    if(action==='potHeat'){p.heat=value;message='Pot burner '+['off','low','medium','high'][value]+'. The water temperature changes gradually.';}
    if(action==='panHeat'){n.heat=value;message='Pan burner '+['off','low','medium','high'][value]+'. The pan retains heat after you turn it down.';}
    if(action==='panSize'){if(n.oil||n.produce)reject('Choose the pan size before adding ingredients.');else{n.size=value;message=value==='wide'?'Wide pan selected for more space.':'Standard pan selected.';}}
    if(action==='oil'){if(n.oil)reject('The measured oil is already in the pan.');else{n.oil=true;message=q.oil+' mL olive oil added.';}}
    if(action==='produce'){if(n.produce)reject('The produce is already in the pan.');else if(!v.cut||!v.hands||!n.oil)reject('Prepare the produce and add the measured oil first.');else{n.produce=true;n.moisture=(s.id==='mushroom'?(v.dry?35:65):250)*s.servings/2;n.temp=Math.max(22,n.temp-25);n.lastStir=s.time;message='Produce added. Its moisture and mass affect the pan temperature. The largest '+cutProfile(s).max+' mm pieces determine the modeled preparation rate.';}}
    if(action==='garlic'){if(n.garlic)reject('The garlic is already in the pan.');else if(!v.garlic||!n.oil)reject('Mince the garlic and add oil before putting garlic in the pan.');else{n.garlic=true;message='Garlic added. Watch its color as the pan heats.';}}
    if(action==='stirPan'){if(!n.produce)reject('Add produce before stirring the pan.');else{n.lastStir=s.time;message='Pan stirred to redistribute the pieces and sauce.';}}
    if(action==='stirSweep'){if(!n.produce)reject('Add produce to the pan before mixing.');else{n.lastStir=s.time;if(n.combined)n.tasted=false;message=(n.combined?'Pasta folded through the sauce. ':'Ingredients redistributed around the pan. ')+(n.damage>=1?'Scorched patches remain; mixing cannot undo them.':n.moisture<20?'The pan still looks dry; mixing does not add moisture.':n.moisture>180*s.servings/2?'The sauce still looks loose; mixing does not remove excess liquid.':'Observe the coating before deciding on another splash.')+(n.combined?' Check the dish again before plating.':'');}}
    if(action==='pasta'){if(p.pasta||p.drained)reject('This batch of pasta has already been added.');else if(v.pasta<=0||p.water<500||p.temp<96)reject('Weigh pasta and bring a filled pot to a boil before adding it for this recipe.');else{p.pasta=true;p.temp=Math.max(22,p.temp-10*v.pasta/160);message='Pasta added. The cooler pasta briefly lowers the water temperature.';}}
    if(action==='stirPot'){if(!p.pasta||p.drained)reject('Stir while the pasta is in the water.');else{p.stirred=true;message='Pasta stirred to separate the pieces.';}}
    if(action==='sample'){if(!p.pasta||p.drained)reject('Check a sample while the pasta is cooking.');else{p.sample={time:s.time,progress:p.progress,texture:pastaTexture(p.progress)};message='Sample texture: '+p.sample.texture+'. Use the packet and a fresh sample in a real kitchen.';}}
    if(action==='reserve'){if(!p.pasta||p.drained||p.water<200*s.servings/2)reject('Reserve cooking water while the pasta is still in a filled pot, before draining.');else if(p.reserve+n.waterAdded>0)reject('The recipe allowance of cooking water has already been reserved. Use the water still in the jug.');else{p.reserve=200*s.servings/2;p.water-=p.reserve;message=p.reserve+' mL starchy cooking water reserved.';}}
    if(action==='drain'){if(!p.pasta||p.drained)reject('There is no undrained pasta in the pot.');else if(!p.sample)reject('Check a pasta sample before deciding to drain.');else{p.drained=true;p.water=0;message='Pasta drained. '+(p.reserve?'Reserved water is available for the sauce.':'No cooking water was saved; this cannot be recovered from the emptied pot.');}}
    if(action==='water'||action==='pour'){var amount=action==='water'?50:value;if(!n.produce)reject('Add the prepared produce to the pan before pouring saved water.');else if(p.reserve<amount)reject('The jug contains '+p.reserve+' mL. Reserve water before draining, then choose an amount available in the jug.');else{p.reserve-=amount;n.moisture+=amount;n.waterAdded+=amount;n.temp=Math.max(22,n.temp-8*amount/50);message=amount+' mL cooking water poured; '+p.reserve+' mL remains in the jug. Observe the sauce, then decide whether it needs another splash.';}}
    if(action==='combine'){if(n.combined)reject('The pasta is already in the pan.');else if(!p.drained||!n.produce||!n.garlic)reject('Drain the pasta and add both prepared produce and garlic before combining.');else{n.combined=true;n.lastStir=s.time;message='Drained pasta added and tossed through the sauce.';}}
    if(action==='taste'){if(!n.combined)reject('Combine the dish before checking the final sauce consistency.');else{n.tasted=true;message='Sauce check: '+sauce(s)+'. Pasta: '+pastaTexture(p.progress)+'.';}}
    if(action==='plate'){if(!n.combined||!n.tasted)reject('Combine the pasta and sauce, then check the finished dish before plating.');else if(p.heat||n.heat)reject('Turn both burners off before plating.');else{s.plated=true;message='Dish plated. Review the texture, sauce, and choices you made.';}}
    if(action==='advance'){
      var burned=n.damage>=1;advance(s,Math.min(value,3600-s.time));
      message='Both vessels advanced '+Math.round(s.time-original.time)+' simulated seconds. '+(p.pasta&&!p.drained?'Pasta continues cooking':inspect(s).pot)+'; '+sauce(s)+'.';
      if(!burned&&n.damage>=1)reject('The pan has scorched. Lowering the heat or adding water will not undo this damage. You can finish and review this attempt, or start a fresh cook.');
    }
    if(ok&&n.combined&&(['water','pour','advance','combine'].indexOf(action)>=0||s.rescue&&action==='stirPan'))n.tasted=false;
    s.feedback=message;s.log.push({action:action,value:value===undefined?null:value,time:s.time,accepted:ok,observation:message});return s;
  }
  function mixing(s){var count=0,sweeps=0,water=0,last=null;s.log.forEach(function(e){if(!e.accepted)return;if(e.action==='pour'||e.action==='water')water+=e.action==='water'?50:e.value;if(['stirPan','stirSweep','combine'].indexOf(e.action)>=0){count++;if(e.action==='stirSweep')sweeps++;water=0;last=e;}});return {count:count,sweeps:sweeps,waterSinceMix:water,lastMixedAt:last?last.time:null,lastMethod:last?(last.action==='stirSweep'?last.value:'simplified'):null};}
  function criteria(s){if(s.rescue)return rescueCriteria(s);var p=s.pot,n=s.pan,q=ingredients(s);return [
    {label:'Recipe portion measured',met:s.prep.pasta===q.pasta},
    {label:'Pasta checked and slightly firm',met:!!p.sample&&p.sample.progress>=.85&&Math.abs(p.sample.progress-p.progress)<=.18&&p.progress>=.9&&p.progress<=1.2&&p.stirred},
    {label:s.id==='mushroom'?'Mushrooms cut to size and golden, without scorching':'Tomatoes cut to size and softened, without scorching',met:cutProfile(s).onTarget&&n.produce&&n.damage<1&&(s.id==='mushroom'?n.brown>=.7&&n.brown<=1.9:n.soft>=.85)},
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
  function review(s){if(s.rescue)return rescueReview(s);if(!s.plated)return null;var p=s.pot,n=s.pan,q=ingredients(s),goals=criteria(s);
    var observations=[
      s.prep.pasta+' g weighed for '+s.servings+' servings; recipe target '+q.pasta+' g.',
      'Finished pasta: '+pastaTexture(p.progress)+'. Last sample: '+(p.sample?p.sample.texture:'none')+'. Pasta '+(p.stirred?'was':'was not')+' stirred in the pot.',
      sauce(s)+'. Prepared widths: '+cutProfile(s).min+'–'+cutProfile(s).max+' mm ('+cutProfile(s).method+'). '+(n.size==='wide'?'Wide':'Standard')+' pan with '+q.produce+' g of '+recipe(s.id).produce+'.',
      Math.round(n.moisture)+' mL modeled sauce moisture; '+n.waterAdded+' mL reserved water added, '+p.reserve+' mL left in the jug.',
      'Final dish '+(n.tasted?'checked':'not checked')+'; pot burner '+(p.heat?'on':'off')+', pan burner '+(n.heat?'on':'off')+'.'
    ];
    var next=[
      goals[0].met?'Keep weighing against the scaled recipe before cooking.':'Compare the weighed portion with the serving count before adding pasta.',
      !p.stirred?'Stir after adding pasta so the model records separation.':!p.sample?'Take a sample before deciding to drain.':p.progress>1.2?'Sample and drain sooner; time in the hot sauce also softens pasta.':p.progress<.9?'Allow more cooking time, then check another sample before draining.':!goals[1].met?'Check a fresh sample close to draining; an earlier sample cannot establish the finished texture.':'Keep using a fresh sample and allow for the time spent finishing in the pan.',
      !cutProfile(s).onTarget?'Before cooking, prepare consistent pieces near the recipe target of '+cutProfile(s).target+' mm. The recorded widths were '+cutProfile(s).min+'–'+cutProfile(s).max+' mm.':n.damage>=1?'Reduce heat before the dry surface scorches. Cooling cannot reverse the damage already recorded.':!goals[2].met?(s.id==='mushroom'?(n.brown>1.9?'Lower the heat when the mushrooms reach golden.':'Let surface moisture escape and watch for golden color. A wider pan gives a larger batch more space.'):'Allow the tomatoes to soften before combining.'):s.id==='mushroom'?'Keep watching color as moisture escapes; lower the heat once golden.':'Keep the softened tomatoes at a controlled simmer while coordinating the pot.',
      n.waterAdded<50?'Save cooking water before draining, then use a small measured splash when finishing.':n.moisture<20?'Add a small splash of the saved water and check the sauce again.':n.moisture>180*s.servings/2?'Let excess liquid reduce gently before the final consistency check.':'Keep adding saved water in small amounts and checking the coating.',
      goals[4].met?'Keep checking after your last adjustment and turning both burners off before plating.':'Check the dish after the last adjustment and switch off both burners before plating.'
    ];
    var milestones={produce:'Produce entered the pan',pasta:'Pasta entered the pot',garlic:'Garlic added',sample:'Pasta sampled',reserve:'Cooking water reserved',drain:'Pasta drained',pour:'Measured water poured into the sauce',water:'Sauce loosened with saved water',stirSweep:'Ingredients mixed with a complete sweep',combine:'Pasta and sauce combined',taste:'Finished dish checked',plate:'Dish plated'};
    return {findings:goals.map(function(g,i){return {label:g.label,met:g.met,observation:observations[i],nextPractice:next[i]};}),timeline:s.log.filter(function(e){return e.accepted&&milestones[e.action];}).map(function(e){return {time:e.time,event:milestones[e.action],observation:e.observation};})};
  }
  function evidence(s){if(s.rescue)return rescueEvidence(s);var goals=criteria(s),questionsCorrect=s.answers[0]===0&&s.answers[1]===recipe(s.id).correct,corrections=s.log.filter(function(e){return !e.accepted;}).length;return {title:recipe(s.id).title,servings:s.servings,mode:s.mode,simulatedSeconds:s.time,status:!s.submitted?'In progress':!goals.every(function(c){return c.met;})||!questionsCorrect?'Review and refine':s.mode==='practice'?'Recipe completed with coaching':s.hints||corrections?'Recipe completed with support':'Recipe completed independently',criteria:goals,questionsCorrect:questionsCorrect,corrections:corrections,hints:s.hints,cutPreparation:cutProfile(s),mixing:mixing(s),plan:s.plan,reflection:s.reflection,answers:s.answers.slice(),explanations:[{question:'Why did adding pasta lower the water temperature?',answer:['Cooler pasta absorbed heat.','Pasta switches the burner off.','Boiling water cannot change temperature.'][s.answers[0]]||null},{question:recipe(s.id).question,answer:recipe(s.id).answers[s.answers[1]]||null}],pastaTexture:pastaTexture(s.pot.progress),sauce:sauce(s),review:review(s),actions:s.log.slice()};}
  // Rebuild a historical view from actions; never substitute it for the saved attempt.
  function replay(source,index){
    if(!source||!source.submitted||!source.plated||!Number.isInteger(index)||index<0||index>source.log.length)return null;
    var current=source.rescue?startRescue(source.rescue.id,source.rescue.prediction,source.mode):start(source.id,source.servings,source.mode),before=current;if(!current)return null;
    for(var i=0;i<index;i++){before=current;var entry=source.log[i];current=act(current,entry.action,entry.value);}
    var changes=[];if(before.prep.cuts.join(',')!==current.prep.cuts.join(','))changes.push('Piece widths: '+before.prep.cuts.join(', ')+' mm → '+current.prep.cuts.join(', ')+' mm.');
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
    if(current.log.length>before.log.length&&current.log[current.log.length-1].accepted&&current.log[current.log.length-1].action==='stirSweep')changes.push('Ingredients redistributed. '+mixing(current).waterSinceMix+' mL saved water added since the last mix.');
    if(!before.plated&&current.plated)changes.push('The finished dish moved onto the serving plate.');
    return {index:index,total:source.log.length,state:current,action:index?Object.assign({},current.log[current.log.length-1]):null,changes:changes};
  }
  function submit(s){if(!s.plated||s.submitted||!(s.rescue?Number.isInteger(s.answers[0])&&s.answers[0]>=0&&s.answers[0]<=2:s.answers.every(function(a){return Number.isInteger(a)&&a>=0&&a<=2;})))return s;return Object.assign({},s,{submitted:true});}
  function restore(raw){if(!raw||raw.version!==1||!recipes.some(function(r){return r.id===raw.id;}))return null;var s=raw.rescue?startRescue(raw.rescue.id,raw.rescue.prediction,raw.mode):start(raw.id,raw.servings,raw.mode);if(!s)return null;(Array.isArray(raw.log)?raw.log.slice(0,1200):[]).forEach(function(e){if(e&&typeof e.action==='string')s=act(s,e.action,e.value);});s.hints=Number.isInteger(raw.hints)?Math.min(500,Math.max(0,raw.hints)):0;s.plan=typeof raw.plan==='string'?raw.plan.slice(0,600):'';s.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,2000):'';s.answers=Array.isArray(raw.answers)?[0,1].map(function(i){var a=raw.answers[i];return Number.isInteger(a)&&a>=0&&a<=2?a:null;}):[null,null];return raw.submitted?submit(s):s;}
  var api={rescues:rescues,rescueDefinition:rescueDefinition,rescueExplanations:rescueExplanations,startRescue:startRescue,mixing:mixing,cutProfile:cutProfile,recipes:recipes,recipe:recipe,actions:actions,start:start,ingredients:ingredients,act:act,inspect:inspect,monitor:monitor,review:review,replay:replay,criteria:criteria,evidence:evidence,submit:submit,restore:restore};
  root.KitchenRecipes=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
