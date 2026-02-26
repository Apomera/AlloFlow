"""
Fix phoneme audio bridge - use live Proxy references with debug logging.

The problem: const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {}
If window property is set, we get the Proxy reference. The Proxy lazily calls
getAudio() which reads _AUDIO_BANK. But if the internal cache was populated
with nulls before audio_bank loaded, those nulls persist even after the
audio_bank_loaded event fires (the event invalidates caches in the PARENT scope,
not in the CDN's const reference).

Solution: Instead of const assignment, use a live getter Proxy that always
delegates to the parent's Proxy on every access.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the existing static bridges with live getters + debug logging
OLD_BRIDGE = """const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
const ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};"""

NEW_BRIDGE = """// Live bridges - always read from parent scope to handle async audio bank loading
const INSTRUCTION_AUDIO = new Proxy({}, {
    get(_, prop) {
        const src = window.__ALLO_INSTRUCTION_AUDIO;
        if (!src) { if (prop !== 'raw_ref') console.warn('[WS-AUDIO] INSTRUCTION_AUDIO not available from parent'); return undefined; }
        return src[prop];
    },
    has(_, prop) { const src = window.__ALLO_INSTRUCTION_AUDIO; return src ? (prop in src) : false; },
    ownKeys() { const src = window.__ALLO_INSTRUCTION_AUDIO; return src ? Reflect.ownKeys(src) : []; },
    getOwnPropertyDescriptor(_, prop) { const src = window.__ALLO_INSTRUCTION_AUDIO; if (!src) return undefined; const d = Object.getOwnPropertyDescriptor(src, prop); if (d) { d.configurable = true; } return d; }
});
const ISOLATION_AUDIO = new Proxy({}, {
    get(_, prop) {
        const src = window.__ALLO_ISOLATION_AUDIO;
        if (!src) { if (prop !== 'raw_ref') console.warn('[WS-AUDIO] ISOLATION_AUDIO not available from parent'); return undefined; }
        return src[prop];
    },
    has(_, prop) { const src = window.__ALLO_ISOLATION_AUDIO; return src ? (prop in src) : false; },
    ownKeys() { const src = window.__ALLO_ISOLATION_AUDIO; return src ? Reflect.ownKeys(src) : []; },
    getOwnPropertyDescriptor(_, prop) { const src = window.__ALLO_ISOLATION_AUDIO; if (!src) return undefined; const d = Object.getOwnPropertyDescriptor(src, prop); if (d) { d.configurable = true; } return d; }
});
const PHONEME_AUDIO_BANK = new Proxy({}, {
    get(_, prop) {
        const src = window.__ALLO_PHONEME_AUDIO_BANK;
        if (!src) { if (prop !== 'raw_ref') console.warn('[WS-AUDIO] PHONEME_AUDIO_BANK not available from parent'); return undefined; }
        const val = src[prop];
        if (prop !== 'raw_ref' && prop !== Symbol.toPrimitive && prop !== Symbol.toStringTag && typeof prop === 'string' && prop.length <= 3) {
            console.log('[WS-AUDIO] PHONEME_AUDIO_BANK[' + prop + '] =', val ? 'data:audio...' + String(val).substring(0, 30) : 'null/undefined');
        }
        return val;
    },
    has(_, prop) { const src = window.__ALLO_PHONEME_AUDIO_BANK; return src ? (prop in src) : false; },
    ownKeys() { const src = window.__ALLO_PHONEME_AUDIO_BANK; return src ? Reflect.ownKeys(src) : []; },
    getOwnPropertyDescriptor(_, prop) { const src = window.__ALLO_PHONEME_AUDIO_BANK; if (!src) return undefined; const d = Object.getOwnPropertyDescriptor(src, prop); if (d) { d.configurable = true; } return d; }
});
console.log('[WS-AUDIO] Bridge initialized. Parent audio available:', {
    INSTRUCTION: !!window.__ALLO_INSTRUCTION_AUDIO,
    ISOLATION: !!window.__ALLO_ISOLATION_AUDIO,
    PHONEME: !!window.__ALLO_PHONEME_AUDIO_BANK
});"""

if OLD_BRIDGE in c:
    c = c.replace(OLD_BRIDGE, NEW_BRIDGE)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Replaced static bridges with live Proxy bridges + debug logging')
else:
    print('SKIPPED: old bridge pattern not found')
    # Try to find what's there
    idx = c.find('INSTRUCTION_AUDIO = window')
    if idx > 0:
        print(f'  Found at char {idx}: {c[idx:idx+100]}')
