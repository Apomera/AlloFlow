"""
Fix Allobot intro timing: don't fire intro or initialize messages
until externalized strings are actually loaded.

Strategy: Check if t() returns the raw dotted key path - if so, strings aren't 
loaded yet. Guard both the intro speech and the UDL welcome message init.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# FIX 1: Guard the Allobot intro from firing with unloaded strings
# Current: if (canPlayIntro && !hasSeenBotIntro && !isTalking && !customMessage && !introFiredGlobal) {
# Add a check that t() actually returns a real string (not the key path)
old_intro = "if (canPlayIntro && !hasSeenBotIntro && !isTalking && !customMessage && !introFiredGlobal) {"
new_intro = "if (canPlayIntro && !hasSeenBotIntro && !isTalking && !customMessage && !introFiredGlobal && t('bot_events.intro_greeting') !== 'bot_events.intro_greeting') {"

if old_intro in content:
    content = content.replace(old_intro, new_intro)
    fixes += 1
    print("Fix 1: Allobot intro guarded against unloaded strings")
else:
    print("Fix 1 SKIP: intro guard not found")

# FIX 2: Guard the UDL messages initialization
# Current: const [udlMessages, setUdlMessages] = useState([{
#     role: 'model',
#     text: t('sidebar.ai_guide_welcome'),
#     isWelcome: true
# }]);
# Change: initialize with empty placeholder text, let the useEffect fill it
old_udl_init = "text: t('sidebar.ai_guide_welcome'),"
new_udl_init = "text: '',"

if content.count(old_udl_init) >= 1:
    # Only replace the first occurrence (the useState init), not the useEffect one
    idx = content.find(old_udl_init)
    content = content[:idx] + new_udl_init + content[idx + len(old_udl_init):]
    fixes += 1
    print("Fix 2: UDL messages initialized with empty text (useEffect will fill it)")
else:
    print("Fix 2 SKIP: UDL init text not found")

# FIX 3: Make the useEffect that updates welcome text fire immediately on mount
# Current useEffect depends on [t] - it should fire immediately and whenever t changes
# But it checks prev[0].text !== newWelcomeText which will work since we init with ''
# Make sure the effect also handles the empty initial case
old_welcome_effect = """setUdlMessages(prev => {
          if (prev.length > 0 && prev[0].isWelcome) {
              const newWelcomeText = t('sidebar.ai_guide_welcome');
              if (prev[0].text !== newWelcomeText) {"""
new_welcome_effect = """setUdlMessages(prev => {
          if (prev.length > 0 && prev[0].isWelcome) {
              const newWelcomeText = t('sidebar.ai_guide_welcome');
              if (newWelcomeText !== 'sidebar.ai_guide_welcome' && prev[0].text !== newWelcomeText) {"""

if old_welcome_effect in content:
    content = content.replace(old_welcome_effect, new_welcome_effect)
    fixes += 1
    print("Fix 3: Welcome text update also guards against raw key")
else:
    print("Fix 3 SKIP: welcome effect not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
