"""
Comprehensive TTS fix patch:
1. Fix Proxy invariant violation (getOwnPropertyDescriptor must return configurable:true)
2. Remove redundant backup prefetcher useEffect
3. Disable Play Word button while !ttsReady
4. Add in-flight TTS request deduplication
"""
import re

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
fixes_applied = []

# ============================================================
# FIX 1: Proxy invariant violation
# Replace all 3 getOwnPropertyDescriptor traps to force configurable:true
# ============================================================

# Pattern: return Reflect.getOwnPropertyDescriptor(_CACHE_XXX, prop);
# Replace with version that overrides configurable to true
old_gOPD = [
    'return Reflect.getOwnPropertyDescriptor(_CACHE_INSTRUCTION_AUDIO, prop);',
    'return Reflect.getOwnPropertyDescriptor(_CACHE_ISOLATION_AUDIO, prop);',
    'return Reflect.getOwnPropertyDescriptor(_CACHE_PHONEME_AUDIO_BANK, prop);'
]

for old_line in old_gOPD:
    cache_var = old_line.split('(')[1].split(',')[0]
    new_line = f'const desc = Reflect.getOwnPropertyDescriptor({cache_var}, prop); if (desc) {{ desc.configurable = true; desc.writable = true; }} return desc;'
    if old_line in content:
        content = content.replace(old_line, new_line, 1)
        fixes_applied.append(f"Fixed getOwnPropertyDescriptor for {cache_var}")
    else:
        print(f"WARNING: Could not find: {old_line[:60]}...")

# ============================================================
# FIX 2: Remove redundant backup prefetcher useEffect (lines ~6061-6100)
# ============================================================

# Find the backup prefetcher block
backup_pattern = r'(    // FIX: Active Audio Prefetcher for Preloaded Words\n    // Ensures audio is available even if we skipped the blocking preloadInitialBatch\n    // PERF: Early return if no preloaded words\n    React\.useEffect\(\(\) => \{)'
backup_match = re.search(backup_pattern, content)

if backup_match:
    # Find the full useEffect block - look for the closing }, [...]); 
    start = backup_match.start()
    # Find the dependency array closing
    dep_pattern = r'\}, \[preloadedWords, handleAudio, setWsPreloadedWords\]\);'
    dep_match = re.search(dep_pattern, content[start:])
    if dep_match:
        end = start + dep_match.end()
        old_block = content[start:end]
        # Comment it out
        commented = '    // REMOVED: Redundant backup prefetcher - preloadInitialBatch already handles TTS pre-loading\n    // This was causing duplicate TTS calls and race conditions with Play Word button\n'
        content = content[:start] + commented + content[end:]
        fixes_applied.append("Removed redundant backup prefetcher useEffect")
    else:
        print("WARNING: Could not find backup prefetcher closing")
else:
    print("WARNING: Could not find backup prefetcher block")

# ============================================================
# FIX 3: Disable Play Word button while !ttsReady
# ============================================================

old_disabled = 'disabled={playingWordIndex !== null}'
new_disabled = 'disabled={playingWordIndex !== null || !word.ttsReady}'

count = content.count(old_disabled)
if count > 0:
    # Only replace the first occurrence (the Play Word button)
    content = content.replace(old_disabled, new_disabled, 1)
    fixes_applied.append(f"Disabled Play Word button when !ttsReady (found {count} occurrences, replaced first)")
else:
    print("WARNING: Could not find disabled={playingWordIndex !== null}")

# ============================================================
# FIX 4: In-flight TTS deduplication
# Add a ttsInflight Map and check it before calling callTTS
# ============================================================

# Find the ttsFailureCount ref to add our new ref nearby
old_ref = "const ttsFailureCount = React.useRef(0); // Track consecutive TTS failures for quota handling"
new_ref = old_ref + "\n    const ttsInflight = React.useRef(new Map()); // Track in-flight TTS requests to prevent duplicates"

if old_ref in content:
    content = content.replace(old_ref, new_ref, 1)
    fixes_applied.append("Added ttsInflight ref for request deduplication")
else:
    print("WARNING: Could not find ttsFailureCount ref")

# Now wrap the TTS call at step 5b with dedup logic
old_tts_call = """        // 5b. Full words can still use TTS (any language)
        if (callTTS && selectedVoice && !isPhoneme) {
            try {
                const url = await callTTS(text, selectedVoice);
                if (url) {
                    saveAudioToStorage(text, url);
                    return loadAndPlay(url);
                }
            } catch (e) {
                console.warn("TTS Failed", e);
            }
        }"""

new_tts_call = """        // 5b. Full words can still use TTS (any language)
        if (callTTS && selectedVoice && !isPhoneme) {
            // DEDUP: Check if TTS is already in-flight for this text
            if (ttsInflight.current.has(text)) {
                debugLog("⏳ TTS already in-flight for:", text, "- awaiting existing request");
                try {
                    const url = await ttsInflight.current.get(text);
                    if (url && playImmediately) { return loadAndPlay(url); }
                    setIsPlayingAudio(false);
                    return;
                } catch(e) { console.warn("In-flight TTS failed", e); }
            }
            try {
                const ttsPromise = callTTS(text, selectedVoice);
                ttsInflight.current.set(text, ttsPromise);
                const url = await ttsPromise;
                ttsInflight.current.delete(text);
                if (url) {
                    saveAudioToStorage(text, url);
                    return loadAndPlay(url);
                }
            } catch (e) {
                ttsInflight.current.delete(text);
                console.warn("TTS Failed", e);
            }
        }"""

if old_tts_call in content:
    content = content.replace(old_tts_call, new_tts_call, 1)
    fixes_applied.append("Added in-flight TTS request deduplication")
else:
    print("WARNING: Could not find TTS call block for dedup")

# Write result
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*60}")
print(f"Patch complete! {len(fixes_applied)} fixes applied:")
for i, fix in enumerate(fixes_applied, 1):
    print(f"  {i}. {fix}")
print(f"\nFile size: {len(content):,} bytes (delta: {len(content) - original_len:+,})")
print(f"{'='*60}")
