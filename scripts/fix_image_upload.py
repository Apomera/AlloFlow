"""
Add custom image upload to VisualPanelGrid panels.

Three changes:
1. Add imageOverrides state to track user-uploaded images per panel
2. Add upload button to per-panel toolbar  
3. Use imageOverride instead of panel.imageUrl when available
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Add imageOverrides state alongside other panel state
old_state = """    const [refineInput, setRefineInput] = React.useState('');
    // === Label Challenge State ==="""

new_state = """    const [refineInput, setRefineInput] = React.useState('');
    // === Custom Image Upload State ===
    const [imageOverrides, setImageOverrides] = React.useState(initialAnnotations?.imageOverrides || {}); // { panelIdx: 'data:image/...' }
    const fileInputRefs = React.useRef({}); // Hidden file inputs per panel
    const handleImageUpload = (panelIdx, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('Image too large (max 10MB). Please use a smaller image.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImageOverrides(prev => ({ ...prev, [panelIdx]: ev.target.result }));
        };
        reader.readAsDataURL(file);
    };
    // === Label Challenge State ==="""

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    changes += 1
    print("1. FIXED: Added imageOverrides state and handleImageUpload")
else:
    print("[WARN] State pattern not found")

# FIX 2: Add upload button to per-panel toolbar (after export button)
old_export = """                                <button
                                    aria-label="Export panel as PNG"
                                    onClick={() => handleExportPanel(panelIdx)}
                                    title="Download annotated diagram as PNG"
                                >
                                    📸
                                </button>
                            </div>"""

new_export = """                                <button
                                    aria-label="Export panel as PNG"
                                    onClick={() => handleExportPanel(panelIdx)}
                                    title="Download annotated diagram as PNG"
                                >
                                    📸
                                </button>
                                {isTeacherMode && (
                                    <>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={el => { if (el) fileInputRefs.current[panelIdx] = el; }}
                                            onChange={(e) => handleImageUpload(panelIdx, e)}
                                            style={{ display: 'none' }}
                                            aria-label="Upload custom image"
                                        />
                                        <button
                                            aria-label="Upload custom image"
                                            onClick={() => fileInputRefs.current[panelIdx]?.click()}
                                            title="Upload your own image for this panel"
                                        >
                                            📷
                                        </button>
                                        {imageOverrides[panelIdx] && (
                                            <button
                                                aria-label="Remove custom image"
                                                onClick={() => setImageOverrides(prev => { const next = {...prev}; delete next[panelIdx]; return next; })}
                                                title="Remove uploaded image & restore AI image"
                                                style={{ fontSize: '10px' }}
                                            >
                                                ↩️
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>"""

if old_export in content:
    content = content.replace(old_export, new_export, 1)
    changes += 1
    print("2. FIXED: Added upload button to per-panel toolbar")
else:
    print("[WARN] Export button pattern not found")

# FIX 3: Use imageOverride for panel image when available
old_img = """                            {panel.imageUrl ? (
                                <img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'contain', background: '#f8fafc' }} />"""

new_img = """                            {(imageOverrides[panelIdx] || panel.imageUrl) ? (
                                <img src={imageOverrides[panelIdx] || panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'contain', background: '#f8fafc' }} />"""

if old_img in content:
    content = content.replace(old_img, new_img, 1)
    changes += 1
    print("3. FIXED: Panel image now uses imageOverride when available")
else:
    print("[WARN] Panel image pattern not found")

# FIX 4: Persist imageOverrides in annotations
old_persist = """            onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder, challengeActive: challengeMode, challengeType });"""

new_persist = """            onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder, challengeActive: challengeMode, challengeType, imageOverrides });"""

if old_persist in content:
    content = content.replace(old_persist, new_persist, 1)
    changes += 1
    print("4. FIXED: imageOverrides persisted in annotations")
else:
    print("[WARN] Persist pattern not found")

# FIX 5: Add imageOverrides to the useEffect dependency array
old_deps = """    }, [userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder]);"""

new_deps = """    }, [userLabels, drawings, captionOverrides, aiLabelPositions, aiLabelAnchors, panelOrder, imageOverrides]);"""

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1)
    changes += 1
    print("5. FIXED: Added imageOverrides to useEffect deps")
else:
    print("[WARN] Deps pattern not found")

# FIX 6: Also use imageOverride in export function
old_export_fn = """        if (!panel?.imageUrl) return;
        try {
            // Load image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = panel.imageUrl;
            });"""

new_export_fn = """        const panelImgSrc = imageOverrides[panelIdx] || panel?.imageUrl;
        if (!panelImgSrc) return;
        try {
            // Load image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = panelImgSrc;
            });"""

if old_export_fn in content:
    content = content.replace(old_export_fn, new_export_fn, 1)
    changes += 1
    print("6. FIXED: Export function uses imageOverride when available")
else:
    print("[WARN] Export function pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
