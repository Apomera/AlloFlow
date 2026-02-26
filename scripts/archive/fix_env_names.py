#!/usr/bin/env python3
"""Fix .env variable names in AlloFlowANTI.txt to match existing prismflow-deploy/.env"""

import os

SRC = os.path.join(os.path.dirname(__file__), "AlloFlowANTI.txt")

with open(SRC, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

# The make_env_aware.py script used REACT_APP_FIREBASE_API_KEY
# but the existing .env uses REACT_APP_API_KEY
# Fix all the env var names to match the existing .env

replacements = [
    ("process.env.REACT_APP_FIREBASE_API_KEY", "process.env.REACT_APP_API_KEY"),
    # These are already matching, but let's verify they're consistent:
    # REACT_APP_AUTH_DOMAIN -> already matches
    # REACT_APP_PROJECT_ID -> already matches
    # REACT_APP_STORAGE_BUCKET -> already matches
    # REACT_APP_MESSAGING_SENDER_ID -> already matches
    # REACT_APP_APP_ID -> already matches
    # REACT_APP_MEASUREMENT_ID -> already matches
    # REACT_APP_GEMINI_API_KEY -> already matches
]

changes = 0
for old, new in replacements:
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        changes += count
        print(f"  Replaced '{old}' -> '{new}' ({count} occurrence(s))")
    else:
        print(f"  Not found: '{old}'")

if changes > 0:
    with open(SRC, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\n Done: {changes} replacement(s) applied.")
    print(f"  File size: {original_len} -> {len(content)}")
else:
    print("\n No changes needed.")
