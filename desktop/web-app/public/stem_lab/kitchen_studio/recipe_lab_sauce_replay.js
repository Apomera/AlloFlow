/* Compare recorded spoon trails. This timeline is a replay of an observation, not kitchen time. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var S=root.KitchenSauceCheck||(typeof require==='function'?require('./recipe_lab_sauce_check.js'):null);
  function mount(h){
    var doc=h.container.ownerDocument,win=doc.defaultView||root,section=doc.createElement('section');
    section.className='sauce-replay';section.hidden=true;section.setAttribute('aria-labelledby','sauceReplayTitle');
    section.innerHTML='<div class="sauce-replay-heading"><p class="sauce-replay-eyebrow">OBSERVE · REPLAY · COMPARE</p><h4 id="sauceReplayTitle">Watch your recorded sauce checks</h4><p>Move one timeline to compare how each trail closes and what stays on the spoon.</p></div><div class="sauce-replay-controls"><label for="sauceReplayTime">Time after drawing the trail <output id="sauceReplayElapsed" for="sauceReplayTime">0.00 s</output></label><input id="sauceReplayTime" type="range" min="0" max="3" step="0.05" value="0" aria-describedby="sauceReplayHelp"><div class="sauce-replay-time-labels" aria-hidden="true"><span>Just drawn</span><span id="sauceReplayEnd">3 seconds later</span></div><div class="sauce-replay-buttons"><button id="sauceReplayPlay" type="button" aria-pressed="false">Replay both checks</button><button id="sauceReplayReset" type="button">Back to the start</button></div><p id="sauceReplayHelp" class="sauce-replay-help">Drag the timeline, or use arrow keys, Home and End. Replaying an observation leaves the kitchen clock unchanged.</p><p id="sauceReplayStatus" class="sauce-replay-status" role="status" aria-live="polite" aria-atomic="true"></p></div><div class="sauce-replay-cards"><article id="sauceReplayPrevious" class="sauce-replay-card"></article><article id="sauceReplayCurrent" class="sauce-replay-card"></article></div><p class="sauce-replay-learning">Compare both checks at the same moment. A trail that closes quickly and a layer that runs off suggest a looser sauce; an open or slowly closing track with clinging patches can reflect too little free water, a thicker starch mixture, or cooling. Distinct oil beads show separation even when enough liquid remains.</p>';
    h.container.append(section);
    var selection=doc.createElement('div');selection.className='sauce-replay-selection';selection.id='sauceReplaySelectionControls';selection.innerHTML='<div class="sauce-replay-selects"><label for="sauceReplayEarlier">Earlier check<select id="sauceReplayEarlier" aria-describedby="sauceReplaySelectionHelp"></select></label><label for="sauceReplayLater">Later check<select id="sauceReplayLater" aria-describedby="sauceReplaySelectionHelp"></select></label></div><button id="sauceReplayLatestPair" type="button">Compare latest two</button><p id="sauceReplaySelectionHelp">Choose an earlier check to keep it as a reference through further adjustments. The later check follows new observations unless you choose a specific check.</p><p id="sauceReplaySelection" role="status" aria-live="polite" aria-atomic="true"></p>';section.querySelector('.sauce-replay-controls').before(selection);
    var ledger=doc.createElement('details'),ledgerSummary=doc.createElement('summary'),ledgerBody=doc.createElement('div');ledger.id='sauceChangesLedger';ledger.className='sauce-changes-ledger';ledger.hidden=true;ledgerSummary.textContent='What changed between these checks?';ledgerBody.id='sauceChangesBody';ledger.append(ledgerSummary,ledgerBody);section.querySelector('.sauce-replay-cards').after(ledger);
    var $=function(id){return section.querySelector('#'+id);},range=$('sauceReplayTime'),play=$('sauceReplayPlay'),reset=$('sauceReplayReset'),output=$('sauceReplayElapsed'),status=$('sauceReplayStatus'),current=$('sauceReplayCurrent'),previous=$('sauceReplayPrevious');
    var earlier=$('sauceReplayEarlier'),later=$('sauceReplayLater'),latestPair=$('sauceReplayLatestPair');
    var media=win.matchMedia?win.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false},view=null,stamp='',recordStamp='',active=false,disposed=false,elapsed=0,duration=3,playing=false,frame=null,lastTick=null,hasRecords=false,listeners=[],fromIndex=null,toIndex=null,lastHistorical=false;
    function listen(node,event,fn){node.addEventListener(event,fn);listeners.push([node,event,fn]);}
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    function say(value){if(status.textContent!==value)status.textContent=value;}
    function element(tag,value){var node=doc.createElement(tag);if(value!==undefined)node.textContent=value;return node;}
    function measure(value,unit,digits){return Number.isFinite(value)?Number(value.toFixed(digits===undefined?1:digits))+' '+unit:'Not recorded';}
    function change(value,unit,digits){return Number.isFinite(value)?(value>0?'+':'')+measure(value,unit,digits):'Not recorded';}
    function changesTable(caption,headers,rows){var table=element('table'),head=element('thead'),header=element('tr'),body=element('tbody');table.append(element('caption',caption));headers.forEach(function(value){var th=element('th',value);th.scope='col';header.append(th);});head.append(header);rows.forEach(function(values){var row=element('tr'),th=element('th',values[0]);th.scope='row';row.append(th);values.slice(1).forEach(function(value){row.append(element('td',value));});body.append(row);});table.append(head,body);return table;}
    function oilSnapshot(reading){
      var c=reading.chemistry||{},total=c.oilMl,free=c.freeOilMl,dispersion=c.dispersion;
      if([total,free,dispersion].some(function(value){return typeof value!=='number';}))return {error:'incomplete oil records'};
      if(!Number.isFinite(total)||!Number.isFinite(free)||!Number.isFinite(dispersion)||total<0||free<0||free>total||dispersion<0||dispersion>1||Math.abs(free-total*(1-dispersion))>1e-7*Math.max(1,total))return {error:'inconsistent oil records'};
      return {total:total,free:free,dispersed:total-free};
    }
    function oilAmount(value){return value>0&&value<.1?'<0.1 mL':measure(value,'mL');}
    function oilDistribution(from,to){
      var a=oilSnapshot(from.reading),b=oilSnapshot(to.reading);
      if(a.error||b.error){var unknown=element('p','Oil distribution is unknown: '+[a.error?'the earlier check has '+a.error:'',b.error?'the later check has '+b.error:''].filter(Boolean).join('; ')+'. The bars are not shown.');unknown.id='sauceOilDistributionUnknown';return unknown;}
      var figure=element('figure'),caption=element('figcaption','Recorded oil distribution'),scale=Math.max(a.total,b.total);figure.id='sauceOilDistribution';figure.className='sauce-oil-distribution';figure.dataset.scaleMl=String(scale);caption.id='sauceOilDistributionTitle';figure.setAttribute('aria-labelledby',caption.id);figure.append(caption);
      var legend=element('div');legend.className='sauce-oil-legend';[['dispersed','Dispersed oil · solid'],['free','Modeled free oil · hatched']].forEach(function(pair){var item=element('span'),swatch=element('i');swatch.className='sauce-oil-'+pair[0];swatch.setAttribute('aria-hidden','true');item.append(swatch,doc.createTextNode(pair[1]));legend.append(item);});figure.append(legend);
      var scaleText=element('p',scale?'Shared scale: 0–'+oilAmount(scale)+' of oil.':'Shared scale: 0 mL. Neither check records any oil.');scaleText.className='sauce-oil-scale';figure.append(scaleText);
      [[from,a,'Earlier'],[to,b,'Later']].forEach(function(item){
        var check=item[0],oil=item[1],row=element('div'),track=element('div'),label=element('strong',item[2]+' · check '+check.number+' · '+clock(check.reading.time));row.className='sauce-oil-row';row.dataset.totalMl=String(oil.total);row.dataset.dispersedMl=String(oil.dispersed);row.dataset.freeMl=String(oil.free);track.className='sauce-oil-track';track.setAttribute('aria-hidden','true');
        ['dispersed','free'].forEach(function(part){var segment=element('span');segment.className='sauce-oil-segment sauce-oil-'+part;segment.style.width=(scale?oil[part]/scale*100:0)+'%';track.append(segment);});
        var values=element('p',oil.total?oilAmount(oil.total)+' total = '+oilAmount(oil.dispersed)+' dispersed + '+oilAmount(oil.free)+' modeled free oil.':'0 mL total; no oil recorded.');values.className='sauce-oil-values';row.append(label,track,values);figure.append(row);
      });
      var help=element('p','Bar lengths show recorded modeled amounts on the same scale, not droplet sizes. Labels are rounded.');help.id='sauceOilDistributionHelp';figure.append(help);return figure;
    }
    function waterBudget(water){
      var source=[['free','Free water at the earlier check',water.beforeMl],['saved','Saved cooking water added',water.savedAddedMl],['plain','Plain water added',water.plainAddedMl],['juice','Juice released from tomatoes',water.juiceAddedMl]],
        destination=[['free','Free water at the later check',water.afterMl],['absorbed','Taken up by pasta · still in the dish',water.absorbedMl],['evaporated','Evaporated from the sauce',water.evaporatedMl]],
        values=source.concat(destination).map(function(part){return part[2];}),valid=water.complete===true&&water.balanced===true&&values.every(function(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}),input=source.reduce(function(sum,part){return sum+part[2];},0),output=destination.reduce(function(sum,part){return sum+part[2];},0);
      valid=valid&&Number.isFinite(input)&&Number.isFinite(output)&&Math.abs(input-output)<=1e-7*Math.max(1,input,output);
      if(!valid){var unknown=element('p','Water destinations are not fully reconciled in these records. A proportional water graphic is unavailable; missing amounts are unknown, not zero.');unknown.id='sauceWaterBudgetUnknown';return unknown;}
      var figure=element('figure'),caption=element('figcaption','Follow the sauce water'),scale=Math.max(input,output);figure.id='sauceWaterBudget';figure.className='sauce-water-budget';figure.dataset.scaleMl=String(scale);caption.id='sauceWaterBudgetTitle';figure.setAttribute('aria-labelledby',caption.id);figure.append(caption);
      function amount(value){return value>0&&value<.1?'<0.1 mL':measure(value,'mL');}
      var scaleText=element('p',scale?'Shared scale: 0–'+amount(scale)+' of water.':'Shared scale: 0 mL. No free water, additions, uptake or evaporation were recorded in this interval.');scaleText.className='sauce-water-scale';figure.append(scaleText);
      [['Available during this interval',source,input,'sources'],['Where that water is accounted for',destination,output,'destinations']].forEach(function(group){
        var row=element('div'),heading=element('strong',group[0]+' · '+amount(group[2])),track=element('div'),labels=element('dl');row.className='sauce-water-row';row.dataset.budgetSide=group[3];row.dataset.totalMl=String(group[2]);track.className='sauce-water-track';track.setAttribute('aria-hidden','true');labels.className='sauce-water-values';
        group[1].forEach(function(part){var segment=element('span'),label=element('div'),name=element('dt'),swatch=element('i');segment.className='sauce-water-segment sauce-water-'+part[0];segment.dataset.amountMl=String(part[2]);segment.style.width=(scale?part[2]/scale*100:0)+'%';track.append(segment);swatch.className='sauce-water-'+part[0];swatch.setAttribute('aria-hidden','true');name.append(swatch,doc.createTextNode(part[1]));label.append(name,element('dd',amount(part[2])));labels.append(label);});
        row.append(heading,track,labels);figure.append(row);
      });
      var help=element('p','The two bars account for the same water on one scale. Pasta uptake remains in the dish; evaporation leaves it. Any liquid awaiting incorporation is already part of the free water, not an extra destination. These amounts describe the selected recorded interval, not individual water molecules or the whole dish’s water content. Labels are rounded.');help.id='sauceWaterBudgetHelp';figure.append(help);return figure;
    }
    function starchBudget(model){
      if(!model||model.status!=='ready')return null;
      var panel=element('section'),heading=element('h5','Starch mass and concentration');panel.id='sauceStarchBudget';panel.className='sauce-starch-budget';heading.id='sauceStarchBudgetTitle';panel.setAttribute('aria-labelledby',heading.id);panel.append(heading);
      function nonnegative(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
      function amount(value,unit,digits){return nonnegative(value)?value>0&&value<Math.pow(10,-digits)?'<'+Math.pow(10,-digits)+' '+unit:measure(value,unit,digits):'Not recorded';}
      var cards=element('div');cards.className='sauce-starch-snapshots';
      [[model.before||{},'Earlier check','before'],[model.after||{},'Later check','after']].forEach(function(item){
        var value=item[0],card=element('article'),title=element('h6',item[1]),mass=value.massKnown===true&&nonnegative(value.starchG)?value.starchG:null,water=nonnegative(value.waterMl)?value.waterMl:null,
          concentration=value.concentrationKnown===true&&mass!==null&&water>0&&nonnegative(value.concentrationGPer100Ml)&&Math.abs(value.concentrationGPer100Ml-mass/water*100)<=1e-7*Math.max(1,value.concentrationGPer100Ml)?value.concentrationGPer100Ml:null;
        card.className='sauce-starch-snapshot';card.dataset.check=item[2];card.dataset.concentrationKnown=String(concentration!==null);card.append(title);
        var result=element('p',concentration!==null?amount(concentration,'g starch per 100 mL free water',2):'Concentration: Not recorded');result.className='sauce-starch-concentration';card.append(result);
        card.append(element('p',concentration!==null?amount(mass,'g',2)+' ÷ '+amount(water,'mL',1)+' × 100 ≈ '+amount(concentration,'g per 100 mL',2):'Starch in sauce: '+amount(mass,'g',2)+' · Free water: '+amount(water,'mL',1)));
        if(water===0)card.append(element('p','At 0 mL free water, starch-per-water concentration is undefined. This does not mean the sauce contains no starch.'));
        cards.append(card);
      });panel.append(cards);
      if((model.before||{}).heterogeneous||(model.after||{}).heterogeneous){var warning=element('p','Separate added liquid remains in at least one check. The concentration is a bulk average; thicker patches and liquid pools can differ. It does not establish that the sauce is evenly mixed.');warning.id='sauceStarchHeterogeneous';warning.className='sauce-starch-warning';panel.append(warning);}
      var added=model.added||{},balance=model.balance||{},before=model.before||{},after=model.after||{},events=Array.isArray(added.events)?added.events:[],eventTotal=events.reduce(function(total,event){return total+event.starchG;},0),
        knownAdded=added.complete===true&&nonnegative(added.starchG)&&Array.isArray(added.events)&&events.every(function(event){return event.complete===true&&nonnegative(event.starchG);})&&Number.isFinite(eventTotal)&&Math.abs(eventTotal-added.starchG)<=1e-7*Math.max(1,eventTotal,added.starchG),knownMass=before.massKnown===true&&after.massKnown===true&&nonnegative(before.starchG)&&nonnegative(after.starchG),sum=knownMass&&knownAdded?before.starchG+added.starchG:NaN,
        balanced=balance.complete===true&&balance.balanced===true&&Number.isFinite(sum)&&Math.abs(after.starchG-sum)<=1e-7*Math.max(1,sum,after.starchG);
      var massBalance=element('p',balanced?'Starch balance: '+amount(before.starchG,'g',2)+' earlier + '+amount(added.starchG,'g',2)+' added ≈ '+amount(after.starchG,'g',2)+' later. Evaporation and pasta water uptake do not remove sauce starch in this model.':'Starch added: '+(knownAdded?amount(added.starchG,'g',2):'Not recorded completely')+'. The available records do not establish a complete, reconciled starch balance.');massBalance.id='sauceStarchMassBalance';panel.append(massBalance);
      if(events.length){var receipts=element('ul');receipts.id='sauceStarchSourceConcentrations';events.forEach(function(event){
        var concentration=event.complete===true&&nonnegative(event.waterMl)&&event.waterMl>0&&nonnegative(event.starchG)&&nonnegative(event.concentrationGPer100Ml)&&Math.abs(event.concentrationGPer100Ml-event.starchG/event.waterMl*100)<=1e-7*Math.max(1,event.concentrationGPer100Ml)?event.concentrationGPer100Ml:null;
        receipts.append(element('li',(event.from||'Source not recorded')+' · '+(Number.isFinite(event.time)?clock(event.time):'time not recorded')+': '+amount(event.waterMl,'mL',1)+' carried '+amount(event.starchG,'g starch',2)+'; source concentration '+amount(concentration,'g per 100 mL',2)+'.'));
      });panel.append(receipts);}
      var help=element('p','Concentration means starch mass divided by free sauce water. Adding water can lower it; cooking water also adds starch, so its source concentration matters. Cooling can change body without changing this ratio. Oil dispersion is separate. These are modeled recorded quantities, not measured viscosity or a prediction of sauce quality. Displayed amounts are rounded.');help.id='sauceStarchBudgetHelp';panel.append(help);return panel;
    }
    function capacity(value){return Number.isFinite(value)&&value>0?value:NaN;}
    function recordedTemperature(value){return Number.isFinite(value)&&value>=-273.15?measure(value,'°C'):'Not recorded';}
    function liquidReceipts(transfers){
      var block=element('section');block.id='sauceLiquidTransferReceipts';block.className='sauce-liquid-receipts';var title=element('h5','Liquid additions between these checks');title.id='sauceLiquidTransferTitle';block.setAttribute('aria-labelledby',title.id);block.append(title);
      var events=transfers.events||[];
      if(!transfers.complete)block.append(element('p','This interval has incomplete liquid-transfer records. Missing quantities are shown as “Not recorded”.'));
      if(!events.length)block.append(element('p',transfers.complete?'No liquid additions were recorded between these checks.':'No complete liquid-addition receipt is available for this interval.'));
      events.forEach(function(event){
        var card=element('article'),heading=element('h6',(event.from||'Source not recorded')+' · action '+(Number.isInteger(event.index)?event.index+1:'unknown')+' · '+(Number.isFinite(event.time)?clock(event.time):'time not recorded')),details=element('dl');card.className='sauce-liquid-receipt';card.dataset.complete=String(event.complete===true);
        var amount=Number.isFinite(event.amountMl)&&event.amountMl>=0?event.amountMl:NaN,starch=Number.isFinite(event.starchG)&&event.starchG>=0?event.starchG:NaN;
        [['Water and starch added',measure(amount,'mL')+' · '+measure(starch,'g starch',2)],['Liquid temperature',recordedTemperature(event.sourceTemperature)],['Pan immediately before → after',recordedTemperature(event.beforeTemperature)+' → '+recordedTemperature(event.afterTemperature)],['Capacity before → after',measure(capacity(event.heatCapacityBeforeMl),'').trim()+' → '+measure(capacity(event.heatCapacityAfterMl),'').trim()+' water-equivalent mL']].forEach(function(pair){var row=element('div');row.append(element('dt',pair[0]),element('dd',pair[1]));details.append(row);});
        card.append(heading,details);if(!event.complete)card.append(element('p','This pour receipt is incomplete; the missing values are not inferred from a later check.'));block.append(card);
      });
      var help=element('p','Pour temperatures are recorded immediately before and after the addition, before later folding or clock advances. Capacity uses illustrative water-equivalent mL, not the volume of liquid in the pan.');help.id='sauceLiquidTransferHelp';block.append(help);return block;
    }
    function renderLedger(s,from,to){
      var allowed=s.mode!=='demonstrate'||s.submitted===true||!!(h.reviewAllowed&&h.reviewAllowed()),pair=from&&to?{fromIndex:from.index,toIndex:to.index}:undefined,model=allowed&&root.KitchenSauceChanges&&root.KitchenSauceChanges.betweenChecks(s,pair);
      ledger.hidden=!model||model.status!=='ready';ledgerBody.replaceChildren();if(ledger.hidden){ledger.open=false;return;}
      var water=model.water,starch=model.starch,temperature=model.temperature,actions=model.actions;
      var interval=element('p','Spoon checks at '+clock(model.from.time)+' → '+clock(model.to.time)+' · recorded actions '+(model.from.index+1)+' and '+(model.to.index+1)+' · '+clock(model.elapsedSeconds)+' of kitchen time.');interval.id='sauceChangesInterval';ledgerBody.append(interval,element('p','These are modeled changes between two deliberate spoon checks. They describe what happened together; they do not establish one cause for the result.'));
      var stale=element('p',model.newerChecks?'This is an earlier recorded pair. Newer checks exist; the ledger ends at the selected later check.':model.stale?'The dish has changed since the latest check. This ledger still ends at that recorded check; inspect again to include later changes.':'This ledger ends at the latest recorded check.');stale.id='sauceChangesStale';stale.className='sauce-changes-note';ledgerBody.append(stale);
      ledgerBody.append(waterBudget(water));
      var waterTable=changesTable('Where the sauce water went',['Recorded quantity','Amount'],[
        ['Free water at the earlier check',measure(water.beforeMl,'mL')],
        [s.rescue&&s.rescue.id==='starchy'?'Reduced cooking water added':'Saved cooking water added',measure(water.savedAddedMl,'mL')],
        ['Plain water added',measure(water.plainAddedMl,'mL')],
        ['Juice released from tomatoes',measure(water.juiceAddedMl,'mL')],
        ['Water evaporated from the sauce',measure(water.evaporatedMl,'mL')],
        ['Water absorbed by the pasta',measure(water.absorbedMl,'mL')],
        ['Free water at the later check',measure(water.afterMl,'mL')]
      ]);waterTable.id='sauceChangesWater';ledgerBody.append(waterTable);
      var balance=element('p');balance.id='sauceChangesBalance';
      if(water.complete&&water.balanced)balance.textContent='Water balance: '+measure(water.beforeMl,'mL')+' + '+measure(water.savedAddedMl,'mL')+' saved + '+measure(water.plainAddedMl,'mL')+' plain + '+measure(water.juiceAddedMl,'mL')+' juice − '+measure(water.evaporatedMl,'mL')+' evaporated − '+measure(water.absorbedMl,'mL')+' absorbed ≈ '+measure(water.afterMl,'mL')+' free water. Displayed amounts are rounded.';
      else balance.textContent=water.complete?'The recorded quantities do not reconcile closely enough to show a balanced water equation. Compare the recorded actions and observations.':'This recording does not include every quantity needed for a complete water balance. Missing values are shown as “Not recorded”.';
      ledgerBody.append(balance);
      if(root.KitchenSauceChanges.starchBudget){var starchPanel=starchBudget(root.KitchenSauceChanges.starchBudget(s,pair));if(starchPanel)ledgerBody.append(starchPanel);}
      if(model.bulkMixing){
        var bulk=model.bulkMixing,bulkContext=changesTable('Recorded added-liquid distribution',['Model quantity','Earlier','Later'],[
          ['Free water awaiting incorporation',measure(bulk.beforeMl,'mL'),measure(bulk.afterMl,'mL')],
          ['Share of free water awaiting incorporation',measure(Number.isFinite(bulk.beforeFraction)?100*bulk.beforeFraction:NaN,'%'),measure(Number.isFinite(bulk.afterFraction)?100*bulk.afterFraction:NaN,'%')]
        ]);bulkContext.id='sauceBulkMixingContext';ledgerBody.append(bulkContext);
        var bulkHelp=element('p','These estimates describe free water still awaiting incorporation. They are a subset of the free water above, not additional water. Less pending liquid can also reflect evaporation or pasta uptake; it does not by itself prove a successful mix or a finished sauce. Values come from the selected recorded checks.');bulkHelp.id='sauceBulkMixingHelp';ledgerBody.append(bulkHelp);
        if(!bulk.complete)ledgerBody.append(element('p','Added-liquid distribution is not fully recorded. Missing or inconsistent quantities are shown as “Not recorded”.'));
      }
      var context=changesTable('Other recorded changes',['Quantity','Earlier','Later','Change'],[
        ['Starch in the sauce',measure(starch.beforeG,'g',2),measure(starch.afterG,'g',2),change(starch.changeG,'g',2)],
        ['Modeled pan temperature',measure(temperature.beforeC,'°C'),measure(temperature.afterC,'°C'),change(temperature.changeC,'°C')]
      ]);context.id='sauceChangesContext';ledgerBody.append(context,element('p','The modeled pan temperature is a proxy for the sauce’s thermal conditions, not a separate thermometer measurement.'));
      var earlierChemistry=from.reading.chemistry||{},laterChemistry=to.reading.chemistry||{};
      if(earlierChemistry.thermalModel===3&&laterChemistry.thermalModel===3){
        var thermalContext=changesTable('Recorded thermal mass',['Model quantity','Earlier','Later'],[
          ['Effective capacity (water-equivalent mL)',measure(capacity(earlierChemistry.effectiveHeatCapacityMl),'').trim(),measure(capacity(laterChemistry.effectiveHeatCapacityMl),'').trim()],
          ['Response multiplier from mass',measure(capacity(earlierChemistry.thermalRateFactor),'×',2),measure(capacity(laterChemistry.thermalRateFactor),'×',2)]
        ]);thermalContext.id='sauceChangesThermalContext';ledgerBody.append(thermalContext);
        var thermalHelp=element('p','Effective capacity represents resistance to temperature change in illustrative water-equivalent mL; it is not the liquid volume in the pan. The mass multiplier is only one part of the warming or cooling rate; burner setting and pan width also matter. These values come from the selected recorded checks.');thermalHelp.id='sauceChangesThermalHelp';ledgerBody.append(thermalHelp);
        if(model.liquidTransfers)ledgerBody.append(liquidReceipts(model.liquidTransfers));
      }
      if(from.reading.observationModel===2||to.reading.observationModel===2){
        var oilRows=[['Total oil in sauce','oilMl','mL'],['Dispersed share of oil','dispersion','%'],['Modeled free oil','freeOilMl','mL']].map(function(pair){
          var a=earlierChemistry[pair[1]],b=laterChemistry[pair[1]];
          if(pair[1]==='dispersion'){a=Number.isFinite(a)&&a>=0&&a<=1?a*100:NaN;b=Number.isFinite(b)&&b>=0&&b<=1?b*100:NaN;}
          return [pair[0],measure(a,pair[2],1),measure(b,pair[2],1),change(Number.isFinite(a)&&Number.isFinite(b)?b-a:NaN,pair[1]==='dispersion'?'pp':pair[2],1)];
        });
        var oilContext=changesTable('Oil amount and distribution',['Recorded quantity','Earlier','Later','Change'],oilRows);oilContext.id='sauceChangesOilContext';ledgerBody.append(oilContext);
        var oilHelp=element('p','Folding disperses oil through the sauce; it does not remove the oil. Free oil is the model’s estimate of oil outside that dispersion. Changes in dispersed share use percentage points (pp). The visible-bead cue also depends on the modeled visibility threshold. These are modeled values from the selected recorded checks, not laboratory measurements.');oilHelp.id='sauceChangesOilHelp';ledgerBody.append(oilHelp);
        if(from.reading.observationModel===2&&to.reading.observationModel===2)ledgerBody.append(oilDistribution(from,to));
      }
      if(Number.isFinite(earlierChemistry.coolingFactor)||Number.isFinite(laterChemistry.coolingFactor)){
        var bodyRows=[['Composition contribution','warmViscosity'],['Temperature multiplier','coolingFactor'],['Resulting body index','viscosity']].map(function(pair){var a=earlierChemistry[pair[1]],b=laterChemistry[pair[1]];return [pair[0],measure(a,'',2).trim(),measure(b,'',2).trim(),change(Number.isFinite(a)&&Number.isFinite(b)?b-a:NaN,'',2).trim()];});
        var bodyContext=changesTable('How the model combines body and temperature',['Model quantity','Earlier','Later','Change'],bodyRows);bodyContext.id='sauceChangesBodyContext';ledgerBody.append(bodyContext);
        var bodyHelp=element('p','Body index = composition contribution × temperature multiplier, capped at the model’s upper limit. The composition contribution includes recipe solids and starch per free water. Warming can lower the temperature multiplier while water loss increases concentration. These are model indices, not measured viscosity units. Values come from the selected recorded checks.');bodyHelp.id='sauceChangesBodyHelp';ledgerBody.append(bodyHelp);
      }
      var decisions=element('p',actions.folds+' completed mixing actions · '+actions.heatChanges+' burner-setting actions · '+actions.panMoves+' pan-placement actions.');decisions.id='sauceChangesActions';ledgerBody.append(decisions);
      if(model.mixing){var mixingTime=element('p',model.mixing.complete?'Completed mixing time: '+model.mixing.seconds+' simulated seconds. This time is included in the interval between these checks. Both vessels continued changing during the mix.':'Completed mixing time: Not recorded completely. The interval still comes from the two recorded check times.');mixingTime.id='sauceChangesMixingTime';ledgerBody.append(mixingTime);}
      var notes=element('ul');notes.id='sauceChangesNotes';(model.notes||[]).forEach(function(note){notes.append(element('li',note));});if(notes.children.length)ledgerBody.append(notes);
      var prompt=element('p','Compare the two trails and coatings. Which recorded changes could explain the difference? What would you keep the same in another attempt?');prompt.className='sauce-changes-prompt';ledgerBody.append(prompt);
    }
    function clamp(t){return Math.max(0,Math.min(duration,Number.isFinite(t)?t:0));}
    function controls(){
      range.max=String(duration);$('sauceReplayEnd').textContent=duration+' seconds later';range.value=elapsed.toFixed(2);output.textContent=elapsed.toFixed(2)+' s';range.setAttribute('aria-valuetext',elapsed.toFixed(2)+' seconds after the trail was drawn');
      section.dataset.elapsed=elapsed.toFixed(2);section.dataset.playing=String(playing);section.dataset.reducedMotion=String(!!media.matches);
      range.disabled=!hasRecords;reset.disabled=!hasRecords;play.disabled=!hasRecords||!!media.matches;play.textContent=playing?'Pause replay':'Replay both checks';play.setAttribute('aria-pressed',String(playing));
    }
    function stop(message){if(frame!==null)win.cancelAnimationFrame(frame);frame=null;lastTick=null;playing=false;controls();if(message)say(message);}
    function observationLayers(c,coating){
      var poolScale=c.poolFraction===null?0:.35+.65*Math.sqrt(c.poolFraction||0);
      return (c.mixingModel===2&&c.pooling===true&&Number.isFinite(c.poolFraction)?'<g class="sauce-replay-liquid-pool" transform="translate(218 100) scale('+poolScale+') translate(-218 -100)"><path d="M183 96Q204 80 238 93Q258 104 237 116Q204 123 183 108Z" fill="#edcc9d" stroke="#fff2cf" stroke-width="1.5"/><path d="M200 97Q218 90 237 99" fill="none" stroke="#fff5d8" stroke-width="2"/></g>':'')+ (c.thin?'<g class="sauce-replay-rivulets" fill="none" stroke="'+coating+'" stroke-width="3" stroke-linecap="round"><path d="M57 166q9 16 3 36M73 162q10 22 5 44M84 174q-4 15 3 27"/></g><path class="sauce-replay-rivulet-drop" d="M60 199q-5 10-1 14q5-3 1-14z" fill="'+coating+'"/>':c.patches?'<g class="sauce-replay-body-ridges" fill="none" stroke="#efbd7c" stroke-width="3" stroke-linecap="round"><path d="M58 174q8-5 15 1M64 196q8-6 15 0M77 181l6 7M74 72q20-9 39-3M187 98q24-9 43-2"/></g>':'<g class="sauce-replay-film-shine" fill="none" stroke="#ffe5b6" stroke-width="2.2" stroke-linecap="round" opacity=".8"><path d="M55 178q-1-9 8-12M53 185l1 5M81 201q6-7 5-13M119 59q35-7 64-1"/></g>')+
        (c.mixingModel===2&&c.thin&&c.patches?'<g class="sauce-replay-body-ridges" fill="none" stroke="#efbd7c" stroke-width="3" stroke-linecap="round"><path d="M58 174q8-5 15 1M64 196q8-6 15 0M77 181l6 7"/></g>':'')+
        (c.oilDroplets?'<g class="sauce-replay-oil-highlights" fill="#fff2b5"><ellipse cx="87" cy="63" rx="5" ry="1.5"/><ellipse cx="215" cy="96" rx="7" ry="1.8"/><ellipse cx="193" cy="59" rx="3" ry="1.2"/><ellipse cx="63" cy="172" rx="2.5" ry="1.5"/><ellipse cx="76" cy="193" rx="3" ry="1.5"/></g>':'')+
        (c.scorched?'<g class="sauce-replay-residue" fill="#39271f" stroke="#211b16" stroke-width=".8"><path d="M111 77l7-3 8 4-2 5-9 2-6-4zM214 88l8-2 6 5-3 5-10-1zM55 177l5-2 4 3-2 5-5-1zM72 194l5-3 5 4-1 5-7-1z"/><circle cx="165" cy="99" r="2.4"/><circle cx="195" cy="67" r="2"/><circle cx="83" cy="183" r="2.2"/><circle cx="69" cy="167" r="1.7"/></g>':'');
    }
    function panArt(id,r,c,recipeId){
      var patches=c.patches,thin=c.thin,layered=r.observationModel===2,scorched=layered?c.scorched:r.type==='scorched',tomato=recipeId==='tomato',light=tomato?'#e28b55':'#d79e61',dark=tomato?'#b45231':'#ad6739',coating=tomato?'#d77946':'#cf9958',patch=tomato?'#b95c36':'#b47a40';
      return '<svg class="sauce-replay-art" viewBox="0 0 340 245" role="img" aria-labelledby="'+id+'ArtTitle '+id+'ArtDesc"><title id="'+id+'ArtTitle"></title><desc id="'+id+'ArtDesc"></desc><defs><linearGradient id="'+id+'Metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e5e9e3"/><stop offset=".3" stop-color="#98aaa0"/><stop offset=".55" stop-color="#e5e8df"/><stop offset="1" stop-color="#758c80"/></linearGradient><linearGradient id="'+id+'Sauce" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><linearGradient id="'+id+'Wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#cfa674"/><stop offset=".45" stop-color="#aa7747"/><stop offset="1" stop-color="#8a5b32"/></linearGradient></defs><g aria-hidden="true"><ellipse cx="168" cy="137" rx="140" ry="13" fill="#7a6140" opacity=".12"/><path d="M31 83 Q30 137 158 141 Q286 138 289 82" fill="url(#'+id+'Metal)" stroke="#536e60" stroke-width="2"/><path d="M285 82 L322 74 Q332 72 333 83 Q333 89 324 90 L286 94" fill="#658073" stroke="#385d47" stroke-width="2"/><path d="M300 79 L323 77" stroke="#c8d4c6" stroke-width="2" stroke-linecap="round"/><ellipse cx="158" cy="82" rx="132" ry="49" fill="url(#'+id+'Metal)" stroke="#607568" stroke-width="2"/><ellipse cx="158" cy="82" rx="121" ry="38" fill="url(#'+id+'Sauce)" stroke="#755035" stroke-width="1.5"/><path d="M57 65 Q147 30 249 62" fill="none" stroke="#f2ca8e" stroke-width="3" opacity=".7"/><g fill="#f2c58b" opacity=".85"><ellipse cx="72" cy="69" rx="8" ry="3"/><ellipse cx="219" cy="96" rx="10" ry="3"/><ellipse cx="242" cy="73" rx="7" ry="2.5"/><ellipse cx="92" cy="109" rx="7" ry="2"/></g><g fill="#58664a"><path d="M91 62l7-2-3 5z"/><path d="M220 65l5 2-6 2z"/><path d="M204 109l5-1-2 4z"/></g><rect class="sauce-replay-trail" x="49" y="72" width="218" height="20" rx="10" fill="#354c3d" stroke="#223c2c" stroke-width="1"/><ellipse cx="163" cy="205" rx="126" ry="9" fill="#745735" opacity=".1"/><path d="M86 177 L291 159 Q301 160 300 168 Q300 172 289 174 L88 193Z" fill="url(#'+id+'Wood)" stroke="#895b36" stroke-width="1.5"/><path d="M106 182 L286 166 M136 183 L257 173" fill="none" stroke="#e0b580" stroke-width="1.2" opacity=".65"/><ellipse cx="73" cy="187" rx="31" ry="37" transform="rotate(-16 73 187)" fill="url(#'+id+'Wood)" stroke="#93683e" stroke-width="1.7"/><ellipse cx="72" cy="184" rx="24" ry="29" transform="rotate(-16 72 184)" fill="#8e5f37"/><path d="M48 169 Q46 193 62 209" fill="none" stroke="#e7bd83" stroke-width="2" opacity=".75"/>'+
        (patches?'<g class="sauce-replay-coating-patches" fill="'+(scorched&&!layered?'#51392a':patch)+'"><path d="M56 170q12-8 20 1l-2 10-15 2z"/><path d="M61 190q14-9 23 0l-1 14-18 2z"/><path d="M79 178l9-3 7 12-10 5z"/></g>':'<ellipse class="sauce-replay-coating-layer" cx="72" cy="184" rx="22" ry="27" transform="rotate(-16 72 184)" fill="'+coating+'" opacity="'+(thin?'.42':'.96')+'"/><path d="M56 170 Q62 163 73 167" fill="none" stroke="#f4d394" stroke-width="2" opacity="'+(thin?'.25':'.8')+'"/>')+
        (thin?'<path class="sauce-replay-drip" d="M73 208q-5 9-2 14q4 6 8 0q2-4-6-14z" fill="'+coating+'"/>':'')+
        (c.oilDroplets?'<g class="sauce-replay-oil-droplets" fill="#efc85e" stroke="#946b24" stroke-width="1"><ellipse cx="91" cy="65" rx="12" ry="5"/><ellipse cx="221" cy="98" rx="17" ry="6"/><ellipse cx="196" cy="61" rx="8" ry="4"/><ellipse cx="65" cy="174" rx="6" ry="5"/><ellipse cx="79" cy="196" rx="8" ry="6"/></g>':'')+
        (scorched&&!layered?'<g fill="#2f281f"><circle cx="63" cy="172" r="3"/><circle cx="75" cy="198" r="4"/><circle cx="86" cy="182" r="2"/><circle cx="83" cy="89" r="2"/><circle cx="227" cy="65" r="3"/></g>':'')+(layered?observationLayers(c,coating):'')+'</g></svg>';
    }
    function card(node,id,r,isLatest,stale,historical,recipeId,meta,headingText){
      node.replaceChildren();delete node.dataset.observationModel;delete node.dataset.bodyType;delete node.dataset.scorched;
      var heading=doc.createElement('h5');heading.textContent=headingText||(isLatest?'Latest recorded check':'Previous recorded check');node.append(heading);
      if(!r){delete node.dataset.closureSeconds;delete node.dataset.type;delete node.dataset.time;delete node.dataset.checkIndex;var empty=doc.createElement('p');empty.className='sauce-replay-empty';empty.textContent=isLatest?'Draw and release a sauce trail to record your first check.':'Record a second check to compare an adjustment.';node.append(empty);return;}
      node.dataset.closureSeconds=String(r.closureSeconds);node.dataset.type=r.type;node.dataset.time=String(r.time);node.dataset.checkIndex=String(meta.index);
      var c=S.cues(r),when=doc.createElement('p');when.className='sauce-replay-when';when.textContent='Check '+meta.number+' · '+clock(r.time)+' · '+r.label;node.append(when);
      if(r.observationModel===2){node.dataset.observationModel='2';node.dataset.bodyType=c.bodyType;node.dataset.scorched=String(c.scorched);}
      var art=doc.createElement('div');art.innerHTML=panArt(id,r,c,recipeId);node.append(art.firstElementChild);
      node.querySelector('title').textContent=r.label+' at '+clock(r.time);node.querySelector('desc').textContent=r.observationModel===2?[c.track,c.coating,c.separation,c.residue,c.poolText,'Shared scale with the other recorded check.'].filter(Boolean).join(' '):c.track+'. '+c.coating+'. Shared scale with the other recorded check.';
      var details=doc.createElement('dl');details.className='sauce-replay-cues';[['Trail',c.track+(r.closureSeconds>0?' · '+r.closureSeconds.toFixed(2)+' s':'')],['Spoon',c.coating],['Oil and water',c.separation],['Residue',r.observationModel===2?c.residue:''],['Added liquid',r.mixingModel===2?c.poolText:'']].filter(function(pair){return !!pair[1];}).forEach(function(pair){var row=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=pair[0];dd.textContent=pair[1];row.append(dt,dd);details.append(row);});node.append(details);
      var description=doc.createElement('p');description.className='sauce-replay-observation';description.textContent=r.observation;node.append(description);
      if(stale&&isLatest){var note=doc.createElement('p');note.className='sauce-replay-stale';note.textContent='Earlier observation. The dish has changed since this check.';node.append(note);}
      if(historical){var recorded=doc.createElement('p');recorded.className='sauce-replay-recorded';recorded.textContent='Recorded kitchen · observation replay';node.append(recorded);}
    }
    function paint(){
      [previous,current].forEach(function(node){var art=node.querySelector('svg');if(!art)return;var closure=Number(node.dataset.closureSeconds),fraction=closure===0?1:Math.max(0,1-elapsed/closure),width=20*fraction,trail=art.querySelector('.sauce-replay-trail');trail.setAttribute('y',String(82-width/2));trail.setAttribute('height',String(width));trail.setAttribute('rx',String(Math.min(10,width/2)));trail.setAttribute('visibility',width>.001?'visible':'hidden');art.dataset.elapsed=elapsed.toFixed(2);art.dataset.trailFraction=String(fraction);art.dataset.trailWidth=String(width);});
      controls();
    }
    function tick(now){
      frame=null;
      if(disposed||!active||doc.hidden||media.matches){stop();return;}
      if(lastTick!==null){var delta=(now-lastTick)/1000;if(!Number.isFinite(delta)||delta<0||delta>.5){stop('Replay paused. Continue when you are ready.');return;}elapsed=clamp(elapsed+delta);}
      lastTick=now;paint();
      if(elapsed>=duration){stop('Replay complete. Drag the timeline to inspect any moment.');return;}
      frame=win.requestAnimationFrame(tick);
    }
    function start(){
      if(disposed||!active||!hasRecords||doc.hidden||media.matches)return;
      if(playing){stop('Replay paused.');return;}
      if(elapsed>=duration)elapsed=0;playing=true;lastTick=null;paint();say('Replaying the recorded checks together.');frame=win.requestAnimationFrame(tick);
    }
    function scrub(){if(disposed||!active||!hasRecords)return;var value=Number(range.value);stop();elapsed=clamp(value);paint();say('Timeline paused at '+elapsed.toFixed(2)+' seconds after the draw.');}
    listen(play,'click',start);listen(reset,'click',function(){if(disposed||!active||!hasRecords)return;stop();elapsed=0;paint();say('Both recorded checks returned to the start.');});listen(range,'input',scrub);listen(range,'pointerdown',function(){stop();});listen(range,'keydown',function(e){if(e.key==='Escape')stop('Replay paused.');else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].indexOf(e.key)>=0)stop();});
    listen(section,'keydown',function(e){if(e.key==='Escape')stop('Replay paused.');});listen(win,'blur',function(){stop();});listen(win,'pagehide',function(){stop();});listen(doc,'visibilitychange',function(){if(doc.hidden)stop();});
    function motionChange(){stop();say(media.matches?'Reduced motion is on. Drag the timeline to inspect each recorded check.':'Drag the timeline or replay both recorded checks.');}
    if(media.addEventListener)media.addEventListener('change',motionChange);else if(media.addListener)media.addListener(motionChange);
    function recordedChecks(s){var checks=[];(s.log||[]).forEach(function(entry,index){if(entry.accepted&&entry.inspection&&entry.inspection.kind==='sauce')checks.push({index:index,number:checks.length+1,reading:entry.inspection});});return checks;}
    function option(select,value,label){var item=element('option',label);item.value=String(value);select.append(item);}
    function checkLabel(check){return 'Check '+check.number+' · '+clock(check.reading.time)+' · '+check.reading.label;}
    function selectors(checks,from,to){
      selection.hidden=checks.length<2;earlier.disabled=later.disabled=checks.length<2;latestPair.disabled=fromIndex===null&&toIndex===null;
      earlier.replaceChildren();later.replaceChildren();option(earlier,'previous','Use previous check');option(later,'latest','Use latest check');
      checks.forEach(function(check){if(to&&check.index<to.index)option(earlier,check.index,checkLabel(check));if(check.number>1&&(fromIndex===null||check.index>fromIndex))option(later,check.index,checkLabel(check));});
      earlier.value=fromIndex===null?'previous':String(fromIndex);later.value=toIndex===null?'latest':String(toIndex);
      $('sauceReplaySelection').textContent=from&&to?'Comparing check '+from.number+' with check '+to.number+'. '+(fromIndex===null?'The earlier check follows the previous observation. ':'The earlier check is kept as your reference. ')+(toIndex===null?'The later check follows the latest observation.':'The later check is fixed; new checks will not change this pair.'):'Record two checks to choose a comparison.';
    }
    function choose(which,value){
      if(disposed||!active||!view)return;stop();elapsed=0;
      var index=value==='previous'||value==='latest'?null:Number(value);if(index!==null&&(!Number.isInteger(index)||index<0))return;
      if(which==='from')fromIndex=index;else if(which==='to')toIndex=index;else {fromIndex=null;toIndex=null;}
      render(view,lastHistorical,active);
    }
    listen(earlier,'change',function(){choose('from',earlier.value);});listen(later,'change',function(){choose('to',later.value);});listen(latestPair,'click',function(){choose('reset','previous');});
    function render(s,historical,on){
      if(disposed)return;
      if(view&&(view.log[0]!==s.log[0]||view.id!==s.id||view.mode!==s.mode||(view.rescue&&view.rescue.id)!==(s.rescue&&s.rescue.id)||lastHistorical!==!!historical)){fromIndex=null;toIndex=null;}
      var checks=recordedChecks(s),last=checks[checks.length-1]||null,to=toIndex===null?last:checks.find(function(check){return check.index===toIndex;});
      if(!to||to.number<2&&checks.length>1){toIndex=null;to=last;}
      var from=fromIndex===null?checks[to?to.number-2:-1]:checks.find(function(check){return check.index===fromIndex&&to&&check.index<to.index;});
      if(!from){fromIndex=null;from=checks[to?to.number-2:-1]||null;}
      var latest=to&&to.reading,prior=from&&from.reading,reading=S.reading(s),isLatest=to===last,nextRecord=JSON.stringify([from&&from.index,prior,to&&to.index,latest]),nextStamp=JSON.stringify([s.time,s.log.length,s.submitted,s.plated,reading&&reading.stale,!!historical]);
      if(view!==s||stamp!==nextStamp||active!==!!on)stop();
      var changed=nextRecord!==recordStamp;duration=Math.max(3,Math.ceil(Math.max(prior&&Number.isFinite(prior.closureSeconds)?prior.closureSeconds:0,latest&&Number.isFinite(latest.closureSeconds)?latest.closureSeconds:0)));if(changed)elapsed=0;else elapsed=clamp(elapsed);
      view=s;stamp=nextStamp;recordStamp=nextRecord;active=!!on;lastHistorical=!!historical;hasRecords=!!latest;section.hidden=!active;
      selectors(checks,from,to);card(previous,'sauceReplayPrevious',prior,false,false,!!historical,s.id,from,fromIndex!==null?'Reference check':null);card(current,'sauceReplayCurrent',latest,true,isLatest&&!!(reading&&reading.stale),!!historical,s.id,to,isLatest?null:'Selected later check');renderLedger(s,from,to);paint();
      if(!latest)say('No sauce check recorded yet. Record a trail, then explore its replay.');else if(changed)say(media.matches?'Recorded comparison updated. Drag the timeline to compare both observations.':'Recorded comparison updated. Replay or drag the timeline to compare both observations.');
    }
    function cancel(){if(!disposed)stop();}
    function dispose(){if(disposed)return;stop();disposed=true;listeners.forEach(function(l){l[0].removeEventListener(l[1],l[2]);});listeners=[];if(media.removeEventListener)media.removeEventListener('change',motionChange);else if(media.removeListener)media.removeListener(motionChange);section.remove();}
    controls();return {render:render,cancel:cancel,dispose:dispose};
  }
  var api={mount:mount};root.KitchenSauceReplay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
