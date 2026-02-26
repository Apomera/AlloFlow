#!/usr/bin/env python3
"""Fix source text gating:
1. Update 19 disabled buttons: !inputText -> !inputText && !hasAnalysis
2. Gray out useMathSourceContext toggle when no source available
3. Add helper text for disabled generation buttons
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ====================================================================
# PREP: Add a derived hasAnalysis variable near other derived state
# This avoids recalculating history.some() 19 times in the render
# ====================================================================
# Find a good insertion point - near the botAccessory memo area
anchor = "const botAccessoryBase = useMemo(() => getBotAccessoryInternal()"
if anchor not in content:
    anchor = "const botAccessory = useMemo(() => getBotAccessoryInternal()"
    
if anchor in content:
    has_analysis_var = """
  // Derived: does any analysis exist in history? Used for button gating.
  const hasAnalysisInHistory = useMemo(() => history.some(h => h && h.type === 'analysis'), [history]);
  const hasSourceOrAnalysis = inputText || hasAnalysisInHistory;

""" + "  " + anchor
    content = content.replace(anchor, has_analysis_var, 1)
    changes += 1
    print("PREP: Added hasAnalysisInHistory + hasSourceOrAnalysis derived variables")
else:
    print("PREP: FAILED - could not find botAccessory anchor")

# ====================================================================
# FIX 1: Update disabled buttons
# Replace disabled={!inputText || isProcessing} with disabled={!hasSourceOrAnalysis || isProcessing}
# Replace disabled={!inputText} with disabled={!hasSourceOrAnalysis}
# ====================================================================
# Pattern 1: disabled={!inputText || isProcessing}
count1 = content.count('disabled={!inputText || isProcessing}')
content = content.replace(
    'disabled={!inputText || isProcessing}',
    'disabled={!hasSourceOrAnalysis || isProcessing}'
)
print(f"FIX 1a: Updated {count1} instances of disabled={{!inputText || isProcessing}}")
changes += count1

# Pattern 2: disabled={!inputText || isGeneratingPersona || isProcessing}
count2 = content.count('disabled={!inputText || isGeneratingPersona || isProcessing}')
content = content.replace(
    'disabled={!inputText || isGeneratingPersona || isProcessing}',
    'disabled={!hasSourceOrAnalysis || isGeneratingPersona || isProcessing}'
)
print(f"FIX 1b: Updated {count2} instances of disabled={{!inputText || isGeneratingPersona || isProcessing}}")
changes += count2

# Pattern 3: disabled={!inputText || isProcessing || !standardsInput}
count3 = content.count('disabled={!inputText || isProcessing || !standardsInput}')
content = content.replace(
    'disabled={!inputText || isProcessing || !standardsInput}',
    'disabled={!hasSourceOrAnalysis || isProcessing || !standardsInput}'
)
print(f"FIX 1c: Updated {count3} instances of disabled={{!inputText || isProcessing || !standardsInput}}")
changes += count3

# Pattern 4: disabled={!inputText} (standalone)
# Be careful not to match patterns we already replaced
# Count remaining instances
count4 = content.count('disabled={!inputText}')
content = content.replace(
    'disabled={!inputText}',
    'disabled={!hasSourceOrAnalysis}'
)
print(f"FIX 1d: Updated {count4} instances of disabled={{!inputText}}")
changes += count4

total_buttons = count1 + count2 + count3 + count4
print(f"FIX 1 TOTAL: Updated {total_buttons} button disabled conditions")

# ====================================================================
# FIX 2: Gray out useMathSourceContext toggle when no source available
# ====================================================================
old_math_toggle = """<input aria-label="Toggle use math source context"
                                id="mathContext"
                                type="checkbox"
                                checked={useMathSourceContext}
                                onChange={(e) => setUseMathSourceContext(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />"""

new_math_toggle = """<input aria-label="Toggle use math source context"
                                id="mathContext"
                                type="checkbox"
                                checked={useMathSourceContext}
                                onChange={(e) => setUseMathSourceContext(e.target.checked)}
                                disabled={!hasSourceOrAnalysis}
                                title={!hasSourceOrAnalysis ? "No source text or analysis available to use as context" : "Use source text to contextualize math problems"}
                                className={`w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 ${!hasSourceOrAnalysis ? 'opacity-40 cursor-not-allowed' : ''}`}
                            />"""

if old_math_toggle in content:
    content = content.replace(old_math_toggle, new_math_toggle, 1)
    changes += 1
    print("FIX 2: Grayed out useMathSourceContext toggle when no source available")
else:
    print("FIX 2: FAILED - could not find math context toggle")

# ====================================================================
# FIX 3: Add helper text when buttons are disabled
# Find the main source input panel and add a notice
# We'll add it near the generation buttons area
# Look for a good anchor in the toolbar/sidebar where buttons live
# ====================================================================
# Find the first disabled button area in the main generation panel
# The buttons start around L63542 - let's find the container
# Actually, the best UX is a small inline notice near groups of buttons
# Let's add it at the top of the generation controls section

# Find where the generation buttons section starts - look for the first 
# hasSourceOrAnalysis disabled button
# A simpler approach: add a small notice component that shows conditionally
# Insert it right before the main toolbar buttons section

# Let's find the generation panel where these buttons live
# The buttons are in the sidebar/control panel
# Look for the first occurrence of our updated disabled pattern in the render area

helper_text = """{!hasSourceOrAnalysis && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                <span className="text-xs text-amber-700">Paste source text in the <strong>Input</strong> tab to enable generation tools.</span>
                            </div>
                        )}"""

# Find a good insertion point - right before the first generation button block
# The buttons are in the sidebar generation area, let's find the first one
# Look for the "Generate" section heading or the first disabled button
first_button_area = 'disabled={!hasSourceOrAnalysis || isProcessing}'
idx = content.find(first_button_area)
if idx > 0:
    # Go backward to find the start of the containing div
    # Find the previous line break, then go back to find a good container
    line_start = content.rfind('\n', 0, idx)
    # Find the div that contains this section - look for data-help-key
    search_area = content[max(0, idx-2000):idx]
    # Find the last "Generate" or section header before this button
    # Let's find the container div with className that wraps the generation controls
    # Actually, let's insert before the first button's containing div
    # Look for a good marker - the generation tools section often has a heading
    
    # Find the start of the panel section that contains these buttons
    # Look backwards for a section header or panel start
    panel_markers = ['data-help-key="simplified_output"', 'data-help-key="source_analysis"', 'generation-tools']
    inserted = False
    for marker in panel_markers:
        marker_idx = content.find(marker)
        if marker_idx > 0 and marker_idx < idx:
            # Find the next line after the marker's element
            next_line = content.find('\n', marker_idx)
            if next_line > 0:
                content = content[:next_line+1] + "                        " + helper_text + "\n" + content[next_line+1:]
                inserted = True
                changes += 1
                print(f"FIX 3: Added helper text after marker '{marker}'")
                break
    
    if not inserted:
        # Fallback: add it close to the first button
        # Find the <div> or <button> tag start for the first disabled button
        tag_start = content.rfind('<', max(0, idx - 200), idx)
        if tag_start > 0:
            content = content[:tag_start] + helper_text + "\n                        " + content[tag_start:]
            changes += 1
            print("FIX 3: Added helper text (fallback position)")
else:
    print("FIX 3: FAILED - could not find insertion point")

# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
