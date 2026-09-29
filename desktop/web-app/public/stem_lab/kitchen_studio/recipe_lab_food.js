/* Prepared food keeps its cut shape and recorded surface through cooking and serving. */
(function(root){
  'use strict';
  function mount(h){
    var T=h.THREE,R=root.KitchenRecipes,textures={},shapes={},rows=[];
    var tones={pale:'#ffffff',golden:'#dfb26e',dark:'#926744',scorched:'#574134',firm:'#ffffff',softened:'#dda994'};
    function texture(kind){
      if(textures[kind])return textures[kind];
      var c=document.createElement('canvas');c.width=c.height=256;var p=c.getContext('2d');
      p.fillStyle=kind==='mushroom'?'#fff5df':'#ed7954';p.fillRect(0,0,256,256);
      if(kind==='mushroom'){
        p.strokeStyle='#ab885c';p.lineWidth=9;p.beginPath();p.ellipse(128,142,119,119,0,Math.PI,Math.PI*2);p.stroke();
        for(var g=-7;g<=7;g++){p.strokeStyle=g%2?'#92704988':'#b0946877';p.lineWidth=2;p.beginPath();p.moveTo(128+g*3,165);p.quadraticCurveTo(128+g*11,133,128+g*15,111+Math.abs(g)*5);p.stroke();}
        for(var f=0;f<6;f++){p.strokeStyle='#c4ac7d77';p.lineWidth=1.2;p.beginPath();p.moveTo(108+f*8,180);p.quadraticCurveTo(101+f*9,212,107+f*8,252);p.stroke();}
        for(var dot=0;dot<110;dot++){p.fillStyle=dot%2?'#99815420':'#ffffff88';p.fillRect((dot*79)%256,(dot*131)%256,1,2);}
      }else{
        p.strokeStyle='#ffd39c';p.lineWidth=6;p.beginPath();p.ellipse(128,139,110,115,0,Math.PI,Math.PI*2);p.stroke();
        [77,179].forEach(function(x,side){p.fillStyle='#b64f343f';p.beginPath();p.ellipse(x,104,35,61,side?.4:-.4,0,Math.PI*2);p.fill();
          for(var seed=0;seed<5;seed++){var a=seed*1.15+.25;p.fillStyle='#fce7a9';p.beginPath();p.ellipse(x+Math.cos(a)*20,104+Math.sin(a)*41,3.5,7,side?.45:-.45,0,Math.PI*2);p.fill();}
        });
        p.strokeStyle='#ffd4a27a';p.lineWidth=8;p.beginPath();p.moveTo(128,53);p.quadraticCurveTo(113,110,128,165);p.stroke();
      }
      var map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;map.anisotropy=Math.min(h.anisotropy||1,4);textures[kind]=map;return map;
    }
    function outline(kind){
      var s=new T.Shape();
      if(kind==='mushroom'){
        s.moveTo(-.12,-.01);s.bezierCurveTo(-.13,.075,-.075,.13,0,.13);s.bezierCurveTo(.075,.13,.13,.075,.12,-.01);s.quadraticCurveTo(.08,-.025,.034,-.025);s.lineTo(.04,-.1);s.quadraticCurveTo(0,-.125,-.04,-.1);s.lineTo(-.034,-.025);s.quadraticCurveTo(-.08,-.025,-.12,-.01);
      }else if(kind==='pulp'){
        s.moveTo(-.125,0);s.bezierCurveTo(-.15,.075,-.07,.125,-.03,.1);s.bezierCurveTo(.035,.15,.13,.07,.112,.015);s.bezierCurveTo(.16,-.065,.04,-.11,0,-.077);s.bezierCurveTo(-.1,-.14,-.145,-.06,-.125,0);
      }else if(kind==='left'){
        s.moveTo(0,-.035);s.lineTo(-.115,0);s.bezierCurveTo(-.14,.04,-.115,.13,0,.135);s.lineTo(0,-.035);
      }else if(kind==='right'){
        s.moveTo(0,-.035);s.lineTo(0,.135);s.bezierCurveTo(.115,.13,.14,.04,.115,0);s.lineTo(0,-.035);
      }else{
        s.moveTo(0,-.035);s.lineTo(-.115,0);s.bezierCurveTo(-.14,.04,-.115,.13,0,.135);s.bezierCurveTo(.115,.13,.14,.04,.115,0);s.lineTo(0,-.035);
      }
      s.closePath();return s;
    }
    function geometry(kind){
      if(shapes[kind])return shapes[kind];
      var shape=outline(kind),bottom=kind==='mushroom'?-.1:-.075,depth=kind==='mushroom'?.1:kind==='pulp'?.055:.14;
      var body=new T.ExtrudeGeometry(shape,{depth:depth,bevelEnabled:false,curveSegments:12,steps:1});body.translate(0,0,bottom);body.rotateX(-Math.PI/2);
      var face=new T.ShapeGeometry(shape,12),uv=face.attributes.uv,pos=face.attributes.position;
      for(var i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+.15)/.3,(pos.getY(i)+.14)/.29);
      face.rotateX(-Math.PI/2);face.translate(0,bottom+depth+.001,0);face.scale(.96,1,.96);
      shapes[kind]={body:body,face:face,bottom:bottom};return shapes[kind];
    }
    function detail(g,parent,color){var o=h.mesh(g,color,0,0,0,parent);o.userData.sceneDecoration=true;return o;}
    function layer(kind,parent){
      var model=new T.Group();parent.add(model);var g=geometry(kind),body=detail(g.body,model,'#ffffff'),face=detail(g.face,model,'#ffffff');
      face.material.map=texture(kind==='mushroom'?'mushroom':'tomato');face.material.bumpMap=face.material.map;face.material.bumpScale=.0008;face.material.needsUpdate=true;
      return {group:model,body:body,face:face};
    }
    function add(proxy,index,size,floor,serving){
      // Keep the original generous hit volume so small pieces remain easy to manipulate.
      proxy.material.visible=false;proxy.castShadow=false;
      var group=new T.Group();group.scale.setScalar(size);group.rotation.y=index*2.399;proxy.add(group);
      rows.push({proxy:proxy,index:index,size:size,floor:floor,serving:serving,group:group,models:{}});
    }
    h.pan.forEach(function(o,i){add(o,i,1,1.438,false);});
    h.plate.forEach(function(o,i){add(o,i,.1/.12,1.285,false);});
    h.serving.forEach(function(plate,i){plate.topping.forEach(function(o,k){add(o,(i*4+k)%14,.052/.12,1.313,true);});});
    function update(s){
      var red=s.id==='tomato',pieces=R.panSurface(s).pieces,target=R.cutProfile(s).target;
      h.stems.forEach(function(o){o.visible=false;});
      rows.forEach(function(row){
        var piece=pieces[row.index],stage=red&&piece?piece.crushed:0,name=red?(stage===2?'pulp':stage===1?'split':'wedge'):'mushroom';
        if(!row.models[name]){
          row.models[name]=name==='split'?[layer('left',row.group),layer('right',row.group)]:[layer(name,row.group)];
          if(name==='split')row.models[name].forEach(function(o,i){o.group.position.x=i?.018:-.018;o.group.rotation.y=i?-.13:.13;});
        }
        Object.keys(row.models).forEach(function(key){row.models[key].forEach(function(o){o.group.visible=key===name;});});
        row.group.userData.foodShape=name;
        if(row.serving){var scale=Math.max(.5,Math.min(1.7,(piece&&piece.width||target)/target));row.proxy.scale.set(scale*(1+stage*.18),.55*scale*(1-stage*.3),scale*(1+stage*.18));}
        row.proxy.position.y=row.floor+(red?.075:.1)*row.size*row.proxy.scale.y;
        row.models[name].forEach(function(o){
          o.body.material.color.copy(row.proxy.material.color);o.body.material.roughness=row.proxy.material.roughness;
          o.face.material.color.set(tones[piece&&piece.topColor]||'#ffffff').convertSRGBToLinear();o.face.material.roughness=row.proxy.material.roughness;
          o.face.material.emissive.copy(row.proxy.material.emissive);
        });
      });
    }
    return {update:update,dispose:function(){Object.keys(textures).forEach(function(key){textures[key].dispose();});}};
  }
  root.KitchenFoodDetails={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
