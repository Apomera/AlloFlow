/* A quiet return route beside equivalent controls. Navigation belongs to the host. */
(function(root){
  'use strict';
  var sequence=0,html='http://www.w3.org/1999/xhtml',svg='http://www.w3.org/2000/svg';
  function mount(options){
    if(!options||!options.document||options.document.nodeType!==9||typeof options.document.createElement!=='function'||typeof options.onReturn!=='function'||typeof options.onUnavailable!=='function')throw new TypeError('Control return needs a document and navigation callbacks.');
    var doc=options.document,disposed=false,busy=false,destination=null,context=null,uid;
    do{uid='kitchen-control-return-'+(++sequence);}while(['','-title','-help','-button'].some(function(suffix){return doc.getElementById(uid+suffix);}));
    function element(tag,value,className){var node=doc.createElement(tag);if(value!==undefined)node.textContent=value;if(className)node.className=className;return node;}
    function write(node,value){if(node.textContent!==value)node.textContent=value;}
    var panel=element('div',undefined,'kitchen-control-return');panel.id=uid;panel.dataset.controlReturn='panel';panel.setAttribute('role','group');panel.setAttribute('aria-labelledby',uid+'-title');
    var title=element('p',undefined,'kitchen-control-return-title');title.id=uid+'-title';
    var help=element('p','Returning does not perform another cooking action.','kitchen-control-return-help');help.id=uid+'-help';
    var button=element('button',undefined,'kitchen-control-return-button');button.id=uid+'-button';button.type='button';button.dataset.controlReturn='button';button.setAttribute('aria-controls','kitchenStage');button.setAttribute('aria-describedby',help.id);panel.append(title,button,help);
    function valid(node){return !!node&&node.nodeType===1&&node.ownerDocument===doc&&node.isConnected&&(node.namespaceURI===html||node.namespaceURI===svg)&&node!==doc.documentElement&&node!==doc.body&&node!==doc.head&&!panel.contains(node);}
    function placement(target){
      if(!valid(target))return null;
      var summary=target.closest('summary');if(summary){if(!summary.parentElement||summary.parentElement.tagName!=='DETAILS')return null;return {anchor:summary,after:true};}
      var anchor=target;
      for(var at=target;at;at=at.parentElement)if(at.namespaceURI===svg&&at.localName==='svg')anchor=at;
      var label=anchor.closest('label');if(label)anchor=label;
      /* Keep the HTML panel outside phrasing-only and structured-list content. */
      while(anchor.parentElement&&(anchor.parentElement.namespaceURI!==html||/^(A|BUTTON|LABEL|P|SPAN|STRONG|EM|SMALL|SUMMARY|UL|OL|DL|SELECT|OPTGROUP|OPTION|TABLE|THEAD|TBODY|TFOOT|TR|PICTURE)$/.test(anchor.parentElement.tagName)))anchor=anchor.parentElement;
      return anchor.parentElement&&anchor.parentElement!==doc.documentElement?{anchor:anchor,after:false}:null;
    }
    function visible(target,place){
      if(!valid(target)||!place)return false;
      var win=doc.defaultView;
      for(var at=target;at;at=at.parentElement){
        if(at.hasAttribute('hidden')||at.hasAttribute('inert'))return false;
        if(at.tagName==='DETAILS'&&!at.open){var summary=Array.prototype.find.call(at.children,function(child){return child.tagName==='SUMMARY';});if(!summary||!summary.contains(target))return false;}
        var style=win&&win.getComputedStyle(at);if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'))return false;
      }
      var probe=place.anchor;return typeof probe.checkVisibility!=='function'||probe.checkVisibility();
    }
    function remove(repair){var focused=doc.activeElement===button;destination=null;context=null;panel.remove();if(focused&&repair)options.onUnavailable();}
    function clear(){if(disposed)return;remove(true);}
    function refresh(){if(disposed||!context)return false;var place=placement(destination);if(!panel.isConnected||!visible(destination,place)){remove(true);return false;}return true;}
    function offer(target,value){
      if(disposed||!value||typeof value!=='object'||typeof value.tool!=='string'||!value.tool.trim()||typeof value.label!=='string'||!value.label.trim())return false;
      var place=placement(target);if(!visible(target,place))return false;
      var next=Object.assign({},value),label=value.label.trim();destination=target;context=next;
      write(title,'Keyboard controls · '+label);write(button,'Back to '+label+' in 3D');
      if(place.after){if(panel.previousElementSibling!==place.anchor||panel.parentElement!==place.anchor.parentElement)place.anchor.after(panel);}
      else if(panel.nextElementSibling!==place.anchor||panel.parentElement!==place.anchor.parentElement)place.anchor.before(panel);
      return true;
    }
    function click(){
      if(disposed||busy||!refresh())return;
      var active=context,accepted;busy=true;
      try{accepted=options.onReturn(Object.assign({},active));}finally{busy=false;}
      if(accepted!==false&&context===active)remove(false);
    }
    button.addEventListener('click',click);
    function dispose(){if(disposed)return;disposed=true;button.removeEventListener('click',click);remove(true);}
    return {offer:offer,clear:clear,refresh:refresh,dispose:dispose};
  }
  var api={mount:mount};root.KitchenControlReturn=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
