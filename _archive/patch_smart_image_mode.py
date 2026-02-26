"""
Patch: Add Smart Image Display Mode to Word Sounds Studio
This script adds a 4th 'smart' mode that provides activity-specific optimal image behavior.
"""

import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Track changes made
    changes = []
    
    # 1. Add SMART_IMAGE_VISIBILITY constant after the existing imageVisibilityMode state (L1169)
    # We'll add it right after the WordSoundsGenerator function starts
    smart_const = '''
        // SMART IMAGE VISIBILITY - Activity-specific optimal image behavior
        const SMART_IMAGE_VISIBILITY = {
            'counting':       'afterCompletion',  // High rigor - no visual hints
            'isolation':      'progressive',       // Reveal after 1st attempt
            'blending':       'afterCompletion',  // Auditory-first, reveal as reward
            'segmentation':   'alwaysOn',          // Word is known, image supports VAKT
            'rhyming':        'progressive',       // Standard scaffolding
            'letter_tracing': 'alwaysOn',          // VAKT requires visual context
            'mapping':        'alwaysOn',          // Orthographic activity
            'orthography':    'afterCompletion',  // Spelling recognition
            'word_families':  'progressive',       // Standard scaffolding
            'spelling_bee':   'afterCompletion',  // Audio-first
            'word_scramble':  'afterCompletion',  // Orthographic puzzle
            'missing_letter': 'afterCompletion'   // Spelling task
        };
'''
    
    # Pattern 1: Change default state from 'progressive' to 'smart' at line 1169
    old_state = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('progressive');"
    new_state = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');"
    
    if old_state in content:
        content = content.replace(old_state, new_state, 1)
        changes.append("Changed default imageVisibilityMode from 'progressive' to 'smart'")
    else:
        print("WARNING: Could not find imageVisibilityMode state declaration")
    
    # Pattern 2: Add the SMART_IMAGE_VISIBILITY constant after the state declaration
    # Insert after the line we just modified
    if new_state in content and "SMART_IMAGE_VISIBILITY" not in content:
        content = content.replace(new_state, new_state + smart_const, 1)
        changes.append("Added SMART_IMAGE_VISIBILITY constant mapping")
    
    # Pattern 3: Update dropdown options to include 'smart' as first option
    old_dropdown = '''<option value="alwaysOn">🖼️ Always On - Image visible immediately</option>
                                        <option value="progressive">📈 Progressive - After 1st response</option>
                                        <option value="afterCompletion">✅ After Completion - After correct or 2nd attempt</option>'''
    
    new_dropdown = '''<option value="smart">🧠 Smart (Recommended) - Activity-specific</option>
                                        <option value="alwaysOn">🖼️ Always On - Image visible immediately</option>
                                        <option value="progressive">📈 Progressive - After 1st response</option>
                                        <option value="afterCompletion">✅ After Completion - After correct or 2nd attempt</option>'''
    
    if old_dropdown in content:
        content = content.replace(old_dropdown, new_dropdown, 1)
        changes.append("Added 'Smart' option to dropdown as first/default choice")
    else:
        print("WARNING: Could not find dropdown options pattern")
        # Try alternate pattern with different whitespace
        alt_pattern = r'(<option value="alwaysOn">.*?Always On.*?</option>)'
        if re.search(alt_pattern, content, re.DOTALL):
            print("Found alternate dropdown pattern, attempting fix...")
    
    # Pattern 4: Update description text below dropdown
    old_desc = '''<p className="text-xs text-slate-500 mt-2">When should word images be revealed during activities</p>'''
    new_desc = '''<p className="text-xs text-slate-500 mt-2">When should word images be revealed during activities (Smart = optimized per activity)</p>'''
    
    if old_desc in content:
        content = content.replace(old_desc, new_desc, 1)
        changes.append("Updated dropdown description text")
    
    # Write the patched content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("=" * 60)
    print("PATCH COMPLETE - Changes Made:")
    for i, c in enumerate(changes, 1):
        print(f"  {i}. {c}")
    print("=" * 60)
    
    return len(changes)

if __name__ == "__main__":
    filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
    patch_file(filepath)
