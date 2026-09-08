const fs=require('node:fs'),path=require('node:path');
function write(p,s){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
let p='stem_lab/stem_tool_geometryworld.js',s=fs.readFileSync(p,'utf8');if(!fs.existsSync(path.join(__dirname,'before-gorgeous-source.js')))fs.writeFileSync(path.join(__dirname,'before-gorgeous-source.js'),s);
function replace(a,b){a=a.replaceAll('\r\n','\n');s=s.replaceAll('\r\n','\n');if(!s.includes(a))throw new Error('Missing '+a.slice(0,70));s=s.replace(a,b);}
replace('          engine._renderProfile = profile;','          var previousTier = engine._renderProfile && engine._renderProfile.tier;\n          engine._renderProfile = profile;');
replace('          Object.keys(engine._matCache || {}).forEach(function(key){updateSurfaceDetail(engine._matCache[key]);});', '          if (previousTier !== profile.tier) Object.keys(engine._matCache || {}).forEach(function(key){updateSurfaceDetail(engine._matCache[key]);});');
replace('          Object.keys(engine.blocks || {}).forEach(function(key){updateSurfaceDetail(engine.blocks[key].material);});', '          if (previousTier !== profile.tier) Object.keys(engine.blocks || {}).forEach(function(key){updateSurfaceDetail(engine.blocks[key].material);});');
replace('try { engine.composer.setSize(container.clientWidth, container.clientHeight); }', 'try { if(engine.composer.setPixelRatio)engine.composer.setPixelRatio(engine.renderer.getPixelRatio()); engine.composer.setSize(container.clientWidth, container.clientHeight); }');
replace('if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass) return;', 'if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass || !T.ShaderPass) return;');
replace('              c.setSize(cw, ch);','              if(c.setPixelRatio)c.setPixelRatio(engine.renderer.getPixelRatio());\n              c.setSize(cw, ch);');
replace('              engine.composer = c;',`              // Composite bloom in linear space, then encode exactly once for the screen.
              var outputPass = new T.ShaderPass({
                uniforms:{tDiffuse:{value:null}},
                vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
                fragmentShader:'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){gl_FragColor=texture2D(tDiffuse,vUv);\\n#include <encodings_fragment>\\n}'
              });
              outputPass.material.toneMapped=false;c.addPass(outputPass);engine._outputPass=outputPass;
              engine.composer = c;`);
replace("              '  gl_FragColor = vec4(col, 1.0);',", "              '  gl_FragColor = vec4(col, 1.0);',\n              '  #include <encodings_fragment>',");
replace('            var sunI = engine.sun.intensity;', '            if(engine._skyDome)engine._skyDome.material.uniforms.sunDir.value.set(sdir.x,sdir.y,sdir.z);\n            var sunI = engine.sun.intensity;');
replace('          // Reset sky to daytime\r\n          engine.scene.background.setRGB(0.53, 0.81, 0.92);\r\n          engine.scene.fog.color.setRGB(0.53, 0.81, 0.92);', "          // Initialize the complete environment together, including its light and sun bearing.\n          applyEnvPreset(engine, d.envPreset || 'day');\n          engine._envTransition=1;updateEnvTransition(engine,0);");
replace('        engine.isInputActive = function() {', '        engine.isInputActive = function() {\n          if(engine._showcase)return false;');
replace("document.addEventListener('keydown', _docH.keydown = function(ev) {", "document.addEventListener('keydown', _docH.keydown = function(ev) {\n          if(engine._showcase){if(ev.code==='Escape' && engine.endShowcase){ev.preventDefault();engine.endShowcase();}return;}");
replace("canvas.addEventListener('click', _cvH.click = function() { if (!engine.isLocked) canvas.requestPointerLock(); });", "canvas.addEventListener('click', _cvH.click = function() { if (!engine._showcase && !engine.isLocked) canvas.requestPointerLock(); });");
replace('          engine._builderSelection = null;', '          if(engine.endShowcase)engine.endShowcase();\n          engine._builderSelection = null;');
replace('engine.camera.aspect = cw / ch;', 'engine.camera.aspect = cw / ch;\n          if(engine.fitShowcase)engine.fitShowcase();');
// Gold should read as warm metal, with highlights supplied by the environment.
replace("mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.32, metalness: 0.55, envMapIntensity: 0.9 });", "mat = new THREE.MeshStandardMaterial({ color: geometryWorldSrgbColor(THREE, 0xdca947), roughness: 0.27, metalness: 0.82, envMapIntensity: 1.1 });");
// Reflect the actual sun's bearing, rather than a permanently painted northeast highlight.
replace('            var faces = [];','            var faces = [];\n            var environmentSun=geometryWorldSunVector(engine._sunAngles.el,engine._sunAngles.az);');
replace('                if (fi === 0 || fi === 4) {', "                var faceFacing=fi===0 ? environmentSun.x : fi===1 ? -environmentSun.x : fi===4 ? environmentSun.z : -environmentSun.z;\n                if (faceFacing > 0.1) {");
replace("sg.addColorStop(0, 'rgba(255,250,235,0.85)');", "sg.addColorStop(0, 'rgba(255,244,218,'+(Math.min(0.9,engine.sun.intensity*0.8)*faceFacing)+')');");
write(p,s);write('desktop/web-app/public/'+p,s);
p='stem_lab/stem_tool_geometryworld_builder.js';s=fs.readFileSync(p,'utf8');if(!fs.existsSync(path.join(__dirname,'before-gorgeous-builder.js')))fs.writeFileSync(path.join(__dirname,'before-gorgeous-builder.js'),s);
replace('  function measureSelectedBuild(ctx) {',fs.readFileSync(path.join(__dirname,'showcase-helper.txt'),'utf8')+'  function measureSelectedBuild(ctx) {');
replace("          var eng=window[ENGINE_KEY];", "          var eng=window[ENGINE_KEY];\n          if(outline)outline.visible=!(eng && eng._showcase);");
replace("            measured && h('button', {type:'button', onClick:function(){patchGeometryState(ctx,{builderPanel:'measure',sandboxDockCollapsed:true,hudPanel:''});}}, 'Explore measurements'),", "            measured && h('button',{type:'button',onClick:function(){showcaseBuild(ctx);}},'Showcase creation'),\n            measured && h('button', {type:'button', onClick:function(){patchGeometryState(ctx,{builderPanel:'measure',sandboxDockCollapsed:true,hudPanel:''});}}, 'Explore measurements'),");
replace("      var children = React.Children.toArray(base.props.children).concat(additions);",`      if(data.showcaseActive) additions.push(h('section', {key:'gwe-showcase',className:'gwe-showcase',role:'dialog','aria-modal':'true','aria-label':'Showcase creation',onKeyDown:function(event){trapDialogKeys(event,function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();});event.stopPropagation();}},
        h('div',{className:'gwe-showcase-caption'},h('span',null,'GEOMETRY WORLD'),h('strong',null,'Made by you.')),
        h('div',{className:'gwe-showcase-tools'},
          h('button',{id:'gwe-showcase-close',type:'button',onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();}},'Back to building'),
          h('button',{type:'button',onClick:function(){saveShowcaseImage(ctx);}},'Save image')
        )
      ));
      var children = React.Children.toArray(base.props.children).concat(additions);`);
replace("        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'", "        'data-showcase-active': data.showcaseActive ? 'true':'false',\n        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'");
replace("    ].join('');", `      ,'.gwe-showcase{position:absolute;inset:0;z-index:205;background:linear-gradient(180deg,rgba(4,18,27,.18),transparent 22%,transparent 74%,rgba(4,18,27,.24));display:flex;align-items:flex-end;justify-content:center;padding:24px;box-sizing:border-box}.gwe-showcase-caption{position:absolute;top:26px;left:28px;color:#fff;text-shadow:0 2px 16px #102b40}.gwe-showcase-caption span{font-size:10px;letter-spacing:.22em;font-weight:800}.gwe-showcase-caption strong{display:block;margin-top:6px;font-size:28px;font-weight:800;letter-spacing:-.03em}.gwe-showcase-tools{display:flex;gap:8px;padding:7px;border:1px solid #ffffff55;border-radius:16px;background:#0c2438e8;box-shadow:0 12px 36px #06192755;backdrop-filter:blur(12px)}.gwe-showcase-tools button{min-height:44px;padding:10px 18px;border:1px solid #a5cad055;border-radius:10px;background:transparent;color:#fff;font-size:13px;font-weight:800;cursor:pointer}.gwe-showcase-tools button:last-child{background:#d5f2e8;color:#123c39}.gwe-showcase-tools button:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}#geoworld-fs-workspace[data-showcase-active="true"] .gw-toolbar{visibility:hidden}#geoworld-fs-workspace[data-showcase-active="true"] .gwe-builder-dock,#geoworld-fs-workspace[data-showcase-active="true"] .gw-hotbar,#geoworld-fs-workspace[data-showcase-active="true"] .gw-action-bar,#geoworld-fs-workspace[data-showcase-active="true"] .gw-shape-tray,#geoworld-fs-workspace[data-showcase-active="true"] .gw-coordinate-hud,#geoworld-fs-workspace[data-showcase-active="true"] .gw-touch-controls,#geoworld-fs-workspace[data-showcase-active="true"] .gw-crosshair,#geoworld-fs-workspace[data-showcase-active="true"] .gw-measure-card{visibility:hidden!important}@media(max-width:520px){.gwe-showcase{padding:16px}.gwe-showcase-caption{top:20px;left:20px}.gwe-showcase-caption strong{font-size:24px}}'
    ].join('');`);
write(p,s);write('desktop/web-app/public/'+p,s);console.log('Atmosphere, compositor, reflection and Showcase changes applied.');
