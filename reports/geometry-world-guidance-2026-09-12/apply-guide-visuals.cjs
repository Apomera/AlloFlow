const fs = require('fs');
const path = require('path');
const file = path.resolve('stem_lab/stem_tool_geometryworld.js');
const raw = fs.readFileSync(file, 'utf8');
let source = raw.replace(/\r\n/g, '\n');
function replace(from, to) {
  if (source.split(from).length !== 2) throw new Error('Expected one anchor: ' + from.slice(0, 100));
  source = source.replace(from, to);
}
function between(start, end, text) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing range: ' + start);
  source = source.slice(0, a) + text + source.slice(b);
}
if (source.includes('function geometryGuideState(')) throw new Error('Guide visual patch already present');
replace('  // ── Non-visual wayfinding ──', fs.readFileSync(path.join(__dirname, 'guide-visual-helpers.js'), 'utf8').replace(/\r\n/g, '\n') + '\n  // ── Non-visual wayfinding ──');
between('          // Name label — cleaner with rounded background', '          var labelTex = new THREE.CanvasTexture(canvas2);', `          // Crisp name and location hierarchy; all guide textures share one palette.
          var canvas2 = document.createElement('canvas'); canvas2.width = 640; canvas2.height = 160;
`);
replace('sprite.scale.set(2.2, 0.55, 1);', 'sprite.scale.set(2.5, 0.625, 1);');
replace('sprite.position.set(data.position[0] + 0.5, data.position[1] + 2.1, data.position[2] + 0.5);', 'sprite.position.set(data.position[0] + 0.5, data.position[1] + 2.45, data.position[2] + 0.5);');
between('          // "Press E" interaction prompt (hidden until player is near', '          var promptTex = new THREE.CanvasTexture(promptCanvas);', `          // A keyboard keycap makes the interaction explicit at close range.
          var promptCanvas = document.createElement('canvas'); promptCanvas.width = 320; promptCanvas.height = 96;
`);
replace('promptSprite.scale.set(1.2, 0.45, 1);', 'promptSprite.scale.set(1.35, 0.405, 1);');
replace('promptSprite.position.set(data.position[0] + 0.5, data.position[1] + 2.5, data.position[2] + 0.5);', 'promptSprite.position.set(data.position[0] + 0.5, data.position[1] + 3.05, data.position[2] + 0.5);');
between("            var qcx = qCanvas.getContext('2d');", '            var qTex = new THREE.CanvasTexture(qCanvas);', '');
replace('qMarkSprite.scale.set(0.6, 0.6, 1);', 'qMarkSprite.scale.set(0.42, 0.42, 1);');
replace('qMarkSprite.position.set(data.position[0] + 0.5, data.position[1] + 2.7, data.position[2] + 0.5);', 'qMarkSprite.position.set(data.position[0] + 0.5, data.position[1] + 3.05, data.position[2] + 0.5);');
replace('            _arms: arms, _mouth: mouth, _eyeParts: [eyeL, eyeR, eyeWhiteL, eyeWhiteR], _blinkSeed: engine.npcs.length + 1, data: data });', `            _arms: arms, _mouth: mouth, _eyeParts: [eyeL, eyeR, eyeWhiteL, eyeWhiteR], _blinkSeed: engine.npcs.length + 1, data: data });
          geometryRefreshGuideSprites(engine, engine.npcs[engine.npcs.length - 1], engine.npcs.length - 1, geometryGuideContrast(engine));`);
replace('            var THREE = window.THREE, ambientMotion = engine._ambientMotionEnabled !== false;', '            if (engine._showcase) return; // Preserve Studio-hidden NPC sprites and avoid late allocations.\n            var THREE = window.THREE, ambientMotion = engine._ambientMotionEnabled !== false;');
replace('          // Animate NPCs — bob, rotate, face player when close', `          // Animate NPCs — bob, rotate, face player when close
          var guideContrast = geometryGuideContrast(engine);`);
replace('npc.label.position.y  = npc.data.position[1] + 2.1 + bobY;', 'npc.label.position.y  = npc.data.position[1] + 2.45 + bobY;');
replace('              if (isNpcAnswered) {', '              if (isNpcAnswered || (engine.camera && dist < 3.5)) {');
replace('npc.qMark.position.y = npc.data.position[1] + 2.7 + (ambientMotion ? Math.sin(t * 3 + i * 1.5) * 0.15 : 0);', 'npc.qMark.position.y = npc.data.position[1] + 3.05 + (ambientMotion ? Math.sin(t * 2 + i * 1.5) * 0.045 : 0);');
replace('var qScale = 0.55 + (ambientMotion ? Math.sin(t * 4 + i) * 0.08 : 0);', 'var qScale = 0.42 + (ambientMotion ? Math.sin(t * 2 + i) * 0.015 : 0);');
between("                var sbx = sbCanvas.getContext('2d');", '                var sbTex = new THREE.CanvasTexture(sbCanvas);', '');
replace('npc._speechBubble.position.set(npc.data.position[0] + 0.5, npc.data.position[1] + 3.0, npc.data.position[2] + 0.5);', 'npc._speechBubble.position.set(npc.data.position[0] + 0.5, npc.data.position[1] + 3.6, npc.data.position[2] + 0.5);');
replace('var sbTarget = (dist2 > 3 && dist2 < 6) ? 0.7 : 0;', `var previewBearing = geometryGuideBearing(geometryGuideCameraBasis(engine.camera), -dx2, -dz2);
                var sbTarget = (dist2 > 3.5 && dist2 < 6 && Math.abs(previewBearing) < Math.PI / 7) ? 0.95 : 0;`);
replace('npc._speechBubble.position.y = npc.data.position[1] + 3.0 + (ambientMotion ? Math.sin(t * 1.5 + i * 0.8) * 0.04 : 0);', 'npc._speechBubble.position.y = npc.data.position[1] + 3.6 + (ambientMotion ? Math.sin(t * 1.5 + i * 0.8) * 0.025 : 0);');
replace('npc.prompt.position.y = npc.data.position[1] + 2.5 + (ambientMotion ? Math.sin(t * 2.5 + i * 0.7) * 0.06 : 0);', 'npc.prompt.position.y = npc.data.position[1] + 3.05 + (ambientMotion ? Math.sin(t * 2.5 + i * 0.7) * 0.025 : 0);');
replace('          // ── NPC proximity chime (soft ping when near unanswered NPC, every 3s) ──', `          engine.npcs.forEach(function(npc, index) { geometryRefreshGuideSprites(engine, npc, index, guideContrast); });

          // ── NPC proximity chime (soft ping when near unanswered NPC, every 3s) ──`);
const compassStart = source.indexOf('function render() {', source.indexOf('function stopStrip() {'));
const paintStart = source.indexOf('              ctx.clearRect(0, 0, W, H);', compassStart);
const paintEnd = source.indexOf('              requestAnimationFrame(render);', paintStart);
if (compassStart < 0 || paintStart < 0 || paintEnd < 0) throw new Error('Missing compass painting block');
source = source.slice(0, paintStart) + `              var trackedGuide = geometryPaintGuideCompass(ctx, W, H, engine, geometryGuideContrast(engine));
              if (trackedGuide) cv.setAttribute('data-tracked-npc', trackedGuide);
              else cv.removeAttribute('data-tracked-npc');
` + source.slice(paintEnd);
replace("          role: 'img', 'aria-label': __alloT('stem.geometryworld.npc_compass_strip_showing_relative_dir'", "          className: 'gw-guide-compass', role: 'img', 'aria-label': __alloT('stem.geometryworld.npc_compass_strip_showing_relative_dir'");
new Function(source);
const destination = process.argv.includes('--apply') ? file : path.join(__dirname, 'npc-core-candidate.js');
const output = raw.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source;
if (fs.existsSync(destination)) { const fd = fs.openSync(destination, 'r+'); try { fs.writeSync(fd, output, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(output)); } finally { fs.closeSync(fd); } }
else fs.writeFileSync(destination, output);
console.log(destination);
