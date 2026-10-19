/* Optional skill quests read the cook's evidence; opening a quest never cooks. */
(function(root){
  'use strict';
  var ids=['prep','pan','sauce'];
  function recipes(){return root.KitchenRecipes;}
  function last(s,actions){var index=-1;(s.log||[]).forEach(function(e,i){if(e.accepted&&actions.indexOf(e.action)!==-1)index=i;});return index;}
  function step(label,done){return {label:label,done:!!done};}
  function route(tool,view,zone,action){return {tool:tool,view:view,zone:zone,action:action};}
  function needsFreshAttempt(s,id){return id==='sauce'&&s.mode==='practice'&&s.mixingModel===2&&s.sauceObservationModel===2&&s.pan.damage>=1;}
  function sanitationRoute(s){
    var v=s.prep,whole=!v.rinsed&&!v.cut&&!s.pan.produce&&(v.cuts||[40]).length<=1&&!s.rescue;
    if(!v.hands&&!s.rescue)return route('wash','wash','prep','wash');
    return route(whole?'rinse':'sanitation',whole?'rinse':'prep','prep',!v.hands?'wash':'rinse');
  }
  function produceRoute(s){
    if(!s.prep.hands||!s.prep.rinsed)return sanitationRoute(s);
    if(!s.prep.cut)return route('cut','prep','prep');
    return route('move','handoff','pan',s.pan.oil?'produce':'oil');
  }
  function savedWaterRoute(s){
    var R=recipes(),p=s.pot;
    if(p.reserve>=10)return s.pan.produce?route('pour','bench','pan'):produceRoute(s);
    if(p.pasta&&!p.drained)return route('ladle','bench','pot');
    if(s.prep.pasta!==R.ingredients(s).pasta)return route('weigh','weigh','prep');
    if(!p.water)return route('pasta','pot','pot','fill');
    if(p.temp<96)return route('heat','pot','pot');
    return route('pasta','pot','pot','pasta');
  }
  function combineRoute(s){if(!s.pan.produce)return produceRoute(s);if(!s.pan.garlic)return s.prep.garlic?route('move','handoff','pan','garlic'):route('mince','garlic','prep');return route('combine','handoff','finish','combine');}
  function describe(s,id){
    var R=recipes(),p=s.pot,n=s.pan,v=s.prep,red=s.id==='tomato',cuts=R.cutProfile(s),tomatoes=R.tomatoHandling(s),mix=R.mixing(s),needsMix=R.needsMixing(s),d;
    if(id==='pan'){
      var soft=R.panSurface(s).pieces.some(function(piece){return piece.soft>=.85;});
      d={id:'pan',name:red?'Softness detective':'Pan explorer',mark:red?'02 / SOFTEN':'02 / TURN',question:red?'When does a firm wedge become ready to press?':'What does turning a slice reveal?',steps:[step('Carry prepared produce into the pan',n.produce&&last(s,['produce'])>=0),step(red?'Observe a softened tomato piece':'Place a piece deliberately',red?n.produce&&(soft||last(s,['crushTomato'])>=0):last(s,['movePiece','spreadPan'])>=0),step(red?'Press a softened piece to release juice':'Turn a piece and compare its sides',red?last(s,['crushTomato'])>=0&&tomatoes.split+tomatoes.crushed>0:last(s,['flipPiece'])>=0)],notice:red?tomatoes.summary:R.panSurface(s).summary};
      d.next=!d.steps[0].done?produceRoute(s):red&&!d.steps[1].done?route('heat','pan','pan'):route(red?'crush':d.steps[1].done?'turn':'arrange',red?'pan':d.steps[1].done?'turn':'pan','pan');
      d.try=!d.steps[0].done?'Prepare the produce and oil, then carry the produce to the pan.':red&&!d.steps[1].done?'Choose the pan heat and advance in small steps. Watch the wedges change before pressing.':red?'Press down on a softened wedge, lift, and release. Notice the finite juice it adds.':!d.steps[1].done?'Drag a slice to a new spot. Compare its space with neighboring pieces.':'Slide the spatula right under a slice, lift up, sweep left to turn it, then lower and release. Compare the two faces.';
      if(s.rescue)d.unavailable='This rescue supplies the prepared pan. Explore its food freely; practice this quest in a full recipe.';
      else if(s.panModel!==2||(red&&s.tomatoModel!==1))d.unavailable='This earlier cook uses a batch model. Start a fresh cook to explore individual pieces.';
    }else if(id==='sauce'){
      var poured=last(s,['pour','water']),liquid=Math.max(poured,last(s,['crushTomato'])),mixed=last(s,['stirPan','stirSweep','combine']),checked=last(s,['taste']);
      d={id:'sauce',name:'Sauce scientist',mark:'03 / FOLD',question:'How does a splash change after you fold it through?',steps:[step('Add a measured splash of saved water',poured>=0&&n.waterAdded>0),step('Fold the latest liquid through the pan',poured>=0&&mixed>liquid&&!needsMix),step('Check the sauce after your latest fold',poured>=0&&mixed>liquid&&checked>mixed&&n.combined&&(s.mixingModel!==2||!needsMix))],notice:p.reserve+' mL in the jug · '+n.waterAdded+' mL added · '+(s.mixingModel===2?(needsMix?'Separate added liquid remains visible.':'No distinct added-liquid pool is visible.') : Math.round(mix.liquidSinceMix)+' mL awaiting a fold.')};
      d.next=!d.steps[0].done?savedWaterRoute(s):!d.steps[1].done?route('stir','pan','pan'):!p.drained?(p.sample?route('drain','bench','pot'):route('check','pot','pot')):!n.combined?combineRoute(s):route('check','pan','finish');
      d.try=!d.steps[0].done?(p.reserve>=10?'Lift the saved-water jug over the pan. Tilt gently, then stop the pour.':'Cook pasta and save some of its water before draining. The jug supplies your measured splash.'):!d.steps[1].done?(n.combined?'Gather with a full circle, draw inward to fold, then release. Watch separate liquid fold into the sauce.':'Sweep a full circle through the pan, then release. Watch the liquid redistribute.'):!n.combined?'Drain and combine your pasta when ready, then draw a track through a sauce sample.':'Draw a track through a sauce sample. Observe whether it stays open or closes; adjust and check again if needed.';
      if(d.next.tool==='pasta'&&d.next.action==='fill')d.try='Carry the fresh-water jug level over the empty pasta pot. Pull down to tip and release to add the measured recipe volume.';
      if(d.next.tool==='pasta'&&d.next.action==='pasta')d.try='Lift the recorded pasta tray, carry level over the boiling pot, tip and release. Notice how the cooler pasta changes the water reading.';
      if(d.next.tool==='drain')d.try='Save the water you want to keep first. Carry the pot over the colander, pull down to drain, and lift back to stop the flow.';
      if(d.next.action==='combine')d.try='Lift the drained-pasta colander. Carry level over the prepared sauce pan, pull down to tip, then release. Fold through and inspect the sauce.';
      if(d.next.tool==='mince')d.try='Prepare every garlic clove with down-and-up passes, then carry the minced garlic into the pan before combining.';
      if(d.next.action==='garlic')d.try='Lift the minced-garlic bowl, carry it level over the pan, tip and release before combining the pasta.';
      if(!d.steps[0].done&&d.next.tool==='weigh')d.try='Weigh your recipe portion first. Then cook the pasta and save some water before draining.';
      if(!d.steps[0].done&&d.next.tool==='heat')d.try='Choose the pot heat and advance in small steps. Add your weighed pasta once the water is boiling, then save some water.';
      if(!d.steps[0].done&&p.reserve>=10&&!n.produce)d.try='Prepare the produce and oil, then carry the produce into the pan before adding your saved-water splash.';
      if(!d.steps[0].done&&p.drained&&p.reserve<10)d.unavailable='The jug is empty and the pasta is drained. Practice a saved-water splash in a fresh cook.';
      if(s.rescue&&s.rescue.id==='starchy'){var dilution=R.dilutionCheck(s);poured=last(s,['pour','water','pourPlain']);liquid=Math.max(poured,last(s,['crushTomato']));d.question='How do the two water supplies change this sauce?';d.steps=[step('Record a starting spoon check',dilution.baselineAt!==null),step('Add a measured amount from a chosen supply',poured>=0),step('Fold the latest liquid through',poured>=0&&mixed>liquid&&!needsMix),step('Record a fresh check after your fold',poured>=0&&mixed>liquid&&checked>mixed&&n.combined&&(s.mixingModel!==2||!needsMix))];d.notice=p.reserve+' mL reduced cooking water · '+p.plainWater+' mL plain water remaining · '+(s.mixingModel===2?(needsMix?'Separate added liquid remains visible.':'No distinct added-liquid pool is visible.') : Math.round(mix.liquidSinceMix)+' mL awaiting a fold.');d.next=!d.steps[0].done?route('check','pan','pan'):!d.steps[1].done?route('pour','bench','pan'):!d.steps[2].done?route('stir','pan','pan'):route('check','pan','finish');d.try=!d.steps[0].done?'Draw a spoon trail to record the starting flow and coating.':!d.steps[1].done?'Open water choices. Inspect the two supply labels and choose a measured amount.':!d.steps[2].done?'Fold the added liquid through before comparing the sauce.':'Draw another spoon trail and compare the layer on the spoon with your starting check.';delete d.unavailable;if(!d.steps[1].done&&p.reserve<10&&p.plainWater<10)d.unavailable='Both supplied water vessels are empty. Inspect this result and review your recorded choices.';}
      if(s.rescue&&s.rescue.id==='cooled'){
        var coolingRecords=(s.log||[]).filter(function(e){return e.accepted&&e.inspection&&e.inspection.kind==='sauce';}).map(function(e){return e.inspection;}),coolingLatest=coolingRecords[coolingRecords.length-1];
        d.mark='03 / COMPARE';d.question='What changes between the starting sauce and a fresh check?';d.notice=coolingRecords.length+' spoon checks recorded.'+(coolingLatest?' Latest check at '+coolingLatest.time+' simulated seconds.':'');delete d.unavailable;
        if(s.mode==='demonstrate'&&!s.submitted){
          d.observationOnly=true;d.observedCount=coolingRecords.length;d.steps=[step('Record a starting spoon check',coolingRecords.length>0),step('Record another spoon check for comparison',coolingRecords.length>1)];d.next=route('check','pan','pan');
          d.try=!coolingLatest?'Draw a spoon trail to record the starting flow, coating, and any oil beads before choosing an adjustment.':!n.tasted?'The dish has changed since your last recorded check. Draw a fresh spoon trail before comparing the observations.':'Compare your recorded checks. Use the flow, coating, and any oil beads to choose your next action; record a fresh check after changing the dish.';
        }else{
          var cooling=R.coolingCheck(s),cooledBody=R.sauceChemistry(s);d.steps=[step('Record the heavy coating while cool',cooling.baselineAt!==null),step('Compare a fresh coating check after adjusting',cooling.met)];
          d.next=cooling.baselineAt===null||!n.tasted?route('check','pan','pan'):needsMix?route('stir','pan','pan'):cooledBody.bodyType==='thick'&&cooledBody.coolingFactor>1?route('heat','pan','pan'):route('check','pan','pan');
          if(needsMix&&cooling.baselineAt!==null)d.next=route('stir','pan','pan');
          d.try=cooling.baselineAt===null?'Record the starting spoon trail while the sauce is cool and heavy. Observe before choosing an adjustment.':needsMix?'Fold the added water or released tomato juice through, then draw a fresh spoon trail.':!n.tasted?'Draw a fresh spoon trail and compare it with your starting observation.':cooledBody.bodyType==='thick'&&cooledBody.coolingFactor>1?'You could test gentle warming in short steps, then compare a fresh check. Adding liquid or pressing softened tomatoes changes the mixture too; choose an approach and observe its effects.':'Use your recorded flow, coating, and oil beads to decide whether another adjustment is needed, then check again.';
        }
      }
      if(s.rescue&&s.rescue.id==='fragile'){
        if(s.mode==='demonstrate'&&!s.submitted){
          var recorded=(s.log||[]).filter(function(e){return e.accepted&&e.inspection&&e.inspection.kind==='sauce';}).map(function(e){return e.inspection;}),first=recorded[0],latest=recorded[recorded.length-1],elapsed=latest?Math.max(0,s.time-latest.time):0,span=latest&&first?latest.time-first.time:0;
          d.observationOnly=true;d.observedCount=recorded.length;d.question='What do your recorded checks show across a pause?';
          d.steps=[step('Record a starting spoon check',recorded.length>0),step('Record another spoon check for comparison',recorded.length>1),step('Record checks at least 2 minutes apart',recorded.length>1&&span>=120)];
          d.notice=recorded.length+' spoon checks recorded.'+(latest?' Latest check at '+latest.time+' simulated seconds; '+elapsed+' seconds have passed since that check.':'');d.next=route('check','pan','pan');
          d.try=!latest?'Draw a spoon trail to record the starting flow, coating, and any oil beads before choosing an adjustment.':!n.tasted?'The dish has changed since your last recorded check. Draw a fresh spoon trail and compare the flow, coating, and any oil beads before deciding what to do.':span>=120?'Compare your recorded checks across the pause. Use the flow, coating, and any oil beads to decide what the observations show.':elapsed>=120?'At least two simulated minutes have passed since the recorded check. Draw a fresh spoon trail to compare the observations.':'Use your recorded observation to choose the next action. To compare across a pause, advance in short steps and draw a fresh spoon trail after two simulated minutes.';
        }else{
          var stability=R.emulsionCheck(s),chemistry=R.sauceChemistry(s),body=chemistry.bodyType||chemistry.type,needsAdjustment=chemistry.oilDroplets||body==='dry'||body==='thick'||body==='watery';
          d.question='Does the first smooth coating stay together?';d.steps=[step('Record the separate oil in a starting check',stability.baselineAt!==null),step('Record a coating check after adjusting',stability.firstCheckAt!==null),step('Compare a fresh coating after a 2-minute pause',stability.met)];d.notice=p.reserve+' mL saved cooking water remaining · '+stability.observedSeconds+' of '+stability.requiredSeconds+' simulated seconds between coating checks.';d.next=!d.steps[0].done?route('check','pan','pan'):needsMix||needsAdjustment?route('stir','pan','pan'):route('check','pan','pan');d.try=!d.steps[0].done?'Draw a spoon trail. Compare the body and separate oil before changing the mixture.':needsMix?'Fold the added liquid through, then check. Further adjustments restart the coating comparison.':needsAdjustment?'Choose an adjustment using the flow, coating, and oil beads. Fold any added liquid through, then record another check.':!d.steps[1].done?'Draw a spoon trail to record the first continuous coating.':stability.waitingSeconds<stability.requiredSeconds?'Advance in short steps until at least two simulated minutes have passed from the coating check, then draw a fresh trail. Further adjustments restart the comparison.':'Draw a fresh spoon trail and compare it with the earlier coating. Has oil separated again?';
        }
        delete d.unavailable;
      }
    }else{
      d={id:'prep',name:'Prep designer',mark:'01 / PREPARE',question:'Can you make a batch of similar pieces?',steps:[step('Wash hands and rinse the produce',v.hands&&v.rinsed&&last(s,['wash'])>=0&&last(s,['rinse'])>=0),step('Finish even cuts at the recipe target',v.cut&&cuts.even&&cuts.onTarget&&last(s,['cut','finishCuts'])>=0),step('Prepare every garlic clove',R.garlicPreparation(s).complete&&last(s,['garlicPrep','minceGarlic'])>=0)],notice:'Cuts: '+cuts.widths.join(', ')+' mm · target '+cuts.target+' mm. '+R.garlicPreparation(s).summary};
      d.next=!d.steps[0].done?sanitationRoute(s):!d.steps[1].done?route('cut','prep','prep'):route('mince','garlic','prep');
      d.try=!d.steps[0].done?'Wash hands and rinse produce using the preparation controls.':!d.steps[1].done?'Follow the ruler to draw cuts across the board at the recipe spacing. Compare the actual widths, then carry the knife handle to its rest and release to finish the batch.':'Press down on each clove, lift, and release. Repeat until all the cloves are minced.';
      if(!s.rescue&&n.produce&&!d.steps[1].done){
        var remainingGarlic=!d.steps[2].done&&v.hands&&!n.garlic&&!R.garlicPreparation(s).complete&&!R.serving(s).started;
        d.retry='These cuts are already cooking. Practice target-width cuts in a fresh cook. Completed preparation steps are kept.';
        d.blocked=!remainingGarlic;d.next=remainingGarlic?route('mince','garlic','prep'):null;
        d.try=d.retry+(remainingGarlic?' You can still press down on each remaining garlic clove, lift, and release until every clove is minced.':'');
      }
      if(s.rescue)d.unavailable='This rescue supplies the preparation. Practice this quest in a full recipe.';
    }
    if(id==='sauce'&&s.mixingModel===2&&!d.observationOnly&&needsMix&&d.next&&d.next.tool==='stir')d.try+=' Each completed mix redistributes part of the liquid. A larger batch can need further mixing; inspect the pool, coating, and oil after each step.';
    if(d.next&&d.next.tool==='wash')d.try='Start at the handwashing station. Wet hands, add soap, scrub palms, backs, finger spaces, thumbs and fingertips for 20 active seconds, rinse and dry, then release. Completed quest steps stay recorded.';
    if(d.next&&d.next.tool==='rinse')d.try='Carry the produce basket level to the sink, lower under running water, circle through all eight representative surfaces, lift to drain, return to the board, then tip and release. Completed quest steps remain recorded.';
    if(p.lid==='covered'&&d.next&&['pasta','check','ladle','drain'].includes(d.next.tool)){d.next=route('lid','lid','pot','lidPlace');d.try='Lift the lid by its handle, carry it level to its rest, then lower and release before working with the pot. Completed quest steps stay recorded.';}
    // Keep earned practice steps, but do not coach a physical repair of damage
    // the model cannot reverse. Earlier protocols and demonstration stay intact.
    if(needsFreshAttempt(s,id)){
      d.next=route('check','pan','finish');
      d.try='Scorching cannot be undone. Start a fresh '+(s.rescue?'rescue':'cook')+' to practice this repair. You can record a final spoon check and review this attempt; adding water, folding, or warming will not remove the damage.';
    }
    if(d.unavailable)d.steps.forEach(function(item){item.done=false;});
    d.count=d.steps.filter(function(item){return item.done;}).length;
    d.complete=!d.observationOnly&&d.count===d.steps.length;
    return d;
  }
  function node(tag,text,cls){var e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
  function mount(host){
    var panel=node('details',null,'skill-quests'),summary=node('summary'),caption=node('strong','Skill quests'),total=node('span'),body=node('div',null,'quest-body'),choices=node('div',null,'quest-choices'),buttons={},selected='prep',view=null,locked=false,lastSignature=null;
    panel.id='skillQuests';summary.append(caption,total);panel.append(summary,body);body.append(node('p','Pick a small experiment. Progress follows your cooking actions; explore at your own pace.','quest-intro'),choices);choices.setAttribute('role','group');choices.setAttribute('aria-label','Choose a skill quest');
    var content=node('section',null,'quest-content'),mark=node('p',null,'quest-mark'),title=node('h3'),question=node('p',null,'quest-question'),steps=node('ol',null,'quest-steps'),instruction=node('p',null,'quest-instruction'),notice=node('p',null,'quest-notice'),status=node('p',null,'quest-status'),actions=node('div',null,'quest-actions'),handle=node('button'),keyboard=node('button','Use step controls'),live=node('p',null,'quest-live');
    content.id='questContent';title.id='questTitle';content.setAttribute('aria-labelledby',title.id);instruction.id='questInstruction';notice.id='questNotice';status.id='questStatus';handle.id='questTry';keyboard.id='questKeyboard';handle.type=keyboard.type='button';live.id='questAnnouncement';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
    content.append(mark,title,question,steps,instruction,notice,status,actions);actions.append(handle,keyboard);body.append(content,live);document.querySelector('.camera-row').after(panel);
    ids.forEach(function(id){var b=node('button'),name=node('strong'),count=node('span');b.type='button';b.dataset.quest=id;b.setAttribute('aria-controls',content.id);b.append(name,count);choices.append(b);buttons[id]={button:b,name:name,count:count};b.addEventListener('click',function(){host.pause();selected=id;lastSignature=null;render(view,locked);live.textContent=title.textContent+' selected. '+question.textContent;});});
    var rows=[];function fitRows(count){while(rows.length>count)rows.pop().row.remove();while(rows.length<count){var row=node('li'),badge=node('span',null,'quest-step-mark'),label=node('span');badge.setAttribute('aria-hidden','true');row.append(badge,label);steps.append(row);rows.push({row:row,badge:badge,label:label});}}
    function render(s,historical){
      if(!s)return;view=s;locked=!!historical;var all=ids.map(function(id){return describe(s,id);}),d=describe(s,selected),completed=all.filter(function(q){return q.complete;}).length;
      total.textContent=all.some(function(q){return q.observationOnly;})?'Recorded observations':completed+' of 3 practiced';all.forEach(function(q){var b=buttons[q.id];b.name.textContent=q.name;b.count.textContent=q.observationOnly?q.observedCount+' spoon checks':q.unavailable?'Full recipe quest':q.count+' / '+q.steps.length+' steps';b.button.setAttribute('aria-pressed',String(q.id===selected));});
      mark.textContent=d.mark;title.textContent=d.name;question.textContent=d.question;fitRows(d.steps.length);rows.forEach(function(row,i){var done=d.steps[i].done;row.row.classList.toggle('quest-step-done',done&&!d.observationOnly);row.badge.textContent=done&&!d.observationOnly?'✓':String(i+1);row.label.textContent=d.steps[i].label+(done?d.observationOnly?' · recorded':' · practiced':'');});
      instruction.textContent=needsFreshAttempt(s,selected)?d.try:d.complete?d.steps.length+' steps practiced. Keep observing your dish, or explore another quest.':d.try;notice.textContent=(locked?'Recorded observation: ':'On your bench: ')+d.notice;status.textContent=locked?'Replay is read-only. Return to your current cook to practice.':d.unavailable||d.retry||(d.observationOnly?'This sequence lists recorded checks, not a verdict about the sauce. Outcome review appears after submission.':'These steps record practice. Dish quality still comes from your cooking checks.');
      handle.disabled=keyboard.disabled=locked||host.ended()||!!d.unavailable||!!d.blocked||d.complete;set3D();
      var signature=JSON.stringify(d.steps.map(function(item){return item.done;}));if(panel.open&&!locked&&lastSignature!==null&&signature!==lastSignature)live.textContent=d.observationOnly?d.observedCount+' spoon checks recorded. '+d.try:d.name+': '+d.count+' of '+d.steps.length+' steps practiced. '+(d.complete?'Explore another quest when you like.':d.try);lastSignature=signature;
    }
    function set3D(){handle.textContent=host.has3D()?'Try on the bench':'Open practice controls';}
    function open(keyboardMode){if(view&&!locked&&!host.ended()){var d=describe(view,selected);if(!d.unavailable&&!d.blocked&&!d.complete)host.open(d.next,keyboardMode);}}
    handle.addEventListener('click',function(){open(false);});keyboard.addEventListener('click',function(){open(true);});panel.addEventListener('toggle',function(){if(panel.open)host.pause();});
    return {render:render,set3D:set3D};
  }
  var api={ids:ids,describe:describe,mount:mount};root.KitchenSkillQuests=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
