"""Find ALL unsafe generatedContent.data accesses."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

unsafe = []
safe = []
for i, line in enumerate(lines):
    if 'generatedContent.data' in line:
        if 'generatedContent?.data' in line or '?.data' in line:
            safe.append((i+1, line.rstrip()[:140]))
        else:
            unsafe.append((i+1, line.rstrip()[:140]))

print(f"UNSAFE: {len(unsafe)} | SAFE: {len(safe)}")
print("\n=== ALL UNSAFE generatedContent.data ===")
for ln, txt in unsafe:
    print(f"  L{ln}: {txt}")
