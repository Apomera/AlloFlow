/* Camera-only controls. Angles use radians; no recipe state is owned or changed here. */
(function(root){
  'use strict';
  var sequence=0,turn=Math.PI/12,tilt=Math.PI/18,tau=Math.PI*2,epsilon=1e-9;
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function normalize(value){return ((value+Math.PI)%tau+tau)%tau-Math.PI;}
  function valid(frame){
    return !!frame&&['azimuth','polar','distance','minDistance','maxDistance','minPolar','maxPolar'].every(function(key){return finite(frame[key]);})&&
      frame.minDistance>0&&frame.maxDistance>=frame.minDistance&&frame.distance>=frame.minDistance-epsilon&&frame.distance<=frame.maxDistance+epsilon&&
      frame.minPolar>=0&&frame.maxPolar<=Math.PI&&frame.maxPolar>=frame.minPolar&&frame.polar>=frame.minPolar-epsilon&&frame.polar<=frame.maxPolar+epsilon;
  }
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function step(frame,command){
    if(!valid(frame)||['left','right','up','down','in','out'].indexOf(command)===-1)return null;
    var next=Object.assign({},frame);next.azimuth=normalize(frame.azimuth);next.polar=clamp(frame.polar,frame.minPolar,frame.maxPolar);next.distance=clamp(frame.distance,frame.minDistance,frame.maxDistance);
    if(command==='left'||command==='right')next.azimuth=normalize(next.azimuth+(command==='left'?-turn:turn));
    else if(command==='up'||command==='down')next.polar=clamp(next.polar+(command==='up'?-tilt:tilt),frame.minPolar,frame.maxPolar);
    else next.distance=clamp(command==='in'?next.distance/1.2:next.distance*1.2,frame.minDistance,frame.maxDistance);
    return next;
  }
  function changed(before,after){return !!after&&(Math.abs(normalize(after.azimuth-before.azimuth))>epsilon||Math.abs(after.polar-before.polar)>epsilon||Math.abs(after.distance-before.distance)>epsilon);}
  function usable(frame){return valid(frame)&&finite(frame.baseAzimuth)&&finite(frame.baseDistance)&&frame.baseDistance>0;}
  function readings(frame){
    var relative=Math.round(normalize(frame.azimuth-frame.baseAzimuth)*180/Math.PI),elevation=Math.round(90-frame.polar*180/Math.PI),zoom=Math.round(frame.baseDistance/frame.distance*100);
    var elevationText=elevation===0?'Level':Math.abs(elevation)+'° '+(elevation<0?'below':'above')+' level';
    return {view:typeof frame.viewLabel==='string'&&frame.viewLabel.trim()?frame.viewLabel:'Kitchen view',turn:relative===0?'Centered':Math.abs(relative)+'° '+(relative<0?'left':'right'),elevation:elevationText,zoom:zoom+'%',spoken:(relative===0?'centered':Math.abs(relative)+' degrees '+(relative<0?'left':'right'))+', elevation '+elevation+' degrees, zoom '+zoom+' percent'};
  }
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument||typeof options.sceneId!=='string'||!options.sceneId||['read','onAdjust','onReset','onLook'].some(function(key){return typeof options[key]!=='function';}))throw new TypeError('Camera controls need a container, scene ID, read callback and camera action callbacks.');
    var doc=options.container.ownerDocument,uid='recipe-camera-'+(++sequence)+'-',disposed=false,listeners=[],buttons={},frame=null;
    function element(tag,text,className){var node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    function listen(node,type,callback){node.addEventListener(type,callback);listeners.push(function(){node.removeEventListener(type,callback);});}
    function write(node,value){if(node.textContent!==value)node.textContent=value;}
    var details=element('details',undefined,'recipe-camera-controls camera-controls');details.id=uid+'controls';
    var summary=element('summary','Adjust 3D view','camera-controls-summary');summary.id=uid+'summary';details.append(summary);
    var body=element('div',undefined,'recipe-camera-body');body.id=uid+'body';
    var help=element('p','Use the buttons to rotate, raise, lower or zoom the camera. These changes do not cook food or advance kitchen time.','recipe-camera-help');help.id=uid+'help';body.append(help);
    var readout=element('div',undefined,'recipe-camera-readout camera-controls-readout');readout.id=uid+'readout';body.append(readout);
    var view=element('p',undefined,'recipe-camera-current');view.id=uid+'current';readout.append(view);
    var values=element('dl',undefined,'recipe-camera-readings'),valueNodes={};
    [['turn','Turn from selected view'],['elevation','Viewing elevation'],['zoom','Zoom from selected view']].forEach(function(pair){var item=element('div'),term=element('dt',pair[1]),value=element('dd');valueNodes[pair[0]]=value;item.append(term,value);values.append(item);});readout.append(values);
    var groups=element('div',undefined,'recipe-camera-control-grid');body.append(groups);
    function makeButton(command,label,parent){var button=element('button',label);button.type='button';button.id=uid+command;button.dataset.cameraCommand=command;button.setAttribute('aria-controls',options.sceneId);button.setAttribute('aria-disabled','false');buttons[command]=button;parent.append(button);return button;}
    [['Rotate and tilt',[['left','Rotate left'],['right','Rotate right'],['up','Raise view'],['down','Lower view']]],['Zoom',[['in','Zoom in'],['out','Zoom out']]]].forEach(function(group){var field=element('fieldset'),legend=element('legend',group[0]),controls=element('div',undefined,'recipe-camera-buttons');field.setAttribute('aria-describedby',help.id);field.append(legend,controls);group[1].forEach(function(pair){var button=makeButton(pair[0],pair[1],controls);listen(button,'click',function(){adjust(pair[0]);});});groups.append(field);});
    var actions=element('div',undefined,'recipe-camera-actions'),reset=makeButton('reset','Reset selected view',actions),look=makeButton('look','Look at 3D view',actions);body.append(actions);
    var status=element('p',undefined,'recipe-camera-status camera-controls-status');status.id=uid+'status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');body.append(status);details.append(body);options.container.append(details);
    var scene=doc.getElementById(options.sceneId);if(scene){var descriptions=(scene.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);descriptions.push(readout.id);scene.setAttribute('aria-describedby',descriptions.join(' '));}
    function say(value){write(status,value);}
    function sync(announce){
      if(disposed)return;frame=options.read();var ready=usable(frame),text=ready?readings(frame):null;
      write(view,ready?'Selected view: '+text.view:'The 3D view is unavailable.');
      Object.keys(valueNodes).forEach(function(key){write(valueNodes[key],ready?text[key]:'Unavailable');});
      ['left','right','up','down','in','out'].forEach(function(command){buttons[command].setAttribute('aria-disabled',String(!ready||!changed(frame,step(frame,command))));});
      reset.setAttribute('aria-disabled',String(!ready||!frame.adjusted));look.setAttribute('aria-disabled',String(!ready));
      if(announce)say(ready?text.view+': '+text.spoken+'.':'The 3D view is unavailable.');
    }
    function adjust(command){
      if(disposed||details.hidden)return;sync(false);
      if(!usable(frame)){say('The 3D view is unavailable.');return;}
      if(!changed(frame,step(frame,command))){say((command==='in'?'Closest view reached.':command==='out'?'Farthest view reached.':command==='up'?'Highest view reached.':'Lowest view reached.')+' Camera unchanged.');return;}
      if(options.onAdjust(command)===false){sync(false);say('The camera could not be adjusted.');return;}sync(true);
    }
    listen(reset,'click',function(){if(disposed||details.hidden)return;sync(false);if(!usable(frame)){say('The 3D view is unavailable.');return;}if(!frame.adjusted){say('The selected view is already reset.');return;}if(options.onReset()===false){sync(false);say('The camera could not be reset.');return;}sync(false);if(usable(frame)){var text=readings(frame);say('View reset. '+text.view+': '+text.spoken+'.');}else say('The 3D view is unavailable.');});
    listen(look,'click',function(){if(disposed||details.hidden)return;sync(false);if(usable(frame))options.onLook();else say('The 3D view is unavailable.');});
    listen(details,'toggle',function(){if(!details.open&&details.contains(doc.activeElement)&&doc.activeElement!==summary)summary.focus();});
    function visible(node){if(!node||!node.isConnected||node.disabled||node.closest('[hidden]'))return false;if(typeof node.checkVisibility==='function'&&!node.checkVisibility())return false;var win=doc.defaultView,style=win&&win.getComputedStyle(node);return !style||style.display!=='none'&&style.visibility!=='hidden';}
    function restoreFocus(){var target=[doc.getElementById('textView'),doc.getElementById('kitchenTitle'),doc.getElementById(options.sceneId)].find(visible);if(target){if(!target.matches('button,input,select,textarea,a[href],[tabindex]'))target.tabIndex=-1;target.focus();}}
    function setVisible(value){if(disposed)return;var focused=details.contains(doc.activeElement);details.hidden=!value;if(!value){write(status,'');if(focused)restoreFocus();}else sync(false);}
    function open(){if(disposed||details.hidden)return false;details.open=true;sync(false);buttons.left.focus();return true;}
    function dispose(){if(disposed)return;var focused=details.contains(doc.activeElement);disposed=true;listeners.forEach(function(remove){remove();});listeners=[];if(scene){var descriptions=(scene.getAttribute('aria-describedby')||'').split(/\s+/).filter(function(id){return id&&id!==readout.id;});if(descriptions.length)scene.setAttribute('aria-describedby',descriptions.join(' '));else scene.removeAttribute('aria-describedby');}details.remove();if(focused)restoreFocus();}
    sync(false);return {element:details,sync:sync,setVisible:setVisible,open:open,dispose:dispose};
  }
  var api={step:step,mount:mount};root.KitchenCameraControls=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
