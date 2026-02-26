"""Apply remaining fixes using line-number approach"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# Fix 3: Remove isFlying={isBotFlying} prop
for i in range(len(lines)):
    if 'isFlying={isBotFlying}' in lines[i]:
        print(f'Fix 3: Removing isFlying prop at L{i+1}: {repr(lines[i][:60])}')
        lines[i] = ''
        changes += 1

# Fix 8: Add loading screen before {isBotVisible && (  <AlloBot
for i in range(len(lines)-1):
    if '{isBotVisible &&' in lines[i] and '<AlloBot' in lines[i+1]:
        print(f'Fix 8: Inserting loading overlay before L{i+1}')
        loading = """      {!isAppReady && (
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
        lines.insert(i, loading)
        changes += 1
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal: {changes} fixes applied')
