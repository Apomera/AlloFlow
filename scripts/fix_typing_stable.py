"""Fix: Stabilize onTyping callback to prevent SpeechBubble restart"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The problem: inline arrow function in onTyping creates new ref every render
# Fix: Add a useCallback-wrapped handler and use it in JSX

# Step 1: Add the stable callback after the speak function's closing
# Find a good insertion point - right after the speak useCallback
speak_end = '}, [selectedVoice, voiceSpeed, voiceVolume, onGenerateAudio]);'
speak_end_idx = content.find(speak_end)
if speak_end_idx < 0:
    print("ERROR: speak useCallback end not found")
    exit(1)

insert_pos = speak_end_idx + len(speak_end)
stable_callback = """
  const handleTypingState = useCallback((isTyping) => {
    if (isTyping) { setIsTalking(true); }
    else if (!currentAudioRef.current) { setIsTalking(false); }
  }, []);"""
content = content[:insert_pos] + stable_callback + content[insert_pos:]
print("Step 1: Stable handleTypingState callback added")

# Step 2: Replace the inline onTyping with the stable ref
old_typing = 'onTyping={(v) => { if (v) setIsTalking(true); else if (!currentAudioRef.current) setIsTalking(false); }}'
new_typing = 'onTyping={handleTypingState}'
if old_typing in content:
    content = content.replace(old_typing, new_typing)
    print("Step 2: onTyping now uses stable handleTypingState ref")
else:
    print("Step 2 SKIP: inline onTyping not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
