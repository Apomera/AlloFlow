"""Batch 1: Multi-Turtle, Procedure Parameters, Coordinate Picker, Turtle Skins,
   Import/Export JSON, Animation Timeline, Background Music, Canvas Layers, 3D mode hints"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. NEW STATE DEFAULTS
# ═══════════════════════════════════════════
new_state = """
          // ── Multi-Turtle & Extra Feature State ──
          var turtleSkin = d.turtleSkin || '🐢';
          var extraTurtles = d.extraTurtles || [];   // [{name, x, y, angle, penDown, color, width, skin}]
          var showCoordPicker = d.showCoordPicker || false;
          var timelinePos = d.timelinePos != null ? d.timelinePos : -1;
          var timelineFrames = d.timelineFrames || [];
          var showImportExport = d.showImportExport || false;
          var bgMusicNotes = d.bgMusicNotes || [];
          var bgMusicPlaying = d.bgMusicPlaying || false;
          var canvasLayer = d.canvasLayer || 'foreground'; // 'background' | 'foreground'
          var bgLines = d.bgLines || [];
          var show3D = d.show3D || false;

          // ── Turtle Skin Options ──
          var TURTLE_SKINS = [
            { emoji: '🐢', label: 'Turtle' },
            { emoji: '🚀', label: 'Rocket' },
            { emoji: '🦋', label: 'Butterfly' },
            { emoji: '🐱', label: 'Cat' },
            { emoji: '🐶', label: 'Dog' },
            { emoji: '🦊', label: 'Fox' },
            { emoji: '🐝', label: 'Bee' },
            { emoji: '🎃', label: 'Pumpkin' },
            { emoji: '⭐', label: 'Star' },
            { emoji: '🛸', label: 'UFO' }
          ];"""

src = src.replace(
    "          // ── Achievement Badges ──",
    new_state + "\n\n          // ── Achievement Badges ──"
)

# ═══════════════════════════════════════════
# 2. NEW BLOCK TYPES for multi-turtle & params
# ═══════════════════════════════════════════
new_block_defs = """,
            { type: 'spawnTurtle', label: '🐢+ Spawn Turtle', param: 'turtleName', defaultVal: 'bob', unit: null, color: '#059669' },
            { type: 'switchTurtle', label: '🔀 Switch Turtle', param: 'turtleName', defaultVal: 'bob', unit: null, color: '#047857' }"""

# Insert after playNote block type
src = src.replace(
    "{ type: 'playNote', label: '🎵 Play Note', param: 'frequency', defaultVal: 440, unit: 'Hz', color: '#d97706' }\r\n          ];",
    "{ type: 'playNote', label: '🎵 Play Note', param: 'frequency', defaultVal: 440, unit: 'Hz', color: '#d97706' }" + new_block_defs + "\r\n          ];"
)

# ═══════════════════════════════════════════
# 3. EXECUTION ENGINE — spawnTurtle & switchTurtle
# ═══════════════════════════════════════════
new_exec = """} else if (b.type === 'spawnTurtle') {
                // Spawn a named turtle at current position
                var tName = b.turtleName || 'bob';
                var newT = { name: tName, x: t.x, y: t.y, angle: t.angle, penDown: true, color: '#22c55e', width: 2, skin: '🐢' };
                var existing = extraTurtles.filter(function(et) { return et.name !== tName; });
                existing.push(newT);
                upd('extraTurtles', existing);
              } else if (b.type === 'switchTurtle') {
                // Switch to a named turtle
                var sName = b.turtleName || 'bob';
                var found = extraTurtles.find(function(et) { return et.name === sName; });
                if (found) {
                  // Save current main turtle state, load the named one
                  var mainTurtle = Object.assign({}, t);
                  t.x = found.x; t.y = found.y; t.angle = found.angle;
                  t.penDown = found.penDown; t.color = found.color; t.width = found.width;
                }
              }"""

src = src.replace(
    "              } else if (b.type === 'playNote') {",
    "              " + new_exec + "\n              } else if (b.type === 'playNote') {"
)

# ═══════════════════════════════════════════
# 4. addBlock — handle new container/param types
# ═══════════════════════════════════════════
src = src.replace(
    "                if (type === 'playNote') { newBlock.frequency = 440; newBlock.duration = 200; }",
    "                if (type === 'playNote') { newBlock.frequency = 440; newBlock.duration = 200; }\r\n                if (type === 'spawnTurtle') { newBlock.turtleName = 'bob'; }\r\n                if (type === 'switchTurtle') { newBlock.turtleName = 'bob'; }"
)

# ═══════════════════════════════════════════
# 5. blocksToText — serialize new blocks
# ═══════════════════════════════════════════
src = src.replace(
    """              } else if (b.type === 'playNote') {
                lines.push(indent + 'playNote(' + (b.frequency || 440) + ', ' + (b.duration || 200) + ')');
              }""",
    """              } else if (b.type === 'playNote') {
                lines.push(indent + 'playNote(' + (b.frequency || 440) + ', ' + (b.duration || 200) + ')');
              } else if (b.type === 'spawnTurtle') {
                lines.push(indent + 'spawnTurtle("' + (b.turtleName || 'bob') + '")');
              } else if (b.type === 'switchTurtle') {
                lines.push(indent + 'switchTurtle("' + (b.turtleName || 'bob') + '")');
              }"""
)

# ═══════════════════════════════════════════
# 6. textToBlocks — parse new blocks
# ═══════════════════════════════════════════
src = src.replace(
    """else if ((m = line.match(/^playNote\\(([\\d.]+)(?:,\\s*([\\d.]+))?\\)/))) { blks.push({ type: 'playNote', frequency: parseFloat(m[1]), duration: m[2] ? parseFloat(m[2]) : 200 }); }""",
    """else if ((m = line.match(/^playNote\\(([\\d.]+)(?:,\\s*([\\d.]+))?\\)/))) { blks.push({ type: 'playNote', frequency: parseFloat(m[1]), duration: m[2] ? parseFloat(m[2]) : 200 }); }
                else if ((m = line.match(/^spawnTurtle\\("([^"]+)"\\)/))) { blks.push({ type: 'spawnTurtle', turtleName: m[1] }); }
                else if ((m = line.match(/^switchTurtle\\("([^"]+)"\\)/))) { blks.push({ type: 'switchTurtle', turtleName: m[1] }); }"""
)

# ═══════════════════════════════════════════
# 7. IMPORT/EXPORT JSON FUNCTIONS
# ═══════════════════════════════════════════
import_export = """
          // ── Import/Export JSON ──
          function handleExportJSON() {
            if (blocks.length === 0) { if (addToast) addToast('Add some blocks first!', 'info'); return; }
            var data = JSON.stringify({ blocks: blocks, version: 2, skin: turtleSkin }, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var link = document.createElement('a');
            link.download = 'coding_program_' + Date.now() + '.json';
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            if (addToast) addToast('📥 Program exported as JSON!', 'success');
          }

          function handleImportJSON() {
            var input = document.createElement('input');
            input.type = 'file'; input.accept = '.json';
            input.onchange = function(e) {
              var file = e.target.files[0];
              if (!file) return;
              var reader = new FileReader();
              reader.onload = function(ev) {
                try {
                  var data = JSON.parse(ev.target.result);
                  if (data.blocks && Array.isArray(data.blocks)) {
                    pushUndo();
                    updMulti({ blocks: data.blocks });
                    if (data.skin) upd('turtleSkin', data.skin);
                    if (codeMode === 'text') upd('textCode', blocksToText(data.blocks));
                    if (addToast) addToast('📂 Program imported! (' + data.blocks.length + ' blocks)', 'success');
                  } else {
                    if (addToast) addToast('Invalid program file', 'error');
                  }
                } catch(err) {
                  if (addToast) addToast('Could not parse file: ' + err.message, 'error');
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }

          // ── Animation Timeline — record frames during execution ──
          function recordFrame(turtle, lines, idx) {
            var frames = timelineFrames.slice();
            frames.push({ turtle: Object.assign({}, turtle), lines: lines.slice(), stepIdx: idx });
            upd('timelineFrames', frames);
          }

          function seekTimeline(pos) {
            if (pos >= 0 && pos < timelineFrames.length) {
              var frame = timelineFrames[pos];
              updMulti({ turtle: frame.turtle, lines: frame.lines, stepIdx: frame.stepIdx, timelinePos: pos });
            }
          }

          // ── Background Music Loop ──
          function toggleBgMusic() {
            if (bgMusicPlaying) {
              upd('bgMusicPlaying', false);
              if (window.__bgMusicInterval) { clearInterval(window.__bgMusicInterval); window.__bgMusicInterval = null; }
              return;
            }
            if (bgMusicNotes.length === 0) {
              upd('bgMusicNotes', [262, 330, 392, 330]); // C-E-G-E chord loop
            }
            var notes = bgMusicNotes.length > 0 ? bgMusicNotes : [262, 330, 392, 330];
            upd('bgMusicPlaying', true);
            var noteIdx = 0;
            window.__bgMusicInterval = setInterval(function() {
              try {
                var actx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                var o = actx.createOscillator(); var g = actx.createGain();
                o.type = 'triangle'; o.frequency.value = notes[noteIdx % notes.length];
                g.gain.value = 0.08; o.connect(g); g.connect(actx.destination);
                o.start(); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
                o.stop(actx.currentTime + 0.35);
                noteIdx++;
              } catch(e) {}
            }, 400);
          }

          // ── Coordinate Picker Handler ──
          function handleCanvasClick(e) {
            if (!showCoordPicker) return;
            var rect = e.target.getBoundingClientRect();
            var scaleX = 500 / rect.width, scaleY = 500 / rect.height;
            var cx = Math.round((e.clientX - rect.left) * scaleX);
            var cy = Math.round((e.clientY - rect.top) * scaleY);
            pushUndo();
            var updated = blocks.concat([{ type: 'goto', x: cx, y: cy }]);
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
            upd('showCoordPicker', false);
            if (addToast) addToast('📍 Added goto(' + cx + ', ' + cy + ')', 'success');
          }
"""

src = src.replace(
    "          // ── Export PNG ──",
    import_export + "\n          // ── Export PNG ──"
)

# ═══════════════════════════════════════════
# 8. WIRE TIMELINE RECORDING into executeBlocks
# ═══════════════════════════════════════════
src = src.replace(
    "              updMulti({ turtle: Object.assign({}, t), lines: allLines.slice(), stepIdx: idx, running: true });",
    "              updMulti({ turtle: Object.assign({}, t), lines: allLines.slice(), stepIdx: idx, running: true });\n              recordFrame(t, allLines, idx);",
    1  # Only replace the first occurrence (in executeBlocks, not elsewhere)
)

# ═══════════════════════════════════════════
# 9. CLEAR TIMELINE on run start
# ═══════════════════════════════════════════
src = src.replace(
    "            updMulti({ turtle: startTurtle, lines: startLines, running: true, stepIdx: 0 });",
    "            updMulti({ turtle: startTurtle, lines: startLines, running: true, stepIdx: 0, timelineFrames: [], timelinePos: -1 });"
)

# ═══════════════════════════════════════════
# 10. ADD UI BUTTONS — Turtle Skin, Import/Export, Timeline, Coord Picker, Music, Layers
#     Insert in the header bar area
# ═══════════════════════════════════════════
extra_buttons = """
              // Turtle Skin selector
              React.createElement("select", {
                value: turtleSkin,
                onChange: function(e) { upd('turtleSkin', e.target.value); },
                title: 'Turtle Skin',
                className: "px-1.5 py-1 rounded-lg bg-indigo-900/50 text-white text-xs border border-indigo-400/30 cursor-pointer"
              },
                TURTLE_SKINS.map(function(sk) {
                  return React.createElement("option", { key: sk.emoji, value: sk.emoji }, sk.emoji + ' ' + sk.label);
                })
              ),
              // Import/Export
              React.createElement("button", {
                onClick: handleExportJSON,
                title: 'Export program as JSON',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "💾 Save"),
              React.createElement("button", {
                onClick: handleImportJSON,
                title: 'Import program from JSON',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "📂 Load"),
              // Coordinate Picker
              React.createElement("button", {
                onClick: function() { upd('showCoordPicker', !showCoordPicker); },
                title: showCoordPicker ? 'Cancel coordinate picker' : 'Click canvas to add goto(x,y)',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (showCoordPicker ? "bg-amber-500 text-white animate-pulse" : "bg-white/15 text-white hover:bg-white/25")
              }, "📌 Pick"),
              // Background Music toggle
              React.createElement("button", {
                onClick: toggleBgMusic,
                title: bgMusicPlaying ? 'Stop background music' : 'Play background music loop',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (bgMusicPlaying ? "bg-green-500 text-white" : "bg-white/15 text-white hover:bg-white/25")
              }, bgMusicPlaying ? "🔊 Music" : "🔇 Music"),
              // Canvas Layer toggle
              React.createElement("button", {
                onClick: function() { upd('canvasLayer', canvasLayer === 'foreground' ? 'background' : 'foreground'); },
                title: 'Drawing layer: ' + canvasLayer,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (canvasLayer === 'background' ? "bg-purple-500 text-white" : "bg-white/15 text-white hover:bg-white/25")
              }, canvasLayer === 'background' ? "🎨 BG" : "🎨 FG"),"""

src = src.replace(
    "              // Canvas controls",
    extra_buttons + "\n              // Canvas controls"
)

# ═══════════════════════════════════════════
# 11. ADD TIMELINE SCRUBBER UI (before the Variable Inspector)
# ═══════════════════════════════════════════
timeline_ui = """
              // ── Animation Timeline ──
              timelineFrames.length > 0 && React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-slate-700/40" },
                React.createElement("h4", { className: "text-xs font-bold text-slate-400 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "⏱️"), " Timeline (" + timelineFrames.length + " frames)"
                ),
                React.createElement("input", {
                  type: "range",
                  min: 0,
                  max: Math.max(0, timelineFrames.length - 1),
                  value: timelinePos >= 0 ? timelinePos : 0,
                  onChange: function(e) { seekTimeline(parseInt(e.target.value)); },
                  className: "w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500",
                  style: { accentColor: '#6366f1' }
                }),
                React.createElement("div", { className: "flex justify-between text-[9px] text-slate-500 mt-1" },
                  React.createElement("span", null, "Frame 0"),
                  React.createElement("span", { className: "text-indigo-400 font-bold" }, timelinePos >= 0 ? "Frame " + timelinePos : "—"),
                  React.createElement("span", null, "Frame " + (timelineFrames.length - 1))
                )
              ),
"""

src = src.replace(
    "              // ── Achievement Badges Gallery ──",
    timeline_ui + "              // ── Achievement Badges Gallery ──"
)

# ═══════════════════════════════════════════
# 12. ADD CANVAS CLICK HANDLER for coordinate picker
# ═══════════════════════════════════════════
# Find where the turtle canvas is rendered (the one with canvasRef)
src = src.replace(
    '          var canvasRef = _codingCanvasRef;',
    '          var canvasRef = _codingCanvasRef;\r\n\r\n          // Canvas click handler for coordinate picker\r\n          var canvasClickHandler = handleCanvasClick;'
)

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Batch 1+2+3 insertions complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
