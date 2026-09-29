/* Burner dials preview a turn; the recipe engine owns the released setting. */
(function(root){
  'use strict';
  var levels=['Off','Low','Medium','High'],step=Math.PI/2,positions={pot:{x:-1.1,y:1.39,z:.43},pan:{x:1.02,y:1.39,z:.43}};
  function clamp(n){return Math.max(0,Math.min(3,n));}
  function angle(level){return (level-1.5)*step;}
  function point(p){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);}
  function start(level,p){if(!Number.isInteger(level)||level<0||level>3||!point(p)||Math.hypot(p.x,p.z)>1.5)return null;return {initial:level,angle:Math.hypot(p.x,p.z)>=.15?Math.atan2(p.x,-p.z):null,turn:0,position:level,preview:level,invalid:false};}
  function move(g,p){
    if(!g)return null;var t=Object.assign({},g);if(g.invalid)return t;
    if(!point(p)||Math.hypot(p.x,p.z)>2.1){t.invalid=true;return t;}if(Math.hypot(p.x,p.z)<.15)return t;
    var next=Math.atan2(p.x,-p.z);if(g.angle===null){t.angle=next;return t;}
    var delta=next-g.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
    if(Math.abs(delta)>Math.PI*.65){t.invalid=true;return t;}
    t.angle=next;t.position=clamp(g.position+delta/step);t.turn=(t.position-t.initial)*step;t.preview=Math.round(t.position);return t;
  }
  function value(g){return g&&!g.invalid&&Math.abs(g.turn)>=step/2&&g.preview!==g.initial?g.preview:null;}
  function available(s,station,locked){
    if(locked||s.plated)return {ready:false,detail:'Recorded or finished cook. The dials show its recorded settings.'};
    if(root.KitchenRecipes.serving(s).started)return {ready:false,detail:'Return the spoonfuls to the pan before changing heat.'};
    if(station==='pan'&&root.KitchenRecipes.panPosition(s).site==='trivet')return {ready:false,detail:'Return the pan to its burner before adjusting its heat.'};
    return {ready:true,detail:'Turn around the rim; release to apply a setting. Switching off does not instantly cool the cookware.'};
  }
  function decorate(h){
    var T=h.THREE,dials={},textures=[];
    h.box(4.25,.085,.61,'#6b7e74',0,1.17,.43);
    ['pot','pan'].forEach(function(station){
      var at=positions[station],group=new T.Group();group.position.set(at.x,1.25,at.z);group.userData.station=station;group.userData.kitchenBurner=station;h.world.add(group);
      function decoration(o){o.userData.sceneDecoration=true;return o;}
      decoration(h.cyl(.32,.34,.045,'#354a40',0,-.035,0,group));
      var canvas=document.createElement('canvas');canvas.width=canvas.height=512;var c=canvas.getContext('2d');c.clearRect(0,0,512,512);c.textAlign='center';c.textBaseline='middle';c.font='bold 31px sans-serif';
      levels.forEach(function(label,i){var a=angle(i),x=256+Math.sin(a)*198,y=256-Math.cos(a)*198;c.fillStyle=i?'#e7d7a5':'#f4f7eb';c.fillText(label.toUpperCase(),x,y);});c.fillStyle='#edf2e7';c.font='bold 29px sans-serif';c.fillText(station==='pot'?'PASTA POT':'SAUCE PAN',256,483);
      var texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;textures.push(texture);var labels=decoration(h.mesh(new T.PlaneGeometry(.88,.88),'#ffffff',0,.006,0,group,{map:texture,transparent:true,depthWrite:false,roughness:1}));labels.rotation.x=-Math.PI/2;
      for(var i=0;i<4;i++){var a=angle(i),tick=decoration(h.box(.018,.012,.05,i?'#d6bd79':'#eef3e5',Math.sin(a)*.285,.008,-Math.cos(a)*.285,group));tick.rotation.y=-a;}
      var knob=new T.Group();group.add(knob);var body=h.cyl(.238,.25,.13,'#31483d',0,.065,0,knob);body.material.roughness=.42;body.material.metalness=.2;
      var rim=decoration(h.mesh(new T.TorusGeometry(.232,.01,6,40),'#c7c9b4',0,.135,0,knob,{metalness:.65,roughness:.28}));rim.rotation.x=Math.PI/2;
      var marker=decoration(h.box(.037,.016,.17,'#f2e2b2',0,.143,-.113,knob));
      for(var tooth=0;tooth<20;tooth++){var a=tooth*Math.PI/10,grip=h.box(.014,.085,.015,'#6d8170',Math.sin(a)*.24,.063,Math.cos(a)*.24,knob);grip.rotation.y=a;}
      var led=decoration(h.ball(.028,'#66786a',.36,.025,0,group));dials[station]={knob:knob,led:led,level:0};
    });
    function setting(station,level){var d=dials[station];d.knob.rotation.y=-angle(level);}
    function update(s){['pot','pan'].forEach(function(station){var d=dials[station];d.level=s[station].heat;setting(station,d.level);h.color(d.led,d.level?'#efba63':'#697a6c');d.led.material.emissive.setHex(d.level?0x754005:0);});}
    return {update:update,preview:function(station,level){if(dials[station])setting(station,level);},position:function(station){return positions[station];},clear:function(){Object.keys(dials).forEach(function(station){setting(station,dials[station].level);});},dispose:function(){textures.forEach(function(t){t.dispose();});}};
  }
  var api={levels:levels,positions:positions,angle:angle,start:start,move:move,value:value,available:available,decorate:decorate};root.KitchenBurnerDials=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
