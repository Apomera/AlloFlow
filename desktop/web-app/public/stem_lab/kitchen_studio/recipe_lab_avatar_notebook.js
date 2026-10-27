/* Read-only action notebook. It renders committed receipt projections supplied
 * by the owner; browsing never restores a session, stages a tool, or saves data. */
(function(root){
  'use strict';
  var mounted=0;
  function mount(options){
    options=options||{};
    var host=options.container,readTimeline=options.readTimeline,readAction=options.readAction;
    if(!host||!host.ownerDocument||typeof readTimeline!=='function'||typeof readAction!=='function')throw new TypeError('The action notebook needs a container and two read-only evidence callbacks.');
    var doc=host.ownerDocument,uid='avatar-notebook-'+(++mounted)+'-',listeners=[],disposed=false,attemptKey,initialized=false,timeline=null,selected=null,followLatest=true,lastCount=-1;
    function el(tag,text,className){var node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    function part(tag,key,text,className){var node=el(tag,text,className);node.dataset.avatarNotebook=key;node.id=uid+key;return node;}
    function listen(node,type,handler){node.addEventListener(type,handler);listeners.push([node,type,handler]);}
    function say(value){if(status.textContent!==value)status.textContent=value;}
    function clock(value){var seconds=Number.isFinite(value)?Math.max(0,value):0;return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');}
    function format(value,unit,signed){
      if(value===null||value===undefined||typeof value==='number'&&!Number.isFinite(value))return 'Not available';
      if(typeof value!=='number')return String(value)+(unit?' '+unit:'');
      if(signed&&value===0)return 'No change';
      var digits=unit==='°C'?1:unit==='mL'?2:3,threshold=Math.pow(10,-digits),magnitude=Math.abs(value),prefix=value<0?'−':signed&&value>0?'+':'';
      if(magnitude>0&&magnitude<threshold)return prefix+'trace (< '+threshold+(unit?' '+unit:'')+')';
      return prefix+String(Number(magnitude.toFixed(digits)))+(unit?' '+unit:'');
    }
    function actor(value){return value==='demonstrator'?'Demonstrator':value==='learner'?'Learner':value||'Recorded actor';}
    function method(value){return value==='keyboard'?'Keyboard':value==='pointer'?'Pointer':value==='button'?'Button':value==='demonstrator'?'Watch':value||'Recorded input';}
    var section=part('section','panel',undefined,'avatar-notebook');section.setAttribute('aria-labelledby',uid+'title');
    var eyebrow=el('p','RETRACE YOUR CHOICES','avatar-eyebrow'),heading=part('h4','title','Review a recorded action'),note=part('p','help','Browse what changed and what was actually observed. Your kitchen and prepared movement stay as they are.','avatar-small');
    var empty=part('p','empty','Release a prepared action to begin this review. Supplied setup and movement previews are not recorded actions.','avatar-notebook-empty');
    var controls=part('div','controls',undefined,'avatar-notebook-controls'),label=el('label','Recorded action');label.htmlFor=uid+'select';
    var select=part('select','select');select.setAttribute('aria-describedby',uid+'help');label.append(select);
    var buttons=el('div',undefined,'avatar-notebook-buttons'),previous=part('button','previous','Previous'),next=part('button','next','Next'),latest=part('button','latest','Latest');
    [previous,next,latest].forEach(function(button){button.type='button';button.setAttribute('aria-controls',uid+'detail');button.setAttribute('aria-label',button.textContent+' recorded action');buttons.append(button);});controls.append(label,buttons);
    var readDetail=part('button','read-detail','Read action details');readDetail.type='button';readDetail.setAttribute('aria-controls',uid+'detail');buttons.append(readDetail);
    var detail=part('div','detail',undefined,'avatar-notebook-detail'),position=part('p','position',undefined,'avatar-notebook-position'),actionHeading=part('h5','action'),metadata=part('p','metadata',undefined,'avatar-notebook-meta'),time=part('p','time',undefined,'avatar-notebook-time');
    detail.setAttribute('role','region');detail.setAttribute('aria-labelledby',actionHeading.id);detail.setAttribute('aria-describedby',position.id);detail.tabIndex=-1;
    var tableRegion=part('div','quantities-scroll',undefined,'avatar-notebook-table-scroll'),scrollHelp=part('p','scroll-help','Scroll sideways to compare columns. With the table focused, use the left and right arrow keys.','avatar-notebook-scroll-help');
    var table=part('table','quantities',undefined,'avatar-notebook-quantities'),caption=part('caption','quantities-caption','Modeled quantities at this action','avatar-notebook-sr-caption'),visibleCaption=part('p','quantities-heading','Modeled quantities at this action','avatar-notebook-table-title'),thead=el('thead'),head=el('tr'),tbody=el('tbody');
    visibleCaption.setAttribute('aria-hidden','true');
    tableRegion.setAttribute('role','region');tableRegion.setAttribute('aria-labelledby',caption.id);scrollHelp.hidden=true;tableRegion.append(table);
    ['Quantity','Before','After','Change'].forEach(function(text){var th=el('th',text);th.scope='col';head.append(th);});thead.append(head);table.append(caption,thead,tbody);
    var viewLabel=el('label',undefined,'avatar-notebook-view-choice'),stackQuantities=part('input','stack-quantities'),viewText=el('span','Read quantities as stacked summaries');
    stackQuantities.type='checkbox';stackQuantities.setAttribute('aria-controls',tableRegion.id+' '+uid+'quantity-summaries');viewLabel.htmlFor=stackQuantities.id;viewLabel.append(stackQuantities,viewText);
    var quantitySummaries=part('ul','quantity-summaries',undefined,'avatar-notebook-quantity-summaries');quantitySummaries.setAttribute('aria-label','Modeled quantities at this action');quantitySummaries.hidden=true;
    var facts=part('ul','facts',undefined,'avatar-notebook-facts'),observation=part('section','observation',undefined,'avatar-notebook-observation');observation.setAttribute('aria-labelledby',uid+'observation-title');
    var observationTitle=part('h6','observation-title'),observationLabel=part('p','observation-label'),observationDescription=part('p','observation-description'),observationDetails=part('ul','observation-details');observation.append(observationTitle,observationLabel,observationDescription,observationDetails);
    var observationNav=part('div','observation-nav',undefined,'avatar-notebook-check-nav'),earlierCheck=part('button','earlier-check','Earlier recorded check'),laterCheck=part('button','later-check','Later recorded check');
    [earlierCheck,laterCheck].forEach(function(button){button.type='button';button.setAttribute('aria-controls',uid+'detail');observationNav.append(button);});
    var status=part('p','status',undefined,'avatar-notebook-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    detail.append(position,actionHeading,metadata,time,viewLabel,visibleCaption,scrollHelp,tableRegion,quantitySummaries,facts,observation,observationNav);section.append(eyebrow,heading,note,empty,controls,detail,status);host.append(section);
    function updateTableScroll(){
      if(disposed)return;var overflowing=!tableRegion.hidden&&!table.hidden&&tableRegion.clientWidth>0&&tableRegion.scrollWidth>tableRegion.clientWidth+1;
      tableRegion.dataset.overflow=String(overflowing);scrollHelp.hidden=!overflowing;
      if(overflowing){tableRegion.tabIndex=0;tableRegion.setAttribute('aria-describedby',scrollHelp.id);}else{tableRegion.removeAttribute('tabindex');tableRegion.removeAttribute('aria-describedby');}
    }
    function updateQuantityView(){
      var available=tbody.childNodes.length>0,stacked=stackQuantities.checked;
      viewLabel.hidden=!available;tableRegion.hidden=!available||stacked;visibleCaption.hidden=tableRegion.hidden;quantitySummaries.hidden=!available||!stacked;
      updateTableScroll();
    }
    var resizeObserver=typeof root.ResizeObserver==='function'?new root.ResizeObserver(updateTableScroll):null;
    if(resizeObserver){resizeObserver.observe(tableRegion);resizeObserver.observe(table);}else listen(root,'resize',updateTableScroll);
    var previousObservation=null,nextObservation=null;
    function repairFocus(focused){if(!focused||!section.contains(focused)||!focused.disabled&&!focused.closest('[hidden]'))return;var target=controls.hidden?heading:select;if(target===heading)heading.setAttribute('tabindex','-1');target.focus();}
    function list(node,items){node.replaceChildren();(items||[]).forEach(function(value){node.append(el('li',value));});node.hidden=!node.childNodes.length;}
    function render(announce){
      var count=timeline?timeline.count:0,hasActions=count>0;
      empty.hidden=hasActions;controls.hidden=!hasActions;detail.hidden=!hasActions;
      section.dataset.count=String(count);section.dataset.followLatest=String(followLatest);section.dataset.selected=selected===null?'':String(selected);
      readDetail.disabled=!hasActions;readDetail.hidden=!hasActions;
      if(!hasActions){say('');return;}
      select.value=String(selected);previous.disabled=selected<=1;next.disabled=selected>=count;latest.disabled=followLatest;
      latest.textContent=selected<count?'Latest ('+(count-selected)+' later)':'Latest';
      latest.setAttribute('aria-label',latest.textContent+' recorded action');
      var review=readAction(selected);
      if(!review){readDetail.disabled=true;readDetail.hidden=true;detail.hidden=true;empty.hidden=false;empty.textContent='This recorded action is unavailable.';say(announce?'Recorded action '+selected+' of '+count+' is unavailable.':'');return;}
      position.textContent='Action '+selected+' of '+count+' · '+(followLatest?'Following latest action':'Earlier recorded action');
      actionHeading.textContent=review.label||'Recorded action';metadata.textContent=actor(review.actor)+' · '+method(review.method);
      time.textContent='Kitchen '+clock(review.startedAt)+' → '+clock(review.endedAt)+' · '+(review.durationSeconds?review.durationSeconds+' simulated seconds':'Kitchen time unchanged');
      tbody.replaceChildren();quantitySummaries.replaceChildren();(review.quantities||[]).slice(0,8).forEach(function(quantity){
        var row=el('tr'),name=el('th',quantity.label);name.scope='row';row.dataset.quantity=quantity.id;row.dataset.changed=String(!!quantity.changed);row.append(name);
        var unknown=quantity.before===null||quantity.before===undefined||quantity.after===null||quantity.after===undefined;
        var before=el('td',format(quantity.before,quantity.unit,false)),after=el('td',format(quantity.after,quantity.unit,false)),delta=el('td',unknown?'Not available':quantity.delta===null||quantity.delta===undefined?(quantity.changed?'Changed':'No change'):format(quantity.delta,quantity.unit,true));
        before.dataset.column='before';after.dataset.column='after';delta.dataset.column='change';row.append(before,after,delta);tbody.append(row);
        // Both views use the same formatted cells, including unknown and trace
        // values. Switching views never computes or records another quantity.
        var summary=el('li'),title=el('h6',quantity.label),values=el('dl');summary.dataset.quantity=quantity.id;summary.dataset.changed=row.dataset.changed;
        [['Before',before],['After',after],['Change',delta]].forEach(function(pair){var value=el('div');value.append(el('dt',pair[0]),el('dd',pair[1].textContent));values.append(value);});summary.append(title,values);quantitySummaries.append(summary);
      });table.hidden=!tbody.childNodes.length;updateQuantityView();
      list(facts,review.details);
      var check=review.observation;
      observation.dataset.recorded=String(!!check);
      observationTitle.textContent=check?'Observation recorded at this action':'No new observation at this action';
      observationLabel.textContent=check?(check.label||'Recorded check'):'';observationLabel.hidden=!check;
      observationDescription.textContent=check?(check.description||''):'These are recorded quantities. This action did not record a new food check.';observationDescription.hidden=!observationDescription.textContent;
      list(observationDetails,check&&check.details);
      previousObservation=Number.isInteger(review.previousObservationAction)?review.previousObservationAction:null;nextObservation=Number.isInteger(review.nextObservationAction)?review.nextObservationAction:null;
      earlierCheck.hidden=previousObservation===null;laterCheck.hidden=nextObservation===null;observationNav.hidden=earlierCheck.hidden&&laterCheck.hidden;
      earlierCheck.textContent='Earlier recorded check'+(previousObservation===null?'':' · '+previousObservation);laterCheck.textContent='Later recorded check'+(nextObservation===null?'':' · '+nextObservation);
      if(announce){var recorded=check?[check.label,check.description].filter(Boolean).map(function(value){return /[.!?]$/.test(value)?value:value+'.';}).join(' '):'No new observation was recorded at this action.';say('Reviewing action '+selected+' of '+count+': '+(review.label||'Recorded action')+'. '+actor(review.actor)+' record at kitchen '+clock(review.endedAt)+'. '+(check?'Observation at this action: ':'')+recorded+' Use Read action details for quantities and recorded notes.');}
    }
    function choose(value){if(disposed||!timeline||!Number.isInteger(value)||value<1||value>timeline.count){select.value=selected===null?'':String(selected);return;}if(value===selected&&followLatest===(value===timeline.count))return;var focused=doc.activeElement;selected=value;followLatest=value===timeline.count;render(true);repairFocus(focused);}
    listen(select,'change',function(){choose(Number(select.value));});listen(previous,'click',function(){choose(selected-1);});listen(next,'click',function(){choose(selected+1);});listen(latest,'click',function(){choose(timeline&&timeline.count);});listen(earlierCheck,'click',function(){choose(previousObservation);});listen(laterCheck,'click',function(){choose(nextObservation);});
    listen(readDetail,'click',function(){if(!disposed&&!detail.hidden)detail.focus();});
    listen(stackQuantities,'change',function(){if(disposed)return;var focused=doc.activeElement;updateQuantityView();repairFocus(focused);});
    function update(state){
      if(disposed)return;state=state||{};var changedAttempt=!initialized||state.attemptKey!==attemptKey;
      var nextTimeline=readTimeline(),count=nextTimeline?nextTimeline.count:0,focused=doc.activeElement,oldCount=lastCount;
      if(!changedAttempt&&count===lastCount)return;
      initialized=true;attemptKey=state.attemptKey;timeline=nextTimeline;lastCount=count;
      if(changedAttempt)followLatest=true;
      if(!count)selected=null;else if(followLatest||selected===null||selected>count){selected=count;followLatest=true;}
      select.replaceChildren();(timeline&&timeline.entries||[]).forEach(function(entry){var option=el('option',entry.actionNumber+'. '+entry.label+' · '+clock(entry.endedAt));option.value=String(entry.actionNumber);select.append(option);});
      empty.textContent='Release a prepared action to begin this review. Supplied setup and movement previews are not recorded actions.';render(false);repairFocus(focused);
      if(!changedAttempt&&count>oldCount&&!detail.hidden&&focused&&section.contains(focused))say((count-oldCount)+' new recorded action'+(count-oldCount===1?'':'s')+'. '+(followLatest?'Following latest action ':'Still reviewing action ')+selected+' of '+count+'.');else say('');
    }
    update({});
    return {element:section,update:update,destroy:function(){if(disposed)return;disposed=true;if(resizeObserver)resizeObserver.disconnect();listeners.forEach(function(item){item[0].removeEventListener(item[1],item[2]);});section.remove();}};
  }
  var api={mount:mount};root.KitchenAvatarNotebook=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
