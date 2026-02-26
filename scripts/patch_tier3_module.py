"""
Add 3 Tier 3 tools to stem_lab_module.js:
1. Tool picker entries (calculus, wave, cell) 
2. Full interactive UIs for all 3
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js")
lines = SRC.read_text(encoding="utf-8").split("\n")

# ──────────────────────────────────────────────────────
# PATCH 1: Add tool picker entries after molecule
# ──────────────────────────────────────────────────────
mol_picker_end = None
for i, line in enumerate(lines):
    if "id: 'molecule'" in line:
        # Find the closing of this entry (next line with ready: true)
        for j in range(i, min(i+6, len(lines))):
            if "ready: true" in lines[j]:
                mol_picker_end = j
                break
        break

if mol_picker_end is None:
    print("PICKER ❌ Could not find molecule picker entry")
else:
    print(f"Found molecule picker end at line {mol_picker_end+1}")
    new_entries = [
        "  }, {",
        "    id: 'calculus', icon: '∫', label: 'Calculus Visualizer',",
        "    desc: 'Riemann sums, area under curves, and derivative tangent lines.',",
        "    color: 'red', ready: true",
        "  }, {",
        "    id: 'wave', icon: '🌊', label: 'Wave Simulator',",
        "    desc: 'Adjust frequency, amplitude, wavelength. Explore interference patterns.',",
        "    color: 'cyan', ready: true",
        "  }, {",
        "    id: 'cell', icon: '🧫', label: 'Cell Diagram',",
        "    desc: 'Interactive labeled cell with organelles. Animal and plant cells.',",
        "    color: 'green', ready: true",
    ]
    for idx, el in enumerate(new_entries):
        lines.insert(mol_picker_end + 1 + idx, el)
    print(f"PICKER ✅ Added 3 tool picker entries")

# ──────────────────────────────────────────────────────
# PATCH 2: Add tool UIs before component end
# ──────────────────────────────────────────────────────
comp_end = None
for i in range(len(lines)-1, -1, -1):
    if "t('explore.next_challenge')" in lines[i]:
        comp_end = i
        break

if comp_end is None:
    print("UIS ❌ Could not find component end")
else:
    print(f"Found component end at line {comp_end+1}")
    
    tool_uis = '''

// ═══════════════════════════════════════════════════════
// TIER 3: Calculus Visualizer, Wave Simulator, Cell Diagram
// ═══════════════════════════════════════════════════════

), stemLabTab === 'explore' && stemLabTool === 'calculus' && (() => {
  const d = labToolData.calculus;
  const upd = (key, val) => setLabToolData(prev => ({...prev, calculus: {...prev.calculus, [key]: val}}));
  const W = 440, H = 300, pad = 40;
  const evalF = x => d.a * x * x + d.b * x + d.c;
  const xR = {min: -2, max: Math.max(d.xMax + 1, 6)};
  const yMax = Math.max(...Array.from({length: 50}, (_, i) => Math.abs(evalF(xR.min + i/49 * (xR.max - xR.min)))), 1);
  const yR = {min: -yMax * 0.2, max: yMax * 1.2};
  const toSX = x => pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2*pad);
  const toSY = y => (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2*pad);
  const dx = (d.xMax - d.xMin) / d.n;
  const rects = [];
  let area = 0;
  for (let i = 0; i < d.n; i++) {
    const xi = d.xMin + i * dx;
    const yi = d.mode === 'left' ? evalF(xi) : d.mode === 'right' ? evalF(xi + dx) : evalF(xi + dx/2);
    area += yi * dx;
    rects.push({x: xi, w: dx, h: yi});
  }
  const curvePts = [];
  for (let px = 0; px <= W - 2*pad; px += 2) {
    const x = xR.min + (px / (W - 2*pad)) * (xR.max - xR.min);
    curvePts.push(`${toSX(x)},${toSY(evalF(x))}`);
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "∫ Calculus Visualizer"),
      React.createElement("div", {className: "flex gap-1 ml-auto"},
        ["left","midpoint","right"].map(m => React.createElement("button", {key: m, onClick: () => upd("mode", m), className: `px-3 py-1 rounded-lg text-xs font-bold ${d.mode === m ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}, m))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-red-200", style: {maxHeight: "320px"}},
      React.createElement("line", {x1: pad, y1: toSY(0), x2: W-pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1}),
      React.createElement("line", {x1: toSX(0), y1: pad, x2: toSX(0), y2: H-pad, stroke: "#94a3b8", strokeWidth: 1}),
      rects.map((r, i) => React.createElement("rect", {key: i, x: toSX(r.x), y: r.h >= 0 ? toSY(r.h) : toSY(0), width: Math.abs(toSX(r.x + r.w) - toSX(r.x)), height: Math.abs(toSY(r.h) - toSY(0)), fill: "rgba(239,68,68,0.2)", stroke: "#ef4444", strokeWidth: 1})),
      curvePts.length > 1 && React.createElement("polyline", {points: curvePts.join(" "), fill: "none", stroke: "#1e293b", strokeWidth: 2.5}),
      React.createElement("rect", {x: toSX(d.xMin), y: pad, width: Math.abs(toSX(d.xMax) - toSX(d.xMin)), height: H-2*pad, fill: "none", stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 2"}),
      React.createElement("text", {x: W/2, y: H-8, textAnchor: "middle", className: "text-[10px]", fill: "#64748b"}, `f(x) = ${d.a}x² + ${d.b}x + ${d.c} | Area ≈ ${area.toFixed(3)} (n=${d.n}, ${d.mode})`)
    ),
    React.createElement("div", {className: "grid grid-cols-2 gap-3 mt-3"},
      [{k:'xMin',label:'a (lower)',min:-2,max:8,step:0.5},{k:'xMax',label:'b (upper)',min:1,max:10,step:0.5},{k:'n',label:'Rectangles (n)',min:2,max:50,step:1},{k:'a',label:'Coeff a',min:-3,max:3,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-slate-500"}, s.label + ": " + d[s.k]),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-red-600"})
        )
      )
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'calc-'+Date.now(), tool:'calculus', label: `∫[${d.xMin},${d.xMax}] n=${d.n}`, data:{...d}, timestamp: Date.now()}]); addToast('📸 Calculus snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'wave' && (() => {
  const d = labToolData.wave;
  const upd = (key, val) => setLabToolData(prev => ({...prev, wave: {...prev.wave, [key]: val}}));
  const W = 440, H = 250, pad = 30;
  const toSX = x => pad + (x / (4 * Math.PI)) * (W - 2*pad);
  const toSY = y => H/2 - y * (H/2 - pad);
  const wave1Pts = [], wave2Pts = [], sumPts = [];
  for (let px = 0; px <= W - 2*pad; px += 2) {
    const x = (px / (W - 2*pad)) * 4 * Math.PI;
    const y1 = d.amplitude * Math.sin(d.frequency * x + d.phase);
    wave1Pts.push(`${toSX(x)},${toSY(y1)}`);
    if (d.wave2) {
      const y2 = d.amp2 * Math.sin(d.freq2 * x);
      wave2Pts.push(`${toSX(x)},${toSY(y2)}`);
      sumPts.push(`${toSX(x)},${toSY(y1 + y2)}`);
    }
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🌊 Wave Simulator"),
      React.createElement("label", {className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer"},
        React.createElement("input", {type: "checkbox", checked: d.wave2, onChange: e => upd('wave2', e.target.checked), className: "accent-cyan-600"}),
        "Interference Mode"
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-cyan-50 to-white rounded-xl border border-cyan-200", style: {maxHeight: "260px"}},
      React.createElement("line", {x1: pad, y1: H/2, x2: W-pad, y2: H/2, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 2"}),
      wave1Pts.length > 1 && React.createElement("polyline", {points: wave1Pts.join(" "), fill: "none", stroke: "#0891b2", strokeWidth: 2.5}),
      wave2Pts.length > 1 && React.createElement("polyline", {points: wave2Pts.join(" "), fill: "none", stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "6 3"}),
      sumPts.length > 1 && React.createElement("polyline", {points: sumPts.join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 3}),
      React.createElement("text", {x: W-pad-5, y: H/2-5, textAnchor: "end", style: {fontSize: '9px'}, fill: "#0891b2"}, "Wave 1"),
      d.wave2 && React.createElement("text", {x: W-pad-5, y: H/2+15, textAnchor: "end", style: {fontSize: '9px'}, fill: "#f59e0b"}, "Wave 2"),
      d.wave2 && React.createElement("text", {x: W-pad-5, y: H/2+30, textAnchor: "end", style: {fontSize: '9px'}, fill: "#ef4444"}, "Superposition")
    ),
    React.createElement("div", {className: "grid grid-cols-3 gap-3 mt-3"},
      [{k:'amplitude',label:'Amplitude',min:0.1,max:2,step:0.1},{k:'frequency',label:'Frequency',min:0.1,max:4,step:0.1},{k:'phase',label:'Phase',min:0,max:6.28,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-cyan-600"}, s.label + ": " + Number(d[s.k]).toFixed(1)),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-cyan-600"})
        )
      )
    ),
    d.wave2 && React.createElement("div", {className: "grid grid-cols-2 gap-3 mt-2"},
      [{k:'amp2',label:'Wave 2 Amp',min:0.1,max:2,step:0.1},{k:'freq2',label:'Wave 2 Freq',min:0.1,max:4,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-amber-600"}, s.label + ": " + Number(d[s.k]).toFixed(1)),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-amber-500"})
        )
      )
    ),
    React.createElement("div", {className: "mt-3 bg-slate-50 rounded-lg p-2 text-center text-xs text-slate-500"},
      `λ = ${(2*Math.PI/d.frequency).toFixed(2)} | T = ${(1/d.frequency).toFixed(2)}s | v = ${(d.frequency * 2*Math.PI/d.frequency).toFixed(2)} units/s`
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'wv-'+Date.now(), tool:'wave', label: `A=${d.amplitude} f=${d.frequency}`, data:{...d}, timestamp: Date.now()}]); addToast('📸 Wave snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'cell' && (() => {
  const d = labToolData.cell;
  const upd = (key, val) => setLabToolData(prev => ({...prev, cell: {...prev.cell, [key]: val}}));
  const W = 440, H = 380;
  const organelles = [
    {id:'nucleus', label:'Nucleus', x:220, y:190, r:45, color:'#7c3aed', desc:'Contains DNA and controls cell activities. Has a double membrane with nuclear pores.'},
    {id:'mitochondria', label:'Mitochondria', x:130, y:140, r:22, color:'#ef4444', desc:'Powerhouse of the cell. Produces ATP through cellular respiration.'},
    {id:'ribosome', label:'Ribosomes', x:310, y:130, r:10, color:'#1e293b', desc:'Synthesize proteins from mRNA instructions. Found free or on rough ER.'},
    {id:'er', label:'Endoplasmic Reticulum', x:310, y:200, r:28, color:'#2563eb', desc:'Rough ER has ribosomes and makes proteins. Smooth ER makes lipids.'},
    {id:'golgi', label:'Golgi Apparatus', x:140, y:260, r:25, color:'#d97706', desc:'Packages and ships proteins. Modifies, sorts, and delivers cellular products.'},
    {id:'lysosome', label:'Lysosomes', x:310, y:280, r:16, color:'#16a34a', desc:'Digestive enzymes break down waste, old organelles, and foreign material.'},
    {id:'membrane', label:'Cell Membrane', x:220, y:360, r:20, color:'#0891b2', desc:'Phospholipid bilayer controls what enters/exits the cell. Semi-permeable.'},
    {id:'cytoplasm', label:'Cytoplasm', x:100, y:320, r:18, color:'#94a3b8', desc:'Gel-like fluid filling the cell. Site of many chemical reactions.'},
  ];
  if (d.type === 'plant') {
    organelles.push(
      {id:'cellwall', label:'Cell Wall', x:220, y:30, r:20, color:'#65a30d', desc:'Rigid outer layer made of cellulose. Provides structure and protection.'},
      {id:'chloroplast', label:'Chloroplast', x:330, y:330, r:22, color:'#22c55e', desc:'Site of photosynthesis. Contains chlorophyll to capture light energy.'},
      {id:'vacuole', label:'Central Vacuole', x:180, y:130, r:35, color:'#a78bfa', desc:'Large water-filled sac providing turgor pressure and storing nutrients.'}
    );
  }
  const selected = organelles.find(o => o.id === d.selectedOrganelle);
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🧫 Cell Diagram"),
      React.createElement("div", {className: "flex gap-1 ml-auto"},
        ["animal","plant"].map(t2 => React.createElement("button", {key: t2, onClick: () => { upd("type", t2); upd("selectedOrganelle", null); }, className: `px-3 py-1 rounded-lg text-xs font-bold capitalize ${d.type === t2 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}, t2 + " Cell"))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-green-50 to-white rounded-xl border border-green-200", style: {maxHeight: "380px"}},
      d.type === 'plant' ? React.createElement("rect", {x: 20, y: 20, width: W-40, height: H-40, rx: 8, fill: "none", stroke: "#65a30d", strokeWidth: 4}) : null,
      React.createElement("ellipse", {cx: W/2, cy: H/2, rx: W/2-30, ry: H/2-30, fill: "rgba(209,250,229,0.3)", stroke: "#0891b2", strokeWidth: 3}),
      organelles.map(o => React.createElement("g", {key: o.id, style: {cursor: 'pointer'}, onClick: () => upd('selectedOrganelle', o.id === d.selectedOrganelle ? null : o.id)},
        o.id === 'er' ? React.createElement("path", {d: `M${o.x-25},${o.y-15} Q${o.x},${o.y-25} ${o.x+25},${o.y-15} Q${o.x+10},${o.y} ${o.x+25},${o.y+15} Q${o.x},${o.y+25} ${o.x-25},${o.y+15} Q${o.x-10},${o.y} ${o.x-25},${o.y-15}`, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5}) :
        o.id === 'golgi' ? React.createElement("g", null, [-8,-3,2,7,12].map((off,i) => React.createElement("ellipse", {key: i, cx: o.x, cy: o.y+off, rx: o.r, ry: 4, fill: o.color+'44', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 2 : 1}))) :
        o.id === 'mitochondria' ? React.createElement("ellipse", {cx: o.x, cy: o.y, rx: o.r+8, ry: o.r, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5, transform: `rotate(-20 ${o.x} ${o.y})`}) :
        React.createElement("circle", {cx: o.x, cy: o.y, r: o.r, fill: o.color+'33', stroke: o.color, strokeWidth: d.selectedOrganelle === o.id ? 3 : 1.5}),
        d.labels && React.createElement("text", {x: o.x, y: o.y - o.r - 6, textAnchor: "middle", style: {fontSize: '9px', fontWeight: 'bold'}, fill: o.color}, o.label)
      ))
    ),
    selected && React.createElement("div", {className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: {borderColor: selected.color}},
      React.createElement("h4", {className: "font-bold text-sm mb-1", style: {color: selected.color}}, selected.label),
      React.createElement("p", {className: "text-xs text-slate-600 leading-relaxed"}, selected.desc)
    ),
    !selected && React.createElement("p", {className: "mt-3 text-center text-xs text-slate-400"}, "Click an organelle to learn about it"),
    React.createElement("div", {className: "flex gap-3 mt-3 items-center"},
      React.createElement("label", {className: "flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer"},
        React.createElement("input", {type: "checkbox", checked: d.labels, onChange: e => upd('labels', e.target.checked), className: "accent-green-600"}),
        "Show Labels"
      ),
      React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'ce-'+Date.now(), tool:'cell', label: d.type+' cell'+(d.selectedOrganelle ? ': '+d.selectedOrganelle : ''), data:{...d}, timestamp: Date.now()}]); addToast('📸 Cell snapshot saved!','success'); }, className: "ml-auto px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
    )
  );
})()

'''
    
    tool_lines = tool_uis.strip().split("\n")
    for idx, tl in enumerate(tool_lines):
        lines.insert(comp_end + 1 + idx, tl)
    
    print(f"UIS ✅ Inserted 3 Tier 3 tool UIs ({len(tool_lines)} lines)")

SRC.write_text("\n".join(lines), encoding="utf-8")
print(f"Total lines: {len(lines)}")
