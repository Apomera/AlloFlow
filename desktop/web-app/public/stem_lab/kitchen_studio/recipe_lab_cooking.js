/* Cooking surfaces illustrate recorded state; animation never advances the recipe. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function describe(s){
    var p=s.pot,n=s.pan,portion=R.serving(s),inPan=n.produce&&!s.plated&&(!n.combined||portion.remaining>0);
    var wet=p.water>0,boil=wet&&p.temp>=96,simmer=wet&&p.temp>=80;
    var loose=R.mixing(s).liquidSinceMix>0,type=!n.produce?'empty':n.damage>=1?'scorched':loose?'unmixed':n.moisture<20?'dry':n.moisture>180*s.servings/2?'watery':'coating';
    var cloudy=p.pasta?clamp(p.progress):0,steam=inPan&&n.moisture>12&&n.temp>90;
    var panNote={scorched:'Dark patches remain in the sauce.',unmixed:'Liquid pools around the pieces. Fold it through.',dry:'Little liquid remains between the pieces.',watery:'A loose pool surrounds the pasta and pieces.',coating:'A glossy layer coats the food.'}[type];
    if(type==='coating'&&!n.combined)panNote='Moisture glistens between the pieces.';
    if(type==='watery'&&!n.combined)panNote='A loose pool surrounds the pieces.';
    if(!n.produce)panNote=n.oil?'A thin film of oil covers the pan.':'The pan surface is bare.';
    else if(!inPan)panNote=s.plated?'On the plates · '+panNote:portion.started?'The pan is empty. All portions are on plates.':panNote;
    return {pot:{wet:wet,cloudy:cloudy,activity:boil?1:simmer?.25:0,steam:boil?1:simmer?.25:0,note:!wet?'No water in the pot.':(cloudy>.1?'Cloudy cooking water':'Clear water')+' · '+(boil?'rolling bubbles.':simmer?'fine bubbles at the edge.':'still surface.')},
      pan:{visible:inPan,type:type,steam:steam?clamp((n.temp-85)/25):0,shimmer:!n.produce&&n.oil&&n.temp>80&&!s.plated,loose:inPan&&loose,note:panNote}};
  }
  function mount(h){
    var T=h.THREE,frame=null,last=0,phase=0,active=false,disposed=false,cues=null;
    var motion=window.matchMedia('(prefers-reduced-motion: reduce)'),sprites=[],rings=[],panBubbles=[];
    var canvas=document.createElement('canvas');canvas.width=canvas.height=64;var ctx=canvas.getContext('2d');
    var glow=ctx.createRadialGradient(32,32,1,32,32,31);glow.addColorStop(0,'rgba(255,255,255,.85)');glow.addColorStop(.35,'rgba(255,255,255,.45)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.6;ctx.shadowColor='rgba(255,255,255,.45)';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(28,52);ctx.bezierCurveTo(44,40,19,28,34,12);ctx.stroke();
    var steamMap=new T.CanvasTexture(canvas);steamMap.encoding=T.sRGBEncoding;
    function decoration(o){o.userData.sceneDecoration=true;o.castShadow=o.receiveShadow=false;return o;}
    for(var i=0;i<20;i++){
      var material=new T.SpriteMaterial({map:steamMap,color:0xc6d2cb,transparent:true,opacity:0,depthWrite:false,rotation:(i%3-1)*.2});material.color.convertSRGBToLinear();
      var sprite=decoration(new T.Sprite(material));sprite.name='kitchen-steam';sprite.renderOrder=3;(i<12?h.pot:h.pan).add(sprite);sprites.push(sprite);
    }
    function ring(parent,r,x,z){var o=decoration(h.mesh(new T.RingGeometry(r*.82,r,24),'#fff8db',x,0,z,parent,{transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,roughness:.2}));o.rotation.x=-Math.PI/2;rings.push(o);return o;}
    for(var r=0;r<10;r++){var a=r*2.399,rad=r<6?.27:.43;ring(r<6?h.pot:h.pan,r<6?.075:.06,Math.cos(a)*rad,Math.sin(a)*rad);}
    h.bubbles.forEach(function(o){decoration(o);o.material.transparent=true;o.material.opacity=.44;o.material.depthWrite=false;o.material.roughness=.16;});
    for(var b=0;b<6;b++){var a=b*2.399,o=decoration(h.ball(.026,'#e8cba1',Math.cos(a)*.43,1.449,Math.sin(a)*.43,h.pan));o.material.transparent=true;o.material.opacity=.36;o.material.depthWrite=false;panBubbles.push(o);}
    var pools=[];for(var p=0;p<2;p++){var pool=decoration(h.mesh(new T.CircleGeometry(.16,32),'#dccd99',p?-.2:.36,1.44,p?.4:.16,h.pan,{transparent:true,opacity:.65,depthWrite:false,roughness:.15}));pool.rotation.x=-Math.PI/2;pool.scale.set(1.25,.75,1);pool.renderOrder=2;pools.push(pool);}
    var oilGlints=[];for(var g=0;g<2;g++){var glint=decoration(h.mesh(new T.RingGeometry(.24+g*.14,.246+g*.14,40,1,g*3,1.3),'#ffe3ac',0,1.44,0,h.pan,{transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,roughness:.1}));glint.rotation.x=-Math.PI/2;oilGlints.push(glint);}
    var waterline=decoration(h.mesh(new T.TorusGeometry(.501,.005,6,64),'#d2e9d8',0,0,0,h.pot,{transparent:true,opacity:.5,depthWrite:false,roughness:.15}));waterline.rotation.x=Math.PI/2;waterline.renderOrder=2;
    var clear=new T.Color('#79b6af').convertSRGBToLinear(),cloud=new T.Color('#e5d4ab').convertSRGBToLinear();
    function pose(){
      if(!cues)return;
      sprites.forEach(function(o,i){var pot=i<12,j=pot?i:i-12,t=(phase*.22+j*.137)%1,strength=pot?cues.pot.steam:cues.pan.steam;
        o.visible=strength>0;var a=j*2.399;o.position.set(Math.cos(a)*.29+Math.sin(phase*.6+j)*.07,(pot?1.9:1.5)+t*(pot?.65:.48),Math.sin(a)*.29+t*.06);o.scale.set((.14+t*.2)*(pot?1:.85),.2+t*.33,1);o.material.opacity=Math.sin(t*Math.PI)*.48*strength;
      });
      h.bubbles.forEach(function(o,i){var t=(phase*.8+i*.177)%1,edge=cues.pot.activity<1;var a=i*2.399,rad=edge?.46:.13+(i%4)*.095;o.visible=cues.pot.activity>0&&(cues.pot.activity===1||i<4);o.position.set(Math.cos(a)*rad,h.water.position.y+.011,Math.sin(a)*rad);o.scale.setScalar((.3+t*.7)*(edge?.45:1));o.scale.y*=.45;o.material.opacity=(1-t)*.48;});
      rings.forEach(function(o,i){var pot=i<6,t=(phase*.7+i*.193)%1,strength=pot?cues.pot.activity:cues.pan.steam;o.visible=strength>0;o.position.y=pot?h.water.position.y+.012:1.445;o.scale.setScalar(.35+t*1.25);o.material.opacity=(1-t)*.26*strength;});
      panBubbles.forEach(function(o,i){var t=(phase*.5+i*.217)%1;o.visible=cues.pan.steam>0;o.scale.set(.35+t*.65,.15+t*.25,.35+t*.65);o.material.opacity=(1-t)*.36;});
      oilGlints.forEach(function(o,i){o.visible=cues.pan.shimmer;o.rotation.z=Math.sin(phase*.4+i)*.25;o.material.opacity=.19+Math.sin(phase*.8+i)*.06;});
    }
    function moving(){return active&&!disposed&&!document.hidden&&!motion.matches&&cues&&(cues.pot.activity>0||cues.pan.steam>0||cues.pan.shimmer);}
    function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;last=0;}
    function animate(now){frame=null;if(!moving()){last=0;return;}if(!last)last=now;if(now-last>=32){phase+=Math.min(.12,(now-last)/1000);last=now;pose();h.draw();}frame=requestAnimationFrame(animate);}
    function sync(){if(!moving()){stop();return;}if(frame===null)frame=requestAnimationFrame(animate);}
    function update(s){
      cues=describe(s);if(!active)phase=s.time*.035;h.water.material.color.copy(clear).lerp(cloud,Math.sqrt(cues.pot.cloudy)*.9);h.water.material.roughness=.2;h.water.material.opacity=.8+cues.pot.cloudy*.18;
      waterline.visible=cues.pot.wet;waterline.position.y=h.water.position.y+.015;
      var dry=cues.pan.type==='dry'||cues.pan.type==='scorched',wet=s.pan.produce&&!dry,red=s.id==='tomato';
      h.sauce.material.roughness=dry?.8:.2;h.sauce.scale.set(dry?.65:1,1,dry?.65:1);
      pools.forEach(function(o){o.visible=cues.pan.loose;o.material.color.set(red?'#dcb073':'#e0d2a0').convertSRGBToLinear();});
      h.food.forEach(function(o){o.material.roughness=wet?(red?.3:.43):(red?.55:.8);});
      var tint=new T.Color(cues.pan.type==='scorched'?'#71513a':red?'#c77740':'#c49e53').convertSRGBToLinear(),pasta=new T.Color('#edce83').convertSRGBToLinear();
      h.noodles.forEach(function(o){o.material.color.copy(pasta).lerp(tint,cues.pan.type==='coating'?.65:cues.pan.type==='scorched'?.8:.28);o.material.roughness=wet?.3:.72;});
      pose();sync();
    }
    document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
    return {update:update,setActive:function(value){active=!!value;sync();},dispose:function(){disposed=true;stop();document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync);sprites.forEach(function(o){if(o.parent)o.parent.remove(o);o.material.dispose();});steamMap.dispose();}};
  }
  var api={describe:describe,mount:mount};root.KitchenCooking=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
