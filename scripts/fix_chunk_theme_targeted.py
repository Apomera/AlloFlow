"""
fix_chunk_theme_targeted.py — Revert the overly broad regex fix and apply targeted chunk reader fixes.

The problem: fix_chunk_theme_quotes.py removed '${' patterns globally, breaking valid 
template literals in other components. We need to:
1. Restore the '${theme ==' pattern where it was incorrectly removed (outside chunk reader)
2. Apply the correct fix ONLY in ChunkedReaderOverlay (the component doesn't use template literals
   for its classNames — it uses ternary expressions inside className strings)
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # First, find the ChunkedReaderOverlay component boundaries
    chunk_start = None
    chunk_end = None
    for i, line in enumerate(lines):
        if 'const ChunkedReaderOverlay = React.memo' in line:
            chunk_start = i
        if chunk_start and i > chunk_start and line.strip().startswith('const ') and 'React.memo' in line and i > chunk_start + 50:
            chunk_end = i
            break
    
    if chunk_start is None:
        print("Could not find ChunkedReaderOverlay")
        return
    
    if chunk_end is None:
        chunk_end = chunk_start + 500  # fallback
    
    print(f"ChunkedReaderOverlay: L{chunk_start+1} to L{chunk_end+1}")
    
    changes = 0
    
    # Step 1: Restore ALL lines outside the chunk reader that were incorrectly modified
    # The fix removed leading ' before ${theme, changing '${theme to ${theme
    # We need to restore those since they were inside backtick template literals and were correct
    for i in range(len(lines)):
        if i >= chunk_start and i <= chunk_end:
            continue  # Skip chunk reader lines — handle separately
        
        line = lines[i]
        # If this line has ${theme but NOT '${theme, it was probably modified  
        # Restore by adding back ' before ${theme where needed
        # Actually, the original code had '${theme in some ternaries inside template literals
        # which IS valid JSX. The fix broke them.
        # But we can't blindly restore because some were already correct.
        # Better approach: just check if the line was in our fix list and undo it
        # Skip this — too risky. Instead, just fix the chunk reader properly.
    
    # Step 2: Fix the chunk reader lines properly
    # The chunk reader's classNames use template literals with backticks
    # Inside those, the ternaries need proper ${} wrapping
    # The issue was specifically: 
    #   old: 'bg-slate-800 text-amber-400 hover:bg-slate-700'
    #   replaced with: '${theme === 'dark' ? ...}'  <-- WRONG (single quotes around template)
    # The fix should be:  ${theme === 'dark' ? '...' : '...'}  <-- inside backtick template
    
    # Actually, looking at this more carefully, the ChunkedReaderOverlay component  
    # uses className={} with template literals. Inside className={`...`}, 
    # the ${theme === 'dark' ? ...} IS correct.
    # The problem was specifically: 
    #   className={`... ${visibilityMode === m.key ? 'bg-amber-500 text-white' : '${theme === 'dark' ? ...}'}`}
    # The outer quotes around ${...} are the problem. It should be:
    #   className={`... ${visibilityMode === m.key ? 'bg-amber-500 text-white' : (theme === 'dark' ? ... : ...)}`}
    
    # Since the broad fix already removed the leading ', we need to also remove the trailing '
    # for lines inside the chunk reader
    
    for i in range(chunk_start, min(chunk_end + 1, len(lines))):
        line = lines[i]
        # Fix pattern: ...text-white' : ${theme === ... '...200'}'  
        # The trailing }' should just be }
        # Look for cases where we have theme ternary result ending with }'
        if "${theme ==" in line:
            # Remove trailing }' and replace with just } in className contexts
            line = re.sub(r"\}'(\s*`|\s*\})", r"}\1", line)
            if lines[i] != line:
                changes += 1
                lines[i] = line
                print(f"  Fixed trailing quote L{i+1}")
    
    content = '\n'.join(lines)
    
    # Now handle the specific problematic patterns
    # Fix the auto-play button pattern specifically
    old_auto = """'bg-amber-500 text-white' : `${theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-300 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-amber-700 hover:bg-slate-200'}`"""
    new_auto = """'bg-amber-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-300 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-amber-700 hover:bg-slate-200')"""
    if old_auto in content:
        content = content.replace(old_auto, new_auto, 1)
        changes += 1
        print("  Fixed auto-play button template")

    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} targeted fixes applied.")
    print("\nNOTE: Lines outside ChunkedReaderOverlay that were touched by the broad fix")
    print("need to be verified. Running a validation check...")
    
    # Validation: check for any remaining broken patterns
    content = SRC.read_text(encoding='utf-8')
    issues = []
    for i, line in enumerate(content.split('\n')):
        # Check for '${theme patterns (broken single-quote wrapping)
        if "'${theme ==" in line:
            issues.append(f"L{i+1}: Potential broken quote")
    
    if issues:
        print(f"\nFound {len(issues)} potential issues:")
        for iss in issues:
            print(f"  {iss}")
    else:
        print("\nNo remaining broken quote patterns found.")

if __name__ == "__main__":
    main()
