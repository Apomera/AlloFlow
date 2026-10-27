/* Optional activity discovery. Choosing a card stages an activity; the owner
 * decides when to start it. No kitchen, record or storage state lives here. */
(function(root){
  'use strict';
  var mounted=0;
  var groups=[
    {id:'prepare',label:'Prepare',path:'M5 28h30v5H5zM12 24l16-16 5 5-16 16M24 12l5 5'},
    {id:'cook',label:'Cook',path:'M7 16h25v11q0 6-6 6H13q-6 0-6-6zM32 19h5v8h-5M12 11q-4-4 0-7M20 11q-4-4 0-7M28 11q-4-4 0-7'},
    {id:'sauce',label:'Sauce',path:'M5 23q2 12 15 12t15-12zM24 23l9-17M11 19q8-5 17 0M12 28q8 4 16 0'},
    {id:'serve',label:'Serve',path:'M4 23h32M7 23a13 13 0 0 1 26 0M17 8h6M20 8v2M7 29h26M10 33h20'}
  ];
  var metadata={
    'cook-save-and-drain-pasta':{group:'cook',skills:'Sample pasta · compare saved water · stop and drain'},
    'reduce-and-check-sauce':{group:'sauce',skills:'Reduce gently · track water · recheck sauce and pasta'},
    'avatar-sauce-rescue':{group:'sauce',skills:'Compare coating · choose a liquid · fold'},
    'garlic-preparation':{group:'prepare',skills:'Slice · chop · mince'},
    'portion-and-plate':{group:'serve',skills:'Share spoonfuls · rebalance · review'},
    'soften-and-press-tomatoes':{group:'cook',skills:'Control heat · wait for yield · press · fold'},
    'tomato-texture':{group:'sauce',skills:'Press softened pieces · mix · compare'},
    'surface-drying':{group:'prepare',skills:'Blot surfaces · manage cloth capacity'},
    'pasta-weighing':{group:'prepare',skills:'Read a scale · correct a portion · transfer'},
    'reserve-and-drain':{group:'cook',skills:'Sample pasta · save water · drain'},
    'moisture-and-browning':{group:'cook',skills:'Track water loss · reveal faces · compare browning'},
    'mushroom-turning':{group:'cook',skills:'Turn pieces · compare faces · control heat'},
    'cover-and-check-pasta':{group:'cook',skills:'Move a lid · control heat · sample'},
    'cool-and-fold-sauce':{group:'sauce',skills:'Move off heat · cool · fold · compare'},
    'separate-and-check-pasta':{group:'cook',skills:'Separate clumps · cook · compare samples'},
    'precision-mushroom-cuts':{group:'prepare',skills:'Choose widths · compare evenness'},
    'space-mushrooms':{group:'cook',skills:'Place pieces · compare pan contact'},
    'rinse-and-dry-produce':{group:'prepare',skills:'Rinse · drain · blot · wring'},
    'preheat-and-load-mushrooms':{group:'cook',skills:'Preheat · carry a batch · compare temperature'},
    'finish-pasta-in-sauce':{group:'sauce',skills:'Transfer pasta · adjust water · check coating'},
    'hold-and-recheck-sauce':{group:'sauce',skills:'Pause · recheck · compare coating and texture'}
  };
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument||!Array.isArray(options.catalogue)||typeof options.onChoose!=='function')throw new TypeError('Provide a container, activity catalogue and onChoose callback.');
    var host=options.container,doc=host.ownerDocument,seen=new Set(),entries=options.catalogue.filter(function(entry){if(!entry||typeof entry.id!=='string'||!entry.id||typeof entry.title!=='string'||!entry.title||seen.has(entry.id))return false;seen.add(entry.id);return true;}).map(function(entry){var meta=Object.prototype.hasOwnProperty.call(metadata,entry.id)?metadata[entry.id]:null;return {id:entry.id,title:entry.title,description:typeof entry.description==='string'?entry.description:'',initialSetup:typeof entry.initialSetup==='string'?entry.initialSetup:'',group:meta?meta.group:'other',skills:meta?meta.skills:'Explore the supplied activity'};});
    var uid='avatar-catalog-'+(++mounted)+'-',destroyed=false,listeners=[],selected='',filter='all';
    function element(tag,text,className){var node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    function listen(node,type,fn){node.addEventListener(type,fn);listeners.push([node,type,fn]);}
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function entryFor(id){return entries.find(function(entry){return entry.id===id;});}
    function groupFor(id){return groups.find(function(group){return group.id===id;})||{id:'other',label:'More activities',path:'M8 8h9v9H8zM23 8h9v9h-9zM8 23h9v9H8zM23 23h9v9h-9z'};}
    function icon(group){var svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');path.setAttribute('d',group.path);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;}
    var details=element('details',undefined,'avatar-catalog');details.dataset.avatarCatalog='';
    var summary=element('summary'),summaryLabel=element('span','Browse '+entries.length+' kitchen activities'),summarySelected=element('span',undefined,'avatar-catalog-summary-choice');summary.append(summaryLabel,summarySelected);details.append(summary);
    var content=element('div',undefined,'avatar-catalog-content'),intro=element('p','Each activity begins with its own supplied setup. Choosing one prepares your next attempt; use Start a fresh attempt to begin. Ingredients and results do not carry between activities.','avatar-catalog-intro');intro.id=uid+'intro';content.append(intro);
    var filters=element('div',undefined,'avatar-catalog-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter kitchen activities');content.append(filters);
    var results=element('p',undefined,'avatar-catalog-results');results.id=uid+'results';results.dataset.avatarCatalogResults='';content.append(results);
    var grid=element('div',undefined,'avatar-catalog-grid');grid.id=uid+'activities';grid.setAttribute('role','group');grid.setAttribute('aria-label','Available kitchen activities');grid.setAttribute('aria-describedby',intro.id+' '+results.id);content.append(grid);
    var notice=element('p',undefined,'avatar-catalog-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.setAttribute('aria-atomic','true');content.append(notice);
    var preview=element('section',undefined,'avatar-catalog-preview');preview.id=uid+'preview';preview.tabIndex=-1;preview.setAttribute('aria-labelledby',uid+'preview-title');preview.setAttribute('aria-describedby',intro.id);
    var previewEyebrow=element('p','SELECTED FOR YOUR NEXT ATTEMPT','avatar-catalog-eyebrow'),previewTitle=element('h3');previewTitle.id=uid+'preview-title';
    var previewDescription=element('p'),previewSkills=element('p',undefined,'avatar-catalog-skills'),setup=element('details',undefined,'avatar-catalog-setup'),setupSummary=element('summary','See the supplied starting setup'),setupText=element('p');setup.append(setupSummary,setupText);
    var returnToCard=element('button','Back to selected activity','avatar-catalog-return');returnToCard.type='button';returnToCard.dataset.avatarCatalogReturn='';returnToCard.setAttribute('aria-controls',grid.id);
    preview.append(previewEyebrow,previewTitle,previewDescription,previewSkills,setup,returnToCard);content.append(preview);details.append(content);host.append(details);
    var filterButtons=[],cards=[];
    var availableGroups=groups.filter(function(group){return entries.some(function(entry){return entry.group===group.id;});});if(entries.some(function(entry){return entry.group==='other';}))availableGroups.push(groupFor('other'));
    [{id:'all',label:'All activities'}].concat(availableGroups).forEach(function(group){var count=group.id==='all'?entries.length:entries.filter(function(entry){return entry.group===group.id;}).length,button=element('button',group.label+' · '+count);button.type='button';button.dataset.avatarCatalogFilter=group.id;button.setAttribute('aria-controls',grid.id);button.setAttribute('aria-pressed','false');filters.append(button);filterButtons.push(button);listen(button,'click',function(){if(destroyed)return;if(filter!==group.id){filter=group.id;render();}text(notice,results.textContent+' Select an activity to read its setup.');});});
    entries.forEach(function(entry,index){
      var group=groupFor(entry.group),item=element('div',undefined,'avatar-catalog-item'),button=element('button',undefined,'avatar-catalog-card');button.type='button';button.dataset.avatarCatalogActivity=entry.id;button.dataset.category=entry.group;button.setAttribute('aria-pressed','false');
      var art=element('span',undefined,'avatar-catalog-icon'),words=element('span',undefined,'avatar-catalog-card-copy'),title=element('span',entry.title,'avatar-catalog-card-title'),skills=element('span',entry.skills,'avatar-catalog-card-skills'),selectedLabel=element('span','Selected for next attempt','avatar-catalog-card-selected');title.id=uid+'activity-'+index;skills.id=uid+'skills-'+index;button.setAttribute('aria-labelledby',title.id);button.setAttribute('aria-describedby',skills.id);art.append(icon(group));words.append(title,skills,selectedLabel);button.append(art,words);
      var read=element('button','Read activity details','avatar-catalog-read');read.type='button';read.dataset.avatarCatalogRead=entry.id;read.setAttribute('aria-controls',preview.id);read.setAttribute('aria-describedby',title.id);item.append(button,read);grid.append(item);cards.push({item:item,button:button,read:read,entry:entry,selectedLabel:selectedLabel});
      listen(button,'click',function(){
        if(destroyed||selected===entry.id)return;
        // The owner may explain an effect of staging this choice, such as
        // canceling a rehearsal. Publish one complete selection announcement.
        setSelected(entry.id,false,true);var feedback=options.onChoose(entry.id);
        text(notice,selectionMessage(entry)+(typeof feedback==='string'&&feedback?' '+feedback:''));
      });
      listen(read,'click',function(){if(destroyed||selected!==entry.id||read.hidden)return;setup.open=!setup.hidden;preview.focus();if(typeof previewTitle.scrollIntoView==='function')previewTitle.scrollIntoView({block:'start',inline:'nearest'});});
    });
    listen(returnToCard,'click',function(){if(destroyed)return;var target=cards.find(function(card){return card.entry.id===selected;});if(!target)return;if(target.button.hidden){filter=target.entry.group;render();text(notice,results.textContent+' The selected activity is visible.');}target.button.focus();});
    function render(){
      if(destroyed)return;var selectedEntry=entryFor(selected);details.dataset.selected=selected;details.dataset.filter=filter;
      filterButtons.forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.avatarCatalogFilter===filter));});
      cards.forEach(function(card){card.item.hidden=card.button.hidden=filter!=='all'&&card.entry.group!==filter;card.button.setAttribute('aria-pressed',String(card.entry.id===selected));card.read.hidden=card.selectedLabel.hidden=card.entry.id!==selected;});
      var visible=cards.filter(function(card){return !card.button.hidden;}).length;text(results,visible+' '+(visible===1?'activity':'activities')+' shown'+(filter==='all'?'':' in '+groupFor(filter).label)+'.');results.dataset.count=String(visible);
      preview.hidden=!selectedEntry;summarySelected.textContent=selectedEntry?'Next: '+selectedEntry.title:'';
      if(selectedEntry){previewTitle.textContent=selectedEntry.title;previewDescription.textContent=selectedEntry.description;previewSkills.textContent=selectedEntry.skills;setupText.textContent=selectedEntry.initialSetup;setup.hidden=!selectedEntry.initialSetup;}
    }
    function selectionMessage(entry){return entry.title+' is selected for your next attempt. Use Start a fresh attempt to begin.';}
    function setSelected(id,announce,deferNotice){if(destroyed||!entryFor(id))return false;var next=entryFor(id),message=selectionMessage(next);if(selected===id){if(announce&&!deferNotice)text(notice,message);return true;}var focused=doc.activeElement;selected=id;if(filter!=='all'&&filter!==next.group)filter=next.group;setup.open=false;render();if(!deferNotice)text(notice,announce?message:'');if(focused&&details.contains(focused)&&(focused.disabled||focused.closest('[hidden]'))){var target=cards.find(function(card){return card.entry.id===selected;});(details.open&&target?target.button:summary).focus();}return true;}
    var initial=typeof options.getSelected==='function'?options.getSelected():null;selected=entryFor(initial)?initial:entries.length?entries[0].id:'';filter=selected?entryFor(selected).group:'all';render();
    return {element:details,setSelected:function(id,announce){return setSelected(id,announce);},getSelected:function(){return selected;},destroy:function(){if(destroyed)return;destroyed=true;listeners.forEach(function(item){item[0].removeEventListener(item[1],item[2]);});listeners=[];details.remove();}};
  }
  var api={mount:mount};if(typeof module==='object'&&module.exports)module.exports=api;root.KitchenAvatarCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
