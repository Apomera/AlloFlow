#!/usr/bin/env python3
"""Make AlloFlowANTI.txt environment-aware so the same file works in Canvas and Firebase CRA."""

import os

SRC = os.path.join(os.path.dirname(__file__), "AlloFlowANTI.txt")

with open(SRC, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Read {len(lines)} lines from {SRC}")

changes = 0

# ── CHANGE 1: Firebase config + API key (lines ~36-42) ────────────────────────
# Find the exact lines and replace them
old_config_block = [
    '// #region --- CONFIGURATION & SETUP ---\n',
    'const firebaseConfig = JSON.parse(__firebase_config);\n',
    'const firebaseApp = initializeApp(firebaseConfig);\n',
    'const auth = getAuth(firebaseApp);\n',
    'const db = getFirestore(firebaseApp);\n',
    "const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';\n",
    'const apiKey = "";\n',
]

new_config_block = [
    '// #region --- CONFIGURATION & SETUP ---\n',
    '// Environment-aware: works in both Canvas (auto-injected globals) and Firebase CRA (process.env)\n',
    "const firebaseConfig = typeof __firebase_config !== 'undefined'\n",
    '  ? JSON.parse(__firebase_config)\n',
    '  : {\n',
    "      apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',\n",
    "      authDomain: process.env.REACT_APP_AUTH_DOMAIN || '',\n",
    "      projectId: process.env.REACT_APP_PROJECT_ID || '',\n",
    "      storageBucket: process.env.REACT_APP_STORAGE_BUCKET || '',\n",
    "      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID || '',\n",
    "      appId: process.env.REACT_APP_APP_ID || '',\n",
    "      measurementId: process.env.REACT_APP_MEASUREMENT_ID || '',\n",
    '    };\n',
    'const firebaseApp = initializeApp(firebaseConfig);\n',
    'const auth = getAuth(firebaseApp);\n',
    'const db = getFirestore(firebaseApp);\n',
    "const appId = typeof __app_id !== 'undefined' ? __app_id : (process.env.REACT_APP_APP_ID || 'default-app-id');\n",
    "// Canvas auto-injects API key via proxy (empty string works). Firebase CRA uses env var.\n",
    "const apiKey = typeof __firebase_config !== 'undefined'\n",
    '  ? ""\n',
    "  : (process.env.REACT_APP_GEMINI_API_KEY || '');\n",
]

# Normalize line endings for comparison
def strip_cr(line):
    return line.replace('\r\n', '\n').replace('\r', '\n')

# Find start of config block
config_start = None
for i, line in enumerate(lines):
    if strip_cr(line).strip() == '// #region --- CONFIGURATION & SETUP ---':
        config_start = i
        break

if config_start is not None:
    # Verify the block matches
    match = True
    for j, expected in enumerate(old_config_block):
        actual = strip_cr(lines[config_start + j])
        if actual.strip() != expected.strip():
            print(f"  MISMATCH at line {config_start + j + 1}: expected '{expected.strip()}' got '{actual.strip()}'")
            match = False
            break
    
    if match:
        lines[config_start:config_start + len(old_config_block)] = new_config_block
        changes += 1
        print(f"✅ CHANGE 1: Firebase config + API key (line {config_start + 1}) — replaced {len(old_config_block)} lines with {len(new_config_block)} lines")
    else:
        print("❌ CHANGE 1: Config block didn't match expected pattern")
else:
    print("❌ CHANGE 1: Could not find config region marker")


# ── CHANGE 2: Bootstrap block at end of file ──────────────────────────────────
# Find the bootstrap block (starts with "const container = document.getElementById('root');")
bootstrap_start = None
for i in range(len(lines) - 1, max(len(lines) - 100, 0), -1):
    if "const container = document.getElementById('root')" in strip_cr(lines[i]):
        bootstrap_start = i
        break

if bootstrap_start is not None:
    # Find the end (should be the last line "// #endregion")
    bootstrap_end = None
    for i in range(bootstrap_start, len(lines)):
        if strip_cr(lines[i]).strip() == '// #endregion':
            bootstrap_end = i
            break
    
    if bootstrap_end is not None:
        old_bootstrap = lines[bootstrap_start:bootstrap_end + 1]
        new_bootstrap = [
            "// Canvas/standalone bootstrap — CRA uses src/index.js instead\n",
            "if (typeof __firebase_config !== 'undefined') {\n",
            "  const container = document.getElementById('root');\n",
            "  if (container) {\n",
            "    if (ReactDOM.createRoot) {\n",
            "       const originalConsoleError = console.error;\n",
            "       console.error = (...args) => {\n",
            "         if (typeof args[0] === 'string' && args[0].includes('You are calling ReactDOMClient.createRoot()')) {\n",
            "           return;\n",
            "         }\n",
            "         originalConsoleError(...args);\n",
            "       };\n",
            "       const root = ReactDOM.createRoot(container);\n",
            "       root.render(<App />);\n",
            "    } else {\n",
            "       ReactDOM.render(<App />, container);\n",
            "    }\n",
            "  }\n",
            "}\n",
            "// #endregion\n",
        ]
        
        lines[bootstrap_start:bootstrap_end + 1] = new_bootstrap
        changes += 1
        print(f"✅ CHANGE 2: Bootstrap block (line {bootstrap_start + 1}) — wrapped in Canvas gate")
    else:
        print("❌ CHANGE 2: Could not find end of bootstrap block")
else:
    print("❌ CHANGE 2: Could not find bootstrap block")


# ── Write result ──────────────────────────────────────────────────────────────
if changes == 2:
    with open(SRC, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"\n🎉 DONE: {changes}/2 changes applied to {SRC}")
    print(f"   Total lines: {len(lines)}")
else:
    print(f"\n⚠️  Only {changes}/2 changes matched. File NOT written.")
    print("   Please review the output above and fix manually.")
