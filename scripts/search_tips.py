#!/usr/bin/env python3
"""Search for bot tip messages and debug logs in the monolith."""
import sys
import os

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\search_tips_output.txt"

with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

results = []
results.append(f"=== Total lines: {len(lines)} ===\n")

# --- Section 1: Search for Tip-related patterns ---
results.append("=" * 60)
results.append("SECTION 1: Lines containing 'Tip:' as a string literal")
results.append("=" * 60)
tip_patterns = ["Tip:", "botTip", "BotTip", "bot_tip", "tipMessage", "tipText", "showTip"]
for i, line in enumerate(lines, 1):
    s = line.strip()
    for pat in tip_patterns:
        if pat in s:
            results.append(f"L{i}: {s[:300]}")
            break

results.append("")
results.append("=" * 60)
results.append("SECTION 2: Lines containing 'Allobot'")
results.append("=" * 60)
for i, line in enumerate(lines, 1):
    s = line.strip()
    if "Allobot" in s:
        results.append(f"L{i}: {s[:300]}")

results.append("")
results.append("=" * 60)
results.append("SECTION 3: Lines containing 'glossary' AND ('bingo' or 'word game')")
results.append("=" * 60)
for i, line in enumerate(lines, 1):
    sl = line.lower()
    if "glossary" in sl and ("bingo" in sl or "word game" in sl):
        results.append(f"L{i}: {line.strip()[:300]}")

results.append("")
results.append("=" * 60)
results.append("SECTION 4: Lines containing 'grade' appearing twice")
results.append("=" * 60)
for i, line in enumerate(lines, 1):
    sl = line.lower()
    if sl.count("grade") >= 2:
        results.append(f"L{i}: {line.strip()[:300]}")

results.append("")
results.append("=" * 60)
results.append("SECTION 5: Debug console.log/warn lines related to word sounds / phoneme / audio / tts")
results.append("=" * 60)
debug_patterns = ["console.log", "console.warn", "console.debug"]
for i, line in enumerate(lines, 1):
    s = line.strip()
    for pat in debug_patterns:
        if pat in s and any(kw in s.lower() for kw in ["word sound", "wordsound", "phoneme", "fetch", "audio", "tts", "speech"]):
            results.append(f"L{i}: {s[:300]}")
            break

results.append("")
results.append("=" * 60)
results.append("SECTION 6: Lines with lightbulb emoji")
results.append("=" * 60)
for i, line in enumerate(lines, 1):
    s = line.strip()
    if "\U0001f4a1" in s:
        results.append(f"L{i}: {s[:300]}")

results.append("\nDone.")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(results))

print(f"Results written to {OUT}")
print(f"Total result lines: {len(results)}")
