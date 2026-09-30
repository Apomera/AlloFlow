/* Workspace presentation shares the existing tools, clock, and recipe state. */
(function(root){
  'use strict';
  var catalog=[
    ['weigh','prep','Weigh pasta','Lift & tilt','Lift the packet over the scale, then pull down to pour.','M5 4h6v8H5zM15 14h6v5h-6zM3 19h9M16 5l3 5'],
    ['cut','prep','Cut produce','Draw a cut','Start at a width on the board and draw a straight cut.','M5 3v12h6V3M5 15v6M16 17h5'],
    ['mince','prep','Mince garlic','Press & lift','Start on a clove; press down, lift back up, and release.','M5 4v11h6V4M5 15v6M17 15c-5 0-5 6 0 6s5-6 0-6'],
    ['dry','prep','Dry produce','Blot & wring','Carry the cloth onto wet produce; wring it over the bowl.','M4 5h15v12H4zM8 5v12M4 9h15M17 20h4'],
    ['oil','prep','Measure olive oil','Tilt, level & carry','Fill the marked cup, level the bottle, then carry the recipe measure to the pan.','M4 3h6v5l3 4v9H2v-9l2-4zM16 10h6l-1 11h-4z'],
    ['pot-stir','pot','Separate pasta','Sweep the spoon','Sweep through the visible clumps inside the pot.','M4 11h14v8H4zM2 12h2M18 12h3M12 3l-3 12'],
    ['sample','pot','Check pasta','Carry, press & lift','Carry a fork sample to the small saucer; press down, lift back, then release.','M6 3v7M10 3v7M14 3v7M6 8h8M10 10v11M17 18h5'],
    ['ladle','pot','Save water','Dip & carry','Dip the ladle in the pot, then carry it to the jug.','M16 3l-6 12M5 15c-2 5 7 7 8 2M18 14h4v7h-6v-7z'],
    ['drain','pot','Drain pasta','Lift & tilt','Move the pot over the colander, then pull down to tilt.','M4 4l12 3-3 8-12-3zM14 17h8l-2 5h-4z'],
    ['stir','pan','Stir & fold','Trace a circle','Sweep a full circle through the sauce pan.','M4 13a7 5 0 1 0 14 0a7 5 0 1 0-14 0M16 4l-5 10M18 12l4-4'],
    ['inspect','pan','Inspect food','Slide the lens','Drag across visible pieces to look closely; keep a view to compare.','M15 15l6 6M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14'],
    ['turn','pan','Turn a slice','Slide, lift & lower','Slide right underneath a slice, lift, sweep left to turn, then lower and release.','M4 15h9v5H4zM8 15V4M17 5l4 4-4 4M21 9h-7'],
    ['arrange','pan','Turn & spread','Move each piece','Drag pieces to give them room; tap a piece to turn it.','M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M8 9h3M14 14h3M8 16h2'],
    ['crush','pan','Press tomatoes','Press & release','Press softened tomato pieces to release their juice.','M12 3v12M6 15h12v5H6zM9 15v5M15 15v5'],
    ['pour','pan','Add saved water','Carry & pour','Hold the saved-water jug over the pan to add a splash.','M4 4h10v14H6zM14 7h4v6h-4M19 19l2 2'],
    ['pan','pan','Move off heat','Lift to trivet','Carry the pan onto the trivet to remove its heat source.','M3 14a6 4 0 1 0 12 0a6 4 0 1 0-12 0M15 13l6-4M17 18h5M17 21h5'],
    ['serve','serve','Share the dish','Scoop & balance','Carry spoonfuls onto plates; return some to rebalance.','M2 16a5 4 0 1 0 10 0a5 4 0 1 0-10 0M14 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 3l-4 8'],
    ['burner','general','Turn the heat','Rotate a dial','Turn a stove dial; release to apply its preview heat setting.','M12 3a9 9 0 1 0 9 9M12 7v5l4 2M17 2h5v5'],
    ['move','general','Move ingredients','Carry to cookware','Drag ingredients to the matching cookware.','M4 8h7v11H4zM8 4h9M14 1l3 3-3 3M15 13h6v7h-6z'],
    ['camera','general','Explore the bench','Orbit & zoom','Drag to orbit; scroll or pinch to zoom.','M3 8h5l2-3h5l2 3h4v12H3zM9 14a3 3 0 1 0 6 0a3 3 0 1 0-6 0']
  ];
  function definition(id){return catalog.find(function(t){return t[0]===id;})||catalog[catalog.length-2];}
  function availability(s,id,locked){
    var R=root.KitchenRecipes,ready=true,label='Ready',detail=definition(id)[4],p=s.pot,n=s.pan,v=s.prep;
    if(locked)return {ready:false,label:'View only',detail:'This is a recorded or finished kitchen. Explore it with the camera.'};
    if(R.serving(s).started&&id!=='serve'&&id!=='pan'&&id!=='inspect'&&id!=='camera')return {ready:false,label:'Serving in progress',detail:'Return all spoonfuls to the pan before using other cooking tools.'};
    function need(condition,message){if(condition){ready=false;label='Before you start';detail=message;}}
    if(id==='weigh')need(p.pasta,'This portion is already cooking. Weigh again in a fresh cook.');
    if(id==='cut'){need(v.cut||n.produce,'These cuts are already prepared. Start a fresh sample in the cutting controls to recut.');if(!v.hands||!v.rinsed)need(true,'Wash hands and rinse the produce in the preparation controls first.');}
    if(id==='mince'){need(v.garlic||n.garlic,'The garlic is already minced. Carry its bowl into the pan when ready.');if(!v.hands)need(true,'Wash hands before preparing the garlic.');}
    if(id==='dry')need(!R.drying(s).enabled||!v.hands||!v.rinsed||n.produce,'Wash hands and rinse produce before blotting it on the board.');
    if(id==='pot-stir')need(s.pastaModel!==1||!p.pasta||p.drained||!p.water,'Add the weighed pasta to boiling water before separating its strands.');
    if(id==='oil')need(!root.KitchenOil.info(s,0,false).ready,'The measured recipe oil is already added, or this cook is read-only.');
    if(id==='sample')need(!root.KitchenSampling.available(s,false).ready,root.KitchenSampling.available(s,false).detail);
    if(id==='ladle')need(!R.waterHandling(s).scoop,'The pot needs cooking water and pasta, with room left in the saved-water allowance.');
    if(id==='drain')need(!p.pasta||p.drained||!p.sample,p.drained?'The pasta is drained. Carry the colander into the sauce pan.':'Check a pasta sample before lifting the pot to drain.');
    if(id==='turn')need(!root.KitchenTurning.available(s,0,false).ready,root.KitchenTurning.available(s,0,false).detail);
    if(id==='inspect')need(!root.KitchenFoodLens.available(s),'Add prepared produce to the pan to examine its pieces.');
    if(id==='stir'||id==='arrange')need(!n.produce||id==='arrange'&&s.panModel!==2,'Add prepared produce to the pan before working with its pieces.');
    if(id==='crush')need(s.id!=='tomato'||s.tomatoModel!==1||!n.produce,'Use a fresh tomato recipe and add its prepared tomatoes to the pan.');
    if(id==='pour')need(!n.produce||p.reserve<10,'Add produce to the pan and save some pasta water in the jug first.');
    if(id==='serve')need(!R.serving(s).ready,'Combine and check the finished dish, then turn both burners off.');
    return {ready:ready,label:label,detail:detail};
  }
  function target(s,id,hit,locked){
    if(!hit||id==='camera')return null;var name=null;
    if(id==='move')name={oil:'Olive oil',pasta:'Pasta packet',produce:'Prepared produce',garlic:'Garlic bowl',cooked:'Pasta colander'}[hit.item];
    if(id==='oil')name=hit.oilCup?'Oil measuring cup':hit.item==='oil'?'Olive-oil bottle':null;
    if(id==='burner'&&hit.burner)name=(hit.burner==='pot'?'Pot':'Pan')+' burner dial';
    if(id==='weigh')name=hit.scale?'Pasta scale':hit.item==='pasta'?'Pasta packet':null;
    if(id==='cut'&&(hit.board||hit.item==='produce'))name='Cutting board';
    if(id==='mince'&&hit.garlic!==undefined)name='Garlic clove '+(hit.garlic+1);
    if(id==='dry'&&hit.item==='cloth')name='Drying cloth';
    if((id==='pot-stir'||id==='drain'||id==='sample')&&hit.pot)name='Pasta pot';
    if(id==='ladle'&&hit.item==='ladle')name='Ladle';
    if(id==='pour'&&hit.item==='jug')name='Saved-water jug';
    if((id==='stir'||id==='pan'||id==='serve')&&(hit.pan||hit.piece!==undefined))name='Sauce pan';
    if((id==='turn'||id==='arrange'||id==='crush'||id==='inspect')&&hit.piece!==undefined)name='Piece '+(hit.piece+1);
    if(id==='serve'&&hit.servingPlate!==undefined)name='Plate '+(hit.servingPlate+1);
    if(!name)return null;var status=id==='burner'?root.KitchenBurnerDials.available(s,hit.burner,locked):availability(s,id,locked),R=root.KitchenRecipes;if(status.ready&&id==='mince'){var clove=R.garlicPreparation(s).cloves[hit.garlic];if(!clove||clove.stage===3)status={ready:false,detail:'This clove is already minced. Choose another clove.'};}if(status.ready&&id==='crush'){var tomato=R.tomatoHandling(s).pieces[hit.piece];if(!tomato||tomato.stage===2)status={ready:false,detail:'This piece has released its juice. Fold it through the sauce.'};}if(status.ready&&id==='serve'){var portion=R.serving(s);if(hit.servingPlate!==undefined&&!portion.plates[hit.servingPlate])status={ready:false,detail:'This plate is empty. Carry a spoonful from the pan onto it.'};else if(hit.servingPlate===undefined&&!portion.remaining)status={ready:false,detail:'The pan is empty. Rebalance the plates or finish serving.'};}return {name:name,ready:status.ready,detail:status.detail};
  }
  function mountTools(host){
    var $=function(id){return document.getElementById(id);},group='general',lastTool=null,container=host.container,shelf=document.createElement('div');shelf.className='kitchen-tool-shelf';
    shelf.innerHTML='<nav class="kitchen-tool-groups" aria-label="3D tool groups">'+[['general','Bench'],['prep','Prep'],['pot','Pasta pot'],['pan','Sauce pan'],['serve','Serve']].map(function(g){return '<button type="button" data-tool-group="'+g[0]+'" aria-pressed="false">'+g[1]+'</button>';}).join('')+'</nav><div class="kitchen-tool-cards" role="group" aria-label="Choose a hands-on tool">'+catalog.map(function(t){return '<button type="button" data-kitchen-tool="'+t[0]+'" data-group="'+t[1]+'" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="'+t[5]+'"/></svg><span><strong>'+t[2]+'</strong><small>'+t[3]+'</small></span></button>';}).join('')+'</div><div class="kitchen-tool-context"><strong id="workspaceToolName"></strong><span id="workspaceToolStatus"></span><p id="workspaceToolInstruction"></p></div>';
    container.prepend(shelf);var row=document.createElement('div');row.className='kitchen-tool-options';var label=$('sceneKitchenTool').closest('label');label.firstChild.textContent='All tools';row.append(label,$('sceneKeyboardTools'));shelf.after(row);
    var guide=document.createElement('details');guide.id='sceneGestureGuide';guide.innerHTML='<summary>Detailed gesture guide</summary>';guide.append($('sceneToolHelp'));container.append(guide);
    var feedback=document.createElement('div');feedback.className='kitchen-action-feedback';feedback.append($('sceneActionStatus'));$('recipeScene').after(feedback);
    var hint=document.createElement('div');hint.id='sceneTargetHint';hint.className='kitchen-target-hint';hint.hidden=true;hint.setAttribute('aria-hidden','true');hint.innerHTML='<strong></strong><span></span>';$('recipeScene').append(hint);
    var coach=document.createElement('div');coach.id='sceneGestureCoach';coach.className='kitchen-gesture-coach';coach.hidden=true;coach.innerHTML='<div class="gesture-heading"><span id="gestureTitle"></span><span class="gesture-clock">Clock paused</span></div><strong id="gestureInstruction"></strong><p id="gestureDetail"></p><progress id="gestureProgress" max="100" value="0" aria-label="Movement progress"></progress><span class="gesture-exit">Release to put down · Esc to cancel</span>';$('recipeScene').append(coach);
    var announce=document.createElement('p');announce.id='sceneGestureAnnouncement';announce.className='gesture-announcement';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');announce.setAttribute('aria-atomic','true');feedback.append(announce);
    var guidesOn=true,lastPhase='',lastGuide='',guideToggle=document.createElement('button');try{guidesOn=localStorage.getItem('alloflow-kitchen-movement-hints')!=='off';}catch(e){}guideToggle.id='sceneGuideToggle';guideToggle.type='button';guideToggle.textContent='Movement hints';guideToggle.setAttribute('aria-pressed',String(guidesOn));document.querySelector('.camera-row>div').append(guideToggle);guideToggle.addEventListener('click',function(){host.cancel();guidesOn=!guidesOn;guideToggle.setAttribute('aria-pressed',String(guidesOn));try{localStorage.setItem('alloflow-kitchen-movement-hints',guidesOn?'on':'off');}catch(e){}});
    function gesture(info){if(!guidesOn||!info){coach.hidden=true;lastGuide='';lastPhase='';announce.textContent='';return;}hint.hidden=true;coach.hidden=false;var signature=JSON.stringify(info);if(signature===lastGuide)return;lastGuide=signature;coach.dataset.phase=info.phase;coach.dataset.invalid=String(info.invalid);coach.dataset.over=String(info.over);$('gestureTitle').textContent=info.title;$('gestureInstruction').textContent=info.instruction;$('gestureDetail').textContent=info.detail;var meter=$('gestureProgress');meter.hidden=info.progress===null;if(info.progress!==null){meter.value=Math.round(info.progress*100);meter.setAttribute('aria-label',info.progressLabel);}var phase=info.title+info.phase;if(phase!==lastPhase){lastPhase=phase;announce.textContent=info.title+'. '+info.instruction;}}
    function choose(id){if(host.locked())return;host.choose(id);}
    shelf.querySelectorAll('[data-tool-group]').forEach(function(b){b.addEventListener('click',function(){group=b.dataset.toolGroup;var selected=definition(host.tool());choose(selected[1]===group?selected[0]:catalog.find(function(t){return t[1]===group;})[0]);});});
    shelf.querySelectorAll('[data-kitchen-tool]').forEach(function(b){b.addEventListener('click',function(){choose(b.dataset.kitchenTool);});});
    function render(s){var id=host.tool(),t=definition(id),status=availability(s,id,host.locked());if(id!==lastTool)group=t[1];lastTool=id;shelf.querySelectorAll('[data-tool-group]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.toolGroup===group));b.disabled=host.locked();});shelf.querySelectorAll('[data-kitchen-tool]').forEach(function(b){b.hidden=b.dataset.group!==group;b.setAttribute('aria-pressed',String(b.dataset.kitchenTool===id));b.disabled=host.locked();});$('workspaceToolName').textContent=t[2];$('workspaceToolStatus').textContent=status.label;$('workspaceToolStatus').dataset.ready=String(status.ready);$('workspaceToolInstruction').textContent=status.detail;}
    function hover(info){hint.hidden=!info;if(info){hint.querySelector('strong').textContent=info.name;hint.querySelector('span').textContent=info.detail;hint.dataset.ready=String(info.ready);}}
    render(host.getState());return {render:render,hover:hover,gesture:gesture,guidesEnabled:function(){return guidesOn;}};
  }
  function mountStage(host){
    var $=function(id){return document.getElementById(id);},outer=document.querySelector('.recipe-scene'),stage=document.createElement('div'),marker=document.createComment('kitchen workspace'),expanded=false,scrollTop=0,previousOverflow='',lastPlated=false;
    stage.id='kitchenStage';outer.prepend(marker,stage);['.scene-heading','.replay-launch','#recipeReplayControls','.scene-direct-tools','#recipeScene','#recipeFallback','.kitchen-action-feedback','.camera-row','.readouts','.time-controls','.timer-bench-summary','.time-note'].forEach(function(selector){var item=outer.querySelector(selector);if(item)stage.append(item);});
    var heading=stage.querySelector('.scene-heading'),actions=document.createElement('div');actions.className='kitchen-heading-actions';var expand=document.createElement('button');expand.id='expandKitchen';expand.type='button';expand.textContent='Expand kitchen';expand.setAttribute('aria-haspopup','dialog');expand.setAttribute('aria-expanded','false');actions.append(expand,$('textView'));heading.append(actions);
    var dialog=document.createElement('dialog');dialog.id='expandedKitchen';dialog.setAttribute('aria-label','Expanded cooking workspace');document.body.append(dialog);
    var top=document.createElement('button');top.type='button';top.dataset.view='top';top.textContent='Top view';stage.querySelector('.camera-row>div').append(top);top.addEventListener('click',function(){host.view('top');});
    ['pot','pan'].forEach(function(v,i){var box=stage.querySelectorAll('.readouts>div')[i],label=document.createElement('label');label.className='scene-heat-control';label.htmlFor='scene'+v+'Heat';label.textContent=(v==='pot'?'Pot':'Pan')+' burner';var select=document.createElement('select');select.id=label.htmlFor;['Off','Low','Medium','High'].forEach(function(text,i){select.append(new Option(text,String(i)));});label.append(select);box.append(label);select.addEventListener('change',function(){if(!host.ended())host.apply(v+'Heat',Number(select.value));});});
    function resize(){requestAnimationFrame(function(){host.resize();});}
    function exit(restoreFocus){if(!expanded)return;host.cancel();expanded=false;if(dialog.open)dialog.close();marker.after(stage);document.documentElement.style.overflow=previousOverflow;expand.textContent='Expand kitchen';expand.setAttribute('aria-expanded','false');resize();if(restoreFocus!==false){expand.focus({preventScroll:true});window.scrollTo(0,scrollTop);}}
    expand.addEventListener('click',function(){if(expanded){exit();return;}host.cancel();scrollTop=window.scrollY;previousOverflow=document.documentElement.style.overflow;dialog.append(stage);dialog.showModal();expanded=true;document.documentElement.style.overflow='hidden';expand.textContent='Exit expanded view';expand.setAttribute('aria-expanded','true');expand.focus({preventScroll:true});resize();});
    dialog.addEventListener('cancel',function(e){e.preventDefault();exit();});dialog.addEventListener('close',function(){exit();});dialog.addEventListener('click',function(e){if(e.target!==dialog)return;var b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)exit();});
    stage.addEventListener('click',function(e){if(e.target.closest('#sceneKeyboardTools,#openCheckTimers,#textView'))exit(false);},true);
    return {render:function(s,historical){if(s.plated&&!lastPlated)exit(false);lastPlated=s.plated;['pot','pan'].forEach(function(v){var select=$('scene'+v+'Heat');select.value=String(s[v].heat);select.disabled=historical||host.ended()||root.KitchenRecipes.serving(s).started;});},set3D:function(visible){var feedback=stage.querySelector('.kitchen-action-feedback');if(feedback)feedback.hidden=!visible;expand.hidden=!visible;top.disabled=!visible;if(!visible)exit(false);},exit:exit};
  }
  var api={catalog:catalog,definition:definition,availability:availability,target:target,mountTools:mountTools,mountStage:mountStage};root.KitchenWorkspace=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
