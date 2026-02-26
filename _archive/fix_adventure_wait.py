"""
Fix 1: Show the player's choice during the loading phase (don't null currentScene immediately)
Fix 2: Add TTS 401 retry logic
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# === Fix 1: Don't null currentScene during loading ===
# Instead of setting currentScene: null immediately, keep it visible so the
# student sees the scene while waiting. Also add a pendingChoice field so the
# UI can show "You chose: [choice]..." during the wait.
old_loading = """      currentScene: null,
      sceneImage: null,
      isLoading: true,
    }));"""

new_loading = """      sceneImage: null,
      isLoading: true,
      pendingChoice: normalizedChoice,
    }));"""

if old_loading in content:
    content = content.replace(old_loading, new_loading, 1)
    fixes += 1
    print("1a: Kept currentScene visible during loading, added pendingChoice")
else:
    print("1a: SKIP")

# === Fix 1b: Clear pendingChoice when new scene arrives ===
# When the Gemini response comes back and the new scene is set, clear pendingChoice.
# Find where currentScene is set after the Gemini response
old_scene_set = "      currentScene: data.scene || data,"
new_scene_set = "      currentScene: data.scene || data, pendingChoice: null,"

count = content.count(old_scene_set)
if count > 0:
    content = content.replace(old_scene_set, new_scene_set)
    fixes += 1
    print(f"1b: Added pendingChoice: null to {count} scene set locations")
else:
    print("1b: SKIP - trying alternate pattern")
    # Try searching for where sceneData/data is applied
    alt = "currentScene: data.scene || data,"
    if alt in content:
        content = content.replace(alt, alt + " pendingChoice: null,")
        fixes += 1
        print("1b alt: Added pendingChoice clear")

# === Fix 1c: Add the pendingChoice UI overlay in the adventure view ===
# Show "You chose: [choice]" with a loading spinner during the wait
# Find the loading indicator in the adventure view
old_loading_ui = "adventureState.isLoading && ("
# There could be multiple. Let me find the main one.
import re

# Find the adventure loading indicator
loading_matches = list(re.finditer(r'adventureState\.isLoading && \(', content))
print(f"Found {len(loading_matches)} isLoading UI matches")

# Actually, let me add the pendingChoice display at the point where currentScene is shown
# Better approach: find where the loading spinner renders and enhance it
# Search for the loading state display in the adventure view
loading_ui_match = re.search(r'adventureState\.isLoading && !\s*adventureState\.isGameOver', content)
if loading_ui_match:
    print(f"Found main loading UI at position {loading_ui_match.start()}")

# Instead of modifying the loading UI directly, let's add a pendingChoice display
# right before the loading spinner. Let me find the adventure loading display.
pending_ui_target = '{adventureState.isLoading && !adventureState.isGameOver'
idx = content.find(pending_ui_target)
if idx > 0:
    # Find the line start
    line_start = content.rfind('\n', 0, idx) + 1
    indent = ' ' * (idx - line_start)
    
    # Insert pendingChoice display BEFORE the loading check
    pending_display = f"""{indent}{{adventureState.pendingChoice && adventureState.isLoading && (
{indent}    <div className="p-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top duration-300">
{indent}        <div className="flex items-center gap-2 mb-1">
{indent}            <span className="text-amber-600 text-sm font-bold">⚔️ Your Choice:</span>
{indent}            <div className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full"></div>
{indent}        </div>
{indent}        <p className="text-amber-800 text-sm font-medium italic">"{adventureState.pendingChoice}"</p>
{indent}        <p className="text-amber-500 text-xs mt-1">The story unfolds...</p>
{indent}    </div>
{indent})}}
"""
    content = content[:line_start] + pending_display + content[line_start:]
    fixes += 1
    print("1c: Added pendingChoice display UI")
else:
    print("1c: SKIP - loading UI not found")

# === Fix 2: TTS 401 retry logic ===
# Currently 429 retries but 401 just throws. Add a single retry for 401 (often transient auth issues)
old_tts_401 = """            if (response.status === 429) {
              console.warn("[TTS] Rate limited (429). Will retry...");
              throw new Error("TTS Rate Limited (429)");
            }
            const errorBody = await response.text().catch(() => '');
            console.error("[TTS] API Error:", response.status, response.statusText, errorBody.substring(0, 200));
            throw new Error(`API Error: ${response.status} ${response.statusText}`);"""

new_tts_401 = """            if (response.status === 429) {
              console.warn("[TTS] Rate limited (429). Will retry...");
              throw new Error("TTS Rate Limited (429)");
            }
            if (response.status === 401 || response.status === 503) {
              console.warn(`[TTS] Transient error (${response.status}). Will retry after delay...`);
              await new Promise(r => setTimeout(r, 1500));
              throw new Error(`TTS Transient Error (${response.status})`);
            }
            const errorBody = await response.text().catch(() => '');
            console.error("[TTS] API Error:", response.status, response.statusText, errorBody.substring(0, 200));
            throw new Error(`API Error: ${response.status} ${response.statusText}`);"""

if old_tts_401 in content:
    content = content.replace(old_tts_401, new_tts_401, 1)
    fixes += 1
    print("2: Added TTS 401/503 retry with delay")
else:
    print("2: SKIP")

# === Fix 2b: Also check if there's a retry loop wrapping the TTS call ===
# Let me find the retry mechanism
retry_match = re.search(r'for\s*\(let\s+(?:attempt|retry|i)\s*=\s*0.*?callTTS|const\s+MAX_TTS_RETRIES', content)
if retry_match:
    print(f"Found retry loop at: {content[retry_match.start():retry_match.start()+80]}")
else:
    print("No existing TTS retry loop found — the throw will propagate up")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
