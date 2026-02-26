"""
Phase F1-F3: Visual Art Director — Multi-Image AI Illustration System

Injects:
1. generateVisualPlan() — Gemini Art Director prompt engine (F1)
2. executeVisualPlan() — Multi-panel Imagen generation + text cleanup (F2)
3. VisualPanelGrid component — Multi-panel layout with HTML overlay labels (F3)
4. CSS for panel grid, labels, and captions
5. Integration into handleGenerate 'image' case
6. Integration into image output rendering
7. Localization keys
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
injected = 0

# ─────────────────────────────────────────────────────────
# INJECTION 1: CSS for Visual Panel Grid
# Insert after existing .bridge-offline-notice styles
# ─────────────────────────────────────────────────────────
CSS_BLOCK = """\
/* === VISUAL ART DIRECTOR: Multi-Panel Layout === */
.visual-panel-grid { display: grid; gap: 16px; margin: 16px 0; }
.visual-panel-grid.layout-before-after,
.visual-panel-grid.layout-comparison { grid-template-columns: 1fr 1fr; }
.visual-panel-grid.layout-sequence { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.visual-panel-grid.layout-labeled-diagram,
.visual-panel-grid.layout-single { grid-template-columns: 1fr; }
.visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; }
.visual-panel:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.visual-panel img { width: 100%; display: block; object-fit: contain; }
.visual-panel-role { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); }
.visual-label { position: absolute; background: rgba(255,255,255,0.9); backdrop-filter: blur(6px); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #1e293b; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 6px rgba(0,0,0,0.08); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s; }
.visual-label:hover { transform: scale(1.05); border-color: #6366f1; }
.visual-label.hidden-label { opacity: 0; pointer-events: none; }
.visual-label input { border: none; background: transparent; font-size: 12px; font-weight: 600; color: #1e293b; outline: none; width: 100%; min-width: 40px; }
.visual-caption { padding: 8px 12px; font-size: 13px; color: #475569; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 500; }
.visual-panel-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.visual-panel:hover .visual-panel-actions { opacity: 1; }
.visual-panel-actions button { background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 11px; transition: background 0.2s; }
.visual-panel-actions button:hover { background: #eef2ff; border-color: #6366f1; }
.visual-grid-controls { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-bottom: 8px; }
.visual-grid-controls button { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #475569; }
.visual-grid-controls button:hover { background: #eef2ff; border-color: #6366f1; color: #4f46e5; }
.visual-grid-controls button.active { background: #4f46e5; color: white; border-color: #4f46e5; }
.visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 24px; color: #94a3b8; align-self: center; }
@media (max-width: 640px) {
  .visual-panel-grid.layout-before-after,
  .visual-panel-grid.layout-comparison { grid-template-columns: 1fr; }
}
"""

css_anchor = '.bridge-offline-notice'
css_inserted = False
for i, l in enumerate(lines):
    if css_anchor in l and not css_inserted:
        # Find the closing brace of this CSS block
        j = i + 1
        while j < len(lines) and '}' not in lines[j]:
            j += 1
        if j < len(lines):
            insert_at = j + 1
            lines.insert(insert_at, CSS_BLOCK + '\n')
            css_inserted = True
            injected += 1
            print(f"[OK] CSS: Injected Visual Panel Grid styles after L{insert_at}")
            break

# ─────────────────────────────────────────────────────────
# INJECTION 2: VisualPanelGrid Component
# Insert BEFORE the WordSoundsGenerator component definition
# ─────────────────────────────────────────────────────────
COMPONENT_CODE = """\
// === VISUAL ART DIRECTOR: Multi-Panel Grid Component ===
const LABEL_POSITIONS = {
    'top-left': { top: '8%', left: '8%' },
    'top-center': { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    'top-right': { top: '8%', right: '8%' },
    'center-left': { top: '50%', left: '8%', transform: 'translateY(-50%)' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'center-right': { top: '50%', right: '8%', transform: 'translateY(-50%)' },
    'bottom-left': { bottom: '12%', left: '8%' },
    'bottom-center': { bottom: '12%', left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: '12%', right: '8%' },
};

const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, t: tProp }) => {
    const [labelsHidden, setLabelsHidden] = React.useState(false);
    const [editingLabel, setEditingLabel] = React.useState(null); // { panelIdx, labelIdx }
    const [refiningPanelIdx, setRefiningPanelIdx] = React.useState(null);
    const [refineInput, setRefineInput] = React.useState('');
    const ts = (key) => tProp?.(key) || '';

    if (!visualPlan || !visualPlan.panels || visualPlan.panels.length === 0) return null;

    const handleLabelClick = (panelIdx, labelIdx) => {
        if (labelsHidden) return;
        setEditingLabel({ panelIdx, labelIdx });
    };

    const handleLabelChange = (panelIdx, labelIdx, newText) => {
        if (onUpdateLabel) onUpdateLabel(panelIdx, labelIdx, newText);
        setEditingLabel(null);
    };

    const handleRefineSubmit = (panelIdx) => {
        if (refineInput.trim() && onRefinePanel) {
            onRefinePanel(panelIdx, refineInput.trim());
            setRefineInput('');
            setRefiningPanelIdx(null);
        }
    };

    return (
        <div>
            <div className="visual-grid-controls">
                <button
                    aria-label="Toggle labels"
                    onClick={() => setLabelsHidden(!labelsHidden)}
                    className={labelsHidden ? 'active' : ''}
                    title={labelsHidden ? (ts('visual_director.show_labels') || 'Show Labels') : (ts('visual_director.hide_labels') || 'Hide Labels (Self-Test)')}
                >
                    {labelsHidden ? '👁️' : '🏷️'} {labelsHidden ? (ts('visual_director.show_labels') || 'Show Labels') : (ts('visual_director.hide_labels') || 'Hide Labels')}
                </button>
            </div>
            <div className={`visual-panel-grid layout-${visualPlan.layout || 'single'}`}>
                {visualPlan.panels.map((panel, panelIdx) => (
                    <React.Fragment key={panel.id || panelIdx}>
                        <figure className="visual-panel">
                            {panel.role && (
                                <span className="visual-panel-role">
                                    {panel.role === 'before' ? '⬅️ Before' :
                                     panel.role === 'after' ? '➡️ After' :
                                     panel.role === 'step' ? `Step ${panelIdx + 1}` :
                                     panel.role}
                                </span>
                            )}
                            {panel.imageUrl ? (
                                <img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" />
                            ) : (
                                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>
                                    <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                                </div>
                            )}
                            {/* HTML Overlay Labels */}
                            {panel.labels && panel.labels.map((label, labelIdx) => {
                                const pos = LABEL_POSITIONS[label.position] || LABEL_POSITIONS['bottom-center'];
                                const isEditing = editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === labelIdx;
                                return (
                                    <div
                                        key={labelIdx}
                                        className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                        style={pos}
                                        onClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        title={ts('visual_director.click_to_edit_label') || 'Click to edit label'}
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                defaultValue={label.text}
                                                onBlur={(e) => handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                            />
                                        ) : label.text}
                                    </div>
                                );
                            })}
                            {/* Per-panel edit button */}
                            <div className="visual-panel-actions">
                                <button
                                    aria-label="Refine this panel"
                                    onClick={() => setRefiningPanelIdx(refiningPanelIdx === panelIdx ? null : panelIdx)}
                                    title={ts('visual_director.refine_panel') || 'Refine this panel'}
                                >
                                    ✏️
                                </button>
                            </div>
                            {panel.caption && <figcaption className="visual-caption">{panel.caption}</figcaption>}
                        </figure>
                        {/* Sequence arrow between panels */}
                        {visualPlan.layout === 'sequence' && panelIdx < visualPlan.panels.length - 1 && (
                            <div className="visual-sequence-arrow">→</div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Per-panel refinement input */}
            {refiningPanelIdx !== null && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        placeholder={ts('visual_director.refine_placeholder') || `Edit Panel ${refiningPanelIdx + 1}...`}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit(refiningPanelIdx)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    />
                    <button
                        aria-label="Apply panel edit"
                        onClick={() => handleRefineSubmit(refiningPanelIdx)}
                        style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                        {ts('common.apply') || 'Apply'}
                    </button>
                </div>
            )}
        </div>
    );
});

"""

# Find WordSoundsGenerator definition
comp_anchor = 'const WordSoundsGenerator = React.memo'
comp_inserted = False
for i, l in enumerate(lines):
    if comp_anchor in l:
        lines.insert(i, COMPONENT_CODE)
        comp_inserted = True
        injected += 1
        print(f"[OK] Component: Injected VisualPanelGrid before L{i+1}")
        break

# ─────────────────────────────────────────────────────────
# INJECTION 3: generateVisualPlan + executeVisualPlan functions
# Insert BEFORE handleGenerateSource (near callImagen)
# ─────────────────────────────────────────────────────────
FUNCTIONS_CODE = """\
  // === VISUAL ART DIRECTOR: Plan + Execute Functions ===
  const generateVisualPlan = async (concept, gradeLevel, studentLanguage) => {
      const planPrompt = `You are an educational Art Director. Analyze this concept and plan a multi-panel visual explanation.

CONCEPT: "${concept}"
GRADE LEVEL: ${gradeLevel}
STUDENT LANGUAGE: ${studentLanguage || 'English'}

RULES:
- For PROCESSES or CHANGES (photosynthesis, erosion, cooking, life cycles): use "before-after" or "sequence" layout
- For COMPARISONS (democracy vs monarchy, mitosis vs meiosis): use "comparison" layout  
- For ANATOMY or STRUCTURE (cell, volcano, water cycle diagram): use "labeled-diagram" layout
- For SIMPLE VOCABULARY (chair, triangle, rain): use "single" layout
- Generate 2-4 panels maximum
- Each panel needs a clear Imagen prompt for educational vector art
- Labels should point to specific parts of the image
- Captions go below each image

Return ONLY valid JSON:
{
  "layout": "before-after" | "sequence" | "comparison" | "labeled-diagram" | "single",
  "title": "Concept Title",
  "panels": [
    {
      "id": "unique_id",
      "role": "before" | "after" | "step" | "left" | "right" | "",
      "imagenPrompt": "Detailed prompt for Imagen. Educational vector art, white background, no text.",
      "caption": "Brief descriptive caption for below the image",
      "labels": [
        { "text": "Label text", "position": "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" }
      ]
    }
  ]
}`;
      const result = await callGemini(planPrompt, true);
      try {
          const plan = JSON.parse(cleanJson(result));
          if (!plan.layout || !plan.panels || !Array.isArray(plan.panels)) {
              throw new Error('Invalid visual plan structure');
          }
          console.log('[ArtDirector] Visual plan:', plan.layout, plan.panels.length, 'panels');
          return plan;
      } catch (e) {
          warnLog('[ArtDirector] Plan parse failed, falling back to single layout', e);
          return { layout: 'single', title: concept, panels: [{ id: 'single', role: '', imagenPrompt: `Educational diagram of "${concept}". Clear vector art, white background, no text.`, caption: concept, labels: [] }] };
      }
  };

  const executeVisualPlan = async (plan, targetWidth = 400, targetQual = 0.8) => {
      const panels = [...plan.panels];
      console.log('[ArtDirector] Executing plan:', plan.layout, panels.length, 'panels');
      
      // Generate all panel images in parallel (respects existing Imagen concurrency)
      const imagePromises = panels.map(async (panel, idx) => {
          try {
              setGenerationStep(t('visual_director.generating_panel', { num: idx + 1, total: panels.length }) || \`Generating panel \${idx + 1}/\${panels.length}...\`);
              let imageUrl = await callImagen(panel.imagenPrompt, targetWidth, targetQual);
              
              // Text cleanup pass
              if (imageUrl) {
                  try {
                      const rawBase64 = imageUrl.split(',')[1];
                      const cleanPrompt = 'Remove all text, labels, letters, numbers, and words from this image. Keep the visual illustration perfectly intact.';
                      const cleaned = await callGeminiImageEdit(cleanPrompt, rawBase64, targetWidth, targetQual);
                      if (cleaned) imageUrl = cleaned;
                  } catch (cleanErr) {
                      warnLog(\`[ArtDirector] Text cleanup failed for panel \${idx}:\`, cleanErr);
                  }
              }
              return { ...panel, imageUrl };
          } catch (e) {
              warnLog(\`[ArtDirector] Panel \${idx} generation failed:\`, e);
              return { ...panel, imageUrl: null };
          }
      });
      
      const completedPanels = await Promise.all(imagePromises);
      return { ...plan, panels: completedPanels };
  };

  const handleRefinePanel = async (panelIdx, editInstruction) => {
      if (!generatedContent?.data?.visualPlan) return;
      const plan = generatedContent.data.visualPlan;
      const panel = plan.panels[panelIdx];
      if (!panel?.imageUrl) return;
      
      setIsProcessing(true);
      setGenerationStep(t('visual_director.refining_panel') || 'Refining panel...');
      try {
          const rawBase64 = panel.imageUrl.split(',')[1];
          const refinedUrl = await callGeminiImageEdit(editInstruction, rawBase64);
          if (refinedUrl) {
              const updatedPanels = [...plan.panels];
              updatedPanels[panelIdx] = { ...panel, imageUrl: refinedUrl };
              const updatedPlan = { ...plan, panels: updatedPanels };
              const updatedContent = {
                  ...generatedContent,
                  data: { ...generatedContent.data, visualPlan: updatedPlan, imageUrl: updatedPanels[0].imageUrl }
              };
              setGeneratedContent(updatedContent);
              setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
              addToast(t('visual_director.panel_refined') || 'Panel refined!', 'success');
          }
      } catch (e) {
          warnLog('[ArtDirector] Panel refinement failed:', e);
          addToast(t('visual_director.refine_failed') || 'Refinement failed', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleUpdateVisualLabel = (panelIdx, labelIdx, newText) => {
      if (!generatedContent?.data?.visualPlan) return;
      const plan = generatedContent.data.visualPlan;
      const updatedPanels = [...plan.panels];
      const updatedLabels = [...(updatedPanels[panelIdx].labels || [])];
      updatedLabels[labelIdx] = { ...updatedLabels[labelIdx], text: newText };
      updatedPanels[panelIdx] = { ...updatedPanels[panelIdx], labels: updatedLabels };
      const updatedPlan = { ...plan, panels: updatedPanels };
      const updatedContent = {
          ...generatedContent,
          data: { ...generatedContent.data, visualPlan: updatedPlan }
      };
      setGeneratedContent(updatedContent);
      setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
  };

"""

# Find handleGenerateSource and insert before it
func_anchor = 'const handleGenerateSource = async'
func_inserted = False
for i, l in enumerate(lines):
    if func_anchor in l:
        lines.insert(i, FUNCTIONS_CODE)
        func_inserted = True
        injected += 1
        print(f"[OK] Functions: Injected generateVisualPlan + executeVisualPlan before L{i+1}")
        break

# ─────────────────────────────────────────────────────────
# INJECTION 4: Modify handleGenerate 'image' case
# Replace the single-image generation with Art Director flow
# ─────────────────────────────────────────────────────────
# Find the specific image generation section in handleGenerate
# We need to find the part after "setGenerationStep(t('status_steps.rendering_diagram'))"
# and before "content = { prompt: finalPrompt..."
# We'll add the visual plan logic BEFORE the existing image generation
# as an intelligent gate: if visualDirectorEnabled, use multi-panel; else single image

# Find the line: "const promptGenPrompt = `" that starts the image prompt generation
# This should be ~20 lines before "try { let imageBase64 = await callImagen"
img_case_found = False
for i, l in enumerate(lines):
    if "setGenerationStep(t('status_steps.rendering_diagram'))" in l:
        # This is the line just before callImagen for the image case
        # We need to wrap the existing image generation in an else branch
        # and add the Art Director path as an if branch
        
        # Find the content = { prompt: line (end of image case)
        content_line = None
        for j in range(i, min(len(lines), i+60)):
            if 'content = { prompt: finalPrompt' in lines[j]:
                content_line = j
                break
        
        if content_line:
            # Insert Art Director gate BEFORE the existing rendering step
            art_director_gate = """\
        // === VISUAL ART DIRECTOR: Multi-Panel Generation ===
        // Decide whether to use multi-panel layout based on concept complexity
        let visualPlan = null;
        try {
            visualPlan = await generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage);
        } catch (planErr) {
            warnLog('[ArtDirector] Plan generation failed, falling back to single image', planErr);
        }
        
        if (visualPlan && visualPlan.layout !== 'single' && visualPlan.panels.length > 1) {
            // Multi-panel mode: execute the visual plan
            setGenerationStep(t('visual_director.generating_panels') || 'Generating multi-panel illustration...');
            const executedPlan = await executeVisualPlan(visualPlan, targetWidth, targetQual);
            content = {
                prompt: finalPrompt,
                style: styleDescription,
                imageUrl: executedPlan.panels[0]?.imageUrl || null,
                altText: altText,
                visualPlan: executedPlan
            };
            metaInfo = t('visual_director.multi_panel', { count: executedPlan.panels.length }) || \`Multi-Panel (\${executedPlan.panels.length} panels)\`;
        } else {
            // Single image mode (original behavior)
"""
            # Find the "setGenerationStep(t('status_steps.rendering_diagram'))" line
            # Insert the art director gate BEFORE it
            lines.insert(i, art_director_gate)
            img_case_found = True
            injected += 1
            print(f"[OK] Gate: Injected Art Director gate before L{i+1}")
            
            # Now find the content = { prompt: finalPrompt line (shifted by insertion)
            # and close the else branch after it + metaInfo
            shifted_content = None
            for j in range(i + art_director_gate.count('\n') + 1, len(lines)):
                if 'content = { prompt: finalPrompt' in lines[j]:
                    shifted_content = j
                    break
            
            if shifted_content:
                # Find the metaInfo line right after the content line
                for j in range(shifted_content, min(len(lines), shifted_content + 10)):
                    if 'metaInfo =' in lines[j] and ('worksheet' in lines[j] or 'visual_diagram' in lines[j] or 'Visual' in lines[j]):
                        # Close the else branch after this line
                        close_line = j + 1
                        # Check if there's already a closing brace
                        lines.insert(close_line, "        } // end single vs multi-panel\n")
                        injected += 1
                        print(f"[OK] Close: Closed else branch after L{close_line}")
                        break
        break

# ─────────────────────────────────────────────────────────
# INJECTION 5: Rendering — Show VisualPanelGrid in image output
# Find where imageUrl is rendered and add multi-panel detection
# ─────────────────────────────────────────────────────────
# Search for the image display area, which shows the generated image
# Look for generatedContent.data.imageUrl in the JSX area
render_anchor = 'handleRefineImage'
render_area_found = False
for i, l in enumerate(lines):
    if 'generatedContent?.data?.imageUrl' in l and 'src=' in l and i > 55000:
        # Found the image rendering. Add multi-panel check before it
        # We'll wrap this in a conditional: if visualPlan exists, show grid; else show single image
        print(f"[INFO] Found image rendering at L{i+1}: {l.rstrip()[:100]}")
        break

# Instead of modifying the JSX directly (fragile), let's find the image display section
# and add the VisualPanelGrid rendering nearby
# Search for the image output section with download/refine buttons  
for i, l in enumerate(lines):
    if 'handleDownloadImage' in l and 'onClick' in l and i > 60000:
        # Found the download button in the image output section
        # Go back to find the start of the image display container
        print(f"[INFO] Found image download button at L{i+1}")
        # Look backwards for the image container start
        for j in range(i-1, max(0, i-30), -1):
            if ('imageUrl' in lines[j] and ('src=' in lines[j] or '<img' in lines[j])):
                print(f"[INFO] Found image <img> at L{j+1}: {lines[j].rstrip()[:120]}")
                # Insert VisualPanelGrid rendering BEFORE the <img> tag
                visual_plan_render = """\
                                    {/* Multi-Panel Visual Art Director */}
                                    {generatedContent.data.visualPlan && generatedContent.data.visualPlan.panels.length > 1 ? (
                                        <VisualPanelGrid
                                            visualPlan={generatedContent.data.visualPlan}
                                            onRefinePanel={handleRefinePanel}
                                            onUpdateLabel={handleUpdateVisualLabel}
                                            t={t}
                                        />
                                    ) : (
"""
                lines.insert(j, visual_plan_render)
                injected += 1
                print(f"[OK] Render: Injected VisualPanelGrid before image at L{j+1}")
                
                # Now find the closing of the img tag and add the else closing
                for k in range(j + visual_plan_render.count('\n') + 2, min(len(lines), j + visual_plan_render.count('\n') + 20)):
                    if '</img>' in lines[k] or ('/>' in lines[k] and 'img' in lines[k-1] if k > 0 else False):
                        # Close after the img self-closing tag
                        lines.insert(k+1, "                                    )}\n")
                        injected += 1
                        print(f"[OK] Render: Closed ternary after img at L{k+2}")
                        break
                render_area_found = True
                break
        break

# ─────────────────────────────────────────────────────────
# INJECTION 6: Localization Keys
# ─────────────────────────────────────────────────────────
LOC_KEYS = {
    'visual_director.generating_panels': 'Generating multi-panel illustration...',
    'visual_director.generating_panel': 'Generating panel {num}/{total}...',
    'visual_director.multi_panel': 'Multi-Panel ({count} panels)',
    'visual_director.show_labels': 'Show Labels',
    'visual_director.hide_labels': 'Hide Labels',
    'visual_director.click_to_edit_label': 'Click to edit label',
    'visual_director.refine_panel': 'Edit this panel',
    'visual_director.refine_placeholder': 'Describe how to edit this panel...',
    'visual_director.panel_refined': 'Panel refined successfully!',
    'visual_director.refine_failed': 'Panel refinement failed',
}

loc_anchor = 'help_bridge_test_btn'
loc_inserted = False
for i, l in enumerate(lines):
    if loc_anchor in l:
        loc_lines = ''
        for key, val in LOC_KEYS.items():
            parts = key.split('.')
            loc_lines += f'        {parts[-1]}: "{val}",\n'
        # Add as a visual_director section
        insert_text = f'        // Visual Art Director\n{loc_lines}'
        lines.insert(i + 1, insert_text)
        loc_inserted = True
        injected += 1
        print(f"[OK] Localization: Injected {len(LOC_KEYS)} keys after L{i+1}")
        break

if not loc_inserted:
    print("[WARN] Could not find localization anchor, skipping loc keys")

# ─────────────────────────────────────────────────────────
# Save
# ─────────────────────────────────────────────────────────
open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\n✅ Phase F1-F3 complete! {injected} injections made.")
if not css_inserted:
    print("[WARN] CSS injection failed")
if not comp_inserted:
    print("[WARN] Component injection failed")
if not func_inserted:
    print("[WARN] Functions injection failed")
if not img_case_found:
    print("[WARN] Image case gate injection failed")
if not render_area_found:
    print("[WARN] Render area injection failed - manual wiring needed")
