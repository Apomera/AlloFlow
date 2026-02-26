"""
Fix 1: Streak guards — only award in student/independent mode + engagement tracking
Fix 2: Allobot mouth during TTS — prevent SpeechBubble from killing isTalking during audio
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    
fixes = 0

# ═══════════════════════════════════════
# FIX 1A: Add engagement tracking ref near focusData state
# ═══════════════════════════════════════
old_focus = "const [focusData, setFocusData] = useState({ focusedMs: 0, unfocusedMs: 0, currentStreak: 0, longestStreak: 0, lastVisibleTime: Date.now() });"
new_focus = """const [focusData, setFocusData] = useState({ focusedMs: 0, unfocusedMs: 0, currentStreak: 0, longestStreak: 0, lastVisibleTime: Date.now(), engagedMinutes: 0, idleMinutes: 0 });
  const lastInteractionTimeRef = useRef(Date.now());
  useEffect(() => {
    const trackInteraction = () => { lastInteractionTimeRef.current = Date.now(); };
    window.addEventListener('click', trackInteraction);
    window.addEventListener('keydown', trackInteraction);
    window.addEventListener('scroll', trackInteraction);
    window.addEventListener('mousemove', trackInteraction);
    return () => {
      window.removeEventListener('click', trackInteraction);
      window.removeEventListener('keydown', trackInteraction);
      window.removeEventListener('scroll', trackInteraction);
      window.removeEventListener('mousemove', trackInteraction);
    };
  }, []);"""

if old_focus in content:
    content = content.replace(old_focus, new_focus)
    fixes += 1
    print("Fix 1A: Engagement tracking ref added")
else:
    print("Fix 1A SKIP: focusData state not found")

# ═══════════════════════════════════════
# FIX 1B: Add mode + engagement guard to streak interval
# ═══════════════════════════════════════
old_streak = """    const STREAK_MILESTONES = [5, 10, 15, 20, 30];
    focusStreakTimerRef.current = setInterval(() => {
      if (!document.hidden) {
        setFocusData(prev => {
          const newStreak = prev.currentStreak + 1;
          const newLongest = Math.max(newStreak, prev.longestStreak);
          if (STREAK_MILESTONES.includes(newStreak)) {
            const flames = newStreak <= 5 ? "\xf0\x9f\x94\xa5" : newStreak <= 10 ? "\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5" : newStreak <= 20 ? "\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5" : "\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5\xf0\x9f\x94\xa5";
            if (typeof addToast === "function") addToast(`${flames} ${newStreak}-minute focus streak! Keep it up!`, "success");
          }
          return { ...prev, currentStreak: newStreak, longestStreak: newLongest, focusedMs: prev.focusedMs + 60000 };
        });
      }
    }, 60000);"""

# Since the emoji bytes might not match exactly, let me use a different approach
# Find just the structural pattern
streak_start = '    const STREAK_MILESTONES = [5, 10, 15, 20, 30];'
streak_start_idx = content.find(streak_start)
if streak_start_idx >= 0:
    # Find the end of the interval: }, 60000);
    streak_end_marker = '    }, 60000);'
    streak_end_idx = content.find(streak_end_marker, streak_start_idx)
    if streak_end_idx >= 0:
        streak_end_idx += len(streak_end_marker)
        
        new_streak = """    const STREAK_MILESTONES = [5, 10, 15, 20, 30];
    const ENGAGEMENT_TIMEOUT_MS = 180000; // 3 minutes
    focusStreakTimerRef.current = setInterval(() => {
      if (!document.hidden) {
        const isEngaged = (Date.now() - lastInteractionTimeRef.current) < ENGAGEMENT_TIMEOUT_MS;
        const isStreakEligible = !isParentMode;
        setFocusData(prev => {
          const updatedEngaged = prev.engagedMinutes + (isEngaged ? 1 : 0);
          const updatedIdle = prev.idleMinutes + (isEngaged ? 0 : 1);
          if (!isStreakEligible || !isEngaged) {
            return { ...prev, focusedMs: prev.focusedMs + 60000, engagedMinutes: updatedEngaged, idleMinutes: updatedIdle };
          }
          const newStreak = prev.currentStreak + 1;
          const newLongest = Math.max(newStreak, prev.longestStreak);
          if (STREAK_MILESTONES.includes(newStreak)) {
            const flames = newStreak <= 5 ? "\\u{1F525}" : newStreak <= 10 ? "\\u{1F525}\\u{1F525}" : newStreak <= 20 ? "\\u{1F525}\\u{1F525}\\u{1F525}" : "\\u{1F525}\\u{1F525}\\u{1F525}\\u{1F525}";
            if (typeof addToast === "function") addToast(`${flames} ${newStreak}-minute focus streak! Keep it up!`, "success");
          }
          return { ...prev, currentStreak: newStreak, longestStreak: newLongest, focusedMs: prev.focusedMs + 60000, engagedMinutes: updatedEngaged, idleMinutes: updatedIdle };
        });
      }
    }, 60000);"""
        
        content = content[:streak_start_idx] + new_streak + content[streak_end_idx:]
        fixes += 1
        print("Fix 1B: Streak mode guard + engagement check added")
    else:
        print("Fix 1B SKIP: streak end marker not found")
else:
    print("Fix 1B SKIP: streak start not found")

# ═══════════════════════════════════════
# FIX 2: Allobot mouth during TTS
# ═══════════════════════════════════════
# The issue: SpeechBubble's onTyping callback is `setIsTalking`, which sets false
# when typing ends, killing mouth animation while TTS audio is still playing.
# Fix: wrap onTyping to not set false while audio is active.
old_on_typing = "onTyping={setIsTalking}"
new_on_typing = "onTyping={(v) => { if (v) setIsTalking(true); else if (!currentAudioRef.current) setIsTalking(false); }}"

if content.count(old_on_typing) == 1:
    content = content.replace(old_on_typing, new_on_typing)
    fixes += 1
    print("Fix 2: Allobot mouth TTS sync — onTyping guarded")
else:
    print(f"Fix 2 SKIP: onTyping found {content.count(old_on_typing)} times")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
