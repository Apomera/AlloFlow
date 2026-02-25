// stem_lab_module.js
// Auto-extracted from AlloFlowANTI.txt
// STEM Lab module for AlloFlow - loaded from GitHub CDN
// Version: 1.0.0 (Feb 2026)

window.AlloModules = window.AlloModules || {};

window.AlloModules.StemLab = function StemLabModal(props) {
    const {
        ArrowLeft,
        Calculator,
        GripVertical,
        Sparkles,
        X,
        addToast,
        angleChallenge,
        angleFeedback,
        angleValue,
        areaModelDims,
        areaModelHighlight,
        assessmentBlocks,
        base10Challenge,
        base10Feedback,
        base10Value,
        cubeAnswer,
        cubeBuilderChallenge,
        cubeBuilderFeedback,
        cubeBuilderMode,
        cubeChallenge,
        cubeClickSuppressed,
        cubeDims,
        cubeDragRef,
        cubeFeedback,
        cubeHoverPos,
        cubePositions,
        cubeRotation,
        cubeScale,
        cubeShowLayers,
        exploreDifficulty,
        exploreScore,
        fractionPieces,
        gridChallenge,
        gridFeedback,
        gridPoints,
        mathInput,
        mathMode,
        mathQuantity,
        mathSubject,
        multTableAnswer,
        multTableChallenge,
        multTableFeedback,
        multTableHidden,
        multTableHover,
        multTableRevealed,
        numberLineMarkers,
        numberLineRange,
        setActiveView,
        setAngleChallenge,
        setAngleFeedback,
        setAngleValue,
        setAreaAnswer,
        setAreaChallenge,
        setAreaFeedback,
        setAreaModelDims,
        setAreaModelHighlight,
        setAssessmentBlocks,
        setBase10Challenge,
        setBase10Feedback,
        setBase10Value,
        setCubeAnswer,
        setCubeBuilderChallenge,
        setCubeBuilderFeedback,
        setCubeBuilderMode,
        setCubeChallenge,
        setCubeDims,
        setCubeFeedback,
        setCubeHoverPos,
        setCubePositions,
        setCubeRotation,
        setCubeScale,
        setCubeShowLayers,
        setData,
        setExploreDifficulty,
        setExploreScore,
        setFracAnswer,
        setFracChallenge,
        setFracFeedback,
        setFractionPieces,
        setGridChallenge,
        setGridFeedback,
        setGridPoints,
        setHistory,
        setMathInput,
        setMathMode,
        setMathQuantity,
        setMathSubject,
        setMultTableAnswer,
        setMultTableChallenge,
        setMultTableFeedback,
        setMultTableHidden,
        setMultTableHover,
        setMultTableRevealed,
        setNlAnswer,
        setNlChallenge,
        setNlFeedback,
        setNumberLineMarkers,
        setNumberLineRange,
        setShowAssessmentBuilder,
        setShowStemLab,
        setStemLabCreateMode,
        setStemLabTab,
        setStemLabTool,
        setToolSnapshots,
        showAssessmentBuilder,
        showStemLab,
        startMathFluencyProbe,
        stemLabCreateMode,
        stemLabTab,
        stemLabTool,
        submitExploreScore,
        t,
        toolSnapshots,
    nlAnswer,
    nlChallenge,
    nlFeedback,
    nlMarkerLabel,
    nlMarkerVal,
    areaChallenge,
    areaFeedback,
    areaAnswer,
    fracChallenge,
    fracFeedback,
    fracAnswer,
    handleGenerateMath} = props;

    // STEM Lab modal JSX
    return (
<div className="fixed inset-0 z-[9999] flex items-stretch justify-center" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}>
<div className="w-full max-w-5xl m-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Calculator size={20} /></div>
            <div>
                <h2 className="text-lg font-bold tracking-tight">🧪 STEM Lab</h2>
                <p className="text-xs text-white/70">Create problems, build assessments, explore with manipulatives</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <select value={mathSubject} onChange={(e) => setMathSubject(e.target.value)} className="px-3 py-1.5 text-xs font-medium bg-white/15 border border-white/25 rounded-lg text-white outline-none" aria-label="Subject">
                <option value="General Math" className="text-slate-800">General Math</option>
                <option value="Algebra" className="text-slate-800">Algebra</option>
                <option value="Geometry" className="text-slate-800">Geometry</option>
                <option value="Calculus" className="text-slate-800">Calculus</option>
                <option value="Chemistry" className="text-slate-800">Chemistry</option>
                <option value="Physics" className="text-slate-800">Physics</option>
                <option value="Biology" className="text-slate-800">Biology</option>
            </select>
            <button onClick={() => setShowStemLab(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" aria-label="Close STEM Lab"><X size={20} /></button>
        </div>
    </div>
    <div className="flex border-b border-slate-200 bg-slate-50 px-6">
        {[{ id: 'create', label: '📝 Create', desc: 'Generate & assess' }, { id: 'explore', label: '🔧 Explore', desc: 'Manipulatives' }].map(tab => (
            <button key={tab.id} onClick={() => { setStemLabTab(tab.id); setStemLabTool(null); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${stemLabTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                <span>{tab.label}</span>
                <span className={`text-[10px] font-normal ${stemLabTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}`}>{tab.desc}</span>
            </button>
        ))}
    </div>
    <div className="flex-1 overflow-y-auto p-6">
        {stemLabTab === 'create' && !showAssessmentBuilder && (
        <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
                {[{ id: 'topic', label: '📋 From Topic' }, { id: 'content', label: '📖 From My Content' }, { id: 'solve', label: '✏️ Solve One' }].map(m => (
                    <button key={m.id} onClick={() => setStemLabCreateMode(m.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${stemLabCreateMode === m.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
                        {m.label}
                    </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => setShowAssessmentBuilder(true)} className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    📋 Build Assessment
                </button>
            </div>
            {stemLabCreateMode !== 'solve' && (
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Style:</span>
                {[{ val: 'Step-by-Step', label: 'Step-by-Step' }, { val: 'Conceptual', label: 'Conceptual' }, { val: 'Real-World Application', label: 'Real-World' }].map(s => (
                    <button key={s.val} onClick={() => setMathMode(s.val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mathMode === s.val ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-200'}`}>
                        {s.label}
                    </button>
                ))}
            </div>
            )}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <textarea
                    value={mathInput}
                    onChange={(e) => setMathInput(e.target.value)}
                    placeholder={stemLabCreateMode === 'solve' ? 'Enter a math problem to solve step-by-step...' : stemLabCreateMode === 'content' ? 'Paste or describe content to generate math problems from...' : 'Enter topic, standard, or description (e.g. "3rd grade multiplication word problems")...'}
                    className="w-full h-28 px-4 py-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none resize-none bg-white"
                    aria-label="Math problem input" />
                {stemLabCreateMode !== 'solve' && (
                <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs font-bold text-slate-400">Quantity:</span>
                    <input type="range" min="1" max="20" value={mathQuantity} onChange={(e) => setMathQuantity(parseInt(e.target.value))} className="flex-1 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <span className="text-sm font-bold text-indigo-700 w-8 text-center">{mathQuantity}</span>
                </div>
                )}
            </div>
            <button onClick={() => {
                if (stemLabCreateMode === 'content') { setMathMode('Word Problems from Source'); }
                else if (stemLabCreateMode === 'solve') { setMathMode('Freeform Builder'); }
                else { setMathMode(mathMode === 'Freeform Builder' || mathMode === 'Word Problems from Source' ? 'Problem Set Generator' : mathMode); }
                setActiveView('math');
                setShowStemLab(false);
            }}
                disabled={!mathInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Sparkles size={16} /> {stemLabCreateMode === 'solve' ? 'Solve Problem' : 'Generate Problems'}
            </button>
            <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tools:</span>
                {[
                    { id: 'volume', icon: '📦', label: 'Volume Explorer' },
                    { id: 'numberline', icon: '📏', label: 'Number Line' },
                    { id: 'areamodel', icon: '🟧', label: 'Area Model' },
                    { id: 'fractions', icon: '🍕', label: 'Fractions' },
                ].map(tool => (
                    <button key={tool.id} onClick={() => { setStemLabTab('explore'); setStemLabTool(tool.id); }}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1">
                        {tool.icon} {tool.label}
                    </button>
                ))}
            </div>
        </div>
        )}
        {stemLabTab === 'create' && showAssessmentBuilder && (
        <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAssessmentBuilder(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">📋 Assessment Builder</h3>
                        <p className="text-xs text-slate-400">Compose blocks of different problem types into a custom assessment</p>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {assessmentBlocks.map((block, idx) => (
                    <div key={block.id} className="bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 flex items-start gap-3 transition-all group"
                        draggable onDragStart={(e) => e.dataTransfer.setData('blockIdx', idx.toString())}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            const fromIdx = parseInt(e.dataTransfer.getData('blockIdx'));
                            const newBlocks = [...assessmentBlocks];
                            const [moved] = newBlocks.splice(fromIdx, 1);
                            newBlocks.splice(idx, 0, moved);
                            setAssessmentBlocks(newBlocks);
                        }}>
                        <div className="text-slate-300 cursor-grab active:cursor-grabbing pt-1 group-hover:text-slate-500"><GripVertical size={16} /></div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <select value={block.type} onChange={(e) => { const nb = [...assessmentBlocks]; nb[idx].type = e.target.value; setAssessmentBlocks(nb); }}
                                    className="px-3 py-1.5 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none" aria-label="Block type">
                                    <option value="computation">🔢 Computation</option>
                                    <option value="word_problems">📝 Word Problems</option>
                                    <option value="fluency">⏱️ Fluency Drill</option>
                                    <option value="volume">📦 Volume</option>
                                    <option value="fractions">🍕 Fractions</option>
                                    <option value="geometry">📐 Geometry</option>
                                    <option value="step_by_step">📊 Step-by-Step</option>
                                    <option value="custom">✨ Custom</option>
                                    <option value="manipulative">🧱 Manipulative Response</option>
                                </select>
                                <span className="text-xs text-slate-400">×</span>
                                <input type="number" min="1" max="30" value={block.quantity} onChange={(e) => { const nb = [...assessmentBlocks]; nb[idx].quantity = Math.max(1, parseInt(e.target.value) || 1); setAssessmentBlocks(nb); }}
                                    className="w-14 px-2 py-1.5 text-sm font-mono border border-slate-200 rounded-lg text-center" aria-label="Quantity" />
                                {block.type === 'fluency' && <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">⏱ Timed</span>}
                                {block.type === 'manipulative' && <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">🧱 Hands-on</span>}
                            </div>
                            <input value={block.directive} onChange={(e) => { const nb = [...assessmentBlocks]; nb[idx].directive = e.target.value; setAssessmentBlocks(nb); }}
                                placeholder="Directive (e.g. 'Single-digit multiplication', 'Division with remainders')..."
                                className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none placeholder-slate-300" />
                        </div>
                        <button onClick={() => setAssessmentBlocks(assessmentBlocks.filter((_, i) => i !== idx))} className="p-1 text-slate-300 hover:text-red-500 transition-colors" aria-label="Remove block"><X size={14} /></button>
                    </div>
                ))}
            </div>
            <button onClick={() => setAssessmentBlocks([...assessmentBlocks, { id: 'b-' + Date.now(), type: 'computation', quantity: 5, directive: '' }])}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm rounded-xl hover:border-indigo-400 hover:text-indigo-500 transition-all">
                + Add Block
            </button>
            {assessmentBlocks.length > 0 && (
            <div className="flex gap-3 pt-2">
                <button onClick={() => {
                    const fluencyBlocks = assessmentBlocks.filter(b => b.type === 'fluency');
                    if (fluencyBlocks.length > 0 && assessmentBlocks.length === fluencyBlocks.length) {
                        startMathFluencyProbe(false);
                        setShowStemLab(false);
                        addToast('Fluency drill started! ' + fluencyBlocks.reduce((s,b) => s + b.quantity, 0) + ' problems', 'info');
                        return;
                    }
                    const prompt = assessmentBlocks.map((b, i) => (i+1) + '. ' + b.type.replace('_',' ') + ' (' + b.quantity + '): ' + (b.directive || 'general')).join('\n');
                    setMathInput('Create an assessment with these sections:\n' + prompt);
                    setMathMode('Problem Set Generator');
                    setMathQuantity(assessmentBlocks.reduce((s, b) => s + b.quantity, 0));
                    setActiveView('math');
                    setShowStemLab(false);
                    setTimeout(() => { if (typeof handleGenerateMath === 'function') handleGenerateMath('Create an assessment with these sections:\n' + prompt); }, 300);
                }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                    <Sparkles size={16} /> Generate All ({assessmentBlocks.reduce((s, b) => s + b.quantity, 0)} problems)
                </button>
                <button onClick={() => {
                    const stemAssessment = {
                        id: 'stem-' + Date.now(),
                        type: 'stem-assessment',
                        title: 'STEM Assessment: ' + (mathSubject || 'General Math'),
                        timestamp: Date.now(),
                        data: {
                            blocks: assessmentBlocks.map(b => ({ ...b })),
                            subject: mathSubject || 'General Math',
                            totalProblems: assessmentBlocks.reduce((s, b) => s + b.quantity, 0),
                            results: null
                        }
                    };
                    setHistory(prev => [...prev, stemAssessment]);
                    addToast('STEM Assessment saved to resources (' + assessmentBlocks.length + ' blocks)', 'success');
                }}
                    className="py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                    💾 Save to Resources
                </button>

            {toolSnapshots.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-bold text-slate-700">📸 Tool Snapshots ({toolSnapshots.length})</h4>
                    <button onClick={() => setToolSnapshots([])} className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">↺ Clear all</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {toolSnapshots.map((snap, si) => (
                        <div key={snap.id} className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-indigo-300 transition-all group">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{snap.tool === 'volume' ? '📦' : snap.tool === 'base10' ? '🧮' : snap.tool === 'coordinate' ? '📍' : '📐'}</span>
                                <span className="text-xs font-bold text-slate-700 flex-1 truncate">{snap.label}</span>
                                <button onClick={() => {
                                    setStemLabTab('explore');
                                    setStemLabTool(snap.tool);
                                    if (snap.tool === 'volume' && snap.data) {
                                        if (snap.mode === 'slider' && snap.data.dims) { setCubeBuilderMode('slider'); setCubeDims(snap.data.dims); }
                                        else if (snap.data.positions) { setCubeBuilderMode('freeform'); setCubePositions(new Set(snap.data.positions)); }
                                        if (snap.rotation) setCubeRotation(snap.rotation);
                                    }
                                    if (snap.tool === 'base10' && snap.data) setBase10Value(snap.data);
                                    if (snap.tool === 'coordinate' && snap.data) setGridPoints(snap.data.points || []);
                                    if (snap.tool === 'protractor' && snap.data) setAngleValue(snap.data.angle || 45);
                                }} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">↩ Load</button>
                                <button onClick={() => setToolSnapshots(prev => prev.filter((_,idx) => idx !== si))} className="text-slate-300 hover:text-red-500 transition-colors"><X size={12} /></button>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">{new Date(snap.timestamp).toLocaleTimeString()}</div>
                        </div>
                    ))}
                </div>
            </div>
            )}
            </div>
            )}
        </div>
        )}
        {stemLabTab === 'explore' && !stemLabTool && (
        <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto animate-in fade-in duration-200">
            {[
                { id: 'volume', icon: '📦', label: '3D Volume Explorer', desc: 'Build rectangular prisms with unit cubes. Rotate, zoom, explore layers.', color: 'emerald', ready: true },
                { id: 'numberline', icon: '📏', label: 'Number Line', desc: 'Interactive number line with draggable markers. Great for addition, subtraction, fractions.', color: 'blue', ready: true },
                { id: 'areamodel', icon: '🟧', label: 'Area Model', desc: 'Visual multiplication and division with color-coded rows and columns.', color: 'amber', ready: true },
                { id: 'fractions', icon: '🍕', label: 'Fraction Tiles', desc: 'Circle and bar models for comparing, adding, and visualizing fractions.', color: 'rose', ready: true },
                { id: 'base10', icon: '🧮', label: 'Base-10 Blocks', desc: 'Place value with ones, tens, hundreds. Regroup and decompose numbers.', color: 'orange', ready: true },
                { id: 'coordinate', icon: '📍', label: 'Coordinate Grid', desc: 'Plot points, draw lines, and explore the coordinate plane.', color: 'cyan', ready: true },
                { id: 'protractor', icon: '📐', label: 'Angle Explorer', desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.', color: 'purple', ready: true },
                { id: 'multtable', icon: '🔢', label: 'Multiplication Table', desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.', color: 'pink', ready: true },
            ].map(tool => (
                <button key={tool.id} onClick={() => setStemLabTool(tool.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-xl bg-${tool.color}-50 border-${tool.color}-200 hover:border-${tool.color}-400`}>
                    <div className="text-3xl mb-2">{tool.icon}</div>
                    <h4 className={`font-bold text-sm text-${tool.color}-800 mb-1`}>{tool.label}</h4>
                    <p className={`text-xs text-${tool.color}-600/70`}>{tool.desc}</p>
                </button>
            ))}
        </div>
        )}
        {stemLabTab === 'explore' && stemLabTool === 'volume' && (() => {
            const getBuilderVolume = (positions) => positions.size;
            const getBuilderSurfaceArea = (positions) => {
                let area = 0;
                const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
                for (const pos of positions) {
                    const [x,y,z] = pos.split('-').map(Number);
                    for (const [dx,dy,dz] of dirs) {
                        if (!positions.has(`${x+dx}-${y+dy}-${z+dz}`)) area++;
                    }
                }
                return area;
            };
            const generateLBlock = () => {
                const positions = new Set();
                const bw = 2 + Math.floor(Math.random() * 3);
                const bd = 2 + Math.floor(Math.random() * 2);
                for (let x = 0; x < bw; x++)
                    for (let y = 0; y < bd; y++)
                        positions.add(`${x}-${y}-0`);
                const th = 1 + Math.floor(Math.random() * 2);
                for (let x = 0; x < Math.min(2, bw); x++)
                    for (let y = 0; y < Math.min(2, bd); y++)
                        for (let z = 1; z <= th; z++)
                            positions.add(`${x}-${y}-${z}`);
                return { positions, volume: positions.size };
            };
            const handlePlaceCube = (x, y, z) => {
                if (cubeClickSuppressed.current) return;
                const key = `${x}-${y}-${z}`;
                setCubePositions(prev => {
                    const next = new Set(prev);
                    if (next.has(key)) { next.delete(key); } else { next.add(key); }
                    return next;
                });
                setCubeBuilderFeedback(null);
            };
            const checkBuildChallenge = () => {
                if (!cubeBuilderChallenge) return;
                const vol = cubePositions.size;
                if (cubeBuilderChallenge.type === 'prism') {
                    const t = cubeBuilderChallenge.target;
                    const targetVol = t.l * t.w * t.h;
                    let isRect = false;
                    if (vol === targetVol) {
                        const coords = [...cubePositions].map(p => p.split('-').map(Number));
                        const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]), zs = coords.map(c => c[2]);
                        const ddx = Math.max(...xs) - Math.min(...xs) + 1;
                        const ddy = Math.max(...ys) - Math.min(...ys) + 1;
                        const ddz = Math.max(...zs) - Math.min(...zs) + 1;
                        const dims = [ddx,ddy,ddz].sort((a,b) => a-b);
                        const target = [t.l,t.w,t.h].sort((a,b) => a-b);
                        isRect = dims[0]===target[0] && dims[1]===target[1] && dims[2]===target[2] && vol === ddx*ddy*ddz;
                    }
                    setCubeBuilderFeedback(isRect ? { correct: true, msg: '✅ Correct! '+t.l+'×'+t.w+'×'+t.h+' = '+targetVol+' cubes' } : { correct: false, msg: '❌ Not quite. Build a solid '+t.l+'×'+t.w+'×'+t.h+' rectangular prism ('+targetVol+' cubes). You have '+vol+'.' });
                    setExploreScore(prev => ({ correct: prev.correct + (isRect ? 1 : 0), total: prev.total + 1 }));
                } else if (cubeBuilderChallenge.type === 'volume') {
                    const ok = vol === cubeBuilderChallenge.answer;
                    setCubeBuilderFeedback(ok ? { correct: true, msg: '✅ Correct! Volume = '+cubeBuilderChallenge.answer+' cubic units' } : { correct: false, msg: '❌ You placed '+vol+' cubes. The correct volume is '+cubeBuilderChallenge.answer+'.' });
                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
                }
            };

            const isSlider = cubeBuilderMode === 'slider';
            const volume = isSlider ? cubeDims.l * cubeDims.w * cubeDims.h : getBuilderVolume(cubePositions);
            const surfaceArea = isSlider ? 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h) : getBuilderSurfaceArea(cubePositions);
            const cubeUnit = isSlider ? Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h))) : 30;

            const handleLabCubeDrag = (e) => {
                if (!cubeDragRef.current) return;
                const ddx = e.clientX - cubeDragRef.current.x;
                const ddy = e.clientY - cubeDragRef.current.y;
                if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) cubeClickSuppressed.current = true;
                setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + ddy * 0.5)), y: prev.y + ddx * 0.5 }));
                cubeDragRef.current = { x: e.clientX, y: e.clientY };
            };
            const handleLabCubeDragEnd = () => { cubeDragRef.current = null; window.removeEventListener('mousemove', handleLabCubeDrag); window.removeEventListener('mouseup', handleLabCubeDragEnd); setTimeout(() => { cubeClickSuppressed.current = false; }, 50); };

            const labCubeGrid = [];
            if (isSlider) {
                const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;
                for (let z = 0; z < maxLayer; z++)
                    for (let y = 0; y < cubeDims.w; y++)
                        for (let x = 0; x < cubeDims.l; x++) {
                            const hue = 140 + z * 12;
                            const lt = 55 + z * 4;
                            labCubeGrid.push(React.createElement('div', { key: x+'-'+y+'-'+z, style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-(z)*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d' }},
                                React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',70%,'+lt+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.4)',boxSizing:'border-box'}}),
                                React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',65%,'+(lt+5)+'%,0.7)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),
                                React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt-5)+'%,0.8)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),
                                React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt+3)+'%,0.8)',border:'1px solid hsla('+hue+',80%,30%,0.3)',boxSizing:'border-box'}}),
                                React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue-5)+',75%,'+(lt+8)+'%,0.9)',border:'1px solid hsla('+hue+',80%,30%,0.4)',boxSizing:'border-box'}}),
                                React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+5)+',55%,'+(lt-8)+'%,0.6)',border:'1px solid hsla('+hue+',80%,30%,0.2)',boxSizing:'border-box'}})
                            ));
                        }
            } else {
                for (const pos of cubePositions) {
                    const [x,y,z] = pos.split('-').map(Number);
                    const hue = 200 + z * 15;
                    const lt = 50 + z * 5;
                    labCubeGrid.push(React.createElement('div', { key: pos, onClick: (e) => { e.stopPropagation(); handlePlaceCube(x,y,z); }, style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-(z)*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d', cursor:'pointer' }},
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',70%,'+lt+'%,0.9)',border:'1px solid hsla('+hue+',80%,30%,0.5)',boxSizing:'border-box'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+hue+',65%,'+(lt+5)+'%,0.75)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),
                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt-5)+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),
                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+10)+',60%,'+(lt+3)+'%,0.85)',border:'1px solid hsla('+hue+',80%,30%,0.35)',boxSizing:'border-box'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue-5)+',75%,'+(lt+8)+'%,0.95)',border:'1px solid hsla('+hue+',80%,30%,0.5)',boxSizing:'border-box'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+(hue+5)+',55%,'+(lt-8)+'%,0.65)',border:'1px solid hsla('+hue+',80%,30%,0.25)',boxSizing:'border-box'}})
                    ));
                }
                const gridSize = 8;
                for (let gx = 0; gx < gridSize; gx++)
                    for (let gy = 0; gy < gridSize; gy++) {
                        if (!cubePositions.has(`${gx}-${gy}-0`)) {
                            labCubeGrid.push(React.createElement('div', {
                                key: 'ground-'+gx+'-'+gy,
                                onClick: (e) => { e.stopPropagation(); handlePlaceCube(gx, gy, 0); },
                                onMouseEnter: () => setCubeHoverPos({x:gx,y:gy,z:0}),
                                onMouseLeave: () => setCubeHoverPos(null),
                                style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(gx*cubeUnit)+'px,0px,'+(gy*cubeUnit)+'px) rotateX(90deg)', background: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? 'hsla(140,80%,55%,0.6)' : 'hsla(220,15%,60%,0.12)', border: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? '2px solid hsla(140,80%,50%,0.7)' : '1px dashed hsla(220,20%,60%,0.25)', boxSizing:'border-box', cursor:'pointer', transition:'background 0.15s' }
                            }));
                        }
                    }
                for (const pos of cubePositions) {
                    const [x,y,z] = pos.split('-').map(Number);
                    const above = `${x}-${y}-${z+1}`;
                    if (!cubePositions.has(above) && z < 9) {
                        labCubeGrid.push(React.createElement('div', {
                            key: 'stack-'+above,
                            onClick: (e) => { e.stopPropagation(); handlePlaceCube(x, y, z+1); },
                            onMouseEnter: () => setCubeHoverPos({x,y,z:z+1}),
                            onMouseLeave: () => setCubeHoverPos(null),
                            style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(x*cubeUnit)+'px,'+(-((z+1))*cubeUnit)+'px,'+(y*cubeUnit)+'px)', transformStyle:'preserve-3d', cursor:'pointer', zIndex: 10 }
                        },
                            React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background: cubeHoverPos && cubeHoverPos.x===x && cubeHoverPos.y===y && cubeHoverPos.z===z+1 ? 'hsla(140,70%,60%,0.6)' : 'transparent',border: cubeHoverPos && cubeHoverPos.x===x && cubeHoverPos.y===y && cubeHoverPos.z===z+1 ? '2px dashed hsla(140,80%,40%,0.7)' : 'none',boxSizing:'border-box',transition:'all 0.15s'}})
                        ));
                    }
                }
            }

                // Ghost preview cube at hover position
                if (!isSlider && cubeHoverPos && !cubePositions.has(`${cubeHoverPos.x}-${cubeHoverPos.y}-${cubeHoverPos.z}`)) {
                    const gx = cubeHoverPos.x, gy = cubeHoverPos.y, gz = cubeHoverPos.z;
                    const gHue = 140;
                    labCubeGrid.push(React.createElement('div', { key: 'ghost', style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(gx*cubeUnit)+'px,'+(-(gz)*cubeUnit)+'px,'+(gy*cubeUnit)+'px)', transformStyle:'preserve-3d', pointerEvents:'none', zIndex: 20, animation: 'pulse 1.5s ease-in-out infinite' }},
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',80%,65%,0.4)',border:'2px solid hsla('+gHue+',90%,50%,0.7)',boxSizing:'border-box',borderRadius:'2px'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',70%,60%,0.3)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}}),
                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',60%,55%,0.35)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}}),
                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',60%,60%,0.35)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',85%,70%,0.5)',border:'2px solid hsla('+gHue+',90%,50%,0.7)',boxSizing:'border-box',borderRadius:'2px'}}),
                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',50%,45%,0.25)',border:'2px solid hsla('+gHue+',90%,50%,0.4)',boxSizing:'border-box',borderRadius:'2px'}})
                    ));
                }

            let freeformWidth = isSlider ? cubeDims.l * cubeUnit : 8 * cubeUnit;
            let freeformHeight = isSlider ? cubeDims.h * cubeUnit : 5 * cubeUnit;
            if (!isSlider && cubePositions.size > 0) {
                const coords = [...cubePositions].map(p => p.split('-').map(Number));
                const maxX = Math.max(...coords.map(c => c[0])) + 1;
                const maxZ = Math.max(...coords.map(c => c[2])) + 1;
                freeformWidth = Math.max(8, maxX) * cubeUnit;
                freeformHeight = Math.max(1, maxZ) * cubeUnit;
            }

            return (
            <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <h3 className="text-lg font-bold text-emerald-800">📦 3D Volume Explorer</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700">💾 Save</button>}
                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'volume', label: 'Volume: '+(cubeBuilderMode==='slider' ? cubeDims.l+'\u00d7'+cubeDims.w+'\u00d7'+cubeDims.h : cubePositions.size+' cubes'), mode: cubeBuilderMode, data: cubeBuilderMode==='slider' ? {dims:{...cubeDims}} : {positions:[...cubePositions]}, rotation:{...cubeRotation}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\U0001f4f8 Snapshot saved!', 'success'); }} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all">
                            📸 Snapshot
                        </button>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200">
                        <button onClick={() => { setCubeBuilderMode('slider'); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'slider' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`}>🎚️ Slider</button>
                        <button onClick={() => { setCubeBuilderMode('freeform'); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${cubeBuilderMode === 'freeform' ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'}`}>🧱 Freeform</button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCubeScale(s => Math.max(0.4, s - 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label="Zoom out">−</button>
                        <span className="text-[10px] text-emerald-600 font-mono w-10 text-center">{Math.round(cubeScale * 100)}%</span>
                        <button onClick={() => setCubeScale(s => Math.min(2.5, s + 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label="Zoom in">+</button>
                        <button onClick={() => { setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }} className="ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100 transition-all">↺</button>
                    </div>
                </div>

                {isSlider && (
                <div className="grid grid-cols-3 gap-3">
                    {['l','w','h'].map(dim => (
                        <div key={dim} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <label className="block text-xs text-emerald-700 mb-1 font-bold uppercase">{dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'}</label>
                            <input type="range" min="1" max="10" value={cubeDims[dim]}
                                onChange={(e) => { setCubeDims(prev => ({...prev, [dim]: parseInt(e.target.value)})); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); }}
                                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" aria-label={dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'} />
                            <div className="text-center text-lg font-bold text-emerald-700 mt-1">{cubeDims[dim]}</div>
                        </div>
                    ))}
                </div>
                )}

                {!isSlider && (
                <div className="flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                    <p className="text-xs text-indigo-600 flex-1">👉 Click the grid to place cubes • Click a cube to remove it • Click top faces to stack</p>
                    <button onClick={() => { setCubePositions(new Set()); setCubeBuilderChallenge(null); setCubeBuilderFeedback(null); }} className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all">↺ Clear All</button>
                </div>
                )}

                <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
                    style={{ minHeight: '350px', perspective: '900px' }}
                    onMouseDown={(e) => { cubeDragRef.current = { x: e.clientX, y: e.clientY }; window.addEventListener('mousemove', handleLabCubeDrag); window.addEventListener('mouseup', handleLabCubeDragEnd); }}
                    onWheel={(e) => { e.preventDefault(); setCubeScale(s => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08)))); }}
                    onTouchStart={(e) => { if (e.touches.length === 1) cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                    onTouchMove={(e) => { if (cubeDragRef.current && e.touches.length === 1) { const tdx = e.touches[0].clientX - cubeDragRef.current.x; const tdy = e.touches[0].clientY - cubeDragRef.current.y; setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + tdy * 0.5)), y: prev.y + tdx * 0.5 })); cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
                    onTouchEnd={() => { cubeDragRef.current = null; }}
                >
                    <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX('+cubeRotation.x+'deg) rotateY('+cubeRotation.y+'deg) scale3d('+cubeScale+','+cubeScale+','+cubeScale+')', transition: cubeDragRef.current ? 'none' : 'transform 0.15s ease-out', position: 'relative', width: freeformWidth+'px', height: freeformHeight+'px' }}>
                        {labCubeGrid}
                    </div>
                </div>

                {isSlider && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-700">Layers:</span>
                    <input type="range" min="1" max={cubeDims.h} value={cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} onChange={(e) => setCubeShowLayers(parseInt(e.target.value))} className="flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    <span className="text-xs font-mono text-emerald-600">{cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} / {cubeDims.h}</span>
                </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                        <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Volume</div>
                        <div className="text-xl font-bold text-emerald-800">{isSlider ? `${cubeDims.l} × ${cubeDims.w} × ${cubeDims.h} = ` : ''}<span className="text-2xl text-emerald-600">{volume}</span></div>
                        <div className="text-xs text-slate-400">{volume} unit cube{volume !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-teal-100 text-center">
                        <div className="text-xs font-bold text-teal-600 uppercase mb-1">Surface Area</div>
                        <div className="text-xl font-bold text-teal-800">SA = <span className="text-2xl text-teal-600">{surfaceArea}</span></div>
                        {isSlider && <div className="text-xs text-slate-400">2({cubeDims.l}×{cubeDims.w} + {cubeDims.l}×{cubeDims.h} + {cubeDims.w}×{cubeDims.h})</div>}
                        {!isSlider && <div className="text-xs text-slate-400">{surfaceArea} exposed face{surfaceArea !== 1 ? 's' : ''}</div>}
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {isSlider ? (
                    <>
                        <button onClick={() => { const l=Math.floor(Math.random()*8)+1; const w=Math.floor(Math.random()*6)+1; const h=Math.floor(Math.random()*6)+1; setCubeDims({l,w,h}); setCubeChallenge({l,w,h,answer:l*w*h}); setCubeAnswer(''); setCubeFeedback(null); setCubeShowLayers(null); }} className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md">🎲 Random Challenge</button>
                        <button onClick={() => { setCubeDims({l:3,w:2,h:2}); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); setCubeRotation({x:-25,y:-35}); setCubeScale(1.0); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">↺ Reset</button>
                        <button onClick={() => { const tl=Math.floor(Math.random()*6)+2; const tw=Math.floor(Math.random()*5)+1; const th=Math.floor(Math.random()*5)+1; setCubeDims({l:1,w:1,h:1}); setCubeChallenge({l:tl,w:tw,h:th,answer:tl*tw*th,buildMode:true}); setCubeAnswer(''); setCubeFeedback(null); setCubeShowLayers(null); }} className="flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md">🏗️ Build Challenge</button>
                    </>
                    ) : (
                    <>
                        <button onClick={() => { setCubePositions(new Set()); const l=2+Math.floor(Math.random()*4); const w=2+Math.floor(Math.random()*3); const h=1+Math.floor(Math.random()*3); setCubeBuilderChallenge({type:'prism',target:{l,w,h},answer:l*w*h}); setCubeBuilderFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md">🏗️ Build Prism</button>
                        <button onClick={() => { const lb=generateLBlock(); setCubePositions(lb.positions); setCubeBuilderChallenge({type:'volume',answer:lb.volume,shape:'L-Block'}); setCubeBuilderFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md">📐 L-Block Volume</button>
                        <button onClick={() => { setCubePositions(new Set()); const tv=5+Math.floor(Math.random()*16); setCubeBuilderChallenge({type:'volume',answer:tv,shape:'any'}); setCubeBuilderFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md">🎲 Random Volume</button>
                    </>
                    )}
                </div>

                {isSlider && cubeChallenge && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-bold text-amber-800 mb-2">{cubeChallenge.buildMode ? '🏗️ Build this shape!' : '🤔 What is the volume?'}</p>
                    <div className="flex gap-2 items-center">
                        <input type="number" value={cubeAnswer} onChange={(e) => setCubeAnswer(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && cubeAnswer) { const ans=parseInt(cubeAnswer); const ok=ans===cubeChallenge.answer; setCubeFeedback(ok?{correct:true,msg:'✅ Correct! '+cubeChallenge.l+'×'+cubeChallenge.w+'×'+cubeChallenge.h+' = '+cubeChallenge.answer}:{correct:false,msg:'❌ Try V = L × W × H'}); setExploreScore(prev=>({correct:prev.correct+(ok?1:0),total:prev.total+1})); }}}
                            placeholder="Volume..." className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono" aria-label="Answer" />
                        {cubeChallenge.buildMode && (
                            <div className="flex-1 text-xs text-amber-700">
                                <p className="font-bold mb-1">Target: {cubeChallenge.l} × {cubeChallenge.w} × {cubeChallenge.h} = {cubeChallenge.answer} cubes</p>
                                <p>Use the sliders to build a prism with volume = {cubeChallenge.answer}</p>
                                <p className={'mt-1 font-bold ' + (cubeDims.l*cubeDims.w*cubeDims.h===cubeChallenge.answer ? 'text-green-600' : 'text-slate-400')}>
                                    Your build: {cubeDims.l}×{cubeDims.w}×{cubeDims.h} = {cubeDims.l*cubeDims.w*cubeDims.h} {cubeDims.l*cubeDims.w*cubeDims.h===cubeChallenge.answer ? '✅ Match!' : ''}
                                </p>
                            </div>
                        )}
                        <button onClick={() => { const ans=parseInt(cubeAnswer); const ok=ans===cubeChallenge.answer; setCubeFeedback(ok?{correct:true,msg:'✅ Correct!'}:{correct:false,msg:'❌ Try again'}); setExploreScore(prev=>({correct:prev.correct+(ok?1:0),total:prev.total+1})); }} disabled={!cubeAnswer} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm disabled:opacity-40">Check</button>
                    </div>
                    {cubeFeedback && <p className={"text-sm font-bold mt-2 " + (cubeFeedback.correct ? "text-green-600" : "text-red-600")}>{cubeFeedback.msg}</p>}
                </div>
                )}

                {!isSlider && cubeBuilderChallenge && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <p className="text-sm font-bold text-indigo-800 mb-2">
                        {cubeBuilderChallenge.type === 'prism' ? `🏗️ Build a ${cubeBuilderChallenge.target.l}×${cubeBuilderChallenge.target.w}×${cubeBuilderChallenge.target.h} rectangular prism` :
                         cubeBuilderChallenge.shape === 'L-Block' ? '📐 What is the volume of this L-shaped block?' :
                         `🎲 Build any shape with volume = ${cubeBuilderChallenge.answer} cubes`}
                    </p>
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 text-xs text-indigo-700">
                            <p>Your cubes: <span className="font-bold text-indigo-900">{cubePositions.size}</span>
                            {cubeBuilderChallenge.type === 'prism' && ` / ${cubeBuilderChallenge.target.l * cubeBuilderChallenge.target.w * cubeBuilderChallenge.target.h} target`}
                            {cubeBuilderChallenge.shape === 'any' && ` / ${cubeBuilderChallenge.answer} target`}
                            </p>
                        </div>
                        <button onClick={checkBuildChallenge} className="px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600 transition-all shadow-md">✔ Check</button>
                    </div>
                    {cubeBuilderFeedback && <p className={"text-sm font-bold mt-2 " + (cubeBuilderFeedback.correct ? "text-green-600" : "text-red-600")}>{cubeBuilderFeedback.msg}</p>}
                </div>
                )}

            </div>
            );
        })()}

        {stemLabTab === 'explore' && stemLabTool === 'base10' && (() => {
            const totalValue = base10Value.ones + base10Value.tens * 10 + base10Value.hundreds * 100 + base10Value.thousands * 1000;
            const checkBase10 = () => {
                if (!base10Challenge) return;
                const ok = totalValue === base10Challenge.target;
                setBase10Feedback(ok ? { correct: true, msg: '✅ Correct! ' + base10Challenge.target + ' = ' + (base10Value.thousands > 0 ? base10Value.thousands + ' thousands + ' : '') + (base10Value.hundreds > 0 ? base10Value.hundreds + ' hundreds + ' : '') + base10Value.tens + ' tens + ' + base10Value.ones + ' ones' } : { correct: false, msg: '❌ Your blocks show ' + totalValue + ', target is ' + base10Challenge.target });
                setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
            };
            const renderBlock = (color, w, h, count) => Array.from({length: count}).map((_,i) => <div key={i} style={{width:w+'px',height:h+'px',background:color,border:'1px solid rgba(0,0,0,0.15)',borderRadius:'2px',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.3)'}} />);
            return (
            <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <h3 className="text-lg font-bold text-orange-800">🧮 Base-10 Blocks</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full hover:bg-emerald-700">💾 Save</button>}
                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'base10', label: 'Base-10: '+(base10Value.ones+base10Value.tens*10+base10Value.hundreds*100+base10Value.thousands*1000), data: {...base10Value}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\U0001f4f8 Snapshot saved!', 'success'); }} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all">
                            📸 Snapshot
                        </button>
                    </div>
                </div>

                <div className="bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6">
                    <div className="text-center mb-4">
                        <span className="text-4xl font-bold text-orange-800 font-mono">{totalValue.toLocaleString()}</span>
                        <span className="text-2xl text-slate-400 mx-3">=</span>
                        <div className="flex items-end gap-1 flex-wrap">
                            {renderBlock('#a855f7', 28, 28, base10Value.thousands)}
                            {base10Value.thousands > 0 && base10Value.hundreds > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#3b82f6', 24, 24, base10Value.hundreds)}
                            {(base10Value.thousands > 0 || base10Value.hundreds > 0) && base10Value.tens > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#22c55e', 8, 36, base10Value.tens)}
                            {(base10Value.thousands > 0 || base10Value.hundreds > 0 || base10Value.tens > 0) && base10Value.ones > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#f59e0b', 10, 10, base10Value.ones)}
                            {totalValue === 0 && <span className="text-sm text-slate-300 italic">no blocks</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-3 border-2 border-purple-200 text-center">
                            <div className="text-xs font-bold text-purple-700 uppercase mb-2">Thousands</div>
                            <div className="flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap">
                                {renderBlock('#a855f7', 28, 28, base10Value.thousands)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setBase10Value(prev => ({...prev, thousands: Math.max(0, prev.thousands-1)}))} className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center">−</button>
                                <span className="text-2xl font-bold text-purple-800 w-8 text-center">{base10Value.thousands}</span>
                                <button onClick={() => setBase10Value(prev => ({...prev, thousands: Math.min(9, prev.thousands+1)}))} className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-lg hover:bg-purple-200 transition-all flex items-center justify-center">+</button>
                            </div>
                            <div className="text-xs text-purple-500 mt-1">×1000 = {base10Value.thousands * 1000}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border-2 border-blue-200 text-center">
                            <div className="text-xs font-bold text-blue-700 uppercase mb-2">Hundreds</div>
                            <div className="flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap">
                                {renderBlock('#3b82f6', 24, 24, base10Value.hundreds)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setBase10Value(prev => ({...prev, hundreds: Math.max(0, prev.hundreds-1)}))} className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center">−</button>
                                <span className="text-2xl font-bold text-blue-800 w-8 text-center">{base10Value.hundreds}</span>
                                <button onClick={() => setBase10Value(prev => ({...prev, hundreds: Math.min(9, prev.hundreds+1)}))} className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-lg hover:bg-blue-200 transition-all flex items-center justify-center">+</button>
                            </div>
                            <div className="text-xs text-blue-500 mt-1">×100 = {base10Value.hundreds * 100}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border-2 border-green-200 text-center">
                            <div className="text-xs font-bold text-green-700 uppercase mb-2">Tens</div>
                            <div className="flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap">
                                {renderBlock('#22c55e', 8, 36, base10Value.tens)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setBase10Value(prev => ({...prev, tens: Math.max(0, prev.tens-1)}))} className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center">−</button>
                                <span className="text-2xl font-bold text-green-800 w-8 text-center">{base10Value.tens}</span>
                                <button onClick={() => setBase10Value(prev => ({...prev, tens: Math.min(9, prev.tens+1)}))} className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 transition-all flex items-center justify-center">+</button>
                            </div>
                            <div className="text-xs text-green-500 mt-1">×10 = {base10Value.tens * 10}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border-2 border-amber-200 text-center">
                            <div className="text-xs font-bold text-amber-700 uppercase mb-2">Ones</div>
                            <div className="flex justify-center gap-1 mb-2 min-h-[48px] flex-wrap">
                                {renderBlock('#f59e0b', 10, 10, base10Value.ones)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setBase10Value(prev => ({...prev, ones: Math.max(0, prev.ones-1)}))} className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center">−</button>
                                <span className="text-2xl font-bold text-amber-800 w-8 text-center">{base10Value.ones}</span>
                                <button onClick={() => setBase10Value(prev => ({...prev, ones: Math.min(9, prev.ones+1)}))} className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-all flex items-center justify-center">+</button>
                            </div>
                            <div className="text-xs text-amber-500 mt-1">×1 = {base10Value.ones}</div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { const t = 10 + Math.floor(Math.random() * 9990); setBase10Challenge({target:t,type:'build'}); setBase10Value({ones:0,tens:0,hundreds:0,thousands:0}); setBase10Feedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md">🎲 Random Number</button>
                    <button onClick={() => { setBase10Value({ones:0,tens:0,hundreds:0,thousands:0}); setBase10Challenge(null); setBase10Feedback(null); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">↺ Reset</button>
                </div>

                {base10Challenge && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-sm font-bold text-orange-800 mb-2">🎯 Show {base10Challenge.target.toLocaleString()} using base-10 blocks</p>
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-orange-600">Your value: <span className="font-bold text-orange-900">{totalValue.toLocaleString()}</span></span>
                        <button onClick={checkBase10} className="ml-auto px-4 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all">✔ Check</button>
                    </div>
                    {base10Feedback && <p className={'text-sm font-bold mt-2 ' + (base10Feedback.correct ? 'text-green-600' : 'text-red-600')}>{base10Feedback.msg}</p>}
                </div>
                )}
            </div>
            );
        })()}

        {stemLabTab === 'explore' && stemLabTool === 'coordinate' && (() => {
            const gridW = 400, gridH = 400;
            const range = gridRange.max - gridRange.min;
            const step = gridW / range;
            const toSvg = (v, axis) => axis === 'x' ? (v - gridRange.min) * step : gridH - (v - gridRange.min) * step;
            const fromSvg = (px, axis) => axis === 'x' ? Math.round(px / step + gridRange.min) : Math.round((gridH - px) / step + gridRange.min);
            const handleGridClick = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = fromSvg(e.clientX - rect.left, 'x');
                const y = fromSvg(e.clientY - rect.top, 'y');
                if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;
                const existing = gridPoints.findIndex(p => p.x === x && p.y === y);
                if (existing >= 0) { setGridPoints(prev => prev.filter((_,i) => i !== existing)); }
                else { setGridPoints(prev => [...prev, {x, y}]); }
                setGridFeedback(null);
            };
            const checkGrid = () => {
                if (!gridChallenge) return;
                if (gridChallenge.type === 'plot') {
                    const ok = gridPoints.some(p => p.x === gridChallenge.target.x && p.y === gridChallenge.target.y);
                    setGridFeedback(ok ? { correct: true, msg: '✅ Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!' } : { correct: false, msg: '❌ Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.' });
                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
                }
            };
            return (
            <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <h3 className="text-lg font-bold text-cyan-800">📍 Coordinate Grid</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'coordinate', label: 'Grid: '+gridPoints.length+' points', data: {points:[...gridPoints]}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\U0001f4f8 Snapshot saved!', 'success'); }} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all">
                            📸 Snapshot
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center">
                    <svg width={gridW} height={gridH} onClick={handleGridClick} className="cursor-crosshair" style={{background:'#f8fafc'}}>
                        {Array.from({length: range + 1}).map((_, i) => {
                            const v = gridRange.min + i;
                            const px = toSvg(v, 'x');
                            const py = toSvg(v, 'y');
                            return React.createElement(React.Fragment, {key:i},
                                React.createElement('line', {x1:px,y1:0,x2:px,y2:gridH,stroke:v===0?'#334155':'#e2e8f0',strokeWidth:v===0?2:0.5}),
                                React.createElement('line', {x1:0,y1:py,x2:gridW,y2:py,stroke:v===0?'#334155':'#e2e8f0',strokeWidth:v===0?2:0.5}),
                                v !== 0 && v % 2 === 0 ? React.createElement('text',{x:toSvg(v,'x'),y:toSvg(0,'y')+14,textAnchor:'middle',className:'text-[9px] fill-slate-400'},v) : null,
                                v !== 0 && v % 2 === 0 ? React.createElement('text',{x:toSvg(0,'x')-8,y:toSvg(v,'y')+3,textAnchor:'end',className:'text-[9px] fill-slate-400'},v) : null
                            );
                        })}
                        {gridPoints.map((p, i) => React.createElement('circle', {key:i, cx:toSvg(p.x,'x'), cy:toSvg(p.y,'y'), r:5, fill:'#0891b2', stroke:'#fff', strokeWidth:2, className:'cursor-pointer'}))}
                        {gridPoints.map((p, i) => React.createElement('text', {key:'t'+i, x:toSvg(p.x,'x')+8, y:toSvg(p.y,'y')-8, className:'text-[10px] fill-cyan-700 font-bold'}, '('+p.x+','+p.y+')'))}
                    </svg>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { const tx = -8+Math.floor(Math.random()*17); const ty = -8+Math.floor(Math.random()*17); setGridChallenge({type:'plot',target:{x:tx,y:ty}}); setGridPoints([]); setGridFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md">📍 Plot a Point</button>
                    <button onClick={() => { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">↺ Clear</button>
                </div>

                {gridChallenge && (
                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                    <p className="text-sm font-bold text-cyan-800 mb-2">📍 Plot the point ({gridChallenge.target.x}, {gridChallenge.target.y})</p>
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-cyan-600">Points placed: <span className="font-bold">{gridPoints.length}</span></span>
                        <button onClick={checkGrid} className="ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600 transition-all">✔ Check</button>
                    </div>
                    {gridFeedback && <p className={'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600')}>{gridFeedback.msg}</p>}
                </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-cyan-100 text-center">
                        <div className="text-xs font-bold text-cyan-600 uppercase mb-1">Points</div>
                        <div className="text-2xl font-bold text-cyan-800">{gridPoints.length}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-cyan-100 text-center">
                        <div className="text-xs font-bold text-cyan-600 uppercase mb-1">Quadrants Used</div>
                        <div className="text-2xl font-bold text-cyan-800">{new Set(gridPoints.map(p => p.x >= 0 && p.y >= 0 ? 'I' : p.x < 0 && p.y >= 0 ? 'II' : p.x < 0 && p.y < 0 ? 'III' : 'IV')).size}</div>
                    </div>
                </div>
            </div>
            );
        })()}

        {stemLabTab === 'explore' && stemLabTool === 'protractor' && (() => {
            const classifyAngle = (a) => a === 0 ? 'Zero' : a < 90 ? 'Acute' : a === 90 ? 'Right' : a < 180 ? 'Obtuse' : a === 180 ? 'Straight' : a < 360 ? 'Reflex' : 'Full';
            const angleClass = classifyAngle(angleValue);
            const rad = angleValue * Math.PI / 180;
            const cx = 200, cy = 200, r = 160, rayLen = 170;
            const rayEndX = cx + rayLen * Math.cos(-rad);
            const rayEndY = cy + rayLen * Math.sin(-rad);
            const arcR = 60;
            const arcEndX = cx + arcR * Math.cos(-rad);
            const arcEndY = cy + arcR * Math.sin(-rad);
            const largeArc = angleValue > 180 ? 1 : 0;
            const handleAngleDrag = (e) => {
                const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                const dx = e.clientX - rect.left - cx;
                const dy = -(e.clientY - rect.top - cy);
                let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
                if (deg < 0) deg += 360;
                setAngleValue(deg);
                setAngleFeedback(null);
            };
            const checkAngle = () => {
                if (!angleChallenge) return;
                if (angleChallenge.type === 'create') {
                    const diff = Math.abs(angleValue - angleChallenge.target);
                    const ok = diff <= 3;
                    setAngleFeedback(ok ? { correct: true, msg: '✅ Correct! ' + angleValue + '° is a ' + classifyAngle(angleValue) + ' angle!' } : { correct: false, msg: '❌ You made ' + angleValue + '°. Target is ' + angleChallenge.target + '°. (within 3°)' });
                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
                } else if (angleChallenge.type === 'classify') {
                    const correctClass = classifyAngle(angleChallenge.target);
                    const ok = classifyAngle(angleValue) === correctClass;
                    setAngleFeedback(ok ? { correct: true, msg: '✅ Correct! ' + angleChallenge.target + '° is ' + correctClass + '.' } : { correct: false, msg: '❌ ' + angleChallenge.target + '° is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.' });
                    setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
                }
            };
            return (
            <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <h3 className="text-lg font-bold text-purple-800">📐 Angle Explorer</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                        <button onClick={() => { const snap = { id: 'snap-'+Date.now(), tool: 'protractor', label: 'Angle: '+angleValue+'\u00b0', data: {angle:angleValue}, timestamp: Date.now() }; setToolSnapshots(prev => [...prev, snap]); addToast('\U0001f4f8 Snapshot saved!', 'success'); }} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all">
                            📸 Snapshot
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-purple-200 p-4 flex justify-center">
                    <svg width={400} height={220} className="select-none">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9d5ff" strokeWidth={1} />
                        {[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330].map(a => {
                            const ar = a * Math.PI / 180;
                            return React.createElement('g', {key:a},
                                React.createElement('line', {x1:cx+(r-8)*Math.cos(-ar),y1:cy+(r-8)*Math.sin(-ar),x2:cx+(r+2)*Math.cos(-ar),y2:cy+(r+2)*Math.sin(-ar),stroke:'#a78bfa',strokeWidth:a%90===0?2:1}),
                                a % 30 === 0 ? React.createElement('text',{x:cx+(r+14)*Math.cos(-ar),y:cy+(r+14)*Math.sin(-ar)+3,textAnchor:'middle',className:'text-[9px] fill-purple-400 font-mono'},a+'°') : null
                            );
                        })}
                        <line x1={cx} y1={cy} x2={cx+rayLen} y2={cy} stroke="#6b7280" strokeWidth={2} />
                        <line x1={cx} y1={cy} x2={rayEndX} y2={rayEndY} stroke="#7c3aed" strokeWidth={3} strokeLinecap="round" />
                        {angleValue > 0 && angleValue < 360 && <path d={`M ${cx+arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`} fill="hsla(270,80%,60%,0.15)" stroke="#7c3aed" strokeWidth={1.5} />}
                        <circle cx={rayEndX} cy={rayEndY} r={10} fill="#7c3aed" fillOpacity={0.2} stroke="#7c3aed" strokeWidth={2} className="cursor-grab" onMouseDown={(e) => { const onMove = (me) => { const rect = e.target.closest('svg').getBoundingClientRect(); const dx = me.clientX - rect.left - cx; const dy = -(me.clientY - rect.top - cy); let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI); if (deg < 0) deg += 360; setAngleValue(deg); setAngleFeedback(null); }; const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }} />
                        <circle cx={cx} cy={cy} r={3} fill="#334155" />
                    </svg>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-purple-100 text-center">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">Angle</div>
                        <div className="text-2xl font-bold text-purple-800">{angleValue}°</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100 text-center">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">Type</div>
                        <div className={`text-lg font-bold ${angleClass === 'Right' ? 'text-green-600' : angleClass === 'Acute' ? 'text-blue-600' : angleClass === 'Obtuse' ? 'text-orange-600' : 'text-red-600'}`}>{angleClass}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100 text-center">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">Slider</div>
                        <input type="range" min={0} max={360} value={angleValue} onChange={(e) => { setAngleValue(parseInt(e.target.value)); setAngleFeedback(null); }} className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { const ta = [15,30,45,60,75,90,105,120,135,150,165,180,210,240,270,300,330][Math.floor(Math.random()*17)]; setAngleChallenge({type:'create',target:ta}); setAngleValue(0); setAngleFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md">🎯 Create Angle</button>
                    <button onClick={() => { setAngleValue(45); setAngleChallenge(null); setAngleFeedback(null); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">↺ Reset</button>
                </div>

                {angleChallenge && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <p className="text-sm font-bold text-purple-800 mb-2">🎯 Create a {angleChallenge.target}° angle (within 3°)</p>
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-purple-600">Your angle: <span className="font-bold text-purple-900">{angleValue}°</span></span>
                        <button onClick={checkAngle} className="ml-auto px-4 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all">✔ Check</button>
                    </div>
                    {angleFeedback && <p className={'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600')}>{angleFeedback.msg}</p>}
                </div>
                )}
            </div>
            );
        })()}

        {stemLabTab === 'explore' && stemLabTool === 'multtable' && (() => {
            const maxNum = 12;
            const checkMult = () => {
                if (!multTableChallenge) return;
                const correct = multTableChallenge.a * multTableChallenge.b;
                const ok = parseInt(multTableAnswer) === correct;
                setMultTableFeedback(ok ? { correct: true, msg: '✅ Correct! ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct } : { correct: false, msg: '❌ Not quite. ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct });
                setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));
            };
            return (
            <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-slate-500" /></button>
                    <h3 className="text-lg font-bold text-pink-800">🔢 Multiplication Table</h3>
                    <div className="flex items-center gap-2 ml-2">
                        <button onClick={() => { setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); }} className={'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' + (multTableHidden ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200')}>
                            {multTableHidden ? '🙈 Hidden' : '👁 Visible'}
                        </button>
                        <div className="text-xs font-bold text-emerald-600">{exploreScore.correct}/{exploreScore.total}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto">
                    <table className="border-collapse w-full text-center">
                        <thead>
                            <tr>
                                <th className="w-8 h-8 text-[10px] font-bold text-pink-400">×</th>
                                {Array.from({length:maxNum}).map((_,c) => <th key={c} className={'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.c === c+1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')}>{c+1}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({length:maxNum}).map((_,r) => (
                                <tr key={r}>
                                    <td className={'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.r === r+1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')}>{r+1}</td>
                                    {Array.from({length:maxNum}).map((_,c) => {
                                        const val = (r+1)*(c+1);
                                        const isHovered = multTableHover && (multTableHover.r === r+1 || multTableHover.c === c+1);
                                        const isExact = multTableHover && multTableHover.r === r+1 && multTableHover.c === c+1;
                                        const isPerfectSquare = r === c;
                                        return <td key={c} onMouseEnter={() => setMultTableHover({r:r+1,c:c+1})} onMouseLeave={() => setMultTableHover(null)} onClick={() => { setMultTableChallenge({a:r+1,b:c+1}); setMultTableAnswer(''); setMultTableFeedback(null); }} className={'w-8 h-8 text-[11px] font-mono cursor-pointer transition-all border border-slate-100 ' + (isExact ? 'bg-pink-500 text-white font-bold scale-110 shadow-lg rounded' : isHovered ? 'bg-pink-50 text-pink-800 font-semibold' : isPerfectSquare ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}>{multTableHidden && !isExact && !multTableRevealed.has(r+'-'+c) ? '?' : val}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { const a = 2+Math.floor(Math.random()*11); const b = 2+Math.floor(Math.random()*11); setMultTableChallenge({a,b}); setMultTableAnswer(''); setMultTableFeedback(null); }} className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md">🎯 Quick Quiz</button>
                    <button onClick={() => { setMultTableChallenge(null); setMultTableAnswer(''); setMultTableFeedback(null); setMultTableHover(null); setMultTableRevealed(new Set()); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">↺ Reset</button>
                </div>

                {multTableChallenge && (
                <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                    <p className="text-lg font-bold text-pink-800 mb-2 text-center">{multTableChallenge.a} × {multTableChallenge.b} = ?</p>
                    <div className="flex gap-2 items-center justify-center">
                        <input type="number" value={multTableAnswer} onChange={(e) => setMultTableAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkMult(); }} className="w-20 px-3 py-2 text-center text-lg font-bold border-2 border-pink-300 rounded-lg focus:border-pink-500 outline-none" placeholder="?" autoFocus />
                        <button onClick={checkMult} disabled={!multTableAnswer} className="px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40">✔ Check</button>
                    </div>
                    {multTableFeedback && <p className={'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')}>{multTableFeedback.msg}</p>}
                </div>
                )}

                <div className="text-[10px] text-slate-400 text-center">
                    <span className="inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1"></span> Perfect squares
                    <span className="ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1"></span> Hover cross
                    <span className="ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1"></span> Selected
                </div>
            </div>
            );
        })()}
        {stemLabTab === 'explore' && stemLabTool === 'numberline' && (
        <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft size={18} className="text-slate-500" /></button>
                <h3 className="text-lg font-bold text-blue-800">📏 Number Line</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <label className="block text-xs text-blue-700 mb-1 font-bold">Min Value</label>
                    <input type="number" value={numberLineRange.min} onChange={(e) => setNumberLineRange(prev => ({...prev, min: parseInt(e.target.value) || 0}))} className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg" />
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <label className="block text-xs text-blue-700 mb-1 font-bold">Max Value</label>
                    <input type="number" value={numberLineRange.max} onChange={(e) => setNumberLineRange(prev => ({...prev, max: parseInt(e.target.value) || 20}))} className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg" />
                </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center">
                <svg width="100%" height="120" viewBox={`0 0 700 120`} className="max-w-full">
                    <line x1="40" y1="60" x2="660" y2="60" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    {Array.from({ length: Math.min(numberLineRange.max - numberLineRange.min + 1, 21) }, (_, i) => {
                        const val = numberLineRange.min + Math.round(i * (numberLineRange.max - numberLineRange.min) / Math.min(numberLineRange.max - numberLineRange.min, 20));
                        const x = 40 + (i / Math.min(numberLineRange.max - numberLineRange.min, 20)) * 620;
                        const isMajor = i % 5 === 0 || i === Math.min(numberLineRange.max - numberLineRange.min, 20);
                        return React.createElement('g', { key: i },
                            React.createElement('line', { x1: x, y1: isMajor ? 42 : 50, x2: x, y2: isMajor ? 78 : 70, stroke: '#3b82f6', strokeWidth: isMajor ? 2.5 : 1.5 }),
                            isMajor && React.createElement('text', { x: x, y: 98, textAnchor: 'middle', fill: '#1e40af', fontSize: '13', fontWeight: 'bold', fontFamily: 'monospace' }, val)
                        );
                    })}
                    {numberLineMarkers.map((marker, i) => {
                        const range = numberLineRange.max - numberLineRange.min;
                        const x = 40 + ((marker.value - numberLineRange.min) / range) * 620;
                        return React.createElement('g', { key: 'marker-' + i },
                            React.createElement('circle', { cx: x, cy: 60, r: 10, fill: marker.color || '#ef4444', stroke: '#fff', strokeWidth: 2, className: 'cursor-pointer' }),
                            React.createElement('text', { x: x, y: 30, textAnchor: 'middle', fill: marker.color || '#ef4444', fontSize: '12', fontWeight: 'bold' }, marker.label || marker.value)
                        );
                    })}
                    <polygon points="660,53 670,60 660,67" fill="#3b82f6" />
                    <polygon points="40,53 30,60 40,67" fill="#3b82f6" />
                </svg>
            </div>
            <div className="flex gap-2 items-center">
                <input type="number" id="nlMarkerVal" min={numberLineRange.min} max={numberLineRange.max} placeholder="Value..." className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg" />
                <input type="text" id="nlMarkerLabel" placeholder="Label (optional)" className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg" />
                <button onClick={() => {
                    const valEl = document.getElementById('nlMarkerVal');
                    const lblEl = document.getElementById('nlMarkerLabel');
                    if (valEl && valEl.value) {
                        const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];
                        setNumberLineMarkers(prev => [...prev, { value: parseFloat(valEl.value), label: lblEl?.value || '', color: colors[prev.length % colors.length] }]);
                        valEl.value = ''; if (lblEl) lblEl.value = '';
                    }
                }} className="px-4 py-2 bg-blue-500 text-white font-bold text-sm rounded-lg hover:bg-blue-600">+ Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {numberLineMarkers.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: m.color }}>
                        {m.label || m.value}
                        <button onClick={() => setNumberLineMarkers(numberLineMarkers.filter((_, j) => j !== i))} className="ml-1 hover:opacity-70">×</button>
                    </span>
                ))}
                {numberLineMarkers.length > 0 && <button onClick={() => setNumberLineMarkers([])} className="text-xs text-slate-400 hover:text-red-500">Clear all</button>}
            </div>
            <div className="flex gap-2">
                {[{ min:0, max:10, label:'0-10' }, { min:0, max:20, label:'0-20' }, { min:0, max:100, label:'0-100' }, { min:-10, max:10, label:'-10 to 10' }].map(preset => (
                    <button key={preset.label} onClick={() => { setNumberLineRange({ min: preset.min, max: preset.max }); setNumberLineMarkers([]); }}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all">{preset.label}</button>
                ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-blue-800">🎯 Number Line Challenge</h4>
                        <div className="flex gap-0.5 ml-2">
                            {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-blue-600">{exploreScore.correct}/{exploreScore.total}</div>
                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full hover:bg-blue-700">💾 Save</button>}
                    </div>
                </div>
                {!nlChallenge ? (
                    <button onClick={() => {
                        const min = numberLineRange.min;
                        const max = numberLineRange.max;
                        const range = max - min;
                        const types = ['locate', 'distance', 'midpoint'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        let ch;
                        if (type === 'locate') {
                            const target = min + Math.floor(Math.random() * range);
                            ch = { type, question: t('explore.nl_locate', { target }), answer: target };
                        } else if (type === 'distance') {
                            const a = min + Math.floor(Math.random() * range);
                            const b = min + Math.floor(Math.random() * range);
                            ch = { type, question: t('explore.nl_distance', { a: Math.min(a,b), b: Math.max(a,b) }), answer: Math.abs(a - b) };
                        } else {
                            const a = min + Math.floor(Math.random() * (range - 2));
                            const b = a + 2 + Math.floor(Math.random() * Math.min(8, range - 2));
                            ch = { type, question: t('explore.nl_midpoint', { a, b }), answer: (a + b) / 2 };
                        }
                        setNlChallenge(ch);
                        setNlAnswer('');
                        setNlFeedback(null);
                    }} className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl text-sm hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md">
                        🎲 Generate Challenge
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-blue-800">{nlChallenge.question}</p>
                        <div className="flex gap-2">
                            <input type="number" step="0.5" value={nlAnswer} onChange={(e) => setNlAnswer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && nlAnswer) { const ans = parseFloat(nlAnswer); const ok = ans === nlChallenge.answer; setNlFeedback(ok ? { correct: true, msg: t('explore.correct') } : { correct: false, msg: '❌ Answer: ' + nlChallenge.answer }); setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 })); }}}
                                placeholder={t('explore.your_answer')} className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono" />
                            <button onClick={() => { const ans = parseFloat(nlAnswer); const ok = ans === nlChallenge.answer; setNlFeedback(ok ? { correct: true, msg: t('explore.correct') } : { correct: false, msg: '❌ Answer: ' + nlChallenge.answer }); setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 })); }}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Check</button>
                        </div>
                        {nlFeedback && <p className={"text-sm font-bold " + (nlFeedback.correct ? "text-green-600" : "text-red-600")}>{nlFeedback.msg}</p>}
                        {nlFeedback && <button onClick={() => { setNlChallenge(null); setNlFeedback(null); setNlAnswer(''); }}
                            className="text-xs text-blue-600 font-bold hover:underline">{t('explore.next_challenge')}</button>}
                    </div>
                )}
            </div>
        </div>
        )}
        {stemLabTab === 'explore' && stemLabTool === 'areamodel' && (
        <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft size={18} className="text-slate-500" /></button>
                <h3 className="text-lg font-bold text-amber-800">🟧 Area Model</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <label className="block text-xs text-amber-700 mb-1 font-bold">Rows (Factor 1)</label>
                    <input type="range" min="1" max="12" value={areaModelDims.rows} onChange={(e) => setAreaModelDims(prev => ({...prev, rows: parseInt(e.target.value)}))} className="w-full accent-amber-600" />
                    <div className="text-center text-lg font-bold text-amber-700">{areaModelDims.rows}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <label className="block text-xs text-amber-700 mb-1 font-bold">Columns (Factor 2)</label>
                    <input type="range" min="1" max="12" value={areaModelDims.cols} onChange={(e) => setAreaModelDims(prev => ({...prev, cols: parseInt(e.target.value)}))} className="w-full accent-amber-600" />
                    <div className="text-center text-lg font-bold text-amber-700">{areaModelDims.cols}</div>
                </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-amber-200 p-4 flex justify-center">
                <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${areaModelDims.cols}, minmax(28px, 48px))` }}>
                    {Array.from({ length: areaModelDims.rows * areaModelDims.cols }, (_, i) => {
                        const row = Math.floor(i / areaModelDims.cols);
                        const col = i % areaModelDims.cols;
                        const isHighlighted = row < areaModelHighlight.rows && col < areaModelHighlight.cols;
                        return React.createElement('div', {
                            key: i,
                            onClick: () => setAreaModelHighlight({ rows: row + 1, cols: col + 1 }),
                            className: 'aspect-square rounded-sm border cursor-pointer transition-all hover:scale-110 ' + (isHighlighted ? 'bg-amber-400 border-amber-500 shadow-sm' : 'bg-amber-100 border-amber-200 hover:bg-amber-200'),
                            style: { minWidth: '28px' }
                        });
                    })}
                </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100 text-center">
                <div className="text-xl font-bold text-amber-800">
                    {areaModelDims.rows} × {areaModelDims.cols} = <span className="text-3xl text-amber-600">{areaModelDims.rows * areaModelDims.cols}</span>
                </div>
                {areaModelHighlight.rows > 0 && areaModelHighlight.cols > 0 && (
                    <div className="text-sm text-amber-600 mt-1">Selected region: {areaModelHighlight.rows} × {areaModelHighlight.cols} = {areaModelHighlight.rows * areaModelHighlight.cols} (click squares to highlight)</div>
                )}
            </div>
            <button onClick={() => setAreaModelHighlight({ rows: 0, cols: 0 })} className="text-xs text-slate-400 hover:text-amber-600">Clear highlight</button>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-800">🎯 Multiplication Challenge</h4>
                        <div className="flex gap-0.5 ml-2">
                            {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-amber-600">{exploreScore.correct}/{exploreScore.total}</div>
                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full hover:bg-amber-700">💾 Save</button>}
                    </div>
                </div>
                {!areaChallenge ? (
                    <button onClick={() => {
                        const adiff = getAdaptiveDifficulty();
                        const amax = adiff === 'easy' ? 5 : adiff === 'hard' ? 12 : 9;
                        const a = Math.floor(Math.random() * (amax - 1)) + 2;
                        const b = Math.floor(Math.random() * (amax - 1)) + 2;
                        setAreaModelDims({ rows: a, cols: b });
                        setAreaModelHighlight({ rows: 0, cols: 0 });
                        setAreaAnswer('');
                        setAreaFeedback(null);
                    }} className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md">
                        🎲 Generate Challenge
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-amber-800">{areaChallenge.question}</p>
                        <div className="flex gap-2">
                            <input type="number" value={areaAnswer} onChange={(e) => setAreaAnswer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && areaAnswer) { const ans = parseInt(areaAnswer); setAreaFeedback(ans === areaChallenge.answer ? { correct: true, msg: t('explore.area_correct', { a: areaChallenge.a, b: areaChallenge.b, product: areaChallenge.answer }) } : { correct: false, msg: t('explore.try_again_count') }); setExploreScore(prev => ({ correct: prev.correct + (ans === areaChallenge.answer ? 1 : 0), total: prev.total + 1 })); }}}
                                placeholder={t('explore.product_placeholder')} className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono" />
                            <button onClick={() => { const ans = parseInt(areaAnswer); setAreaFeedback(ans === areaChallenge.answer ? { correct: true, msg: t('explore.area_correct', { a: areaChallenge.a, b: areaChallenge.b, product: areaChallenge.answer }) } : { correct: false, msg: t('explore.try_again_count') }); setExploreScore(prev => ({ correct: prev.correct + (ans === areaChallenge.answer ? 1 : 0), total: prev.total + 1 })); }}
                                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700">Check</button>
                        </div>
                        {areaFeedback && <p className={"text-sm font-bold " + (areaFeedback.correct ? "text-green-600" : "text-red-600")}>{areaFeedback.msg}</p>}
                        {areaFeedback && <button onClick={() => { setAreaChallenge(null); setAreaFeedback(null); setAreaAnswer(''); }}
                            className="text-xs text-amber-600 font-bold hover:underline">{t('explore.next_challenge')}</button>}
                    </div>
                )}
            </div>
        </div>
        )}
        {stemLabTab === 'explore' && stemLabTool === 'fractions' && (
        <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStemLabTool(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft size={18} className="text-slate-500" /></button>
                <h3 className="text-lg font-bold text-rose-800">🍕 Fraction Tiles</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                    <label className="block text-xs text-rose-700 mb-1 font-bold">Denominator (parts)</label>
                    <input type="range" min="2" max="12" value={fractionPieces.denominator} onChange={(e) => setFractionPieces(prev => ({...prev, denominator: parseInt(e.target.value), numerator: Math.min(prev.numerator, parseInt(e.target.value))}))} className="w-full accent-rose-600" />
                    <div className="text-center text-lg font-bold text-rose-700">{fractionPieces.denominator}</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                    <label className="block text-xs text-rose-700 mb-1 font-bold">Numerator (selected)</label>
                    <input type="range" min="0" max={fractionPieces.denominator} value={fractionPieces.numerator} onChange={(e) => setFractionPieces(prev => ({...prev, numerator: parseInt(e.target.value)}))} className="w-full accent-rose-600" />
                    <div className="text-center text-lg font-bold text-rose-700">{fractionPieces.numerator}</div>
                </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center">
                <svg width="240" height="240" viewBox="-120 -120 240 240">
                    {Array.from({ length: fractionPieces.denominator }, (_, i) => {
                        const startAngle = (i / fractionPieces.denominator) * 2 * Math.PI - Math.PI / 2;
                        const endAngle = ((i + 1) / fractionPieces.denominator) * 2 * Math.PI - Math.PI / 2;
                        const x1 = 100 * Math.cos(startAngle);
                        const y1 = 100 * Math.sin(startAngle);
                        const x2 = 100 * Math.cos(endAngle);
                        const y2 = 100 * Math.sin(endAngle);
                        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
                        const filled = i < fractionPieces.numerator;
                        return React.createElement('path', {
                            key: i,
                            d: `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`,
                            fill: filled ? `hsl(${340 + i * 8}, 70%, ${60 + i * 2}%)` : '#fecdd3',
                            stroke: '#e11d48',
                            strokeWidth: '2',
                            className: 'cursor-pointer hover:opacity-80 transition-opacity',
                            onClick: () => setFractionPieces(prev => ({...prev, numerator: filled && prev.numerator === i + 1 ? i : i + 1}))
                        });
                    })}
                    <circle cx="0" cy="0" r="3" fill="#e11d48" />
                </svg>
            </div>
            <div className="bg-white rounded-xl border-2 border-rose-200 p-4">
                <div className="flex gap-[2px] h-12 rounded-lg overflow-hidden">
                    {Array.from({ length: fractionPieces.denominator }, (_, i) => (
                        React.createElement('div', {
                            key: i,
                            onClick: () => setFractionPieces(prev => ({...prev, numerator: i < prev.numerator ? i : i + 1})),
                            className: `flex-1 cursor-pointer transition-all ${i < fractionPieces.numerator ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-100 hover:bg-rose-200'}`,
                        })
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-rose-100 text-center">
                <div className="inline-flex flex-col items-center">
                    <span className="text-3xl font-bold text-rose-700 border-b-4 border-rose-400 px-4 pb-1">{fractionPieces.numerator}</span>
                    <span className="text-3xl font-bold text-rose-700 px-4 pt-1">{fractionPieces.denominator}</span>
                </div>
                <div className="text-sm text-rose-600 mt-2">
                    = {(fractionPieces.numerator / fractionPieces.denominator * 100).toFixed(0)}%
                    {fractionPieces.numerator > 0 && <span className="text-slate-400 ml-2">≈ {(fractionPieces.numerator / fractionPieces.denominator).toFixed(3)}</span>}
                </div>
                {fractionPieces.numerator === fractionPieces.denominator && <div className="text-sm font-bold text-green-600 mt-1">= 1 whole! 🎉</div>}
            </div>
            <div className="flex flex-wrap gap-2">
                {[{n:1,d:2,l:'½'},{n:1,d:3,l:'⅓'},{n:1,d:4,l:'¼'},{n:2,d:3,l:'⅔'},{n:3,d:4,l:'¾'},{n:3,d:8,l:'⅜'},{n:5,d:6,l:'⅚'}].map(p => (
                    <button key={p.l} onClick={() => setFractionPieces({numerator:p.n,denominator:p.d})} className="px-3 py-1.5 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all">{p.l}</button>
                ))}
            </div>
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-rose-800">🎯 Fraction Challenge</h4>
                        <div className="flex gap-0.5 ml-2">
                            {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={"text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{d}</button>)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-rose-600">{exploreScore.correct}/{exploreScore.total}</div>
                        {exploreScore.total > 0 && <button onClick={submitExploreScore} className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full hover:bg-rose-700">💾 Save</button>}
                    </div>
                </div>
                {!fracChallenge ? (
                    <button onClick={() => {
                        const types = ['identify', 'equivalent', 'compare'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        let ch;
                        if (type === 'identify') {
                            const fdiff = getAdaptiveDifficulty();
                             const dpool = fdiff === 'easy' ? [2,3,4] : fdiff === 'hard' ? [3,4,5,6,8,10,12] : [2,3,4,5,6,8];
                             const d = dpool[Math.floor(Math.random() * dpool.length)];
                            const n = Math.floor(Math.random() * d) + 1;
                            setFractionPieces({ numerator: n, denominator: d });
                            ch = { type, question: t('explore.frac_identify'), answer: n };
                        } else if (type === 'equivalent') {
                            const d = [2,3,4,5,6][Math.floor(Math.random() * 5)];
                            const n = Math.floor(Math.random() * (d-1)) + 1;
                            const mult = Math.floor(Math.random() * 3) + 2;
                            ch = { type, question: t('explore.frac_equivalent', { n, d, target: d*mult }), answer: n * mult };
                        } else {
                            const d1 = [2,3,4,6][Math.floor(Math.random() * 4)];
                            const n1 = Math.floor(Math.random() * d1) + 1;
                            const d2 = [2,3,4,6][Math.floor(Math.random() * 4)];
                            const n2 = Math.floor(Math.random() * d2) + 1;
                            const v1 = n1/d1; const v2 = n2/d2;
                            ch = { type, question: t('explore.frac_compare', { n1, d1, n2, d2 }), answer: v1 >= v2 ? n1 : n2 };
                        }
                        setFracChallenge(ch);
                        setFracAnswer('');
                        setFracFeedback(null);
                    }} className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md">
                        🎲 Generate Challenge
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-rose-800">{fracChallenge.question}</p>
                        <div className="flex gap-2">
                            <input type="number" value={fracAnswer} onChange={(e) => setFracAnswer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && fracAnswer) { const ans = parseInt(fracAnswer); const ok = ans === fracChallenge.answer; setFracFeedback(ok ? { correct: true, msg: t('explore.correct') } : { correct: false, msg: t('explore.answer_was', { answer: fracChallenge.answer }) }); setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 })); }}}
                                placeholder={t('explore.answer_placeholder')} className="flex-1 px-3 py-2 border border-rose-300 rounded-lg text-sm font-mono" />
                            <button onClick={() => { const ans = parseInt(fracAnswer); const ok = ans === fracChallenge.answer; setFracFeedback(ok ? { correct: true, msg: t('explore.correct') } : { correct: false, msg: t('explore.answer_was', { answer: fracChallenge.answer }) }); setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 })); }}
                                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700">Check</button>
                        </div>
                        {fracFeedback && <p className={"text-sm font-bold " + (fracFeedback.correct ? "text-green-600" : "text-red-600")}>{fracFeedback.msg}</p>}
                        {fracFeedback && <button onClick={() => { setFracChallenge(null); setFracFeedback(null); setFracAnswer(''); }}
                            className="text-xs text-rose-600 font-bold hover:underline">{t('explore.next_challenge')}</button>}
                    </div>
                )}
            </div>
        </div>
        )}
    </div>
</div>
</div>

)}


window.AlloModules = window.AlloModules || {};
window.AlloModules.StemLab = StemLab;
