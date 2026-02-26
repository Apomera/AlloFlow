"""Apply remaining stripUndefined wrappers to sync updateDoc and mock session."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# Fix 1: Wrap sync updateDoc at the line containing updateDoc + resources + lightweightResources
for i, l in enumerate(lines):
    if 'updateDoc(sessionRef, { resources: lightweightResources })' in l and 'stripUndefined' not in l:
        lines[i] = l.replace(
            'updateDoc(sessionRef, { resources: lightweightResources })',
            'updateDoc(sessionRef, stripUndefined({ resources: lightweightResources }))'
        )
        changes += 1
        print(f"[OK] Fixed sync updateDoc at L{i+1}")

# Fix 2: Wrap mock setSessionData  
for i, l in enumerate(lines):
    if 'setSessionData({' in l and 'mockResources' in lines[i+1] if i+1 < len(lines) else False:
        if 'stripUndefined' not in l:
            lines[i] = l.replace('setSessionData({', 'setSessionData(stripUndefined({')
            changes += 1
            print(f"[OK] Fixed mock setSessionData at L{i+1}")
            # Find closing }); and add extra )
            for j in range(i+1, min(i+20, len(lines))):
                if lines[j].strip().startswith('});') and 'quizState' in lines[j-1]:
                    lines[j] = lines[j].replace('});', '}));')
                    changes += 1
                    print(f"[OK] Closed mock wrapper at L{j+1}")
                    break
            break

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} remaining fixes applied.")
else:
    print("No changes needed (already applied or not found).")
