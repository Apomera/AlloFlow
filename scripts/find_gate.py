FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search for the function that starts a live session
for i, line in enumerate(lines):
    ll = line.strip()
    # Look for the startSession, handleStartSession, or similar function
    if 'startSession' in ll and ('const' in ll or 'function' in ll or '=>' in ll):
        print(f'L{i+1}: {ll[:200]}')
    if 'handleLaunchSession' in ll or 'handleStartLive' in ll or 'launchLiveSession' in ll:
        print(f'L{i+1}: {ll[:200]}')
    # Look for Live Session / Go Live button
    if 'firebase' in ll.lower() and 'session' in ll.lower() and ('set(' in ll or 'push(' in ll):
        if 'active' in ll.lower() or 'start' in ll.lower() or 'create' in ll.lower():
            print(f'L{i+1}: {ll[:200]}')

print('=== satellites / broadcast ===')
for i, line in enumerate(lines):
    ll = line.strip()
    if ('📡' in ll or 'broadcast' in ll.lower()) and ('session' in ll.lower() or 'live' in ll.lower()):
        if 'onClick' in ll or 'button' in ll.lower() or 'disabled' in ll:
            print(f'L{i+1}: {ll[:200]}')
