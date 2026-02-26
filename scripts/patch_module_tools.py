"""
Add 8 tool picker entries and 8 tool UIs to stem_lab_module.js using line-level insertion.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js")
lines = SRC.read_text(encoding="utf-8").split("\n")

# Find the multtable closing entry - search for the "}]" that ends the tool array
mult_end = None
for i, line in enumerate(lines):
    if "id: 'multtable'" in line:
        # Scan forward to find the closing }]
        for j in range(i, min(i+10, len(lines))):
            if "ready: true" in lines[j]:
                for k in range(j, min(j+3, len(lines))):
                    if "}]" in lines[k]:
                        mult_end = k
                        break
                break
        break

if mult_end is None:
    print("❌ Could not find multtable end")
else:
    print(f"Found multtable end at line {mult_end+1}")
    # Insert new entries before the }]
    indent = "  "
    new_entries = f"""{indent}  }}, {{
{indent}  id: 'funcGrapher', icon: '\U0001f4c8', label: 'Function Grapher',
{indent}  desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
{indent}  color: 'indigo', ready: true
{indent}}}, {{
{indent}  id: 'physics', icon: '\u26a1', label: 'Physics Simulator',
{indent}  desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
{indent}  color: 'sky', ready: true
{indent}}}, {{
{indent}  id: 'chemBalance', icon: '\u2697\ufe0f', label: 'Equation Balancer',
{indent}  desc: 'Balance chemical equations with visual atom counting.',
{indent}  color: 'lime', ready: true
{indent}}}, {{
{indent}  id: 'punnett', icon: '\U0001f9ec', label: 'Punnett Square',
{indent}  desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
{indent}  color: 'violet', ready: true
{indent}}}, {{
{indent}  id: 'circuit', icon: '\U0001f50c', label: 'Circuit Builder',
{indent}  desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
{indent}  color: 'yellow', ready: true
{indent}}}, {{
{indent}  id: 'dataPlot', icon: '\U0001f4ca', label: 'Data Plotter',
{indent}  desc: 'Plot data points, fit trend lines, calculate correlation.',
{indent}  color: 'teal', ready: true
{indent}}}, {{
{indent}  id: 'inequality', icon: '\U0001f3a8', label: 'Inequality Grapher',
{indent}  desc: 'Graph inequalities on number lines and coordinate planes.',
{indent}  color: 'fuchsia', ready: true
{indent}}}, {{
{indent}  id: 'molecule', icon: '\U0001f52c', label: 'Molecule Builder',
{indent}  desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
{indent}  color: 'stone', ready: true"""
    
    # Replace the line that has "ready: true" + closing with our new entries
    old_close = lines[mult_end]
    # Insert our entries before the }]
    lines[mult_end] = old_close.replace("ready: true\r", "ready: true\r") # keep as is
    # Actually, insert BEFORE the }] line
    # The }] is on the same line as ready: true
    # Let's replace the line
    if "}]" in lines[mult_end]:
        lines[mult_end] = lines[mult_end].replace("}]", "}")
        new_entry_lines = new_entries.split("\n")
        for idx, el in enumerate(new_entry_lines):
            lines.insert(mult_end + 1 + idx, el)
        # Add closing ]
        lines.insert(mult_end + 1 + len(new_entry_lines), "  }]")
        print(f"✅ Added 8 tool picker entries ({len(new_entry_lines)} lines)")
    else:
        print("❌ }] not on expected line")

# Now find where to add tool UIs - before the closing of the component
# Search for the closing pattern: "}, t('explore.next_challenge'))))))));"
comp_end = None
for i in range(len(lines)-1, -1, -1):
    if "t('explore.next_challenge')" in lines[i]:
        comp_end = i
        break

if comp_end is None:
    print("❌ Could not find component end marker")
else:
    print(f"Found component end at line {comp_end+1}")
    
    # Helper to create React.createElement shorthand
    def ce(tag, props_str, *children):
        return f'React.createElement("{tag}", {props_str}'
    
    # Build all 8 tool UIs as a single string to insert after comp_end
    tool_uis = '''

// ═══════════════════════════════════════════════════════
// NEW TOOLS: Function Grapher, Physics, Chem, Punnett, Circuit, Data, Inequality, Molecule
// ═══════════════════════════════════════════════════════

), stemLabTab === 'explore' && stemLabTool === 'funcGrapher' && (() => {
  const d = labToolData.funcGrapher;
  const upd = (key, val) => setLabToolData(prev => ({...prev, funcGrapher: {...prev.funcGrapher, [key]: val}}));
  const W = 400, H = 300, pad = 40;
  const xR = d.range, yR = d.range;
  const toSX = x => pad + ((x - xR.xMin) / (xR.xMax - xR.xMin)) * (W - 2*pad);
  const toSY = y => (H - pad) - ((y - yR.yMin) / (yR.yMax - yR.yMin)) * (H - 2*pad);
  const pts = [];
  for (let px = 0; px <= W - 2*pad; px += 2) {
    const x = xR.xMin + (px / (W - 2*pad)) * (xR.xMax - xR.xMin);
    let y = 0;
    if (d.type === 'linear') y = d.a * x + d.b;
    else if (d.type === 'quadratic') y = d.a * x * x + d.b * x + d.c;
    else if (d.type === 'trig') y = d.a * Math.sin(d.b * x + d.c);
    if (y >= yR.yMin && y <= yR.yMax) pts.push(`${toSX(x)},${toSY(y)}`);
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center justify-between mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "📈 Function Grapher"),
      React.createElement("div", {className: "flex gap-1"},
        ["linear","quadratic","trig"].map(t2 => React.createElement("button", {key: t2, onClick: () => upd("type", t2), className: `px-3 py-1 rounded-lg text-xs font-bold transition-all ${d.type === t2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}, t2))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-slate-200", style: {maxHeight: "320px"}},
      React.createElement("line", {x1: pad, y1: toSY(0), x2: W-pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1}),
      React.createElement("line", {x1: toSX(0), y1: pad, x2: toSX(0), y2: H-pad, stroke: "#94a3b8", strokeWidth: 1}),
      pts.length > 1 && React.createElement("polyline", {points: pts.join(" "), fill: "none", stroke: "#4f46e5", strokeWidth: 2.5}),
      React.createElement("text", {x: W/2, y: H-8, textAnchor: "middle", className: "text-[10px] fill-slate-400"}, `f(x) = ${d.type === 'linear' ? d.a+'x + '+d.b : d.type === 'quadratic' ? d.a+'x² + '+d.b+'x + '+d.c : d.a+'sin('+d.b+'x + '+d.c+')'}`)
    ),
    React.createElement("div", {className: "grid grid-cols-3 gap-3 mt-3"},
      [{k:'a',label:'a',min:-5,max:5,step:0.1},{k:'b',label:'b',min:-5,max:5,step:0.1},{k:'c',label:'c',min:-5,max:5,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-slate-500"}, s.label + " = " + d[s.k]),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-indigo-600"})
        )
      )
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id: 'fg-'+Date.now(), tool: 'funcGrapher', label: d.type+': a='+d.a+' b='+d.b, data: {...d}, timestamp: Date.now()}]); addToast('📸 Function snapshot saved!', 'success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'physics' && (() => {
  const d = labToolData.physics;
  const upd = (key, val) => setLabToolData(prev => ({...prev, physics: {...prev.physics, [key]: val}}));
  const W = 440, H = 280, pad = 30;
  const rad = d.angle * Math.PI / 180;
  const vx = d.velocity * Math.cos(rad), vy = d.velocity * Math.sin(rad);
  const tFlight = 2 * vy / d.gravity;
  const range = vx * tFlight;
  const maxH = (vy * vy) / (2 * d.gravity);
  const scale = Math.min((W - 2*pad) / Math.max(range, 1), (H - 2*pad) / Math.max(maxH, 1)) * 0.85;
  const trajPts = [];
  for (let i = 0; i <= 50; i++) {
    const tt = (i / 50) * tFlight;
    const px = pad + vx * tt * scale;
    const py = (H - pad) - (vy * tt - 0.5 * d.gravity * tt * tt) * scale;
    if (px >= pad && px <= W-pad && py >= pad && py <= H-pad) trajPts.push(`${px},${py}`);
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "⚡ Physics Simulator")
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-sky-50 to-white rounded-xl border border-sky-200", style: {maxHeight: "300px"}},
      React.createElement("line", {x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: "#65a30d", strokeWidth: 2}),
      trajPts.length > 1 && React.createElement("polyline", {points: trajPts.join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 2.5, strokeDasharray: "4 2"}),
      React.createElement("line", {x1: pad, y1: H-pad, x2: pad + Math.cos(rad)*60, y2: H-pad - Math.sin(rad)*60, stroke: "#3b82f6", strokeWidth: 3, markerEnd: "url(#arrow)"}),
      React.createElement("defs", null, React.createElement("marker", {id: "arrow", viewBox: "0 0 10 10", refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto"}, React.createElement("path", {d: "M 0 0 L 10 5 L 0 10 z", fill: "#3b82f6"}))),
      React.createElement("text", {x: W/2, y: 20, textAnchor: "middle", className: "text-xs", fill: "#64748b"}, `Range: ${range.toFixed(1)}m | Max Height: ${maxH.toFixed(1)}m | Time: ${tFlight.toFixed(2)}s`)
    ),
    React.createElement("div", {className: "grid grid-cols-3 gap-3 mt-3"},
      [{k:'angle',label:'Angle (°)',min:5,max:85,step:1},{k:'velocity',label:'Velocity (m/s)',min:5,max:50,step:1},{k:'gravity',label:'Gravity (m/s²)',min:1,max:20,step:0.1}].map(s =>
        React.createElement("div", {key: s.k, className: "text-center"},
          React.createElement("label", {className: "text-xs font-bold text-slate-500"}, s.label + ": " + d[s.k]),
          React.createElement("input", {type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-sky-600"})
        )
      )
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'ph-'+Date.now(), tool:'physics', label: d.angle+'° '+d.velocity+'m/s', data:{...d}, timestamp: Date.now()}]); addToast('📸 Physics snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'chemBalance' && (() => {
  const d = labToolData.chemBalance;
  const upd = (key, val) => setLabToolData(prev => ({...prev, chemBalance: {...prev.chemBalance, [key]: val}}));
  const presets = [
    {name: 'Water', eq: 'H₂ + O₂ → H₂O', coeffs: [2,1,2,0], target: [2,1,2,0], atoms: {H:[2,0,2], O:[0,2,1]}},
    {name: 'Rust', eq: 'Fe + O₂ → Fe₂O₃', coeffs: [1,1,1,0], target: [4,3,2,0], atoms: {Fe:[1,0,2], O:[0,2,3]}},
    {name: 'Combustion', eq: 'CH₄ + O₂ → CO₂ + H₂O', coeffs: [1,1,1,1], target: [1,2,1,2], atoms: {C:[1,0,1,0], H:[4,0,0,2], O:[0,2,2,1]}},
    {name: 'Photosynthesis', eq: 'CO₂ + H₂O → C₆H₁₂O₆ + O₂', coeffs: [1,1,1,1], target: [6,6,1,6], atoms: {C:[1,0,6,0], O:[2,1,6,2], H:[0,2,12,0]}},
  ];
  const preset = presets.find(p => p.name === d.equation) || presets[0];
  const checkBalance = () => {
    const isCorrect = d.coefficients.every((c, i) => c === preset.target[i]);
    upd('feedback', isCorrect ? {correct: true, msg: '✅ Balanced! Atom counts match on both sides.'} : {correct: false, msg: '❌ Not balanced yet. Check atom counts on each side.'});
  };
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "⚗️ Equation Balancer"),
      React.createElement("div", {className: "flex gap-1 ml-auto"}, presets.map(p => React.createElement("button", {key: p.name, onClick: () => { upd('equation', p.name); upd('coefficients', [1,1,1,1]); upd('feedback', null); }, className: `px-3 py-1 rounded-lg text-xs font-bold ${d.equation === p.name ? 'bg-lime-600 text-white' : 'bg-slate-100 text-slate-600'}`}, p.name)))
    ),
    React.createElement("div", {className: "bg-white rounded-xl border border-lime-200 p-6 text-center"},
      React.createElement("p", {className: "text-2xl font-bold text-slate-800 mb-4 tracking-wide"},
        d.coefficients.map((c, i) => (i > 0 && i < preset.target.filter(t => t > 0).length ? (i < preset.eq.split('→')[0].split('+').length ? ' + ' : (i === preset.eq.split('→')[0].split('+').length ? ' → ' : ' + ')) : '') + (c > 1 ? c : '') + preset.eq.split(/[+→]/).map(s => s.trim())[i]).join('')
      ),
      React.createElement("div", {className: "flex justify-center gap-4 mb-4"},
        d.coefficients.slice(0, preset.target.filter(t => t > 0).length).map((c, i) =>
          React.createElement("div", {key: i, className: "flex flex-col items-center gap-1"},
            React.createElement("button", {onClick: () => { const nc = [...d.coefficients]; nc[i] = Math.min(10, nc[i]+1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200"}, "+"),
            React.createElement("span", {className: "text-xl font-bold text-slate-700 w-8 text-center"}, c),
            React.createElement("button", {onClick: () => { const nc = [...d.coefficients]; nc[i] = Math.max(1, nc[i]-1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-red-50 rounded-lg font-bold text-red-500 hover:bg-red-100"}, "−")
          )
        )
      ),
      React.createElement("button", {onClick: checkBalance, className: "px-6 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700"}, "⚖️ Check Balance"),
      d.feedback && React.createElement("p", {className: "mt-3 text-sm font-bold " + (d.feedback.correct ? 'text-green-600' : 'text-red-600')}, d.feedback.msg)
    )
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'punnett' && (() => {
  const d = labToolData.punnett;
  const upd = (key, val) => setLabToolData(prev => ({...prev, punnett: {...prev.punnett, [key]: val}}));
  const grid = [[d.parent1[0]+d.parent2[0], d.parent1[0]+d.parent2[1]], [d.parent1[1]+d.parent2[0], d.parent1[1]+d.parent2[1]]];
  const counts = {};
  grid.flat().forEach(g => { counts[g] = (counts[g]||0)+1; });
  const isHomo = a => a[0] === a[1];
  const phenotype = g => g.includes(g[0].toUpperCase()) ? 'Dominant' : 'Recessive';
  return React.createElement("div", {className: "max-w-2xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🧬 Punnett Square")
    ),
    React.createElement("div", {className: "flex gap-6 mb-4 justify-center"},
      [['Parent 1', 'parent1', 'violet'], ['Parent 2', 'parent2', 'blue']].map(([label, key, color]) =>
        React.createElement("div", {key, className: "text-center"},
          React.createElement("label", {className: `text-sm font-bold text-${color}-700 mb-2 block`}, label),
          React.createElement("div", {className: "flex gap-2"},
            [0,1].map(i => React.createElement("select", {key: i, value: d[key][i], onChange: e => { const na = [...d[key]]; na[i] = e.target.value; upd(key, na); }, className: `px-3 py-2 border-2 border-${color}-200 rounded-lg font-bold text-lg text-center`},
              ['A','a','B','b','C','c','R','r','T','t'].map(a => React.createElement("option", {key: a, value: a}, a))
            ))
          )
        )
      )
    ),
    React.createElement("div", {className: "bg-white rounded-xl border border-violet-200 p-4 inline-block mx-auto", style: {display: 'flex', justifyContent: 'center'}},
      React.createElement("table", {className: "border-collapse"},
        React.createElement("thead", null, React.createElement("tr", null,
          React.createElement("th", {className: "w-16 h-16"}),
          d.parent2.map((a, i) => React.createElement("th", {key: i, className: "w-16 h-16 text-center text-lg font-bold text-blue-600 bg-blue-50 border border-blue-200"}, a))
        )),
        React.createElement("tbody", null, d.parent1.map((a, r) =>
          React.createElement("tr", {key: r},
            React.createElement("td", {className: "w-16 h-16 text-center text-lg font-bold text-violet-600 bg-violet-50 border border-violet-200"}, a),
            grid[r].map((g, c) => React.createElement("td", {key: c, className: `w-16 h-16 text-center text-lg font-bold border border-slate-200 ${phenotype(g)==='Dominant' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}, g))
          )
        ))
      )
    ),
    React.createElement("div", {className: "mt-4 bg-slate-50 rounded-lg p-3 text-center"},
      React.createElement("p", {className: "text-sm font-bold text-slate-600"}, "Genotype Ratios: " + Object.entries(counts).map(([g,c]) => g+': '+c+'/4').join(' | ')),
      React.createElement("p", {className: "text-xs text-slate-400 mt-1"}, "Phenotype: " + grid.flat().filter(g => phenotype(g)==='Dominant').length + "/4 Dominant, " + grid.flat().filter(g => phenotype(g)==='Recessive').length + "/4 Recessive")
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'pn-'+Date.now(), tool:'punnett', label: d.parent1.join('')+' × '+d.parent2.join(''), data:{...d}, timestamp: Date.now()}]); addToast('📸 Punnett snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'circuit' && (() => {
  const d = labToolData.circuit;
  const upd = (key, val) => setLabToolData(prev => ({...prev, circuit: {...prev.circuit, [key]: val}}));
  const totalR = d.components.filter(c => c.type==='resistor').reduce((s,c) => s + c.value, 0) || 1;
  const current = d.voltage / totalR;
  const power = d.voltage * current;
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🔌 Circuit Builder")
    ),
    React.createElement("div", {className: "flex gap-2 mb-3"},
      React.createElement("button", {onClick: () => upd('components', [...d.components, {type:'resistor', value: 100, id: Date.now()}]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200"}, "➕ Add Resistor"),
      React.createElement("button", {onClick: () => upd('components', [...d.components, {type:'bulb', value: 50, id: Date.now()}]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200"}, "💡 Add Bulb"),
      React.createElement("button", {onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100"}, "🗑 Clear")
    ),
    React.createElement("div", {className: "bg-white rounded-xl border border-yellow-200 p-4"},
      React.createElement("div", {className: "flex items-center gap-3 mb-4"},
        React.createElement("span", {className: "text-2xl"}, "🔋"),
        React.createElement("span", {className: "text-sm font-bold text-slate-600"}, "Battery:"),
        React.createElement("input", {type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600"}),
        React.createElement("span", {className: "font-bold text-yellow-700"}, d.voltage + "V")
      ),
      d.components.length === 0 && React.createElement("p", {className: "text-center text-slate-400 py-8"}, "Add components to build your circuit"),
      React.createElement("div", {className: "flex flex-wrap gap-2"},
        d.components.map((comp, i) => React.createElement("div", {key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200"},
          React.createElement("span", null, comp.type === 'resistor' ? '⫘' : '💡'),
          React.createElement("input", {type: "number", min: 1, max: 10000, value: comp.value, onChange: e => { const nc = [...d.components]; nc[i].value = parseInt(e.target.value)||1; upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono"}),
          React.createElement("span", {className: "text-xs text-slate-500"}, "Ω"),
          React.createElement("button", {onClick: () => upd('components', d.components.filter((_,j) => j !== i)), className: "text-red-400 hover:text-red-600"}, "×")
        ))
      )
    ),
    React.createElement("div", {className: "mt-3 grid grid-cols-3 gap-3"},
      [{label:'Total Resistance', val: totalR.toFixed(1)+'Ω', color:'yellow'}, {label:'Current', val: current.toFixed(3)+'A', color:'blue'}, {label:'Power', val: power.toFixed(2)+'W', color:'red'}].map(m =>
        React.createElement("div", {key: m.label, className: `text-center p-3 bg-${m.color}-50 rounded-xl border border-${m.color}-200`},
          React.createElement("p", {className: `text-xs font-bold text-${m.color}-600 uppercase`}, m.label),
          React.createElement("p", {className: `text-lg font-bold text-${m.color}-800`}, m.val)
        )
      )
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'ci-'+Date.now(), tool:'circuit', label: d.components.length+' parts '+d.voltage+'V', data:{...d}, timestamp: Date.now()}]); addToast('📸 Circuit snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'dataPlot' && (() => {
  const d = labToolData.dataPlot;
  const upd = (key, val) => setLabToolData(prev => ({...prev, dataPlot: {...prev.dataPlot, [key]: val}}));
  const W = 400, H = 300, pad = 40;
  const allX = d.points.map(p => p.x), allY = d.points.map(p => p.y);
  const xMin = allX.length ? Math.min(...allX) - 1 : 0, xMax = allX.length ? Math.max(...allX) + 1 : 10;
  const yMin = allY.length ? Math.min(...allY) - 1 : 0, yMax = allY.length ? Math.max(...allY) + 1 : 10;
  const toSX = x => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2*pad);
  const toSY = y => (H - pad) - ((y - yMin) / (yMax - yMin || 1)) * (H - 2*pad);
  // Linear regression
  let slope = 0, intercept = 0, r2 = 0;
  if (d.points.length >= 2) {
    const n = d.points.length;
    const sumX = allX.reduce((s,v)=>s+v,0), sumY = allY.reduce((s,v)=>s+v,0);
    const sumXY = d.points.reduce((s,p)=>s+p.x*p.y,0), sumX2 = allX.reduce((s,v)=>s+v*v,0);
    slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX || 1);
    intercept = (sumY - slope*sumX) / n;
    const yMean = sumY/n;
    const ssTot = allY.reduce((s,y)=>s+(y-yMean)*(y-yMean),0);
    const ssRes = d.points.reduce((s,p)=>s+(p.y - (slope*p.x+intercept))*(p.y - (slope*p.x+intercept)),0);
    r2 = ssTot > 0 ? 1 - ssRes/ssTot : 0;
  }
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "📊 Data Plotter"),
      React.createElement("span", {className: "text-xs text-slate-400 ml-auto"}, d.points.length + " points")
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-teal-200 cursor-crosshair", style: {maxHeight: "320px"},
      onClick: e => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const sx = (e.clientX - rect.left) / rect.width * W;
        const sy = (e.clientY - rect.top) / rect.height * H;
        const x = Math.round((xMin + (sx - pad) / (W - 2*pad) * (xMax - xMin)) * 10) / 10;
        const y = Math.round((yMin + ((H - pad - sy) / (H - 2*pad)) * (yMax - yMin)) * 10) / 10;
        upd('points', [...d.points, {x, y}]);
      }},
      React.createElement("line", {x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: "#94a3b8", strokeWidth: 1}),
      React.createElement("line", {x1: pad, y1: pad, x2: pad, y2: H-pad, stroke: "#94a3b8", strokeWidth: 1}),
      d.points.map((p, i) => React.createElement("circle", {key: i, cx: toSX(p.x), cy: toSY(p.y), r: 5, fill: "#0d9488", stroke: "#fff", strokeWidth: 1.5})),
      d.points.length >= 2 && React.createElement("line", {x1: toSX(xMin), y1: toSY(slope*xMin+intercept), x2: toSX(xMax), y2: toSY(slope*xMax+intercept), stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6 3"})
    ),
    React.createElement("div", {className: "flex gap-3 mt-3"},
      React.createElement("button", {onClick: () => upd('points', d.points.slice(0, -1)), className: "px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm"}, "↩ Undo"),
      React.createElement("button", {onClick: () => upd('points', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm"}, "🗑 Clear"),
      d.points.length >= 2 && React.createElement("span", {className: "text-xs text-slate-500 self-center ml-auto"}, "y = "+slope.toFixed(2)+"x + "+intercept.toFixed(2)+" | r² = "+r2.toFixed(3))
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'dp-'+Date.now(), tool:'dataPlot', label: d.points.length+' pts r²='+r2.toFixed(2), data:{points:[...d.points]}, timestamp: Date.now()}]); addToast('📸 Data snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'inequality' && (() => {
  const d = labToolData.inequality;
  const upd = (key, val) => setLabToolData(prev => ({...prev, inequality: {...prev.inequality, [key]: val}}));
  const W = 400, H = 100, pad = 30;
  const toSX = x => pad + ((x - d.range.min) / (d.range.max - d.range.min)) * (W - 2*pad);
  const parseIneq = expr => { const m = expr.match(/([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/); return m ? {v: m[1], op: m[2], val: parseFloat(m[3])} : null; };
  const ineq = parseIneq(d.expr);
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🎨 Inequality Grapher")
    ),
    React.createElement("div", {className: "flex items-center gap-2 mb-3"},
      React.createElement("input", {type: "text", value: d.expr, onChange: e => upd('expr', e.target.value), className: "px-4 py-2 border-2 border-fuchsia-300 rounded-lg font-mono text-lg text-center w-48 focus:ring-2 focus:ring-fuchsia-400 outline-none", placeholder: "x > 3"}),
      React.createElement("div", {className: "flex gap-1"},
        ['x > 3','x < -2','x >= 0','x <= 5'].map(ex => React.createElement("button", {key: ex, onClick: () => upd('expr', ex), className: "px-2 py-1 text-[10px] font-bold bg-fuchsia-50 text-fuchsia-600 rounded border border-fuchsia-200 hover:bg-fuchsia-100"}, ex))
      )
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-fuchsia-200"},
      ineq && React.createElement("rect", {x: ineq.op.includes('>') ? toSX(ineq.val) : pad, y: 20, width: ineq.op.includes('>') ? W-pad-toSX(ineq.val) : toSX(ineq.val)-pad, height: 40, fill: "rgba(217,70,239,0.15)", rx: 4}),
      React.createElement("line", {x1: pad, y1: 40, x2: W-pad, y2: 40, stroke: "#94a3b8", strokeWidth: 2}),
      Array.from({length: d.range.max - d.range.min + 1}, (_, i) => d.range.min + i).map(n =>
        React.createElement("g", {key: n},
          React.createElement("line", {x1: toSX(n), y1: 35, x2: toSX(n), y2: 45, stroke: "#64748b", strokeWidth: 1}),
          React.createElement("text", {x: toSX(n), y: 75, textAnchor: "middle", fill: "#64748b", style: {fontSize: '10px'}}, n)
        )
      ),
      ineq && React.createElement("circle", {cx: toSX(ineq.val), cy: 40, r: 6, fill: ineq.op.includes('=') ? '#d946ef' : 'white', stroke: "#d946ef", strokeWidth: 2.5}),
      ineq && React.createElement("line", {x1: toSX(ineq.val) + (ineq.op.includes('>') ? 10 : -10), y1: 40, x2: ineq.op.includes('>') ? W-pad : pad, y2: 40, stroke: "#d946ef", strokeWidth: 3})
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'iq-'+Date.now(), tool:'inequality', label: d.expr, data:{...d}, timestamp: Date.now()}]); addToast('📸 Inequality snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

, stemLabTab === 'explore' && stemLabTool === 'molecule' && (() => {
  const d = labToolData.molecule;
  const upd = (key, val) => setLabToolData(prev => ({...prev, molecule: {...prev.molecule, [key]: val}}));
  const W = 400, H = 300;
  const presets = [
    {name:'H₂O', atoms:[{el:'O',x:200,y:120,color:'#ef4444'},{el:'H',x:140,y:190,color:'#60a5fa'},{el:'H',x:260,y:190,color:'#60a5fa'}], bonds:[[0,1],[0,2]], formula:'H2O'},
    {name:'CO₂', atoms:[{el:'C',x:200,y:150,color:'#1e293b'},{el:'O',x:120,y:150,color:'#ef4444'},{el:'O',x:280,y:150,color:'#ef4444'}], bonds:[[0,1],[0,2]], formula:'CO2'},
    {name:'CH₄', atoms:[{el:'C',x:200,y:150,color:'#1e293b'},{el:'H',x:200,y:80,color:'#60a5fa'},{el:'H',x:270,y:180,color:'#60a5fa'},{el:'H',x:130,y:180,color:'#60a5fa'},{el:'H',x:200,y:220,color:'#60a5fa'}], bonds:[[0,1],[0,2],[0,3],[0,4]], formula:'CH4'},
    {name:'NaCl', atoms:[{el:'Na',x:160,y:150,color:'#a855f7'},{el:'Cl',x:240,y:150,color:'#22c55e'}], bonds:[[0,1]], formula:'NaCl'},
    {name:'O₂', atoms:[{el:'O',x:170,y:150,color:'#ef4444'},{el:'O',x:230,y:150,color:'#ef4444'}], bonds:[[0,1]], formula:'O2'},
  ];
  return React.createElement("div", {className: "max-w-3xl mx-auto animate-in fade-in duration-200"},
    React.createElement("div", {className: "flex items-center gap-3 mb-4"},
      React.createElement("button", {onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg"}, React.createElement(ArrowLeft, {size: 18, className: "text-slate-500"})),
      React.createElement("h3", {className: "text-lg font-bold text-slate-800"}, "🔬 Molecule Builder"),
      React.createElement("div", {className: "flex gap-1 ml-auto"}, presets.map(p => React.createElement("button", {key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({...a}))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: `px-2 py-1 rounded-lg text-xs font-bold ${d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}, p.name)))
    ),
    React.createElement("svg", {viewBox: `0 0 ${W} ${H}`, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: {maxHeight: "300px"}},
      d.bonds.map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", {key: 'b'+i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round"}) : null),
      d.atoms.map((a, i) => React.createElement("g", {key: i},
        React.createElement("circle", {cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: {filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'}}),
        React.createElement("text", {x: a.x, y: a.y+5, textAnchor: "middle", fill: "white", style: {fontSize: '14px', fontWeight: 'bold'}}, a.el)
      ))
    ),
    React.createElement("div", {className: "mt-3 text-center"},
      React.createElement("span", {className: "text-sm font-bold text-slate-500"}, "Formula: "),
      React.createElement("span", {className: "text-lg font-bold text-slate-800"}, d.formula || '—'),
      React.createElement("span", {className: "text-xs text-slate-400 ml-4"}, d.atoms.length + " atoms, " + d.bonds.length + " bonds")
    ),
    React.createElement("button", {onClick: () => { setToolSnapshots(prev => [...prev, {id:'ml-'+Date.now(), tool:'molecule', label: d.formula || 'molecule', data:{atoms: d.atoms.map(a=>({...a})), bonds: [...d.bonds], formula: d.formula}, timestamp: Date.now()}]); addToast('📸 Molecule snapshot saved!','success'); }, className: "mt-3 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200"}, "📸 Snapshot")
  );
})()

'''
    
    # Insert each tool UI line after comp_end
    tool_lines = tool_uis.strip().split("\n")
    for idx, tl in enumerate(tool_lines):
        lines.insert(comp_end + 1 + idx, tl)
    
    print(f"✅ Inserted 8 tool UIs ({len(tool_lines)} lines after line {comp_end+1})")

SRC.write_text("\n".join(lines), encoding="utf-8")
print(f"Total lines: {len(lines)}")
