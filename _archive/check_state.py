"""Find and fix the multi-section setInputText(fullDocument) location."""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

with open('_multi_sect.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        if 'setInputText(fullDocument)' in line:
            start = max(0, i-5)
            end = min(len(lines), i+5)
            for j in range(start, end):
                out.write(f'LINE {j+1}: {lines[j].rstrip()[:200]}\n')
            out.write('---\n')

    # Also check if cleanSourceMetaCommentary(fullDocument) exists
    for i, line in enumerate(lines):
        if 'cleanSourceMetaCommentary' in line:
            out.write(f'\ncleanSourceMetaCommentary at LINE {i+1}: {line.rstrip()[:200]}\n')

print("Written to _multi_sect.txt")
