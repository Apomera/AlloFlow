"""Apply remaining fixes: loading overlay + isFlying prop removal"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# Fix 3: Remove isFlying={isBotFlying} prop
# The line is:  "            isFlying={isBotFlying}\r\n"
OLD_PROP = '            isFlying={isBotFlying}\r\n'
if OLD_PROP in c:
    c = c.replace(OLD_PROP, '')
    changes += 1
    print('Fix 3: Removed isFlying={isBotFlying}')
else:
    print('Fix 3 SKIPPED')

# Fix 8: Add loading screen before AlloBot render
# The anchor is: "      {isBotVisible && (\n          <AlloBot\n"
ANCHOR = '      {isBotVisible && (\r\n          <AlloBot\r\n'

LOADING_JSX = """      {!isAppReady && (
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

if ANCHOR in c:
    c = c.replace(ANCHOR, LOADING_JSX + ANCHOR)
    changes += 1
    print('Fix 8: Added loading screen overlay')
else:
    print('Fix 8 SKIPPED: anchor not found')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal: {changes} fixes applied')
