const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// ============================================================
// STEP 1: Add new state variables after existing cube states
// ============================================================

const insertAfter = '  const [cubeFeedback, setCubeFeedback] = useState(null);';
const newStates = `  const [cubeFeedback, setCubeFeedback] = useState(null);
  const [cubeRotation, setCubeRotation] = useState({ x: -25, y: -35 });
  const [cubeScale, setCubeScale] = useState(1.0);
  const [cubeShowLayers, setCubeShowLayers] = useState(null);
  const cubeDragRef = React.useRef(null);`;

content = content.replace(insertAfter, newStates);
console.log('STEP 1: Added cubeRotation, cubeScale, cubeShowLayers state');

// ============================================================
// STEP 2: Replace the Volume Builder rendering (L59690-59781)
// ============================================================

const oldVolumeStart = "{mathMode === 'Volume Builder' && (() => {";
const oldVolumeEnd = "                        })()}";

// Find the start
const startIdx = content.indexOf(oldVolumeStart);
if (startIdx === -1) {
    console.log('ERROR: Could not find Volume Builder start marker');
    process.exit(1);
}

// Find the matching end - look for the })() that closes this IIFE
// It's the })() after the last closing div of the Volume Builder
let searchFrom = startIdx;
// Find "})()}" after cubeChallenge section
const endMarker = "                        })()}";
let endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
    // Try without exact whitespace
    const altEnd = "})()}";
    endIdx = content.indexOf(altEnd, startIdx + 100);
    if (endIdx === -1) {
        console.log('ERROR: Could not find Volume Builder end marker');
        process.exit(1);
    }
    endIdx += altEnd.length;
} else {
    endIdx += endMarker.length;
}

console.log('Found Volume Builder block:', startIdx, '-', endIdx, '(' + (endIdx - startIdx) + ' chars)');

// The new 3D Volume Builder
const new3DBuilder = `{mathMode === 'Volume Builder' && (() => {
                            const volume = cubeDims.l * cubeDims.w * cubeDims.h;
                            const surfaceArea = 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h);
                            const cubeUnit = Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h)));
                            const handleCubeDrag = (e) => {
                                if (!cubeDragRef.current) return;
                                const dx = e.clientX - cubeDragRef.current.x;
                                const dy = e.clientY - cubeDragRef.current.y;
                                setCubeRotation(prev => ({
                                    x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)),
                                    y: prev.y + dx * 0.5
                                }));
                                cubeDragRef.current = { x: e.clientX, y: e.clientY };
                            };
                            const handleCubeDragEnd = () => { cubeDragRef.current = null; window.removeEventListener('mousemove', handleCubeDrag); window.removeEventListener('mouseup', handleCubeDragEnd); };
                            const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;
                            const cubeGridElements = [];
                            for (let z = 0; z < maxLayer; z++)
                                for (let y = 0; y < cubeDims.w; y++)
                                    for (let x = 0; x < cubeDims.l; x++) {
                                        const hue = 140 + z * 12;
                                        const lightness = 55 + z * 4;
                                        cubeGridElements.push(
                                            React.createElement('div', {
                                                key: x + '-' + y + '-' + z,
                                                style: {
                                                    position: 'absolute',
                                                    width: cubeUnit + 'px', height: cubeUnit + 'px',
                                                    transform: 'translate3d(' + (x * cubeUnit) + 'px, ' + (-(z) * cubeUnit) + 'px, ' + (y * cubeUnit) + 'px)',
                                                    transformStyle: 'preserve-3d'
                                                }
                                            },
                                            // Front face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: '100%',
                                                transform: 'translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + hue + ',' + '70%,' + lightness + '%,0.85)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                                                boxSizing: 'border-box'
                                            }}),
                                            // Back face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: '100%',
                                                transform: 'rotateY(180deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + hue + ',' + '65%,' + (lightness+5) + '%,0.7)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            // Left face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: cubeUnit + 'px', height: '100%',
                                                transform: 'rotateY(-90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+10) + ',' + '60%,' + (lightness-5) + '%,0.8)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            // Right face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: cubeUnit + 'px', height: '100%',
                                                transform: 'rotateY(90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+10) + ',' + '60%,' + (lightness+3) + '%,0.8)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            // Top face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: cubeUnit + 'px',
                                                transform: 'rotateX(90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue-5) + ',' + '75%,' + (lightness+8) + '%,0.9)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                                                boxSizing: 'border-box'
                                            }}),
                                            // Bottom face
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: cubeUnit + 'px',
                                                transform: 'rotateX(-90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+5) + ',' + '55%,' + (lightness-8) + '%,0.6)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.2)',
                                                boxSizing: 'border-box'
                                            }})
                                        ));
                                    }
                            return (
                            <div className="space-y-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                        📦 3D Volume Explorer
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCubeScale(s => Math.max(0.4, s - 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label="Zoom out">−</button>
                                        <span className="text-[10px] text-emerald-600 font-mono w-10 text-center">{Math.round(cubeScale * 100)}%</span>
                                        <button onClick={() => setCubeScale(s => Math.min(2.5, s + 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label="Zoom in">+</button>
                                        <button onClick={() => { setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }} className="ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100 transition-all" aria-label="Reset view">↺</button>
                                    </div>
                                </div>
                                <p className="text-xs text-emerald-700/70">Drag to rotate • Scroll to zoom • Build rectangular prisms with unit cubes (5.MD.3-5)</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {['l','w','h'].map(dim => (
                                        <div key={dim}>
                                            <label className="block text-xs text-slate-500 mb-1 font-bold uppercase">{dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'}</label>
                                            <input type="range" min="1" max="10" value={cubeDims[dim]}
                                                onChange={(e) => { setCubeDims(prev => ({...prev, [dim]: parseInt(e.target.value)})); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); }}
                                                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                                aria-label={dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'} />
                                            <div className="text-center text-sm font-bold text-emerald-700 mt-1">{cubeDims[dim]}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* 3D Viewport */}
                                <div
                                    className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
                                    style={{ minHeight: '400px', perspective: '900px' }}
                                    onMouseDown={(e) => { cubeDragRef.current = { x: e.clientX, y: e.clientY }; window.addEventListener('mousemove', handleCubeDrag); window.addEventListener('mouseup', handleCubeDragEnd); }}
                                    onWheel={(e) => { e.preventDefault(); setCubeScale(s => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08)))); }}
                                    onTouchStart={(e) => { if (e.touches.length === 1) cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                                    onTouchMove={(e) => { if (cubeDragRef.current && e.touches.length === 1) { const dx = e.touches[0].clientX - cubeDragRef.current.x; const dy = e.touches[0].clientY - cubeDragRef.current.y; setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)), y: prev.y + dx * 0.5 })); cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
                                    onTouchEnd={() => { cubeDragRef.current = null; }}
                                >
                                    <div style={{
                                        transformStyle: 'preserve-3d',
                                        transform: 'rotateX(' + cubeRotation.x + 'deg) rotateY(' + cubeRotation.y + 'deg) scale(' + cubeScale + ')',
                                        transition: cubeDragRef.current ? 'none' : 'transform 0.15s ease-out',
                                        position: 'relative',
                                        width: (cubeDims.l * cubeUnit) + 'px',
                                        height: (cubeDims.h * cubeUnit) + 'px'
                                    }}>
                                        {cubeGridElements}
                                    </div>
                                </div>
                                {/* Layer slider */}
                                <div className="flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">Layers:</span>
                                    <input type="range" min="1" max={cubeDims.h} value={cubeShowLayers !== null ? cubeShowLayers : cubeDims.h}
                                        onChange={(e) => setCubeShowLayers(parseInt(e.target.value))}
                                        className="flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                    <span className="text-xs font-mono text-emerald-600 w-12 text-center">{cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} / {cubeDims.h}</span>
                                    {cubeShowLayers !== null && cubeShowLayers < cubeDims.h && <button onClick={() => setCubeShowLayers(null)} className="text-xs text-emerald-500 hover:text-emerald-700 font-bold">All</button>}
                                </div>
                                {/* Volume & Surface Area */}
                                <div className="bg-white/80 rounded-lg p-3 border border-emerald-100">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Volume</div>
                                            <div className="text-lg font-bold text-emerald-800">
                                                V = {cubeDims.l} × {cubeDims.w} × {cubeDims.h} = <span className="text-2xl text-emerald-600">{volume}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">{volume} unit cube{volume !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Surface Area</div>
                                            <div className="text-lg font-bold text-teal-800">
                                                SA = <span className="text-2xl text-teal-600">{surfaceArea}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">2({cubeDims.l}×{cubeDims.w} + {cubeDims.l}×{cubeDims.h} + {cubeDims.w}×{cubeDims.h})</div>
                                        </div>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        const l = Math.floor(Math.random() * 8) + 1;
                                        const w = Math.floor(Math.random() * 6) + 1;
                                        const h = Math.floor(Math.random() * 6) + 1;
                                        setCubeDims({ l, w, h });
                                        setCubeChallenge({ l, w, h, answer: l * w * h });
                                        setCubeAnswer('');
                                        setCubeFeedback(null);
                                        setCubeShowLayers(null);
                                    }} className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md">
                                        🎲 Random Challenge
                                    </button>
                                    <button onClick={() => { setCubeDims({ l: 3, w: 2, h: 2 }); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">
                                        ↺ Reset
                                    </button>
                                </div>
                                {cubeChallenge && (
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                        <p className="text-sm font-bold text-amber-800 mb-2">🤔 What is the volume of this rectangular prism?</p>
                                        <div className="flex gap-2 items-center">
                                            <input type="number" value={cubeAnswer}
                                                onChange={(e) => setCubeAnswer(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && cubeAnswer) { const ans = parseInt(cubeAnswer); setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: '✅ Correct! ' + cubeChallenge.l + ' × ' + cubeChallenge.w + ' × ' + cubeChallenge.h + ' = ' + cubeChallenge.answer + ' cubic units' } : { correct: false, msg: '❌ Not quite. Try V = L × W × H' }); } }}
                                                placeholder="Enter volume..."
                                                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                                                aria-label="Volume answer" />
                                            <button onClick={() => { const ans = parseInt(cubeAnswer); setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: '✅ Correct! ' + cubeChallenge.l + ' × ' + cubeChallenge.w + ' × ' + cubeChallenge.h + ' = ' + cubeChallenge.answer + ' cubic units' } : { correct: false, msg: '❌ Not quite. Try V = L × W × H' }); }}
                                                disabled={!cubeAnswer}
                                                className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-all">
                                                Check
                                            </button>
                                        </div>
                                        {cubeFeedback && <p className={'text-sm font-bold mt-2 ' + (cubeFeedback.correct ? 'text-green-600' : 'text-red-600')}>{cubeFeedback.msg}</p>}
                                    </div>
                                )}
                            </div>
                            );
                        })()}`;

// Replace
const before = content.substring(0, startIdx);
const after = content.substring(endIdx);
content = before + new3DBuilder + after;
console.log('STEP 2: Replaced Volume Builder with 3D version');

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
