/* Local, deterministic material and mesh details for the existing kitchen objects. */
(function(root){
  'use strict';
  function mount(h){
    var T=h.THREE,maps={},noodleShapes={},lastRecipe=null;
    function texture(kind){
      if(maps[kind])return maps[kind];
      var canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      var c=canvas.getContext('2d'),seed=91;
      function random(){seed=seed*16807%2147483647;return seed/2147483647;}
      c.fillStyle='#ffffff';c.fillRect(0,0,256,256);
      if(kind==='linen'){
        c.fillStyle='#f4f0e3';c.fillRect(0,0,256,256);
        for(var i=0;i<256;i+=4){c.fillStyle=i%8?'#cbc9be55':'#ffffffaa';c.fillRect(i,0,1,256);c.fillRect(0,i,256,1);}
        c.fillStyle='#617f7340';[20,27,222,229].forEach(function(x){c.fillRect(x,0,3,256);c.fillRect(0,x,256,3);});
      }else if(kind==='steel'){
        var gradient=c.createLinearGradient(0,0,256,0);gradient.addColorStop(0,'#b9c5c2');gradient.addColorStop(.22,'#f2f5ef');gradient.addColorStop(.46,'#c9d2cd');gradient.addColorStop(.71,'#ffffff');gradient.addColorStop(1,'#bbc6c2');c.fillStyle=gradient;c.fillRect(0,0,256,256);
        for(var line=0;line<220;line++){c.fillStyle=line%2?'#ffffff18':'#526a6010';c.fillRect(random()*100,random()*256,100+random()*156,.5);}
      }else if(kind==='ceramic'){
        for(var speck=0;speck<450;speck++){c.fillStyle=speck%3?'#8b796b14':'#67574c24';c.beginPath();c.arc(random()*256,random()*256,.25+random()*.75,0,Math.PI*2);c.fill();}
      }else if(kind==='mushroom'){
        for(var fleck=0;fleck<850;fleck++){c.fillStyle=fleck%4?'#80684918':'#664b3038';var x=random()*256,y=random()*256;c.beginPath();c.ellipse(x,y,.4+random()*1.7,.5+random()*3,random()*Math.PI,0,Math.PI*2);c.fill();}
        for(var grain=0;grain<16;grain++){c.strokeStyle='#70563718';c.lineWidth=1;c.beginPath();c.moveTo(grain*17,256);c.bezierCurveTo(grain*17-16,190,grain*17+15,90,grain*17,0);c.stroke();}
      }else if(kind==='tomato'){
        for(var pore=0;pore<900;pore++){c.fillStyle=pore%3?'#ffffff30':'#823c2914';c.fillRect(random()*256,random()*256,1,1);}
        for(var rib=0;rib<8;rib++){var g=c.createLinearGradient(rib*32-5,0,rib*32+5,0);g.addColorStop(0,'#63302100');g.addColorStop(.5,'#63302112');g.addColorStop(1,'#63302100');c.fillStyle=g;c.fillRect(rib*32-5,0,10,256);}
      }else if(kind==='cut-mushroom'){
        c.fillStyle='#fff7e8';c.fillRect(0,0,256,256);c.fillStyle='#927a5760';c.fillRect(0,0,256,22);c.fillRect(0,234,256,22);
        for(var gill=0;gill<12;gill++){c.strokeStyle='#86644048';c.lineWidth=2;c.beginPath();c.moveTo(0,35+gill*17);c.quadraticCurveTo(128,18+gill*19,256,35+gill*17);c.stroke();}
      }else if(kind==='cut-tomato'){
        c.fillStyle='#fff4df';c.fillRect(0,0,256,256);c.fillStyle='#a4543e45';c.fillRect(0,0,256,17);c.fillRect(0,239,256,17);
        [66,185].forEach(function(y){c.fillStyle='#9b482e38';c.beginPath();c.ellipse(128,y,99,39,0,0,Math.PI*2);c.fill();for(var seed=0;seed<5;seed++){c.fillStyle='#ffeb9944';c.beginPath();c.ellipse(30+seed*48,y+(seed%2?8:-8),7,14,.3,0,Math.PI*2);c.fill();}});
      }
      var map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;map.anisotropy=Math.min(h.anisotropy||1,4);maps[kind]=map;return map;
    }
    function surface(o,kind,roughness,bump){if(!o||!o.material)return;o.material.map=texture(kind);o.material.roughness=roughness;if(bump){o.material.bumpMap=o.material.map;o.material.bumpScale=bump;}o.material.needsUpdate=true;}
    function decorative(o){o.userData.sceneDecoration=true;o.castShadow=false;return o;}
    function ring(parent,r,y,hex,thickness){var o=decorative(h.mesh(new T.TorusGeometry(r,thickness||.008,6,48),hex,0,y,0,parent,{roughness:.34,metalness:.15}));o.rotation.x=Math.PI/2;return o;}
    // A ridged outer wall, dark inner wall, and slanted annular ends share one draw call.
    function penne(radius,length){
      var key=radius+':'+length;if(noodleShapes[key])return noodleShapes[key];
      var positions=[],normals=[],uvs=[],colors=[],indices=[],segments=24;
      for(var band=0;band<4;band++)for(var i=0;i<=segments;i++){
        var angle=i/segments*Math.PI*2,inner=band>=2,upper=band===1||band===3,r=inner?radius*.55:radius*(i%2?.94:1.06),x=Math.cos(angle)*r,z=Math.sin(angle)*r;
        positions.push(x,(upper?1:-1)*length/2+x*.35,z);normals.push(Math.cos(angle)*(inner?-1:1),0,Math.sin(angle)*(inner?-1:1));uvs.push(i/segments,upper?1:0);var tone=inner?.42:1;colors.push(tone,tone,tone);
      }
      function join(a,b,reverse){for(var i=0;i<segments;i++){var p=a*(segments+1)+i,q=b*(segments+1)+i;if(reverse)indices.push(p,q+1,q,p,p+1,q+1);else indices.push(p,q,q+1,p,q+1,p+1);}}
      join(0,1,false);join(2,3,true);join(1,3,false);join(2,0,false);
      var geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();noodleShapes[key]=geometry;return geometry;
    }
    function noodle(o){if(!o.geometry||o.geometry.type!=='CylinderGeometry')return;var p=o.geometry.parameters;if(p.radiusTop>.035||p.height<.05)return;var old=o.geometry;o.geometry=penne(p.radiusTop,p.height);old.dispose();o.material.vertexColors=true;o.material.roughness=.58;o.material.needsUpdate=true;}
    h.pasta.forEach(noodle);h.packet.traverse(function(o){if(o.isMesh)noodle(o);});
    surface(h.pot.children[0],'steel',.3,.0012);surface(h.colander.children[0],'steel',.38,.001);
    ring(h.pot,.526,1.304,'#a2ada5',.009);ring(h.pot,.537,1.866,'#e5e8dc',.006);ring(h.pan,.706,1.411,'#7c887c',.009);ring(h.pan,.65,1.291,'#677266',.012);
    // Interior rivets move with each vessel; their hit targets remain the original vessel.
    [-1,1].forEach(function(side){for(var z=-1;z<=1;z+=2){var rivet=decorative(h.ball(.017,'#d6dfd3',side*.54,1.724,z*.07,h.pot));rivet.scale.x=.3;}var grip=decorative(h.box(.2,.025,.135,'#3d5145',side*.7,1.75,0,h.pot));surface(grip,'linen',.9,.002);});
    for(var rivet=0;rivet<2;rivet++){var r=decorative(h.cyl(.018,.018,.007,'#c7ccbf',.64,1.43,(rivet-.5)*.065,h.pan));r.material.metalness=.55;}
    h.knife.material.metalness=.65;h.knife.material.roughness=.22;surface(h.knife,'steel',.22,.0004);
    decorative(h.box(.412,.003,.006,'#f3f4e9',0,-.01,.044,h.knife));
    [-.055,.045].forEach(function(x){decorative(h.cyl(.01,.01,.008,'#ceb785',x,.024,0,h.knifeHandle));});
    surface(h.cloth,'linen',.95,.004);
    var boards=[h.board,h.garlicBoard];boards.forEach(function(board){var p=board.geometry.parameters;[-1,1].forEach(function(side){decorative(h.box(p.width-.045,.004,.009,'#9a734c',0,.027,side*(p.depth/2-.022),board));});});
    function plate(group,r,y){surface(group.children[0],'ceramic',.29,.001);ring(group,r*.91,y,'#b5c8ae',.007);ring(group,r*.84,y+.002,'#d7bc80',.004);ring(group,r*.73,y-.004,'#ece5ce',.004);}
    plate(h.plate,.72,1.269);h.serving.forEach(function(p){plate(p.group,.36,1.276);var mat=decorative(h.box(.77,.014,.68,'#e5e4ce',0,1.171,0,p.group));surface(mat,'linen',.95,.0015);});
    surface(h.garlicBowl.children[0],'ceramic',.35,.001);ring(h.garlicBowl,.174,.047,'#b5c6ab',.005);
    // Thin paint mouldings give the cabinet faces depth at the wide camera angle.
    for(var door=-2.25;door<3;door+=1.15){[-1,1].forEach(function(side){decorative(h.box(.016,.65,.01,'#355642',door+side*.43,.51,1.386));decorative(h.box(.875,.014,.01,'#60806a',door,.51+side*.325,1.386));});}
    var roots=h.whole.concat(h.food),cutters=h.slices,cutFaces=[];
    cutters.forEach(function(o){var face=decorative(h.mesh(new T.PlaneGeometry(.096,.254),'#ffffff',0,.0385,0,o,{roughness:.75}));face.rotation.x=-Math.PI/2;face.material.color=o.material.color;face.material.emissive=o.material.emissive;cutFaces.push(face);});
    function update(s){
      var red=s.id==='tomato';if(lastRecipe===s.id)return;lastRecipe=s.id;
      roots.forEach(function(o){surface(o,red?'tomato':'mushroom',red?.38:.78,red?.0005:.0015);});
      cutFaces.forEach(function(o){surface(o,red?'cut-tomato':'cut-mushroom',red?.48:.78,.0005);});
    }
    return {update:update,dispose:function(){Object.keys(maps).forEach(function(key){maps[key].dispose();});}};
  }
  root.KitchenVisualDetails={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
