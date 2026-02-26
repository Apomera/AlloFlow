"""
Add diagnostic wrappers around EVERY setShowSessionComplete(true) call
to trace which one fires prematurely.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find ALL setShowSessionComplete(true) calls and add diagnostic context
changes = []
for i, l in enumerate(lines):
    if 'setShowSessionComplete(true)' in l and 'console.error' not in l:
        # Get the context (function name, surrounding code)
        context = ""
        for j in range(max(0, i-10), i):
            if 'const ' in lines[j] or 'function ' in lines[j] or 'case ' in lines[j] or 'if (' in lines[j]:
                context = lines[j].strip()[:80]
        
        # Add diagnostic
        indent = len(l) - len(l.lstrip())
        spaces = ' ' * indent
        diagnostic = '%sconsole.error("[SESSION-DBG] setShowSessionComplete(true) at L%d, ctx: %s, score:", wordSoundsScore?.correct, "/", wordSoundsSessionGoal);\n' % (spaces, i+1, context.replace('"', '\\"').replace("'", "\\'")[:60])
        lines[i] = diagnostic + l
        changes.append("L%d: %s" % (i+1, l.strip()[:120]))

content = '\n'.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added diagnostics to %d setShowSessionComplete(true) calls:" % len(changes))
for c in changes:
    print("  + %s" % c)

# Also check: are there any useEffects that set showSessionComplete?
print("\n=== useEffects near showSessionComplete ===")
for i, l in enumerate(lines):
    if 'showSessionComplete' in l and 'useEffect' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Check what wordSoundsSessionGoal defaults to
print("\n=== wordSoundsSessionGoal default ===")
for i, l in enumerate(lines):
    if 'wordSoundsSessionGoal' in l and ('useState' in l or 'initial' in l.lower() or ': 0' in l or ': 5' in l):
        print("L%d: %s" % (i+1, l.strip()[:180]))
