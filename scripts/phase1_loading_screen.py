"""
Phase 1: Loading Screen + AlloBot Fix
1. Add isAppReady state + loading screen overlay  
2. Add flyTo to AlloBot's imperative handle
3. Gate canPlayBotIntro behind isAppReady
4. Trigger flyTo via ref once app is ready
5. Remove the broken isBotFlying prop approach
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ===== FIX 1: Add flyTo to AlloBot's useImperativeHandle =====
OLD_HANDLE = """React.useImperativeHandle(ref, () => ({
      dismissMessage: () => {
          setCustomMessage(null);
          setIsTruncated(false);
          setIsTalking(false);
      },
      playAnimation: (animName, durationMs = 1200) => {
          setIdleAnimation(animName);
          setTimeout(() => setIdleAnimation(null), durationMs);
      },

  }), []);"""

NEW_HANDLE = """React.useImperativeHandle(ref, () => ({
      dismissMessage: () => {
          setCustomMessage(null);
          setIsTruncated(false);
          setIsTalking(false);
      },
      playAnimation: (animName, durationMs = 1200) => {
          setIdleAnimation(animName);
          setTimeout(() => setIdleAnimation(null), durationMs);
      },
      flyTo: (targetX, targetY, duration = 2000) => {
          setLocalIsFlying(true);
          setMoveDuration(duration);
          setTimeout(() => {
              setPosition({ x: targetX, y: targetY });
              setTimeout(() => {
                  setLocalIsFlying(false);
                  setIsLanding(true);
                  setTimeout(() => setIsLanding(false), 600);
              }, duration);
          }, 50);
      },
  }), []);"""

if OLD_HANDLE in c:
    c = c.replace(OLD_HANDLE, NEW_HANDLE)
    changes += 1
    print('Fix 1: Added flyTo to useImperativeHandle')
else:
    print('Fix 1 SKIPPED: handle not found')

# ===== FIX 2: Remove the broken isFlying useEffect from AlloBot =====
# Remove the fly useEffect we added earlier
OLD_FLY_EFFECT = """  useEffect(() => {
    if (isFlying && !isSleeping) {
      // Fly from bottom-left to resting position over 2s
      const startX = 5;
      const startY = 90;
      const endX = position.x || 24;
      const endY = position.y || 20;
      setPosition({ x: startX, y: startY });
      setLocalIsFlying(true);
      setMoveDuration(2000);
      const flyTimer = setTimeout(() => {
        setPosition({ x: endX, y: endY });
        setTimeout(() => {
          setLocalIsFlying(false);
          setIsLanding(true);
          setTimeout(() => setIsLanding(false), 600);
        }, 2000);
      }, 100);
      return () => clearTimeout(flyTimer);
    }
  }, [isFlying]);"""

if OLD_FLY_EFFECT in c:
    c = c.replace(OLD_FLY_EFFECT, '')
    changes += 1
    print('Fix 2: Removed broken isFlying useEffect from AlloBot')
else:
    print('Fix 2 SKIPPED: fly effect not found')

# ===== FIX 3: Remove isFlying={isBotFlying} prop from AlloBot JSX =====
if 'isFlying={isBotFlying}' in c:
    c = c.replace('            isFlying={isBotFlying}\r\n', '')
    changes += 1
    print('Fix 3: Removed isFlying={isBotFlying} prop')
else:
    print('Fix 3 SKIPPED: prop not found')

# ===== FIX 4: Remove isBotFlying state from parent =====
OLD_FLY_STATE = "  const [isBotFlying, setIsBotFlying] = useState(true);\n  useEffect(() => { const ft = setTimeout(() => setIsBotFlying(false), 2500); return () => clearTimeout(ft); }, []);\r\n"
if OLD_FLY_STATE in c:
    c = c.replace(OLD_FLY_STATE, '')
    changes += 1
    print('Fix 4: Removed isBotFlying state from parent')
else:
    # Try without the specific line ending
    if 'const [isBotFlying, setIsBotFlying] = useState(true);' in c:
        # Remove both lines
        c = c.replace('  const [isBotFlying, setIsBotFlying] = useState(true);\r\n', '')
        c = c.replace("  useEffect(() => { const ft = setTimeout(() => setIsBotFlying(false), 2500); return () => clearTimeout(ft); }, []);\r\n", '')
        changes += 1
        print('Fix 4b: Removed isBotFlying state (alt pattern)')
    else:
        print('Fix 4 SKIPPED: isBotFlying state not found')

# ===== FIX 5: Add isAppReady state + loading screen =====
# Find the canPlayBotIntro state and add isAppReady nearby
ANCHOR_READY = 'const [canPlayBotIntro, setCanPlayBotIntro] = useState(false);'
if ANCHOR_READY in c:
    ready_state = """const [isAppReady, setIsAppReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  useEffect(() => {
    const steps = [10, 25, 45, 60, 75, 85, 95, 100];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setLoadingProgress(steps[i]); i++; }
      else { clearInterval(interval); setTimeout(() => setIsAppReady(true), 400); }
    }, 350);
    return () => clearInterval(interval);
  }, []);
  """
    c = c.replace(ANCHOR_READY, ready_state + ANCHOR_READY)
    changes += 1
    print('Fix 5: Added isAppReady state + progress timer')
else:
    print('Fix 5 SKIPPED: canPlayBotIntro anchor not found')

# ===== FIX 6: Gate canPlayBotIntro behind isAppReady =====
OLD_GATE = """useEffect(() => {
    const isWizardOpen = showStudentWelcome && hasSelectedRole && !isTeacherMode;
    if (!isWizardOpen) {
        setCanPlayBotIntro(true);
    } else {
        setCanPlayBotIntro(false);
    }
  }, [showStudentWelcome, hasSelectedRole, isTeacherMode]);"""

NEW_GATE = """useEffect(() => {
    const isWizardOpen = showStudentWelcome && hasSelectedRole && !isTeacherMode;
    if (!isWizardOpen && isAppReady) {
        setCanPlayBotIntro(true);
    } else {
        setCanPlayBotIntro(false);
    }
  }, [showStudentWelcome, hasSelectedRole, isTeacherMode, isAppReady]);"""

if OLD_GATE in c:
    c = c.replace(OLD_GATE, NEW_GATE)
    changes += 1
    print('Fix 6: Gated canPlayBotIntro behind isAppReady')
else:
    print('Fix 6 SKIPPED: gate not found')

# ===== FIX 7: Add flyTo call when isAppReady becomes true =====
# Insert after the canPlayBotIntro useEffect
NEW_FLY_TRIGGER = """useEffect(() => {
    if (isAppReady && alloBotRef.current && alloBotRef.current.flyTo) {
      setTimeout(() => {
        if (alloBotRef.current && alloBotRef.current.flyTo) {
          alloBotRef.current.flyTo(24, 20, 2000);
        }
      }, 300);
    }
  }, [isAppReady]);
  """

if NEW_GATE in c:
    c = c.replace(NEW_GATE, NEW_GATE + '\r\n  ' + NEW_FLY_TRIGGER)
    changes += 1
    print('Fix 7: Added flyTo trigger on isAppReady')
else:
    print('Fix 7 SKIPPED: new gate not found')

# ===== FIX 8: Add loading screen overlay JSX =====
# Insert before the AlloBot render ({isBotVisible && ...)
# Find the AlloBot render block
ANCHOR_BOT = '      {isBotVisible && (\r\n          <AlloBot'
LOADING_OVERLAY = """      {!isAppReady && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e3a5f 100%)',
          transition: 'opacity 0.8s ease-out',
          opacity: isAppReady ? 0 : 1, pointerEvents: isAppReady ? 'none' : 'auto'
        }}>
          <div style={{ textAlign: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))' }}>🌊</div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>AlloFlow</h1>
            <p style={{ fontSize: '14px', color: 'rgba(165,180,252,0.8)', margin: '0 0 32px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Universal Design for Learning</p>
          </div>
          <div style={{ width: '280px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #818cf8, #6366f1, #4f46e5)', transition: 'width 0.4s ease-out', width: loadingProgress + '%', boxShadow: '0 0 12px rgba(99,102,241,0.6)' }} />
          </div>
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(165,180,252,0.6)', fontWeight: 500 }}>
            {loadingProgress < 30 ? 'Initializing...' : loadingProgress < 60 ? 'Loading resources...' : loadingProgress < 90 ? 'Preparing your workspace...' : 'Almost ready...'}
          </p>
        </div>
      )}
"""

if ANCHOR_BOT in c:
    c = c.replace(ANCHOR_BOT, LOADING_OVERLAY + ANCHOR_BOT)
    changes += 1
    print('Fix 8: Added loading screen overlay JSX')
else:
    print('Fix 8 SKIPPED: AlloBot render anchor not found')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal changes: {changes}')
