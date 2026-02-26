"""
Tier 3 v2: Broader style analysis.
Also extract constant styles as module-level objects (not useMemo needed).
"""
import re
from collections import Counter

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')

    # Find AlloFlowContent
    allo_start = None
    for i, line in enumerate(lines):
        if re.search(r'(?:const|function)\s+AlloFlowContent\s*[=(]', line):
            allo_start = i
            break

    # Broader approach: find all style={{ at any line, then extract until matching }}
    style_objects = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Find style={{ on this line
        idx = line.find('style={{')
        if idx >= 0:
            # Extract the full style object
            # Start from style={{ and find matching }}
            style_start = idx
            brace_depth = 0
            style_text = ''
            j = i
            started = False
            # Get position after 'style={'
            pos = idx + 6  # position of first {
            while j < len(lines) and j < i + 10:  # Max 10 lines for a style
                for k in range(pos if j == i else 0, len(lines[j])):
                    ch = lines[j][k]
                    style_text += ch
                    if ch == '{':
                        brace_depth += 1
                        started = True
                    elif ch == '}':
                        brace_depth -= 1
                        if started and brace_depth == 0:
                            # Found matching close
                            full = f'style={{{style_text}'
                            is_multiline = j > i
                            style_objects.append({
                                'full': full,
                                'line': i,
                                'end_line': j,
                                'in_allo': i >= allo_start,
                                'multiline': is_multiline,
                                'content': style_text[1:-1].strip(),  # inner content
                            })
                            j = -1  # Signal found
                            break
                if j == -1:
                    break
                style_text += '\n'
                j += 1
        i += 1

    print(f"Found {len(style_objects)} style objects total")
    print(f"  Single-line: {sum(1 for s in style_objects if not s['multiline'])}")
    print(f"  Multi-line: {sum(1 for s in style_objects if s['multiline'])}")
    print(f"  Inside AlloFlowContent: {sum(1 for s in style_objects if s['in_allo'])}")

    # Find duplicates by exact content match
    content_counts = Counter(s['content'] for s in style_objects if s['in_allo'])
    allo_dups = {k: v for k, v in content_counts.items() if v >= 2}

    all_content_counts = Counter(s['content'] for s in style_objects)
    all_dups = {k: v for k, v in all_content_counts.items() if v >= 2}

    report = []
    report.append("=== Tier 3 v2: Comprehensive Style Analysis ===")
    report.append(f"Total style objects: {len(style_objects)}")
    report.append(f"Inside AlloFlowContent: {sum(1 for s in style_objects if s['in_allo'])}")

    report.append(f"\n=== Duplicates in AlloFlowContent (2+) ===")
    for content_str, count in sorted(allo_dups.items(), key=lambda x: -x[1]):
        report.append(f"  [{count}x] {content_str[:140]}")

    report.append(f"\n=== All duplicates (2+) ===")
    for content_str, count in sorted(all_dups.items(), key=lambda x: -x[1]):
        report.append(f"  [{count}x] {content_str[:140]}")

    # For constant styles (no JS variables), we can extract as module-level consts
    report.append(f"\n=== Constant style candidates (no variables, 2+ occurrences) ===")
    for content_str, count in sorted(all_dups.items(), key=lambda x: -x[1]):
        # Check if it's purely CSS with no JS expressions
        has_js = bool(re.search(r'[a-z]\w+\s*[?+]|`|\$\{|&&|\|\||[a-z]\w+\s*:', content_str))
        # More refined: check if values are all string/number literals
        # CSS props use camelCase: color, fontSize, etc.
        is_constant = True
        # Split by commas carefully
        for prop in content_str.split(','):
            prop = prop.strip()
            if not prop:
                continue
            # Check if value side contains a variable reference
            if ':' in prop:
                val = prop.split(':', 1)[1].strip()
                # Constant values: 'string', number, quoted strings
                if not re.match(r"^'[^']*'$|^\"[^\"]*\"$|^\d+(\.\d+)?(px|em|rem|%|vh|vw)?$|^-?\d+$|^0$", val):
                    is_constant = False
                    break

        if is_constant:
            report.append(f"  [CONST {count}x] {content_str[:140]}")
        else:
            report.append(f"  [DYNAMIC {count}x] {content_str[:140]}")

    with open('tier3_analysis_v2.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"\nDuplicates in AlloFlowContent: {len(allo_dups)}")
    print(f"Total duplicates: {len(all_dups)}")
    print("See tier3_analysis_v2.txt")

if __name__ == '__main__':
    main()
