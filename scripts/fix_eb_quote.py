"""Fix stray escaped quote in ErrorBoundary JSX at L65778"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken part: error)}" onRetry  ->  error)} onRetry
old = 'error?.message || error)}" onRetry'
new = 'error?.message || error)} onRetry'
if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Removed stray quote from ErrorBoundary tag")
else:
    print("[WARN] Pattern not found")
    # Show what's at L65778
    lines = content.split('\n')
    print("L65778:", lines[65777][:200])
