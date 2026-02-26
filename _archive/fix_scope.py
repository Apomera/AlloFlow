"""
Fix scope v2: Use component definition lines to determine boundaries.

Strategy: Find all top-level component definitions (const Xxx = ...).
AlloFlowContent is one of them. Any onClick={handleXxx} that appears
BEFORE AlloFlowContent starts or AFTER the next component starts
is out of scope and must be reverted.
"""
import re

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    print(f"Input: {len(content):,} bytes, {len(lines):,} lines")

    # Step 1: Find all top-level component definitions
    # These are const XxxYyy = React.memo(({ or const XxxYyy = ({ or function XxxYyy(
    components = []
    for i, line in enumerate(lines):
        # Match: const ComponentName = React.memo(
        m = re.match(r'^const\s+([A-Z]\w+)\s*=\s*(?:React\.memo\()?\s*\(', line)
        if m:
            components.append((i, m.group(1)))
            continue
        # Match: function ComponentName(
        m = re.match(r'^function\s+([A-Z]\w+)\s*\(', line)
        if m:
            components.append((i, m.group(1)))
            continue
        # Also match indented ones that start a new scope
        m = re.match(r'^  const\s+([A-Z]\w+)\s*=\s*(?:React\.memo\()?\s*\(\s*\{', line)
        if m and not line.strip().startswith('//'):
            # This could be an inner component - check context
            # Only include if it looks like a component definition
            name = m.group(1)
            if name[0].isupper() and 'useState' not in line and 'useEffect' not in line:
                components.append((i, name))

    print(f"\nFound {len(components)} component definitions:")
    for line_num, name in components:
        print(f"  L{line_num+1}: {name}")

    # Find AlloFlowContent
    allo_idx = None
    for idx, (line_num, name) in enumerate(components):
        if name == 'AlloFlowContent':
            allo_idx = idx
            break

    if allo_idx is None:
        print("ERROR: AlloFlowContent not found in component list!")
        return

    allo_start = components[allo_idx][0]
    # AlloFlowContent typically goes until the end of the file or the next
    # top-level component. But in a monolith, components are often nested.
    # A safer approach: AlloFlowContent is the MAIN component, likely the
    # last (or near-last) top-level one. Let's check.
    print(f"\nAlloFlowContent starts at L{allo_start+1} (index {allo_idx} of {len(components)})")

    # Step 2: Collect our Tier 2/2b handler declarations
    # Find the PHASE 1 TIER markers and extract all const handleXxx lines near them
    tier_handlers = {}  # name -> original_body

    in_tier_block = False
    for i, line in enumerate(lines):
        if 'PHASE 1 TIER 2' in line:
            in_tier_block = True
            continue
        if in_tier_block:
            # Check for useCallback declaration
            m = re.match(
                r'\s*const\s+(handle\w+)\s*=\s*React\.useCallback\((.+),\s*\[\]\);$',
                line
            )
            if m:
                name = m.group(1)
                body = m.group(2)
                tier_handlers[name] = body
            elif line.strip() and not line.strip().startswith('//') and 'React.useCallback' not in line:
                in_tier_block = False

    print(f"\nTier 2/2b handlers found: {len(tier_handlers)}")

    # Step 3: For each handler, check if its onClick references are inside or outside AlloFlowContent
    # We know AlloFlowContent starts at allo_start. References BEFORE allo_start are definitely out.
    # References inside other components (defined BEFORE AlloFlowContent) are out.
    # References inside inner components of AlloFlowContent are OK (they share the closure scope).

    out_of_scope_refs = []  # (position, length, handler_name, body)

    for handler_name, body in tier_handlers.items():
        pattern = f'onClick={{{handler_name}}}'
        start = 0
        while True:
            idx = content.find(pattern, start)
            if idx < 0:
                break
            line_num = content[:idx].count('\n')

            if line_num < allo_start:
                # Before AlloFlowContent - definitely out of scope
                # Find which component it's in
                comp = "unknown"
                for cl, cn in reversed(components):
                    if cl <= line_num:
                        comp = cn
                        break
                out_of_scope_refs.append((idx, len(pattern), handler_name, body, line_num, comp))

            start = idx + 1

    print(f"\nOut-of-scope references: {len(out_of_scope_refs)}")
    for _, _, name, body, line_num, comp in out_of_scope_refs:
        print(f"  L{line_num+1} in {comp}: {name} -> {body}")

    if not out_of_scope_refs:
        print("No out-of-scope references! Everything should be fine.")
        return

    # Step 4: Revert out-of-scope references
    out_of_scope_refs.sort(key=lambda x: -x[0])  # Reverse order to preserve positions
    for pos, length, handler_name, body, line_num, comp in out_of_scope_refs:
        original = f'onClick={{{body}}}'
        content = content[:pos] + original + content[pos + length:]

    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nReverted {len(out_of_scope_refs)} out-of-scope references")

    # Verify
    with open(INPUT, 'r', encoding='utf-8') as f:
        final = f.read()

    final_lines = final.split('\n')
    print(f"Output: {len(final):,} bytes, {len(final_lines):,} lines")

    open_b = final.count('{')
    close_b = final.count('}')
    print(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")

    uc_count = len(re.findall(r'React\.useCallback', final))
    print(f"Total useCallback: {uc_count}")

if __name__ == '__main__':
    main()
