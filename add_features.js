const fs = require('fs');

// Read the file
let content = fs.readFileSync('stem_lab_module.js', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const eol = content.includes('\r\n') ? '\r\n' : '\n';
let lines = content.split(eol);
console.log('Read ' + lines.length + ' lines');

function findLine(str, from) {
  from = from || 0;
  for (let i = from; i < lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════
// FEATURE 1: BRAINWAVES — Insert into Brain Atlas after canvas
// ═══════════════════════════════════════════════════════════════════
// Insert a brainwave interactive panel right before the region list/detail panel.
// Find the "// ─── Canvas ───" line in Brain Atlas, then find the panel after it.
// Actually, insert before the closing of the Brain Atlas section.
// We'll insert a brainwave section after the NT simulation description panel
// and before the region list.

// Find the location: search for "// ─── Simulation description panel" in brain atlas
const simDescLine = findLine('Simulation description panel (NT view only)');
if (simDescLine < 0) { console.log('ERROR: simDescLine not found'); process.exit(1); }
console.log('Sim description panel at line ' + (simDescLine + 1));

// Find the region list/detail that comes after — look for the detail panel
// It should be around the filtered.map area
const regionListLine = findLine('sel ? (', simDescLine);
if (regionListLine < 0) { console.log('ERROR: region list not found'); process.exit(1); }
console.log('Region list/detail at line ' + (regionListLine + 1));

// Insert brainwave panel BEFORE the region detail/list section
const brainwaveCode = `
              // ─── Brainwave Visualizer ───
              React.createElement("div", { className: "rounded-xl border-2 border-purple-200 overflow-hidden", style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)' } },
                React.createElement("div", { className: "p-3" },
                  React.createElement("div", { className: "flex items-center justify-between mb-2" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-lg" }, "\\u{1F9E0}"),
                      React.createElement("h4", { className: "text-sm font-black text-white" }, "Brainwave Visualizer")
                    ),
                    React.createElement("div", { className: "flex gap-1" },
                      ['delta', 'theta', 'alpha', 'beta', 'gamma'].map(function (waveType) {
                        var WAVE_META = {
                          delta: { label: '\\u0394 Delta', freq: '0.5\\u20134 Hz', color: '#818cf8', desc: 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.' },
                          theta: { label: '\\u0398 Theta', freq: '4\\u20138 Hz', color: '#a78bfa', desc: 'Light sleep, meditation, creativity, memory consolidation. \"Twilight\" state between waking and sleeping.' },
                          alpha: { label: '\\u03B1 Alpha', freq: '8\\u201313 Hz', color: '#c084fc', desc: 'Relaxed alertness, calm focus, mindfulness. Bridge between conscious thinking and subconscious mind.' },
                          beta: { label: '\\u03B2 Beta', freq: '13\\u201330 Hz', color: '#e879f9', desc: 'Active thinking, problem-solving, focused concentration. Dominant during normal waking consciousness.' },
                          gamma: { label: '\\u03B3 Gamma', freq: '30\\u2013100 Hz', color: '#f472b6', desc: 'Higher cognitive processing, peak awareness, information binding across brain regions. Fastest brainwave.' }
                        };
                        var meta = WAVE_META[waveType];
                        var isActive = (d.brainwaveType || 'alpha') === waveType;
                        return React.createElement("button", {
                          key: waveType,
                          onClick: function () { upd('brainwaveType', waveType); },
                          className: "px-2 py-1 rounded-md text-[10px] font-bold transition-all " + (isActive ? 'text-white shadow-lg' : 'text-white/50 hover:text-white/80'),
                          style: isActive ? { background: meta.color } : {}
                        }, meta.label);
                      })
                    )
                  ),
                  // Brainwave canvas
                  React.createElement("canvas", {
                    id: "brainwave-canvas",
                    width: 560, height: 160,
                    className: "w-full rounded-lg",
                    style: { background: '#0f0b2e' }
                  }),
                  // Info panel
                  (function () {
                    var WAVE_META = {
                      delta: { label: '\\u0394 Delta', freq: '0.5\\u20134 Hz', color: '#818cf8', desc: 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.', amp: 'Highest (75\\u2013200 \\u00B5V)', states: 'Deep sleep (NREM Stage 3\\u20134), coma, infants', eeg: 'Frontal (adults), posterior (children)' },
                      theta: { label: '\\u0398 Theta', freq: '4\\u20138 Hz', color: '#a78bfa', desc: 'Light sleep, meditation, creativity, memory consolidation. Twilight state.', amp: 'Medium-High (20\\u201375 \\u00B5V)', states: 'Drowsiness, light sleep, meditation, memory encoding', eeg: 'Temporal, frontal midline' },
                      alpha: { label: '\\u03B1 Alpha', freq: '8\\u201313 Hz', color: '#c084fc', desc: 'Relaxed alertness, calm focus, mindfulness. Bridge between conscious and subconscious.', amp: 'Medium (30\\u201350 \\u00B5V)', states: 'Eyes closed, relaxed, calm alertness, mindfulness', eeg: 'Posterior (occipital), attenuates with eye opening' },
                      beta: { label: '\\u03B2 Beta', freq: '13\\u201330 Hz', color: '#e879f9', desc: 'Active thinking, problem-solving, focused concentration. Normal waking consciousness.', amp: 'Low (5\\u201330 \\u00B5V)', states: 'Active thinking, anxiety, concentration, motor planning', eeg: 'Frontal, central (Rolandic beta)' },
                      gamma: { label: '\\u03B3 Gamma', freq: '30\\u2013100 Hz', color: '#f472b6', desc: 'Higher cognitive processing, peak awareness, cross-region information binding.', amp: 'Very Low (< 5 \\u00B5V)', states: 'Perception binding, peak focus, advanced meditation', eeg: 'Widespread, somatosensory cortex' }
                    };
                    var activeWave = WAVE_META[d.brainwaveType || 'alpha'];
                    return React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-2" },
                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },
                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Frequency"),
                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.freq)
                      ),
                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },
                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Amplitude"),
                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.amp)
                      ),
                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },
                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "Mental States"),
                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.states)
                      ),
                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },
                        React.createElement("p", { className: "text-[10px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, "EEG Location"),
                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.eeg)
                      )
                    );
                  })(),
                  React.createElement("p", { className: "text-[10px] text-white/40 mt-2 italic text-center" }, (function () {
                    var WAVE_META = {
                      delta: { desc: 'Deep sleep, healing. Highest amplitude, slowest frequency. Dominant in infants and during deep non-REM sleep.' },
                      theta: { desc: 'Light sleep, meditation, creativity. The twilight state between waking and sleeping. Linked to memory consolidation.' },
                      alpha: { desc: 'Relaxed alertness, calm focus. Bridge between conscious thinking and subconscious. Blocked by opening eyes (Berger effect).' },
                      beta: { desc: 'Active thinking, problem-solving. Dominant during normal waking consciousness. Excess linked to anxiety.' },
                      gamma: { desc: 'Peak cognitive processing, cross-region binding. Fastest brainwave. Associated with advanced meditation and heightened perception.' }
                    };
                    return WAVE_META[d.brainwaveType || 'alpha'].desc;
                  })())
                )
              ),
              // ─── Brainwave canvas renderer (async) ───
              (function () {
                setTimeout(function () {
                  var canvas = document.getElementById('brainwave-canvas');
                  if (!canvas || canvas._bwAnimFrame) return;
                  var ctx = canvas.getContext('2d');
                  var W = canvas.width, H = canvas.height;
                  var tick = 0;
                  var WAVE_PARAMS = {
                    delta: { freq: 1.5, amp: 0.85, color: '#818cf8', lineWidth: 3 },
                    theta: { freq: 3, amp: 0.65, color: '#a78bfa', lineWidth: 2.5 },
                    alpha: { freq: 5, amp: 0.50, color: '#c084fc', lineWidth: 2.5 },
                    beta: { freq: 10, amp: 0.30, color: '#e879f9', lineWidth: 2 },
                    gamma: { freq: 22, amp: 0.18, color: '#f472b6', lineWidth: 1.5 }
                  };
                  function drawFrame() {
                    canvas._bwAnimFrame = requestAnimationFrame(drawFrame);
                    tick += 0.8;
                    ctx.fillStyle = 'rgba(15, 11, 46, 0.15)';
                    ctx.fillRect(0, 0, W, H);
                    // Grid lines
                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                    ctx.lineWidth = 1;
                    for (var gy = 1; gy < 4; gy++) {
                      ctx.beginPath();
                      ctx.moveTo(0, H * gy / 4);
                      ctx.lineTo(W, H * gy / 4);
                      ctx.stroke();
                    }
                    // Draw all waves faintly, active wave bright
                    var activeType = (canvas.closest && canvas.closest('[class*="border-purple"]')) ? null : null;
                    var types = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
                    // Read active type from parent
                    var btns = canvas.parentElement ? canvas.parentElement.querySelectorAll('button[class*="shadow-lg"]') : [];
                    var activeKey = 'alpha';
                    btns.forEach(function (btn) {
                      types.forEach(function (t) { if (btn.textContent && btn.textContent.toLowerCase().includes(t.substring(0, 4))) activeKey = t; });
                    });
                    for (var ti = 0; ti < types.length; ti++) {
                      var t = types[ti];
                      var p = WAVE_PARAMS[t];
                      var isActive = t === activeKey;
                      ctx.beginPath();
                      ctx.strokeStyle = isActive ? p.color : (p.color + '22');
                      ctx.lineWidth = isActive ? p.lineWidth + 1 : 1;
                      if (isActive) {
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = 12;
                      }
                      var midY = H / 2;
                      var ampPx = midY * p.amp * (isActive ? 1 : 0.3);
                      for (var x = 0; x < W; x++) {
                        var phase = (x / W) * Math.PI * 2 * p.freq + tick * 0.02 * p.freq;
                        // Add slight noise for realism
                        var noise = isActive ? Math.sin(phase * 3.7 + tick * 0.1) * ampPx * 0.08 : 0;
                        var y = midY + Math.sin(phase) * ampPx + noise;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                      }
                      ctx.stroke();
                      ctx.shadowBlur = 0;
                    }
                    // Label
                    ctx.fillStyle = WAVE_PARAMS[activeKey].color;
                    ctx.font = 'bold 11px Inter, system-ui';
                    ctx.textAlign = 'right';
                    ctx.fillText(activeKey.charAt(0).toUpperCase() + activeKey.slice(1) + ' Waves', W - 12, 18);
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.font = '9px Inter, system-ui';
                    ctx.fillText(WAVE_PARAMS[activeKey].freq.toFixed(0) + 'x base freq | Amp: ' + (WAVE_PARAMS[activeKey].amp * 100).toFixed(0) + '%', W - 12, 32);
                    // Time axis
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    for (var s = 1; s <= 3; s++) { ctx.fillText(s + 's', W * s / 4, H - 4); }
                  }
                  drawFrame();
                  // Cleanup on unmount
                  canvas._bwCleanup = function () { cancelAnimationFrame(canvas._bwAnimFrame); canvas._bwAnimFrame = null; };
                }, 50);
                return null;
              })(),`;

// Find the insertion point — right before the sel ? ( region detail line
// We need to add a comma after the canvas/simulation description and insert the brainwave block
const insertIdx = regionListLine;
const brainwaveLines = brainwaveCode.split('\n').filter(l => l !== '');
lines.splice(insertIdx, 0, ...brainwaveLines);
console.log('Feature 1: Inserted ' + brainwaveLines.length + ' brainwave lines at line ' + (insertIdx + 1));

// ═══════════════════════════════════════════════════════════════════
// FEATURE 2: GEOLOGY TIMELINE — Add animated Earth canvas
// ═══════════════════════════════════════════════════════════════════
// Insert an animated Earth canvas after the era description and before the quiz tab
// Find the "Active era description" div and insert after it closes

const activeEraDescLine = findLine('Active era description');
if (activeEraDescLine < 0) { console.log('ERROR: active era description not found'); process.exit(1); }
console.log('Feature 2: Active era description at line ' + (activeEraDescLine + 1));

// Find the closing of the era description div — look for the tip text
const eraDescTipLine = findLine("Switch to the Simulation tab", activeEraDescLine);
if (eraDescTipLine < 0) { console.log('ERROR: era desc tip not found'); process.exit(1); }

// The closing pattern after the tip is:   )  )  )  ),
// Find the `)` lines after the tip
let closingIdx = eraDescTipLine + 1;
// Scan forward to find the `)`s that close the era description div
let depth = 0;
// Actually let's just find the line that has the quiz tab after it
const quizTabLine = findLine("TAB 4: QUIZ", eraDescTipLine);
if (quizTabLine < 0) { console.log('ERROR: quiz tab not found'); process.exit(1); }
console.log('  Quiz tab at line ' + (quizTabLine + 1));

// Insert the Earth canvas above the quiz tab comment
const earthCode = `
            // ═══ EARTH TIMELAPSE CANVAS ═══
            React.createElement("div", { className: "rounded-2xl border-2 border-red-200 overflow-hidden mt-4", style: { background: 'linear-gradient(135deg, #0c0a2a, #1e1b4b)' } },
              React.createElement("div", { className: "p-4" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { style: { fontSize: 22 } }, "\\u{1F30D}"),
                  React.createElement("h4", { className: "font-black text-white text-sm" }, "Earth Through Time"),
                  React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold bg-indigo-900/50 px-2 py-0.5 rounded-full" }, ERAS[timelineEra].name)
                ),
                React.createElement("canvas", {
                  id: "geology-earth-canvas",
                  width: 520, height: 320,
                  className: "w-full rounded-xl",
                  style: { background: '#050520' }
                }),
                React.createElement("p", { className: "text-[10px] text-indigo-300/60 mt-2 italic text-center" }, "\\u{1F4A1} Drag the timeline slider to see how Earth's continents have shifted over billions of years")
              )
            ),
            // ─── Earth canvas renderer (async) ───
            (function () {
              setTimeout(function () {
                var canvas = document.getElementById('geology-earth-canvas');
                if (!canvas) return;
                if (canvas._geoAnim) cancelAnimationFrame(canvas._geoAnim);
                var ctx = canvas.getContext('2d');
                var W = canvas.width, H = canvas.height;
                var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 30;
                var tick = 0;
                var ERA_CONTINENTS = [
                  { name: 'Hadean', ocean: '#1a0a3e', land: '#8b4513', continents: [] },
                  { name: 'Archean', ocean: '#0a2463', land: '#556b2f', continents: [{ cx: 0, cy: 0, r: 0.3, shape: 'circle' }] },
                  { name: 'Proterozoic', ocean: '#0a3d62', land: '#6b8e23', continents: [{ cx: -0.1, cy: 0.1, r: 0.35, shape: 'blob', label: 'Rodinia' }] },
                  { name: 'Cambrian', ocean: '#0e4d92', land: '#8fbc8f', continents: [{ cx: 0.15, cy: 0.2, r: 0.3, shape: 'blob', label: 'Gondwana' }, { cx: -0.25, cy: -0.2, r: 0.12, shape: 'blob', label: 'Laurentia' }, { cx: 0.3, cy: -0.15, r: 0.08, shape: 'blob', label: 'Baltica' }] },
                  { name: 'Carboniferous', ocean: '#1565c0', land: '#228b22', continents: [{ cx: 0, cy: 0.05, r: 0.45, shape: 'pangaea_forming', label: 'Pangaea forming' }] },
                  { name: 'Permian/Triassic', ocean: '#1976d2', land: '#2e8b57', continents: [{ cx: 0, cy: 0, r: 0.5, shape: 'pangaea', label: 'Pangaea' }] },
                  { name: 'Jurassic', ocean: '#1e88e5', land: '#3cb371', continents: [{ cx: -0.15, cy: -0.15, r: 0.25, shape: 'blob', label: 'Laurasia' }, { cx: 0.1, cy: 0.2, r: 0.28, shape: 'blob', label: 'Gondwana' }] },
                  { name: 'Cretaceous', ocean: '#42a5f5', land: '#66cdaa', continents: [{ cx: -0.3, cy: -0.15, r: 0.15, shape: 'blob', label: 'N. America' }, { cx: 0.1, cy: -0.2, r: 0.13, shape: 'blob', label: 'Eurasia' }, { cx: -0.1, cy: 0.25, r: 0.18, shape: 'blob', label: 'S. America+Africa' }, { cx: 0.25, cy: 0.3, r: 0.12, shape: 'blob', label: 'Antarctica+Australia' }, { cx: 0.3, cy: 0.05, r: 0.08, shape: 'blob', label: 'India' }] },
                  { name: 'Modern', ocean: '#2196f3', land: '#4caf50', continents: [{ cx: -0.35, cy: -0.15, r: 0.13, shape: 'blob', label: 'N. Am' }, { cx: -0.2, cy: 0.22, r: 0.11, shape: 'blob', label: 'S. Am' }, { cx: 0.05, cy: -0.05, r: 0.12, shape: 'blob', label: 'Africa' }, { cx: 0.15, cy: -0.25, r: 0.18, shape: 'blob', label: 'Eurasia' }, { cx: 0.35, cy: 0.3, r: 0.09, shape: 'blob', label: 'Australia' }, { cx: 0.0, cy: 0.45, r: 0.1, shape: 'blob', label: 'Antarctica' }, { cx: 0.25, cy: 0.05, r: 0.06, shape: 'blob', label: 'India' }] }
                ];
                // Map timeline era index to continent config
                var eraMap = [0, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8];
                function drawEarth() {
                  canvas._geoAnim = requestAnimationFrame(drawEarth);
                  tick += 0.5;
                  ctx.clearRect(0, 0, W, H);
                  // Read the active era from the slider
                  var eraIdx = 0;
                  var slider = canvas.parentElement ? canvas.parentElement.parentElement.parentElement.querySelector('input[type="range"]') : null;
                  if (slider) eraIdx = parseInt(slider.value) || 0;
                  var configIdx = Math.min(eraIdx, eraMap.length - 1);
                  var era = ERA_CONTINENTS[eraMap[configIdx]];
                  // Stars
                  if (!canvas._stars) {
                    canvas._stars = [];
                    for (var si = 0; si < 80; si++) canvas._stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5, b: Math.random() });
                  }
                  ctx.fillStyle = 'rgba(255,255,255,0.4)';
                  canvas._stars.forEach(function (star) {
                    var twinkle = 0.5 + 0.5 * Math.sin(tick * 0.03 + star.b * 10);
                    ctx.globalAlpha = twinkle * 0.7;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
                    ctx.fill();
                  });
                  ctx.globalAlpha = 1;
                  // Atmosphere glow
                  var glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.3);
                  glow.addColorStop(0, era.ocean + 'aa');
                  glow.addColorStop(0.5, era.ocean + '44');
                  glow.addColorStop(1, 'transparent');
                  ctx.fillStyle = glow;
                  ctx.fillRect(0, 0, W, H);
                  // Earth sphere
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(cx, cy, R, 0, Math.PI * 2);
                  ctx.clip();
                  // Ocean gradient
                  var oceanGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
                  oceanGrad.addColorStop(0, era.ocean);
                  var darkerOcean = era.ocean.replace(/[0-9a-f]{2}$/i, function (h) { return Math.max(0, parseInt(h, 16) - 40).toString(16).padStart(2, '0'); });
                  oceanGrad.addColorStop(1, darkerOcean || era.ocean);
                  ctx.fillStyle = oceanGrad;
                  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
                  // Continents
                  era.continents.forEach(function (c) {
                    var contX = cx + c.cx * R;
                    var contY = cy + c.cy * R;
                    var contR = c.r * R;
                    // Slight rotation drift
                    var drift = Math.sin(tick * 0.005) * 5;
                    contX += drift;
                    ctx.save();
                    ctx.translate(contX, contY);
                    // Draw continent blob
                    ctx.fillStyle = era.land;
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    if (c.shape === 'circle') {
                      ctx.arc(0, 0, contR, 0, Math.PI * 2);
                    } else if (c.shape === 'pangaea') {
                      // Large irregular mass
                      for (var a = 0; a < Math.PI * 2; a += 0.15) {
                        var rr = contR * (0.7 + 0.3 * Math.sin(a * 3 + 1) + 0.15 * Math.cos(a * 5 + 2));
                        var px = Math.cos(a) * rr;
                        var py = Math.sin(a) * rr;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                      }
                      ctx.closePath();
                    } else if (c.shape === 'pangaea_forming') {
                      for (var a = 0; a < Math.PI * 2; a += 0.15) {
                        var rr = contR * (0.6 + 0.25 * Math.sin(a * 4) + 0.15 * Math.cos(a * 7 + 3));
                        var px = Math.cos(a) * rr;
                        var py = Math.sin(a) * rr;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                      }
                      ctx.closePath();
                    } else {
                      // Blob shape
                      for (var a = 0; a < Math.PI * 2; a += 0.2) {
                        var rr = contR * (0.75 + 0.25 * Math.sin(a * 3 + c.cx * 5) + 0.1 * Math.cos(a * 5 + c.cy * 3));
                        var px = Math.cos(a) * rr;
                        var py = Math.sin(a) * rr;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                      }
                      ctx.closePath();
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    // Mountain-like highlights
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.beginPath();
                    ctx.arc(-contR * 0.2, -contR * 0.2, contR * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    // Label
                    if (c.label) {
                      ctx.fillStyle = 'rgba(255,255,255,0.85)';
                      ctx.font = 'bold ' + Math.max(8, Math.min(11, contR * 0.3)) + 'px Inter, system-ui';
                      ctx.textAlign = 'center';
                      ctx.fillText(c.label, 0, contR * 0.15);
                    }
                    ctx.restore();
                  });
                  // Sphere shading (3D effect)
                  var shading = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R);
                  shading.addColorStop(0, 'rgba(255,255,255,0.12)');
                  shading.addColorStop(0.5, 'transparent');
                  shading.addColorStop(0.8, 'rgba(0,0,0,0.2)');
                  shading.addColorStop(1, 'rgba(0,0,0,0.5)');
                  ctx.fillStyle = shading;
                  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
                  ctx.restore();
                  // Ring border
                  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.arc(cx, cy, R, 0, Math.PI * 2);
                  ctx.stroke();
                  // Era label
                  ctx.fillStyle = 'rgba(255,255,255,0.7)';
                  ctx.font = 'bold 13px Inter, system-ui';
                  ctx.textAlign = 'left';
                  ctx.fillText(era.name, 15, H - 15);
                }
                drawEarth();
              }, 50);
              return null;
            })(),
`;

// Insert before the quiz tab
const earthLines = earthCode.split('\n').filter(l => l !== '');
const quizInsertIdx = quizTabLine;
lines.splice(quizInsertIdx, 0, ...earthLines);
console.log('Feature 2: Inserted ' + earthLines.length + ' Earth canvas lines at line ' + (quizInsertIdx + 1));

// ═══════════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════════════════════════
const output = lines.join(eol);
fs.writeFileSync('stem_lab_module.js', output, 'utf8');
console.log('Written ' + lines.length + ' lines');
console.log('DONE — Features applied');
