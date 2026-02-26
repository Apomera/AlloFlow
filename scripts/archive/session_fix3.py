"""DEFINITIVE FIX: Apply stripUndefined to setDoc and fix catch block scope errors.
Uses exact line-level targeting to ensure correct application.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# --- FIX 1: Wrap setDoc payload with stripUndefined ---
# L42413: "        await setDoc(sessionRef, {"
for i, l in enumerate(lines):
    if 'await setDoc(sessionRef, {' in l and 'stripUndefined' not in l:
        lines[i] = l.replace('await setDoc(sessionRef, {', 'await setDoc(sessionRef, stripUndefined({')
        changes += 1
        print(f"[OK] L{i+1}: Wrapped setDoc with stripUndefined")

# L42443: "        });" -> "}));"  (close the stripUndefined wrapper)
# Find the closing of the setDoc call — it's the first "});" after the setDoc line
found_setdoc = False
for i, l in enumerate(lines):
    if 'await setDoc(sessionRef, stripUndefined({' in l:
        found_setdoc = True
        continue
    if found_setdoc and l.strip() == '});':
        lines[i] = l.replace('});', '}));')
        changes += 1
        print(f"[OK] L{i+1}: Closed stripUndefined wrapper")
        found_setdoc = False
        break

# --- FIX 2: Fix catch block scope errors ---
# L42455: replace resourcesToUpload with history
for i, l in enumerate(lines):
    if 'resourcesToUpload?.length' in l and 'SESSION DEBUG' in l:
        lines[i] = l.replace('resourcesToUpload?.length', 'history?.length, "history items"')
        changes += 1
        print(f"[OK] L{i+1}: Fixed resourcesToUpload scope error")

# L42457-42468: Replace lightweightResources references with safe alternatives
for i, l in enumerate(lines):
    if 'JSON.stringify(lightweightResources)' in l and 'SESSION DEBUG' in lines[i+1] if i+1 < len(lines) else False:
        lines[i] = l.replace('JSON.stringify(lightweightResources)', 'JSON.stringify(history.filter(h => h.id).map(h => ({type: h.type, id: h.id, title: h.title})))')
        changes += 1
        print(f"[OK] L{i+1}: Fixed lightweightResources scope in JSON.stringify")

# Replace Array.isArray(lightweightResources) check
for i, l in enumerate(lines):
    if 'Array.isArray(lightweightResources)' in l and 'SESSION DEBUG' in lines[max(0,i-5):i].__repr__():
        lines[i] = l.replace('Array.isArray(lightweightResources)', 'false /* lightweightResources out of scope */')
        changes += 1
        print(f"[OK] L{i+1}: Disabled out-of-scope lightweightResources forEach")

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} fixes applied.")
else:
    print("ERROR: No changes applied!")
    sys.exit(1)
