"""
Phase F5: Add Layout Template Dropdown for Visual Art Director
1. State variable: visualLayoutMode 
2. Dropdown UI after art style select
3. Integration into Art Director gate
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
injected = 0

# ─────────────────────────────────────────────────────────
# 1. Add state variable after visualStyle useState
# ─────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if "useState('Default')" in l and 'visualStyle' in l:
        state_line = "  const [visualLayoutMode, setVisualLayoutMode] = React.useState('auto');\n"
        lines.insert(i + 1, state_line)
        injected += 1
        print(f"[OK] State: Added visualLayoutMode after L{i+1}")
        break

# ─────────────────────────────────────────────────────────
# 2. Add dropdown UI after art style </select> + </div>
# Insert after the art style dropdown's closing </div>
# The art style dropdown ends at </select>\n</div>
# ─────────────────────────────────────────────────────────
dropdown_ui = '''                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">🎬 {t('visual_director.layout_mode') || 'Layout Mode'}</label>
                        <select aria-label="Layout mode selection" 
                            data-help-key="visuals_layout_mode"
                            value={visualLayoutMode}
                            onChange={(e) => setVisualLayoutMode(e.target.value)}
                            className="w-full text-xs border-slate-300 rounded-md shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 p-1"
                        >
                            <option value="auto">🤖 {t('visual_director.layout_auto') || 'AI Art Director (Auto)'}</option>
                            <option value="single">🖼️ {t('visual_director.layout_single') || 'Single Image'}</option>
                            <option value="before-after">↔️ {t('visual_director.layout_before_after') || 'Before & After'}</option>
                            <option value="comparison">📊 {t('visual_director.layout_comparison') || 'Comparison'}</option>
                            <option value="sequence">🔢 {t('visual_director.layout_sequence') || 'Sequence / Steps'}</option>
                            <option value="labeled-diagram">🏷️ {t('visual_director.layout_labeled') || 'Labeled Diagram'}</option>
                        </select>
                        </div>
'''

# Find the art style dropdown's closing </select> followed by </div>
# Pattern: </select>\n</div>\n<div> (next section = custom instructions)
for i, l in enumerate(lines):
    if "</select>" in l and i > 60000 and i < 60200:
        # Check if next line is </div>
        if i + 1 < len(lines) and '</div>' in lines[i+1]:
            # Insert after </div>
            lines.insert(i + 2, dropdown_ui)
            injected += 1
            print(f"[OK] Dropdown: Added layout mode dropdown after L{i+2}")
            break

# ─────────────────────────────────────────────────────────
# 3. Integrate into Art Director gate
# Replace the automatic plan generation with layout-mode-aware logic
# ─────────────────────────────────────────────────────────
# Find the Art Director gate
for i, l in enumerate(lines):
    if '// === VISUAL ART DIRECTOR: Multi-Panel Generation ===' in l and i > 52000:
        # Find the old gate logic (next ~15 lines)
        old_gate_start = i
        old_gate_end = None
        for j in range(i, min(len(lines), i + 20)):
            if 'if (visualPlan && visualPlan.layout' in lines[j]:
                old_gate_end = j
                break
        
        if old_gate_end:
            # Replace the plan generation block with layout-mode-aware version
            new_gate = '''        // === VISUAL ART DIRECTOR: Multi-Panel Generation ===
        // Layout mode: 'auto' = AI decides, 'single' = skip plan, others = force template
        let visualPlan = null;
        if (visualLayoutMode !== 'single') {
            try {
                if (visualLayoutMode === 'auto') {
                    // AI decides the best layout
                    visualPlan = await generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage);
                } else {
                    // Teacher selected a specific template — tell Gemini to use it
                    const templateHint = `You MUST use layout: "${visualLayoutMode}".`;
                    const concept = textToProcess.substring(0, 500);
                    visualPlan = await generateVisualPlan(concept + '\\n\\n' + templateHint, effectiveGrade, effectiveLanguage);
                    // Force the layout in case Gemini didn't follow instructions
                    if (visualPlan) visualPlan.layout = visualLayoutMode;
                }
            } catch (planErr) {
                warnLog('[ArtDirector] Plan generation failed, falling back to single image', planErr);
            }
        }
        
'''
            lines[old_gate_start:old_gate_end] = [new_gate]
            injected += 1
            print(f"[OK] Gate: Replaced Art Director gate with layout-mode-aware version at L{old_gate_start+1}")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\n✅ Phase F5 complete! {injected} injections made.")
