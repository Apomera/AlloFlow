"""
Fix Step 2 wizard help mode coverage:
1. Add data-help-key to all 4 content source buttons
2. Add help text entries to the help registry
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# FIX 1: Add data-help-key to each Step 2 button
button_fixes = [
    (28014, 'wizard_upload_source', 'Upload File'),
    (28027, 'wizard_url_source', 'Paste URL'),
    (28040, 'wizard_search_source', 'AI Search'),
    (28053, 'wizard_generate_source', 'Generate from Scratch'),
]

for line_num, help_key, desc in button_fixes:
    idx = line_num - 1
    line = lines[idx]
    if '<button' in line and 'data-help-key' not in line:
        lines[idx] = line.replace('<button', '<button data-help-key="' + help_key + '"')
        print(f"[OK] L{line_num}: Added data-help-key=\"{help_key}\" ({desc})")
        changes += 1
    else:
        print(f"[SKIP] L{line_num}: {line.strip()[:80]}")

# FIX 2: Add help text entries to the registry
h1 = '    wizard_upload_source: "Upload a file (PDF, DOCX, TXT, or image) as your source material. The AI will extract and analyze the content to generate aligned educational resources.",\r\n'
h2 = '    wizard_url_source: "Paste a web URL to import content directly from the internet. The system will fetch the page content and use it as source material for generating lesson resources.",\r\n'
h3 = '    wizard_search_source: "Use AI-powered web search to find relevant content for your lesson. Enter a topic and the system will locate and import high-quality source material automatically.",\r\n'
h4 = '    wizard_generate_source: "Generate original lesson content from scratch using AI. Provide a topic and the system will create comprehensive source material tailored to your grade level and standards.",\r\n'
help_entries = [h1, h2, h3, h4]

# Find the last wizard_ entry in the help registry
insert_after = None
for i in range(32530, min(len(lines), 32600)):
    l = lines[i].strip()
    if l.startswith('wizard_') and ':' in l and '"' in l:
        insert_after = i

if insert_after is not None:
    print(f"[INFO] Inserting after L{insert_after + 1}: {lines[insert_after].strip()[:80]}")
    for j, entry in enumerate(help_entries):
        lines.insert(insert_after + 1 + j, entry)
    print(f"[OK] Inserted {len(help_entries)} help entries")
    changes += 1
else:
    print("[FAIL] Could not find insertion point for help entries")

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} fix(es) applied. New total: {len(lines)}")
else:
    print("\nNo changes made")
