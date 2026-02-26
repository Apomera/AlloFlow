"""Fix: Replace old batch button with dialog opener and fix toggle."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# FIX 1: Replace old button with dialog opener
OLD_BTN = """<button onClick={() => { onClose(); onBatchGenerate?.('simplified'); }} disabled={!rosterKey || Object.keys(rosterKey?.groups || {}).length === 0} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
            <Layers size={14} /> {t('roster.batch_generate') || 'Generate for All Groups'}
          </button>"""

NEW_BTN = """<button onClick={() => setShowBatchConfig(true)} disabled={!rosterKey || Object.keys(rosterKey?.groups || {}).length === 0} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 border border-amber-200">
            <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
          </button>"""

if OLD_BTN in content:
    content = content.replace(OLD_BTN, NEW_BTN)
    changes += 1
    print("[OK] Replaced old batch button with dialog opener")
else:
    print("[WARN] Old button pattern not found, trying line-level replacement")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if "onBatchGenerate?.('simplified')" in l and 'onClose' in l:
            # Replace this line
            lines[i] = lines[i].replace(
                "onClick={() => { onClose(); onBatchGenerate?.('simplified'); }}",
                "onClick={() => setShowBatchConfig(true)}"
            ).replace(
                "Generate for All Groups",
                "Differentiate by Group"
            )
            if 'border border-amber-200' not in lines[i]:
                lines[i] = lines[i].replace('disabled:opacity-40">', 'disabled:opacity-40 border border-amber-200">')
            changes += 1
            print(f"[OK] L{i+1}: Fixed button via line-level replacement")
            break
    content = '\n'.join(lines)

# FIX 2: Fix toggle by updating any setBatchTypes with 7 types to 11 types
# Find the toggle that has allSelected references
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'setBatchTypes' in l and 'allSelected' in l and 'outline' in l:
        if 'adventure' not in l:
            # Add the 4 types
            old = "outline: !allSelected }"
            new = "outline: !allSelected, adventure: !allSelected, 'concept-sort': !allSelected, image: !allSelected, timeline: !allSelected }"
            if old in l:
                lines[i] = l.replace(old, new)
                changes += 1
                print(f"[OK] L{i+1}: Fixed toggle to include all 11 types")
            else:
                print(f"[WARN] L{i+1}: Toggle line found but pattern didn't match")
                print(f"  Content: {l.strip()[:200]}")
        else:
            print(f"[OK] L{i+1}: Toggle already has all types")

content = '\n'.join(lines)
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\n✅ Total {changes} changes applied.")
