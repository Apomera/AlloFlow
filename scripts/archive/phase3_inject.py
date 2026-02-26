"""Phase 3: Inject differentiationContext into remaining prompt types within handleGenerate.
Uses line-level insertion to add ${differentiationContext} before Text: "${textToProcess}" lines.
Only targets lines within the handleGenerate function (L49803+).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# Find all Text: "${textToProcess}" lines within handleGenerate (after L49803)
targets = []
for i, l in enumerate(lines):
    if i < 49800:  # Only within handleGenerate
        continue
    if i > 52200:  # End of handleGenerate area
        break
    if 'Text: "${textToProcess}"' in l and '${differentiationContext}' not in l:
        # Check if previous line already has differentiationContext
        if i > 0 and 'differentiationContext' in lines[i-1]:
            print(f"  Skipping L{i+1}: already has differentiationContext above")
            continue
        targets.append(i)

print(f"Found {len(targets)} injection targets:")
for t in targets:
    print(f"  L{t+1}: {lines[t].rstrip()[:100]}")

# Inject ${differentiationContext} line before each target
# Work backwards to preserve line numbers
for t in reversed(targets):
    # Determine indentation from the target line
    stripped = lines[t].lstrip()
    indent = lines[t][:len(lines[t]) - len(stripped)]
    new_line = f"{indent}${{differentiationContext}}\n"
    lines.insert(t, new_line)
    changes += 1
    print(f"  [OK] Injected differentiationContext before L{t+1}")

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} prompt injections applied successfully.")
else:
    print("\nNo injections needed (all already done or no targets found).")
