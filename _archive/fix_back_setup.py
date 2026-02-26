"""Fix the hasAutoNavigated ref to prevent Back to Setup bounce"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

OLD = '        // Track if we already auto-navigated this session\n        const hasAutoNavigated = React.useRef(false);'
NEW = '''        // Track if we already auto-navigated this session
        // FIX: If words are already preloaded on mount (returning from "Back to Setup"),
        // skip auto-navigation to prevent immediately bouncing back to the review panel
        const hasAutoNavigated = React.useRef(preloadedWords.length > 0);'''

if OLD in content:
    content = content.replace(OLD, NEW)
    print("✅ Applied fix: hasAutoNavigated initialized from preloadedWords.length")
else:
    # Try with \r\n
    OLD2 = OLD.replace('\n', '\r\n')
    if OLD2 in content:
        content = content.replace(OLD2, NEW.replace('\n', '\r\n'))
        print("✅ Applied fix (CRLF): hasAutoNavigated initialized from preloadedWords.length")
    else:
        print("❌ Could not find target content")
        exit(1)

f = open(FILE, 'w', encoding='utf-8')
f.write(content)
f.close()

# Verify
f = open(FILE, 'r', encoding='utf-8-sig')
verify = f.read()
f.close()

if 'preloadedWords.length > 0);' in verify and 'skip auto-navigation' in verify:
    print("✅ Verified: fix is in place")
else:
    print("❌ Verification failed")
