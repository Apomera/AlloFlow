const fs=require('node:fs');
const path='stem_lab/stem_tool_geometryworld.js';
let source=fs.readFileSync(path,'utf8');
const start=source.indexOf('        engine._dimLines = [];\n        function clearDimLines()');
const labelEnd=source.indexOf('        function showDimLines(',start);
if(start<0||labelEnd<0)throw new Error('Dimension label section missing');
source=source.slice(0,start)+`        engine._dimLines = [];
        engine._dimBuildTimers = [];
        engine._dimensionRevision = 0;
        function clearDimLines() {
          engine._dimensionRevision++;
          (engine._dimBuildTimers || []).forEach(clearTimeout);engine._dimBuildTimers=[];
          if(engine._dimTimer){clearTimeout(engine._dimTimer);engine._dimTimer=null;}
          engine._dimLines.forEach(function(obj) {
            engine.scene.remove(obj);
            if(obj.geometry && !obj.isSprite)obj.geometry.dispose();
            if(obj.material){if(obj.userData && obj.userData.gwDimensionLabel && obj.material.map)obj.material.map.dispose();obj.material.dispose();}
          });
          engine._dimLines=[];
        }
        engine.clearDimensionAnnotations=clearDimLines;
        function hideDimensionDuringShowcase(object) {
          if(!engine._showcase)return;
          engine._showcase.hidden.push([object,object.visible]);object.visible=false;
        }
        function makeDimLabel(text, color) {
          var THREE=window.THREE,c=document.createElement('canvas'),cx=c.getContext('2d');
          var fontSize=34,fontFamily='system-ui, -apple-system, Segoe UI, sans-serif';
          cx.font='600 '+fontSize+'px '+fontFamily;
          var measured=cx.measureText(text).width;
          if(measured>976){fontSize=Math.max(14,Math.floor(fontSize*976/measured));cx.font='600 '+fontSize+'px '+fontFamily;measured=cx.measureText(text).width;}
          c.width=Math.min(1024,Math.max(144,Math.ceil((measured+48)/4)*4));c.height=80;
          cx=c.getContext('2d');cx.clearRect(0,0,c.width,c.height);
          cx.fillStyle='#123a32';cx.strokeStyle=color || '#d4e8ca';cx.lineWidth=2;
          cx.beginPath();if(cx.roundRect)cx.roundRect(3,3,c.width-6,74,17);else cx.rect(3,3,c.width-6,74);cx.fill();cx.stroke();
          cx.font='600 '+fontSize+'px '+fontFamily;cx.textAlign='center';cx.textBaseline='middle';
          cx.fillStyle='#f5f0e5';cx.fillText(text,c.width/2,41,c.width-36);
          var dimTex=new THREE.CanvasTexture(c);
          if(typeof THREE.sRGBEncoding !== 'undefined')dimTex.encoding = THREE.sRGBEncoding;
          dimTex.minFilter=THREE.LinearFilter;dimTex.generateMipmaps=false;
          var spr=new THREE.Sprite(new THREE.SpriteMaterial({map:dimTex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
          spr.scale.set(c.width/80*0.55,0.55,1);spr.renderOrder=999;
          spr.userData.gwDimensionLabel=text;
          return spr;
        }
        function dimensionVolumeCaption(m) {
          var occupied=typeof m.occupiedVolume==='number'?m.occupiedVolume:typeof m.totalVolume==='number'?m.totalVolume:m.count;
          if(m.isComplete===false)return 'At least '+formatVolume(occupied)+' cu';
          if(m.isSolidPrism!==false && Math.abs(occupied-m.boundingVolume)<0.000001)return m.L+' × '+m.W+' × '+m.H+' = '+formatVolume(occupied);
          return 'Occupied V = '+formatVolume(occupied)+' cu';
        }
`+source.slice(labelEnd);
const a=source.indexOf('        function showDimLines('),b=source.indexOf('        // ── Structure selection glow',a);
if(a<0||b<0)throw new Error('Dimension drawing section missing');
let block=source.slice(a,b);
block=block.replace('          clearDimLines();','          clearDimLines();\n          var revision=engine._dimensionRevision;');
block=block.replaceAll('          setTimeout(function() {','          engine._dimBuildTimers.push(setTimeout(function() {');
block=block.replaceAll('if (!engine || !engine.scene || !window.THREE) return;','if (!engine || engine._destroyed || revision!==engine._dimensionRevision || !engine.scene || !window.THREE) return;');
for(const ms of [800,1600,2400])block=block.replace('          }, '+ms+');','          }, '+ms+'));');
for(const name of ['bar','lbl','wbl','hbl','vbl','bbLine'])block=block.replace('engine.scene.add('+name+'); engine._dimLines.push('+name+');','engine.scene.add('+name+'); engine._dimLines.push('+name+'); hideDimensionDuringShowcase('+name+');');
block=block.replace("var volStr = m.L + '\\u00d7' + m.W + '\\u00d7' + m.H + '=' + (m.hasFractions ? m.formattedVolume : m.boundingVolume);",'var volStr = dimensionVolumeCaption(m);');
block=block.replace('vbl.scale.set(2.4, 0.75, 1);','vbl.scale.multiplyScalar(1.12);');
block=block.replace('var bbEdges = new THREE.EdgesGeometry(bbGeo);','var bbEdges = new THREE.EdgesGeometry(bbGeo);bbGeo.dispose();');
source=source.slice(0,a)+block+source.slice(b);
const cleanup='          if (engine._dimLines) engine._dimLines.forEach(function(obj) { engine.scene.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });';
if(!source.includes(cleanup))throw new Error('Dimension cleanup marker missing');
source=source.replace(cleanup,'          if (engine.clearDimensionAnnotations) engine.clearDimensionAnnotations();');
source=source.replace('        engine.clearWorld = function() {','        engine.clearWorld = function() {\n          if(engine.clearDimensionAnnotations)engine.clearDimensionAnnotations();');
new Function(source);
for(const output of [path,'desktop/web-app/public/'+path]){const fd=fs.openSync(output,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);}
console.log('Clear, accurate measurement annotations applied and mirrored.');
