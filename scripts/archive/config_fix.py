"""
COMPREHENSIVE FIX:
1. Add stripUndefined() function definition (it was referenced but never defined!)
2. Add config: {} to all 16 history item creation sites missing it
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================================================================
# FIX 1: Add stripUndefined function definition before sanitizeHistoryForCloud
# ============================================================================
# Find the sanitizeHistoryForCloud definition line
target_line = None
for i, l in enumerate(lines):
    if 'const sanitizeHistoryForCloud' in l:
        target_line = i
        break

if target_line is None:
    print("ERROR: Could not find sanitizeHistoryForCloud")
    sys.exit(1)

# Check it doesn't already exist
existing = any('const stripUndefined' in l or 'function stripUndefined' in l for l in lines)
if existing:
    print("[SKIP] stripUndefined already defined")
else:
    func_def = '''  // Recursively strip undefined values from objects/arrays for Firestore compatibility
  const stripUndefined = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(stripUndefined);
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, stripUndefined(v)])
      );
    }
    return obj;
  };

'''
    lines.insert(target_line, func_def)
    changes += 1
    print(f"[OK] Inserted stripUndefined() at L{target_line + 1} (before sanitizeHistoryForCloud)")

# Re-read after insertion (simpler than tracking offsets)
content = ''.join(lines)

# ============================================================================
# FIX 2: Add config: {} to all history item creation sites that lack it
# ============================================================================
# The 16 creation sites from the audit, with their defining variable patterns.
# We'll find each item definition and add config: {} before the closing "};".

# Strategy: For each creation site, find the const/let varName = { line,
# then find the closing }; and insert config: {} before it.
# We need to be careful to only add it where config is not already present.

lines = content.split('\n')
creation_vars = [
    'newChallengeItem',
    'fluencyRecordItem', 
    'newAdventureItem',
]
# Most items are called 'newItem' or 'tempItem' - we need line-specific targeting
# Let's find ALL item defs that:
# 1. Have setHistory(prev => [...prev, VAR]) after them
# 2. Don't already have 'config' in their body

items_fixed = 0
i = 0
while i < len(lines):
    l = lines[i]
    # Look for setHistory(prev => [...prev, SOMETHING])
    hist_match = re.search(r'setHistory\(prev\s*=>\s*\[\.\.\.\s*prev,\s*(\w+)', l)
    if hist_match:
        var_name = hist_match.group(1)
        # Search backwards for const/let varName = {
        for j in range(i - 1, max(0, i - 60), -1):
            def_match = re.search(rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*\{{', lines[j])
            if def_match:
                # Collect the full object to check if config already exists
                brace_depth = 0
                obj_start = j
                obj_end = j
                for k in range(j, min(j + 40, len(lines))):
                    brace_depth += lines[k].count('{') - lines[k].count('}')
                    if brace_depth <= 0:
                        obj_end = k
                        break
                
                obj_text = '\n'.join(lines[obj_start:obj_end + 1])
                
                # Check if config is already present  
                if 'config:' in obj_text or 'config :' in obj_text:
                    # Already has config, skip
                    break
                
                # Find the closing line of the object (the }; line)
                closing_line = lines[obj_end].rstrip()
                if closing_line.strip() in ['};', '}']:
                    # Get the indentation of the properties inside the object
                    # Use the line before the closing as reference
                    ref_line = lines[obj_end - 1]
                    indent_match = re.match(r'^(\s+)', ref_line)
                    indent = indent_match.group(1) if indent_match else '            '
                    
                    # Insert config: {} before the closing line
                    # Check if the previous line ends with a comma
                    prev_content = lines[obj_end - 1].rstrip()
                    if not prev_content.endswith(','):
                        lines[obj_end - 1] = prev_content + ',\n'
                    
                    config_line = f'{indent}config: {{}}\n'
                    lines.insert(obj_end, config_line)
                    items_fixed += 1
                    changes += 1
                    print(f"[OK] Added config: {{}} to {var_name} (def at L{obj_start + 1}, setHistory at L{i + 1})")
                    # Adjust index since we inserted a line
                    i += 1
                break
    i += 1

print(f"\n[SUMMARY] {items_fixed} items got config: {{}}")

# Write
content = '\n'.join(lines)
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nTotal {changes} changes applied.")
