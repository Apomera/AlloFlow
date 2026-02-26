#!/usr/bin/env python3
"""
AlloFlow Phase 1 Performance Optimizer
=======================================
Performs safe, mechanical transforms on AlloFlowANTI.txt:
- Tier 1: Extract constant inline styles to module-level constants
- Tier 2: Extract simple onClick handlers to useCallback
- Tier 3: Extract dynamic styles to useMemo
- Tier 4: Identify React.memo wrap candidates (report only)

Safety: Only transforms patterns that are 100% mechanical.
"""

import re
import sys
import json
from collections import Counter, defaultdict

INPUT_FILE = "AlloFlowANTI.txt"

def read_file():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

# ============================================================
# TIER 1: Constant Style Extraction
# ============================================================

def find_constant_styles(content):
    """Find inline style={{...}} patterns with only constant values (no variables)."""
    # Match style={{ ... }} where content has no variables (only quoted strings, numbers, px/em/% values)
    pattern = r'style=\{\{([^}]+)\}\}'
    matches = []
    for m in re.finditer(pattern, content):
        style_body = m.group(1).strip()
        # Skip styles that reference variables (no quotes around values, or contain ternary/function calls)
        if '?' in style_body or '(' in style_body or '`' in style_body:
            continue
        # Check all values are constants (quoted strings or numbers)
        # Simple heuristic: every colon-separated value should be a quoted string or number
        props = [p.strip() for p in style_body.split(',') if p.strip()]
        all_constant = True
        for prop in props:
            if ':' not in prop:
                all_constant = False
                break
            val = prop.split(':', 1)[1].strip().rstrip(',')
            # Allow: 'string', "string", number, number with unit
            if not (val.startswith("'") or val.startswith('"') or 
                    re.match(r'^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms)?$', val) or
                    val in ('true', 'false', '0', 'none')):
                all_constant = False
                break
        if all_constant and len(props) >= 2:
            matches.append((m.start(), m.end(), m.group(0), style_body))
    return matches

def generate_style_constant_name(style_body):
    """Generate a descriptive constant name from style properties."""
    props = {}
    for p in style_body.split(','):
        p = p.strip()
        if ':' in p:
            k, v = p.split(':', 1)
            k = k.strip().strip("'\"")
            v = v.strip().strip("'\"").rstrip(',')
            props[k] = v
    
    parts = []
    if 'display' in props:
        parts.append(props['display'].upper())
    if 'flexDirection' in props:
        if 'column' in props['flexDirection']:
            parts.append('COLUMN')
        else:
            parts.append('ROW')
    if 'justifyContent' in props:
        jc = props['justifyContent']
        if 'center' in jc: parts.append('CENTER')
        elif 'between' in jc: parts.append('BETWEEN')
        elif 'around' in jc: parts.append('AROUND')
    if 'alignItems' in props:
        ai = props['alignItems']
        if 'center' in ai: parts.append('ALIGN_CENTER')
        elif 'stretch' in ai: parts.append('STRETCH')
    if 'textAlign' in props:
        parts.append('TEXT_' + props['textAlign'].upper())
    if 'position' in props:
        parts.append(props['position'].upper())
    if 'overflow' in props:
        parts.append('OVERFLOW_' + props['overflow'].upper())
    
    if not parts:
        # Fallback: use first two property names
        keys = list(props.keys())[:2]
        parts = [k.upper() for k in keys]
    
    return 'STYLE_' + '_'.join(parts)

def apply_tier1(content):
    """Extract constant inline styles to module-level constants."""
    matches = find_constant_styles(content)
    
    # Group identical style bodies
    style_groups = defaultdict(list)
    for start, end, full_match, body in matches:
        # Normalize whitespace in body for grouping
        normalized = re.sub(r'\s+', ' ', body).strip()
        style_groups[normalized].append((start, end, full_match))
    
    # Only extract styles that appear 2+ times
    extractions = {}
    name_counter = Counter()
    for normalized_body, occurrences in sorted(style_groups.items(), key=lambda x: -len(x[1])):
        if len(occurrences) < 2:
            continue
        name = generate_style_constant_name(normalized_body)
        name_counter[name] += 1
        if name_counter[name] > 1:
            name = f"{name}_{name_counter[name]}"
        
        # Build the constant value
        props = []
        for p in normalized_body.split(','):
            p = p.strip()
            if p:
                props.append(p)
        const_value = '{ ' + ', '.join(props) + ' }'
        extractions[normalized_body] = (name, const_value, len(occurrences))
    
    if not extractions:
        print("  Tier 1: No repeated constant styles found to extract.")
        return content, 0
    
    # Generate constant declarations
    const_block_lines = ["\n// === PHASE 1 TIER 1: Extracted Constant Styles ==="]
    for normalized_body, (name, const_value, count) in sorted(extractions.items(), key=lambda x: -x[1][2]):
        const_block_lines.append(f"const {name} = {const_value};")
    const_block = '\n'.join(const_block_lines) + '\n'
    
    # Now replace occurrences in content (work backwards to preserve positions)
    replacements = []
    for normalized_body, (name, const_value, count) in extractions.items():
        occurrences = style_groups[normalized_body]
        for start, end, full_match in occurrences:
            replacements.append((start, end, f'style={{{name}}}'))
    
    # Sort replacements by position (descending) to apply from end to start
    replacements.sort(key=lambda x: -x[0])
    
    for start, end, replacement in replacements:
        content = content[:start] + replacement + content[end:]
    
    # Insert constant block after the first major comment/import section
    # Find a good insertion point - after the LETTER_NAME_AUDIO block but before components
    # Look for a stable insertion point
    insert_marker = "// LAZY LOAD REFACTOR FOR INSTRUCTION_AUDIO"
    insert_idx = content.find(insert_marker)
    if insert_idx > 0:
        # Insert before this marker
        content = content[:insert_idx] + const_block + '\n' + content[insert_idx:]
    else:
        # Fallback: insert near the top after initial setup
        # Find end of first large comment block
        content = const_block + content
    
    total_replacements = sum(info[2] for info in extractions.values())
    print(f"  Tier 1: Extracted {len(extractions)} constant style patterns ({total_replacements} total replacements)")
    return content, total_replacements


# ============================================================
# TIER 2: Simple Handler Extraction to useCallback
# ============================================================

def find_simple_onclick_handlers(content):
    """Find onClick={() => setSomething(value)} patterns."""
    # Pattern: onClick={() => functionName(args)}
    # We look for simple single-expression handlers
    pattern = r'onClick=\{(?:\(\)\s*=>|e\s*=>)\s*(\w+)\(([^)]*)\)\s*\}'
    matches = []
    for m in re.finditer(pattern, content):
        func_name = m.group(1)
        args = m.group(2).strip()
        # Skip complex args (containing function calls, ternaries, template literals)
        if '(' in args or '?' in args or '`' in args or '=>' in args:
            continue
        matches.append({
            'start': m.start(),
            'end': m.end(),
            'full': m.group(0),
            'func': func_name,
            'args': args,
        })
    return matches

def find_toggle_handlers(content):
    """Find onClick={() => setX(!x)} or onClick={() => setX(prev => !prev)} patterns."""
    patterns = [
        # onClick={() => setX(!x)}
        r'onClick=\{\(\)\s*=>\s*(set\w+)\(!(\w+)\)\s*\}',
        # onClick={() => setX(p => !p)} or similar
        r'onClick=\{\(\)\s*=>\s*(set\w+)\(\w+\s*=>\s*!\w+\)\s*\}',
    ]
    matches = []
    for pat in patterns:
        for m in re.finditer(pat, content):
            matches.append({
                'start': m.start(),
                'end': m.end(),
                'full': m.group(0),
                'setter': m.group(1),
                'type': 'toggle',
            })
    return matches

def apply_tier2(content):
    """Extract simple onClick handlers to useCallback."""
    # Strategy: Find the AlloFlowContent component and add useCallback hooks
    # For now, let's find and categorize the most common patterns
    
    simple_handlers = find_simple_onclick_handlers(content)
    toggle_handlers = find_toggle_handlers(content)
    
    # Group by (function, args) to find the most repeated patterns
    handler_groups = defaultdict(list)
    for h in simple_handlers:
        key = (h['func'], h['args'])
        handler_groups[key].append(h)
    
    toggle_groups = defaultdict(list)
    for h in toggle_handlers:
        key = h['setter']
        toggle_groups[key].append(h)
    
    # Only extract patterns that appear 2+ times OR are very simple set-to-constant
    callbacks_to_add = []
    replacements = []
    callback_names_used = set()
    
    # Process toggles first (most impactful)
    for setter, occurrences in sorted(toggle_groups.items(), key=lambda x: -len(x[1])):
        if len(occurrences) < 2:
            continue
        # Generate callback name: setShowX -> handleToggleShowX
        base = setter[3:]  # Remove 'set' prefix
        callback_name = f"handleToggle{base}"
        if callback_name in callback_names_used:
            callback_name = f"{callback_name}Cb"
        callback_names_used.add(callback_name)
        
        # The useCallback body
        state_var = base[0].lower() + base[1:]
        cb_code = f"const {callback_name} = React.useCallback(() => {setter}(prev => !prev), []);"
        callbacks_to_add.append(cb_code)
        
        for occ in occurrences:
            replacements.append((occ['start'], occ['end'], f'onClick={{{callback_name}}}'))
    
    # Process simple handlers with constant args
    for (func, args), occurrences in sorted(handler_groups.items(), key=lambda x: -len(x[1])):
        if len(occurrences) < 2:
            continue
        # Skip if it's a setter toggle (already handled)
        if func.startswith('set') and args.startswith('!'):
            continue
            
        # Generate callback name
        if func.startswith('set'):
            base = func[3:]  # setActiveView -> ActiveView
            # Clean up args for naming
            arg_clean = args.strip("'\"").replace(' ', '')
            if arg_clean and len(arg_clean) < 20 and arg_clean.isalnum():
                callback_name = f"handleSet{base}To{arg_clean[0].upper()}{arg_clean[1:]}"
            else:
                callback_name = f"handleSet{base}"
        else:
            callback_name = f"handle{func[0].upper()}{func[1:]}"
        
        if callback_name in callback_names_used:
            callback_name = f"{callback_name}Cb"
        callback_names_used.add(callback_name)
        
        # Determine if args are constant
        args_are_constant = (
            not args or
            args.startswith("'") or args.startswith('"') or
            args.isdigit() or
            args in ('true', 'false', 'null', 'undefined', '0')
        )
        
        if args_are_constant:
            dep_array = "[]"
        else:
            dep_array = f"[{args}]"
        
        arg_str = f"({args})" if args else "()"
        cb_code = f"const {callback_name} = React.useCallback(() => {func}{arg_str}, {dep_array});"
        callbacks_to_add.append(cb_code)
        
        for occ in occurrences:
            replacements.append((occ['start'], occ['end'], f'onClick={{{callback_name}}}'))
    
    if not replacements:
        print("  Tier 2: No repeated simple handlers found to extract.")
        return content, 0
    
    # Sort replacements by position (descending) to apply from end to start
    replacements.sort(key=lambda x: -x[0])
    
    for start, end, replacement in replacements:
        content = content[:start] + replacement + content[end:]
    
    # Insert useCallback declarations
    # Find the start of AlloFlowContent's body (after the first useState calls)
    # We'll look for a marker where we can safely insert
    cb_block = "\n  // === PHASE 1 TIER 2: Extracted useCallback Handlers ===\n"
    cb_block += "\n".join(f"  {cb}" for cb in callbacks_to_add)
    cb_block += "\n"
    
    # Find a good insertion point inside AlloFlowContent
    # Look for the pattern after the initial useState declarations
    # Find "const AlloFlowContent" then look for a good spot after initial state
    allo_content_match = re.search(r'(?:const|function)\s+AlloFlowContent\s*[=(]', content)
    if allo_content_match:
        # Find the first useEffect after this point (useCallbacks should go before useEffects)
        first_effect = content.find('React.useEffect(', allo_content_match.start())
        if first_effect > 0:
            # Insert before the first useEffect
            # Find the start of the line
            line_start = content.rfind('\n', 0, first_effect)
            if line_start > 0:
                content = content[:line_start] + cb_block + content[line_start:]
    
    print(f"  Tier 2: Extracted {len(callbacks_to_add)} useCallback handlers ({len(replacements)} total replacements)")
    return content, len(replacements)


# ============================================================
# TIER 3: Dynamic Style useMemo
# ============================================================

def apply_tier3(content):
    """Extract dynamic inline styles that depend on state to useMemo."""
    # Find style={{ prop: condition ? val1 : val2, ... }} patterns
    # These are trickier - we'll target the most common ternary-in-style patterns
    
    # Pattern: style={{ ... someVar ? ... : ... }}
    pattern = r'style=\{\{([^}]*\?[^}]*)\}\}'
    matches = list(re.finditer(pattern, content))
    
    # Group identical dynamic styles
    style_groups = defaultdict(list)
    for m in matches:
        body = re.sub(r'\s+', ' ', m.group(1)).strip()
        style_groups[body].append((m.start(), m.end(), m.group(0)))
    
    # Only extract styles appearing 2+ times
    memo_count = 0
    replacements = []
    memo_declarations = []
    memo_names_used = set()
    
    for body, occurrences in sorted(style_groups.items(), key=lambda x: -len(x[1])):
        if len(occurrences) < 3:  # Higher threshold for dynamic styles (riskier)
            continue
        
        # Extract variable dependencies from the body
        # Look for identifiers that aren't JS keywords or property names
        vars_in_body = set()
        # Find all word tokens that look like variables (not after . or :)
        for token in re.finditer(r'(?<![.\w:\'"])(\b[a-z]\w*)\b(?!\s*:)', body):
            word = token.group(1)
            if word not in ('true', 'false', 'null', 'undefined', 'px', 'em', 'rem', 'none', 
                          'auto', 'flex', 'block', 'inline', 'absolute', 'relative', 'fixed',
                          'center', 'left', 'right', 'top', 'bottom', 'column', 'row',
                          'hidden', 'visible', 'scroll', 'wrap', 'nowrap', 'bold', 'normal',
                          'pointer', 'default', 'solid', 'dashed', 'transparent', 'inherit',
                          'ease', 'linear'):
                vars_in_body.add(word)
        
        if not vars_in_body or len(vars_in_body) > 4:
            continue  # Skip if no deps found or too many (too complex)
        
        memo_name = f"dynamicStyle{memo_count}"
        memo_names_used.add(memo_name)
        
        deps = ', '.join(sorted(vars_in_body))
        memo_decl = f"  const {memo_name} = React.useMemo(() => ({{ {body} }}), [{deps}]);"
        memo_declarations.append(memo_decl)
        
        for start, end, full in occurrences:
            replacements.append((start, end, f'style={{{memo_name}}}'))
        
        memo_count += 1
        if memo_count >= 15:  # Cap at 15 to be safe
            break
    
    if not replacements:
        print("  Tier 3: No repeated dynamic styles found (threshold: 3+ occurrences).")
        return content, 0
    
    # Apply replacements (descending order)
    replacements.sort(key=lambda x: -x[0])
    for start, end, replacement in replacements:
        content = content[:start] + replacement + content[end:]
    
    # Insert useMemo declarations near the useCallback block we added in Tier 2
    memo_block = "\n  // === PHASE 1 TIER 3: Extracted useMemo Dynamic Styles ===\n"
    memo_block += "\n".join(memo_declarations)
    memo_block += "\n"
    
    tier2_marker = "// === PHASE 1 TIER 2: Extracted useCallback Handlers ==="
    marker_idx = content.find(tier2_marker)
    if marker_idx > 0:
        # Insert after the tier 2 block (find the next blank line after tier 2 block)
        # Find the end of tier 2 declarations
        next_section = content.find('\n\n', marker_idx + len(tier2_marker))
        if next_section > 0:
            content = content[:next_section] + memo_block + content[next_section:]
        else:
            content = content[:marker_idx] + memo_block + content[marker_idx:]
    
    print(f"  Tier 3: Extracted {memo_count} dynamic style patterns ({len(replacements)} total replacements)")
    return content, len(replacements)


# ============================================================
# TIER 4: React.memo Candidates (Analysis + Safe Wraps)
# ============================================================

def apply_tier4(content):
    """Identify and wrap React.memo candidates."""
    # Find components defined with const X = ({...}) => { that are NOT already wrapped
    # Pattern: const ComponentName = React.memo( ... or just const ComponentName = ({
    
    # Find all component definitions
    component_pattern = r'const\s+([A-Z]\w+)\s*=\s*(?:React\.memo\()?\s*\(\s*\{[^}]*\}\s*\)\s*=>'
    
    already_memo = set()
    not_memo = set()
    component_lines = {}
    
    for m in re.finditer(component_pattern, content):
        name = m.group(1)
        if 'React.memo(' in m.group(0):
            already_memo.add(name)
        else:
            not_memo.add(name)
        # Find line number
        line_num = content[:m.start()].count('\n') + 1
        component_lines[name] = line_num
    
    # Also check for function ComponentName( pattern
    func_pattern = r'function\s+([A-Z]\w+)\s*\('
    for m in re.finditer(func_pattern, content):
        name = m.group(1)
        if name not in already_memo:
            not_memo.add(name)
            line_num = content[:m.start()].count('\n') + 1
            component_lines[name] = line_num
    
    print(f"\n  Tier 4 Analysis:")
    print(f"    Already wrapped in React.memo: {len(already_memo)}")
    print(f"      {', '.join(sorted(already_memo))}")
    print(f"    Candidates for React.memo ({len(not_memo)}):")
    
    # Count how many times each component is used in JSX
    usage_counts = {}
    for name in not_memo:
        count = len(re.findall(f'<{name}[\\s/>]', content))
        usage_counts[name] = count
    
    # Sort by usage count
    for name in sorted(not_memo, key=lambda n: -usage_counts.get(n, 0)):
        line = component_lines.get(name, '?')
        uses = usage_counts.get(name, 0)
        if uses > 0:
            print(f"      {name} (L{line}, used {uses}x in JSX)")
    
    # We won't auto-wrap because it requires careful analysis of which props change
    # Just report the candidates
    print(f"\n    Note: Auto-wrapping skipped. React.memo wrapping requires manual analysis")
    print(f"    of which props change frequently. The above list shows candidates sorted")
    print(f"    by JSX usage count.")
    
    return content, 0


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("AlloFlow Phase 1 Performance Optimizer")
    print("=" * 60)
    
    content = read_file()
    original_size = len(content)
    print(f"\nInput: {INPUT_FILE} ({original_size:,} bytes, {content.count(chr(10)):,} lines)")
    
    total_changes = 0
    
    # Tier 1
    print("\n--- Tier 1: Constant Style Extraction ---")
    content, changes = apply_tier1(content)
    total_changes += changes
    
    # Tier 2
    print("\n--- Tier 2: Simple Handler Extraction ---")
    content, changes = apply_tier2(content)
    total_changes += changes
    
    # Tier 3
    print("\n--- Tier 3: Dynamic Style useMemo ---")
    content, changes = apply_tier3(content)
    total_changes += changes
    
    # Tier 4
    print("\n--- Tier 4: React.memo Analysis ---")
    content, changes = apply_tier4(content)
    total_changes += changes
    
    # Write output
    new_size = len(content)
    print(f"\n{'=' * 60}")
    print(f"Summary:")
    print(f"  Total replacements: {total_changes}")
    print(f"  File size: {original_size:,} -> {new_size:,} bytes ({new_size - original_size:+,})")
    print(f"  Writing to: {INPUT_FILE}")
    
    write_file(content)
    print("  Done!")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
