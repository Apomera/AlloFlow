"""
Apply Student Data Export Expansion edits to AlloFlowANTI.txt

Part A: Persist missing data
  A1. Add labelChallengeResults state variable
  A2. Add socraticChatHistory + labelChallengeResults + wordSoundsScore to save payload
  A3. Update Label Challenge XP from score/10 to score/2 (max 50) + persist results
"""
import re
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def read_file():
    with open(FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

def apply_edits():
    content = read_file()
    edits_applied = 0

    # ============================================================
    # A1: Add labelChallengeResults state after gameCompletions
    # ============================================================
    target_a1 = """  });
  // NEW: Track escape room completions"""
    
    replacement_a1 = """  });
  // NEW: Track label challenge results for dashboard export
  const [labelChallengeResults, setLabelChallengeResults] = useState(() => {
      if (typeof window !== 'undefined') {
          try {
              const saved = localStorage.getItem('allo_label_challenge_results');
              if (saved) return JSON.parse(saved);
          } catch (e) { warnLog("Failed to load label challenge results", e); }
      }
      return [];
  });
  // NEW: Track escape room completions"""

    if target_a1 in content:
        content = content.replace(target_a1, replacement_a1, 1)
        edits_applied += 1
        print("✅ A1: Added labelChallengeResults state variable")
    else:
        print("❌ A1: Could not find target for labelChallengeResults state")

    # ============================================================
    # A2: Add socratic + labelChallenge + wordSoundsScore to save payload
    # ============================================================
    target_a2 = """              // Word Sounds & Analytics Persistence
              gameCompletions: gameCompletions,
              wordSoundsState: {
                  history: wordSoundsHistory,
                  badges: wordSoundsBadges,
                  phonemeMastery: phonemeMastery,
                  dailyProgress: wordSoundsDailyProgress,
                  confusionPatterns: wordSoundsConfusionPatterns,
                  families: wordSoundsFamilies,
                  audioLibrary: wordSoundsAudioLibrary
              },"""

    replacement_a2 = """              // Word Sounds & Analytics Persistence
              gameCompletions: gameCompletions,
              labelChallengeResults: labelChallengeResults,
              socraticChatHistory: socraticMessages.length > 0 ? {
                  messages: socraticMessages,
                  messageCount: socraticMessages.length,
                  savedAt: new Date().toISOString()
              } : null,
              wordSoundsState: {
                  history: wordSoundsHistory,
                  badges: wordSoundsBadges,
                  phonemeMastery: phonemeMastery,
                  dailyProgress: wordSoundsDailyProgress,
                  confusionPatterns: wordSoundsConfusionPatterns,
                  families: wordSoundsFamilies,
                  audioLibrary: wordSoundsAudioLibrary,
                  sessionScore: wordSoundsScore
              },"""

    if target_a2 in content:
        content = content.replace(target_a2, replacement_a2, 1)
        edits_applied += 1
        print("✅ A2: Added socraticChatHistory + labelChallengeResults + sessionScore to save payload")
    else:
        print("❌ A2: Could not find save payload target")

    # ============================================================
    # A3: Update Label Challenge XP and persist results
    # ============================================================
    target_a3 = """                                    onChallengeSubmit={(result) => {
                                        handleScoreUpdate(Math.round((result.score || 0) / 10), "Label Challenge", generatedContent?.id);
                                    }}"""

    replacement_a3 = """                                    onChallengeSubmit={(result) => {
                                        handleScoreUpdate(Math.round((result.score || 0) / 2), "Label Challenge", generatedContent?.id);
                                        setLabelChallengeResults(prev => [...prev, {
                                            score: result.score || 0,
                                            totalCorrect: result.totalCorrect || 0,
                                            totalExpected: result.totalExpected || 0,
                                            feedback: result.feedback || '',
                                            labelResults: result.labelResults || [],
                                            resourceId: generatedContent?.id,
                                            timestamp: new Date().toISOString()
                                        }]);
                                    }}"""

    if target_a3 in content:
        content = content.replace(target_a3, replacement_a3, 1)
        edits_applied += 1
        print("✅ A3: Updated Label Challenge XP to score/2 (max 50) + persist results")
    else:
        print("❌ A3: Could not find Label Challenge onChallengeSubmit target")

    # ============================================================
    # A4: Add localStorage persistence for labelChallengeResults
    # (add after the gameCompletions localStorage save effect)
    # ============================================================
    target_a4 = """      try { localStorage.setItem('allo_game_completions', JSON.stringify(gameCompletions)); } catch(e) { warnLog('localStorage write failed', e); }
  }, [gameCompletions, lzLoaded]);"""

    replacement_a4 = """      try { localStorage.setItem('allo_game_completions', JSON.stringify(gameCompletions)); } catch(e) { warnLog('localStorage write failed', e); }
      try { localStorage.setItem('allo_label_challenge_results', JSON.stringify(labelChallengeResults)); } catch(e) { warnLog('localStorage write failed', e); }
  }, [gameCompletions, labelChallengeResults, lzLoaded]);"""

    if target_a4 in content:
        content = content.replace(target_a4, replacement_a4, 1)
        edits_applied += 1
        print("✅ A4: Added labelChallengeResults localStorage persistence")
    else:
        print("❌ A4: Could not find gameCompletions localStorage save target")

    # ============================================================
    # A5: Load labelChallengeResults from session JSON on import
    # (add after gameCompletions load in the session restore logic)
    # ============================================================
    target_a5 = """                     if (rawData.gameCompletions) setGameCompletions(rawData.gameCompletions);"""

    replacement_a5 = """                     if (rawData.gameCompletions) setGameCompletions(rawData.gameCompletions);
                     if (rawData.labelChallengeResults) setLabelChallengeResults(rawData.labelChallengeResults);
                     if (rawData.socraticChatHistory?.messages) setSocraticMessages(rawData.socraticChatHistory.messages);"""

    if target_a5 in content:
        content = content.replace(target_a5, replacement_a5, 1)
        edits_applied += 1
        print("✅ A5: Added labelChallengeResults + socraticMessages session restore")
    else:
        print("❌ A5: Could not find gameCompletions session restore target")

    # ============================================================
    # Write result
    # ============================================================
    if edits_applied > 0:
        write_file(content)
        print(f"\n✅ All done! {edits_applied} edits applied successfully.")
    else:
        print("\n❌ No edits applied. Check targets above.")
    
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
