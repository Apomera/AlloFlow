/* Quiet pointer guidance; keyboard discovery and cooking remain with the host. */
(function(root){
  'use strict';
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument)throw new TypeError('Target hints need a scene container.');
    var scene=options.container,doc=scene.ownerDocument,below=options.below,disposed=false,current=null,dismissed=null;
    if(below&&(below.nodeType!==1||below.ownerDocument!==doc||scene.contains(below)||below.contains(scene)))throw new TypeError('Target hints need a separate reading area.');
    var hint=doc.createElement('div'),title=doc.createElement('strong'),detail=doc.createElement('span'),help=doc.createElement('small');
    hint.id='sceneTargetHint';hint.className='kitchen-target-hint';hint.hidden=true;hint.setAttribute('aria-hidden','true');help.textContent='Esc to dismiss';hint.append(title,detail,help);hint.dataset.layout=below?'below':'overlay';if(below)below.prepend(hint);else scene.append(hint);
    function write(node,value){if(node.textContent!==value)node.textContent=value;}
    function clear(){if(disposed)return;current=null;dismissed=null;hint.hidden=true;}
    function show(key,info){
      if(disposed)return false;
      // Empty space is a route to the card, not a new object. Leaving the scene
      // or changing its context calls clear(). Crossing empty space rearms Esc.
      if(!info||typeof key!=='string'||!key){current=null;dismissed=null;return !hint.hidden;}
      if(dismissed===key)return false;
      dismissed=null;current=key;
      write(title,typeof info.name==='string'?info.name:'Kitchen object');write(detail,typeof info.detail==='string'?info.detail:'');hint.dataset.ready=String(!!info.ready);hint.hidden=false;return true;
    }
    function dismiss(){if(disposed||hint.hidden)return false;dismissed=current;current=null;hint.hidden=true;return true;}
    // The reading area is adjacent to the canvas. Crossing its padding must
    // not dismiss the card before the pointer can reach its text.
    function contains(node){return !!(!disposed&&node&&node.isConnected&&(scene.isConnected&&scene.contains(node)||!hint.hidden&&below&&below.isConnected&&below.contains(node)));}
    function dispose(){if(disposed)return;clear();disposed=true;hint.remove();}
    return {element:hint,show:show,clear:clear,dismiss:dismiss,contains:contains,dispose:dispose};
  }
  var api={mount:mount};root.KitchenTargetHint=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
