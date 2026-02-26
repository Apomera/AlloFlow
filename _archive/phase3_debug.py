import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Step 1: Add DEBUG flag and debugLog function after the config section
# Insert after line: const apiKey = "";
insert_after = 'const apiKey = "";'
debug_block = '''const apiKey = "";
// Debug logging gate — set to true during development
const DEBUG_LOG = false;
const debugLog = (...args) => { if (DEBUG_LOG) console.log(...args); };'''

if 'const DEBUG_LOG' not in text:
    if insert_after in text:
        text = text.replace(insert_after, debug_block, 1)
        print("INSERTED: DEBUG_LOG flag and debugLog function")
    else:
        print("ERROR: Could not find insertion point")
        sys.exit(1)
else:
    print("SKIPPED: DEBUG_LOG already exists")

# Step 2: Convert emoji-prefixed console.log calls to debugLog
# These are development debug logs, not operational ones
# Pattern: console.log(`emoji...`) or console.log('emoji...')
emoji_pattern = re.compile(
    r"console\.log\(([`'\"])([\U0001F300-\U0001FFFF\u2600-\u27BF\u2B50\u26A0\u2705\u274C\u2728\u267B\u2764\u23F0\u23F3\u2699\u270F\u2709\u2702\u2708\u2712\u2716\u271D\u2B07\U0001F3AF\U0001F4A1\U0001F4DD\U0001F4CA\U0001F4C8\U0001F4C1\U0001F4BE\U0001F510\U0001F511\U0001F50D\U0001F3AE\U0001F3B2\U0001F3B5\U0001F3B6\U0001F9E0\U0001F3C6\U0001F527\U0001F198\U0001F4AC\U0001F4E6\U0001F4CB\U0001F4CE\U0001F4D6\U0001F517\U0001F5D1⚡🔊🎵🎤📊🧠✅❌⚠️🔄🎯💡🔑🏆🎮🎲🎭📝])"
)

count = 0
def replace_debug_log(m):
    global count
    count += 1
    return f"debugLog({m.group(1)}{m.group(2)}"

text = emoji_pattern.sub(replace_debug_log, text)
print(f"CONVERTED: {count} emoji-prefixed console.log -> debugLog")

# Step 3: Also convert common debug patterns (not errors/warnings)
# Convert "console.log('DEBUG:" and "console.log('[DEBUG]"
debug_prefix_pattern = re.compile(r"console\.log\(([`'\"])(\[?DEBUG\]?[: ])")
count2 = 0
def replace_debug_prefix(m):
    global count2
    count2 += 1
    return f"debugLog({m.group(1)}{m.group(2)}"
text = debug_prefix_pattern.sub(replace_debug_prefix, text)
print(f"CONVERTED: {count2} DEBUG-prefixed console.log -> debugLog")

# Step 4: Convert verbose development logs (optional patterns)
# "console.log('Loaded ...", "console.log('Fetching ...", "console.log('Generating ..."
verbose_patterns = [
    r"console\.log\(([`'\"])(?:Loaded |Loading |Fetching |Generating |Generated |Caching |Cached |Preloading |Preloaded |Playing |Played )",
]
count3 = 0
for pat in verbose_patterns:
    matches = list(re.finditer(pat, text))
    for m in reversed(matches):
        text = text[:m.start()] + text[m.start():m.end()].replace('console.log(', 'debugLog(', 1) + text[m.end():]
        count3 += 1
print(f"CONVERTED: {count3} verbose development console.log -> debugLog")

total = count + count2 + count3
print(f"\nTOTAL: {total} console.log calls converted to debugLog")
remaining = len(re.findall(r'console\.log', text))
print(f"REMAINING: {remaining} console.log calls (operational/important)")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("FILE SAVED")
