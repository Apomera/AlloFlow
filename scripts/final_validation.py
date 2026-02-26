"""
final_validation.py — Comprehensive syntax validation for ALL theme-related issues.
Checks for every known broken pattern.
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    issues = []
    
    for i, line in enumerate(lines):
        # Check 1: Nested ${theme inside another ${}
        if ': ${theme ==' in line or '? ${theme ==' in line:
            issues.append(f"L{i+1}: NESTED ${{theme}} — needs (theme ===")
        
        # Check 2: '${theme (single-quoted template literal)
        if "'${theme ==" in line:
            issues.append(f"L{i+1}: QUOTED TEMPLATE — '${'{'}theme")
            
        # Check 3: Spurious quote in ${variable'}
        # Find ${...} expressions and check for odd quotes
        for m in re.finditer(r'\$\{([^}]+)\}', line):
            expr = m.group(1)
            # If expression ends with ' but doesn't start a string
            if expr.endswith("'") and not expr.endswith("''"):
                # Check if the ' closes a valid string
                quote_count = expr.count("'")
                if quote_count % 2 != 0:
                    # Odd quotes — check if this is a ternary (valid) or a variable (invalid)
                    # Variables like chatStyles.prop' are invalid
                    last_segment = expr.split()[-1] if expr.strip() else ''
                    if last_segment.endswith("'") and '?' not in last_segment and ':' not in last_segment:
                        # Could be a valid ternary ending, skip if it has ternary ops
                        if '?' not in expr:
                            issues.append(f"L{i+1}: SPURIOUS QUOTE in ${{...{last_segment}}}")
        
        # Check 4: createElement with ')' }, (only valid for SVG transforms)
        if 'createElement' in line and "')' }," in line and 'transform' not in line and 'rotate' not in line:
            issues.append(f"L{i+1}: createElement has ')' }}, — should be ') }},")
    
    if issues:
        print(f"Found {len(issues)} potential issues:")
        for iss in issues:
            print(f"  {iss}")
    else:
        print("✅ All validation checks passed — no issues found!")

if __name__ == "__main__":
    main()
