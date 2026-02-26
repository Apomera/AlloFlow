"""Convert super, terrific, wow feedback audio and add to audio_bank.json + feedback pool."""
import base64, json, re

# Convert the 3 new files
files = {
    'fb_super': 'Feedback/super__instruction.webm',
    'fb_terrific': 'Feedback/terrific__instruction.webm',
    'fb_wow': 'Feedback/wow__instruction.webm',
}

new_entries = {}
for key, path in files.items():
    with open(path, 'rb') as f:
        data = f.read()
    b64 = base64.b64encode(data).decode('ascii')
    new_entries[key] = f'data:audio/webm;base64,{b64}'
    print(f'{key}: {len(data)} bytes -> {len(b64)} base64 chars')

# 1. Add to audio_bank.json
with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)

for key, uri in new_entries.items():
    bank.setdefault('instructions', {})[key] = uri
    print(f'Added {key} to audio_bank.json')

with open('audio_bank.json', 'w', encoding='utf-8') as f:
    json.dump(bank, f, separators=(',', ':'))
print('Saved audio_bank.json')

# 2. Add _LOAD_INSTRUCTION_AUDIO_RAW entries in AlloFlowANTI.txt
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find existing fb_ load lines to insert after
last_fb_line = None
for i, line in enumerate(lines):
    if "_LOAD_INSTRUCTION_AUDIO_RAW('fb_" in line:
        last_fb_line = i

if last_fb_line:
    # Check which keys already have load lines
    existing_loads = set()
    for line in lines:
        m = re.search(r"_LOAD_INSTRUCTION_AUDIO_RAW\('(fb_\w+)'", line)
        if m:
            existing_loads.add(m.group(1))
    
    new_loads = []
    for key in ['fb_super', 'fb_terrific', 'fb_wow']:
        if key not in existing_loads:
            new_loads.append(f"_LOAD_INSTRUCTION_AUDIO_RAW('{key}', getAudio('instructions', '{key}'));\n")
            print(f'Will add _LOAD for {key}')
    
    if new_loads:
        for j, nl in enumerate(new_loads):
            lines.insert(last_fb_line + 1 + j, nl)
        print(f'Inserted {len(new_loads)} load lines after L{last_fb_line+1}')

# 3. Add the keys back into the feedback pool
# Find the feedback pool line
for i, line in enumerate(lines):
    if "'fb_great_job','fb_nice','fb_keep_going'" in line:
        # Add fb_super, fb_terrific to this pool
        if 'fb_super' not in line:
            lines[i] = line.replace(
                "'fb_excellent'];",
                "'fb_excellent','fb_super','fb_terrific'];"
            )
            print(f'Added fb_super, fb_terrific to feedback pool at L{i+1}')
    
    # Fix streak 25 to use fb_wow now that it exists
    if "return 'fb_on_fire'; // Reuse (fb_wow not in bank)" in line:
        lines[i] = line.replace(
            "return 'fb_on_fire'; // Reuse (fb_wow not in bank)",
            "return 'fb_wow';"
        )
        print(f'Restored fb_wow for streak 25 at L{i+1}')

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Saved AlloFlowANTI.txt')
print('\nDone!')
