filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('playback_search.txt', 'w', encoding='utf-8')

# playbackRate is passed to ImmersiveToolbar - find all refs
patterns = ['playbackRate', 'playback_rate', 'autoAdvance', 'auto_advance',
            'chunkMode', 'chunk_mode', 'sentenceMode', 'sentence_mode',
            'activeChunk', 'currentChunk', 'chunkIndex', 'sentenceIndex',
            'activeSentenceIdx', 'currentSentenceIdx', 'highlightSentence',
            'readingTimer', 'autoPlay', 'autoRead']

for pat in patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat in line:
            matches.append(i)
    if matches:
        out.write(f'\n=== "{pat}" found at {len(matches)} lines ===\n')
        for idx in matches[:10]:
            out.write(f'  Line {idx+1}: {line.rstrip()[:150]}\n')
            # Show context
            for j in range(max(0, idx-1), min(len(lines), idx+2)):
                out.write(f'    {j+1}: {lines[j].rstrip()[:150]}\n')

# Also check what ImmersiveToolbar does with playbackRate
out.write('\n\n=== ImmersiveToolbar playbackRate usage ===\n')
in_toolbar = False
for i, line in enumerate(lines):
    if 'const ImmersiveToolbar' in line:
        in_toolbar = True
    if in_toolbar:
        if 'playbackRate' in line or 'playback' in line.lower():
            out.write(f'  Line {i+1}: {line.rstrip()[:150]}\n')
        if in_toolbar and i > 28872 and '});' == line.strip():
            break

out.close()
print('Done - see playback_search.txt')
