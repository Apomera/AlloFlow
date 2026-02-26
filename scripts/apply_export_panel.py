"""
Add 'Export as PNG' feature to the Visual Supports panel.
1. Adds handleExportPanel function that composites image + labels + leader lines onto a canvas
2. Adds 📸 Export button to each panel's action bar
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add handleExportPanel function (after renderStudentLeaderLines)
    # Place it right before the return statement of the component
    # ============================================================
    target_1 = """    // F7: Leader lines SVG renderer
    const renderLeaderLines = (panel, panelIdx) => {"""

    replacement_1 = """    // Export annotated panel as PNG
    const handleExportPanel = async (panelIdx) => {
        const panel = displayPanels[panelIdx];
        if (!panel?.imageUrl) return;
        try {
            // Load image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = panel.imageUrl;
            });
            // Canvas at high res 
            const scale = 2;
            const cw = img.naturalWidth || 800;
            const ch = img.naturalHeight || 600;
            const canvas = document.createElement('canvas');
            canvas.width = cw * scale;
            canvas.height = ch * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            // Draw image
            ctx.drawImage(img, 0, 0, cw, ch);
            // Draw leader lines
            const drawLine = (x1p, y1p, x2p, y2p, color, width, dash) => {
                ctx.beginPath();
                ctx.setLineDash(dash || []);
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.globalAlpha = 0.6;
                ctx.moveTo(x1p / 100 * cw, y1p / 100 * ch);
                ctx.lineTo(x2p / 100 * cw, y2p / 100 * ch);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.setLineDash([]);
            };
            const drawDot = (xp, yp, r, color) => {
                ctx.beginPath();
                ctx.arc(xp / 100 * cw, yp / 100 * ch, r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.7;
                ctx.fill();
                ctx.globalAlpha = 1;
            };
            // AI label leader lines
            (panel.labels || []).forEach((l, li) => {
                const override = aiLabelPositions[panelIdx + '-' + li];
                let lx, ly;
                if (override) {
                    lx = parseFloat(override.left) || 50;
                    ly = parseFloat(override.top) || 50;
                } else {
                    const pos = LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'];
                    lx = pos.left ? parseFloat(pos.left) : (pos.right ? 100 - parseFloat(pos.right) : 50);
                    ly = pos.top ? parseFloat(pos.top) : 50;
                }
                drawLine(lx, ly, 50, 50, '#6366f1', 1.5, [6, 4]);
            });
            // Teacher label leader lines (with anchors)
            (userLabels[panelIdx] || []).forEach(l => {
                const tx = l.anchorX !== undefined ? l.anchorX : 50;
                const ty = l.anchorY !== undefined ? l.anchorY : 50;
                drawLine(l.x, l.y, tx, ty, '#6366f1', 1.5, [6, 4]);
                if (l.anchorX !== undefined) drawDot(tx, ty, 4, '#6366f1');
            });
            // Student label leader lines
            (studentLabels[panelIdx] || []).forEach(l => {
                const tx = l.anchorX !== undefined ? l.anchorX : 50;
                const ty = l.anchorY !== undefined ? l.anchorY : 50;
                drawLine(l.x, l.y, tx, ty, '#8b5cf6', 1, [4, 3]);
                drawDot(tx, ty, 3, '#8b5cf6');
            });
            // Draw drawing annotations
            (drawings[panelIdx] || []).forEach(d => {
                if (d.type === 'freehand' && d.points?.length > 1) {
                    ctx.beginPath();
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = d.type === 'highlight' ? 8 : 1.5;
                    ctx.globalAlpha = d.type === 'highlight' ? 0.35 : 1;
                    d.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x/100*cw, p.y/100*ch) : ctx.lineTo(p.x/100*cw, p.y/100*ch));
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                } else if (d.type === 'arrow' && d.start && d.end) {
                    ctx.beginPath();
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(d.start.x/100*cw, d.start.y/100*ch);
                    ctx.lineTo(d.end.x/100*cw, d.end.y/100*ch);
                    ctx.stroke();
                } else if (d.type === 'circle' && d.start && d.end) {
                    const cx = ((d.start.x + d.end.x) / 2) / 100 * cw;
                    const cy = ((d.start.y + d.end.y) / 2) / 100 * ch;
                    const rx = Math.abs(d.end.x - d.start.x) / 200 * cw;
                    const ry = Math.abs(d.end.y - d.start.y) / 200 * ch;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });
            // Draw label boxes
            const drawLabel = (text, xPct, yPct, bgColor, borderColor, textColor) => {
                const px = xPct / 100 * cw;
                const py = yPct / 100 * ch;
                ctx.font = 'bold 14px Inter, Segoe UI, system-ui, sans-serif';
                const tm = ctx.measureText(text);
                const tw = tm.width + 20;
                const th = 28;
                const rx = Math.max(0, Math.min(cw - tw, px - tw / 2));
                const ry = Math.max(0, Math.min(ch - th, py - th / 2));
                // Background
                ctx.fillStyle = bgColor;
                ctx.globalAlpha = 0.92;
                ctx.beginPath();
                ctx.roundRect(rx, ry, tw, th, 6);
                ctx.fill();
                ctx.globalAlpha = 1;
                // Border
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(rx, ry, tw, th, 6);
                ctx.stroke();
                // Text
                ctx.fillStyle = textColor;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(text, rx + tw / 2, ry + th / 2);
            };
            // AI labels
            if (!labelsHidden) {
                (panel.labels || []).forEach((l, li) => {
                    const override = aiLabelPositions[panelIdx + '-' + li];
                    let lx, ly;
                    if (override) {
                        lx = parseFloat(override.left) || 50;
                        ly = parseFloat(override.top) || 50;
                    } else {
                        const pos = LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'];
                        lx = pos.left ? parseFloat(pos.left) : (pos.right ? 100 - parseFloat(pos.right) : 50);
                        ly = pos.top ? parseFloat(pos.top) : 50;
                    }
                    drawLabel(l.text || l, lx, ly, '#ffffff', '#6366f1', '#1e1b4b');
                });
            }
            // Teacher labels
            (userLabels[panelIdx] || []).forEach(l => {
                drawLabel(l.text, l.x, l.y, '#f5f3ff', '#8b5cf6', '#1e1b4b');
            });
            // Student labels
            (studentLabels[panelIdx] || []).forEach(l => {
                let bgColor = '#dbeafe', borderColor = '#3b82f6';
                if (challengeSubmitted && challengeResult?.labelResults) {
                    const v = challengeResult.labelResults.find(r => r.studentLabel === l.text)?.verdict;
                    if (v === 'correct') { bgColor = '#dcfce7'; borderColor = '#16a34a'; }
                    else if (v === 'close') { bgColor = '#fef9c3'; borderColor = '#f59e0b'; }
                    else if (v === 'incorrect') { bgColor = '#fee2e2'; borderColor = '#ef4444'; }
                }
                drawLabel(l.text, l.x, l.y, bgColor, borderColor, '#1e1b4b');
            });
            // Caption at bottom
            const caption = captionOverrides[panelIdx] || panel.caption;
            if (caption) {
                const cleanCaption = caption.replace(/\*\*(.+?)\*\*/g, '$1').substring(0, 80);
                ctx.font = '12px Inter, Segoe UI, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(cleanCaption, cw / 2, ch - 6);
            }
            // Download
            const link = document.createElement('a');
            const title = (visualPlan.title || 'diagram').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            link.download = `${title}_panel_${panelIdx + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('[Export] Failed to export panel:', err);
        }
    };

    // F7: Leader lines SVG renderer
    const renderLeaderLines = (panel, panelIdx) => {"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added handleExportPanel function")
    else:
        print("❌ EDIT1: Could not find leader lines target")

    # ============================================================
    # EDIT 2: Add 📸 Export button to per-panel action bar
    # ============================================================
    target_2 = """                            {/* Per-panel edit button */}
                            <div className="visual-panel-actions">
                                <button
                                    aria-label="Refine this panel"
                                    onClick={() => setRefiningPanelIdx(refiningPanelIdx === panelIdx ? null : panelIdx)}
                                    title={'Refine this panel'}
                                >
                                    ✏️
                                </button>
                            </div>"""

    replacement_2 = """                            {/* Per-panel edit button */}
                            <div className="visual-panel-actions">
                                <button
                                    aria-label="Refine this panel"
                                    onClick={() => setRefiningPanelIdx(refiningPanelIdx === panelIdx ? null : panelIdx)}
                                    title={'Refine this panel'}
                                >
                                    ✏️
                                </button>
                                <button
                                    aria-label="Export panel as PNG"
                                    onClick={() => handleExportPanel(panelIdx)}
                                    title="Download annotated diagram as PNG"
                                >
                                    📸
                                </button>
                            </div>"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Added 📸 Export button to panel action bar")
    else:
        print("❌ EDIT2: Could not find panel actions target")

    # ============================================================
    # EDIT 3: Also add an export-all button to the main toolbar
    # ============================================================
    target_3 = """                {isTeacherMode && !isStudentChallenge && (
                    challengeMode ? ("""

    replacement_3 = """                {/* Export all panels button */}
                {!isStudentChallenge && (
                    <button
                        onClick={() => displayPanels.forEach((_, i) => setTimeout(() => handleExportPanel(i), i * 500))}
                        title="Download all panels as PNG images"
                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                        📸 Export All
                    </button>
                )}
                {isTeacherMode && !isStudentChallenge && (
                    challengeMode ? ("""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added 📸 Export All button to main toolbar")
    else:
        print("❌ EDIT3: Could not find main toolbar target")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/3 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
