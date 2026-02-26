#!/usr/bin/env python3
"""Comprehensive audit of source text / analysis data flow:
1. Where is analysisResult defined and populated?
2. Which downstream features use analysisResult vs sourceText vs simplifiedText?
3. Which buttons/UI are gated on having source text or analysis?
4. What is the chain: source text -> analysis -> downstream?
"""
import sys, json, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OUT = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\comprehensive_audit.json'

lines = open(FILE, 'r', encoding='utf-8', errors='replace').readlines()
results = {}

# 1. Find analysisResult state variable
print("=== 1. analysisResult STATE ===")
for i, l in enumerate(lines):
    if 'analysisResult' in l and 'useState' in l:
        print(f"  L{i+1}: {l.strip()[:120]}")

# 2. Find where analysisResult is SET (populated)
print("\n=== 2. setAnalysisResult CALLS ===")
set_calls = []
for i, l in enumerate(lines):
    if 'setAnalysisResult' in l and i > 35000:
        set_calls.append(f"  L{i+1}: {l.strip()[:140]}")
for s in set_calls[:15]:
    print(s)
print(f"  ({len(set_calls)} total)")

# 3. Find where analysisResult is READ/USED in prompts or logic
print("\n=== 3. analysisResult USAGE in prompts/generation ===")
usage = []
for i, l in enumerate(lines):
    if 'analysisResult' in l and 'setAnalysisResult' not in l and 'useState' not in l and i > 35000:
        context = l.strip()[:140]
        usage.append({"line": i+1, "content": context})
# Show first 30
for u in usage[:30]:
    print(f"  L{u['line']}: {u['content']}")
print(f"  ({len(usage)} total usages)")

# 4. Find disabled buttons gated on source text / analysis
print("\n=== 4. DISABLED BUTTONS gated on source/analysis ===")
disabled_gates = []
for i, l in enumerate(lines):
    if 'disabled' in l and ('sourceText' in l or 'analysisResult' in l or 'simplifiedText' in l or 'inputText' in l):
        disabled_gates.append(f"  L{i+1}: {l.strip()[:160]}")
for d in disabled_gates[:20]:
    print(d)
print(f"  ({len(disabled_gates)} total)")

# 5. Find conditionally rendered sections (&&) gated on source/analysis
print("\n=== 5. CONDITIONAL RENDERING gated on source/analysis ===")
cond_render = []
for i, l in enumerate(lines):
    stripped = l.strip()
    if ('sourceText' in l or 'analysisResult' in l or 'simplifiedText' in l) and ('&&' in l) and i > 60000:
        if 'disabled' not in l:  # skip disabled ones, already counted
            cond_render.append(f"  L{i+1}: {stripped[:160]}")
for c in cond_render[:25]:
    print(c)
print(f"  ({len(cond_render)} total)")

# 6. Find what data feeds into the main generate/simplify function
print("\n=== 6. MAIN GENERATE/SIMPLIFY handler source ===")
for i, l in enumerate(lines):
    if 'handleGenerate' in l and 'const' in l and '=>' in l and i > 55000 and i < 56000:
        print(f"  Handler at L{i+1}")
        for k in range(i, min(i+40, len(lines))):
            lk = lines[k].strip()
            if 'sourceText' in lk or 'inputText' in lk or 'analysisResult' in lk or 'simplifiedText' in lk or 'callGemini' in lk:
                print(f"    L{k+1}: {lk[:140]}")
        break

# 7. Find how the standard context/source is passed to downstream generators
print("\n=== 7. CONTEXT VARIABLES used in prompts ===")
context_vars = ['mathContextPrompt', 'sourceContext', 'contextPrompt', 'analysisContext', 'getSourceContext']
for cv in context_vars:
    for i, l in enumerate(lines):
        if cv in l and ('const' in l or 'let' in l or 'function' in l) and i > 35000:
            print(f"  {cv} defined at L{i+1}: {l.strip()[:120]}")
            break
    else:
        print(f"  {cv}: NOT FOUND")

# 8. Specifically check the input view gating
print("\n=== 8. INPUT VIEW (paste source text) ===")
for i, l in enumerate(lines):
    if "activeView === 'input'" in l and i > 60000:
        print(f"  L{i+1}: {l.strip()[:140]}")
        break

# 9. Check if there are view/tab switch gates
print("\n=== 9. VIEW SWITCH GATES (can user navigate to views without source?) ===")
for i, l in enumerate(lines):
    if ('setActiveView' in l or "activeView" in l) and ('sourceText' in l or 'analysisResult' in l or 'simplifiedText' in l):
        if i > 60000:
            print(f"  L{i+1}: {l.strip()[:160]}")
