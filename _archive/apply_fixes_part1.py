import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. UI Fix: Adventure Shop Screen Layout (CSS flex/overflow-y-auto on description)
old_shop_desc = 'className="text-slate-500 text-xs leading-relaxed mb-4 min-h-[2.5em] flex-1"'
new_shop_desc = 'className="text-slate-500 text-xs leading-relaxed mb-4 min-h-[2.5em] flex-1 overflow-y-auto custom-scrollbar"'
if old_shop_desc in content:
    content = content.replace(old_shop_desc, new_shop_desc, 1)
    print("✅ 1. Fixed Adventure Shop CSS Layout")
    changes += 1
else:
    print("❌ 1. Failed to find Adventure Shop CSS anchor")

# 2. UI Fix: Word Sounds getDefaultTitle mapping
old_title_switch = """          case 'persona': return t('persona.title');
          default: return t('common.resource') || 'Resource';"""
new_title_switch = """          case 'persona': return t('persona.title');
          case 'word-sounds': return t('output.word_sounds_studio') || 'Word Sounds Studio';
          default: return t('common.resource') || 'Resource';"""
if old_title_switch in content:
    content = content.replace(old_title_switch, new_title_switch, 1)
    print("✅ 2. Added word-sounds to getDefaultTitle")
    changes += 1
else:
    print("❌ 2. Failed to find getDefaultTitle anchor")

# 3. UI/State Fix: Word Sounds History Clean Remount
old_ws_restore = """      if (item.type === 'word-sounds') {
          console.error("[WS-DBG] handleRestoreView: word-sounds detected, isWordSoundsMode->true");
          setIsWordSoundsMode(true);
           setCurrentWordSoundsWord(null);
           setWordSoundsActivity(null);
          if (item.wsPreloadedWords && Array.isArray(item.wsPreloadedWords) && item.wsPreloadedWords.length > 0) {"""
new_ws_restore = """      if (item.type === 'word-sounds') {
          console.error("[WS-DBG] handleRestoreView: word-sounds detected, isWordSoundsMode->true");
          setIsWordSoundsMode(false);
          setTimeout(() => {
              setIsWordSoundsMode(true);
              setCurrentWordSoundsWord(null);
              setWordSoundsActivity(null);
              setWordSoundsAutoReview(true);
          }, 0);
          if (item.wsPreloadedWords && Array.isArray(item.wsPreloadedWords) && item.wsPreloadedWords.length > 0) {"""
if old_ws_restore in content:
    content = content.replace(old_ws_restore, new_ws_restore, 1)
    print("✅ 3. Implemented Word Sounds Clean Remount in History")
    changes += 1
else:
    print("❌ 3. Failed to find Word Sounds Restore anchor")

# 4. Audio Fix: Word Sounds Double TTS handling via handleAudio
old_handle_audio = """    const handleAudio = React.useCallback(async (input, playImmediately = true) => {
        if (!input) { warnLog("handleAudio called with null input"); return Promise.resolve(); }
        const textToPlay = (typeof input === 'object' && input.word) ? input.word : input;
        if (typeof textToPlay === 'string' && textToPlay.startsWith('data:audio')) {
             const audio = new Audio(textToPlay);
             if (playImmediately) {"""
new_handle_audio = """    // State/Cleanup for Audio Concurrency
    const currentActiveAudio = React.useRef(null);
    const handleAudio = React.useCallback(async (input, playImmediately = true) => {
        if (!input) { warnLog("handleAudio called with null input"); return Promise.resolve(); }
        const textToPlay = (typeof input === 'object' && input.word) ? input.word : input;
        if (typeof textToPlay === 'string' && textToPlay.startsWith('data:audio')) {
             if (currentActiveAudio.current) {
                 currentActiveAudio.current.pause();
                 currentActiveAudio.current.currentTime = 0;
                 currentActiveAudio.current = null;
             }
             const audio = new Audio(textToPlay);
             currentActiveAudio.current = audio;
             audio.onended = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
             audio.onpause = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
             if (playImmediately) {"""
if old_handle_audio in content:
    content = content.replace(old_handle_audio, new_handle_audio, 1)
    print("✅ 4. Implemented Double TTS Prevention in handleAudio")
    changes += 1
else:
    print("❌ 4. Failed to find handleAudio anchor")


# 5. Audio Fix: Adventure Mode handleSpeak TTS Skipping (Resilient retry limit, not aggressive)
old_handle_playback_error = """          const handlePlaybackError = (err) => {
              warnLog(`Playback error at index ${index} (Retry ${retryCount}):`, err);
              if (audioUrl) {
                  releaseBlob(audioUrl);
                  delete audioBufferRef.current[bufferKey];
              }
              if (playbackSessionRef.current === sessionId) {
                  const isRefusal = err.isModelRefusal || (err.message && err.message.includes("Refusal"));
                  if (!isRefusal && retryCount < 2) {
                      debugLog(`Retrying segment ${index}...`);
                      setTimeout(() => {
                          playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1);
                      }, 250);
                  } else {
                      warnLog(`Segment ${index} failed/skipped.`);
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker);
                  }
              }
          };"""
new_handle_playback_error = """          const handlePlaybackError = (err) => {
              warnLog(`Playback error at index ${index} (Retry ${retryCount}):`, err);
              if (audioUrl) {
                  releaseBlob(audioUrl);
                  delete audioBufferRef.current[bufferKey];
              }
              if (playbackSessionRef.current === sessionId) {
                  // If it's a refusal OR an AbortError from an overlapping play call, skip immediately.
                  const isRefusal = err.isModelRefusal || (err.message && err.message.includes("Refusal"));
                  const isAbort = err.name === 'AbortError' || err.name === 'NotAllowedError';
                  // Let's ensure text chunks retry cleanly.
                  if (!isRefusal && !isAbort && retryCount < 2) {
                      debugLog(`Retrying segment ${index}...`);
                      setTimeout(() => {
                          playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1);
                      }, 1000); // Back off 1 second to avoid hammering Gemini API
                  } else {
                      warnLog(`Segment ${index} definitively failed/skipped.`);
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker);
                  }
              }
          };"""
if old_handle_playback_error in content:
    content = content.replace(old_handle_playback_error, new_handle_playback_error, 1)
    print("✅ 5. Updated handlePlaybackError handling for selective retry")
    changes += 1
else:
    print("❌ 5. Failed to find handlePlaybackError anchor")


# Write back
if changes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nSuccessfully wrote {changes} changes to AlloFlowANTI.txt")
else:
    print("\nNo changes were applied.")

