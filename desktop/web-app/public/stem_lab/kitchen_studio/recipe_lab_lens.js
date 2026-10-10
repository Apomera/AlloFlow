/* Looking records no cooking action. Held views are temporary, independent observations. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes;
  function available(s){return s.panModel===2&&s.pan.produce&&!s.plated&&(!s.pan.combined||R.serving(s).remaining>0);}
  function pieces(s){if(!available(s))return [];var all=R.panSurface(s).pieces,portion=R.serving(s);return s.pan.combined?all.slice(0,Math.ceil(all.length*portion.remaining/portion.total)):all;}
  function describe(s,index,historical){
    if(!available(s)||!Number.isInteger(index))return null;
    var p=pieces(s)[index];if(!p)return null;
    var tomato=s.id==='tomato',stage=tomato?R.tomatoHandling(s).pieces[index]:null;
    return {recipe:s.id,servings:s.servings,index:index,time:s.time,historical:!!historical,width:p.width,
      face:1-p.down,color:p.topColor,crushed:p.crushed,texture:stage?stage.texture:null,
      zone:p.heat>1.1?'hotter center':'outer area',crowded:p.crowded,site:R.panPosition(s).site};
  }
  function stamp(o){return Math.floor(o.time/60)+':'+String(Math.floor(o.time%60)).padStart(2,'0');}
  function reading(o){
    if(!o)return 'Add prepared produce to the pan to examine its pieces.';
    return 'Piece '+(o.index+1)+(o.width?' · '+o.width+' mm cut':'')+' · '+o.color+' upward face'+
      (o.texture?' · '+o.texture:'')+'. '+(o.crowded?'Close to other pieces.':'Room around this piece.')+
      ' '+(o.site==='trivet'?'Pan on the trivet; no burner heat.':'In the '+o.zone+' of the pan.')+
      (o.historical?' Recorded at ':' Observed at ')+stamp(o)+'.';
  }
  function compare(a,b){
    if(!a||!b||a.recipe!==b.recipe||a.servings!==b.servings||a.historical!==b.historical)return '';
    var notes=[],same=a.index===b.index;
    if(!same)notes.push('Comparing piece '+(a.index+1)+' with piece '+(b.index+1)+'.');
    if(a.width&&b.width&&a.width!==b.width)notes.push('Cut width: '+a.width+' → '+b.width+' mm.');
    if(a.face!==b.face&&same)notes.push('The piece was turned; you are seeing its other face.');
    if(a.color!==b.color)notes.push('Upward color: '+a.color+' → '+b.color+'.');
    if(a.texture!==b.texture&&b.texture)notes.push('Shape: '+a.texture+' → '+b.texture+'.');
    if(a.zone!==b.zone)notes.push('Position: '+a.zone+' → '+b.zone+'.');
    if(a.crowded!==b.crowded)notes.push(b.crowded?'Now close to other pieces.':'Now has room around it.');
    if(a.site!==b.site)notes.push(b.site==='trivet'?'The pan moved off its burner.':'The pan returned to its burner.');
    if(!notes.length)notes.push('No visible difference in these observations yet.');
    if(a.time!==b.time)notes.push(Math.abs(b.time-a.time)+' simulated seconds '+(b.time>a.time?'later.':'earlier.'));
    return notes.join(' ');
  }
  function briefComparison(a,b){
    var notes=compare(a,b).split(/\. (?=[A-Z0-9])/).filter(function(note){return note&&!/^Comparing piece /.test(note)&&!/^\d+(?:\.\d+)? simulated seconds /.test(note);}).map(function(note){return /\.$/.test(note)?note:note+'.';});
    function rank(note){return /^The piece was turned/.test(note)?0:/^Upward color:/.test(note)?1:/^Shape:/.test(note)?2:/^Cut width:/.test(note)?3:/^Position:/.test(note)?4:5;}
    notes.sort(function(a,b){return rank(a)-rank(b);});
    return {text:notes.slice(0,2).join(' ')||'Compare the piece and face labels above.',more:notes.length>2};
  }
  var tones={pale:'#e5d1ae',golden:'#d6a159',dark:'#92603c',scorched:'#49322a',firm:'#d95e43',softened:'#b94931'};
  function sketch(o){
    if(!o)return '';
    var fill=tones[o.color]||tones.pale,scale=o.width?Math.max(.52,Math.min(1.6,.55+o.width*.07)):1;
    var shape=o.recipe==='tomato'?'<path d="M-60 0Q-12-67 58-22Q82 26 12 55Q-40 59-60 0Z" fill="'+fill+'"/><path d="M-41-1Q-8-45 42-15Q55 20 10 35Q-22 39-41-1Z" fill="#ee9760" opacity=".65"/><path d="M-30 1Q-9-26 12-18M-16 22Q5-1 35 0" fill="none" stroke="#f5c28a" stroke-width="5"/><g fill="#f5d095"><ellipse cx="-15" cy="-5" rx="4" ry="7" transform="rotate(35)"/><ellipse cx="14" cy="13" rx="4" ry="7" transform="rotate(65)"/><ellipse cx="28" cy="-11" rx="4" ry="7" transform="rotate(80)"/></g>':
      '<path d="M-58-5C-57-63 58-63 58-5L22 4L17 45Q0 51-17 45L-22 4Z" fill="'+fill+'"/><path d="M-47-6Q0-27 47-6L20 3L15 37Q0 43-15 37L-20 3Z" fill="#8b6550" opacity=".35"/><path d="M-35-10L-16-1M-23-15L-10-2M-9-17L-4-2M9-17L4-2M23-15L10-2M35-10L16-1" stroke="#6b4b37" stroke-width="2" opacity=".65"/><path d="M-35-31Q0-50 35-31" stroke="#fff3cf" stroke-width="4" fill="none" opacity=".35"/>';
    if(o.recipe==='tomato'&&o.crushed===1)shape='<g transform="translate(-6 0) rotate(-12)">'+shape+'</g><path d="M9-39L-7-16L8 2L-3 25L9 44" stroke="#522d26" stroke-width="4" fill="none"/>';
    if(o.recipe==='tomato'&&o.crushed===2)shape='<path d="M-64 10Q-68-29-30-30Q-1-58 25-24Q64-35 67 1Q82 29 35 32Q6 55-26 34Q-60 47-64 10Z" fill="'+fill+'"/><g fill="#efa065"><ellipse cx="-28" cy="-6" rx="13" ry="6"/><ellipse cx="23" cy="8" rx="15" ry="8"/><ellipse cx="-8" cy="25" rx="12" ry="6"/></g>';
    return '<svg viewBox="0 0 280 190" role="img" aria-label="Surface sketch of piece '+(o.index+1)+', '+o.color+(o.texture?', '+o.texture:'')+'"><path d="M10 40H270M10 80H270M10 120H270M10 160H270M40 10V170M80 10V170M120 10V170M160 10V170M200 10V170M240 10V170" stroke="#dfe5d7" fill="none"/><ellipse cx="140" cy="147" rx="'+(62*scale)+'" ry="9" fill="#223e3020"/><g transform="translate(140 91) scale('+scale+')" stroke="#684735" stroke-width="1">'+shape+'</g><path d="M105 171H175M105 167V175M175 167V175" stroke="#567059" fill="none"/><text x="140" y="186" text-anchor="middle" fill="#425b46" font-size="10">surface sketch · width cue</text></svg>';
  }
  function mount(host){
    var view=null,historical=false,selected=0,held=null,last=null,sceneCanvas=null,listeners=[];
    var panel=document.createElement('details');panel.id='foodLens';panel.className='food-lens';
    panel.innerHTML='<summary><span>Food lens</span><small>Look closely · keep a view · compare</small></summary><div class="food-lens-body"><p class="food-lens-intro">Slide the lens across food in the 3D pan, or choose a piece below. Keep a view, change one cooking variable, then compare. Looking does not change the food.</p><div class="food-lens-controls"><label for="lensPiece">Piece under the lens<select id="lensPiece"></select></label><button type="button" id="lensKeep">Keep this view</button><button type="button" id="lensClear">Clear comparison</button></div><p id="lensEmpty"></p><div id="lensViews" class="food-lens-views"><figure><figcaption id="lensLiveTitle"></figcaption><div id="lensLiveArt" class="food-lens-art"></div><p id="lensLiveReading"></p></figure><figure id="lensHeld"><figcaption id="lensHeldTitle">Your kept view</figcaption><div id="lensHeldArt" class="food-lens-art"></div><p id="lensHeldReading">Keep a view to compare it with another piece or a later moment.</p></figure></div><p id="lensComparison" class="food-lens-comparison" role="status" aria-live="polite" aria-atomic="true"></p><p class="food-lens-question" id="lensQuestion"></p><p class="food-lens-note">The lens shows the upward face. Turn a piece over to see its other face. A surface view does not replace checking a pasta sample or the finished dish. Kept views last until a fresh cook, switching into or out of replay, or page reload.</p></div>';
    document.querySelector('.camera-row').after(panel);
    var loupe=document.createElement('div');loupe.className='food-loupe';loupe.hidden=true;loupe.setAttribute('aria-hidden','true');
    loupe.innerHTML='<canvas width="288" height="288"></canvas><span></span>';document.getElementById('recipeScene').append(loupe);
    var card=document.createElement('div');card.id='sceneLensObservation';card.className='scene-lens-observation';card.hidden=true;card.setAttribute('aria-hidden','true');
    card.innerHTML='<div class="scene-lens-heading"><strong>Food lens</strong><span id="sceneLensOutcome"></span></div><div class="scene-lens-pair"><figure><figcaption id="sceneLensHeldTitle"></figcaption><div id="sceneLensHeldArt"></div></figure><figure><figcaption id="sceneLensCurrentTitle"></figcaption><div id="sceneLensCurrentArt"></div></figure></div><p id="sceneLensDifference"></p><p id="sceneLensPrompt"></p>';document.getElementById('recipeScene').append(card);
    var $=function(id){return panel.querySelector('#'+id);},scene$=function(id){return card.querySelector('#'+id);},lensCanvas=loupe.querySelector('canvas'),ctx=lensCanvas.getContext('2d');
    function on(el,type,fn){el.addEventListener(type,fn);listeners.push(function(){el.removeEventListener(type,fn);});}
    function hide(){loupe.hidden=true;card.hidden=true;}
    function publish(message){var output=$('lensComparison');output.setAttribute('aria-live','polite');if(output.textContent!==message)output.textContent=message;}
    function frameTitle(prefix,o){return prefix+' · Piece '+(o.index+1)+' · Face '+(o.face+1)+' · '+stamp(o);}
    function keptMessage(o){return 'View kept. '+frameTitle(o.historical?'Recorded':'Observed',o)+'. '+(o.historical?'Compare another recorded piece or moment.':'Change one cooking variable, then scan again.');}
    function showObservation(o,outcome){
      if(!held||!o)return;loupe.hidden=true;card.hidden=false;card.dataset.mode='observation';card.dataset.outcome=outcome;scene$('sceneLensOutcome').textContent=outcome==='kept'?'View kept':'Comparison ready';
      scene$('sceneLensHeldTitle').textContent=frameTitle('Kept',held);scene$('sceneLensCurrentTitle').textContent=frameTitle(o.historical?'Recorded':'Scanned',o);
      var brief=briefComparison(held,o);scene$('sceneLensHeldArt').innerHTML=sketch(held);scene$('sceneLensCurrentArt').innerHTML=sketch(o);scene$('sceneLensDifference').textContent=brief.text;
      scene$('sceneLensPrompt').textContent=brief.more?'Full comparison in Food lens.':o.historical?'Compare another recorded piece or moment.':outcome==='kept'?'Change one cooking variable, then scan again.':'What changed? Use the kept view as your reference.';
    }
    function paint(refreshComparison){
      var o=view&&describe(view,selected,historical),choices=o?pieces(view):[],choice=$('lensPiece');
      if(choice.options.length!==choices.length){choice.replaceChildren();choices.forEach(function(p){choice.append(new Option('Piece '+(p.index+1)+(p.width?' · '+p.width+' mm':''),String(p.index)));});}
      choice.value=String(selected);choice.disabled=!o;$('lensKeep').disabled=!o;$('lensClear').disabled=!held;
      $('lensEmpty').hidden=!!o;$('lensViews').hidden=!o;$('lensEmpty').textContent=view&&view.panModel!==2?'This saved cook uses a whole-pan model. Start a fresh cook to examine individual pieces.':view&&view.plated?'The food is on the plates. Replay an earlier pan moment to examine its pieces.':'Add prepared produce to the pan to use the food lens.';
      $('lensLiveTitle').textContent=o?(historical?'Recorded view':'Current view')+' · '+stamp(o):'';
      $('lensLiveArt').innerHTML=sketch(o);$('lensLiveReading').textContent=o?reading(o):'';
      $('lensHeld').classList.toggle('lens-unkept',!held);$('lensHeldTitle').textContent=held?'Kept view · '+stamp(held):'Your kept view';
      $('lensHeldArt').innerHTML=sketch(held);$('lensHeldReading').textContent=held?reading(held):'Keep a view to compare it with another piece or a later moment.';
      if(refreshComparison!==false){var comparison=$('lensComparison'),text=compare(held,o);comparison.setAttribute('aria-live','off');if(comparison.textContent!==text)comparison.textContent=text;}
      $('lensQuestion').textContent=!o?'':view.id==='tomato'?'Try an observation: keep a firm piece in view. After heating, how does its shape respond to a press?':'Try an observation: keep a pale piece in view. Does turning it show the same color on both faces?';
    }
    function choose(index,scanning){if(!view||!describe(view,index,historical))return;host.pause();if(selected!==index){selected=index;paint(scanning?false:undefined);}return describe(view,selected,historical);}
    function keep(){
      host.pause();var o=view&&describe(view,selected,historical);if(!o)return {captured:false,outcome:'selected',message:'No food view is available to keep.'};
      held=Object.assign({},o);paint(false);showObservation(o,'kept');var message=keptMessage(o);publish(message);return {captured:true,outcome:'kept',message:message};
    }
    function finishScan(index,deliberate){
      hide();var o=choose(index,true);if(!o)return {captured:false,outcome:'selected',message:'No food view captured. Slide across a visible piece, then release on it.'};
      if(deliberate!==true){var message='Piece '+(o.index+1)+' selected. No new view kept. Sweep steadily across food, then release on a visible piece; a tap only selects.';publish(message);return {captured:false,outcome:'selected',message:message};}
      var outcome=held?'compared':'kept';if(!held)held=Object.assign({},o);paint(false);showObservation(o,outcome);
      var message=outcome==='kept'?keptMessage(o):'Comparison ready. '+frameTitle(o.historical?'Recorded':'Scanned',o)+'. '+compare(held,o);
      publish(message);return {captured:true,outcome:outcome,message:message};
    }
    on($('lensPiece'),'change',function(){var o=choose(Number(this.value),true);if(o){paint(false);if(held)showObservation(o,'compared');else hide();publish(compare(held,o)||'Piece '+(o.index+1)+' selected. Keep a view to compare after a cooking change.');}});
    on($('lensKeep'),'click',keep);
    on($('lensClear'),'click',function(){held=null;hide();paint(false);publish('Kept view cleared. Scan a visible piece or use Keep this view to start another comparison.');});on(panel,'toggle',function(){if(panel.open)host.pause();else hide();});
    function render(s,recorded){
      if(view!==s)hide();
      if(last&&(last.id!==s.id||last.servings!==s.servings||historical!==!!recorded||!recorded&&(s.log.length<last.log.length||!s.log.length&&last!==s||!!last.rescue!==!!s.rescue))){held=null;selected=0;hide();}
      last=s;view=s;historical=!!recorded;var choices=pieces(s);selected=Math.max(0,Math.min(selected,choices.length-1));if(!choices.length)hide();paint();
    }
    function open(keyboard){panel.open=true;host.pause();paint();if(keyboard){$('lensPiece').focus();panel.scrollIntoView({block:'nearest'});}}
    function scan(index,e,source,capture,progress){
      choose(index,true);if(!view||!describe(view,index,historical)){hide();return;}card.hidden=false;card.dataset.mode='scan';delete card.dataset.outcome;scene$('sceneLensOutcome').textContent=Number.isFinite(progress)?progress>=1?'Release on food':'Sweeping · '+Math.round(Math.max(0,Math.min(1,progress))*100)+'%':'Hold & sweep';scene$('sceneLensPrompt').textContent='Keep holding and sweep across food. Release on a visible piece to '+(held?'compare.':'keep a view.');sceneCanvas=source;var box=source.getBoundingClientRect(),parent=source.parentElement.getBoundingClientRect(),px=e.clientX-box.left,py=e.clientY-box.top;
      var crop=Math.min(50,box.width,box.height),sx=Math.max(0,Math.min(box.width-crop,px-crop/2)),sy=Math.max(0,Math.min(box.height-crop,py-crop/2));
      loupe.hidden=false;var size=loupe.getBoundingClientRect().width,x=px+28;if(x+size>parent.width-8)x=px-size-28;
      loupe.style.left=Math.max(8,Math.min(parent.width-size-8,x))+'px';loupe.style.top=Math.max(8,Math.min(parent.height-loupe.getBoundingClientRect().height-8,py-72))+'px';
      ctx.clearRect(0,0,288,288);
      var closeup=capture&&capture({x:sx,y:sy,width:crop,height:crop,screenWidth:box.width,screenHeight:box.height,size:288});
      if(closeup)ctx.putImageData(closeup,0,0);else ctx.drawImage(sceneCanvas,sx*source.width/box.width,sy*source.height/box.height,crop*source.width/box.width,crop*source.height/box.height,0,0,288,288);
      var hint=Number.isFinite(progress)?' · '+(progress>=1?'Release on food to '+(held?'compare':'keep the view'):'Keep sweeping · '+Math.round(Math.max(0,Math.min(1,progress))*100)+'%'):'';loupe.querySelector('span').textContent='Piece '+(index+1)+' · '+describe(view,index,historical).color+hint;
    }
    return {render:render,open:open,scan:scan,hide:hide,keep:keep,finishScan:finishScan,visible:function(){return !card.hidden;},dispose:function(){hide();listeners.forEach(function(remove){remove();});panel.remove();loupe.remove();card.remove();sceneCanvas=null;}};
  }
  var api={available:available,pieces:pieces,describe:describe,reading:reading,compare:compare,sketch:sketch,mount:mount};
  root.KitchenFoodLens=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
