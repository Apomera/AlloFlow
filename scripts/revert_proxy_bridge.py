"""
Revert live Proxy bridges back to simple static references.
The Proxy approach broke TTS. The static bridge captures the parent's Proxy
reference, which IS a live object - property accesses on it delegate through
the parent's Proxy handlers. This should work for phonemes too since 
audio_bank.json loads before the component actually renders.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# Find and replace the entire live Proxy bridge block
start_marker = "// Live bridges - always read from parent scope to handle async audio bank loading"
end_marker = "});"  # Last closing of the console.log statement... actually let me find the exact end

idx_start = c.find(start_marker)
if idx_start < 0:
    print("Live bridge marker not found")
    exit()

# Find the end - it's the console.log line
end_marker_text = "console.log('[WS-AUDIO] Bridge initialized."
idx_end = c.find(end_marker_text, idx_start)
if idx_end > 0:
    # Find the end of this console.log statement (closing });)
    idx_end = c.find("});", idx_end) + 3
else:
    print("End marker not found, trying alternate approach")
    # Find by looking for next const/function after the bridge
    idx_end = c.find("\nconst SOUND_MATCH_POOL", idx_start)
    if idx_end < 0:
        idx_end = c.find("\nconst fisherYatesShuffle", idx_start)

print(f"Bridge block: chars {idx_start} to {idx_end}")
old_bridge = c[idx_start:idx_end]
print(f"Old bridge length: {len(old_bridge)} chars")

# Replace with simple, clean static bridges + minimal debug
NEW_BRIDGE = """// Audio bridges from parent scope - these capture live Proxy references
const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
const ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};
console.log('[WS-AUDIO] Bridge init:', { INSTRUCTION: !!window.__ALLO_INSTRUCTION_AUDIO, ISOLATION: !!window.__ALLO_ISOLATION_AUDIO, PHONEME: !!window.__ALLO_PHONEME_AUDIO_BANK });
"""

c = c[:idx_start] + NEW_BRIDGE + c[idx_end:]
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print("Reverted to simple static bridges")
