"""
Make Nano Banana editor multi-panel aware:
- When visualPlan exists with multiple panels, edit ALL panels with the refinement instruction
- Update each panel's imageUrl in the plan
- Also update the top-level imageUrl (first panel) for backward compat
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Find handleRefineImage and replace it with a multi-panel-aware version
target = "  const handleRefineImage = async () => {"
found = False

for i, l in enumerate(lines):
    if target in l:
        # Find the end of the function (the closing brace + next function)
        end = None
        brace_depth = 0
        for j in range(i, min(len(lines), i + 50)):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if brace_depth == 0 and j > i:
                end = j
                break
        
        if end is None:
            print(f"[ERROR] Could not find end of handleRefineImage")
            break
        
        print(f"[INFO] handleRefineImage spans L{i+1} to L{end+1}")
        
        new_function = '''  const handleRefineImage = async () => {
    if (!imageRefinementInput.trim() || !generatedContent?.data?.imageUrl) return;
    setIsProcessing(true);
    setGenerationStep(t('status.refining_image'));
    setError(null);
    addToast(t('visuals.actions.refining_image'), "info");
    try {
        const refinementPrompt = `
            Edit this educational image. 
            Instruction: ${imageRefinementInput}. 
            Maintain the clear, vector-art style suitable for a worksheet.
        `;
        
        // Multi-panel mode: apply edit to ALL panels
        if (generatedContent.data.visualPlan && generatedContent.data.visualPlan.panels.length > 1) {
            const plan = generatedContent.data.visualPlan;
            setGenerationStep(t('visual_director.refining_all_panels') || 'Applying edit to all panels...');
            const updatedPanels = await Promise.all(
                plan.panels.map(async (panel, idx) => {
                    if (!panel.imageUrl) return panel;
                    try {
                        setGenerationStep(t('visual_director.refining_panel_n', { num: idx + 1, total: plan.panels.length }) || `Editing panel ${idx + 1}/${plan.panels.length}...`);
                        const rawBase64 = panel.imageUrl.split(',')[1];
                        const refined = await callGeminiImageEdit(refinementPrompt, rawBase64);
                        return refined ? { ...panel, imageUrl: refined } : panel;
                    } catch (panelErr) {
                        warnLog(`[NanoBanana] Panel ${idx} edit failed:`, panelErr);
                        return panel;
                    }
                })
            );
            const updatedPlan = { ...plan, panels: updatedPanels };
            const updatedContent = {
                ...generatedContent,
                data: {
                    ...generatedContent.data,
                    imageUrl: updatedPanels[0]?.imageUrl || generatedContent.data.imageUrl,
                    visualPlan: updatedPlan,
                    prompt: `(Edited) ${generatedContent.data.prompt}`
                }
            };
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            setImageRefinementInput('');
            addToast(t('visual_director.all_panels_refined') || `All ${updatedPanels.length} panels edited!`, "success");
        } else {
            // Single image mode (original behavior)
            const currentImageBase64 = generatedContent.data.imageUrl.split(',')[1];
            const newImageBase64 = await callGeminiImageEdit(refinementPrompt, currentImageBase64);
            const updatedContent = {
                ...generatedContent,
                data: {
                    ...generatedContent.data,
                    imageUrl: newImageBase64,
                    prompt: `(Edited) ${generatedContent.data.prompt}` 
                }
            };
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            setImageRefinementInput('');
            addToast(t('toasts.image_updated'), "success");
        }
    } catch (e) {
        warnLog("Unhandled error:", e);
        setError(t('glossary.actions.edit_failed'));
        addToast(t('visuals.actions.refinement_failed'), "error");
    } finally {
        setIsProcessing(false);
    }
  }
'''
        # Replace the old function with the new one
        lines[i:end+1] = [new_function]
        found = True
        print(f"[OK] Replaced handleRefineImage (L{i+1}-L{end+1}) with multi-panel-aware version")
        break

if not found:
    print("[ERROR] handleRefineImage not found!")

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print("Done!")
