"""
Re-add audio bridges using a deferred approach that doesn't 
interfere with the module's TTS initialization.

Strategy: use `let` that starts as a safe empty object, 
then gets replaced with the real Proxy after audio_bank_loaded fires.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

# The bridges were removed by the previous script. Add them back with let instead of const.
# Insert before fisherYatesShuffle (after the crash fix constants)
ANCHOR = "        // === End crash fixes ==="
if ANCHOR in c:
    # Remove the old end marker and add the bridges
    NEW = """        // Audio constants from parent scope
        let INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
        let ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
        let PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};
        // Re-bind after audio bank loads to get live Proxy references
        window.addEventListener('audio_bank_loaded', () => {
            if (window.__ALLO_INSTRUCTION_AUDIO) INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO;
            if (window.__ALLO_ISOLATION_AUDIO) ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO;
            if (window.__ALLO_PHONEME_AUDIO_BANK) PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK;
            console.log('[WS-AUDIO] Re-bound audio bridges after audio_bank_loaded');
        });
        // === End crash fixes ==="""
    c = c.replace(ANCHOR, NEW)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Added let-based audio bridges with deferred re-binding")
else:
    print("End crash fixes marker not found, trying alternate insertion")
    # Try inserting before fisherYatesShuffle
    alt = "const fisherYatesShuffle"
    idx = c.find(alt)
    if idx > 0:
        insert_at = c.rfind('\n', 0, idx) + 1
        BRIDGES = """        // Audio constants from parent scope
        let INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
        let ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
        let PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};
        window.addEventListener('audio_bank_loaded', () => {
            if (window.__ALLO_INSTRUCTION_AUDIO) INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO;
            if (window.__ALLO_ISOLATION_AUDIO) ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO;
            if (window.__ALLO_PHONEME_AUDIO_BANK) PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK;
            console.log('[WS-AUDIO] Re-bound audio bridges after audio_bank_loaded');
        });
"""
        c = c[:insert_at] + BRIDGES + c[insert_at:]
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(c)
        print("Added let-based bridges before fisherYatesShuffle")

# Verify
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    v = f.read()
import re
for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    m = re.search(r'\blet\s+' + name + r'\b', v)
    if m:
        line = v[:m.start()].count('\n') + 1
        print(f"  ✓ let {name} at L{line}")
    else:
        print(f"  ✗ {name} not found as let")

print("\nDone!")
