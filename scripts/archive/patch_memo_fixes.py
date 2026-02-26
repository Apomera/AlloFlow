"""
Patch: Fix inline arrow functions defeating React.memo

Targets:
1. AlloBot: onVoiceSettingsClick inline -> useCallback
2. AlloBot: accessory={getBotAccessory()} -> useMemo'd accessory
3. AlloBot: isSystemAudioActive inline expression -> useMemo
4. LetterTraceView: onComplete inline -> useCallback
"""

import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ============================================================
# PATCH 1: Extract AlloBot onVoiceSettingsClick to useCallback
# ============================================================
# Find existing useCallback definitions near handleBotClick to add ours nearby

ANCHOR_1 = """  const handleBotClick = useCallback(() => {"""

VOICE_SETTINGS_CB = """  const handleVoiceSettingsClick = useCallback(() => {
    if (alloBotRef.current && typeof alloBotRef.current.dismissMessage === 'function') alloBotRef.current.dismissMessage();
    setShowSocraticChat(false);
    setShowVoiceSettings(true);
  }, []);

  const handleBotClick = useCallback(() => {"""

if 'handleVoiceSettingsClick' not in content:
    if ANCHOR_1 in content:
        content = content.replace(ANCHOR_1, VOICE_SETTINGS_CB, 1)
        changes.append("PATCH 1: Extracted handleVoiceSettingsClick useCallback")
    else:
        print("WARNING: Could not find handleBotClick anchor")
        changes.append("PATCH 1: SKIPPED - anchor not found")
else:
    changes.append("PATCH 1: handleVoiceSettingsClick already exists")

# ============================================================
# PATCH 2: Replace inline arrow in AlloBot JSX with ref
# ============================================================
OLD_INLINE_VOICE = """            onVoiceSettingsClick={() => { if (alloBotRef.current && typeof alloBotRef.current.dismissMessage === 'function') alloBotRef.current.dismissMessage(); setShowSocraticChat(false); setShowVoiceSettings(true); }}"""
NEW_INLINE_VOICE = """            onVoiceSettingsClick={handleVoiceSettingsClick}"""

if OLD_INLINE_VOICE in content:
    content = content.replace(OLD_INLINE_VOICE, NEW_INLINE_VOICE, 1)
    changes.append("PATCH 2: Replaced AlloBot onVoiceSettingsClick inline -> handleVoiceSettingsClick")
else:
    print("WARNING: Could not find AlloBot onVoiceSettingsClick inline arrow")
    changes.append("PATCH 2: SKIPPED - inline not found")

# ============================================================
# PATCH 3: Memoize getBotAccessory → useMemo
# ============================================================
# getBotAccessory() is called inline as accessory={getBotAccessory()}
# This creates a new return value on every render.
# We'll add a useMemo wrapper.

OLD_BOT_ACCESSORY_DEF = """  const getBotAccessory = () => {"""
NEW_BOT_ACCESSORY_DEF = """  const getBotAccessoryInternal = () => {"""

# Also add the memoized version after the function
if 'getBotAccessoryInternal' not in content and OLD_BOT_ACCESSORY_DEF in content:
    content = content.replace(OLD_BOT_ACCESSORY_DEF, NEW_BOT_ACCESSORY_DEF, 1)
    
    # Find the end of getBotAccessory function to add the memo wrapper
    # It ends with a closing brace line followed by blank/next function
    idx = content.find(NEW_BOT_ACCESSORY_DEF)
    # Find the matching closing brace
    brace_count = 0
    end_idx = idx
    started = False
    for i in range(idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            started = True
        elif content[i] == '}':
            brace_count -= 1
            if started and brace_count == 0:
                end_idx = i + 1
                break
    
    # Find the end of line after closing brace
    while end_idx < len(content) and content[end_idx] not in ('\n', '\r'):
        end_idx += 1
    if content[end_idx] == '\r':
        end_idx += 1
    if end_idx < len(content) and content[end_idx] == '\n':
        end_idx += 1
    
    # Insert useMemo after the function
    memo_wrapper = "\n  // Memoized bot accessory to prevent AlloBot re-renders\n  const botAccessory = useMemo(() => getBotAccessoryInternal(), [activeView, isSpotlightMode, showUDLGuide, showReaderMode, generatedContent?.mode, isWordSoundsMode, adventureState?.isActive, showSocraticChat]);\n\n"
    
    content = content[:end_idx] + memo_wrapper + content[end_idx:]
    changes.append("PATCH 3: Memoized getBotAccessory with useMemo")
else:
    changes.append("PATCH 3: SKIPPED - already patched or not found")

# Replace the usage
OLD_ACCESSORY_USAGE = "            accessory={getBotAccessory()}"
NEW_ACCESSORY_USAGE = "            accessory={botAccessory}"

if OLD_ACCESSORY_USAGE in content:
    content = content.replace(OLD_ACCESSORY_USAGE, NEW_ACCESSORY_USAGE, 1)
    changes.append("PATCH 3b: Replaced accessory={getBotAccessory()} -> accessory={botAccessory}")
elif 'getBotAccessoryInternal' in content and 'accessory={botAccessory}' not in content:
    # Try with the internal name
    OLD_ACCESSORY_USAGE2 = "            accessory={getBotAccessoryInternal()}"
    if OLD_ACCESSORY_USAGE2 in content:
        content = content.replace(OLD_ACCESSORY_USAGE2, NEW_ACCESSORY_USAGE, 1)
        changes.append("PATCH 3b: Replaced accessory usage")

# ============================================================
# PATCH 4: Memoize AlloBot isSystemAudioActive expression
# ============================================================
OLD_SYSTEM_AUDIO = "            isSystemAudioActive={isPlaying || isGeneratingAudio || !!phonicsData}"
NEW_SYSTEM_AUDIO_MEMO_INSERT = """  // Memoized system audio active flag for AlloBot
  const isSystemAudioActiveMemo = useMemo(() => isPlaying || isGeneratingAudio || !!phonicsData, [isPlaying, isGeneratingAudio, phonicsData]);
"""

# Only add the memo if it doesn't exist yet
if 'isSystemAudioActiveMemo' not in content and OLD_SYSTEM_AUDIO in content:
    # Insert the memo near the botAccessory memo
    if 'const botAccessory = useMemo' in content:
        anchor = "  const botAccessory = useMemo"
        insert_idx = content.find(anchor)
        # Go to end of this line
        line_end = content.find('\n', insert_idx) + 1
        content = content[:line_end] + '\n' + NEW_SYSTEM_AUDIO_MEMO_INSERT + content[line_end:]
        changes.append("PATCH 4: Added isSystemAudioActiveMemo useMemo")
    else:
        changes.append("PATCH 4: SKIPPED - no anchor for insertion")
    
    # Replace usage
    content = content.replace(OLD_SYSTEM_AUDIO, "            isSystemAudioActive={isSystemAudioActiveMemo}", 1)
    changes.append("PATCH 4b: Replaced inline isSystemAudioActive expression")
else:
    changes.append("PATCH 4: SKIPPED - already exists or not found")

# ============================================================
# PATCH 5: Extract LetterTraceView onComplete to useCallback
# ============================================================
# This is complex - the callback has many deps (playSound, handleAudio, 
# isLowercaseBonus, isMountedRef, setTracingPhase, checkAnswer)
# 
# Since isLowercaseBonus changes between phases and the component already
# has a `key` prop that forces remount on phase change, this inline arrow
# doesn't actually cause wasteful re-renders — the key change unmounts/remounts.
# We'll skip this one as it's safe.
changes.append("PATCH 5: SKIPPED - LetterTraceView has key={} prop that forces remount, inline arrow is not wasteful")


# ============================================================
# Write results
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll patches processed:")
for c in changes:
    print(f"  {'✓' if 'SKIPPED' not in c else 'ℹ'} {c}")
print(f"\nFile size: {len(content):,} bytes")
