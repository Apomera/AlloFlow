"""
Fix remaining Part A edit: add labelChallengeResults localStorage persistence.
The previous script correctly applied A1, A2, A3, A5 but A4 failed.
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_a4():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # The actual target in the file (LF-only, confirmed by character analysis)
    target = "      try { localStorage.setItem('allo_game_completions', JSON.stringify(gameCompletions)); } catch(e) { warnLog('localStorage write failed', e); }\n\n  }, [gameCompletions, lzLoaded]);"

    replacement = "      try { localStorage.setItem('allo_game_completions', JSON.stringify(gameCompletions)); } catch(e) { warnLog('localStorage write failed', e); }\n      try { localStorage.setItem('allo_label_challenge_results', JSON.stringify(labelChallengeResults)); } catch(e) { warnLog('localStorage write failed', e); }\n\n  }, [gameCompletions, labelChallengeResults, lzLoaded]);"

    if target in content:
        content = content.replace(target, replacement, 1)
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ A4: Added labelChallengeResults localStorage persistence")
        return True
    else:
        # Debug: find the line
        idx = content.find("allo_game_completions', JSON.stringify(gameCompletions)")
        if idx > 0:
            snippet = repr(content[idx-10:idx+200])
            print(f"Found allo_game_completions at offset {idx}")
            print(f"Context: {snippet}")
        else:
            print("❌ Could not find allo_game_completions string at all")
        return False

if __name__ == '__main__':
    success = apply_a4()
    sys.exit(0 if success else 1)
