import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. UI: Visual Supports header bug fix
pattern_header = r"(activeView === 'image'\s*\?\s*<><ImageIcon className=\"text-purple-600\" size=\{20\} \/>\s*\{t\('visuals\.title'\)\}<\/>\s*:\s*\n\s*)(activeView === 'gemini-bridge')"
replacement_header = r"\1activeView === 'word-sounds-generator' ? <><Sparkles className=\"text-blue-600\" size={20} /> {t('output.word_sounds_studio') || 'Word Sounds Studio'}</> :\n                activeView === 'word-sounds' ? <><Sparkles className=\"text-blue-600\" size={20} /> {t('output.word_sounds_studio') || 'Word Sounds Studio'}</> :\n                \2"
content, c1 = re.subn(pattern_header, replacement_header, content)

# 2. Audio Ghost Loop Fix
pattern_audio_bank = r"(const audio = new Audio\(PHONEME_AUDIO_BANK\[text\]\);\s*\n\s*)(if \(playImmediately\))"
replacement_audio_bank = r"""if (currentActiveAudio.current) {
                 currentActiveAudio.current.pause();
                 currentActiveAudio.current.currentTime = 0;
                 currentActiveAudio.current = null;
             }
             \1currentActiveAudio.current = audio;
             audio.onended = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
             audio.onpause = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
             \2"""
content, c2 = re.subn(pattern_audio_bank, replacement_audio_bank, content)

# 3. Audio Adventure TTS Skip / Endless Retry Fix
pattern_playsequence_catch = r"(\} catch \(err\) \{\s*\n\s*if \(playbackSessionRef\.current === sessionId\) \{)(?:\s*if \(err\.message.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n\s*\})(\s*\})"
# Replacing all lines under `if (playbackSessionRef.current === sessionId) {` inside the `catch (err)`
# It's safer to do an exact string replacement for that block
exact_catch_block = """      } catch (err) {
          if (playbackSessionRef.current === sessionId) {
              if (err.message && err.message.includes("finishReason: OTHER")) {
                  setTimeout(() => {
                        playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1);
                  }, 500);
              } else {
                  warnLog("Critical Playback Error:", err);
                  if (retryCount < 2) {
                      setTimeout(() => {
                          playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1);
                      }, 500);
                  } else {
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker);
                  }
              }
          }
      }"""

replacement_catch_block = """      } catch (err) {
          if (playbackSessionRef.current === sessionId) {
              warnLog("Critical Playback Error, skipping sentence:", err);
              playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker);
          }
      }"""

if exact_catch_block in content:
    content = content.replace(exact_catch_block, replacement_catch_block)
    c3 = 1
else:
    c3 = 0
    print("WARNING: Could not find exact catch block for playSequence")

# 4. Another TTS Audio overlap fix: there's a third block in handleAudio (for external API TTS)
# Let's ensure the `currentActiveAudio` is set there too.
pattern_api_tts = r"(const audio = new Audio\(audioUrl\);\s*\n\s*)(if \(playImmediately\))"
replacement_api_tts = r"""if (currentActiveAudio.current) {
                         currentActiveAudio.current.pause();
                         currentActiveAudio.current.currentTime = 0;
                         currentActiveAudio.current = null;
                     }
                     \1currentActiveAudio.current = audio;
                     audio.onended = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
                     audio.onpause = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
                     \2"""
content, c4 = re.subn(pattern_api_tts, replacement_api_tts, content)

print(f"Replacements: Header({c1}), AudioBank({c2}), TTS_Retry({c3}), API_TTS({c4})")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ UI/Audio fixes successfully injected into AlloFlowANTI.txt")
