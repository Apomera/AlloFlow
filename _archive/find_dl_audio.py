filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('dl_audio_btn_search.txt', 'w', encoding='utf-8')

# Search for download audio button rendering
patterns = ['download_audio', 'downloadAudio', 'Download Audio', 'audio_download', 
            'handleDownloadAudio', 'onDownloadAudio', 'downloadContentAudio']

for pat in patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat in line:
            matches.append(i)
    if matches:
        out.write(f'\n=== "{pat}" found at {len(matches)} lines ===\n')
        for idx in matches[:8]:
            out.write(f'  Line {idx+1}: {lines[idx].rstrip()[:150]}\n')

# Also search near the simplified view rendering (around line 62214)
out.write(f'\n=== Lines 62214-62500 with "audio" or "download" ===\n')
for i in range(62213, min(len(lines), 62500)):
    line = lines[i]
    if 'audio' in line.lower() or 'download' in line.lower():
        out.write(f'  {i+1}: {line.rstrip()[:150]}\n')

# Search in the header toolbar area (around 60200-60250) for download button
out.write(f'\n=== Lines 60190-60260 with "download" or "audio" ===\n')
for i in range(60189, min(len(lines), 60260)):
    line = lines[i]
    if 'download' in line.lower() or 'audio' in line.lower():
        out.write(f'  {i+1}: {line.rstrip()[:150]}\n')

# Broader: find all buttons with download in them
out.write(f'\n=== Buttons with "download" anywhere ===\n')
for i, line in enumerate(lines):
    if 'download' in line.lower() and ('button' in line.lower() or 'onClick' in line):
        out.write(f'  {i+1}: {line.rstrip()[:150]}\n')

out.close()
print('Done - see dl_audio_btn_search.txt')
