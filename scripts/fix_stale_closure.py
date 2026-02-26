"""
FIX: Stale closure bug in startActivity.
getAdaptiveRandomWord() uses wordSoundsActivity closure (stale value).
generateSessionQueue writes to sessionQueueRef.current[activityId] (correct).
Fix: Read directly from the ref using the activityId parameter instead.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the getAdaptiveRandomWord call with direct ref access
old = """        // Use adaptive difficulty-based word selection (now pulls from queue)
        const word = forceWord || getAdaptiveRandomWord(excludeWord ? null : null); // excludeWord deprecated by queue logic"""

new = """        // Use adaptive difficulty-based word selection (now pulls from queue)
        // FIX: Read queue directly with activityId param (avoids stale wordSoundsActivity closure)
        let word = forceWord;
        if (!word) {
            const queue = sessionQueueRef.current[activityId];
            if (queue && queue.length > 0) {
                word = queue[0];
                sessionQueueRef.current[activityId] = queue.slice(1);
                setSessionWordLists(prev => ({...prev, [activityId]: queue.slice(1)}));
            }
        }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Replaced stale closure getAdaptiveRandomWord with direct ref access using activityId param")
else:
    print("[WARN] Pattern not found")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'getAdaptiveRandomWord' in l and i > 7900 and i < 7940:
            print("L%d: %s" % (i+1, l.strip()[:180]))
