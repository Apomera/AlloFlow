"""Final features: Text-to-Blocks Live Sync + 3D Isometric Mode (fixed unicode)"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. ADD 3D STATE
# ═══════════════════════════════════════════
src = src.replace(
    "          // ── Multi-Turtle & Extra Feature State ──",
    """          // ── 3D Isometric Mode ──
          var pitchAngle = d.pitchAngle || 0;
          var yawAngle = d.yawAngle || 0;

          // ── Multi-Turtle & Extra Feature State ──"""
)

# ═══════════════════════════════════════════
# 2. ADD 3D BLOCK TYPES (find BLOCK_TYPES array end)
# ═══════════════════════════════════════════
# Find the end of BLOCK_TYPES by locating the switchTurtle entry then the ];
idx = src.find("'switchTurtle', param: 'turtleName'")
if idx > 0:
    # Find ]; after this
    end_bracket = src.find("];", idx)
    if end_bracket > 0:
        insert_text = """,
            { type: 'pitch', label: '\U0001F4D0 Pitch', param: 'degrees', defaultVal: 30, unit: '\u00b0', color: '#0d9488' },
            { type: 'yaw', label: '\U0001F504 Yaw', param: 'degrees', defaultVal: 30, unit: '\u00b0', color: '#0f766e' },
            { type: 'forward3D', label: '\U0001F680 Forward 3D', param: 'distance', defaultVal: 50, unit: 'px', color: '#115e59' }
          """
        src = src[:end_bracket] + insert_text + src[end_bracket:]
        print("Added 3D block types")

# ═══════════════════════════════════════════
# 3. ADD LIVE TEXT SYNC
# ═══════════════════════════════════════════
live_sync = """
          // ── Live Text-to-Blocks Sync ──
          var _textSyncTimer = null;
          function handleTextChange(newCode) {
            upd('textCode', newCode);
            if (_textSyncTimer) clearTimeout(_textSyncTimer);
            _textSyncTimer = setTimeout(function() {
              try {
                var parsed = textToBlocks(newCode);
                if (parsed && parsed.length > 0) {
                  upd('blocks', parsed);
                }
              } catch(e) { /* silent — user may be mid-edit */ }
            }, 400);
          }
"""

src = src.replace(
    "          // ── Coordinate Picker Handler ──",
    live_sync + "          // ── Coordinate Picker Handler ──"
)

# ═══════════════════════════════════════════
# 4. EXECUTION ENGINE — 3D blocks
# ═══════════════════════════════════════════
exec_3d = """} else if (b.type === 'pitch') {
                pitchAngle = (pitchAngle + resolveVal(b.degrees || 30, vars)) % 360;
                upd('pitchAngle', pitchAngle);
              } else if (b.type === 'yaw') {
                yawAngle = (yawAngle + resolveVal(b.degrees || 30, vars)) % 360;
                upd('yawAngle', yawAngle);
              } else if (b.type === 'forward3D') {
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
                t.x = nx3; t.y = ny3;
              """

src = src.replace(
    "              } else if (b.type === 'spawnTurtle') {",
    "              " + exec_3d + "} else if (b.type === 'spawnTurtle') {"
)

# ═══════════════════════════════════════════
# 5. BLOCKS TO TEXT — serialize 3D blocks
# ═══════════════════════════════════════════
src = src.replace(
    """              } else if (b.type === 'switchTurtle') {
                lines.push(indent + 'switchTurtle("' + (b.turtleName || 'bob') + '")');
              }""",
    """              } else if (b.type === 'switchTurtle') {
                lines.push(indent + 'switchTurtle("' + (b.turtleName || 'bob') + '")');
              } else if (b.type === 'pitch') {
                lines.push(indent + 'pitch(' + (b.degrees || 30) + ')');
              } else if (b.type === 'yaw') {
                lines.push(indent + 'yaw(' + (b.degrees || 30) + ')');
              } else if (b.type === 'forward3D') {
                lines.push(indent + 'forward3D(' + (b.distance || 50) + ')');
              }"""
)

# ═══════════════════════════════════════════
# 6. TEXT TO BLOCKS — parse 3D blocks
# ═══════════════════════════════════════════
src = src.replace(
    """blks.push({ type: 'switchTurtle', turtleName: m[1] }); }""",
    """blks.push({ type: 'switchTurtle', turtleName: m[1] }); }
                else if ((m = line.match(/^pitch\\((\\d+)\\)/))) { blks.push({ type: 'pitch', degrees: parseFloat(m[1]) }); }
                else if ((m = line.match(/^yaw\\((\\d+)\\)/))) { blks.push({ type: 'yaw', degrees: parseFloat(m[1]) }); }
                else if ((m = line.match(/^forward3D\\(([\\$\\w]+)\\)/))) { blks.push({ type: 'forward3D', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }"""
)

# ═══════════════════════════════════════════
# 7. BLOCK DEFAULTS for 3D types
# ═══════════════════════════════════════════
src = src.replace(
    "                if (type === 'switchTurtle') { newBlock.turtleName = 'bob'; }",
    "                if (type === 'switchTurtle') { newBlock.turtleName = 'bob'; }\r\n                if (type === 'pitch') { newBlock.degrees = 30; }\r\n                if (type === 'yaw') { newBlock.degrees = 30; }\r\n                if (type === 'forward3D') { newBlock.distance = 50; }"
)

# ═══════════════════════════════════════════
# 8. WIRE LIVE TEXT SYNC into textarea
# ═══════════════════════════════════════════
src = src.replace(
    "onChange: function (e) { upd('textCode', e.target.value); }",
    "onChange: function (e) { handleTextChange(e.target.value); }"
)

# ═══════════════════════════════════════════
# 9. ADD 3D TOGGLE + live sync indicator in header
# ═══════════════════════════════════════════
toggle_3d = """
              // 3D Mode toggle
              React.createElement("button", {
                onClick: function() { upd('show3D', !show3D); if (!show3D) { upd('pitchAngle', 0); upd('yawAngle', 0); } },
                title: show3D ? 'Switch to 2D mode' : 'Switch to 3D isometric mode',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (show3D ? "bg-teal-500 text-white" : "bg-white/15 text-white hover:bg-white/25")
              }, show3D ? "\\u{1F310} 3D" : "\\u{1F4D0} 2D"),"""

src = src.replace(
    "              // Turtle Skin selector",
    toggle_3d + "\n              // Turtle Skin selector"
)

# ═══════════════════════════════════════════
# 10. ADD 3D TEMPLATES — add after Koch Snowflake
# ═══════════════════════════════════════════
koch_idx = src.find("'Koch Snowflake'")
if koch_idx > 0:
    # Find the end of the template entry: "}] }"  
    search_start = koch_idx
    entry_end = src.find("}] }", search_start)
    if entry_end > 0:
        entry_end += 3  # past "}] }"
        new_templates = """,
            { name: '3D Cube', icon: '\\u{1F9CA}', desc: 'An isometric cube', blocks: [{ type: 'color', color: '#06b6d4' }, { type: 'repeat', times: 4, children: [{ type: 'forward3D', distance: 60 }, { type: 'right', degrees: 90 }] }, { type: 'pitch', degrees: 45 }, { type: 'color', color: '#8b5cf6' }, { type: 'repeat', times: 4, children: [{ type: 'forward3D', distance: 60 }, { type: 'right', degrees: 90 }] }] },
            { name: '3D Spiral', icon: '\\u{1F300}', desc: 'A spiral rising upward', blocks: [{ type: 'color', color: '#f59e0b' }, { type: 'repeat', times: 24, children: [{ type: 'forward3D', distance: 30 }, { type: 'right', degrees: 30 }, { type: 'pitch', degrees: 5 }] }] }"""
        src = src[:entry_end] + new_templates + src[entry_end:]
        print("Added 3D templates")

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Final features complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
