"""Direct line-range replacement of user label block to fix broken JSX."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Replace lines 1801-1840 (0-indexed: 1800-1839) with clean block
# Find exact start/end
start = None
end = None
for i, line in enumerate(lines):
    if '{/* User-Created Draggable Labels */}' in line and i > 1790:
        start = i
    if start and '{/* Per-panel edit button */}' in line and i > start:
        end = i
        break

if start and end:
    print(f"Replacing lines {start+1}-{end} (user label block)")
    new_block = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    onPointerDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 10px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                    title="Drag to move \\u2022 Double-click to edit"
                                >
                                    {editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(50, uLabel.text.length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span style={{ pointerEvents: 'none' }}>{uLabel.text}</span>
                                    )}
                                    <span
                                        className="label-delete-btn"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px', visibility: 'hidden' }}
                                        title="Delete label"
                                    >\\u2715</span>
                                </div>
                            ))}
"""
    # Split into lines and add \r\n
    new_lines = [l + '\r\n' for l in new_block.split('\n')]
    lines[start:end] = new_lines
    print(f"[OK] Replaced {end - start} lines with {len(new_lines)} clean lines")
else:
    print(f"[ERROR] Could not find markers: start={start}, end={end}")

open(filepath, 'w', encoding='utf-8').writelines(lines)
print("Done!")
