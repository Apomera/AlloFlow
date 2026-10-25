/* A committed-water map, not a live spoon observation. The supplied record owns
 * freshness, water accounting and mixing; this read-only view changes none. */
(function(root){
  'use strict';
  var mounted=0,svgNS='http://www.w3.org/2000/svg';
  function amount(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
  function quantity(value,digits,unit){if(!amount(value))return 'Not available';var smallest=Math.pow(10,-digits);return value>0&&value<smallest?'Trace (<'+smallest+' '+unit+')':String(Number(value.toFixed(digits)))+' '+unit;}
  function same(a,b){return amount(a)&&amount(b)&&Math.abs(a-b)<=1e-7*Math.max(1,a,b);}
  function clock(value){var seconds=Math.floor(value);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function budgetData(budget,live){
    if(!budget||budget.complete!==true||budget.balanced!==true)return null;
    var names=['initialMl','plainAddedMl','savedAddedMl','tomatoAddedMl','absorbedMl','evaporatedMl','currentMl'];
    if(!names.every(function(key){return amount(budget[key]);}))return null;
    var supplied=budget.initialMl+budget.plainAddedMl+budget.savedAddedMl+budget.tomatoAddedMl,total=budget.currentMl+budget.absorbedMl+budget.evaporatedMl;
    if(!Number.isFinite(supplied)||!Number.isFinite(total)||!same(supplied,total)||!same(budget.currentMl,live.freeWaterMl))return null;
    return {total:total,free:budget.currentMl,absorbed:budget.absorbedMl,evaporated:budget.evaporatedMl};
  }
  function observation(value){
    return value&&Number.isInteger(value.actionNumber)&&value.actionNumber>0&&amount(value.time)&&value.reading&&value.reading.kind==='sauce'&&typeof value.reading.label==='string'&&value.reading.label.trim()?value:null;
  }
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument)throw new TypeError('Provide a sauce water-map container.');
    var host=options.container,doc=host.ownerDocument,uid='avatar-sauce-map-'+(++mounted)+'-',destroyed=false;
    function element(tag,key,text,className){var node=doc.createElement(tag);if(key)node.dataset.avatarSauce=key;if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    var panel=element('section','panel',undefined,'avatar-sauce-map');panel.hidden=true;panel.setAttribute('aria-labelledby',uid+'title');
    var eyebrow=element('p',null,'COMMITTED QUANTITIES','avatar-sauce-map-eyebrow'),title=element('h4','title','Sauce water map');title.id=uid+'title';
    var diagram=doc.createElementNS(svgNS,'svg');diagram.dataset.avatarSauce='diagram';diagram.classList.add('avatar-sauce-map-diagram');diagram.setAttribute('viewBox','0 0 280 106');diagram.setAttribute('aria-hidden','true');diagram.setAttribute('focusable','false');
    diagram.innerHTML='<defs><pattern id="'+uid+'pending" width="6" height="6" patternUnits="userSpaceOnUse"><path class="avatar-sauce-map-hatch" d="M-1 1 1-1M0 6 6 0M5 7 7 5" stroke="#325b67" stroke-width="1.8"/></pattern></defs><path class="avatar-sauce-map-route" d="M105 65H153Q162 65 162 56V29H189M162 56V81H189" fill="none" stroke="#90a18d" stroke-width="2" stroke-dasharray="3 4"/><path class="avatar-sauce-map-route" d="M183 25 189 29 183 33M183 77 189 81 183 85" fill="none" stroke="#90a18d" stroke-width="2" stroke-linejoin="round"/><ellipse class="avatar-sauce-map-shadow" cx="66" cy="86" rx="48" ry="7" fill="#66523d" opacity=".12"/><path class="avatar-sauce-map-pan" d="M19 62Q19 88 65 88T111 62L127 58 129 65 112 72" fill="#718a77" stroke="#46634f" stroke-width="2"/><ellipse class="avatar-sauce-map-rim" cx="65" cy="62" rx="46" ry="15" fill="#b5c5b2" stroke="#46634f" stroke-width="2"/><ellipse data-avatar-sauce="sauce-art" class="avatar-sauce-map-sauce" cx="65" cy="61" rx="40" ry="11" fill="#b88b53"/><path class="avatar-sauce-map-highlight" d="M35 59Q62 47 94 58" fill="none" stroke="#efd3a2" stroke-width="2"/><ellipse data-avatar-sauce="pending-art" cx="80" cy="64" rx="17" ry="5" fill="url(#'+uid+'pending)" stroke="#325b67" stroke-width="1" hidden/><g class="avatar-sauce-map-steam" fill="none" stroke="#8399a2" stroke-width="2.4" stroke-linecap="round"><path d="M206 36Q198 29 206 22T206 9M218 39Q210 32 218 25T218 12M230 36Q222 29 230 22T230 9"/></g><g class="avatar-sauce-map-pasta" fill="none" stroke="#c09b58" stroke-width="5" stroke-linecap="round"><path d="M202 69Q207 64 210 70L213 87M217 68Q222 63 225 69L228 86M231 71Q236 66 239 72L242 88"/></g><path class="avatar-sauce-map-pasta-lines" d="M207 71 211 85M222 70 226 84M236 73 240 86" fill="none" stroke="#f1dc9c" stroke-width="1.1"/><g data-avatar-sauce="preview-tool" class="avatar-sauce-map-preview-tool" hidden fill="none" stroke="#376a58" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"><path d="M39 22 62 56"/><ellipse cx="65" cy="61" rx="6" ry="10" transform="rotate(-32 65 61)"/><path d="M41 70Q74 81 96 64M89 64 96 64 95 71"/></g>';
    var total=element('p','total',undefined,'avatar-sauce-map-total'),bar=element('div','water-bar',undefined,'avatar-sauce-map-waterbar');bar.setAttribute('aria-hidden','true');
    var segments={};['free','absorbed','evaporated'].forEach(function(key){var part=element('span','water-'+key,undefined,'avatar-sauce-map-waterpart avatar-sauce-map-'+key);bar.append(part);segments[key]=part;});
    var ledger=element('dl','water-ledger',undefined,'avatar-sauce-map-ledger'),waterRows={};[['free','In sauce'],['absorbed','In pasta'],['evaporated','Evaporated']].forEach(function(pair){var row=element('div',null,undefined,'avatar-sauce-map-ledger-'+pair[0]),term=element('dt',null,pair[1]),value=element('dd',pair[0]);row.append(term,value);ledger.append(row);waterRows[pair[0]]=value;});
    var pendingBox=element('div','pending',undefined,'avatar-sauce-map-pending'),pendingText=element('p','pending-text'),pendingBar=element('div','pending-bar',undefined,'avatar-sauce-map-pendingbar'),pendingFill=element('span','pending-fill');pendingBar.setAttribute('aria-hidden','true');pendingBar.append(pendingFill);pendingBox.append(pendingText,pendingBar);
    var facts=element('dl','facts',undefined,'avatar-sauce-map-facts'),factRows={};[['starch','Starch in sauce'],['oil','Oil in sauce'],['temperature','Pan temperature']].forEach(function(pair){var row=element('div'),term=element('dt',null,pair[1]),value=element('dd',pair[0]);row.append(term,value);facts.append(row);factRows[pair[0]]=value;});
    var check=element('div','check',undefined,'avatar-sauce-map-check'),checkMeta=element('p','check-meta'),checkLabel=element('strong','check-label'),freshness=element('p','check-freshness');check.append(checkMeta,checkLabel,freshness);
    var scope=element('p','scope','Water destinations are model quantities. Spoon checks record flow and coating.','avatar-sauce-map-scope'),previewNote=element('p','preview-note',undefined,'avatar-sauce-map-preview-note');previewNote.hidden=true;
    panel.append(eyebrow,title,diagram,total,bar,ledger,pendingBox,facts,check,scope,previewNote);host.append(panel);
    var sauceArt=diagram.querySelector('[data-avatar-sauce=sauce-art]'),pendingArt=diagram.querySelector('[data-avatar-sauce=pending-art]'),previewTool=diagram.querySelector('[data-avatar-sauce=preview-tool]');
    function svgVisible(node,visible){if(visible)node.removeAttribute('hidden');else node.setAttribute('hidden','');}
    function update(value){
      if(destroyed)return false;var data=value||{},live=data.live;panel.hidden=!live||typeof live!=='object';if(panel.hidden)return false;
      var budget=budgetData(data.waterBudget,live),pending=amount(live.pendingLiquidMl)&&amount(live.freeWaterMl)&&live.pendingLiquidMl<=live.freeWaterMl+1e-7?live.pendingLiquidMl:null,pendingFraction=pending===null?null:live.freeWaterMl>0?Math.min(1,pending/live.freeWaterMl):0;
      panel.dataset.budget=budget?'balanced':'unavailable';panel.dataset.recipe=data.recipe==='tomato'?'tomato':'mushroom';sauceArt.setAttribute('fill',data.recipe==='tomato'?'#bd7047':'#b88b53');
      total.textContent=budget?quantity(budget.total,2,'mL')+' water accounted for':'Water accounting not available';
      ['free','absorbed','evaporated'].forEach(function(key){var value=budget?budget[key]:key==='free'?live.freeWaterMl:null;waterRows[key].textContent=quantity(value,2,'mL');var fraction=budget&&budget.total>0?budget[key]/budget.total:0;segments[key].style.width=String(fraction*100)+'%';segments[key].dataset.fraction=budget?String(fraction):'';});
      bar.dataset.available=String(!!budget);bar.dataset.empty=String(!!budget&&budget.total===0);pendingBox.dataset.known=String(pending!==null);pendingBox.dataset.needsMixing=typeof live.needsMixing==='boolean'?String(live.needsMixing):'unknown';pendingBar.hidden=pendingFraction===null;pendingFill.style.width=String((pendingFraction||0)*100)+'%';pendingFill.dataset.fraction=pendingFraction===null?'':String(pendingFraction);svgVisible(pendingArt,pending!==null&&pending>0&&live.needsMixing===true);
      pendingText.textContent=pending===null?'Added-liquid distribution not available.':pending===0?'No added liquid awaits mixing.':quantity(pending,2,'mL')+' awaiting mixing — included in the sauce water.';
      factRows.starch.textContent=quantity(live.starchG,3,'g');factRows.oil.textContent=quantity(live.oilMl,2,'mL');factRows.temperature.textContent=quantity(live.temperature,1,'°C');
      var latest=observation(data.latest),fresh=data.latestFresh===true?true:data.latestFresh===false?false:null;check.dataset.freshness=latest?fresh===true?'current':fresh===false?'historical':'unknown':'unobserved';check.dataset.actionNumber=latest?String(latest.actionNumber):'';
      checkMeta.textContent=latest?'Last spoon check · action '+latest.actionNumber+' · '+clock(latest.time)+(latest.actor==='demonstrator'?' · Watch':latest.actor==='learner'?' · Learner':''):'Last spoon check';checkLabel.textContent=latest?latest.reading.label:'No check recorded';freshness.textContent=!latest?'Prepare a spoon check to observe the coating.':fresh===true?'Current recorded evidence.':fresh===false?'Earlier evidence. Check again after changes.':'Observation freshness not available.';
      var preview=data.preview,active=!!preview&&preview.active===true;panel.dataset.preview=String(active);previewNote.hidden=!active;svgVisible(previewTool,active&&preview.kind==='fold');previewNote.textContent=(active&&preview.kind==='fold'?'Folding preview':active&&preview.kind==='pour'?'Pouring preview':'Movement preview')+': quantities and the last check stay unchanged until Release.';
      return true;
    }
    return {element:panel,update:update,destroy:function(){if(destroyed)return;destroyed=true;panel.remove();}};
  }
  var api={mount:mount};if(typeof module==='object'&&module.exports)module.exports=api;root.KitchenAvatarSauce=api;
})(typeof globalThis!=='undefined'?globalThis:this);
