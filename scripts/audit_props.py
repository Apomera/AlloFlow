import re

# COMPREHENSIVE AUDIT: Find ALL variables used in StemLab module
# that are NOT in the props destructuring and NOT locally defined

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js', 'r', encoding='utf-8')
module = f.read()
f.close()

# 1. Extract destructured props
match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', module)
if not match:
    print("ERROR: Could not find props destructuring!")
    exit(1)

props_text = match.group(1)
props_in_destructuring = set(p.strip() for p in props_text.split(',') if p.strip())
print(f"Props in destructuring: {len(props_in_destructuring)}")

# 2. Get the body after props destructuring
body = module[match.end():]

# 3. Find ALL identifier-like references that look like state variables or callbacks
# Pattern: camelCase identifiers that are used but not defined locally
# We look for variable names used in JSX/React context

# Common patterns for state vars: camelCase starting with lowercase
# Common patterns for setters: setCamelCase
# Common patterns for handlers: handleCamelCase
# Common patterns for callbacks: onCamelCase

# Find all camelCase identifiers used in the body
all_identifiers = set(re.findall(r'\b([a-z][a-zA-Z0-9]+)\b', body))

# Filter to likely state variables (not JS keywords, not common built-ins)
js_keywords = {
    'if', 'else', 'return', 'const', 'let', 'var', 'function', 'true', 'false',
    'null', 'undefined', 'typeof', 'instanceof', 'new', 'this', 'class', 'extends',
    'import', 'export', 'default', 'from', 'for', 'while', 'do', 'switch', 'case',
    'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await',
    'of', 'in', 'delete', 'void', 'yield', 'static', 'super', 'get', 'set',
}

js_builtins = {
    'console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String',
    'Number', 'Boolean', 'Date', 'Error', 'RegExp', 'Map', 'Set', 'Promise',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
    'decodeURIComponent', 'setTimeout', 'setInterval', 'clearInterval', 'clearTimeout',
    'alert', 'confirm', 'prompt', 'fetch', 'localStorage', 'sessionStorage',
    'navigator', 'location', 'history', 'performance', 'crypto',
    'length', 'push', 'pop', 'shift', 'unshift', 'map', 'filter', 'reduce',
    'forEach', 'find', 'findIndex', 'includes', 'indexOf', 'join', 'split',
    'slice', 'splice', 'concat', 'sort', 'reverse', 'keys', 'values', 'entries',
    'toString', 'valueOf', 'hasOwnProperty', 'toFixed', 'toUpperCase', 'toLowerCase',
    'trim', 'replace', 'match', 'search', 'test', 'exec', 'charAt', 'charCodeAt',
    'substring', 'startsWith', 'endsWith', 'padStart', 'padEnd', 'repeat',
    'floor', 'ceil', 'round', 'random', 'min', 'max', 'abs', 'sqrt', 'pow',
    'log', 'sin', 'cos', 'tan', 'atan2', 'PI', 'stringify', 'parse',
    'preventDefault', 'stopPropagation', 'target', 'value', 'key', 'type',
    'style', 'className', 'onClick', 'onChange', 'onKeyDown', 'onMouseDown',
    'onMouseUp', 'onMouseMove', 'onDragStart', 'onDragOver', 'onDrop',
    'children', 'ref', 'current', 'props', 'state', 'size',
    'createElement', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo',
    'dataTransfer', 'getData', 'setData', 'clientX', 'clientY',
    'removeEventListener', 'addEventListener', 'getBoundingClientRect',
    'offsetX', 'offsetY', 'pageX', 'pageY',
}

# Also identify locally defined variables in the body (const, let, var declarations)
local_defs = set(re.findall(r'(?:const|let|var)\s+(?:\{[^}]*\}|(\w+))', body))
local_defs.update(re.findall(r'(?:const|let|var)\s+\[(\w+)', body))
# Function params
local_defs.update(re.findall(r'=>\s*\{?\s*\(?\s*(\w+)', body))
local_defs.discard('')
local_defs.discard(None)

# Focus: find variables that match state/setter patterns
# State vars: lowercase camelCase that are NOT js keywords/builtins and NOT locally defined
# and NOT in props
state_like = set()
for ident in all_identifiers:
    if ident in js_keywords or ident in js_builtins:
        continue
    if ident in props_in_destructuring:
        continue
    if ident in local_defs:
        continue
    # Check if it looks like a state var or setter
    if re.match(r'^(set[A-Z]|[a-z]+[A-Z])', ident):
        # Check it's actually used as a variable (not just a string/comment)
        # Must appear in a context like: someVar, or someVar.something, or someVar(, or !someVar
        if re.search(rf'(?<!["\'])\b{re.escape(ident)}\b(?!["\'])', body):
            state_like.add(ident)

# Now filter to the ones most likely to cause ReferenceErrors
# These would be used standalone (not as object property, not in string)
print(f"\nPotentially missing state-like vars ({len(state_like)}):")
for v in sorted(state_like):
    # Count usage
    count = len(re.findall(rf'\b{re.escape(v)}\b', body))
    print(f"  {v} ({count} refs)")

# Specifically check for the known pattern: *Challenge, *Feedback, *Answer, *Value
known_patterns = ['Challenge', 'Feedback', 'Answer', 'Value', 'Mode', 'Range', 'Markers', 'Points', 'Pieces']
print(f"\n=== State vars matching known patterns ===")
for pat in known_patterns:
    matches = [v for v in state_like if pat in v]
    if matches:
        for m in sorted(matches):
            in_main = '(already in main)' if m in props_in_destructuring else '*** MISSING ***'
            print(f"  {m} {in_main}")
