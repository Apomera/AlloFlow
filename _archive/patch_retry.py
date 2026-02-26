import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 3. Audio Adventure TTS Skip / Endless Retry Fix
# Using regex to target the catch block precisely.
pattern_playsequence_catch = r"(\}\s*catch\s*\(err\)\s*\{\s*\n\s*if\s*\(playbackSessionRef\.current\s*===\s*sessionId\)\s*\{\s*\n\s*if\s*\(err\.message\s*&&\s*err\.message\.includes\(\"finishReason:\s*OTHER\"\)\)\s*\{\s*\n\s*setTimeout\(\(\)\s*=>\s*\{\s*\n\s*playSequence\(index,\s*sentences,\s*sessionId,\s*mode,\s*voiceMap,\s*activeSpeaker,\s*null,\s*retryCount\s*\+\s*1\);\s*\n\s*\},\s*500\);\s*\n\s*\}\s*else\s*\{\s*\n\s*warnLog\(\"Critical\s*Playback\s*Error:\",\s*err\);\s*\n\s*if\s*\(retryCount\s*<\s*2\)\s*\{\s*\n\s*setTimeout\(\(\)\s*=>\s*\{\s*\n\s*playSequence\(index,\s*sentences,\s*sessionId,\s*mode,\s*voiceMap,\s*activeSpeaker,\s*null,\s*retryCount\s*\+\s*1\);\s*\n\s*\},\s*500\);\s*\n\s*\}\s*else\s*\{\s*\n\s*playSequence\(index\s*\+\s*1,\s*sentences,\s*sessionId,\s*mode,\s*voiceMap,\s*activeSpeaker\);\s*\n\s*\}\s*\n\s*\}\s*\n\s*\})"

replacement_catch_block = r"""} catch (err) {
          if (playbackSessionRef.current === sessionId) {
              warnLog("Critical Playback Error, skipping sentence:", err);
              playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker);
          }
      }"""

content, c3 = re.subn(pattern_playsequence_catch, replacement_catch_block, content)

print(f"Replacements: TTS_Retry({c3})")

if c3 > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Adventure TTS Retry fix injected.")
else:
    print("❌ Failed to match TTS Retry block.")
