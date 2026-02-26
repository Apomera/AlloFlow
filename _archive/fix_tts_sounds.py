"""
Fix 3 TTS/sound issues:
1. Add anti-sound-effect prefix to TTS calls (prevent whistling, etc.)
2. Include adventure options in auto-read
3. Fix transition sound by triggering it on scene change
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# === Fix 1: Add anti-sound-effect sanitization to TTS ===
# In the Gemini TTS payload, prefix text with instruction to read aloud
# This prevents the model from performing sound effects
old_tts_payload = """contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }"""

new_tts_payload = """contents: [{ parts: [{ text: (text.length > 10 ? 'Read the following text aloud naturally, do not perform sound effects or noises: ' : '') + text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }"""

if old_tts_payload in content:
    content = content.replace(old_tts_payload, new_tts_payload, 1)
    fixes += 1
    print("1: Added anti-sound-effect prefix to Gemini TTS")
else:
    print("1: SKIP")

# === Fix 2: Include adventure options in auto-read ===
# Currently only reads currentScene.text. Add options after the scene text.
old_autoread = """      if (adventureState.currentScene) {
          textToSpeak += adventureState.currentScene.text;
      }"""

new_autoread = """      if (adventureState.currentScene) {
          textToSpeak += adventureState.currentScene.text;
          const sceneOpts = adventureState.currentScene.options;
          if (Array.isArray(sceneOpts) && sceneOpts.length > 0) {
              textToSpeak += '. Your choices are: ' + sceneOpts.map((opt, i) => (typeof opt === 'string' ? `${i+1}. ${opt}` : `${i+1}. ${opt.action || opt.text || opt}`)).join('. ') + '.';
          }
      }"""

if old_autoread in content:
    content = content.replace(old_autoread, new_autoread, 1)
    fixes += 1
    print("2: Added options to auto-read")
else:
    print("2: SKIP")

# === Fix 3: Fix transition sound ===
# The transition sound relies on sceneText changing in AdventureAmbience.
# Since we no longer null currentScene, sceneText stays the same briefly.
# Fix: play the transition sound directly in the adventure update handler 
# after a new scene arrives, instead of relying on the ambience component.
# Find where the new scene is applied in the pendingAdventureUpdate handler.
old_transition_trigger = """        playAdventureEventSound('transition');
        const masterGain = ctx.createGain();"""

# This is in AdventureAmbience. Let's keep it, but also ensure it triggers.
# The real fix is to make AdventureAmbience detect scene changes properly.
# It uses sceneText as a dependency. Since we don't null it, we need to use
# a scene counter or turnCount instead.

# Let's look at the AdventureAmbience component's useEffect dependencies
old_ambience_deps = """if (!active || !sceneText) {
            cleanup();
            return;
        }"""

# Actually, the better fix is to play the transition sound directly when
# the new scene data arrives in the update handler. Let me find it.

# Find where scenes are set in the pendingAdventureUpdate handler
# This is in the useEffect that processes pendingAdventureUpdate
import re
match = re.search(r'playAdventureEventSound\(\'critical_success\'\);\s*\r?\n.*?currentScene: data\.scene,', content, re.DOTALL)
if match:
    print(f"  Found scene set after event sound at position {match.start()}")

# Actually, the simplest fix: play transition sound in handleAdventureChoice 
# when the response comes back. Let me find where isLoading is set to false 
# after Gemini responds.
# The response handler sets currentScene: data.scene. Let's add a transition 
# sound right before that.
# Since playAdventureEventSound('transition') is already called by the ambience
# component, the issue is that sceneText doesn't change. Let's add the sound
# directly in the choice handler's success path.

# Find the first currentScene set in the choice handler response (around line 45900)
old_scene_response_1 = "              currentScene: data.scene, pendingChoice: null,"
# Count occurrences
count = content.count(old_scene_response_1)
print(f"Found {count} occurrences of scene set with pendingChoice: null")

# Instead of modifying all of them, let's play the transition sound right when
# the state is about to be updated with the new scene.
# Let me find a unique pattern near the scene set in the choice handler.

# Actually, the cleanest approach: in the auto-read useEffect, add a separate 
# mechanism to track when the scene changes and play the transition sound.
# OR simply add a playAdventureEventSound('transition') call to the 
# setAdventureState that happens in the choice handler response.

# Let me add it before the setAdventureState in the choice handler:
# Find a unique landmark in the choice handler response
old_choice_response = """          const xpDelta = data.xp || 0;
          const energyDelta = data.energyDelta || data.energy_delta || 0;"""

if old_choice_response in content:
    new_choice_response = """          playAdventureEventSound('transition');
          const xpDelta = data.xp || 0;
          const energyDelta = data.energyDelta || data.energy_delta || 0;"""
    content = content.replace(old_choice_response, new_choice_response, 1)
    fixes += 1
    print("3: Added transition sound when new scene data arrives in choice handler")
else:
    print("3: SKIP - looking for alternate pattern")
    # Try wider search
    alt_match = re.search(r'const xpDelta = data\.xp \|\| 0;', content)
    if alt_match:
        pos = alt_match.start()
        # Find the line start
        line_start = content.rfind('\n', 0, pos) + 1
        indent = pos - line_start
        insert = ' ' * indent + "playAdventureEventSound('transition');\n"
        content = content[:line_start] + insert + content[line_start:]
        fixes += 1
        print("3b: Added transition sound (alt approach)")
    else:
        print("3b: SKIP - no xpDelta found")

# Also add transition sound in the debate mode handler
alt_match2 = re.search(r'const safeXpDelta = data\.xp \|\| 0;', content)
if alt_match2:
    pos2 = alt_match2.start()
    line_start2 = content.rfind('\n', 0, pos2) + 1
    indent2 = pos2 - line_start2
    insert2 = ' ' * indent2 + "playAdventureEventSound('transition');\n"
    content = content[:line_start2] + insert2 + content[line_start2:]
    fixes += 1
    print("3c: Added transition sound for debate handler too")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
