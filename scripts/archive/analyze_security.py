"""
Pass 6: Security / FERPA / Data Persistence Analysis
Comprehensive scan for:
1. API key exposure patterns
2. XSS vectors (dangerouslySetInnerHTML, eval, innerHTML)
3. Canvas cloud storage (storageDB) architecture
4. Data persistence patterns (what survives refresh)
5. Adventure mode save/load
6. Student data handling
7. Student view mechanism
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# === ANALYSIS 1: API Key Exposure ===
results.append("=" * 70)
results.append("ANALYSIS 1: API Key Handling")
results.append("=" * 70)

api_key_refs = []
for i, line in enumerate(lines, 1):
    if 'apiKey' in line or 'api_key' in line or 'API_KEY' in line:
        stripped = line.strip()
        if not stripped.startswith('//'):
            api_key_refs.append((i, stripped[:120]))
    if 'GEMINI' in line and 'KEY' in line:
        stripped = line.strip()
        if not stripped.startswith('//'):
            api_key_refs.append((i, stripped[:120]))

results.append(f"API key references: {len(api_key_refs)}")
for ln, text in api_key_refs[:30]:
    results.append(f"  L{ln}: {text}")

# === ANALYSIS 2: XSS Vectors ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 2: XSS Vectors")
results.append("=" * 70)

dangerous_html = []
eval_calls = []
inner_html = []
for i, line in enumerate(lines, 1):
    if 'dangerouslySetInnerHTML' in line:
        dangerous_html.append((i, line.strip()[:120]))
    if 'eval(' in line and not line.strip().startswith('//'):
        eval_calls.append((i, line.strip()[:120]))
    if '.innerHTML' in line and not line.strip().startswith('//'):
        inner_html.append((i, line.strip()[:120]))

results.append(f"dangerouslySetInnerHTML: {len(dangerous_html)}")
for ln, text in dangerous_html:
    results.append(f"  L{ln}: {text}")
results.append(f"eval() calls: {len(eval_calls)}")
for ln, text in eval_calls:
    results.append(f"  L{ln}: {text}")
results.append(f".innerHTML assignments: {len(inner_html)}")
for ln, text in inner_html:
    results.append(f"  L{ln}: {text}")

# === ANALYSIS 3: Storage / Persistence Patterns ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 3: Data Storage & Persistence")
results.append("=" * 70)

local_storage = sum(1 for l in lines if 'localStorage' in l and not l.strip().startswith('//'))
session_storage = sum(1 for l in lines if 'sessionStorage' in l and not l.strip().startswith('//'))
storage_db = sum(1 for l in lines if 'storageDB' in l and not l.strip().startswith('//'))
indexed_db = sum(1 for l in lines if 'IndexedDB' in l or 'indexedDB' in l)

results.append(f"localStorage refs: {local_storage}")
results.append(f"sessionStorage refs: {session_storage}")
results.append(f"storageDB refs: {storage_db}")
results.append(f"IndexedDB refs: {indexed_db}")

# Find storageDB operations
results.append("")
results.append("storageDB operations:")
for i, line in enumerate(lines, 1):
    if 'storageDB.' in line and not line.strip().startswith('//'):
        stripped = line.strip()[:120]
        results.append(f"  L{i}: {stripped}")

# === ANALYSIS 4: Adventure Mode Save/Load ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 4: Adventure Mode Save/Load")
results.append("=" * 70)

for i, line in enumerate(lines, 1):
    lower = line.lower()
    if ('adventure' in lower and ('save' in lower or 'load' in lower or 'resume' in lower or 'persist' in lower)) and not line.strip().startswith('//'):
        results.append(f"  L{i}: {line.strip()[:120]}")
    elif 'adventureState' in line and ('save' in line.lower() or 'load' in line.lower() or 'JSON' in line):
        results.append(f"  L{i}: {line.strip()[:120]}")

# === ANALYSIS 5: Student Data / PII ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 5: Student / PII Data Handling")
results.append("=" * 70)

pii_patterns = ['studentName', 'student_name', 'firstName', 'lastName', 'email', 'birthDate', 'dob', 'ssn', 'address']
for pattern in pii_patterns:
    count = sum(1 for l in lines if pattern in l and not l.strip().startswith('//'))
    if count > 0:
        results.append(f"  '{pattern}': {count} refs")

# === ANALYSIS 6: Student View / Locked Mode ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 6: Student View / Project Mode")
results.append("=" * 70)

for i, line in enumerate(lines, 1):
    if ('studentView' in line or 'studentMode' in line or 'isStudentView' in line or 
        'studentProject' in line or 'student_view' in line or 'locked' in line.lower() and 'view' in line.lower()):
        stripped = line.strip()
        if not stripped.startswith('//') and len(stripped) > 10:
            results.append(f"  L{i}: {stripped[:120]}")

# === ANALYSIS 7: JSON Export/Import ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 7: JSON Export/Import Functions")
results.append("=" * 70)

for i, line in enumerate(lines, 1):
    if ('exportJSON' in line or 'importJSON' in line or 'saveJSON' in line or 
        'loadJSON' in line or 'downloadJSON' in line or 'JSON.stringify' in line and 'download' in line.lower()):
        stripped = line.strip()
        if not stripped.startswith('//'):
            results.append(f"  L{i}: {stripped[:120]}")

# Also look for save/export functions
results.append("")
results.append("Save/Export/Download functions:")
for i, line in enumerate(lines, 1):
    if re.search(r'(handleSave|handleExport|handleDownload|saveProject|loadProject|handleImport)', line):
        stripped = line.strip()
        if not stripped.startswith('//'):
            results.append(f"  L{i}: {stripped[:120]}")

# === ANALYSIS 8: Canvas Cloud (storageDB definition) ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 8: storageDB Definition & Architecture")
results.append("=" * 70)

for i, line in enumerate(lines, 1):
    if 'storageDB' in line and ('=' in line or 'function' in line or 'const' in line or 'class' in line):
        stripped = line.strip()
        if not stripped.startswith('//'):
            results.append(f"  L{i}: {stripped[:140]}")

with open('pass6_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print(f"Results written to pass6_results.txt ({len(results)} lines)")
