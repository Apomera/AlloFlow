"""
Fix renderLeaderLines to actually show SVG connector lines.

Root causes:
1. Only reads default LABEL_POSITIONS, ignores aiLabelPositions overrides (dragged positions)
2. Does not include teacher-added userLabels
3. No inline stroke fallback (CSS class may not be applied in all contexts)
4. Container overflow:hidden clips lines extending beyond image bounds

Also adds renderStudentLeaderLines for student challenge labels.
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # FIX 1: Replace renderLeaderLines with a version that:
    # - Uses aiLabelPositions overrides when available
    # - Includes user-added labels
    # - Has inline stroke attributes as fallback
    # ============================================================
    target_1 = """    const renderLeaderLines = (panel, panelIdx) => {
        const allLabels = [
            ...(panel.labels || []).map(l => ({ ...l, posObj: LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'] })),
        ];
        if (allLabels.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
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
                        </g>
                    );
                })}
            </svg>
        );
    };"""

    replacement_1 = """    const renderLeaderLines = (panel, panelIdx) => {
        // Collect all label positions: AI labels + teacher-added user labels
        const aiLabels = (panel.labels || []).map((l, labelIdx) => {
            // Check if label has been dragged to a custom position
            const override = aiLabelPositions[panelIdx + '-' + labelIdx];
            if (override) {
                return { x: parseFloat(override.left) || 50, y: parseFloat(override.top) || 50 };
            }
            // Use default LABEL_POSITIONS
            const pos = LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'];
            let lx = 50, ly = 50;
            if (pos.left) lx = parseFloat(pos.left);
            if (pos.right) lx = 100 - parseFloat(pos.right);
            if (pos.top) ly = parseFloat(pos.top);
            return { x: lx, y: ly };
        });
        const teacherLabels = (userLabels[panelIdx] || []).map(l => ({ x: l.x, y: l.y }));
        const allPoints = [...aiLabels, ...teacherLabels];
        if (allPoints.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {allPoints.map((pt, idx) => {
                    const tx = 50, ty = 50;
                    const dist = Math.sqrt((pt.x - tx) ** 2 + (pt.y - ty) ** 2);
                    if (dist < 10) return null;
                    return (
                        <line key={idx} x1={pt.x} y1={pt.y} x2={tx} y2={ty}
                              stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" opacity={0.6} />
                    );
                })}
            </svg>
        );
    };
    // Leader lines for student-placed labels during challenge
    const renderStudentLeaderLines = (panelIdx) => {
        const labels = studentLabels[panelIdx] || [];
        if (labels.length === 0) return null;
        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                 style={{ position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {labels.map((label, idx) => {
                    const dist = Math.sqrt((label.x - 50) ** 2 + (label.y - 50) ** 2);
                    if (dist < 10) return null;
                    return (
                        <line key={idx} x1={label.x} y1={label.y} x2={50} y2={50}
                              stroke="#8b5cf6" strokeWidth="0.4"
                              strokeDasharray="1.5 1" opacity={0.5} />
                    );
                })}
            </svg>
        );
    };"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ FIX1: Replaced renderLeaderLines + added renderStudentLeaderLines")
    else:
        print("❌ FIX1: Could not find renderLeaderLines target")

    # ============================================================
    # FIX 2: Add student leader lines call in panel rendering
    # ============================================================
    target_2 = """                            {renderDrawingSVG(panelIdx)}
                            {/* HTML Overlay Labels */}"""

    replacement_2 = """                            {renderDrawingSVG(panelIdx)}
                            {isStudentChallenge && renderStudentLeaderLines(panelIdx)}
                            {/* HTML Overlay Labels */}"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ FIX2: Added renderStudentLeaderLines call in panel rendering")
    else:
        print("❌ FIX2: Could not find renderDrawingSVG target")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied} edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
