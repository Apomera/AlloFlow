import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix the ref bug that causes constant resetting
old_ref_bug = """          // Canvas animation ref
          var _lastEcoCanvas = null;
          const canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (_lastEcoCanvas && _lastEcoCanvas._ecoAnim) {
                cancelAnimationFrame(_lastEcoCanvas._ecoAnim);
                _lastEcoCanvas._ecoInit = false;
              }
              _lastEcoCanvas = null;
              return;
            }
            _lastEcoCanvas = canvasEl;
            if (canvasEl._ecoInit) return;
            canvasEl._ecoInit = true;"""

new_ref_fix = """          // Canvas animation ref
          const canvasRef = function (canvasEl) {
            if (!canvasEl) return;
            if (canvasEl._ecoInit) {
              canvasEl._onPopUpdate = function(h) { upd('livePopHistory', h); };
              return;
            }
            canvasEl._ecoInit = true;
            canvasEl._onPopUpdate = function(h) { upd('livePopHistory', h); };"""

# 2. Slow down standard movement speeds
old_speeds = """                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                alive: pi < 30,
                hop: Math.random() * Math.PI * 2,
                facing: Math.random() > 0.5 ? 1 : -1
              });
            }
            // Predator entities (foxes)
            var predList = [];
            for (var qi = 0; qi < 25; qi++) {
              predList.push({
                x: Math.random() * cW / dpr,
                y: cH * 0.4 / dpr + Math.random() * cH * 0.55 / dpr,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,"""

new_speeds = """                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                alive: pi < 30,
                hop: Math.random() * Math.PI * 2,
                facing: Math.random() > 0.5 ? 1 : -1
              });
            }
            // Predator entities (foxes)
            var predList = [];
            for (var qi = 0; qi < 25; qi++) {
              predList.push({
                x: Math.random() * cW / dpr,
                y: cH * 0.4 / dpr + Math.random() * cH * 0.55 / dpr,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,"""

# 3. Slow down hunt chase speed
old_chase = """                  var chaseSpeed = isDay ? 0.05 : 0.07; // Slower chase"""
new_chase = """                  var chaseSpeed = isDay ? 0.025 : 0.035; // Slower chase"""

# 4. Prevent memory leak by stopping loop if canvas is removed
old_draw = """            function draw() {
              tick++;"""
new_draw = """            function draw() {
              if (!canvasEl || !document.body.contains(canvasEl)) return;
              tick++;"""

if old_ref_bug in text:
    print("Found ref bug block, replacing...")
    text = text.replace(old_ref_bug, new_ref_fix)
else:
    print("WARNING: Could not find old_ref_bug block!")

if old_speeds in text:
    print("Found speeds block, replacing...")
    text = text.replace(old_speeds, new_speeds)
else:
    print("WARNING: Could not find old_speeds block!")

if old_chase in text:
    print("Found chase speed block, replacing...")
    text = text.replace(old_chase, new_chase)
else:
    print("WARNING: Could not find old_chase block!")

if old_draw in text:
    print("Found draw block, replacing...")
    text = text.replace(old_draw, new_draw)
else:
    print("WARNING: Could not find old_draw block!")

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("Replacement complete.")
