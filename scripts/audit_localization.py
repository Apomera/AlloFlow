"""
Localization Audit Script for AlloFlowANTI.txt
===============================================
Finds:
  1. t() keys used in code that are MISSING from ui_strings.js
  2. ui_strings.js keys that are UNUSED in code (stale/dead keys)
  3. Hardcoded English strings in JSX that bypass t() (common patterns)

Output: audit_localization_result.txt
"""
import re
import json
import os

SRC = 'AlloFlowANTI.txt'
UI_STRINGS_FILE = 'ui_strings.js'
OUT = 'audit_localization_result.txt'

# ─── Step 1: Extract all t() keys used in code ───
def extract_t_keys(content):
    """Find all t('key') and t('key', ...) calls."""
    # Match t('key') and t("key") — the first argument
    pattern = r"""\bt\(\s*['"]([^'"]+)['"]\s*[,)]"""
    keys = set()
    for m in re.finditer(pattern, content):
        keys.add(m.group(1))
    return keys

# ─── Step 2: Extract all keys from ui_strings.js ───
def flatten_keys(obj, prefix=''):
    """Recursively flatten a nested dict into dot-separated keys."""
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(flatten_keys(v, full_key))
            else:
                keys.add(full_key)
    return keys

def parse_ui_strings(filepath):
    """Parse ui_strings.js (a JS object literal) into a Python dict."""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # The file is a JS object literal — we need to convert to valid JSON
    # Strategy: use a simple approach - replace JS-style keys with quoted keys
    # Actually, let's try evaluating it as-is since it's close to JSON
    
    # Remove trailing commas before } or ]
    cleaned = re.sub(r',\s*([}\]])', r'\1', text)
    # Quote unquoted keys
    cleaned = re.sub(r'(?m)^\s*([a-zA-Z_]\w*)\s*:', r'"\1":', cleaned)
    # Also handle inline unquoted keys
    cleaned = re.sub(r'([{,])\s*([a-zA-Z_]\w*)\s*:', r'\1 "\2":', cleaned)
    # Handle single quotes -> double quotes for values (careful with apostrophes)
    # Actually this is tricky. Let's try a different approach.
    
    # Simpler: just extract all leaf-level keys by regex from the original
    # looking for patterns like:  key: "value" or key: 'value'
    keys = set()
    
    # Track nesting via a stack of parent keys
    stack = []
    for line in text.split('\n'):
        stripped = line.strip()
        
        # Skip empty lines and comments
        if not stripped or stripped.startswith('//'):
            continue
            
        # Check for opening a new nested object: key: {
        obj_open = re.match(r'^(\w+)\s*:\s*\{', stripped)
        if obj_open:
            stack.append(obj_open.group(1))
            continue
        
        # Check for key with quoted key name: "key": { or 'key': {
        obj_open_quoted = re.match(r'^["\'](\w+)["\']\s*:\s*\{', stripped)
        if obj_open_quoted:
            stack.append(obj_open_quoted.group(1))
            continue
            
        # Check for closing brace
        if stripped.startswith('}'):
            if stack:
                stack.pop()
            continue
        
        # Check for leaf key-value pair
        leaf = re.match(r'^["\']?(\w+)["\']?\s*:\s*["\']', stripped)
        if leaf:
            key_name = leaf.group(1)
            if stack:
                full_key = '.'.join(stack) + '.' + key_name
            else:
                full_key = key_name
            keys.add(full_key)
            continue
            
        # Check for leaf with template literal
        leaf_tpl = re.match(r'^["\']?(\w+)["\']?\s*:\s*`', stripped)
        if leaf_tpl:
            key_name = leaf_tpl.group(1)
            if stack:
                full_key = '.'.join(stack) + '.' + key_name
            else:
                full_key = key_name
            keys.add(full_key)
    
    return keys

# ─── Step 3: Find hardcoded English strings in JSX ───
def find_hardcoded_jsx_strings(content):
    """Find JSX text content that looks like hardcoded English strings."""
    results = []
    lines = content.split('\n')
    
    # Patterns that suggest hardcoded English in JSX
    # Look for: >Some English Text< or >Some English Text</
    jsx_text_pattern = re.compile(r'>\s*([A-Z][a-zA-Z\s]{4,50})\s*</')
    
    # Skip regions that are NOT JSX (data banks, constants, etc.)
    # Based on architecture: JSX starts around L15204
    
    for i, line in enumerate(lines, 1):
        # Skip very early lines (config/data regions)
        if i < 2500:
            continue
            
        # Skip lines that are clearly not JSX rendering
        if any(skip in line for skip in [
            'const ', 'let ', 'var ', 'function ', 'import ',
            '//', 'console.', 'warnLog', 'debugLog',
            'prompt', 'callGemini', 'JSON.', 'localStorage',
            'catch', 'throw', 'assert', 'return null',
            'className=', 'style={{',  # attributes, not content
        ]):
            # But if the line ALSO has >Text<, still check it
            pass
        
        matches = jsx_text_pattern.findall(line)
        for m in matches:
            text = m.strip()
            # Filter out false positives
            if len(text) < 5:
                continue
            if text.startswith('{') or text.startswith('$'):
                continue
            if any(fp in text for fp in [
                'className', 'style', 'onClick', 'onChange',
                'data-', 'aria-', 'key=', 'type=', 'value=',
            ]):
                continue
            # Check it's NOT already wrapped in t()
            if f"t('" in line or 't("' in line or "t(`" in line:
                # Line uses t() somewhere - could still have hardcoded parts
                # Only flag if this specific text isn't from t()
                pass
            
            results.append((i, text.strip()))
    
    return results

# ─── Step 4: Find aria-label and title attributes with hardcoded strings ───
def find_hardcoded_attributes(content):
    """Find aria-label and title attributes with hardcoded English strings."""
    results = []
    lines = content.split('\n')
    
    # Patterns: aria-label="Some text" or title="Some text"
    attr_pattern = re.compile(r'(?:aria-label|title)=["\']([^"\']{5,})["\']')
    
    for i, line in enumerate(lines, 1):
        if i < 2500:
            continue
        
        for m in attr_pattern.finditer(line):
            val = m.group(1)
            # Skip if it uses t() or template literals
            if '{' in val or '$' in val:
                continue
            # Skip purely technical values
            if val in ('Confirm', 'Close', 'Submit', 'Cancel', 'Back', 'Next',
                      'Previous', 'Play', 'Pause', 'Stop', 'Delete', 'Edit',
                      'Save', 'Copy', 'Refresh', 'Reset', 'Toggle', 'Search',
                      'Filter', 'Sort', 'Add', 'Remove', 'Show', 'Hide',
                      'Expand', 'Collapse', 'Maximize', 'Minimize', 'Selection',
                      'Min', 'Max', 'Generate', 'e.g. Space, Ocean...'):
                continue
            results.append((i, m.group(0)))
    
    return results

# ─── Main ───
def main():
    print(f"Reading {SRC}...")
    with open(SRC, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Reading {UI_STRINGS_FILE}...")
    
    # Step 1: t() keys in code
    code_keys = extract_t_keys(content)
    print(f"  Found {len(code_keys)} unique t() keys in code")
    
    # Step 2: keys in ui_strings.js
    ui_keys = parse_ui_strings(UI_STRINGS_FILE)
    print(f"  Found {len(ui_keys)} keys in ui_strings.js")
    
    # Step 3: Compare
    missing_from_ui = sorted(code_keys - ui_keys)
    # Filter out keys that are clearly from other systems (word_sounds, help_mode, etc.)
    # word_sounds keys come from WORD_SOUNDS_STRINGS, help_mode from HELP_STRINGS
    missing_real = [k for k in missing_from_ui 
                    if not k.startswith('help_mode.')
                    and not k.startswith('chat_guide.')]
    
    unused_in_code = sorted(ui_keys - code_keys)
    
    # Step 4: Hardcoded JSX text
    hardcoded_jsx = find_hardcoded_jsx_strings(content)
    
    # Step 5: Hardcoded attributes
    hardcoded_attrs = find_hardcoded_attributes(content)
    
    # ─── Write report ───
    report = []
    report.append("=" * 70)
    report.append("LOCALIZATION AUDIT REPORT")
    report.append(f"Generated: Feb 19, 2026")
    report.append(f"Source: {SRC} | UI Strings: {UI_STRINGS_FILE}")
    report.append("=" * 70)
    
    report.append(f"\n## SUMMARY")
    report.append(f"  t() keys in code:          {len(code_keys)}")
    report.append(f"  Keys in ui_strings.js:     {len(ui_keys)}")
    report.append(f"  MISSING from ui_strings:   {len(missing_real)}")
    report.append(f"  UNUSED (stale) keys:       {len(unused_in_code)}")
    report.append(f"  Hardcoded JSX strings:     {len(hardcoded_jsx)}")
    report.append(f"  Hardcoded attributes:      {len(hardcoded_attrs)}")
    
    report.append(f"\n{'=' * 70}")
    report.append(f"## 1. MISSING KEYS (t() used in code but not in ui_strings.js)")
    report.append(f"{'=' * 70}")
    report.append(f"These keys are referenced via t() but don't exist in ui_strings.js.")
    report.append(f"The t() function will return the raw key or inline fallback.\n")
    
    # Group by namespace
    namespaces = {}
    for k in missing_real:
        ns = k.split('.')[0] if '.' in k else '_root'
        namespaces.setdefault(ns, []).append(k)
    
    for ns in sorted(namespaces.keys()):
        report.append(f"\n  ### {ns} ({len(namespaces[ns])} keys)")
        for k in sorted(namespaces[ns]):
            # Find example usage in code
            pattern = re.compile(re.escape(k))
            for line_num, line in enumerate(content.split('\n'), 1):
                if pattern.search(line):
                    snippet = line.strip()[:100]
                    report.append(f"    - {k}")
                    report.append(f"      L{line_num}: {snippet}")
                    break
            else:
                report.append(f"    - {k}")
    
    report.append(f"\n{'=' * 70}")
    report.append(f"## 2. UNUSED KEYS (in ui_strings.js but never referenced in code)")
    report.append(f"{'=' * 70}")
    report.append(f"These keys exist in ui_strings.js but no t() call references them.")
    report.append(f"They may be dead code or used via dynamic key construction.\n")
    
    for k in unused_in_code[:100]:  # Cap at 100
        report.append(f"    - {k}")
    if len(unused_in_code) > 100:
        report.append(f"    ... and {len(unused_in_code) - 100} more")
    
    report.append(f"\n{'=' * 70}")
    report.append(f"## 3. HARDCODED JSX TEXT (first 80 instances)")
    report.append(f"{'=' * 70}")
    report.append(f"English text rendered directly in JSX without t() wrapping.\n")
    
    for line_num, text in hardcoded_jsx[:80]:
        report.append(f"    L{line_num}: \"{text}\"")
    if len(hardcoded_jsx) > 80:
        report.append(f"    ... and {len(hardcoded_jsx) - 80} more")
    
    report.append(f"\n{'=' * 70}")
    report.append(f"## 4. HARDCODED ATTRIBUTES (first 80 instances)")
    report.append(f"{'=' * 70}")
    report.append(f"aria-label/title attributes with hardcoded English strings.\n")
    
    for line_num, attr in hardcoded_attrs[:80]:
        report.append(f"    L{line_num}: {attr}")
    if len(hardcoded_attrs) > 80:
        report.append(f"    ... and {len(hardcoded_attrs) - 80} more")
    
    report_text = '\n'.join(report)
    
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(report_text)
    
    print(f"\nReport written to {OUT}")
    print(f"  Missing keys:      {len(missing_real)}")
    print(f"  Unused keys:       {len(unused_in_code)}")
    print(f"  Hardcoded JSX:     {len(hardcoded_jsx)}")
    print(f"  Hardcoded attrs:   {len(hardcoded_attrs)}")

if __name__ == '__main__':
    main()
