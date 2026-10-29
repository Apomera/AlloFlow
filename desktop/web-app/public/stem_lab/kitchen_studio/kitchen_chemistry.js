/* Optional concept comparisons. They never read or write cooking evidence. */
(function(root){
  'use strict';
  function boilingPoint(grams){
    if(typeof grams!=='number'||!Number.isFinite(grams)||grams<0||grams>20)throw new RangeError('Choose 0–20 g of salt per 1 kg water.');
    // Ideal dilute solution: i=2, Kb=0.512 °C kg/mol, M(NaCl)=58.44 g/mol.
    return 100+2*.512*grams/58.44;
  }
  function mount(host){
    if(!host)return null;if(host.chemistryPanel)return host.chemistryPanel;
    var doc=host.ownerDocument,content=root.KitchenChemistryContent;if(!content)return null;
    var topics=content.topics,memories={},selected=topics[0].id,context=null,locked=false,onOpen=null;
    function el(tag,text,cls){var n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
    function mark(n,name){n.setAttribute('data-chem-'+name,'');return n;}
    function button(text,fn,name){var b=el('button',text);b.type='button';if(name)mark(b,name);b.addEventListener('click',fn);return b;}
    function current(){return topics.find(function(t){return t.id===selected;});}
    function memory(){return memories[selected]||(memories[selected]={prediction:'',revealed:false,salt:10,bubbles:false});}
    host.classList.add('kitchen-chemistry');host.replaceChildren();
    var panel=el('details'),summary=el('summary'),title=el('span','Why does this happen?'),kicker=el('small','KITCHEN CHEMISTRY');summary.append(kicker,title);panel.append(summary);host.append(panel);
    var gate=mark(el('p','Finish and record this demonstration to explore the explanations. You can also start a fresh attempt in Practice mode.','chem-gate'),'locked');gate.hidden=true;panel.append(gate);
    var body=mark(el('div',undefined,'chem-body'),'body');panel.append(body);
    body.append(el('p','Predict, compare, then explore the science. These separate concept illustrations leave your kitchen and its evidence unchanged.','chem-intro'));
    var topicLabel=el('label','Explore a question'),topicSelect=mark(el('select'),'topic');topics.forEach(function(t){var o=el('option',t.title);o.value=t.id;topicSelect.append(o);});topicLabel.append(topicSelect);body.append(topicLabel);
    var question=el('h3'),predictLabel=el('label','1 · Make a prediction'),predict=mark(el('select'),'predict'),predictionText=el('p',undefined,'chem-note');predictLabel.append(predict);body.append(question,predictLabel,predictionText,el('p','Predictions are for thinking, not scoring. They stay here until you reset or reload this page.','chem-note'));
    var controls=el('div',undefined,'chem-controls'),compare=button('2 · Compare examples',function(){if(locked||memory().prediction==='')return;memory().revealed=true;renderResult();announce.textContent='Comparison shown. Read the observations, then explore the explanation.';},'compare'),reset=button('Reset this question',function(){if(locked)return;memories[selected]={prediction:'',revealed:false,salt:10,bubbles:false};render();predict.focus();announce.textContent='This question has been reset.';},'reset');controls.append(compare,reset);body.append(controls);
    var result=mark(el('section',undefined,'chem-result'),'result');result.hidden=true;body.append(result);
    var announce=el('p',undefined,'chem-status');announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');body.append(announce);
    topicSelect.addEventListener('change',function(){selected=topicSelect.value;render();announce.textContent='';});
    predict.addEventListener('change',function(){memory().prediction=predict.value;predictionText.textContent=predict.value===''?'':current().choices[Number(predict.value)];compare.disabled=locked||predict.value==='';if(memory().revealed)renderResult();});
    panel.addEventListener('toggle',function(){if(panel.open&&onOpen)onOpen();});
    host.addEventListener('focusin',function(){if(panel.open&&onOpen)onOpen();});
    doc.querySelectorAll('[data-open-chemistry]').forEach(function(link){link.addEventListener('click',function(e){e.preventDefault();panel.open=true;if(onOpen)onOpen();summary.focus({preventScroll:true});host.scrollIntoView({block:'start'});});});
    function diagram(kind,label){
      var drawing=el('div',undefined,'chem-drawing chem-'+kind);drawing.setAttribute('aria-hidden','true');
      var vessel=el('div',undefined,'chem-vessel');drawing.append(vessel);
      if(kind==='wet'||kind==='dry'){for(var i=0;i<5;i++){var piece=el('i',undefined,'chem-food');piece.style.left=(kind==='wet'?26+i*10:12+i*17)+'%';piece.style.top=(kind==='wet'?34+(i%2)*19:57)+'%';vessel.append(piece);}if(kind==='wet')vessel.append(el('span','≈ ≈ ≈','chem-steam'));}
      else if(kind==='oil-rest')vessel.append(el('div',undefined,'chem-oil-layer'));
      else if(kind==='oil-mixed'||kind==='starchy'){for(var j=0;j<12;j++){var dot=el('i',undefined,kind==='starchy'?'chem-chain':'chem-droplet');dot.style.left=(13+(j*29)%77)+'%';dot.style.top=(30+(j*17)%55)+'%';vessel.append(dot);}}
      else if(kind==='salt')for(var k=0;k<6;k++){var ion=el('i',k%2?'−':'+','chem-ion');ion.style.left=(14+k*13)+'%';ion.style.top=(43+(k%2)*28)+'%';vessel.append(ion);}
      drawing.append(el('span',label,'chem-drawing-label'));return drawing;
    }
    function pair(left,right){var row=el('div',undefined,'chem-pair');[left,right].forEach(function(sample){var card=el('article');card.append(el('h4',sample[0]),diagram(sample[1],sample[2]),el('p',sample[3]));row.append(card);});result.append(row);}
    function molecular(t){
      var details=mark(el('details',undefined,'chem-molecular'),'molecular');details.append(el('summary','Look closer · molecules and materials'));
      var maps={'salt-boiling':['Water molecules + dissolved ions','Lower water vapour pressure','Slightly higher boiling temperature'],browning:['Reducing sugars + amino groups','A series of reactions','New aromas and brown compounds'],starch:['Starch granules + hot water','Swelling and released starch chains','Water flows less freely'],emulsion:['Oil and water layers','Mixing makes smaller oil droplets','Droplets can join again while resting']};
      var flow=el('ol',undefined,'chem-molecule-flow');maps[t.id].forEach(function(text){flow.append(el('li',text));});details.append(flow,el('p',t.molecular),el('p','Concept diagram; particle sizes, amounts, and reaction steps are simplified.','chem-note'));result.append(details);
    }
    function renderResult(){
      var m=memory(),t=current();result.hidden=locked||!m.revealed;result.replaceChildren();if(result.hidden)return;
      result.append(el('p','Your prediction: '+t.choices[Number(m.prediction)],'chem-prediction'));
      if(t.id==='salt-boiling'){
        var saltLabel=el('label','Dissolved salt per 1 kg of water'),slider=mark(el('input'),'salt');slider.type='range';slider.min='0';slider.max='20';slider.step='1';slider.value=String(m.salt);slider.setAttribute('aria-label','Grams of salt per kilogram of water');var amount=el('output',m.salt+' g');saltLabel.append(slider,amount);result.append(saltLabel);
        pair(['Plain water','water','Same pressure','Approximate boiling point: 100.00°C.'],['Salt solution','salt','Same pressure','An ideal dilute-solution estimate, not a thermometer reading.']);
        var temperature=mark(el('output',boilingPoint(m.salt).toFixed(2)+'°C'),'boiling');temperature.setAttribute('aria-label','Estimated salt solution boiling point');result.querySelector('.chem-pair article:last-child').append(temperature);
        var estimate=el('p','Estimate at 1 atmosphere: ΔT ≈ 2 × 0.512 × (salt grams ÷ 58.44). Assumes ideal behaviour and complete dissociation. Real solutions differ; this does not calculate time to boil.','chem-note');result.append(estimate);
        function saltDrawing(){result.querySelectorAll('.chem-ion').forEach(function(ion){ion.hidden=m.salt===0;});result.querySelector('.chem-salt .chem-drawing-label').textContent=m.salt===0?'No salt added':'Dissolved ions · not to scale';}saltDrawing();
        slider.addEventListener('input',function(){m.salt=Number(slider.value);amount.textContent=m.salt+' g';temperature.textContent=boilingPoint(m.salt).toFixed(2)+'°C';saltDrawing();});
        var bubbleNote=mark(el('p','A grain can provide a place for a bubble to start before it dissolves. This is nucleation. A burst of bubbles does not show that the water suddenly became hotter.','chem-bubble-note'),'bubble-note');bubbleNote.hidden=!m.bubbles;
        var bubbles=button('What about the sudden bubbles?',function(){m.bubbles=!m.bubbles;bubbleNote.hidden=!m.bubbles;bubbles.setAttribute('aria-expanded',String(m.bubbles));},'bubbles');bubbles.setAttribute('aria-expanded',String(m.bubbles));result.append(bubbles,bubbleNote);
      }else if(t.id==='browning')pair(['Wet, crowded surface','wet','Water needs to evaporate','Released water can keep the food surface wet and delay browning.'],['Drier, spaced surface','dry','More opportunity to brown','Once surface water evaporates, the surface can get hotter and browning reactions can speed up.']);
      else if(t.id==='starch')pair(['Equal splash of plain water','water','Water added · no starch added','Plain water dilutes the starch already in a sauce.'],['Equal splash of starchy water','starchy','Water and cooked starch added','This splash carries some starch too. Its concentration determines whether the sauce becomes thicker or thinner.']);
      else pair(['Oil and water at rest','oil-rest','Separate phases','Oil can collect in a layer instead of staying spread through the water.'],['After mixing','oil-mixed','Oil droplets dispersed in water','Mixing breaks oil into smaller droplets. They may join again; stabilizing ingredients can help slow separation.']);
      result.append(el('p','Illustrated comparison · these are conceptual examples, not observations recorded from your current cook.','chem-note'),el('h4','3 · Explain what changed'),el('p',t.summary,'chem-explanation'));
      molecular(t);result.append(el('h4','Connect it to your kitchen'),el('p',t.tryIt),el('p',t.scope,'chem-note'));
      if(t.id==='starch'||t.id==='emulsion'){
        var experiment=el('a',t.id==='starch'?'Try it · compare equal splashes':'Try it · follow oil through mixing and resting','chem-experiment');experiment.href='recipe_lab_investigation.html?focus='+t.id+'#benchPlan';experiment.setAttribute('data-chem-experiment',t.id);result.append(experiment,el('p','Opens a prepared comparison plan. Make your own prediction before running both sauces.','chem-note'));
      }
      var sources=el('details',undefined,'chem-sources');sources.append(el('summary','Sources and further reading'));var links=el('ul');t.sources.forEach(function(s){var li=el('li'),a=el('a',s.title);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);links.append(li);});if(t.id==='salt-boiling'){var li=el('li'),a=el('a','OpenStax · boiling-point elevation model');a.href='https://openstax.org/books/chemistry/pages/11-4-colligative-properties';a.target='_blank';a.rel='noopener noreferrer';li.append(a);links.append(li);}sources.append(links);result.append(sources);
    }
    function render(){
      var t=current(),m=memory();question.textContent=t.question;topicSelect.value=selected;predict.replaceChildren();var first=el('option','Choose what you expect…');first.value='';predict.append(first);t.choices.forEach(function(choice,i){var o=el('option',choice);o.value=String(i);predict.append(o);});predict.value=m.prediction;predictionText.textContent=m.prediction===''?'':t.choices[Number(m.prediction)];compare.disabled=locked||m.prediction==='';renderResult();
    }
    function update(options){
      options=options||{};var nextLocked=!!options.locked,changed=locked!==nextLocked;locked=nextLocked;onOpen=options.onOpen||onOpen;
      if(options.context!==undefined&&context!==options.context){context=options.context;if(topics.some(function(t){return t.id===options.topic;}))selected=options.topic;changed=true;}
      gate.hidden=!locked;body.hidden=locked;host.dataset.chemLocked=String(locked);if(changed)render();
    }
    host.chemistryPanel={update:update};render();return host.chemistryPanel;
  }
  var api={boilingPoint:boilingPoint,mount:mount,update:function(host,options){var panel=mount(host);if(panel)panel.update(options);}};root.KitchenChemistry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined')document.querySelectorAll('[data-kitchen-chemistry]').forEach(function(host){var panel=mount(host);if(panel)panel.update({topic:host.dataset.chemDefault||'salt-boiling',context:'initial'});});
})(typeof window!=='undefined'?window:globalThis);
