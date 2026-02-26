"""
Canvas-to-Firebase Conversion Script
Converts AlloFlowANTI.txt (Canvas/Gemini version) to Firebase-deployable App.jsx
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

INPUT = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
OUTPUT = os.path.join(os.path.dirname(__file__), 'prismflow-deploy', 'src', 'App.jsx')

with open(INPUT, 'r', encoding='utf-8') as f:
    text = f.read()

changes = []

# ===========================================
# TRANSFORMATION 1: Firebase config
# Canvas: JSON.parse(__firebase_config)
# Firebase: process.env.REACT_APP_* fields
# ===========================================
old_config = "const firebaseConfig = JSON.parse(__firebase_config);"
new_config = """const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};"""

if old_config in text:
    text = text.replace(old_config, new_config, 1)
    changes.append("✅ T1: Firebase config → process.env")
else:
    changes.append("⚠️  T1: Firebase config pattern not found")

# ===========================================
# TRANSFORMATION 2: App ID
# Canvas: typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'
# Firebase: process.env.REACT_APP_APP_ID || 'default-app-id'
# ===========================================
old_appid = "const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';"
new_appid = "const appId = process.env.REACT_APP_APP_ID || 'default-app-id';"

if old_appid in text:
    text = text.replace(old_appid, new_appid, 1)
    changes.append("✅ T2: appId → process.env.REACT_APP_APP_ID")
else:
    changes.append("⚠️  T2: appId pattern not found")

# ===========================================
# TRANSFORMATION 3: API Key
# Canvas: const apiKey = "";
# Firebase: process.env.REACT_APP_GEMINI_API_KEY || hardcoded fallback
# ===========================================
old_apikey = 'const apiKey = "";'
new_apikey = 'const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyBXrARQsv6bZY_5a7DFpCr05i4j9zeEK0Y";'

if old_apikey in text:
    text = text.replace(old_apikey, new_apikey, 1)
    changes.append("✅ T3: apiKey → process.env + fallback")
else:
    changes.append("⚠️  T3: apiKey pattern not found")

# ===========================================
# TRANSFORMATION 4: Remove Canvas-only bootstrap block
# Canvas has ReactDOM.createRoot(...) at the end
# CRA uses index.js for bootstrapping
# ===========================================
# Find and remove the bootstrap block (everything after export default function App())
bootstrap_marker = "const container = document.getElementById('root');"
if bootstrap_marker in text:
    idx = text.index(bootstrap_marker)
    text = text[:idx].rstrip() + "\n"
    changes.append("✅ T4: Removed Canvas bootstrap block")
else:
    changes.append("⚠️  T4: Canvas bootstrap block not found")

# ===========================================
# TRANSFORMATION 5: Ensure useReducer is in import
# (Already present in Canvas version, just verify)
# ===========================================
if 'useReducer' in text.split('\n')[18] if len(text.split('\n')) > 18 else '':
    changes.append("✅ T5: useReducer import present")
else:
    changes.append("⚠️  T5: useReducer import check inconclusive")

# ===========================================
# Verify and save
# ===========================================
open_b = text.count('{')
close_b = text.count('}')
delta = open_b - close_b
print(f"Brace balance: {open_b} open, {close_b} close, delta = {delta}")

for c in changes:
    print(c)

lines = text.split('\n')
print(f"Total lines: {len(lines)}")

# Verify no Canvas globals remain
for bad in ['__firebase_config', '__app_id']:
    if bad in text:
        print(f"⚠️  WARNING: '{bad}' still present in output!")
    else:
        print(f"✅ CLEAN: '{bad}' not present")

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(text)
print(f"\nOUTPUT: {OUTPUT}")
print("DONE ✅")
