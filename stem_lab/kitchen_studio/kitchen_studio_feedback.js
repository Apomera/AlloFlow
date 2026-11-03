/* Optional contact cues describe tool movement, never the engine's judgement. */
(function(root){
  'use strict';
  function mount(host){
    var canvas=host.canvas,doc=canvas.ownerDocument,win=doc.defaultView||root,nav=win.navigator||{};
    var section=doc.getElementById('studioFeedback'),sounds=doc.getElementById('studioToolSounds'),pulses=doc.getElementById('studioTouchPulses'),tryButton=doc.getElementById('studioFeedbackTry'),status=doc.getElementById('studioFeedbackStatus');
    var soundOn=false,touchOn=false,visible=true,disposed=false,context=null,voices=[],generation=0,pulseAttempted=false,soundFailure=false,touchFailure=false,listeners=[];
    var AudioCtor=null,vibrate=null;
    try{AudioCtor=win.AudioContext||win.webkitAudioContext;}catch(error){}
    try{if(typeof nav.vibrate==='function')vibrate=nav.vibrate.bind(nav);}catch(error){}
    var cues={pickup:{frequency:220,type:'triangle',duration:.055,pulse:10},ready:{frequency:330,type:'sine',duration:.065,pulse:14},release:{frequency:180,type:'triangle',duration:.050,pulse:8},detent:{frequency:480,type:'triangle',duration:.022,pulse:6}};
    function on(target,type,fn){target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function refresh(){
      section.hidden=!visible||disposed;sounds.checked=soundOn;pulses.checked=touchOn;
      sounds.disabled=!AudioCtor||!visible||disposed;pulses.disabled=!vibrate||!visible||disposed;tryButton.disabled=!visible||disposed||(!soundOn&&!touchOn);
      var audio=!AudioCtor?'Tool sounds unavailable in this browser.':soundFailure?'Tool sounds could not start. Try feedback to retry.':soundOn?'Tool sounds on.':'Tool sounds off.';
      var touch=!vibrate?'Touch pulses unavailable in this browser.':touchFailure?'Touch pulses could not start on this device.':touchOn?'Touch pulses enabled where supported.':'Touch pulses off.';
      var message=audio+' '+touch;if(status.textContent!==message)status.textContent=message;
    }
    function removeVoice(voice,stop){
      var index=voices.indexOf(voice);if(index!==-1)voices.splice(index,1);
      voice.oscillator.onended=null;
      if(stop)try{voice.oscillator.stop();}catch(error){}
      try{voice.oscillator.disconnect();}catch(error){}
      try{voice.gain.disconnect();}catch(error){}
    }
    function quiet(){
      generation++;voices.slice().forEach(function(voice){removeVoice(voice,true);});
      if(pulseAttempted&&vibrate)try{vibrate(0);}catch(error){}
      pulseAttempted=false;
    }
    function current(token){return !disposed&&visible&&!doc.hidden&&token===generation;}
    function audioFailed(token){if(!current(token)||!soundOn)return;soundFailure=true;refresh();}
    function play(spec,token,audio){
      if(!current(token)||!soundOn||audio!==context||audio.state!=='running')return;
      var oscillator=null,gain=null,voice=null;
      try{
        oscillator=audio.createOscillator();gain=audio.createGain();
        var now=audio.currentTime;oscillator.type=spec.type;oscillator.frequency.setValueAtTime(spec.frequency,now);
        gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.035,now+.004);gain.gain.linearRampToValueAtTime(0,now+spec.duration);
        oscillator.connect(gain);gain.connect(audio.destination);voice={oscillator:oscillator,gain:gain};voices.push(voice);
        oscillator.onended=function(){removeVoice(voice,false);};oscillator.start(now);oscillator.stop(now+spec.duration);
        if(soundFailure){soundFailure=false;refresh();}
      }catch(error){
        if(voice)removeVoice(voice,true);
        else{if(oscillator)try{oscillator.disconnect();}catch(ignored){}if(gain)try{gain.disconnect();}catch(ignored){}}
        audioFailed(token);
      }
    }
    function audioCue(token,spec){
      if(!current(token)||!soundOn||!AudioCtor)return;
      var audio;
      try{
        if(!context||context.state==='closed')context=new AudioCtor();audio=context;
        if(audio.state==='running'){if(spec)play(spec,token,audio);return;}
        if(typeof audio.resume!=='function'){audioFailed(token);return;}
        Promise.resolve(audio.resume()).then(function(){
          if(!current(token)||!soundOn||context!==audio)return;
          if(audio.state!=='running'){audioFailed(token);return;}
          if(soundFailure){soundFailure=false;refresh();}if(spec)play(spec,token,audio);
        },function(){audioFailed(token);});
      }catch(error){audioFailed(token);}
    }
    function cue(signal){
      if(disposed)return false;
      if(signal&&signal.type==='cancel'){quiet();return false;}
      var spec=signal&&Object.prototype.hasOwnProperty.call(cues,signal.type)?cues[signal.type]:null;if(!spec||!visible||doc.hidden)return false;
      quiet();var token=generation;
      if(soundOn)audioCue(token,spec);
      if(touchOn&&vibrate){
        pulseAttempted=true;var previousFailure=touchFailure;
        try{touchFailure=vibrate(spec.pulse)===false;}catch(error){touchFailure=true;}
        if(touchFailure!==previousFailure)refresh();
      }
      return soundOn||touchOn;
    }
    on(sounds,'change',function(){if(disposed)return;quiet();soundOn=!!sounds.checked&&!!AudioCtor&&visible;soundFailure=false;refresh();if(soundOn)audioCue(generation,null);});
    on(pulses,'change',function(){if(disposed)return;quiet();touchOn=!!pulses.checked&&!!vibrate&&visible;touchFailure=false;refresh();});
    on(tryButton,'click',function(){if(!tryButton.disabled)cue({type:'pickup',id:'preview'});});
    on(win,'blur',quiet);on(win,'pagehide',quiet);on(doc,'visibilitychange',function(){if(doc.hidden)quiet();});
    refresh();
    return {cue:cue,update:function(next){if(disposed)return;if(next&&Object.prototype.hasOwnProperty.call(next,'visible'))visible=!!next.visible;if(!visible)quiet();refresh();},dispose:function(){
      if(disposed)return;disposed=true;quiet();listeners.forEach(function(remove){remove();});listeners=[];soundOn=touchOn=false;refresh();
      var audio=context;context=null;if(audio&&audio.state!=='closed'&&typeof audio.close==='function')try{var closed=audio.close();if(closed&&typeof closed.catch==='function')closed.catch(function(){});}catch(error){}
    }};
  }
  root.KitchenStudioFeedback={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioFeedback;
})(typeof window!=='undefined'?window:globalThis);
