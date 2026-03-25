"""Phase 1: Advanced Logic & Computation Engine — Surgical insertion script"""
import re

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. ADD NEW BLOCK TYPE DEFINITIONS (after ifelse line ~106)
# ═══════════════════════════════════════════
new_blocks = """\
            { type: 'while', label: '🔁 While', param: 'condition', defaultVal: 'x < 450', unit: null, color: '#7c3aed' },
            { type: 'function', label: '📋 Define Function', param: 'funcName', defaultVal: 'myShape', unit: null, color: '#0891b2' },
            { type: 'callFunction', label: '📞 Call Function', param: 'funcName', defaultVal: 'myShape', unit: null, color: '#06b6d4' },
            { type: 'random', label: '🎲 Random Value', param: 'varName', defaultVal: 'r', unit: null, color: '#ea580c' },
            { type: 'stamp', label: '🖨️ Stamp', param: null, defaultVal: null, unit: null, color: '#be185d' },
            { type: 'arc', label: '🌈 Draw Arc', param: 'arcAngle', defaultVal: 180, unit: '°', color: '#4f46e5' },
            { type: 'playNote', label: '🎵 Play Note', param: 'frequency', defaultVal: 440, unit: 'Hz', color: '#d97706' }"""

# Insert after the ifelse block type definition
src = src.replace(
    "{ type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' }\n          ];",
    "{ type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' },\n" + new_blocks + "\n          ];"
)

# ═══════════════════════════════════════════
# 2. ADD NEW CHALLENGES (11-15, after challenge 10)
# ═══════════════════════════════════════════
new_challenges = """\
            { id: 'nested_loops', title: '11. Nested Loops', desc: 'Draw a 3×3 grid of squares using nested Repeat blocks.', concept: 'Nested Iteration', hint: 'Use Repeat 3× with: draw a square (Repeat 4×), pen up, move, pen down. Then go to next row.', check: function (lines) { return lines.length >= 36; } },
            { id: 'random_walk', title: '12. Random Walk', desc: 'Use a Random block to create a colorful random walk with 15+ segments.', concept: 'Randomness', hint: 'Set a random variable, then use it as the turn angle. Repeat many times!', check: function (lines) { var colors = {}; lines.forEach(function(l) { colors[l.color] = true; }); return lines.length >= 15; } },
            { id: 'func_factory', title: '13. Function Factory', desc: 'Define a function called "myShape" and call it at least 3 times.', concept: 'Abstraction', hint: 'Create a Define Function block with shape-drawing inside, then use Call Function 3 times with pen-up moves between.', check: function (lines, blks) { var calls = blks.filter(function(b) { return b.type === 'callFunction'; }); return calls.length >= 3 && lines.length >= 9; } },
            { id: 'spiral_galaxy', title: '14. Spiral Galaxy', desc: 'Use Variables to draw an expanding spiral with 30+ segments.', concept: 'Variables + Math', hint: 'Set size=10, then Repeat 30×: forward($size), right(25), changeVar size +3.', check: function (lines) { if (lines.length < 30) return false; var d1 = Math.sqrt(Math.pow(lines[0].x2-lines[0].x1,2)+Math.pow(lines[0].y2-lines[0].y1,2)); var dN = Math.sqrt(Math.pow(lines[lines.length-1].x2-lines[lines.length-1].x1,2)+Math.pow(lines[lines.length-1].y2-lines[lines.length-1].y1,2)); return dN > d1 * 1.5; } },
            { id: 'music_art', title: '15. Musical Drawing', desc: 'Create a drawing that plays at least 4 different notes using Play Note blocks.', concept: 'Multimedia', hint: 'Combine Move Forward with Play Note blocks at different frequencies. Try 262 (C), 330 (E), 392 (G), 523 (C5)!', check: function (lines, blks) { var notes = blks.filter(function(b) { return b.type === 'playNote'; }); var freqs = {}; notes.forEach(function(n) { freqs[n.frequency || 440] = true; }); return Object.keys(freqs).length >= 4 && lines.length >= 4; } }"""

src = src.replace(
    "{ id: 'house', title: '10. Build a House',",
    "{ id: 'house', title: '10. Build a House',"
)
# Find "house" challenge closing and insert after
house_end = "check: function (lines) { return lines.length >= 7 && getEndpoints(lines.slice(0, 4)).segments >= 4; } }\n          ];"
src = src.replace(house_end, house_end.replace("] }", "] },\n" + new_challenges + "\n          ]").replace("];", ""))

# Wait — that's fragile. Let me do it more precisely.
# Revert and try again
with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ─── Step 1: Block types ───
old_block_end = "{ type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' }\r\n          ];"
new_block_end = """{ type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' },\r
""" + new_blocks + "\r\n          ];"
src = src.replace(old_block_end, new_block_end)

# ─── Step 2: Challenges (insert before the ];) ───
old_chall_end = """{ id: 'house', title: '10. Build a House', desc: 'Draw a house: a square base with a triangle roof on top.', concept: 'Decomposition', hint: 'Draw a square, then use Pen Up to move, then draw a triangle for the roof. Think about angles: square = 90°, triangle = 120°.', check: function (lines) { return lines.length >= 7 && getEndpoints(lines.slice(0, 4)).segments >= 4; } }\r\n          ];"""
new_chall_end = """{ id: 'house', title: '10. Build a House', desc: 'Draw a house: a square base with a triangle roof on top.', concept: 'Decomposition', hint: 'Draw a square, then use Pen Up to move, then draw a triangle for the roof. Think about angles: square = 90°, triangle = 120°.', check: function (lines) { return lines.length >= 7 && getEndpoints(lines.slice(0, 4)).segments >= 4; } },\r
""" + new_challenges + "\r\n          ];"
src = src.replace(old_chall_end, new_chall_end)

# ─── Step 3: New templates ───
new_templates = """\
            { name: 'Fractal Burst', icon: '🌿', desc: 'A recursive branching pattern', blocks: [{ type: 'function', funcName: 'branch', children: [{ type: 'forward', distance: 40 }, { type: 'left', degrees: 30 }, { type: 'forward', distance: 25 }, { type: 'backward', distance: 25 }, { type: 'right', degrees: 60 }, { type: 'forward', distance: 25 }, { type: 'backward', distance: 25 }, { type: 'left', degrees: 30 }, { type: 'backward', distance: 40 }] }, { type: 'color', color: '#22c55e' }, { type: 'repeat', times: 8, children: [{ type: 'callFunction', funcName: 'branch' }, { type: 'right', degrees: 45 }] }] },
            { name: 'Musical Scale', icon: '🎵', desc: 'Draw a staircase that plays notes', blocks: [{ type: 'color', color: '#f59e0b' }, { type: 'width', width: 3 }, { type: 'playNote', frequency: 262 }, { type: 'forward', distance: 30 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 20 }, { type: 'left', degrees: 90 }, { type: 'playNote', frequency: 294 }, { type: 'forward', distance: 30 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 20 }, { type: 'left', degrees: 90 }, { type: 'playNote', frequency: 330 }, { type: 'forward', distance: 30 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 20 }, { type: 'left', degrees: 90 }, { type: 'playNote', frequency: 392 }, { type: 'forward', distance: 30 }, { type: 'playNote', frequency: 523 }] },
            { name: 'Random Art', icon: '🎲', desc: 'Generative random artwork', blocks: [{ type: 'repeat', times: 20, children: [{ type: 'random', varName: 'angle', randomMin: 10, randomMax: 170 }, { type: 'random', varName: 'dist', randomMin: 20, randomMax: 80 }, { type: 'forward', distance: '$dist' }, { type: 'right', degrees: '$angle' }] }] },
            { name: 'Koch Snowflake', icon: '❄️', desc: 'A fractal snowflake side', blocks: [{ type: 'color', color: '#06b6d4' }, { type: 'width', width: 2 }, { type: 'repeat', times: 3, children: [{ type: 'forward', distance: 30 }, { type: 'left', degrees: 60 }, { type: 'forward', distance: 30 }, { type: 'right', degrees: 120 }, { type: 'forward', distance: 30 }, { type: 'left', degrees: 60 }, { type: 'forward', distance: 30 }, { type: 'right', degrees: 120 }] }] }"""

old_tmpl_end = """{ name: 'Windmill', icon: '🎡', desc: 'A spinning windmill', blocks: [{ type: 'color', color: '#7c3aed' }, { type: 'repeat', times: 12, children: [{ type: 'forward', distance: 80 }, { type: 'backward', distance: 80 }, { type: 'right', degrees: 30 }] }] }\r\n          ];"""
new_tmpl_end = """{ name: 'Windmill', icon: '🎡', desc: 'A spinning windmill', blocks: [{ type: 'color', color: '#7c3aed' }, { type: 'repeat', times: 12, children: [{ type: 'forward', distance: 80 }, { type: 'backward', distance: 80 }, { type: 'right', degrees: 30 }] }] },\r
""" + new_templates + "\r\n          ];"
src = src.replace(old_tmpl_end, new_tmpl_end)

# ─── Step 4: blocksToText — add new block type serializers ───
old_ifelse_text = """} else if (b.type === 'ifelse') {
                lines.push(indent + 'if (' + (b.condition || 'x > 250') + ') {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '} else {');
                if (b.elseChildren && b.elseChildren.length > 0) {
                  lines.push(blocksToText(b.elseChildren, indent + '  '));
                }
                lines.push(indent + '}');
              }"""
new_ifelse_text = """} else if (b.type === 'ifelse') {
                lines.push(indent + 'if (' + (b.condition || 'x > 250') + ') {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '} else {');
                if (b.elseChildren && b.elseChildren.length > 0) {
                  lines.push(blocksToText(b.elseChildren, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'while') {
                lines.push(indent + 'while (' + (b.condition || 'x < 450') + ') {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'function') {
                lines.push(indent + 'function ' + (b.funcName || 'myShape') + '() {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'callFunction') {
                lines.push(indent + (b.funcName || 'myShape') + '()');
              } else if (b.type === 'random') {
                lines.push(indent + 'random("' + (b.varName || 'r') + '", ' + (b.randomMin || 0) + ', ' + (b.randomMax || 100) + ')');
              } else if (b.type === 'stamp') {
                lines.push(indent + 'stamp()');
              } else if (b.type === 'arc') {
                lines.push(indent + 'arc(' + (b.arcAngle || 180) + ', ' + (b.arcRadius || 30) + ')');
              } else if (b.type === 'playNote') {
                lines.push(indent + 'playNote(' + (b.frequency || 440) + ', ' + (b.duration || 200) + ')');
              }"""
src = src.replace(old_ifelse_text, new_ifelse_text)

# ─── Step 5: textToBlocks — add new block type parsers ───
old_repeat_parse = """else if ((m = line.match(/^repeat\\((\\d+)/))) {
                  i++;
                  var children = parse();
                  blks.push({ type: 'repeat', times: parseInt(m[1]), children: children });
                  continue;
                }"""
new_repeat_parse = """else if ((m = line.match(/^repeat\\((\\d+)/))) {
                  i++;
                  var children = parse();
                  blks.push({ type: 'repeat', times: parseInt(m[1]), children: children });
                  continue;
                }
                else if ((m = line.match(/^while\\s*\\((.+)\\)\\s*\\{/))) {
                  i++;
                  var whileChildren = parse();
                  blks.push({ type: 'while', condition: m[1].trim(), children: whileChildren });
                  continue;
                }
                else if ((m = line.match(/^function\\s+(\\w+)\\(\\)\\s*\\{/))) {
                  i++;
                  var funcBody = parse();
                  blks.push({ type: 'function', funcName: m[1], children: funcBody });
                  continue;
                }
                else if ((m = line.match(/^(\\w+)\\(\\)$/))) { blks.push({ type: 'callFunction', funcName: m[1] }); }
                else if ((m = line.match(/^random\\("([^"]+)",\\s*(-?[\\d.]+),\\s*(-?[\\d.]+)\\)/))) { blks.push({ type: 'random', varName: m[1], randomMin: parseFloat(m[2]), randomMax: parseFloat(m[3]) }); }
                else if (line.match(/^stamp\\(\\)/)) { blks.push({ type: 'stamp' }); }
                else if ((m = line.match(/^arc\\(([\\d.]+),\\s*([\\d.]+)\\)/))) { blks.push({ type: 'arc', arcAngle: parseFloat(m[1]), arcRadius: parseFloat(m[2]) }); }
                else if ((m = line.match(/^playNote\\(([\\d.]+)(?:,\\s*([\\d.]+))?\\)/))) { blks.push({ type: 'playNote', frequency: parseFloat(m[1]), duration: m[2] ? parseFloat(m[2]) : 200 }); }"""
src = src.replace(old_repeat_parse, new_repeat_parse)

# ─── Step 6: Execution engine — add new block handlers ───
old_home_exec = """} else if (b.type === 'home') {
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: 250, y2: 250, color: t.color, width: t.width });
                }
                t.x = 250; t.y = 250; t.angle = -90;
              }
              updMulti({ turtle: Object.assign({}, t), lines: allLines.slice(), stepIdx: idx, running: true });"""

new_home_exec = """} else if (b.type === 'home') {
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: 250, y2: 250, color: t.color, width: t.width });
                }
                t.x = 250; t.y = 250; t.angle = -90;
              } else if (b.type === 'while') {
                // While loop: evaluate condition and insert children + self if true (with safety cap)
                if (!b._iterCount) b._iterCount = 0;
                if (b._iterCount < 1000 && evalCondition(b.condition || 'x < 450', t, vars)) {
                  b._iterCount++;
                  var whileBody = flattenBlocks(b.children || []);
                  var whileMarker = Object.assign({}, b); // re-evaluate on next pass
                  var beforeW = flat.slice(0, idx + 1);
                  var afterW = flat.slice(idx + 1);
                  flat = beforeW.concat(whileBody).concat([whileMarker]).concat(afterW);
                } else {
                  b._iterCount = 0; // reset for next run
                }
              } else if (b.type === 'function') {
                // Function definition — store in registry, don't execute
                vars['__func_' + (b.funcName || 'myShape')] = b.children || [];
              } else if (b.type === 'callFunction') {
                // Call function — insert its body into execution stream
                var funcBody = vars['__func_' + (b.funcName || 'myShape')];
                if (funcBody && funcBody.length > 0) {
                  var callBody = flattenBlocks(JSON.parse(JSON.stringify(funcBody)));
                  var beforeC = flat.slice(0, idx + 1);
                  var afterC = flat.slice(idx + 1);
                  flat = beforeC.concat(callBody).concat(afterC);
                }
              } else if (b.type === 'random') {
                // Random — set variable to random value in [min, max]
                var rMin = b.randomMin != null ? b.randomMin : 0;
                var rMax = b.randomMax != null ? b.randomMax : 100;
                vars[b.varName || 'r'] = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
              } else if (b.type === 'stamp') {
                // Stamp — duplicate all current lines at current position (creates a "stamp")
                if (allLines.length > 0) {
                  var stampLines = allLines.slice();
                  var ox = stampLines[0].x1, oy = stampLines[0].y1;
                  var dx = t.x - ox, dy = t.y - oy;
                  for (var si = 0; si < stampLines.length; si++) {
                    allLines.push({ x1: stampLines[si].x1 + dx, y1: stampLines[si].y1 + dy, x2: stampLines[si].x2 + dx, y2: stampLines[si].y2 + dy, color: stampLines[si].color, width: stampLines[si].width });
                  }
                }
              } else if (b.type === 'arc') {
                // Arc — draw a portion of a circle (arcAngle degrees, arcRadius pixels)
                var arcAngle = resolveVal(b.arcAngle != null ? b.arcAngle : 180, vars);
                var arcRadius = resolveVal(b.arcRadius != null ? b.arcRadius : 30, vars);
                if (t.penDown) {
                  var arcSegs = Math.max(8, Math.ceil(Math.abs(arcAngle) / 10));
                  var arcStep = arcAngle / arcSegs;
                  var prevX = t.x, prevY = t.y;
                  for (var ai = 1; ai <= arcSegs; ai++) {
                    var curAngle = t.angle + arcStep * ai;
                    var curRad = curAngle * Math.PI / 180;
                    var stepDist = (2 * arcRadius * Math.sin(Math.abs(arcStep) * Math.PI / 360));
                    var ax = prevX + Math.cos((t.angle + arcStep * (ai - 0.5)) * Math.PI / 180) * stepDist;
                    var ay = prevY + Math.sin((t.angle + arcStep * (ai - 0.5)) * Math.PI / 180) * stepDist;
                    allLines.push({ x1: prevX, y1: prevY, x2: ax, y2: ay, color: t.color, width: t.width });
                    prevX = ax; prevY = ay;
                  }
                  t.x = prevX; t.y = prevY;
                }
                t.angle = (t.angle + arcAngle) % 360;
              } else if (b.type === 'playNote') {
                // Play Note — use Web Audio API for sound
                try {
                  var audioCtx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                  var osc = audioCtx.createOscillator();
                  var gain = audioCtx.createGain();
                  osc.type = 'sine';
                  osc.frequency.value = resolveVal(b.frequency != null ? b.frequency : 440, vars);
                  gain.gain.value = 0.15;
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  var noteDur = (b.duration || 200) / 1000;
                  osc.start();
                  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteDur);
                  osc.stop(audioCtx.currentTime + noteDur + 0.05);
                } catch(e) { /* Audio not available */ }
              }
              updMulti({ turtle: Object.assign({}, t), lines: allLines.slice(), stepIdx: idx, running: true });"""
src = src.replace(old_home_exec, new_home_exec)

# ─── Step 7: addBlock — handle new container types ───
old_add_block = """if (type === 'repeat') newBlock.children = [];
                if (type === 'ifelse') { newBlock.children = []; newBlock.elseChildren = []; newBlock.condition = 'x > 250'; }
                if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
                if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }"""
new_add_block = """if (type === 'repeat') newBlock.children = [];
                if (type === 'ifelse') { newBlock.children = []; newBlock.elseChildren = []; newBlock.condition = 'x > 250'; }
                if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
                if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }
                if (type === 'while') { newBlock.children = []; newBlock.condition = 'x < 450'; }
                if (type === 'function') { newBlock.children = []; newBlock.funcName = 'myShape'; }
                if (type === 'callFunction') { newBlock.funcName = 'myShape'; }
                if (type === 'random') { newBlock.varName = 'r'; newBlock.randomMin = 0; newBlock.randomMax = 100; }
                if (type === 'arc') { newBlock.arcAngle = 180; newBlock.arcRadius = 30; }
                if (type === 'playNote') { newBlock.frequency = 440; newBlock.duration = 200; }"""
src = src.replace(old_add_block, new_add_block)

# ─── Step 8: addChildBlock — also handle new container types ───
old_add_child = """if (type === 'repeat') newBlock.children = [];
                if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
                if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }
                var updated = blocks.map(function (b, i) {
                  if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse')) {"""
new_add_child = """if (type === 'repeat') newBlock.children = [];
                if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
                if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }
                if (type === 'while') { newBlock.children = []; newBlock.condition = 'x < 450'; }
                if (type === 'function') { newBlock.children = []; newBlock.funcName = 'myShape'; }
                if (type === 'callFunction') { newBlock.funcName = 'myShape'; }
                if (type === 'random') { newBlock.varName = 'r'; newBlock.randomMin = 0; newBlock.randomMax = 100; }
                if (type === 'arc') { newBlock.arcAngle = 180; newBlock.arcRadius = 30; }
                if (type === 'playNote') { newBlock.frequency = 440; newBlock.duration = 200; }
                var updated = blocks.map(function (b, i) {
                  if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse' || b.type === 'while' || b.type === 'function')) {"""
src = src.replace(old_add_child, new_add_child)

# ─── Step 9: Container detection in removeChildBlock ───
old_remove_child = """if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse')) {
                var nb = Object.assign({}, b);
                if (isElse && b.type === 'ifelse') {"""
new_remove_child = """if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse' || b.type === 'while' || b.type === 'function')) {
                var nb = Object.assign({}, b);
                if (isElse && b.type === 'ifelse') {"""
src = src.replace(old_remove_child, new_remove_child)

# ─── Step 10: flattenBlocks — handle while and function ───
old_flatten = """if (blk.type === 'repeat') {
                  var times = blk.times || 4;
                  for (var r = 0; r < times; r++) {
                    flat = flat.concat(flattenBlocks(blk.children || []));
                  }
                } else if (blk.type === 'ifelse') {
                  // defer evaluation — push a marker
                  flat.push(blk);"""
new_flatten = """if (blk.type === 'repeat') {
                  var times = blk.times || 4;
                  for (var r = 0; r < times; r++) {
                    flat = flat.concat(flattenBlocks(blk.children || []));
                  }
                } else if (blk.type === 'while') {
                  // While — push as marker for deferred evaluation in step()
                  flat.push(blk);
                } else if (blk.type === 'function') {
                  // Function definition — push as marker to register in step()
                  flat.push(blk);
                } else if (blk.type === 'ifelse') {
                  // defer evaluation — push a marker
                  flat.push(blk);"""
src = src.replace(old_flatten, new_flatten)

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Phase 1 insertions complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
