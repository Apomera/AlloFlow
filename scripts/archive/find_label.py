"""Find where concept-sort content is rendered in the main view"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find activeView checks for concept-sort in the JSX content rendering area
print("=== activeView === concept-sort ===")
for i in range(55000, min(len(lines), 68000)):
    l = lines[i]
    if "activeView === 'concept-sort'" in l or 'activeView === "concept-sort"' in l:
        for j in range(max(0, i-2), min(len(lines), i+10)):
            print(f"L{j+1}: {lines[j].rstrip()[:160]}")
        print("...")

print("\n=== concept-sort in content area (L60000+) ===")
for i in range(60000, min(len(lines), 68000)):
    l = lines[i]
    if 'concept-sort' in l:
        print(f"L{i+1}: {l.strip()[:160]}")

print("\n=== 'Visual Support' label in content area (L60000+) ===")
for i in range(60000, min(len(lines), 68000)):
    l = lines[i]
    if 'Visual Support' in l:
        print(f"L{i+1}: {l.strip()[:160]}")

print("\n=== generatedContent?.type or activeView in content render ===")
for i in range(60000, min(len(lines), 68000)):
    l = lines[i]
    if ('generatedContent?.type' in l or "generatedContent.type" in l) and ('image' in l or 'visual' in l.lower()):
        print(f"L{i+1}: {l.strip()[:160]}")
