"""Fix Layout Mode dropdown:
1. Remove from Outline section (wrong location)
2. Inject into Visual Support section (after Art Style, before Custom Instructions)
3. Replace t('visual_director.*') with direct strings
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Step 1: Remove the misplaced dropdown from the Outline section
old_block = """                        <div>
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
                        </div>"""

if old_block in content:
    content = content.replace(old_block, "")
    fixed += 1
    print("[OK] Removed misplaced dropdown from Outline section")
else:
    print("[WARN] Could not find exact old block in Outline section")

# Step 2: Inject the dropdown into Visual Support section
# It goes after the Art Style </div> and before the Custom Instructions <div>
# The correct insertion point is after "</select>\n                        </div>"
# which closes the Art Style dropdown, and before the Custom Instructions div.

art_style_close = """                        </select>
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">{t('input.custom_instructions')}"""

layout_dropdown_with_strings = """                        </select>
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">🎬 Layout Mode</label>
                        <select aria-label="Layout mode selection" 
                            data-help-key="visuals_layout_mode"
                            value={visualLayoutMode}
                            onChange={(e) => setVisualLayoutMode(e.target.value)}
                            className="w-full text-xs border-slate-300 rounded-md shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 p-1"
                        >
                            <option value="auto">🤖 AI Art Director (Auto)</option>
                            <option value="single">🖼️ Single Image</option>
                            <option value="before-after">↔️ Before &amp; After</option>
                            <option value="comparison">📊 Comparison</option>
                            <option value="sequence">🔢 Sequence / Steps</option>
                            <option value="labeled-diagram">🏷️ Labeled Diagram</option>
                        </select>
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">{t('input.custom_instructions')}"""

if art_style_close in content:
    content = content.replace(art_style_close, layout_dropdown_with_strings, 1)
    fixed += 1
    print("[OK] Injected Layout Mode dropdown into Visual Support section (after Art Style)")
else:
    print("[WARN] Could not find Art Style close pattern for injection")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
