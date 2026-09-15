const fs = require('node:fs'), assert = require('node:assert/strict');
const file = 'stem_lab/stem_tool_geometryworld.js';
const raw = fs.readFileSync(file, 'utf8');
let source = raw.replace(/\r\n/g, '\n');
function replace(before, after, count = 1) {
  assert.equal(source.split(before).length - 1, count, 'Unexpected anchor: ' + before.slice(0, 100));
  source = source.split(before).join(after);
}
replace(`          // Smooth camera entry — start high above spawn, swoop down
          if (lesson.spawnPoint) {
            var sp = lesson.spawnPoint;
            engine.camera.position.set(sp[0], sp[1] + 15, sp[2] - 8);
            engine.camera.lookAt(sp[0], sp[1], sp[2]);
            engine._entryAnim = { targetX: sp[0], targetY: sp[1], targetZ: sp[2], progress: 0 };
          }`, `          // Free Build is immediately interactive. Its arrival must not depend
          // on the lesson fly-in, which pauses when keyboard input takes focus.
          if (lesson.spawnPoint) {
            var sp = lesson.spawnPoint;
            if (lesson.sandbox) {
              var entryGround = lesson.ground || {};
              var entryFloor = typeof entryGround.y === 'number' && isFinite(entryGround.y) ? entryGround.y : 0;
              engine._entryAnim = null;
              engine.camera.position.set(sp[0], Math.max(sp[1], entryFloor + 2.6), sp[2]);
              engine.camera.lookAt(sp[0], entryFloor + 1, sp[2] - 3);
              if (engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion);
              if (engine.velocity) engine.velocity.set(0, 0, 0);
            } else {
              engine.camera.position.set(sp[0], sp[1] + 15, sp[2] - 8);
              engine.camera.lookAt(sp[0], sp[1], sp[2]);
              engine._entryAnim = { targetX: sp[0], targetY: sp[1], targetZ: sp[2], progress: 0 };
            }
          }`);
replace("'aria-label': __alloT('stem.geometryworld.a11y_geometry_world_lesson_controls', 'Geometry World lesson controls')", "'aria-label': currentLesson.sandbox ? 'Geometry World building tools' : __alloT('stem.geometryworld.a11y_geometry_world_lesson_controls', 'Geometry World lesson controls')");
replace("'aria-label': __alloT('stem.geometryworld.a11y_lesson_status_and_game_menu', 'Lesson status and game menu')", "'aria-label': currentLesson.sandbox ? 'Build status and tools' : __alloT('stem.geometryworld.a11y_lesson_status_and_game_menu', 'Lesson status and game menu')");
replace("            el('span', { className: 'gw-stat-chip', role: 'status', 'aria-live': 'polite', 'aria-label': __alloFill", "            totalQ > 0 && el('span', { className: 'gw-stat-chip', role: 'status', 'aria-live': 'polite', 'aria-label': __alloFill");
const objectivePattern = /( +)worldActive && el\('button', \{\n( +)type: 'button', className: 'gw-compact-action gw-focusable',\n( +)'aria-expanded': objectivesOpen/g;
let objectives = 0;
source = source.replace(objectivePattern, (_m, a, b, c) => { objectives++; return a + "worldActive && (!currentLesson.sandbox || hasLessonActivities) && el('button', {\n" + b + "type: 'button', className: 'gw-compact-action gw-focusable',\n" + c + "'aria-expanded': objectivesOpen"; });
assert.equal(objectives, 2);
replace("'aria-label': (currentLesson.title || 'Geometry World') + ' — interactive 3D world. ' + score + ' of ' + totalQ + ' questions answered.'", "'aria-label': (currentLesson.title || 'Geometry World') + ' — interactive 3D world. ' + (totalQ > 0 ? score + ' of ' + totalQ + ' questions answered.' : currentLesson.sandbox ? 'Build, select, and explore your creation.' : 'Explore this world.')");
replace("          className:'gw-placement-hint','data-allowed':d.placementHint.allowed ? 'true':'false',", "          className:'gw-placement-hint','data-allowed':d.placementHint.allowed ? 'true':'false',\n          'data-placement-state':d.placementHint.code === 'no_target' ? 'aim' : d.placementHint.allowed ? 'ready' : 'blocked',");
replace("        },el('span',{className:'gw-placement-hint-mark','aria-hidden':'true'},d.placementHint.allowed ? '\\u2713':'!'),el('span',null,d.placementHint.reason),", `        },el('span',{className:'gw-placement-hint-mark','aria-hidden':'true'},d.placementHint.code === 'no_target'
          ? el('svg',{viewBox:'0 0 20 20',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:1.5,focusable:'false'},el('path',{d:'M10 2v4m0 8v4M2 10h4m8 0h4'}),el('circle',{cx:10,cy:10,r:4}))
          : d.placementHint.allowed ? '\\u2713':'!'),
          el('span',{className:'gw-placement-text'},d.placementHint.code === 'no_target' ? 'Look down at the nearby ground or a block face.' : d.placementHint.reason),
          d.placementHint.allowed && el('span',{className:'gw-placement-shortcut'},isMobile && touchMode ? 'Tap Place' : el(React.Fragment,null,el('kbd',null,'B'),' to place')),`);
replace('min-height:28px}.gw-placement-hint .gw-placement-aim:hover', 'min-height:44px;min-width:44px}.gw-placement-hint .gw-placement-aim:hover');
const css = '.gw-placement-hint[data-placement-state="aim"]{background:#f3eedcfa;color:#29473a;border-color:#b8c9ae;box-shadow:0 5px 18px #092b2524}.gw-placement-hint[data-placement-state="aim"] .gw-placement-text{flex:1 1 150px;max-width:280px}.gw-placement-hint[data-placement-state="aim"] .gw-placement-hint-mark{border-color:#96ae93}.gw-placement-hint .gw-placement-shortcut{display:inline-flex;align-items:center;gap:5px;padding-left:9px;margin-left:2px;border-left:1px solid #c4dfc74d;font-weight:500;white-space:nowrap}.gw-placement-shortcut kbd{display:grid;place-items:center;min-width:21px;min-height:21px;border:1px solid #c4dfc785;border-radius:5px;background:#d4e8ca12;font:700 11px system-ui,sans-serif}.theme-contrast .gw-root .gw-placement-hint[data-placement-state="aim"],[data-stem-theme="contrast"] .gw-root .gw-placement-hint[data-placement-state="aim"]{background:#000;color:#fff;border:2px solid #0ff}.theme-contrast .gw-placement-hint .gw-placement-aim,[data-stem-theme="contrast"] .gw-placement-hint .gw-placement-aim{background:#000;color:#0f0;border:2px solid #0f0}.theme-contrast .gw-placement-shortcut kbd,[data-stem-theme="contrast"] .gw-placement-shortcut kbd{background:#000;color:#fff;border-color:#fff}';
const styleStart = source.indexOf('      ".gw-placement-hint .gw-placement-aim{');
assert(styleStart > 0);
const styleEnd = source.indexOf('\n', styleStart);
source = source.slice(0, styleEnd) + '\n      ' + JSON.stringify(css) + ',' + source.slice(styleEnd);
new Function(source);
const data = Buffer.from(raw.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source);
const fd = fs.openSync(file, 'r+');
try { fs.writeSync(fd, data); fs.ftruncateSync(fd, data.length); } finally { fs.closeSync(fd); }
console.log('Applied direct sandbox arrival, contextual toolbar, and calmer placement guidance.');
