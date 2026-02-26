"""
Patch AlloFlowANTI.txt to:
1. Add _LOAD_INSTRUCTION_AUDIO_RAW calls for sound_match_start and mapping
2. Add mapping to INST_KEY_MAP
3. Add orthographic auto-cycling to Adaptive Director
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# === FIX 1: Add sound_match_start and mapping loading calls ===
old_load = "_LOAD_INSTRUCTION_AUDIO_RAW('inst_sound_scramble', getAudio('instructions', 'inst_sound_scramble'));"
new_load = """_LOAD_INSTRUCTION_AUDIO_RAW('inst_sound_scramble', getAudio('instructions', 'inst_sound_scramble'));
_LOAD_INSTRUCTION_AUDIO_RAW('sound_match_start', getAudio('instructions', 'sound_match_start'));
_LOAD_INSTRUCTION_AUDIO_RAW('mapping', getAudio('instructions', 'mapping'));"""

if old_load in content:
    content = content.replace(old_load, new_load, 1)
    changes += 1
    print("[OK] Added _LOAD_INSTRUCTION_AUDIO_RAW for sound_match_start and mapping")
else:
    print("[SKIP] inst_sound_scramble load line not found")

# === FIX 2: Add mapping to INST_KEY_MAP ===
old_map = """                word_families: 'inst_word_families',
            };"""
new_map = """                word_families: 'inst_word_families',
                mapping: 'mapping',
            };"""

if old_map in content:
    content = content.replace(old_map, new_map, 1)
    changes += 1
    print("[OK] Added mapping to INST_KEY_MAP")
else:
    print("[SKIP] INST_KEY_MAP end not found")

# === FIX 3: Add orthographic auto-cycling ===
# Currently at the end of phonological cycling, it jumps to 'orthography' only.
# We need to add ORTHO_ORDER cycling after the PHONO_ORDER section.
old_ortho = """} else if (includeOrthographic) {
                      // Transition to orthographic activities
                      setWordSoundsFeedback({
                          type: 'success',
                          message: ts('word_sounds.fb_spelling_transition') || "You're a pro! Testing your spelling now! \\u{1f441}\\ufe0f",
                      });
                      setTimeout(() => { if (isMountedRef.current) setWordSoundsActivity('orthography'); }, 2000);
                  }"""

new_ortho = """} else if (includeOrthographic) {
                      // Transition to orthographic activities with auto-cycling
                      const ORTHO_ORDER = ['orthography', 'mapping', 'spelling_bee', 'word_scramble', 'missing_letter'];
                      const orthoIdx = ORTHO_ORDER.indexOf(wordSoundsActivity);
                      if (orthoIdx >= 0 && orthoIdx < ORTHO_ORDER.length - 1) {
                          // Cycle through orthographic activities
                          const nextOrtho = ORTHO_ORDER[orthoIdx + 1];
                          setWordSoundsFeedback({
                              type: 'success',
                              message: ts('word_sounds.fb_spelling_transition') || `Great spelling! Let's try ${nextOrtho.replace(/_/g, ' ')}! \\u{1f3c6}`,
                          });
                          setWordSoundsScore(prev => ({ ...prev, streak: 0 }));
                          if (setWordSoundsStreak) setWordSoundsStreak(0);
                          autoDirectorCooldown.current = true;
                          setTimeout(() => {
                              if (!isMountedRef.current) return;
                              setWordSoundsActivity(nextOrtho);
                              setTimeout(() => { autoDirectorCooldown.current = false; }, 15000);
                          }, 2000);
                      } else if (orthoIdx === -1) {
                          // First transition from phonological to orthographic
                          setWordSoundsFeedback({
                              type: 'success',
                              message: ts('word_sounds.fb_spelling_transition') || "You're a pro! Testing your spelling now! \\u{1f441}\\ufe0f",
                          });
                          autoDirectorCooldown.current = true;
                          setTimeout(() => {
                              if (!isMountedRef.current) return;
                              setWordSoundsActivity('orthography');
                              setTimeout(() => { autoDirectorCooldown.current = false; }, 15000);
                          }, 2000);
                      }
                      // else: orthoIdx === last item => all complete, do nothing (session will end naturally)
                  }"""

if old_ortho in content:
    content = content.replace(old_ortho, new_ortho, 1)
    changes += 1
    print("[OK] Added orthographic auto-cycling to Adaptive Director")
else:
    # Try to find the section with a more flexible match
    print("[WARN] Exact ortho block not found, trying partial match...")
    # Check for the key identifier
    if "Testing your spelling now!" in content:
        print("  Found 'Testing your spelling now!' - the emoji encoding may differ")
    else:
        print("  'Testing your spelling now!' NOT found either")
    
    # Try without emoji
    if "fb_spelling_transition" in content:
        # Find the line
        for i, line in enumerate(content.split('\n')):
            if 'fb_spelling_transition' in line:
                print(f"  fb_spelling_transition found at line ~{i+1}: {line.strip()[:120]}")

# Save
with open(FILE, 'w', encoding='utf-8-sig') as f:
    f.write(content)

print(f"\nTotal changes applied: {changes}")
