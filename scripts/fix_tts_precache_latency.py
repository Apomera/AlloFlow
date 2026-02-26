"""
TTS Pre-cache Latency Fix
=========================
Root cause: Redundant callTTS(w) fire-and-forget calls bypass handleAudio's cache,
jam the globalTtsQueue, and cause head-of-line blocking.

Fixes:
1. Remove 3 redundant callTTS fire-and-forget blocks (L8056, L8558, L8582)
2. Add globalTtsUrlCache to callTTS for URL-level memoization
3. Add diagnostic logging to handleAudio cache check
"""

import sys
import re

def main():
    filepath = 'AlloFlowANTI.txt'
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    fixes_applied = []
    
    # =========================================================================
    # FIX 1a: Remove redundant callTTS fire-and-forget for Rhyme (auto-play path)
    # Line ~8056
    # =========================================================================
    old_rhyme_autoplay = "// PRE-CACHE TTS: Fire-and-forget (FIX: don't block playback waiting for all TTS)\n                        Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w))).catch(e => debugLog(\"Rhyme TTS pre-cache error:\", e));\n                         for"
    new_rhyme_autoplay = "// PRE-CACHE REMOVED: handleAudio already caches during pre-load (see L6922/7074)\n                         for"
    
    if old_rhyme_autoplay in content:
        content = content.replace(old_rhyme_autoplay, new_rhyme_autoplay, 1)
        fixes_applied.append("1a: Removed redundant callTTS fire-and-forget (Rhyme auto-play path)")
    else:
        print("WARNING: Could not find Rhyme auto-play callTTS block")
        # Try alternate format
        alt = "Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w))).catch(e => debugLog(\"Rhyme TTS pre-cache error:\", e));"
        count = content.count(alt)
        print(f"  Found {count} instances of the callTTS line itself")

    # =========================================================================
    # FIX 1b: Remove redundant callTTS fire-and-forget for Blending (instruction path)
    # Line ~8558
    # =========================================================================
    old_blend_instr = "Promise.allSettled(effectiveBlendingOptions.map(w => callTTS(w))).catch(e => debugLog('Blending TTS pre-cache error:', e));"
    new_blend_instr = "// PRE-CACHE REMOVED: handleAudio already caches during pre-load (see L6922/7074)"
    
    if old_blend_instr in content:
        content = content.replace(old_blend_instr, new_blend_instr, 1)
        fixes_applied.append("1b: Removed redundant callTTS fire-and-forget (Blending instruction path)")
    else:
        print("WARNING: Could not find Blending instruction callTTS block")

    # =========================================================================
    # FIX 1c: Remove redundant callTTS fire-and-forget for Rhyme (instruction path)
    # Line ~8582
    # =========================================================================
    old_rhyme_instr = "// PRE-CACHE TTS: Fire-and-forget (FIX: don't block playback waiting for all TTS)\n                        Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w))).catch(e => debugLog('Rhyme TTS pre-cache error:', e));"
    new_rhyme_instr = "// PRE-CACHE REMOVED: handleAudio already caches during pre-load (see L6922/7074)"
    
    if old_rhyme_instr in content:
        content = content.replace(old_rhyme_instr, new_rhyme_instr, 1)
        fixes_applied.append("1c: Removed redundant callTTS fire-and-forget (Rhyme instruction path)")
    else:
        print("WARNING: Could not find Rhyme instruction callTTS block")

    # =========================================================================
    # FIX 2: Add globalTtsUrlCache near globalTtsQueue declaration (L142)
    # =========================================================================
    old_global = "let globalTtsQueue = Promise.resolve();"
    new_global = "let globalTtsQueue = Promise.resolve();\nlet globalTtsUrlCache = new Map(); // URL-level TTS cache (prevents duplicate API calls for same text)"
    
    if old_global in content and 'globalTtsUrlCache' not in content:
        content = content.replace(old_global, new_global, 1)
        fixes_applied.append("2a: Added globalTtsUrlCache declaration")
    elif 'globalTtsUrlCache' in content:
        print("INFO: globalTtsUrlCache already exists, skipping declaration")
    else:
        print("WARNING: Could not find globalTtsQueue declaration")

    # =========================================================================
    # FIX 2b: Add cache check + store inside callTTS (L42525)
    # =========================================================================
    old_calltts_entry = """  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {
      // console.log("[callTTS] ▶ ENTRY. text:", text?.substring(0, 40), "voice:", voiceName, "muted:", isGlobalMuted());
      // Global mute check - return silent placeholder
      if (isGlobalMuted()) {
          // console.log('[TTS] Skipped due to global mute');
          return null; // Callers should handle null gracefully
      }
      let lastError = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
              // console.log("debug: callTTS attempt", attempt + 1);
              const ttsResult = await fetchTTSBytes(text, voiceName, speed);"""
    
    new_calltts_entry = """  const callTTS = useCallback(async (text, voiceName = "Puck", speed = 1, maxRetries = 2) => {
      // Global mute check - return silent placeholder
      if (isGlobalMuted()) {
          return null; // Callers should handle null gracefully
      }
      // FIX: URL-level cache check (prevents duplicate API calls for same text)
      const cacheKey = `${(text || '').toLowerCase().trim()}__${voiceName}__${speed}`;
      if (globalTtsUrlCache.has(cacheKey)) {
          debugLog("⚡ callTTS cache HIT:", text?.substring(0, 30));
          return globalTtsUrlCache.get(cacheKey);
      }
      let lastError = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
              const ttsResult = await fetchTTSBytes(text, voiceName, speed);"""
    
    if old_calltts_entry in content:
        content = content.replace(old_calltts_entry, new_calltts_entry, 1)
        fixes_applied.append("2b: Added URL cache check at callTTS entry")
    else:
        print("WARNING: Could not find callTTS entry block for cache check injection")

    # =========================================================================
    # FIX 2c: Store in cache after successful URL creation in callTTS
    # =========================================================================
    old_calltts_return = """              const url = URL.createObjectURL(blob);
              // console.log("[callTTS] ✅ SUCCESS! Audio URL created:", url?.substring(0, 50));
              return url;"""
    
    new_calltts_return = """              const url = URL.createObjectURL(blob);
              // FIX: Cache the URL for future calls with same text
              globalTtsUrlCache.set(cacheKey, url);
              return url;"""
    
    if old_calltts_return in content:
        content = content.replace(old_calltts_return, new_calltts_return, 1)
        fixes_applied.append("2c: Added URL cache store after callTTS success")
    else:
        print("WARNING: Could not find callTTS return block for cache store injection")

    # =========================================================================
    # FIX 3: Add diagnostic logging to handleAudio cache check (L4990)
    # =========================================================================
    old_cache_check = """        // 1. Check Active Object Cache (Fastest - Instant Playback)
        if (audioInstances.current.has(text)) {
            if (playImmediately) {
                await playInstance(audioInstances.current.get(text));
            }
            return;
        }"""
    
    new_cache_check = """        // 1. Check Active Object Cache (Fastest - Instant Playback)
        if (audioInstances.current.has(text)) {
            debugLog("⚡ audioInstances HIT:", text);
            if (playImmediately) {
                await playInstance(audioInstances.current.get(text));
            }
            return;
        }"""
    
    if old_cache_check in content:
        content = content.replace(old_cache_check, new_cache_check, 1)
        fixes_applied.append("3: Added diagnostic logging to handleAudio cache check")
    else:
        print("WARNING: Could not find handleAudio cache check block")

    # =========================================================================
    # Summary
    # =========================================================================
    if not fixes_applied:
        print("\n❌ No fixes could be applied. Please check the file manually.")
        return
    
    print(f"\n✅ Applied {len(fixes_applied)} fixes:")
    for fix in fixes_applied:
        print(f"  • {fix}")
    
    # Verify no duplicate declarations
    cache_count = content.count('globalTtsUrlCache')
    print(f"\n  globalTtsUrlCache references: {cache_count}")
    
    # Write
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n  File written: {filepath}")
    print(f"  Size: {len(content):,} bytes")

if __name__ == '__main__':
    main()
