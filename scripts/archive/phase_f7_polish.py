r"""
Phase F7: Visual Support Polish — All 5 features
1. Label leader lines (SVG arrows from label to image center-point)
2. Accessibility (keyboard nav, ARIA roles, focus management)
3. Panel reordering (drag panels to swap positions)
4. Undo/redo for label edits (history stack)
5. Drawing overlay (whiteboard-style freehand, circles, arrows)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
injected = 0

# ─────────────────────────────────────────────────────────
# 1. CSS for leader lines, drawing overlay, panel reorder
# ─────────────────────────────────────────────────────────
CSS_ADDITIONS = """/* Visual Art Director: Phase F7 Polish */
.visual-leader-line { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.visual-leader-line line { stroke: #6366f1; stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.7; }
.visual-leader-line circle { fill: #6366f1; opacity: 0.8; }
.visual-panel.drag-over { outline: 3px dashed #6366f1; outline-offset: -3px; background: #eef2ff; }
.visual-panel[draggable="true"] { cursor: grab; }
.visual-panel[draggable="true"]:active { cursor: grabbing; opacity: 0.7; }
.visual-label:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
.visual-label[tabindex] { outline: none; }
.visual-undo-redo { display: flex; gap: 4px; }
.visual-undo-redo button { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; color: #64748b; transition: all 0.15s; }
.visual-undo-redo button:hover:not(:disabled) { background: #f1f5f9; border-color: #6366f1; color: #4f46e5; }
.visual-undo-redo button:disabled { opacity: 0.3; cursor: not-allowed; }
.drawing-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3; }
.drawing-overlay.active { cursor: crosshair; }
.drawing-overlay svg { width: 100%; height: 100%; }
.drawing-toolbar { display: flex; gap: 4px; align-items: center; }
.drawing-toolbar button { padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; font-size: 11px; cursor: pointer; transition: all 0.15s; }
.drawing-toolbar button:hover { background: #fef3c7; border-color: #f59e0b; }
.drawing-toolbar button.active { background: #fbbf24; color: #78350f; border-color: #f59e0b; }
.drawing-toolbar .color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #e2e8f0; cursor: pointer; transition: transform 0.15s; }
.drawing-toolbar .color-dot:hover { transform: scale(1.2); }
.drawing-toolbar .color-dot.selected { border-color: #1e293b; transform: scale(1.15); box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
"""

for i, l in enumerate(lines):
    if '.visual-panel.adding-label' in l:
        lines.insert(i, CSS_ADDITIONS)
        injected += 1
        print(f"[OK] CSS: Injected F7 styles before L{i+1}")
        break

# ─────────────────────────────────────────────────────────
# 2. Enhanced VisualPanelGrid — add all F7 capabilities
# Find and enhance the component with new state + logic
# ─────────────────────────────────────────────────────────

# Add enhanced state variables after existing state
for i, l in enumerate(lines):
    if 'const [addingLabelPanel, setAddingLabelPanel]' in l:
        enhanced_state = """    // F7: Panel reorder state
    const [dragOverPanel, setDragOverPanel] = React.useState(null);
    const [panelOrder, setPanelOrder] = React.useState(null); // null = use original order
    // F7: Undo/redo label history
    const [labelHistory, setLabelHistory] = React.useState([]);
    const [labelHistoryIndex, setLabelHistoryIndex] = React.useState(-1);
    // F7: Drawing overlay state
    const [drawingMode, setDrawingMode] = React.useState(null); // null | 'freehand' | 'arrow' | 'circle' | 'highlight'
    const [drawingColor, setDrawingColor] = React.useState('#ef4444');
    const [drawings, setDrawings] = React.useState({}); // { panelIdx: [{ type, points, color }] }
    const [currentPath, setCurrentPath] = React.useState(null);
    const [drawingStart, setDrawingStart] = React.useState(null);
"""
        lines.insert(i + 1, enhanced_state)
        injected += 1
        print(f"[OK] State: Added F7 state variables after L{i+1}")
        break

# Add F7 handler functions after the existing user label handlers
# Find the useEffect for dragging (the last F6 handler)
for i, l in enumerate(lines):
    if "window.removeEventListener('mouseup', handleLabelDragEnd)" in l:
        # Find the closing of this useEffect
        for j in range(i, min(len(lines), i + 5)):
            if '}, [draggingLabel' in lines[j]:
                f7_handlers = r"""
    // === F7: Panel Reordering ===
    const handlePanelDragStart = (e, panelIdx) => {
        e.dataTransfer.setData('text/plain', panelIdx.toString());
        e.dataTransfer.effectAllowed = 'move';
    };
    const handlePanelDragOver = (e, panelIdx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverPanel(panelIdx);
    };
    const handlePanelDrop = (e, targetIdx) => {
        e.preventDefault();
        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
        if (sourceIdx === targetIdx) { setDragOverPanel(null); return; }
        const currentOrder = panelOrder || visualPlan.panels.map((_, i) => i);
        const newOrder = [...currentOrder];
        const [moved] = newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, moved);
        setPanelOrder(newOrder);
        setDragOverPanel(null);
    };

    // === F7: Undo/Redo for Labels ===
    const pushLabelSnapshot = () => {
        const snapshot = JSON.stringify(userLabels);
        const newHistory = labelHistory.slice(0, labelHistoryIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > 30) newHistory.shift(); // Cap history
        setLabelHistory(newHistory);
        setLabelHistoryIndex(newHistory.length - 1);
    };
    const handleUndo = () => {
        if (labelHistoryIndex <= 0) return;
        const prevIdx = labelHistoryIndex - 1;
        setUserLabels(JSON.parse(labelHistory[prevIdx]));
        setLabelHistoryIndex(prevIdx);
    };
    const handleRedo = () => {
        if (labelHistoryIndex >= labelHistory.length - 1) return;
        const nextIdx = labelHistoryIndex + 1;
        setUserLabels(JSON.parse(labelHistory[nextIdx]));
        setLabelHistoryIndex(nextIdx);
    };

    // === F7: Drawing Overlay ===
    const getRelativePos = (e, panel) => {
        const rect = panel.getBoundingClientRect();
        return { x: ((e.clientX - rect.left) / rect.width * 100), y: ((e.clientY - rect.top) / rect.height * 100) };
    };
    const handleDrawStart = (e, panelIdx) => {
        if (!drawingMode) return;
        e.preventDefault();
        const pos = getRelativePos(e, e.currentTarget);
        if (drawingMode === 'freehand' || drawingMode === 'highlight') {
            setCurrentPath({ panelIdx, type: drawingMode, color: drawingColor, points: [pos] });
        } else {
            setDrawingStart({ panelIdx, pos });
        }
    };
    const handleDrawMove = (e) => {
        if (!drawingMode) return;
        if (currentPath) {
            const panel = e.currentTarget;
            const pos = getRelativePos(e, panel);
            setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
        }
    };
    const handleDrawEnd = (e) => {
        if (!drawingMode) return;
        if (currentPath) {
            // Freehand or highlight complete
            setDrawings(prev => ({
                ...prev,
                [currentPath.panelIdx]: [...(prev[currentPath.panelIdx] || []), currentPath]
            }));
            setCurrentPath(null);
        } else if (drawingStart) {
            // Arrow or circle complete
            const panel = e.currentTarget;
            const endPos = getRelativePos(e, panel);
            const shape = {
                panelIdx: drawingStart.panelIdx,
                type: drawingMode,
                color: drawingColor,
                start: drawingStart.pos,
                end: endPos
            };
            setDrawings(prev => ({
                ...prev,
                [drawingStart.panelIdx]: [...(prev[drawingStart.panelIdx] || []), shape]
            }));
            setDrawingStart(null);
        }
    };
    const clearDrawings = (panelIdx) => {
        setDrawings(prev => ({ ...prev, [panelIdx]: [] }));
    };

    const renderDrawingSVG = (panelIdx) => {
        const panelDrawings = drawings[panelIdx] || [];
        if (panelDrawings.length === 0 && !currentPath && !drawingStart) return null;
        return (
            <svg className="drawing-overlay" viewBox="0 0 100 100" preserveAspectRatio="none"
                 onMouseDown={(e) => handleDrawStart(e, panelIdx)}
                 onMouseMove={handleDrawMove}
                 onMouseUp={handleDrawEnd}
                 style={{ pointerEvents: drawingMode ? 'auto' : 'none' }}
            >
                {panelDrawings.map((d, idx) => {
                    if (d.type === 'freehand' && d.points.length > 1) {
                        const pathData = d.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return <path key={idx} d={pathData} fill="none" stroke={d.color} strokeWidth="0.5" strokeLinecap="round" />;
                    }
                    if (d.type === 'highlight' && d.points.length > 1) {
                        const pathData = d.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return <path key={idx} d={pathData} fill="none" stroke={d.color} strokeWidth="3" strokeLinecap="round" opacity="0.35" />;
                    }
                    if (d.type === 'arrow' && d.start && d.end) {
                        const angle = Math.atan2(d.end.y - d.start.y, d.end.x - d.start.x);
                        const headLen = 2;
                        return <g key={idx}>
                            <line x1={d.start.x} y1={d.start.y} x2={d.end.x} y2={d.end.y} stroke={d.color} strokeWidth="0.4" />
                            <polygon points={`${d.end.x},${d.end.y} ${d.end.x - headLen * Math.cos(angle - 0.4)},${d.end.y - headLen * Math.sin(angle - 0.4)} ${d.end.x - headLen * Math.cos(angle + 0.4)},${d.end.y - headLen * Math.sin(angle + 0.4)}`} fill={d.color} />
                        </g>;
                    }
                    if (d.type === 'circle' && d.start && d.end) {
                        const cx = (d.start.x + d.end.x) / 2;
                        const cy = (d.start.y + d.end.y) / 2;
                        const rx = Math.abs(d.end.x - d.start.x) / 2;
                        const ry = Math.abs(d.end.y - d.start.y) / 2;
                        return <ellipse key={idx} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={d.color} strokeWidth="0.4" />;
                    }
                    return null;
                })}
                {/* Current drawing being made */}
                {currentPath && currentPath.panelIdx === panelIdx && currentPath.points.length > 1 && (
                    <path d={currentPath.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                          fill="none" stroke={currentPath.color} strokeWidth={currentPath.type === 'highlight' ? '3' : '0.5'}
                          strokeLinecap="round" opacity={currentPath.type === 'highlight' ? 0.35 : 1} />
                )}
            </svg>
        );
    };

    // F7: Leader lines SVG renderer
    const renderLeaderLines = (panel, panelIdx) => {
        const allLabels = [
            ...(panel.labels || []).map(l => ({ ...l, posObj: LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'] })),
        ];
        if (allLabels.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none">
                {allLabels.map((label, idx) => {
                    const pos = label.posObj;
                    // Calculate label position as percentage
                    let lx = 50, ly = 50;
                    if (pos.left) lx = parseFloat(pos.left);
                    if (pos.right) lx = 100 - parseFloat(pos.right);
                    if (pos.top) ly = parseFloat(pos.top);
                    if (pos.bottom) ly = 100 - parseFloat(pos.bottom);
                    // Target is image center (50,50) for simplicity
                    const tx = 50, ty = 50;
                    // Only draw if label is far enough from center
                    const dist = Math.sqrt((lx - tx) ** 2 + (ly - ty) ** 2);
                    if (dist < 15) return null;
                    return (
                        <g key={idx}>
                            <line x1={lx} y1={ly} x2={tx} y2={ty} />
                            <circle cx={tx} cy={ty} r="1" />
                        </g>
                    );
                })}
            </svg>
        );
    };

    // Ordered panels (respects reorder)
    const orderedPanels = React.useMemo(() => {
        if (!panelOrder) return visualPlan.panels;
        return panelOrder.map(idx => visualPlan.panels[idx]).filter(Boolean);
    }, [panelOrder, visualPlan.panels]);

"""
                lines.insert(j + 1, f7_handlers)
                injected += 1
                print(f"[OK] Handlers: Added F7 handlers after L{j+1}")
                break
        break

# ─────────────────────────────────────────────────────────
# 3. Update the grid controls bar (add undo/redo + drawing tools)
# Find the visual-grid-controls div
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if 'visual-grid-controls' in l and 'className' in l and 'div' in l and i < 2500:
        # Find the end of the grid controls div (the closing </div>)
        for j in range(i, min(len(lines), i + 15)):
            if '</div>' in lines[j] and j > i + 2:
                # Insert undo/redo + drawing tools before closing div
                extra_controls = """                <div className="visual-undo-redo">
                    <button onClick={handleUndo} disabled={labelHistoryIndex <= 0} title="Undo label change" aria-label="Undo">↩️</button>
                    <button onClick={handleRedo} disabled={labelHistoryIndex >= labelHistory.length - 1} title="Redo label change" aria-label="Redo">↪️</button>
                </div>
                <div className="drawing-toolbar">
                    <button onClick={() => setDrawingMode(drawingMode === 'freehand' ? null : 'freehand')} className={drawingMode === 'freehand' ? 'active' : ''} title="Freehand draw" aria-label="Freehand draw">✏️</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'arrow' ? null : 'arrow')} className={drawingMode === 'arrow' ? 'active' : ''} title="Draw arrow" aria-label="Draw arrow">➡️</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')} className={drawingMode === 'circle' ? 'active' : ''} title="Draw circle" aria-label="Draw circle">⭕</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'highlight' ? null : 'highlight')} className={drawingMode === 'highlight' ? 'active' : ''} title="Highlighter" aria-label="Highlighter">🖍️</button>
                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} className={`color-dot ${drawingColor === c ? 'selected' : ''}`} style={{background: c}} onClick={() => setDrawingColor(c)} title={c} />
                    ))}
                </div>
"""
                lines.insert(j, extra_controls)
                injected += 1
                print(f"[OK] Controls: Added undo/redo + drawing toolbar before L{j+1}")
                break
        break

# ─────────────────────────────────────────────────────────
# 4. Update panel rendering to use orderedPanels, add drag attrs,
#    leader lines, drawing overlay, and ARIA
# ─────────────────────────────────────────────────────────
# Replace visualPlan.panels.map with orderedPanels.map
for i, l in enumerate(lines):
    if 'visualPlan.panels.map((panel, panelIdx)' in l and i < 2500:
        lines[i] = l.replace('visualPlan.panels.map((panel, panelIdx)', 'orderedPanels.map((panel, panelIdx)')
        injected += 1
        print(f"[OK] Map: Switched to orderedPanels at L{i+1}")
        break

# Add draggable + ARIA attributes to figure.visual-panel
for i, l in enumerate(lines):
    if "handleAddUserLabel(panelIdx, e)" in l and '<figure' in l and i < 2500:
        # Add drag handlers and ARIA
        old_attrs = 'onClick={(e) => addingLabelPanel === panelIdx && handleAddUserLabel(panelIdx, e)} style={addingLabelPanel === panelIdx ? { cursor: "crosshair" } : {}}'
        new_attrs = 'onClick={(e) => addingLabelPanel === panelIdx && handleAddUserLabel(panelIdx, e)} style={addingLabelPanel === panelIdx ? { cursor: "crosshair" } : {}} draggable="true" onDragStart={(e) => handlePanelDragStart(e, panelIdx)} onDragOver={(e) => handlePanelDragOver(e, panelIdx)} onDrop={(e) => handlePanelDrop(e, panelIdx)} onDragLeave={() => setDragOverPanel(null)} role="img" aria-label={panel.caption || `Panel ${panelIdx + 1}`} tabIndex={0}'
        if old_attrs in l:
            lines[i] = l.replace(old_attrs, new_attrs)
            injected += 1
            print(f"[OK] Drag+ARIA: Added to figure at L{i+1}")
        break

# Add drag-over class
for i, l in enumerate(lines):
    if '<figure className="visual-panel"' in l and 'handlePanelDragStart' in l and i < 2500:
        lines[i] = l.replace(
            'className="visual-panel"',
            'className={`visual-panel ${dragOverPanel === panelIdx ? "drag-over" : ""}`}'
        )
        injected += 1
        print(f"[OK] DragOver: Added dynamic class at L{i+1}")
        break

# Add leader lines + drawing overlay rendering inside each panel
# Find the img tag inside the panel and add SVGs after it
for i, l in enumerate(lines):
    if 'panel.imageUrl' in l and '<img' in l and 'loading="lazy"' in l and i < 2500:
        # Insert leader lines + drawing overlay after the img line
        overlay_code = """                            {/* F7: Leader Lines */}
                            {!labelsHidden && renderLeaderLines(panel, panelIdx)}
                            {/* F7: Drawing Overlay */}
                            {renderDrawingSVG(panelIdx)}
"""
        lines.insert(i + 1, overlay_code)
        injected += 1
        print(f"[OK] Overlays: Added leader lines + drawing SVG after img at L{i+1}")
        break

# Add ARIA and tabIndex to AI-generated labels
for i, l in enumerate(lines):
    if "visual-label ${labelsHidden" in l and 'title={ts' in l and i < 2500:
        if 'tabIndex' not in l:
            lines[i] = l.replace(
                "title={ts('visual_director.click_to_edit_label')",
                "role=\"note\" tabIndex={0} aria-label={label.text} title={ts('visual_director.click_to_edit_label')"
            )
            injected += 1
            print(f"[OK] ARIA: Added to AI labels at L{i+1}")
        break

# Add ARIA and keyboard to user-created labels
for i, l in enumerate(lines):
    if 'User-Created Draggable Labels' in l and i < 2500:
        # Find the user label div
        for j in range(i, min(len(lines), i + 5)):
            if 'key={`user-' in lines[j]:
                for k in range(j, min(len(lines), j + 5)):
                    if 'onMouseDown' in lines[k] and 'handleLabelDragStart' in lines[k]:
                        lines[k] = lines[k].replace(
                            'onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)}',
                            'onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)} role="note" tabIndex={0} aria-label={uLabel.text} onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") handleDeleteUserLabel(panelIdx, uLabel.id); }}'
                        )
                        injected += 1
                        print(f"[OK] ARIA: Added to user labels at L{k+1}")
                        break
                break
        break

# Snapshot labels on change (for undo/redo)
# Wrap the existing handleAddUserLabel to push history
for i, l in enumerate(lines):
    if 'const handleAddUserLabel = (panelIdx, e)' in l and i < 2500:
        # Find the setUserLabels call inside
        for j in range(i+1, min(len(lines), i + 8)):
            if 'setUserLabels(prev' in lines[j]:
                # Add pushLabelSnapshot before the state update
                lines.insert(j, "        pushLabelSnapshot();\n")
                injected += 1
                print(f"[OK] History: Added pushLabelSnapshot to handleAddUserLabel at L{j+1}")
                break
        break

# Also add snapshot to delete handler
for i, l in enumerate(lines):
    if 'const handleDeleteUserLabel = (panelIdx, labelId)' in l and i < 2500:
        for j in range(i+1, min(len(lines), i + 5)):
            if 'setUserLabels(prev' in lines[j]:
                lines.insert(j, "        pushLabelSnapshot();\n")
                injected += 1
                print(f"[OK] History: Added pushLabelSnapshot to handleDeleteUserLabel at L{j+1}")
                break
        break

# ─────────────────────────────────────────────────────────
# 5. Add "Clear drawings" button to panel actions
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if "Add label to panel" in l and i < 2500:
        # Find the closing of this button
        for j in range(i, min(len(lines), i + 12)):
            if '</button>' in lines[j] and j > i + 3:
                clear_btn = """                                <button
                                    aria-label="Clear drawings on this panel"
                                    onClick={(e) => { e.stopPropagation(); clearDrawings(panelIdx); }}
                                    title="Clear drawings"
                                    style={(drawings[panelIdx] || []).length > 0 ? { background: '#fef2f2', borderColor: '#fca5a5' } : {}}
                                >
                                    🧹
                                </button>
"""
                lines.insert(j + 1, clear_btn)
                injected += 1
                print(f"[OK] Button: Added 'Clear drawings' button after L{j+1}")
                break
        break

# Also update visualPlan.panels.length references that should now use orderedPanels
for i, l in enumerate(lines):
    if 'visualPlan.panels.length - 1' in l and 'sequence' in l and i < 2500:
        lines[i] = l.replace('visualPlan.panels.length - 1', 'orderedPanels.length - 1')
        injected += 1
        print(f"[OK] Ref: Updated sequence arrow check to orderedPanels at L{i+1}")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\n{'='*50}")
print(f"Phase F7 complete! {injected} injections applied.")
print(f"{'='*50}")
