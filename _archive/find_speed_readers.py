filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('speed_reader_search.txt', 'w', encoding='utf-8')

# Find ALL speed reader references
patterns = ['SpeedReader', 'speedReader', 'speed_reader', 'speed-reader',
            'ChunkReader', 'chunkReader', 'chunk_reader', 'SentenceReader',
            'sentenceReader', 'ReadAloud', 'readAloud', 'ChunkedReader',
            'chunkedReader', 'ReadBy', 'readByChunk', 'ReadingMode']

for pat in patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat in line:
            matches.append(i)
    if matches:
        out.write(f'\n=== "{pat}" found at {len(matches)} lines ===\n')
        for idx in matches[:15]:
            out.write(f'  Line {idx+1}: {lines[idx].rstrip()[:150]}\n')

# Also search for "chunk" near "read" or "speed"  
out.write(f'\n=== Lines with "chunk" near reading context ===\n')
for i, line in enumerate(lines):
    lower = line.lower()
    if 'chunk' in lower and ('read' in lower or 'speed' in lower or 'sentence' in lower):
        out.write(f'  Line {i+1}: {line.rstrip()[:150]}\n')

# Search for sentence-by-sentence reading or highlight
out.write(f'\n=== sentencePlayback or sentence highlight ===\n')
for i, line in enumerate(lines):
    if 'sentencePlayback' in line or 'sentenceHighlight' in line or 'playbackSentence' in line or 'activeSentence' in line:
        out.write(f'  Line {i+1}: {line.rstrip()[:150]}\n')

out.close()
print('Done - see speed_reader_search.txt')
