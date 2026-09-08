const fs=require('node:fs');
function save(p,s){for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}}
let p='stem_lab/stem_tool_geometryworld_builder.js',s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
replace('    engine.fitShowcase=function(){', '    var direction=new THREE.Vector3(1.25,0.72,1.55).normalize();\n    engine.rotateShowcase=function(step){direction.applyAxisAngle(new THREE.Vector3(0,1,0),step*Math.PI/6);engine.fitShowcase();};\n    engine.fitShowcase=function(){');
replace('addScaledVector(new THREE.Vector3(1.25,0.72,1.55).normalize(),distance)', 'addScaledVector(direction,distance)');
replace('engine._showcase=null;engine.fitShowcase=null;engine.endShowcase=null;', 'engine._showcase=null;engine.fitShowcase=null;engine.rotateShowcase=null;engine.endShowcase=null;');
replace('.gwe-showcase{position:absolute;', '.gwe-showcase{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;position:absolute;');
replace('.gwe-showcase-caption{position:absolute;', '.gwe-showcase-orbit{position:absolute;top:50%;width:44px;height:44px;border:1px solid #d3e5df99;border-radius:50%;background:#0c2438dd;color:#fff;font-size:25px;cursor:pointer;box-shadow:0 6px 20px #06192733}.gwe-showcase-orbit-left{left:20px}.gwe-showcase-orbit-right{right:20px}.gwe-showcase-orbit:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.gwe-showcase-caption{position:absolute;');
replace("'aria-label':'Showcase creation',onKeyDown:function(event){trapDialogKeys", "'aria-label':'Showcase creation',onKeyDown:function(event){if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(event.key==='ArrowLeft' ? -1:1);}trapDialogKeys");
replace("        h('div',{className:'gwe-showcase-tools'},", "        [-1,1].map(function(step){var label=step<0 ? 'Rotate view left':'Rotate view right';return h('button',{key:label,type:'button',className:'gwe-showcase-orbit gwe-showcase-orbit-'+(step<0 ? 'left':'right'),'aria-label':label,title:label,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(step);}},step<0 ? '\\u21B6':'\\u21B7');}),\n        h('div',{className:'gwe-showcase-tools'},");
save(p,s);
p='stem_lab/stem_tool_geometryworld.js';s=fs.readFileSync(p,'utf8');
replace('color: geometryWorldSrgbColor(THREE, 0xdca947), roughness: 0.27, metalness: 0.82, envMapIntensity: 1.1', 'color: geometryWorldSrgbColor(THREE, 0xffc04d), roughness: 0.23, metalness: 0.45, envMapIntensity: 0.75');
replace('// A soft sun highlight on the +X and +Z faces (the sun sits at +40,+45,+40),', '// A soft sun highlight follows the current environment bearing,');
save(p,s);console.log('Added orbit controls, a clear Showcase overlay and warmer gold.');
