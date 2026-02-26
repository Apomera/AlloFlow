import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Add canPlayIntro to the intro useEffect dependency array
old_deps = '[hasSeenBotIntro, onBotIntroSeen, speak, isTalking, customMessage, t]'
new_deps = '[canPlayIntro, hasSeenBotIntro, onBotIntroSeen, speak, isTalking, customMessage, t]'
count1 = c.count(old_deps)
c = c.replace(old_deps, new_deps)
print(f'Fix 1 (add canPlayIntro to deps): replaced {count1} occurrences')

# Fix 2: Remove the 1500ms internal delay - fire immediately once conditions are met
# The old pattern wraps the intro in a setTimeout with 1500ms delay
old_inner = """const timer = setTimeout(() => {
        if (introFiredGlobal) return;
        introFiredGlobal = true;
        speak(t('bot_events.intro_greeting'));
        setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 1500);
        if (onBotIntroSeen) onBotIntroSeen();
      }, 1500);
      return () => clearTimeout(timer);"""

new_inner = """if (!introFiredGlobal) {
        introFiredGlobal = true;
        speak(t('bot_events.intro_greeting'));
        setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 1500);
        if (onBotIntroSeen) onBotIntroSeen();
      }"""

count2 = c.count(old_inner)
c = c.replace(old_inner, new_inner)
print(f'Fix 2 (remove 1.5s delay): replaced {count2} occurrences')

# If Fix 2 didn't match (line endings), try with \r\n
if count2 == 0:
    old_inner_r = old_inner.replace('\n', '\r\n')
    new_inner_r = new_inner.replace('\n', '\r\n')
    count2r = c.count(old_inner_r)
    c = c.replace(old_inner_r, new_inner_r)
    print(f'Fix 2 (CRLF): replaced {count2r} occurrences')

# Also reduce the canPlayBotIntro delay to 0 (fire immediately when wizard is not open)
old_3s = """const timer = setTimeout(() => {
            setCanPlayBotIntro(true);
        }, 3000);
        return () => clearTimeout(timer);"""
new_immediate = """setCanPlayBotIntro(true);"""

count3 = c.count(old_3s)
c = c.replace(old_3s, new_immediate)
if count3 == 0:
    old_3s_r = old_3s.replace('\n', '\r\n')
    count3r = c.count(old_3s_r)
    c = c.replace(old_3s_r, new_immediate)
    print(f'Fix 3 (canPlayBotIntro immediate, CRLF): replaced {count3r} occurrences')
else:
    print(f'Fix 3 (canPlayBotIntro immediate): replaced {count3} occurrences')

# Fix 4: Find and remove the live session gate toast
# Search for the pattern
gate_patterns = [
    'Generate resources before starting',
    'generate resources before',
    'Generate content before starting',
]
for gp in gate_patterns:
    if gp in c:
        # Find context around it
        idx = c.find(gp)
        context = c[max(0,idx-200):idx+200]
        print(f'GATE FOUND: ...{context}...')
        break
else:
    print('GATE: No hardcoded gate text found - likely in external UI_STRINGS JSON')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print('All intro fixes applied!')
