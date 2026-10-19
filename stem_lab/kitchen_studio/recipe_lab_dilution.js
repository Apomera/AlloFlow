/* A separate, finite plain-water supply. Choosing an amount never changes the dish. */
(function(root){
  'use strict';
  function mount(host){
    var R=root.KitchenRecipes,doc=host.container.ownerDocument,view=null,stamp='',active=false,locked=true,disposed=false,amount=50;
    var panel=doc.createElement('section');panel.id='dilutionWaterPanel';panel.className='dilution-water-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','dilutionWaterTitle');
    panel.innerHTML='<h4 id="dilutionWaterTitle" tabindex="-1">Water choices for this rescue</h4><p>Choose a supply and a measured amount. Compare a spoon check before your change with a fresh check after folding.</p><dl><div><dt id="dilutionSavedName"></dt><dd id="dilutionSavedRemaining"></dd></div><div><dt id="dilutionPlainName"></dt><dd id="dilutionPlainRemaining"></dd></div></dl><p id="dilutionSavedDescription"></p><p id="dilutionPlainDescription"></p><p class="hands-note">The carry-and-tilt jug and saved-water controls below use the cooking-water supply. The separate control here pours plain water.</p><label for="plainWaterAmount">Plain-water amount <output id="plainWaterAmountValue" for="plainWaterAmount">50 mL</output></label><input id="plainWaterAmount" type="range" min="10" max="100" step="10" value="50" aria-describedby="plainWaterPreview"><p id="plainWaterPreview"></p><button id="pourPlainWater" type="button">Pour 50 mL plain water</button><p id="plainWaterFeedback" role="status" aria-live="polite" aria-atomic="true"></p>';
    host.container.querySelector('.pour-heading').after(panel);
    var $=function(id){return panel.querySelector('#'+id);};
    function sources(s){return R.sauceLiquids?R.sauceLiquids(s):[];}
    function plain(s){return sources(s).find(function(source){return source.id==='plain';});}
    function ready(){var s=host.getState(),p=view&&plain(view);return !!view&&!disposed&&active&&!locked&&!panel.hidden&&s===view&&JSON.stringify(s)===stamp&&p&&p.remainingMl>=10&&!s.plated&&!s.submitted&&s.time<3600&&s.log.length<1200&&s.pan.produce&&!R.serving(s).started&&!host.ended();}
    function choose(){if(!ready())return;amount=Math.max(10,Math.min(100,Math.floor(Number(this.value)/10)*10));render(view,false,active);}
    function pour(){if(!ready())return;var before=host.getState();if(host.cancel)host.cancel();host.pause();if(host.getState()!==before||JSON.stringify(before)!==stamp)return;host.apply('pourPlain',amount,'keyboard');}
    $('plainWaterAmount').addEventListener('input',choose);$('pourPlainWater').addEventListener('click',pour);
    function render(s,historical,on){
      if(disposed)return;view=s;stamp=JSON.stringify(s);active=!!on;locked=!!historical||host.ended();var supplies=sources(s),p=supplies.find(function(source){return source.id==='plain';}),saved=supplies.find(function(source){return source.id==='saved';});panel.hidden=!active||!p;if(!p)return;
      var maximum=Math.max(10,Math.min(100,Math.floor(p.remainingMl/10)*10));amount=Math.max(10,Math.min(amount,maximum));var can=ready();
      $('dilutionSavedName').textContent=saved.label;$('dilutionSavedRemaining').textContent=saved.remainingMl+' mL remaining';$('dilutionSavedDescription').textContent=saved.description;
      $('dilutionPlainName').textContent=p.label;$('dilutionPlainRemaining').textContent=p.remainingMl+' mL remaining';$('dilutionPlainDescription').textContent=p.description;
      $('plainWaterAmount').max=String(maximum);$('plainWaterAmount').value=String(amount);$('plainWaterAmount').disabled=!can;$('plainWaterAmountValue').textContent=amount+' mL';$('pourPlainWater').disabled=!can;$('pourPlainWater').textContent='Pour '+amount+' mL plain water';
      $('plainWaterPreview').textContent=historical?'Recorded supplies. Pouring is locked.':s.plated||s.submitted||host.ended()?'This cook is finished.':R.serving(s).started?'Return every spoonful to the pan before adjusting the sauce.':p.remainingMl<10?'The plain-water supply is empty. Inspect the dish before deciding what to do next.':!s.pan.produce?'Prepare the pan before adding water.':'Preview: '+(p.remainingMl-amount)+' mL plain water would remain. Moving the slider does not pour.';
      var last=s.log[s.log.length-1];$('plainWaterFeedback').textContent=last&&last.action==='pourPlain'?last.observation:'';
    }
    return {render:render,focus:function(){if(!disposed&&!panel.hidden)$('dilutionWaterTitle').focus();},dispose:function(){if(disposed)return;disposed=true;$('plainWaterAmount').removeEventListener('input',choose);$('pourPlainWater').removeEventListener('click',pour);panel.remove();}};
  }
  root.KitchenDilutionWater={mount:mount};if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenDilutionWater;
})(typeof window!=='undefined'?window:globalThis);
