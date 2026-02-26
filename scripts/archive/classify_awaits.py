"""
Classify 109 unguarded await calls into categories:
1. INTENTIONAL CHAINS — audio sequencing, delays, UI transitions  
2. NETWORK/API CALLS — fetch, Gemini, Firestore (genuine crash risks)
3. ALREADY SAFE — inside try/catch at a higher scope
4. LOW RISK — Promise.all, simple state ops

Only category 2 needs fixing.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# Find all await statements
awaits = []
for i, line in enumerate(lines):
    if 'await ' in line and 'try' not in line:
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        awaits.append((i + 1, stripped))

print(f"Total await statements: {len(awaits)}")

# Check which are inside try/catch
def is_in_try_block(line_idx, lines):
    """Check if a line is inside a try block by counting try/catch depth."""
    depth = 0
    brace_depth = 0
    for j in range(max(0, line_idx - 100), line_idx):
        l = lines[j]
        if re.search(r'\btry\s*\{', l):
            depth += 1
        if re.search(r'\bcatch\s*\(', l):
            depth -= 1
        if re.search(r'\bfinally\s*\{', l):
            depth -= 1
    return depth > 0

# Categorize each await
categories = {
    'audio_chain': [],      # handleAudio, playSound, speak
    'delay': [],            # setTimeout, Promise delays
    'network_api': [],      # fetch, callGemini, Firestore
    'already_guarded': [],  # Inside try at higher scope
    'file_ops': [],         # File/blob operations
    'state_ops': [],        # State updates, DOM ops
    'other': []
}

for ln, text in awaits:
    idx = ln - 1
    
    # Check if line is already in a try block
    in_try = is_in_try_block(idx, lines)
    if in_try:
        categories['already_guarded'].append((ln, text[:100]))
        continue
    
    # Audio chains
    if any(k in text for k in ['handleAudio', 'playSound', 'speak(', 'playTTS', 
                                 'audio', 'Audio', 'tts', 'TTS']):
        categories['audio_chain'].append((ln, text[:100]))
        continue
    
    # Delays / timers
    if 'setTimeout' in text or 'Promise(r =>' in text or 'new Promise' in text or 'sleep' in text:
        categories['delay'].append((ln, text[:100]))
        continue
    
    # Network / API calls
    if any(k in text for k in ['fetch(', 'callGemini', 'callImagen', 'getDoc', 'setDoc',
                                 'updateDoc', 'deleteDoc', 'addDoc', 'getDocs',
                                 'signIn', 'signOut', 'createUser', 'listCollections',
                                 'Firestore', 'firebase', 'onSnapshot',
                                 'generateContent', 'apiKey', 'completion']):
        categories['network_api'].append((ln, text[:100]))
        continue
    
    # File/blob operations
    if any(k in text for k in ['readAsDataURL', 'readAsArrayBuffer', 'readAsText',
                                 'createObjectURL', 'toBlob', 'toDataURL',
                                 'transcribe', 'decode', 'encode']):
        categories['file_ops'].append((ln, text[:100]))
        continue
    
    # State/DOM operations
    if any(k in text for k in ['setState', 'dispatch', 'scrollIntoView', 'clipboard',
                                 'navigator.', 'document.']):
        categories['state_ops'].append((ln, text[:100]))
        continue
    
    categories['other'].append((ln, text[:100]))

# Output
out = []
out.append(f"=== UNGUARDED AWAIT CLASSIFICATION ({len(awaits)} total) ===\n")

out.append(f"=== ALREADY GUARDED ({len(categories['already_guarded'])}) ===")
out.append("(Inside a try block at higher scope — safe)\n")
for ln, text in categories['already_guarded'][:5]:
    out.append(f"  L{ln}: {text}")
if len(categories['already_guarded']) > 5:
    out.append(f"  ... and {len(categories['already_guarded']) - 5} more")

out.append(f"\n=== AUDIO CHAINS ({len(categories['audio_chain'])}) ===")
out.append("(Intentional sequential audio — wrapping would break playback flow)\n")
for ln, text in categories['audio_chain']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== DELAYS ({len(categories['delay'])}) ===")
out.append("(Intentional timing — setTimeout/Promise delays)\n")
for ln, text in categories['delay']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== NETWORK/API CALLS ({len(categories['network_api'])}) — NEEDS FIXING ===")
out.append("(Genuine crash risk — unhandled rejection on network failure)\n")
for ln, text in categories['network_api']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== FILE OPERATIONS ({len(categories['file_ops'])}) — NEEDS FIXING ===")
out.append("(Can throw on corrupt data or permission errors)\n")
for ln, text in categories['file_ops']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== STATE/DOM OPS ({len(categories['state_ops'])}) ===")
out.append("(Low risk — unlikely to throw)\n")
for ln, text in categories['state_ops']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== OTHER ({len(categories['other'])}) ===\n")
for ln, text in categories['other']:
    out.append(f"  L{ln}: {text}")

out.append(f"\n=== SUMMARY ===")
out.append(f"  Total unguarded: {len(awaits)}")
out.append(f"  Already guarded (higher scope): {len(categories['already_guarded'])}")
out.append(f"  Audio chains (intentional): {len(categories['audio_chain'])}")
out.append(f"  Delays (intentional): {len(categories['delay'])}")
out.append(f"  Network/API (NEEDS FIX): {len(categories['network_api'])}")
out.append(f"  File ops (NEEDS FIX): {len(categories['file_ops'])}")
out.append(f"  State/DOM (low risk): {len(categories['state_ops'])}")
out.append(f"  Other: {len(categories['other'])}")

result = '\n'.join(out)
with open('await_classification.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nAlready guarded: {len(categories['already_guarded'])}")
print(f"Audio chains: {len(categories['audio_chain'])}")
print(f"Delays: {len(categories['delay'])}")
print(f"NEEDS FIX (network): {len(categories['network_api'])}")
print(f"NEEDS FIX (file): {len(categories['file_ops'])}")
print(f"Other: {len(categories['state_ops']) + len(categories['other'])}")
print("Report: await_classification.txt")
