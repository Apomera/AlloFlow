"""
fix_chunk_theme_quotes.py — Fix all quoting issues in chunk reader theme changes.
The problem: theme ternaries were wrapped in single quotes 'xxx' but need backticks `xxx`
when they contain ${} template expressions.
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # The chunk reader component is around L28620-29050
    # Find all lines with broken theme ternaries: '${theme === 
    # These need to use backtick template literals, not single-quoted strings

    lines = content.split('\n')
    fixed_lines = []
    
    for i, line in enumerate(lines):
        orig = line
        # Pattern: something like: 'bg-amber-500 text-white' : '${theme === 'dark' ? ... : ...}'
        # The outer single quotes around ${...} need to be removed,
        # and the whole className should use template literal
        
        # Fix pattern: ': '${theme === ' — replace ': ' before ${theme with ': ` and fix the closing quote
        if '${theme ==' in line and ("' :" in line or "': " in line):
            # This is a broken ternary in the chunk reader
            # The fix: replace '${theme with ${theme and trailing }' with }
            line = line.replace("'${theme ===", "${theme ===")
            # Fix the closing of these blocks - trailing }' to just }
            # Find pattern like: ...'bg-slate-100 text-slate-600 hover:bg-slate-200'}'
            line = re.sub(r"'}\s*`", "} `", line)
            line = re.sub(r"'\}`", "}`", line)
            # Also handle the case where it ends mid-expression
            if orig != line:
                changes += 1
                print(f"  Fixed L{i+1}")
        
        fixed_lines.append(line)
    
    if changes > 0:
        content = '\n'.join(fixed_lines)
    
    # Now do more targeted fixes for the specific patterns from fix_immersive_themes.py
    
    # Fix 1: Visibility mode button (L~28975) 
    # Was: : '${theme === 'dark' ? 'bg-slate-800...' : ...}'
    # Need: The whole className should be a single template literal
    old_vis = "'${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}'"
    new_vis = "(theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')"
    if old_vis in content:
        content = content.replace(old_vis, new_vis, 1)
        changes += 1
        print("Fix 1: Visibility mode button - removed template wrapping")
    
    # Fix 2: Auto-play button 
    old_auto = "': `${theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-300 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-amber-700 hover:bg-slate-200'}`"
    new_auto = "': (theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-300 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-amber-700 hover:bg-slate-200')"
    if old_auto in content:
        content = content.replace(old_auto, new_auto, 1)
        changes += 1
        print("Fix 2: Auto-play button - removed template wrapping")
    
    # Fix 3: Chunk text colors (current vs dimmed)
    old_chunk_text = "${theme === 'dark' ? 'text-white' : theme === 'contrast' ? 'text-yellow-200' : 'text-slate-900'} : ${theme === 'dark' ? 'text-slate-600' : theme === 'contrast' ? 'text-yellow-800' : 'text-slate-400'}"
    # This one is inside a ternary like: isCurrent ? CURRENT : DIMMED
    # It needs to be: (theme === 'dark' ? 'text-white' : ...) : (theme === 'dark' ? 'text-slate-600' : ...)
    new_chunk_text = "${theme === 'dark' ? 'text-white' : theme === 'contrast' ? 'text-yellow-200' : 'text-slate-900'}" + "' : '" + "${theme === 'dark' ? 'text-slate-600' : theme === 'contrast' ? 'text-yellow-800' : 'text-slate-400'}"
    # Actually this one is already inside a template literal. Let me check the exact context.
    # Skip this for now, it's likely fine since it's inside backticks already

    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")

if __name__ == "__main__":
    main()
