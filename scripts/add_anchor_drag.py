"""
Draggable Label Anchor Endpoints for Visual Art Director
=========================================================
Adds draggable endpoint dots on leader lines so users can adjust where
each label's line points, rather than all converging at image center.

Changes:
1. Add aiLabelAnchors state (persisted in annotations)
2. Add handleAnchorMouseDown drag handler
3. Update renderLeaderLines to use aiLabelAnchors and show interactive dots
4. Update onAnnotationsChange to persist aiLabelAnchors
5. Add CSS for hover-only anchor dots
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# =====================================================
# 1) Add aiLabelAnchors state after aiLabelPositions
# =====================================================
old_state = "const [aiLabelPositions, setAiLabelPositions] = React.useState(initialAnnotations?.aiLabelPositions || {}); // { 'panelIdx-labelIdx': { left, top } }"
new_state = """const [aiLabelPositions, setAiLabelPositions] = React.useState(initialAnnotations?.aiLabelPositions || {}); // { 'panelIdx-labelIdx': { left, top } }
    const [aiLabelAnchors, setAiLabelAnchors] = React.useState(initialAnnotations?.aiLabelAnchors || {}); // { 'panelIdx-labelIdx': { x, y } }"""

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    changes.append("Added aiLabelAnchors state")
else:
    print("[WARN] Could not find aiLabelPositions state declaration")

# =====================================================
# 2) Update onAnnotationsChange to persist aiLabelAnchors
# =====================================================
old_persist = "onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder, challengeActive: challengeMode, challengeType });"
new_persist = "onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder, challengeActive: challengeMode, challengeType });"

old_deps = "}, [userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder]);"
new_deps = "}, [userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder]);"

if old_persist in content:
    content = content.replace(old_persist, new_persist, 1)
    changes.append("Added aiLabelAnchors to annotations persistence")
else:
    print("[WARN] Could not find onAnnotationsChange call")

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1)
    changes.append("Added aiLabelAnchors to useEffect deps")
else:
    print("[WARN] Could not find useEffect deps array")

# =====================================================
# 3) Add handleAnchorMouseDown after handleAiLabelMouseDown
# =====================================================
handler_code = """
    // Drag handler for anchor endpoint dots on leader lines
    const handleAnchorMouseDown = (panelIdx, labelKey, labelType, e) => {
        e.preventDefault();
        e.stopPropagation();
        const svg = e.target.closest('svg');
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        // Get current anchor coords from the circle
        let curX = parseFloat(e.target.getAttribute('cx'));
        let curY = parseFloat(e.target.getAttribute('cy'));
        const origX = curX, origY = curY;
        e.target.style.cursor = 'grabbing';
        e.target.setAttribute('r', '2.5');
        e.target.setAttribute('opacity', '1');
        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / svgRect.width * 100;
            const dy = (ev.clientY - startY) / svgRect.height * 100;
            curX = Math.max(0, Math.min(100, origX + dx));
            curY = Math.max(0, Math.min(100, origY + dy));
            // Live update the circle and its parent line
            e.target.setAttribute('cx', curX);
            e.target.setAttribute('cy', curY);
            const line = e.target.previousElementSibling;
            if (line && line.tagName === 'line') {
                line.setAttribute('x2', curX);
                line.setAttribute('y2', curY);
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            e.target.style.cursor = '';
            e.target.setAttribute('r', '1.8');
            if (labelType === 'ai') {
                setAiLabelAnchors(prev => ({
                    ...prev,
                    [panelIdx + '-' + labelKey]: { x: curX, y: curY }
                }));
            } else {
                // Teacher label — update anchorX/Y directly
                setUserLabels(prev => ({
                    ...prev,
                    [panelIdx]: (prev[panelIdx] || []).map(l =>
                        l.id === labelKey ? { ...l, anchorX: curX, anchorY: curY } : l
                    )
                }));
            }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };"""

# Insert after handleAiLabelMouseDown's closing brace
anchor_insert = "document.addEventListener('mouseup', onUp);\n    };\n\n    const handlePanelDragStart"
anchor_replace = f"document.addEventListener('mouseup', onUp);\n    }};\n{handler_code}\n\n    const handlePanelDragStart"

if anchor_insert in content:
    content = content.replace(anchor_insert, anchor_replace, 1)
    changes.append("Added handleAnchorMouseDown drag handler")
else:
    print("[WARN] Could not find insertion point for handleAnchorMouseDown")

# =====================================================
# 4) Update renderLeaderLines to use aiLabelAnchors
#    and add interactive anchor dots
# =====================================================
# Replace the full renderLeaderLines function
old_render = """    // F7: Leader lines SVG renderer
    const renderLeaderLines = (panel, panelIdx) => {
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
        const teacherLabels = (userLabels[panelIdx] || []).map(l => ({
            x: l.x, y: l.y,
            anchorX: l.anchorX !== undefined ? l.anchorX : null,
            anchorY: l.anchorY !== undefined ? l.anchorY : null
        }));
        const allPoints = [...aiLabels, ...teacherLabels];
        if (allPoints.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {allPoints.map((pt, idx) => {
                    // Use anchor point if available, otherwise fall back to image center
                    const tx = pt.anchorX !== null && pt.anchorX !== undefined ? pt.anchorX : 50;
                    const ty = pt.anchorY !== null && pt.anchorY !== undefined ? pt.anchorY : 50;
                    const dist = Math.sqrt((pt.x - tx) ** 2 + (pt.y - ty) ** 2);
                    if (dist < 5) return null;
                    return (
                        <g key={idx}>
                            <line x1={pt.x} y1={pt.y} x2={tx} y2={ty}
                                  stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" opacity={0.6} />
                            {pt.anchorX !== null && pt.anchorX !== undefined && (
                                <circle cx={tx} cy={ty} r="1.2" fill="#6366f1" opacity={0.7} />
                            )}
                        </g>
                    );
                })}
            </svg>
        );
    };"""

new_render = """    // F7: Leader lines SVG renderer with draggable anchor endpoints
    const renderLeaderLines = (panel, panelIdx) => {
        // Collect all label positions: AI labels + teacher-added user labels
        const aiLabels = (panel.labels || []).map((l, labelIdx) => {
            // Check if label has been dragged to a custom position
            const override = aiLabelPositions[panelIdx + '-' + labelIdx];
            let lx, ly;
            if (override) {
                lx = parseFloat(override.left) || 50;
                ly = parseFloat(override.top) || 50;
            } else {
                // Use default LABEL_POSITIONS
                const pos = LABEL_POSITIONS[l.position] || LABEL_POSITIONS['bottom-center'];
                lx = 50; ly = 50;
                if (pos.left) lx = parseFloat(pos.left);
                if (pos.right) lx = 100 - parseFloat(pos.right);
                if (pos.top) ly = parseFloat(pos.top);
            }
            // Check for custom anchor override
            const anchorOverride = aiLabelAnchors[panelIdx + '-' + labelIdx];
            return {
                x: lx, y: ly,
                anchorX: anchorOverride ? anchorOverride.x : null,
                anchorY: anchorOverride ? anchorOverride.y : null,
                type: 'ai', key: labelIdx
            };
        });
        const teacherLabels = (userLabels[panelIdx] || []).map(l => ({
            x: l.x, y: l.y,
            anchorX: l.anchorX !== undefined ? l.anchorX : null,
            anchorY: l.anchorY !== undefined ? l.anchorY : null,
            type: 'user', key: l.id
        }));
        const allPoints = [...aiLabels, ...teacherLabels];
        if (allPoints.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {allPoints.map((pt, idx) => {
                    // Use anchor point if available, otherwise fall back to image center
                    const tx = pt.anchorX !== null && pt.anchorX !== undefined ? pt.anchorX : 50;
                    const ty = pt.anchorY !== null && pt.anchorY !== undefined ? pt.anchorY : 50;
                    const dist = Math.sqrt((pt.x - tx) ** 2 + (pt.y - ty) ** 2);
                    if (dist < 5) return null;
                    return (
                        <g key={idx} className="leader-line-group">
                            <line x1={pt.x} y1={pt.y} x2={tx} y2={ty}
                                  stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" opacity={0.6} />
                            <circle className="anchor-dot" cx={tx} cy={ty} r="1.8"
                                    fill="#6366f1" stroke="white" strokeWidth="0.4" opacity="0"
                                    style={{ cursor: 'grab', pointerEvents: 'all', transition: 'opacity 0.2s, r 0.15s' }}
                                    onMouseDown={(e) => handleAnchorMouseDown(panelIdx, pt.key, pt.type, e)}
                                    onMouseEnter={(e) => { e.target.setAttribute('opacity', '0.9'); e.target.setAttribute('r', '2.2'); }}
                                    onMouseLeave={(e) => { e.target.setAttribute('opacity', '0'); e.target.setAttribute('r', '1.8'); }}
                            />
                        </g>
                    );
                })}
            </svg>
        );
    };"""

if old_render in content:
    content = content.replace(old_render, new_render, 1)
    changes.append("Updated renderLeaderLines with draggable anchor dots")
else:
    print("[WARN] Could not find renderLeaderLines function — checking for partial match...")
    # Try finding just the function signature
    if 'const renderLeaderLines = (panel, panelIdx) =>' in content:
        print("[INFO] Function exists but exact match failed — content may have changed")
    else:
        print("[WARN] renderLeaderLines function not found at all")

# =====================================================
# 5) Add CSS for anchor dots (hover behavior)
# =====================================================
old_css = '.visual-leader-line line { stroke: #6366f1; stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.7; }'
new_css = """.visual-leader-line line { stroke: #6366f1; stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.7; }
.leader-line-group:hover .anchor-dot { opacity: 0.85 !important; r: 2 !important; }"""

if old_css in content:
    content = content.replace(old_css, new_css, 1)
    changes.append("Added CSS for hover-only anchor dots")
else:
    print("[WARN] Could not find leader-line CSS")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*60}")
print(f"Applied {len(changes)} changes:")
for c in changes:
    print(f"  ✓ {c}")
print(f"{'='*60}")
