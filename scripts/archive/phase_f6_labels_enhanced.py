"""
Phase F6: Label Translation, User-Created Draggable Labels, Multi-Panel Download
1. Labels use leveledTextLanguage in the Art Director prompt
2. User-created draggable labels (click image → add label → drag to position)
3. handleDownloadImage supports multi-panel (downloads each panel)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
injected = 0

# ─────────────────────────────────────────────────────────
# 1. Update generateVisualPlan to use leveledTextLanguage for labels
# Find the plan prompt and update the labels instruction
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if 'STUDENT LANGUAGE: ${studentLanguage' in l and 'generateVisualPlan' not in l:
        # This is inside the generateVisualPlan prompt
        # Update it to also instruct label language
        # Find the "Labels should point to specific parts" line nearby
        for j in range(i, min(len(lines), i + 20)):
            if '- Labels should point to specific parts' in lines[j]:
                old = '- Labels should point to specific parts of the image'
                new = '- Labels MUST be written in ${studentLanguage || "English"} to match the student\'s language\n- Labels should point to specific parts of the image'
                lines[j] = lines[j].replace(old, new)
                injected += 1
                print(f"[OK] Labels: Updated label language instruction at L{j+1}")
                break
        break

# ─────────────────────────────────────────────────────────
# 2. Add user-created draggable labels to VisualPanelGrid
# Need to:
# a) Add state for user-created labels
# b) Add click-on-image to create a new label
# c) Make labels draggable
# ─────────────────────────────────────────────────────────

# Find the VisualPanelGrid component and enhance it
for i, l in enumerate(lines):
    if 'const VisualPanelGrid = React.memo' in l:
        # Find the state declarations inside the component
        for j in range(i, min(len(lines), i + 10)):
            if 'const [refiningPanelIdx' in lines[j]:
                # Add new state for user labels and dragging after this line
                new_state = """    const [userLabels, setUserLabels] = React.useState({}); // { panelIdx: [{ text, x, y, id }] }
    const [draggingLabel, setDraggingLabel] = React.useState(null); // { panelIdx, labelId, startX, startY }
    const [addingLabelPanel, setAddingLabelPanel] = React.useState(null); // panelIdx where user is adding a label
"""
                lines.insert(j + 1, new_state)
                injected += 1
                print(f"[OK] State: Added user label state after L{j+1}")
                break
        break

# Now find the handleRefineSubmit function and add handlers for user labels after it
for i, l in enumerate(lines):
    if 'const handleRefineSubmit = (panelIdx)' in l:
        # Find the end of this function (closing brace + semicolon)
        for j in range(i, min(len(lines), i + 10)):
            if '};' in lines[j] and j > i:
                user_label_handlers = """
    const handleAddUserLabel = (panelIdx, e) => {
        if (addingLabelPanel !== panelIdx) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        const newLabel = { id: Date.now(), text: 'New Label', x: parseFloat(x), y: parseFloat(y) };
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: [...(prev[panelIdx] || []), newLabel]
        }));
        setAddingLabelPanel(null);
    };

    const handleUserLabelTextChange = (panelIdx, labelId, newText) => {
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: (prev[panelIdx] || []).map(l => l.id === labelId ? { ...l, text: newText } : l)
        }));
    };

    const handleDeleteUserLabel = (panelIdx, labelId) => {
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: (prev[panelIdx] || []).filter(l => l.id !== labelId)
        }));
    };

    const handleLabelDragStart = (panelIdx, labelId, e) => {
        e.preventDefault();
        const rect = e.currentTarget.closest('.visual-panel').getBoundingClientRect();
        setDraggingLabel({ panelIdx, labelId, offsetX: e.clientX, offsetY: e.clientY, rect });
    };

    const handleLabelDrag = React.useCallback((e) => {
        if (!draggingLabel) return;
        const { panelIdx, labelId, offsetX, offsetY, rect } = draggingLabel;
        const dx = ((e.clientX - offsetX) / rect.width * 100);
        const dy = ((e.clientY - offsetY) / rect.height * 100);
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: (prev[panelIdx] || []).map(l => {
                if (l.id !== labelId) return l;
                return { ...l, x: Math.max(0, Math.min(95, l.x + dx)), y: Math.max(0, Math.min(95, l.y + dy)) };
            })
        }));
        setDraggingLabel(prev => prev ? { ...prev, offsetX: e.clientX, offsetY: e.clientY } : null);
    }, [draggingLabel]);

    const handleLabelDragEnd = React.useCallback(() => {
        setDraggingLabel(null);
    }, []);

    React.useEffect(() => {
        if (draggingLabel) {
            window.addEventListener('mousemove', handleLabelDrag);
            window.addEventListener('mouseup', handleLabelDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleLabelDrag);
                window.removeEventListener('mouseup', handleLabelDragEnd);
            };
        }
    }, [draggingLabel, handleLabelDrag, handleLabelDragEnd]);

"""
                lines.insert(j + 1, user_label_handlers)
                injected += 1
                print(f"[OK] Handlers: Added user label handlers after L{j+1}")
                break
        break

# Now add the "Add Label" button to each panel and render user labels
# Find the visual-panel-actions div and add the "+" button
for i, l in enumerate(lines):
    if "visual-panel-actions" in l and "className" in l and i < 2000:
        # Find the edit button inside
        for j in range(i, min(len(lines), i + 10)):
            if "Refine this panel" in lines[j] or "refine_panel" in lines[j]:
                # Add "Add Label" button after the refine button's closing tag
                for k in range(j, min(len(lines), j + 5)):
                    if '</button>' in lines[k]:
                        add_label_btn = """                                <button
                                    aria-label="Add label to panel"
                                    onClick={(e) => { e.stopPropagation(); setAddingLabelPanel(addingLabelPanel === panelIdx ? null : panelIdx); }}
                                    className={addingLabelPanel === panelIdx ? 'active' : ''}
                                    title={ts('visual_director.add_label') || 'Add label'}
                                    style={addingLabelPanel === panelIdx ? { background: '#eef2ff', borderColor: '#6366f1' } : {}}
                                >
                                    🏷️+
                                </button>
"""
                        lines.insert(k + 1, add_label_btn)
                        injected += 1
                        print(f"[OK] Button: Added 'Add Label' button after L{k+1}")
                        break
                break
        break

# Now add click handler to the image container and render user labels
# Find the <img> inside visual-panel (the panel image)
for i, l in enumerate(lines):
    if 'panel.imageUrl' in l and '<img' in l and 'loading="lazy"' in l and i < 2000:
        # Add click handler to the figure element above
        # Find the <figure className="visual-panel"> above this
        for j in range(i-1, max(0, i-10), -1):
            if '<figure className="visual-panel">' in lines[j]:
                # Replace with click handler for add-label mode
                lines[j] = lines[j].replace(
                    '<figure className="visual-panel">',
                    '<figure className="visual-panel" onClick={(e) => addingLabelPanel === panelIdx && handleAddUserLabel(panelIdx, e)} style={addingLabelPanel === panelIdx ? { cursor: "crosshair" } : {}}>'
                )
                injected += 1
                print(f"[OK] Click: Added click handler to figure at L{j+1}")
                break

        # Now add user labels rendering AFTER the AI-generated labels block
        # Find the closing of the AI labels map
        for j in range(i, min(len(lines), i + 30)):
            if '/* Per-panel edit button */' in lines[j]:
                user_labels_render = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                    style={{ left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: draggingLabel ? 'grabbing' : 'grab', borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)' }}
                                    onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)}
                                    title="Drag to move. Right-click to delete."
                                    onContextMenu={(e) => { e.preventDefault(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                >
                                    <input
                                        defaultValue={uLabel.text}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                        style={{ cursor: 'text' }}
                                    />
                                    <span onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }} style={{ marginLeft: 4, cursor: 'pointer', opacity: 0.5, fontSize: 10 }} title="Remove label">✕</span>
                                </div>
                            ))}
"""
                lines.insert(j, user_labels_render)
                injected += 1
                print(f"[OK] Render: Added user label rendering before L{j+1}")
                break
        break

# ─────────────────────────────────────────────────────────
# 3. Fix handleDownloadImage for multi-panel
# When visualPlan exists, download all panels as a zip or sequentially
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if 'const handleDownloadImage = ()' in l:
        end = None
        for j in range(i, min(len(lines), i + 15)):
            if '};' in lines[j] and j > i:
                end = j
                break
        if end:
            new_download = '''  const handleDownloadImage = () => {
    if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;
    // Multi-panel: download each panel
    if (generatedContent.data.visualPlan && generatedContent.data.visualPlan.panels.length > 1) {
        generatedContent.data.visualPlan.panels.forEach((panel, idx) => {
            if (!panel.imageUrl) return;
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = panel.imageUrl;
                link.download = `udl-visual-panel-${idx + 1}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, idx * 300); // Stagger downloads to avoid browser blocking
        });
        addToast(t('visual_director.panels_downloaded') || `${generatedContent.data.visualPlan.panels.length} panels downloaded!`, "success");
    } else {
        // Single image download (original)
        const link = document.createElement('a');
        link.href = generatedContent.data.imageUrl;
        link.download = `udl-visual-support-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast(t('toasts.image_saved'), "success");
    }
  };
'''
            lines[i:end+1] = [new_download]
            injected += 1
            print(f"[OK] Download: Updated handleDownloadImage for multi-panel (L{i+1}-L{end+1})")
        break

# ─────────────────────────────────────────────────────────
# 4. Add CSS for add-label mode indicator
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if '.visual-panel-actions button:hover' in l:
        # Add after this CSS rule
        for j in range(i, min(len(lines), i + 3)):
            if '}' in lines[j]:
                add_css = """.visual-panel.adding-label { cursor: crosshair !important; }
.visual-panel.adding-label::after { content: '+ Click to place label'; position: absolute; bottom: 50%; left: 50%; transform: translate(-50%, 50%); background: rgba(99,102,241,0.9); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; pointer-events: none; z-index: 10; animation: pulse 1.5s infinite; }
"""
                lines.insert(j + 1, add_css)
                injected += 1
                print(f"[OK] CSS: Added label-mode indicator CSS after L{j+1}")
                break
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\n✅ Phase F6 complete! {injected} injections made.")
