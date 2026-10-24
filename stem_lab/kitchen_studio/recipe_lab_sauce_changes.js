/* Evidence between completed spoon checks. Never reads live chemistry or advances time.
   Balances describe the educational model, not laboratory measurements or a proof
   that one changing variable alone caused an observed coating change. */
(function(root){
  'use strict';
  function number(value){return typeof value==='number'&&Number.isFinite(value)?value:null;}
  function difference(a,b){return a===null||b===null?null:b-a;}
  function pair(a,b,key){var before=number(a[key]),after=number(b[key]);return {before:before,after:after,change:difference(before,after)};}
  function metadata(entry,index){var r=entry.inspection;return {index:index,time:r.time,label:r.label,type:r.type};}
  function recordsFor(s){var records=[];(s.log||[]).forEach(function(e,i){if(e&&e.accepted&&e.inspection&&e.inspection.kind==='sauce')records.push({entry:e,index:i});});return records;}
  function checks(s){return recordsFor(s).map(function(r){return metadata(r.entry,r.index);});}
  function nonnegative(value){var n=number(value);return n!==null&&n>=0?n:null;}
  function positive(value){var n=number(value);return n!==null&&n>0?n:null;}
  function temperature(value){var n=number(value);return n!==null&&n>=-273.15?n:null;}
  function matches(a,b){return a!==null&&b!==null&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b));}
  function liquidTransfer(entry,index){
    var transfer=entry.transfer||{},thermal=transfer.thermal||{},amount=entry.action==='water'?50:nonnegative(entry.value);
    var event={index:index,time:nonnegative(entry.time),from:typeof transfer.from==='string'&&transfer.from.trim()?transfer.from:null,
      amountMl:amount,starchG:nonnegative(transfer.starchG),sourceTemperature:temperature(thermal.sourceTemperature),
      beforeTemperature:temperature(thermal.beforeTemperature),afterTemperature:temperature(thermal.afterTemperature),
      heatCapacityBeforeMl:positive(thermal.heatCapacityBeforeMl),heatCapacityAfterMl:positive(thermal.heatCapacityAfterMl)};
    event.complete=Object.keys(event).every(function(key){return event[key]!==null;})&&transfer.to==='sauce'&&
      matches(amount,nonnegative(transfer.amount))&&matches(amount,nonnegative(thermal.waterMl))&&
      matches(event.sourceTemperature,temperature(transfer.sourceTemperature))&&
      matches(event.heatCapacityAfterMl,event.heatCapacityBeforeMl+amount)&&
      matches(event.afterTemperature,(event.beforeTemperature*event.heatCapacityBeforeMl+event.sourceTemperature*amount)/event.heatCapacityAfterMl);
    return event;
  }
  function bulkMixing(check){
    var c=check.chemistry||{},water=nonnegative(c.waterMl),pending=nonnegative(check.pendingLiquidMl),fraction=nonnegative(check.pendingFraction);
    var valid=check.mixingModel===2&&water!==null&&pending!==null&&fraction!==null&&fraction<=1&&pending<=water+1e-7&&(water>0||pending===0)&&
      matches(fraction,water?pending/water:0)&&typeof check.needsMixing==='boolean'&&check.needsMixing===(fraction>.02);
    return valid?{amount:pending,fraction:fraction}:{amount:null,fraction:null};
  }
  function betweenChecks(s,selection){
    var records=recordsFor(s);
    if(records.length<2)return {status:'needs-checks',stale:!!records.length&&!s.pan.tasted};
    var first=records[records.length-2],last=records[records.length-1],selected=selection!==undefined,latest=last;
    if(selected){
      if(!selection||!Number.isInteger(selection.fromIndex)||!Number.isInteger(selection.toIndex)||selection.fromIndex>=selection.toIndex)return {status:'invalid-pair',stale:false};
      first=records.find(function(r){return r.index===selection.fromIndex;});last=records.find(function(r){return r.index===selection.toIndex;});
      if(!first||!last)return {status:'invalid-pair',stale:false};
    }
    var a=first.entry.inspection.chemistry||{},b=last.entry.inspection.chemistry||{};
    var water={beforeMl:number(a.waterMl),afterMl:number(b.waterMl),savedAddedMl:0,plainAddedMl:0,juiceAddedMl:0,
      evaporatedMl:difference(number(a.evaporatedWaterMl),number(b.evaporatedWaterMl)),
      absorbedMl:difference(number(a.absorbedWaterMl),number(b.absorbedWaterMl)),expectedMl:null,residualMl:null,complete:false,balanced:false};
    var actions={folds:0,heatChanges:0,panMoves:0},knownInputs=true,timed=s.mixingModel===1||s.mixingModel===2,mixingSeconds=0,mixingComplete=true,thermal=s.thermalModel===3,liquids=[];
    s.log.slice(first.index+1,last.index).forEach(function(e,offset){
      if(!e.accepted)return;
      if(thermal&&['water','pour','pourPlain'].indexOf(e.action)>=0)liquids.push(liquidTransfer(e,first.index+1+offset));
      if(e.action==='water')water.savedAddedMl+=50;
      if(e.action==='pour'||e.action==='pourPlain'){
        var dose=number(e.value);if(dose===null||dose<0)knownInputs=false;
        else water[e.action==='pour'?'savedAddedMl':'plainAddedMl']+=dose;
      }
      if(e.action==='crushTomato'){
        var juice=e.transfer&&number(e.transfer.amount);if(juice===null||juice===undefined||juice<0)knownInputs=false;else water.juiceAddedMl+=juice;
      }
      if(['stirPan','stirSweep','combine'].indexOf(e.action)>=0){actions.folds++;if(timed){var duration=number(e.durationSeconds),started=number(e.startedAt),finished=number(e.time);if(duration===null||duration<=0||started===null||finished===null||started<first.entry.inspection.time||finished>last.entry.inspection.time||Math.abs(finished-started-duration)>1e-7)mixingComplete=false;else mixingSeconds+=duration;}}
      if(e.action==='panHeat')actions.heatChanges++;
      if(e.action==='panPlace')actions.panMoves++;
    });
    water.complete=knownInputs&&[water.beforeMl,water.afterMl,water.evaporatedMl,water.absorbedMl].every(function(v){return v!==null&&v>=0;});
    if(water.complete){
      water.expectedMl=water.beforeMl+water.savedAddedMl+water.plainAddedMl+water.juiceAddedMl-water.evaporatedMl-water.absorbedMl;
      water.residualMl=water.afterMl-water.expectedMl;
      water.balanced=Math.abs(water.residualMl)<=1e-7*Math.max(1,water.beforeMl,water.afterMl);
    }
    var sp=pair(a,b,'starchG'),tp=pair(a,b,'temperature'),dispersion=pair(a,b,'dispersion'),cooling=pair(a,b,'coolingFactor'),notes=[];
    if(water.plainAddedMl>0)notes.push('Plain water adds water without adding starch.');
    if(water.savedAddedMl>0)notes.push('Cooking water carries water and starch; its concentration depends on the saved supply.');
    if(water.juiceAddedMl>0)notes.push('Pressing the tomatoes released water into the sauce.');
    if(water.evaporatedMl>1e-8)notes.push('Evaporation removed water from the sauce; the starch stayed behind.');
    if(water.absorbedMl>1e-8)notes.push('Pasta took up some free sauce water. This water remains in the dish.');
    if(cooling.change>1e-8)notes.push('Cooling increased the modelled body of the sauce as well as any change in concentration.');
    if(cooling.change< -1e-8)notes.push('Warming reduced the modelled cooling contribution to body; other changes may act at the same time.');
    if(actions.folds)notes.push(timed?'Spoon movement distributes liquid and disperses oil. During the recorded mixing time, heat exchange, evaporation and pasta water uptake can continue.':'Folding distributes liquid and disperses oil. It does not itself remove water or starch.');if(timed&&!mixingComplete)notes.push('Some mixing duration records are missing or inconsistent. Total mixing time is unknown.');
    if(last.entry.inspection.observationModel===2){
      var oilBefore=number(a.oilMl),oilAfter=number(b.oilMl);
      if(oilBefore!==null&&oilAfter!==null&&oilBefore>0&&Math.abs(oilAfter-oilBefore)<1e-7&&dispersion.change!==null){
        if(dispersion.change>1e-8)notes.push('A larger share of the oil is dispersed at the later check. The recorded total oil stayed the same; it was redistributed, not removed.');
        if(dispersion.change< -1e-8)notes.push('A smaller share of the oil is dispersed at the later check. Separation changes its distribution; the recorded total oil stayed the same.');
      }
    }
    if(last.entry.inspection.type==='unmixed'||last.entry.inspection.bodyType==='unmixed')notes.push((selected&&last.index<latest.index?'The selected later check shows unmixed liquid.':'The latest check still shows unmixed liquid.')+' Compare a fresh check after folding before judging the final coating.');
    if(!water.complete)notes.push('These older or incomplete records do not contain every water destination. Missing amounts are unknown, not zero.');
    else if(!water.balanced)notes.push('The recorded water amounts do not reconcile. Do not use this interval as a complete water balance.');
    if(last.entry.inspection.type==='scorched')notes.push('The recorded scorch damage cannot be undone by adding water or folding.');
    if(thermal&&liquids.some(function(event){return !event.complete;}))notes.push('Some liquid-addition temperature records are missing or inconsistent. Missing values are unknown, not zero.');
    notes.push('These checks show changes together. They do not establish which single change caused the result.');
    var result={status:'ready',stale:last.index===latest.index&&!s.pan.tasted,from:metadata(first.entry,first.index),to:metadata(last.entry,last.index),
      elapsedSeconds:last.entry.inspection.time-first.entry.inspection.time,water:water,
      starch:{beforeG:sp.before,afterG:sp.after,changeG:sp.change},temperature:{beforeC:tp.before,afterC:tp.after,changeC:tp.change},
      dispersion:dispersion,cooling:cooling,actions:actions,notes:notes};
    if(timed)result.mixing={seconds:mixingComplete?mixingSeconds:null,complete:mixingComplete};
    if(s.mixingModel===2){
      var bulkBefore=bulkMixing(first.entry.inspection),bulkAfter=bulkMixing(last.entry.inspection);
      result.bulkMixing={beforeMl:bulkBefore.amount,afterMl:bulkAfter.amount,beforeFraction:bulkBefore.fraction,afterFraction:bulkAfter.fraction,complete:bulkBefore.amount!==null&&bulkAfter.amount!==null};
      if(!result.bulkMixing.complete)notes.push('Some pooling observations are missing or inconsistent. The remaining unmixed amount is unknown.');
      else if(bulkAfter.amount<bulkBefore.amount)notes.push('Less free water remains awaiting incorporation. Folding distributes it; evaporation and pasta uptake can also reduce this amount.');
    }
    if(thermal)result.liquidTransfers={events:liquids,complete:liquids.every(function(event){return event.complete;})};
    if(selected)result.newerChecks=last.index<latest.index;
    return result;
  }
  // This optional explanation derives amounts only from the chosen records.
  // It leaves the historical ledger shape and the cooking protocol unchanged.
  function starchSnapshot(check){
    var c=check.chemistry||{},starch=nonnegative(c.starchG),water=nonnegative(c.waterMl),massKnown=starch!==null;
    var concentration=massKnown&&water!==null&&water>0?starch/water*100:null;
    if(!Number.isFinite(concentration))concentration=null;
    return {starchG:starch,waterMl:water,concentrationGPer100Ml:concentration,massKnown:massKnown,concentrationKnown:concentration!==null,
      heterogeneous:check.type==='unmixed'||check.bodyType==='unmixed'||check.needsMixing===true};
  }
  function starchTransfer(entry,index,startTime,endTime){
    var transfer=entry.transfer||{},dose=entry.action==='water'?50:positive(entry.value),amount=positive(transfer.amount),starch=nonnegative(transfer.starchG);
    var source=typeof transfer.from==='string'&&transfer.from.trim()?transfer.from:null,time=nonnegative(entry.time);
    var expectedSource=entry.action==='pourPlain'?source==='plain water':source==='saved cooking water'||source==='reduced cooking water';
    var complete=dose!==null&&amount!==null&&matches(dose,amount)&&starch!==null&&expectedSource&&time!==null&&startTime!==null&&endTime!==null&&time>=startTime&&time<=endTime&&transfer.to==='sauce'&&
      (entry.action!=='pourPlain'||starch===0);
    var concentration=complete?starch/amount*100:null;if(!Number.isFinite(concentration))concentration=null;
    return {index:index,time:time,from:source,waterMl:dose,starchG:starch,concentrationGPer100Ml:concentration,complete:complete};
  }
  function starchBudget(s,selection){
    var interval=betweenChecks(s,selection);if(interval.status!=='ready')return {status:interval.status};
    var first=s.log[interval.from.index].inspection,last=s.log[interval.to.index].inspection,before=starchSnapshot(first),after=starchSnapshot(last);
    var events=[],added=0,complete=true;
    s.log.slice(interval.from.index+1,interval.to.index).forEach(function(entry,offset){
      if(!entry.accepted)return;
      if(['water','pour','pourPlain'].indexOf(entry.action)>=0){
        var event=starchTransfer(entry,interval.from.index+1+offset,nonnegative(first.time),nonnegative(last.time));events.push(event);
        if(event.complete)added+=event.starchG;else complete=false;
      }
      // Tomato pressing releases retained water; this recipe model assigns no
      // extra starch to that internal transfer. A combine cannot occur between
      // legitimate sauce checks, because a check requires combined pasta.
      if(['combine','oil','produce','pasta'].indexOf(entry.action)>=0)complete=false;
    });
    if(!Number.isFinite(added))complete=false;
    var expected=complete&&before.starchG!==null?before.starchG+added:null;
    if(!Number.isFinite(expected))expected=null;
    var balanceComplete=expected!==null&&after.starchG!==null,residual=balanceComplete?after.starchG-expected:null;
    return {status:'ready',from:interval.from,to:interval.to,before:before,after:after,
      added:{starchG:complete?added:null,events:events,complete:complete},
      balance:{expectedG:expected,residualG:residual,complete:balanceComplete,balanced:balanceComplete&&matches(expected,after.starchG)}};
  }
  var api={checks:checks,betweenChecks:betweenChecks,starchBudget:starchBudget};root.KitchenSauceChanges=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
