"""
Fix two bugs in AlloFlowANTI.txt:
1. Citation validation: After cleanup LLM call, verify citation count hasn't dropped
2. Header-density sanitizer: Demote markdown headers when >40% of lines are headers
"""
import re

INPUT = 'AlloFlowANTI.txt'
REPORT = 'bugfix_report.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Bug Fix Report ===")
    report.append(f"Input: {len(lines):,} lines")

    fixes_applied = 0

    # ─── FIX 1: Citation validation after cleanup LLM call ───
    # Target: After `if (!cleaned) throw new Error("Cleanup returned empty");`
    # Add: Check citation count in cleaned vs rawWithCitations, fall back if too many lost
    
    target1 = 'if (!cleaned) throw new Error("Cleanup returned empty");'
    idx1 = content.find(target1)
    
    if idx1 < 0:
        report.append("FIX 1: SKIP - target string not found")
    else:
        # Insert validation code right after the target line
        insert_pos = idx1 + len(target1)
        
        validation_code = """
                  
                  // FIX: Citation validation - detect if cleanup LLM stripped citations
                  const rawCitCount = (rawWithCitations.match(/\\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\\]\\(/g) || []).length;
                  const cleanedCitCount = (cleaned.match(/\\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\\]\\(/g) || []).length;
                  if (rawCitCount > 0 && cleanedCitCount < rawCitCount * 0.5) {
                      console.warn(`Citation validation: cleanup lost ${rawCitCount - cleanedCitCount}/${rawCitCount} citations. Falling back to raw.`);
                      throw new Error("Citation loss detected - using raw grounding");
                  }"""
        
        content = content[:insert_pos] + validation_code + content[insert_pos:]
        fixes_applied += 1
        report.append(f"FIX 1: Citation validation inserted after L{content[:idx1].count(chr(10))+1}")

    # ─── FIX 2: Header-density sanitizer for originalText ───
    # Target: The line that creates cleanedTextForDisplay  
    # `const cleanedTextForDisplay = textForDisplay.split('\n').map(line => {`
    # We need to:
    #   a) Change `const` to `let` for cleanedTextForDisplay
    #   b) Add header-density check after the `.join('\n')` block
    
    # Step 2a: Change const to let
    target2a = "const cleanedTextForDisplay = textForDisplay.split('\\n').map(line => {"
    idx2a = content.find(target2a)
    
    if idx2a < 0:
        report.append("FIX 2a: SKIP - cleanedTextForDisplay const not found")
    else:
        content = content[:idx2a] + "let" + content[idx2a + 5:]  # Replace 'const' with 'let'
        fixes_applied += 1
        report.append(f"FIX 2a: Changed const to let for cleanedTextForDisplay")

    # Step 2b: Find the closing of the cleanedTextForDisplay block and insert sanitizer
    # The block ends with: `}).join('\n');`
    # After it, we add the header-density check
    
    # Find the specific `.join('\n');` that closes cleanedTextForDisplay
    target2b = "}).join('\\n');\n"
    # We need to find the one that comes after cleanedTextForDisplay, not any random one
    # Search forward from idx2a
    if idx2a >= 0:
        search_start = idx2a + 100  # Skip past the definition
        idx2b = content.find(target2b, search_start)
        
        if idx2b < 0:
            # Try alternate format
            target2b_alt = '}).join("\\n");'
            idx2b = content.find(target2b_alt, search_start)
            if idx2b >= 0:
                insert_pos2 = idx2b + len(target2b_alt)
            else:
                report.append("FIX 2b: SKIP - closing join not found")
                idx2b = -1
        else:
            insert_pos2 = idx2b + len(target2b)
        
        if idx2b >= 0:
            sanitizer_code = """        // FIX: Header-density sanitizer — demote headers when >40% of lines are headers
        const _nonEmpty = cleanedTextForDisplay.split('\\n').filter(l => l.trim());
        const _headerCount = _nonEmpty.filter(l => l.trim().startsWith('#')).length;
        if (_nonEmpty.length > 3 && _headerCount / _nonEmpty.length > 0.4) {
            cleanedTextForDisplay = cleanedTextForDisplay.split('\\n').map(line => {
                const trimmed = line.trim();
                if (/^#{1,6}\\s+/.test(trimmed)) {
                    // Demote: # Title → **Title** (renders as bold paragraph instead of header)
                    return line.replace(/^(\\s*)#{1,6}\\s+(.*)$/, '$1**$2**');
                }
                return line;
            }).join('\\n');
        }
"""
            content = content[:insert_pos2] + sanitizer_code + content[insert_pos2:]
            fixes_applied += 1
            report.append(f"FIX 2b: Header-density sanitizer inserted after cleanedTextForDisplay")
    
    # Write output
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    new_lines = content.split('\n')
    report.append(f"\nFixes applied: {fixes_applied}")
    report.append(f"Output: {len(content):,} bytes, {len(new_lines):,} lines")
    
    # Verify brace balance
    open_b = content.count('{')
    close_b = content.count('}')
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
    
    open_p = content.count('(')
    close_p = content.count(')')
    report.append(f"Parens: {open_p} open, {close_p} close, diff={open_p - close_p}")

    report.append("\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"Applied {fixes_applied} fixes. See {REPORT}")

if __name__ == '__main__':
    main()
