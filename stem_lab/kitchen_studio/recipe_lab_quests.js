/* Optional skill quests read the cook's evidence; opening a quest never cooks. */
(function(root){
  'use strict';
  var ids=['prep','pan','sauce'];
  function recipes(){return root.KitchenRecipes;}
  function last(s,actions){var index=-1;(s.log||[]).forEach(function(e,i){if(e.accepted&&actions.indexOf(e.action)!==-1)index=i;});return index;}
  function step(label,done){return {label:label,done:!!done};}
  function route(tool,view,zone,action){return {tool:tool,view:view,zone:zone,action:action};}
  function produceRoute(s){
    if(!s.prep.hands||!s.prep.rinsed)return route('sanitation','prep','prep',!s.prep.hands?'wash':'rinse');
    if(!s.prep.cut)return route('cut','prep','prep');
    return route('move','bench','pan',s.pan.oil?'produce':'oil');
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
  function describe(s,id){
    var R=recipes(),p=s.pot,n=s.pan,v=s.prep,red=s.id==='tomato',cuts=R.cutProfile(s),tomatoes=R.tomatoHandling(s),mix=R.mixing(s),d;
    if(id==='pan'){
      var soft=R.panSurface(s).pieces.some(function(piece){return piece.soft>=.85;});
      d={id:'pan',name:red?'Softness detective':'Pan explorer',mark:red?'02 / SOFTEN':'02 / TURN',question:red?'When does a firm wedge become ready to press?':'What does turning a slice reveal?',steps:[step('Carry prepared produce into the pan',n.produce&&last(s,['produce'])>=0),step(red?'Observe a softened tomato piece':'Place a piece deliberately',red?n.produce&&(soft||last(s,['crushTomato'])>=0):last(s,['movePiece','spreadPan'])>=0),step(red?'Press a softened piece to release juice':'Turn a piece and compare its sides',red?last(s,['crushTomato'])>=0&&tomatoes.split+tomatoes.crushed>0:last(s,['flipPiece'])>=0)],notice:red?tomatoes.summary:R.panSurface(s).summary};
      d.next=!d.steps[0].done?produceRoute(s):red&&!d.steps[1].done?route('heat','pan','pan'):route(red?'crush':d.steps[1].done?'turn':'arrange',red?'pan':d.steps[1].done?'turn':'pan','pan');
      d.try=!d.steps[0].done?'Prepare the produce and oil, then carry the produce to the pan.':red&&!d.steps[1].done?'Choose the pan heat and advance in small steps. Watch the wedges change before pressing.':red?'Press down on a softened wedge, lift, and release. Notice the finite juice it adds.':!d.steps[1].done?'Drag a slice to a new spot. Compare its space with neighboring pieces.':'Slide the spatula right under a slice, lift up, sweep left to turn it, then lower and release. Compare the two faces.';
      if(s.rescue)d.unavailable='This rescue supplies the prepared pan. Explore its food freely; practice this quest in a full recipe.';
      else if(s.panModel!==2||(red&&s.tomatoModel!==1))d.unavailable='This earlier cook uses a batch model. Start a fresh cook to explore individual pieces.';
    }else if(id==='sauce'){
      var poured=last(s,['pour','water']),liquid=Math.max(poured,last(s,['crushTomato'])),mixed=last(s,['stirPan','stirSweep','combine']),checked=last(s,['taste']);
      d={id:'sauce',name:'Sauce scientist',mark:'03 / FOLD',question:'How does a splash change after you fold it through?',steps:[step('Add a measured splash of saved water',poured>=0&&n.waterAdded>0),step('Fold the latest liquid through the pan',poured>=0&&mixed>liquid&&mix.liquidSinceMix===0),step('Check the sauce after your latest fold',poured>=0&&mixed>liquid&&checked>mixed&&n.combined)],notice:p.reserve+' mL in the jug · '+n.waterAdded+' mL added · '+Math.round(mix.liquidSinceMix)+' mL awaiting a fold.'};
      d.next=!d.steps[0].done?savedWaterRoute(s):!d.steps[1].done?route('stir','pan','pan'):!p.drained?(p.sample?route('drain','bench','pot'):route('check','pot','pot')):!n.combined?route('combine','bench','finish','combine'):route('check','pan','finish');
      d.try=!d.steps[0].done?(p.reserve>=10?'Lift the saved-water jug over the pan. Tilt gently, then stop the pour.':'Cook pasta and save some of its water before draining. The jug supplies your measured splash.'):!d.steps[1].done?(n.combined?'Gather with a full circle, draw inward to fold, then release. Watch separate liquid fold into the sauce.':'Sweep a full circle through the pan, then release. Watch the liquid redistribute.'):!n.combined?'Drain and combine your pasta when ready, then draw a track through a sauce sample.':'Draw a track through a sauce sample. Observe whether it stays open or closes; adjust and check again if needed.';
      if(!d.steps[0].done&&d.next.tool==='weigh')d.try='Weigh your recipe portion first. Then cook the pasta and save some water before draining.';
      if(!d.steps[0].done&&d.next.tool==='heat')d.try='Choose the pot heat and advance in small steps. Add your weighed pasta once the water is boiling, then save some water.';
      if(!d.steps[0].done&&p.reserve>=10&&!n.produce)d.try='Prepare the produce and oil, then carry the produce into the pan before adding your saved-water splash.';
      if(!d.steps[0].done&&p.drained&&p.reserve<10)d.unavailable='The jug is empty and the pasta is drained. Practice a saved-water splash in a fresh cook.';
    }else{
      d={id:'prep',name:'Prep designer',mark:'01 / PREPARE',question:'Can you make a batch of similar pieces?',steps:[step('Wash hands and rinse the produce',v.hands&&v.rinsed&&last(s,['wash'])>=0&&last(s,['rinse'])>=0),step('Finish even cuts at the recipe target',v.cut&&cuts.even&&cuts.onTarget&&last(s,['cut','finishCuts'])>=0),step('Prepare every garlic clove',R.garlicPreparation(s).complete&&last(s,['garlicPrep','minceGarlic'])>=0)],notice:'Cuts: '+cuts.widths.join(', ')+' mm · target '+cuts.target+' mm. '+R.garlicPreparation(s).summary};
      d.next=!d.steps[0].done?route('sanitation','prep','prep',!v.hands?'wash':'rinse'):!d.steps[1].done?route('cut','prep','prep'):route('mince','garlic','prep');
      d.try=!d.steps[0].done?'Wash hands and rinse produce using the preparation controls.':!d.steps[1].done?'Draw cuts across the board at the recipe spacing. Compare the widths, then finish the batch.':'Press down on each clove, lift, and release. Repeat until all the cloves are minced.';
      if(s.rescue)d.unavailable='This rescue supplies the preparation. Practice this quest in a full recipe.';
    }
    if(d.unavailable)d.steps.forEach(function(item){item.done=false;});
    d.count=d.steps.filter(function(item){return item.done;}).length;
    d.complete=d.count===d.steps.length;
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
    var rows=[0,1,2].map(function(i){var row=node('li'),badge=node('span',null,'quest-step-mark'),label=node('span');badge.setAttribute('aria-hidden','true');row.append(badge,label);steps.append(row);return {row:row,badge:badge,label:label};});
    function render(s,historical){
      if(!s)return;view=s;locked=!!historical;var all=ids.map(function(id){return describe(s,id);}),d=describe(s,selected),completed=all.filter(function(q){return q.complete;}).length;
      total.textContent=completed+' of 3 practiced';all.forEach(function(q){var b=buttons[q.id];b.name.textContent=q.name;b.count.textContent=q.unavailable?'Full recipe quest':q.count+' / 3 steps';b.button.setAttribute('aria-pressed',String(q.id===selected));});
      mark.textContent=d.mark;title.textContent=d.name;question.textContent=d.question;rows.forEach(function(row,i){var done=d.steps[i].done;row.row.classList.toggle('quest-step-done',done);row.badge.textContent=done?'✓':String(i+1);row.label.textContent=d.steps[i].label+(done?' · practiced':'');});
      instruction.textContent=d.complete?'Three steps practiced. Keep observing your dish, or explore another quest.':d.try;notice.textContent=(locked?'Recorded observation: ':'On your bench: ')+d.notice;status.textContent=locked?'Replay is read-only. Return to your current cook to practice.':d.unavailable||'These steps record practice. Dish quality still comes from your cooking checks.';
      handle.disabled=keyboard.disabled=locked||host.ended()||!!d.unavailable||d.complete;set3D();
      var signature=JSON.stringify(d.steps.map(function(item){return item.done;}));if(panel.open&&!locked&&lastSignature!==null&&signature!==lastSignature)live.textContent=d.name+': '+d.count+' of 3 steps practiced. '+(d.complete?'Explore another quest when you like.':d.try);lastSignature=signature;
    }
    function set3D(){handle.textContent=host.has3D()?'Try on the bench':'Open practice controls';}
    function open(keyboardMode){if(view&&!locked&&!host.ended()){var d=describe(view,selected);if(!d.unavailable&&!d.complete)host.open(d.next,keyboardMode);}}
    handle.addEventListener('click',function(){open(false);});keyboard.addEventListener('click',function(){open(true);});panel.addEventListener('toggle',function(){if(panel.open)host.pause();});
    return {render:render,set3D:set3D};
  }
  var api={ids:ids,describe:describe,mount:mount};root.KitchenSkillQuests=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
