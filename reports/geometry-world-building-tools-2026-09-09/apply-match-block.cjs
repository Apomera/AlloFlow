const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const canonical='stem_lab/stem_tool_geometryworld.js',mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld.js';
let source=fs.readFileSync(canonical,'utf8');
if(fs.readFileSync(mirror,'utf8')!==source)throw new Error('Core mirror differs before patch');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const before=hash(source),eol=source.includes('\r\n')?'\r\n':'\n';
const lines=value=>value.replace(/\n/g,eol);
function replaceOnce(a,b){if(source.split(a).length!==2)throw new Error('Expected one insertion point: '+a.slice(0,100));source=source.replace(a,b);}
const feedback=lines(String.raw`      // Match shares the shape cue's single timer and teardown ownership.
      function publishMatchedBlock(liveEngine, recipe, feedback) {
        var patch={actionFeedback:feedback};
        if(recipe){
          liveEngine._placeState=Object.assign({},liveEngine._placeState || {},recipe);
          Object.assign(patch,recipe);
        }
        var cue=shapeActionRef.current;
        if(cue.timer)clearTimeout(cue.timer);
        cue.shapeFeedback=feedback;cue.feedback=feedback;
        upd(patch);
        if(typeof announceToSR==='function')announceToSR(feedback);
        cue.timer=setTimeout(function(){
          cue.timer=null;
          if(cue.feedback===feedback)upd('actionFeedback','');
        },1800);
      }
`);
replaceOnce("      var homeLang = d.homeLang || 'en';",feedback+"      var homeLang = d.homeLang || 'en';");
const match=lines(String.raw`        function canMatchAimedBlock() {
          if(engine._destroyed || engine._runtimeFailed || engine._showcase || engine._worldActive===false)return false;
          var modal=engine._modalState || {};
          return !['showGameSettings','showNpcDialog','showMyLessons','showLessonEditor','showLessonIntro','showReflection','showHelp','showCreatorPanel','showGrowthNudge','showTeacherView','showPeerWorlds'].some(function(key){return !!modal[key];});
        }
        // Copy canonical choices only. Matching never creates a block or changes
        // the retained selection, camera, construction geometry or history.
        engine.matchAimedBlock = function() {
          var THREE=window.THREE;
          if(!canMatchAimedBlock() || !THREE || !engine.raycaster || !engine.camera)return false;
          engine.raycaster.setFromCamera(new THREE.Vector2(0,0),engine.camera);
          var targets=engine.getBlocksArr().concat((engine.npcs || []).map(function(npc){return npc.body;}).filter(Boolean));
          var hits=engine.raycaster.intersectObjects(targets),mesh=hits.length?hits[0].object:null;
          var data=mesh && mesh.userData,gp=data && data.gridPos;
          if(!data || data.isNPC || !gp){
            publishMatchedBlock(engine,null,'Aim at a block to match its material, shape and rotation.');return false;
          }
          if(![gp.x,gp.y,gp.z].every(function(value){return typeof value==='number' && isFinite(value) && Math.floor(value)===value;}) || engine.blocks[gp.x+','+gp.y+','+gp.z]!==mesh || mesh.visible===false){
            publishMatchedBlock(engine,null,'That block is no longer available. Aim at another block.');return false;
          }
          var materialIndex=BLOCK_TYPES.findIndex(function(type){return type.id===data.blockType;});
          var shapeIndex=BLOCK_SHAPES.findIndex(function(shape){return shape.id===data.shape;});
          var rotation=data.rotation;
          if(materialIndex<0 || shapeIndex<0 || typeof rotation!=='number' || !isFinite(rotation) || Math.floor(rotation)!==rotation || rotation<0 || rotation>3){
            publishMatchedBlock(engine,null,'This block cannot be matched. Choose a supported material and shape.');return false;
          }
          var recipe={selectedBlock:materialIndex,selectedShape:shapeIndex,blockRotation:rotation};
          publishMatchedBlock(engine,recipe,'Matched '+BLOCK_TYPES[materialIndex].name+' \u00b7 '+BLOCK_SHAPES[shapeIndex].name+' \u00b7 '+(rotation*90)+'\u00b0');
          return true;
        };

`);
replaceOnce('        // One measurement path for every input mode.',match+'        // One measurement path for every input mode.');
const key=lines(String.raw`            case 'KeyI':
              if(ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey)break;
              var matchTarget=ev.target;
              if(matchTarget && (matchTarget.tagName==='SELECT' || matchTarget.isContentEditable || matchTarget.closest && matchTarget.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')))break;
              if(!engine.isInputActive || !engine.isInputActive() || !canMatchAimedBlock())break;
              ev.preventDefault();engine.matchAimedBlock();break;
`);
replaceOnce("            case 'KeyQ': // Cycle through shapes",key+"            case 'KeyQ': // Cycle through shapes");
replaceOnce("          engine.interactAtCrosshair(ev.button === 0 ? 'break' : ev.button === 2 ? 'place' : null);",lines(String.raw`          if(ev.button===1){
            if(document.pointerLockElement!==canvas)return;
            ev.preventDefault();engine.matchAimedBlock();return;
          }
          engine.interactAtCrosshair(ev.button === 0 ? 'break' : ev.button === 2 ? 'place' : null);`));
replaceOnce('              engine.removeBlock(p.x, p.y, p.z);'+eol+'              sfxBreak(breakType);',
  '              engine.removeBlock(p.x, p.y, p.z);'+eol+'              // A protected or otherwise rejected removal is not a successful break.'+eol+"              if(engine.blocks[p.x+','+p.y+','+p.z])return null;"+eol+'              sfxBreak(breakType);');
replaceOnce('        engine._answeredRef = answeredNpcs;','        engine._answeredRef = answeredNpcs;'+eol+'        engine._worldActive = worldActive;');
replaceOnce("      fly:'M12 3v18M6 9l6-6 6 6M4 14l8 7 8-7',", "      fly:'M12 3v18M6 9l6-6 6 6M4 14l8 7 8-7',"+eol+"      match:'M16 3l5 5M14 5l5 5M4 16L14 6l4 4L8 20H4v-4ZM4 20l-1 1',");
const button=lines(String.raw`          el('button', {
            type:'button',className:'gw-focusable','aria-label':'Match aimed block','aria-keyshortcuts':'I','data-gw-utility':'match',
            disabled:openModals.length>0 || !worldActive || !!d.showcaseActive || !!engine._destroyed,
            onClick:function(){var liveEngine=window[engineKey];if(liveEngine && liveEngine.matchAimedBlock)liveEngine.matchAimedBlock();},
            title:'Match material, shape and rotation (I or middle-click)',
            style:{background:'rgba(30,41,59,0.6)',border:'1px solid rgba(100,116,139,0.2)',borderRadius:'6px',padding:'2px 8px',fontSize:'9px',color:'#d4e8ca',fontWeight:600,cursor:'pointer',backdropFilter:'blur(4px)'}
          },renderWorkspaceAction(el,'match','Match')),
`);
replaceOnce('          // Fly mode toggle (always visible)',button+'          // Fly mode toggle (always visible)');
replaceOnce("            el('span', { style: { color: '#c4b5fd', fontWeight: 700 } }, 'X / B'), 'Break / build (no mouse)',", "            el('span', { style: { color: '#c4b5fd', fontWeight: 700 } }, 'X / B'), 'Break / build (no mouse)',"+eol+"            el('span', { style: { color: '#c4b5fd', fontWeight: 700 } }, 'I / Middle'), 'Match aimed block',");
new vm.Script(source,{filename:canonical});
for(const file of [canonical,mirror]){const handle=fs.openSync(file,'r+');try{const bytes=Buffer.from(source);fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
if(fs.readFileSync(canonical,'utf8')!==fs.readFileSync(mirror,'utf8'))throw new Error('Core mirror differs after patch');
const result={before,after:hash(source),syntax:true,parity:true,lineEnding:eol==='\r\n'?'CRLF':'LF'};
fs.writeFileSync('reports/geometry-world-building-tools-2026-09-09/core-match-source.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
