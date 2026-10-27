/* Quiet review of a supplied movement result. Speech and cooking belong to the host. */
(function(root){
  'use strict';
  var sequence=0;
  function text(value,fallback){return typeof value==='string'&&value.trim()?value.trim():fallback||'';}
  function mount(options){
    if(!options||!options.container||!options.reviewContainer||!options.container.ownerDocument||options.container.ownerDocument!==options.reviewContainer.ownerDocument)throw new TypeError('Movement review needs result and review-button containers in the same document.');
    var doc=options.container.ownerDocument,disposed=false,last=null,signature='',uid;
    do{uid='kitchen-movement-review-'+(++sequence);}while(doc.getElementById(uid));
    function element(tag,content,className){var node=doc.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
    function write(node,value){if(node.textContent!==value)node.textContent=value;}
    var details=element('details',undefined,'kitchen-movement-review');details.id=uid;details.hidden=true;details.dataset.movementReview='result';
    var summary=element('summary','Last movement','kitchen-movement-review-summary');summary.id=uid+'-summary';summary.dataset.movementReview='summary';details.append(summary);
    var body=element('div',undefined,'kitchen-movement-review-body'),title=element('h3',undefined,'kitchen-movement-review-title'),time=element('p',undefined,'kitchen-movement-review-time'),evidence=element('p',undefined,'kitchen-movement-review-evidence'),detail=element('p',undefined,'kitchen-movement-review-detail');
    title.id=uid+'-title';time.hidden=true;detail.hidden=true;body.append(title,time,evidence,detail);details.append(body);options.container.append(details);
    var help=element('span','No movement result yet. Use a kitchen tool, then review what happened and what to try next.','kitchen-movement-review-help');help.id=uid+'-help';
    var button=element('button','Review movement','kitchen-movement-review-button');button.id=uid+'-open';button.type='button';button.dataset.movementReview='button';button.setAttribute('aria-controls',uid);button.setAttribute('aria-describedby',help.id);button.setAttribute('aria-disabled','true');options.reviewContainer.append(button,help);
    function open(){if(disposed||!last)return false;details.open=true;summary.focus({preventScroll:true});if(typeof summary.scrollIntoView==='function')summary.scrollIntoView({block:'nearest'});return true;}
    function click(){open();}button.addEventListener('click',click);
    function record(info,meta){
      if(disposed||!info||typeof info!=='object'||!text(info.instruction))return false;
      var seconds=meta&&typeof meta.time==='number'&&Number.isFinite(meta.time)&&meta.time>=0?Math.floor(meta.time):null;
      var next={title:text(info.title,'Kitchen movement'),label:text(info.label,'Movement result'),outcome:['completed','unfinished','stopped','kept'].indexOf(info.outcome)!==-1?info.outcome:'result',instruction:text(info.instruction),detail:text(info.detail),time:seconds};
      var nextSignature=JSON.stringify(next);if(signature===nextSignature)return false;signature=nextSignature;last=next;
      write(summary,'Last movement · '+next.label);write(title,next.title);write(evidence,next.instruction);write(detail,next.detail);detail.hidden=!next.detail;
      write(time,seconds===null?'':'Kitchen time · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));time.hidden=seconds===null;details.dataset.outcome=next.outcome;details.hidden=false;
      button.setAttribute('aria-disabled','false');write(help,'Open the last movement result and next-step guidance. Reviewing does not change the kitchen.');return true;
    }
    function clear(){
      if(disposed||!last)return;var focused=details.contains(doc.activeElement);last=null;signature='';if(focused)button.focus({preventScroll:true});details.hidden=true;details.open=false;delete details.dataset.outcome;
      write(summary,'Last movement');[title,time,evidence,detail].forEach(function(node){write(node,'');});time.hidden=true;detail.hidden=true;button.setAttribute('aria-disabled','true');write(help,'No movement result yet. Use a kitchen tool, then review what happened and what to try next.');
    }
    function visible(node){if(!node||!node.isConnected||node.disabled||node.closest('[hidden],[inert]'))return false;if(typeof node.checkVisibility==='function'&&!node.checkVisibility())return false;var win=doc.defaultView,style=win&&win.getComputedStyle(node);return !style||style.display!=='none'&&style.visibility!=='hidden';}
    function dispose(){
      if(disposed)return;var focused=details.contains(doc.activeElement)||doc.activeElement===button;disposed=true;button.removeEventListener('click',click);details.remove();button.remove();help.remove();last=null;signature='';
      if(focused){var target=doc.getElementById('sceneChooseTool');if(visible(target))target.focus({preventScroll:true});}
    }
    return {record:record,clear:clear,dispose:dispose,open:open};
  }
  var api={mount:mount};root.KitchenMovementReview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
