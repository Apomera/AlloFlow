"""Fix drawing and editing:
1. renderDrawingSVG returns null when no drawings exist, preventing drawing from starting
2. Verify handleRefinePanel prop is wired correctly
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: The guard in renderDrawingSVG prevents the SVG from rendering
# when drawingMode is active but no drawings exist yet.
# Need to also render when drawingMode is active.
old_guard = "        const panelDrawings = drawings[panelIdx] || [];\n        if (panelDrawings.length === 0 && !currentPath && !drawingStart) return null;"
new_guard = "        const panelDrawings = drawings[panelIdx] || [];\n        if (panelDrawings.length === 0 && !currentPath && !drawingStart && !drawingMode) return null;"
if old_guard in content:
    content = content.replace(old_guard, new_guard)
    fixed += 1
    print("[OK] Fixed renderDrawingSVG guard: now renders when drawingMode is active")
else:
    # Try with \r\n 
    old_guard2 = "        const panelDrawings = drawings[panelIdx] || [];\r\n        if (panelDrawings.length === 0 && !currentPath && !drawingStart) return null;"
    new_guard2 = "        const panelDrawings = drawings[panelIdx] || [];\r\n        if (panelDrawings.length === 0 && !currentPath && !drawingStart && !drawingMode) return null;"
    if old_guard2 in content:
        content = content.replace(old_guard2, new_guard2)
        fixed += 1
        print("[OK] Fixed renderDrawingSVG guard: now renders when drawingMode is active")
    else:
        print("[WARN] Could not find renderDrawingSVG guard pattern")

# Fix 2: Check if handleRefinePanel is defined at the integration point
# At L68969: onRefinePanel={handleRefinePanel}
# Let's verify handleRefinePanel exists in the parent component
idx = content.find('onRefinePanel={handleRefinePanel}')
if idx >= 0:
    print(f"[INFO] onRefinePanel={{handleRefinePanel}} found at char {idx}")
    # Check if handleRefinePanel is defined
    if 'const handleRefinePanel' in content or 'function handleRefinePanel' in content:
        print("[INFO] handleRefinePanel function IS defined")
    else:
        print("[WARN] handleRefinePanel function NOT found - needs to be created")
        fixed += 1
        # Find the right place to inject it - near the handleRestoreImage function
        anchor = "const handleRestoreImage"
        anchor_idx = content.find(anchor)
        if anchor_idx >= 0:
            inject = """const handleRefinePanel = async (panelIdx, refinementText) => {
        if (!generatedContent?.data?.visualPlan?.panels?.[panelIdx]) return;
        const panel = generatedContent.data.visualPlan.panels[panelIdx];
        const originalPrompt = panel.prompt || panel.caption || '';
        const refinedPrompt = `${originalPrompt}. Refinement: ${refinementText}`;
        try {
            setIsProcessing(true);
            const newUrl = await callImagen(refinedPrompt, useLowQualityVisuals ? '256x256' : '1024x1024');
            if (newUrl) {
                const updatedPanels = [...generatedContent.data.visualPlan.panels];
                updatedPanels[panelIdx] = { ...updatedPanels[panelIdx], imageUrl: newUrl, caption: panel.caption };
                setGeneratedContent(prev => ({
                    ...prev,
                    data: {
                        ...prev.data,
                        visualPlan: { ...prev.data.visualPlan, panels: updatedPanels }
                    }
                }));
            }
        } catch (err) {
            console.error('Refine panel error:', err);
        } finally {
            setIsProcessing(false);
        }
    };
    """
            content = content[:anchor_idx] + inject + content[anchor_idx:]
            print("[OK] Injected handleRefinePanel function")
        else:
            print("[WARN] Could not find anchor for handleRefinePanel injection")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
