"""
Fix AlloBot fly + loading screen logo:
1. Remove stale isBotFlying state/timer
2. Make flyTo trigger retry until ref is available 
3. Replace loading screen wave emoji with rainbow-book base64 image
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# FIX 1: Remove stale isBotFlying state and timer
OLD_FLYING_STATE = "  const [isBotFlying, setIsBotFlying] = useState(true);\r\n"
if OLD_FLYING_STATE in c:
    c = c.replace(OLD_FLYING_STATE, '')
    changes += 1
    print('Fix 1a: Removed isBotFlying useState')

OLD_FLYING_TIMER = "  useEffect(() => { const ft = setTimeout(() => setIsBotFlying(false), 2500); return () => clearTimeout(ft); }, []);\r\n"
if OLD_FLYING_TIMER in c:
    c = c.replace(OLD_FLYING_TIMER, '')
    changes += 1
    print('Fix 1b: Removed isBotFlying timer')
else:
    # Try with \n only
    OLD_FLYING_TIMER2 = "\n  useEffect(() => { const ft = setTimeout(() => setIsBotFlying(false), 2500); return () => clearTimeout(ft); }, []);\n"
    if OLD_FLYING_TIMER2 in c:
        c = c.replace(OLD_FLYING_TIMER2, '\n')
        changes += 1
        print('Fix 1b: Removed isBotFlying timer (\\n variant)')

# FIX 2: Replace the flyTo trigger with a retry-based approach
OLD_FLYTO = """  useEffect(() => {
    if (isAppReady && alloBotRef.current && alloBotRef.current.flyTo) {
      setTimeout(() => {
        if (alloBotRef.current && alloBotRef.current.flyTo) {
          alloBotRef.current.flyTo(24, 20, 2000);
        }
      }, 300);
    }
  }, [isAppReady]);"""

NEW_FLYTO = """  useEffect(() => {
    if (!isAppReady) return;
    let attempts = 0;
    const tryFly = () => {
      attempts++;
      if (alloBotRef.current && alloBotRef.current.flyTo) {
        console.log('[AlloBot] Flying to resting position after loading screen');
        alloBotRef.current.flyTo(24, 20, 2000);
      } else if (attempts < 20) {
        setTimeout(tryFly, 300);
      } else {
        console.warn('[AlloBot] flyTo ref never became available');
      }
    };
    const timer = setTimeout(tryFly, 500);
    return () => clearTimeout(timer);
  }, [isAppReady]);"""

if OLD_FLYTO in c:
    c = c.replace(OLD_FLYTO, NEW_FLYTO)
    changes += 1
    print('Fix 2: Replaced flyTo with retry-based trigger')
else:
    print('Fix 2 SKIPPED: old flyTo pattern not found')

# FIX 3: Replace loading screen wave emoji with rainbow-book base64
B64_FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\rainbow_book_b64.txt"
with open(B64_FILE, 'r') as bf:
    b64_data = bf.read().strip()

OLD_EMOJI = """<div style={{ fontSize: '64px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))' }}>🌊</div>"""
NEW_LOGO = f"""<img src={{"data:image/jpeg;base64,{b64_data}"}} alt="AlloFlow" style={{{{ width: '80px', height: '80px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))', borderRadius: '16px' }}}} />"""

if OLD_EMOJI in c:
    c = c.replace(OLD_EMOJI, NEW_LOGO)
    changes += 1
    print('Fix 3: Replaced wave emoji with rainbow-book base64')
else:
    print('Fix 3 SKIPPED: emoji not found')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal: {changes} fixes applied')
