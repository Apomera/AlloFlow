"""
1. Dynamic comparison headers: use panel.title if available, fallback to role text
2. Enhanced download: render labels onto canvas for download
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Dynamic comparison headers
# Currently: panel.role === 'before' ? 'Before' : 'after' ? 'After' : 'step' ? 'Step N' : panel.role
# Change to: use panel.title first, fallback to role text
# ============================================================

old_role = """                                    {panel.role === 'before' ? '\u2B05\uFE0F Before' :
                                     panel.role === 'after' ? '\u27A1\uFE0F After' :
                                     panel.role === 'step' ? `Step ${panelIdx + 1}` :
                                     panel.role}"""

new_role = """                                    {panel.title || (
                                     panel.role === 'before' ? '\u2B05\uFE0F Before' :
                                     panel.role === 'after' ? '\u27A1\uFE0F After' :
                                     panel.role === 'step' ? `Step ${panelIdx + 1}` :
                                     panel.role)}"""

if old_role in content:
    content = content.replace(old_role, new_role)
    fixed += 1
    print("[OK] FIX 1: Panel headers now use panel.title if available (dynamic/topic-dependent)")
else:
    print("[WARN] FIX 1: Role badge text not found")

# ============================================================
# FIX 2: Enhanced download with labels rendered on canvas
# Replace the current simple download with canvas-based rendering
# ============================================================

old_download = """  const handleDownloadImage = () => {
    if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;
    // Multi-panel: download each panel
    if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {
        generatedContent?.data.visualPlan.panels.forEach((panel, idx) => {
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
        addToast(t('visual_director.panels_downloaded') || `${generatedContent?.data.visualPlan.panels.length} panels downloaded!`, \"success\");
    } else {
        // Single image download (original)
        const link = document.createElement('a');
        link.href = generatedContent?.data.imageUrl;
        link.download = `udl-visual-support-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast(t('toasts.image_saved'), \"success\");
    }
  };"""

new_download = """  const handleDownloadImage = () => {
    if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;
    // Helper: render image with labels onto canvas
    const downloadWithLabels = (imgUrl, labels, filename) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            // Draw labels if visible
            if (labels && labels.length > 0) {
                ctx.font = 'bold 14px Inter, Segoe UI, system-ui, sans-serif';
                ctx.textAlign = 'center';
                labels.forEach(label => {
                    const x = (label.x / 100) * canvas.width;
                    const y = (label.y / 100) * canvas.height;
                    const text = label.text || '';
                    const metrics = ctx.measureText(text);
                    const pad = 6;
                    // Background pill
                    ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
                    const rx = x - metrics.width / 2 - pad;
                    const ry = y - 10;
                    const rw = metrics.width + pad * 2;
                    const rh = 20;
                    ctx.beginPath();
                    ctx.roundRect(rx, ry, rw, rh, 4);
                    ctx.fill();
                    // Text
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(text, x, y + 4);
                });
            }
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.onerror = () => {
            // Fallback: download without labels
            const link = document.createElement('a');
            link.href = imgUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = imgUrl;
    };
    // Multi-panel
    if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {
        // Check if labels are currently hidden (look for labelsHidden state in the DOM)
        const labelsVisible = !document.querySelector('.visual-panel-grid')?.getAttribute('data-labels-hidden');
        generatedContent?.data.visualPlan.panels.forEach((panel, idx) => {
            if (!panel.imageUrl) return;
            const labels = labelsVisible ? (panel.labels || []) : [];
            setTimeout(() => {
                downloadWithLabels(panel.imageUrl, labels, `udl-visual-panel-${idx + 1}-${Date.now()}.png`);
            }, idx * 500);
        });
        addToast(t('visual_director.panels_downloaded') || `${generatedContent?.data.visualPlan.panels.length} panels downloaded!`, \"success\");
    } else {
        downloadWithLabels(generatedContent?.data.imageUrl, [], `udl-visual-support-${Date.now()}.png`);
        addToast(t('toasts.image_saved'), \"success\");
    }
  };"""

if old_download in content:
    content = content.replace(old_download, new_download)
    fixed += 1
    print("[OK] FIX 2: Download now renders labels onto canvas (when labels visible)")
else:
    print("[WARN] FIX 2: handleDownloadImage not found")

# ============================================================
# FIX 3: Add data-labels-hidden attribute to grid for download detection
# ============================================================

old_grid = "<div className={`visual-panel-grid layout-${visualPlan.layout || 'single'}`}>"
new_grid = "<div className={`visual-panel-grid layout-${visualPlan.layout || 'single'}`} data-labels-hidden={labelsHidden ? 'true' : undefined}>"

if old_grid in content:
    content = content.replace(old_grid, new_grid)
    fixed += 1
    print("[OK] FIX 3: Added data-labels-hidden attribute to grid")
else:
    print("[WARN] FIX 3: Grid div not found")

# ============================================================
# Write
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
