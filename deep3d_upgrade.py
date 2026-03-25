"""Deep 3D Mode: Full perspective engine, camera orbit, depth sorting, rich templates"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. EXPAND 3D STATE — z-coordinate, roll, camera, depth lines
# ═══════════════════════════════════════════
old_3d_state = """          // ── 3D Isometric Mode ──
          var pitchAngle = d.pitchAngle || 0;
          var yawAngle = d.yawAngle || 0;"""

new_3d_state = """          // ── 3D Perspective Engine ──
          var pitchAngle = d.pitchAngle || 0;
          var yawAngle = d.yawAngle || 0;
          var rollAngle = d.rollAngle || 0;
          var turtleZ = d.turtleZ || 0;           // Z coordinate in 3D space
          var cameraRotX = d.cameraRotX || 30;     // Camera orbit X (elevation)
          var cameraRotZ = d.cameraRotZ || 45;     // Camera orbit Z (azimuth)
          var cameraZoom = d.cameraZoom || 1.0;    // Camera zoom level
          var show3DAxes = d.show3DAxes !== false;  // Show XYZ axis indicator
          var show3DGrid = d.show3DGrid !== false;  // Show ground plane grid
          var lines3D = d.lines3D || [];            // [{x1,y1,z1,x2,y2,z2,color,width}]

          // ── 3D Projection Engine ──
          function project3D(x3, y3, z3) {
            // Perspective projection with camera orbit
            var cx = cameraRotX * Math.PI / 180;
            var cz = cameraRotZ * Math.PI / 180;
            // Rotate around Z axis (azimuth)
            var rx = x3 * Math.cos(cz) - y3 * Math.sin(cz);
            var ry = x3 * Math.sin(cz) + y3 * Math.cos(cz);
            var rz = z3;
            // Rotate around X axis (elevation)
            var ry2 = ry * Math.cos(cx) - rz * Math.sin(cx);
            var rz2 = ry * Math.sin(cx) + rz * Math.cos(cx);
            // Simple perspective division (camera at z=800)
            var perspective = 800 / (800 + ry2);
            var sx = 250 + rx * perspective * cameraZoom;
            var sy = 250 - rz2 * perspective * cameraZoom; // Y flipped for screen coords
            return { x: sx, y: sy, depth: ry2, scale: perspective };
          }

          // ── 3D Line Renderer with Depth Sorting ──
          function render3DLines(ctx3d, lines3dArr) {
            if (!ctx3d || lines3dArr.length === 0) return;
            // Sort by average depth (painter's algorithm — draw far lines first)
            var sorted = lines3dArr.slice().sort(function(a, b) {
              var da = (project3D(a.x1 - 250, a.y1 - 250, a.z1).depth + project3D(a.x2 - 250, a.y2 - 250, a.z2).depth) / 2;
              var db = (project3D(b.x1 - 250, b.y1 - 250, b.z1).depth + project3D(b.x2 - 250, b.y2 - 250, b.z2).depth) / 2;
              return db - da; // Far first
            });
            for (var i = 0; i < sorted.length; i++) {
              var l = sorted[i];
              var p1 = project3D(l.x1 - 250, l.y1 - 250, l.z1);
              var p2 = project3D(l.x2 - 250, l.y2 - 250, l.z2);
              var avgScale = (p1.scale + p2.scale) / 2;
              // Depth-based opacity and width
              var opacity = Math.max(0.2, Math.min(1.0, avgScale));
              var lineWidth = Math.max(0.5, (l.width || 2) * avgScale);
              ctx3d.beginPath();
              ctx3d.moveTo(p1.x, p1.y);
              ctx3d.lineTo(p2.x, p2.y);
              ctx3d.strokeStyle = l.color || '#6366f1';
              ctx3d.lineWidth = lineWidth;
              ctx3d.globalAlpha = opacity;
              ctx3d.lineCap = 'round';
              ctx3d.stroke();
            }
            ctx3d.globalAlpha = 1.0;
          }

          // ── 3D Grid Floor ──
          function render3DGrid(ctx3d) {
            var gridSize = 200;
            var step = 40;
            ctx3d.globalAlpha = 0.15;
            ctx3d.strokeStyle = '#64748b';
            ctx3d.lineWidth = 0.5;
            for (var gx = -gridSize; gx <= gridSize; gx += step) {
              var p1 = project3D(gx, -gridSize, 0);
              var p2 = project3D(gx, gridSize, 0);
              ctx3d.beginPath(); ctx3d.moveTo(p1.x, p1.y); ctx3d.lineTo(p2.x, p2.y); ctx3d.stroke();
            }
            for (var gy = -gridSize; gy <= gridSize; gy += step) {
              var p1 = project3D(-gridSize, gy, 0);
              var p2 = project3D(gridSize, gy, 0);
              ctx3d.beginPath(); ctx3d.moveTo(p1.x, p1.y); ctx3d.lineTo(p2.x, p2.y); ctx3d.stroke();
            }
            ctx3d.globalAlpha = 1.0;
          }

          // ── 3D Axes Indicator ──
          function render3DAxes(ctx3d) {
            var len = 60;
            var axes = [
              { dx: len, dy: 0, dz: 0, color: '#ef4444', label: 'X' },
              { dx: 0, dy: len, dz: 0, color: '#22c55e', label: 'Y' },
              { dx: 0, dy: 0, dz: len, color: '#3b82f6', label: 'Z' }
            ];
            var origin = project3D(0, 0, 0);
            for (var i = 0; i < axes.length; i++) {
              var a = axes[i];
              var end = project3D(a.dx, a.dy, a.dz);
              ctx3d.beginPath();
              ctx3d.moveTo(origin.x, origin.y);
              ctx3d.lineTo(end.x, end.y);
              ctx3d.strokeStyle = a.color;
              ctx3d.lineWidth = 2;
              ctx3d.globalAlpha = 0.7;
              ctx3d.stroke();
              // Label
              ctx3d.fillStyle = a.color;
              ctx3d.font = 'bold 10px monospace';
              ctx3d.globalAlpha = 0.9;
              ctx3d.fillText(a.label, end.x + 4, end.y - 4);
            }
            ctx3d.globalAlpha = 1.0;
          }"""

src = src.replace(old_3d_state, new_3d_state)

# ═══════════════════════════════════════════
# 2. ADD ROLL BLOCK TYPE
# ═══════════════════════════════════════════
# Find the forward3D block type and add roll after it
idx = src.find("'forward3D', param: 'distance'")
if idx > 0:
    end = src.find("},", idx) + 1
    # No — let me find the ];  after the forward3D entry
    bracket_end = src.find("];", idx)
    if bracket_end > 0:
        roll_block = """,
            { type: 'roll', label: '\U0001F504 Roll', param: 'degrees', defaultVal: 30, unit: '\u00b0', color: '#134e4a' },
            { type: 'moveUp', label: '\u2b06\ufe0f Move Up', param: 'distance', defaultVal: 30, unit: 'px', color: '#0e7490' },
            { type: 'moveDown', label: '\u2b07\ufe0f Move Down', param: 'distance', defaultVal: 30, unit: 'px', color: '#155e75' }
          """
        src = src[:bracket_end] + roll_block + src[bracket_end:]
        print("Added roll/moveUp/moveDown block types")

# ═══════════════════════════════════════════
# 3. UPGRADE EXECUTION ENGINE — full 3D with z-tracking, roll, depth lines
# ═══════════════════════════════════════════
old_forward3d = """} else if (b.type === 'forward3D') {
                var dist3D = resolveVal(b.distance || 50, vars);
                var radAngle = t.angle * Math.PI / 180;
                var radPitch = pitchAngle * Math.PI / 180;
                var dx3 = Math.cos(radAngle) * Math.cos(radPitch) * dist3D;
                var dy3 = Math.sin(radAngle) * Math.cos(radPitch) * dist3D;
                dy3 -= Math.sin(radPitch) * dist3D * 0.5;
                var nx3 = t.x + dx3;
                var ny3 = t.y + dy3;
                if (t.penDown) {
                  var depthFactor = 1 - Math.abs(Math.sin(radPitch)) * 0.3;
                  allLines.push({ x1: t.x, y1: t.y, x2: nx3, y2: ny3, color: t.color, width: Math.max(1, t.width * depthFactor) });
                }
                t.x = nx3; t.y = ny3;"""

new_forward3d = """} else if (b.type === 'forward3D') {
                var dist3D = resolveVal(b.distance || 50, vars);
                var radAngle = t.angle * Math.PI / 180;
                var radPitch = pitchAngle * Math.PI / 180;
                var radRoll = rollAngle * Math.PI / 180;
                // Full 3D direction vector
                var dx3 = Math.cos(radAngle) * Math.cos(radPitch) * dist3D;
                var dy3 = Math.sin(radAngle) * Math.cos(radPitch) * dist3D;
                var dz3 = Math.sin(radPitch) * dist3D;
                var nx3 = t.x + dx3;
                var ny3 = t.y + dy3;
                var nz3 = turtleZ + dz3;
                if (t.penDown) {
                  // Store as 3D line for perspective rendering
                  var l3d = { x1: t.x, y1: t.y, z1: turtleZ, x2: nx3, y2: ny3, z2: nz3, color: t.color, width: t.width };
                  lines3D.push(l3d);
                  upd('lines3D', lines3D.slice());
                  // Also project to 2D for compatibility
                  var p1 = project3D(t.x - 250, t.y - 250, turtleZ);
                  var p2 = project3D(nx3 - 250, ny3 - 250, nz3);
                  allLines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color: t.color, width: Math.max(0.5, t.width * p2.scale) });
                }
                t.x = nx3; t.y = ny3; turtleZ = nz3;
                upd('turtleZ', turtleZ);
              } else if (b.type === 'roll') {
                rollAngle = (rollAngle + resolveVal(b.degrees || 30, vars)) % 360;
                upd('rollAngle', rollAngle);
              } else if (b.type === 'moveUp') {
                var upDist = resolveVal(b.distance || 30, vars);
                var nzUp = turtleZ + upDist;
                if (t.penDown) {
                  var l3dU = { x1: t.x, y1: t.y, z1: turtleZ, x2: t.x, y2: t.y, z2: nzUp, color: t.color, width: t.width };
                  lines3D.push(l3dU); upd('lines3D', lines3D.slice());
                  var pU1 = project3D(t.x - 250, t.y - 250, turtleZ);
                  var pU2 = project3D(t.x - 250, t.y - 250, nzUp);
                  allLines.push({ x1: pU1.x, y1: pU1.y, x2: pU2.x, y2: pU2.y, color: t.color, width: Math.max(0.5, t.width * pU2.scale) });
                }
                turtleZ = nzUp; upd('turtleZ', turtleZ);
              } else if (b.type === 'moveDown') {
                var downDist = resolveVal(b.distance || 30, vars);
                var nzDown = turtleZ - downDist;
                if (t.penDown) {
                  var l3dD = { x1: t.x, y1: t.y, z1: turtleZ, x2: t.x, y2: t.y, z2: nzDown, color: t.color, width: t.width };
                  lines3D.push(l3dD); upd('lines3D', lines3D.slice());
                  var pD1 = project3D(t.x - 250, t.y - 250, turtleZ);
                  var pD2 = project3D(t.x - 250, t.y - 250, nzDown);
                  allLines.push({ x1: pD1.x, y1: pD1.y, x2: pD2.x, y2: pD2.y, color: t.color, width: Math.max(0.5, t.width * pD2.scale) });
                }
                turtleZ = nzDown; upd('turtleZ', turtleZ);"""

src = src.replace(old_forward3d, new_forward3d)

# ═══════════════════════════════════════════
# 4. BLOCKS TO TEXT — serialize new 3D blocks
# ═══════════════════════════════════════════
src = src.replace(
    """              } else if (b.type === 'forward3D') {
                lines.push(indent + 'forward3D(' + (b.distance || 50) + ')');
              }""",
    """              } else if (b.type === 'forward3D') {
                lines.push(indent + 'forward3D(' + (b.distance || 50) + ')');
              } else if (b.type === 'roll') {
                lines.push(indent + 'roll(' + (b.degrees || 30) + ')');
              } else if (b.type === 'moveUp') {
                lines.push(indent + 'moveUp(' + (b.distance || 30) + ')');
              } else if (b.type === 'moveDown') {
                lines.push(indent + 'moveDown(' + (b.distance || 30) + ')');
              }"""
)

# ═══════════════════════════════════════════
# 5. TEXT TO BLOCKS — parse new 3D blocks
# ═══════════════════════════════════════════
src = src.replace(
    """blks.push({ type: 'forward3D', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }""",
    """blks.push({ type: 'forward3D', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^roll\\((\\d+)\\)/))) { blks.push({ type: 'roll', degrees: parseFloat(m[1]) }); }
                else if ((m = line.match(/^moveUp\\((\\d+)\\)/))) { blks.push({ type: 'moveUp', distance: parseFloat(m[1]) }); }
                else if ((m = line.match(/^moveDown\\((\\d+)\\)/))) { blks.push({ type: 'moveDown', distance: parseFloat(m[1]) }); }"""
)

# ═══════════════════════════════════════════
# 6. BLOCK DEFAULTS for new 3D types
# ═══════════════════════════════════════════
src = src.replace(
    "                if (type === 'forward3D') { newBlock.distance = 50; }",
    "                if (type === 'forward3D') { newBlock.distance = 50; }\r\n                if (type === 'roll') { newBlock.degrees = 30; }\r\n                if (type === 'moveUp') { newBlock.distance = 30; }\r\n                if (type === 'moveDown') { newBlock.distance = 30; }"
)

# ═══════════════════════════════════════════
# 7. ADD CAMERA CONTROLS UI (before timeline, in sidebar)
# ═══════════════════════════════════════════
camera_panel = """
              // ── 3D Camera Controls ──
              show3D && React.createElement("div", { className: "bg-gradient-to-br from-teal-900/50 to-cyan-900/50 rounded-xl p-3 border border-teal-500/30" },
                React.createElement("h4", { className: "text-xs font-bold text-teal-300 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "\\u{1F3A5}"), " 3D Camera"
                ),
                // Camera Elevation
                React.createElement("div", { className: "mb-2" },
                  React.createElement("label", { className: "text-[9px] text-slate-400 flex justify-between" },
                    React.createElement("span", null, "Elevation"),
                    React.createElement("span", { className: "text-teal-300 font-bold" }, Math.round(cameraRotX) + "\\u00b0")
                  ),
                  React.createElement("input", {
                    type: "range", min: -90, max: 90, value: cameraRotX,
                    onChange: function(e) { upd('cameraRotX', parseInt(e.target.value)); },
                    className: "w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer",
                    style: { accentColor: '#14b8a6' }
                  })
                ),
                // Camera Azimuth
                React.createElement("div", { className: "mb-2" },
                  React.createElement("label", { className: "text-[9px] text-slate-400 flex justify-between" },
                    React.createElement("span", null, "Rotation"),
                    React.createElement("span", { className: "text-teal-300 font-bold" }, Math.round(cameraRotZ) + "\\u00b0")
                  ),
                  React.createElement("input", {
                    type: "range", min: 0, max: 360, value: cameraRotZ,
                    onChange: function(e) { upd('cameraRotZ', parseInt(e.target.value)); },
                    className: "w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer",
                    style: { accentColor: '#14b8a6' }
                  })
                ),
                // Zoom
                React.createElement("div", { className: "mb-2" },
                  React.createElement("label", { className: "text-[9px] text-slate-400 flex justify-between" },
                    React.createElement("span", null, "Zoom"),
                    React.createElement("span", { className: "text-teal-300 font-bold" }, (cameraZoom * 100).toFixed(0) + "%")
                  ),
                  React.createElement("input", {
                    type: "range", min: 30, max: 300, value: Math.round(cameraZoom * 100),
                    onChange: function(e) { upd('cameraZoom', parseInt(e.target.value) / 100); },
                    className: "w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer",
                    style: { accentColor: '#14b8a6' }
                  })
                ),
                // Toggle buttons
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", {
                    onClick: function() { upd('show3DGrid', !show3DGrid); },
                    className: "flex-1 px-2 py-1 rounded text-[9px] font-bold transition-all " +
                      (show3DGrid ? "bg-teal-500/30 text-teal-300" : "bg-slate-700/50 text-slate-500")
                  }, "\\u{2B1C} Grid"),
                  React.createElement("button", {
                    onClick: function() { upd('show3DAxes', !show3DAxes); },
                    className: "flex-1 px-2 py-1 rounded text-[9px] font-bold transition-all " +
                      (show3DAxes ? "bg-teal-500/30 text-teal-300" : "bg-slate-700/50 text-slate-500")
                  }, "\\u{1F4CD} Axes"),
                  React.createElement("button", {
                    onClick: function() { updMulti({ cameraRotX: 30, cameraRotZ: 45, cameraZoom: 1.0 }); },
                    className: "flex-1 px-2 py-1 rounded text-[9px] font-bold bg-slate-700/50 text-slate-500 hover:text-white transition-all"
                  }, "\\u{1F504} Reset")
                ),
                // 3D coordinates display
                React.createElement("div", { className: "mt-2 grid gap-1", style: { gridTemplateColumns: '1fr 1fr 1fr' } },
                  React.createElement("div", { className: "text-[9px] font-mono text-center bg-slate-700/40 rounded px-1 py-0.5" },
                    "x:", React.createElement("span", { className: "text-red-400 font-bold" }, " " + Math.round(turtleState.x))
                  ),
                  React.createElement("div", { className: "text-[9px] font-mono text-center bg-slate-700/40 rounded px-1 py-0.5" },
                    "y:", React.createElement("span", { className: "text-green-400 font-bold" }, " " + Math.round(turtleState.y))
                  ),
                  React.createElement("div", { className: "text-[9px] font-mono text-center bg-slate-700/40 rounded px-1 py-0.5" },
                    "z:", React.createElement("span", { className: "text-blue-400 font-bold" }, " " + Math.round(turtleZ))
                  )
                )
              ),
"""

src = src.replace(
    "              // ── Animation Timeline ──",
    camera_panel + "              // ── Animation Timeline ──"
)

# ═══════════════════════════════════════════
# 8. ADD RICH 3D TEMPLATES
# ═══════════════════════════════════════════
# Find the 3D Spiral template and add more after it
spiral_idx = src.find("'3D Spiral'")
if spiral_idx > 0:
    entry_end = src.find("}] }", spiral_idx) + 3
    if entry_end > 3:
        more_templates = """,
            { name: '3D Pyramid', icon: '\\u{1F4D0}', desc: 'A wireframe pyramid', blocks: [{ type: 'color', color: '#f59e0b' }, { type: 'width', width: 2 }, { type: 'repeat', times: 4, children: [{ type: 'forward3D', distance: 80 }, { type: 'right', degrees: 90 }] }, { type: 'goto', x: 250, y: 250 }, { type: 'pitch', degrees: 55 }, { type: 'repeat', times: 4, children: [{ type: 'forward3D', distance: 70 }, { type: 'backward', distance: 70 }, { type: 'right', degrees: 90 }] }] },
            { name: 'DNA Helix', icon: '\\u{1F9EC}', desc: 'A double helix strand', blocks: [{ type: 'color', color: '#6366f1' }, { type: 'width', width: 2 }, { type: 'repeat', times: 20, children: [{ type: 'forward3D', distance: 15 }, { type: 'right', degrees: 36 }, { type: 'pitch', degrees: 8 }] }, { type: 'goto', x: 250, y: 250 }, { type: 'color', color: '#ec4899' }, { type: 'repeat', times: 20, children: [{ type: 'forward3D', distance: 15 }, { type: 'left', degrees: 36 }, { type: 'pitch', degrees: 8 }] }] },
            { name: '3D Star', icon: '\\u{2B50}', desc: 'A 3D extruded star', blocks: [{ type: 'color', color: '#eab308' }, { type: 'width', width: 2 }, { type: 'repeat', times: 5, children: [{ type: 'forward3D', distance: 60 }, { type: 'moveUp', distance: 20 }, { type: 'right', degrees: 144 }, { type: 'forward3D', distance: 60 }, { type: 'moveDown', distance: 20 }, { type: 'right', degrees: 144 }] }] },
            { name: '3D Staircase', icon: '\\u{1FA9C}', desc: 'A spiraling 3D staircase', blocks: [{ type: 'color', color: '#8b5cf6' }, { type: 'width', width: 3 }, { type: 'repeat', times: 16, children: [{ type: 'forward3D', distance: 25 }, { type: 'moveUp', distance: 10 }, { type: 'right', degrees: 22.5 }] }] },
            { name: 'Torus Ring', icon: '\\u{1F48D}', desc: 'A donut shape (torus cross-section)', blocks: [{ type: 'color', color: '#06b6d4' }, { type: 'width', width: 2 }, { type: 'repeat', times: 12, children: [{ type: 'pitch', degrees: 30 }, { type: 'repeat', times: 8, children: [{ type: 'forward3D', distance: 12 }, { type: 'right', degrees: 45 }] }, { type: 'pitch', degrees: -30 }, { type: 'right', degrees: 30 }] }] },
            { name: 'Crystal', icon: '\\u{1F48E}', desc: 'A sparkling crystal shape', blocks: [{ type: 'color', color: '#22d3ee' }, { type: 'width', width: 2 }, { type: 'repeat', times: 6, children: [{ type: 'forward3D', distance: 50 }, { type: 'moveUp', distance: 40 }, { type: 'forward3D', distance: 50 }, { type: 'moveDown', distance: 40 }, { type: 'backward', distance: 100 }, { type: 'right', degrees: 60 }] }] }"""
        src = src[:entry_end] + more_templates + src[entry_end:]
        print("Added 6 rich 3D templates")

# ═══════════════════════════════════════════
# 9. RESET 3D STATE ON RUN
# ═══════════════════════════════════════════
src = src.replace(
    "updMulti({ turtle: startTurtle, lines: startLines, running: true, stepIdx: 0, timelineFrames: [], timelinePos: -1 });",
    "updMulti({ turtle: startTurtle, lines: startLines, running: true, stepIdx: 0, timelineFrames: [], timelinePos: -1, turtleZ: 0, lines3D: [], rollAngle: 0 });"
)

# ═══════════════════════════════════════════
# 10. ADD Z + pitch/yaw/roll TO VARIABLE INSPECTOR
# ═══════════════════════════════════════════
src = src.replace(
    """React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "\\u{2728} step: """,
    """React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "\\u{1F4CF} z: ", React.createElement("span", { className: "text-blue-300 font-bold" }, Math.round(turtleZ))
                  ),
                  show3D && React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "\\u{1F504} pitch: ", React.createElement("span", { className: "text-teal-300 font-bold" }, Math.round(pitchAngle) + "\\u00b0")
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "\\u{2728} step: \""""
)

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Deep 3D upgrade complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
