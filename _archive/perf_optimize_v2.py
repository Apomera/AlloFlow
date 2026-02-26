"""
Phase 1 Performance Optimizer v2 — Clean & Safe
=================================================
1. Scan ALL existing handler/variable names in the file
2. Find repeated inline onClick={() => setXxx(...)} patterns
3. Generate unique useCallback names (verified against existing names)
4. Apply changes only after full validation
5. Write a verification report
"""
import re
from collections import Counter

INPUT = 'AlloFlowANTI.txt'
REPORT = 'optimization_report.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append(f"=== Phase 1 Optimizer v2 ===")
    report.append(f"Input: {len(content):,} bytes, {len(lines):,} lines")

    # ─── Step 1: Collect ALL existing identifier declarations ───
    existing_names = set()
    for line in lines:
        # const/let/var name =
        for m in re.finditer(r'(?:const|let|var)\s+(\w+)', line):
            existing_names.add(m.group(1))
        # function name(
        for m in re.finditer(r'function\s+(\w+)', line):
            existing_names.add(m.group(1))
    
    report.append(f"Existing identifiers: {len(existing_names)}")

    # ─── Step 2: Find inline onClick patterns ───
    # Pattern: onClick={() => someFunction(constantArgs)}
    # We target EXACT string matches for safety

    # 2a: Toggle patterns: onClick={() => setXxx(prev => !prev)}
    toggle_pattern = re.compile(
        r'onClick=\{(?:\(\)\s*=>\s*)(set\w+)\(prev\s*=>\s*!prev\)\}'
    )

    # 2b: Set-to-constant: onClick={() => setXxx(value)}
    # where value is: true, false, null, 0, number, 'string', "string"
    setconst_pattern = re.compile(
        r'onClick=\{(?:\(\)\s*=>\s*)(set\w+)\((true|false|null|0|\d+|\'[^\']*\'|"[^"]*")\)\}'
    )

    # Collect all matches
    toggle_matches = []
    for m in toggle_pattern.finditer(content):
        toggle_matches.append({
            'full': m.group(0),
            'setter': m.group(1),
            'type': 'toggle',
        })

    setconst_matches = []
    for m in setconst_pattern.finditer(content):
        setconst_matches.append({
            'full': m.group(0),
            'setter': m.group(1),
            'value': m.group(2),
            'type': 'setconst',
        })

    # Count occurrences of each unique pattern
    toggle_counts = Counter(m['full'] for m in toggle_matches)
    setconst_counts = Counter(m['full'] for m in setconst_matches)

    report.append(f"\nToggle patterns found: {len(toggle_counts)} unique ({sum(toggle_counts.values())} total)")
    for pattern, count in toggle_counts.most_common(10):
        report.append(f"  [{count}x] {pattern}")

    report.append(f"\nSet-to-constant patterns found: {len(setconst_counts)} unique ({sum(setconst_counts.values())} total)")
    for pattern, count in setconst_counts.most_common(15):
        report.append(f"  [{count}x] {pattern}")

    # ─── Step 3: Generate unique callback names ───
    callbacks = []  # (name, body, deps, original_onclick, count)

    # Process toggles
    seen_setters = set()
    for m in toggle_matches:
        setter = m['setter']
        if setter in seen_setters:
            continue
        seen_setters.add(setter)

        base = setter[3:]  # Remove 'set' prefix
        cb_name = f"handleToggle{base}"

        # Ensure uniqueness
        if cb_name in existing_names:
            cb_name = f"handleToggle{base}Cb"
        if cb_name in existing_names:
            continue  # Skip this one entirely

        count = toggle_counts[m['full']]
        callbacks.append((
            cb_name,
            f"() => {setter}(prev => !prev)",
            "[]",
            m['full'],
            count
        ))
        existing_names.add(cb_name)  # Reserve the name

    # Process set-to-constant
    seen_patterns = set()
    for m in setconst_matches:
        pattern_key = (m['setter'], m['value'])
        if pattern_key in seen_patterns:
            continue
        seen_patterns.add(pattern_key)

        setter = m['setter']
        value = m['value']
        base = setter[3:]  # Remove 'set' prefix

        # Generate descriptive name based on value
        if value == 'true':
            cb_name = f"handleSet{base}ToTrue"
        elif value == 'false':
            cb_name = f"handleSet{base}ToFalse"
        elif value == 'null':
            cb_name = f"handleSet{base}ToNull"
        elif value.startswith("'") or value.startswith('"'):
            val_clean = value.strip("'\"")
            if val_clean.isalnum() and len(val_clean) < 20:
                cb_name = f"handleSet{base}To{val_clean[0].upper()}{val_clean[1:]}"
            else:
                cb_name = f"handleSet{base}Const"
        else:
            cb_name = f"handleSet{base}To{value}"

        # Ensure uniqueness
        if cb_name in existing_names:
            cb_name = f"{cb_name}Cb"
        if cb_name in existing_names:
            continue  # Skip

        count = setconst_counts[m['full']]
        callbacks.append((
            cb_name,
            f"() => {setter}({value})",
            "[]",
            m['full'],
            count
        ))
        existing_names.add(cb_name)

    report.append(f"\n=== Callbacks to create: {len(callbacks)} ===")
    for name, body, deps, original, count in callbacks:
        report.append(f"  {name} = useCallback({body}, {deps})  [{count}x]")

    # ─── Step 4: Validate before applying ───
    # Double-check: no callback name appears as const/let/var/function in original content
    with open(INPUT, 'r', encoding='utf-8') as f:
        original_content = f.read()

    conflicts = []
    for name, _, _, _, _ in callbacks:
        # Check for const/let/var NAME = or function NAME(
        pat = rf'(?:const|let|var)\s+{re.escape(name)}\s*='
        if re.search(pat, original_content):
            conflicts.append(name)
        pat2 = rf'function\s+{re.escape(name)}\s*\('
        if re.search(pat2, original_content):
            conflicts.append(name)

    if conflicts:
        report.append(f"\n!!! CONFLICTS DETECTED - ABORTING !!!")
        for c in conflicts:
            report.append(f"  CONFLICT: {c}")
        with open(REPORT, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print(f"ABORTED: {len(conflicts)} name conflicts found. See {REPORT}")
        return

    report.append(f"\nValidation: 0 name conflicts - SAFE TO APPLY")

    # ─── Step 5: Apply changes ───
    # 5a: Build the useCallback block
    cb_block_lines = ["  // === PHASE 1 TIER 2: Extracted useCallback Handlers ==="]
    for name, body, deps, _, _ in callbacks:
        cb_block_lines.append(f"  const {name} = React.useCallback({body}, {deps});")
    cb_block = '\n'.join(cb_block_lines) + '\n'

    # 5b: Find insertion point
    # Look for stable anchor in AlloFlowContent
    anchor = "// Persist wsPreloadedWords to currently active glossary/word-sounds history item"
    anchor_idx = content.find(anchor)
    if anchor_idx < 0:
        # Fallback: look for first React.useEffect in AlloFlowContent
        allo_match = re.search(r'(?:const|function)\s+AlloFlowContent', content)
        if allo_match:
            anchor_idx = content.find('React.useEffect(', allo_match.start())
        if anchor_idx < 0:
            report.append("ERROR: Cannot find insertion point!")
            with open(REPORT, 'w', encoding='utf-8') as f:
                f.write('\n'.join(report))
            print(f"ABORTED: No insertion point. See {REPORT}")
            return

    insert_pos = content.rfind('\n', 0, anchor_idx) + 1
    content = content[:insert_pos] + cb_block + content[insert_pos:]

    # 5c: Replace inline onClick patterns with callback references
    total_replacements = 0
    for name, body, deps, original_onclick, count in callbacks:
        replacement = f'onClick={{{name}}}'
        actual_count = content.count(original_onclick)
        content = content.replace(original_onclick, replacement)
        total_replacements += actual_count

    report.append(f"\nApplied {total_replacements} onClick replacements")
    report.append(f"Added {len(callbacks)} useCallback declarations")

    # ─── Step 6: Write output ───
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    new_lines = content.split('\n')
    report.append(f"\nOutput: {len(content):,} bytes, {len(new_lines):,} lines")

    # ─── Step 7: Post-write verification ───
    # Re-read and check for duplicates
    with open(INPUT, 'r', encoding='utf-8') as f:
        final = f.read()

    final_lines = final.split('\n')
    handler_locs = {}
    for i, line in enumerate(final_lines):
        m = re.match(r'\s*const\s+(handle\w+)\s*=', line)
        if m:
            name = m.group(1)
            if name not in handler_locs:
                handler_locs[name] = []
            handler_locs[name].append(i + 1)

    dups_in_scope = []
    # Only flag duplicates if BOTH are in the same scope (AlloFlowContent)
    # The Tier 2 block is at a known position, check if any other def
    # is also inside AlloFlowContent
    allo_start = None
    for i, line in enumerate(final_lines):
        if re.search(r'(?:const|function)\s+AlloFlowContent', line):
            allo_start = i
            break

    for name, locs in handler_locs.items():
        if len(locs) > 1:
            # Check if all locations are inside AlloFlowContent scope
            if allo_start is not None and all(loc > allo_start for loc in locs):
                # Could be a real conflict - check if our Tier 2 block is involved
                tier2_line = None
                for loc in locs:
                    if 'PHASE 1 TIER 2' in final_lines[max(0, loc-5):loc]:
                        tier2_line = loc
                        break
                    # Also check the line itself for React.useCallback
                    if 'React.useCallback' in final_lines[loc-1]:
                        tier2_line = loc
                
                if tier2_line:
                    dups_in_scope.append((name, locs))

    if dups_in_scope:
        report.append(f"\nWARNING: {len(dups_in_scope)} potential scope conflicts:")
        for name, locs in dups_in_scope:
            report.append(f"  {name}: lines {locs}")
    else:
        report.append(f"\nPost-write verification: NO scope conflicts detected")

    # Brace check
    open_b = final.count('{')
    close_b = final.count('}')
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")

    # Final counts
    uc_count = len(re.findall(r'React\.useCallback', final))
    report.append(f"Total useCallback: {uc_count}")

    report.append(f"\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"SUCCESS: {len(callbacks)} callbacks added, {total_replacements} replacements")
    print(f"See {REPORT} for details")

if __name__ == '__main__':
    main()
