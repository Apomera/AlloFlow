"""Add estimateFirstPhoneme and estimateLastPhoneme helpers inside renderActivityContent."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "// REFACTORED: PHONEME-AWARE SOUND MATCHING"
target_text = '// REFACTORED: PHONEME-AWARE SOUND MATCHING'
insert_idx = None
for i, line in enumerate(lines):
    if target_text in line:
        insert_idx = i
        break

if insert_idx is None:
    print("ERROR: Could not find target line")
    exit(1)

# Insert helper functions BEFORE the target line
helpers = [
    "                // Helper: estimate first/last phoneme from orthography (local to this scope)\n",
    "                const estimateFirstPhoneme = (word) => {\n",
    "                    if (!word) return '';\n",
    "                    const w = word.toLowerCase();\n",
    "                    const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck'];\n",
    "                    for (const dg of digraphs) { if (w.startsWith(dg)) return dg; }\n",
    "                    if (w.startsWith('kn')) return 'n';\n",
    "                    if (w.startsWith('wr')) return 'r';\n",
    "                    return w.charAt(0);\n",
    "                };\n",
    "                const estimateLastPhoneme = (word) => {\n",
    "                    if (!word) return '';\n",
    "                    const w = word.toLowerCase();\n",
    "                    const rControlled = ['ar', 'er', 'ir', 'or', 'ur'];\n",
    "                    for (const rc of rControlled) { if (w.endsWith(rc)) return rc; }\n",
    "                    const digraphs = ['sh', 'ch', 'th', 'ng', 'ck'];\n",
    "                    for (const dg of digraphs) { if (w.endsWith(dg)) return dg; }\n",
    "                    return w.charAt(w.length - 1);\n",
    "                };\n",
    "\n",
]

lines[insert_idx:insert_idx] = helpers

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"SUCCESS: Inserted estimateFirstPhoneme/estimateLastPhoneme at line {insert_idx + 1}")
