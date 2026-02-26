"""
SYSTEMATIC UNDEFINED AUDIT
==========================
Traces ALL history item construction sites and identifies fields that could be
`undefined` when passed to Firestore via setDoc/updateDoc.

The Firestore error is: "Unsupported field value: undefined"
This script finds where those undefineds originate.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

print("=" * 80)
print("SYSTEMATIC UNDEFINED AUDIT — AlloFlowANTI.txt")
print("=" * 80)

# ============================================================================
# PHASE 1: Find ALL history item creation sites
# These are setHistory(prev => [...prev, ITEM]) calls
# ============================================================================
print("\n📦 PHASE 1: History Item Creation Sites")
print("-" * 60)

creation_sites = []
for i, l in enumerate(lines):
    s = l.strip()
    if 'setHistory(prev =>' in s and '[...prev,' in s:
        # Extract the variable name being pushed
        match = re.search(r'\[\.\.\.prev,\s*(\w+)', s)
        if match:
            var_name = match.group(1)
            creation_sites.append((i+1, var_name))

print(f"Found {len(creation_sites)} history item creation sites.\n")

# ============================================================================
# PHASE 2: For each creation site, trace back to find the item's shape
# Look for the object literal that defines the item
# ============================================================================
print("\n🔍 PHASE 2: Item Shape Analysis")
print("-" * 60)

findings = []

for line_no, var_name in creation_sites:
    # Search backwards from the setHistory call to find where var_name is defined
    item_shape = {}
    item_def_line = None
    
    # Look up to 50 lines before for the object definition
    for j in range(line_no - 2, max(0, line_no - 60), -1):
        check_line = lines[j].strip()
        
        # Look for: const varName = { or let varName = {
        if re.search(rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*\{{', check_line):
            item_def_line = j + 1
            
            # Collect the object literal
            brace_depth = 0
            obj_lines = []
            for k in range(j, min(j + 30, len(lines))):
                obj_lines.append(lines[k].strip())
                brace_depth += lines[k].count('{') - lines[k].count('}')
                if brace_depth <= 0:
                    break
            
            obj_text = '\n'.join(obj_lines)
            
            # Extract top-level keys
            # Match: key: value patterns (simple extraction)
            key_matches = re.findall(r'^\s*(\w+)\s*:', obj_text, re.MULTILINE)
            for key in key_matches:
                item_shape[key] = True
            break
    
    # Check for key fields that Firestore needs
    has_config = 'config' in item_shape
    has_id = 'id' in item_shape
    has_type = 'type' in item_shape
    has_data = 'data' in item_shape
    has_title = 'title' in item_shape
    has_timestamp = 'timestamp' in item_shape
    
    missing = []
    if not has_config: missing.append('config')
    if not has_id: missing.append('id')
    if not has_type: missing.append('type')
    if not has_timestamp: missing.append('timestamp')
    
    if missing or not item_def_line:
        severity = "⚠️" if missing else "❓"
        if not item_def_line:
            findings.append((line_no, var_name, "UNKNOWN", "Could not trace item definition"))
        else:
            findings.append((line_no, var_name, missing, f"Defined at L{item_def_line}, keys: {list(item_shape.keys())}"))

# ============================================================================
# PHASE 3: Check for conditional/optional field assignments
# These patterns produce undefined values:
#   key: someVar  (where someVar might be undefined)
#   key: obj?.prop (undefined if obj is null)
#   ...spread (spread of undefined/null)
# ============================================================================
print("\n🚨 PHASE 3: Conditional/Optional Field Patterns in Item Definitions")
print("-" * 60)

risky_patterns = []

for i, l in enumerate(lines):
    s = l.strip()
    # Look for history item definitions (common patterns)
    if re.search(r'(?:const|let)\s+(?:newItem|newChallengeItem|fluencyRecordItem|newAdventureItem|tempItem|wordSoundsResource|updatedContent|updatedOriginal)\s*=', s):
        # Scan the next 30 lines for risky patterns
        for j in range(i, min(i + 30, len(lines))):
            check = lines[j].strip()
            
            # Pattern: key: varName?.something (optional chaining = potential undefined)
            opt_match = re.search(r'(\w+)\s*:\s*\w+\?\.\w+', check)
            if opt_match:
                risky_patterns.append((j+1, f"Optional chain → undefined: {check[:100]}"))
            
            # Pattern: key: condition ? value : undefined (explicit undefined)
            if 'undefined' in check and ':' in check and '?' in check:
                risky_patterns.append((j+1, f"Explicit undefined: {check[:100]}"))
            
            # End of object
            if check == '};' or check == '}':
                break

# ============================================================================
# PHASE 4: Check ALL Firestore write paths for stripUndefined coverage
# ============================================================================
print("\n🔥 PHASE 4: Firestore Write Path Coverage")
print("-" * 60)

firestore_writes = []
for i, l in enumerate(lines):
    s = l.strip()
    if ('setDoc(' in s or 'updateDoc(' in s or 'addDoc(' in s) and 'stripUndefined' not in s:
        # Check if it's a real Firestore call (not in a comment)
        if not s.startswith('//') and not s.startswith('*'):
            firestore_writes.append((i+1, s[:120]))

# ============================================================================
# PHASE 5: Check newItem.config field patterns
# The main handleGenerate creates items with config, but many other paths don't
# ============================================================================
print("\n📋 PHASE 5: Config Field Analysis")
print("-" * 60)

config_analysis = []
for line_no, var_name, missing_or_status, detail in findings:
    if isinstance(missing_or_status, list) and 'config' in missing_or_status:
        # Get context around this creation site
        context_start = max(0, line_no - 15)
        context = ''.join(lines[context_start:line_no])
        # Try to identify what type of item this is
        type_match = re.search(r"type:\s*['\"](\w+)['\"]", context) or re.search(r"type:\s*(\w+)", context)
        item_type = type_match.group(1) if type_match else "unknown"
        config_analysis.append((line_no, var_name, item_type, detail))

# ============================================================================
# OUTPUT REPORT
# ============================================================================
print("\n" + "=" * 80)
print("📊 AUDIT RESULTS")
print("=" * 80)

print(f"\n{'='*60}")
print(f"1. HISTORY ITEMS MISSING FIELDS ({len(findings)} issues)")
print(f"{'='*60}")
for line_no, var_name, missing, detail in findings:
    print(f"  L{line_no}: {var_name}")
    if isinstance(missing, list):
        print(f"    Missing: {', '.join(missing)}")
    print(f"    Detail: {detail}")

print(f"\n{'='*60}")
print(f"2. RISKY FIELD PATTERNS ({len(risky_patterns)} patterns)")
print(f"{'='*60}")
for line_no, desc in risky_patterns[:20]:
    print(f"  L{line_no}: {desc}")

print(f"\n{'='*60}")
print(f"3. UNPROTECTED FIRESTORE WRITES ({len(firestore_writes)} writes)")
print(f"{'='*60}")
for line_no, code in firestore_writes:
    print(f"  L{line_no}: {code}")

print(f"\n{'='*60}")
print(f"4. ITEMS MISSING CONFIG ({len(config_analysis)} items)")
print(f"{'='*60}")
for line_no, var_name, item_type, detail in config_analysis:
    print(f"  L{line_no}: {var_name} (type: {item_type})")
    print(f"    {detail}")

# ============================================================================
# SUMMARY + RECOMMENDATIONS
# ============================================================================
print(f"\n{'='*80}")
print("💡 SUMMARY")
print(f"{'='*80}")
print(f"  Total creation sites: {len(creation_sites)}")
print(f"  Items with missing fields: {len(findings)}")
print(f"  Risky field patterns: {len(risky_patterns)}")
print(f"  Unprotected Firestore writes: {len(firestore_writes)}")
print(f"  Items missing config: {len(config_analysis)}")
print(f"\n  The stripUndefined() safety net handles ALL of these at runtime,")
print(f"  but fixing them at the source prevents silent data loss.")
