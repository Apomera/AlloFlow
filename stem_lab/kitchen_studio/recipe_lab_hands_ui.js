/* Hands-on tools share the recipe engine's guarded actions and saved notebook. */
(function(root){
  'use strict';
  function mount(host){
    var H=root.KitchenHands,R=root.KitchenRecipes,$=function(id){return document.getElementById(id);};
    var view=null,zone='prep',locked=false,selected=null,drag=null,tilt=0,pouring=false,frame=null,lastTime=0,remainder=0,poured=0,session=null;
    function element(tag,text,cls){var e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
    var panel=element('section',null,'hands-workbench');panel.setAttribute('aria-labelledby','handsTitle');
    panel.innerHTML='<div class="hands-heading"><div><p class="eyebrow">MOVE · OBSERVE · ADJUST</p><h4 id="handsTitle">Work with your ingredients</h4></div><span class="hands-badge">Hands-on bench</span></div><p id="handsHelp">Drag an ingredient or tool onto cookware. Or select it, then choose its destination. Escape puts it down.</p><div id="handsShelf" class="hands-shelf" role="group" aria-label="Ingredients and tools"></div><div id="handsTargets" class="hands-targets" role="group" aria-label="Cookware destinations"></div><p id="handsFeedback" role="status" aria-live="polite" aria-atomic="true">Choose what to move. Preparation and heat still matter.</p><p class="hands-note">The clock pauses while you handle an item. Run the kitchen between actions to watch both vessels cook.</p>';
    $('benchObservation').after(panel);
    var items=[
      ['water','Water jug','FILL','prep pot'],['pasta','Dry pasta','WEIGHED','prep pot'],
      ['oil','Olive oil','MEASURED','prep pan'],['produce','Produce','BOARD','prep pan'],
      ['garlic','Garlic','PREP','prep pan'],['cup','Empty cup','SAVE WATER','pot'],
      ['spoon','Sampling spoon','CHECK','pot pan finish'],['pot','Pasta pot','DRAIN','pot'],
      ['cooked','Drained pasta','COMBINE','pan finish'],['pan','Finished pan','SERVE','finish']
    ];
    var sourceNodes={},targetNodes={};
    var art={water:'<path d="M17 12H48V55H21Z" fill="#a9c8c5" stroke="#496354" stroke-width="3"/><path d="M48 21H58V42H48" fill="none" stroke="#496354" stroke-width="4"/>',pasta:'<path d="M16 16L43 53M28 11L53 46M12 34L30 58" stroke="#bf9644" stroke-width="7" stroke-linecap="round"/>',oil:'<path d="M27 6H40V20L47 28V59H20V28L27 20Z" fill="#b2b669" stroke="#496354" stroke-width="3"/>',produce:'<g data-mushroom-art><path d="M28 30H40L43 57H25Z" fill="#e1cca7" stroke="#796144" stroke-width="2"/><path d="M9 34Q10 4 34 8Q58 9 59 34Z" fill="#b69871" stroke="#796144" stroke-width="2"/></g><g data-tomato-art style="display:none"><circle cx="34" cy="36" r="23" fill="#b8563c"/><path d="M34 21L22 10L35 14L44 5L42 19L54 21Z" fill="#4a7142"/></g>',garlic:'<path d="M31 10Q36 27 48 30Q65 51 41 59Q9 65 12 44Q13 34 26 28Z" fill="#e5dac0" stroke="#8c805e" stroke-width="2"/><path d="M32 28Q24 44 30 59M37 28Q45 44 40 59" fill="none" stroke="#8c805e"/>',cup:'<path d="M12 21H43V51Q27 63 12 51Z" fill="#eeeeda" stroke="#496354" stroke-width="3"/><path d="M43 28H56V44H43" fill="none" stroke="#496354" stroke-width="4"/>',spoon:'<ellipse cx="24" cy="21" rx="13" ry="18" transform="rotate(-35 24 21)" fill="#b69569" stroke="#6e5639" stroke-width="2"/><path d="M34 35L54 59" stroke="#94714c" stroke-width="8" stroke-linecap="round"/>',pot:'<path d="M12 23H55V50Q33 67 12 50Z" fill="#789382" stroke="#304b3d" stroke-width="3"/><ellipse cx="34" cy="23" rx="22" ry="7" fill="#b3c8b7"/>',cooked:'<path d="M8 34H61L50 53H19Z" fill="#b7c4ad" stroke="#496354" stroke-width="2"/><path d="M17 31Q8 15 31 18T48 31M26 32Q16 20 40 24T51 30" fill="none" stroke="#bf9644" stroke-width="5"/>',pan:'<ellipse cx="28" cy="40" rx="24" ry="16" fill="#496354"/><ellipse cx="28" cy="38" rx="19" ry="10" fill="#bc9655"/><path d="M48 35L64 20" stroke="#304b3d" stroke-width="7"/>'};
    items.forEach(function(item){
      var b=element('button',null,'hands-item');b.type='button';b.dataset.handItem=item[0];b.setAttribute('aria-describedby','handsHelp');
      var icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 70 70');icon.setAttribute('aria-hidden','true');icon.innerHTML=art[item[0]];
      b.append(icon,element('span',item[2],'hands-item-tag'),element('strong',item[1]),element('span','','hands-item-state'));
      $('handsShelf').append(b);sourceNodes[item[0]]=b;
      b.addEventListener('click',function(e){if(b.dataset.suppressClick){delete b.dataset.suppressClick;return;}if(locked)return;host.pause();pick(selected===item[0]?null:item[0]);});
      b.addEventListener('pointerdown',function(e){
        if(locked||b.disabled||e.button!==0||!e.isPrimary)return;
        if(drag){cancel();return;}host.pause();
        drag={id:e.pointerId,item:item[0],node:b,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);
      });
      b.addEventListener('pointermove',function(e){
        if(!drag||drag.id!==e.pointerId)return;
        if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8&&!drag.moved)return;
        if(!drag.moved){drag.moved=true;pick(drag.item);ghost.textContent=b.querySelector('strong').textContent;ghost.hidden=false;}
        ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
        var hit=document.elementFromPoint(e.clientX,e.clientY),dest=hit&&hit.closest('[data-hand-target]');
        Object.keys(targetNodes).forEach(function(k){targetNodes[k].classList.toggle('hands-over',dest===targetNodes[k]);});
      });
      b.addEventListener('pointerup',function(e){
        if(!drag||drag.id!==e.pointerId)return;
        var move=drag;drag=null;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);
        ghost.hidden=true;Object.values(targetNodes).forEach(function(t){t.classList.remove('hands-over');});
        if(!move.moved)return;
        b.dataset.suppressClick='true';setTimeout(function(){delete b.dataset.suppressClick;},0);
        var hit=document.elementFromPoint(e.clientX,e.clientY),dest=hit&&hit.closest('[data-hand-target]');
        if(dest)drop(dest.dataset.handTarget,'drag');else{pick(null);say('Returned to the bench. Release over cookware to use an item.');}
      });
      ['pointercancel','lostpointercapture'].forEach(function(type){b.addEventListener(type,function(e){if(drag&&drag.id===e.pointerId)cancel();});});
    });
    var drawings={
      pot:'<path d="M45 36H135V84Q135 102 118 102H62Q45 102 45 84Z" fill="#72857a" stroke="#304b3d" stroke-width="4"/><path d="M45 50H29V72H45M135 50H151V72H135" fill="none" stroke="#304b3d" stroke-width="6"/><ellipse cx="90" cy="36" rx="45" ry="14" fill="#344e42"/><ellipse data-pot-liquid cx="90" cy="36" rx="39" ry="10" fill="#aacdd0"/>',
      pan:'<path d="M125 67L169 46" stroke="#304b3d" stroke-width="12" stroke-linecap="round"/><ellipse cx="79" cy="67" rx="58" ry="34" fill="#496354"/><ellipse cx="79" cy="64" rx="49" ry="26" fill="#87937a"/><ellipse data-pan-food cx="79" cy="64" rx="39" ry="20" fill="#c4a260"/>',
      colander:'<path d="M34 42H146L129 91Q90 112 51 91Z" fill="#b3c1b7" stroke="#496354" stroke-width="3"/><path d="M53 58L60 82M72 58L76 88M92 58V90M112 58L108 88M131 58L125 82" stroke="#496354" stroke-width="3"/>',
      plate:'<ellipse cx="90" cy="69" rx="72" ry="37" fill="#faf9ed" stroke="#97aa94" stroke-width="3"/><ellipse cx="90" cy="69" rx="53" ry="25" fill="#e8eddb"/><ellipse data-plate-food cx="90" cy="69" rx="39" ry="18" fill="#c4a260"/>'
    };
    [['pot','Pasta pot'],['pan','Sauce pan'],['colander','Colander'],['plate','Serving plate']].forEach(function(item){
      var b=element('button',null,'hands-target');b.type='button';b.dataset.handTarget=item[0];
      b.innerHTML='<svg viewBox="0 0 180 115" aria-hidden="true">'+drawings[item[0]]+'</svg>';
      b.append(element('strong',item[1]),element('span','','hands-target-state'));b.setAttribute('aria-label','Use selected item with '+item[1].toLowerCase());
      b.addEventListener('click',function(e){drop(item[0],e.detail===0?'keyboard':'select');});$('handsTargets').append(b);targetNodes[item[0]]=b;
    });
    var ghost=element('div',null,'hands-drag-ghost');ghost.hidden=true;ghost.setAttribute('aria-hidden','true');document.body.append(ghost);
    function say(text){$('handsFeedback').textContent=text;}
    function pick(item){selected=item;Object.keys(sourceNodes).forEach(function(k){sourceNodes[k].setAttribute('aria-pressed',String(k===item));});if(item)say(sourceNodes[item].querySelector('strong').textContent+' picked up. Choose cookware, or press Escape to put it down.');}
    function drop(target,method){
      if(locked||!selected)return;var action=H.transferAction(selected,target),source=sourceNodes[selected];
      if(!action){say('That item does not belong there. Choose another destination, or press Escape to put it down.');return;}
      pick(null);host.apply(action,undefined,method);say(host.getState().feedback);
      if(source.disabled||source.hidden)targetNodes[target].focus({preventScroll:true});
    }
    function cancel(){
      if(drag){var d=drag;drag=null;if(d.node.hasPointerCapture(d.id))d.node.releasePointerCapture(d.id);}
      ghost.hidden=true;Object.values(targetNodes).forEach(function(t){t.classList.remove('hands-over');});pick(null);stopPour();
    }
    panel.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();cancel();say('Item put down.');}});
    // Quick actions remain a complete alternative, kept below the work surface.
    var shortcuts=element('details',null,'hands-shortcuts');shortcuts.id='handsShortcuts';shortcuts.append(element('summary','Simplified action controls'));
    var groups=Array.from(document.querySelectorAll('[data-bench-group]'));groups[0].after(shortcuts);groups.filter(function(g){return g.dataset.benchGroup!=='prep';}).forEach(function(g){shortcuts.append(g);});
    var dials=element('div',null,'hands-dials');dials.setAttribute('aria-label','Burner dials');panel.after(dials);
    ['pot','pan'].forEach(function(v){
      var card=element('div',null,'hands-dial-card'),label=element('strong',v==='pot'?'Pot burner':'Pan burner'),dial=element('div',null,'hands-dial');
      dial.id='handsDial'+v;dial.tabIndex=0;dial.setAttribute('role','slider');dial.setAttribute('aria-label',label.textContent);dial.setAttribute('aria-valuemin','0');dial.setAttribute('aria-valuemax','3');dial.setAttribute('aria-describedby','handsDialHelp');
      dial.innerHTML='<svg viewBox="0 0 160 130" aria-hidden="true"><path d="M42 98A49 49 0 1 1 118 98" fill="none" stroke="#9ba98d" stroke-width="9"/><circle cx="80" cy="65" r="35" fill="#304e3e"/><path class="hands-dial-needle" d="M80 65V38" stroke="#fff3ce" stroke-width="5" stroke-linecap="round"/><text x="15" y="125">OFF</text><text x="117" y="125">HIGH</text></svg>';
      var reading=element('span','','hands-dial-reading');card.append(label,dial,reading);dials.append(card);var pointer=null;
      function set(value,method){if(locked)return;host.pause();if(host.getState()[v].heat!==value)host.apply(v+'Heat',value,method);}
      function move(e){var b=dial.getBoundingClientRect(),x=(e.clientX-b.left)*160/b.width-80,y=(e.clientY-b.top)*130/b.height-65;if(Math.hypot(x,y)<15)return;var angle=Math.atan2(x,-y)*180/Math.PI;set(Math.max(0,Math.min(3,Math.round((angle+135)/90))),'dial');}
      dial.addEventListener('pointerdown',function(e){if(locked||e.button!==0||!e.isPrimary)return;pointer=e.pointerId;dial.setPointerCapture(pointer);move(e);});
      dial.addEventListener('pointermove',function(e){if(pointer===e.pointerId)move(e);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){dial.addEventListener(type,function(e){if(pointer===e.pointerId){pointer=null;if(dial.hasPointerCapture(e.pointerId))dial.releasePointerCapture(e.pointerId);}});});
      dial.addEventListener('keydown',function(e){var value=host.getState()[v].heat;if(e.key==='ArrowRight'||e.key==='ArrowUp')value++;else if(e.key==='ArrowLeft'||e.key==='ArrowDown')value--;else if(e.key==='Home')value=0;else if(e.key==='End')value=3;else return;e.preventDefault();set(Math.min(3,Math.max(0,value)),'keyboard');});
    });
    var dialHelp=element('p','Turn a dial, or focus it and use the arrow keys. Heat changes gradually.','hands-note');dialHelp.id='handsDialHelp';dials.after(dialHelp);
    // Tilt controls transfer actual doses while held; letting go never rolls back water.
    var pour=element('div',null,'hands-pour');pour.innerHTML='<p class="eyebrow">CONTROL THE FLOW</p><p id="handsPourHelp">Hold the jug handle and drag right to tilt. More tilt pours faster. Return left or release to stop. With a keyboard, hold Space; arrows adjust the tilt.</p><button id="handsJug" class="hands-jug" type="button" aria-describedby="handsPourHelp"><svg viewBox="0 0 320 190" aria-hidden="true"><ellipse cx="232" cy="157" rx="66" ry="22" fill="#526b58"/><path id="handsStream" d="M180 70Q218 86 230 149" fill="none" stroke="#7b9b93" stroke-width="7" stroke-dasharray="5 4"/><g id="handsJugShape"><path d="M124 44H145Q170 44 170 70T145 96H124" fill="none" stroke="#496354" stroke-width="9"/><path d="M51 25H129V137H63Z" fill="#f6f7e9" stroke="#496354" stroke-width="4"/><rect id="handsJugWater" x="65" y="50" width="59" height="82" fill="#a9b8a0"/><path d="M68 70H84M68 92H84M68 114H84" stroke="#496354" stroke-width="2"/></g><text x="92" y="176" text-anchor="middle" fill="#304b3d">HOLD &amp; TILT →</text></svg><span id="handsPourReading">Upright · no flow</span></button><p id="handsPourResult" role="status" aria-live="polite" aria-atomic="true"></p>';
    $('pourPanel').querySelector('.pour-heading').after(pour);
    function paintPour(){
      $('handsJugShape').setAttribute('transform','rotate('+tilt+' 129 110)');$('handsStream').style.visibility=pouring&&tilt>=20?'visible':'hidden';
      var radians=tilt*Math.PI/180,tipX=129+85*Math.sin(radians),tipY=110-85*Math.cos(radians);$('handsStream').setAttribute('d','M'+tipX+' '+tipY+'Q232 '+tipY+' 232 149');
      var s=view||host.getState(),height=82*Math.min(1,s.pot.reserve/(200*s.servings/2));$('handsJugWater').setAttribute('height',height);$('handsJugWater').setAttribute('y',132-height);
      $('handsPourReading').textContent=Math.round(tilt)+'° tilt · '+s.pot.reserve+' mL left · '+poured+' mL poured this hold';
    }
    function tick(now){
      if(!pouring)return;
      if(locked||document.hidden||$('pourPanel').hidden||session!==host.getState().log[0]){stopPour();return;}
      var dose=H.pourStep(remainder,tilt,lastTime?now-lastTime:0,host.getState().pot.reserve);lastTime=now;remainder=dose.remainder;
      if(dose.amount){var before=host.getState().pan.waterAdded;host.apply('pour',dose.amount,'tilt');session=host.getState().log[0];poured+=host.getState().pan.waterAdded-before;}
      paintPour();if(host.getState().pot.reserve<10){stopPour();return;}frame=requestAnimationFrame(tick);
    }
    function startPour(){if(locked||!host.getState().pan.produce||host.getState().pot.reserve<10)return false;host.pause();pouring=true;session=host.getState().log[0];poured=0;remainder=0;lastTime=0;frame=requestAnimationFrame(tick);return true;}
    function stopPour(){if(frame!==null)cancelAnimationFrame(frame);frame=null;if(pouring)$('handsPourResult').textContent=poured?poured+' mL added. Water already poured stays in the sauce. Mix through, then check the coating.':'No water poured. Tilt farther to start the flow.';pouring=false;tilt=0;remainder=0;lastTime=0;if($('handsJug'))paintPour();}
    var jugPointer=null,jugStart=0;
    $('handsJug').addEventListener('pointerdown',function(e){if(e.button!==0||!e.isPrimary||pouring||!startPour())return;jugPointer=e.pointerId;jugStart=e.clientX;this.setPointerCapture(e.pointerId);e.preventDefault();});
    $('handsJug').addEventListener('pointermove',function(e){if(jugPointer!==e.pointerId||!pouring)return;tilt=Math.min(80,Math.max(0,(e.clientX-jugStart)*320/this.getBoundingClientRect().width));paintPour();});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){$('handsJug').addEventListener(type,function(e){if(jugPointer!==e.pointerId)return;jugPointer=null;stopPour();if(this.hasPointerCapture(e.pointerId))this.releasePointerCapture(e.pointerId);});});
    $('handsJug').addEventListener('keydown',function(e){if(e.code==='Space'){e.preventDefault();if(!pouring&&!e.repeat&&startPour()){tilt=45;paintPour();}}else if(pouring&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tilt=Math.max(0,Math.min(80,tilt+(e.key==='ArrowRight'?5:-5)));paintPour();}else if(e.key==='Escape'){e.preventDefault();stopPour();}});
    $('handsJug').addEventListener('keyup',function(e){if(e.code==='Space'){e.preventDefault();stopPour();}});$('handsJug').addEventListener('blur',stopPour);
    window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',function(){if(document.hidden)cancel();});window.addEventListener('pagehide',cancel);
    function render(next,nextZone,historical){
      var changed=nextZone!==zone||(view&&view.log.length>0&&next.log[0]!==view.log[0]);view=next;zone=nextZone;locked=historical||host.ended()||R.serving(next).started;
      if(changed||locked)cancel();
      panel.hidden=zone==='prep';dials.hidden=zone==='prep';dialHelp.hidden=zone==='prep';shortcuts.hidden=zone==='prep';
      var p=view.pot,n=view.pan,v=view.prep,disabled={water:p.water>0||p.pasta,oil:n.oil,produce:n.produce,garlic:n.garlic,pasta:p.pasta,cup:p.reserve+n.waterAdded>=200*view.servings/2||p.drained,pot:p.drained||!p.pasta,cooked:!p.drained||n.combined,pan:!n.combined||view.plated,spoon:view.plated};
      var states={water:R.ingredients(view).water+' mL',oil:R.ingredients(view).oil+' mL',produce:v.cut?(v.dry?'Cut & dried':'Cut; still wet'):'Needs cutting',garlic:v.garlic?'Minced':'Needs mincing',pasta:v.pasta+' g weighed',cup:p.reserve?'Water saved':'Save before draining',spoon:zone==='pot'?'Sample the pasta':'Check the dish',pot:p.sample?'Sample taken':'Sample before draining',cooked:p.drained?'Ready to transfer':'Still in the pot',pan:n.tasted?'Checked; turn heat off':'Check before serving'};
      items.forEach(function(item){var b=sourceNodes[item[0]];b.hidden=!item[3].split(' ').includes(zone);b.disabled=locked||!!disabled[item[0]];b.querySelector('.hands-item-state').textContent=states[item[0]];if(item[0]==='produce')b.querySelector('strong').textContent=R.recipe(view.id).produce;if(selected===item[0]&&(b.hidden||b.disabled))pick(null);});
      Object.keys(targetNodes).forEach(function(k){targetNodes[k].disabled=locked;});
      var observations=R.inspect(view),captions={pot:observations.pot,pan:view.plated?'Dish plated':observations.pan,colander:p.drained?'Pasta drained':'Collect drained pasta',plate:view.plated?'Your dish is served':'Ready for your dish'};
      Object.keys(captions).forEach(function(k){targetNodes[k].querySelector('.hands-target-state').textContent=captions[k];});
      panel.querySelector('[data-pot-liquid]').style.opacity=p.water?1:0;panel.querySelector('[data-pan-food]').style.opacity=n.produce&&!view.plated?1:n.oil&&!view.plated?.35:0;panel.querySelector('[data-pan-food]').setAttribute('fill',n.damage>=1?'#513b2e':view.id==='tomato'?'#be664b':n.brown>=.7?'#a87943':'#d4bf91');panel.querySelector('[data-plate-food]').style.opacity=view.plated?1:0;
      panel.querySelector('[data-mushroom-art]').style.display=view.id==='mushroom'?'':'none';panel.querySelector('[data-tomato-art]').style.display=view.id==='tomato'?'':'none';
      ['pot','pan'].forEach(function(k){var dial=$('handsDial'+k),heat=view[k].heat;dial.setAttribute('aria-valuenow',heat);dial.setAttribute('aria-valuetext',['Off','Low','Medium','High'][heat]);dial.setAttribute('aria-disabled',String(locked));dial.querySelector('.hands-dial-needle').setAttribute('transform','rotate('+(-135+heat*90)+' 80 65)');dial.nextSibling.textContent=['Off','Low','Medium','High'][heat]+' · '+Math.round(view[k].temp)+'°C';});
      $('handsJug').disabled=locked||!n.produce||p.reserve<10;if(!pouring)paintPour();
      if(historical)say('Recorded kitchen. Direct tools are locked during replay.');else if(view.plated)say('Dish served. Review how your actions shaped it.');else if(changed)say('Choose what to move. Preparation and heat still matter.');
    }
    return {render:render,cancel:cancel};
  }
  root.KitchenHandsUI={mount:mount};
})(window);
