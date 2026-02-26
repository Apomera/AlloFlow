import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove the input_ready tip (line 10676)
# Change: tips.push(t('tips.input_ready'));
# To: (nothing - skip adding this inaccurate tip)
# Instead, when history.length === 0 and activeView === 'input', add a better tip
old_block = """        } else if (activeView === 'input') {
            if (history.length === 0) {
                tips.push(t('tips.input_ready'));
            } else {"""

new_block = """        } else if (activeView === 'input') {
            if (history.length === 0) {
                // input_ready tip removed (inaccurate + repeats excessively)
            } else {"""

count = content.count(old_block)
print(f"Fix 1: Found {count} occurrences of input_ready block")
content = content.replace(old_block, new_block)

# Fix 2: Add tip deduplication to prevent the same tip from repeating in a session
# Add a Set to track spoken tips, and filter out already-spoken tips
# We'll add this right at the start of the useEffect that contains getRandomTip

old_ambient_start = """  useEffect(() => {
    let ambientTimer;
    let fallbackTimer;
    let lastActivityTime = Date.now();
    let hasSpokenFallback = false;
    const getRandomTip = () => {"""

new_ambient_start = """  useEffect(() => {
    let ambientTimer;
    let fallbackTimer;
    let lastActivityTime = Date.now();
    let hasSpokenFallback = false;
    const spokenTips = new Set();
    const getRandomTip = () => {"""

count2 = content.count(old_ambient_start)
print(f"Fix 2a: Found {count2} occurrences of ambient start block")
content = content.replace(old_ambient_start, new_ambient_start)

# Fix 3: Update the tip selection to filter out already-spoken tips
old_return = """        return tips[Math.floor(Math.random() * tips.length)];
    };
    const scheduleAmbientAction = () => {"""

new_return = """        const unspoken = tips.filter(t => !spokenTips.has(t));
        const pool = unspoken.length > 0 ? unspoken : tips;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        spokenTips.add(chosen);
        return chosen;
    };
    const scheduleAmbientAction = () => {"""

count3 = content.count(old_return)
print(f"Fix 2b: Found {count3} occurrences of tip return block")
content = content.replace(old_return, new_return)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("All fixes applied!")
