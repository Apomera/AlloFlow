"""
Guard unhandled await calls with try/catch.

Strategy:
- For standalone callGemini calls: wrap in try/catch with warnLog + addToast
- For sequential audio chains: they are typically inside async functions that ARE
  inside try blocks at the top level, but the individual awaits within sub-chains
  may not be. We handle these by wrapping audio chain functions.
- Skip low-risk (setTimeout) delays

This script traces each unguarded await, finds the nearest enclosing async function,
and adds a try/catch wrapper if the function doesn't already have one.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ===================================================================
# PATTERN 1: Standalone callGemini calls NOT in try/catch
# These are the most dangerous — API failures silently freeze the UI
# Strategy: Wrap each `const result = await callGemini(...)` line in 
# try/catch IF the function it's inside doesn't already have a try/catch
# ===================================================================

# Instead of trying to parse JS AST, we'll do targeted replacements
# for the specific patterns we found in the report.

# For callGemini calls, we use a single-line catch pattern:
# Before: const result = await callGemini(prompt);
# After: let result; try { result = await callGemini(prompt); } catch(e) { warnLog("Unhandled error:", e); addToast("AI request failed. Please try again.", "error"); return; }

# But this is too invasive for 27+ calls. Better approach:
# Make callGemini itself handle errors gracefully by wrapping at the source.

# Let's check if callGemini already has error handling...
lines = content.split('\n')

# Find callGemini definition
gemini_def_line = None
for i, line in enumerate(lines):
    if 'const callGemini' in line and ('async' in line or 'useCallback' in line):
        gemini_def_line = i
        break
    if 'function callGemini' in line:
        gemini_def_line = i
        break

if gemini_def_line is not None:
    # Check if it has internal try/catch
    has_try = False
    for j in range(gemini_def_line, min(gemini_def_line + 100, len(lines))):
        if 'try {' in lines[j] or 'try{' in lines[j]:
            has_try = True
            break
        # Stop if we hit the next top-level function
        if j > gemini_def_line + 5 and lines[j].strip().startswith('const ') and '=' in lines[j] and ('useCallback' in lines[j] or 'async' in lines[j]):
            break
    print(f"callGemini defined at L{gemini_def_line + 1}, has try/catch: {has_try}")

# ===================================================================
# BETTER APPROACH: Wrap the high-risk functions at their async boundary
# For each async function containing unguarded awaits, add try/catch
# at the function level if not present
# ===================================================================

# Let's focus on the most impactful: the 27 callGemini calls
# These are in various handler functions. Let's find which functions
# contain these unguarded calls.

high_risk_lines = [
    30311, 36344, 39928, 43716, 44766, 45384, 45669, 46356,
    47315, 48094, 48653, 49671, 49979, 49991, 50051, 50206,
    50259, 50357, 50487, 50668, 50876, 50942, 51024, 51083,
    51233, 53428, 53732
]

# For each, find the enclosing async function and check if it has try/catch
functions_needing_fix = {}
for target_line in high_risk_lines:
    idx = target_line - 1
    if idx >= len(lines):
        continue
    
    # Search backwards for the enclosing async function
    func_start = None
    func_name = "unknown"
    for j in range(idx - 1, max(0, idx - 200), -1):
        stripped = lines[j].strip()
        if 'async' in stripped and ('=>' in stripped or 'function' in stripped):
            func_start = j
            # Try to extract function name
            m = re.search(r'(?:const|let|var)\s+(\w+)', stripped)
            if m:
                func_name = m.group(1)
            else:
                m = re.search(r'(\w+)\s*=\s*async', stripped)
                if m:
                    func_name = m.group(1)
                else:
                    func_name = f"anon_L{j+1}"
            break
    
    if func_start is not None:
        key = (func_start, func_name)
        if key not in functions_needing_fix:
            functions_needing_fix[key] = []
        functions_needing_fix[key].append(target_line)

print(f"\n{len(functions_needing_fix)} async functions contain unguarded callGemini calls:")
for (start, name), call_lines in sorted(functions_needing_fix.items()):
    print(f"  {name} (L{start+1}): {len(call_lines)} unguarded calls at {call_lines}")

# ===================================================================
# Now let's also handle audio chains
# ===================================================================
audio_lines = [4017, 6535, 6539, 6547, 6894, 6899, 6901, 6906, 6911, 6955, 6957, 6963, 6965, 7050, 8782, 8824]

audio_functions = {}
for target_line in audio_lines:
    idx = target_line - 1
    if idx >= len(lines):
        continue
    
    func_start = None
    func_name = "unknown"
    for j in range(idx - 1, max(0, idx - 200), -1):
        stripped = lines[j].strip()
        if 'async' in stripped and ('=>' in stripped or 'function' in stripped):
            func_start = j
            m = re.search(r'(?:const|let|var)\s+(\w+)', stripped)
            if m:
                func_name = m.group(1)
            else:
                func_name = f"anon_L{j+1}"
            break
    
    if func_start is not None:
        key = (func_start, func_name)
        if key not in audio_functions:
            audio_functions[key] = []
        audio_functions[key].append(target_line)

print(f"\n{len(audio_functions)} async functions contain unguarded audio calls:")
for (start, name), call_lines in sorted(audio_functions.items()):
    print(f"  {name} (L{start+1}): {len(call_lines)} audio calls at {call_lines}")

# ===================================================================
# MEDIUM-RISK: guided flow handleGenerate chain and other medium calls
# ===================================================================
medium_risk_lines = [
    420, 442, 5745, 16794, 16799, 21376, 21412,
    26214, 26218, 26534, 26540, 26551, 27302, 
    29898, 29913, 29927, 29941,
    34100, 37531, 37537, 37560, 38362, 38535, 38549,
    40785, 40794, 40798, 43957, 45135, 45460,
    46675, 46701, 46709, 46725, 46733, 46758, 46762, 46773, 46777,
    46793, 46797, 46819, 46823, 46845, 46849, 46864, 46883, 46899,
    46915, 46931, 46957, 46962, 46967, 46994, 47010, 47035, 47131, 47135,
    47817, 49732, 50058, 51518, 61557, 61566, 63350, 63368
]

medium_functions = {}
for target_line in medium_risk_lines:
    idx = target_line - 1
    if idx >= len(lines):
        continue
    
    func_start = None
    func_name = "unknown"
    for j in range(idx - 1, max(0, idx - 200), -1):
        stripped = lines[j].strip()
        if 'async' in stripped and ('=>' in stripped or 'function' in stripped):
            func_start = j
            m = re.search(r'(?:const|let|var)\s+(\w+)', stripped)
            if m:
                func_name = m.group(1)
            else:
                func_name = f"anon_L{j+1}"
            break
    
    if func_start is not None:
        key = (func_start, func_name)
        if key not in medium_functions:
            medium_functions[key] = []
        medium_functions[key].append(target_line)

print(f"\n{len(medium_functions)} async functions contain unguarded medium-risk calls:")
for (start, name), call_lines in sorted(medium_functions.items()):
    print(f"  {name} (L{start+1}): {len(call_lines)} calls")

# Total unique functions that need wrapping
all_funcs = set(functions_needing_fix.keys()) | set(audio_functions.keys()) | set(medium_functions.keys())
print(f"\nTOTAL unique functions needing try/catch: {len(all_funcs)}")
