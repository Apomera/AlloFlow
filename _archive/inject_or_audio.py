"""Convert or.webm to base64 and inject into PHONEME_AUDIO_BANK"""
import base64

# Read the audio file
audio_path = 'audio_input4/or.webm'
with open(audio_path, 'rb') as f:
    audio_data = f.read()

print(f"Audio file size: {len(audio_data)} bytes")

# Convert to base64
b64 = base64.b64encode(audio_data).decode('ascii')
print(f"Base64 length: {len(b64)} chars")

# Create the data URI
data_uri = f"data:audio/webm;base64,{b64}"
print(f"Data URI length: {len(data_uri)} chars")

# Now inject into AlloFlowANTI.txt after the 'ur' entry
FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"File has {len(lines)} lines")

# Find the 'ur' line (should be L1188)
ur_line_idx = None
for i, line in enumerate(lines):
    if line.strip().startswith("'ur':") and 'data:audio' in line:
        ur_line_idx = i
        print(f"Found 'ur' at L{i+1}")
        break

if ur_line_idx is None:
    print("ERROR: Could not find 'ur' entry!")
else:
    # Create the new 'or' entry line
    # Match the indentation of the 'ur' line
    indent = ''
    for ch in lines[ur_line_idx]:
        if ch in ' \t':
            indent += ch
        else:
            break
    
    or_line = f"{indent}'or': '{data_uri}',\n"
    print(f"Inserting 'or' entry after L{ur_line_idx+1}")
    
    # Insert after 'ur' line
    lines.insert(ur_line_idx + 1, or_line)
    
    # Write back
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("INJECTED 'or' entry into PHONEME_AUDIO_BANK")
    
    # Verify
    with open(FILE, 'r', encoding='utf-8-sig') as f:
        verify_lines = f.readlines()
    
    or_found = False
    for i, line in enumerate(verify_lines):
        if line.strip().startswith("'or':") and 'data:audio' in line:
            print(f"VERIFIED: 'or' entry at L{i+1}")
            or_found = True
            break
    
    if not or_found:
        print("ERROR: Verification failed - 'or' not found!")
    else:
        print("SUCCESS: 'or' audio injected and verified!")
