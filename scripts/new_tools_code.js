
// ═══════════════════════════════════════════════════════
// SOLAR SYSTEM EXPLORER
// ═══════════════════════════════════════════════════════
stemLabTab === 'explore' && stemLabTool === 'solarSystem' && (() => {
    const d = labToolData.solarSystem;
    const upd = (key, val) => setLabToolData(prev => ({ ...prev, solarSystem: { ...prev.solarSystem, [key]: val } }));
    const PLANETS = [
        { name: 'Mercury', emoji: '\u2638', color: '#94a3b8', size: 12, dist: 0.4, moons: 0, diameter: '4,879 km', dayLen: '59 Earth days', yearLen: '88 days', temp: '\u2212180 to 430\u00B0C', fact: 'Smallest planet; no atmosphere to retain heat.' },
        { name: 'Venus', emoji: '\u2640', color: '#fbbf24', size: 16, dist: 0.7, moons: 0, diameter: '12,104 km', dayLen: '243 Earth days', yearLen: '225 days', temp: '462\u00B0C avg.', fact: 'Hottest planet due to runaway greenhouse effect. Rotates backwards!' },
        { name: 'Earth', emoji: '\uD83C\uDF0D', color: '#3b82f6', size: 17, dist: 1.0, moons: 1, diameter: '12,742 km', dayLen: '24 hours', yearLen: '365.25 days', temp: '15\u00B0C avg.', fact: 'Only known planet with liquid water and life.' },
        { name: 'Mars', emoji: '\uD83D\uDD34', color: '#ef4444', size: 14, dist: 1.5, moons: 2, diameter: '6,779 km', dayLen: '24h 37m', yearLen: '687 days', temp: '\u221265\u00B0C avg.', fact: 'Has the tallest volcano: Olympus Mons (21.9 km high).' },
        { name: 'Jupiter', emoji: '\uD83E\uDE90', color: '#f97316', size: 32, dist: 5.2, moons: 95, diameter: '139,820 km', dayLen: '10 hours', yearLen: '12 years', temp: '\u2212110\u00B0C', fact: 'Largest planet. The Great Red Spot is a storm larger than Earth!' },
        { name: 'Saturn', emoji: '\uD83E\uDE90', color: '#eab308', size: 28, dist: 9.5, moons: 146, diameter: '116,460 km', dayLen: '10.7 hours', yearLen: '29 years', temp: '\u2212140\u00B0C', fact: 'Its rings are made of ice and rock. Could float in a giant bathtub!' },
        { name: 'Uranus', emoji: '\u26AA', color: '#67e8f9', size: 22, dist: 19.2, moons: 28, diameter: '50,724 km', dayLen: '17 hours', yearLen: '84 years', temp: '\u2212195\u00B0C', fact: 'Rotates on its side! An ice giant with methane atmosphere.' },
        { name: 'Neptune', emoji: '\uD83D\uDD35', color: '#6366f1', size: 21, dist: 30.1, moons: 16, diameter: '49,244 km', dayLen: '16 hours', yearLen: '165 years', temp: '\u2212200\u00B0C', fact: 'Windiest planet: winds up to 2,100 km/h. Deep blue from methane.' },
        { name: 'Pluto', emoji: '\u2B50', color: '#a78bfa', size: 8, dist: 39.5, moons: 5, diameter: '2,377 km', dayLen: '6.4 Earth days', yearLen: '248 years', temp: '\u2212230\u00B0C', fact: 'Dwarf planet since 2006. Has a heart-shaped glacier named Tombaugh Regio.' },
    ];
    const sel = d.selectedPlanet ? PLANETS.find(p => p.name === d.selectedPlanet) : null;
    const W = 460, H = 260;
    return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
        React.createElement("div", { className: "flex items-center gap-3 mb-3" },
            React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
            React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0D Solar System Explorer")
        ),
        React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl border border-indigo-800", style: { maxHeight: "280px" } },
            React.createElement("circle", { cx: 40, cy: H / 2, r: 24, fill: "#fbbf24" }),
            React.createElement("text", { x: 40, y: H / 2 + 38, textAnchor: "middle", fill: "#fbbf24", style: { fontSize: '8px', fontWeight: 'bold' } }, "Sun"),
            PLANETS.map((p, i) => {
                const cx = 80 + (i / (PLANETS.length - 1)) * (W - 110);
                const isSel = d.selectedPlanet === p.name;
                return React.createElement("g", { key: p.name, style: { cursor: 'pointer' }, onClick: () => upd('selectedPlanet', p.name) },
                    React.createElement("circle", { cx, cy: H / 2, r: p.size / 2, fill: p.color, stroke: isSel ? '#fff' : 'none', strokeWidth: 2, style: { filter: isSel ? 'drop-shadow(0 0 8px ' + p.color + ')' : 'none' } }),
                    React.createElement("text", { x: cx, y: H / 2 + p.size / 2 + 12, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '7px' } }, p.name)
                );
            })
        ),
        sel && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: sel.color + '20', border: '2px solid ' + sel.color } }, sel.emoji),
                React.createElement("div", null,
                    React.createElement("h4", { className: "text-lg font-black text-slate-800" }, sel.name),
                    React.createElement("p", { className: "text-xs text-slate-500" }, sel.diameter + " \u2022 " + sel.moons + " moon" + (sel.moons !== 1 ? 's' : ''))
                )
            ),
            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter]].map(([ico, label, val]) =>
                    React.createElement("div", { key: label, className: "text-center p-2 bg-white rounded-lg border" },
                        React.createElement("p", { className: "text-xs text-slate-400 font-bold" }, ico + ' ' + label),
                        React.createElement("p", { className: "text-sm font-bold text-slate-700" }, val)
                    )
                )
            ),
            React.createElement("p", { className: "text-sm text-slate-600 italic bg-indigo-50 rounded-lg p-2 border border-indigo-100" }, "\uD83D\uDCA1 " + sel.fact)
        ),
        React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
    );
})(),

    // ═══════════════════════════════════════════════════════
    // WATER CYCLE
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'waterCycle' && (() => {
        const d = labToolData.waterCycle;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, [key]: val } }));
        const STAGES = [
            { id: 'evaporation', label: 'Evaporation', emoji: '\u2600', color: '#f59e0b', x: 100, y: 240, desc: 'Heat from the sun causes water to change from liquid to gas (water vapor). Oceans, lakes, and rivers provide most of the evaporated water.' },
            { id: 'condensation', label: 'Condensation', emoji: '\u2601', color: '#94a3b8', x: 200, y: 60, desc: 'As water vapor rises and cools, it condenses into tiny water droplets that form clouds.' },
            { id: 'precipitation', label: 'Precipitation', emoji: '\uD83C\uDF27', color: '#3b82f6', x: 340, y: 120, desc: 'When clouds become heavy with water droplets, they fall as rain, snow, sleet, or hail.' },
            { id: 'collection', label: 'Collection', emoji: '\uD83C\uDF0A', color: '#0ea5e9', x: 360, y: 240, desc: 'Water collects in oceans, rivers, lakes, and underground aquifers. The cycle then repeats.' },
            { id: 'transpiration', label: 'Transpiration', emoji: '\uD83C\uDF3F', color: '#22c55e', x: 30, y: 160, desc: 'Plants release water vapor through their leaves. A single tree can transpire hundreds of liters per day.' },
        ];
        const sel = d.selectedStage ? STAGES.find(s => s.id === d.selectedStage) : null;
        return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Water Cycle")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Click each stage to learn how water moves through Earth\u2019s systems."),
            React.createElement("svg", { viewBox: "0 0 460 300", className: "w-full bg-gradient-to-b from-sky-100 via-sky-50 to-blue-100 rounded-xl border border-sky-200", style: { maxHeight: "300px" } },
                React.createElement("path", { d: "M100,240 Q150,60 200,60", fill: "none", stroke: "#f59e0b80", strokeWidth: 2, strokeDasharray: "6 4" }),
                React.createElement("path", { d: "M200,60 Q300,40 340,120", fill: "none", stroke: "#94a3b880", strokeWidth: 2, strokeDasharray: "6 4" }),
                React.createElement("path", { d: "M340,120 L360,240", fill: "none", stroke: "#3b82f680", strokeWidth: 2, strokeDasharray: "6 4" }),
                React.createElement("path", { d: "M360,240 Q230,280 100,240", fill: "none", stroke: "#0ea5e980", strokeWidth: 2, strokeDasharray: "6 4" }),
                React.createElement("rect", { x: 0, y: 250, width: 460, height: 50, fill: "#3b82f620" }),
                STAGES.map(st => {
                    const isSel = d.selectedStage === st.id;
                    return React.createElement("g", { key: st.id, style: { cursor: 'pointer' }, onClick: () => upd('selectedStage', st.id) },
                        React.createElement("circle", { cx: st.x, cy: st.y, r: isSel ? 28 : 22, fill: st.color + '20', stroke: st.color, strokeWidth: isSel ? 3 : 1.5 }),
                        React.createElement("text", { x: st.x, y: st.y + 5, textAnchor: "middle", style: { fontSize: '18px' } }, st.emoji),
                        React.createElement("text", { x: st.x, y: st.y + (isSel ? 42 : 36), textAnchor: "middle", fill: st.color, style: { fontSize: '8px', fontWeight: 'bold' } }, st.label)
                    );
                })
            ),
            sel && React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 animate-in slide-in-from-bottom", style: { borderColor: sel.color, backgroundColor: sel.color + '10' } },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-2xl" }, sel.emoji),
                    React.createElement("h4", { className: "text-lg font-bold", style: { color: sel.color } }, sel.label)
                ),
                React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed" }, sel.desc)
            )
        );
    })(),

    // ═══════════════════════════════════════════════════════
    // ROCK CYCLE
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'rockCycle' && (() => {
        const d = labToolData.rockCycle;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, rockCycle: { ...prev.rockCycle, [key]: val } }));
        const ROCKS = [
            { id: 'igneous', label: 'Igneous', emoji: '\uD83C\uDF0B', color: '#ef4444', x: 200, y: 40, desc: 'Formed when magma or lava cools and solidifies.', examples: 'Granite, Basalt, Obsidian, Pumice' },
            { id: 'sedimentary', label: 'Sedimentary', emoji: '\uD83C\uDFD6', color: '#eab308', x: 340, y: 220, desc: 'Formed from layers of sediment compressed over millions of years. Often contains fossils.', examples: 'Sandstone, Limestone, Shale, Chalk' },
            { id: 'metamorphic', label: 'Metamorphic', emoji: '\uD83D\uDC8E', color: '#8b5cf6', x: 60, y: 220, desc: 'Formed when existing rocks are transformed by extreme heat and pressure.', examples: 'Marble, Slate, Quartzite, Gneiss' },
        ];
        const sel = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;
        return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEA8 Rock Cycle")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Click a rock type to explore the rock cycle."),
            React.createElement("svg", { viewBox: "0 0 400 280", className: "w-full bg-gradient-to-b from-amber-50 to-stone-100 rounded-xl border border-stone-200", style: { maxHeight: "280px" } },
                [{ f: ROCKS[0], t: ROCKS[1], label: 'Weathering' }, { f: ROCKS[1], t: ROCKS[2], label: 'Heat & Pressure' }, { f: ROCKS[2], t: ROCKS[0], label: 'Melting' }].map((proc, i) =>
                    React.createElement("g", { key: i },
                        React.createElement("line", { x1: proc.f.x, y1: proc.f.y + 24, x2: proc.t.x, y2: proc.t.y - 24, stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "4 2", markerEnd: "url(#rcArrow)" }),
                        React.createElement("text", { x: (proc.f.x + proc.t.x) / 2, y: (proc.f.y + proc.t.y) / 2, textAnchor: "middle", fill: "#64748b", style: { fontSize: '7px', fontWeight: 'bold' } }, proc.label)
                    )
                ),
                React.createElement("defs", null, React.createElement("marker", { id: "rcArrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#94a3b8" }))),
                ROCKS.map(r => {
                    const isSel = d.selectedRock === r.id;
                    return React.createElement("g", { key: r.id, style: { cursor: 'pointer' }, onClick: () => upd('selectedRock', r.id) },
                        React.createElement("circle", { cx: r.x, cy: r.y, r: isSel ? 32 : 26, fill: r.color + '20', stroke: r.color, strokeWidth: isSel ? 3 : 1.5 }),
                        React.createElement("text", { x: r.x, y: r.y + 5, textAnchor: "middle", style: { fontSize: '20px' } }, r.emoji),
                        React.createElement("text", { x: r.x, y: r.y + (isSel ? 46 : 40), textAnchor: "middle", fill: r.color, style: { fontSize: '9px', fontWeight: 'bold' } }, r.label)
                    );
                })
            ),
            sel && React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 animate-in slide-in-from-bottom", style: { borderColor: sel.color, backgroundColor: sel.color + '10' } },
                React.createElement("h4", { className: "font-bold text-lg mb-1", style: { color: sel.color } }, sel.emoji + " " + sel.label + " Rocks"),
                React.createElement("p", { className: "text-sm text-slate-600 mb-2" }, sel.desc),
                React.createElement("p", { className: "text-xs text-slate-500" }, "\uD83E\uDEA8 Examples: " + sel.examples)
            )
        );
    })(),

    // ═══════════════════════════════════════════════════════
    // ECOSYSTEM SIMULATOR
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'ecosystem' && (() => {
        const d = labToolData.ecosystem;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, ecosystem: { ...prev.ecosystem, [key]: val } }));
        const simulate = () => {
            let prey = d.prey0, pred = d.pred0;
            const data = [{ step: 0, prey, pred }];
            for (let i = 1; i <= 100; i++) {
                const newPrey = Math.max(1, prey + d.preyBirth * prey - d.preyDeath * prey * pred);
                const newPred = Math.max(1, pred + d.predBirth * prey * pred - d.predDeath * pred);
                prey = Math.min(500, Math.round(newPrey));
                pred = Math.min(500, Math.round(newPred));
                data.push({ step: i, prey, pred });
            }
            upd('data', data); upd('steps', 100);
        };
        const W = 440, H = 250, pad = 40;
        const maxVal = d.data.length > 0 ? Math.max(...d.data.map(dp => Math.max(dp.prey, dp.pred)), 10) : 100;
        return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDC3A Ecosystem Simulator")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Model predator-prey population dynamics (Lotka-Volterra)."),
            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                [{ k: 'prey0', label: '\uD83D\uDC07 Prey Start', min: 10, max: 200, step: 5 }, { k: 'pred0', label: '\uD83D\uDC3A Predators', min: 5, max: 100, step: 5 }, { k: 'preyBirth', label: 'Prey Birth', min: 0.01, max: 0.5, step: 0.01 }, { k: 'predDeath', label: 'Pred Death', min: 0.01, max: 0.5, step: 0.01 }].map(s =>
                    React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },
                        React.createElement("label", { className: "text-[10px] font-bold text-slate-500 block" }, s.label),
                        React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k]),
                        React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-emerald-600" })
                    )
                )
            ),
            React.createElement("button", { onClick: simulate, className: "mb-3 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md" }, "\u25B6 Run Simulation"),
            d.data.length > 0 && React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border border-emerald-200", style: { maxHeight: "270px" } },
                React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
                React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 1 }),
                React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.prey / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#22c55e", strokeWidth: 2 }),
                React.createElement("polyline", { points: d.data.map((dp, i) => (pad + i / 100 * (W - 2 * pad)) + "," + (H - pad - dp.pred / maxVal * (H - 2 * pad))).join(" "), fill: "none", stroke: "#ef4444", strokeWidth: 2 }),
                React.createElement("text", { x: W - pad + 5, y: pad, fill: "#22c55e", style: { fontSize: '9px', fontWeight: 'bold' } }, "Prey"),
                React.createElement("text", { x: W - pad + 5, y: pad + 14, fill: "#ef4444", style: { fontSize: '9px', fontWeight: 'bold' } }, "Predators")
            )
        );
    })(),

    // ═══════════════════════════════════════════════════════
    // FRACTION VISUALIZER
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'fractions' && (() => {
        const d = labToolData.fractions;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, fractions: { ...prev.fractions, [key]: val } }));
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const simplify = (n, d2) => { const g = gcd(Math.abs(n), Math.abs(d2)); return [n / g, d2 / g]; };
        const [sn1, sd1] = simplify(d.num1, d.den1);
        const [sn2, sd2] = simplify(d.num2, d.den2);
        const val1 = d.num1 / d.den1, val2 = d.num2 / d.den2;
        const drawBar = (num, den, color) => {
            const segs = [];
            for (let i = 0; i < den; i++) segs.push(React.createElement("div", { key: i, className: "border-r border-white/50", style: { flex: 1, backgroundColor: i < num ? color : '#e2e8f0', transition: 'background-color 0.3s' } }));
            return React.createElement("div", { className: "flex h-10 rounded-lg overflow-hidden border-2", style: { borderColor: color } }, segs);
        };
        const drawPie = (num, den, color, size) => {
            const slices = [];
            for (let i = 0; i < den; i++) {
                const sa = (i / den) * 360 - 90, ea = ((i + 1) / den) * 360 - 90;
                const x1 = size / 2 + (size / 2 - 2) * Math.cos(sa * Math.PI / 180), y1 = size / 2 + (size / 2 - 2) * Math.sin(sa * Math.PI / 180);
                const x2 = size / 2 + (size / 2 - 2) * Math.cos(ea * Math.PI / 180), y2 = size / 2 + (size / 2 - 2) * Math.sin(ea * Math.PI / 180);
                slices.push(React.createElement("path", { key: i, d: "M " + size / 2 + " " + size / 2 + " L " + x1 + " " + y1 + " A " + (size / 2 - 2) + " " + (size / 2 - 2) + " 0 " + ((ea - sa) > 180 ? 1 : 0) + " 1 " + x2 + " " + y2 + " Z", fill: i < num ? color : '#e2e8f0', stroke: 'white', strokeWidth: 1.5 }));
            }
            return React.createElement("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size }, slices);
        };
        return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF55 Fraction Visualizer"),
                React.createElement("div", { className: "flex gap-1 ml-auto" },
                    ['bar', 'pie'].map(m => React.createElement("button", { key: m, onClick: () => upd('mode', m), className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (d.mode === m ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600') }, m))
                )
            ),
            React.createElement("div", { className: "grid grid-cols-2 gap-6" },
                [{ label: 'Fraction A', num: d.num1, den: d.den1, nk: 'num1', dk: 'den1', color: '#3b82f6', sn: sn1, sd: sd1, val: val1 },
                { label: 'Fraction B', num: d.num2, den: d.den2, nk: 'num2', dk: 'den2', color: '#ef4444', sn: sn2, sd: sd2, val: val2 }].map(frac =>
                    React.createElement("div", { key: frac.label, className: "bg-white rounded-xl border p-4" },
                        React.createElement("h4", { className: "text-sm font-bold text-slate-600 mb-2" }, frac.label),
                        React.createElement("div", { className: "flex items-center justify-center gap-2 mb-3" },
                            React.createElement("div", { className: "text-center" },
                                React.createElement("input", { type: "number", min: 0, max: 20, value: frac.num, onChange: e => upd(frac.nk, Math.max(0, parseInt(e.target.value) || 0)), className: "w-14 text-center text-xl font-bold border-b-2 outline-none", style: { borderColor: frac.color } }),
                                React.createElement("div", { className: "w-14 h-0.5 my-1", style: { backgroundColor: frac.color } }),
                                React.createElement("input", { type: "number", min: 1, max: 20, value: frac.den, onChange: e => upd(frac.dk, Math.max(1, parseInt(e.target.value) || 1)), className: "w-14 text-center text-xl font-bold outline-none" })
                            ),
                            React.createElement("span", { className: "text-lg font-bold text-slate-400 ml-3" }, "= " + (frac.val * 100).toFixed(0) + "%")
                        ),
                        d.mode === 'bar' ? drawBar(frac.num, frac.den, frac.color) : React.createElement("div", { className: "flex justify-center" }, drawPie(frac.num, frac.den, frac.color, 120))
                    )
                )
            ),
            React.createElement("div", { className: "mt-4 p-3 rounded-xl text-center font-bold text-lg " + (Math.abs(val1 - val2) < 0.001 ? 'bg-green-50 text-green-700 border border-green-200' : val1 > val2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200') },
                Math.abs(val1 - val2) < 0.001 ? d.num1 + "/" + d.den1 + " = " + d.num2 + "/" + d.den2 + " \u2705 Equal!" : val1 > val2 ? d.num1 + "/" + d.den1 + " > " + d.num2 + "/" + d.den2 : d.num1 + "/" + d.den1 + " < " + d.num2 + "/" + d.den2
            )
        );
    })(),

    // ═══════════════════════════════════════════════════════
    // UNIT CONVERTER
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'unitConvert' && (() => {
        const d = labToolData.unitConvert;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, unitConvert: { ...prev.unitConvert, [key]: val } }));
        const CATS = {
            length: { label: '\uD83D\uDCCF Length', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },
            weight: { label: '\u2696 Weight', units: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592 } },
            temperature: { label: '\uD83C\uDF21 Temp', units: { '\u00B0C': 'C', '\u00B0F': 'F', 'K': 'K' } },
            speed: { label: '\uD83D\uDE80 Speed', units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704 } },
        };
        const cat = CATS[d.category] || CATS.length;
        const convert = () => {
            if (d.category === 'temperature') {
                const v = d.value;
                if (d.fromUnit === d.toUnit) return v;
                if (d.fromUnit === '\u00B0C' && d.toUnit === '\u00B0F') return v * 9 / 5 + 32;
                if (d.fromUnit === '\u00B0F' && d.toUnit === '\u00B0C') return (v - 32) * 5 / 9;
                if (d.fromUnit === '\u00B0C' && d.toUnit === 'K') return v + 273.15;
                if (d.fromUnit === 'K' && d.toUnit === '\u00B0C') return v - 273.15;
                if (d.fromUnit === '\u00B0F' && d.toUnit === 'K') return (v - 32) * 5 / 9 + 273.15;
                if (d.fromUnit === 'K' && d.toUnit === '\u00B0F') return (v - 273.15) * 9 / 5 + 32;
                return v;
            }
            return d.value * (cat.units[d.fromUnit] || 1) / (cat.units[d.toUnit] || 1);
        };
        const result = convert();
        return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCCF Unit Converter")
            ),
            React.createElement("div", { className: "flex gap-2 mb-4" },
                Object.entries(CATS).map(([k, v]) => React.createElement("button", { key: k, onClick: () => { upd('category', k); const units = Object.keys(v.units); upd('fromUnit', units[0]); upd('toUnit', units[1] || units[0]); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.category === k ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600') }, v.label))
            ),
            React.createElement("div", { className: "bg-white rounded-xl border-2 border-cyan-200 p-6" },
                React.createElement("div", { className: "flex items-center gap-4 justify-center" },
                    React.createElement("div", { className: "text-center" },
                        React.createElement("input", { type: "number", value: d.value, onChange: e => upd('value', parseFloat(e.target.value) || 0), className: "w-32 text-center text-2xl font-bold border-b-2 border-cyan-300 outline-none py-1", step: "0.01" }),
                        React.createElement("select", { value: d.fromUnit, onChange: e => upd('fromUnit', e.target.value), className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },
                            Object.keys(cat.units).map(u => React.createElement("option", { key: u, value: u }, u))
                        )
                    ),
                    React.createElement("span", { className: "text-2xl text-cyan-400 font-bold" }, "\u2192"),
                    React.createElement("div", { className: "text-center" },
                        React.createElement("p", { className: "text-2xl font-black text-cyan-700 py-1" }, typeof result === 'number' ? result.toFixed(4).replace(/\.?0+$/, '') : result),
                        React.createElement("select", { value: d.toUnit, onChange: e => upd('toUnit', e.target.value), className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },
                            Object.keys(cat.units).map(u => React.createElement("option", { key: u, value: u }, u))
                        )
                    )
                ),
                React.createElement("button", { onClick: () => { const tmp = d.fromUnit; upd('fromUnit', d.toUnit); upd('toUnit', tmp); }, className: "block mx-auto mt-3 px-4 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100" }, "\u21C4 Swap")
            )
        );
    })(),

    // ═══════════════════════════════════════════════════════
    // PROBABILITY LAB
    // ═══════════════════════════════════════════════════════
    stemLabTab === 'explore' && stemLabTool === 'probability' && (() => {
        const d = labToolData.probability;
        const upd = (key, val) => setLabToolData(prev => ({ ...prev, probability: { ...prev.probability, [key]: val } }));
        const runTrial = (n) => {
            const results = [...d.results];
            for (let i = 0; i < n; i++) {
                if (d.mode === 'coin') results.push(Math.random() < 0.5 ? 'H' : 'T');
                else if (d.mode === 'dice') results.push(Math.floor(Math.random() * 6) + 1);
                else results.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);
            }
            upd('results', results); upd('trials', results.length);
        };
        const counts = {};
        d.results.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
        const expected = d.mode === 'coin' ? { H: 0.5, T: 0.5 } : d.mode === 'dice' ? { 1: 1 / 6, 2: 1 / 6, 3: 1 / 6, 4: 1 / 6, 5: 1 / 6, 6: 1 / 6 } : { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };
        const maxCount = Math.max(...Object.values(counts), 1);
        const barColors = { H: '#3b82f6', T: '#ef4444', 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6', Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };
        return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDFB2 Probability Lab"),
                d.trials > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full" }, d.trials + " trials")
            ),
            React.createElement("div", { className: "flex gap-2 mb-3" },
                [['coin', '\uD83E\uDE99 Coin'], ['dice', '\uD83C\uDFB2 Dice'], ['spinner', '\uD83C\uDFA1 Spinner']].map(([m, label]) =>
                    React.createElement("button", { key: m, onClick: () => { upd('mode', m); upd('results', []); upd('trials', 0); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.mode === m ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600') }, label)
                )
            ),
            React.createElement("div", { className: "flex gap-2 mb-4" },
                [1, 10, 50, 100].map(n => React.createElement("button", { key: n, onClick: () => runTrial(n), className: "px-4 py-2 bg-violet-100 text-violet-700 font-bold rounded-lg hover:bg-violet-200" }, "+" + n)),
                React.createElement("button", { onClick: () => { upd('results', []); upd('trials', 0); }, className: "px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100" }, "\uD83D\uDD04 Reset")
            ),
            d.trials > 0 && React.createElement("div", { className: "bg-white rounded-xl border border-violet-200 p-4" },
                React.createElement("div", { className: "space-y-2" },
                    Object.keys(expected).map(k => {
                        const count = counts[k] || 0;
                        const pct = d.trials > 0 ? (count / d.trials * 100) : 0;
                        const expPct = expected[k] * 100;
                        return React.createElement("div", { key: k, className: "flex items-center gap-2" },
                            React.createElement("span", { className: "w-12 text-right text-sm font-bold", style: { color: barColors[k] } }, k),
                            React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative" },
                                React.createElement("div", { style: { width: (count / maxCount * 100) + '%', backgroundColor: barColors[k], height: '100%', borderRadius: '9999px', transition: 'width 0.3s' } }),
                                React.createElement("div", { style: { position: 'absolute', left: (expPct / 100 * 100) + '%', top: 0, bottom: 0, width: '2px', backgroundColor: '#1e293b40' } })
                            ),
                            React.createElement("span", { className: "w-20 text-xs font-mono text-slate-500 text-right" }, count + " (" + pct.toFixed(1) + "%)"),
                            React.createElement("span", { className: "w-16 text-[10px] text-slate-400" }, "exp: " + expPct.toFixed(1) + "%")
                        );
                    })
                ),
                React.createElement("p", { className: "mt-3 text-xs text-slate-400 text-center italic" }, "Black lines show expected probability. More trials \u2192 observed approaches expected (Law of Large Numbers).")
            )
        );
    })(),
