"""
fix_all_collateral.py — Comprehensive scan for ALL spurious quote insertions.

The fix scripts added ' before } in template expressions like:
  ${chatStyles.inputArea}  ->  ${chatStyles.inputArea'}  (WRONG)
  ${someVariable}          ->  ${someVariable'}           (WRONG)

Valid patterns where ' before } IS correct:
  ${condition ? 'classA' : 'classB'}  — the ' ends a string literal
  {transform: '...'}                  — the ' ends a string value

Invalid patterns where ' before } was inserted:  
  ${variable'}                        — no opening ' for this string
  ${obj.prop'}                        — no opening ' for this string

Strategy: Find every '} in the file. Check if the ' has a matching opening '.
If the text between the last ${ and '} doesn't contain a matching opening quote,
the ' is spurious.
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    changes = 0
    
    for i, line in enumerate(lines):
        orig = line
        
        # Find all ${...'}  patterns — template expressions where ' before } may be wrong
        # Pattern: ${ followed by content ending with '} where the ' is spurious
        # 
        # A quote before } is valid if it closes a string: 'someString'}
        # A quote before } is INVALID if the preceding content is a variable/property access
        # 
        # Quick heuristic: if the char before '} is a letter/digit/underscore/bracket
        # AND there's no string-terminating pattern, the ' is spurious
        
        # Look for patterns like: ${something.something'} or ${something[0]'} 
        # These are clearly wrong — variables don't end with '
        
        # Match: a JS identifier char followed by '} (where ' was incorrectly added)
        # But NOT: a valid string like 'text-slate-200'}
        
        # Better approach: find all instances of '} ` in the line
        # For each, check if the preceding content since the last ${ contains balanced quotes
        
        pos = 0
        result = list(line)
        while pos < len(line) - 2:
            # Find next '} 
            idx = line.find("'}", pos)
            if idx < 0:
                break
            
            # Check: is this ' inside a ${...} template expression?
            # Find the preceding ${
            template_start = line.rfind('${', 0, idx)
            if template_start >= 0:
                # Get content between ${ and '}
                between = line[template_start + 2:idx]
                
                # Count single quotes in this segment
                quote_count = between.count("'")
                
                # If odd number of quotes, the ' before } closes a string — VALID
                # If even number (including 0), the ' is SPURIOUS  
                if quote_count % 2 == 0:
                    # This ' is spurious — remove it
                    result[idx] = ''  # Remove the spurious quote
                    changes += 1
                    # Get a snippet for logging
                    snippet = line[max(0, idx-30):idx+10].strip()
                    print(f"  L{i+1}: removed spurious ' in: ...{snippet}...")
            
            pos = idx + 1
        
        if changes > 0 and result != list(orig):
            lines[i] = ''.join(result)
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} spurious quotes removed.")

if __name__ == "__main__":
    main()
