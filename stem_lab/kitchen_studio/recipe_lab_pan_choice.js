/* Choose empty cookware deliberately; every lesson reads the existing recipe model. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var choices=['standard','wide'],height=1.56,sources={standard:{x:.05,y:1.35,z:1.53},wide:{x:1.3,y:1.35,z:1.53}};
  function name(choice){return choice==='wide'?'Wide pan':'Standard pan';}
  function validChoice(choice){return choices.indexOf(choice)!==-1;}
  function available(s,choice,locked){
    if(typeof choice==='boolean'){locked=choice;choice=null;}
    var detail=!s||locked||s.plated||s.submitted||s.time>=3600||s.log.length>=1200?'Recorded or finished kitchen. Pan selection is locked.':s.rescue?'The rescue supplies its cookware and cooked ingredients. Choose a pan in a fresh cook.':R.serving(s).started?'Serving has begun. Keep this dish in its chosen pan.':s.pan.oil||s.pan.garlic||s.pan.produce?'This pan contains ingredients. Keep its recorded size; choose another pan before adding oil in a fresh cook.':s.pan.heat?'Turn the pan burner off before choosing empty cookware.':!Number.isFinite(s.pan.temp)||s.pan.temp>30?'The pan is still warm. Let it cool to 30°C or below before choosing empty cookware.':choice!==null&&choice!==undefined&&!validChoice(choice)?'Choose the standard or wide pan.':choice===s.pan.size?'The '+name(choice).toLowerCase()+' is already selected. Try the other pan to make a new choice.':null;
    return {mode:'cookware',cameraView:'cookware',item:'pan-choice',label:validChoice(choice)?name(choice):'Choose empty cookware',name:validChoice(choice)?name(choice):'Empty sauce pan',choice:validChoice(choice)?choice:null,ready:!detail,detail:detail||'Carry the empty pan by its handle onto the highlighted sauce-pan station, then release. The clock stays paused.'};
  }
  function pickup(s,hit,tool,locked){return tool!=='camera'&&hit&&validChoice(hit.panChoice)?available(s,hit.panChoice,locked):null;}
  function worldPoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?{x:p.x,z:p.z}:null;}
  function clientPoint(p,fallback){
    if(p){var x=Number.isFinite(p.x)?p.x:p.clientX,y=Number.isFinite(p.y)?p.y:p.clientY;if(Number.isFinite(x)&&Number.isFinite(y))return {x:x,y:y};}
    return fallback&&Number.isFinite(fallback.u)&&Number.isFinite(fallback.v)?{x:fallback.u,y:fallback.v}:null;
  }
  function traceOf(g){return g&&g.trace?g.trace:g;}
  function target(s){var at=R.panPosition(s);return {x:at.x,z:at.z,radius:.48*(s.pan.size==='wide'?1.08:1)};}
  function over(s,p){var at=target(s);return !!p&&Math.hypot(p.x-at.x,p.z-at.z)<at.radius;}
  function start(s,choice,p,client,locked){
    var point=worldPoint(p),screen=clientPoint(client,p);if(!point||!screen||!available(s,choice,locked).ready||!validChoice(choice))return null;
    var at=sources[choice],position={x:at.x,z:at.z};
    return {source:s,choice:choice,phase:'carry',position:position,current:position,origin:point,clientOrigin:screen,lastClient:screen,maxWorld:0,maxClient:0,moved:false,over:false,invalid:false};
  }
  function move(g,p,client){
    var t=traceOf(g);if(!t)return null;var n=Object.assign({},t),point=worldPoint(p),screen=clientPoint(client,p);
    if(!point||!screen||t.invalid){n.invalid=true;n.over=false;n.phase='retry';return n;}
    n.position=n.current=point;n.lastClient=screen;
    n.maxWorld=Math.max(t.maxWorld||0,Math.hypot(point.x-t.origin.x,point.z-t.origin.z));
    n.maxClient=Math.max(t.maxClient||0,Math.hypot(screen.x-t.clientOrigin.x,screen.y-t.clientOrigin.y));
    n.moved=n.maxWorld>=.22&&n.maxClient>=7;n.over=over(t.source,point);n.phase=n.moved&&n.over?'release':'carry';return n;
  }
  function drop(s,g,locked){
    var t=traceOf(g),point=t&&worldPoint(t.current);return t&&t.source===s&&!t.invalid&&t.moved&&t.maxWorld>=.22&&t.maxClient>=7&&validChoice(t.choice)&&available(s,t.choice,locked).ready&&over(s,point)?t.choice:null;
  }
  function guidance(s,g){
    var t=traceOf(g);if(!t||!validChoice(t.choice))return null;var can=!!s&&t.source===s&&available(s,t.choice,false).ready,above=can&&!t.invalid&&over(s,worldPoint(t.current)),done=above&&t.moved&&!t.invalid,invalid=t.invalid||!can;
    return {tool:'pan-choice',title:'Choose the '+name(t.choice).toLowerCase(),phase:invalid?'retry':done?'release':'carry',instruction:invalid?'Release to return the empty pan. No choice recorded.':done?'Release to keep this pan at the sauce-pan station.':'Carry the empty pan over the highlighted sauce-pan station.',detail:'Empty cookware · preview only · food, temperature and time stay unchanged',progress:invalid?0:done?1:.35,progressLabel:'Carry and release the pan',target:{pan:true},over:above,invalid:invalid};
  }
  function comparison(s){
    if(!s)return null;var q=R.ingredients(s),produce=R.recipe(s.id).produce;
    return {grams:q.produce,servings:s.servings,produce:produce,selected:s.pan.size,choices:choices.map(function(choice){
      var hypothetical=Object.assign({},s,{pan:Object.assign({},s.pan,{size:choice,produce:true})}),crowded=R.inspect(hypothetical).crowded;
      return {id:choice,name:name(choice),grams:q.produce,servings:s.servings,crowded:crowded,selected:choice===s.pan.size,spacing:crowded?'Crowded batch':'Room for this batch',observation:crowded?(s.id==='tomato'?'In this model, a crowded tomato batch retains moisture longer. Watch released juice as the pieces soften.':'In this model, crowding slows moisture escape and can delay mushroom browning.'):choice==='wide'?'The same batch has more room in the wider pan.':'This batch has room in the standard pan.',tradeoff:choice==='wide'?'A wider pan warms more slowly at the same burner setting. More room can help a large batch lose moisture.':'A standard pan warms faster at the same burner setting. Watch for retained moisture when the batch is crowded.'};
    }),modelNote:'Same batch · 14 representative pieces · illustrative model. These pictures show spacing, not measured cookware dimensions.'};
  }
  function decorate(h){
    var T=h.THREE,stored={},held=new T.Group(),state=null,activeChoice=null,labels=[],materials=new Set(),geometries=new Set(),textures=[],disposed=false;
    h.world.add(held);held.name='carried-pan-choice';held.visible=false;held.userData.sceneDecoration=true;
    function mesh(geometry,color,x,y,z,parent,extra,pickable){var o=h.mesh(geometry,color,x,y,z,parent,extra);o.userData.sceneDecoration=!pickable;geometries.add(o.geometry);if(Array.isArray(o.material))o.material.forEach(function(m){materials.add(m);});else materials.add(o.material);return o;}
    function tag(choice,parent){
      var canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;var ctx=canvas.getContext('2d');if(!ctx)return;
      ctx.fillStyle='#f5ecd3';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#507361';ctx.lineWidth=8;ctx.strokeRect(4,4,504,120);ctx.fillStyle='#244a39';ctx.textAlign='center';ctx.font='bold 61px sans-serif';ctx.fillText(choice==='wide'?'WIDE PAN':'STANDARD',256,86);
      var texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;textures.push(texture);var label=mesh(new T.PlaneGeometry(.64,.16),'#ffffff',0,.19,.012,parent,{map:texture,roughness:.9});label.name='pan-choice-nameplate';labels.push(label);
    }
    choices.forEach(function(choice){
      var at=sources[choice],radius=choice==='wide'?.48:.42,group=new T.Group();group.name='stored-'+choice+'-pan';group.userData.kitchenPanChoice=choice;group.position.set(at.x,at.y,at.z);h.world.add(group);stored[choice]=group;
      var body=mesh(new T.CylinderGeometry(radius,radius-.015,.065,40),'#476556',0,-.48,0,group,{metalness:.45,roughness:.52});body.name='pan-choice-bowl';body.rotation.x=Math.PI/2;
      var inside=mesh(new T.CircleGeometry(radius-.035,40),'#213c31',0,-.48,.036,group,{roughness:.83});inside.name='empty-pan-interior';
      mesh(new T.TorusGeometry(radius,.014,8,40),'#9aaf9c',0,-.48,.039,group,{metalness:.7,roughness:.32});
      mesh(new T.BoxGeometry(.08,.23,.035),'#a1b4a2',0,-.21,0,group,{metalness:.58,roughness:.36});
      var handle=mesh(new T.BoxGeometry(.115,.27,.07),'#355247',0,0,0,group,{roughness:.58},true);handle.name=choice+'-pan-handle';
      var hit=mesh(new T.SphereGeometry(.11,16,12),'#ffffff',0,0,0,group,{transparent:true,opacity:0,depthWrite:false},true);hit.castShadow=hit.receiveShadow=false;
      var hook=mesh(new T.TorusGeometry(.035,.011,8,24),'#ceb98a',0,.07,-.035,group,{metalness:.5,roughness:.45});hook.name='pan-hook';tag(choice,group);
    });
    function clearHeld(){while(held.children.length)held.remove(held.children[0]);activeChoice=null;}
    function showStored(carried){choices.forEach(function(choice){stored[choice].visible=true;stored[choice].children.forEach(function(part){part.visible=choice!==carried||part.name==='pan-hook'||part.name==='pan-choice-nameplate';});});}
    function reset(s){if(disposed)return;if(s)state=s;held.visible=false;showStored(null);h.canvas.dataset.panChoiceHeld='';h.canvas.dataset.panChoicePhase='idle';h.canvas.dataset.panChoiceSelected=state?state.pan.size:'';}
    function preview(g){
      if(disposed)return;var t=traceOf(g);if(!t||!validChoice(t.choice)){reset();return;}
      if(activeChoice!==t.choice){clearHeld();var clone=stored[t.choice].clone(true);clone.position.set(0,0,0);['pan-hook','pan-choice-nameplate'].forEach(function(nodeName){var node=clone.getObjectByName(nodeName);if(node&&node.parent)node.parent.remove(node);});clone.traverse(function(o){o.visible=true;o.userData.sceneDecoration=true;delete o.userData.kitchenPanChoice;});held.add(clone);activeChoice=t.choice;}
      var p=worldPoint(t.current)||worldPoint(t.position),guide=guidance(state||t.source,t);if(!p){reset();return;}
      var scale=t.choice==='wide'?(.72*1.08)/.48:.72/.42;held.scale.setScalar(scale);held.position.set(p.x,height,p.z-.48*scale);held.rotation.x=-Math.PI/2;held.visible=true;showStored(t.choice);
      h.canvas.dataset.panChoiceHeld=t.choice;h.canvas.dataset.panChoicePhase=guide?guide.phase:'carry';
    }
    return {sources:stored,update:reset,reset:reset,preview:preview,setView:function(){/* Cabinet cookware stays visible in every view. */},dispose:function(){if(disposed)return;disposed=true;clearHeld();choices.forEach(function(choice){h.world.remove(stored[choice]);});h.world.remove(held);geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});textures.forEach(function(t){t.dispose();});h.canvas.dataset.panChoiceHeld='';h.canvas.dataset.panChoicePhase='idle';}};
  }
  function footprint(s,choice,crowded){
    var red=s.id==='tomato',food=red?'#c36643':'#cbb287',radius=choice==='wide'?74:63,spread=crowded?.65:choice==='wide'?.96:.84,rx=crowded?13:s.servings===4?11:9,svg='<svg viewBox="0 0 230 185" role="img" aria-label="'+name(choice)+': '+(crowded?'crowded representative pieces':'room between representative pieces')+'"><path d="M167 75L214 62" stroke="#385646" stroke-width="14" stroke-linecap="round"/><circle cx="99" cy="90" r="'+radius+'" fill="#244638" stroke="#78947e" stroke-width="4"/>';
    for(var i=0;i<14;i++){var a=i*2.4,r=(20+(i%3)*17)*spread,x=99+Math.cos(a)*r,y=90+Math.sin(a)*r;svg+='<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="'+rx+'" ry="'+(rx*.62)+'" transform="rotate('+(i*31%180)+' '+x.toFixed(1)+' '+y.toFixed(1)+')" fill="'+food+'" stroke="'+(red?'#f3b581':'#f1dfb8')+'" stroke-width="1.3"/>';}
    return svg+'</svg>';
  }
  function mount(host){
    var panel=document.createElement('details'),view=null,historical=true,selection='wide',draft=null,disposed=false,listeners=[],comparisonKey=null;
    panel.id='panChoiceLesson';panel.className='pan-choice-lesson';panel.innerHTML='<summary><span><strong>Choose room for your batch</strong><small>Empty cookware · carry · compare</small></span><span id="panChoiceSummary">Standard pan</span></summary><div class="pan-choice-body"><p id="panChoiceInstruction"></p><div class="pan-choice-comparison" id="panChoiceComparison" aria-label="Compare both pans for the same batch"></div><p id="panChoiceBatch" class="pan-choice-batch"></p><p id="panChoiceModel" class="pan-choice-model"></p><div class="pan-choice-actions"><button type="button" id="panChoiceTry">Choose a pan in the kitchen</button><button type="button" id="panChoiceKeyboard">Use keyboard pan practice</button></div><section id="panChoiceKeyboardPanel" hidden aria-labelledby="panChoiceKeyboardTitle"><h3 id="panChoiceKeyboardTitle">Carry empty cookware</h3><label for="panChoiceSelect">Pan to try</label><select id="panChoiceSelect"><option value="standard">Standard pan</option><option value="wide">Wide pan</option></select><p id="panChoiceKeys">Choose a pan first. Up or Space lifts it. Right carries it onto the sauce-pan station. Down lowers it. Enter releases a completed move. Escape puts it back.</p><svg id="panChoiceControl" viewBox="0 0 430 210" role="group" tabindex="0" aria-label="Empty pan carry practice" aria-describedby="panChoiceKeys panChoiceStatus"><rect x="22" y="65" width="132" height="97" rx="12" fill="#c4b797" stroke="#5a7560" stroke-width="3"/><path d="M37 154H137" stroke="#5a7560" stroke-width="5"/><ellipse cx="324" cy="143" rx="76" ry="20" fill="#98ad98" stroke="#355342" stroke-width="3"/><ellipse cx="324" cy="143" rx="52" ry="12" fill="none" stroke="#355342" stroke-width="3"/><text x="88" y="193" text-anchor="middle" fill="#244b39">Stored pans</text><text x="324" y="193" text-anchor="middle" fill="#244b39">Sauce-pan station</text><g id="panChoiceIcon"><path d="M30 0L65-12" stroke="#315243" stroke-width="10" stroke-linecap="round"/><ellipse rx="39" ry="19" fill="#294d3a" stroke="#7f9b82" stroke-width="3"/><ellipse cy="-2" rx="29" ry="12" fill="#173b2a"/></g></svg><div class="pan-choice-actions"><button type="button" id="panChoiceLift">Lift by the handle</button><button type="button" id="panChoiceCarry">Carry to the station</button><button type="button" id="panChoiceLower">Lower the pan</button><button type="button" id="panChoicePlace">Release the pan</button><button type="button" id="panChoiceCancel">Put back</button></div></section><p id="panChoiceStatus" class="pan-choice-status" role="status" aria-live="polite" aria-atomic="true"></p><p id="panChoiceReceipt" class="pan-choice-receipt"></p><div class="pan-choice-science"><strong>Look for moisture leaving the food</strong><p>A crowded batch holds moisture longer in this model. After adding ingredients, watch the steam and surface color as you advance short clock steps. The wider pan also warms more slowly at the same burner setting. Keep heat and food observations in view when deciding what to do next.</p><p>Either pan is yours to choose. You can also spread the pieces after adding them.</p></div></div>';host.after.after(panel);
    var $=function(id){return panel.querySelector('#'+id);};
    function on(el,event,fn){el.addEventListener(event,fn);listeners.push(function(){el.removeEventListener(event,fn);});}
    function say(message){$('panChoiceStatus').textContent=message;}
    function current(){return host.getState?host.getState():view;}
    function ready(){return !disposed&&view&&current()===view&&available(view,selection,historical).ready;}
    function paint(){
      var phase=draft?draft.phase:'stored',x=phase==='carried'||phase==='lowered'?324:88,y=phase==='lifted'||phase==='carried'?45:phase==='lowered'?132:119;
      $('panChoiceIcon').setAttribute('transform','translate('+x+' '+y+')'+(selection==='wide'?' scale(1.12 1)':''));$('panChoiceControl').dataset.phase=phase;
      $('panChoiceLift').disabled=!ready()||!!draft;$('panChoiceCarry').disabled=!ready()||!draft||draft.phase!=='lifted';$('panChoiceLower').disabled=!ready()||!draft||draft.phase!=='carried';$('panChoicePlace').disabled=!ready()||!draft||draft.phase!=='lowered';$('panChoiceCancel').disabled=!draft;
      $('panChoiceControl').setAttribute('aria-disabled',String(!ready()));$('panChoiceControl').setAttribute('tabindex',available(view,historical).ready?'0':'-1');$('panChoiceSelect').disabled=!available(view,historical).ready;
      $('panChoiceSelect').value=selection;panel.querySelectorAll('[data-pan-select]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.panSelect===selection));b.disabled=!available(view,historical).ready||b.dataset.panSelect===view.pan.size;});
    }
    function reset(message){draft=null;paint();if(message)say(message);}
    function choose(choice){if(!validChoice(choice))return;selection=choice;reset(available(view,choice,historical).detail);}
    function begin(){if(disposed)return;host.pause();if(host.cancelNative)host.cancelNative();panel.open=true;$('panChoiceKeyboardPanel').hidden=false;reset();if(available(view,historical).ready){if(!ready())selection=view.pan.size==='standard'?'wide':'standard';paint();say('Choose a pan, then lift it by its handle. Nothing is recorded until you lower and release.');$('panChoiceControl').focus({preventScroll:true});}else{say(available(view,historical).detail);panel.querySelector('summary').focus({preventScroll:true});}}
    function lift(){if(!ready()||draft)return;host.pause();draft={source:current(),choice:selection,phase:'lifted'};paint();say(name(selection)+' lifted. Carry it onto the sauce-pan station.');}
    function carry(){if(!ready()||!draft||draft.source!==current()||draft.phase!=='lifted')return;draft.phase='carried';paint();say('Empty pan above the station. Lower it onto its support.');}
    function lower(){if(!ready()||!draft||draft.source!==current()||draft.phase!=='carried')return;draft.phase='lowered';paint();say('Pan lowered. Press Enter or Release to keep this choice.');}
    function place(){var s=current();if(!ready()||!draft||draft.source!==s||draft.choice!==selection||draft.phase!=='lowered')return;var choice=draft.choice;reset();host.pause();host.apply('panSize',choice,'keyboard-pan-size');say(name(choice)+' selected. Add measured oil when you are ready; choosing the pan did not advance cooking time.');}
    on($('panChoiceTry'),'click',function(){if(current()!==view||!available(view,historical).ready)return;reset();host.pause();if(host.cancelNative)host.cancelNative();host.openNative(selection);});
    on($('panChoiceKeyboard'),'click',begin);on($('panChoiceSelect'),'change',function(){choose(this.value);});on($('panChoiceLift'),'click',lift);on($('panChoiceCarry'),'click',carry);on($('panChoiceLower'),'click',lower);on($('panChoicePlace'),'click',place);on($('panChoiceCancel'),'click',function(){reset('Pan put back. No choice recorded.');});
    on($('panChoiceControl'),'keydown',function(e){if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft',' ','Enter','Escape'].indexOf(e.key)===-1)return;e.preventDefault();if(e.repeat)return;if(e.key==='Escape'||e.key==='ArrowLeft'){reset('Pan put back. No choice recorded.');}else if(e.key==='ArrowUp'||e.key===' ')lift();else if(e.key==='ArrowRight')carry();else if(e.key==='ArrowDown')lower();else place();});
    on(panel,'toggle',function(){if(panel.open)host.pause();else reset();});
    function stop(){if(draft)reset('Carry stopped. No choice recorded.');}
    on(window,'blur',stop);on(window,'resize',stop);on(window,'pagehide',stop);on(document,'visibilitychange',function(){if(document.hidden)stop();});on(window,'keydown',function(e){if(draft&&e.key==='Escape'){e.preventDefault();stop();}});
    function renderComparison(s){
      var data=comparison(s),key=s.id+'/'+s.servings+'/'+s.pan.size;if(key!==comparisonKey){comparisonKey=key;$('panChoiceComparison').replaceChildren();data.choices.forEach(function(item){var card=document.createElement('article');card.className='pan-choice-card';card.dataset.panChoice=item.id;card.dataset.selected=String(item.selected);card.dataset.crowded=String(item.crowded);card.innerHTML='<div class="pan-choice-card-heading"><h3>'+item.name+'</h3><span>'+(item.selected?'On your bench':'Compare')+'</span></div>'+footprint(s,item.id,item.crowded)+'<strong class="pan-choice-spacing">'+item.spacing+'</strong><p>'+item.observation+'</p><p class="pan-choice-tradeoff">'+item.tradeoff+'</p><button type="button" data-pan-select="'+item.id+'">Practice with '+item.name.toLowerCase()+'</button>';$('panChoiceComparison').append(card);});}
      $('panChoiceBatch').textContent=data.grams+' g '+data.produce+' for '+data.servings+' people · the same batch in both pictures.';$('panChoiceModel').textContent=data.modelNote;
    }
    on($('panChoiceComparison'),'click',function(e){var button=e.target.closest('[data-pan-select]');if(!button||button.disabled)return;choose(button.dataset.panSelect);begin();});
    function render(s,recorded,fresh){
      if(disposed||!s)return;if(view!==s||recorded||fresh)draft=null;view=s;historical=!!recorded;if(fresh){selection=s.pan.size==='standard'?'wide':'standard';$('panChoiceKeyboardPanel').hidden=true;}
      renderComparison(s);var info=available(s,historical);$('panChoiceInstruction').textContent=info.detail;$('panChoiceSummary').textContent=name(s.pan.size);$('panChoiceTry').hidden=!host.has3D();$('panChoiceTry').disabled=$('panChoiceKeyboard').disabled=!info.ready;
      var choiceLog=s.log.filter(function(entry){return entry.accepted&&entry.action==='panSize';}),last=choiceLog.length?choiceLog[choiceLog.length-1]:null,method=last&&last.interaction;
      $('panChoiceReceipt').textContent=s.rescue?'Cookware supplied with this rescue.':last?name(s.pan.size)+' recorded'+(method==='scene-pan-size'?' after a completed kitchen carry.':method==='keyboard-pan-size'?' after completed keyboard practice.':' using the simplified size control.'):name(s.pan.size)+' is the starting setup. No pan replacement has been recorded.';
      paint();if(!draft)say(recorded?'Recorded pan choice. New carries are locked.':info.detail);
    }
    return {render:render,set3D:function(){if(!disposed)$('panChoiceTry').hidden=!host.has3D();},open:begin,cancel:stop,dispose:function(){if(disposed)return;disposed=true;draft=null;listeners.forEach(function(remove){remove();});listeners=[];panel.remove();}};
  }
  var api={choices:choices,height:height,sources:sources,name:name,available:available,pickup:pickup,target:target,start:start,move:move,drop:drop,guidance:guidance,comparison:comparison,decorate:decorate,mount:mount};root.KitchenPanChoice=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
